"""RLS deny-by-default, append-only audit_logs trigger, pgvector (Postgres/Supabase only)

Runs the same SQL as supabase/migrations/0001_extensions.sql + 0003_security.sql so `alembic upgrade head`
and the Supabase SQL editor give identical results.
Revision ID: 0003
"""
import os
from alembic import op

revision = "0003"
down_revision = "0002"
HERE = os.path.dirname(__file__)
CANDIDATES = [os.path.join(HERE, "..", "..", "..", "..", "supabase", "migrations"), "/supabase/migrations", os.environ.get("SUPABASE_MIGRATIONS_DIR", "")]


def _read(name):
    for d in CANDIDATES:
        p = os.path.join(d, name) if d else ""
        if p and os.path.exists(p):
            return open(p, encoding="utf-8").read()
    raise FileNotFoundError(f"{name} not found; set SUPABASE_MIGRATIONS_DIR")


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return                      # SQLite (dev/tests) has no RLS / extensions
    for f in ("0001_extensions.sql", "0003_security.sql"):
        bind.exec_driver_sql(_read(f).replace("%", "%%"))


def downgrade():
    pass                            # security hardening is intentionally not auto-reversible
