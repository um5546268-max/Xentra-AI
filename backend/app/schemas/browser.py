from pydantic import BaseModel, Field


# ---------- Single actions ----------

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


# ---------- Chains ----------

class BrowserStep(BaseModel):
    action: str = Field(pattern="^(open|click|fill|wait|screenshot)$")
    url: str | None = None
    selector: str | None = None
    value: str | None = None
    ms: int | None = None


class BrowserChainRequest(BaseModel):
    steps: list[BrowserStep] = Field(min_length=1, max_length=20)


class BrowserStepResult(BaseModel):
    index: int
    action: str
    url: str
    title: str
    text: str
    screenshot_b64: str
    error: str | None = None


class BrowserChainResult(BaseModel):
    steps: list[BrowserStepResult]
    final_url: str
    final_title: str
    error: str | None = None


# ---------- Auto (AI-generated chains) ----------

class BrowserAutoRequest(BaseModel):
    goal: str = Field(min_length=3, max_length=500)


class BrowserAutoResponse(BaseModel):
    goal: str
    steps: list[BrowserStep]
    error: str | None = None