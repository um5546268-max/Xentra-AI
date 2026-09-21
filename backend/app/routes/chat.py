import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.rate_limit import limiter
from app.database import get_db, SessionLocal
from app.deps import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.image import GeneratedImage
from app.models.file import UserFile
from app.models.chunk import FileChunk
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai import chat_completion, chat_completion_stream
from app.services.search import web_search, extract_pages, enrich_sources
from app.services.images import (
    extract_image_intent,
    generate_image_url,
    download_and_store_image,
)
from app.services.chunking import find_relevant_chunks
from app.services.memory_extractor import (
    extract_memories,
    save_extracted_memories,
    load_relevant_memories,
    format_memories_for_prompt,
)
from app.services.billing import check_and_record

router = APIRouter(prefix="/chat", tags=["chat"])


# ═══════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════
BEE_RESULT_URL: dict[str, str] = {
    "shopping": "/app/shopping",
    "media": "/app/media",
    "maps": "/app/maps",
    "coding": "/app/code",
    "file": "/app/files",
    "research": "/app/browser",
    "web": "/app/browser",
    "computer": "/app/browser",
    "health": "/app/system-health",
    "manager": "/app/bees",
    "video": "/app/videos",
}


# ═══════════════════════════════════════════════════════════════
# HELPERS — Topic Image (image-first chat)
# ═══════════════════════════════════════════════════════════════
def _fetch_topic_image(user_text: str) -> dict | None:
    """
    Fetch a Wikipedia thumbnail for topic-style questions.
    Only returns a match if the title similarity is high enough.
    """
    lower = user_text.lower().strip()
    patterns = [
        "who is ", "who was ", "who are ",
        "where is ", "where are ",
        "what is ", "what are ",
        "tell me about ",
        "show me ",
        "who's ",
    ]
    if not any(lower.startswith(p) for p in patterns):
        return None

    topic = user_text
    for p in patterns:
        if lower.startswith(p):
            topic = user_text[len(p):].strip().rstrip("?.!")
            break

    if not topic or len(topic) > 100:
        return None

    # Skip generic questions
    generic = {"the", "it", "this", "that", "you", "me", "them", "him", "her"}
    if topic.lower() in generic:
        return None

    headers = {
        "User-Agent": "XentraAI/1.0 (https://xentra.local; contact@xentra.local)",
        "Accept": "application/json",
    }

    try:
        import requests

        # ─── 1. Search with STRICT matching ───
        r = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": f'"{topic}"',       # quoted for exact-ish match
                "srlimit": 5,
                "srnamespace": 0,
                "srinfo": "suggestion",
                "srprop": "",
            },
            headers=headers,
            timeout=8,
        )
        if r.status_code != 200:
            print(f"[chat] wikipedia search HTTP {r.status_code}")
            return None

        data = r.json()
        results = data.get("query", {}).get("search", [])
        if not results:
            # Fallback: try unquoted search
            r = requests.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "format": "json",
                    "list": "search",
                    "srsearch": topic,
                    "srlimit": 5,
                    "srnamespace": 0,
                },
                headers=headers,
                timeout=8,
            )
            data = r.json()
            results = data.get("query", {}).get("search", [])
            if not results:
                return None

        # ─── 2. Pick the best match by similarity score ───
        from difflib import SequenceMatcher

        def similarity(a: str, b: str) -> float:
            return SequenceMatcher(None, a.lower(), b.lower()).ratio()

        scored = []
        for item in results[:5]:
            title = item["title"]
            score = max(
                similarity(topic, title),
                # Also compare against first word (for "Kim Taehyung" vs "V (singer)")
                similarity(topic.split()[0], title.split()[0]) if topic else 0,
            )
            scored.append((score, title))

        scored.sort(reverse=True, key=lambda x: x[0])
        best_score, best_title = scored[0]

        # ─── 3. Reject bad matches ───
        # Require at least 60% similarity, OR the topic is a substring of the title
        topic_lower = topic.lower()
        title_lower = best_title.lower()
        is_substring = topic_lower in title_lower or title_lower in topic_lower

        if best_score < 0.60 and not is_substring:
            print(f"[chat] topic image: no good match for '{topic}' (best: '{best_title}' @ {best_score:.2f})")
            return None

        # ─── 4. Get the thumbnail ───
        r = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "format": "json",
                "prop": "pageimages|info",
                "piprop": "thumbnail|original",
                "pithumbsize": 800,
                "inprop": "url",
                "titles": best_title,
            },
            headers=headers,
            timeout=8,
        )
        if r.status_code != 200:
            print(f"[chat] wikipedia image HTTP {r.status_code}")
            return None

        pages = r.json().get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail") or {}
            original = page.get("original") or {}
            url = thumb.get("source") or original.get("source")
            if url:
                return {
                    "url": url,
                    "source": "Wikipedia",
                    "title": best_title,
                    "page_url": page.get("fullurl")
                        or f"https://en.wikipedia.org/wiki/{best_title.replace(' ', '_')}",
                }

        # If best match had no image, try the second-best
        if len(scored) > 1:
            second_score, second_title = scored[1]
            if second_score >= 0.55:
                r = requests.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "query",
                        "format": "json",
                        "prop": "pageimages|info",
                        "piprop": "thumbnail|original",
                        "pithumbsize": 800,
                        "inprop": "url",
                        "titles": second_title,
                    },
                    headers=headers,
                    timeout=8,
                )
                pages = r.json().get("query", {}).get("pages", {})
                for page in pages.values():
                    thumb = page.get("thumbnail") or {}
                    url = thumb.get("source")
                    if url:
                        return {
                            "url": url,
                            "source": "Wikipedia",
                            "title": second_title,
                            "page_url": page.get("fullurl"),
                        }

    except Exception as e:
        print(f"[chat] topic image failed: {e}")
    return None


