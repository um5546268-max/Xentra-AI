"""
Verify Google Sign-In ID tokens.
"""
from fastapi import HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings


def verify_google_id_token(token: str) -> dict:
    """
    Verify a Google ID token and return its claims (email, name, picture, sub).
    Raises HTTPException if verification fails.
    """
    # ✅ FIX: Try both variable names
    client_id = (
        getattr(settings, "GOOGLE_SIGNIN_CLIENT_ID", None)
        or getattr(settings, "GOOGLE_CLIENT_ID", None)
    )
    
    if not client_id:
        raise HTTPException(500, "GOOGLE_SIGNIN_CLIENT_ID or GOOGLE_CLIENT_ID not configured in .env")

    try:
        claims = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id,
            clock_skew_in_seconds=10,
        )
    except ValueError as e:
        raise HTTPException(401, f"Invalid Google token: {e}")

    # Basic checks
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(401, "Invalid token issuer")

    if not claims.get("email"):
        raise HTTPException(401, "Google token missing email")

    if not claims.get("email_verified"):
        raise HTTPException(401, "Google email not verified")

    return claims