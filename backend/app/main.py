from app.models import (
    User, Conversation, Message, Task, Integration,
    UserFile, GeneratedImage,
)  # noqa: F401

from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings

# Routers
from app.routes import auth as auth_routes
from app.routes import conversations as conversation_routes
from app.routes import chat as chat_routes
from app.routes import tasks as task_routes
from app.routes import browser as browser_routes
from app.routes import integrations as integration_routes
from app.routes import google as google_routes
from app.routes import github as github_routes
from app.routes import spotify as spotify_routes
from app.routes import youtube as youtube_routes
from app.routes import local_media as media_routes
from app.routes import shopping as shopping_routes
from app.routes import maps as maps_routes
from app.routes import code as code_routes
from app.routes import files as files_routes
from app.routes import images as image_routes
from app.routes import memory as memory_routes
from app.routes import permissions as permission_routes
from app.routes import audit as audit_routes
from app.routes import pending_actions as pending_routes
from app.routes import system as system_routes
from app.routes import voice as voice_routes
from app.routes import billing as billing_routes
from app.routes import admin as admin_routes
from app.routes import automations as automation_routes
from app.routes import notifications as notification_routes
from app.routes import bees as bee_routes
from app.routes import integrations_lang as lang_routes
import os
from pathlib import Path
from app.routes import videos as video_routes
from app.routes import learn as learn_routes
# Core
from app.core.sentry import init_sentry
from app.core.logging import setup_logging
from app.core.rate_limit import register_rate_limiter
from app.middleware.request_id import RequestIDMiddleware
from app.routes import gamification as gamification_routes
from app.routes import briefing as briefing_routes
from app.routes import notes as note_routes
from app.routes import goals as goal_routes
from app.routes import progress as progress_routes
from app.routes import practice as practice_routes
from app.routes import library as library_routes

setup_logging()
init_sentry()

# Auto-add MSYS2 to PATH on Windows if present
if os.name == "nt":
    for sub in ("mingw64", "ucrt64", "clang64"):
        msys_bin = Path(r"C:\msys64") / sub / "bin"
        if msys_bin.exists() and str(msys_bin) not in os.environ.get("PATH", ""):
            os.environ["PATH"] = f"{msys_bin}{os.pathsep}{os.environ.get('PATH', '')}"

# ==== App ====
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Xentra AI — Your AI Operating Assistant",
    version="0.1.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
)

# Rate limiting (slowapi)
register_rate_limiter(app)

# Request ID
app.add_middleware(RequestIDMiddleware)


# ==== CORS ====
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )


# ==== Static files ====
_upload_dir = Path(settings.UPLOAD_DIR).expanduser().resolve()
_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_upload_dir)), name="static")


# ==== Routers ====
app.include_router(auth_routes.router, prefix=settings.API_V1_STR)
app.include_router(conversation_routes.router, prefix=settings.API_V1_STR)
app.include_router(chat_routes.router, prefix=settings.API_V1_STR)
app.include_router(task_routes.router, prefix=settings.API_V1_STR)
app.include_router(browser_routes.router, prefix=settings.API_V1_STR)
app.include_router(integration_routes.router, prefix=settings.API_V1_STR)
app.include_router(google_routes.router, prefix=settings.API_V1_STR)
app.include_router(github_routes.router, prefix=settings.API_V1_STR)
app.include_router(spotify_routes.router, prefix=settings.API_V1_STR)
app.include_router(youtube_routes.router, prefix=settings.API_V1_STR)
app.include_router(media_routes.router, prefix=settings.API_V1_STR)
app.include_router(shopping_routes.router, prefix=settings.API_V1_STR)
app.include_router(maps_routes.router, prefix=settings.API_V1_STR)
app.include_router(code_routes.router, prefix=settings.API_V1_STR)
app.include_router(files_routes.router, prefix=settings.API_V1_STR)
app.include_router(image_routes.router, prefix=settings.API_V1_STR)
app.include_router(memory_routes.router, prefix=settings.API_V1_STR)
app.include_router(automation_routes.router, prefix=settings.API_V1_STR)
app.include_router(notification_routes.router, prefix=settings.API_V1_STR)
app.include_router(permission_routes.router, prefix=settings.API_V1_STR)
app.include_router(audit_routes.router, prefix=settings.API_V1_STR)
app.include_router(pending_routes.router, prefix=settings.API_V1_STR)
app.include_router(system_routes.router, prefix=settings.API_V1_STR)
app.include_router(voice_routes.router, prefix=settings.API_V1_STR)
app.include_router(billing_routes.router, prefix=settings.API_V1_STR)
app.include_router(admin_routes.router, prefix=settings.API_V1_STR)
app.include_router(bee_routes.router, prefix=settings.API_V1_STR)
app.include_router(lang_routes.router, prefix=settings.API_V1_STR)
app.include_router(video_routes.router, prefix=settings.API_V1_STR)
app.include_router(learn_routes.router, prefix=settings.API_V1_STR)
app.include_router(gamification_routes.router, prefix=settings.API_V1_STR)
app.include_router(briefing_routes.router, prefix=settings.API_V1_STR)
app.include_router(note_routes.router, prefix=settings.API_V1_STR)
app.include_router(goal_routes.router, prefix=settings.API_V1_STR)
app.include_router(progress_routes.router, prefix=settings.API_V1_STR)
app.include_router(practice_routes.router, prefix=settings.API_V1_STR)
app.include_router(library_routes.router, prefix=settings.API_V1_STR)

# ==== Health & root ====
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
    }


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API. "
                   f"Go to /docs for documentation."
    }