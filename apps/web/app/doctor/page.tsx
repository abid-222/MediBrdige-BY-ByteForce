"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  FileSearch,
  FileText,
  Filter,
  History,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
  Users,
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
  GlassCard,
  PageHeader,
  SearchInput,
  StatTile,
  TabGroup,
  Table,
  Tooltip,
  useToast,
} from "@/components/ui";
import { dhakaDay, todayDhaka } from "@/lib/format";

export default function DoctorWorkspacePage() {
  useGuard(["doctor"]);
  const { t } = useI18n();
  const { addToast } = useToast();

  // API Hooks
  const dashboard = useApi("/doctor/dashboard");
  const patientsList = useApi("/doctor/patients");
  const me = useApi("/auth/me");
  const appointments = useApi("/appointments");
  const notifications = useApi("/notifications");

  // Local state
  const [patientSearch, setPatientSearch] = useState("");
  const [patientAccessFilter, setPatientAccessFilter] = useState<"all" | "active" | "no_access">("all");
  const [apptTab, setApptTab] = useState<"today" | "upcoming" | "all">("today");
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const today = todayDhaka();
  const isVerifiedDoctor = me.data?.verification === "verified" || me.data?.status === "active";

  // Today's vs. Later appointments
  const allAppts = useMemo(() => dashboard.data?.appointments || [], [dashboard.data]);
  const todaysAppts = useMemo(
    () => allAppts.filter((a: any) => dhakaDay(a.slot_start) === today),
    [allAppts, today]
  );
  const laterAppts = useMemo(
    () => allAppts.filter((a: any) => (dhakaDay(a.slot_start) ?? "") > today),
    [allAppts, today]
  );

  const displayedAppts =
    apptTab === "today"
      ? todaysAppts
      : apptTab === "upcoming"
      ? laterAppts
      : allAppts;

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    const list = patientsList.data?.items || [];
    return list.filter((p: any) => {
      const q = patientSearch.toLowerCase();
      const matchesSearch =
        !patientSearch ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.patient_id || "").toLowerCase().includes(q);
      const matchesAccess =
        patientAccessFilter === "all" ||
        (patientAccessFilter === "active" && p.access) ||
        (patientAccessFilter === "no_access" && !p.access);
      return matchesSearch && matchesAccess;
    });
  }, [patientsList.data, patientSearch, patientAccessFilter]);

  // Appointment Status Transition (Confirm, Check-in, Cancel)
  const handleApptAction = async (apptId: string, newStatus: string, label: string) => {
    setBusyActionId(apptId);
    try {
      await api(`/appointments/${apptId}/status`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      dashboard.reload();
      appointments.reload();
      addToast("success", `Appointment ${label}`, `Status updated to ${newStatus}.`);
    } catch (e: any) {
      addToast("error", "Action Failed", e.message);
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("doc.title") || "Doctor Clinical Workspace"}
        subtitle={`Dr. ${me.data?.full_name || "Doctor"} · BMDC Registered Practitioner · Dhaka District`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Doctor Workspace", href: "/doctor" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Chip kind={isVerifiedDoctor ? "doctor" : "pending"}>
              {isVerifiedDoctor ? "BMDC Verified" : "Verification Pending"}
            </Chip>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                dashboard.reload();
                patientsList.reload();
                addToast("info", "Refreshed", "Workspace updated.");
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Pending Account Notice */}
      {!isVerifiedDoctor && !me.loading && (
        <GlassCard className="border-warn/40 flex items-start gap-3">
          <Clock className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div className="text-xs text-muted">
            <p className="font-bold text-warn text-sm">Account Under Administrative Review</p>
            <p className="mt-0.5 leading-relaxed">
              Your BMDC credentials are being verified by a medical council reviewer. During review, note signing and public directory listings are locked.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Metrics Stat Row */}
      <Async loading={dashboard.loading && !dashboard.data} error={dashboard.error} onRetry={dashboard.reload}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={CalendarClock}
            label={t("doc.todayAppts") || "Today's Consultations"}
            value={todaysAppts.length}
            accent={todaysAppts.length > 0}
            trend={todaysAppts.length > 0 ? "up" : "neutral"}
            trendLabel={todaysAppts.length > 0 ? "Scheduled today" : "No visits today"}
          />
          <StatTile
            icon={Calendar}
            label={t("doc.upcoming") || "Upcoming Visits"}
            value={laterAppts.length}
            trend="neutral"
            trendLabel="Future bookings"
          />
          <StatTile
            icon={FileSearch}
            label={t("doc.pending") || "Values Pending Review"}
            value={dashboard.data?.pending_review_count ?? "—"}
            trend={dashboard.data?.flagged_count > 0 ? "down" : "neutral"}
            trendLabel={`${dashboard.data?.flagged_count || 0} flagged wrong`}
          />
          <StatTile
            icon={Users}
            label={t("doc.patients") || "Assigned Patients"}
            value={patientsList.data?.items?.length ?? "—"}
            trend="neutral"
            trendLabel="Active care relationships"
          />
        </div>
      </Async>

      {/* Appointments Manager Card */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-ptext" />
              <span>Consultation Schedule</span>
            </h2>
            <p className="text-xs text-muted">Review patient appointment requests, check-ins, and timelines</p>
          </div>

          <TabGroup
            tabs={[
              { key: "today", label: "Today", count: todaysAppts.length },
              { key: "upcoming", label: "Later", count: laterAppts.length },
              { key: "all", label: "All Schedule", count: allAppts.length },
            ]}
            active={apptTab}
            onChange={setApptTab}
          />
        </div>

        <Async
          loading={dashboard.loading && !dashboard.data}
          error={dashboard.error}
          onRetry={dashboard.reload}
          empty={displayedAppts.length === 0}
          emptyNode={
            <EmptyState
              icon={CalendarClock}
              title={apptTab === "today" ? "No appointments today" : "No appointments in this view"}
              body="New appointment requests from patients will appear here automatically."
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {displayedAppts.map((a: any) => {
              const isRequested = a.status === "requested";
              const isConfirmed = a.status === "confirmed";
              const isCheckedIn = a.status === "checked_in";
              const isBusy = busyActionId === a.id;

              return (
                <div
                  key={a.id}
                  className={`rounded-card border p-4 space-y-3 transition-all ${
                    isConfirmed
                      ? "border-primary/40 bg-psoft/10 shadow-sm"
                      : isRequested
                      ? "border-warn/40 bg-warn/5"
                      : "border-line bg-s1"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-ink flex items-center gap-1.5">
                        <User className="h-4 w-4 text-ptext" />
                        <span>Patient Consultation</span>
                      </p>
                      <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <Clock className="h-3 w-3" />
                        <span className="num font-semibold">{fmtDateTime(a.slot_start)}</span>
                      </p>
                    </div>

                    <Chip
                      kind={
                        isConfirmed || a.status === "completed"
                          ? "verified"
                          : a.status === "cancelled"
                          ? "failed"
                          : "pending"
                      }
                    >
                      {a.status}
                    </Chip>
                  </div>

                  {/* Doctor actions */}
                  <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-2.5">
                    {isRequested && (
                      <Button
                        size="xs"
                        variant="primary"
                        busy={isBusy}
                        onClick={() => handleApptAction(a.id, "confirmed", "Confirmed")}
                      >
                        Confirm Booking
                      </Button>
                    )}
                    {isConfirmed && (
                      <Button
                        size="xs"
                        variant="primary"
                        busy={isBusy}
                        onClick={() => handleApptAction(a.id, "checked_in", "Checked In")}
                      >
                        Mark Checked In
                      </Button>
                    )}
                    {isCheckedIn && (
                      <Button
                        size="xs"
                        variant="primary"
                        busy={isBusy}
                        onClick={() => handleApptAction(a.id, "completed", "Completed")}
                      >
                        Complete Visit
                      </Button>
                    )}
                    {a.status !== "cancelled" && a.status !== "completed" && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10"
                        busy={isBusy}
                        onClick={() => handleApptAction(a.id, "cancelled", "Cancelled")}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Async>
      </Card>

      {/* Patient Directory & Chart Access Section */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Users className="h-5 w-5 text-ptext" />
              <span>Assigned Patient Directory</span>
            </h2>
            <p className="text-xs text-muted">
              Patients with active care relationships or explicit doctor_share consents
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onClear={() => setPatientSearch("")}
              placeholder="Search patients by name or ID..."
              className="sm:max-w-xs"
            />

            <select
              value={patientAccessFilter}
              onChange={(e) => setPatientAccessFilter(e.target.value as any)}
              className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
            >
              <option value="all">All Patients</option>
              <option value="active">Active Consent Granted</option>
              <option value="no_access">Consent Revoked / Inactive</option>
            </select>
          </div>
        </div>

        {/* Patients Table */}
        <Async
          loading={patientsList.loading && !patientsList.data}
          error={patientsList.error}
          onRetry={patientsList.reload}
          empty={filteredPatients.length === 0}
          emptyNode={
            <EmptyState
              icon={Users}
              title="No patients match your search"
              body="When patients share their records or book appointments with you, they appear in this directory."
            />
          }
          skeleton="table"
        >
          <Table>
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Patient Identifier</th>
                <th>Consent Status</th>
                <th>Access Authorization</th>
                <th className="text-right">Clinical Chart</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((p: any) => {
                const hasAccess = Boolean(p.access);
                return (
                  <tr key={p.patient_id} className="hover:bg-s2/40 transition">
                    <td className="font-bold text-ink">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-psoft text-xs font-bold text-ptext">
                          {(p.name || "P")[0].toUpperCase()}
                        </span>
                        <span>{p.name || "Patient Chart"}</span>
                      </div>
                    </td>
                    <td className="num text-xs text-muted font-mono">{p.patient_id?.slice(0, 12)}…</td>
                    <td>
                      {hasAccess ? (
                        <Chip kind="verified">Active Consent</Chip>
                      ) : (
                        <Chip kind="unverified">No Active Consent</Chip>
                      )}
                    </td>
                    <td className="text-xs text-muted">
                      {hasAccess ? (
                        <span className="text-ptext font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Observations & Documents Authorized</span>
                        </span>
                      ) : (
                        <span className="text-muted flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5 shrink-0" />
                          <span>{p.access_reason || "Consent not granted"}</span>
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {hasAccess ? (
                        <Link href={`/doctor/patients/${p.patient_id}`}>
                          <Button size="xs" variant="primary">
                            Open Chart →
                          </Button>
                        </Link>
                      ) : (
                        <Tooltip text="Patient must grant consent before chart can be opened">
                          <Button size="xs" variant="secondary" disabled>
                            Chart Locked
                          </Button>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Async>
      </Card>

      {/* Recent Notifications & Audit Info */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Bell className="h-4 w-4 text-ptext" />
              <span>Doctor Clinical Notifications</span>
            </h2>
            <span className="num text-xs text-muted">{notifications.data?.items?.length || 0} total</span>
          </div>
          <Async
            loading={notifications.loading && !notifications.data}
            error={notifications.error}
            onRetry={notifications.reload}
            empty={!notifications.data?.items?.length}
            emptyNode={<p className="text-xs text-muted py-4 text-center">No unread notifications.</p>}
          >
            <div className="divide-y divide-line/60 text-xs">
              {notifications.data?.items?.slice(0, 5).map((n: any) => (
                <div key={n.id} className="py-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {!n.read_at && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <span className={n.read_at ? "text-muted" : "font-semibold text-ink"}>
                      {n.template?.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span className="num text-[11px] text-muted font-mono">{fmtDate(n.sent_at)}</span>
                </div>
              ))}
            </div>
          </Async>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-ptext" />
              <span>Clinical Governance & Audit Standard</span>
            </h2>
            <span className="text-[10px] uppercase font-mono text-ptext">Active</span>
          </div>
          <div className="text-xs text-muted space-y-2 leading-relaxed">
            <p>
              Under Bangladesh health coordination guidelines, every patient chart access is logged into an immutable audit trail (`audit.log`).
            </p>
            <p className="rounded-input border border-line bg-s2/40 p-2.5">
              <b>Mandatory Note Locking:</b> Signed clinical notes are cryptographically immutable. Any updates require a formal clinical addendum.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
