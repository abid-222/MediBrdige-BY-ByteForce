"""All tables (blueprint §8). UUID strings as PKs so SQLite (dev/tests) and Postgres both work."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (JSON, Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint)
from sqlalchemy import text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


def uid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


def pk():
    return mapped_column(String(36), primary_key=True, default=uid)


def ts():
    return mapped_column(DateTime(timezone=True), default=now)


class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[str] = pk()
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String, default="")
    role: Mapped[str] = mapped_column(String, default="patient")  # patient|doctor|facility_admin|facility_staff|super_admin|reviewer
    status: Mapped[str] = mapped_column(String, default="active")  # pending|active|suspended
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    facility_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # for facility roles
    token_version: Mapped[int] = mapped_column(Integer, default=0)  # bump to invalidate every session (password reset)
    created_at: Mapped[datetime] = ts()


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    jti: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, index=True)
    ip: Mapped[str | None] = mapped_column(String, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    at: Mapped[datetime] = ts()


class OtpCode(Base):
    __tablename__ = "otp_codes"
    id: Mapped[str] = pk()
    email: Mapped[str] = mapped_column(String, index=True)
    code_hash: Mapped[str] = mapped_column(String)
    purpose: Mapped[str] = mapped_column(String, default="verify")  # verify|reset
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = ts()


class RoleApplication(Base):
    __tablename__ = "role_applications"
    id: Mapped[str] = pk()
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"))
    requested_role: Mapped[str] = mapped_column(String)
    evidence_refs: Mapped[list] = mapped_column(JSON, default=list)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="pending")
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = ts()


class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    full_name: Mapped[str] = mapped_column(String, default="")
    dob: Mapped[str | None] = mapped_column(String, nullable=True)
    sex: Mapped[str | None] = mapped_column(String, nullable=True)
    language: Mapped[str] = mapped_column(String, default="en")
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    division: Mapped[str | None] = mapped_column(String, nullable=True)
    district: Mapped[str | None] = mapped_column(String, nullable=True)
    upazila: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_name: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_phone: Mapped[str | None] = mapped_column(String, nullable=True)
    emergency_relation: Mapped[str | None] = mapped_column(String, nullable=True)
    accessibility_needs: Mapped[str | None] = mapped_column(String, nullable=True)
    onboarding_step: Mapped[int] = mapped_column(Integer, default=1)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)


class PatientPreference(Base):
    __tablename__ = "patient_preferences"
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), primary_key=True)
    budget: Mapped[str | None] = mapped_column(String, nullable=True)  # low|medium|high|flexible (band only)
    care_pref: Mapped[list] = mapped_column(JSON, default=list)
    travel_limit_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transport_difficulty: Mapped[bool] = mapped_column(Boolean, default=False)
    assistance_need: Mapped[bool] = mapped_column(Boolean, default=False)
    visible_to_doctor: Mapped[bool] = mapped_column(Boolean, default=False)


class PatientCondition(Base):
    __tablename__ = "patient_conditions"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"))
    condition_text: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="self_reported")
    source: Mapped[str] = mapped_column(String, default="patient")
    verified_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class MedicationAllergy(Base):
    __tablename__ = "medications_allergies"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"))
    item: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)  # medication|allergy
    dose_text: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="self_reported")
    source: Mapped[str] = mapped_column(String, default="patient")


class Consent(Base):
    __tablename__ = "consents"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), index=True)
    consent_type: Mapped[str] = mapped_column(String)  # privacy|data_use|doctor_share|affordability_share|research
    version: Mapped[str] = mapped_column(String, default="v1")
    grantee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    scope: Mapped[dict] = mapped_column(JSON, default=dict)  # {"resources": ["documents","observations","notes","preferences"]}
    granted_at: Mapped[datetime] = ts()
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CareRelationship(Base):
    __tablename__ = "care_relationships"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    facility_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    origin: Mapped[str] = mapped_column(String, default="appointment")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    started_at: Mapped[datetime] = ts()
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditLog(Base):  # append-only: enforced by app (no update/delete API) + DB REVOKE in migration
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String)
    resource_type: Mapped[str | None] = mapped_column(String, nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String, nullable=True)
    patient_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    result: Mapped[str] = mapped_column(String, default="allow")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = ts()


class BreakGlassEvent(Base):
    __tablename__ = "break_glass_events"
    id: Mapped[str] = pk()
    admin_id: Mapped[str] = mapped_column(String(36))
    patient_id: Mapped[str] = mapped_column(String(36))
    reason: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    alerted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = ts()


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = pk()
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    channel: Mapped[str] = mapped_column(String, default="in_app")
    template: Mapped[str] = mapped_column(String)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime] = ts()


class Specialty(Base):
    __tablename__ = "specialties"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True)
    name_en: Mapped[str] = mapped_column(String)
    name_bn: Mapped[str] = mapped_column(String, default="")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    full_name: Mapped[str] = mapped_column(String)
    specialty_id: Mapped[int | None] = mapped_column(ForeignKey("specialties.id"), nullable=True)
    qualifications: Mapped[list] = mapped_column(JSON, default=list)
    bmdc_number: Mapped[str | None] = mapped_column(String, nullable=True)
    verification: Mapped[str] = mapped_column(String, default="unverified")
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)


class DoctorCredential(Base):
    __tablename__ = "doctor_credentials"
    id: Mapped[str] = pk()
    doctor_id: Mapped[str] = mapped_column(String(36))
    type: Mapped[str] = mapped_column(String)
    evidence_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    result: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Facility(Base):
    __tablename__ = "facilities"
    id: Mapped[str] = pk()
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, default="private")  # government|private|charitable|teaching|clinic
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    district: Mapped[str] = mapped_column(String, default="Dhaka")
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    has_emergency: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    verification: Mapped[str] = mapped_column(String, default="unverified")
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    dup_flag: Mapped[bool] = mapped_column(Boolean, default=False)


class FacilityService(Base):
    __tablename__ = "facility_services"
    id: Mapped[str] = pk()
    facility_id: Mapped[str] = mapped_column(ForeignKey("facilities.id"), index=True)
    service_code: Mapped[str] = mapped_column(String)  # specialty code or service e.g. "cardiology", "lab", "icu"
    available: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    last_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DoctorFacility(Base):
    __tablename__ = "doctor_facilities"
    doctor_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    facility_id: Mapped[str] = mapped_column(ForeignKey("facilities.id"), primary_key=True)
    chamber: Mapped[str | None] = mapped_column(String, nullable=True)
    schedule: Mapped[dict] = mapped_column(JSON, default=dict)
    fee_bdt: Mapped[int | None] = mapped_column(Integer, nullable=True)  # null = Not confirmed
    fee_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class FieldSource(Base):
    __tablename__ = "field_sources"
    id: Mapped[str] = pk()
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    field_name: Mapped[str] = mapped_column(String)
    source_name: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verifier_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    confidence: Mapped[str] = mapped_column(String, default="low")


class DirectoryReport(Base):
    __tablename__ = "directory_reports"
    id: Mapped[str] = pk()
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String(36))
    field: Mapped[str | None] = mapped_column(String, nullable=True)
    message: Mapped[str] = mapped_column(Text)
    reporter_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String, default="open")
    created_at: Mapped[datetime] = ts()


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), index=True)
    uploaded_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    file_ref: Mapped[str] = mapped_column(String)
    mime: Mapped[str | None] = mapped_column(String, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String, nullable=True)
    doc_type: Mapped[str | None] = mapped_column(String, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, default="uploaded")  # uploaded|processing|processed|unsupported|failed
    status_message: Mapped[str | None] = mapped_column(String, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String, nullable=True, unique=True)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = ts()


class Extraction(Base):
    __tablename__ = "extractions"
    id: Mapped[str] = pk()
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    extractor_version: Mapped[str] = mapped_column(String, default="regex-0.1")
    raw_text: Mapped[str] = mapped_column(Text, default="")
    structured_json: Mapped[dict] = mapped_column(JSON, default=dict)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="unverified")


class TestCatalog(Base):
    __tablename__ = "test_catalog"
    __test__ = False
    code: Mapped[str] = mapped_column(String, primary_key=True)
    name_en: Mapped[str] = mapped_column(String)
    synonyms: Mapped[list] = mapped_column(JSON, default=list)
    canonical_unit: Mapped[str] = mapped_column(String)
    convertible_units: Mapped[dict] = mapped_column(JSON, default=dict)  # {"mmol/L": 18.0182}  -> multiply to reach canonical


class Observation(Base):
    __tablename__ = "observations"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), index=True)
    document_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    test_code: Mapped[str] = mapped_column(String, index=True)
    value_num: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_raw: Mapped[str | None] = mapped_column(String, nullable=True)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    ref_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    ref_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    observed_on: Mapped[str | None] = mapped_column(String, nullable=True)
    lab_name: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    low_confidence: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String, default="unverified")  # unverified|patient_confirmed|doctor_verified|rejected
    flagged_wrong: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False)


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    id: Mapped[str] = pk()
    doctor_id: Mapped[str] = mapped_column(String(36), index=True)
    facility_id: Mapped[str] = mapped_column(String(36))
    start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    booked: Mapped[int] = mapped_column(Integer, default=0)


class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    facility_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    slot_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    slot_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    slot_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String, default="requested")
    consultation_type: Mapped[str] = mapped_column(String, default="online_telehealth")
    meeting_link: Mapped[str | None] = mapped_column(String, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    share_document_ids: Mapped[list] = mapped_column(JSON, default=list)
    share_opt_in: Mapped[bool] = mapped_column(Boolean, default=False)
    idempotency_key: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = ts()
    __table_args__ = (
        # DB-level guarantee: one active appointment per doctor per start time, even under concurrent requests.
        Index("uq_active_doctor_slot", "doctor_id", "slot_start", unique=True,
              sqlite_where=text("status IN ('requested','confirmed','rescheduled','checked_in')"),
              postgresql_where=text("status IN ('requested','confirmed','rescheduled','checked_in')")),
    )


class AppointmentEvent(Base):
    __tablename__ = "appointment_events"
    id: Mapped[str] = pk()
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id"), index=True)
    from_status: Mapped[str | None] = mapped_column(String, nullable=True)
    to_status: Mapped[str] = mapped_column(String)
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    at: Mapped[datetime] = ts()


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"))
    appointment_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    draft_text: Mapped[str] = mapped_column(Text, default="")
    signed_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft|signed|addended
    version: Mapped[int] = mapped_column(Integer, default=1)
    ai_assisted: Mapped[bool] = mapped_column(Boolean, default=False)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ClinicalNoteVersion(Base):
    __tablename__ = "clinical_note_versions"
    id: Mapped[str] = pk()
    note_id: Mapped[str] = mapped_column(ForeignKey("clinical_notes.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String, default="draft")  # draft|signed|addendum
    author_id: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = ts()


class Prescription(Base):
    __tablename__ = "prescriptions"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.user_id"), index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    appointment_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    medications: Mapped[list] = mapped_column(JSON, default=list)  # [{"name": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "..."}]
    follow_up_recommendation: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")  # draft|issued|cancelled|amended
    version: Mapped[int] = mapped_column(Integer, default=1)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consultation_date: Mapped[datetime] = ts()
    amendment_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_prescription_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = ts()
    updated_at: Mapped[datetime] = ts()


class Referral(Base):
    __tablename__ = "referrals"
    id: Mapped[str] = pk()
    patient_id: Mapped[str] = mapped_column(String(36))
    from_doctor: Mapped[str] = mapped_column(String(36))
    target_specialty: Mapped[str | None] = mapped_column(String, nullable=True)
    target_facility: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")


class FacilityStaff(Base):
    __tablename__ = "facility_staff"
    id: Mapped[str] = pk()
    facility_id: Mapped[str] = mapped_column(ForeignKey("facilities.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"))
    staff_role: Mapped[str] = mapped_column(String)  # facility_admin|receptionist|report_desk


class FacilityPrice(Base):
    __tablename__ = "facility_prices"
    id: Mapped[str] = pk()
    facility_id: Mapped[str] = mapped_column(ForeignKey("facilities.id"), index=True)
    item_code: Mapped[str] = mapped_column(String)
    price_bdt: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str | None] = mapped_column(String, nullable=True)


class VerificationCase(Base):
    __tablename__ = "verification_cases"
    id: Mapped[str] = pk()
    entity_type: Mapped[str] = mapped_column(String)  # doctor|facility|role_application
    entity_id: Mapped[str] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String, default="pending")
    reviewer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = ts()


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class FeatureFlag(Base):
    __tablename__ = "feature_flags"
    flag: Mapped[str] = mapped_column(String, primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)


class ModelRegistry(Base):
    __tablename__ = "model_registry"
    id: Mapped[str] = pk()
    model_name: Mapped[str] = mapped_column(String)
    version: Mapped[str] = mapped_column(String)
    dataset_version: Mapped[str | None] = mapped_column(String, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    intended_use: Mapped[str | None] = mapped_column(Text, nullable=True)
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[str] = mapped_column(String, default="research_prototype")
    deployed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class KnowledgeSource(Base):
    __tablename__ = "knowledge_sources"
    id: Mapped[str] = pk()
    title: Mapped[str] = mapped_column(String)
    publisher: Mapped[str | None] = mapped_column(String, nullable=True)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"
    id: Mapped[str] = pk()
    source_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    source_title: Mapped[str] = mapped_column(String)
    source_date: Mapped[str | None] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    test_code: Mapped[str | None] = mapped_column(String, nullable=True)
    # Postgres deployments add `embedding vector(1024)` via migration 0003; MVP retrieval is keyword/test_code based.


class AiOutput(Base):
    __tablename__ = "ai_outputs"
    id: Mapped[str] = pk()
    user_id: Mapped[str] = mapped_column(String(36))
    kind: Mapped[str] = mapped_column(String)
    model_version: Mapped[str] = mapped_column(String)
    prompt_hash: Mapped[str] = mapped_column(String)
    source_ids: Mapped[list] = mapped_column(JSON, default=list)
    output_json: Mapped[dict] = mapped_column(JSON, default=dict)
    feedback: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = ts()


class TriageSession(Base):
    __tablename__ = "triage_sessions"
    id: Mapped[str] = pk()
    patient_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    input_hash: Mapped[str] = mapped_column(String)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # purged after retention window
    result_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = ts()
