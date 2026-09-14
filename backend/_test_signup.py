import requests
import json

BASE = "http://localhost:8000"

print("=" * 60)
print("TEST 1: Health check")
r = requests.get(f"{BASE}/api/health")
print("  Status:", r.status_code)
print("  Body:", r.text)

print("\n" + "=" * 60)
print("TEST 2: Signup")
r = requests.post(
    f"{BASE}/api/auth/signup",
    json={
        "email": "test@xentra.ai",
        "password": "supersecret123",
        "full_name": "Test User"
    }
)
print("  Status:", r.status_code)
print("  Body:", r.text[:1000])   # first 1000 chars

if r.status_code == 201:
    print("\n  ✅ Signup worked")
    token = r.json()["access_token"]
    print("  Token (first 40 chars):", token[:40], "...")

    print("\n" + "=" * 60)
    print("TEST 3: Me (protected)")
    r = requests.get(
        f"{BASE}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    print("  Status:", r.status_code)
    print("  Body:", r.text)

    print("\n" + "=" * 60)
    print("TEST 4: Create conversation")
    r = requests.post(
        f"{BASE}/api/conversations",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Neon test"}
    )
    print("  Status:", r.status_code)
    print("  Body:", r.text)

    print("\n" + "=" * 60)
    print("TEST 5: List conversations")
    r = requests.get(
        f"{BASE}/api/conversations",
        headers={"Authorization": f"Bearer {token}"}
    )
    print("  Status:", r.status_code)
    print("  Body:", r.text)
else:
    print("\n  ❌ Signup failed — see traceback in uvicorn terminal")

print("\n" + "=" * 60)