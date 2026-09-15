import asyncio
from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_current_user
from app.models.user import User
from app.schemas.browser import (
    BrowserOpenRequest,
    BrowserClickRequest,
    BrowserFillRequest,
    BrowserResult,
)
from app.services.browser_agent import open_and_read, click_element, fill_form

router = APIRouter(prefix="/browser", tags=["browser"])


def _validate_url(url: str) -> None:
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must start with http:// or https://",
        )


@router.post("/open", response_model=BrowserResult)
async def browser_open(
    payload: BrowserOpenRequest,
    current_user: User = Depends(get_current_user),
):
    _validate_url(payload.url)
    result = await asyncio.to_thread(open_and_read, payload.url)
    if result.get("error"):
        raise HTTPException(status_code=502, detail=f"Browser error: {result['error']}")
    return BrowserResult(**result)


@router.post("/click", response_model=BrowserResult)
async def browser_click(
    payload: BrowserClickRequest,
    current_user: User = Depends(get_current_user),
):
    _validate_url(payload.url)
    result = await asyncio.to_thread(click_element, payload.url, payload.selector)
    if result.get("error"):
        raise HTTPException(status_code=502, detail=f"Browser error: {result['error']}")
    return BrowserResult(**result)


@router.post("/fill", response_model=BrowserResult)
async def browser_fill(
    payload: BrowserFillRequest,
    current_user: User = Depends(get_current_user),
):
    _validate_url(payload.url)
    if not payload.fields:
        raise HTTPException(status_code=400, detail="At least one field is required")
    result = await asyncio.to_thread(
        fill_form, payload.url, payload.fields, payload.submit_selector
    )
    if result.get("error"):
        raise HTTPException(status_code=502, detail=f"Browser error: {result['error']}")
    return BrowserResult(**result)