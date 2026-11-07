"use client";
import { useState } from "react";
import { Building2, CalendarClock, Database, FileText, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { api, getRole, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, Chip, EmptyState, fmtDateTime, Input, PageHeader, StatTile } from "@/components/ui";

type Tab = "queue" | "users" | "audit" | "quality";
export default function Admin() {
  useGuard(["super_admin", "reviewer"]);
  const { t } = useI18n();
  const isSuper = getRole() === "super_admin";
  const [tab, setTab] = useState<Tab>("queue");
  const ov = useApi("/admin/overview"); const sys = useApi("/admin/system"); const q = useApi("/admin/verification-queue"); const dq = useApi("/admin/directory-quality");
  const au = useApi(tab === "audit" && isSuper ? "/admin/audit-logs" : null); const us = useApi(tab === "users" && isSuper ? "/admin/users" : null);
  const [reason, setReason] = useState(""); const [evidence, setEvidence] = useState(""); const [err, setErr] = useState("");
  const run = async (fn: () => Promise<unknown>, after: () => void) => { setErr(""); try { await fn(); after(); } catch (e: any) { setErr(e.message); } };
  const decide = (kind: "doctors" | "facilities", id: string, decision: string) =>
    run(() => api(`/admin/${kind}/${id}/verify`, { method: "PATCH", body: { decision, reason, evidence: evidence ? [evidence] : [] } }), () => { q.reload(); ov.reload(); });
  const setStatus = (id: string, status: string) => run(() => api(`/admin/users/${id}/status`, { method: "PATCH", body: { status, reason: reason || "admin action" } }), us.reload);
  const exportCsv = async () => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const r = await fetch(base + "/admin/audit-logs/export", { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!r.ok) return setErr("Export failed");
    const url = URL.createObjectURL(await r.blob()); const a = document.createElement("a"); a.href = url; a.download = "audit_logs.csv"; a.click(); URL.revokeObjectURL(url);
  };
  const tabs: [Tab, string][] = [["queue", "adm.queue"], ...(isSuper ? ([["users", "adm.users"], ["audit", "adm.audit"]] as [Tab, string][]) : []), ["quality", "adm.quality"]];
  return (
    <>
      <PageHeader title={t("adm.title")} />
      <Async loading={ov.loading} error={ov.error} onRetry={ov.reload}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={Users} label={t("adm.users")} value={ov.data?.users} /><StatTile icon={Stethoscope} label="Doctors" value={ov.data?.doctors} />
          <StatTile icon={Building2} label="Facilities" value={ov.data?.facilities} /><StatTile icon={CalendarClock} label={t("nav.appointments")} value={ov.data?.appointments} />
        </div>
      </Async>
      <Card className="flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-2 font-medium"><Database className="h-4 w-4 text-ptext" aria-hidden />{t("adm.health")}</span>
        <span>{t("adm.database")}: <Chip kind={sys.data?.database === "ok" ? "verified" : "failed"}>{sys.data?.database ?? "…"}</Chip></span>
        <span>{t("adm.ai")}: <b>{sys.data?.ai_provider ?? "…"}</b></span><span className="text-muted">env: {sys.data?.env}</span></Card>
      <div role="tablist" className="flex flex-wrap gap-2">{tabs.map(([k, label]) => <Button key={k} role="tab" aria-selected={tab === k} variant={tab === k ? "primary" : "secondary"} onClick={() => setTab(k)}>{t(label)}</Button>)}</div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {tab === "queue" && <Async loading={q.loading} error={q.error} onRetry={q.reload} empty={!q.data?.doctors.length && !q.data?.facilities.length} emptyNode={<EmptyState icon={ShieldCheck} title={t("adm.noQueue")} />}>
        <Card className="grid gap-3 md:grid-cols-2"><Input label={t("adm.reason")} value={reason} onChange={(e) => setReason(e.target.value)} /><Input label={t("adm.evidence")} value={evidence} onChange={(e) => setEvidence(e.target.value)} /></Card>
        {([["doctors", q.data?.doctors], ["facilities", q.data?.facilities]] as const).map(([kind, items]) => (
          <div key={kind} className="space-y-2">{(items || []).slice(0, 25).map((x: any) => (
            <Card key={x.id} className="flex flex-wrap items-center justify-between gap-2"><span className="flex flex-wrap items-center gap-2">{x.name} <Chip kind={x.verification === "pending" ? "pending" : "unverified"} />{x.is_sample && <Chip kind="info">Sample</Chip>}</span>
              <span className="flex gap-2"><Button disabled={!reason || !evidence} onClick={() => decide(kind, x.id, "approve")}>{t("adm.approve")}</Button><Button variant="secondary" disabled={!reason} onClick={() => decide(kind, x.id, "reject")}>{t("adm.reject")}</Button></span></Card>))}</div>))}
      </Async>}
      {tab === "users" && <Async loading={us.loading} error={us.error} onRetry={us.reload} empty={us.data?.items.length === 0}>
        <Card className="grid gap-3 md:grid-cols-2"><Input label={t("adm.reason")} value={reason} onChange={(e) => setReason(e.target.value)} /></Card>
        <Card className="overflow-x-auto"><table className="w-full text-sm"><tbody>{us.data?.items.map((u: any) => (
          <tr key={u.id} className="border-t border-line first:border-0"><td className="py-2">{u.email}</td><td className="text-muted">{u.role}</td><td><Chip kind={u.status === "active" ? "verified" : "failed"}>{u.status}</Chip></td>
            <td className="text-right">{u.status === "suspended" ? <Button variant="secondary" onClick={() => setStatus(u.id, "active")}>{t("adm.reactivate")}</Button> : <Button variant="secondary" disabled={!reason} onClick={() => setStatus(u.id, "suspended")}>{t("adm.suspend")}</Button>}</td></tr>))}</tbody></table></Card>
      </Async>}
      {tab === "audit" && <Async loading={au.loading} error={au.error} onRetry={au.reload} empty={au.data?.items.length === 0}>
        <Button variant="secondary" onClick={exportCsv}>{t("adm.export")}</Button>
        <Card className="overflow-x-auto"><table className="w-full text-xs"><tbody>{au.data?.items.map((l: any) => <tr key={l.id} className="border-t border-line"><td className="num py-1.5">{fmtDateTime(l.at)}</td><td>{l.actor_role}</td><td>{l.action}</td><td className={l.result === "deny" ? "text-warn" : ""}>{l.result}</td><td className="text-muted">{l.reason}</td></tr>)}</tbody></table></Card>
      </Async>}
      {tab === "quality" && <Async loading={dq.loading} error={dq.error} onRetry={dq.reload}>
        <Card className="space-y-1 text-sm"><p>{t("adm.stale")} (≥ <span className="num">{dq.data?.stale_after_days}</span>d): Doctors <span className="num">{dq.data?.stale_doctors.length}</span>, Facilities <span className="num">{dq.data?.stale_facilities.length}</span></p>
          <p>Duplicates: <span className="num">{dq.data?.possible_duplicates.length}</span> · Reports: <span className="num">{dq.data?.open_reports}</span></p></Card>
      </Async>}
    </>
  );
}
