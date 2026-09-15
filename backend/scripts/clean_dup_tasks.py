import os
import sys

# Make sure Python can find the 'app' package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.task import Task
from sqlalchemy import select

db = SessionLocal()

tasks = db.execute(select(Task)).scalars().all()
print(f"Deleting {len(tasks)} tasks...")
for t in tasks:
    db.delete(t)
db.commit()
print("Done.")

db.close()