# Doesn't need args — analyzes files in the same workspace folder
import os

files = os.listdir(".")
print(f"Found {len(files)} items:")
for f in files:
    size = os.path.getsize(f) if os.path.isfile(f) else "dir"
    print(f"  {f} — {size}")