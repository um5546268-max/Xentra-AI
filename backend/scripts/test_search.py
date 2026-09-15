import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.search import web_search

print("Calling web_search...")
result = web_search("AI news", max_results=2)
print("Type of result:", type(result))
print("Raw result:", repr(result))