"use client";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  fmtDate,
  fmtDateTime,
  GlassCard,
  PageHeader,
  StatTile,
  TabGroup,
  Table,
  useToast,
} from "@/components/ui";

export default function ConsentPage() {
  useGuard(["patient"]);
  const { t } = useI18n();
  const { addToast } = useToast();

  // API hooks
  const consents = useApi("/consents");
  const accessLog = useApi("/patients/me/access-log?page_size=25");
  const doctorsList = useApi("/directory/doctors");

  // Local state
  const [activeTab, setActiveTab] = useState<"consents" | "audit">("consents");
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedScope, setSelectedScope] = useState<string[]>(["documents", "observations"]);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [grantBusy, setGrantBusy] = useState(false);

  // Revoke confirmation modal state
  const [revokeTarget, setRevokeTarget] = useState<any | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);

  // Metrics
  const activeConsents = useMemo(() => {
    return (consents.data?.items || []).filter((c: any) => !c.revoked_at);
  }, [consents.data]);

  const revokedConsents = useMemo(() => {
    return (consents.data?.items || []).filter((c: any) => Boolean(c.revoked_at));
  }, [consents.data]);

  // Grant Consent Handler
  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      addToast("error", "Doctor Required", "Please choose a doctor to grant access.");
      return;
    }

    setGrantBusy(true);
    try {
      await api("/consents", {
        body: {
          consent_type: "doctor_share",
          grantee_id: selectedDoctorId,
          scope: { resources: selectedScope },
          expires_in_days: expiresInDays,
        },
      });
      consents.reload();
      accessLog.reload();
      addToast("success", "Consent Granted", "Doctor can now securely review your designated records.");
      setGrantModalOpen(false);
      setSelectedDoctorId("");
    } catch (e: any) {
      addToast("error", "Consent Grant Failed", e.message);
    } finally {
      setGrantBusy(false);
    }
  };

  // Revoke Consent Handler
  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    setRevokeBusy(true);
    try {
      await api(`/consents/${revokeTarget.id}/revoke`, { method: "POST" });
      consents.reload();
      accessLog.reload();
      addToast("success", "Consent Revoked", "Access has been immediately terminated.");
      setRevokeTarget(null);
    } catch (e: any) {
      addToast("error", "Revocation Failed", e.message);
    } finally {
      setRevokeBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("consent.title") || "Consent & Record Sharing"}
        subtitle="You stay in full control. Grant, inspect, or revoke access to your medical reports at any time with complete auditability."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings & Consent", href: "/consent" },
        ]}
        actions={
          <Button size="sm" icon={Plus} onClick={() => setGrantModalOpen(true)}>
            Grant Doctor Access
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={ShieldCheck}
          label="Active Grants"
          value={activeConsents.length}
          accent={activeConsents.length > 0}
          trend="neutral"
          trendLabel="Authorized providers"
        />
        <StatTile
          icon={Trash2}
          label="Revoked Grants"
          value={revokedConsents.length}
          trend="neutral"
          trendLabel="Terminated access"
        />
        <StatTile
          icon={History}
          label="Access Events"
          value={accessLog.data?.items?.length ?? "—"}
          trend="neutral"
          trendLabel="Audit trail events"
        />
        <StatTile
          icon={Lock}
          label="Privacy Standard"
          value="Scoped"
          trend="up"
          trendLabel="Time-bound tokens"
        />
      </div>

      {/* Consent Principles Banner */}
      <GlassCard className="border-primary/30 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-ptext shrink-0 mt-0.5" />
        <div className="text-xs text-muted leading-relaxed">
          <p className="font-semibold text-ink text-sm">Patient Data Sovereignty Principles</p>
          <p className="mt-0.5">
            Doctors can only see observations and reports for which you explicitly have an active consent grant.
            Every read or download is logged into an immutable audit trail. When you click <b>Revoke</b>, access stops immediately.
          </p>
        </div>
      </GlassCard>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between">
        <TabGroup
          tabs={[
            { key: "consents", label: "Active & Historical Consents", count: consents.data?.items?.length },
            { key: "audit", label: "Access Audit Log", count: accessLog.data?.items?.length },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* TAB 1: Consents Table & Cards */}
      {activeTab === "consents" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-ptext" />
              <span>Record Sharing Authorizations</span>
            </h2>
            <Button
              size="xs"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => consents.reload()}
            >
              Refresh
            </Button>
          </div>

          <Async
            loading={consents.loading && !consents.data}
            error={consents.error}
            onRetry={consents.reload}
            empty={consents.data?.items?.length === 0}
            emptyNode={
              <EmptyState
                icon={ShieldCheck}
                title="No active doctor shares"
                body="You have not granted record access to any doctors. When booking care, you can choose to share your reports."
                action={
                  <Button size="sm" onClick={() => setGrantModalOpen(true)}>
                    Grant New Access
                  </Button>
                }
              />
            }
            skeleton="table"
          >
            <Table>
              <thead>
                <tr>
                  <th>Consent Type</th>
                  <th>Authorized Scope</th>
                  <th>Granted On</th>
                  <th>Expires On</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {consents.data?.items?.map((c: any) => {
                  const isRevoked = Boolean(c.revoked_at);
                  const resources = c.scope?.resources || ["All medical records"];

                  return (
                    <tr key={c.id} className="hover:bg-s2/40 transition">
                      <td className="font-bold text-ink">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 text-ptext shrink-0" />
                          <span className="capitalize">{c.consent_type?.replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="text-xs text-muted">
                        <span className="rounded bg-s2 border border-line px-2 py-0.5 font-mono">
                          {resources.join(", ")}
                        </span>
                      </td>
                      <td className="num text-xs text-muted">{fmtDate(c.granted_at)}</td>
                      <td className="num text-xs text-muted">
                        {c.expires_at ? fmtDate(c.expires_at) : "No expiry"}
                      </td>
                      <td>
                        {isRevoked ? (
                          <Chip kind="unverified">Revoked</Chip>
                        ) : (
                          <Chip kind="verified">Active</Chip>
                        )}
                      </td>
                      <td className="text-right">
                        {isRevoked ? (
                          <span className="text-xs text-muted font-mono">Terminated</span>
                        ) : (
                          <Button
                            size="xs"
                            variant="secondary"
                            className="text-danger hover:bg-danger/10"
                            onClick={() => setRevokeTarget(c)}
                          >
                            Revoke Access
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

      {/* TAB 2: Access Log Audit Trail */}
      {activeTab === "audit" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <History className="h-4 w-4 text-ptext" />
                <span>Immutable Access Audit Log</span>
              </h2>
              <p className="text-[11px] text-muted">Real-time log of every attempt to access your health data</p>
            </div>
            <Button
              size="xs"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => accessLog.reload()}
            >
              Refresh Log
            </Button>
          </div>

          <Async
            loading={accessLog.loading && !accessLog.data}
            error={accessLog.error}
            onRetry={accessLog.reload}
            empty={accessLog.data?.items?.length === 0}
            emptyNode={
              <EmptyState
                icon={History}
                title="No external access events"
                body="Your records have not been accessed by any external doctors or facilities."
              />
            }
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
                </tr>
              </thead>
              <tbody>
                {accessLog.data?.items?.map((l: any) => {
                  const isDenied = l.result === "deny";
                  return (
                    <tr key={l.id} className="hover:bg-s2/40 transition">
                      <td className="num text-xs text-muted whitespace-nowrap">
                        {fmtDateTime(l.at)}
                      </td>
                      <td className="font-semibold text-xs text-ink capitalize">
                        {l.actor_role}
                      </td>
                      <td className="text-xs font-mono text-muted">{l.action}</td>
                      <td className="text-xs text-muted">{l.resource_type || "documents"}</td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs font-bold ${
                            isDenied ? "text-warn" : "text-ptext"
                          }`}
                        >
                          {isDenied ? "✕ Denied" : "✓ Allowed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Async>
        </Card>
      )}

      {/* Grant Consent Modal */}
      <Dialog
        open={grantModalOpen}
        title="Authorize Doctor to View Reports"
        onClose={() => setGrantModalOpen(false)}
      >
        <form onSubmit={handleGrantSubmit} className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
              Choose Doctor *
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              required
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <option value="">Select a registered doctor...</option>
              {doctorsList.data?.items?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
              Scope of Access
            </label>
            <div className="space-y-2 rounded-input border border-line bg-s2/40 p-3">
              {[
                ["documents", "Medical PDF/Scan Documents"],
                ["observations", "Laboratory Observations & Trend Values"],
                ["notes", "Doctor Consultation Notes"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedScope.includes(key)}
                    onChange={(e) =>
                      setSelectedScope((prev) =>
                        e.target.checked ? [...prev, key] : prev.filter((k) => k !== key)
                      )
                    }
                    className="h-4 w-4 rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
              Access Duration
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <option value={7}>7 Days (Recommended for acute care)</option>
              <option value={30}>30 Days (Standard consultation)</option>
              <option value={90}>90 Days (Chronic care follow-up)</option>
              <option value={365}>1 Year (Long-term specialist)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGrantModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={grantBusy}>
              Grant Access
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Revoke Consent Confirmation Dialog */}
      <Dialog
        open={Boolean(revokeTarget)}
        title="Revoke Record Access?"
        onClose={() => setRevokeTarget(null)}
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-card border border-danger/40 bg-danger/10 p-3.5 text-danger">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-sm">Immediate Access Termination</p>
              <p className="mt-1 leading-relaxed">
                Revoking this consent immediately blocks the doctor from reading your observations and reports.
                This action is audited and cannot be undone.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted">
            Consent ID: <span className="font-mono text-ink">{revokeTarget?.id}</span>
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRevokeTarget(null)}
              disabled={revokeBusy}
            >
              Keep Access
            </Button>
            <Button
              variant="danger"
              size="sm"
              busy={revokeBusy}
              onClick={handleRevokeConfirm}
            >
              Yes, Revoke Access
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
