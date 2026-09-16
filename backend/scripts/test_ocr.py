import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.extraction import _find_tesseract, extract_text

# Step 1 — find tesseract
path = _find_tesseract()
print(f"Tesseract found at: {path}")
if not path:
    print("ERROR: Tesseract not installed or not on PATH")
    print("Download from: https://github.com/UB-Mannheim/tesseract/wiki")
    sys.exit(1)

# Step 2 — create a test image with text
try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: Pillow not installed")
    sys.exit(1)

print("\nCreating test image...")
img = Image.new("RGB", (700, 220), color="white")
draw = ImageDraw.Draw(img)

try:
    font = ImageFont.truetype("arial.ttf", 36)
except Exception:
    try:
        font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", 36)
    except Exception:
        font = ImageFont.load_default()

draw.text((20, 40), "Hello from Xentra AI", fill="black", font=font)
draw.text((20, 110), "This is an OCR test.", fill="black", font=font)
draw.text((20, 180), "Number: 12345", fill="black", font=font)

test_img = Path("test_ocr_sample.png")
img.save(test_img)
print(f"Saved: {test_img}")

# Step 3 — run OCR
print("\n=== OCR Result ===")
result = extract_text(test_img, ".png")
print(f"Error: {result['error']}")
print(f"Pages: {result['pages']}")
print(f"Meta: {result['meta']}")
print(f"Text ({len(result['text'])} chars):")
print(result["text"])

# Cleanup
test_img.unlink()