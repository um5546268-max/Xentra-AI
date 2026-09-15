import asyncio
from fastapi import APIRouter, Depends, HTTPException, status

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