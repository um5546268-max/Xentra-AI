from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
import uuid
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    email: EmailStr
    full_name: str | None = None
    id: UUID
    is_admin: bool = False
    plan: str = "free"
    emergency_stop: bool = False
    created_at: datetime

    avatar_url: str | None = None
    google_id: str | None = None
    display_name: str | None = None

    onboarding_completed: bool = False
    class_level: str | None = None
    learning_goal: str | None = None
    interests: list[str] | None = None
    display_name: str | None = None
    tour_completed: bool = False
    avatar_url: str | None = None             # ← NEW

    class Config:
        from_attributes = True