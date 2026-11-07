"use client";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { ShieldCheck } from "lucide-react";
import { Async, Button, Card, Chip, EmptyState, fmtDate, PageHeader } from "@/components/ui";

export default function Consent() {
  useGuard(["patient"]);
  const { t } = useI18n();
  const c = useApi("/consents"); const log = useApi("/patients/me/access-log");
  const revoke = async (id: string) => { await api(`/consents/${id}/revoke`, { method: "POST" }); c.reload(); log.reload(); };
  return (
    <>
      <PageHeader title={t("consent.title")} subtitle={t("onb.consent.doctor_share")} />
      <Async loading={c.loading} error={c.error} onRetry={c.reload} empty={c.data?.items.length === 0} emptyNode={<EmptyState icon={ShieldCheck} title={t("common.empty")} />}>
        <div className="space-y-2">{c.data?.items.map((x: any) => (
          <Card key={x.id} className="flex flex-wrap items-center justify-between gap-2">
            <div><p>{x.consent_type}{x.scope?.resources && <span className="text-sm text-muted"> · {x.scope.resources.join(", ")}</span>}</p>
              <p className="num text-xs text-muted">{fmtDate(x.granted_at)}{x.expires_at && ` · ${t("consent.expires")} ${fmtDate(x.expires_at)}`}</p></div>
            {x.revoked_at ? <Chip kind="unverified">{t("consent.revoked")}</Chip> : <Button variant="secondary" onClick={() => revoke(x.id)}>{t("common.revoke")}</Button>}
          </Card>))}</div>
      </Async>
      <h2 className="text-xl">{t("consent.accessLog")}</h2>
      <Async loading={log.loading} error={log.error} onRetry={log.reload} empty={log.data?.items.length === 0}>
        <Card><ul className="space-y-1 text-sm">{log.data?.items.map((l: any) => <li key={l.id} className="flex flex-wrap gap-2"><span className="num text-muted">{fmtDate(l.at)}</span><span>{l.actor_role}</span><span>{l.action}</span><span className={l.result === "deny" ? "text-warn" : "text-ptext"}>{l.result === "deny" ? "✕ denied" : "✓"}</span></li>)}</ul></Card>
      </Async>
    </>
  );
}
