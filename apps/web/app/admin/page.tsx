"use client";
import { useState } from "react";
import { Building2, CalendarClock, Database, Download, FlaskConical, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { api, getRole, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, Chip, EmptyState, fmtDateTime, GlassCard, Input, PageHeader, SkeletonTable, StatTile, TabGroup, useToast } from "@/components/ui";
import Link from "next/link";

type Tab = "queue" | "users" | "audit" | "quality";

export default function Admin() {
  useGuard(["super_admin", "reviewer"]);
  const { t } = useI18n();
  const { addToast } = useToast();
  const isSuper = getRole() === "super_admin";
  const [tab, setTab] = useState<Tab>("queue");
  const ov = useApi("/admin/overview");
  const sys = useApi("/admin/system");
  const q = useApi("/admin/verification-queue");
  const dq = useApi("/admin/directory-quality");
  const au = useApi(tab === "audit" && isSuper ? "/admin/audit-logs" : null);
  const us = useApi(tab === "users" && isSuper ? "/admin/users" : null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");

  const decide = async (kind: "doctors" | "facilities", id: string, decision: string) => {
    try {
      await api(`/admin/${kind}/${id}/verify`, { method: "PATCH", body: { decision, reason, evidence: evidence ? [evidence] : [] } });
      q.reload(); ov.reload();
      addToast("success", `${decision === "approve" ? "Approved" : "Rejected"} successfully`);
    } catch (e: any) {
      addToast("error", "Action failed", e.message);
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api(`/admin/users/${id}/status`, { method: "PATCH", body: { status, reason: reason || "admin action" } });
      us.reload();
      addToast("success", `User ${status === "active" ? "reactivated" : "suspended"}`);
    } catch (e: any) {
      addToast("error", "Failed to update user", e.message);
    }
  };

  const exportCsv = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const r = await fetch(base + "/admin/audit-logs/export", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!r.ok) throw new Error("Export failed");
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a"); a.href = url; a.download = "audit_logs.csv"; a.click();
      URL.revokeObjectURL(url);
      addToast("success", "Export downloaded");
    } catch (e: any) {
      addToast("error", "Export failed", e.message);
    }
  };

  const tabItems: { key: Tab; label: string }[] = [
    { key: "queue", label: t("adm.queue") },
    ...(isSuper ? ([{ key: "users" as Tab, label: t("adm.users") }, { key: "audit" as Tab, label: t("adm.audit") }]) : []),
    { key: "quality", label: t("adm.quality") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t("adm.title")} />
        <Link href="/ml-lab">
          <Button variant="secondary" size="sm">
            <FlaskConical className="h-4 w-4" aria-hidden />{t("nav.mllab")}
          </Button>
        </Link>
      </div>

      {/* Overview stats */}
      <Async loading={ov.loading} error={ov.error} onRetry={ov.reload}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={Users} label={t("adm.users")} value={ov.data?.users ?? "—"} />
          <StatTile icon={Stethoscope} label="Doctors" value={ov.data?.doctors ?? "—"} />
          <StatTile icon={Building2} label="Facilities" value={ov.data?.facilities ?? "—"} />
          <StatTile icon={CalendarClock} label={t("nav.appointments")} value={ov.data?.appointments ?? "—"} />
        </div>
      </Async>

      {/* System health */}
      <GlassCard className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-2 font-medium"><Database className="h-4 w-4 text-ptext" aria-hidden />{t("adm.health")}</span>
        <span className="flex items-center gap-2">
          {t("adm.database")}:
          {sys.loading ? <div className="skeleton h-4 w-12 rounded" /> : <Chip kind={sys.data?.database === "ok" ? "verified" : "failed"}>{sys.data?.database ?? "…"}</Chip>}
        </span>
        <span className="flex items-center gap-2 text-muted">
          {t("adm.ai")}: <b className="text-ink">{sys.data?.ai_provider ?? "…"}</b>
        </span>
        <span className="ml-auto text-xs text-muted">env: {sys.data?.env}</span>
      </GlassCard>

      {/* Tabs */}
      <TabGroup tabs={tabItems} active={tab} onChange={setTab} />

      {/* Verification Queue */}
      {tab === "queue" && (
        <div className="space-y-4">
          <Card className="grid gap-3 md:grid-cols-2">
            <Input label={t("adm.reason")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="State the reason for this decision…" />
            <Input label={t("adm.evidence")} value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Medical council reference, website URL…" />
          </Card>
          <Async loading={q.loading} error={q.error} onRetry={q.reload}
            empty={!q.data?.doctors?.length && !q.data?.facilities?.length}
            emptyNode={<EmptyState icon={ShieldCheck} title={t("adm.noQueue")} body="All verification requests have been processed." />}>
            {(["doctors", "facilities"] as const).map((kind) => (
              <div key={kind} className="space-y-2">
                {(q.data?.[kind] || []).slice(0, 25).map((x: any) => (
                  <Card key={x.id} className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-medium">{x.name}</span>
                      <Chip kind={x.verification === "pending" ? "pending" : "unverified"} />
                      {x.is_sample && <Chip kind="info">Sample</Chip>}
                      {x.specialty && <span className="text-sm text-muted">{x.specialty}</span>}
                    </div>
                    <span className="flex gap-2">
                      <Button size="sm" disabled={!reason || !evidence} onClick={() => decide(kind, x.id, "approve")}>{t("adm.approve")}</Button>
                      <Button size="sm" variant="secondary" disabled={!reason} onClick={() => decide(kind, x.id, "reject")}>{t("adm.reject")}</Button>
                    </span>
                  </Card>
                ))}
              </div>
            ))}
          </Async>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="space-y-4">
          <Card className="grid gap-3 md:grid-cols-2">
            <Input label={t("adm.reason")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for status change…" />
          </Card>
          <Async loading={us.loading} error={us.error} onRetry={us.reload} empty={us.data?.items?.length === 0} skeleton="table">
            <Card className="overflow-x-auto p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {us.data?.items?.map((u: any) => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.email}</td>
                      <td className="text-muted capitalize">{u.role}</td>
                      <td><Chip kind={u.status === "active" ? "verified" : "failed"}>{u.status}</Chip></td>
                      <td className="text-right">
                        {u.status === "suspended"
                          ? <Button size="sm" variant="secondary" onClick={() => setStatus(u.id, "active")}>{t("adm.reactivate")}</Button>
                          : <Button size="sm" variant="secondary" disabled={!reason} onClick={() => setStatus(u.id, "suspended")}>{t("adm.suspend")}</Button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Async>
        </div>
      )}

      {/* Audit Logs */}
      {tab === "audit" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" aria-hidden />{t("adm.export")}
            </Button>
          </div>
          <Async loading={au.loading} error={au.error} onRetry={au.reload} empty={au.data?.items?.length === 0} skeleton="table">
            <Card className="overflow-x-auto p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Result</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {au.data?.items?.map((l: any) => (
                    <tr key={l.id}>
                      <td className="num text-xs text-muted whitespace-nowrap">{fmtDateTime(l.at)}</td>
                      <td className="capitalize text-muted">{l.actor_role}</td>
                      <td className="font-medium">{l.action}</td>
                      <td><span className={l.result === "deny" ? "text-warn font-medium" : "text-muted"}>{l.result}</span></td>
                      <td className="text-muted text-xs max-w-[200px] truncate">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Async>
        </div>
      )}

      {/* Directory Quality */}
      {tab === "quality" && (
        <Async loading={dq.loading} error={dq.error} onRetry={dq.reload}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <StatTile label={`Stale doctors (>${dq.data?.stale_after_days}d)`} value={dq.data?.stale_doctors?.length ?? "—"} />
            <StatTile label="Stale facilities" value={dq.data?.stale_facilities?.length ?? "—"} />
            <StatTile label="Possible duplicates" value={dq.data?.possible_duplicates?.length ?? "—"} />
            <StatTile label="Open reports" value={dq.data?.open_reports ?? "—"} />
          </div>
        </Async>
      )}
    </div>
  );
}
