from pydantic import BaseModel, Field


class MapsSearchResponse(BaseModel):
    query: str
    count: int
    results: list[dict]


class DirectionsRequest(BaseModel):
    origin: str = Field(min_length=2, max_length=300)
    destination: str = Field(min_length=2, max_length=300)
    mode: str = Field(
        default="driving",
        pattern="^(driving|walking|bicycling|transit)$",
    )