from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Xentra AI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    DATABASE_URL: str
    CORS_ORIGINS: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"

    # AI provider
    GROQ_API_KEY: str = ""
    AI_PROVIDER: str = "groq"
    AI_MODEL: str = "openai/gpt-oss-120b"
    AI_MAX_TOKENS: int = 2048
    AI_TEMPERATURE: float = 0.7

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()