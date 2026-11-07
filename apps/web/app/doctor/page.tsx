"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, ClipboardCheck, FileSearch, Search, Users } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Card, Chip, EmptyState, fmtDateTime, PageHeader, StatTile } from "@/components/ui";
import { dhakaDay, todayDhaka } from "@/lib/format";

export default function DoctorHome() {
  useGuard(["doctor"]);
  const { t } = useI18n();
  const d = useApi("/doctor/dashboard"); const p = useApi("/doctor/patients"); const me = useApi("/auth/me");
  const [q, setQ] = useState("");
  const today = todayDhaka();
  const todays = useMemo(() => (d.data?.appointments || []).filter((a: any) => dhakaDay(a.slot_start) === today), [d.data, today]);
  const later = useMemo(() => (d.data?.appointments || []).filter((a: any) => (dhakaDay(a.slot_start) ?? "") > today), [d.data, today]);
  const patients = (p.data?.items || []).filter((x: any) => !q || (x.name || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title={t("doc.title")} subtitle={me.data?.status === "active" ? undefined : t("auth.pending")} />
      <Async loading={d.loading} error={d.error} onRetry={d.reload}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={CalendarClock} label={t("doc.todayAppts")} value={todays.length} />
          <StatTile icon={ClipboardCheck} label={t("doc.upcoming")} value={later.length} />
          <StatTile icon={FileSearch} label={t("doc.pending")} value={d.data?.pending_review_count} />
          <StatTile icon={Users} label={t("doc.patients")} value={p.data?.items.length ?? "—"} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h2 className="mb-3 text-lg">{t("doc.todayAppts")}</h2>
            {todays.length === 0 ? <p className="text-sm text-muted">{t("doc.noToday")}</p> : <ul className="space-y-2 text-sm">{todays.map((a: any) => <li key={a.id} className="flex items-center justify-between"><span className="num">{fmtDateTime(a.slot_start)}</span><Chip kind={a.status === "confirmed" ? "verified" : "pending"}>{a.status}</Chip></li>)}</ul>}</Card>
          <Card><h2 className="mb-3 text-lg">{t("doc.upcoming")}</h2>
            {later.length === 0 ? <p className="text-sm text-muted">{t("common.empty")}</p> : <ul className="space-y-2 text-sm">{later.slice(0, 6).map((a: any) => <li key={a.id} className="flex items-center justify-between"><span className="num">{fmtDateTime(a.slot_start)}</span><span className="text-muted">{a.status}</span></li>)}</ul>}</Card>
        </div>
      </Async>
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg">{t("doc.patients")}</h2>
          <label className="flex items-center gap-2 rounded-input border border-line px-2"><Search className="h-4 w-4 text-muted" aria-hidden /><input aria-label={t("doc.search")} placeholder={t("doc.search")} value={q} onChange={(e) => setQ(e.target.value)} className="min-h-[40px] bg-transparent text-sm outline-none" /></label></div>
        <Async loading={p.loading} error={p.error} onRetry={p.reload} empty={p.data?.items.length === 0} emptyNode={<EmptyState icon={Users} title={t("common.empty")} />}>
          {patients.length === 0 ? <p className="text-sm text-muted">{t("common.noResults")}</p> :
            <ul className="divide-y divide-line">{patients.map((x: any) => (
              <li key={x.patient_id} className="flex min-h-[48px] items-center justify-between gap-2">
                <span>{x.name}</span>
                {x.access ? <Link href={`/doctor/patients/${x.patient_id}`} className="btn-link text-ptext">{t("common.view")} →</Link> : <Chip kind="unverified">{t("doc.noAccess")}</Chip>}
              </li>))}</ul>}
        </Async>
      </Card>
    </>
  );
}
