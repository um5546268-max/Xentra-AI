"""
Verify GitHub Sign-In OAuth code by exchanging it for a token + user profile.
"""
import httpx
from fastapi import HTTPException

from app.config import settings


GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


async def exchange_github_code(code: str) -> dict:
    """
    Exchange the OAuth `code` (from the frontend redirect) for a GitHub access
    token, then fetch the user's profile + primary email.
    Returns: { id, login, name, email, avatar_url }
    """
    client_id = getattr(settings, "GITHUB_SIGNIN_CLIENT_ID", None)
    client_secret = getattr(settings, "GITHUB_SIGNIN_CLIENT_SECRET", None)
    if not client_id or not client_secret:
        raise HTTPException(500, "GitHub sign-in not configured")

    # 1. Exchange code → access token
    async with httpx.AsyncClient() as client:
        r = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
            },
            timeout=15,
        )

    if r.status_code != 200:
        raise HTTPException(502, f"GitHub token error: {r.text[:200]}")

    token_data = r.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(401, f"GitHub did not return a token: {token_data}")

    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    # 2. Fetch user profile
    async with httpx.AsyncClient() as client:
        u = await client.get(GITHUB_USER_URL, headers=auth_headers, timeout=15)
        e = await client.get(GITHUB_EMAILS_URL, headers=auth_headers, timeout=15)

    if u.status_code != 200:
        raise HTTPException(502, f"GitHub user error: {u.text[:200]}")

    user = u.json()

    # 3. Get primary verified email
    email = user.get("email")
    if not email and e.status_code == 200:
        emails = e.json()
        primary = next(
            (x for x in emails if x.get("primary") and x.get("verified")),
            None,
        )
        if primary:
            email = primary["email"]

    if not email:
        raise HTTPException(401, "GitHub account has no verified email")

    return {
        "id": str(user["id"]),
        "login": user.get("login"),
        "name": user.get("name") or user.get("login"),
        "email": email.lower().strip(),
        "avatar_url": user.get("avatar_url"),
    }