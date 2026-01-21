from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_MODEL_FALLBACK: str = "gemini-2.0-flash"

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator(
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "GEMINI_API_KEY",
        "GEMINI_MODEL",
        "GEMINI_MODEL_FALLBACK",
    )
    @classmethod
    def _not_empty(cls, value: str, info):  # type: ignore[override]
        if not value or not value.strip():
            raise ValueError(f"{info.field_name} is required and cannot be empty")
        return value


settings = Settings()
