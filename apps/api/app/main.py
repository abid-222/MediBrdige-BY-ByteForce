import logging, uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.db import Base, engine, SessionLocal
from app.core.errors import install_error_handlers
from app.core.logging_setup import configure_logging
from app import models  # noqa: F401  (register tables)
from app.modules.auth.router import router as auth
from app.modules.access.router import router as access
from app.modules.patients.router import router as patients
from app.modules.directory.router import router as directory
from app.modules.documents.router import router as documents
from app.modules.observations.router import router as observations
from app.modules.navigator.router import router as navigator
from app.modules.appointments.router import router as appointments
from app.modules.notes.router import router as notes
from app.modules.facility.router import router as facility
from app.modules.admin.router import router as admin
from app.modules.ai.router import router as ai
from app.modules.ml.router import router as ml

configure_logging()
settings.validate_production()      # raises on insecure production config: the process refuses to start
log = logging.getLogger("medibridge")


@asynccontextmanager
async def lifespan(_app):
    if settings.app_env == "dev":      # dev convenience only. Production: `alembic upgrade head` + `python -m app.seed reference`
        Base.metadata.create_all(engine)
        from app.seed import seed_reference
        db = SessionLocal()
        try:
            seed_reference(db)
        finally:
            db.close()
    yield


app = FastAPI(lifespan=lifespan, title="MediBridge AI API", version="0.1.0",
              description="AI assists. Doctors decide. Patients stay in control. Prototype: synthetic data only.")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
install_error_handlers(app)


@app.middleware("http")
async def request_id(request: Request, call_next):
    rid = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["x-request-id"] = rid
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    if request.url.path.startswith("/api/v1/files/"):
        # Report previews are framed by the web app (different origin): allow only the configured web origins.
        response.headers["Content-Security-Policy"] = "frame-ancestors " + " ".join(o.strip() for o in settings.cors_origins.split(","))
    else:
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cache-Control", "no-store")   # medical data must not sit in shared caches
    return response


for r in (auth, access, patients, directory, documents, observations, navigator, appointments, notes, facility, admin, ai, ml):
    app.include_router(r, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "app": "MediBridge AI API",
        "tagline": "AI assists. Doctors decide. Patients stay in control.",
        "docs": "/docs",
        "frontend": "http://localhost:3000",
        "health": "/health",
        "version": "0.1.0"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/ready")
def ready():
    """Readiness: verifies the database answers. Used by Docker/orchestrators."""
    from sqlalchemy import text
    from fastapi.responses import JSONResponse
    try:
        with engine.connect() as c:
            c.execute(text("select 1"))
        return {"status": "ready", "env": settings.app_env}
    except Exception:
        log.exception("readiness check failed")
        return JSONResponse({"status": "unavailable"}, status_code=503)
