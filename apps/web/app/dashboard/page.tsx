"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileSearch,
  FileText,
  Filter,
  History,
  Info,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  User,
  Users,
} from "lucide-react";
import { api, getRole, getToken } from "@/lib/api";
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
  docStatus,
  EmergencyBanner,
  EmptyState,
  fmtDate,
  fmtDateTime,
  GlassCard,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  StatTile,
  TabGroup,
  Table,
  Tooltip,
  useToast,
} from "@/components/ui";

/* =========================================================
   1. WELCOME SECTION (GREETING + QUICK ACTIONS)
   ========================================================= */
function WelcomeBanner({
  name,
  onUploadClick,
}: {
  name: string;
  onUploadClick: () => void;
}) {
  const { t } = useI18n();
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const hour = today.getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative overflow-hidden rounded-card border border-primary/20 bg-gradient-to-br from-s1 via-s1 to-psoft/20 p-6 shadow-glow">
      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ptext">
            <Sparkles className="h-3.5 w-3.5" />
            <span>MediBridge AI · Patient Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
            {timeGreeting}, {name || "Patient"}
          </h1>
          <p className="text-xs text-muted flex items-center gap-2 pt-0.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateStr}</span>
            <span>·</span>
            <span>Clinical decisions remain 100% human-verified</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          <Button onClick={onUploadClick} size="sm" icon={UploadCloud}>
            {t("dash.upload") || "Upload Report"}
          </Button>
          <Link href="/navigator">
            <Button variant="secondary" size="sm" icon={Compass}>
              {t("dash.findCare") || "Find Care"}
            </Button>
          </Link>
          <Link href="/timeline">
            <Button variant="outline" size="sm" icon={TrendingUp}>
              {t("nav.myHealth") || "Trends"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   2. HEALTH OVERVIEW & PROFILE COMPLETION
   ========================================================= */
function ProfileProgressCard({ profile }: { profile: any }) {
  const fields = [
    Boolean(profile?.full_name),
    Boolean(profile?.dob),
    Boolean(profile?.sex),
    Boolean(profile?.division),
    Boolean(profile?.district),
    Boolean(profile?.emergency_phone),
    Boolean(profile?.conditions?.length),
    Boolean(profile?.onboarding_completed),
  ];
  const completedCount = fields.filter(Boolean).length;
  const pct = Math.round((completedCount / fields.length) * 100);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          Health Profile Completion
        </span>
        <span className="num text-xs font-bold text-ptext">{pct}%</span>
      </div>
      <ProgressBar value={pct} max={100} />
      <div className="flex items-center justify-between text-xs text-muted pt-1">
        <span>{completedCount} of {fields.length} clinical profile steps</span>
        {pct < 100 && (
          <Link href="/onboarding" className="text-ptext hover:underline font-semibold">
            Complete Profile →
          </Link>
        )}
      </div>
    </Card>
  );
}

/* =========================================================
   3. AI ASSISTANT PANEL COMPONENT
   ========================================================= */
function AiAssistantCard({
  latestDoc,
  onExplainClick,
}: {
  latestDoc: any;
  onExplainClick: (docId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <GlassCard className="space-y-4 border-info/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
              <span>AI Health Assistant</span>
              <Chip kind="ai" />
            </h2>
            <p className="text-[11px] text-muted">Plain-language medical summary assistant</p>
          </div>
        </div>
        <span className="rounded-full bg-s2 border border-line px-2 py-0.5 text-[10px] text-muted font-mono">
          Safe Mode
        </span>
      </div>

      <div className="rounded-input border border-line/60 bg-s1/60 p-3 text-xs text-muted space-y-2">
        <div className="flex items-start gap-2 text-ink">
          <Info className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            The AI assistant translates complex lab tests (CBC, Glucose, Lipid) into clear language with reference ranges. <b>It never diagnoses or prescribes.</b>
          </p>
        </div>
        <p className="text-[11px] text-muted border-t border-line/40 pt-2">
          Clinical eligibility is verified first; emergency red flags redirect directly to 999.
        </p>
      </div>

      {latestDoc ? (
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs">
            <span className="text-muted">Latest Report: </span>
            <span className="font-semibold text-ink uppercase">{latestDoc.doc_type || "Report"}</span>
          </div>
          <Button
            size="xs"
            variant="outline"
            icon={Sparkles}
            onClick={() => onExplainClick(latestDoc.id)}
          >
            Explain with AI
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted flex items-center justify-between">
          <span>Upload a report to generate an explanation.</span>
          <Link href="/reports">
            <Button size="xs" variant="secondary">Upload</Button>
          </Link>
        </div>
      )}
    </GlassCard>
  );
}

/* =========================================================
   MAIN COMPONENT: PATIENT DASHBOARD
   ========================================================= */
export default function PatientDashboard() {
  useGuard(["patient"]);
  const { t, locale } = useI18n();
  const router = useRouter();
  const { addToast } = useToast();

  // API Hooks (All real endpoints)
  const dash = useApi("/patients/me/dashboard");
  const profile = useApi("/patients/me");
  const docs = useApi("/documents");
  const consents = useApi("/consents");
  const appts = useApi("/appointments");
  const notes = useApi("/notifications");
  const log = useApi("/patients/me/access-log?page_size=8");

  // Local state for interactive filtering & tabs
  const [docSearch, setDocSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [apptFilter, setApptFilter] = useState<"upcoming" | "previous" | "all">("upcoming");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [explainDocId, setExplainDocId] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Onboarding redirection guard
  useEffect(() => {
    if (dash.error?.toLowerCase().includes("onboarding")) {
      router.replace("/onboarding");
    }
  }, [dash.error, router]);

  // Derived metrics
  const activeShares = useMemo(() => {
    return (
      consents.data?.items?.filter(
        (c: any) => !c.revoked_at && c.consent_type === "doctor_share"
      ).length ?? 0
    );
  }, [consents.data]);

  const totalValues = useMemo(() => {
    if (!docs.data?.items) return null;
    return docs.data.items.reduce((sum: number, d: any) => sum + (d.total_values || 0), 0);
  }, [docs.data]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    if (!docs.data?.items) return [];
    return docs.data.items.filter((d: any) => {
      const matchesSearch =
        !docSearch ||
        (d.doc_type || "").toLowerCase().includes(docSearch.toLowerCase()) ||
        (d.status || "").toLowerCase().includes(docSearch.toLowerCase());
      const matchesType = docTypeFilter === "all" || d.doc_type === docTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [docs.data, docSearch, docTypeFilter]);

  // Categorized appointments
  const { upcomingAppts, previousAppts } = useMemo(() => {
    const items = appts.data?.items || [];
    const now = new Date();
    const upcoming = items.filter((a: any) =>
      ["requested", "confirmed", "rescheduled"].includes(a.status)
    );
    const previous = items.filter(
      (a: any) =>
        ["completed", "cancelled"].includes(a.status) ||
        new Date(a.slot_start) < now
    );
    return { upcomingAppts: upcoming, previousAppts: previous };
  }, [appts.data]);

  const displayedAppts =
    apptFilter === "upcoming"
      ? upcomingAppts
      : apptFilter === "previous"
      ? previousAppts
      : appts.data?.items || [];

  // Cancel appointment handler
  const cancelAppt = async (id: string) => {
    setCancellingId(id);
    try {
      await api(`/appointments/${id}/status`, {
        method: "PATCH",
        body: { status: "cancelled" },
      });
      appts.reload();
      addToast("success", "Appointment Cancelled", "Your booking has been updated.");
    } catch (e: any) {
      addToast("error", "Cancellation Failed", e.message);
    } finally {
      setCancellingId(null);
    }
  };

  // AI Explanation handler
  const triggerAiExplain = async (docId: string) => {
    setExplainDocId(docId);
    setAiLoading(true);
    setAiExplanation(null);
    try {
      const res = await api("/ai/report-explain", {
        body: { document_id: docId, lang: locale },
      });
      setAiExplanation(res);
      addToast("success", "AI Explanation Generated", "Draft summary based on verified facts only.");
    } catch (e: any) {
      addToast("error", "AI Explanation Unavailable", e.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================
         1. WELCOME SECTION
         ========================================================= */}
      <Async loading={dash.loading && !dash.data} error={dash.error} onRetry={dash.reload}>
        <WelcomeBanner
          name={dash.data?.greeting_name || profile.data?.full_name || "Patient"}
          onUploadClick={() => setUploadModalOpen(true)}
        />
      </Async>

      {/* =========================================================
         2. HEALTH OVERVIEW STATS ROW
         ========================================================= */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={FileText}
          label={t("dash.reportsCount") || "Medical Reports"}
          value={docs.data?.items?.length ?? "—"}
          accent
          trend="up"
          trendLabel={`${totalValues ?? "—"} observations`}
        />
        <StatTile
          icon={CalendarClock}
          label={t("dash.apptsCount") || "Active Bookings"}
          value={upcomingAppts.length}
          trend={upcomingAppts.length > 0 ? "up" : "neutral"}
          trendLabel={upcomingAppts.length > 0 ? "Upcoming care" : "None scheduled"}
        />
        <StatTile
          icon={ShieldCheck}
          label={t("dash.sharesCount") || "Active Consents"}
          value={activeShares}
          trend="neutral"
          trendLabel="Doctors with access"
        />
        <StatTile
          icon={Activity}
          label="Tracked Markers"
          value={dash.data?.snapshot?.length ?? "—"}
          trend="neutral"
          trendLabel="Recent observations"
        />
      </div>

      {/* Profile completion & AI Assistant Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ProfileProgressCard profile={profile.data} />
        <AiAssistantCard
          latestDoc={dash.data?.latest_report || docs.data?.items?.[0]}
          onExplainClick={triggerAiExplain}
        />
      </div>

      {/* =========================================================
         3. RECENT HEALTH SNAPSHOT OBSERVATIONS
         ========================================================= */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-ptext" />
            <h2 className="text-lg font-bold text-ink">Recent Observation Snapshot</h2>
          </div>
          <Link href="/timeline" className="text-xs font-semibold text-ptext hover:underline flex items-center gap-1">
            <span>View Full Trends Timeline</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Async
          loading={dash.loading && !dash.data}
          error={dash.error}
          onRetry={dash.reload}
          empty={!dash.data?.snapshot?.length}
          emptyNode={
            <EmptyState
              icon={FileText}
              title="No observations recorded yet"
              body="Upload your CBC, Blood Glucose, or Lipid profile to view historical tracking."
              action={
                <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                  Upload First Report
                </Button>
              }
            />
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dash.data?.snapshot?.map((obs: any, idx: number) => (
              <div
                key={idx}
                className="rounded-input border border-line bg-s2/50 p-3.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                  <span className="font-bold uppercase tracking-wider text-ink">{obs.test_code}</span>
                  <span>{fmtDate(obs.observed_on)}</span>
                </div>
                <div className="num text-2xl font-bold text-ink">
                  {obs.value} <span className="text-xs font-normal text-muted">{obs.unit || ""}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1 border-t border-line/40">
                  {obs.status === "doctor_verified" ? (
                    <Chip kind="doctor" />
                  ) : (
                    <Chip kind="unverified" />
                  )}
                  {obs.low_confidence && <Chip kind="low" />}
                </div>
              </div>
            ))}
          </div>
        </Async>
      </Card>

      {/* =========================================================
         4. MEDICAL DOCUMENTS SECTION
         ========================================================= */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <FileText className="h-5 w-5 text-ptext" />
              <span>Medical Documents</span>
            </h2>
            <p className="text-xs text-muted">Uploaded PDFs and medical scans with OCR extractions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" icon={Plus} onClick={() => setUploadModalOpen(true)}>
              Upload New
            </Button>
            <Link href="/reports">
              <Button size="sm" variant="secondary">
                View All
              </Button>
            </Link>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={docSearch}
            onChange={(e) => setDocSearch(e.target.value)}
            onClear={() => setDocSearch("")}
            placeholder="Search documents by type or status..."
            className="sm:max-w-xs"
          />
          <div className="flex items-center gap-2 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted" />
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="rounded-input border border-line bg-s2 px-2.5 py-1.5 text-xs text-ink focus-visible:outline-none"
            >
              <option value="all">All Report Types</option>
              <option value="cbc">CBC</option>
              <option value="glucose">Glucose</option>
              <option value="lipid">Lipid</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Document Table */}
        <Async
          loading={docs.loading && !docs.data}
          error={docs.error}
          onRetry={docs.reload}
          empty={filteredDocs.length === 0}
          emptyNode={
            <EmptyState
              icon={FileText}
              title="No documents matching criteria"
              body="Upload a new PDF or scan to view extracted values."
              action={
                <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                  Upload Document
                </Button>
              }
            />
          }
          skeleton="table"
        >
          <Table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Upload Date</th>
                <th>Processing Status</th>
                <th>Values</th>
                <th>Verification</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.slice(0, 5).map((d: any) => {
                const statusKind = docStatus({
                  status: d.status,
                  total: d.total_values,
                  verifiedCount: d.verified_values,
                  lowCount: d.low_confidence_values,
                });
                return (
                  <tr key={d.id} className="hover:bg-s2/40 transition">
                    <td className="font-bold text-ink">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-ptext shrink-0" />
                        <span className="uppercase">{d.doc_type || "Report"}</span>
                        {d.is_sample && <Chip kind="info">Sample</Chip>}
                      </div>
                    </td>
                    <td className="num text-xs text-muted">{fmtDate(d.created_at)}</td>
                    <td>
                      <Chip kind={statusKind} />
                    </td>
                    <td className="num text-xs font-semibold">
                      {d.total_values || 0} extracted
                    </td>
                    <td>
                      {d.verified_values > 0 && d.verified_values === d.total_values ? (
                        <Chip kind="doctor">Doctor Verified</Chip>
                      ) : d.low_confidence_values > 0 ? (
                        <Chip kind="low">{d.low_confidence_values} to check</Chip>
                      ) : (
                        <Chip kind="unverified" />
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => triggerAiExplain(d.id)}
                          title="Generate plain-language explanation"
                        >
                          <Sparkles className="h-3 w-3 text-ptext" />
                        </Button>
                        <Link href={`/reports/${d.id}`}>
                          <Button size="xs" variant="secondary">
                            View Report
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Async>
      </Card>

      {/* =========================================================
         5. APPOINTMENTS SECTION
         ========================================================= */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-ptext" />
              <span>Doctor Appointments</span>
            </h2>
            <p className="text-xs text-muted">Consultation requests and confirmed schedules</p>
          </div>
          <div className="flex items-center gap-2">
            <TabGroup
              tabs={[
                { key: "upcoming", label: "Upcoming", count: upcomingAppts.length },
                { key: "previous", label: "Previous", count: previousAppts.length },
                { key: "all", label: "All" },
              ]}
              active={apptFilter}
              onChange={setApptFilter}
            />
            <Link href="/directory">
              <Button size="sm" icon={Compass}>
                Book Care
              </Button>
            </Link>
          </div>
        </div>

        <Async
          loading={appts.loading && !appts.data}
          error={appts.error}
          onRetry={appts.reload}
          empty={displayedAppts.length === 0}
          emptyNode={
            <EmptyState
              icon={CalendarClock}
              title={
                apptFilter === "upcoming"
                  ? "No upcoming appointments"
                  : "No past appointments found"
              }
              body="Use the SmartCare Navigator to match with eligible doctors in Dhaka."
              action={
                <Link href="/directory">
                  <Button size="sm">Find Doctor</Button>
                </Link>
              }
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {displayedAppts.map((a: any) => {
              const isConfirmed = a.status === "confirmed";
              const isCancelled = a.status === "cancelled";
              const isCompleted = a.status === "completed";

              return (
                <div
                  key={a.id}
                  className={`rounded-card border p-4 transition-all ${
                    isConfirmed
                      ? "border-primary/40 bg-psoft/10 shadow-sm"
                      : isCancelled
                      ? "border-line bg-s2/30 opacity-70"
                      : "border-line bg-s1"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-ink truncate">
                        {a.doctor_name || "Doctor Consultation"}
                      </p>
                      <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
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
                    <p className="mt-2 text-xs text-muted bg-s2/40 p-2 rounded-input">
                      <b>Reason:</b> {a.reason}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5">
                    <Link
                      href="/appointments"
                      className="text-xs font-semibold text-ptext hover:underline"
                    >
                      Details →
                    </Link>
                    {!isCancelled && !isCompleted && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-danger hover:bg-danger/10"
                        busy={cancellingId === a.id}
                        onClick={() => cancelAppt(a.id)}
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

      {/* =========================================================
         6. RECENT ACTIVITY & ACCESS AUDIT LOG
         ========================================================= */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Real Access Logs */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <History className="h-4 w-4 text-ptext" />
              <span>Who Accessed My Records (Audit Log)</span>
            </h2>
            <Link href="/consent" className="text-xs text-ptext hover:underline">
              Manage Consents →
            </Link>
          </div>
          <Async
            loading={log.loading && !log.data}
            error={log.error}
            onRetry={log.reload}
            empty={!log.data?.items?.length}
            emptyNode={<p className="text-xs text-muted py-4 text-center">No access events recorded yet.</p>}
          >
            <div className="divide-y divide-line/60 text-xs">
              {log.data?.items?.slice(0, 5).map((l: any) => (
                <div key={l.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-ink capitalize">{l.actor_role}</span>
                    <span className="text-muted"> · {l.action}</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      l.result === "deny" ? "text-warn" : "text-ptext"
                    }`}
                  >
                    {l.result}
                  </span>
                </div>
              ))}
            </div>
          </Async>
        </Card>

        {/* Notifications feed */}
        <Card className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-ptext" />
              <span>Recent Notifications</span>
            </h2>
            <span className="num text-xs text-muted">{notes.data?.items?.length || 0} total</span>
          </div>
          <Async
            loading={notes.loading && !notes.data}
            error={notes.error}
            onRetry={notes.reload}
            empty={!notes.data?.items?.length}
            emptyNode={<p className="text-xs text-muted py-4 text-center">No notifications right now.</p>}
          >
            <div className="divide-y divide-line/60 text-xs">
              {notes.data?.items?.slice(0, 5).map((n: any) => (
                <div key={n.id} className="py-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {!n.read_at && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <span className={n.read_at ? "text-muted" : "font-medium text-ink"}>
                      {n.template?.replaceAll("_", " ")}
                    </span>
                  </div>
                  <span className="num text-[11px] text-muted shrink-0 font-mono">
                    {fmtDate(n.sent_at)}
                  </span>
                </div>
              ))}
            </div>
          </Async>
        </Card>
      </div>

      {/* =========================================================
         AI EXPLANATION MODAL
         ========================================================= */}
      <Dialog
        open={Boolean(explainDocId)}
        title="AI Plain-Language Report Explanation"
        onClose={() => setExplainDocId(null)}
      >
        <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex items-center gap-2">
            <Chip kind="ai" />
            <span className="text-xs text-muted">Strict fact extraction · No generative hallucination</span>
          </div>

          {aiLoading ? (
            <div className="space-y-3 py-6 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted">Reading lab values and cross-referencing ranges...</p>
            </div>
          ) : aiExplanation ? (
            <div className="space-y-3">
              {aiExplanation.emergency && (
                <EmergencyBanner text={aiExplanation.guidance} />
              )}
              {aiExplanation.known_facts?.map((f: any, idx: number) => (
                <div key={idx} className="rounded-input border border-line bg-s2/40 p-3 text-xs leading-relaxed">
                  <span className="font-semibold text-ptext">• </span>
                  <span className="text-ink">{f.text}</span>
                </div>
              ))}
              {aiExplanation.unknown?.length > 0 && (
                <div className="text-xs text-muted">
                  <p className="font-bold uppercase tracking-wider mb-1">Uncertain or missing fields:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {aiExplanation.unknown.map((u: string, idx: number) => (
                      <li key={idx}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-input border border-line/60 bg-s1 p-2 text-[11px] text-muted">
                {aiExplanation.disclaimer}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">No explanation generated.</p>
          )}

          <div className="flex justify-end pt-2 border-t border-line">
            <Button size="sm" variant="secondary" onClick={() => setExplainDocId(null)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* =========================================================
         QUICK UPLOAD DIALOG
         ========================================================= */}
      <Dialog
        open={uploadModalOpen}
        title="Upload Medical Document"
        onClose={() => setUploadModalOpen(false)}
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-muted leading-relaxed">
            Upload your CBC, Blood Glucose, or Lipid report in PDF, JPG, or PNG format (max 10MB).
          </p>
          <div className="rounded-card border-2 border-dashed border-line bg-s2/30 p-6 text-center">
            <UploadCloud className="mx-auto h-8 w-8 text-ptext mb-2" />
            <p className="font-bold text-ink text-sm">Select report file</p>
            <p className="text-xs text-muted mt-1">PDF, JPG, or PNG files only</p>
            <Link href="/reports">
              <Button size="sm" className="mt-4" onClick={() => setUploadModalOpen(false)}>
                Go to Upload Studio
              </Button>
            </Link>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
