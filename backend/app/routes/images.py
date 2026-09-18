import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.image import GeneratedImage
from app.models.conversation import Conversation
from app.schemas.image import (
    ImageGenerateRequest,
    ImageRead,
    ImageListResponse,
)
from app.services.images import generate_image_url, download_and_store_image
from app.services.billing import check_and_record
from app.services.audit import log_quick

router = APIRouter(prefix="/images", tags=["images"])


@router.post("/generate", response_model=ImageRead, status_code=201)
def generate(
    payload: ImageGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an image from a text prompt."""
    # Usage limit
    check_and_record(db, current_user.id, "images", 1)

    if payload.conversation_id:
        convo = db.get(Conversation, payload.conversation_id)
        if not convo or convo.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")

    try:
        result = generate_image_url(
            prompt=payload.prompt,
            width=payload.width,
            height=payload.height,
            model=payload.model,
            seed=payload.seed,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Download locally so it persists
    try:
        local_url = download_and_store_image(
            result["image_url"], str(current_user.id)
        )
    except Exception as e:
        print(f"[images] Download failed, using remote: {e}")
        local_url = result["image_url"]

    image = GeneratedImage(
        user_id=current_user.id,
        conversation_id=payload.conversation_id,
        prompt=result["prompt"],
        enhanced_prompt=result["enhanced_prompt"],
        provider=result["provider"],
        model=result["model"],
        width=result["width"],
        height=result["height"],
        seed=result["seed"],
        image_url=local_url,
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    log_quick(
        db, current_user.id,
        action="images.generate",
        summary=f"Generated image: {payload.prompt[:80]}",
        payload={"prompt": payload.prompt, "model": payload.model},
    )

    return image


@router.get("", response_model=ImageListResponse)
def list_images(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(GeneratedImage)
        .where(GeneratedImage.user_id == current_user.id)
        .order_by(GeneratedImage.created_at.desc())
        .limit(limit)
    )
    images = db.execute(stmt).scalars().all()
    return ImageListResponse(count=len(images), images=images)


@router.get("/{image_id}", response_model=ImageRead)
def get_image(
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = db.get(GeneratedImage, image_id)
    if not image or image.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Image not found")
    return image


@router.delete("/{image_id}", status_code=204)
def delete_image(
    image_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image = db.get(GeneratedImage, image_id)
    if not image or image.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Image not found")

    prompt_preview = image.prompt[:80] if image.prompt else "image"
    db.delete(image)
    db.commit()

    log_quick(
        db, current_user.id,
        action="images.delete",
        summary=f"Deleted image: {prompt_preview}",
    )
    return None