# ═══════════════════════════════════════════════════════════════
# HELPERS — Bees
# ═══════════════════════════════════════════════════════════════
def _spawn_bees_for_chat(user_id: uuid.UUID, user_text: str) -> list[dict]:
    """Spawn Manager Bee + worker Bees. Uses its own DB session."""
    spawned: list[dict] = []
    db = SessionLocal()
    try:
        from app.services.manager_bee import plan_swarm
        from app.services import bee_service
        from app.models.user import User as UserModel

        user = db.get(UserModel, user_id)
        if not user:
            return []

        plan = plan_swarm(user_text)

        manager = bee_service.spawn_bee(
            db, user,
            bee_type="manager",
            title=f"Manage: {user_text[:60]}",
            description=user_text,
            goal_dna=plan.get("goal_dna"),
        )
        bee_service.start_bee(db, manager.id, user.id)

        spawned.append({
            "id": str(manager.id),
            "type": "manager",
            "title": manager.title,
            "progress": 0,
            "status": "running",
            "stoppable": True,
        })

        for item in plan.get("swarm", [])[:3]:
            try:
                b = bee_service.spawn_bee(
                    db, user,
                    bee_type=item["bee_type"],
                    title=item.get("title", "Task")[:255],
                    description=item.get("description"),
                    goal_dna=plan.get("goal_dna"),
                    parent_task_id=manager.id,
                )
                bee_service.start_bee(db, b.id, user.id)
                spawned.append({
                    "id": str(b.id),
                    "type": b.bee_type,
                    "title": b.title,
                    "progress": 0,
                    "status": "running",
                    "stoppable": True,
                })
            except HTTPException:
                break
            except Exception as e:
                print(f"[chat] Worker bee spawn failed: {e}")

    except HTTPException as e:
        print(f"[chat] Bee spawn quota/error: {e.detail}")
    except Exception as e:
        print(f"[chat] Swarm planning failed: {e}")
    finally:
        db.close()

    return spawned


