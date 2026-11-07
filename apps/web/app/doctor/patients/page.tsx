"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  Filter,
  Lock,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Button,
  Card,
  Chip,
  EmptyState,
  PageHeader,
  SearchInput,
  StatTile,
} from "@/components/ui";

export default function DoctorPatientsPage() {
  useGuard(["doctor"]);
  const { t } = useI18n();

  const patientsList = useApi("/doctor/patients");
  const dashboard = useApi("/doctor/dashboard");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "restricted">("all");

  const patients = useMemo(() => {
    const items = patientsList.data?.items || [];
    return items.filter((p: any) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (p.name || "").toLowerCase().includes(q) ||
        (p.patient_id || "").toLowerCase().includes(q);
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && p.access) ||
        (filter === "restricted" && !p.access);
      return matchesSearch && matchesFilter;
    });
  }, [patientsList.data, search, filter]);

  const activeCount = useMemo(
    () => (patientsList.data?.items || []).filter((p: any) => p.access).length,
    [patientsList.data]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/doctor"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Doctor Workspace</span>
            </Link>
          </div>
          <PageHeader
            title="My Assigned Patients"
            subtitle="Patients with active care relationships and clinical consent under your care"
          />
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Total Assigned Patients"
          value={patientsList.data?.items?.length ?? 0}
          icon={Users}
        />
        <StatTile
          label="Authorized Care Access"
          value={activeCount}
          icon={ShieldCheck}
          trend="up"
          trendLabel="Consent Active"
        />
        <StatTile
          label="Pending Review Observations"
          value={dashboard.data?.pending_review_count ?? 0}
          icon={FileText}
        />
      </div>

      {/* Search and Filters */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search by patient name or ID..."
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs text-muted font-medium flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>
            {(["all", "active", "restricted"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                  filter === mode
                    ? "bg-primary text-onprimary shadow-sm"
                    : "border border-line bg-s1 text-muted hover:bg-s2 hover:text-ink"
                }`}
              >
                {mode === "all" ? "All Patients" : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Patients Table */}
        <Async
          loading={patientsList.loading && !patientsList.data}
          error={patientsList.error}
          onRetry={patientsList.reload}
          empty={patients.length === 0}
          emptyNode={
            <EmptyState
              icon={Users}
              title={search ? "No matching patients found" : "No assigned patients"}
              body={
                search
                  ? "Try searching with a different name or patient identifier."
                  : "Patients will appear here once an appointment is booked or a care relationship is initiated."
              }
            />
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Patient Identifier</th>
                  <th className="py-3 px-4">Access Permission</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {patients.map((p: any) => (
                  <tr key={p.patient_id} className="hover:bg-s2/40 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-psoft text-ptext font-bold text-xs">
                          {(p.name || "P")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-ink">{p.name || "Anonymous Patient"}</p>
                          <p className="text-[10px] text-muted font-mono">ID: {p.patient_id?.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-muted">
                      {p.patient_id}
                    </td>

                    <td className="py-3 px-4">
                      {p.access ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Consent Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Lock className="h-3 w-3" />
                          <span>Consent Required</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link href={`/doctor/patients/${p.patient_id}`}>
                        <Button size="xs" variant="primary">
                          <span>Open Chart</span>
                          <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Async>
      </Card>

      {/* Clinical Privacy Note */}
      <div className="rounded-xl border border-line bg-s1/60 p-4 text-xs text-muted flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-ptext shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Doctor Authorization Boundary:</strong> You can only access patient medical records, lab observations, and clinical notes for patients who have granted active consent or have scheduled consultations with you. All chart open events are logged to the tamper-evident audit trail.
        </p>
      </div>
    </div>
  );
}
