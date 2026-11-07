"use client";
import { useState, useMemo } from "react";
import {
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  FileCheck,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { api, getRole } from "@/lib/api";
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
  GlassCard,
  Input,
  PageHeader,
  SearchInput,
  StatTile,
  TabGroup,
  Table,
  Tooltip,
  useToast,
  verChip,
} from "@/components/ui";
import Link from "next/link";

export default function FacilityPortalPage() {
  useGuard(["facility_admin", "facility_staff"]);
  const { t } = useI18n();
  const { addToast } = useToast();
  const isFacilityAdmin = getRole() === "facility_admin";

  // API Hooks
  const dashboard = useApi("/facility/dashboard");
  const priceCatalogue = useApi("/facility/prices");
  const appointmentQueue = useApi("/appointments");
  const servicesList = useApi("/facility/services");

  // Local state
  const [activeTab, setActiveTab] = useState<"roster" | "prices" | "appointments" | "services">("roster");

  // Price Modal State
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceItemCode, setPriceItemCode] = useState("");
  const [priceBdt, setPriceBdt] = useState("");
  const [priceSource, setPriceSource] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);

  // Staff Account Modal State
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState("receptionist");
  const [staffSaving, setStaffSaving] = useState(false);

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [chamberName, setChamberName] = useState("");
  const [doctorFeeBdt, setDoctorFeeBdt] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);

  // Search & Filter
  const [rosterSearch, setRosterSearch] = useState("");
  const [priceSearch, setPriceSearch] = useState("");

  // Save / Update Price Handler
  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceSource.trim()) {
      addToast("error", "Source Required", "State the verifiable source (e.g. Hospital Price Board Nov 2026).");
      return;
    }

    setPriceSaving(true);
    try {
      await api("/facility/prices", {
        body: {
          item_code: priceItemCode.trim(),
          price_bdt: Number(priceBdt),
          source: priceSource.trim(),
        },
      });
      priceCatalogue.reload();
      addToast("success", "Price Confirmed", `${priceItemCode} updated to BDT ${priceBdt}.`);
      setPriceModalOpen(false);
      setPriceItemCode("");
      setPriceBdt("");
      setPriceSource("");
    } catch (e: any) {
      addToast("error", "Price Update Failed", e.message);
    } finally {
      setPriceSaving(false);
    }
  };

  // Add Staff Account Handler
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffSaving(true);
    try {
      await api("/facility/staff", {
        body: {
          email: staffEmail.trim(),
          password: staffPassword,
          staff_role: staffRole,
        },
      });
      addToast("success", "Staff Account Created", `Account for ${staffEmail} is now active.`);
      setStaffModalOpen(false);
      setStaffEmail("");
      setStaffPassword("");
    } catch (e: any) {
      addToast("error", "Staff Creation Failed", e.message);
    } finally {
      setStaffSaving(false);
    }
  };

  // Update Doctor Chamber & Fee Schedule Handler
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSaving(true);
    try {
      await api("/facility/schedules", {
        body: {
          doctor_id: selectedDoctorId,
          chamber: chamberName.trim(),
          fee_bdt: doctorFeeBdt ? Number(doctorFeeBdt) : undefined,
          schedule: { days: ["Sun", "Tue", "Thu"], hours: "17:00-20:00" },
        },
      });
      dashboard.reload();
      addToast("success", "Schedule Updated", "Doctor chamber and consultation fee updated.");
      setScheduleModalOpen(false);
    } catch (e: any) {
      addToast("error", "Schedule Update Failed", e.message);
    } finally {
      setScheduleSaving(false);
    }
  };

  const facility = dashboard.data?.facility;
  const roster = dashboard.data?.roster || [];
  const prices = priceCatalogue.data?.items || [];
  const appts = appointmentQueue.data?.items || [];

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter((r: any) => {
      const q = rosterSearch.toLowerCase();
      return !rosterSearch || (r.name || "").toLowerCase().includes(q) || (r.chamber || "").toLowerCase().includes(q);
    });
  }, [roster, rosterSearch]);

  // Filtered Prices
  const filteredPrices = useMemo(() => {
    return prices.filter((p: any) => {
      const q = priceSearch.toLowerCase();
      return !priceSearch || (p.item_code || "").toLowerCase().includes(q) || (p.source || "").toLowerCase().includes(q);
    });
  }, [prices, priceSearch]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={facility?.name || "Hospital Operations Portal"}
        subtitle={`Dhaka District Clinical Facility · ${facility?.verification === "verified" ? "Hospital Council Verified" : "Verification in Progress"}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Hospital Portal", href: "/facility" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {facility?.verification && verChip(facility.verification)}
            {isFacilityAdmin && (
              <Button size="sm" variant="outline" icon={UserPlus} onClick={() => setStaffModalOpen(true)}>
                Add Desk Staff
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => {
                dashboard.reload();
                priceCatalogue.reload();
                appointmentQueue.reload();
                addToast("info", "Refreshed", "Hospital operations data updated.");
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <Async loading={dashboard.loading && !dashboard.data} error={dashboard.error} onRetry={dashboard.reload}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={Stethoscope}
            label="Affiliated Doctors"
            value={roster.length}
            accent
            trend="neutral"
            trendLabel="On active roster"
          />
          <StatTile
            icon={DollarSign}
            label="Verified Price Items"
            value={prices.length}
            trend="up"
            trendLabel="Stamped with source"
          />
          <StatTile
            icon={CalendarClock}
            label="Total Appointments"
            value={dashboard.data?.appointments?.total ?? appts.length}
            trend="neutral"
            trendLabel="Facility bookings"
          />
          <StatTile
            icon={Clock}
            label="Pending Confirmation"
            value={dashboard.data?.appointments?.requested ?? appts.filter((a: any) => a.status === "requested").length}
            trend="down"
            trendLabel="Awaiting check-in"
          />
        </div>
      </Async>

      {/* Navigation Tabs */}
      <TabGroup
        tabs={[
          { key: "roster", label: "Doctor Roster & Chambers", count: roster.length, icon: Stethoscope },
          { key: "prices", label: "Price Catalogue & Transparency", count: prices.length, icon: DollarSign },
          { key: "appointments", label: "Facility Appointment Queue", count: appts.length, icon: CalendarClock },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* =========================================================
         TAB 1: DOCTOR ROSTER
         ========================================================= */}
      {activeTab === "roster" && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-ptext" />
                <span>Affiliated Medical Practitioner Roster</span>
              </h2>
              <p className="text-xs text-muted">Doctors practicing at this facility with chamber numbers and confirmed fees</p>
            </div>

            <SearchInput
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              onClear={() => setRosterSearch("")}
              placeholder="Search roster by doctor or chamber..."
              className="sm:max-w-xs"
            />
          </div>

          <Async
            loading={dashboard.loading && !dashboard.data}
            error={dashboard.error}
            onRetry={dashboard.reload}
            empty={filteredRoster.length === 0}
            emptyNode={
              <EmptyState
                icon={Stethoscope}
                title="No affiliated doctors"
                body="Doctors linked to your facility via BMDC affiliations will appear here."
              />
            }
            skeleton="table"
          >
            <Table>
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Chamber / Room</th>
                  <th>Consultation Fee</th>
                  <th>Doctor ID</th>
                  {isFacilityAdmin && <th className="text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map((r: any) => (
                  <tr key={r.doctor_id} className="hover:bg-s2/40 transition">
                    <td className="font-bold text-ink">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-psoft text-xs font-bold text-ptext">
                          {(r.name || "D")[0].toUpperCase()}
                        </span>
                        <span>{r.name || "Doctor"}</span>
                      </div>
                    </td>
                    <td className="text-xs text-muted font-mono">{r.chamber || "Main OPD"}</td>
                    <td className="num font-semibold text-ptext">
                      {r.fee_bdt ? `BDT ${r.fee_bdt}` : <Chip kind="unverified">Not confirmed</Chip>}
                    </td>
                    <td className="num text-xs text-muted font-mono">{r.doctor_id?.slice(0, 12)}…</td>
                    {isFacilityAdmin && (
                      <td className="text-right">
                        <Button
                          size="xs"
                          variant="secondary"
                          icon={Edit2}
                          onClick={() => {
                            setSelectedDoctorId(r.doctor_id);
                            setChamberName(r.chamber || "");
                            setDoctorFeeBdt(r.fee_bdt ? String(r.fee_bdt) : "");
                            setScheduleModalOpen(true);
                          }}
                        >
                          Edit Chamber
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </Async>
        </Card>
      )}

      {/* =========================================================
         TAB 2: PRICE CATALOGUE & SOURCE PROVENANCE
         ========================================================= */}
      {activeTab === "prices" && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-ptext" />
                <span>Medical Procedure & Diagnostic Price Catalogue</span>
              </h2>
              <p className="text-xs text-muted">Transparent, source-confirmed pricing stamped with confirmation dates</p>
            </div>

            <div className="flex items-center gap-2">
              <SearchInput
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                onClear={() => setPriceSearch("")}
                placeholder="Search procedures or tests..."
                className="sm:max-w-xs"
              />
              {isFacilityAdmin && (
                <Button size="sm" icon={Plus} onClick={() => setPriceModalOpen(true)}>
                  Set Price
                </Button>
              )}
            </div>
          </div>

          <Async
            loading={priceCatalogue.loading && !priceCatalogue.data}
            error={priceCatalogue.error}
            onRetry={priceCatalogue.reload}
            empty={filteredPrices.length === 0}
            emptyNode={
              <EmptyState
                icon={DollarSign}
                title="No price records published"
                body="Publish your facility's consultation and diagnostic fees with source provenance."
                action={
                  isFacilityAdmin ? (
                    <Button size="sm" onClick={() => setPriceModalOpen(true)}>
                      Add First Price
                    </Button>
                  ) : undefined
                }
              />
            }
            skeleton="table"
          >
            <Table>
              <thead>
                <tr>
                  <th>Procedure / Item Code</th>
                  <th>Fee (BDT)</th>
                  <th>Last Confirmed</th>
                  <th>Source Provenance</th>
                  {isFacilityAdmin && <th className="text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((p: any) => (
                  <tr key={p.id} className="hover:bg-s2/40 transition">
                    <td className="font-bold text-ink uppercase">{p.item_code}</td>
                    <td className="num font-bold text-ptext text-sm">BDT {p.price_bdt}</td>
                    <td className="num text-xs text-muted">{fmtDate(p.confirmed_at)}</td>
                    <td className="text-xs text-muted font-mono">{p.source}</td>
                    {isFacilityAdmin && (
                      <td className="text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setPriceItemCode(p.item_code);
                            setPriceBdt(String(p.price_bdt));
                            setPriceSource(p.source || "");
                            setPriceModalOpen(true);
                          }}
                        >
                          Update
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </Async>
        </Card>
      )}

      {/* =========================================================
         TAB 3: APPOINTMENT QUEUE
         ========================================================= */}
      {activeTab === "appointments" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-ptext" />
                <span>Facility Appointment Front Desk Queue</span>
              </h2>
              <p className="text-xs text-muted">Live queue for check-ins and reception desk management</p>
            </div>
          </div>

          <Async
            loading={appointmentQueue.loading && !appointmentQueue.data}
            error={appointmentQueue.error}
            onRetry={appointmentQueue.reload}
            empty={appts.length === 0}
            emptyNode={
              <EmptyState
                icon={CalendarClock}
                title="Queue Empty"
                body="No appointments scheduled at your facility right now."
              />
            }
            skeleton="table"
          >
            <Table>
              <thead>
                <tr>
                  <th>Scheduled Time</th>
                  <th>Patient</th>
                  <th>Attending Doctor</th>
                  <th>Status</th>
                  <th>Visit Reason</th>
                </tr>
              </thead>
              <tbody>
                {appts.map((a: any) => (
                  <tr key={a.id} className="hover:bg-s2/40 transition">
                    <td className="num text-xs text-ink font-semibold">{fmtDateTime(a.slot_start)}</td>
                    <td className="font-semibold text-xs text-ink">{a.patient_name || a.patient_id}</td>
                    <td className="text-xs text-ptext font-medium">{a.doctor_name || "Doctor"}</td>
                    <td>
                      <Chip kind={a.status === "confirmed" ? "verified" : a.status === "cancelled" ? "failed" : "pending"}>
                        {a.status}
                      </Chip>
                    </td>
                    <td className="text-xs text-muted max-w-[200px] truncate">{a.reason || "General visit"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Async>
        </Card>
      )}

      {/* Set Price Modal */}
      <Dialog open={priceModalOpen} title="Set / Confirm Procedure Price" onClose={() => setPriceModalOpen(false)}>
        <form onSubmit={handlePriceSubmit} className="space-y-4 text-sm">
          <Input
            label="Item / Procedure Code *"
            value={priceItemCode}
            onChange={(e) => setPriceItemCode(e.target.value)}
            placeholder="e.g. CBC, GLUCOSE_FASTING, OPD_CONSULTATION"
            required
          />
          <Input
            label="Price (BDT) *"
            type="number"
            value={priceBdt}
            onChange={(e) => setPriceBdt(e.target.value)}
            placeholder="e.g. 500"
            required
          />
          <Input
            label="Source Provenance (Mandatory) *"
            value={priceSource}
            onChange={(e) => setPriceSource(e.target.value)}
            placeholder="e.g. Approved Facility Tariff Nov 2026"
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPriceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={priceSaving}>
              Confirm Price
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add Staff Account Modal */}
      <Dialog open={staffModalOpen} title="Create Facility Staff Account" onClose={() => setStaffModalOpen(false)}>
        <form onSubmit={handleStaffSubmit} className="space-y-4 text-sm">
          <Input
            label="Staff Email *"
            type="email"
            value={staffEmail}
            onChange={(e) => setStaffEmail(e.target.value)}
            placeholder="reception@hospital.example"
            required
          />
          <Input
            label="Temporary Password *"
            type="password"
            value={staffPassword}
            onChange={(e) => setStaffPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <div>
            <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
              Desk Role *
            </label>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value)}
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none"
            >
              <option value="receptionist">Receptionist (Appointments & Check-in)</option>
              <option value="report_desk">Report Desk (Diagnostic Extractions)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={staffSaving}>
              Create Account
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Doctor Schedule / Chamber Modal */}
      <Dialog open={scheduleModalOpen} title="Update Doctor Chamber & Fee" onClose={() => setScheduleModalOpen(false)}>
        <form onSubmit={handleScheduleSubmit} className="space-y-4 text-sm">
          <Input
            label="Chamber Room Number *"
            value={chamberName}
            onChange={(e) => setChamberName(e.target.value)}
            placeholder="e.g. Room 402, Building B"
            required
          />
          <Input
            label="Consultation Fee (BDT)"
            type="number"
            value={doctorFeeBdt}
            onChange={(e) => setDoctorFeeBdt(e.target.value)}
            placeholder="e.g. 1000"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button type="button" variant="secondary" size="sm" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={scheduleSaving}>
              Save Chamber & Fee
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
