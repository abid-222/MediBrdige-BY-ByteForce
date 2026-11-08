"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSearch,
  FileText,
  Flag,
  Info,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
  X,
} from "lucide-react";
import { api, uploadWithProgress } from "@/lib/api";
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
  fmtDate,
  GlassCard,
  PageHeader,
  ProgressBar,
  StatTile,
  StepIndicator,
  Table,
  useToast,
  verChip,
} from "@/components/ui";
import { ReportViewer } from "@/components/ReportViewer";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXTS = [".pdf", ".jpg", ".jpeg", ".png"];

export default function OcrScannerPage() {
  useGuard(["patient"]);
  const { t, locale } = useI18n();
  const isBn = locale === "bn";
  const router = useRouter();
  const { addToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Workflow Steps: 0: Select File, 1: Uploading & OCR, 2: Review & AI Analysis
  const [currentStep, setCurrentStep] = useState<number>(0);

  // File & Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(null);

  // OCR Processing & Extracted Observations State
  const [ocrStatus, setOcrStatus] = useState<"idle" | "extracting" | "ready" | "error">("idle");
  const [pollCount, setPollCount] = useState<number>(0);
  const [extractionsData, setExtractionsData] = useState<any>(null);
  const [patchingId, setPatchingId] = useState<string | null>(null);

  // AI Explanation State
  const [aiData, setAiData] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  // Raw Text Filter State
  const [rawTextSearch, setRawTextSearch] = useState<string>("");

  // Validate File Helper
  const validateFile = (file: File): string | null => {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const isValidType = ALLOWED_MIME.includes(file.type) || ALLOWED_EXTS.includes(ext);

    if (!isValidType) {
      return "Unsupported file format. Only PDF, JPG, and PNG medical reports are supported by our OCR engine.";
    }
    if (file.size > MAX_BYTES) {
      return `File exceeds maximum size limit of 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
    }
    return null;
  };

  // Handle File Selection
  const handleFileChosen = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      addToast("error", "Invalid File", err);
      return;
    }
    setValidationError(null);
    setSelectedFile(file);
  };

  // Load verified test sample report
  const handleLoadSample = async (filename: string, displayName: string) => {
    try {
      setValidationError(null);
      const res = await fetch(`/sample_reports/${filename}`);
      if (!res.ok) throw new Error("Could not load sample file");
      const blob = await res.blob();
      const file = new File([blob], displayName, { type: "application/pdf" });
      setSelectedFile(file);
      addToast("success", "Sample Loaded", `${displayName} is ready to scan.`);
    } catch (e: any) {
      addToast("error", "Error loading sample", e.message);
    }
  };

  // Trigger Upload and Pipeline
  const startUploadPipeline = async () => {
    if (!selectedFile) return;
    setValidationError(null);
    setUploading(true);
    setUploadPercent(0);
    setCurrentStep(1);
    setOcrStatus("extracting");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await uploadWithProgress("/documents", formData, setUploadPercent, {
        "Idempotency-Key": `${selectedFile.name}-${selectedFile.size}-${selectedFile.lastModified}`,
      });

      const docId = response.id;
      setUploadedDocId(docId);
      addToast("success", "File Uploaded", "Document stored securely. OCR extraction in progress.");

      // Start Polling extractions
      pollExtractions(docId);
    } catch (e: any) {
      setValidationError(e.message || "Upload failed");
      setOcrStatus("error");
      setUploading(false);
      addToast("error", "Upload Failed", e.message);
    }
  };

  // Poll extractions until document status is completed or timeout
  const pollExtractions = async (docId: string) => {
    let attempts = 0;
    const maxAttempts = 15;

    const interval = setInterval(async () => {
      attempts++;
      setPollCount(attempts);
      try {
        const ext = await api(`/documents/${docId}/extractions`);
        if (ext && (ext.document_status === "processed" || ext.document_status === "completed")) {
          clearInterval(interval);
          setExtractionsData(ext);
          setOcrStatus("ready");
          setUploading(false);
          setCurrentStep(2);
          addToast("success", "OCR Extraction Complete", `Successfully extracted ${ext.rows?.length || 0} clinical observations.`);
          // Automatically trigger AI clinical explanation and doctor match
          requestAiExplanation(docId);
        } else if (ext && ext.document_status === "failed") {
          clearInterval(interval);
          setOcrStatus("error");
          setUploading(false);
          setValidationError(ext.message || "OCR processing failed for this report.");
          addToast("error", "OCR Failed", ext.message || "Could not parse document structure.");
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setExtractionsData(ext);
          setOcrStatus("ready");
          setUploading(false);
          setCurrentStep(2);
          requestAiExplanation(docId);
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setOcrStatus("error");
          setUploading(false);
        }
      }
    }, 1500);
  };

  // Field modification handler (Flag wrong or confirm value)
  const patchField = async (observationId: string, body: object, successMessage: string) => {
    if (!uploadedDocId) return;
    setPatchingId(observationId);
    try {
      await api(`/extractions/${uploadedDocId}/fields`, {
        method: "PATCH",
        body: { observation_id: observationId, ...body },
      });
      // Refresh extractions
      const updated = await api(`/documents/${uploadedDocId}/extractions`);
      setExtractionsData(updated);
      addToast("success", "Observation Updated", successMessage);
    } catch (e: any) {
      addToast("error", "Update Failed", e.message);
    } finally {
      setPatchingId(null);
    }
  };

  // AI Explain handler (automatic on extraction or manual re-analysis)
  const requestAiExplanation = async (targetId?: string) => {
    const docIdToUse = targetId || uploadedDocId;
    if (!docIdToUse) return;
    setAiBusy(true);
    setAiError("");
    try {
      const res = await api("/ai/report-explain", {
        body: { document_id: docIdToUse, lang: locale },
      });
      setAiData(res);
      addToast(
        "success",
        isBn ? "এআই ক্লিনিক্যাল রিপোর্ট তৈরি সম্পন্ন" : "AI Analysis Generated",
        isBn ? "স্বয়ংক্রিয় বিস্তারিত বিশ্লেষণ ও উপযুক্ত বিশেষজ্ঞ নির্ধারণ করা হয়েছে।" : "Plain-language summary & specialist match ready."
      );
    } catch (e: any) {
      setAiError(e.message || "AI service temporarily unavailable.");
    } finally {
      setAiBusy(false);
    }
  };

  // Auto-run AI explain if user lands on step 2 with an uploaded doc
  useEffect(() => {
    if (currentStep === 2 && uploadedDocId && !aiData && !aiBusy) {
      requestAiExplanation(uploadedDocId);
    }
  }, [currentStep, uploadedDocId]);

  // Filtered raw text lines
  const filteredRawLines = useMemo(() => {
    const raw = extractionsData?.raw_text || "";
    if (!raw) return [];
    return raw.split("\n").filter((line: string) => !rawTextSearch || line.toLowerCase().includes(rawTextSearch.toLowerCase()));
  }, [extractionsData?.raw_text, rawTextSearch]);

  const rows = extractionsData?.rows || [];
  const lowConfidenceRows = rows.filter((r: any) => r.low_confidence);
  const verifiedRows = rows.filter((r: any) => r.status === "doctor_verified");

  const stepsList = ["Select Report File", "Secure Upload & OCR", "Review, Corrections & AI"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <Link href="/reports">
          <button className="inline-flex items-center gap-2 rounded-lg border border-line bg-s1 px-3 py-1.5 text-xs font-semibold text-muted hover:bg-s2 hover:text-ink transition">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Reports Vault</span>
          </button>
        </Link>
        <span className="text-xs text-muted font-mono">
          Engine: PyMuPDF · Max 10MB
        </span>
      </div>

      <PageHeader
        title="OCR Medical Report Scanner"
        subtitle="Securely scan blood tests, CBC, lipid profiles, and diagnostic documents. Review extracted values side-by-side with your original scan and generate AI plain-language explanations."
      />

      {/* Workflow Step Tracker */}
      <StepIndicator steps={stepsList} current={currentStep} />

      {/* =========================================================
         STEP 0: SELECT OR CAPTURE MEDICAL REPORT
         ========================================================= */}
      {currentStep === 0 && (
        <div className="space-y-6 slide-up max-w-3xl mx-auto">
          {/* Drag & Drop Card */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/10 shadow-lg"
                : "border-line bg-s1/60 hover:border-primary/50"
            }`}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e: React.DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileChosen(file);
            }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm mb-4">
              <UploadCloud className="h-8 w-8" />
            </div>

            <h2 className="text-lg font-bold text-ink">Upload your Medical Report</h2>
            <p className="text-xs text-muted max-w-md mt-1 leading-relaxed">
              Drag and drop your laboratory report here, or choose from your computer or camera.
            </p>

            {/* Hidden native inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChosen(file);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChosen(file);
              }}
            />

            {/* Upload & Camera Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Button
                type="button"
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Browse Files
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-1.5" />
                Take Photo
              </Button>
            </div>

            {/* Allowed types badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6 text-[11px] text-muted">
              <span>Supported formats:</span>
              <span className="rounded bg-s2 px-2 py-0.5 font-mono font-semibold text-ink">PDF</span>
              <span className="rounded bg-s2 px-2 py-0.5 font-mono font-semibold text-ink">JPG / JPEG</span>
              <span className="rounded bg-s2 px-2 py-0.5 font-mono font-semibold text-ink">PNG</span>
              <span>· Max size: 10MB</span>
            </div>
          </div>

          {/* Sample Reports for 1-Click Testing */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-s1/90 via-psoft/20 to-s1/90 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-ptext" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-ptext">
                  {locale === "bn" ? "টেস্টিংয়ের জন্য রেডি মেডিকেল রিপোর্ট নমুনা (১-ক্লিক টেস্ট)" : "Ready Clinical Test Reports (1-Click Test)"}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-muted">A4 Clinical Standard</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {locale === "bn"
                ? "আপনার কাছে কোনো রিপোর্ট ফাইল না থাকলে নিচের নমুনাগুলো সরাসরি ডাউনলোড করুন অথবা ১-ক্লিক টেস্ট বাটনে চাপুন:"
                : "No report on hand? Click 'Test This Sample' to immediately load and process a verified clinical report:"}
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-s1 p-3 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                    <FileText className="h-3.5 w-3.5 text-ptext" />
                    <span>CBC Test (Normal)</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">Hb 14.2 g/dL, WBC 7.5, Platelet 250, RBC, MCV</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="xs" variant="primary" className="w-full text-[11px]" onClick={() => handleLoadSample("CBC_Test_Report_Normal.pdf", "CBC_Normal_Sample.pdf")}>
                    Test This
                  </Button>
                  <a href="/sample_reports/CBC_Test_Report_Normal.pdf" download="CBC_Test_Report_Normal.pdf" className="p-1 text-muted hover:text-ink" title="Download PDF">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-s1 p-3 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                    <FileText className="h-3.5 w-3.5 text-info" />
                    <span>Blood Glucose</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">Fasting 96 mg/dL & Post-Meal 138 mg/dL</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="xs" variant="primary" className="w-full text-[11px]" onClick={() => handleLoadSample("Blood_Glucose_Report.pdf", "Blood_Glucose_Sample.pdf")}>
                    Test This
                  </Button>
                  <a href="/sample_reports/Blood_Glucose_Report.pdf" download="Blood_Glucose_Report.pdf" className="p-1 text-muted hover:text-ink" title="Download PDF">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-s1 p-3 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                    <AlertTriangle className="h-3.5 w-3.5 text-warn" />
                    <span>CBC (Mild Anemia)</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">Hb 10.2 g/dL (Low), WBC 11.8 (High) — Alert</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="xs" variant="primary" className="w-full text-[11px]" onClick={() => handleLoadSample("CBC_Mild_Anemia_Report.pdf", "CBC_Anemia_Sample.pdf")}>
                    Test This
                  </Button>
                  <a href="/sample_reports/CBC_Mild_Anemia_Report.pdf" download="CBC_Mild_Anemia_Report.pdf" className="p-1 text-muted hover:text-ink" title="Download PDF">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="rounded-xl border border-danger/50 bg-danger/10 p-4 text-xs text-danger flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Selected File Card & Confirm Action */}
          {selectedFile && !validationError && (
            <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-primary/40 bg-psoft/20">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-onprimary shadow-sm font-bold uppercase text-xs">
                  {selectedFile.name.split(".").pop() || "FILE"}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-ink truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || "Document"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="rounded-lg border border-line p-2 text-muted hover:bg-s2 hover:text-ink transition"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={startUploadPipeline}
                >
                  Start OCR Extraction &rarr;
                </Button>
              </div>
            </Card>
          )}

          {/* Privacy & Security Note */}
          <div className="rounded-xl border border-line bg-s1 p-4 text-xs text-muted flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-ink">Patient Privacy Guarantee:</strong> Uploaded medical documents are stored using server-generated cryptographic keys under strict patient ownership. Only you and explicitly authorized physicians holding unexpired consent can view your records.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
         STEP 1: UPLOADING & OCR EXTRACTION IN PROGRESS
         ========================================================= */}
      {currentStep === 1 && (
        <Card className="text-center py-12 px-6 space-y-6 max-w-2xl mx-auto slide-up">
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-ink">
              {uploading && uploadPercent !== null && uploadPercent < 100
                ? "Securely Storing Document..."
                : "Running Automated OCR Pipeline..."}
            </h2>
            <p className="text-xs text-muted max-w-md mx-auto">
              Extracting text lines, matching test catalogs, parsing units, and calculating confidence boundaries.
            </p>
          </div>

          {/* Upload Progress Bar */}
          {uploadPercent !== null && uploadPercent < 100 && (
            <div className="space-y-1.5 max-w-sm mx-auto">
              <div className="flex justify-between text-xs text-muted">
                <span>Upload progress</span>
                <span className="font-mono">{uploadPercent}%</span>
              </div>
              <ProgressBar value={uploadPercent} max={100} />
            </div>
          )}

          {/* Extraction Polling Indicator */}
          {ocrStatus === "extracting" && (
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-s2 px-3 py-1 text-xs text-muted">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Analyzing document layers (check #{pollCount})...</span>
            </div>
          )}

          {ocrStatus === "error" && (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-xs text-danger space-y-2">
              <p className="font-bold flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Extraction Error
              </p>
              <p>{validationError || "Could not complete automated OCR extraction."}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedFile(null);
                }}
              >
                Try Another File
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* =========================================================
         STEP 2: REVIEW, OBSERVATION CORRECTIONS & AI EXPLANATION
         ========================================================= */}
      {currentStep === 2 && uploadedDocId && (
        <div className="space-y-6 slide-up">
          {/* Top Banner Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-s1 via-s1 to-psoft/20 p-4 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-ptext uppercase">
                  Extraction Ready
                </span>
                <span className="text-xs text-muted font-mono">ID: {uploadedDocId.slice(0, 8)}...</span>
              </div>
              <h2 className="text-base font-bold text-ink">
                Review Extracted Laboratory Observations
              </h2>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/v1/documents/${uploadedDocId}/summary-pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="secondary">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download Summary PDF
                </Button>
              </a>

              <Button
                size="sm"
                variant="primary"
                busy={aiBusy}
                onClick={requestAiExplanation}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {aiData ? "Re-analyze with AI" : "Explain with AI"}
              </Button>
            </div>
          </div>

          {/* Summary Stat Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              icon={FileText}
              label="Extracted Observations"
              value={rows.length}
              accent
            />
            <StatTile
              icon={FileCheck}
              label="Doctor Verified"
              value={verifiedRows.length}
              trend={verifiedRows.length === rows.length && rows.length > 0 ? "up" : "neutral"}
              trendLabel={verifiedRows.length === rows.length && rows.length > 0 ? "All verified" : "Pending consultation"}
            />
            <StatTile
              icon={FileSearch}
              label="Low Confidence OCR"
              value={lowConfidenceRows.length}
              trend={lowConfidenceRows.length > 0 ? "down" : "neutral"}
              trendLabel={lowConfidenceRows.length > 0 ? "Check against original" : "High confidence"}
            />
            <StatTile
              icon={Layers}
              label="Extractor Pipeline"
              value={extractionsData?.extractor_version || "PyMuPDF · v1"}
            />
          </div>

          {/* Low Confidence Warning Notice */}
          {lowConfidenceRows.length > 0 && (
            <GlassCard className="border-warn/40 flex items-start gap-3">
              <Info className="h-5 w-5 text-warn shrink-0 mt-0.5" />
              <div className="text-xs text-muted">
                <p className="font-semibold text-warn text-sm">Low Confidence OCR Alert</p>
                <p className="mt-0.5 leading-relaxed">
                  {lowConfidenceRows.length} observation(s) have an automated OCR confidence score below 80%. Verify them against your original scan. You can flag wrong values or confirm accurate extractions.
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
                    {isBn ? "এআই বিস্তারিত বিশ্লেষণ ও বিশেষজ্ঞ ডাক্তার ম্যাচিং চলছে..." : "Generating AI Clinical Summary & Matching Specialists..."}
                  </h3>
                  <p className="text-xs text-muted">
                    {isBn ? "ল্যাব টেস্টের ফলাফল বিশ্লেষণ করে স্বয়ংক্রিয় বিস্তারিত বিবরণী ও উপযুক্ত ডাক্তার নির্ধারণ করা হচ্ছে।" : "Cross-referencing verified observations against clinical specialty mappings and directory doctors."}
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
                      {aiData.matching_doctors.map((doc: any, i: number) => (
                        <div
                          key={doc.id || i}
                          className="flex flex-col justify-between rounded-xl border border-line bg-s2/40 p-3.5 hover:border-primary/50 transition shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-ptext font-bold text-xs">
                                Dr
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-ink truncate">{doc.name}</p>
                                <p className="text-[10px] text-muted truncate">{doc.specialty}</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted font-mono pt-1">{doc.qualifications}</p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-line/60">
                            <Button
                              size="xs"
                              variant="primary"
                              className="w-full text-xs font-semibold"
                              onClick={() => router.push(`/appointments?book=true&shareDoc=${uploadedDocId}&doctor=${doc.id}`)}
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
                    onClick={() => router.push(`/navigator?specialty=${aiData.recommended_specialty || "general_medicine"}&docId=${uploadedDocId}`)}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {isBn ? "এআই ডক্টর ফাইন্ডার (ML নেভিগেটর)" : "AI Doctor Finder (ML Triage)"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side: Original Document Preview vs Extracted Table */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Original Scan Preview */}
            <div className="lg:col-span-5 space-y-3">
              <Card className="h-full space-y-3 p-4">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                    <FileText className="h-4 w-4 text-ptext" />
                    <span>Original Document Preview</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted uppercase">Secure Vault</span>
                </div>
                <div className="min-h-[460px] rounded-input border border-line bg-s2/40 overflow-hidden">
                  <ReportViewer docId={uploadedDocId} mime={selectedFile?.type} />
                </div>
              </Card>
            </div>

            {/* Right: Extracted Observations Table */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="space-y-4 p-4">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-ptext" />
                      <span>Extracted Clinical Observations</span>
                    </h3>
                    <p className="text-[11px] text-muted">Click Flag Wrong or Confirm to maintain clinical accuracy</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <th>Test Code</th>
                        <th>Observed Value</th>
                        <th>Unit</th>
                        <th>Reference</th>
                        <th>Confidence</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r: any) => {
                        const isVerified = r.status === "doctor_verified";
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
                              {isVerified ? (
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
                                          `Flagged ${r.test_code} for doctor verification.`
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
                                          `Confirmed ${r.test_code} matches paper report.`
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
                </div>
              </Card>

              {/* Raw OCR Text Filter Box */}
              <Card className="space-y-3 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    <span>Raw OCR Extracted Text</span>
                  </h4>
                  <input
                    type="text"
                    value={rawTextSearch}
                    onChange={(e) => setRawTextSearch(e.target.value)}
                    placeholder="Filter OCR text..."
                    className="rounded-input border border-line bg-s2/60 px-2.5 py-1 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                  />
                </div>
                <pre className="num max-h-40 overflow-y-auto whitespace-pre-wrap rounded-input bg-s2/40 p-3 text-xs text-muted font-mono leading-relaxed">
                  {filteredRawLines.length > 0 ? (
                    filteredRawLines.map((l: string, i: number) => <div key={i}>{l}</div>)
                  ) : (
                    <span className="text-muted/60">No matching text lines.</span>
                  )}
                </pre>
              </Card>
            </div>
          </div>

          {/* Action Center (Doctor Referral, Booking, PDF) */}
          <div className="rounded-2xl border border-line bg-s1 p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-ink">Next Clinical Steps & Actions</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Action 1: Book Consultation with shared report */}
              <Button
                variant="primary"
                onClick={() => router.push(`/appointments?book=true&shareDoc=${uploadedDocId}`)}
              >
                <CalendarClock className="h-4 w-4 mr-1.5" />
                Request Doctor Review
              </Button>

              {/* Action 2: Find a Doctor */}
              <Link href="/directory" className="w-full">
                <Button variant="secondary" className="w-full">
                  <Stethoscope className="h-4 w-4 mr-1.5" />
                  Find Relevant Doctor
                </Button>
              </Link>

              {/* Action 3: Download PDF */}
              <a
                href={`/api/v1/documents/${uploadedDocId}/summary-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-1.5" />
                  Download Summary PDF
                </Button>
              </a>

              {/* Action 4: Scan Another Report */}
              <Button
                variant="ghost"
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedFile(null);
                  setUploadedDocId(null);
                  setExtractionsData(null);
                  setAiData(null);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Scan Another Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}