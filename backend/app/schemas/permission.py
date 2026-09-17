import uuid
from datetime import datetime
from pydantic import BaseModel


class PermissionRead(BaseModel):
    id: uuid.UUID
    key: str
    enabled: bool
    created_at: datetime
    updated_at: datetime

    # Enriched from registry
    scope: str | None = None
    tier: str | None = None
    label: str | None = None
    description: str | None = None

    model_config = {"from_attributes": True}


class PermissionListResponse(BaseModel):
    count: int
    permissions: list[dict]
    summary: dict


class PermissionUpdateRequest(BaseModel):
    key: str
    enabled: bool


class BulkPermissionUpdateRequest(BaseModel):
    updates: list[PermissionUpdateRequest]


class AuditLogRead(BaseModel):
    id: uuid.UUID
    action: str
    scope: str | None
    tier: str | None
    status: str
    source: str
    source_id: uuid.UUID | None
    summary: str | None
    payload: dict | None
    result: dict | None
    error: str | None
    reversible: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    count: int
    logs: list[AuditLogRead]