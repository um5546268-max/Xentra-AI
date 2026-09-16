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


class DiffPreviewRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    content: str


class DiffPreviewResponse(BaseModel):
    path: str
    exists: bool
    additions: int
    deletions: int
    lines_changed: int
    diff: str
    old_size: int
    new_size: int


class SyntaxCheckRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    content: str


class SyntaxCheckResponse(BaseModel):
    ok: bool
    error: str | None = None
    language: str


class GitCommitRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class CodeAssistantRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    instruction: str = Field(min_length=2, max_length=2000)


class RunCodeRequest(BaseModel):
    path: str = Field(min_length=1, max_length=500)
    args: list[str] = Field(default_factory=list)
    command: str = Field(default="python", pattern="^(python|pytest|unittest)$")


class RunCodeResponse(BaseModel):
    command: str
    exit_code: int
    stdout: str
    stderr: str
    success: bool
    timed_out: bool
    duration_ms: int | None = None