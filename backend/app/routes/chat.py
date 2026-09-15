import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai import chat_completion, chat_completion_stream
from app.services.search import web_search, extract_pages

router = APIRouter(prefix="/chat", tags=["chat"])


# ----------------------------------------------------------------
# Non-streaming chat
# ----------------------------------------------------------------

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


# ----------------------------------------------------------------
# Streaming chat (with optional web search)
# ----------------------------------------------------------------

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

    # ---- Web search ----
    sources: list[dict] = []
    search_context: str | None = None

    if payload.use_web_search and payload.messages[-1].role == "user":
        try:
            query = payload.messages[-1].content
            if not any(w in query.lower() for w in [
                "latest", "current", "today", "now", "2025", "2026", "recent"
            ]):
                query = f"latest {query}"
            sr = web_search(query, max_results=5)
            sources = sr.get("results", [])

            if sources:
                lines = []
                for i, s in enumerate(sources, 1):
                    lines.append(f"Source [{i}]: {s['title']}")
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
                    "Rules:\n"
                    "1. Read the search results carefully.\n"
                    "2. Extract the specific answer from them.\n"
                    "3. Cite sources with [1], [2], etc.\n"
                    "4. If the results truly don't answer the question, say so — but check first.\n\n"
                    "=== LIVE SEARCH RESULTS ===\n"
                    + "\n".join(lines)
                    + "\n=== END OF SEARCH RESULTS ==="
                )
        except Exception as e:
            print(f"[chat_stream] Search failed: {e}")
            sources = []

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


# ----------------------------------------------------------------
# Research mode (search + scrape full pages)
# ----------------------------------------------------------------

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
        sr = web_search(query, max_results=5)
        sources = sr.get("results", [])
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


# ----------------------------------------------------------------
# Regenerate last assistant message
# ----------------------------------------------------------------

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