def _finish_bees(user_id: uuid.UUID, spawned_bees: list[dict], success: bool = True):
    """Mark spawned Bees as complete. Uses its own DB session."""
    if not spawned_bees:
        return
    db = SessionLocal()
    try:
        from app.services import bee_service
        for b in spawned_bees:
            bee_service.update_progress(db, b["id"], user_id, 100)
            result_url = BEE_RESULT_URL.get(b.get("type", ""), "/app/bees")
            bee_service.finish_bee(
                db, b["id"], user_id,
                result={"message": "Completed" if success else "Failed"},
                error=None if success else "Stream error",
                result_url=result_url,
            )
            bee_service.verify_bee(
                db, b["id"], user_id,
                {"passed": success, "notes": "Chat stream finished"},
            )
    except Exception as e:
        print(f"[chat] Bee finish failed: {e}")
    finally:
        db.close()


def _update_bee_progress(user_id: uuid.UUID, spawned_bees: list[dict], pct: int):
    """Bump progress on active Bees. Uses its own DB session."""
    if not spawned_bees:
        return
    db = SessionLocal()
    try:
        from app.services import bee_service
        for b in spawned_bees:
            bee_service.update_progress(db, b["id"], user_id, pct)
    except Exception as e:
        print(f"[chat] Bee progress update failed: {e}")
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════
# HELPERS — Shopping prefetch
# ═══════════════════════════════════════════════════════════════
def _prefetch_shopping(user_text: str) -> list | None:
    text = user_text.lower()
    shopping_keywords = ["buy", "shop", "find", "price", "under", "compare", "cheap", "best"]
    product_keywords = [
        "laptop", "phone", "headphone", "earbud", "watch", "shoe",
        "camera", "tablet", "monitor", "keyboard", "mouse", "speaker",
    ]
    is_shopping = any(k in text for k in shopping_keywords) and any(
        p in text for p in product_keywords
    )
    if not is_shopping:
        return None

    try:
        from app.services.shopping import search_products
        results = search_products(query=user_text, max_results=5)
        print(f"[chat] Shopping prefetch: {len(results or [])} items")
        return results
    except Exception as e:
        print(f"[chat] Shopping prefetch failed: {e}")
        return None


# ═══════════════════════════════════════════════════════════════
# NON-STREAMING CHAT
# ═══════════════════════════════════════════════════════════════
@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one message is required",
        )

    try:
        check_and_record(db, current_user.id, "messages", 1)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[chat] Usage check failed (non-fatal): {e}")

    conversation: Conversation | None = None
    if payload.conversation_id:
        try:
            convo_id = uuid.UUID(payload.conversation_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid conversation_id")

        conversation = db.get(Conversation, convo_id)
        if not conversation or conversation.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        last = payload.messages[-1]
        if last.role == "user":
            db.add(Message(
                conversation_id=conversation.id,
                role="user",
                content=last.content,
            ))
            db.commit()

    spawned_bees: list[dict] = []
    if payload.messages[-1].role == "user":
        spawned_bees = _spawn_bees_for_chat(
            current_user.id, payload.messages[-1].content,
        )

    try:
        result = chat_completion(messages=[m.model_dump() for m in payload.messages])
    except Exception as e:
        _finish_bees(current_user.id, spawned_bees, success=False)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider error: {e}",
        )

    if conversation is not None:
        db.add(Message(
            conversation_id=conversation.id,
            role="assistant",
            content=result["content"],
        ))
        if conversation.title in ("New conversation", "", None):
            first_user = next(
                (m for m in payload.messages if m.role == "user"), None
            )
            if first_user:
                conversation.title = first_user.content.strip()[:60] or "New conversation"
        db.commit()

    _finish_bees(current_user.id, spawned_bees, success=True)

    return ChatResponse(**result)


