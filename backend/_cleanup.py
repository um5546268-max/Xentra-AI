from app.database import SessionLocal
from app.models.user import User
from sqlalchemy import select

db = SessionLocal()

# Delete the typo account (and everything it owns via cascade)
typo = db.execute(select(User).where(User.email == "test@xentra.aim")).scalar_one_or_none()
if typo:
    print(f"Deleting typo account: {typo.email}")
    db.delete(typo)
    db.commit()
    print("Done.")
else:
    print("Typo account not found.")

db.close()