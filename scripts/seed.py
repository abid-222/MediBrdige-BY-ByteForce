"""Usage: cd apps/api && python ../../scripts/seed.py     (idempotent; synthetic data only)"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))
from app.core.db import Base, SessionLocal, engine
from app.core.config import settings
from app import models  # noqa
from app.seed import seed_demo

Base.metadata.create_all(engine)
db = SessionLocal()
print(seed_demo(db, settings.upload_dir))
print("Demo accounts: patient1..5 / doctor1..4 / hospital / admin / reviewer  @demo.medibridge.dev")
