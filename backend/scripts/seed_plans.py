import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.plan import Plan
from sqlalchemy import select

db = SessionLocal()

FREE_LIMITS = {
    "messages_per_day": 50,
    "tasks_per_day": 20,
    "images_per_day": 5,
    "files_storage_mb": 100,
    "automations_max": 2,
    "integrations_max": 2,
    "voice_minutes_per_day": 5,
    "memory_max": 50,
    "web_searches_per_day": 30,
}

PRO_LIMITS = {
    "messages_per_day": 2000,
    "tasks_per_day": 500,
    "images_per_day": 200,
    "files_storage_mb": 5120,
    "automations_max": 50,
    "integrations_max": 20,
    "voice_minutes_per_day": 300,
    "memory_max": 1000,
    "web_searches_per_day": 1000,
}

FREE_FEATURES = {
    "web_search": True,
    "browser_agent": True,
    "voice": True,
    "custom_models": False,
    "priority_support": False,
}

PRO_FEATURES = {
    "web_search": True,
    "browser_agent": True,
    "voice": True,
    "custom_models": True,
    "priority_support": True,
}

PLANS = [
    {
        "slug": "free",
        "name": "Free",
        "description": "Get started with Xentra",
        "price_cents": 0,
        "interval": "month",
        "limits": FREE_LIMITS,
        "features": FREE_FEATURES,
        "is_default": True,
        "display_order": 1,
    },
    {
        "slug": "pro",
        "name": "Pro",
        "description": "Unlimited power for power users",
        "price_cents": 1900,   # $19/month
        "interval": "month",
        "limits": PRO_LIMITS,
        "features": PRO_FEATURES,
        "is_default": False,
        "display_order": 2,
    },
]


for p in PLANS:
    existing = db.execute(select(Plan).where(Plan.slug == p["slug"])).scalar_one_or_none()
    if existing:
        # Update
        for k, v in p.items():
            setattr(existing, k, v)
        print(f"Updated plan: {p['slug']}")
    else:
        db.add(Plan(**p))
        print(f"Created plan: {p['slug']}")

db.commit()
db.close()
print("\nDone. Plans seeded.")