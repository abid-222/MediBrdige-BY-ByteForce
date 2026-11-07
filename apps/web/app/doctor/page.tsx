"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Clock, ClipboardCheck, FileSearch, Search, Users, XCircle } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Badge, Card, Chip, EmptyState, fmtDateTime, GlassCard, PageHeader, StatTile } from "@/components/ui";
import { dhakaDay, todayDhaka } from "@/lib/format";

const STATUS_ICON: Record<string, any> = {
  confirmed: <CheckCircle2 className="h-4 w-4 text-ptext" />,
  requested: <Clock className="h-4 w-4 text-warn" />,
  cancelled: <XCircle className="h-4 w-4 text-danger" />,
};

function AppointmentRow({ a }: { a: any }) {
  const confirmed = a.status === "confirmed";
  return (
    <div className={`flex items-center justify-between gap-3 rounded-input p-3 border ${confirmed ? "border-primary/20 bg-psoft/10" : "border-line bg-s2"}`}>
      <div className="flex items-center gap-2 min-w-0">
        {STATUS_ICON[a.status] ?? <Clock className="h-4 w-4 text-muted" />}
        <span className="num text-sm font-medium">{fmtDateTime(a.slot_start)}</span>
      </div>
      <Chip kind={a.status === "confirmed" ? "verified" : a.status === "cancelled" ? "failed" : "pending"}>{a.status}</Chip>
    </div>
  );
}

export default function DoctorHome() {
  useGuard(["doctor"]);
  const { t } = useI18n();
  const d = useApi("/doctor/dashboard");
  const p = useApi("/doctor/patients");
  const me = useApi("/auth/me");
  const [q, setQ] = useState("");

  const today = todayDhaka();
  const todays = useMemo(() => (d.data?.appointments || []).filter((a: any) => dhakaDay(a.slot_start) === today), [d.data, today]);
  const later = useMemo(() => (d.data?.appointments || []).filter((a: any) => (dhakaDay(a.slot_start) ?? "") > today), [d.data, today]);
  const patients = (p.data?.items || []).filter((x: any) => !q || (x.name || "").toLowerCase().includes(q.toLowerCase()));

  const isActive = me.data?.status === "active";

  return (
    <div className="space-y-6">
      <PageHeader title={t("doc.title")} subtitle={!isActive ? t("auth.pending") : undefined} />

      {/* Pending verification banner */}
      {!me.loading && !isActive && (
        <GlassCard className="border-warn/30 flex items-start gap-3">
          <Clock className="h-5 w-5 text-warn mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-warn text-sm">Account pending approval</p>
            <p className="text-xs text-muted mt-0.5">{t("auth.pending")} Your profile is visible in the directory once approved.</p>
          </div>
        </GlassCard>
      )}

      {/* Stats */}
      <Async loading={d.loading} error={d.error} onRetry={d.reload}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={CalendarClock} label={t("doc.todayAppts")} value={todays.length} accent={todays.length > 0} />
          <StatTile icon={ClipboardCheck} label={t("doc.upcoming")} value={later.length} />
          <StatTile icon={FileSearch} label={t("doc.pending")} value={d.data?.pending_review_count ?? "—"} />
          <StatTile icon={Users} label={t("doc.patients")} value={p.data?.items?.length ?? "—"} />
        </div>
      </Async>

      {/* Today's & upcoming appointments */}
      <Async loading={d.loading} error={d.error} onRetry={d.reload}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarClock className="h-5 w-5 text-ptext" aria-hidden />{t("doc.todayAppts")}
              {todays.length > 0 && <Badge count={todays.length} />}
            </h2>
            {todays.length === 0
              ? <p className="text-sm text-muted py-4 text-center">{t("doc.noToday")}</p>
              : <div className="space-y-2">{todays.map((a: any) => <AppointmentRow key={a.id} a={a} />)}</div>}
          </Card>

          <Card className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardCheck className="h-5 w-5 text-ptext" aria-hidden />{t("doc.upcoming")}
            </h2>
            {later.length === 0
              ? <p className="text-sm text-muted py-4 text-center">{t("common.empty")}</p>
              : <div className="space-y-2">{later.slice(0, 6).map((a: any) => <AppointmentRow key={a.id} a={a} />)}</div>}
          </Card>
        </div>
      </Async>

      {/* Patient list */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("doc.patients")}</h2>
          <label className="flex items-center gap-2 rounded-input border border-line bg-s2 px-3 py-1 text-sm">
            <Search className="h-4 w-4 text-muted" aria-hidden />
            <input
              aria-label={t("doc.search")}
              placeholder={t("doc.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="min-h-[32px] bg-transparent text-sm outline-none w-40"
            />
          </label>
        </div>
        <Async loading={p.loading} error={p.error} onRetry={p.reload}
          empty={p.data?.items?.length === 0}
          emptyNode={<EmptyState icon={Users} title={t("common.empty")} body="Patients who share their records with you appear here." />}
          skeleton="table">
          {patients.length === 0
            ? <p className="text-sm text-muted py-4 text-center">{t("common.noResults")}</p>
            : (
              <div className="divide-y divide-line">
                {patients.map((x: any) => (
                  <div key={x.patient_id} className="flex min-h-[48px] items-center justify-between gap-2 py-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-s2 text-xs font-semibold text-muted">
                        {(x.name || "?")[0].toUpperCase()}
                      </span>
                      <span className="font-medium">{x.name}</span>
                    </div>
                    {x.access
                      ? <Link href={`/doctor/patients/${x.patient_id}`} className="btn-link text-sm text-ptext font-medium">{t("common.view")} →</Link>
                      : <Chip kind="unverified">{t("doc.noAccess")}</Chip>}
                  </div>
                ))}
              </div>
            )}
        </Async>
      </Card>
    </div>
  );
}
