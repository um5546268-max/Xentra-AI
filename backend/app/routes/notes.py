from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate, NoteOut
from app.services.gamification import record_activity


router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteOut])
def list_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Note)
        .where(Note.user_id == current_user.id)
        .order_by(Note.pinned.desc(), Note.updated_at.desc())
        .limit(200)
    )
    return [NoteOut.model_validate(n) for n in db.execute(stmt).scalars().all()]


@router.post("", response_model=NoteOut, status_code=201)
def create_note(
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = Note(
        user_id=current_user.id,
        title=payload.title,
        body=payload.body,
        color=payload.color,
        subject=payload.subject,
        tags=payload.tags or [],
        session_id=payload.session_id,
        pinned=False,
    )
    db.add(note)
    record_activity(db, current_user, "tool_use")
    db.commit()
    db.refresh(note)
    return NoteOut.model_validate(note)


@router.get("/{note_id}", response_model=NoteOut)
def get_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")
    return NoteOut.model_validate(note)


@router.patch("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: str,
    payload: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")

    if payload.title is not None:
        note.title = payload.title
    if payload.body is not None:
        note.body = payload.body
    if payload.color is not None:
        note.color = payload.color
    if payload.pinned is not None:
        note.pinned = payload.pinned
    if payload.subject is not None:
        note.subject = payload.subject
    if payload.tags is not None:
        note.tags = payload.tags
    if payload.session_id is not None:
        note.session_id = payload.session_id

    db.commit()
    db.refresh(note)
    return NoteOut.model_validate(note)


@router.delete("/{note_id}", status_code=204)
def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()

    # ─────────────────────────────────────────────────────────────
# POST /api/notes/{id}/summarize  — returns summary (does not modify note)
# ─────────────────────────────────────────────────────────────
@router.post("/{note_id}/summarize")
def summarize(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.note_ai import summarize_note

    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")

    summary = summarize_note(note.title, note.body)
    return {"summary": summary}


# ─────────────────────────────────────────────────────────────
# POST /api/notes/{id}/explain  — returns simplified rewrite (does not modify)
# ─────────────────────────────────────────────────────────────
@router.post("/{note_id}/explain")
def explain(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.note_ai import explain_simply

    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")

    simplified = explain_simply(note.title, note.body)
    return {"simplified": simplified}


# ─────────────────────────────────────────────────────────────
# POST /api/notes/{id}/to-learn
#   mode=all      → flashcards + quiz (default)
#   mode=quiz     → quiz only
#   mode=cards    → flashcards only
# ─────────────────────────────────────────────────────────────
@router.post("/{note_id}/to-learn")
def to_learn(
    note_id: str,
    mode: str = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.learn import LearnSession, Flashcard, QuizAttempt
    from app.services import learn_service
    from app.services.gamification import record_activity

    note = db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    ).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Note not found")

    body = (note.body or "").strip()
    if len(body) < 20:
        raise HTTPException(400, "Note is too short to generate study material")

    # 1. Extract concepts from the note text
    concepts_data = learn_service.extract_concepts(
        topic=None, text=body[:8000], num=8
    )
    concepts = concepts_data.get("concepts", [])
    if not concepts:
        raise HTTPException(500, "Could not extract concepts")

    # 2. Create the Learn session, tagged to the note's subject
    session = LearnSession(
        user_id=current_user.id,
        title=note.title or "From note",
        topic=None,
        source_type="text",
        source_preview=body[:500],
        subject=note.subject,
        summary=concepts_data.get("summary"),
        concepts=concepts,
    )
    db.add(session)
    db.flush()

    # 3. Flashcards (unless mode=quiz)
    if mode in ("all", "cards"):
        cards_data = learn_service.generate_flashcards(concepts)
        for c in cards_data:
            db.add(
                Flashcard(
                    session_id=session.id,
                    concept=c.get("concept"),
                    question=c["question"],
                    answer=c["answer"],
                    difficulty=c.get("difficulty", "medium"),
                )
            )

    # 4. Quiz (unless mode=cards)
    if mode in ("all", "quiz"):
        try:
            cards_for_quiz = []
            if mode == "all":
                cards_for_quiz = cards_data  # type: ignore[name-defined]
            quiz_questions = learn_service.generate_quiz(concepts, cards_for_quiz)
            db.add(
                QuizAttempt(session_id=session.id, questions=quiz_questions)
            )
        except Exception as e:
            print(f"[notes.to-learn] quiz failed: {e}")

    record_activity(db, current_user, "learn_session")
    db.commit()

    return {
        "session_id": str(session.id),
        "title": session.title,
    }