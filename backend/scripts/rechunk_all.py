import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.file import UserFile
from app.models.chunk import FileChunk
from app.services.chunking import split_into_chunks
from sqlalchemy import select

db = SessionLocal()

files = db.execute(
    select(UserFile).where(UserFile.status == "ready")
).scalars().all()

print(f"Re-chunking {len(files)} files...")

for f in files:
    if not f.extracted_text:
        print(f"  {f.original_name}: no text (skip)")
        continue

    # Delete existing chunks
    db.query(FileChunk).filter(FileChunk.file_id == f.id).delete()
    db.commit()

    chunks = split_into_chunks(f.extracted_text)
    for idx, c in enumerate(chunks):
        db.add(FileChunk(
            file_id=f.id,
            position=c.get("position", idx),
            text=c.get("text", ""),
            text_lower=(c.get("text", "") or "").lower(),
            page_number=c.get("page_number"),
            char_start=c.get("char_start"),
            char_end=c.get("char_end"),
        ))
    db.commit()
    print(f"  {f.original_name}: created {len(chunks)} chunks")

db.close()
print("\nDone.")