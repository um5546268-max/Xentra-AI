import uuid
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File as FastAPIFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.file import UserFile
from app.schemas.file import FileRead, FileDetail, FileListResponse
from app.services.files import save_upload, delete_file_on_disk, get_file_path

router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=FileListResponse)
def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(UserFile)
        .where(UserFile.user_id == current_user.id)
        .order_by(UserFile.created_at.desc())
    )
    files = db.execute(stmt).scalars().all()
    return FileListResponse(count=len(files), files=files)


@router.post("/upload", response_model=FileRead, status_code=201)
def upload_file(
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meta = save_upload(str(current_user.id), file)

    user_file = UserFile(
        user_id=current_user.id,
        original_name=meta["original_name"],
        stored_name=meta["stored_name"],
        mime_type=meta["mime_type"],
        extension=meta["extension"],
        size_bytes=meta["size_bytes"],
        status="uploaded",
    )
    db.add(user_file)
    db.commit()
    db.refresh(user_file)
    return user_file


@router.get("/{file_id}", response_model=FileDetail)
def get_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.get(UserFile, file_id)
    if not f or f.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    return FileDetail(
        **FileRead.model_validate(f).model_dump(),
        extracted_meta=f.extracted_meta,
        has_text=bool(f.extracted_text),
    )


@router.get("/{file_id}/download")
def download_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.get(UserFile, file_id)
    if not f or f.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    path = get_file_path(str(current_user.id), f.stored_name)
    if not path:
        raise HTTPException(status_code=404, detail="File missing from disk")

    return FileResponse(
        path,
        media_type=f.mime_type or "application/octet-stream",
        filename=f.original_name,
    )


@router.delete("/{file_id}", status_code=204)
def delete_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    f = db.get(UserFile, file_id)
    if not f or f.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="File not found")

    delete_file_on_disk(str(current_user.id), f.stored_name)
    db.delete(f)
    db.commit()
    return None