from pydantic import BaseModel, Field


class BrowserOpenRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2000)


class BrowserClickRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2000)
    selector: str = Field(min_length=1, max_length=500)


class BrowserFillRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2000)
    fields: dict[str, str]
    submit_selector: str | None = None


class BrowserResult(BaseModel):
    url: str
    title: str
    text: str
    screenshot_b64: str
    error: str | None = None