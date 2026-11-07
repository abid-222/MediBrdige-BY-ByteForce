"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Activity, Bell, CalendarClock, Compass, FileText, ShieldCheck, TrendingUp, UploadCloud, User } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, Chip, EmptyState, fmtDate, fmtDateTime, GlassCard, PageHeader, SkeletonCard, StatTile } from "@/components/ui";

function GreetingHeader({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <div className="slide-up">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-psoft to-s2 border border-primary/20 text-ptext">
          <User className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="text-sm text-muted">{greeting}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        </div>
      </div>
    </div>
  );
}

function HealthSnapshotCard({ items }: { items: any[] }) {
  if (!items.length) return (
    <EmptyState
      icon={FileText}
      title="Upload your first report"
      body="Your health values and trends will appear here."
      action={<Link href="/reports"><Button variant="secondary" size="sm">Upload report</Button></Link>}
    />
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s: any, i: number) => (
        <div key={i} className="rounded-input border border-line bg-s2 p-3 hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted uppercase tracking-wide">{s.test_code}</span>
            <div className="flex gap-1">
              {s.low_confidence && <Chip kind="low" />}
              {s.status === "doctor_verified" ? <Chip kind="doctor" /> : <Chip kind="unverified" />}
            </div>
          </div>
          <div className="num text-2xl font-bold">
            {s.value}
            <span className="ml-1 text-sm font-normal text-muted">{s.unit || ""}</span>
          </div>
          <div className="mt-1 text-xs text-muted">{fmtDate(s.observed_on)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  useGuard(["patient"]);
  const { t } = useI18n();
  const router = useRouter();
  const dash = useApi("/patients/me/dashboard");
  const docs = useApi("/documents");
  const consents = useApi("/consents");
  const appts = useApi("/appointments");
  const notes = useApi("/notifications");
  const log = useApi("/patients/me/access-log?page_size=5");

  useEffect(() => {
    if (dash.error?.toLowerCase().includes("onboarding")) router.replace("/onboarding");
  }, [dash.error, router]);

  const activeShares = consents.data?.items.filter((c: any) => !c.revoked_at && c.consent_type === "doctor_share").length ?? 0;
  const upcoming = useMemo(() => appts.data?.items.filter((a: any) => ["requested", "confirmed", "rescheduled"].includes(a.status)) ?? [], [appts.data]);
  const totalValues = docs.data ? docs.data.items.reduce((n: number, d: any) => n + d.total_values, 0) : null;
  const unreadNotes = notes.data?.items.filter((n: any) => !n.read_at).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      {dash.loading ? (
        <div className="flex items-center gap-3">
          <div className="skeleton skeleton-circle h-12 w-12" />
          <div className="space-y-1"><div className="skeleton h-3 w-24 rounded" /><div className="skeleton h-6 w-40 rounded" /></div>
        </div>
      ) : dash.data ? (
        <GreetingHeader name={dash.data.greeting_name || "there"} />
      ) : null}

      {/* Quick action strip */}
      <div className="flex flex-wrap gap-2">
        <Link href="/reports"><Button><UploadCloud className="h-4 w-4" aria-hidden />{t("dash.upload")}</Button></Link>
        <Link href="/navigator"><Button variant="secondary"><Compass className="h-4 w-4" aria-hidden />{t("dash.findCare")}</Button></Link>
        <Link href="/appointments"><Button variant="secondary"><CalendarClock className="h-4 w-4" aria-hidden />{t("nav.appointments")}</Button></Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {docs.loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton rounded-card" style={{ height: 88 }} />)
        ) : (
          <>
            <StatTile icon={FileText} label={t("dash.reportsCount")} value={docs.data?.items.length ?? "—"} accent />
            <StatTile icon={Activity} label={t("dash.valuesCount")} value={totalValues ?? "—"} />
            <StatTile icon={CalendarClock} label={t("dash.apptsCount")} value={upcoming.length} />
            <StatTile icon={ShieldCheck} label={t("dash.sharesCount")} value={activeShares} />
          </>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Health snapshot */}
        <Card className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-ptext" aria-hidden />{t("dash.overview")}</h2>
            {!dash.loading && dash.data?.snapshot?.length > 0 && (
              <Link href="/timeline" className="text-sm text-ptext hover:underline">{t("nav.timeline")} →</Link>
            )}
          </div>
          <Async loading={dash.loading} error={dash.error} onRetry={dash.reload} h={160}>
            {dash.data && <HealthSnapshotCard items={dash.data.snapshot || []} />}
          </Async>
          <p className="text-xs text-muted">{t("rep.unverifiedNote")}</p>
        </Card>

        {/* Next appointment */}
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg"><CalendarClock className="h-5 w-5 text-ptext" aria-hidden />{t("dash.nextAppt")}</h2>
          <Async loading={appts.loading} error={appts.error} onRetry={appts.reload} h={120}>
            {appts.data && (dash.data?.next_appointment ? (
              <div className="space-y-2">
                <div className="rounded-input border border-line bg-s2 p-3">
                  <p className="num font-semibold text-ptext">{fmtDateTime(dash.data.next_appointment.slot_start)}</p>
                  <p className="mt-1 text-sm text-muted capitalize">{dash.data.next_appointment.status}</p>
                </div>
                <Link href="/appointments" className="btn-link text-sm text-ptext">{t("common.view")} →</Link>
              </div>
            ) : (
              <EmptyState icon={CalendarClock} title={t("dash.noAppt")}
                action={<Link href="/directory" className="btn-link text-ptext text-sm">{t("nav.directory")} →</Link>}
              />
            ))}
          </Async>
        </Card>
      </div>

      {/* Notifications & Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-ptext" aria-hidden />
            <h2 className="text-lg">{t("dash.notifications")}</h2>
            {unreadNotes > 0 && (
              <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-pill bg-primary px-1 text-[10px] font-bold text-onprimary">
                {unreadNotes}
              </span>
            )}
          </div>
          <Async loading={notes.loading} error={notes.error} onRetry={notes.reload} h={120}>
            {notes.data?.items?.length ? (
              <ul className="space-y-2 text-sm divide-y divide-line">
                {notes.data.items.slice(0, 5).map((n: any) => (
                  <li key={n.id} className="flex items-start justify-between gap-2 pt-2 first:pt-0">
                    <div className="flex items-start gap-2">
                      {!n.read_at && <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      <span className={n.read_at ? "text-muted" : "font-medium"}>{n.template?.replaceAll("_", " ")}</span>
                    </div>
                    <span className="num flex-shrink-0 text-xs text-muted">{fmtDate(n.sent_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">{t("dash.noNotifications")}</p>}
          </Async>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg"><ShieldCheck className="h-4 w-4 text-ptext" aria-hidden />{t("dash.recentActivity")}</h2>
            <Link href="/consent" className="btn-link text-sm text-ptext">{t("nav.consent")} →</Link>
          </div>
          <Async loading={log.loading} error={log.error} onRetry={log.reload} h={120}>
            {log.data?.items?.length ? (
              <ul className="space-y-2 text-sm divide-y divide-line">
                {log.data.items.map((l: any) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 pt-2 first:pt-0">
                    <span className="text-muted"><span className="text-ink font-medium capitalize">{l.actor_role}</span> · {l.action}</span>
                    <span className={`text-xs font-medium ${l.result === "deny" ? "text-warn" : "text-ptext"}`}>{l.result}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">{t("dash.noActivity")}</p>}
          </Async>
        </Card>
      </div>
    </div>
  );
}
