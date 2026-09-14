from app.database import SessionLocal
from app.models.user import User
from app.models.conversation import Conversation
from sqlalchemy import select

db = SessionLocal()

print("=" * 60)
print("USERS:")
for u in db.execute(select(User)).scalars():
    print(f"  {u.email}  id={u.id}")

print("\nCONVERSATIONS:")
for c in db.execute(select(Conversation)).scalars():
    print(f"  title='{c.title}'  id={c.id}  user_id={c.user_id}")

db.close()
print("=" * 60)