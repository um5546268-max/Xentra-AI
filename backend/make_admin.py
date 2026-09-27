"""
Promote a user to admin.
Usage: python make_admin.py admin@xentra.local
"""
import sys
from app.database import SessionLocal
from app.models.user import User
from sqlalchemy import select

if len(sys.argv) < 2:
    print("Usage: python make_admin.py <email>")
    sys.exit(1)

email = sys.argv[1].strip().lower()

db = SessionLocal()
try:
    # Show all users first so you can see what exists
    print("\n=== Users in DB ===")
    all_users = db.execute(select(User)).scalars().all()
    for u in all_users:
        print(f"  {u.email:40s} is_admin={getattr(u, 'is_admin', False)}")
    print()

    # Find the one to promote
    user = db.execute(
        select(User).where(User.email == email)
    ).scalar_one_or_none()

    if not user:
        print(f"❌ No user found with email: {email}")
        print("   Copy one of the emails above and try again.")
        sys.exit(1)

    user.is_admin = True
    db.commit()
    db.refresh(user)
    print(f"✅ Promoted: {user.email} → is_admin=True")
finally:
    db.close()