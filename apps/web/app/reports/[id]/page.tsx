"use client";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Flag, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import { AiBanner, Async, Button, Card, Chip, EmergencyBanner, PageHeader } from "@/components/ui";
import { ReportViewer } from "@/components/ReportViewer";

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const doc = useApi(`/documents/${id}`);
  const { data, loading, error, reload } = useApi(`/documents/${id}/extractions`);
  const [ai, setAi] = useState<any>(null); const [busy, setBusy] = useState(false); const [aiErr, setAiErr] = useState(""); const [q, setQ] = useState("");
  const patch = async (oid: string, body: object) => { await api(`/extractions/${id}/fields`, { method: "PATCH", body: { observation_id: oid, ...body } }); reload(); };
  const explain = async () => { setBusy(true); setAiErr(""); try { setAi(await api("/ai/report-explain", { body: { document_id: id, lang: locale } })); } catch (e: any) { setAiErr(e.message); } finally { setBusy(false); } };
  const lines = useMemo(() => (data?.raw_text || "").split("\n").filter((l: string) => !q || l.toLowerCase().includes(q.toLowerCase())), [data?.raw_text, q]);
  const needsManual = data && (data.document_status === "failed" || (data.rows.length > 0 && data.rows.every((r: any) => r.low_confidence)));
  return (
    <Async loading={loading || doc.loading} error={error || doc.error} onRetry={reload} h={300}>
      {data && <>
        <PageHeader title={`${(doc.data?.doc_type || "report").toUpperCase()}`} subtitle={t("rep.unverifiedNote")} actions={doc.data?.is_sample ? <Chip kind="info">Sample</Chip> : undefined} />
        {data.document_status === "unsupported" && <Card><p className="text-warn">{data.message || t("rep.unsupported")}</p></Card>}
        {needsManual && <Card><p className="flex items-center gap-2 text-warn"><Flag className="h-4 w-4" aria-hidden />{data.message || t("rep.manualReview")}</p></Card>}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><h2 className="mb-2 flex items-center gap-2 text-lg">{t("layer.uploaded")}</h2><ReportViewer docId={id} mime={doc.data?.mime} /></Card>
          <Card>
            <h2 className="mb-1 text-lg">{t("layer.ocr")}</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted"><tr><th className="py-1">{t("rep.test")}</th><th>{t("rep.value")}</th><th>{t("rep.unit")}</th><th>{t("rep.range")}</th><th>{t("rep.confidence")}</th><th /></tr></thead>
              <tbody>{data.rows.map((r: any) => (
                <tr key={r.observation_id} className={`border-t border-line ${r.low_confidence ? "bg-s2" : ""}`}>
                  <td className="py-2 font-medium">{r.test_code}</td>
                  <td className="num">{r.value}</td>
                  <td>{r.unit || <span className="text-warn">?</span>}</td>
                  <td className="num">{r.ref_low != null ? `${r.ref_low}–${r.ref_high}` : "—"}</td>
                  <td className="num">{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"} {r.low_confidence && <Chip kind="low" />}</td>
                  <td className="space-x-1 whitespace-nowrap text-right">
                    {r.status === "doctor_verified" ? <Chip kind="doctor" /> : <>
                      {r.flagged_wrong ? <Chip kind="pending">⚑</Chip> : <Button variant="ghost" className="min-h-[36px] px-2" onClick={() => patch(r.observation_id, { flag_wrong: true })}>{t("rep.flag")}</Button>}
                      {r.status === "unverified" && !r.low_confidence && <Button variant="ghost" className="min-h-[36px] px-2" onClick={() => patch(r.observation_id, { patient_confirm: true })}>✓</Button>}</>}
                  </td></tr>))}</tbody></table></div>
            {data.rows.length === 0 && <p className="text-sm text-muted">{t("common.empty")}</p>}
          </Card>
        </div>
        <Card>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg">{t("rep.searchText")}</h2>
            <label className="flex items-center gap-2 rounded-input border border-line px-2"><Search className="h-4 w-4 text-muted" aria-hidden /><input aria-label={t("rep.searchText")} value={q} onChange={(e) => setQ(e.target.value)} className="min-h-[40px] bg-transparent text-sm outline-none" /></label></div>
          <pre className="num max-h-56 overflow-auto whitespace-pre-wrap text-xs text-muted">{lines.length ? lines.map((l: string, i: number) => <div key={i}>{q ? l.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")).map((p, j) => p.toLowerCase() === q.toLowerCase() ? <mark key={j} className="bg-psoft text-ink">{p}</mark> : p) : l}</div>) : t("common.noResults")}</pre>
        </Card>
        {data.rows.length > 0 && <Button onClick={explain} busy={busy}><Sparkles className="h-4 w-4" aria-hidden />{t("rep.explain")}</Button>}
        {aiErr && <Card><p role="alert" className="text-danger">{aiErr}</p></Card>}
        {ai?.emergency && <EmergencyBanner text={ai.guidance} />}
        {ai && !ai.emergency && <Card className="space-y-3"><h2 className="text-lg">{t("layer.ai")}</h2><AiBanner />
          {ai.known_facts.map((f: any, i: number) => <p key={i}>{f.text}</p>)}
          {ai.unknown.map((u: string, i: number) => <p key={i} className="text-muted">? {u}</p>)}
          {ai.inference.map((u: string, i: number) => <p key={i} className="text-warn">{u}</p>)}
          {ai.sources.length > 0 && <p className="text-xs text-muted">{t("rep.sources")}: {ai.sources.map((s: any) => `${s.title} (${s.date})`).join("; ")}</p>}
          <p className="text-xs text-muted">{ai.disclaimer}</p></Card>}
      </>}
    </Async>
  );
}
