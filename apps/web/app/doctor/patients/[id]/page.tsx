"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { AiBanner, Async, Button, Card, Chip, Dialog, PageHeader } from "@/components/ui";

export default function Chart() {
  useGuard(["doctor"]);
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const chart = useApi(`/doctor/patients/${id}`); const obs = useApi(`/patients/${id}/observations`);
  const [confirmOpen, setConfirmOpen] = useState(false); const [sum, setSum] = useState<any>(null); const [note, setNote] = useState<any>(null); const [text, setText] = useState(""); const [err, setErr] = useState("");
  const wrap = async (fn: () => Promise<any>) => { setErr(""); try { await fn(); } catch (e: any) { setErr(e.message); } };
  const verify = (oid: string) => wrap(async () => { await api(`/observations/${oid}/verify`, { method: "POST" }); obs.reload(); });
  const summarize = () => wrap(async () => setSum(await api("/ai/clinical-summary", { body: { patient_id: id, lang: locale } })));
  const draft = () => wrap(async () => { const d = await api("/ai/note-draft", { body: { patient_id: id, lang: locale } }); const n = await api("/clinical-notes/draft", { body: { patient_id: id, text: d.draft_text, ai_assisted: true } }); setNote(n); setText(n.text || d.draft_text); });
  const blank = () => wrap(async () => { const n = await api("/clinical-notes/draft", { body: { patient_id: id, text: "" } }); setNote(n); setText(""); });
  const sign = () => wrap(async () => {
    setConfirmOpen(false);
    await api(`/clinical-notes/${note.id}`, { method: "PUT", body: { text } });
    setNote(await api(`/clinical-notes/${note.id}/sign`, { method: "POST" }));
  });
  return (
    <Async loading={chart.loading} error={chart.error} onRetry={chart.reload}>
      {chart.data && <>
        <PageHeader title={chart.data.name} />
        {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><tbody>{obs.data?.items.map((o: any) => (
          <tr key={o.id} className="border-t border-line first:border-0"><td className="py-2">{o.test_code}</td><td className="num">{o.value} {o.unit || "⚠ ?"}</td><td className="num text-muted">{o.observed_on}</td>
            <td>{o.low_confidence && <Chip kind="low" />}</td>
            <td>{o.doctor_verified ? <Chip kind="doctor" /> : <Button variant="ghost" onClick={() => verify(o.id)}>{t("doc.verify")}</Button>}</td></tr>))}</tbody></table></div></Card>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={summarize}>✦ {t("doc.aiSummary")}</Button><Button variant="secondary" onClick={draft}>✦ {t("doc.noteDraft")}</Button><Button variant="secondary" onClick={blank}>{t("doc.draft")}</Button></div>
        {sum && <Card><AiBanner />{sum.known_facts.map((f: any, i: number) => <p key={i}>{f.text}</p>)}{sum.unknown.map((u: string, i: number) => <p key={i} className="text-muted">? {u}</p>)}</Card>}
        {note && <Card className="space-y-2">
          {note.ai_assisted && note.status === "draft" && <AiBanner />}
          <textarea className="w-full rounded-input border border-line bg-s2 p-3 text-ink" rows={7} value={text} disabled={note.locked} onChange={(e) => setText(e.target.value)} />
          {note.locked ? <Chip kind="doctor">{t("doc.locked")}</Chip> : <Button onClick={() => setConfirmOpen(true)}>{t("doc.sign")}</Button>}
        </Card>}
        <Dialog open={confirmOpen} title={t("doc.confirmTitle")} onClose={() => setConfirmOpen(false)}>
          <p className="mb-4 text-sm text-muted">{t("doc.signConfirm")}</p>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmOpen(false)}>{t("common.cancel")}</Button><Button onClick={sign}>{t("doc.sign")}</Button></div>
        </Dialog>
      </>}
    </Async>
  );
}
