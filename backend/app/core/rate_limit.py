import os
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address


def _key_func(request: Request) -> str:
    """
    Prefer user id (from JWT) so authenticated endpoints are
    limited per-user, not per-IP. Falls back to IP.

    The JWT is decoded without hitting the DB — just to extract `sub`.
    """
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            from app.core.security import decode_access_token
            subject = decode_access_token(auth.split(" ", 1)[1])
            if subject:
                return f"user:{subject}"
        except Exception:
            pass

    client = request.client
    ip = client.host if client else "unknown"
    return f"ip:{ip}"


limiter = Limiter(
    key_func=_key_func,
    default_limits=["300/minute"],  # global default; override per-route
    storage_uri=os.getenv("REDIS_URL", "memory://"),
    headers_enabled=True,           # adds X-RateLimit-* headers
)


def register_rate_limiter(app: FastAPI) -> None:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)