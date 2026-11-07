from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import settings

_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
_pool = {} if settings.database_url.startswith("sqlite") else dict(pool_pre_ping=True, pool_size=5, max_overflow=5, pool_recycle=1800)  # small pool: Supabase poolers cap connections
engine = create_engine(settings.database_url, connect_args=_args, future=True, **_pool)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
