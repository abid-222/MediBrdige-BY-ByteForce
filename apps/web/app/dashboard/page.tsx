"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bell, CalendarClock, Compass, FileText, ShieldCheck, UploadCloud, Activity } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, Chip, EmptyState, fmtDate, fmtDateTime, PageHeader, StatTile } from "@/components/ui";

export default function Dashboard() {
  useGuard(["patient"]);
  const { t } = useI18n(); const router = useRouter();
  const dash = useApi("/patients/me/dashboard");
  const docs = useApi("/documents"); const consents = useApi("/consents"); const appts = useApi("/appointments");
  const notes = useApi("/notifications"); const log = useApi("/patients/me/access-log?page_size=5");
  useEffect(() => { if (dash.error?.toLowerCase().includes("onboarding")) router.replace("/onboarding"); }, [dash.error, router]);
  const activeShares = consents.data?.items.filter((c: any) => !c.revoked_at && c.consent_type === "doctor_share").length;
  const upcoming = appts.data?.items.filter((a: any) => ["requested", "confirmed", "rescheduled"].includes(a.status));
  return (
    <Async loading={dash.loading} error={dash.error} onRetry={dash.reload} h={240}>
      {dash.data && <>
        <PageHeader title={`${t("dash.greeting")}, ${dash.data.greeting_name || ""}`} subtitle={t("tagline")}
          actions={<><Link href="/reports"><Button><UploadCloud className="h-4 w-4" aria-hidden />{t("dash.upload")}</Button></Link><Link href="/navigator"><Button variant="secondary"><Compass className="h-4 w-4" aria-hidden />{t("dash.findCare")}</Button></Link></>} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={FileText} label={t("dash.reportsCount")} value={docs.data?.items.length ?? "—"} />
          <StatTile icon={Activity} label={t("dash.valuesCount")} value={docs.data ? docs.data.items.reduce((n: number, d: any) => n + d.total_values, 0) : "—"} />
          <StatTile icon={CalendarClock} label={t("dash.apptsCount")} value={upcoming?.length ?? "—"} />
          <StatTile icon={ShieldCheck} label={t("dash.sharesCount")} value={activeShares ?? "—"} />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="mb-3 text-lg">{t("dash.overview")}</h2>
            {dash.data.snapshot.length === 0 ? <EmptyState icon={FileText} title={t("dash.noReport")} action={<Link href="/reports"><Button variant="secondary">{t("dash.upload")}</Button></Link>} /> :
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{dash.data.snapshot.map((s: any, i: number) => (
                <div key={i} className="rounded-input border border-line p-3">
                  <div className="text-xs text-muted">{s.test_code} · {fmtDate(s.observed_on)}</div>
                  <div className="num text-xl font-semibold">{s.value} <span className="text-sm font-normal text-muted">{s.unit || ""}</span></div>
                  <div className="mt-1 flex flex-wrap gap-1">{s.low_confidence && <Chip kind="low" />}{s.status === "doctor_verified" ? <Chip kind="doctor" /> : <Chip kind="unverified" />}</div>
                </div>))}</div>}
            <p className="mt-3 text-xs text-muted">{t("rep.unverifiedNote")}</p>
          </Card>
          <Card>
            <h2 className="mb-3 text-lg">{t("dash.nextAppt")}</h2>
            {dash.data.next_appointment ? <div><p className="num font-medium">{fmtDateTime(dash.data.next_appointment.slot_start)}</p><p className="text-sm text-muted">{dash.data.next_appointment.status}</p><Link href="/appointments" className="btn-link mt-2 text-ptext">{t("common.view")} →</Link></div>
              : <EmptyState icon={CalendarClock} title={t("dash.noAppt")} action={<Link href="/directory" className="btn-link text-ptext">{t("nav.directory")} →</Link>} />}
          </Card>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-lg"><Bell className="h-4 w-4" aria-hidden />{t("dash.notifications")}</h2>
            {notes.data?.items.length ? <ul className="space-y-2 text-sm">{notes.data.items.slice(0, 5).map((n: any) => <li key={n.id} className="flex justify-between gap-2"><span className={n.read_at ? "text-muted" : "font-medium"}>{n.template.replaceAll("_", " ")}</span><span className="num text-xs text-muted">{fmtDate(n.sent_at)}</span></li>)}</ul> : <p className="text-sm text-muted">{t("dash.noNotifications")}</p>}
          </Card>
          <Card>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-lg">{t("dash.recentActivity")}</h2><Link href="/consent" className="btn-link text-sm text-ptext">{t("nav.consent")} →</Link></div>
            {log.data?.items.length ? <ul className="space-y-2 text-sm">{log.data.items.map((l: any) => <li key={l.id} className="flex justify-between gap-2"><span>{l.actor_role} · {l.action}</span><span className={l.result === "deny" ? "text-warn" : "text-ptext"}>{l.result}</span></li>)}</ul> : <p className="text-sm text-muted">{t("dash.noActivity")}</p>}
          </Card>
        </div>
      </>}
    </Async>
  );
}
