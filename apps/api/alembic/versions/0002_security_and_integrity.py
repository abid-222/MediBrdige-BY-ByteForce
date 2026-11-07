"""session revocation, login attempts, token_version, unique active appointment slot

Idempotent: a fresh database already has these from 0001 (which creates from current models); an older database gets them here.
Revision ID: 0002
"""
import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()
    if "revoked_tokens" not in tables:
        op.create_table("revoked_tokens", sa.Column("jti", sa.String(64), primary_key=True), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    if "login_attempts" not in tables:
        op.create_table("login_attempts", sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
                        sa.Column("email", sa.String, nullable=False, index=True), sa.Column("ip", sa.String),
                        sa.Column("success", sa.Boolean, nullable=False, server_default=sa.false()),
                        sa.Column("at", sa.DateTime(timezone=True), nullable=False))
    if "token_version" not in [c["name"] for c in insp.get_columns("profiles")]:
        op.add_column("profiles", sa.Column("token_version", sa.Integer, nullable=False, server_default="0"))
    if "uq_active_doctor_slot" not in [i["name"] for i in insp.get_indexes("appointments")]:
        op.create_index("uq_active_doctor_slot", "appointments", ["doctor_id", "slot_start"], unique=True,
                        sqlite_where=sa.text("status IN ('requested','confirmed','rescheduled','checked_in')"),
                        postgresql_where=sa.text("status IN ('requested','confirmed','rescheduled','checked_in')"))


def downgrade():
    op.drop_index("uq_active_doctor_slot", table_name="appointments")
    op.drop_column("profiles", "token_version")
    op.drop_table("login_attempts")
    op.drop_table("revoked_tokens")
