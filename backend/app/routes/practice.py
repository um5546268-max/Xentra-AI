from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.learn import LearnSession
from app.models.practice import PracticeTest
from app.schemas.practice import (
    PracticeCreate, PracticeSubmit,
    PracticeOut, PracticeDetailOut, PracticeResultOut,
)
from app.services import learn_service


router = APIRouter(prefix="/practice", tags=["practice"])


@router.get("", response_model=list[PracticeOut])
def list_tests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = (
        select(PracticeTest)
        .where(PracticeTest.user_id == current_user.id)
        .order_by(PracticeTest.created_at.desc())
        .limit(50)
    )
    tests = db.execute(stmt).scalars().all()
    return [
        PracticeOut(
            id=t.id,
            title=t.title,
            subject=t.subject,
            duration_minutes=t.duration_minutes,
            pass_threshold=t.pass_threshold,
            question_count=len(t.questions or []),
            started_at=t.started_at,
            submitted_at=t.submitted_at,
            score=t.score,
            passed=t.passed,
        )
        for t in tests
    ]


@router.post("", response_model=PracticeDetailOut, status_code=201)
def create_test(
    payload: PracticeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # ── Source: session or topic ──
    if payload.session_id:
        session = db.execute(
            select(LearnSession).where(
                LearnSession.id == payload.session_id,
                LearnSession.user_id == current_user.id,
            )
        ).scalar_one_or_none()
        if not session:
            raise HTTPException(404, "Learn session not found")
        concepts = session.concepts or []
        title = f"Practice test · {session.title}"
        subject = session.subject
    elif payload.topic:
        concepts_data = learn_service.extract_concepts(
            topic=payload.topic, text=None, num=10
        )
        concepts = concepts_data.get("concepts", [])
        title = f"Practice test · {payload.topic}"
        subject = payload.subject
    else:
        raise HTTPException(400, "Provide either session_id or topic")

    if not concepts:
        raise HTTPException(400, "No concepts available to generate test")

    # ── Generate questions ──
    questions = learn_service.generate_practice_questions(
        concepts, num_questions=payload.num_questions
    )

    test = PracticeTest(
        user_id=current_user.id,
        title=title,
        subject=subject,
        source_session_id=payload.session_id,
        questions=questions,
        duration_minutes=payload.duration_minutes,
        pass_threshold=payload.pass_threshold,
    )
    db.add(test)
    db.commit()
    db.refresh(test)

    return PracticeDetailOut(
        id=test.id,
        title=test.title,
        subject=test.subject,
        duration_minutes=test.duration_minutes,
        pass_threshold=test.pass_threshold,
        question_count=len(test.questions),
        started_at=test.started_at,
        submitted_at=test.submitted_at,
        score=test.score,
        passed=test.passed,
        questions=test.questions,
    )


@router.get("/{test_id}", response_model=PracticeDetailOut)
def get_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    test = db.execute(
        select(PracticeTest).where(
            PracticeTest.id == test_id,
            PracticeTest.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not test:
        raise HTTPException(404, "Test not found")

    return PracticeDetailOut(
        id=test.id,
        title=test.title,
        subject=test.subject,
        duration_minutes=test.duration_minutes,
        pass_threshold=test.pass_threshold,
        question_count=len(test.questions or []),
        started_at=test.started_at,
        submitted_at=test.submitted_at,
        score=test.score,
        passed=test.passed,
        questions=test.questions,
    )


@router.post("/{test_id}/submit", response_model=PracticeResultOut)
def submit_test(
    test_id: str,
    payload: PracticeSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    test = db.execute(
        select(PracticeTest).where(
            PracticeTest.id == test_id,
            PracticeTest.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not test:
        raise HTTPException(404, "Test not found")

    if test.submitted_at:
        raise HTTPException(400, "Test already submitted")

    questions = test.questions or []
    correct = sum(
        1 for i, q in enumerate(questions)
        if i < len(payload.answers) and payload.answers[i] == q["correct_index"]
    )
    score = round((correct / len(questions)) * 100) if questions else 0
    passed = score >= test.pass_threshold

    test.answers = payload.answers
    test.score = score
    test.passed = passed
    test.submitted_at = datetime.now(timezone.utc)

    # Award points
    from app.services.gamification import record_activity
    record_activity(db, current_user, "quiz_complete")

    db.commit()

    return PracticeResultOut(
        score=score,
        passed=passed,
        correct=correct,
        total=len(questions),
        details=[
            {
                "question": q["question"],
                "options": q["options"],
                "your_answer": payload.answers[i] if i < len(payload.answers) else None,
                "correct_index": q["correct_index"],
                "explanation": q.get("explanation", ""),
            }
            for i, q in enumerate(questions)
        ],
    )


@router.delete("/{test_id}", status_code=204)
def delete_test(
    test_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    test = db.execute(
        select(PracticeTest).where(
            PracticeTest.id == test_id,
            PracticeTest.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not test:
        raise HTTPException(404, "Test not found")
    db.delete(test)
    db.commit()