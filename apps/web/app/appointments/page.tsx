"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarClock,
  Clock,
  Compass,
  FileCheck,
  FileText,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
  XCircle,
} from "lucide-react";
import { api, getRole } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  fmtDate,
  fmtDateTime,
  Input,
  PageHeader,
  SearchInput,
  Select,
  StatTile,
  TabGroup,
  Table,
  useToast,
} from "@/components/ui";

export default function AppointmentsPage() {
  useGuard(["patient", "doctor", "facility_admin", "facility_staff"]);
  const { t } = useI18n();
  const role = getRole();
  const { addToast } = useToast();

  // API Hooks
  const { data, loading, error, reload } = useApi("/appointments");
  const doctorsList = useApi("/directory/doctors");
  const documentsList = useApi(role === "patient" ? "/documents" : null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<"upcoming" | "previous" | "all">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Booking modal state
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [visitReason, setVisitReason] = useState("");
  const [shareOptIn, setShareOptIn] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [bookingBusy, setBookingBusy] = useState(false);

  // Check URL query parameters to auto-open booking modal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") === "true") {
      setBookModalOpen(true);
      const docId = params.get("doctorId");
      if (docId) setSelectedDoctorId(docId);
    }
  }, []);

  // Status transition state
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  // Categorize appointments
  const { upcomingList, previousList, allList } = useMemo(() => {
    const items = data?.items || [];
    const now = new Date();
    const upcoming = items.filter((a: any) =>
      ["requested", "confirmed", "rescheduled"].includes(a.status)
    );
    const previous = items.filter(
      (a: any) =>
        ["completed", "cancelled", "no_show"].includes(a.status) ||
        new Date(a.slot_start) < now
    );
    return { upcomingList: upcoming, previousList: previous, allList: items };
  }, [data]);

  const displayedAppointments = useMemo(() => {
    const list =
      activeTab === "upcoming"
        ? upcomingList
        : activeTab === "previous"
        ? previousList
        : allList;

    return list.filter((a: any) => {
      const docName = (a.doctor_name || "").toLowerCase();
      const patName = (a.patient_name || "").toLowerCase();
      const reason = (a.reason || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || docName.includes(q) || patName.includes(q) || reason.includes(q);
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeTab, upcomingList, previousList, allList, searchQuery, statusFilter]);

  // Appointment Status Transition Action (Confirm, Cancel, Checkin, Complete)
  const handleStatusChange = async (appointmentId: string, nextStatus: string, label: string) => {
    setBusyActionId(appointmentId);
    try {
      await api(`/appointments/${appointmentId}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      reload();
      addToast("success", `Appointment ${label}`, `Status transitioned to ${nextStatus}.`);
    } catch (e: any) {
      addToast("error", "Action Failed", e.message);
    } finally {
      setBusyActionId(null);
    }
  };

  // Appointment Booking Submit
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      addToast("error", "Doctor Required", "Please select a doctor.");
      return;
    }
    if (!selectedDate) {
      addToast("error", "Date Required", "Please pick an appointment date.");
      return;
    }

    setBookingBusy(true);
    try {
      const slotStart = new Date(`${selectedDate}T${selectedTime}:00Z`).toISOString();
      await api("/appointments", {
        body: {
          doctor_id: selectedDoctorId,
          slot_start: slotStart,
          reason: visitReason || "Consultation request",
          share_opt_in: shareOptIn,
          share_document_ids: shareOptIn ? selectedDocIds : [],
        },
      });
      addToast("success", "Appointment Requested", "Consultation requested with doctor.");
      setBookModalOpen(false);
      // Reset form
      setSelectedDoctorId("");
      setSelectedDate("");
      setVisitReason("");
      setSelectedDocIds([]);
      reload();
    } catch (e: any) {
      addToast("error", "Booking Failed", e.message);
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("appt.title") || "Appointments"}
        subtitle="Manage clinical consultations, appointment statuses, and report sharing."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Appointments", href: "/appointments" },
        ]}
        actions={
          role === "patient" ? (
            <Button size="sm" icon={Plus} onClick={() => setBookModalOpen(true)}>
              Request Consultation
            </Button>
          ) : undefined
        }
      />

      {/* Metrics Stat Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={CalendarClock}
          label="Upcoming Visits"
          value={upcomingList.length}
          accent={upcomingList.length > 0}
          trend={upcomingList.length > 0 ? "up" : "neutral"}
          trendLabel={upcomingList.length > 0 ? "Scheduled care" : "None pending"}
        />
        <StatTile
          icon={FileCheck}
          label="Completed"
          value={allList.filter((a: any) => a.status === "completed").length}
        />
        <StatTile
          icon={Clock}
          label="Pending Confirmation"
          value={allList.filter((a: any) => a.status === "requested").length}
          trend={allList.some((a: any) => a.status === "requested") ? "down" : "neutral"}
          trendLabel="Awaiting doctor"
        />
        <StatTile
          icon={XCircle}
          label="Cancelled"
          value={allList.filter((a: any) => a.status === "cancelled").length}
        />
      </div>

      {/* Tabs & Search Filter Bar */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabGroup
            tabs={[
              { key: "upcoming", label: "Upcoming", count: upcomingList.length },
              { key: "previous", label: "Previous", count: previousList.length },
              { key: "all", label: "All Appointments", count: allList.length },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search by doctor or patient..."
              className="md:max-w-xs"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Appointment Cards Grid */}
        <Async
          loading={loading && !data}
          error={error}
          onRetry={reload}
          empty={displayedAppointments.length === 0}
          emptyNode={
            <EmptyState
              icon={CalendarClock}
              title={
                activeTab === "upcoming"
                  ? "No upcoming appointments"
                  : "No appointments match filter"
              }
              body="Consult with a verified doctor in Dhaka using the SmartCare Navigator."
              action={
                role === "patient" ? (
                  <Button size="sm" onClick={() => setBookModalOpen(true)}>
                    Book Consultation Now
                  </Button>
                ) : undefined
              }
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {displayedAppointments.map((a: any) => {
              const isConfirmed = a.status === "confirmed";
              const isRequested = a.status === "requested";
              const isCheckedIn = a.status === "checked_in";
              const isCompleted = a.status === "completed";
              const isCancelled = a.status === "cancelled";
              const isBusy = busyActionId === a.id;

              return (
                <div
                  key={a.id}
                  className={`rounded-card border p-4 space-y-3 transition-all ${
                    isConfirmed
                      ? "border-primary/40 bg-psoft/10 shadow-sm"
                      : isCancelled
                      ? "border-line bg-s2/20 opacity-70"
                      : "border-line bg-s1"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-ink truncate">
                        <Stethoscope className="h-4 w-4 text-ptext shrink-0" />
                        <span>{a.doctor_name || "Doctor"}</span>
                      </div>
                      {role !== "patient" && (
                        <p className="text-xs text-muted font-medium mt-0.5">
                          Patient: {a.patient_name || a.patient_id}
                        </p>
                      )}
                      <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="num font-semibold">{fmtDateTime(a.slot_start)}</span>
                      </p>
                    </div>

                    <Chip
                      kind={
                        isConfirmed || isCompleted
                          ? "verified"
                          : isCancelled
                          ? "failed"
                          : "pending"
                      }
                    >
                      {a.status}
                    </Chip>
                  </div>

                  {a.reason && (
                    <div className="rounded-input border border-line/60 bg-s2/40 p-2.5 text-xs text-muted">
                      <span className="font-semibold text-ink">Reason: </span>
                      {a.reason}
                    </div>
                  )}

                  {/* Event History Trace */}
                  {a.events?.length > 0 && (
                    <div className="text-[11px] text-muted space-y-0.5 border-t border-line/50 pt-2 font-mono">
                      <p className="font-sans font-bold uppercase text-[10px] text-muted/80">Event Log:</p>
                      {a.events.map((e: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{e.from ? `${e.from} → ${e.to}` : e.to}</span>
                          <span>{fmtDate(e.at)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions according to role */}
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/60 pt-2.5">
                    {/* Patient Actions */}
                    {role === "patient" && !isCancelled && !isCompleted && (
                      <Button
                        size="xs"
                        variant="secondary"
                        busy={isBusy}
                        onClick={() => handleStatusChange(a.id, "cancelled", "Cancelled")}
                      >
                        Cancel Booking
                      </Button>
                    )}

                    {/* Doctor/Staff Actions */}
                    {role !== "patient" && (
                      <>
                        {isRequested && (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "confirmed", "Confirmed")}
                          >
                            Confirm
                          </Button>
                        )}
                        {isConfirmed && (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "checked_in", "Checked In")}
                          >
                            Check In
                          </Button>
                        )}
                        {isCheckedIn && (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "completed", "Completed")}
                          >
                            Complete Visit
                          </Button>
                        )}
                        {!isCancelled && !isCompleted && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-danger hover:bg-danger/10"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "cancelled", "Cancelled")}
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Async>
      </Card>

      {/* Appointment Booking Dialog */}
      <Dialog
        open={bookModalOpen}
        title="Request Doctor Consultation"
        onClose={() => setBookModalOpen(false)}
      >
        <form onSubmit={handleBookSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
              Select Doctor *
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              required
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <option value="">Choose a doctor...</option>
              {doctorsList.data?.items?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialty} ({d.fee ? `BDT ${d.fee}` : "Confirmed Fee"})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
                Date *
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
                Preferred Time
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:30">11:30 AM</option>
                <option value="14:00">02:00 PM</option>
                <option value="16:00">04:00 PM</option>
                <option value="18:00">06:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
              Reason for Consultation
            </label>
            <input
              type="text"
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              placeholder="e.g. Follow-up for CBC report & persistent fever"
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </div>

          {/* Record Sharing Opt-In */}
          <div className="rounded-input border border-line bg-s2/40 p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={shareOptIn}
                onChange={(e) => setShareOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded"
              />
              <span className="font-semibold text-ink">
                Grant selected doctor temporary access to my reports
              </span>
            </label>
            <p className="text-[11px] text-muted pl-6">
              Access is strictly scoped to this consultation and can be revoked at any time from Settings & Consent.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBookModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={bookingBusy}>
              Confirm Request
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
