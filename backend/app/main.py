from app.models import User, Conversation, Message, Task, Integration, UserFile, GeneratedImage  # noqa: F401

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routes import automations as automation_routes
from app.routes import notifications as notification_routes

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


# ==== Create the app ====
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Xentra AI — Your AI Operating Assistant",
    version="0.1.0",
)


# ==== CORS ====
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o) for o in settings.CORS_ORIGINS.split(",")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ==== Static files (uploaded images) ====
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
    return {"message": f"Welcome to {settings.PROJECT_NAME} API. Go to /docs for documentation."}