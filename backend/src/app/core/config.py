from contextlib import suppress
from pathlib import Path
import secrets
import tempfile

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


def _default_secret_key() -> str:
    secret_file = Path(tempfile.gettempdir()) / "csd_student_testing_secret.key"
    with suppress(OSError):
        if secret_file.exists():
            existing = secret_file.read_text(encoding="utf-8").strip()
            if existing:
                return existing
    generated = secrets.token_urlsafe(32)
    with suppress(OSError):
        secret_file.write_text(generated, encoding="utf-8")
    return generated


class Settings(BaseSettings):
    PROJECT_NAME: str = "CSD Student Testing Platform"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./dev.db"

    # Authentication / JWT Configuration
    SECRET_KEY: str = Field(default_factory=_default_secret_key)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_TOKEN_COOKIE_NAME: str = "refresh_token"
    COOKIE_SECURE: bool = False
    MAX_FAILED_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_MINUTES: int = 15

    # CORS Configuration
    BACKEND_CORS_ORIGINS: list[AnyHttpUrl] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # Azure Communication Services Email Configuration
    AZURE_COMMUNICATION_CONNECTION_STRING: str | None = None
    AZURE_COMMUNICATION_SENDER_EMAIL: str | None = None
    EMAIL_ENABLED: bool = True
    EMAIL_TIMEOUT_SECONDS: int = 30

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(str(_BACKEND_ENV_FILE), ".env"),
        env_file_encoding="utf-8",
    )


settings = Settings()
