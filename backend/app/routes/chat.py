import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.file import UserFile
from app.models.chunk import FileChunk
from app.services.chunking import find_relevant_chunks

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.image import GeneratedImage
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai import chat_completion, chat_completion_stream
from app.services.search import web_search, extract_pages, enrich_sources
from app.services.images import (
    extract_image_intent,
    generate_image_url,
    download_and_store_image,
)

router = APIRouter(prefix="/chat", tags=["chat"])


# ============================================================
# Non-streaming chat
# ============================================================

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

    try:
        result = chat_completion(messages=[m.model_dump() for m in payload.messages])
    except Exception as e:
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

    return ChatResponse(**result)


# ============================================================
# Streaming chat (web search + image intent)
# ============================================================

@router.post("/stream")
def chat_stream(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.messages:
        raise HTTPException(status_code=400, detail="At least one message is required")

    conversation_id: uuid.UUID | None = None
    should_autotitle = False

    if payload.conversation_id:
        try:
            convo_id = uuid.UUID(payload.conversation_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid conversation_id")

        conversation = db.get(Conversation, convo_id)
        if not conversation or conversation.user_id != current_user.id:
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

    # ---- Image intent detection ----
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
                        gen["image_url"], str(current_user.id)
                    )
                except Exception as e:
                    print(f"[chat_stream] Image download failed: {e}")
                    local_url = gen["image_url"]

                image_row = GeneratedImage(
                    user_id=current_user.id,
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
                    # ---- Load attached files + relevant chunks ----
    attached_files: list[dict] = []
    file_context: str | None = None

    if conversation_id is not None:
        try:
            files_stmt = (
                select(UserFile)
                .where(UserFile.conversation_id == conversation_id)
                .where(UserFile.user_id == current_user.id)
                .where(UserFile.status == "ready")
                .order_by(UserFile.created_at.desc())
            )
            attached = db.execute(files_stmt).scalars().all()

            user_query = payload.messages[-1].content

            for f in attached[:3]:  # cap at 3 files per conversation
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
                MAX_CONTEXT_CHARS = 30000  # ~7500 tokens

                for f in attached[:3]:
                    # Load chunks for this file
                    chunks_stmt = (
                        select(FileChunk)
                        .where(FileChunk.file_id == f.id)
                        .order_by(FileChunk.position.asc())
                    )
                    chunk_rows = db.execute(chunks_stmt).scalars().all()

                    if not chunk_rows:
                        # Fallback: use raw extracted_text (capped)
                        if f.extracted_text:
                            snippet = f.extracted_text[:8000]
                            ctx_lines.append(f"=== FILE: {f.original_name} ===")
                            ctx_lines.append(snippet)
                            ctx_lines.append("=== END FILE ===")
                            ctx_lines.append("")
                            total_chars_used += len(snippet)
                        continue

                    # Convert to dicts
                    chunks = [{
                        "text": c.text,
                        "position": c.position,
                        "page_number": c.page_number,
                    } for c in chunk_rows]

                    # Find relevant chunks for this query
                    relevant = find_relevant_chunks(chunks, user_query, top_k=5)

                    ctx_lines.append(f"=== FILE: {f.original_name} ===")
                    ctx_lines.append(
                        f"(showing {len(relevant)} of {len(chunks)} chunks "
                        f"most relevant to the question)"
                    )
                    ctx_lines.append("")

                    for c in relevant:
                        page_note = f" [page {c['page_number']}]" if c.get("page_number") else ""
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
                print(
                    f"[chat_stream] Injected {len(attached_files)} file(s), "
                    f"{total_chars_used} chars"
                )
        except Exception as e:
            print(f"[chat_stream] File context load failed: {e}")
            attached_files = []
            file_context = None

    # ---- Web search (only if no image was generated) ----
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

    def event_generator():
        full: list[str] = []

        # ==== IMAGE PATH ====
        if image_result:
            try:
                # Save the assistant message with the marker embedded
                if conversation_id is not None:
                    from app.database import SessionLocal
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

                # Emit the image event
                yield f"data: {json.dumps({'image': image_result})}\n\n"

                # Emit text for streaming effect
                text = f"Here's your image of: {image_result['prompt']}"
                for chunk in text.split(" "):
                    yield f"data: {json.dumps({'delta': chunk + ' '})}\n\n"

                yield "data: [DONE]\n\n"
                return
            except Exception as e:
                print(f"[chat_stream] Image response failed: {e}")
                # Fall through to normal text response

        # ==== NORMAL PATH ====
        try:
            if sources:
                yield f"data: {json.dumps({'sources': sources})}\n\n"

            llm_messages = [m.model_dump() for m in payload.messages[:-1]]

            # Combine file_context + search_context + user message
            combined_parts = []
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

            # Emit attached_files so frontend can show them
            if attached_files:
                yield f"data: {json.dumps({'files': attached_files})}\n\n"

            for delta in chat_completion_stream(messages=llm_messages):
                full.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Save assistant message
        if conversation_id is not None:
            from app.database import SessionLocal
            bg_db = SessionLocal()
            try:
                final_text = "".join(full)
                bg_db.add(Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=final_text,
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

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ============================================================
# Research mode
# ============================================================

@router.post("/research")
def research(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.messages or payload.messages[-1].role != "user":
        raise HTTPException(status_code=400, detail="Last message must be from user")

    conversation_id: uuid.UUID | None = None
    should_autotitle = False

    if payload.conversation_id:
        try:
            convo_id = uuid.UUID(payload.conversation_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid conversation_id")

        conversation = db.get(Conversation, convo_id)
        if not conversation or conversation.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        conversation_id = conversation.id
        should_autotitle = conversation.title in ("New conversation", "", None)

        db.add(Message(
            conversation_id=conversation_id,
            role="user",
            content=payload.messages[-1].content,
        ))
        db.commit()

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
        lines = []
        lines.append("=== SEARCH RESULT SNIPPETS ===")
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
        try:
            if sources:
                yield f"data: {json.dumps({'sources': sources})}\n\n"

            llm_messages = [m.model_dump() for m in payload.messages[:-1]]
            if search_context:
                combined = (
                    search_context
                    + "\n\n=== USER QUESTION ===\n"
                    + payload.messages[-1].content
                )
                llm_messages.append({"role": "user", "content": combined})
            else:
                llm_messages.append(payload.messages[-1].model_dump())

            for delta in chat_completion_stream(messages=llm_messages):
                full.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        if conversation_id is not None:
            from app.database import SessionLocal
            bg_db = SessionLocal()
            try:
                final_text = "".join(full)
                bg_db.add(Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=final_text,
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

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ============================================================
# Regenerate last assistant message
# ============================================================

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