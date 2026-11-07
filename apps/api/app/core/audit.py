from sqlalchemy.orm import Session
from app.models import AuditLog


def log(db: Session, actor, action: str, *, resource_type=None, resource_id=None, patient_id=None,
        result="allow", reason=None, before=None, after=None, ip=None, commit=True):
    """Append-only audit write. There is intentionally no update/delete helper."""
    row = AuditLog(
        actor_id=getattr(actor, "id", None), actor_role=getattr(actor, "role", None), action=action,
        resource_type=resource_type, resource_id=str(resource_id) if resource_id else None,
        patient_id=patient_id, result=result, reason=reason, before=before, after=after, ip=ip)
    db.add(row)
    if commit:
        db.commit()
    return row
