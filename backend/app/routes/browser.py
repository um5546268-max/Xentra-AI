import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_permission
from app.models.user import User
from app.schemas.browser import (
    BrowserOpenRequest,
    BrowserClickRequest,
    BrowserFillRequest,
    BrowserResult,
    BrowserChainRequest,
    BrowserChainResult,
    BrowserAutoRequest,
    BrowserAutoResponse,
)
from app.services.browser_agent import (
    open_and_read,
    click_element,
    fill_form,
    run_chain,
)
from app.services.usage_guard import enforce_limit
from app.services.chain_generator import generate_chain
from app.services.audit import log_quick
from app.services.chain_generator import generate_chain
from app.deps import get_current_user
from app.models.user import User
from app.schemas.browser import (
    BrowserOpenRequest,
    BrowserClickRequest,
    BrowserFillRequest,
    BrowserResult,
    BrowserChainRequest,
    BrowserChainResult,
)
from app.services.browser_agent import (
    open_and_read,
    click_element,
    fill_form,
    run_chain,
)

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
    current_user: User = Depends(require_permission("browser.read")),
    db: Session = Depends(get_db),
    _limit: None = Depends(enforce_limit("browser_tasks")),   # ← ADD
):
    _validate_url(payload.url)
    result = await asyncio.to_thread(open_and_read, payload.url)
    if result.get("error"):
        log_quick(
            db, current_user.id,
            action="browser.open",
            status="failed",
            summary=f"Failed to open {payload.url}",
            error=result["error"],
        )
        raise HTTPException(status_code=502, detail=f"Browser error: {result['error']}")

    log_quick(
        db, current_user.id,
        action="browser.open",
        summary=f"Opened {payload.url}",
        payload={"url": payload.url},
        result={"title": result.get("title", "")[:100]},
    )
    return BrowserResult(**result)


@router.post("/click", response_model=BrowserResult)
async def browser_click(
    payload: BrowserClickRequest,
    current_user: User = Depends(require_permission("browser.click")),
    db: Session = Depends(get_db),
):
    _validate_url(payload.url)
    result = await asyncio.to_thread(
        click_element, payload.url, payload.selector
    )
    if result.get("error"):
        log_quick(
            db, current_user.id,
            action="browser.click",
            status="failed",
            summary=f"Failed click on {payload.url}",
            error=result["error"],
        )
        raise HTTPException(status_code=502, detail=f"Browser error: {result['error']}")

    log_quick(
        db, current_user.id,
        action="browser.click",
        summary=f"Clicked '{payload.selector}' on {payload.url}",
        payload={"url": payload.url, "selector": payload.selector},
    )
    return BrowserResult(**result)


@router.post("/fill", response_model=BrowserResult)
async def browser_fill(
    payload: BrowserFillRequest,
    current_user: User = Depends(require_permission("browser.fill")),
    db: Session = Depends(get_db),
):
    _validate_url(payload.url)
    if not payload.fields:
        raise HTTPException(status_code=400, detail="At least one field is required")
    result = await asyncio.to_thread(
        fill_form, payload.url, payload.fields, payload.submit_selector
    )
    if result.get("error"):
        log_quick(
            db, current_user.id,
            action="browser.fill",
            status="failed",
            summary=f"Failed form fill on {payload.url}",
            error=result["error"],
        )
        raise HTTPException(status_code=502, detail=f"Browser error: {result['error']}")

    log_quick(
        db, current_user.id,
        action="browser.fill",
        summary=f"Filled {len(payload.fields)} field(s) on {payload.url}",
        payload={"url": payload.url, "field_count": len(payload.fields)},
    )
    return BrowserResult(**result)
@router.post("/chain", response_model=BrowserChainResult)
async def browser_chain(
    payload: BrowserChainRequest,
    current_user: User = Depends(get_current_user),
):
    """Run a sequence of browser steps in one session."""
    # Validate all `open` steps have URLs
    for i, step in enumerate(payload.steps):
        if step.action == "open" and not step.url:
            raise HTTPException(
                status_code=400,
                detail=f"Step {i}: 'open' requires a url",
            )
        if step.action in ("click", "fill") and not step.selector:
            raise HTTPException(
                status_code=400,
                detail=f"Step {i}: '{step.action}' requires a selector",
            )
        if step.action == "fill" and step.value is None:
            raise HTTPException(
                status_code=400,
                detail=f"Step {i}: 'fill' requires a value",
            )
        if step.action == "open" and step.url:
            if not step.url.startswith(("http://", "https://")):
                raise HTTPException(
                    status_code=400,
                    detail=f"Step {i}: url must start with http:// or https://",
                )

    steps = [s.model_dump(exclude_none=True) for s in payload.steps]
    result = await asyncio.to_thread(run_chain, steps)

    if result.get("error") and not result.get("steps"):
        raise HTTPException(
            status_code=502,
            detail=f"Browser chain error: {result['error']}",
        )

    return BrowserChainResult(**result)
@router.post("/auto", response_model=BrowserAutoResponse)
async def browser_auto(
    payload: BrowserAutoRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a browser chain from a natural language goal (does not run it)."""
    result = await asyncio.to_thread(generate_chain, payload.goal)
    if result.get("error"):
        raise HTTPException(
            status_code=502,
            detail=f"Chain generation failed: {result['error']}",
        )
    return BrowserAutoResponse(
        goal=payload.goal,
        steps=result["steps"],
        error=None,
    )


@router.post("/auto-run", response_model=BrowserChainResult)
async def browser_auto_run(
    payload: BrowserAutoRequest,
    current_user: User = Depends(get_current_user),
    _limit: None = Depends(enforce_limit("browser_tasks")),   # ← ADD
):
    """Generate a chain AND run it in one shot."""
    gen = await asyncio.to_thread(generate_chain, payload.goal)
    if gen.get("error"):
        raise HTTPException(
            status_code=502,
            detail=f"Chain generation failed: {gen['error']}",
        )

    steps = gen["steps"]
    result = await asyncio.to_thread(run_chain, steps)

    if result.get("error") and not result.get("steps"):
        raise HTTPException(
            status_code=502,
            detail=f"Browser run failed: {result['error']}",
        )

    return BrowserChainResult(**result)