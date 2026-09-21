import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class GeneratedVideo(Base):
    __tablename__ = "generated_videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=True)

    # Input
    prompt = Column(Text, nullable=False)
    enhanced_prompt = Column(Text, nullable=True)
    mode = Column(String(32), default="text-to-video")   # text-to-video | image-to-video

    # Provider
    provider = Column(String(32), default="wan")          # wan | sora | runway | kling
    model = Column(String(64), nullable=True)
    provider_task_id = Column(String(128), nullable=True, index=True)

    # Video metadata
    duration_seconds = Column(Integer, default=5)
    width = Column(Integer, default=1280)
    height = Column(Integer, default=720)
    fps = Column(Integer, default=24)

    # Output
    status = Column(String(24), default="queued", index=True)  # queued|running|done|failed
    progress = Column(Integer, default=0)
    video_url = Column(String(512), nullable=True)
    thumbnail_url = Column(String(512), nullable=True)
    error = Column(Text, nullable=True)

    # Extra provider data
    provider_meta = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="videos")