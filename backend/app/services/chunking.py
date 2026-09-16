"""
Chunking service — split long text into chunks and retrieve relevant ones.
Uses keyword-based scoring (no embeddings needed).
"""
import re
from typing import Iterable


CHUNK_SIZE = 2000        # ~2000 chars per chunk
CHUNK_OVERLAP = 200      # overlap between chunks to preserve context


def split_into_chunks(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[dict]:
    """
    Split text into overlapping chunks.
    Tries to break on paragraph or sentence boundaries when possible.

    Returns:
      [
        {"text": "...", "char_start": 0, "char_end": 2100, "page_number": None},
        ...
      ]
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    total = len(text)

        # Skip chunking for short documents
    if total <= chunk_size:
        return [{
            "text": text,
            "char_start": 0,
            "char_end": total,
            "page_number": _detect_page(text, 0),
            "position": 0,
        }]

    chunks = []
    start = 0
    position = 0

    while start < total:
        end = min(start + chunk_size, total)

        # Try to end on a good boundary (paragraph > sentence > word)
        if end < total:
            # Look back up to 300 chars for a paragraph break
            window = text[max(start, end - 300):end]
            break_at = window.rfind("\n\n")
            if break_at == -1:
                # Try sentence end
                for sep in [". ", "! ", "? ", "\n"]:
                    break_at = window.rfind(sep)
                    if break_at != -1:
                        break_at += len(sep)
                        break
            if break_at != -1:
                end = max(start, end - 300) + break_at

        chunk_text = text[start:end].strip()
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "char_start": start,
                "char_end": end,
                "page_number": _detect_page(text, start),
                "position": position,
            })
            position += 1

        # Advance with overlap
        if end >= total:
            break
        start = max(start + 1, end - overlap)

    return chunks


def _detect_page(text: str, offset: int) -> int | None:
    """
    Try to detect which page this offset falls on.
    Looks for '=== Page N ===' markers (added by OCR/PDF extractor).
    """
    # Count page markers before this offset
    before = text[:offset]
    matches = re.findall(r"===\s*Page\s+(\d+)\s*===", before, re.IGNORECASE)
    if matches:
        try:
            return int(matches[-1])
        except ValueError:
            return None

    # Look for "--- PAGE BREAK ---" markers
    breaks = before.count("--- PAGE BREAK ---")
    if breaks > 0:
        return breaks + 1

    return None


def score_chunk(chunk_text: str, query_words: list[str]) -> float:
    """
    Score a chunk against query keywords.
    Higher = more relevant.
    """
    if not chunk_text or not query_words:
        return 0.0

    text_lower = chunk_text.lower()
    score = 0.0

    for word in query_words:
        count = text_lower.count(word)
        if count > 0:
            # Longer words matter more
            score += count * (1 + len(word) / 10)

    # Normalize by chunk length to avoid bias toward long chunks
    length_factor = max(len(chunk_text) / 1000, 1)
    return score / length_factor


def tokenize_query(query: str, min_length: int = 3) -> list[str]:
    """
    Split a query into meaningful keywords.
    Removes common stop words.
    """
    STOP_WORDS = {
        "the", "and", "for", "with", "that", "this", "from", "have",
        "has", "had", "are", "was", "were", "been", "being", "would",
        "could", "should", "will", "shall", "can", "may", "might",
        "about", "into", "onto", "over", "under", "through", "during",
        "between", "among", "what", "when", "where", "which", "who",
        "whom", "whose", "why", "how", "any", "all", "some", "each",
        "every", "both", "few", "more", "most", "other", "such", "not",
        "only", "own", "same", "than", "too", "very", "just", "also",
        "get", "got", "let", "make", "made", "take", "took", "go", "went",
        "see", "seen", "say", "said", "tell", "told", "ask", "asked",
        "give", "gave", "want", "wanted", "know", "knew", "think",
        "thought", "find", "found", "use", "used", "using", "does",
        "did", "doing", "done",
    }

    # Lowercase and split on non-letter chars
    words = re.findall(r"\b[a-z0-9]+\b", query.lower())

    # Filter out stop words and very short words
    filtered = [w for w in words if len(w) >= min_length and w not in STOP_WORDS]

    # Also include some multi-word phrases if they exist
    return filtered


def find_relevant_chunks(
    chunks: list[dict],
    query: str,
    top_k: int = 5,
) -> list[dict]:
    """
    Given a list of chunks (from a file), find the top-K most relevant to the query.
    """
    if not chunks:
        return []

    if len(chunks) <= top_k:
        # Short doc — return everything
        return chunks

    query_words = tokenize_query(query)
    if not query_words:
        # No useful keywords — return first chunks
        return chunks[:top_k]

    # Score every chunk
    scored = []
    for chunk in chunks:
        score = score_chunk(chunk.get("text", ""), query_words)
        scored.append((score, chunk))

    # Sort by score descending
    scored.sort(key=lambda x: x[0], reverse=True)

    # Return top K
    top = [c for _, c in scored[:top_k]]

    # Re-sort by position so citations stay in document order
    top.sort(key=lambda c: c.get("position", 0))

    return top