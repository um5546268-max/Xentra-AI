import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.generated_video import GeneratedVideo
from app.services import video_service
from app.core.rate_limit import limiter


router = APIRouter(prefix="/videos", tags=["videos"])


# ═══════════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════════
class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    negative_prompt: Optional[str] = Field(default=None, max_length=500)

    provider: str = "wan"
    model: Optional[str] = None

    # Video options
    duration: int = Field(default=5, ge=1, le=20)
    resolution: str = "1280x720"       # "1280x720" | "720x1280" | "1920x1080" | "1080x1920" | "1024x1024"
    aspect_ratio: str = "16:9"          # "16:9" | "9:16" | "1:1" | "4:3" | "3:4"
    fps: int = Field(default=24, ge=8, le=60)

    # Creativity
    seed: Optional[int] = None
    motion_strength: int = Field(default=5, ge=1, le=10)     # 1=subtle, 10=dramatic
    guidance_scale: float = Field(default=7.5, ge=1.0, le=20.0)

    # Style
    style: Optional[str] = None          # "cinematic" | "anime" | "3d" | "realistic" | None
    camera_movement: Optional[str] = None  # "static" | "pan-left" | "pan-right" | "zoom-in" | "zoom-out"

    # Image-to-video
    image_url: Optional[str] = None


class VideoRead(BaseModel):
    id: str
    prompt: str
    provider: str
    status: str
    progress: int
    video_url: Optional[str]
    thumbnail_url: Optional[str]
    duration_seconds: int
    width: int
    height: int
    fps: int
    error: Optional[str]
    created_at: str

    @classmethod
    def from_row(cls, row: GeneratedVideo):
        return cls(
            id=str(row.id),
            prompt=row.prompt,
            provider=row.provider,
            status=row.status,
            progress=row.progress,
            video_url=row.video_url,
            thumbnail_url=row.thumbnail_url,
            duration_seconds=row.duration_seconds or 5,
            width=row.width or 1280,
            height=row.height or 720,
            fps=row.fps or 24,
            error=row.error,
            created_at=row.created_at.isoformat() if row.created_at else "",
        )


# ═══════════════════════════════════════════════════════════════
# OPTIONS — exposes defaults and allowed values to the frontend
# ═══════════════════════════════════════════════════════════════
@router.get("/options")
def get_options(current_user: User = Depends(get_current_user)):
    """Return all configurable options for the video generator."""
    return {
        "resolutions": [
            {"value": "1280x720",  "label": "720p HD",      "w": 1280, "h": 720},
            {"value": "1920x1080", "label": "1080p Full HD","w": 1920, "h": 1080},
            {"value": "720x1280",  "label": "720p Vertical","w": 720,  "h": 1280},
            {"value": "1080x1920", "label": "1080p Vertical","w": 1080,"h": 1920},
            {"value": "1024x1024", "label": "1:1 Square",    "w": 1024, "h": 1024},
        ],
        "aspect_ratios": [
            {"value": "16:9", "label": "Landscape (16:9)"},
            {"value": "9:16", "label": "Portrait (9:16)"},
            {"value": "1:1",  "label": "Square (1:1)"},
            {"value": "4:3",  "label": "Classic (4:3)"},
            {"value": "3:4",  "label": "Portrait (3:4)"},
        ],
        "durations": [3, 5, 10, 15, 20],
        "fps_values": [12, 16, 24, 30, 60],
        "styles": [
            {"value": "",          "label": "None"},
            {"value": "cinematic", "label": "Cinematic"},
            {"value": "realistic", "label": "Realistic"},
            {"value": "anime",     "label": "Anime"},
            {"value": "3d",        "label": "3D Render"},
            {"value": "cartoon",   "label": "Cartoon"},
            {"value": "noir",      "label": "Film Noir"},
            {"value": "vaporwave", "label": "Vaporwave"},
        ],
        "camera_movements": [
            {"value": "",           "label": "Static"},
            {"value": "pan-left",   "label": "Pan Left"},
            {"value": "pan-right",  "label": "Pan Right"},
            {"value": "zoom-in",    "label": "Zoom In"},
            {"value": "zoom-out",   "label": "Zoom Out"},
            {"value": "orbit",      "label": "Orbit"},
            {"value": "dolly",      "label": "Dolly"},
        ],
    }


