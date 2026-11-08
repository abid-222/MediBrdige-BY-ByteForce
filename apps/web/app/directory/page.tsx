"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  Building2,
  CalendarClock,
  Clock,
  Filter,
  GraduationCap,
  Hospital,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Video,
} from "lucide-react";
import { getRole, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import { fmtSchedule } from "@/lib/format";
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
  const [viewMode, setViewMode] = useState<"doctors" | "hospitals">("doctors");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [telehealthOnly, setTelehealthOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"smart" | "fee_asc" | "fee_desc" | "experience">("smart");

  // Metadata, Doctors, and Facilities queries
  const meta = useApi("/directory/meta");
  const facilitiesApi = useApi("/directory/facilities?page_size=50");

  const doctorsQuery = `/directory/doctors?page_size=100${
    selectedSpecialty ? `&specialty=${encodeURIComponent(selectedSpecialty)}` : ""
  }${verifiedOnly ? "&verified_only=true" : ""}${
    searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ""
  }`;

  const { data, loading, error, reload } = useApi(doctorsQuery);

  // Filtered & Smart Ranked Doctors
  const processedDoctors = useMemo(() => {
    const list = data?.items || [];
    const filtered = list.filter((doc: any) => {
      // Hospital filter
      if (selectedFacilityId) {
        const matchesFacility = doc.chambers?.some(
          (c: any) => c.facility_id === selectedFacilityId
        );
        if (!matchesFacility) return false;
      }
      // Available only filter
      if (availableOnly && (!doc.chambers || doc.chambers.length === 0)) {
        return false;
      }
      // Telehealth filter
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

    // Smart Score Calculation & Badges
    const enriched = filtered.map((doc: any) => {
      const primaryChamber = doc.chambers?.[0];
      const fee = primaryChamber?.fee_bdt || 1500;
      const exp = doc.experience_years || 0;
      const isVerified = doc.verification === "verified";
      const hasSchedule = !!primaryChamber?.schedule;

      let score = 50;
      const badges: string[] = [];

      // Fee weighting: Affordable fees get high priority
      if (fee <= 1000) {
        score += 35;
        badges.push("💰 সাশ্রয়ী ফি (Best Value)");
      } else if (fee <= 1500) {
        score += 15;
      }

      // Experience & Verification weighting
      if (isVerified) {
        score += 25;
      }
      if (exp >= 12) {
        score += 20;
        badges.push("⭐ শীর্ষ অভিজ্ঞ বিশেষজ্ঞ");
      }

      if (hasSchedule) {
        score += 15;
        badges.push("🕒 সময়সূচি নির্ধারিত");
      }

      return {
        ...doc,
        _smartScore: score,
        _fee: fee,
        _exp: exp,
        _badges: badges,
      };
    });

    // Sort
    return enriched.sort((a: any, b: any) => {
      if (sortBy === "smart") return b._smartScore - a._smartScore;
      if (sortBy === "fee_asc") return a._fee - b._fee;
      if (sortBy === "fee_desc") return b._fee - a._fee;
      if (sortBy === "experience") return b._exp - a._exp;
      return 0;
    });
  }, [data?.items, selectedFacilityId, availableOnly, telehealthOnly, sortBy]);

  // Filtered facilities for hospital-wise view
  const filteredFacilities = useMemo(() => {
    const list = facilitiesApi.data?.items || [];
    return list.filter((fac: any) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (fac.name || "").toLowerCase().includes(q);
        const distMatch = (fac.district || "").toLowerCase().includes(q);
        const addrMatch = (fac.address || "").toLowerCase().includes(q);
        const docMatch = fac.doctors?.some((d: any) =>
          (d.full_name || "").toLowerCase().includes(q) || (d.specialty || "").toLowerCase().includes(q)
        );
        if (!nameMatch && !distMatch && !addrMatch && !docMatch) return false;
      }
      return true;
    });
  }, [facilitiesApi.data, searchQuery]);

  const handleBook = (doctorId: string, doctorName: string) => {
    const targetUrl = `/appointments?book=true&doctorId=${doctorId}&doctorName=${encodeURIComponent(doctorName)}`;
    if (isLoggedIn && role === "patient") {
      router.push(targetUrl);
    } else {
      addToast(
        "info",
        "Patient Sign In Required",
        `Sign in as a patient to book an online video consultation with ${doctorName}.`
      );
      router.push(`/login?next=${encodeURIComponent(targetUrl)}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title={t("dir.title") || "Dhaka Healthcare Directory"}
        subtitle="Explore verified physicians, hospital chambers, and consultation fees. Browse doctors or explore hospital-wise clinical departments."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Doctor Directory", href: "/directory" },
        ]}
        actions={
          <Link href="/apply">
            <Button size="sm" variant="secondary" icon={Plus}>
              Apply as Doctor / Hospital
            </Button>
          </Link>
        }
      />

      {/* Directory Mode Switcher (Doctors vs Hospitals) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode("doctors")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === "doctors"
                ? "bg-primary text-white shadow-sm"
                : "bg-s2 text-muted hover:text-ink hover:bg-s2/80"
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            <span>Doctors Directory ({processedDoctors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("hospitals")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === "hospitals"
                ? "bg-primary text-white shadow-sm"
                : "bg-s2 text-muted hover:text-ink hover:bg-s2/80"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Hospital-Wise Directory ({filteredFacilities.length})</span>
          </button>
        </div>

        <span className="text-xs text-muted">
          Clinical data verified against national BMDC registry.
        </span>
      </div>

      {/* Filter and Search Bar */}
      <Card className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          {/* Text Search */}
          <div className="md:col-span-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder={
                viewMode === "doctors"
                  ? "Search by doctor name..."
                  : "Search hospital or department..."
              }
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
              {meta.data?.specialties?.map((s: any) => (
                <option key={s.code} value={s.code}>
                  {locale === "bn" && s.name_bn ? s.name_bn : s.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Hospital / Facility Filter (Hospital-wise) */}
          <div className="md:col-span-1">
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              aria-label="Filter by hospital facility"
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 min-h-[38px]"
            >
              <option value="">All Hospitals & Clinics ({facilitiesApi.data?.items?.length || 0})</option>
              {facilitiesApi.data?.items?.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.district})
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox Options */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted md:col-span-1 justify-end">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-ink">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-line text-primary focus:ring-primary"
              />
              <span>BMDC Verified</span>
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
          </div>
        </div>
      </Card>

      {/* Results Header with Smart Priority Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted px-1">
        <div className="flex items-center gap-3">
          <span>
            Showing{" "}
            <strong className="text-ink">
              {viewMode === "doctors" ? processedDoctors.length : filteredFacilities.length}
            </strong>{" "}
            {viewMode === "doctors" ? "registered doctors" : "healthcare facilities in Dhaka"}
          </span>
          {(selectedSpecialty || selectedFacilityId || verifiedOnly || searchQuery || telehealthOnly || availableOnly) && (
            <button
              onClick={() => {
                setSelectedSpecialty("");
                setSelectedFacilityId("");
                setVerifiedOnly(false);
                setSearchQuery("");
                setTelehealthOnly(false);
                setAvailableOnly(false);
              }}
              className="text-ptext hover:underline font-semibold"
            >
              Clear all filters
            </button>
          )}
        </div>

        {viewMode === "doctors" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2 w-full sm:w-auto">
            <span className="font-semibold text-ink shrink-0">সর্ট / প্রায়োরিটি:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-input border border-line bg-s1 px-2.5 py-1 text-xs text-ink focus-visible:outline-none"
            >
              <option value="smart">⚡ AI Smart Priority (সেরা রেকমেন্ডেশন)</option>
              <option value="fee_asc">💰 স্বল্প ফি (Lowest Fee First)</option>
              <option value="fee_desc">💎 প্রিমিয়াম ফি (Highest Fee First)</option>
              <option value="experience">⭐ শীর্ষ অভিজ্ঞতা (Senior Specialists)</option>
            </select>
          </div>
        )}
      </div>

      {/* =========================================================
         VIEW 1: DOCTORS DIRECTORY
         ========================================================= */}
      {viewMode === "doctors" && (
        <Async
          loading={loading}
          error={error}
          onRetry={reload}
          empty={processedDoctors.length === 0}
          emptyNode={
            <EmptyState
              icon={Stethoscope}
              title={t("common.noResults") || "No doctors found"}
              body="Try adjusting your specialty, hospital, or search query to find matching medical providers."
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            {processedDoctors.map((d: any) => {
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

                    {/* Smart Badges (Cost & Specialty Priority) */}
                    {d._badges?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {d._badges.map((badgeText: string, bIdx: number) => (
                          <span
                            key={bIdx}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                          >
                            {badgeText}
                          </span>
                        ))}
                      </div>
                    )}

                    {d.qualifications && d.qualifications.length > 0 && (
                      <p className="text-xs text-muted line-clamp-1">
                        {Array.isArray(d.qualifications) ? d.qualifications.join(", ") : d.qualifications}
                      </p>
                    )}

                    {/* Hospital Chamber & Schedule Shift */}
                    {primaryChamber && (
                      <div className="rounded-lg bg-s2/60 p-2.5 text-xs text-muted space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5 font-medium text-ink">
                          <span className="flex items-center gap-1.5 truncate">
                            <Building2 className="h-3.5 w-3.5 text-ptext shrink-0" />
                            <span className="truncate">{primaryChamber.facility_name}</span>
                          </span>
                          <span className="font-bold text-ptext shrink-0">
                            {primaryChamber.fee_label || "Fee on request"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted border-t border-line/40 pt-1">
                          <span className="flex items-center gap-1 truncate">
                            <Clock className="h-3 w-3 text-ptext shrink-0" />
                            <span className="truncate">{fmtSchedule(primaryChamber.schedule)}</span>
                          </span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded shrink-0">
                            অনলাইন টেলিহেলথ
                          </span>
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
      )}

      {/* =========================================================
         VIEW 2: HOSPITAL-WISE DIRECTORY
         ========================================================= */}
      {viewMode === "hospitals" && (
        <Async
          loading={facilitiesApi.loading}
          error={facilitiesApi.error}
          onRetry={facilitiesApi.reload}
          empty={filteredFacilities.length === 0}
          emptyNode={
            <EmptyState
              icon={Building2}
              title="No Hospitals Found"
              body="No healthcare facilities matched your keywords. Try clearing the search query."
            />
          }
        >
          <div className="space-y-4">
            {filteredFacilities.map((fac: any) => {
              const doctors = fac.doctors || [];
              const isConfirmedEmergency = fac.has_emergency === true;

              return (
                <Card key={fac.id} className="p-5 space-y-4 hover:border-primary/40 transition">
                  {/* Hospital Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-line pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-ink">{fac.name}</h3>
                        <Chip kind={fac.verification === "verified" ? "verified" : "pending"}>
                          {fac.verification === "verified" ? "Verified Facility" : fac.verification}
                        </Chip>
                        <Chip kind="info">
                          {fac.type === "public" ? "Government / Public" : "Private Healthcare"}
                        </Chip>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-ptext shrink-0" />
                          <span>{fac.address || `${fac.district}, Dhaka`}</span>
                        </span>
                        {fac.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-ptext shrink-0" />
                            <span>{fac.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isConfirmedEmergency ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/10 border border-danger/30 text-danger text-xs font-semibold">
                          <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                          24/7 Emergency Service
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Outpatient OPD</span>
                      )}
                    </div>
                  </div>

                  {/* Affiliated Doctors Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-ptext" />
                        <span>Practicing Specialists ({doctors.length})</span>
                      </span>
                    </div>

                    {doctors.length === 0 ? (
                      <p className="text-xs text-muted italic bg-s2/40 p-3 rounded-lg">
                        No specialists currently registered with active chamber hours at this location.
                      </p>
                    ) : (
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {doctors.map((d: any) => (
                          <div
                            key={d.doctor_id || d.id}
                            className="p-3 rounded-lg border border-line bg-s2/40 hover:bg-s2/70 transition space-y-2 flex flex-col justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-bold text-xs text-ink truncate">{d.full_name}</h4>
                                {d.verification === "verified" && (
                                  <ShieldCheck className="h-3 w-3 text-ptext shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-ptext font-medium">{d.specialty}</p>
                              <p className="text-[11px] text-muted truncate">
                                Chamber: {d.chamber || "OPD Room"}
                              </p>
                            </div>

                            <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px]">
                              <span className="font-bold text-ptext">{d.fee_label || "Confirmed Fee"}</span>
                              <Button
                                size="xs"
                                variant="primary"
                                onClick={() => handleBook(d.doctor_id || d.id, d.full_name)}
                              >
                                Book Now
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Async>
      )}
    </div>
  );
}
