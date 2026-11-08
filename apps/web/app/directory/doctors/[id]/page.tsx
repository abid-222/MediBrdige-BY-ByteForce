"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Info,
  Lock,
  MapPin,
  Send,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  Video,
} from "lucide-react";
import { api, getRole, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Button,
  Card,
  Chip,
  EmptyState,
  fmtDate,
  Input,
  useToast,
  verChip,
} from "@/components/ui";

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const { addToast } = useToast();
  const role = getRole();
  const isLoggedIn = !!getToken();

  // Load Doctor Details and Availability Slots
  const { data: d, loading, error, reload } = useApi(`/directory/doctors/${id}`);
  const slotsApi = useApi(`/doctors/${id}/slots`);

  // Booking Form State
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [consultationType, setConsultationType] = useState<"in_person" | "telehealth">("in_person");
  const [reason, setReason] = useState("");
  const [shareRecords, setShareRecords] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  // Reporting Form State
  const [reportNote, setReportNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Available slots for this doctor
  const availableSlots = useMemo(() => {
    const list = slotsApi.data?.items || [];
    return list.filter((s: any) => s.available);
  }, [slotsApi.data?.items]);

  // Selected chamber details
  const activeChamber = useMemo(() => {
    if (!d?.chambers || d.chambers.length === 0) return null;
    if (!selectedFacilityId) return d.chambers[0];
    return d.chambers.find((c: any) => c.facility_id === selectedFacilityId) || d.chambers[0];
  }, [d?.chambers, selectedFacilityId]);

  // Initialize selected facility
  useMemo(() => {
    if (d?.chambers && d.chambers.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(d.chambers[0].facility_id);
    }
  }, [d?.chambers, selectedFacilityId]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      addToast("info", "Patient Login Required", "Please sign in as a patient to schedule a consultation.");
      router.push(`/login?next=${encodeURIComponent(`/directory/doctors/${id}`)}`);
      return;
    }

    if (role !== "patient") {
      addToast("warning", "Patient Access Only", "Only patient accounts can schedule doctor appointments.");
      return;
    }

    if (!reason.trim()) {
      addToast("error", "Reason Required", "Please describe your chief symptom or reason for visit.");
      return;
    }

    setBookingLoading(true);
    try {
      const facilityId = selectedFacilityId || d?.chambers?.[0]?.facility_id;
      const res = await api("/appointments", {
        body: {
          doctor_id: id,
          facility_id: facilityId,
          slot_id: selectedSlotId || undefined,
          reason: `[${consultationType === "telehealth" ? "Telehealth Online" : "In-Person Clinic"}] ${reason.trim()}`,
          share_opt_in: shareRecords,
        },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });

      setBookingSuccess(res);
      addToast("success", "Appointment Requested", "Your consultation request has been submitted to the doctor.");
      // Reload slots to reflect updated capacity
      slotsApi.reload();
    } catch (err: any) {
      addToast("error", "Booking Failed", err.message || "Failed to schedule appointment. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportNote.trim().length < 5) return;
    setReporting(true);
    try {
      await api("/directory/reports", {
        body: {
          entity_type: "doctor",
          entity_id: id,
          message: reportNote.trim(),
        },
      });
      setReportSuccess(true);
      setReportNote("");
      addToast("success", "Report Submitted", "Thank you for helping us keep directory data accurate.");
    } catch (err: any) {
      addToast("error", "Submission Failed", err.message || "Could not submit report.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link
          href="/directory"
          className="inline-flex items-center gap-1.5 text-ptext hover:text-ptext/80 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.directory") || "Doctor Directory"}
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-xs">{d?.full_name || "Doctor Profile"}</span>
      </div>

      <Async loading={loading} error={error} onRetry={reload} h={260}>
        {d && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Doctor Profile Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Doctor Hero Card */}
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Initials Avatar */}
                  <div className="w-20 h-20 rounded-2xl bg-ptext/10 text-ptext flex items-center justify-center font-bold text-2xl border border-ptext/20 shadow-sm shrink-0">
                    {d.full_name
                      ?.replace(/^(Dr\.|Prof\.|Assoc\.|Asst\.)\s*/i, "")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "DR"}
                  </div>

                  {/* Header Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h1 className="text-2xl font-bold text-foreground tracking-tight">{d.full_name}</h1>
                      {verChip(d.verification)}
                      {d.stale && <Chip kind="stale" />}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted mb-3">
                      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                        <Stethoscope className="h-4 w-4 text-ptext" />
                        {d.specialty || "General Medicine"}
                      </span>
                      {d.experience_years && (
                        <span className="inline-flex items-center gap-1">
                          <Award className="h-4 w-4 text-amber-500" />
                          {d.experience_years} years experience
                        </span>
                      )}
                      {d.bmdc_number && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          BMDC Reg: {d.bmdc_number}
                        </span>
                      )}
                    </div>

                    {/* Qualifications */}
                    {d.qualifications && d.qualifications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {d.qualifications.map((q: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs bg-muted/30 text-muted px-2.5 py-1 rounded-md border border-border/50"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio / Summary */}
                {d.bio && (
                  <div className="mt-6 pt-5 border-t border-border/60">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">About Doctor</h3>
                    <p className="text-sm text-foreground/90 leading-relaxed">{d.bio}</p>
                  </div>
                )}

                {/* Sample Notice */}
                {d.is_sample && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Educational Sample Listing:</strong> This profile represents test hospital registry data.
                      Verified BMDC credentials and schedules are maintained for demonstration and verification workflows.
                    </span>
                  </div>
                )}
              </Card>

              {/* Chambers and Practice Locations */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-ptext" />
                      Chamber Locations & Consultation Fees
                    </h2>
                    <p className="text-xs text-muted">Confirmed facilities, consultation fees, and visiting hours</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/40 text-muted">
                    {d.chambers?.length || 0} {d.chambers?.length === 1 ? "Chamber" : "Chambers"}
                  </span>
                </div>

                {d.chambers && d.chambers.length > 0 ? (
                  <div className="space-y-3">
                    {d.chambers.map((c: any) => {
                      const isSelected = selectedFacilityId === c.facility_id;
                      return (
                        <div
                          key={c.facility_id}
                          onClick={() => setSelectedFacilityId(c.facility_id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "border-ptext bg-ptext/5 shadow-sm"
                              : "border-border/60 hover:border-border hover:bg-muted/10"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground text-sm">{c.facility_name}</h3>
                                {isSelected && (
                                  <span className="text-[11px] font-medium bg-ptext/15 text-ptext px-2 py-0.5 rounded-full">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted mt-1">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {c.district || "Dhaka"}
                                  {c.chamber ? ` · ${c.chamber}` : ""}
                                </span>
                                {c.schedule && (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {c.schedule}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="sm:text-right shrink-0">
                              <div className="text-sm font-semibold text-foreground flex sm:justify-end items-center gap-1.5">
                                <CreditCard className="h-4 w-4 text-ptext" />
                                <span className="num font-bold">{c.fee_label}</span>
                                {c.fee_state !== "confirmed" && <Chip kind="unverified" />}
                              </div>
                              {c.fee_confirmed_at && (
                                <p className="text-[11px] text-muted">
                                  Verified {fmtDate(c.fee_confirmed_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No practice chambers listed for this specialist yet.</p>
                )}
              </Card>

              {/* Available Appointment Slots Grid */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <CalendarClock className="h-5 w-5 text-ptext" />
                      Available Consultation Slots
                    </h2>
                    <p className="text-xs text-muted">Select an open slot to schedule your clinical consultation</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => slotsApi.reload()}
                    disabled={slotsApi.loading}
                  >
                    Refresh
                  </Button>
                </div>

                <Async loading={slotsApi.loading} error={slotsApi.error} onRetry={slotsApi.reload} h={120}>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {availableSlots.map((s: any) => {
                        const isSelected = selectedSlotId === s.id;
                        const startDate = new Date(s.start);
                        const dateStr = startDate.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                        const timeStr = startDate.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        const remaining = s.capacity - (s.booked_count || 0);

                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedSlotId(isSelected ? "" : s.id);
                              if (s.facility_id) setSelectedFacilityId(s.facility_id);
                            }}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              isSelected
                                ? "border-ptext bg-ptext/10 text-ptext shadow-sm ring-1 ring-ptext"
                                : "border-border/60 hover:border-border hover:bg-muted/10 text-foreground"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">{dateStr}</span>
                              <span className="text-[10px] bg-muted/40 px-1.5 py-0.5 rounded text-muted font-mono">
                                {remaining} open
                              </span>
                            </div>
                            <div className="text-sm font-bold mt-1 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-ptext" />
                              <span className="num">{timeStr}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-muted/10 border border-dashed border-border/80">
                      <Calendar className="h-8 w-8 text-muted mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium text-foreground">No pre-scheduled slots available</p>
                      <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                        You can still submit a consultation request below. The doctor will confirm the appointment time based on their chamber schedule.
                      </p>
                    </div>
                  )}
                </Async>
              </Card>

              {/* Data Provenance & Verification Audit Trail */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  {t("dir.provenance") || "Data Provenance & Audit Trail"}
                </h2>
                <p className="text-xs text-muted mb-4">
                  Every field is tracked with verification sources and timestamps to prevent medical registry hallucinations.
                </p>

                {d.provenance && d.provenance.length > 0 ? (
                  <div className="divide-y divide-border/40 text-xs">
                    {d.provenance.map((p: any, i: number) => (
                      <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                            {p.field.replace("_", " ")}
                          </span>
                          <span className="text-muted ml-2">
                            Source: <strong className="text-foreground">{p.source_name}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted">
                          {p.verified_at && (
                            <span>Verified: <span className="num">{fmtDate(p.verified_at)}</span></span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-muted/40 font-mono text-[10px]">
                            conf: {p.confidence}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t("dir.noProvenance") || "No detailed provenance records logged."}</p>
                )}
              </Card>

              {/* Report Inaccurate Information */}
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  {t("dir.report") || "Report Inaccurate Information"}
                </h3>
                <p className="text-xs text-muted mb-3">
                  Found outdated chamber hours or fee discrepancy? Submit a correction for review.
                </p>

                {reportSuccess ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Thank you. Your correction report has been logged for administrative verification.
                  </div>
                ) : (
                  <form onSubmit={handleReport} className="space-y-3">
                    <Input
                      placeholder="e.g. Visiting hours changed to 5:00 PM - 8:00 PM on Mon/Wed..."
                      value={reportNote}
                      onChange={(e) => setReportNote(e.target.value)}
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      disabled={reportNote.trim().length < 5 || reporting}
                    >
                      {reporting ? "Submitting..." : t("common.submit") || "Submit Correction"}
                    </Button>
                  </form>
                )}
              </Card>
            </div>

            {/* Right Column: Sticky Booking Widget */}
            <div className="space-y-6">
              <div className="sticky top-6">
                <Card className="p-6 border-ptext/30 shadow-md">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-foreground">
                      Book a Consultation
                    </h2>
                    <p className="text-xs text-muted">
                      Request in-person hospital appointment or online consultation
                    </p>
                  </div>

                  {bookingSuccess ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                        <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Consultation Requested
                        </div>
                        <p className="text-xs leading-relaxed">
                          Your appointment request with <strong>{d.full_name}</strong> has been logged. Status:{" "}
                          <span className="font-mono uppercase font-bold">{bookingSuccess.status || "requested"}</span>.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Link href="/appointments">
                          <Button className="w-full" variant="primary">
                            View in Appointments
                          </Button>
                        </Link>
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() => {
                            setBookingSuccess(null);
                            setSelectedSlotId("");
                            setReason("");
                          }}
                        >
                          Book Another
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBook} className="space-y-4">
                      {/* Consultation Mode Selection */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                          Consultation Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setConsultationType("in_person")}
                            className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                              consultationType === "in_person"
                                ? "border-ptext bg-ptext/10 text-ptext font-semibold ring-1 ring-ptext"
                                : "border-border/60 hover:border-border text-foreground"
                            }`}
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            In-Person Clinic
                          </button>
                          <button
                            type="button"
                            onClick={() => setConsultationType("telehealth")}
                            className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                              consultationType === "telehealth"
                                ? "border-ptext bg-ptext/10 text-ptext font-semibold ring-1 ring-ptext"
                                : "border-border/60 hover:border-border text-foreground"
                            }`}
                          >
                            <Video className="h-3.5 w-3.5" />
                            Online Telehealth
                          </button>
                        </div>
                      </div>

                      {/* Selected Chamber Summary */}
                      {activeChamber && (
                        <div className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs">
                          <div className="font-semibold text-foreground">{activeChamber.facility_name}</div>
                          <div className="text-muted mt-0.5">{activeChamber.chamber || "Main Chamber"}</div>
                          <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-muted">
                            <span>Fee:</span>
                            <span className="font-bold text-foreground num">{activeChamber.fee_label}</span>
                          </div>
                        </div>
                      )}

                      {/* Selected Slot indicator */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                          Appointment Slot
                        </label>
                        {selectedSlotId ? (
                          <div className="p-2.5 rounded-lg bg-ptext/10 border border-ptext/20 text-xs flex items-center justify-between text-ptext font-medium">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              Selected slot from schedule
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedSlotId("")}
                              className="text-xs underline hover:opacity-80"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted italic">
                            No slot selected. The clinic will assign the earliest open slot on confirmation.
                          </p>
                        )}
                      </div>

                      {/* Reason for Visit */}
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1.5">
                          Reason for Visit / Symptoms *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g., Follow-up for blood pressure review, recurrent headaches for 2 weeks..."
                          className="w-full rounded-md border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ptext/50"
                        />
                      </div>

                      {/* Share Records Consent */}
                      <label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={shareRecords}
                          onChange={(e) => setShareRecords(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-border text-ptext focus:ring-ptext/50"
                        />
                        <span>
                          Grant doctor authorization to review my active health profile and verified medical reports
                        </span>
                      </label>

                      {/* Action Button based on Authentication */}
                      {!isLoggedIn ? (
                        <div className="space-y-2 pt-2">
                          <Button
                            type="button"
                            className="w-full"
                            variant="primary"
                            onClick={() => {
                              addToast("info", "Patient Login Required", "Please sign in to proceed with booking.");
                              router.push(
                                `/login?next=${encodeURIComponent(`/directory/doctors/${id}`)}`
                              );
                            }}
                          >
                            <Lock className="h-4 w-4 mr-1.5" />
                            Sign In as Patient to Book
                          </Button>
                          <p className="text-[11px] text-muted text-center">
                            New patient? You can sign in using your verified mobile number.
                          </p>
                        </div>
                      ) : role !== "patient" ? (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                          <p className="font-semibold mb-0.5">Doctor / Admin Mode</p>
                          <p>
                            You are signed in as <strong>{role}</strong>. Please switch to a patient account to schedule consultations.
                          </p>
                        </div>
                      ) : (
                        <Button
                          type="submit"
                          className="w-full"
                          variant="primary"
                          disabled={bookingLoading}
                        >
                          {bookingLoading ? "Submitting Request..." : "Confirm Consultation Request"}
                        </Button>
                      )}

                      {/* Safety Disclaimer */}
                      <div className="pt-2 border-t border-border/40 text-[11px] text-muted leading-relaxed">
                        <Info className="h-3.5 w-3.5 inline mr-1 text-muted" />
                        Appointments are subject to doctor confirmation. In case of acute medical emergencies, immediately contact your local emergency service or hospital emergency department.
                      </div>
                    </form>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
