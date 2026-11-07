"use client";
import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import {
  FileText,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  X,
  FileCheck,
  AlertTriangle,
  FileSearch,
} from "lucide-react";
import { uploadWithProgress } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Button,
  Card,
  Chip,
  Dialog,
  docStatus,
  EmptyState,
  fmtDate,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  StatTile,
  Table,
  useToast,
} from "@/components/ui";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export default function MedicalReportsPage() {
  useGuard(["patient"]);
  const { t } = useI18n();
  const { addToast } = useToast();
  const { data, loading, error, reload } = useApi("/documents");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [dragActive, setDragActive] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // File validation and upload handler
  const handleUpload = async (file: File) => {
    setValidationError(null);

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const err = "Unsupported file type. Only PDF, JPG, and PNG are accepted.";
      setValidationError(err);
      addToast("error", "Invalid File Format", err);
      return;
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      const err = "File exceeds maximum size of 10MB.";
      setValidationError(err);
      addToast("error", "File Too Large", err);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploadPercent(0);
    setUploading(true);

    try {
      await uploadWithProgress("/documents", formData, setUploadPercent, {
        "Idempotency-Key": `${file.name}-${file.size}-${file.lastModified}`,
      });
      addToast("success", "Document Uploaded", "OCR extraction pipeline initiated in the background.");
      reload();
      // Poll pipeline updates
      setTimeout(reload, 2000);
      setTimeout(reload, 5000);
      setTimeout(reload, 9000);
    } catch (e: any) {
      setValidationError(e.message || "Upload failed");
      addToast("error", "Upload Failed", e.message);
    } finally {
      setUploadPercent(null);
      setUploading(false);
    }
  };

  // Metrics summary
  const stats = useMemo(() => {
    const items = data?.items || [];
    const total = items.length;
    const verified = items.filter((d: any) => d.verified_values > 0 && d.verified_values === d.total_values).length;
    const needsReview = items.filter((d: any) => (d.low_confidence_values || 0) > 0).length;
    const processing = items.filter((d: any) => ["uploaded", "processing"].includes(d.status)).length;
    return { total, verified, needsReview, processing };
  }, [data]);

  // Filtered documents list
  const filteredDocs = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((d: any) => {
      const type = (d.doc_type || "").toLowerCase();
      const status = (d.status || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        type.includes(query) ||
        status.includes(query) ||
        (d.message || "").toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || d.doc_type === typeFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "verified" && d.verified_values > 0 && d.verified_values === d.total_values) ||
        (statusFilter === "review" && (d.low_confidence_values || 0) > 0) ||
        (statusFilter === "processing" && ["uploaded", "processing"].includes(d.status));
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [data, searchQuery, typeFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("rep.title") || "Medical Documents"}
        subtitle="Secure medical record vault. Upload CBC, Glucose, or Lipid reports for automated OCR extraction and clinical verification."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Medical Documents", href: "/reports" },
        ]}
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={RefreshCw}
            onClick={() => {
              reload();
              addToast("info", "Refreshed", "Documents updated.");
            }}
          >
            Refresh
          </Button>
        }
      />

      {/* Overview Stat Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={FileText}
          label="Total Documents"
          value={stats.total}
          accent
        />
        <StatTile
          icon={FileCheck}
          label="Doctor Verified"
          value={stats.verified}
          trend={stats.verified > 0 ? "up" : "neutral"}
          trendLabel="Locked records"
        />
        <StatTile
          icon={FileSearch}
          label="Pending Review"
          value={stats.needsReview}
          trend={stats.needsReview > 0 ? "down" : "neutral"}
          trendLabel="OCR check required"
        />
        <StatTile
          icon={RefreshCw}
          label="Processing Queue"
          value={stats.processing}
          trend="neutral"
          trendLabel="Active pipelines"
        />
      </div>

      {/* Upload Drop Zone Studio */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleUpload(file);
        }}
        className={`rounded-card border-2 border-dashed p-8 text-center transition-all ${
          dragActive
            ? "border-primary bg-psoft/20 scale-[1.01] shadow-glow"
            : "border-line bg-s1 hover:border-primary/50 hover:bg-psoft/5"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${
              dragActive ? "bg-primary text-onprimary scale-110 shadow-glow" : "bg-psoft text-ptext"
            }`}
          >
            <UploadCloud className="h-7 w-7" aria-hidden />
          </div>

          <div>
            <h2 className="text-base font-bold text-ink">
              Drop your medical report here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-ptext underline hover:text-ink transition"
              >
                browse files
              </button>
            </h2>
            <p className="mt-1 text-xs text-muted">
              Supported formats: <b>PDF, JPG, PNG</b> (Max 10MB per file) · Supported reports: <b>CBC, Blood Glucose, Lipid Profile</b>
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            busy={uploading}
            className="mt-1"
          >
            Select Document
          </Button>
        </div>

        {/* Live Upload Progress */}
        {uploadPercent !== null && (
          <div className="mx-auto mt-5 max-w-sm">
            <ProgressBar value={uploadPercent} max={100} label={`Uploading document (${uploadPercent}%)`} />
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mx-auto mt-4 max-w-md rounded-input border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button onClick={() => setValidationError(null)} className="p-0.5 hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search documents by type, status, or date..."
            className="md:max-w-xs"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
            >
              <option value="all">All Report Types</option>
              <option value="cbc">CBC</option>
              <option value="glucose">Glucose</option>
              <option value="lipid">Lipid</option>
              <option value="other">Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Doctor Verified</option>
              <option value="review">Needs Review</option>
              <option value="processing">Processing</option>
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <Async
          loading={loading && !data}
          error={error}
          onRetry={reload}
          empty={filteredDocs.length === 0}
          emptyNode={
            <EmptyState
              icon={FileText}
              title="No documents found"
              body="No uploaded documents match your current filter criteria."
              action={
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  Upload New Document
                </Button>
              }
            />
          }
          skeleton="table"
        >
          <Table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Upload Date</th>
                <th>OCR Status</th>
                <th>Values</th>
                <th>Clinical Verification</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((d: any) => {
                const statusKind = docStatus({
                  status: d.status,
                  total: d.total_values,
                  verifiedCount: d.verified_values,
                  lowCount: d.low_confidence_values,
                });
                return (
                  <tr key={d.id} className="hover:bg-s2/40 transition">
                    <td className="font-bold text-ink">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-ptext shrink-0" />
                        <span className="uppercase">{d.doc_type || "Report"}</span>
                        {d.is_sample && <Chip kind="info">Sample</Chip>}
                      </div>
                    </td>
                    <td className="num text-xs text-muted">{fmtDate(d.created_at)}</td>
                    <td>
                      <Chip kind={statusKind} />
                    </td>
                    <td className="num text-xs font-semibold">
                      {d.total_values || 0} observations
                    </td>
                    <td>
                      {d.verified_values > 0 && d.verified_values === d.total_values ? (
                        <Chip kind="doctor">Doctor Verified</Chip>
                      ) : (d.low_confidence_values || 0) > 0 ? (
                        <Chip kind="low">{d.low_confidence_values} low confidence</Chip>
                      ) : (
                        <Chip kind="unverified" />
                      )}
                    </td>
                    <td className="text-right">
                      <Link href={`/reports/${d.id}`}>
                        <Button size="xs" variant="secondary">
                          View & Verify →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Async>
      </Card>
    </div>
  );
}
