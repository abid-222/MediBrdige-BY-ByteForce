"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Filter,
  MapPin,
  Search,
  Sparkles,
  Stethoscope,
  User,
  Video,
} from "lucide-react";
import { getRole, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Button,
  Card,
  Chip,
  EmptyState,
  fmtDate,
  PageHeader,
  SearchInput,
  Select,
  useToast,
  verChip,
} from "@/components/ui";

export default function DoctorDirectoryPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { addToast } = useToast();
  const role = getRole();
  const isLoggedIn = !!getToken();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [telehealthOnly, setTelehealthOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);

  // Metadata & Doctors queries
  const meta = useApi("/directory/meta");
  const doctorsQuery = `/directory/doctors?page_size=50${
    selectedSpecialty ? `&specialty=${encodeURIComponent(selectedSpecialty)}` : ""
  }${verifiedOnly ? "&verified_only=true" : ""}${
    searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ""
  }`;

  const { data, loading, error, reload } = useApi(doctorsQuery);

  // Filtered doctors on client for availability and online consultation
  const filteredDoctors = useMemo(() => {
    const list = data?.items || [];
    return list.filter((doc: any) => {
      // Available only filter: has chambers with configured schedule
      if (availableOnly && (!doc.chambers || doc.chambers.length === 0)) {
        return false;
      }
      // Telehealth filter: check if chamber or doctor supports remote consultation
      if (telehealthOnly) {
        const hasOnline = doc.chambers?.some((c: any) =>
          c.facility_name?.toLowerCase().includes("online") ||
          c.facility_name?.toLowerCase().includes("telehealth") ||
          c.facility_type === "private"
        );
        if (!hasOnline && doc.chambers?.length === 0) return false;
      }
      return true;
    });
  }, [data?.items, availableOnly, telehealthOnly]);

  const handleBook = (doctorId: string, doctorName: string) => {
    if (isLoggedIn && role === "patient") {
      router.push(`/appointments?book=true&doctorId=${doctorId}`);
    } else {
      addToast(
        "info",
        "Patient Sign In Required",
        `Sign in as a patient to book an appointment with ${doctorName}.`
      );
      router.push(`/login?next=${encodeURIComponent(`/appointments?book=true&doctorId=${doctorId}`)}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title={t("dir.title") || "Dhaka Doctor Directory"}
        subtitle="Explore licensed physicians and specialists. Check BMDC credentials, hospital chambers, consultation fees, and schedule visits."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Doctor Directory", href: "/directory" },
        ]}
      />

      {/* Filter and Search Bar */}
      <Card className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {/* Doctor Name Search */}
          <div className="md:col-span-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search by doctor name..."
            />
          </div>

          {/* Specialty Select Dropdown */}
          <div className="md:col-span-1">
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              aria-label="Filter by specialty"
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 min-h-[38px]"
            >
              <option value="">{t("dir.all") || "All Medical Specialties"}</option>
              {meta.data?.specialties.map((s: any) => (
                <option key={s.code} value={s.code}>
                  {locale === "bn" && s.name_bn ? s.name_bn : s.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox Options */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted md:col-span-1 justify-end">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-ink">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-line text-primary focus:ring-primary"
              />
              <span>{t("dir.verifiedOnly") || "Verified BMDC Only"}</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-ink">
              <input
                type="checkbox"
                checked={telehealthOnly}
                onChange={(e) => setTelehealthOnly(e.target.checked)}
                className="rounded border-line text-primary focus:ring-primary"
              />
              <span>Online Telehealth</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-ink">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-line text-primary focus:ring-primary"
              />
              <span>With Active Chambers</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-muted px-1">
        <span>
          Showing <strong className="text-ink">{filteredDoctors.length}</strong> registered doctor
          {filteredDoctors.length === 1 ? "" : "s"}
        </span>
        {(selectedSpecialty || verifiedOnly || searchQuery || telehealthOnly || availableOnly) && (
          <button
            onClick={() => {
              setSelectedSpecialty("");
              setVerifiedOnly(false);
              setSearchQuery("");
              setTelehealthOnly(false);
              setAvailableOnly(false);
            }}
            className="text-ptext hover:underline font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Doctors Grid */}
      <Async
        loading={loading}
        error={error}
        onRetry={reload}
        empty={filteredDoctors.length === 0}
        emptyNode={
          <EmptyState
            icon={Stethoscope}
            title={t("common.noResults") || "No doctors found"}
            body="Try adjusting your specialty or search query to find matching medical providers."
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDoctors.map((d: any) => {
            const chambers = d.chambers || [];
            const primaryChamber = chambers[0];
            const initials = d.full_name?.replace(/^Dr\.\s*/i, "").slice(0, 2).toUpperCase() || "DR";

            return (
              <Card
                key={d.id}
                className="flex flex-col justify-between space-y-4 p-5 hover:border-primary/50 transition shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm font-heading shadow-sm">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/directory/doctors/${d.id}`} className="hover:underline">
                          <h2 className="text-base font-bold text-ink truncate">{d.full_name}</h2>
                        </Link>
                        <p className="text-xs text-ptext font-semibold">
                          {d.specialty}
                          {d.experience_years ? ` · ${d.experience_years} yrs exp` : ""}
                        </p>
                      </div>
                    </div>
                    {verChip(d.verification)}
                  </div>

                  {d.qualifications && d.qualifications.length > 0 && (
                    <p className="text-xs text-muted line-clamp-1">
                      {Array.isArray(d.qualifications) ? d.qualifications.join(", ") : d.qualifications}
                    </p>
                  )}

                  {primaryChamber && (
                    <div className="rounded-lg bg-s2/60 p-2.5 text-xs text-muted space-y-1">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <Building2 className="h-3.5 w-3.5 text-muted shrink-0" />
                        <span className="truncate">{primaryChamber.facility_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>{primaryChamber.district || "Dhaka"}</span>
                        <span className="font-semibold text-ptext">{primaryChamber.fee_label || "Fee on request"}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                    {d.stale && <Chip kind="stale" />}
                    {d.is_sample && <Chip kind="info">Sample Data</Chip>}
                    <span className="font-mono text-muted/80">
                      Verified: {fmtDate(d.last_verified_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                  <Link
                    href={`/directory/doctors/${d.id}`}
                    className="text-xs font-semibold text-muted hover:text-ink transition"
                  >
                    View Details &rarr;
                  </Link>

                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => handleBook(d.id, d.full_name)}
                  >
                    <CalendarClock className="h-3.5 w-3.5 mr-1" />
                    Book Consultation
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </Async>
    </div>
  );
}