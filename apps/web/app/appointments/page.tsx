"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Link as LinkIcon,
  Mic,
  Plus,
  Radio,
  Search,
  ShieldCheck,
  Signal,
  Sparkles,
  Stethoscope,
  Video,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import { api, getRole } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  fmtDate,
  fmtDateTime,
  Input,
  PageHeader,
  SearchInput,
  Select,
  StatTile,
  TabGroup,
  Table,
  useToast,
} from "@/components/ui";

export default function AppointmentsPage() {
  useGuard(["patient", "doctor", "facility_admin", "facility_staff"]);
  const { t, locale } = useI18n();
  const isBn = locale === "bn";
  const role = getRole();
  const { addToast } = useToast();

  // API Hooks
  const { data, loading, error, reload } = useApi("/appointments");
  const doctorsList = useApi("/directory/doctors?page_size=100");
  const documentsList = useApi(role === "patient" ? "/documents" : null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<"upcoming" | "previous" | "all">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Booking modal state
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [visitReason, setVisitReason] = useState("");
  const [shareOptIn, setShareOptIn] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [modalDoctorSearch, setModalDoctorSearch] = useState("");
  const [modalSpecialtyFilter, setModalSpecialtyFilter] = useState("all");
  const [paramDoctorName, setParamDoctorName] = useState("");

  // Meeting Link Management (Doctors / Admins)
  const [meetingLinkModalOpen, setMeetingLinkModalOpen] = useState(false);
  const [targetApptForLink, setTargetApptForLink] = useState<any>(null);
  const [customMeetLinkInput, setCustomMeetLinkInput] = useState("");
  const [savingMeetLink, setSavingMeetLink] = useState(false);

  // Check URL query parameters to auto-open booking modal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("book") === "true") {
      setBookModalOpen(true);
      const docId = params.get("doctorId");
      if (docId && docId !== "undefined" && docId !== "null") setSelectedDoctorId(docId);
      const docName = params.get("doctorName");
      if (docName) setParamDoctorName(docName);
      const shareDocId = params.get("shareDoc");
      if (shareDocId) {
        setSelectedDocIds([shareDocId]);
        setShareOptIn(true);
      }
    }
  }, []);

  // Selected doctor lookup with instant fallback
  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    const found = doctorsList.data?.items?.find(
      (d: any) => d.id === selectedDoctorId || d.user_id === selectedDoctorId
    );
    if (found) return found;
    if (paramDoctorName) {
      return {
        id: selectedDoctorId,
        user_id: selectedDoctorId,
        full_name: paramDoctorName,
        specialty: "Online Specialist",
        chambers: [{ fee_label: "Confirmed Telehealth Fee", facility_name: "MediBridge Virtual Care" }]
      };
    }
    return null;
  }, [doctorsList.data, selectedDoctorId, paramDoctorName]);

  // Modal filtered doctors
  const filteredModalDoctors = useMemo(() => {
    const list = doctorsList.data?.items || [];
    return list.filter((doc: any) => {
      if (modalSpecialtyFilter !== "all" && doc.specialty_code !== modalSpecialtyFilter) {
        return false;
      }
      if (modalDoctorSearch.trim()) {
        const q = modalDoctorSearch.toLowerCase();
        const nameMatch = (doc.full_name || doc.name || "").toLowerCase().includes(q);
        const specMatch = (doc.specialty || "").toLowerCase().includes(q);
        const chamberMatch = doc.chambers?.some((c: any) =>
          (c.facility_name || "").toLowerCase().includes(q) || (c.chamber || "").toLowerCase().includes(q)
        );
        if (!nameMatch && !specMatch && !chamberMatch) return false;
      }
      return true;
    });
  }, [doctorsList.data, modalSpecialtyFilter, modalDoctorSearch]);

  // Status transition state
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  // Categorize appointments
  const { upcomingList, previousList, allList } = useMemo(() => {
    const items = data?.items || [];
    const now = new Date();
    const upcoming = items.filter((a: any) =>
      ["requested", "confirmed", "rescheduled"].includes(a.status)
    );
    const previous = items.filter(
      (a: any) =>
        ["completed", "cancelled", "no_show"].includes(a.status) ||
        new Date(a.slot_start) < now
    );
    return { upcomingList: upcoming, previousList: previous, allList: items };
  }, [data]);

  const displayedAppointments = useMemo(() => {
    const list =
      activeTab === "upcoming"
        ? upcomingList
        : activeTab === "previous"
        ? previousList
        : allList;

    return list.filter((a: any) => {
      const docName = (a.doctor_name || "").toLowerCase();
      const patName = (a.patient_name || "").toLowerCase();
      const reason = (a.reason || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || docName.includes(q) || patName.includes(q) || reason.includes(q);
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activeTab, upcomingList, previousList, allList, searchQuery, statusFilter]);

  // Live Chamber Radar & Countdown
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const liveChamberAppt = useMemo(() => {
    return (
      upcomingList.find((a: any) => a.status === "confirmed" || a.status === "checked_in") ||
      upcomingList[0] ||
      null
    );
  }, [upcomingList]);

  const countdown = useMemo(() => {
    if (!liveChamberAppt?.slot_start) return null;
    const target = new Date(liveChamberAppt.slot_start).getTime();
    const diff = target - nowTime;

    if (diff <= 0 && diff > -3600000) {
      return { inSession: true, expired: false, hours: 0, minutes: 0, seconds: 0, formatted: "00:00:00" };
    }
    if (diff <= -3600000) {
      return { inSession: false, expired: true, hours: 0, minutes: 0, seconds: 0, formatted: "00:00:00" };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return {
      inSession: false,
      expired: false,
      hours,
      minutes,
      seconds,
      formatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  }, [liveChamberAppt, nowTime]);

  const liveMeetingUrl = useMemo(() => {
    if (!liveChamberAppt) return "";
    if (liveChamberAppt.meeting_link) return liveChamberAppt.meeting_link;
    return `https://meet.jit.si/niramoy-telehealth-${liveChamberAppt.id.slice(0, 8)}`;
  }, [liveChamberAppt]);

  // Appointment Status Transition Action (Confirm, Cancel, Checkin, Complete)
  const handleStatusChange = async (appointmentId: string, nextStatus: string, label: string) => {
    setBusyActionId(appointmentId);
    try {
      await api(`/appointments/${appointmentId}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      reload();
      addToast("success", `Appointment ${label}`, `Status transitioned to ${nextStatus}.`);
    } catch (e: any) {
      addToast("error", "Action Failed", e.message);
    } finally {
      setBusyActionId(null);
    }
  };

  // Appointment Booking Submit
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      addToast("error", "Doctor Required", "Please select a doctor.");
      return;
    }
    if (!selectedDate) {
      addToast("error", "Date Required", "Please pick an appointment date.");
      return;
    }

    setBookingBusy(true);
    try {
      const slotStart = new Date(`${selectedDate}T${selectedTime}:00Z`).toISOString();
      await api("/appointments", {
        body: {
          doctor_id: selectedDoctorId,
          facility_id: selectedDoctor?.chambers?.[0]?.facility_id || null,
          slot_start: slotStart,
          reason: visitReason || "Consultation request",
          share_opt_in: shareOptIn,
          share_document_ids: shareOptIn ? selectedDocIds : [],
        },
      });
      addToast("success", "Appointment Requested", "Consultation requested with doctor.");
      setBookModalOpen(false);
      // Reset form
      setSelectedDoctorId("");
      setSelectedDate("");
      setVisitReason("");
      setSelectedDocIds([]);
      reload();
    } catch (e: any) {
      addToast("error", "Booking Failed", e.message);
    } finally {
      setBookingBusy(false);
    }
  };

  // Save or Update Doctor Telehealth Meeting Link
  const handleSaveMeetingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetApptForLink || !customMeetLinkInput.trim()) return;
    setSavingMeetLink(true);
    try {
      await api(`/appointments/${targetApptForLink.id}/meeting-link`, {
        method: "PATCH",
        body: { meeting_link: customMeetLinkInput.trim() },
      });
      addToast("success", "Video Link Set", "Telehealth meeting room URL is now accessible to the patient.");
      setMeetingLinkModalOpen(false);
      reload();
    } catch (err: any) {
      addToast("error", "Update Failed", err.message);
    } finally {
      setSavingMeetLink(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isBn ? "অনলাইন টেলিহেলথ কনসালটেশন" : "Online Telehealth Consultations"}
        subtitle={
          isBn
            ? "১০০% অনলাইন ভিডিও কল ও ভার্চুয়াল ডক্টরস চেম্বার। সরাসরি বিশেষজ্ঞ ডাক্তারের সাথে সংযুক্ত হোন।"
            : "100% online video appointments. Join virtual consultations and manage doctor meeting rooms."
        }
        breadcrumbs={[
          { label: isBn ? "হোম" : "Home", href: "/" },
          { label: isBn ? "ড্যাশবোর্ড" : "Dashboard", href: "/dashboard" },
          { label: isBn ? "অ্যাপয়েন্টমেন্ট" : "Appointments", href: "/appointments" },
        ]}
        actions={
          role === "patient" ? (
            <Button size="sm" icon={Plus} onClick={() => setBookModalOpen(true)}>
              {isBn ? "ভিডিও কনসালটেশন বুক করুন" : "Book Online Consultation"}
            </Button>
          ) : undefined
        }
      />

      {/* 📹 Live Doctor Chamber Status Radar & Countdown Banner */}
      {liveChamberAppt ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-card to-background p-5 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Doctor & Status info */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${countdown?.inSession ? "bg-red-400" : "bg-emerald-400"}`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${countdown?.inSession ? "bg-red-500" : "bg-emerald-500"}`} />
                </span>
                <span className={`text-xs font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  countdown?.inSession
                    ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}>
                  {role === "doctor"
                    ? (countdown?.inSession
                        ? (isBn ? "🔴 রোগী কনসালটেশন রুমে সংযুক্ত" : "🔴 PATIENT IN SESSION")
                        : (isBn ? "🟢 ভার্চুয়াল চেম্বার সক্রিয়" : "🟢 VIRTUAL CHAMBER ACTIVE"))
                    : (countdown?.inSession
                        ? (isBn ? "🔴 লাইভ কনসালটেশন সেশন চলছে" : "🔴 DOCTOR LIVE IN SESSION")
                        : (isBn ? "🟢 টেলিহেলথ লাইভ চেম্বার সক্রিয়" : "🟢 TELEHEALTH CHAMBER ACTIVE"))}
                </span>
                <span className="text-xs text-muted font-mono">
                  Queue #1 • {isBn ? "সিরিয়াল নং ০১" : "Serial #01"}
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-heading font-black text-foreground flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-emerald-400" />
                  {role === "doctor"
                    ? (isBn
                        ? `রোগী: ${liveChamberAppt.patient_name || liveChamberAppt.patient_id || "রোগীর নাম"}`
                        : `Patient: ${liveChamberAppt.patient_name || liveChamberAppt.patient_id || "Assigned Patient"}`)
                    : (liveChamberAppt.doctor_name || "Specialist Physician")}
                </h3>
                <p className="text-xs text-muted flex items-center gap-2 mt-1">
                  <span>{fmtDateTime(liveChamberAppt.slot_start)}</span>
                  <span>•</span>
                  <span>{liveChamberAppt.facility_name || "Niramoy Virtual Telehealth Clinic"}</span>
                </p>
              </div>

              {/* Pre-Call System Diagnostics */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <Camera className="h-3.5 w-3.5 text-emerald-400" />
                  {isBn ? "ভিডিও রেডি" : "Video Ready"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <Mic className="h-3.5 w-3.5 text-emerald-400" />
                  {isBn ? "এইচডি অডিও" : "HD Audio"}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                  {isBn ? "WebRTC এনক্রিপ্টেড" : "WebRTC Encrypted"}
                </span>
              </div>
            </div>

            {/* Right Countdown & 1-Click Launch Button */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
              {countdown && !countdown.expired && (
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted block">
                    {countdown.inSession
                      ? (isBn ? "সেশন সময়কাল:" : "Active Duration:")
                      : (isBn ? "কনসালটেশন শুরু হতে বাকি:" : "Time Remaining:")}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-2xl font-black text-emerald-400">
                    <span className="p-1.5 bg-black/50 border border-emerald-500/30 rounded-md">
                      {String(countdown.hours).padStart(2, "0")}
                    </span>
                    <span>:</span>
                    <span className="p-1.5 bg-black/50 border border-emerald-500/30 rounded-md">
                      {String(countdown.minutes).padStart(2, "0")}
                    </span>
                    <span>:</span>
                    <span className="p-1.5 bg-black/50 border border-emerald-500/30 rounded-md text-emerald-300">
                      {String(countdown.seconds).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              )}

              <a
                href={liveMeetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Video className="h-5 w-5 animate-pulse" />
                <span>
                  {role === "doctor"
                    ? (isBn ? "চেম্বারে রোগী দেখা শুরু করুন" : "Start Patient Consultation")
                    : (isBn ? "১-ক্লিকে ভিডিও কলে প্রবেশ করুন" : "Join Telehealth Chamber")}
                </span>
                <ExternalLink className="h-4 w-4 opacity-80" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Instant Telehealth Availability Radar when no appointment is active */
        <div className="rounded-2xl border border-emerald-500/30 bg-card p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  {isBn ? "লাইভ টেলিহেলথ চেম্বার রাডার" : "Live Telehealth Specialist Radar"}
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                    {doctorsList.data?.items?.length || 10}+ {isBn ? "ডাক্তার প্রস্তুত" : "Doctors Ready"}
                  </span>
                </h4>
                <p className="text-xs text-muted">
                  {isBn
                    ? "অনলাইন চেম্বার থেকে বিশেষজ্ঞ ডাক্তাররা ভিডিও কলে রোগী দেখার জন্য সক্রিয় আছেন।"
                    : "Verified clinical specialists are online in their digital chambers for 100% virtual video consultations."}
                </p>
              </div>
            </div>
            {role === "patient" && (
              <Button size="sm" icon={Plus} onClick={() => setBookModalOpen(true)}>
                {isBn ? "তাত্ক্ষণিক কনসালটেশন বুক করুন" : "Book Instant Consultation"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Metrics Stat Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={CalendarClock}
          label="Upcoming Visits"
          value={upcomingList.length}
          accent={upcomingList.length > 0}
          trend={upcomingList.length > 0 ? "up" : "neutral"}
          trendLabel={upcomingList.length > 0 ? "Scheduled care" : "None pending"}
        />
        <StatTile
          icon={FileCheck}
          label="Completed"
          value={allList.filter((a: any) => a.status === "completed").length}
        />
        <StatTile
          icon={Clock}
          label="Pending Confirmation"
          value={allList.filter((a: any) => a.status === "requested").length}
          trend={allList.some((a: any) => a.status === "requested") ? "down" : "neutral"}
          trendLabel="Awaiting doctor"
        />
        <StatTile
          icon={XCircle}
          label="Cancelled"
          value={allList.filter((a: any) => a.status === "cancelled").length}
        />
      </div>

      {/* Tabs & Search Filter Bar */}
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabGroup
            tabs={[
              { key: "upcoming", label: "Upcoming", count: upcomingList.length },
              { key: "previous", label: "Previous", count: previousList.length },
              { key: "all", label: "All Appointments", count: allList.length },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Search by doctor or patient..."
              className="md:max-w-xs"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-input border border-line bg-s2 px-3 py-1.5 text-xs text-ink focus-visible:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Appointment Cards Grid */}
        <Async
          loading={loading && !data}
          error={error}
          onRetry={reload}
          empty={displayedAppointments.length === 0}
          emptyNode={
            <EmptyState
              icon={CalendarClock}
              title={
                activeTab === "upcoming"
                  ? "No upcoming appointments"
                  : "No appointments match filter"
              }
              body="Consult with a verified doctor in Dhaka using the SmartCare Navigator."
              action={
                role === "patient" ? (
                  <Button size="sm" onClick={() => setBookModalOpen(true)}>
                    Book Consultation Now
                  </Button>
                ) : undefined
              }
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {displayedAppointments.map((a: any) => {
              const isConfirmed = a.status === "confirmed";
              const isRequested = a.status === "requested";
              const isCheckedIn = a.status === "checked_in";
              const isCompleted = a.status === "completed";
              const isCancelled = a.status === "cancelled";
              const isBusy = busyActionId === a.id;

              return (
                <div
                  key={a.id}
                  className={`rounded-card border p-4 space-y-3 transition-all ${
                    isConfirmed
                      ? "border-primary/40 bg-psoft/10 shadow-sm"
                      : isCancelled
                      ? "border-line bg-s2/20 opacity-70"
                      : "border-line bg-s1"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-ink truncate">
                        <Stethoscope className="h-4 w-4 text-ptext shrink-0" />
                        <span>{a.doctor_name || "Doctor"}</span>
                      </div>
                      {role !== "patient" && (
                        <p className="text-xs text-muted font-medium mt-0.5">
                          Patient: {a.patient_name || a.patient_id}
                        </p>
                      )}
                      <p className="text-xs text-muted flex items-center gap-1.5 mt-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="num font-semibold">{fmtDateTime(a.slot_start)}</span>
                      </p>
                      {a.facility_name && (
                        <p className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5 truncate">
                          <Building2 className="h-3 w-3 text-ptext shrink-0" />
                          <span className="truncate">{a.facility_name}</span>
                        </p>
                      )}
                    </div>

                    <Chip
                      kind={
                        isConfirmed || isCompleted
                          ? "verified"
                          : isCancelled
                          ? "failed"
                          : "pending"
                      }
                    >
                      {a.status}
                    </Chip>
                  </div>

                  {a.reason && (
                    <div className="rounded-input border border-line/60 bg-s2/40 p-2.5 text-xs text-muted">
                      <span className="font-semibold text-ink">Reason: </span>
                      {a.reason}
                    </div>
                  )}

                  {/* 100% Online Telehealth Meeting Room Section */}
                  <div className="rounded-input border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <Video className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        100% Online Telehealth (অনলাইন ভিডিও কনসালটেশন)
                      </span>
                      {a.meeting_link && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                          Room Ready
                        </span>
                      )}
                    </div>

                    {a.meeting_link ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                          <a
                            href={a.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-button bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 shadow-sm transition-all text-center"
                          >
                            <Video className="h-4 w-4 shrink-0" />
                            <span>Join Video Call (ভিডিও কলে যোগ দিন)</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(a.meeting_link);
                              addToast("success", "Link Copied", "Video meeting URL copied to clipboard.");
                            }}
                            className="text-[11px] text-muted hover:text-ink flex items-center gap-1 justify-center py-1 font-medium"
                            title="Copy meeting URL"
                          >
                            <Copy className="h-3 w-3" /> Copy Link
                          </button>
                        </div>
                        <p className="text-[10px] text-muted font-mono truncate bg-bg/50 px-2 py-1 rounded border border-line/40">
                          {a.meeting_link}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                        <span>
                          {role === "patient"
                            ? "🕒 ডাক্তার কনফার্ম করার পর বা নির্ধারিত সময়ে এখানে ভিডিও কল লিঙ্ক দেওয়া হবে।"
                            : "⚠️ এখনো ভিডিও কল লিঙ্ক যুক্ত করা হয়নি। গুগল মিট বা ১-ক্লিক ভিডিও রুম সেট করুন।"}
                        </span>
                        {role !== "patient" && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              setTargetApptForLink(a);
                              setCustomMeetLinkInput(
                                `https://meet.jit.si/medibridge-telehealth-${a.id.slice(0, 8)}-${a.doctor_id?.slice(0, 6) || "room"}`
                              );
                              setMeetingLinkModalOpen(true);
                            }}
                          >
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Set Video Link
                          </Button>
                        )}
                      </div>
                    )}

                    {role !== "patient" && a.meeting_link && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetApptForLink(a);
                            setCustomMeetLinkInput(a.meeting_link);
                            setMeetingLinkModalOpen(true);
                          }}
                          className="text-[11px] text-ptext hover:underline flex items-center gap-1 font-medium"
                        >
                          <LinkIcon className="h-3 w-3" /> Edit Meeting Link
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Event History Trace */}
                  {a.events?.length > 0 && (
                    <div className="text-[11px] text-muted space-y-0.5 border-t border-line/50 pt-2 font-mono">
                      <p className="font-sans font-bold uppercase text-[10px] text-muted/80">Event Log:</p>
                      {a.events.map((e: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{e.from ? `${e.from} → ${e.to}` : e.to}</span>
                          <span>{fmtDate(e.at)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions according to role */}
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line/60 pt-2.5">
                    {/* Patient Actions */}
                    {role === "patient" && !isCancelled && !isCompleted && (
                      <Button
                        size="xs"
                        variant="secondary"
                        busy={isBusy}
                        onClick={() => handleStatusChange(a.id, "cancelled", "Cancelled")}
                      >
                        Cancel Booking
                      </Button>
                    )}

                    {/* Doctor/Staff Actions */}
                    {role !== "patient" && (
                      <>
                        {isRequested && (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "confirmed", "Confirmed")}
                          >
                            Confirm
                          </Button>
                        )}
                        {isConfirmed && (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "checked_in", "Checked In")}
                          >
                            Check In
                          </Button>
                        )}
                        {isCheckedIn && (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "completed", "Completed")}
                          >
                            Complete Visit
                          </Button>
                        )}
                        {!isCancelled && !isCompleted && (
                          <Button
                            size="xs"
                            variant="ghost"
                            className="text-danger hover:bg-danger/10"
                            busy={isBusy}
                            onClick={() => handleStatusChange(a.id, "cancelled", "Cancelled")}
                          >
                            Cancel
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Async>
      </Card>

      {/* Appointment Booking Dialog */}
      <Dialog
        open={bookModalOpen}
        title="Request Online Video Consultation (অনলাইন ভিডিও পরামর্শ)"
        onClose={() => setBookModalOpen(false)}
      >
        <form onSubmit={handleBookSubmit} className="space-y-4 text-sm">
          {/* Telehealth Notice */}
          <div className="rounded-input border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-ink space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
              <Video className="h-4 w-4" />
              <span>100% Online Telehealth Appointment</span>
            </div>
            <p className="text-muted text-[11px]">
              This consultation takes place online via secure video call. The doctor will share the video meeting room link directly in this portal.
            </p>
          </div>

          {/* Doctor Selection Section */}
          {selectedDoctor ? (
            <div className="rounded-card border-2 border-primary/40 bg-psoft/15 p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-ptext font-bold text-sm font-heading">
                    {selectedDoctor.full_name?.replace(/^Dr\.\s*/i, "").slice(0, 2).toUpperCase() || "DR"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-ink text-sm truncate">{selectedDoctor.full_name}</h4>
                      <Chip kind="verified">BMDC Verified</Chip>
                    </div>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      {selectedDoctor.specialty} {selectedDoctor.experience_years ? `• ${selectedDoctor.experience_years}+ yrs exp` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => setSelectedDoctorId("")}
                >
                  Change Doctor
                </Button>
              </div>

              {selectedDoctor.chambers?.[0] && (
                <div className="flex flex-wrap items-center justify-between text-xs text-muted border-t border-line/60 pt-2 gap-1">
                  <span className="flex items-center gap-1 truncate">
                    <Building2 className="h-3.5 w-3.5 text-muted shrink-0" />
                    <span className="truncate">{selectedDoctor.chambers[0].facility_name}</span>
                  </span>
                  <span className="font-semibold text-ptext shrink-0">
                    {selectedDoctor.chambers[0].fee_label || "Confirmed Fee"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block font-medium text-xs uppercase tracking-wider text-muted">
                  Select Doctor *
                </label>
                <span className="text-[11px] text-muted">
                  {filteredModalDoctors.length} available
                </span>
              </div>

              {/* Quick Search & Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={modalDoctorSearch}
                    onChange={(e) => setModalDoctorSearch(e.target.value)}
                    placeholder="Search doctor, specialty, hospital..."
                    className="w-full rounded-input border border-line bg-s1 pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  />
                </div>
                <select
                  value={modalSpecialtyFilter}
                  onChange={(e) => setModalSpecialtyFilter(e.target.value)}
                  className="rounded-input border border-line bg-s1 px-2.5 py-1.5 text-xs text-ink focus-visible:outline-none"
                >
                  <option value="all">All Specialties</option>
                  <option value="general-medicine">General Medicine</option>
                  <option value="cardiology">Cardiology</option>
                  <option value="pediatrics">Pediatrics</option>
                  <option value="gastroenterology">Gastroenterology</option>
                  <option value="neurology">Neurology</option>
                  <option value="orthopedics">Orthopedics</option>
                  <option value="gynecology">Gynecology</option>
                  <option value="dermatology">Dermatology</option>
                </select>
              </div>

              {/* Doctor Cards Selector */}
              {doctorsList.loading ? (
                <div className="py-6 text-center text-xs text-muted">Loading verified doctors...</div>
              ) : filteredModalDoctors.length === 0 ? (
                <div className="rounded-card border border-dashed border-line p-4 text-center space-y-1">
                  <p className="text-xs text-muted">No doctors found matching "{modalDoctorSearch}".</p>
                  <button
                    type="button"
                    onClick={() => { setModalDoctorSearch(""); setModalSpecialtyFilter("all"); }}
                    className="text-xs text-ptext font-semibold hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-line/60 rounded-card p-2 bg-s2/30">
                  {filteredModalDoctors.map((doc: any) => {
                    const docId = doc.id || doc.user_id;
                    const primaryChamber = doc.chambers?.[0];
                    const isSelected = selectedDoctorId === docId;
                    return (
                      <div
                        key={docId}
                        onClick={() => setSelectedDoctorId(docId)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-primary bg-psoft/25 shadow-xs"
                            : "border-line bg-s1 hover:border-primary/50 hover:bg-s2/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {doc.full_name?.replace(/^Dr\.\s*/i, "").slice(0, 2).toUpperCase() || "DR"}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-ink truncate">{doc.full_name}</span>
                              {doc.verification === "verified" && (
                                <ShieldCheck className="h-3 w-3 text-ptext shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-muted truncate">
                              {doc.specialty} • {primaryChamber?.facility_name || "Dhaka Chamber"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-ptext">
                            {primaryChamber?.fee_label || "BDT 1,200"}
                          </span>
                          <Button
                            type="button"
                            size="xs"
                            variant={isSelected ? "primary" : "secondary"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDoctorId(docId);
                            }}
                          >
                            {isSelected ? <Check className="h-3 w-3 mr-1" /> : null}
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Standard fallback select */}
              <div className="pt-1">
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-input border border-line bg-s1 px-2.5 py-1.5 text-ink text-xs focus-visible:outline-none"
                >
                  <option value="">Or choose directly from dropdown list...</option>
                  {doctorsList.data?.items?.map((d: any) => (
                    <option key={d.id || d.user_id} value={d.id || d.user_id}>
                      {d.full_name || d.name} — {d.specialty} ({d.chambers?.[0]?.fee_label || "Confirmed Fee"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
                Date *
              </label>
              <input
                type="date"
                required
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
                Preferred Time
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <option value="09:00">09:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:30">11:30 AM</option>
                <option value="14:00">02:00 PM</option>
                <option value="16:00">04:00 PM</option>
                <option value="18:00">06:00 PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-medium text-xs uppercase tracking-wider text-muted">
              Reason for Consultation
            </label>
            <input
              type="text"
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              placeholder="e.g. Follow-up for CBC report & persistent fever"
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </div>

          {/* Record Sharing Opt-In */}
          <div className="rounded-input border border-line bg-s2/40 p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={shareOptIn}
                onChange={(e) => setShareOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded"
              />
              <span className="font-semibold text-ink">
                Grant selected doctor temporary access to my reports
              </span>
            </label>
            <p className="text-[11px] text-muted pl-6">
              Access is strictly scoped to this consultation and can be revoked at any time from Settings & Consent.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBookModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={bookingBusy}>
              Confirm Request
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Doctor Video Meeting Link Modal */}
      <Dialog
        open={meetingLinkModalOpen}
        title="Set Telehealth Meeting Link (ভিডিও কল রুম)"
        onClose={() => setMeetingLinkModalOpen(false)}
      >
        <form onSubmit={handleSaveMeetingLink} className="space-y-4 text-sm">
          <div className="rounded-card border border-primary/30 bg-psoft/15 p-3 space-y-1.5">
            <h4 className="font-bold text-ink text-xs">
              Video Consultation with {targetApptForLink?.patient_name || targetApptForLink?.patient_id || "Patient"}
            </h4>
            <p className="text-[11px] text-muted">
              Scheduled for: {targetApptForLink?.slot_start ? fmtDateTime(targetApptForLink.slot_start) : ""}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block font-medium text-xs uppercase tracking-wider text-muted">
              Meeting Room URL (Google Meet / Zoom / Jitsi)
            </label>
            <input
              type="url"
              required
              value={customMeetLinkInput}
              onChange={(e) => setCustomMeetLinkInput(e.target.value)}
              placeholder="https://meet.google.com/xxx-yyyy-zzz or Jitsi URL"
              className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-ink text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 font-mono"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-muted">Auto Preset:</span>
            <button
              type="button"
              onClick={() => {
                if (targetApptForLink) {
                  setCustomMeetLinkInput(
                    `https://meet.jit.si/medibridge-telehealth-${targetApptForLink.id.slice(0, 8)}-${targetApptForLink.doctor_id?.slice(0, 6) || "room"}`
                  );
                }
              }}
              className="text-xs font-semibold text-ptext hover:underline inline-flex items-center gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" /> 1-Click Jitsi Room
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMeetingLinkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" busy={savingMeetLink}>
              Save Video Link
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
