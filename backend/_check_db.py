from app.config import settings
from app.database import engine, SessionLocal
from app.models import User, Conversation, Message, Task
from sqlalchemy import text

print("=" * 60)
print("URL from settings:")
print("  ", settings.DATABASE_URL)
print()
print("URL engine is using:")
print("  ", str(engine.url))
print()
print("Are they equivalent?",
      settings.DATABASE_URL.replace("+psycopg", "") ==
      str(engine.url).replace("+psycopg", ""))
print("=" * 60)

print("\nTables visible from this connection:")
with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' ORDER BY table_name"
    )).fetchall()
    for r in rows:
        print("  -", r[0])

print("\nRow counts:")
db = SessionLocal()
print("  users:        ", db.query(User).count())
print("  conversations:", db.query(Conversation).count())
print("  messages:     ", db.query(Message).count())
print("  tasks:        ", db.query(Task).count())
db.close()
print("=" * 60)