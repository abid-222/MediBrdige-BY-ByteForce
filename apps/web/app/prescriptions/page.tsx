"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Info,
  Pill,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { api, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  fmtDate,
  fmtDateTime,
  PageHeader,
  SearchInput,
  Select,
  StatTile,
  Table,
  useToast,
} from "@/components/ui";

export default function PatientPrescriptionsPage() {
  useGuard(["patient"]);
  const { t } = useI18n();
  const { addToast } = useToast();

  const { data, loading, error, reload } = useApi("/prescriptions/me");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);

  const items = data?.items || [];

  const filteredItems = useMemo(() => {
    return items.filter((rx: any) => {
      if (statusFilter !== "all" && rx.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchDoc = rx.doctor_name?.toLowerCase().includes(q);
      const matchDiag = rx.diagnosis?.toLowerCase().includes(q);
      const matchMeds = rx.medications?.some((m: any) => m.name?.toLowerCase().includes(q));
      return matchDoc || matchDiag || matchMeds;
    });
  }, [items, searchQuery, statusFilter]);

  const activeCount = items.filter((rx: any) => rx.status === "issued").length;

  const handleDownloadPdf = async (rxId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/v1/prescriptions/${rxId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Could not download prescription PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Prescription-MB-${rxId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast("success", "PDF Downloaded", "Clinical prescription document downloaded successfully.");
    } catch (e: any) {
      addToast("error", "Download Failed", e.message || "Failed to download prescription PDF.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="My Digital Prescriptions"
        subtitle="Doctor-approved clinical prescriptions issued during your verified medical consultations."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Prescriptions", href: "/prescriptions" },
        ]}
        actions={
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => reload()}>
            Refresh
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          icon={FileCheck2}
          label="Total Prescriptions"
          value={items.length}
          accent
        />
        <StatTile
          icon={Pill}
          label="Active Prescriptions"
          value={activeCount}
          trend={activeCount > 0 ? "up" : "down"}
          trendLabel={`${activeCount} valid regimens`}
        />
        <StatTile
          icon={Stethoscope}
          label="Issuing Specialists"
          value={new Set(items.map((i: any) => i.doctor_id)).size}
        />
      </div>

      {/* Search and Filters Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name, diagnosis, or medicine..."
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="issued">Active / Issued</option>
              <option value="amended">Amended</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Prescriptions List */}
      <Async
        loading={loading}
        error={error}
        onRetry={reload}
        empty={items.length === 0}
        emptyNode={
          <EmptyState
            icon={Pill}
            title="No Prescriptions Issued Yet"
            body="You do not have any official digital prescriptions on file. After a consultation, your verified physician will approve and issue your prescription here."
          />
        }
      >
        <div className="space-y-4">
          {filteredItems.map((rx: any) => (
            <Card key={rx.id} className="p-5 hover:border-ptext/40 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ptext bg-ptext/10 px-2 py-0.5 rounded border border-ptext/20">
                      MB-{rx.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        rx.status === "issued"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : rx.status === "amended"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
                      }`}
                    >
                      {rx.status}
                    </span>
                    <span className="text-xs text-muted">
                      Consultation: <strong className="text-foreground">{fmtDate(rx.consultation_date)}</strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Stethoscope className="h-4 w-4 text-ptext" />
                      {rx.doctor_name}
                    </span>
                    {rx.doctor_bmdc && (
                      <span className="text-xs font-mono text-muted bg-muted/30 px-2 py-0.5 rounded">
                        BMDC Reg: {rx.doctor_bmdc}
                      </span>
                    )}
                  </div>

                  {rx.diagnosis && (
                    <div className="text-xs text-foreground/90">
                      <span className="text-muted font-medium">Diagnosis: </span>
                      <strong className="text-foreground">{rx.diagnosis}</strong>
                    </div>
                  )}

                  {/* Medications Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rx.medications?.map((m: any, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs bg-muted/20 border border-border/50 text-foreground px-2.5 py-1 rounded-md flex items-center gap-1.5"
                      >
                        <Pill className="h-3 w-3 text-ptext" />
                        <strong>{m.name}</strong> {m.dosage && <span className="text-muted">({m.dosage})</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Eye}
                    onClick={() => setSelectedPrescription(rx)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Download}
                    onClick={() => handleDownloadPdf(rx.id)}
                  >
                    Download PDF
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Async>

      {/* Safety Notice */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted flex items-start gap-3">
        <Info className="h-4 w-4 text-ptext shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Digital prescriptions are approved by licensed medical doctors. Always follow recommended dosages and timings. In case of severe adverse reactions or medical emergencies, stop medication immediately and dial <strong>999</strong> or visit your nearest hospital emergency department.
        </p>
      </div>

      {/* Prescription Detail Dialog */}
      {selectedPrescription && (
        <Dialog
          open={!!selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
          title={`Digital Prescription — MB-${selectedPrescription.id.slice(0, 8).toUpperCase()}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header with Doctor details */}
            <div className="p-3 rounded-lg bg-ptext/5 border border-ptext/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <p className="font-bold text-foreground text-sm">{selectedPrescription.doctor_name}</p>
                <p className="text-muted">{selectedPrescription.doctor_bmdc ? `BMDC Reg: ${selectedPrescription.doctor_bmdc}` : "Verified Medical Practitioner"}</p>
              </div>
              <div className="text-sm-right">
                <span className="text-muted block">Consultation Date:</span>
                <span className="font-semibold text-foreground">{fmtDate(selectedPrescription.consultation_date)}</span>
              </div>
            </div>

            {/* Diagnosis */}
            {selectedPrescription.diagnosis && (
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  Clinical Diagnosis:
                </span>
                <p className="text-sm font-medium text-foreground bg-muted/15 p-2.5 rounded-lg border border-border/50">
                  {selectedPrescription.diagnosis}
                </p>
              </div>
            )}

            {/* Prescribed Medications Table */}
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
                Rx Prescribed Medications ({selectedPrescription.medications?.length || 0})
              </span>
              <Table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Medicine & Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPrescription.medications?.map((m: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-mono text-xs">{idx + 1}</td>
                      <td>
                        <strong className="text-foreground">{m.name}</strong>{" "}
                        {m.dosage && <span className="text-muted font-normal text-xs">({m.dosage})</span>}
                      </td>
                      <td className="font-mono text-xs">{m.frequency || "As directed"}</td>
                      <td className="text-xs">{m.duration || "N/A"}</td>
                      <td className="text-xs text-muted">{m.instructions || "After meals"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Clinical Notes / Advice */}
            {selectedPrescription.clinical_notes && (
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  Clinical Advice & Guidelines:
                </span>
                <p className="text-xs text-foreground bg-muted/15 p-2.5 rounded-lg border border-border/50 leading-relaxed whitespace-pre-wrap">
                  {selectedPrescription.clinical_notes}
                </p>
              </div>
            )}

            {/* Follow-up */}
            {selectedPrescription.follow_up_recommendation && (
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  Follow-Up Recommendation:
                </span>
                <p className="text-xs font-medium text-foreground bg-ptext/5 p-2.5 rounded-lg border border-ptext/20">
                  {selectedPrescription.follow_up_recommendation}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedPrescription(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                icon={Download}
                onClick={() => handleDownloadPdf(selectedPrescription.id)}
              >
                Download Official PDF
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
