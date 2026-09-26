from app.database import SessionLocal
from app.models.user import User
from app.models.plan import Plan
from app.models.subscription import Subscription

MY_EMAIL = "um5546268@gmail.com"
PAID_PLAN_SLUG = "pro"

db = SessionLocal()

plan = db.query(Plan).filter(Plan.slug == PAID_PLAN_SLUG).first()
if not plan:
    print("Plan not found. Available plans:")
    for p in db.query(Plan).all():
        print("   -", p.slug, ":", p.name)
    db.close()
    exit()

print("Found plan:", plan.id, "-", plan.name)

user = db.query(User).filter(User.email == MY_EMAIL).first()
if not user:
    print("User not found:", MY_EMAIL)
    db.close()
    exit()

print("Found user:", user.id, "-", user.email)

sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
if sub:
    sub.plan_id = plan.id
    sub.status = "active"
    print("Updated subscription to Pro")
else:
    sub = Subscription(user_id=user.id, plan_id=plan.id, status="active")
    db.add(sub)
    print("Created new subscription")

db.commit()
db.refresh(sub)
print("DONE!", user.email, "is now on Pro plan.")

db.close()