# ═══════════════════════════════════════════════════════════════
# PROVIDERS
# ═══════════════════════════════════════════════════════════════
@router.get("/providers")
def list_providers(current_user: User = Depends(get_current_user)):
    return {"providers": video_service.get_available_providers()}


# ═══════════════════════════════════════════════════════════════
# GENERATE
# ═══════════════════════════════════════════════════════════════
@router.post("", response_model=VideoRead, status_code=201)
@limiter.limit("10/minute")
def generate_video(
    request: Request,
    response: Response,             # 👈 slowapi requirement
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.prompt.strip():
        raise HTTPException(400, "Prompt is required")

    # Parse width/height from resolution string
    try:
        w_str, h_str = payload.resolution.split("x")
        width, height = int(w_str), int(h_str)
    except Exception:
        width, height = 1280, 720

        # ── Apply provider capability limits BEFORE storing ──
    effective_duration = payload.duration
    effective_fps = payload.fps

    if payload.provider == "wan":
        # Wan 2.1 models only support 5s (or 5/10s for wan2.2)
        model_for_limits = payload.model or "wan2.1-t2v-turbo"
        if model_for_limits == "wan2.2-t2v-plus":
            effective_duration = 10 if payload.duration > 7 else 5
        else:
            effective_duration = 5
        # Wan always outputs 24fps
        effective_fps = 24

    row = GeneratedVideo(
        user_id=current_user.id,
        prompt=payload.prompt.strip(),
        mode="image-to-video" if payload.image_url else "text-to-video",
        provider=payload.provider,
        model=payload.model,
        duration_seconds=effective_duration,      # 👈 clamped
        width=width,
        height=height,
        fps=effective_fps,                        # 👈 clamped
        status="queued",
        provider_meta={
            "negative_prompt": payload.negative_prompt,
            "aspect_ratio": payload.aspect_ratio,
            "seed": payload.seed,
            "motion_strength": payload.motion_strength,
            "guidance_scale": payload.guidance_scale,
            "style": payload.style,
            "camera_movement": payload.camera_movement,
            "image_url": payload.image_url,
            "requested_duration": payload.duration,
            "requested_fps": payload.fps,
        },
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    try:
        result = video_service.submit_video(
            provider=payload.provider,
            prompt=payload.prompt,
            duration=payload.duration,
            size=f"{width}*{height}",
            fps=payload.fps,
            negative_prompt=payload.negative_prompt,
            seed=payload.seed,
            motion_strength=payload.motion_strength,
            guidance_scale=payload.guidance_scale,
            style=payload.style,
            camera_movement=payload.camera_movement,
            image_url=payload.image_url,
        )
        row.provider_task_id = result["task_id"]
        row.status = "running"
        row.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(row)
    except Exception as e:
        row.status = "failed"
        row.error = str(e)
        db.commit()
        raise HTTPException(500, f"Video generation failed: {e}")

    return VideoRead.from_row(row)


# ═══════════════════════════════════════════════════════════════
# LIST / STATUS / DELETE
# ═══════════════════════════════════════════════════════════════
@router.get("")
def list_videos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
):
    rows = (
        db.query(GeneratedVideo)
        .filter(GeneratedVideo.user_id == current_user.id)
        .order_by(GeneratedVideo.created_at.desc())
        .offset(offset)
        .limit(min(limit, 100))
        .all()
    )
    total = (
        db.query(GeneratedVideo)
        .filter(GeneratedVideo.user_id == current_user.id)
        .count()
    )
    return {
        "total": total,
        "videos": [VideoRead.from_row(r) for r in rows],
    }


@router.get("/{video_id}/status", response_model=VideoRead)
def get_video_status(
    video_id: str,
    response: Response,             # 👈 slowapi
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(GeneratedVideo, video_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(404, "Video not found")

    if row.status in ("queued", "running") and row.provider_task_id:
        try:
            result = video_service.check_status(row.provider, row.provider_task_id)
            row.status = result["status"]
            row.progress = result["progress"]
            row.video_url = result.get("video_url") or row.video_url
            row.error = result.get("error")
            if row.status in ("done", "failed"):
                row.finished_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(row)
        except Exception as e:
            print(f"[videos] status check failed: {e}")

    return VideoRead.from_row(row)


@router.delete("/{video_id}", status_code=204)
def delete_video(
    video_id: str,
    response: Response,             # 👈 slowapi
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(GeneratedVideo, video_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(404, "Video not found")
    db.delete(row)
    db.commit()
    return None