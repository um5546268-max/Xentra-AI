"""
Extract plain text from uploaded files (PDF, DOCX, TXT, audio via Whisper).
"""
import io
from pathlib import Path

from fastapi import HTTPException

from app.services.ai import get_client


def extract_text_from_pdf(content: bytes) -> str:
    from pypdf import PdfReader
    try:
        reader = PdfReader(io.BytesIO(content))
        parts = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                parts.append(text)
        return "\n\n".join(parts)
    except Exception as e:
        raise HTTPException(400, f"Failed to read PDF: {e}")


def extract_text_from_docx(content: bytes) -> str:
    from docx import Document
    try:
        doc = Document(io.BytesIO(content))
        parts = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(parts)
    except Exception as e:
        raise HTTPException(400, f"Failed to read DOCX: {e}")


def extract_text_from_txt(content: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(400, "Could not decode text file")


def transcribe_audio(content: bytes, filename: str) -> str:
    """Transcribe audio via Groq Whisper."""
    try:
        client = get_client()
        file_tuple = (filename, content)
        result = client.audio.transcriptions.create(
            file=file_tuple,
            model="whisper-large-v3-turbo",
        )
        return result.text or ""
    except Exception as e:
        raise HTTPException(400, f"Transcription failed: {e}")


def extract_text(content: bytes, filename: str) -> str:
    """Route to the right extractor based on file extension."""
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        text = extract_text_from_pdf(content)
    elif ext in (".docx", ".doc"):
        text = extract_text_from_docx(content)
    elif ext in (".txt", ".md"):
        text = extract_text_from_txt(content)
    elif ext in (".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac"):
        text = transcribe_audio(content, filename)
    else:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    text = text.strip()
    if len(text) < 50:
        raise HTTPException(400, "File contains too little text to process")
    if len(text) > 30_000:
        text = text[:30_000]  # cap for the LLM
    return text