from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# server/ directory (parent of app/)
SERVER_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """
    Central configuration loaded from environment variables.
    FastAPI services read settings here instead of scattering os.getenv() calls.
    """
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Resume Analyzer API"
    debug: bool = False

    database_url: str = "postgresql://postgres:postgres@localhost:5432/resume_analyzer"

    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    upload_dir: str = "uploads"
    max_upload_size_mb: int = 10

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("upload_dir", mode="before")
    @classmethod
    def resolve_upload_dir(cls, value: str) -> str:
        """Always use an absolute path so uploads work regardless of process cwd (Windows-safe)."""
        path = Path(value)
        if not path.is_absolute():
            path = SERVER_ROOT / path
        return str(path.resolve())


@lru_cache
def get_settings() -> Settings:
    return Settings()
