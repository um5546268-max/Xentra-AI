"""
Text extraction service — pulls plain text from various file types.
Includes OCR via Tesseract for images and scanned PDFs.
"""
import os
import csv
import io
import re
import shutil
from pathlib import Path

from fastapi import HTTPException


MAX_TEXT_CHARS = 500_000  # ~500KB of text is plenty


# ============================================================
# Tesseract detection
# ============================================================

def _find_tesseract() -> str | None:
    """Find tesseract binary. Returns None if not found."""
    p = shutil.which("tesseract")
    if p:
        return p
    for candidate in [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
    ]:
        if Path(candidate).exists():
            return candidate
    return None


# ============================================================
# Public API
# ============================================================

def extract_text(file_path: Path, extension: str, mime_type: str | None = None) -> dict:
    """
    Route to the correct extractor based on file extension.
    Returns {"text": str, "pages": int | None, "meta": dict, "error": str | None}.
    """
    ext = (extension or "").lower()

    try:
        if ext == ".pdf":
            return _extract_pdf(file_path)
        elif ext == ".docx":
            return _extract_docx(file_path)
        elif ext in (".xlsx", ".xlsm"):
            return _extract_xlsx(file_path)
        elif ext in (".csv", ".tsv"):
            return _extract_csv(file_path, delimiter="\t" if ext == ".tsv" else ",")
        elif ext in (
            ".txt", ".md", ".rst", ".log",
            ".py", ".js", ".ts", ".jsx", ".tsx",
            ".html", ".htm", ".css", ".json", ".yaml", ".yml", ".xml",
            ".sql", ".sh", ".java", ".go", ".rs", ".c", ".cpp", ".h",
            ".rb", ".php",
        ):
            return _extract_plain_text(file_path, ext)
        elif ext == ".rtf":
            return _extract_rtf(file_path)
        elif ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"):
            return _extract_image_ocr(file_path)
        else:
            return {
                "text": "",
                "pages": None,
                "meta": {"type": "unknown"},
                "error": f"Extraction not supported for {ext}",
            }
    except HTTPException:
        raise
    except Exception as e:
        return {
            "text": "",
            "pages": None,
            "meta": {},
            "error": f"Extraction failed: {str(e)[:200]}",
        }


# ============================================================
# Helpers
# ============================================================

def _truncate(text: str) -> str:
    if len(text) > MAX_TEXT_CHARS:
        return text[:MAX_TEXT_CHARS] + "\n\n[TRUNCATED]"
    return text


def _detect_encoding(raw: bytes) -> str:
    try:
        import chardet
        enc = chardet.detect(raw[:4096]).get("encoding") or "utf-8"
        return enc
    except Exception:
        return "utf-8"


# ============================================================
# Extractors
# ============================================================

def _extract_pdf(path: Path) -> dict:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages_text = []
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as e:
            text = f"[Error extracting page {i + 1}: {e}]"
        pages_text.append(text)

    full = "\n\n--- PAGE BREAK ---\n\n".join(pages_text)

    # Detect scanned PDF: very little text relative to page count
    chars_per_page = len(full.strip()) / max(len(reader.pages), 1)

    if chars_per_page < 50:
        print(f"[extract] PDF looks scanned ({chars_per_page:.1f} chars/page). Running OCR…")
        ocr_result = _ocr_pdf(path)
        if ocr_result["error"] is None and ocr_result["text"]:
            return ocr_result
        print(f"[extract] OCR failed or empty: {ocr_result['error']}")

    full = _truncate(full)

    return {
        "text": full,
        "pages": len(reader.pages),
        "meta": {
            "type": "pdf",
            "pages": len(reader.pages),
            "title": (reader.metadata.title if reader.metadata else None),
            "author": (reader.metadata.author if reader.metadata else None),
        },
        "error": None,
    }


def _extract_docx(path: Path) -> dict:
    from docx import Document

    doc = Document(str(path))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n\n".join(paragraphs)

    tables_text = []
    for table in doc.tables:
        rows = []
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            rows.append(" | ".join(cells))
        if rows:
            tables_text.append("\n".join(rows))

    if tables_text:
        text += "\n\n--- TABLES ---\n\n" + "\n\n".join(tables_text)

    text = _truncate(text)

    return {
        "text": text,
        "pages": None,
        "meta": {
            "type": "docx",
            "paragraphs": len(paragraphs),
            "tables": len(doc.tables),
        },
        "error": None,
    }


def _extract_xlsx(path: Path) -> dict:
    from openpyxl import load_workbook

    wb = load_workbook(str(path), data_only=True, read_only=True)
    lines = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        lines.append(f"=== Sheet: {sheet_name} ===")
        row_count = 0
        for row in ws.iter_rows(values_only=True):
            row_count += 1
            if row_count > 500:
                lines.append("[TRUNCATED — more than 500 rows]")
                break
            cells = ["" if c is None else str(c) for c in row]
            if any(c.strip() for c in cells):
                lines.append(" | ".join(cells))
        lines.append("")

    text = _truncate("\n".join(lines))

    return {
        "text": text,
        "pages": len(wb.sheetnames),
        "meta": {"type": "xlsx", "sheets": wb.sheetnames},
        "error": None,
    }


