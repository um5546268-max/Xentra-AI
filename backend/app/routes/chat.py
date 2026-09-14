import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai import chat_completion
from fastapi.responses import StreamingResponse
import json
from app.services.ai import chat_completion_stream

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send messages to the AI.
    If conversation_id is provided, save user + assistant messages to that conversation.
    """
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

        # Save the incoming user message (the last one in the list)
        last = payload.messages[-1]
        if last.role == "user":
            db.add(Message(
                conversation_id=conversation.id,
                role="user",
                content=last.content,
            ))
            db.commit()

    # Call AI
    try:
        result = chat_completion(messages=[m.model_dump() for m in payload.messages])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider error: {e}",
        )

    # Save assistant reply
    if conversation is not None:
        db.add(Message(
            conversation_id=conversation.id,
            role="assistant",
            content=result["content"],
        ))

        # Auto-title the conversation from the first user message
        if conversation.title in ("New conversation", "", None):
            first_user = next(
                (m for m in payload.messages if m.role == "user"), None
            )
            if first_user:
                title = first_user.content.strip()[:60]
                conversation.title = title or "New conversation"

        db.commit()

    return ChatResponse(**result)
@router.post("/stream")
def chat_stream(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streaming version of /api/chat.
    Sends SSE-style events: data: {"delta": "text"}  ... then data: [DONE]
    """
    if not payload.messages:
        raise HTTPException(status_code=400, detail="At least one message is required")

    # Capture everything we need BEFORE the generator runs.
    # The DB session closes when this handler returns, so we can't touch ORM objects inside the generator.
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

        # Extract what we need NOW, before the session closes
        conversation_id = conversation.id
        should_autotitle = conversation.title in ("New conversation", "", None)

        # Save the incoming user message
        last = payload.messages[-1]
        if last.role == "user":
            db.add(Message(
                conversation_id=conversation_id,
                role="user",
                content=last.content,
            ))
            db.commit()

    def event_generator():
        full: list[str] = []
        try:
            for delta in chat_completion_stream(
                messages=[m.model_dump() for m in payload.messages]
            ):
                full.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Save assistant message + autotitle — open a fresh session for this
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
@router.post("/regenerate")
def regenerate(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete the last assistant message in a conversation and regenerate it.
    """
    if not payload.conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id required")

    try:
        convo_id = uuid.UUID(payload.conversation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid conversation_id")

    conversation = db.get(Conversation, convo_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # CAPTURE the ID locally — commit() below expires the ORM object
    conversation_id: uuid.UUID = conversation.id

    # Delete the last assistant message (if any)
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

    # Call AI with the given history
    try:
        result = chat_completion(messages=[m.model_dump() for m in payload.messages])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI provider error: {e}")

    # Save new assistant reply
    db.add(Message(
        conversation_id=conversation_id,
        role="assistant",
        content=result["content"],
    ))
    db.commit()

    return ChatResponse(**result)