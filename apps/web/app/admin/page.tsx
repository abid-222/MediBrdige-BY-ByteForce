"use client";
import { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  FileCheck,
  FileSearch,
  FileText,
  Filter,
  FlaskConical,
  History,
  Layers,
  Lock,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
} from "recharts";
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
  EmptyState,
  fmtDate,
  fmtDateTime,
  GlassCard,
  Input,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  StatTile,
  TabGroup,
  Table,
  Tooltip,
  useToast,
} from "@/components/ui";
import Link from "next/link";

type AdminTab = "overview" | "queue" | "users" | "audit" | "quality" | "settings";

export default function AdminDashboardPage() {
  useGuard(["super_admin", "reviewer"]);
  const { t } = useI18n();
  const { addToast } = useToast();
  const isSuperAdmin = getRole() === "super_admin";

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Core API Hooks (Real endpoints only)
  const overview = useApi("/admin/overview");
  const system = useApi("/admin/system");
  const queue = useApi("/admin/verification-queue");
  const directoryQuality = useApi("/admin/directory-quality");
  const doctorsStatusApi = useApi(activeTab === "queue" ? "/admin/doctors-status" : null);
  const usersList = useApi(activeTab === "users" && isSuperAdmin ? "/admin/users" : null);
  const auditLogs = useApi(activeTab === "audit" && isSuperAdmin ? "/admin/audit-logs?page_size=50" : null);
  const systemSettings = useApi(activeTab === "settings" && isSuperAdmin ? "/admin/settings" : null);

  // Verification decision form state
  const [decisionReason, setDecisionReason] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [actingEntityId, setActingEntityId] = useState<string | null>(null);

  // Action & Audit Reason Dialog State
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: "verify" | "application" | "user_status";
    kind?: "doctors" | "facilities";
    id: string;
    name: string;
    subtext?: string;
    decision?: "approve" | "reject" | "need_more_evidence";
    targetStatus?: "active" | "suspended";
    reason: string;
    evidence: string;
  }>({
    open: false,
    type: "verify",
    id: "",
    name: "",
    reason: "",
    evidence: "",
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Doctor status directory filters
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");

  // User management state
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusReason, setUserStatusReason] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Audit filter state
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditResultFilter, setAuditResultFilter] = useState("all");

  // Settings modification state
  const [settingsReason, setSettingsReason] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Filtered doctors list in status explorer
  const filteredDoctorsStatus = useMemo(() => {
    const list = doctorsStatusApi.data?.items || [];
    return list.filter((doc: any) => {
      if (docStatusFilter !== "all" && doc.verification !== docStatusFilter) {
        return false;
      }
      if (docSearchQuery.trim()) {
        const q = docSearchQuery.toLowerCase();
        const nameMatch = (doc.full_name || "").toLowerCase().includes(q);
        const bmdcMatch = (doc.bmdc_number || "").toLowerCase().includes(q);
        const specMatch = (doc.specialty || "").toLowerCase().includes(q);
        const facMatch = doc.facilities?.some((f: string) => f.toLowerCase().includes(q));
        if (!nameMatch && !bmdcMatch && !specMatch && !facMatch) return false;
      }
      return true;
    });
  }, [doctorsStatusApi.data, docStatusFilter, docSearchQuery]);

  // Role Application Decision Handler
  const handleDecideApplication = async (
    appId: string,
    decision: "approve" | "reject" | "need_more_evidence"
  ) => {
    if (!decisionReason.trim()) {
      addToast("error", "Audit Reason Required", "Please provide a clinical audit reason for this application decision.");
      return;
    }
    setActingEntityId(appId);
    try {
      await api(`/admin/role-applications/${appId}`, {
        method: "PATCH",
        body: {
          decision,
          reason: decisionReason.trim(),
          evidence: evidenceReference.trim() ? [evidenceReference.trim()] : ["BMDC registry validated"],
        },
      });
      queue.reload();
      overview.reload();
      doctorsStatusApi.reload();
      addToast("success", "Application Decided", `Role application marked as ${decision}. Practitioner status updated.`);
      setDecisionReason("");
      setEvidenceReference("");
    } catch (e: any) {
      addToast("error", "Application Action Failed", e.message);
    } finally {
      setActingEntityId(null);
    }
  };

  // Verification Decision Handler
  const handleVerify = async (
    kind: "doctors" | "facilities",
    entityId: string,
    decision: "approve" | "reject" | "need_more_evidence"
  ) => {
    if (!decisionReason.trim()) {
      addToast("error", "Reason Mandatory", "Please provide a clinical audit reason.");
      return;
    }
    if (decision === "approve" && !evidenceReference.trim()) {
      addToast("error", "Evidence Reference Mandatory", "Attach medical council registration or gazette reference.");
      return;
    }

    setActingEntityId(entityId);
    try {
      await api(`/admin/${kind}/${entityId}/verify`, {
        method: "PATCH",
        body: {
          decision,
          reason: decisionReason.trim(),
          evidence: evidenceReference.trim() ? [evidenceReference.trim()] : [],
        },
      });
      queue.reload();
      overview.reload();
      addToast("success", "Decision Logged", `Entity marked as ${decision}. Audit record saved.`);
      setDecisionReason("");
      setEvidenceReference("");
    } catch (e: any) {
      addToast("error", "Verification Decision Failed", e.message);
    } finally {
      setActingEntityId(null);
    }
  };

  // User Status Toggle (Suspend / Reactivate)
  const handleSetUserStatus = async (userId: string, newStatus: "active" | "suspended") => {
    if (!userStatusReason.trim()) {
      addToast("error", "Reason Required", "State the governance reason for user status update.");
      return;
    }

    setStatusUpdatingId(userId);
    try {
      await api(`/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status: newStatus, reason: userStatusReason.trim() },
      });
      usersList.reload();
      addToast("success", `User ${newStatus === "active" ? "Reactivated" : "Suspended"}`, "Immediate token invalidation enforced.");
      setUserStatusReason("");
    } catch (e: any) {
      addToast("error", "User Update Failed", e.message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Interactive Action Modal Openers
  const openVerifyModal = (
    kind: "doctors" | "facilities",
    entityId: string,
    name: string,
    meta: string,
    decision: "approve" | "reject" | "need_more_evidence",
    existingEvidence?: string
  ) => {
    let defaultReason = "";
    let defaultEvidence = existingEvidence || (meta ? `Ref: ${meta}` : "BMDC registry check");

    if (decision === "approve") {
      defaultReason =
        kind === "doctors"
          ? "BMDC registration verified and clinical credentials approved."
          : "Healthcare facility licensing and regulatory clearance confirmed.";
    } else if (decision === "reject") {
      defaultReason =
        kind === "doctors"
          ? "Credentials could not be validated or accreditation revoked by medical board."
          : "Facility accreditation revoked or compliance criteria not met.";
      defaultEvidence = "";
    } else {
      defaultReason = "Additional medical council documentation or license renewal required.";
    }

    setActionModal({
      open: true,
      type: "verify",
      kind,
      id: entityId,
      name,
      subtext: meta,
      decision,
      reason: decisionReason.trim() || defaultReason,
      evidence: evidenceReference.trim() || defaultEvidence,
    });
  };

  const openApplicationModal = (
    appId: string,
    applicantName: string,
    roleMeta: string,
    decision: "approve" | "reject" | "need_more_evidence",
    evidenceRefs?: string[]
  ) => {
    let defaultReason = "";
    const ev =
      evidenceRefs && evidenceRefs.length > 0
        ? evidenceRefs.join(", ")
        : roleMeta
        ? `Ref: ${roleMeta}`
        : "BMDC registry verified";

    if (decision === "approve") {
      defaultReason = "Application verified against BMDC / DGHS official registry.";
    } else if (decision === "reject") {
      defaultReason = "Application rejected due to invalid or unverified clinical accreditation.";
    } else {
      defaultReason = "Insufficient documentation submitted; please provide updated BMDC registration certificate.";
    }

    setActionModal({
      open: true,
      type: "application",
      id: appId,
      name: applicantName,
      subtext: roleMeta,
      decision,
      reason: decisionReason.trim() || defaultReason,
      evidence: evidenceReference.trim() || ev,
    });
  };

  const openUserStatusModal = (
    userId: string,
    email: string,
    role: string,
    newStatus: "active" | "suspended"
  ) => {
    const defaultReason =
      newStatus === "suspended"
        ? "Account suspended by administrator for clinical policy compliance review."
        : "Account reactivated following administrator review and identity confirmation.";

    setActionModal({
      open: true,
      type: "user_status",
      id: userId,
      name: email,
      subtext: `Role: ${role}`,
      targetStatus: newStatus,
      reason: userStatusReason.trim() || defaultReason,
      evidence: "",
    });
  };

  const handleConfirmModalAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!actionModal.reason.trim()) {
      addToast("error", "Reason Mandatory", "Please provide a clinical audit reason for this action.");
      return;
    }

    setModalSubmitting(true);
    setActingEntityId(actionModal.id);
    try {
      if (actionModal.type === "verify" && actionModal.kind && actionModal.decision) {
        if (actionModal.decision === "approve" && !actionModal.evidence.trim()) {
          addToast("error", "Evidence Mandatory", "Attach medical council registration or verification reference.");
          setModalSubmitting(false);
          setActingEntityId(null);
          return;
        }
        await api(`/admin/${actionModal.kind}/${actionModal.id}/verify`, {
          method: "PATCH",
          body: {
            decision: actionModal.decision,
            reason: actionModal.reason.trim(),
            evidence: actionModal.evidence.trim() ? [actionModal.evidence.trim()] : [],
          },
        });
        queue.reload();
        overview.reload();
        doctorsStatusApi.reload();
        const actionLabel =
          actionModal.decision === "approve"
            ? "Verified"
            : actionModal.decision === "reject"
            ? "Revoked / Rejected"
            : "Review Requested";
        addToast("success", `Decision Logged (${actionLabel})`, `${actionModal.name} status updated in registry.`);
      } else if (actionModal.type === "application" && actionModal.decision) {
        await api(`/admin/role-applications/${actionModal.id}`, {
          method: "PATCH",
          body: {
            decision: actionModal.decision,
            reason: actionModal.reason.trim(),
            evidence: actionModal.evidence.trim() ? [actionModal.evidence.trim()] : ["BMDC registry validated"],
          },
        });
        queue.reload();
        overview.reload();
        doctorsStatusApi.reload();
        addToast("success", "Application Decided", `${actionModal.name} marked as ${actionModal.decision}.`);
      } else if (actionModal.type === "user_status" && actionModal.targetStatus) {
        await api(`/admin/users/${actionModal.id}/status`, {
          method: "PATCH",
          body: {
            status: actionModal.targetStatus,
            reason: actionModal.reason.trim(),
          },
        });
        usersList.reload();
        addToast(
          "success",
          `User ${actionModal.targetStatus === "active" ? "Reactivated" : "Suspended"}`,
          `${actionModal.name} account status updated.`
        );
      }
      setActionModal((prev) => ({ ...prev, open: false }));
    } catch (err: any) {
      addToast("error", "Action Failed", err.message || "Failed to execute administrative decision.");
    } finally {
      setModalSubmitting(false);
      setActingEntityId(null);
    }
  };

  // Audit CSV Export
  const handleExportCsv = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${base}/admin/audit-logs/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("CSV generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medibridge_audit_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", "Audit CSV Exported", "Downloaded complete immutable log.");
    } catch (e: any) {
      addToast("error", "Export Failed", e.message);
    }
  };

  // Toggle Feature Flag
  const handleToggleFlag = async (flagKey: string, currentEnabled: boolean) => {
    if (!settingsReason.trim()) {
      addToast("error", "Reason Required", "Provide a reason for feature flag toggle.");
      return;
    }
    setSavingSettings(true);
    try {
      await api("/admin/settings", {
        method: "PUT",
        body: {
          flags: { [flagKey]: !currentEnabled },
          reason: settingsReason.trim(),
        },
      });
      systemSettings.reload();
      addToast("success", "Feature Flag Updated", `${flagKey} set to ${!currentEnabled}.`);
      setSettingsReason("");
    } catch (e: any) {
      addToast("error", "Flag Update Failed", e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Chart data from real overview metrics
  const overviewChartData = useMemo(() => {
    if (!overview.data) return [];
    return [
      { name: "Users", count: overview.data.users || 0, color: "var(--accent)" },
      { name: "Doctors", count: overview.data.doctors || 0, color: "#5BC0FF" },
      { name: "Facilities", count: overview.data.facilities || 0, color: "#A78BFA" },
      { name: "Documents", count: overview.data.documents || 0, color: "#F59E0B" },
      { name: "Observations", count: overview.data.observations || 0, color: "#10B981" },
      { name: "Appointments", count: overview.data.appointments || 0, color: "#EC4899" },
    ];
  }, [overview.data]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    const items = usersList.data?.items || [];
    return items.filter((u: any) => {
      const q = userSearch.toLowerCase();
      const matchesSearch = !userSearch || (u.email || "").toLowerCase().includes(q) || (u.id || "").includes(q);
      const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [usersList.data, userSearch, userRoleFilter]);

  // Filtered Audit Logs
  const filteredAudit = useMemo(() => {
    const items = auditLogs.data?.items || [];
    return items.filter((l: any) => {
      const matchesAction = !auditActionFilter || (l.action || "").toLowerCase().includes(auditActionFilter.toLowerCase());
      const matchesResult = auditResultFilter === "all" || l.result === auditResultFilter;
      return matchesAction && matchesResult;
    });
  }, [auditLogs.data, auditActionFilter, auditResultFilter]);

  // Tabs structure
  const tabsList = useMemo(() => {
    const base: { key: AdminTab; label: string; count?: number; icon?: any }[] = [
      { key: "overview", label: "Overview & Health", icon: Activity },
      {
        key: "queue",
        label: "Verification Queue",
        count: (queue.data?.doctors?.length || 0) + (queue.data?.facilities?.length || 0) + (queue.data?.applications?.length || 0),
        icon: ShieldCheck,
      },
    ];
    if (isSuperAdmin) {
      base.push({ key: "users", label: "User Directory", count: usersList.data?.items?.length, icon: Users });
      base.push({ key: "audit", label: "Audit Logs", icon: History });
    }
    base.push({ key: "quality", label: "Directory Quality", icon: Layers });
    if (isSuperAdmin) {
      base.push({ key: "settings", label: "System & Flags", icon: Settings });
    }
    return base;
  }, [isSuperAdmin, queue.data, usersList.data]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("adm.title") || "Administrator Governance Center"}
        subtitle={`Role: ${getRole()?.replace("_", " ")?.toUpperCase()} · Bangladesh Clinical Data Protection & Verification Harness`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin Center", href: "/admin" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Link href="/ml-lab">
                <Button size="sm" variant="outline" icon={FlaskConical}>
                  ML & Data Science Lab
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => {
                overview.reload();
                system.reload();
                queue.reload();
                addToast("info", "Refreshed", "Governance data updated.");
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* System Diagnostics Strip */}
      <GlassCard className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold text-ink">
            <Database className="h-4 w-4 text-ptext" />
            <span>Infrastructure Health:</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-muted">PostgreSQL/SQLite: </span>
            <Chip kind={system.data?.database === "ok" ? "verified" : "failed"}>
              {system.data?.database?.toUpperCase() || "CHECKING"}
            </Chip>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-muted">AI Provider: </span>
            <span className="rounded bg-s2 border border-line px-2 py-0.5 font-mono text-ink">
              {system.data?.ai_provider || "deterministic_fallback"}
            </span>
          </span>
          <span className="text-muted">
            Environment: <b className="text-ink font-mono">{system.data?.env || "production"}</b>
          </span>
        </div>

        <span className="rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-ptext font-semibold">
          Strict Audit Active
        </span>
      </GlassCard>

      {/* Primary Navigation Tabs */}
      <TabGroup tabs={tabsList} active={activeTab} onChange={setActiveTab} />

      {/* =========================================================
         TAB 1: OVERVIEW & REAL DATA VISUALIZATION
         ========================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stat Tiles Row */}
          <Async loading={overview.loading && !overview.data} error={overview.error} onRetry={overview.reload}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile icon={Users} label="Total Users" value={overview.data?.users ?? "—"} accent />
              <StatTile icon={Stethoscope} label="Doctors" value={overview.data?.doctors ?? "—"} />
              <StatTile icon={Building2} label="Facilities" value={overview.data?.facilities ?? "—"} />
              <StatTile icon={FileText} label="Documents" value={overview.data?.documents ?? "—"} />
              <StatTile icon={Activity} label="Observations" value={overview.data?.observations ?? "—"} />
              <StatTile icon={CalendarClock} label="Appointments" value={overview.data?.appointments ?? "—"} />
            </div>
          </Async>

          {/* Real Data Distribution Chart */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Activity className="h-5 w-5 text-ptext" />
                  <span>Platform Data Distribution</span>
                </h2>
                <p className="text-xs text-muted">Real object counts currently committed to database</p>
              </div>
              <span className="text-xs text-muted font-mono">Live SQL Query Metric</span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overviewChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-1)",
                      borderColor: "var(--border)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      color: "var(--text)",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {overviewChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
         TAB 2: VERIFICATION QUEUE (DOCTORS & FACILITIES)
         ========================================================= */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Reason & Evidence Control Strip */}
          <Card className="space-y-3 border-primary/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Clinical Audit Defaults (Optional Preset)
              </h3>
              <span className="text-[11px] text-muted">
                Tip: Clicking any "Verify", "Revoke", or "Review" button below opens an interactive prompt to write or confirm your reason.
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Default Audit Reason (Optional)"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="e.g. Validated against BMDC registry portal records"
              />
              <Input
                label="Default Evidence Reference (Optional)"
                value={evidenceReference}
                onChange={(e) => setEvidenceReference(e.target.value)}
                placeholder="e.g. BMDC Reg #A-48219 verified on 2026-11-05"
              />
            </div>
          </Card>

          <Async
            loading={queue.loading && !queue.data}
            error={queue.error}
            onRetry={queue.reload}
            empty={!queue.data?.doctors?.length && !queue.data?.facilities?.length && !queue.data?.applications?.length && !doctorsStatusApi.data?.items?.length}
            emptyNode={
              <EmptyState
                icon={ShieldCheck}
                title="Verification Queue Empty"
                body="All submitted doctors, hospitals, and role applications have been verified."
              />
            }
          >
            {/* 1. Pending Role Applications (Doctors & Hospitals who applied) */}
            {queue.data?.applications?.length > 0 && (
              <Card className="space-y-3 border-2 border-primary/40 bg-psoft/10">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-ptext" />
                    <span>Practitioner Applications Awaiting Review ({queue.data.applications.length})</span>
                  </h3>
                  <Chip kind="pending">Action Required</Chip>
                </div>
                <div className="space-y-3">
                  {queue.data.applications.map((app: any) => {
                    const isDoctor = app.requested_role === "doctor";
                    const d = app.details || {};
                    return (
                      <div
                        key={app.id}
                        className="rounded-card border border-line bg-s1 p-4 space-y-3 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-ink">
                                {d.full_name || d.facility_name || "Applicant"}
                              </span>
                              <Chip kind="info">
                                {isDoctor ? "Doctor Application" : "Facility Application"}
                              </Chip>
                              {d.bmdc_number && (
                                <span className="font-mono text-xs px-2 py-0.5 rounded bg-s2 text-ptext font-bold">
                                  BMDC: {d.bmdc_number}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted">
                              {d.qualifications ? `${d.qualifications} • ` : ""}
                              {d.experience_years ? `${d.experience_years} yrs exp • ` : ""}
                              {d.chamber_name ? `Chamber: ${d.chamber_name} • ` : ""}
                              {d.fee_bdt ? `Fee: BDT ${d.fee_bdt}` : ""}
                            </p>
                            {app.evidence_refs?.length > 0 && (
                              <div className="text-[11px] text-muted flex items-center gap-1.5 pt-1">
                                <FileText className="h-3.5 w-3.5 text-ptext" />
                                <span>Evidence Ref: <strong className="text-ink font-mono">{app.evidence_refs.join(", ")}</strong></span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="xs"
                              variant="primary"
                              busy={actingEntityId === app.id}
                              onClick={() =>
                                openApplicationModal(
                                  app.id,
                                  d.full_name || d.facility_name || "Applicant",
                                  isDoctor
                                    ? `Doctor • BMDC: ${d.bmdc_number || "N/A"}`
                                    : "Healthcare Facility Applicant",
                                  "approve",
                                  app.evidence_refs
                                )
                              }
                            >
                              Approve & Verify
                            </Button>
                            <Button
                              size="xs"
                              variant="secondary"
                              busy={actingEntityId === app.id}
                              onClick={() =>
                                openApplicationModal(
                                  app.id,
                                  d.full_name || d.facility_name || "Applicant",
                                  isDoctor
                                    ? `Doctor • BMDC: ${d.bmdc_number || "N/A"}`
                                    : "Healthcare Facility Applicant",
                                  "need_more_evidence",
                                  app.evidence_refs
                                )
                              }
                            >
                              Need Evidence
                            </Button>
                            <Button
                              size="xs"
                              variant="danger"
                              busy={actingEntityId === app.id}
                              onClick={() =>
                                openApplicationModal(
                                  app.id,
                                  d.full_name || d.facility_name || "Applicant",
                                  isDoctor
                                    ? `Doctor • BMDC: ${d.bmdc_number || "N/A"}`
                                    : "Healthcare Facility Applicant",
                                  "reject",
                                  app.evidence_refs
                                )
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* 2. Doctor Verification Status Explorer & Directory */}
            <Card className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-ptext" />
                    <span>Doctor Verification & Clinical Status Directory</span>
                  </h3>
                  <p className="text-xs text-muted">
                    Inspect which doctors are verified, pending accreditation, or unverified across hospitals.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-medium">
                    Total: <strong className="text-ink">{doctorsStatusApi.data?.total || 0}</strong> doctors
                  </span>
                </div>
              </div>

              {/* Status Filter & Search Controls */}
              <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center sm:justify-between">
                <SearchInput
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  onClear={() => setDocSearchQuery("")}
                  placeholder="Search doctor, BMDC, hospital, specialty..."
                  className="sm:max-w-xs"
                />

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted font-medium">Filter Status:</span>
                  <select
                    value={docStatusFilter}
                    onChange={(e) => setDocStatusFilter(e.target.value)}
                    className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="verified">BMDC Verified</option>
                    <option value="pending">Pending Review</option>
                    <option value="needs_evidence">Needs Evidence</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
              </div>

              {/* Doctor Directory Table / Cards */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredDoctorsStatus.length === 0 ? (
                  <p className="text-xs text-muted text-center py-6">No doctors match the selected status filter.</p>
                ) : (
                  filteredDoctorsStatus.map((d: any) => {
                    const isVerified = d.verification === "verified";
                    return (
                      <div
                        key={d.id}
                        className={`rounded-card border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all ${
                          isVerified ? "border-line bg-s1" : "border-warn/40 bg-warn/5"
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-ink truncate">{d.full_name}</span>
                            <Chip kind={isVerified ? "verified" : d.verification === "pending" ? "pending" : "unverified"}>
                              {isVerified ? "BMDC Verified" : d.verification}
                            </Chip>
                            {d.bmdc_number && (
                              <span className="font-mono text-[11px] text-muted">
                                BMDC: {d.bmdc_number}
                              </span>
                            )}
                            {d.is_sample && <Chip kind="info">Sample</Chip>}
                          </div>
                          <p className="text-xs text-muted truncate">
                            {d.specialty} • {d.qualifications || "MBBS"}
                            {d.facilities?.length > 0 ? ` • Chambers: ${d.facilities.join(", ")}` : " • No Chamber Assigned"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isVerified ? (
                            <Button
                              size="xs"
                              variant="primary"
                              busy={actingEntityId === d.id}
                              onClick={() =>
                                openVerifyModal(
                                  "doctors",
                                  d.id,
                                  d.full_name,
                                  d.bmdc_number ? `BMDC Reg #${d.bmdc_number}` : d.specialty || "Registered Practitioner",
                                  "approve",
                                  d.bmdc_number ? `BMDC Reg #${d.bmdc_number}` : "Medical Council Registry"
                                )
                              }
                            >
                              Verify Doctor
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant="secondary"
                              busy={actingEntityId === d.id}
                              onClick={() =>
                                openVerifyModal(
                                  "doctors",
                                  d.id,
                                  d.full_name,
                                  d.bmdc_number ? `BMDC Reg #${d.bmdc_number}` : d.specialty || "Registered Practitioner",
                                  "need_more_evidence"
                                )
                              }
                            >
                              Audit Review
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="danger"
                            busy={actingEntityId === d.id}
                            onClick={() =>
                              openVerifyModal(
                                "doctors",
                                d.id,
                                d.full_name,
                                d.bmdc_number ? `BMDC Reg #${d.bmdc_number}` : d.specialty || "Registered Practitioner",
                                "reject"
                              )
                            }
                          >
                            Revoke
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* 3. Facilities & Hospitals Queue */}
            {queue.data?.facilities?.length > 0 && (
              <Card className="space-y-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2 border-b border-line pb-2">
                  <Building2 className="h-4 w-4 text-ptext" />
                  <span>Hospitals / Clinics Awaiting Verification ({queue.data.facilities.length})</span>
                </h3>
                <div className="space-y-2">
                  {queue.data.facilities.map((f: any) => (
                    <div
                      key={f.id}
                      className="rounded-card border border-line bg-s2/40 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink">{f.name}</span>
                          <Chip kind={f.verification === "pending" ? "pending" : "unverified"}>
                            {f.verification}
                          </Chip>
                          {f.is_sample && <Chip kind="info">Sample</Chip>}
                        </div>
                        <p className="num text-xs text-muted font-mono mt-0.5">District: {f.district || "Dhaka"} • ID: {f.id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          variant="primary"
                          busy={actingEntityId === f.id}
                          onClick={() =>
                            openVerifyModal(
                              "facilities",
                              f.id,
                              f.name,
                              `District: ${f.district || "Dhaka"} · ID: ${f.id}`,
                              "approve",
                              `Directorate General of Health Services (DGHS) License / ${f.district || "Dhaka"}`
                            )
                          }
                        >
                          Approve Hospital
                        </Button>
                        <Button
                          size="xs"
                          variant="danger"
                          busy={actingEntityId === f.id}
                          onClick={() =>
                            openVerifyModal(
                              "facilities",
                              f.id,
                              f.name,
                              `District: ${f.district || "Dhaka"} · ID: ${f.id}`,
                              "reject"
                            )
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Async>
        </div>
      )}

      {/* =========================================================
         TAB 3: USER MANAGEMENT (SUPER ADMIN ONLY)
         ========================================================= */}
      {activeTab === "users" && isSuperAdmin && (
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Users className="h-5 w-5 text-ptext" />
                <span>User Directory & Permission Management</span>
              </h2>
              <p className="text-xs text-muted">Inspect account roles, verification tokens, and status</p>
            </div>
          </div>

          {/* Action Reason Input */}
          <div className="rounded-input border border-line bg-s2/50 p-3 space-y-1">
            <Input
              label="Default Action Reason (Optional Preset)"
              value={userStatusReason}
              onChange={(e) => setUserStatusReason(e.target.value)}
              placeholder="e.g. Terms violation or requested account reactivation"
            />
            <p className="text-[11px] text-muted">
              Tip: Clicking Suspend or Reactivate on any user below opens an instant reason confirmation prompt.
            </p>
          </div>

          {/* Search & Role Filter */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onClear={() => setUserSearch("")}
              placeholder="Search user by email or ID..."
              className="sm:max-w-xs"
            />
            <div className="flex items-center gap-2 text-xs">
              <Filter className="h-4 w-4 text-muted" />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="facility_admin">Facility Admin</option>
                <option value="facility_staff">Facility Staff</option>
                <option value="reviewer">Reviewer</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>

          <Async
            loading={usersList.loading && !usersList.data}
            error={usersList.error}
            onRetry={usersList.reload}
            empty={filteredUsers.length === 0}
            emptyNode={<EmptyState icon={Users} title="No users found" body="No registered accounts match your filter." />}
            skeleton="table"
          >
            <Table>
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Account ID</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => {
                  const isActive = u.status === "active";
                  const isBusy = statusUpdatingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-s2/40 transition">
                      <td className="font-bold text-ink">{u.email}</td>
                      <td>
                        <span className="rounded bg-s2 border border-line px-2 py-0.5 text-xs font-mono capitalize">
                          {u.role?.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <Chip kind={isActive ? "verified" : "failed"}>
                          {u.status}
                        </Chip>
                      </td>
                      <td className="num text-xs text-muted font-mono">{u.id?.slice(0, 16)}…</td>
                      <td className="text-right">
                        {isActive ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            className="text-danger hover:bg-danger/10"
                            busy={isBusy}
                            onClick={() => openUserStatusModal(u.id, u.email, u.role, "suspended")}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => openUserStatusModal(u.id, u.email, u.role, "active")}
                          >
                            Reactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Async>
        </Card>
      )}

      {/* =========================================================
         TAB 4: AUDIT LOGS (SUPER ADMIN ONLY)
         ========================================================= */}
      {activeTab === "audit" && isSuperAdmin && (
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <History className="h-5 w-5 text-ptext" />
                <span>Immutable System Audit Trail</span>
              </h2>
              <p className="text-xs text-muted">Complete provenance log of all clinical, administrative, and consent events</p>
            </div>

            <Button size="sm" variant="secondary" icon={Download} onClick={handleExportCsv}>
              Export Audit CSV
            </Button>
          </div>

          {/* Audit Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
              placeholder="Filter by action name (e.g. documents.upload, notes.sign)..."
              className="flex-1 rounded-input border border-line bg-s2/60 px-3 py-1.5 text-xs text-ink placeholder:text-muted focus-visible:outline-none"
            />
            <select
              value={auditResultFilter}
              onChange={(e) => setAuditResultFilter(e.target.value)}
              className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
            >
              <option value="all">All Results</option>
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
            </select>
          </div>

          <Async
            loading={auditLogs.loading && !auditLogs.data}
            error={auditLogs.error}
            onRetry={auditLogs.reload}
            empty={filteredAudit.length === 0}
            emptyNode={<EmptyState icon={History} title="No audit events found" body="No log entries match your filter." />}
            skeleton="table"
          >
            <Table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor Role</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Result</th>
                  <th>Audit Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map((l: any) => {
                  const isDeny = l.result === "deny";
                  return (
                    <tr key={l.id} className="hover:bg-s2/40 transition">
                      <td className="num text-xs text-muted whitespace-nowrap">{fmtDateTime(l.at)}</td>
                      <td className="font-semibold text-xs text-ink capitalize">{l.actor_role}</td>
                      <td className="font-mono text-xs text-ptext">{l.action}</td>
                      <td className="text-xs text-muted">
                        {l.resource_type ? `${l.resource_type}:${l.resource_id?.slice(0, 8)}…` : "—"}
                      </td>
                      <td>
                        <span className={`font-mono text-xs font-bold ${isDeny ? "text-warn" : "text-ptext"}`}>
                          {isDeny ? "✕ Deny" : "✓ Allow"}
                        </span>
                      </td>
                      <td className="text-xs text-muted max-w-[200px] truncate">{l.reason || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Async>
        </Card>
      )}

      {/* =========================================================
         TAB 5: DIRECTORY QUALITY & STALENESS
         ========================================================= */}
      {activeTab === "quality" && (
        <div className="space-y-4">
          <Async loading={directoryQuality.loading && !directoryQuality.data} error={directoryQuality.error} onRetry={directoryQuality.reload}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                icon={Stethoscope}
                label={`Stale Doctors (>${directoryQuality.data?.stale_after_days}d)`}
                value={directoryQuality.data?.stale_doctors?.length ?? 0}
                trend="down"
                trendLabel="Need reverification"
              />
              <StatTile
                icon={Building2}
                label="Stale Facilities"
                value={directoryQuality.data?.stale_facilities?.length ?? 0}
                trend="down"
                trendLabel="Need reverification"
              />
              <StatTile
                icon={Layers}
                label="Possible Duplicates"
                value={directoryQuality.data?.possible_duplicates?.length ?? 0}
                trend="neutral"
                trendLabel="Name collision check"
              />
              <StatTile
                icon={AlertTriangle}
                label="Open Directory Reports"
                value={directoryQuality.data?.open_reports ?? 0}
                trend="neutral"
                trendLabel="Patient feedback"
              />
            </div>
          </Async>

          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 border-b border-line pb-2">
              <ShieldCheck className="h-4 w-4 text-ptext" />
              <span>Directory Health & Provenance Standard</span>
            </h3>
            <div className="text-xs text-muted space-y-2 leading-relaxed">
              <p>
                In MediBridge AI, provider listings show their provenance source, last-verified date, and confidence level.
                Records not reverified within <b>{directoryQuality.data?.stale_after_days || 90} days</b> automatically receive a
                <Chip kind="stale" /> badge to prevent patients from relying on stale fees or out-of-date clinic hours.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================
         TAB 6: SYSTEM SETTINGS & FEATURE FLAGS (SUPER ADMIN)
         ========================================================= */}
      {activeTab === "settings" && isSuperAdmin && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Settings className="h-5 w-5 text-ptext" />
                <span>Feature Flags & Runtime Configuration</span>
              </h2>
              <p className="text-xs text-muted">Runtime feature gating with mandatory audit reasoning</p>
            </div>
          </div>

          <div className="rounded-input border border-line bg-s2/50 p-3">
            <Input
              label="Modification Audit Reason *"
              value={settingsReason}
              onChange={(e) => setSettingsReason(e.target.value)}
              placeholder="e.g. Activated AI summary pilot for Dhaka clinics"
            />
          </div>

          <Async loading={systemSettings.loading && !systemSettings.data} error={systemSettings.error} onRetry={systemSettings.reload}>
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Feature Flags:</h3>
              <div className="divide-y divide-line/60">
                {Object.entries(systemSettings.data?.flags || {}).map(([flag, enabled]) => (
                  <div key={flag} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-ink font-mono">{flag}</p>
                      <p className="text-[11px] text-muted">Runtime toggle</p>
                    </div>
                    <Button
                      size="xs"
                      variant={enabled ? "primary" : "secondary"}
                      busy={savingSettings}
                      disabled={!settingsReason.trim()}
                      onClick={() => handleToggleFlag(flag, Boolean(enabled))}
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Async>
        </Card>
      )}

      {/* =========================================================
         ACTION & CLINICAL AUDIT REASON DIALOG MODAL
         ========================================================= */}
      <Dialog
        open={actionModal.open}
        title={
          actionModal.type === "user_status"
            ? actionModal.targetStatus === "suspended"
              ? "Suspend User Account"
              : "Reactivate User Account"
            : actionModal.decision === "reject"
            ? actionModal.kind === "facilities"
              ? "Reject Facility Verification"
              : "Revoke Doctor Verification"
            : actionModal.decision === "approve"
            ? actionModal.kind === "facilities"
              ? "Verify Healthcare Facility"
              : "Verify Doctor Credentials"
            : "Request Additional Evidence & Audit Review"
        }
        onClose={() => setActionModal((prev) => ({ ...prev, open: false }))}
      >
        <form onSubmit={handleConfirmModalAction} className="space-y-4 pt-1">
          {/* Target Entity Summary Box */}
          <div className="rounded-card border border-line bg-s2/60 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold text-sm text-ink">{actionModal.name}</span>
              <Chip
                kind={
                  actionModal.decision === "reject" || actionModal.targetStatus === "suspended"
                    ? "failed"
                    : actionModal.decision === "approve" || actionModal.targetStatus === "active"
                    ? "verified"
                    : "pending"
                }
              >
                {actionModal.decision === "reject"
                  ? "Revoke / Reject"
                  : actionModal.decision === "approve"
                  ? "Approve & Verify"
                  : actionModal.decision === "need_more_evidence"
                  ? "Need Evidence"
                  : actionModal.targetStatus === "suspended"
                  ? "Suspend Account"
                  : "Reactivate Account"}
              </Chip>
            </div>
            {actionModal.subtext && (
              <p className="text-xs text-muted font-mono">{actionModal.subtext}</p>
            )}
          </div>

          {/* Clinical Audit Reason Input (Mandatory) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-ink flex items-center justify-between">
              <span>
                Audit Reason (অডিট ও ভেরিফিকেশন কারণ) <strong className="text-danger">*</strong>
              </span>
              <span className="text-[11px] text-muted font-normal">Mandatory for compliance</span>
            </label>
            <textarea
              required
              rows={3}
              value={actionModal.reason}
              onChange={(e) => setActionModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="State governance or clinical reason (e.g. BMDC registry verified / credentials revoked)..."
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition resize-y min-h-[80px]"
            />
            <p className="text-[11px] text-muted">
              This reason is permanently recorded in the immutable MediBridge clinical audit log.
            </p>
          </div>

          {/* Evidence Reference Input (Required for Approvals) */}
          {(actionModal.type === "verify" || actionModal.type === "application") && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-ink flex items-center justify-between">
                <span>
                  Evidence Reference (প্রমাণ ও গেজেট সূত্র)
                  {actionModal.decision === "approve" && <strong className="text-danger"> *</strong>}
                </span>
                <span className="text-[11px] text-muted font-normal">
                  {actionModal.decision === "approve" ? "Required for approvals" : "Optional for revocations"}
                </span>
              </label>
              <Input
                value={actionModal.evidence}
                onChange={(e) => setActionModal((prev) => ({ ...prev, evidence: e.target.value }))}
                placeholder="e.g. BMDC Reg #A-48219 or verification registry portal link"
              />
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setActionModal((prev) => ({ ...prev, open: false }))}
              disabled={modalSubmitting}
            >
              Cancel (বাতিল)
            </Button>
            <Button
              type="submit"
              variant={
                actionModal.decision === "reject" || actionModal.targetStatus === "suspended"
                  ? "danger"
                  : "primary"
              }
              busy={modalSubmitting}
              disabled={
                !actionModal.reason.trim() ||
                (actionModal.decision === "approve" && !actionModal.evidence.trim())
              }
            >
              {actionModal.decision === "reject"
                ? "Confirm Revoke (বাতিল নিশ্চিত করুন)"
                : actionModal.targetStatus === "suspended"
                ? "Confirm Suspend (স্থগিত নিশ্চিত করুন)"
                : actionModal.decision === "need_more_evidence"
                ? "Request Evidence (প্রমাণপত্র চান)"
                : "Confirm Verification (ভেরিফাই নিশ্চিত করুন)"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
