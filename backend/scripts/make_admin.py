import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.config import settings
from sqlalchemy import select, func

db = SessionLocal()

if not settings.ADMIN_EMAIL:
    print("ADMIN_EMAIL not set in .env")
    sys.exit(1)

# Normalize to lowercase since we store emails lowercased
email = settings.ADMIN_EMAIL.strip().lower()

# Case-insensitive lookup just to be safe
user = db.execute(
    select(User).where(func.lower(User.email) == email)
).scalar_one_or_none()

if not user:
    print(f"❌ User {email} not found")
    print("\nAvailable users:")
    for u in db.execute(select(User)).scalars().all():
        print(f"  - {u.email}")

    # If exactly one user exists, offer to promote them
    all_users = db.execute(select(User)).scalars().all()
    if len(all_users) == 1:
        print(f"\nOnly one user exists: {all_users[0].email}")
        print("Set ADMIN_EMAIL to that address in .env, or run:")
        print(f'  python -c "from app.database import SessionLocal; from app.models.user import User; db = SessionLocal(); u = db.get(User, \'{all_users[0].id}\'); u.is_admin = True; db.commit(); print(\'✅ Promoted\', u.email); db.close()"')
    sys.exit(1)

user.is_admin = True
db.commit()
print(f"✅ {user.email} is now an admin")
db.close()