def _extract_csv(path: Path, delimiter: str = ",") -> dict:
    raw = path.read_bytes()
    enc = _detect_encoding(raw)
    try:
        text = raw.decode(enc, errors="replace")
    except Exception:
        text = raw.decode("utf-8", errors="replace")

    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    rows = []
    for i, row in enumerate(reader):
        if i > 500:
            rows.append(["TRUNCATED — more than 500 rows"])
            break
        rows.append(row)

    if not rows:
        return {"text": "", "pages": None, "meta": {"type": "csv"}, "error": None}

    lines = []
    header = rows[0]
    lines.append(" | ".join(header))
    lines.append("-" * 40)
    for row in rows[1:]:
        lines.append(" | ".join(row))

    text = _truncate("\n".join(lines))

    return {
        "text": text,
        "pages": None,
        "meta": {"type": "csv", "columns": len(header), "rows": len(rows)},
        "error": None,
    }


def _extract_plain_text(path: Path, ext: str) -> dict:
    raw = path.read_bytes()
    enc = _detect_encoding(raw)
    try:
        text = raw.decode(enc, errors="replace")
    except Exception:
        text = raw.decode("utf-8", errors="replace")

    if ext in (".html", ".htm", ".xml"):
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(text, "html.parser")
            text = soup.get_text(separator="\n")
            text = re.sub(r"\n{3,}", "\n\n", text)
        except Exception:
            pass

    text = _truncate(text)

    return {
        "text": text,
        "pages": None,
        "meta": {"type": "text", "encoding": enc, "chars": len(text)},
        "error": None,
    }


def _extract_rtf(path: Path) -> dict:
    try:
        from striprtf.striprtf import rtf_to_text
    except ImportError:
        return {
            "text": "", "pages": None, "meta": {"type": "rtf"},
            "error": "striprtf library not installed",
        }

    raw = path.read_text(encoding="utf-8", errors="replace")
    text = rtf_to_text(raw)
    text = _truncate(text)

    return {
        "text": text,
        "pages": None,
        "meta": {"type": "rtf"},
        "error": None,
    }


# ============================================================
# OCR extractors
# ============================================================

def _extract_image_ocr(path: Path) -> dict:
    """Run OCR on an image file."""
    tesseract = _find_tesseract()
    if not tesseract:
        return {
            "text": "", "pages": None, "meta": {"type": "image"},
            "error": "Tesseract not installed. Install from https://github.com/UB-Mannheim/tesseract/wiki",
        }

    try:
        import pytesseract
        from PIL import Image

        pytesseract.pytesseract.tesseract_cmd = tesseract

        img = Image.open(path)
        width, height = img.size

        text = pytesseract.image_to_string(img, lang="eng")
        text = text.strip()
        text = _truncate(text)

        return {
            "text": text,
            "pages": 1,
            "meta": {
                "type": "image",
                "method": "tesseract",
                "width": width,
                "height": height,
                "chars": len(text),
            },
            "error": None if text else "No text detected in image",
        }
    except Exception as e:
        return {
            "text": "", "pages": None, "meta": {"type": "image"},
            "error": f"OCR failed: {str(e)[:200]}",
        }


def _ocr_pdf(path: Path) -> dict:
    """OCR a scanned PDF by converting pages to images."""
    tesseract = _find_tesseract()
    if not tesseract:
        return {
            "text": "", "pages": None, "meta": {"type": "pdf", "method": "ocr"},
            "error": "Tesseract not installed",
        }

    try:
        import pytesseract
        from pdf2image import convert_from_path

        pytesseract.pytesseract.tesseract_cmd = tesseract

        images = convert_from_path(str(path), dpi=150, first_page=1, last_page=20)

        pages_text = []
        for i, img in enumerate(images):
            try:
                page_text = pytesseract.image_to_string(img, lang="eng")
                pages_text.append(f"=== Page {i + 1} ===\n{page_text.strip()}")
            except Exception as e:
                pages_text.append(f"=== Page {i + 1} ===\n[OCR error: {e}]")

        full = "\n\n".join(pages_text)
        full = _truncate(full)

        return {
            "text": full,
            "pages": len(images),
            "meta": {"type": "pdf", "method": "ocr", "pages": len(images)},
            "error": None,
        }
    except ImportError as e:
        return {
            "text": "", "pages": None, "meta": {"type": "pdf", "method": "ocr"},
            "error": f"Missing library: {e}. Also may need Poppler installed.",
        }
    except Exception as e:
        return {
            "text": "", "pages": None, "meta": {"type": "pdf", "method": "ocr"},
            "error": f"PDF OCR failed: {str(e)[:200]}",
        }