from app.models import User, Conversation, Message, Task, Integration, UserFile, GeneratedImage  # noqa: F401

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.routes import automations as automation_routes
from app.routes import notifications as notification_routes
from fastapi import FastAPI, HTTPException

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

    from fastapi import Request
from fastapi.responses import JSONResponse


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Enforce rate limits on API routes.
    Skips docs, static, health.
    """
    path = request.url.path

    # Skip non-API routes
    if not path.startswith("/api/"):
        return await call_next(request)

    # Skip health and static
    if path in ("/api/health",) or path.startswith("/static/"):
        return await call_next(request)

    # Try to identify the user from the JWT
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import decode_access_token
            token = auth_header.split(" ", 1)[1]
            subject = decode_access_token(token)
            if subject:
                user_id = subject
        except Exception:
            pass

    # Fall back to IP if no user
    if not user_id:
        user_id = f"ip:{request.client.host if request.client else 'unknown'}"

    try:
        from app.services.rate_limit import check_rate_limit
        check_rate_limit(user_id)
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"detail": e.detail},
        )

    return await call_next(request)


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
app.include_router(permission_routes.router, prefix=settings.API_V1_STR)
app.include_router(audit_routes.router, prefix=settings.API_V1_STR)
app.include_router(pending_routes.router, prefix=settings.API_V1_STR)
app.include_router(system_routes.router, prefix=settings.API_V1_STR)
app.include_router(voice_routes.router, prefix=settings.API_V1_STR)
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