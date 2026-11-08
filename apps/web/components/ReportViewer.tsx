"use client";
import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, FileWarning, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui";

/** Shows the ORIGINAL uploaded file through a secure signed URL with PDF iframe + image viewer fallback. */
export function ReportViewer({ docId, mime }: { docId: string; mime?: string | null }) {
  const { t, locale } = useI18n();
  const isBn = locale === "bn";
  const [url, setUrl] = useState<string | null>(null);
  const [detectedMime, setDetectedMime] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);

  const fetchUrl = () => {
    setLoading(true);
    setErr(false);
    api(`/documents/${docId}/file-url`)
      .then((r) => {
        const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace(/\/api\/v1$/, "");
        setUrl(base + r.url);
        if (r.mime) setDetectedMime(r.mime);
        setLoading(false);
      })
      .catch((e) => {
        setErr(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUrl();
  }, [docId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5 font-medium">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
            {isBn ? "মূল ফাইল লোড হচ্ছে..." : "Loading original vault file..."}
          </span>
        </div>
        <Skeleton h={460} />
      </div>
    );
  }

  if (err || !url) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[320px] rounded-xl border border-line bg-s1">
        <FileWarning className="h-8 w-8 text-warn" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-ink">
            {isBn ? "মূল ফাইল প্রদর্শন সম্ভব হয়নি" : "Could not preview original document"}
          </p>
          <p className="text-xs text-muted max-w-xs">
            {isBn ? "ফাইলের নিরাপত্তা লিংক মেয়াদোত্তীর্ণ বা অ্যাক্সেস সীমাবদ্ধ।" : "Signed access link may have expired or is restricted."}
          </p>
        </div>
        <button
          onClick={fetchUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-psoft px-3 py-1.5 text-xs font-semibold text-ptext hover:bg-primary hover:text-onprimary transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {isBn ? "পুনরায় চেষ্টা করুন" : "Retry Preview"}
        </button>
      </div>
    );
  }

  const effectiveMime = (detectedMime || mime || "application/pdf").toLowerCase();
  const isPdf = effectiveMime.includes("pdf");

  return (
    <div className="space-y-2 p-2">
      {/* Top Header / Action Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold uppercase text-ink">{isPdf ? "PDF Document" : "Medical Scan"}</span>
        </div>

        <div className="flex items-center gap-2">
          {!isPdf && (
            <div className="flex items-center gap-1 bg-s1 rounded-lg border border-line p-0.5">
              <button
                className="rounded p-1 text-muted hover:text-ink hover:bg-s2 transition"
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                title="Zoom out"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="num w-10 text-center text-[10px] font-mono">{zoom}%</span>
              <button
                className="rounded p-1 text-muted hover:text-ink hover:bg-s2 transition"
                onClick={() => setZoom((z) => Math.min(250, z + 25))}
                title="Zoom in"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>
          )}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-s1 px-2.5 py-1 text-[11px] font-medium text-ink hover:border-primary/60 hover:text-ptext transition shadow-xs"
            title={isBn ? "নতুন ট্যাবে খুলুন" : "Open full file in new tab"}
          >
            <ExternalLink className="h-3 w-3" />
            <span>{isBn ? "বড় পর্দায় দেখুন" : "Full View"}</span>
          </a>

          <a
            href={url}
            download="report"
            className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-psoft px-2.5 py-1 text-[11px] font-bold text-ptext hover:bg-primary hover:text-onprimary transition shadow-xs"
            title={isBn ? "আসল রিপোর্ট ডাউনলোড" : "Download Original File"}
          >
            <Download className="h-3 w-3" />
            <span>{isBn ? "ডাউনলোড" : "Download"}</span>
          </a>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="h-[520px] w-full overflow-auto rounded-xl border border-line bg-s2/60 relative">
        {isPdf ? (
          <iframe
            title="Original Medical Report Preview"
            src={`${url}#toolbar=1&navpanes=0`}
            className="h-full w-full border-0 rounded-xl bg-white"
          />
        ) : (
          <div className="flex min-h-full items-center justify-center p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Original Medical Report"
              style={{ width: `${zoom}%`, maxWidth: "none" }}
              className="rounded-lg shadow-md transition-all duration-150"
            />
          </div>
        )}
      </div>
    </div>
  );
}
