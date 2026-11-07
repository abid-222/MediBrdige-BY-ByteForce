"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { uploadWithProgress } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Card, Chip, docStatus, EmptyState, fmtDate, PageHeader, ProgressBar, useToast } from "@/components/ui";

const MAX = 10 * 1024 * 1024;
const OK = ["application/pdf", "image/jpeg", "image/png"];

export default function Reports() {
  useGuard(["patient"]);
  const { t } = useI18n();
  const { addToast } = useToast();
  const { data, loading, error, reload } = useApi("/documents");
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pct, setPct] = useState<number | null>(null);

  const upload = async (f: File) => {
    if (!OK.includes(f.type)) {
      addToast("error", "Invalid file type", "Only PDF, JPG, and PNG files are supported.");
      return;
    }
    if (f.size > MAX) {
      addToast("error", "File too large", "Maximum file size is 10MB.");
      return;
    }
    const form = new FormData();
    form.append("file", f);
    setPct(0);
    try {
      await uploadWithProgress("/documents", form, setPct, { "Idempotency-Key": `${f.name}-${f.size}-${f.lastModified}` });
      addToast("success", "Report uploaded", t("rep.processing"));
      reload();
      setTimeout(reload, 2500);
      setTimeout(reload, 6000);
    } catch (e: any) {
      addToast("error", "Upload failed", e.message);
    } finally {
      setPct(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("rep.title")} subtitle={t("rep.supported")} />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); e.dataTransfer.files[0] && upload(e.dataTransfer.files[0]); }}
        className={`rounded-card border-2 border-dashed p-8 text-center transition-all ${drag ? "border-primary bg-psoft/20 scale-[1.01]" : "border-line bg-s1 hover:border-primary/40 hover:bg-psoft/5"}`}
      >
        <input
          ref={ref}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => { e.target.files?.[0] && upload(e.target.files[0]); e.target.value = ""; }}
        />
        <button type="button" onClick={() => ref.current?.click()} className="mx-auto flex flex-col items-center gap-3">
          <span className={`rounded-2xl p-4 transition-colors ${drag ? "bg-primary text-onprimary" : "bg-psoft text-ptext"}`}>
            <UploadCloud className="h-7 w-7" aria-hidden />
          </span>
          <div>
            <span className="block font-semibold text-lg">{t("rep.dropHere")}</span>
            <span className="block text-sm text-muted mt-1">{t("rep.drop")}</span>
          </div>
        </button>

        {pct !== null && (
          <div className="mx-auto mt-5 max-w-sm">
            <ProgressBar value={pct} max={100} label={`${t("rep.uploading")} ${pct}%`} />
          </div>
        )}
      </div>

      {/* Document list */}
      <Async
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.items?.length === 0}
        emptyNode={<EmptyState icon={FileText} title={t("rep.emptyTitle")} body={t("rep.emptyBody")} />}
        skeleton="table">
        <div className="grid gap-3 md:grid-cols-2">
          {data?.items?.map((d: any) => (
            <Link key={d.id} href={`/reports/${d.id}`}>
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-[0_0_0_1px_rgba(57,255,136,0.2)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-psoft p-2 text-ptext flex-shrink-0">
                      <FileText className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="font-semibold">{(d.doc_type || "report").toUpperCase()}</span>
                  </div>
                  <Chip kind={docStatus({ status: d.status, total: d.total_values, verifiedCount: d.verified_values, lowCount: d.low_confidence_values })} />
                </div>
                <p className="num mt-3 text-sm text-muted">
                  {t("rep.uploadedOn")} {fmtDate(d.created_at)}
                  {d.page_count != null && ` · ${d.page_count} ${t("rep.pages")}`}
                  {` · ${d.total_values} ${t("rep.values")}`}
                </p>
                {(d.status === "unsupported" || d.status === "failed") && (
                  <p className="mt-2 text-sm text-warn">{d.message}</p>
                )}
                {d.is_sample && <div className="mt-2"><Chip kind="info">Sample</Chip></div>}
              </Card>
            </Link>
          ))}
        </div>
      </Async>
    </div>
  );
}
