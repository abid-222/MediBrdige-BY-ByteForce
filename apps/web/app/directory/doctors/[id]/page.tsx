"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, getRole } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, Chip, fmtDate, Input, verChip } from "@/components/ui";

export default function DoctorDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data: d, loading, error, reload } = useApi(`/directory/doctors/${id}`);
  const slots = useApi(`/doctors/${id}/slots`);
  const [msg, setMsg] = useState(""); const [reason, setReason] = useState(""); const [share, setShare] = useState(false); const [note, setNote] = useState("");
  const book = async (slotId?: string) => {
    try { await api("/appointments", { body: { doctor_id: id, facility_id: d.chambers[0]?.facility_id, slot_id: slotId, reason, share_opt_in: share }, headers: { "Idempotency-Key": crypto.randomUUID() } }); setMsg("✓ " + t("appt.demo")); }
    catch (e: any) { setMsg("⚠ " + e.message); }
  };
  const report = async () => { await api("/directory/reports", { body: { entity_type: "doctor", entity_id: id, message: note } }).then(() => setNote("")).catch(() => {}); };
  return (
    <Async loading={loading} error={error} onRetry={reload} h={220}>
      {d && <>
        <div className="flex items-center gap-2"><h1 className="text-2xl">{d.full_name}</h1>{verChip(d.verification)}{d.stale && <Chip kind="stale" />}</div>
        <p className="text-muted">{d.specialty} · {d.qualifications?.join(", ")}</p>
        <Card>{d.chambers.map((c: any) => (<div key={c.facility_id} className="mb-2"><p>{c.facility_name}</p>
          <p className="text-sm">{t("dir.fee")}: <span className={`num ${c.fee_state === "confirmed" ? "" : "text-muted"}`}>{c.fee_label}</span> {c.fee_state !== "confirmed" && <Chip kind="unverified" />}</p></div>))}</Card>
        <Card><h2 className="mb-2 text-xl">{t("dir.provenance")}</h2>
          {d.provenance.length === 0 ? <p className="text-sm text-muted">{t("dir.noProvenance")}</p> :
            <ul className="space-y-1 text-sm">{d.provenance.map((p: any, i: number) => <li key={i}>{p.field}: {t("dir.source")} <b>{p.source_name}</b> · {t("dir.lastVerified")} <span className="num">{fmtDate(p.verified_at)}</span> · {t("dir.confidence")}: {p.confidence}</li>)}</ul>}
        </Card>
        {getRole() === "patient" && <Card className="space-y-3"><h2 className="text-xl">{t("dir.book")}</h2>
          <Input label={t("appt.reason")} value={reason} onChange={(e) => setReason(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={share} onChange={(e) => setShare(e.target.checked)} />{t("appt.shareOptIn")}</label>
          <div className="flex flex-wrap gap-2">{slots.data?.items.filter((s: any) => s.available).slice(0, 4).map((s: any) => <Button key={s.id} variant="secondary" onClick={() => book(s.id)}><span className="num">{new Date(s.start).toISOString().slice(0, 16).replace("T", " ")}</span></Button>)}</div>
          {msg && <p role="status" className="text-sm">{msg}</p>}</Card>}
        <Card className="space-y-2"><Input label={t("dir.report")} value={note} onChange={(e) => setNote(e.target.value)} /><Button variant="secondary" disabled={note.length < 5} onClick={report}>{t("common.submit")}</Button></Card>
        <Link href="/directory" className="text-ptext">← {t("nav.directory")}</Link>
      </>}
    </Async>
  );
}
