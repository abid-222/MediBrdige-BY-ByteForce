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
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  Filter,
  HelpCircle,
  MapPin,
  MessageSquare,
  PhoneCall,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Video,
} from "lucide-react";
import { api, getRole, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import { fmtSchedule } from "@/lib/format";
import {
  AiBanner,
  Async,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  GlassCard,
  PageHeader,
  SearchInput,
  StatTile,
  useToast,
  verChip,
} from "@/components/ui";

type NavigatorView = "hub" | "guidance" | "doctors" | "emergency";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  data?: {
    emergency?: boolean;
    primary_specialty?: string;
    primary_specialty_label?: string;
    suggested_specialties?: string[];
    preparation_tips?: string[];
    red_flags_to_watch?: string[];
    disclaimer?: string;
    emergency_number?: string;
    ml_info?: any;
  };
  error?: boolean;
}

export default function SmartCareNavigator() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { addToast } = useToast();
  const role = getRole();
  const isLoggedIn = !!getToken();

  // Current Active View State
  const [currentView, setCurrentView] = useState<NavigatorView>("hub");

  // Chat / General Health Guidance State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "initial-assistant",
      sender: "assistant",
      text:
        locale === "bn"
          ? "আসসালামু আলাইকুম। আমি আপনার মেডিব্রিজ কেয়ার নেভিগেটর। আপনার শারীরিক কোনো লক্ষণ বা স্বাস্থ্য সমস্যা আমাকে জানান, আমি সঠিক বিশেষজ্ঞ ডাক্তার নির্ধারণ ও পরামর্শ প্রদান করতে সহায়তা করব।"
          : "Hello! I am your MediBridge Smart Care Navigator. Describe your symptoms or health questions, and I will recommend the right clinical specialty, provide pre-consultation guidance, and check for safety red flags.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Doctors & Directory State
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [onlyTelehealth, setOnlyTelehealth] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [navSortBy, setNavSortBy] = useState<"smart" | "fee_asc" | "fee_desc" | "experience">("smart");

  // API Hooks for Directory
  const metaApi = useApi("/directory/meta");
  const doctorsApi = useApi("/directory/doctors");

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (currentView === "guidance") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatBusy, currentView]);

  // Check URL query parameters to jump to specific view
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam === "guidance" || viewParam === "doctors" || viewParam === "emergency") {
      setCurrentView(viewParam);
    }
    const specParam = params.get("specialty");
    if (specParam) {
      setSelectedSpecialty(specParam);
    }
  }, []);

  // Handler for Patient-Protected Actions
  const handleProtectedAction = (destination: string, description: string) => {
    if (isLoggedIn && role === "patient") {
      router.push(destination);
    } else {
      addToast(
        "info",
        "Patient Sign In Required",
        `Please sign in as a patient to access ${description}.`
      );
      router.push(`/login?next=${encodeURIComponent(destination)}`);
    }
  };

  // 6 Interactive Quick-Tap Bengali & English Symptom Chips
  const QUICK_SYMPTOM_CHIPS = [
    {
      icon: "🌡️",
      label: "তীব্র জ্বর ও গা ব্যথা",
      prompt: "আমার ২ দিন ধরে তীব্র জ্বর আর গা ব্যথা, কী করা উচিত?",
    },
    {
      icon: "🫁",
      label: "কাশি ও শ্বাসকষ্ট",
      prompt: "আমার বুকে কফ জমে আছে এবং শ্বাস নিতে কিছুটা কষ্ট হচ্ছে, কী করা উচিত?",
    },
    {
      icon: "🤢",
      label: "পেট খারাপ ও বুকজ্বালা",
      prompt: "আমার তীব্র পেট ব্যথা, বদহজম এবং বুকজ্বালা করছে, কী পরামর্শ?",
    },
    {
      icon: "💔",
      label: "বুকে চাপ বা ব্যথা",
      prompt: "আমার বুকে ভারী চাপ ও অস্বস্তি লাগছে, এটি কী হৃদরোগের লক্ষণ?",
    },
    {
      icon: "🩸",
      label: "সুগার বা প্রেশার বৃদ্ধি",
      prompt: "আমার রক্তচাপ এবং রক্তের সুগার হঠাৎ অনেক বেড়ে গেছে, কী করণীয়?",
    },
    {
      icon: "👶",
      label: "শিশুর জ্বর বা ডায়রিয়া",
      prompt: "আমার বাচ্চার তীব্র জ্বর ও পাতলা পায়খানা হচ্ছে, কী প্রাথমিক যত্ন নেব?",
    },
  ];

  // Handler for Submitting General Health Guidance Query
  const handleSendGuidance = async (arg?: string | React.FormEvent) => {
    let query = chatInput.trim();
    if (typeof arg === "string") {
      query = arg.trim();
    } else if (arg && typeof (arg as any).preventDefault === "function") {
      (arg as React.FormEvent).preventDefault();
    }
    if (!query || chatBusy) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatBusy(true);
    setChatError("");

    try {
      const response = await api("/navigator/guidance", {
        method: "POST",
        body: {
          text: query,
          lang: locale,
        },
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        data: response,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      if (response.emergency) {
        addToast(
          "error",
          "Medical Emergency Alert",
          "Potential emergency detected. Please call 999 or proceed to an emergency department immediately."
        );
      }
    } catch (err: any) {
      const errorMsgText = err.message || "Failed to receive response from navigation service.";
      setChatError(errorMsgText);
      const errorAssistantMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: "assistant",
        text: `Unable to process query: ${errorMsgText}. Please try rephrasing or search directly in our doctor directory.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        error: true,
      };
      setChatMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setChatBusy(false);
    }
  };

  // Filter & Smart Rank Doctors
  const filteredDoctors = useMemo(() => {
    const list = doctorsApi.data?.items || [];
    const filtered = list.filter((doc: any) => {
      // Specialty filter
      if (selectedSpecialty !== "all" && doc.specialty_code !== selectedSpecialty) {
        return false;
      }
      // Verification filter
      if (onlyVerified && doc.verification !== "verified") {
        return false;
      }
      // Telehealth filter
      if (onlyTelehealth) {
        const hasOnline = doc.chambers?.some((c: any) =>
          c.facility_name?.toLowerCase().includes("online") ||
          c.facility_name?.toLowerCase().includes("telehealth") ||
          c.facility_type === "private"
        );
        if (!hasOnline && doc.chambers?.length === 0) return false;
      }
      // Text query
      if (doctorSearch.trim()) {
        const q = doctorSearch.toLowerCase();
        const nameMatch = doc.full_name?.toLowerCase().includes(q);
        const specMatch = doc.specialty?.toLowerCase().includes(q) || doc.specialty_name_en?.toLowerCase().includes(q);
        const facilityMatch = doc.chambers?.some((c: any) => c.facility_name?.toLowerCase().includes(q));
        if (!nameMatch && !specMatch && !facilityMatch) return false;
      }
      return true;
    });

    // Score & Badges
    const enriched = filtered.map((doc: any) => {
      const primaryChamber = doc.chambers?.[0];
      const fee = primaryChamber?.fee_bdt || 1500;
      const exp = doc.experience_years || 0;
      const isVerified = doc.verification === "verified";
      const hasSchedule = !!primaryChamber?.schedule;

      let score = 50;
      const badges: string[] = [];

      if (fee <= 1000) {
        score += 35;
        badges.push("💰 সাশ্রয়ী ফি (Best Value)");
      } else if (fee <= 1500) {
        score += 15;
      }

      if (isVerified) score += 25;
      if (exp >= 12) {
        score += 20;
        badges.push("⭐ শীর্ষ অভিজ্ঞ");
      }
      if (hasSchedule) {
        score += 15;
        badges.push("🕒 শিডিউল নির্ধারিত");
      }

      return {
        ...doc,
        _smartScore: score,
        _fee: fee,
        _exp: exp,
        _badges: badges,
      };
    });

    return enriched.sort((a: any, b: any) => {
      if (navSortBy === "smart") return b._smartScore - a._smartScore;
      if (navSortBy === "fee_asc") return a._fee - b._fee;
      if (navSortBy === "fee_desc") return b._fee - a._fee;
      if (navSortBy === "experience") return b._exp - a._exp;
      return 0;
    });
  }, [doctorsApi.data, selectedSpecialty, onlyVerified, onlyTelehealth, doctorSearch, navSortBy]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* View Header with Back button if in sub-view */}
      {currentView !== "hub" && (
        <div className="flex items-center justify-between border-b border-line pb-4">
          <button
            onClick={() => setCurrentView("hub")}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-s1 px-3 py-1.5 text-xs font-semibold text-muted hover:bg-s2 hover:text-ink transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to All Navigator Options</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Active Pathway:</span>
            <span className="rounded-full bg-psoft px-2.5 py-0.5 text-xs font-bold text-ptext capitalize">
              {currentView === "guidance"
                ? "General Health Guidance"
                : currentView === "doctors"
                ? "Find a Doctor"
                : "Emergency Help"}
            </span>
          </div>
        </div>
      )}

      {/* =========================================================
         1. MAIN NAVIGATOR HUB ("How can we help you today?")
         ========================================================= */}
      {currentView === "hub" && (
        <div className="space-y-8 slide-up">
          {/* Hero Welcome Card */}
          <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-s1 via-s1 to-psoft/30 p-6 md:p-8 shadow-sm">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-psoft px-3 py-1 text-xs font-semibold text-ptext">
                <Compass className="h-3.5 w-3.5" />
                <span>Smart Care Navigator</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-ink">
                How can we help you today?
              </h1>
              <p className="text-sm md:text-base text-muted leading-relaxed">
                Choose a direct healthcare pathway below or consult our AI health assistant for symptom triage, doctor matching, and care guidance.
              </p>
            </div>
          </div>

          {/* 6 Core Action Pathway Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Find a Doctor */}
            <button
              type="button"
              onClick={() => setCurrentView("doctors")}
              className="text-left w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Card
                hover
                className="h-full space-y-3 border border-line p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Stethoscope className="h-6 w-6" />
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">Find a Doctor</h2>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Search certified specialists across Dhaka by department, experience, hospital affiliation, and consultation fee.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ptext">
                    Browse Doctor Directory &rarr;
                  </span>
                </div>
              </Card>
            </button>

            {/* 2. Book 100% Online Video Consultation */}
            <button
              type="button"
              onClick={() => handleProtectedAction("/appointments?book=true", "Online Video Consultation")}
              className="text-left w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Card
                hover
                className="h-full space-y-3 border border-emerald-500/40 bg-emerald-500/5 p-5 transition-all duration-200 hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <Video className="h-6 w-6" />
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">অনলাইন ভিডিও পরামর্শ (Book Telehealth)</h2>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    ১০০% অনলাইন ভিডিও কনসালটেশন। ডাক্তারের ভার্চুয়াল রুমে যুক্ত হয়ে ডিজিটাল প্রেসক্রিপশন সংগ্রহ করুন।
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    বুক অনলাইন কনসালটেশন &rarr;
                  </span>
                </div>
              </Card>
            </button>

            {/* 3. Understand a Medical Report */}
            <button
              type="button"
              onClick={() => handleProtectedAction("/reports", "Medical Reports & OCR")}
              className="text-left w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Card
                hover
                className="h-full space-y-3 border border-line p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                    <FileText className="h-6 w-6" />
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">Understand a Medical Report</h2>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Upload CBC, Lipid, or Glucose reports for automated OCR scanning, low-confidence validation, and AI explanation.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400">
                    Open Report Vault &rarr;
                  </span>
                </div>
              </Card>
            </button>

            {/* 5. Get General Health Guidance */}
            <button
              type="button"
              onClick={() => setCurrentView("guidance")}
              className="text-left w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Card
                hover
                className="h-full space-y-3 border border-line p-5 transition-all duration-200 hover:border-emerald-500/50 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink">Get General Health Guidance</h2>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Chat with our intelligent symptom analyzer to determine the right medical department and preparation steps.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    Start Interactive Chat &rarr;
                  </span>
                </div>
              </Card>
            </button>

            {/* 6. Emergency Help */}
            <button
              type="button"
              onClick={() => setCurrentView("emergency")}
              className="text-left w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <Card
                hover
                className="h-full space-y-3 border border-danger/40 bg-danger/5 p-5 transition-all duration-200 hover:border-danger hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger/10 text-danger">
                    <AlertTriangle className="h-6 w-6" />
                  </span>
                  <ChevronRight className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-danger">Emergency Help</h2>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Immediate 24/7 hotline numbers (999, 16263), ambulance dispatch, and critical warning alerts.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-danger">
                    Access Emergency Hotlines &rarr;
                  </span>
                </div>
              </Card>
            </button>
          </div>

          {/* Safety Disclaimer Banner */}
          <div className="rounded-xl border border-line/70 bg-s2/60 p-4 text-xs text-muted flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-ink">MediBridge Safety Notice:</span> The Smart Care Navigator provides healthcare triage, navigation, and provider discovery. It is strictly informational and does not replace the diagnostic judgment of a licensed medical practitioner.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================
         2. TEXT-BASED INTERACTION (GENERAL HEALTH GUIDANCE)
         ========================================================= */}
      {currentView === "guidance" && (
        <div className="space-y-4 slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-ink flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                General Health Guidance & Triage
              </h1>
              <p className="text-xs text-muted">
                Describe your symptoms in plain language (English or Bangla) to receive preliminary clinical specialty suggestions.
              </p>
            </div>
            <button
              onClick={() => setChatMessages((prev) => prev.slice(0, 1))}
              className="text-xs text-muted hover:text-ink font-medium self-start sm:self-auto"
            >
              Clear Conversation
            </button>
          </div>

          {/* 6 Interactive Quick-Tap Bengali & English Symptom Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-ptext" />
                সরাসরি লক্ষণ সিলেক্ট করুন (Quick Symptom Triage):
              </span>
              <span className="text-[11px] text-muted">এক-ক্লিকে তাৎক্ষণিক দিকনির্দেশনা</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_SYMPTOM_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={chatBusy}
                  onClick={() => handleSendGuidance(chip.prompt)}
                  className="flex items-center gap-2 rounded-xl border border-line bg-s1 p-2.5 text-left text-xs text-ink hover:border-primary hover:bg-psoft/15 transition-all shadow-xs group cursor-pointer disabled:opacity-50"
                >
                  <span className="text-base shrink-0 group-hover:scale-110 transition-transform">
                    {chip.icon}
                  </span>
                  <span className="font-semibold truncate">{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Container */}
          <Card className="min-h-[440px] max-h-[560px] overflow-y-auto flex flex-col p-4 space-y-4 bg-s1/60">
            {chatMessages.map((msg) => {
              const isAssistant = msg.sender === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
                >
                  {isAssistant && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-2.5 leading-relaxed shadow-sm ${
                      isAssistant
                        ? msg.error
                          ? "border border-danger/40 bg-danger/10 text-ink"
                          : "border border-line bg-s2/80 text-ink"
                        : "bg-primary text-onprimary font-medium"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Emergency Alert Card within Chat */}
                    {msg.data?.emergency && (
                      <div className="rounded-xl border border-danger/60 bg-danger/15 p-3 text-danger space-y-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Emergency Medical Attention Required</span>
                        </div>
                        <p className="text-xs">
                          Your symptoms indicate potential red-flag medical distress. Do not wait for a chat reply or routine appointment.
                        </p>
                        <div className="pt-1 flex flex-wrap gap-2">
                          <a
                            href={`tel:${msg.data.emergency_number || "999"}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-danger/90 transition"
                          >
                            <PhoneCall className="h-3.5 w-3.5" />
                            <span>Call {msg.data.emergency_number || "999"} Now</span>
                          </a>
                          <button
                            onClick={() => setCurrentView("emergency")}
                            className="inline-flex items-center gap-1 rounded-lg border border-danger/50 bg-s1 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                          >
                            View Emergency Centers &rarr;
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 4 Structured Patient-Friendly Cards */}
                    {isAssistant && msg.data && !msg.data.emergency && (
                      <div className="space-y-3 pt-2">
                        {/* 1. 🚨 জরুরি সতর্কতা (Red Flags / Emergency Triage) */}
                        {msg.data.red_flags_to_watch && msg.data.red_flags_to_watch.length > 0 && (
                          <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-warn">
                              <ShieldAlert className="h-4 w-4 shrink-0" />
                              <span>১. জরুরি সতর্কতা ও বিপদের লক্ষণ (Red Flags)</span>
                            </div>
                            <ul className="space-y-1 text-ink/80 pl-5 list-disc">
                              {msg.data.red_flags_to_watch.map((rf, idx) => (
                                <li key={idx} className="font-medium">{rf}</li>
                              ))}
                            </ul>
                            <p className="text-[11px] text-muted pt-1">
                              ⚠️ উপরের কোনো বিপদজনক লক্ষণ দেখা দিলে দেরি না করে তাৎক্ষণিক নিকটস্থ হাসপাতালের ইমার্জেন্সিতে যান অথবা ৯৯৯-এ কল করুন।
                            </p>
                          </div>
                        )}

                        {/* 2. 💡 সম্ভাব্য কারণ ও প্রাথমিক স্বাস্থ্য বিশ্লেষণ (Educational Overview) */}
                        <div className="rounded-xl border border-line bg-s1 p-3 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-ptext">
                            <Sparkles className="h-4 w-4 shrink-0" />
                            <span>২. প্রাথমিক স্বাস্থ্য বিশ্লেষণ ও দিকনির্দেশনা (Educational Overview)</span>
                          </div>
                          <p className="text-muted leading-relaxed">
                            {msg.text}
                          </p>
                        </div>

                        {/* 3. 🏠 এখনই করণীয় ও ঘরোয়া যত্ন (Immediate Relief & Home Care) */}
                        {msg.data.preparation_tips && msg.data.preparation_tips.length > 0 && (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>৩. এখনই করণীয় ও প্রাথমিক ঘরোয়া যত্ন (Home Relief & Prep)</span>
                            </div>
                            <ul className="space-y-1 text-ink/80 pl-5 list-disc">
                              {msg.data.preparation_tips.map((tip, idx) => (
                                <li key={idx} className="font-medium">{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 4. 👨‍⚕️ সঠিক বিশেষজ্ঞ ডাক্তার ও ১-ক্লিক অনলাইন পরামর্শ (Recommended Specialist) */}
                        <div className="rounded-xl border border-primary/40 bg-psoft/20 p-3 text-xs space-y-2.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 font-bold text-ptext">
                              <Stethoscope className="h-4 w-4 shrink-0" />
                              <span>৪. সুপারিশকৃত বিশেষজ্ঞ ডাক্তার (Recommended Specialist)</span>
                            </div>
                            {msg.data.primary_specialty_label && (
                              <span className="rounded-full border border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-ptext">
                                {msg.data.primary_specialty_label}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() =>
                                handleProtectedAction(
                                  `/appointments?book=true${
                                    msg.data?.primary_specialty
                                      ? `&specialty=${encodeURIComponent(msg.data.primary_specialty)}`
                                      : ""
                                  }`,
                                  "Online Telehealth Consultation"
                                )
                              }
                            >
                              <Video className="h-3.5 w-3.5 mr-1" />
                              ১-ক্লিক অনলাইন ভিডিও বুকিং (Book Telehealth) &rarr;
                            </Button>

                            {msg.data.primary_specialty && (
                              <Button
                                size="xs"
                                variant="secondary"
                                onClick={() => {
                                  setSelectedSpecialty(msg.data!.primary_specialty!);
                                  setCurrentView("doctors");
                                }}
                              >
                                <Stethoscope className="h-3.5 w-3.5 mr-1" />
                                তালিকা থেকে ডাক্তার খুঁজুন &rarr;
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Disclaimer */}
                        {msg.data.disclaimer && (
                          <p className="text-[10px] text-muted italic pt-1">
                            ℹ️ {msg.data.disclaimer}
                          </p>
                        )}
                      </div>
                    )}

                    <div
                      className={`text-[10px] ${
                        isAssistant ? "text-muted" : "text-onprimary/70 text-right"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {!isAssistant && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-psoft text-ptext">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {chatBusy && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl border border-line bg-s2/80 px-4 py-3 text-xs text-muted flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span>Evaluating clinical symptoms and safety guidelines...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </Card>

          {/* Chat Input Box */}
          <form onSubmit={handleSendGuidance} className="space-y-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendGuidance();
                  }
                }}
                disabled={chatBusy}
                placeholder="Type your health concern, e.g., 'cough with low grade fever for 4 days'..."
                className="w-full rounded-input border border-line bg-s1 px-4 py-3 text-xs md:text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 pr-24 shadow-sm"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                <Button
                  type="submit"
                  size="sm"
                  disabled={chatInput.trim().length < 2 || chatBusy}
                  busy={chatBusy}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted flex items-center gap-1">
              <span>Press <kbd className="font-mono bg-s2 px-1 rounded border border-line">Enter</kbd> to send.</span>
              <span>AI guidance is strictly educational and does not provide an official prescription.</span>
            </p>
          </form>
        </div>
      )}

      {/* =========================================================
         3. DOCTOR AND APPOINTMENT NAVIGATION ("Find a Doctor")
         ========================================================= */}
      {currentView === "doctors" && (
        <div className="space-y-5 slide-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Find a Doctor & Book Clinical Consultation
              </h1>
              <p className="text-xs text-muted">
                Explore licensed physicians across Dhaka. Filter by specialty, chamber, or remote telehealth availability.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleProtectedAction("/appointments?book=true", "Appointment Booking")}
            >
              <CalendarClock className="h-4 w-4 mr-1.5" />
              Direct Booking Portal
            </Button>
          </div>

          {/* Filter Bar */}
          <Card className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              {/* Search text */}
              <div className="md:col-span-1">
                <SearchInput
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  onClear={() => setDoctorSearch("")}
                  placeholder="Search doctor or hospital name..."
                />
              </div>

              {/* Specialty dropdown */}
              <div className="md:col-span-1">
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  aria-label="Filter doctors by medical specialty"
                  className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 min-h-[38px]"
                >
                  <option value="all">All Specialties ({metaApi.data?.specialties?.length || "All"})</option>
                  {(metaApi.data?.specialties || []).map((s: any) => (
                    <option key={s.code} value={s.code}>
                      {s.name_en} {s.name_bn ? `(${s.name_bn})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checkbox filters */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted md:col-span-1 justify-end">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-ink">
                  <input
                    type="checkbox"
                    checked={onlyTelehealth}
                    onChange={(e) => setOnlyTelehealth(e.target.checked)}
                    className="rounded border-line text-primary focus:ring-primary"
                  />
                  <span>Online / Telehealth</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-ink">
                  <input
                    type="checkbox"
                    checked={onlyVerified}
                    onChange={(e) => setOnlyVerified(e.target.checked)}
                    className="rounded border-line text-primary focus:ring-primary"
                  />
                  <span>Verified BMDC Only</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Doctors Listing */}
          <Async
            loading={doctorsApi.loading}
            error={doctorsApi.error}
            onRetry={doctorsApi.reload}
          >
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted px-1">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-ink">{filteredDoctors.length}</strong> available doctor
                    {filteredDoctors.length === 1 ? "" : "s"}
                  </span>
                  {selectedSpecialty !== "all" && (
                    <button
                      onClick={() => setSelectedSpecialty("all")}
                      className="text-ptext hover:underline font-medium"
                    >
                      Reset specialty filter
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink shrink-0">সর্ট / প্রায়োরিটি:</span>
                  <select
                    value={navSortBy}
                    onChange={(e: any) => setNavSortBy(e.target.value)}
                    className="rounded-input border border-line bg-s1 px-2.5 py-1 text-xs text-ink focus-visible:outline-none"
                  >
                    <option value="smart">⚡ AI Smart Priority (সেরা মিল)</option>
                    <option value="fee_asc">💰 স্বল্প ফি (Lowest Fee First)</option>
                    <option value="fee_desc">💎 প্রিমিয়াম ফি (Highest Fee)</option>
                    <option value="experience">⭐ শীর্ষ অভিজ্ঞতা (Senior Specialists)</option>
                  </select>
                </div>
              </div>

              {filteredDoctors.length === 0 ? (
                <EmptyState
                  icon={Stethoscope}
                  title="No Doctors Found"
                  body="No healthcare providers matched your chosen filters. Try resetting the specialty or keywords."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredDoctors.map((doc: any) => {
                    const chambers = doc.chambers || [];
                    const primaryChamber = chambers[0];
                    const feeText = primaryChamber?.fee_bdt ? `BDT ${primaryChamber.fee_bdt}` : "Fee on request";
                    const docId = doc.id || doc.user_id;

                    return (
                      <Card
                        key={docId}
                        className="flex flex-col justify-between space-y-4 p-5 hover:border-primary/50 transition shadow-sm"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm font-heading">
                                {doc.full_name?.replace(/^Dr\.\s*/i, "").slice(0, 2).toUpperCase() || "DR"}
                              </span>
                              <div>
                                <h2 className="text-base font-bold text-ink">{doc.full_name}</h2>
                                <p className="text-xs text-ptext font-semibold">
                                  {doc.specialty || doc.specialty_name_en || doc.specialty_code}
                                  {doc.experience_years ? ` · ${doc.experience_years} yrs exp` : ""}
                                </p>
                              </div>
                            </div>
                            {verChip(doc.verification)}
                          </div>

                          {/* Smart Badges */}
                          {doc._badges?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {doc._badges.map((bText: string, bIdx: number) => (
                                <span
                                  key={bIdx}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                                >
                                  {bText}
                                </span>
                              ))}
                            </div>
                          )}

                          {doc.qualifications && (
                            <p className="text-xs text-muted line-clamp-1">{doc.qualifications}</p>
                          )}

                          {primaryChamber && (
                            <div className="rounded-lg bg-s2/60 p-2.5 text-xs text-muted space-y-1.5">
                              <div className="flex items-center justify-between gap-1.5 font-medium text-ink">
                                <span className="flex items-center gap-1.5 truncate">
                                  <Building2 className="h-3.5 w-3.5 text-ptext shrink-0" />
                                  <span className="truncate">{primaryChamber.facility_name}</span>
                                </span>
                                <span className="font-bold text-ptext shrink-0">{feeText}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-muted border-t border-line/40 pt-1">
                                <span className="flex items-center gap-1 truncate">
                                  <Clock className="h-3 w-3 text-ptext shrink-0" />
                                  <span className="truncate">{fmtSchedule(primaryChamber.schedule)}</span>
                                </span>
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded shrink-0">
                                  অনলাইন ভিডিও
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                          <Link
                            href={`/directory/doctors/${docId}`}
                            className="text-xs font-semibold text-muted hover:text-ink transition"
                          >
                            View Profile &rarr;
                          </Link>
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() =>
                              handleProtectedAction(
                                `/appointments?book=true&doctorId=${docId}&doctorName=${encodeURIComponent(doc.full_name)}`,
                                `Appointment with ${doc.full_name}`
                              )
                            }
                          >
                            <CalendarClock className="h-3.5 w-3.5 mr-1" />
                            Book Appointment
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </Async>
        </div>
      )}

      {/* =========================================================
         4. EMERGENCY HELP INTERFACE
         ========================================================= */}
      {currentView === "emergency" && (
        <div className="space-y-6 slide-up max-w-4xl mx-auto">
          {/* Critical Warning Header */}
          <div className="rounded-2xl border-2 border-danger bg-danger/10 p-6 md:p-8 space-y-3">
            <div className="flex items-center gap-3 text-danger">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger text-white shadow-lg animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold font-heading">
                  Emergency Medical Services
                </h1>
                <p className="text-xs md:text-sm font-semibold opacity-90">
                  Do not wait for AI guidance, chat responses, or an appointment during a critical medical emergency.
                </p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-ink/80 leading-relaxed pt-2">
              If someone is experiencing chest pain, difficulty breathing, severe bleeding, sudden weakness, speech loss, or unconsciousness, immediate physical emergency care is required.
            </p>
          </div>

          {/* Verified Emergency Hotlines Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {/* National Emergency 999 */}
            <Card className="border border-danger/40 bg-s1 p-5 space-y-3 hover:border-danger transition">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-danger/10 px-2 py-1 text-[11px] font-bold text-danger uppercase tracking-wider">
                  National Hotline
                </span>
                <PhoneCall className="h-5 w-5 text-danger" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-mono text-danger">999</h2>
                <p className="text-xs font-semibold text-ink mt-0.5">National Emergency Service</p>
                <p className="text-[11px] text-muted mt-1">
                  Ambulance, Fire Service, and Police emergency response across Bangladesh. 24 hours toll-free.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="tel:999"
                  className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-danger font-bold text-xs text-white shadow hover:bg-danger/90 transition"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Call 999 (National)</span>
                </a>
              </div>
            </Card>

            {/* Health Helpline 16263 */}
            <Card className="border border-line bg-s1 p-5 space-y-3 hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-psoft px-2 py-1 text-[11px] font-bold text-ptext uppercase tracking-wider">
                  24/7 Health Desk
                </span>
                <PhoneCall className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-mono text-ink">16263</h2>
                <p className="text-xs font-semibold text-ink mt-0.5">Shastho Batayan</p>
                <p className="text-[11px] text-muted mt-1">
                  Ministry of Health 24/7 tele-medicine and certified doctor helpline for urgent medical queries.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="tel:16263"
                  className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-line bg-s2 font-bold text-xs text-ink hover:bg-s3 transition"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Call 16263</span>
                </a>
              </div>
            </Card>

            {/* Dhaka Medical College Hospital (DMCH) Emergency */}
            <Card className="border border-line bg-s1 p-5 space-y-3 hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Dhaka ER Center
                </span>
                <Building2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono text-ink truncate">+880 2-55165088</h2>
                <p className="text-xs font-semibold text-ink mt-0.5">DMCH Emergency Room</p>
                <p className="text-[11px] text-muted mt-1">
                  Dhaka Medical College & Hospital 24/7 Acute Trauma & Emergency Department.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href="tel:+880255165088"
                  className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-line bg-s2 font-bold text-xs text-ink hover:bg-s3 transition"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Call DMCH ER</span>
                </a>
              </div>
            </Card>
          </div>

          {/* Full Emergency Directory & Hospital Map Link */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-line bg-s1 p-5">
            <div className="space-y-1">
              <h2 className="font-bold text-sm text-ink">Need a Dhaka Hospital with an Emergency Room?</h2>
              <p className="text-xs text-muted">
                View our verified emergency facility registry including government ICUs and ambulance bays.
              </p>
            </div>
            <Link href="/emergency">
              <Button variant="secondary" size="sm">
                Open Full Emergency Directory &rarr;
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}