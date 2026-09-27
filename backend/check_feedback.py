"""List the 10 newest feedback rows."""
from app.database import SessionLocal
from app.models.feedback import Feedback
from sqlalchemy import select, desc
from app.models.user import User

db = SessionLocal()
try:
    rows = db.execute(
        select(Feedback).order_by(desc(Feedback.created_at)).limit(10)
    ).scalars().all()

    print(f"\n=== Newest {len(rows)} feedback rows ===")
    for r in rows:
        user = db.get(User, r.user_id) if r.user_id else None
        email = user.email if user else "(guest)"
        print(
            f"{r.created_at.isoformat()}  "
            f"[{r.status:10s}] [{r.category:8s}] "
            f"{email:35s} | {r.message[:60]!r}"
        )
finally:
    db.close()