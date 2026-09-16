from pydantic import BaseModel, Field


class ReadFileResponse(BaseModel):
    path: str
    name: str
    size: int
    lines: int
    content: str
    modified_at: str


class WriteFileRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    content: str
    create_dirs: bool = True


class WriteFileResponse(BaseModel):
    path: str
    name: str
    size: int
    created: bool
    overwritten: bool
    modified_at: str


class DeleteFileResponse(BaseModel):
    path: str
    deleted: bool


class WorkspaceInfo(BaseModel):
    root: str
    path: str
    entries: list[dict]
    total: int
    max_reached: bool