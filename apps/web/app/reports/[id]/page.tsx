"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSearch,
  FileText,
  Flag,
  Info,
  Layers,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
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
  useGuard(["patient", "doctor", "reviewer", "super_admin"]);
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

  const isBn = locale === "bn";

  // AI Explain handler (with automatic background invocation)
  const requestExplanation = async () => {
    if (!id) return;
    setAiBusy(true);
    setAiError("");
    try {
      const res = await api("/ai/report-explain", {
        body: { document_id: id, lang: locale },
      });
      setAiData(res);
      addToast(
        "success",
        isBn ? "এআই রিপোর্ট বিশ্লেষণ সম্পন্ন" : "AI Analysis Generated",
        isBn ? "স্বয়ংক্রিয় বিস্তারিত বিবরণী ও বিশেষজ্ঞ সুপারিশ প্রস্তুত।" : "Plain-language summary & specialist match ready."
      );
    } catch (e: any) {
      setAiError(e.message || "AI service temporarily unavailable.");
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

  // Auto-run AI explain on page load as soon as observations are available
  useEffect(() => {
    if (id && rows.length > 0 && !aiData && !aiBusy && !aiError) {
      requestExplanation();
    }
  }, [id, rows.length]);

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
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/v1/documents/${id}/summary-pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="secondary" icon={Download}>
                Download PDF
              </Button>
            </a>
            <Button
              size="sm"
              variant="outline"
              icon={CalendarClock}
              onClick={() => router.push(`/appointments?book=true&shareDoc=${id}`)}
            >
              Request Doctor Review
            </Button>
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

      {/* =========================================================
         AUTOMATIC AI CLINICAL SUMMARY & DOCTOR RECOMMENDATION
         ========================================================= */}
      {aiBusy && !aiData && (
        <Card className="p-5 border-primary/40 bg-gradient-to-r from-s1 via-psoft/10 to-s1 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-ptext">
              <Sparkles className="h-5 w-5 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-ink">
                {isBn ? "এআই বিস্তারিত বিশ্লেষণ ও বিশেষজ্ঞ ডাক্তার নির্ধারণ চলছে..." : "Generating AI Clinical Summary & Matching Specialists..."}
              </h3>
              <p className="text-xs text-muted">
                {isBn ? "ল্যাব টেস্টের ফলাফল বিশ্লেষণ করে স্বয়ংক্রিয় বিস্তারিত বিবরণী ও উপযুক্ত বিশেষজ্ঞ নির্ধারণ করা হচ্ছে।" : "Cross-referencing verified observations against clinical specialty mappings and directory doctors."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {aiError && (
        <Card className="border-danger/40 bg-danger/10 p-4">
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
        <div className="space-y-4">
          {/* 1. Plain-Language Summary Box */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-s1 via-s1 to-psoft/20 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),0_0_15px_var(--accent-glow)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-onprimary shadow-sm font-bold">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {isBn ? "এআই ক্লিনিক্যাল বিস্তারিত বিবরণী (AI Report Summary)" : "AI Clinical Intelligence Summary"}
                  </h3>
                  <p className="text-xs text-muted">
                    {isBn ? "ল্যাব টেস্টের সকল মানের উপর ভিত্তি করে সহজ বাংলায় বিশ্লেষণ" : "Autonomous plain-language clinical correlation"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-primary/40 bg-psoft px-3 py-1 text-[11px] font-bold text-ptext flex items-center gap-1.5 shadow-xs">
                  <Bot className="h-3.5 w-3.5" />
                  <span>{isBn ? "স্বয়ংক্রিয় এআই বিশ্লেষণ" : "Verified AI Analysis"}</span>
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-s2/60 p-4 text-xs text-ink leading-relaxed font-sans sm:text-sm">
              <p>{aiData.summary || "No automated summary available."}</p>
            </div>

            {/* Facts Bullet List */}
            {aiData.known_facts?.length > 0 && (
              <div className="mt-3.5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {isBn ? "মূল পর্যবেক্ষণসমূহ:" : "Clinical Observations:"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {aiData.known_facts.map((fact: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-line bg-s1/60 p-2.5 text-xs text-ink">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{fact.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Doctor Specialty Recommendation & 1-Click Match Cards */}
          <div className="rounded-2xl border border-line bg-s1 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/20 text-info font-bold">
                  <Stethoscope className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink">
                    {isBn ? "কোন ডাক্তার দেখানো উচিত? (এআই বিশেষজ্ঞ সুপারিশ)" : "Which Doctor Should You Consult?"}
                  </h4>
                  <p className="text-xs text-muted">
                    {isBn ? "ল্যাব টেস্টের ফলাফলের উপর ভিত্তি করে প্রস্তাবিত স্পেশালিস্ট" : "Specialist match calculated from laboratory findings"}
                  </p>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                aiData.urgency === "soon"
                  ? "border border-warn/40 bg-warn/15 text-warn"
                  : "border border-primary/40 bg-psoft text-ptext"
              }`}>
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {aiData.urgency === "soon"
                    ? (isBn ? "দ্রুত পরামর্শ জরুরি" : "Consultation Advised Soon")
                    : (isBn ? "নিয়মিত স্বাস্থ্য পরামর্শ" : "Routine Consultation")}
                </span>
              </span>
            </div>

            {/* Recommendation Reason Box */}
            <div className="rounded-xl border border-line bg-s2/40 p-3.5 flex items-start gap-3 text-xs text-ink">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-ptext">{aiData.doctor_recommendation}</p>
                <p className="mt-1 text-muted leading-relaxed">{aiData.recommendation_reason}</p>
              </div>
            </div>

            {/* Matching Doctors Grid */}
            {aiData.matching_doctors?.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  {isBn ? "প্রস্তাবিত ভেরিফায়েড বিশেষজ্ঞ চিকিৎসকবৃন্দ:" : "Recommended Verified Doctors in Network:"}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {aiData.matching_doctors.map((d: any, i: number) => (
                    <div
                      key={d.id || i}
                      className="flex flex-col justify-between rounded-xl border border-line bg-s2/40 p-3.5 hover:border-primary/50 transition shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-ptext font-bold text-xs">
                            Dr
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-ink truncate">{d.name}</p>
                            <p className="text-[10px] text-muted truncate">{d.specialty}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted font-mono pt-1">{d.qualifications}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-line/60">
                        <Button
                          size="xs"
                          variant="primary"
                          className="w-full text-xs font-semibold"
                          onClick={() => router.push(`/appointments?book=true&shareDoc=${id}&doctor=${d.id}`)}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          {isBn ? "অ্যাপয়েন্টমেন্ট নিন" : "Book Doctor"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Find More Doctors Action Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line/60">
              <p className="text-xs text-muted">
                {isBn ? "অন্যান্য হাসপাতাল বা নির্দিষ্ট লোকেশনে ডাক্তার খুঁজতে চান?" : "Looking for specific hospital chambers or doctors near you?"}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/navigator?specialty=${aiData.recommended_specialty || "general_medicine"}&docId=${id}`)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {isBn ? "এআই ডক্টর ফাইন্ডার (ML নেভিগেটর)" : "AI Doctor Finder (ML Triage)"}
              </Button>
            </div>
          </div>
        </div>
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
    </div>
  );
}
