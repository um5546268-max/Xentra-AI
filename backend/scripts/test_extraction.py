import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.extraction import extract_text

# Create a test CSV
test_csv = Path("test_sample.csv")
test_csv.write_text(
    "name,age,city\nAlice,30,Karachi\nBob,25,Lahore\nCharlie,35,Islamabad\n",
    encoding="utf-8",
)

# Create a test TXT
test_txt = Path("test_sample.txt")
test_txt.write_text(
    "Xentra AI test document.\n\nThis is paragraph two.\nContains multiple lines.",
    encoding="utf-8",
)

# Create a test HTML
test_html = Path("test_sample.html")
test_html.write_text(
    "<html><body><h1>Title</h1><p>Hello world</p><p>Second paragraph</p></body></html>",
    encoding="utf-8",
)

for f, ext in [
    (test_csv, ".csv"),
    (test_txt, ".txt"),
    (test_html, ".html"),
]:
    print(f"\n=== {f.name} ===")
    result = extract_text(f, ext)
    print(f"Error: {result['error']}")
    print(f"Pages: {result['pages']}")
    print(f"Meta: {result['meta']}")
    print(f"Text ({len(result['text'])} chars):")
    print(result["text"][:400])
    f.unlink()