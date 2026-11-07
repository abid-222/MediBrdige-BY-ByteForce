"use client";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  FileCheck,
  FileSearch,
  FileText,
  Flag,
  Info,
  Layers,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import {
  AiBanner,
  Async,
  Button,
  Card,
  Chip,
  Dialog,
  docStatus,
  EmergencyBanner,
  EmptyState,
  GlassCard,
  PageHeader,
  ProgressBar,
  StatTile,
  Table,
  useToast,
} from "@/components/ui";
import { ReportViewer } from "@/components/ReportViewer";
import Link from "next/link";

export default function MedicalReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const router = useRouter();

  // API hooks
  const doc = useApi(`/documents/${id}`);
  const extractions = useApi(`/documents/${id}/extractions`);

  // Local state
  const [aiData, setAiData] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [textSearch, setTextSearch] = useState("");
  const [patchingId, setPatchingId] = useState<string | null>(null);

  // Field modification handler (Flag wrong or confirm value)
  const patchField = async (observationId: string, body: object, successMessage: string) => {
    setPatchingId(observationId);
    try {
      await api(`/extractions/${id}/fields`, {
        method: "PATCH",
        body: { observation_id: observationId, ...body },
      });
      extractions.reload();
      addToast("success", "Observation Updated", successMessage);
    } catch (e: any) {
      addToast("error", "Update Failed", e.message);
    } finally {
      setPatchingId(null);
    }
  };

  // AI Explain handler
  const requestExplanation = async () => {
    setAiBusy(true);
    setAiError("");
    try {
      const res = await api("/ai/report-explain", {
        body: { document_id: id, lang: locale },
      });
      setAiData(res);
      addToast("success", "AI Summary Generated", "Plain-language translation based strictly on extracted values.");
    } catch (e: any) {
      setAiError(e.message || "AI service temporarily unavailable.");
      addToast("error", "Explanation Failed", e.message);
    } finally {
      setAiBusy(false);
    }
  };

  // Raw OCR lines with text search filtering
  const rawLines = useMemo(() => {
    const text = extractions.data?.raw_text || "";
    if (!text) return [];
    return text.split("\n").filter((l: string) => !textSearch || l.toLowerCase().includes(textSearch.toLowerCase()));
  }, [extractions.data?.raw_text, textSearch]);

  const rows = extractions.data?.rows || [];
  const lowConfidenceCount = rows.filter((r: any) => r.low_confidence).length;
  const verifiedCount = rows.filter((r: any) => r.status === "doctor_verified").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/reports">
          <Button size="xs" variant="ghost" icon={ArrowLeft}>
            Back to Documents
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`${(doc.data?.doc_type || "MEDICAL REPORT").toUpperCase()} ${doc.data?.is_sample ? "(Sample)" : ""}`}
        subtitle="Review extracted laboratory markers side-by-side with your original scan. Flags and patient confirmations feed into the doctor verification workspace."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Medical Documents", href: "/reports" },
          { label: doc.data?.doc_type?.toUpperCase() || "Report", href: `/reports/${id}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              icon={Sparkles}
              busy={aiBusy}
              disabled={rows.length === 0}
              onClick={requestExplanation}
            >
              Explain with AI
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={FileText}
          label="Total Observations"
          value={rows.length}
          accent
        />
        <StatTile
          icon={FileCheck}
          label="Doctor Verified"
          value={verifiedCount}
          trend={verifiedCount === rows.length && rows.length > 0 ? "up" : "neutral"}
          trendLabel={verifiedCount === rows.length && rows.length > 0 ? "All verified" : "Pending consultation"}
        />
        <StatTile
          icon={FileSearch}
          label="Low Confidence OCR"
          value={lowConfidenceCount}
          trend={lowConfidenceCount > 0 ? "down" : "neutral"}
          trendLabel={lowConfidenceCount > 0 ? "Review against scan" : "High confidence"}
        />
        <StatTile
          icon={Layers}
          label="OCR Engine"
          value={extractions.data?.extractor_version || "PyMuPDF · v1"}
        />
      </div>

      {/* Warnings & OCR Failure Notices */}
      {extractions.data?.document_status === "unsupported" && (
        <Card className="border-warn/40 bg-warn/10">
          <p className="text-sm font-semibold text-warn flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {extractions.data?.message || "This report format is not yet fully supported by automated OCR."}
          </p>
        </Card>
      )}

      {lowConfidenceCount > 0 && (
        <GlassCard className="border-warn/40 flex items-start gap-3">
          <Info className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div className="text-xs text-muted">
            <p className="font-semibold text-warn text-sm">Automated Read Notice</p>
            <p className="mt-0.5 leading-relaxed">
              Some values have an OCR confidence score below 80%. Please check them carefully against the original scan on the left. You can flag incorrect values or confirm correct extractions.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Side-by-Side View: Original Scan vs Extracted Values Table */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Original Document Viewer */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="h-full space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-ptext" />
                <span>Original Document Preview</span>
              </h2>
              <span className="text-[10px] uppercase font-mono text-muted">{doc.data?.mime || "PDF/IMG"}</span>
            </div>
            <div className="min-h-[460px] rounded-input border border-line bg-s2/50 overflow-hidden">
              <ReportViewer docId={id} mime={doc.data?.mime} />
            </div>
          </Card>
        </div>

        {/* Right Column: Extracted Values Table */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div>
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-ptext" />
                  <span>Extracted Clinical Observations</span>
                </h2>
                <p className="text-[11px] text-muted">Field-level OCR extractions and reference bounds</p>
              </div>
            </div>

            <Async
              loading={extractions.loading && !extractions.data}
              error={extractions.error}
              onRetry={extractions.reload}
              empty={rows.length === 0}
              emptyNode={<EmptyState icon={FileSearch} title="No values extracted" body="The document could not be parsed into structured test codes." />}
              skeleton="table"
            >
              <Table>
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Reference</th>
                    <th>Confidence</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => {
                    const isDoctorVerified = r.status === "doctor_verified";
                    const isFlagged = r.flagged_wrong;
                    const isBusy = patchingId === r.observation_id;

                    return (
                      <tr
                        key={r.observation_id}
                        className={`transition ${r.low_confidence ? "bg-warn/5 hover:bg-warn/10" : "hover:bg-s2/40"}`}
                      >
                        <td className="font-bold text-ink uppercase">{r.test_code}</td>
                        <td className="num font-bold text-ptext">{r.value}</td>
                        <td className="text-muted text-xs">{r.unit || "—"}</td>
                        <td className="num text-xs text-muted">
                          {r.ref_low != null ? `${r.ref_low} – ${r.ref_high}` : "—"}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="num text-xs font-semibold">
                              {r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}
                            </span>
                            {r.low_confidence && <Chip kind="low" />}
                          </div>
                        </td>
                        <td className="text-right">
                          {isDoctorVerified ? (
                            <Chip kind="doctor" />
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              {isFlagged ? (
                                <span className="text-xs text-warn font-semibold flex items-center gap-1">
                                  <Flag className="h-3 w-3" /> Flagged
                                </span>
                              ) : (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="text-warn hover:bg-warn/10"
                                  busy={isBusy}
                                  onClick={() =>
                                    patchField(
                                      r.observation_id,
                                      { flag_wrong: true },
                                      `Flagged ${r.test_code} for manual doctor correction.`
                                    )
                                  }
                                >
                                  Flag Wrong
                                </Button>
                              )}

                              {r.status === "unverified" && !r.low_confidence && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  busy={isBusy}
                                  onClick={() =>
                                    patchField(
                                      r.observation_id,
                                      { patient_confirm: true },
                                      `Confirmed ${r.test_code} matches your paper scan.`
                                    )
                                  }
                                >
                                  Confirm
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Async>
          </Card>

          {/* OCR Raw Text Search & Inspection Card */}
          <Card className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" />
                <span>Search Extracted Raw Text</span>
              </h3>
              <input
                type="text"
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                placeholder="Filter OCR text..."
                className="rounded-input border border-line bg-s2/60 px-2.5 py-1 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
              />
            </div>
            <pre className="num max-h-48 overflow-y-auto whitespace-pre-wrap rounded-input bg-s2/40 p-3 text-xs text-muted font-mono leading-relaxed">
              {rawLines.length > 0 ? (
                rawLines.map((l: string, i: number) => <div key={i}>{l}</div>)
              ) : (
                <span className="text-muted/60">No matching text lines found.</span>
              )}
            </pre>
          </Card>
        </div>
      </div>

      {/* AI Plain-Language Explanation Panel */}
      {aiError && (
        <Card className="border-danger/40">
          <p className="text-xs text-danger flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {aiError}
          </p>
        </Card>
      )}

      {aiData?.emergency && (
        <EmergencyBanner text={aiData.guidance} />
      )}

      {aiData && !aiData.emergency && (
        <Card className="space-y-4 border-info/40 bg-gradient-to-br from-s1 to-info/5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-info" />
              <h2 className="text-base font-bold text-ink">AI Clinical Plain-Language Explanation</h2>
              <Chip kind="ai" />
            </div>
            <span className="text-xs text-muted">Deterministic Fact Extraction</span>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Extracted Facts:</p>
            {aiData.known_facts?.map((fact: any, i: number) => (
              <div key={i} className="rounded-input border border-line bg-s1 p-3 text-xs text-ink leading-relaxed">
                <span className="font-bold text-ptext">• </span>
                {fact.text}
              </div>
            ))}
          </div>

          {aiData.unknown?.length > 0 && (
            <div className="space-y-1 text-xs text-muted pt-2 border-t border-line/50">
              <p className="font-bold uppercase tracking-wider">Unverified or Ambiguous Fields:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {aiData.unknown.map((u: string, i: number) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          {aiData.sources?.length > 0 && (
            <div className="text-[11px] text-muted border-t border-line/50 pt-2">
              <b>Sources: </b>
              {aiData.sources.map((s: any) => `${s.title} (${s.date || "Recent"})`).join("; ")}
            </div>
          )}

          <div className="rounded-input border border-line/60 bg-s2/50 p-2 text-[11px] text-muted leading-relaxed">
            {aiData.disclaimer || "AI draft assistance only. No diagnosis or prescription provided. Always consult a licensed doctor."}
          </div>
        </Card>
      )}
    </div>
  );
}
