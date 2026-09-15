"""
GitHub API wrapper.
"""
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException

from app.models.user import User
from app.models.integration import Integration


GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_REPOS_URL = "https://api.github.com/user/repos"


def _get_github_integration(db: Session, user: User) -> Integration:
    integration = db.execute(
        select(Integration)
        .where(Integration.user_id == user.id)
        .where(Integration.provider == "github")
    ).scalar_one_or_none()

    if not integration or integration.status != "connected":
        raise HTTPException(
            status_code=400,
            detail="GitHub not connected. Connect it first.",
        )
    return integration


def _headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


async def get_profile(db: Session, user: User) -> dict:
    integration = _get_github_integration(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            GITHUB_USER_URL,
            headers=_headers(integration.access_token or ""),
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub error: {r.text}")
    data = r.json()
    return {
        "login": data.get("login"),
        "name": data.get("name"),
        "avatar_url": data.get("avatar_url"),
        "public_repos": data.get("public_repos"),
        "followers": data.get("followers"),
        "following": data.get("following"),
        "bio": data.get("bio"),
        "html_url": data.get("html_url"),
    }


async def list_repos(
    db: Session,
    user: User,
    per_page: int = 10,
    sort: str = "updated",
) -> list[dict]:
    integration = _get_github_integration(db, user)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            GITHUB_REPOS_URL,
            headers=_headers(integration.access_token or ""),
            params={"per_page": per_page, "sort": sort},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub error: {r.text}")

    repos = r.json()
    return [
        {
            "id": repo.get("id"),
            "name": repo.get("name"),
            "full_name": repo.get("full_name"),
            "description": repo.get("description"),
            "language": repo.get("language"),
            "stars": repo.get("stargazers_count"),
            "forks": repo.get("forks_count"),
            "private": repo.get("private"),
            "url": repo.get("html_url"),
            "updated_at": repo.get("updated_at"),
        }
        for repo in repos
    ]