# ═══════════════════════════════════════════════════════════════
# STREAMING CHAT
# ═══════════════════════════════════════════════════════════════
@router.post("/stream")
def chat_stream(
    background_tasks: BackgroundTasks,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.messages:
        raise HTTPException(status_code=400, detail="At least one message is required")

    try:
        check_and_record(db, current_user.id, "messages", 1)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[chat_stream] Usage check failed (non-fatal): {e}")

    user_id = current_user.id
    conversation_id: uuid.UUID | None = None
    should_autotitle = False

    if payload.conversation_id:
        try:
            convo_id = uuid.UUID(payload.conversation_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid conversation_id")

        conversation = db.get(Conversation, convo_id)
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation_id = conversation.id
        should_autotitle = conversation.title in ("New conversation", "", None)

        last = payload.messages[-1]
        if last.role == "user":
            db.add(Message(
                conversation_id=conversation_id,
                role="user",
                content=last.content,
            ))
            db.commit()

    # ── Prepare everything before the stream ──

    # Spawn Bees
    spawned_bees: list[dict] = []
    if payload.messages[-1].role == "user":
        spawned_bees = _spawn_bees_for_chat(user_id, payload.messages[-1].content)

    # Shopping prefetch
    shopping_results: list | None = None
    if payload.messages[-1].role == "user":
        shopping_results = _prefetch_shopping(payload.messages[-1].content)

    # Topic image (image-first chat) — fetch BEFORE stream so it shows first
    topic_image: dict | None = None
    if payload.messages[-1].role == "user":
        topic_image = _fetch_topic_image(payload.messages[-1].content)

    # Image intent (AI-generated images)
    image_result: dict | None = None
    if payload.messages[-1].role == "user":
        try:
            intent = extract_image_intent(payload.messages[-1].content)
            if intent and intent.get("prompt"):
                print(f"[chat_stream] Image intent: {intent['prompt']}")
                gen = generate_image_url(
                    prompt=intent["prompt"],
                    width=1024,
                    height=1024,
                    model="flux",
                )
                try:
                    local_url = download_and_store_image(
                        gen["image_url"], str(user_id)
                    )
                except Exception as e:
                    print(f"[chat_stream] Image download failed: {e}")
                    local_url = gen["image_url"]

                image_row = GeneratedImage(
                    user_id=user_id,
                    conversation_id=conversation_id,
                    prompt=gen["prompt"],
                    enhanced_prompt=gen["enhanced_prompt"],
                    provider=gen["provider"],
                    model=gen["model"],
                    width=gen["width"],
                    height=gen["height"],
                    seed=gen["seed"],
                    image_url=local_url,
                )
                db.add(image_row)
                db.commit()
                db.refresh(image_row)

                try:
                    check_and_record(db, user_id, "images", 1)
                except Exception as e:
                    print(f"[chat_stream] Image usage check failed: {e}")

                image_result = {
                    "id": str(image_row.id),
                    "url": local_url,
                    "prompt": gen["prompt"],
                    "width": gen["width"],
                    "height": gen["height"],
                    "seed": gen["seed"],
                }
        except Exception as e:
            print(f"[chat_stream] Image intent failed: {e}")
            image_result = None

    # Memory context
    memories_used: list[dict] = []
    memory_context: str | None = None
    if not image_result:
        try:
            memories_used = load_relevant_memories(db, user_id, payload.messages[-1].content)
            if memories_used:
                memory_context = format_memories_for_prompt(memories_used)
                print(f"[chat_stream] Loaded {len(memories_used)} memories")
        except Exception as e:
            print(f"[chat_stream] Memory load failed: {e}")

    # Attached files
    attached_files: list[dict] = []
    file_context: str | None = None
    if not image_result and conversation_id is not None:
        try:
            files_stmt = (
                select(UserFile)
                .where(UserFile.conversation_id == conversation_id)
                .where(UserFile.user_id == user_id)
                .where(UserFile.status == "ready")
                .order_by(UserFile.created_at.desc())
            )
            attached = db.execute(files_stmt).scalars().all()
            user_query = payload.messages[-1].content

            for f in attached[:3]:
                attached_files.append({
                    "id": str(f.id),
                    "name": f.original_name,
                    "size": f.size_bytes,
                    "extension": f.extension,
                })

            if attached_files:
                ctx_lines = [
                    "The user has attached the following files to this conversation.",
                    "Use the file content to answer accurately. Cite page numbers if present.",
                    "If the answer isn't in the files, say so clearly.",
                    "",
                ]

                total_chars_used = 0
                MAX_CONTEXT_CHARS = 30000

                for f in attached[:3]:
                    chunks_stmt = (
                        select(FileChunk)
                        .where(FileChunk.file_id == f.id)
                        .order_by(FileChunk.position.asc())
                    )
                    chunk_rows = db.execute(chunks_stmt).scalars().all()

                    if not chunk_rows:
                        if f.extracted_text:
                            snippet = f.extracted_text[:8000]
                            ctx_lines.append(f"=== FILE: {f.original_name} ===")
                            ctx_lines.append(snippet)
                            ctx_lines.append("=== END FILE ===")
                            ctx_lines.append("")
                            total_chars_used += len(snippet)
                        continue

                    chunks = [{
                        "text": c.text,
                        "position": c.position,
                        "page_number": c.page_number,
                    } for c in chunk_rows]

                    relevant = find_relevant_chunks(chunks, user_query, top_k=5)

                    ctx_lines.append(f"=== FILE: {f.original_name} ===")
                    ctx_lines.append(
                        f"(showing {len(relevant)} of {len(chunks)} chunks "
                        f"most relevant to the question)"
                    )
                    ctx_lines.append("")

                    for c in relevant:
                        page_note = (
                            f" [page {c['page_number']}]"
                            if c.get("page_number")
                            else ""
                        )
                        ctx_lines.append(f"--- Chunk {c['position'] + 1}{page_note} ---")
                        ctx_lines.append(c["text"])
                        ctx_lines.append("")

                        total_chars_used += len(c["text"])
                        if total_chars_used >= MAX_CONTEXT_CHARS:
                            break

                    ctx_lines.append("=== END FILE ===")
                    ctx_lines.append("")

                    if total_chars_used >= MAX_CONTEXT_CHARS:
                        break

                file_context = "\n".join(ctx_lines)
        except Exception as e:
            print(f"[chat_stream] File context load failed: {e}")
            attached_files = []
            file_context = None

    # Web search
    sources: list[dict] = []
    search_context: str | None = None
    if (
        not image_result
        and payload.use_web_search
        and payload.messages[-1].role == "user"
    ):
        try:
            query = payload.messages[-1].content
            if not any(w in query.lower() for w in [
                "latest", "current", "today", "now", "2025", "2026", "recent"
            ]):
                query = f"latest {query}"
            sr = web_search(query, max_results=8)
            sources = enrich_sources(sr.get("results", []), query)[:5]

            if sources:
                lines = []
                for i, s in enumerate(sources, 1):
                    trust = s.get("_trust_level", "medium")
                    kind = s.get("_kind", "other")
                    lines.append(f"Source [{i}] ({kind}, trust={trust}): {s['title']}")
                    lines.append(f"URL: {s['url']}")
                    lines.append(f"Content: {s['content'][:800]}")
                    lines.append("")

                search_context = (
                    "You are Xentra with LIVE WEB SEARCH enabled.\n\n"
                    "The following search results were JUST retrieved from the web. "
                    "They are UP-TO-DATE and AUTHORITATIVE. "
                    "You MUST use them to answer the user's question. "
                    "Do NOT say 'I don't have live data' — you do have live data below. "
                    "Do NOT suggest the user check other websites — the data is here.\n\n"
                    "IMPORTANT — TRUST LEVELS:\n"
                    "- trust=high sources are authoritative. Rely on them.\n"
                    "- trust=medium sources are usable but prefer higher ones.\n"
                    "- trust=low sources are suspicious. Use with caution.\n\n"
                    "Rules:\n"
                    "1. Read the search results carefully.\n"
                    "2. Extract the specific answer from them.\n"
                    "3. Cite sources with [1], [2], etc.\n"
                    "4. If the results truly don't answer the question, say so.\n\n"
                    "=== LIVE SEARCH RESULTS ===\n"
                    + "\n".join(lines)
                    + "\n=== END OF SEARCH RESULTS ==="
                )
        except Exception as e:
            print(f"[chat_stream] Search failed: {e}")
            sources = []

    # ═══════════════════════════════════════════════════════════
    # EVENT GENERATOR
    # ═══════════════════════════════════════════════════════════
    def event_generator():
        full: list[str] = []

        # 1. Emit spawned Bees
        if spawned_bees:
            yield f"data: {json.dumps({'bees': spawned_bees})}\n\n"

        # 2. Emit topic image (image-first chat) — FIRST so it appears at top
        if topic_image:
            yield f"data: {json.dumps({'topic_image': topic_image})}\n\n"

        # 3. Emit shopping prefetch
        if shopping_results:
            yield f"data: {json.dumps({'shopping_results': shopping_results, 'shopping_query': payload.messages[-1].content})}\n\n"

        # ─── IMAGE PATH (AI-generated) ───
        if image_result:
            try:
                if conversation_id is not None:
                    bg_db = SessionLocal()
                    try:
                        marker = f"<!--IMAGE:{json.dumps(image_result)}-->"
                        msg = (
                            f"Here's your image of: **{image_result['prompt']}**\n\n"
                            f"{marker}\n\n"
                            f"---\n"
                            f"*Dimensions: {image_result['width']}×{image_result['height']}*"
                        )
                        bg_db.add(Message(
                            conversation_id=conversation_id,
                            role="assistant",
                            content=msg,
                        ))
                        if should_autotitle:
                            first_user = next(
                                (m for m in payload.messages if m.role == "user"),
                                None,
                            )
                            if first_user:
                                convo = bg_db.get(Conversation, conversation_id)
                                if convo:
                                    convo.title = first_user.content.strip()[:60] or "New conversation"
                        bg_db.commit()
                    finally:
                        bg_db.close()

                yield f"data: {json.dumps({'image': image_result})}\n\n"

                text = f"Here's your image of: {image_result['prompt']}"
                for chunk in text.split(" "):
                    yield f"data: {json.dumps({'delta': chunk + ' '})}\n\n"

                _finish_bees(user_id, spawned_bees, success=True)
                done_ids = [b["id"] for b in spawned_bees]
                yield f"data: {json.dumps({'bees_done': done_ids})}\n\n"
                yield "data: [DONE]\n\n"
                return
            except Exception as e:
                print(f"[chat_stream] Image response failed: {e}")

        # ─── NORMAL PATH ───
        try:
            if sources:
                yield f"data: {json.dumps({'sources': sources})}\n\n"
            if memories_used:
                yield f"data: {json.dumps({'memories': memories_used})}\n\n"
            if attached_files:
                yield f"data: {json.dumps({'files': attached_files})}\n\n"

            llm_messages = [m.model_dump() for m in payload.messages[:-1]]

            combined_parts = []
            if memory_context:
                combined_parts.append(memory_context)
            if file_context:
                combined_parts.append(file_context)
            if search_context:
                combined_parts.append(search_context)

            if combined_parts:
                combined = (
                    "\n\n".join(combined_parts)
                    + "\n\n=== USER QUESTION ===\n"
                    + payload.messages[-1].content
                )
                llm_messages.append({"role": "user", "content": combined})
            else:
                llm_messages.append(payload.messages[-1].model_dump())

            chunk_count = 0
            for delta in chat_completion_stream(messages=llm_messages):
                full.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"

                chunk_count += 1
                if spawned_bees and chunk_count % 10 == 0:
                    pct = min(90, 15 + chunk_count * 2)
                    try:
                        _update_bee_progress(user_id, spawned_bees, pct)
                        bee_progress_payload = [
                            {"id": b["id"], "progress": pct} for b in spawned_bees
                        ]
                        yield f"data: {json.dumps({'bee_progress': bee_progress_payload})}\n\n"
                    except Exception as pe:
                        print(f"[chat_stream] Bee progress emit failed: {pe}")
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            _finish_bees(user_id, spawned_bees, success=False)
            done_ids = [b["id"] for b in spawned_bees]
            yield f"data: {json.dumps({'bees_done': done_ids})}\n\n"
            return

        final_text_for_extraction = "".join(full)

        if conversation_id is not None:
            bg_db = SessionLocal()
            try:
                bg_db.add(Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=final_text_for_extraction,
                ))
                if should_autotitle:
                    first_user = next(
                        (m for m in payload.messages if m.role == "user"), None
                    )
                    if first_user:
                        convo = bg_db.get(Conversation, conversation_id)
                        if convo:
                            convo.title = first_user.content.strip()[:60] or "New conversation"
                bg_db.commit()
            finally:
                bg_db.close()

        try:
            user_msg = payload.messages[-1].content if payload.messages else ""
            if user_msg and final_text_for_extraction:
                background_tasks.add_task(
                    _extract_and_save_memories,
                    str(user_id),
                    str(conversation_id) if conversation_id else None,
                    user_msg,
                    final_text_for_extraction,
                )
        except Exception as e:
            print(f"[chat_stream] Failed to schedule memory extraction: {e}")

        _finish_bees(user_id, spawned_bees, success=True)
        done_ids = [b["id"] for b in spawned_bees]
        yield f"data: {json.dumps({'bees_done': done_ids})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ═══════════════════════════════════════════════════════════════
# RESEARCH MODE
# ═══════════════════════════════════════════════════════════════
@router.post("/research")
def research(
    background_tasks: BackgroundTasks,
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.messages or payload.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="Last message must be from user")

    try:
        check_and_record(db, current_user.id, "messages", 1)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[research] Usage check failed (non-fatal): {e}")

    user_id = current_user.id
    conversation_id: uuid.UUID | None = None
    should_autotitle = False

    if payload.conversation_id:
        try:
            convo_id = uuid.UUID(payload.conversation_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid conversation_id")

        conversation = db.get(Conversation, convo_id)
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation_id = conversation.id
        should_autotitle = conversation.title in ("New conversation", "", None)

        db.add(Message(
            conversation_id=conversation_id,
            role="user",
            content=payload.messages[-1].content,
        ))
        db.commit()

    spawned_bees = _spawn_bees_for_chat(user_id, payload.messages[-1].content)

    topic_image: dict | None = None
    topic_image = _fetch_topic_image(payload.messages[-1].content)

    memories_used: list[dict] = []
    memory_context: str | None = None
    try:
        memories_used = load_relevant_memories(db, user_id, payload.messages[-1].content)
        if memories_used:
            memory_context = format_memories_for_prompt(memories_used)
    except Exception as e:
        print(f"[research] Memory load failed: {e}")

    query = payload.messages[-1].content
    try:
        sr = web_search(query, max_results=8)
        sources = enrich_sources(sr.get("results", []), query)[:5]
        top_urls = [s["url"] for s in sources[:3]]
        pages = extract_pages(top_urls)
    except Exception as e:
        print(f"[research] search/extract failed: {e}")
        sources = []
        pages = []

    search_context = None
    if sources:
        lines = ["=== SEARCH RESULT SNIPPETS ==="]
        for i, s in enumerate(sources, 1):
            lines.append(f"[{i}] {s['title']}")
            lines.append(f"URL: {s['url']}")
            lines.append(f"Snippet: {s['content'][:400]}")
            lines.append("")

        if pages:
            lines.append("=== FULL PAGE CONTENT (top 3) ===")
            for i, p in enumerate(pages, 1):
                lines.append(f"[Page {i}] {p['url']}")
                lines.append(p["content"][:3000])
                lines.append("")

        search_context = (
            "You are Xentra in RESEARCH MODE with LIVE WEB DATA. "
            "You have full web pages below. Read them carefully and answer the user's question. "
            "Cite sources with [1], [2]. Do NOT say 'I don't have live data'. "
            "Be factual. Do not invent information.\n\n"
            + "\n".join(lines)
        )

    def event_generator():
        full: list[str] = []

        if spawned_bees:
            yield f"data: {json.dumps({'bees': spawned_bees})}\n\n"

        if topic_image:
            yield f"data: {json.dumps({'topic_image': topic_image})}\n\n"

        try:
            if sources:
                yield f"data: {json.dumps({'sources': sources})}\n\n"
            if memories_used:
                yield f"data: {json.dumps({'memories': memories_used})}\n\n"

            llm_messages = [m.model_dump() for m in payload.messages[:-1]]

            combined_parts = []
            if memory_context:
                combined_parts.append(memory_context)
            if search_context:
                combined_parts.append(search_context)

            if combined_parts:
                combined = (
                    "\n\n".join(combined_parts)
                    + "\n\n=== USER QUESTION ===\n"
                    + payload.messages[-1].content
                )
                llm_messages.append({"role": "user", "content": combined})
            else:
                llm_messages.append(payload.messages[-1].model_dump())

            chunk_count = 0
            for delta in chat_completion_stream(messages=llm_messages):
                full.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"

                chunk_count += 1
                if spawned_bees and chunk_count % 10 == 0:
                    pct = min(90, 15 + chunk_count * 2)
                    try:
                        _update_bee_progress(user_id, spawned_bees, pct)
                        bee_progress_payload = [
                            {"id": b["id"], "progress": pct} for b in spawned_bees
                        ]
                        yield f"data: {json.dumps({'bee_progress': bee_progress_payload})}\n\n"
                    except Exception:
                        pass
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            _finish_bees(user_id, spawned_bees, success=False)
            done_ids = [b["id"] for b in spawned_bees]
            yield f"data: {json.dumps({'bees_done': done_ids})}\n\n"
            return

        final_text_for_extraction = "".join(full)

        if conversation_id is not None:
            bg_db = SessionLocal()
            try:
                bg_db.add(Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=final_text_for_extraction,
                ))
                if should_autotitle:
                    first_user = next(
                        (m for m in payload.messages if m.role == "user"), None
                    )
                    if first_user:
                        convo = bg_db.get(Conversation, conversation_id)
                        if convo:
                            convo.title = first_user.content.strip()[:60] or "New conversation"
                bg_db.commit()
            finally:
                bg_db.close()

        try:
            user_msg = payload.messages[-1].content if payload.messages else ""
            if user_msg and final_text_for_extraction:
                background_tasks.add_task(
                    _extract_and_save_memories,
                    str(user_id),
                    str(conversation_id) if conversation_id else None,
                    user_msg,
                    final_text_for_extraction,
                )
        except Exception as e:
            print(f"[research] Failed to schedule memory extraction: {e}")

        _finish_bees(user_id, spawned_bees, success=True)
        done_ids = [b["id"] for b in spawned_bees]
        yield f"data: {json.dumps({'bees_done': done_ids})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ═══════════════════════════════════════════════════════════════
# REGENERATE
# ═══════════════════════════════════════════════════════════════
@router.post("/regenerate")
def regenerate(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id required")

    try:
        convo_id = uuid.UUID(payload.conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    conversation = db.get(Conversation, convo_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation_id: uuid.UUID = conversation.id

    last_assistant = db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.role == "assistant")
        .order_by(Message.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if last_assistant:
        db.delete(last_assistant)
        db.commit()

    try:
        result = chat_completion(messages=[m.model_dump() for m in payload.messages])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI provider error: {e}")

    db.add(Message(
        conversation_id=conversation_id,
        role="assistant",
        content=result["content"],
    ))
    db.commit()

    return ChatResponse(**result)


# ═══════════════════════════════════════════════════════════════
# BACKGROUND: MEMORY EXTRACTION
# ═══════════════════════════════════════════════════════════════
def _extract_and_save_memories(
    user_id: str,
    conversation_id: str | None,
    user_message: str,
    assistant_message: str,
):
    db = SessionLocal()
    try:
        memories = extract_memories(user_message, assistant_message)
        if not memories:
            return
        count = save_extracted_memories(
            db,
            uuid.UUID(user_id),
            uuid.UUID(conversation_id) if conversation_id else None,
            memories,
        )
        if count > 0:
            print(f"[memory] Auto-saved {count} memory(ies) for user {user_id[:8]}")
    except Exception as e:
        print(f"[memory] Background extraction failed: {e}")
    finally:
        db.close()