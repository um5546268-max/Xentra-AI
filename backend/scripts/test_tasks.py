import requests

BASE = "http://localhost:8000"

# Login
r = requests.post(f"{BASE}/api/auth/login", json={
    "email": "test@xentra.ai",
    "password": "supersecret123",
})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create tasks
print("=== Creating 3 tasks ===")
for i, (ttype, payload) in enumerate([
    ("research", {"query": "best laptops under 100k"}),
    ("code", {"prompt": "write a calculator in python"}),
    ("shopping", {"item": "wireless headphones"}),
], 1):
    r = requests.post(f"{BASE}/api/tasks", headers=headers,
                     json={"type": ttype, "payload": payload})
    print(f"Task {i}: {r.status_code} — {r.json().get('id')}")

# List
print("\n=== All tasks ===")
r = requests.get(f"{BASE}/api/tasks", headers=headers)
for t in r.json():
    print(f"  [{t['status']:8}] {t['progress']:3}% {t['type']} — {t['payload']}")