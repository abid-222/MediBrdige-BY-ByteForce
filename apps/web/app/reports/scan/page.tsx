"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Bot,
  Calendar,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileCode,
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
  Trash2,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { api, uploadWithProgress } from "@/lib/api";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Button,
  Card,
  Chip,
  EmergencyBanner,
  GlassCard,
  ProgressBar,
  StatTile,
  Table,
  useToast,
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
      return isBn
        ? "অনুপযুক্ত ফাইল ফরম্যাট। আমাদের ওসিআর ইঞ্জিন শুধুমাত্র PDF, JPG ও PNG রিপোর্ট সমর্থন করে।"
        : "Unsupported file format. Only PDF, JPG, and PNG medical reports are supported by our OCR engine.";
    }
    if (file.size > MAX_BYTES) {
      return isBn
        ? `ফাইলের আকার সর্বোচ্চ সীমা ১০ মেগাবাইট অতিক্রম করেছে (${(file.size / (1024 * 1024)).toFixed(1)}MB)।`
        : `File exceeds maximum size limit of 10MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
    }
    return null;
  };

  // Handle File Selection
  const handleFileChosen = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      addToast("error", isBn ? "ফাইল ত্রুটি" : "Invalid File", err);
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
      addToast(
        "success",
        isBn ? "নমুনা লোড সম্পন্ন" : "Sample Loaded",
        isBn ? `${displayName} স্ক্যান করার জন্য প্রস্তুত।` : `${displayName} is ready to scan.`
      );
    } catch (e: any) {
      addToast("error", isBn ? "নমুনা লোড ব্যর্থ" : "Error loading sample", e.message);
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
      addToast(
        "success",
        isBn ? "ফাইল সংরক্ষিত" : "File Uploaded",
        isBn ? "ডকুমেন্ট নিরাপদে সংরক্ষিত। ওসিআর প্রসেসিং চলছে..." : "Document stored securely. OCR extraction in progress."
      );

      // Start Polling extractions
      pollExtractions(docId);
    } catch (e: any) {
      setValidationError(e.message || "Upload failed");
      setOcrStatus("error");
      setUploading(false);
      addToast("error", isBn ? "আপলোড ব্যর্থ" : "Upload Failed", e.message);
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
          addToast(
            "success",
            isBn ? "ওসিআর নিষ্কাশন সম্পন্ন" : "OCR Extraction Complete",
            isBn ? `সফলভাবে ${ext.rows?.length || 0}টি ক্লিনিক্যাল মান নিষ্কাশিত হয়েছে।` : `Successfully extracted ${ext.rows?.length || 0} clinical observations.`
          );
          // Automatically trigger AI clinical explanation and doctor match
          requestAiExplanation(docId);
        } else if (ext && ext.document_status === "failed") {
          clearInterval(interval);
          setOcrStatus("error");
          setUploading(false);
          setValidationError(ext.message || "OCR processing failed for this report.");
          addToast("error", isBn ? "ওসিআর ব্যর্থ" : "OCR Failed", ext.message || "Could not parse document structure.");
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
      addToast("success", isBn ? "আপডেট সম্পন্ন" : "Observation Updated", successMessage);
    } catch (e: any) {
      addToast("error", isBn ? "আপডেট ব্যর্থ" : "Update Failed", e.message);
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
        isBn ? "এআই ক্লিনিক্যাল রিপোর্ট প্রস্তুত" : "AI Analysis Generated",
        isBn ? "স্বয়ংক্রিয় বিস্তারিত বিবরণী ও উপযুক্ত বিশেষজ্ঞ ডাক্তার তালিকা তৈরি সম্পন্ন।" : "Plain-language summary & specialist match ready."
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-3 sm:px-6">
      {/* =========================================================
         TOP NAVIGATION & BADGES BAR
         ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 pb-4">
        <Link href="/reports">
          <button className="group inline-flex items-center gap-2 rounded-xl border border-line bg-s1/80 px-3.5 py-1.5 text-xs font-semibold text-muted hover:bg-s2 hover:text-ink hover:border-primary/40 transition-all shadow-xs">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>{isBn ? "সকল রিপোর্ট ভল্টে ফিরে যান" : "Back to Medical Reports Vault"}</span>
          </button>
        </Link>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-ptext font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            Neural OCR v2.4 Active
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-line bg-s1 px-2.5 py-1 text-[11px] text-muted font-mono">
            <Lock className="h-3 w-3 text-primary" />
            <span>256-Bit Encrypted</span>
          </span>
        </div>
      </div>

      {/* =========================================================
         HERO BANNER SECTION
         ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-s1 via-s1/90 to-primary/10 p-6 sm:p-8 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.6),0_0_20px_var(--accent-glow)]">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-psoft px-3.5 py-1 text-xs font-bold text-ptext shadow-xs">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>{isBn ? "স্মার্ট ক্লিনিক্যাল ভিশন সিস্টেম" : "Clinical Vision & Extraction Engine"}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-ink font-heading">
              {isBn ? (
                <>মেডিকেল রিপোর্ট <span className="text-ptext">স্মার্ট ওসিআর স্ক্যানার</span></>
              ) : (
                <>OCR Medical Report <span className="text-ptext">Scanner & AI Insights</span></>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {isBn
                ? "ব্লাড টেস্ট, সিবিসি, লিপিড প্রোফাইল ও প্রেসক্রিপশন স্ক্যান করুন। কৃত্রিম বুদ্ধিমত্তা স্বয়ংক্রিয়ভাবে ক্লিনিক্যাল ভ্যালু নিখুঁতভাবে বের করে সাধারণ বাংলায় ফলাফল ও বিশেষজ্ঞ ডাক্তার সুপারিশ প্রদর্শন করে।"
                : "Securely scan blood panels, CBC, lipid profiles, and diagnostic documents. Neural OCR extracts clinical observations side-by-side with your original scan and generates instant AI physician explanations."}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted">
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {isBn ? "স্বয়ংক্রিয় টেবিল শনাক্তকরণ" : "Tabular Multiline Detection"}
              </span>
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <Stethoscope className="h-4 w-4 text-info" />
                {isBn ? "স্পেশালিস্ট ডক্টর ম্যাচিং" : "Specialist Triage Match"}
              </span>
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {isBn ? "১০০% রোগী-নিয়ন্ত্রিত গোপনীয়তা" : "Zero-Trust Privacy"}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center justify-center p-6 rounded-2xl border border-line bg-s2/60 backdrop-blur-md text-center shrink-0 w-64 shadow-inner">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/40 text-ptext shadow-[0_0_20px_var(--accent-glow)] mb-3">
              <Bot className="h-8 w-8" />
            </div>
            <p className="text-xs font-bold text-ink uppercase tracking-wider">AI Medical Intelligence</p>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Powered by PyMuPDF + Gemini Vision OCR Multimodal Engine
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
         3-STEP PIPELINE PROGRESS BAR (Replaces 1, 2, 3 circles)
         ========================================================= */}
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-s1 via-s1 to-s2/40 p-5 sm:p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),0_0_15px_var(--accent-glow)] space-y-4">
        {/* Header with Active Step Title & Total Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-ptext font-mono font-bold text-sm shadow-xs border border-primary/30">
              {currentStep === 2 ? <Check className="h-5 w-5 text-primary" /> : `${currentStep + 1}/3`}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ptext font-mono">
                  {isBn ? "পাইপলাইন অগ্রগতি" : "Pipeline Progress"}
                </span>
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span className="text-[10px] font-mono text-muted">
                  {currentStep === 0
                    ? (isBn ? "ধাপ ১ এর ৩" : "Step 1 of 3")
                    : currentStep === 1
                    ? (isBn ? "ধাপ ২ এর ৩" : "Step 2 of 3")
                    : (isBn ? "ধাপ ৩ এর ৩" : "Step 3 of 3")}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-ink">
                {currentStep === 0
                  ? (isBn ? "১. রিপোর্ট নির্বাচন ও প্রি-ফ্লাইট ভ্যালিডেশন" : "1. Report Selection & Pre-flight Validation")
                  : currentStep === 1
                  ? (isBn ? "২. নিউরাল ওসিআর টেবিল ও মান নিষ্কাশন" : "2. Neural OCR Tabular Extraction")
                  : (isBn ? "৩. ক্লিনিক্যাল পর্যালোচনা ও এআই ডাক্তার ম্যাচিং" : "3. Clinical Observations & AI Specialist Triage")}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <span className="text-lg font-black font-mono text-ptext">
                {currentStep === 0 ? "33%" : currentStep === 1 ? "66%" : "100%"}
              </span>
              <p className="text-[10px] text-muted font-mono">
                {currentStep === 0
                  ? (isBn ? "ফাইল বাছাই" : "Select Phase")
                  : currentStep === 1
                  ? (isBn ? "ওসিআর প্রসেসিং" : "OCR Engine")
                  : (isBn ? "সম্পন্ন" : "Finalized")}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              currentStep === 2
                ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                : "border border-line bg-s2 text-muted"
            }`}>
              {currentStep === 2 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>{isBn ? "সম্পূর্ণ প্রস্তুত" : "Ready"}</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                  <span>{isBn ? "চলমান" : "In Progress"}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Continuous Multi-Segment Progress Bar Track */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-s2 border border-line/80 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-emerald-400 to-teal-300 shadow-[0_0_14px_var(--accent-glow)] transition-all duration-700 ease-out"
            style={{
              width: currentStep === 0 ? "33.33%" : currentStep === 1 ? "66.66%" : "100%",
            }}
          />
        </div>

        {/* 3 Step Interactive Progress Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Step 1 Card */}
          <div
            className={`rounded-2xl border p-3.5 transition-all duration-200 ${
              currentStep === 0
                ? "border-primary/60 bg-gradient-to-b from-primary/15 to-s1 shadow-[0_0_15px_var(--accent-glow)] ring-1 ring-primary/40"
                : currentStep > 0
                ? "border-primary/30 bg-s1/90"
                : "border-line bg-s2/30 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  currentStep > 0
                    ? "bg-primary text-onprimary"
                    : currentStep === 0
                    ? "bg-primary/20 text-ptext"
                    : "bg-s2 text-muted"
                }`}>
                  {currentStep > 0 ? <Check className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
                </span>
                <span className="text-xs font-bold text-ink">
                  {isBn ? "ধাপ ১: রিপোর্ট আপলোড" : "Step 1: Upload"}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase ${
                currentStep > 0 ? "text-primary" : currentStep === 0 ? "text-ptext" : "text-muted"
              }`}>
                {currentStep > 0 ? (isBn ? "সম্পন্ন" : "Done") : currentStep === 0 ? (isBn ? "সক্রিয়" : "Active") : (isBn ? "অপেক্ষমাণ" : "Pending")}
              </span>
            </div>
            <p className="text-[11px] text-muted leading-snug">
              {isBn ? "পিডিএফ বা ক্যামেরা রিপোর্ট ফাইল বাছাই" : "Select PDF document or paper scan"}
            </p>
            {/* Step 1 Sub-progress bar */}
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-s2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentStep >= 0 ? "bg-primary w-full shadow-[0_0_8px_var(--accent-glow)]" : "w-0"
                }`}
              />
            </div>
          </div>

          {/* Step 2 Card */}
          <div
            className={`rounded-2xl border p-3.5 transition-all duration-200 ${
              currentStep === 1
                ? "border-primary/60 bg-gradient-to-b from-primary/15 to-s1 shadow-[0_0_15px_var(--accent-glow)] ring-1 ring-primary/40"
                : currentStep > 1
                ? "border-primary/30 bg-s1/90"
                : "border-line bg-s2/30 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  currentStep > 1
                    ? "bg-primary text-onprimary"
                    : currentStep === 1
                    ? "bg-primary/20 text-ptext animate-pulse"
                    : "bg-s2 text-muted"
                }`}>
                  {currentStep > 1 ? (
                    <Check className="h-4 w-4" />
                  ) : currentStep === 1 ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Layers className="h-4 w-4" />
                  )}
                </span>
                <span className="text-xs font-bold text-ink">
                  {isBn ? "ধাপ ২: নিউরাল ওসিআর" : "Step 2: Neural OCR"}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase ${
                currentStep > 1 ? "text-primary" : currentStep === 1 ? "text-ptext" : "text-muted"
              }`}>
                {currentStep > 1 ? (isBn ? "সম্পন্ন" : "Done") : currentStep === 1 ? (isBn ? "চলমান..." : "Extracting") : (isBn ? "অপেক্ষমাণ" : "Pending")}
              </span>
            </div>
            <p className="text-[11px] text-muted leading-snug">
              {isBn ? "PyMuPDF ও জেমিনি ভিশন এক্সট্রাকশন" : "PyMuPDF & Gemini Vision extraction"}
            </p>
            {/* Step 2 Sub-progress bar */}
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-s2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentStep > 1
                    ? "bg-primary w-full shadow-[0_0_8px_var(--accent-glow)]"
                    : currentStep === 1
                    ? "bg-primary w-2/3 animate-pulse"
                    : "w-0"
                }`}
              />
            </div>
          </div>

          {/* Step 3 Card */}
          <div
            className={`rounded-2xl border p-3.5 transition-all duration-200 ${
              currentStep === 2
                ? "border-primary/60 bg-gradient-to-b from-primary/15 to-s1 shadow-[0_0_15px_var(--accent-glow)] ring-1 ring-primary/40"
                : "border-line bg-s2/30 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  currentStep === 2
                    ? "bg-primary text-onprimary shadow-xs"
                    : "bg-s2 text-muted"
                }`}>
                  {currentStep === 2 ? <Sparkles className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                </span>
                <span className="text-xs font-bold text-ink">
                  {isBn ? "ধাপ ৩: এআই ও স্পেশালিস্ট" : "Step 3: AI & Doctors"}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase ${
                currentStep === 2 ? "text-primary" : "text-muted"
              }`}>
                {currentStep === 2 ? (isBn ? "প্রস্তুত" : "Ready") : (isBn ? "চূড়ান্ত ধাপ" : "Final")}
              </span>
            </div>
            <p className="text-[11px] text-muted leading-snug">
              {isBn ? "ক্লিনিক্যাল সামারি ও ১-ক্লিক ডক্টর বুকিং" : "Clinical summary & 1-click booking"}
            </p>
            {/* Step 3 Sub-progress bar */}
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-s2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentStep === 2 ? "bg-primary w-full shadow-[0_0_8px_var(--accent-glow)]" : "w-0"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
         STEP 0: SELECT OR CAPTURE MEDICAL REPORT
         ========================================================= */}
      {currentStep === 0 && (
        <div className="space-y-8 slide-up max-w-4xl mx-auto">
          {/* Main Upload Dropzone */}
          <div
            className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-14 text-center transition-all duration-300 ${
              dragActive
                ? "border-primary bg-primary/10 shadow-[0_0_30px_var(--accent-glow)] scale-[1.01]"
                : "border-line/80 bg-s1/70 hover:border-primary/60 hover:bg-s1 hover:shadow-lg"
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
            {/* Pulsing Aura Behind Icon */}
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl group-hover:bg-primary/30 transition-all" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/40 bg-gradient-to-tr from-s1 to-psoft text-ptext shadow-md">
                <UploadCloud className="h-10 w-10 transition-transform group-hover:scale-110" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight font-heading">
              {isBn ? "মেডিকেল রিপোর্ট ফাইল আপলোড করুন" : "Upload your Clinical Lab Report"}
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-lg mt-2 leading-relaxed">
              {isBn
                ? "কম্পিউটার বা মোবাইল থেকে রিপোর্ট ফাইলটি এখানে টেনে এনে ছাড়ুন, অথবা সরাসরি ক্যামেরা দিয়ে ছবি তুলুন।"
                : "Drag and drop your diagnostic PDF report, high-resolution photo, or capture a live paper scan."}
            </p>

            {/* Hidden Native File Inputs */}
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

            {/* Action Buttons: Browse vs Camera */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 mt-7">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="font-semibold shadow-[0_0_20px_var(--accent-glow)]"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-1.5" />
                {isBn ? "ফাইল বাছাই করুন" : "Browse Device Files"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-1.5 text-ptext" />
                {isBn ? "ক্যামেরা দিয়ে তুলুন" : "Capture with Camera"}
              </Button>
            </div>

            {/* Supported Formats Pill Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8 text-xs text-muted">
              <span className="font-medium text-ink/80">{isBn ? "সমর্থিত ফরম্যাট:" : "Supported Standards:"}</span>
              <span className="rounded-lg border border-line bg-s2/80 px-2.5 py-1 font-mono font-semibold text-ink text-[11px]">
                PDF Document
              </span>
              <span className="rounded-lg border border-line bg-s2/80 px-2.5 py-1 font-mono font-semibold text-ink text-[11px]">
                JPG / JPEG
              </span>
              <span className="rounded-lg border border-line bg-s2/80 px-2.5 py-1 font-mono font-semibold text-ink text-[11px]">
                PNG High-Res
              </span>
              <span className="text-[11px] text-muted">· Max 10 MB</span>
            </div>
          </div>

          {/* Selected File Card & Confirm Trigger */}
          {selectedFile && !validationError && (
            <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-gradient-to-r from-s1 via-psoft/15 to-s1 p-5 shadow-[0_0_25px_var(--accent-glow)] slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-onprimary font-black uppercase text-sm shadow-sm">
                    {selectedFile.name.split(".").pop() || "FILE"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm sm:text-base text-ink truncate">{selectedFile.name}</p>
                      <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-ptext uppercase">
                        Ready
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || "Document"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="rounded-xl border border-line/80 bg-s1 p-2.5 text-muted hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition shadow-xs"
                    title="Remove file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="font-bold shadow-[0_0_25px_var(--accent-glow)]"
                    onClick={startUploadPipeline}
                  >
                    <span>{isBn ? "ওসিআর স্ক্যান শুরু করুন" : "Start Deep OCR Extraction"}</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="rounded-2xl border border-danger/50 bg-danger/10 p-4 text-xs text-danger flex items-center gap-3 slide-up">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* Sample Reports for 1-Click Testing Laboratory */}
          <div className="rounded-3xl border border-line bg-gradient-to-b from-s1 to-s2/40 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-ptext">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                    {isBn ? "টেস্টিং ল্যাবরেটরি: প্রস্তুত মেডিকেল রিপোর্ট নমুনা" : "1-Click Testing Clinical Samples"}
                  </h3>
                  <p className="text-[11px] text-muted">
                    {isBn ? "তাৎক্ষণিক পরীক্ষার জন্য নিচে ১-ক্লিক টেস্ট চাপুন" : "Click any verified standard sample below to immediately test the neural extraction"}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-line bg-s1 px-2.5 py-0.5 text-[10px] font-mono text-muted self-start sm:self-auto">
                A4 Diagnostic Format
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              {/* Sample 1: Normal CBC */}
              <div className="group rounded-2xl border border-line bg-s1 p-4 flex flex-col justify-between space-y-3 hover:border-primary/50 hover:shadow-md transition">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-ptext uppercase">
                      Normal Result
                    </span>
                    <FileText className="h-4 w-4 text-ptext" />
                  </div>
                  <h4 className="font-bold text-xs text-ink group-hover:text-ptext transition">
                    Complete Blood Count (CBC)
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed font-mono">
                    Hb 14.2 g/dL · WBC 7.5 · Platelet 250k · RBC 4.8 · MCV 88
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                  <Button
                    size="xs"
                    variant="primary"
                    className="w-full text-xs font-semibold"
                    onClick={() => handleLoadSample("CBC_Test_Report_Normal.pdf", "CBC_Normal_Sample.pdf")}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {isBn ? "১-ক্লিক টেস্ট" : "Test This"}
                  </Button>
                  <a
                    href="/sample_reports/CBC_Test_Report_Normal.pdf"
                    download="CBC_Test_Report_Normal.pdf"
                    className="rounded-lg border border-line p-1.5 text-muted hover:text-ink hover:bg-s2 transition"
                    title="Download Sample PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Sample 2: Blood Glucose */}
              <div className="group rounded-2xl border border-line bg-s1 p-4 flex flex-col justify-between space-y-3 hover:border-info/50 hover:shadow-md transition">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-info/15 px-2 py-0.5 text-[10px] font-bold text-info uppercase">
                      Endocrinology
                    </span>
                    <Activity className="h-4 w-4 text-info" />
                  </div>
                  <h4 className="font-bold text-xs text-ink group-hover:text-info transition">
                    Blood Glucose Panel
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed font-mono">
                    Fasting 96 mg/dL · Post-Meal 138 mg/dL · Clinical Reference
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                  <Button
                    size="xs"
                    variant="primary"
                    className="w-full text-xs font-semibold"
                    onClick={() => handleLoadSample("Blood_Glucose_Report.pdf", "Blood_Glucose_Sample.pdf")}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {isBn ? "১-ক্লিক টেস্ট" : "Test This"}
                  </Button>
                  <a
                    href="/sample_reports/Blood_Glucose_Report.pdf"
                    download="Blood_Glucose_Report.pdf"
                    className="rounded-lg border border-line p-1.5 text-muted hover:text-ink hover:bg-s2 transition"
                    title="Download Sample PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Sample 3: Mild Anemia */}
              <div className="group rounded-2xl border border-line bg-s1 p-4 flex flex-col justify-between space-y-3 hover:border-warn/50 hover:shadow-md transition">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-warn/15 px-2 py-0.5 text-[10px] font-bold text-warn uppercase">
                      Alert Finding
                    </span>
                    <AlertTriangle className="h-4 w-4 text-warn" />
                  </div>
                  <h4 className="font-bold text-xs text-ink group-hover:text-warn transition">
                    CBC with Mild Anemia
                  </h4>
                  <p className="text-[11px] text-muted leading-relaxed font-mono">
                    Hb 10.2 g/dL (Low) · WBC 11.8 (High) · Triggers AI Urgency
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                  <Button
                    size="xs"
                    variant="primary"
                    className="w-full text-xs font-semibold"
                    onClick={() => handleLoadSample("CBC_Mild_Anemia_Report.pdf", "CBC_Anemia_Sample.pdf")}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {isBn ? "১-ক্লিক টেস্ট" : "Test This"}
                  </Button>
                  <a
                    href="/sample_reports/CBC_Mild_Anemia_Report.pdf"
                    download="CBC_Mild_Anemia_Report.pdf"
                    className="rounded-lg border border-line p-1.5 text-muted hover:text-ink hover:bg-s2 transition"
                    title="Download Sample PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Zero-Trust Notice */}
          <div className="rounded-2xl border border-line bg-s1/60 p-4 text-xs text-muted flex items-start gap-3.5">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-ink">
                {isBn ? "রোগীর তথ্য গোপনীয়তা ও ডেটা সুরক্ষার নিশ্চয়তা" : "Patient Privacy & Cryptographic Safety Guarantee"}
              </p>
              <p className="leading-relaxed">
                {isBn
                  ? "আপনার আপলোড করা প্রতিটি মেডিকেল ডকুমেন্ট সার্ভার-জেনারেটেড এনক্রিপশন কি দ্বারা সংরক্ষিত থাকে। আপনার স্পষ্ট সম্মতি ছাড়া অন্য কোনো ব্যক্তি বা তৃতীয় পক্ষ এই তথ্য দেখতে পারে না।"
                  : "All uploaded medical diagnostic files are encrypted at rest with server-isolated cryptographic keys. Only you and licensed physicians holding explicit, unexpired consent tokens can inspect clinical observations."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
         STEP 1: UPLOADING & NEURAL OCR PIPELINE ANIMATION
         ========================================================= */}
      {currentStep === 1 && (
        <Card className="text-center py-14 px-6 space-y-8 max-w-2xl mx-auto slide-up border-primary/40 bg-gradient-to-b from-s1 via-s1 to-psoft/10 shadow-[0_0_30px_var(--accent-glow)]">
          {/* Multi-ring Futuristic Scanner Core */}
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-dashed border-primary/30 animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-2 rounded-full border-2 border-primary border-t-transparent animate-[spin_2s_linear_infinite]" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-ptext shadow-[0_0_20px_var(--accent-glow)]">
              <Sparkles className="h-8 w-8 animate-pulse text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-ink font-heading">
              {uploading && uploadPercent !== null && uploadPercent < 100
                ? (isBn ? "ডকুমেন্ট নিরাপদে সার্ভারে পাঠানো হচ্ছে..." : "Encrypting & Storing Document...")
                : (isBn ? "নিউরাল ওসিআর পাইপলাইন বিশ্লেষণ চলছে..." : "Running Neural OCR Pipeline...")}
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
              {isBn
                ? "টেক্সট ও টেবিল ডিকনস্ট্রাকশন, টেস্ট ক্যাটালগ ম্যাপিং এবং রেফারেন্স ভ্যালু কনফিডেন্স যাচাই করা হচ্ছে।"
                : "Extracting tabular data, calculating Loinc standard codes, and mapping confidence boundaries."}
            </p>
          </div>

          {/* Upload Progress Bar */}
          {uploadPercent !== null && uploadPercent < 100 && (
            <div className="space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-xs text-muted font-mono">
                <span>{isBn ? "আপলোড অগ্রগতি" : "Upload progress"}</span>
                <span>{uploadPercent}%</span>
              </div>
              <ProgressBar value={uploadPercent} max={100} />
            </div>
          )}

          {/* Stepped Checklist Indicators */}
          <div className="max-w-md mx-auto text-left space-y-2.5 rounded-2xl border border-line bg-s2/40 p-4 text-xs font-mono">
            <div className="flex items-center gap-2.5 text-ptext">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{isBn ? "১. ক্রিপ্টোগ্রাফিক চেকসাম ও অ্যান্টি-ট্যাম্পার যাচাই" : "1. Cryptographic checksum & anti-tamper pass"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-ptext">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{isBn ? "২. PyMuPDF মাল্টিলাইন ভেক্টর লেয়ার এক্সট্রাকশন" : "2. PyMuPDF multiline column & table reconstruction"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-ink">
              <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <span>{isBn ? `৩. টেস্ট ক্যাটালগ ও জেমিনি ভিশন সিন্থেসিস (চেক #${pollCount})` : `3. Clinical catalog match & Gemini Vision fallback (check #${pollCount})`}</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{isBn ? "৪. এআই চিকিৎসাগত বিশ্লেষণ ও উপযুক্ত স্পেশালিস্ট ম্যাচিং" : "4. AI plain-language summary & specialist match"}</span>
            </div>
          </div>

          {ocrStatus === "error" && (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 p-5 text-xs text-danger space-y-3">
              <p className="font-bold flex items-center justify-center gap-2 text-sm">
                <AlertTriangle className="h-5 w-5" />
                {isBn ? "ওসিআর এক্সট্রাকশন ত্রুটি" : "Extraction Error"}
              </p>
              <p className="leading-relaxed">{validationError || "Could not complete automated OCR extraction."}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedFile(null);
                }}
              >
                {isBn ? "অন্য ফাইল দিয়ে চেষ্টা করুন" : "Try Another File"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* =========================================================
         STEP 2: REVIEW, OBSERVATION CORRECTIONS & AI EXPLANATION
         ========================================================= */}
      {currentStep === 2 && uploadedDocId && (
        <div className="space-y-8 slide-up">
          {/* Top Status & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-primary/40 bg-gradient-to-r from-s1 via-s1 to-psoft/20 p-5 shadow-[0_0_20px_var(--accent-glow)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-ptext uppercase tracking-wider">
                  {isBn ? "এক্সট্রাকশন প্রস্তুত" : "Extraction Ready"}
                </span>
                <span className="text-xs text-muted font-mono">ID: {uploadedDocId.slice(0, 10)}...</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-ink font-heading">
                {isBn ? "নিষ্কাশিত ল্যাব টেস্ট পর্যবেক্ষণ ও ফলাফল" : "Review Extracted Laboratory Observations"}
              </h2>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`/api/v1/documents/${uploadedDocId}/summary-pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="secondary">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {isBn ? "পিডিএফ ডাউনলোড" : "Download Summary PDF"}
                </Button>
              </a>

              <Button
                size="sm"
                variant="primary"
                busy={aiBusy}
                onClick={() => requestAiExplanation(uploadedDocId)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {aiData ? (isBn ? "পুনরায় এআই বিশ্লেষণ" : "Re-analyze with AI") : (isBn ? "এআই বিস্তারিত দেখুন" : "Explain with AI")}
              </Button>
            </div>
          </div>

          {/* Summary Stat Tiles Grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <StatTile
              icon={FileText}
              label={isBn ? "মোট পর্যবেক্ষণ" : "Extracted Observations"}
              value={rows.length}
              accent
            />
            <StatTile
              icon={FileCheck}
              label={isBn ? "ডাক্তার দ্বারা যাচাইকৃত" : "Doctor Verified"}
              value={verifiedRows.length}
              trend={verifiedRows.length === rows.length && rows.length > 0 ? "up" : "neutral"}
              trendLabel={verifiedRows.length === rows.length && rows.length > 0 ? (isBn ? "সম্পূর্ণ যাচাইকৃত" : "All verified") : (isBn ? "পেন্ডিং পরামর্শ" : "Pending consultation")}
            />
            <StatTile
              icon={FileSearch}
              label={isBn ? "কম কনফিডেন্স মান" : "Low Confidence OCR"}
              value={lowConfidenceRows.length}
              trend={lowConfidenceRows.length > 0 ? "down" : "neutral"}
              trendLabel={lowConfidenceRows.length > 0 ? (isBn ? "মূল স্ক্যানের সাথে মেলান" : "Review against scan") : (isBn ? "উচ্চ নির্ভুলতা" : "High accuracy")}
            />
            <StatTile
              icon={Layers}
              label={isBn ? "ওসিআর ইঞ্জিন" : "Extractor Pipeline"}
              value={extractionsData?.extractor_version || "PyMuPDF · v1"}
            />
          </div>

          {/* Low Confidence Warning Notice */}
          {lowConfidenceRows.length > 0 && (
            <GlassCard className="border-warn/40 flex items-start gap-3.5">
              <AlertCircle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
              <div className="text-xs text-muted">
                <p className="font-bold text-warn text-sm">
                  {isBn ? "স্বল্প কনফিডেন্স ওসিআর সতর্কতা" : "Low Confidence OCR Review Advised"}
                </p>
                <p className="mt-0.5 leading-relaxed">
                  {isBn
                    ? `${lowConfidenceRows.length}টি ক্লিনিক্যাল মানের কনফিডেন্স ৮০%-এর নিচে। অনুগ্রহ করে মূল স্ক্যানের সাথে মিলিয়ে ভুল হলে 'ভুল চিহ্নিত' বাটনে চাপুন অথবা 'নিশ্চিত করুন'।`
                    : `${lowConfidenceRows.length} observation(s) scored below 80% extraction confidence. Cross-reference them with your original document preview below.`}
                </p>
              </div>
            </GlassCard>
          )}

          {/* =========================================================
             AUTOMATIC AI CLINICAL SUMMARY & DOCTOR RECOMMENDATION
             ========================================================= */}
          {aiBusy && !aiData && (
            <Card className="p-6 border-primary/40 bg-gradient-to-r from-s1 via-psoft/15 to-s1 animate-pulse rounded-3xl shadow-[0_0_20px_var(--accent-glow)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-ptext">
                  <Sparkles className="h-6 w-6 animate-spin text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-ink">
                    {isBn ? "এআই বিস্তারিত বিশ্লেষণ ও বিশেষজ্ঞ ডাক্তার ম্যাচিং চলছে..." : "Generating AI Clinical Summary & Matching Specialists..."}
                  </h3>
                  <p className="text-xs text-muted">
                    {isBn ? "ল্যাব টেস্টের ফলাফল বিশ্লেষণ করে স্বয়ংক্রিয় সারসংক্ষেপ ও উপযুক্ত ডাক্তার সুপারিশ তৈরি হচ্ছে।" : "Cross-referencing verified observations against clinical specialty mappings and directory doctors."}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {aiError && (
            <Card className="border-danger/40 bg-danger/10 p-5 rounded-2xl">
              <p className="text-xs text-danger flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{aiError}</span>
              </p>
            </Card>
          )}

          {aiData?.emergency && (
            <EmergencyBanner text={aiData.guidance} />
          )}

          {aiData && !aiData.emergency && (
            <div className="space-y-6">
              {/* 1. Plain-Language Summary Box */}
              <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-s1 via-s1 to-psoft/25 p-6 sm:p-7 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6),0_0_20px_var(--accent-glow)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line/70 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-onprimary shadow-md font-bold">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-ink font-heading">
                        {isBn ? "এআই ক্লিনিক্যাল বিস্তারিত বিবরণী" : "AI Clinical Intelligence Summary"}
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

                <div className="mt-5 rounded-2xl border border-line/80 bg-s2/70 p-5 text-xs sm:text-sm text-ink leading-relaxed font-sans shadow-inner">
                  <p>{aiData.summary || "No automated summary available."}</p>
                </div>

                {/* Facts Bullet List */}
                {aiData.known_facts?.length > 0 && (
                  <div className="mt-5 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {isBn ? "মূল ক্লিনিক্যাল পর্যবেক্ষণসমূহ:" : "Clinical Observations Identified:"}
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {aiData.known_facts.map((fact: any, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-xl border border-line bg-s1/70 p-3 text-xs text-ink hover:border-primary/40 transition">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{fact.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Doctor Specialty Recommendation & 1-Click Match Cards */}
              <div className="rounded-3xl border border-line bg-s1 p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-info/20 text-info font-bold shadow-xs">
                      <Stethoscope className="h-5 w-5" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-ink font-heading">
                        {isBn ? "কোন বিশেষজ্ঞ ডাক্তার দেখানো উচিত?" : "Which Doctor Should You Consult?"}
                      </h4>
                      <p className="text-xs text-muted">
                        {isBn ? "ল্যাব টেস্টের ফলাফলের ভিত্তিতে স্বয়ংক্রিয় স্পেশালিস্ট সুপারিশ" : "Specialist match calculated from laboratory findings"}
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold self-start sm:self-auto ${
                    aiData.urgency === "soon"
                      ? "border border-warn/40 bg-warn/15 text-warn shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                      : "border border-primary/40 bg-psoft text-ptext"
                  }`}>
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {aiData.urgency === "soon"
                        ? (isBn ? "দ্রুত পরামর্শ জরুরি (Consult Soon)" : "Consultation Advised Soon")
                        : (isBn ? "নিয়মিত স্বাস্থ্য পরামর্শ (Routine)" : "Routine Consultation")}
                    </span>
                  </span>
                </div>

                {/* Recommendation Reason Box */}
                <div className="rounded-2xl border border-line bg-s2/40 p-4 flex items-start gap-3.5 text-xs text-ink">
                  <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-ptext">{aiData.doctor_recommendation}</p>
                    <p className="text-muted leading-relaxed">{aiData.recommendation_reason}</p>
                  </div>
                </div>

                {/* Matching Doctors Grid */}
                {aiData.matching_doctors?.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">
                      {isBn ? "নেটওয়ার্কের প্রস্তাবিত ভেরিফায়েড বিশেষজ্ঞ চিকিৎসক:" : "Recommended Verified Doctors in Network:"}
                    </p>
                    <div className="grid gap-3.5 sm:grid-cols-3">
                      {aiData.matching_doctors.map((doc: any, i: number) => (
                        <div
                          key={doc.id || i}
                          className="group flex flex-col justify-between rounded-2xl border border-line bg-s2/40 p-4 hover:border-primary/50 hover:shadow-md transition duration-200"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-ptext font-bold text-xs shadow-xs">
                                Dr
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-ink truncate group-hover:text-ptext transition">{doc.name}</p>
                                <p className="text-[10px] text-muted truncate">{doc.specialty}</p>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted font-mono">{doc.qualifications}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-line/60">
                            <Button
                              size="xs"
                              variant="primary"
                              className="w-full text-xs font-semibold"
                              onClick={() => router.push(`/appointments?book=true&shareDoc=${uploadedDocId}&doctor=${doc.id}`)}
                            >
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {isBn ? "অ্যাপয়েন্টমেন্ট নিন" : "Book Doctor"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Find More Doctors Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/70">
                  <p className="text-xs text-muted">
                    {isBn ? "নির্দিষ্ট হাসপাতাল বা লোকেশনে আরও ডাক্তার খুঁজতে চান?" : "Looking for specific hospital chambers or doctors near you?"}
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

          {/* =========================================================
             SIDE-BY-SIDE: ORIGINAL PREVIEW VS EXTRACTED TABLE
             ========================================================= */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Original Scan Preview */}
            <div className="lg:col-span-5 space-y-3">
              <Card className="h-full space-y-3 p-4 rounded-3xl">
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-2">
                    <FileText className="h-4 w-4 text-ptext" />
                    <span>{isBn ? "মূল স্ক্যান ডকুমেন্ট" : "Original Document Preview"}</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted uppercase">Secure Vault</span>
                </div>
                <div className="min-h-[480px] rounded-2xl border border-line bg-s2/40 overflow-hidden shadow-inner">
                  <ReportViewer docId={uploadedDocId} mime={selectedFile?.type} />
                </div>
              </Card>
            </div>

            {/* Right: Extracted Observations Table */}
            <div className="lg:col-span-7 space-y-5">
              <Card className="space-y-4 p-5 rounded-3xl">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-ptext" />
                      <span>{isBn ? "নিষ্কাশিত ক্লিনিক্যাল মানসমূহ" : "Extracted Clinical Observations"}</span>
                    </h3>
                    <p className="text-[11px] text-muted">
                      {isBn ? "নির্ভুলতা নিশ্চিত করতে 'ভুল চিহ্নিত' বা 'নিশ্চিত করুন' বাটনে চাপুন" : "Click Flag Wrong or Confirm to maintain clinical accuracy"}
                    </p>
                  </div>
                  <span className="rounded-full bg-s2 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-ptext">
                    {rows.length} {isBn ? "টি টেস্ট" : "tests"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <th>{isBn ? "টেস্ট কোড" : "Test Code"}</th>
                        <th>{isBn ? "মান" : "Observed"}</th>
                        <th>{isBn ? "একক" : "Unit"}</th>
                        <th>{isBn ? "স্বাভাবিক সীমা" : "Reference"}</th>
                        <th>{isBn ? "কনফিডেন্স" : "Confidence"}</th>
                        <th className="text-right">{isBn ? "অ্যাকশন" : "Action"}</th>
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
                            <td className="font-bold text-ink uppercase tracking-wide">{r.test_code}</td>
                            <td className="num font-bold text-ptext">{r.value}</td>
                            <td className="text-muted text-xs font-mono">{r.unit || "—"}</td>
                            <td className="num text-xs text-muted font-mono">
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
                                <div className="flex items-center justify-end gap-1.5">
                                  {isFlagged ? (
                                    <span className="text-xs text-warn font-semibold flex items-center gap-1">
                                      <Flag className="h-3 w-3" /> {isBn ? "চিহ্নিত" : "Flagged"}
                                    </span>
                                  ) : (
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      className="text-warn hover:bg-warn/10 text-[11px]"
                                      busy={isBusy}
                                      onClick={() =>
                                        patchField(
                                          r.observation_id,
                                          { flag_wrong: true },
                                          `Flagged ${r.test_code} for doctor verification.`
                                        )
                                      }
                                    >
                                      {isBn ? "ভুল" : "Flag Wrong"}
                                    </Button>
                                  )}

                                  {r.status === "unverified" && !r.low_confidence && (
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      className="text-[11px]"
                                      busy={isBusy}
                                      onClick={() =>
                                        patchField(
                                          r.observation_id,
                                          { patient_confirm: true },
                                          `Confirmed ${r.test_code} matches paper report.`
                                        )
                                      }
                                    >
                                      {isBn ? "ঠিক" : "Confirm"}
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
              <Card className="space-y-3 p-4 rounded-3xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" />
                    <span>{isBn ? "র' ওসিআর টেক্সট ইন্সপেক্টর" : "Raw OCR Extracted Text"}</span>
                  </h4>
                  <input
                    type="text"
                    value={rawTextSearch}
                    onChange={(e) => setRawTextSearch(e.target.value)}
                    placeholder={isBn ? "টেক্সট ফিল্টার করুন..." : "Filter OCR text..."}
                    className="rounded-input border border-line bg-s2/60 px-3 py-1 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
                  />
                </div>
                <pre className="num max-h-40 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-s2/40 p-3.5 text-xs text-muted font-mono leading-relaxed border border-line/60">
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
          <div className="rounded-3xl border border-line bg-s1 p-6 sm:p-7 space-y-4 shadow-sm">
            <h3 className="text-base font-bold text-ink font-heading">
              {isBn ? "পরবর্তী পদক্ষেপ ও চিকিৎসাসেবা" : "Next Clinical Steps & Patient Actions"}
            </h3>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Action 1: Book Consultation with shared report */}
              <Button
                variant="primary"
                size="md"
                className="font-bold shadow-[0_0_20px_var(--accent-glow)]"
                onClick={() => router.push(`/appointments?book=true&shareDoc=${uploadedDocId}`)}
              >
                <CalendarClock className="h-4 w-4 mr-1.5" />
                {isBn ? "ডাক্তার রিভিউ নিন" : "Request Doctor Review"}
              </Button>

              {/* Action 2: Find a Doctor */}
              <Link href="/directory" className="w-full">
                <Button variant="secondary" size="md" className="w-full font-medium">
                  <Stethoscope className="h-4 w-4 mr-1.5" />
                  {isBn ? "ডাক্তার ডিরেক্টরি খুঁজুন" : "Find Relevant Doctor"}
                </Button>
              </Link>

              {/* Action 3: Download PDF */}
              <a
                href={`/api/v1/documents/${uploadedDocId}/summary-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="outline" size="md" className="w-full font-medium">
                  <Download className="h-4 w-4 mr-1.5" />
                  {isBn ? "সারসংক্ষেপ পিডিএফ" : "Download Summary PDF"}
                </Button>
              </a>

              {/* Action 4: Scan Another Report */}
              <Button
                variant="ghost"
                size="md"
                className="font-medium"
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedFile(null);
                  setUploadedDocId(null);
                  setExtractionsData(null);
                  setAiData(null);
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {isBn ? "অন্য রিপোর্ট স্ক্যান করুন" : "Scan Another Report"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
