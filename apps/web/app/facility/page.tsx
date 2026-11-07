"use client";
import { useState } from "react";
import { CalendarClock, Stethoscope } from "lucide-react";
import { api, getRole } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, EmptyState, fmtDate, fmtDateTime, Input, PageHeader, StatTile, verChip } from "@/components/ui";

export default function Facility() {
  useGuard(["facility_admin", "facility_staff"]);
  const { t } = useI18n();
  const canEdit = getRole() === "facility_admin";
  const d = useApi("/facility/dashboard"); const pr = useApi("/facility/prices"); const ap = useApi("/appointments");
  const [item, setItem] = useState(""); const [price, setPrice] = useState(""); const [src, setSrc] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const save = async () => { setErr(""); setBusy(true); try { await api("/facility/prices", { body: { item_code: item, price_bdt: Number(price), source: src } }); pr.reload(); setItem(""); setPrice(""); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <>
      <Async loading={d.loading} error={d.error} onRetry={d.reload}>
        <PageHeader title={d.data?.facility.name || t("fac.title")} actions={d.data && verChip(d.data.facility.verification)} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatTile icon={Stethoscope} label={t("fac.roster")} value={d.data?.roster.length} />
          <StatTile icon={CalendarClock} label={t("nav.appointments")} value={d.data?.appointments.total} />
          <StatTile icon={CalendarClock} label={t("status.processing")} value={d.data?.appointments.requested} />
        </div>
        <Card><h2 className="mb-2 text-lg">{t("fac.roster")}</h2><ul className="divide-y divide-line text-sm">{d.data?.roster.map((r: any) => <li key={r.doctor_id} className="flex justify-between py-2"><span>{r.name}</span><span className="num text-muted">{r.fee_bdt ?? t("chip.notConfirmed")}</span></li>)}</ul></Card>
      </Async>
      <Card className="space-y-3"><h2 className="text-lg">{t("fac.prices")}</h2>
        <ul className="space-y-1 text-sm">{pr.data?.items.map((p: any) => <li key={p.id}>{p.item_code}: <span className="num">{p.price_bdt}</span> · {t("fac.confirmedAt")} <span className="num">{fmtDate(p.confirmed_at)}</span> · {p.source}</li>)}</ul>
        {canEdit && <div className="grid gap-3 md:grid-cols-4"><Input label="Item" value={item} onChange={(e) => setItem(e.target.value)} /><Input label="BDT" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} /><Input label="Source (required)" value={src} onChange={(e) => setSrc(e.target.value)} /><Button className="self-end" busy={busy} disabled={!item || !price || !src} onClick={save}>{t("common.save")}</Button></div>}
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}</Card>
      <h2 className="text-lg">{t("fac.queue")}</h2>
      <Async loading={ap.loading} error={ap.error} onRetry={ap.reload} empty={ap.data?.items.length === 0} emptyNode={<EmptyState icon={CalendarClock} title={t("fac.noQueue")} />}>
        <Card><ul className="divide-y divide-line text-sm">{ap.data?.items.map((a: any) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span className="num">{fmtDateTime(a.slot_start)}</span><span>{a.patient_name} → {a.doctor_name}</span><span className="text-muted">{a.status}</span></li>)}</ul></Card>
      </Async>
    </>
  );
}
