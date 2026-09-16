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

print(f"Found {len(files)} ready files")

for f in files:
    existing = db.execute(
        select(FileChunk).where(FileChunk.file_id == f.id)
    ).scalars().all()

    if existing:
        print(f"  {f.original_name}: {len(existing)} chunks (skip)")
        continue

    if not f.extracted_text:
        print(f"  {f.original_name}: no text (skip)")
        continue

    chunks = split_into_chunks(f.extracted_text)
    for c in chunks:
        db.add(FileChunk(
            file_id=f.id,
            position=c["position"],
            text=c["text"],
            text_lower=c["text"].lower(),
            page_number=c.get("page_number"),
            char_start=c.get("char_start"),
            char_end=c.get("char_end"),
        ))
    db.commit()
    print(f"  {f.original_name}: created {len(chunks)} chunks")

db.close()
print("\nDone.")