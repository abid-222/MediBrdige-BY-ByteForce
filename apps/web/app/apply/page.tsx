"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FileText,
  GraduationCap,
  Hospital,
  Lock,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react";
import { api, getToken, getRole } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import {
  Button,
  Card,
  Chip,
  Input,
  PageHeader,
  Select,
  useToast,
} from "@/components/ui";

export default function ApplyPage() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const token = getToken();
  const currentRole = getRole();

  // Load available specialties and hospitals from live directory
  const metaApi = useApi("/directory/meta");
  const facilitiesApi = useApi("/directory/facilities?page_size=50");

  const [role, setRole] = useState<"doctor" | "facility_admin">("doctor");

  // Doctor Form Fields
  const [fullName, setFullName] = useState("");
  const [bmdcNumber, setBmdcNumber] = useState("");
  const [specialtyId, setSpecialtyId] = useState<number | "">("");
  const [qualifications, setQualifications] = useState("");
  const [experienceYears, setExperienceYears] = useState("5");
  const [facilityId, setFacilityId] = useState("");
  const [chamberName, setChamberName] = useState("");
  const [feeBdt, setFeeBdt] = useState("1200");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [bio, setBio] = useState("");

  // Facility Form Fields
  const [facilityName, setFacilityName] = useState("");
  const [facilityType, setFacilityType] = useState("private");
  const [district, setDistrict] = useState("Dhaka");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("+8801700000000");
  const [hasEmergency, setHasEmergency] = useState(true);

  // Submission State
  const [busy, setBusy] = useState(false);
  const [successApp, setSuccessApp] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("Please create an account or sign in first to submit your clinical credential application.");
      return;
    }

    if (role === "doctor") {
      if (!bmdcNumber.trim()) {
        setErrorMessage("BMDC Registration number is required for doctor verification.");
        return;
      }
      if (!evidenceRef.trim()) {
        setErrorMessage("Please provide a verifiable BMDC registry link or gazette evidence reference.");
        return;
      }
    } else {
      if (!facilityName.trim()) {
        setErrorMessage("Healthcare facility name is required.");
        return;
      }
      if (!evidenceRef.trim()) {
        setErrorMessage("Please provide a DGHS or Ministry of Health license registration reference.");
        return;
      }
    }

    setBusy(true);
    try {
      const details =
        role === "doctor"
          ? {
              full_name: fullName.startsWith("Dr.") ? fullName : `Dr. ${fullName}`,
              bmdc_number: bmdcNumber.trim().toUpperCase(),
              specialty_id: specialtyId ? Number(specialtyId) : null,
              qualifications: qualifications.trim() || "MBBS",
              experience_years: parseInt(experienceYears, 10) || 3,
              facility_id: facilityId || null,
              chamber_name: chamberName.trim() || "OPD Consultation Room",
              fee_bdt: parseInt(feeBdt, 10) || 1200,
              bio: bio.trim(),
            }
          : {
              facility_name: facilityName.trim(),
              type: facilityType,
              district,
              address: address.trim() || "Dhaka, Bangladesh",
              phone: phone.trim(),
              has_emergency: hasEmergency,
            };

      const res = await api("/auth/role-applications", {
        method: "POST",
        body: {
          requested_role: role,
          details,
          evidence_refs: [evidenceRef.trim()],
        },
      });

      setSuccessApp(res);
      addToast(
        "success",
        "Application Submitted",
        "Your clinical verification request has been queued for review."
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit application. Please check your credentials.");
      addToast("error", "Submission Failed", err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 pt-2">
      <PageHeader
        title="Clinical Accreditation & Doctor Registration"
        subtitle="Apply for verified practitioner or healthcare facility listing on the MediBridge clinical network."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Directory", href: "/directory" },
          { label: "Apply for Accreditation", href: "/apply" },
        ]}
      />

      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => { setRole("doctor"); setErrorMessage(""); }}
          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-card border font-semibold text-sm transition-all ${
            role === "doctor"
              ? "border-primary bg-psoft/30 text-ink shadow-sm"
              : "border-line bg-s1 text-muted hover:border-line/80 hover:text-ink"
          }`}
        >
          <Stethoscope className={`h-4 w-4 ${role === "doctor" ? "text-ptext" : "text-muted"}`} />
          <span>Apply as Doctor</span>
        </button>

        <button
          type="button"
          onClick={() => { setRole("facility_admin"); setErrorMessage(""); }}
          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-card border font-semibold text-sm transition-all ${
            role === "facility_admin"
              ? "border-primary bg-psoft/30 text-ink shadow-sm"
              : "border-line bg-s1 text-muted hover:border-line/80 hover:text-ink"
          }`}
        >
          <Building2 className={`h-4 w-4 ${role === "facility_admin" ? "text-ptext" : "text-muted"}`} />
          <span>Apply as Hospital</span>
        </button>
      </div>

      {/* Not Logged In Warning */}
      {!token && (
        <Card className="border-warn/40 bg-warn/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-warn font-semibold text-sm">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Account Authentication Required</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Please sign in to link your application to your secure credential profile. Don&apos;t have an account? Create one in seconds.
          </p>
          <div className="pt-1 flex gap-2">
            <Link href="/login?next=/apply">
              <Button size="xs" variant="primary">Sign In to Continue</Button>
            </Link>
            <Link href="/register?next=/apply">
              <Button size="xs" variant="secondary">Create Account</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Success State */}
      {successApp ? (
        <Card className="p-8 text-center space-y-4 border-primary/40 bg-psoft/15">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-ptext mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-ink">Application Submitted for Review</h2>
            <p className="text-xs text-muted max-w-lg mx-auto leading-relaxed">
              Your application has been logged under reference{" "}
              <span className="font-mono font-bold text-ink">{successApp.id}</span>. Our clinical governance team verifies BMDC registrations against the national medical registry.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-s1 border border-line text-xs font-medium text-ink">
            <ShieldCheck className="h-4 w-4 text-ptext" />
            <span>Current Status: <strong className="uppercase font-mono text-ptext">Pending Verification</strong></span>
          </div>
          <div className="pt-3 flex justify-center gap-3">
            <Link href="/directory">
              <Button size="sm" variant="secondary">Browse Doctor Directory</Button>
            </Link>
            <Button size="sm" variant="primary" onClick={() => setSuccessApp(null)}>
              Submit Another Application
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            {role === "doctor" ? (
              <>
                {/* Doctor Section Header */}
                <div className="border-b border-line pb-3">
                  <h3 className="font-bold text-base text-ink flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-ptext" />
                    <span>Practitioner Credentials & BMDC Verification</span>
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Enter licensed medical practitioner details as registered with Bangladesh Medical & Dental Council.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Doctor Full Name *"
                    placeholder="e.g. Dr. Masud Rana"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />

                  <Input
                    label="BMDC Registration Number *"
                    placeholder="e.g. A-48219"
                    value={bmdcNumber}
                    onChange={(e) => setBmdcNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
                      Medical Specialty *
                    </label>
                    <select
                      value={specialtyId}
                      onChange={(e) => setSpecialtyId(e.target.value ? Number(e.target.value) : "")}
                      required
                      className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 min-h-[38px]"
                    >
                      <option value="">Select Specialty...</option>
                      {metaApi.data?.specialties?.map((s: any, idx: number) => (
                        <option key={s.code} value={idx + 1}>
                          {s.name_en} {s.name_bn ? `(${s.name_bn})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Qualifications & Degrees *"
                    placeholder="e.g. MBBS, FCPS (Internal Medicine), MD"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    required
                  />
                </div>

                {/* Hospital Chamber Affiliation */}
                <div className="border-t border-line/60 pt-4 space-y-4">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Hospital className="h-3.5 w-3.5 text-ptext" />
                      <span>Hospital & Chamber Affiliation (Hospital-Wise Listing)</span>
                    </h4>
                    <p className="text-[11px] text-muted mt-0.5">
                      Select your primary hospital or medical center in Dhaka for patient appointments.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-1">
                      <label className="mb-1 block font-medium text-xs text-muted">
                        Affiliated Hospital / Center
                      </label>
                      <select
                        value={facilityId}
                        onChange={(e) => setFacilityId(e.target.value)}
                        className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 min-h-[38px]"
                      >
                        <option value="">Select Hospital / Center...</option>
                        {facilitiesApi.data?.items?.map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.district})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-1">
                      <Input
                        label="Chamber / Room Name"
                        placeholder="e.g. OPD Room 304, Level 3"
                        value={chamberName}
                        onChange={(e) => setChamberName(e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Input
                        label="Consultation Fee (BDT)"
                        type="number"
                        placeholder="1200"
                        value={feeBdt}
                        onChange={(e) => setFeeBdt(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Experience & Evidence */}
                <div className="grid gap-4 md:grid-cols-2 border-t border-line/60 pt-4">
                  <Input
                    label="Years of Clinical Experience"
                    type="number"
                    min="1"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                  />

                  <Input
                    label="BMDC Registry / Gazette URL / Evidence *"
                    placeholder="e.g. https://bmdc.org.bd/search?reg=48219"
                    value={evidenceRef}
                    onChange={(e) => setEvidenceRef(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
                    Clinical Bio / Visiting Hours
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide visiting hours, special areas of clinical interest, and patient guidance..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-input border border-line bg-s1 p-3 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Facility Section Header */}
                <div className="border-b border-line pb-3">
                  <h3 className="font-bold text-base text-ink flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-ptext" />
                    <span>Healthcare Facility & Hospital Accreditation</span>
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Register a hospital, diagnostic centre, or specialized clinic in Dhaka.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Hospital / Facility Name *"
                    placeholder="e.g. Dhaka Specialized Cardiac Hospital"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    required
                  />

                  <div>
                    <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
                      Facility Type *
                    </label>
                    <select
                      value={facilityType}
                      onChange={(e) => setFacilityType(e.target.value)}
                      className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none min-h-[38px]"
                    >
                      <option value="private">Private Hospital / Clinic</option>
                      <option value="public">Public / Government Hospital</option>
                      <option value="diagnostic">Diagnostic & Imaging Center</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="District"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                  />

                  <Input
                    label="Emergency Contact Phone *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Hospital Address *"
                  placeholder="e.g. House 14, Road 7, Dhanmondi, Dhaka"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />

                <Input
                  label="DGHS / Ministry of Health License Ref *"
                  placeholder="e.g. DGHS-HOSP-2024-8931"
                  value={evidenceRef}
                  onChange={(e) => setEvidenceRef(e.target.value)}
                  required
                />

                <div className="rounded-input border border-line bg-s2/40 p-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={hasEmergency}
                      onChange={(e) => setHasEmergency(e.target.checked)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-ink">
                      This facility operates 24/7 Emergency and Trauma Services
                    </span>
                  </label>
                </div>
              </>
            )}

            {errorMessage && (
              <div className="rounded-input border border-danger/40 bg-danger/10 p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-line">
              <span className="text-xs text-muted">
                Applications are reviewed by the medical council audit board.
              </span>
              <Button type="submit" size="md" busy={busy} disabled={!token}>
                Submit Application for Verification
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
