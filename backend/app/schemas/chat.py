from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    messages: list[ChatMessage] = Field(min_length=1)
    use_web_search: bool = False


class ChatUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: ChatUsage


class Source(BaseModel):
    title: str
    url: str