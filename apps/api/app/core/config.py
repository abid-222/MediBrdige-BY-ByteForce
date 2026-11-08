import os
from pydantic_settings import BaseSettings, SettingsConfigDict

STALE_AFTER_DAYS = 90          # single constant: backend flag, UI warning, admin tab, tests
OCR_CONFIDENCE_THRESHOLD = 0.85
OTP_TTL_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_MAX_RESEND_PER_HOUR = 3
SIGNED_URL_TTL_SECONDS = 300
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SUPPORTED_GEOGRAPHY = {"dhaka"}
SUPPORTED_REPORT_TYPES = {"cbc", "glucose"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "apps/api/.env"), extra="ignore")
    app_env: str = "dev"
    database_url: str = "sqlite:///./medibridge.db"
    jwt_secret: str = "dev-secret-change-me"
    cors_origins: str = "http://localhost:3000"
    upload_dir: str = "./uploads"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"


    # Email (OTP). provider: none | resend | smtp
    email_provider: str = "none"
    email_from: str = "MediBridge <onboarding@resend.dev>"
    resend_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    # File storage for uploaded reports: local | supabase (private bucket, server-side service key)
    storage_backend: str = "local"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_bucket: str = "reports"
    jwt_issuer: str = "medibridge-api"
    jwt_audience: str = "medibridge-web"
    session_hours: int = 8

    def validate_production(self):
        """Fail fast: never boot a production instance with insecure defaults."""
        if self.app_env == "dev":
            return
        problems = []
        if self.jwt_secret in ("dev-secret-change-me", "change-me-in-production", "") or len(self.jwt_secret) < 32:
            problems.append("JWT_SECRET must be a unique random value of at least 32 characters")
        if "*" in self.cors_origins:
            problems.append("CORS_ORIGINS must list explicit origins, not '*'")
        if self.database_url.startswith("sqlite"):
            problems.append("DATABASE_URL must point to Postgres in production")
        if self.storage_backend == "local":
            problems.append("STORAGE_BACKEND=local loses files on redeploy; use 'supabase' (or mount a persistent volume and set STORAGE_ALLOW_LOCAL=1)") if os.environ.get("STORAGE_ALLOW_LOCAL") != "1" else None
        if self.storage_backend == "supabase" and not (self.supabase_url and self.supabase_service_role_key):
            problems.append("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_BACKEND=supabase")
        if self.email_provider == "resend" and not self.resend_api_key:
            problems.append("RESEND_API_KEY is required when EMAIL_PROVIDER=resend")
        if self.email_provider == "smtp" and not (self.smtp_host and self.smtp_user and self.smtp_password):
            problems.append("SMTP_HOST/SMTP_USER/SMTP_PASSWORD are required when EMAIL_PROVIDER=smtp")
        if problems:
            raise RuntimeError("Insecure production configuration: " + "; ".join(problems))


LOGIN_MAX_FAILURES = 5
LOGIN_LOCK_MINUTES = 15
settings = Settings()
