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

        # Integrations - GitHub
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/integrations/github/callback"

        # Integrations
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/integrations/google/callback"
    FRONTEND_URL: str = "http://localhost:3000"

        # Integrations - Spotify
    SPOTIFY_CLIENT_ID: str = "2f1f4c33ceed468dba381d2f9293c052"
    SPOTIFY_CLIENT_SECRET: str = "88824100c4614486ad9ccaad4d039042"
    SPOTIFY_REDIRECT_URI: str = "http://127.0.0.1:8000/api/integrations/spotify/callback"

    # YouTube
    YOUTUBE_API_KEY: str = ""

        # Local media
    MEDIA_ROOTS: str = ""

        # Shopping
    SCRAPERAPI_KEY: str = ""

        # Maps
    GOOGLE_MAPS_API_KEY: str = ""

        # Code agent
    CODE_WORKSPACE: str = ""
    CODE_MAX_FILE_SIZE: int = 1_048_576
    CODE_COMMAND_TIMEOUT: int = 30

    UPLOAD_DIR: str = "C:/Users/um554/Xentra/backend/uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024

        # Automation
    AUTOMATION_SECRET: str = ""
    AUTOMATION_INTERVAL_MINUTES: int = 5

    # TAVILY API key
    TAVILY_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()