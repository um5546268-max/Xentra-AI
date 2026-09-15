import requests
import time

BASE = "http://localhost:8000"

# Login
r = requests.post(f"{BASE}/api/auth/login", json={
    "email": "test@xentra.ai",
    "password": "supersecret123",
})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Clean up old tasks
r = requests.get(f"{BASE}/api/tasks", headers=headers)
for t in r.json():
    requests.delete(f"{BASE}/api/tasks/{t['id']}", headers=headers)
print("Cleared old tasks.")

# Create 4 tasks
print("\n=== Creating 4 tasks ===")
task_ids = []
for ttype, payload in [
    ("research", {"query": "laptops"}),
    ("code",     {"prompt": "python calculator"}),
    ("shopping", {"item": "headphones"}),
    ("media",    {"query": "play music"}),
]:
    r = requests.post(f"{BASE}/api/tasks", headers=headers,
                     json={"type": ttype, "payload": payload})
    tid = r.json()["id"]
    task_ids.append(tid)
    print(f"  {ttype:9}: {tid}")

# Fire all 4 in parallel
print("\n=== Kicking off all 4 at once ===")
for tid in task_ids:
    requests.post(f"{BASE}/api/tasks/{tid}/run", headers=headers)
print("All 4 running.")

# Watch them
print("\n=== Watching live ===")
for i in range(30):
    time.sleep(0.5)
    r = requests.get(f"{BASE}/api/tasks", headers=headers)
    tasks = {t["id"]: t for t in r.json()}
    line = "  "
    for tid in task_ids:
        t = tasks[tid]
        line += f"[{t['type'][:4]:4}:{t['status'][:4]}:{t['progress']:3}%] "
    print(line)
    if all(tasks[tid]["status"] == "done" for tid in task_ids):
        print("\nAll done.")
        break