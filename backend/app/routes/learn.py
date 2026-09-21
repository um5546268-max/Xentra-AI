from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.learn import LearnSession, Flashcard, QuizAttempt
from app.schemas.learn import (
    LearnFromTopicRequest,
    LearnFromTextRequest,
    ReviewFlashcardRequest,
    SubmitQuizRequest,
    SessionOut,
    SessionDetailOut,
    FlashcardOut,
    StudyStatsOut,
)
from app.services import learn_service
from app.services.gamification import record_activity
from app.services.extract import extract_text
from fastapi import UploadFile, File, Form


router = APIRouter(prefix="/learn", tags=["learn"])


# ─────────────────────────────────────────────────────────────
# POST /api/learn/from-topic
# ─────────────────────────────────────────────────────────────
@router.post("/from-topic", response_model=SessionDetailOut, status_code=201)
def learn_from_topic(
    payload: LearnFromTopicRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = learn_service.extract_concepts(topic=payload.topic, text=None, num=payload.num_concepts)

    session = LearnSession(
        user_id=current_user.id,
        title=payload.topic,
        topic=payload.topic,
        source_type="topic",
        source_preview=payload.topic,
        summary=data.get("summary"),
        concepts=data.get("concepts", []),
    )
    db.add(session)
    db.flush()

    cards_data = learn_service.generate_flashcards(data["concepts"])
    cards = [
        Flashcard(
            session_id=session.id,
            concept=c.get("concept"),
            question=c["question"],
            answer=c["answer"],
            difficulty=c.get("difficulty", "medium"),
        )
        for c in cards_data
    ]
    db.add_all(cards)

    quiz_questions = learn_service.generate_quiz(data["concepts"], cards_data)
    attempt = QuizAttempt(session_id=session.id, questions=quiz_questions)
    db.add(attempt)

    record_activity(db, current_user, "learn_session")

    db.commit()
    db.refresh(session)
    db.refresh(attempt)

    return {
        **SessionOut.model_validate(session).model_dump(),
        "flashcards": [FlashcardOut.model_validate(c) for c in cards],
        "latest_quiz": {"id": attempt.id, "questions": quiz_questions, "created_at": attempt.created_at},
    }


# ─────────────────────────────────────────────────────────────
# POST /api/learn/from-text
# ─────────────────────────────────────────────────────────────
@router.post("/from-text", response_model=SessionDetailOut, status_code=201)
def learn_from_text(
    payload: LearnFromTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = learn_service.extract_concepts(topic=None, text=payload.text, num=8)

    session = LearnSession(
        user_id=current_user.id,
        title=payload.title,
        source_type="text",
        source_preview=payload.text[:500],
        summary=data.get("summary"),
        concepts=data.get("concepts", []),
    )
    db.add(session)
    db.flush()

    cards_data = learn_service.generate_flashcards(data["concepts"])
    cards = [
        Flashcard(
            session_id=session.id,
            concept=c.get("concept"),
            question=c["question"],
            answer=c["answer"],
            difficulty=c.get("difficulty", "medium"),
        )
        for c in cards_data
    ]
    db.add_all(cards)

    quiz_questions = learn_service.generate_quiz(data["concepts"], cards_data)
    attempt = QuizAttempt(session_id=session.id, questions=quiz_questions)
    db.add(attempt)

    record_activity(db, current_user, "learn_session")

    db.commit()
    db.refresh(session)
    db.refresh(attempt)

    return {
        **SessionOut.model_validate(session).model_dump(),
        "flashcards": [FlashcardOut.model_validate(c) for c in cards],
        "latest_quiz": {"id": attempt.id, "questions": quiz_questions, "created_at": attempt.created_at},
    }


# ─────────────────────────────────────────────────────────────
# POST /api/learn/from-file  (PDF / DOCX / TXT / audio)
# ─────────────────────────────────────────────────────────────
@router.post("/from-file", response_model=SessionDetailOut, status_code=201)
async def learn_from_file(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF, DOCX, TXT, or audio file → generate flashcards + quiz."""
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(400, "File too large (25 MB max)")

    # 1. Extract text from the file
    text = extract_text(content, file.filename or "upload")

    # 2. Extract concepts
    data = learn_service.extract_concepts(topic=None, text=text, num=10)

    # 3. Create session
    session = LearnSession(
        user_id=current_user.id,
        title=(title or (file.filename or "Uploaded material"))[:200],
        source_type="file",
        source_preview=text[:500],
        summary=data.get("summary"),
        concepts=data.get("concepts", []),
    )
    db.add(session)
    db.flush()

    # 4. Flashcards
    cards_data = learn_service.generate_flashcards(data["concepts"])
    cards = [
        Flashcard(
            session_id=session.id,
            concept=c.get("concept"),
            question=c["question"],
            answer=c["answer"],
            difficulty=c.get("difficulty", "medium"),
        )
        for c in cards_data
    ]
    db.add_all(cards)

    # 5. Quiz
    quiz_questions = learn_service.generate_quiz(data["concepts"], cards_data)
    attempt = QuizAttempt(session_id=session.id, questions=quiz_questions)
    db.add(attempt)

    # 6. Award points
    record_activity(db, current_user, "learn_session")

    db.commit()
    db.refresh(session)
    db.refresh(attempt)

    return {
        **SessionOut.model_validate(session).model_dump(),
        "flashcards": [FlashcardOut.model_validate(c) for c in cards],
        "latest_quiz": {"id": attempt.id, "questions": quiz_questions, "created_at": attempt.created_at},
    }


# ─────────────────────────────────────────────────────────────
# GET /api/learn/sessions
# ─────────────────────────────────────────────────────────────
@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(LearnSession)
        .where(LearnSession.user_id == current_user.id)
        .order_by(LearnSession.created_at.desc())
        .limit(50)
    )
    return [SessionOut.model_validate(s) for s in db.execute(stmt).scalars().all()]


# ─────────────────────────────────────────────────────────────
# GET /api/learn/session/{id}
# ─────────────────────────────────────────────────────────────
@router.get("/session/{session_id}", response_model=SessionDetailOut)
def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.execute(
        select(LearnSession).where(
            LearnSession.id == session_id,
            LearnSession.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    latest_quiz = db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.session_id == session.id)
        .order_by(QuizAttempt.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    return {
        **SessionOut.model_validate(session).model_dump(),
        "flashcards": [FlashcardOut.model_validate(c) for c in session.flashcards],
        "latest_quiz": (
            {"id": latest_quiz.id, "questions": latest_quiz.questions, "created_at": latest_quiz.created_at}
            if latest_quiz else None
        ),
    }


# ─────────────────────────────────────────────────────────────
# POST /api/learn/flashcard/{id}/review
# ─────────────────────────────────────────────────────────────
@router.post("/flashcard/{card_id}/review", response_model=FlashcardOut)
def review_flashcard(
    card_id: str,
    payload: ReviewFlashcardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.execute(
        select(Flashcard)
        .join(LearnSession)
        .where(Flashcard.id == card_id, LearnSession.user_id == current_user.id)
    ).scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Flashcard not found")

    reps, ef, interval = learn_service.apply_sm2(
        card.repetitions, card.ease_factor, card.interval_days, payload.quality
    )
    card.repetitions = reps
    card.ease_factor = ef
    card.interval_days = interval
    card.next_review_at = datetime.now(timezone.utc) + timedelta(days=interval)
    card.last_reviewed_at = datetime.now(timezone.utc)
    if payload.quality >= 3:
        card.times_correct += 1
    else:
        card.times_wrong += 1

    record_activity(db, current_user, "flashcard_review")

    db.commit()
    db.refresh(card)
    return FlashcardOut.model_validate(card)


# ─────────────────────────────────────────────────────────────
# POST /api/learn/quiz/{id}/submit
# ─────────────────────────────────────────────────────────────
@router.post("/quiz/{attempt_id}/submit")
def submit_quiz(
    attempt_id: str,
    payload: SubmitQuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attempt = db.execute(
        select(QuizAttempt)
        .join(LearnSession)
        .where(QuizAttempt.id == attempt_id, LearnSession.user_id == current_user.id)
    ).scalar_one_or_none()
    if not attempt:
        raise HTTPException(404, "Quiz attempt not found")

    questions = attempt.questions or []
    correct = 0
    for i, q in enumerate(questions):
        if i < len(payload.answers) and payload.answers[i] == q["correct_index"]:
            correct += 1

    score = round((correct / len(questions)) * 100) if questions else 0
    attempt.answers = payload.answers
    attempt.score = score
    attempt.completed_at = datetime.now(timezone.utc)

    record_activity(db, current_user, "quiz_complete")

    db.commit()

    return {
        "score": score,
        "correct": correct,
        "total": len(questions),
        "details": [
            {
                "question": q["question"],
                "your_answer": payload.answers[i] if i < len(payload.answers) else None,
                "correct_index": q["correct_index"],
                "explanation": q["explanation"],
            }
            for i, q in enumerate(questions)
        ],
    }


# ─────────────────────────────────────────────────────────────
# GET /api/learn/stats
# ─────────────────────────────────────────────────────────────
@router.get("/stats", response_model=StudyStatsOut)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    total_sessions = db.execute(
        select(func.count()).select_from(LearnSession).where(LearnSession.user_id == current_user.id)
    ).scalar() or 0

    total_cards = db.execute(
        select(func.count())
        .select_from(Flashcard)
        .join(LearnSession)
        .where(LearnSession.user_id == current_user.id)
    ).scalar() or 0

    due_today = db.execute(
        select(func.count())
        .select_from(Flashcard)
        .join(LearnSession)
        .where(LearnSession.user_id == current_user.id, Flashcard.next_review_at <= now)
    ).scalar() or 0

    mastered = db.execute(
        select(func.count())
        .select_from(Flashcard)
        .join(LearnSession)
        .where(LearnSession.user_id == current_user.id, Flashcard.repetitions >= 3)
    ).scalar() or 0

    return StudyStatsOut(
        total_sessions=total_sessions,
        total_flashcards=total_cards,
        due_today=due_today,
        mastered=mastered,
    )


# ─────────────────────────────────────────────────────────────
# DELETE /api/learn/session/{id}
# ─────────────────────────────────────────────────────────────
@router.delete("/session/{session_id}", status_code=204)
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.execute(
        select(LearnSession).where(
            LearnSession.id == session_id,
            LearnSession.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    db.delete(session)
    db.commit()