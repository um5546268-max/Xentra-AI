from pydantic import BaseModel, Field


class OnboardingSubmit(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    class_level: str = Field(min_length=2, max_length=40)
    learning_goal: str = Field(min_length=2, max_length=40)
    interests: list[str] = Field(default_factory=list, max_length=10)


class OnboardingStatus(BaseModel):
    completed: bool
    display_name: str | None = None
    class_level: str | None = None
    learning_goal: str | None = None
    interests: list[str] | None = None
    tour_completed: bool = False