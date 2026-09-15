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

# Create a task
print("=== Creating task ===")
r = requests.post(f"{BASE}/api/tasks", headers=headers,
                 json={"type": "research", "payload": {"query": "test"}})
task = r.json()
task_id = task["id"]
print(f"Created: {task_id} (status={task['status']})")

# Run it
print("\n=== Running task ===")
r = requests.post(f"{BASE}/api/tasks/{task_id}/run", headers=headers)
print(f"Run kicked off: {r.status_code}")

# Poll every 0.5s until done
print("\n=== Watching progress ===")
for i in range(30):  # max 15s
    time.sleep(0.5)
    r = requests.get(f"{BASE}/api/tasks/{task_id}", headers=headers)
    t = r.json()
    print(f"  [{t['status']:8}] {t['progress']:3}%")
    if t["status"] in ("done", "failed"):
        print(f"\nResult: {t['result']}")
        break
else:
    print("\n(timeout — task didn't finish in 15s)")