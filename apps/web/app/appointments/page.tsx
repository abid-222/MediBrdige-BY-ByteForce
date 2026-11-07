"use client";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { api, getRole } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, Chip, EmptyState, fmtDateTime, PageHeader } from "@/components/ui";

const NEXT: Record<string, [string, string][]> = {
  requested: [["confirmed", "appt.confirm"], ["cancelled", "appt.cancel"]],
  confirmed: [["checked_in", "appt.checkin"], ["cancelled", "appt.cancel"]],
  checked_in: [["completed", "appt.complete"]],
  rescheduled: [["confirmed", "appt.confirm"], ["cancelled", "appt.cancel"]],
};
export default function Appointments() {
  const { t } = useI18n();
  const role = getRole();
  const { data, loading, error, reload } = useApi("/appointments");
  const [err, setErr] = useState(""); const [busyId, setBusyId] = useState<string | null>(null);
  const act = async (id: string, status: string) => {
    if (busyId) return;                       // prevents double-click duplicates
    setErr(""); setBusyId(id);
    try { await api(`/appointments/${id}/status`, { method: "PATCH", body: { status } }); reload(); } catch (e: any) { setErr(e.message); reload(); } finally { setBusyId(null); }
  };
  return (
    <>
      <PageHeader title={t("appt.title")} subtitle={t("appt.demo")} />
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Async loading={loading} error={error} onRetry={reload} empty={data?.items.length === 0} emptyNode={<EmptyState icon={CalendarClock} title={t("appt.emptyTitle")} body={t("appt.emptyBody")} />}>
        <div className="space-y-3">{data?.items.map((a: any) => (
          <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="font-medium">{a.patient_name} → {a.doctor_name}</p><p className="num text-sm text-muted">{fmtDateTime(a.slot_start)}</p></div>
            <div className="flex flex-wrap items-center gap-2"><Chip kind={a.status === "confirmed" || a.status === "completed" ? "verified" : a.status === "cancelled" ? "failed" : "pending"}>{a.status}</Chip>
              {(NEXT[a.status] || []).filter(([s]) => role !== "patient" || s === "cancelled").map(([s, k]) => <Button key={s} variant={s === "cancelled" ? "secondary" : "primary"} busy={busyId === a.id} onClick={() => act(a.id, s)}>{t(k)}</Button>)}</div>
          </Card>))}</div>
      </Async>
    </>
  );
}
