import logging
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_MODEL_FALLBACK: str = "gemini-2.0-flash"
    ALLOWED_ORIGINS: str = ""
    APP_ENV: str = "development"

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def _resolve_gemini_key(self) -> "Settings":
        if not self.GEMINI_API_KEY and self.GOOGLE_API_KEY:
            self.GEMINI_API_KEY = self.GOOGLE_API_KEY
        return self

    @field_validator(
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GEMINI_MODEL",
        "GEMINI_MODEL_FALLBACK",
    )
    @classmethod
    def _not_empty(cls, value: str, info):  # type: ignore[override]
        if not value or not value.strip():
            raise ValueError(f"{info.field_name} is required and cannot be empty")
        return value

    @field_validator("GEMINI_API_KEY")
    @classmethod
    def _gemini_key_required(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("GEMINI_API_KEY (or GOOGLE_API_KEY) is required")
        return value


try:
    settings = Settings()
except Exception as exc:
    logger.error("Settings validation failed: %s", exc.__class__.__name__)
    logger.error("%s", str(exc))
    raise
