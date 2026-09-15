import uuid
from datetime import datetime
from pydantic import BaseModel


class IntegrationRead(BaseModel):
    id: uuid.UUID
    provider: str
    status: str
    account_email: str | None
    account_name: str | None
    scopes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IntegrationCatalogItem(BaseModel):
    provider: str
    name: str
    description: str
    icon: str
    enabled: bool
    auth_type: str
    connected: bool


class IntegrationCatalogResponse(BaseModel):
    items: list[IntegrationCatalogItem]