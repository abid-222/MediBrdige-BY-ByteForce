"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { uploadWithProgress } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Card, Chip, docStatus, EmptyState, fmtDate, PageHeader } from "@/components/ui";

const MAX = 10 * 1024 * 1024;
const OK = ["application/pdf", "image/jpeg", "image/png"];

export default function Reports() {
  useGuard(["patient"]);
  const { t } = useI18n();
  const { data, loading, error, reload } = useApi("/documents");
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false); const [pct, setPct] = useState<number | null>(null); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = async (f: File) => {
    setMsg(null);
    if (!OK.includes(f.type)) return setMsg({ ok: false, text: "PDF, JPG, PNG only" });
    if (f.size > MAX) return setMsg({ ok: false, text: "10MB max" });
    const form = new FormData(); form.append("file", f);
    setPct(0);
    try {
      await uploadWithProgress("/documents", form, setPct, { "Idempotency-Key": `${f.name}-${f.size}-${f.lastModified}` });
      setMsg({ ok: true, text: t("rep.processing") });
      reload(); setTimeout(reload, 2500); setTimeout(reload, 6000);   // pipeline runs in the background; poll a few times
    } catch (e: any) { setMsg({ ok: false, text: e.message }); } finally { setPct(null); }
  };
  return (
    <>
      <PageHeader title={t("rep.title")} subtitle={t("rep.supported")} />
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]); }}
        className={`rounded-card border-2 border-dashed p-6 text-center transition ${drag ? "border-primary bg-psoft" : "border-line bg-s1"}`}>
        <input ref={ref} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => { e.target.files?.[0] && upload(e.target.files[0]); e.target.value = ""; }} />
        <button type="button" onClick={() => ref.current?.click()} className="mx-auto flex flex-col items-center gap-2">
          <span className="rounded-pill bg-psoft p-3 text-ptext"><UploadCloud className="h-6 w-6" aria-hidden /></span>
          <span className="font-medium">{t("rep.dropHere")}</span><span className="text-xs text-muted">{t("rep.drop")}</span>
        </button>
        {pct !== null && <div className="mx-auto mt-3 max-w-sm"><div className="h-2 overflow-hidden rounded-pill bg-s2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-2 bg-primary transition-all" style={{ width: `${pct}%` }} /></div><p className="num mt-1 text-xs text-muted">{t("rep.uploading")} {pct}%</p></div>}
        {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 text-sm ${msg.ok ? "text-ptext" : "text-danger"}`}>{msg.text}</p>}
      </div>
      <Async loading={loading} error={error} onRetry={reload} empty={data?.items.length === 0} emptyNode={<EmptyState icon={FileText} title={t("rep.emptyTitle")} body={t("rep.emptyBody")} />}>
        <div className="grid gap-3 md:grid-cols-2">{data?.items.map((d: any) => (
          <Link key={d.id} href={`/reports/${d.id}`}>
            <Card className="h-full transition hover:border-primary">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-ptext" aria-hidden /><span className="font-medium">{(d.doc_type || "report").toUpperCase()}</span></div>
                <Chip kind={docStatus({ status: d.status, total: d.total_values, verifiedCount: d.verified_values, lowCount: d.low_confidence_values })} />
              </div>
              <p className="num mt-2 text-sm text-muted">{t("rep.uploadedOn")} {fmtDate(d.created_at)} · {d.page_count ?? "—"} {t("rep.pages")} · {d.total_values} {t("rep.values")}</p>
              {d.status === "unsupported" || d.status === "failed" ? <p className="mt-2 text-sm text-warn">{d.message}</p> : null}
              {d.is_sample && <div className="mt-2"><Chip kind="info">Sample</Chip></div>}
            </Card>
          </Link>))}</div>
      </Async>
    </>
  );
}
