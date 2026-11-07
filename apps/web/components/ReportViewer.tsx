"use client";
import { useEffect, useState } from "react";
import { Download, FileWarning } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui";

/** Shows the ORIGINAL uploaded file (never extracted/AI content) through a short-lived signed URL. PDF page nav + zoom come from the browser's PDF viewer. */
export function ReportViewer({ docId, mime }: { docId: string; mime?: string | null }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null); const [err, setErr] = useState(false); const [zoom, setZoom] = useState(100);
  useEffect(() => {
    const c = new AbortController();
    api(`/documents/${docId}/file-url`, { signal: c.signal }).then((r) => {
      const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/api\/v1$/, "");
      setUrl(base + r.url);
    }).catch((e) => { if (e?.name !== "AbortError") setErr(true); });
    return () => c.abort();
  }, [docId]);
  if (err) return <p className="flex items-center gap-2 text-sm text-muted"><FileWarning className="h-4 w-4" aria-hidden />{t("rep.noPreview")}</p>;
  if (!url) return <Skeleton h={320} />;
  const isPdf = mime === "application/pdf";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        {!isPdf ? <div className="flex items-center gap-1"><button className="rounded-input border border-line px-2" onClick={() => setZoom((z) => Math.max(50, z - 25))} aria-label="Zoom out">−</button><span className="num w-12 text-center">{zoom}%</span><button className="rounded-input border border-line px-2" onClick={() => setZoom((z) => Math.min(250, z + 25))} aria-label="Zoom in">+</button></div> : <span>PDF</span>}
        <a href={url} target="_blank" rel="noreferrer" className="btn-link gap-1 text-ptext"><Download className="h-3.5 w-3.5" aria-hidden />{t("rep.original")}</a>
      </div>
      <div className="max-h-[520px] overflow-auto rounded-input border border-line bg-s2">
        {isPdf ? <iframe title={t("rep.original")} src={`${url}#toolbar=1&navpanes=0`} className="h-[520px] w-full" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={url} alt={t("rep.original")} style={{ width: `${zoom}%`, maxWidth: "none" }} />}
      </div>
    </div>
  );
}
