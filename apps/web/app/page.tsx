"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileCheck2,
  FileSearch,
  FileText,
  FlaskConical,
  HeartPulse,
  KeyRound,
  LineChart,
  Lock,
  PhoneCall,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
  Users,
  Video,
} from "lucide-react";
import { api, getRole, getToken, homeFor } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { WatermelonNavbar } from "@/components/watermelon/WatermelonNavbar";
import { WatermelonHero } from "@/components/watermelon/WatermelonHero";
import { TelemetryStats } from "@/components/watermelon/TelemetryStats";
import { ManusBentoGrid } from "@/components/ManusBentoGrid";
import { WatermelonBrowserDemo } from "@/components/watermelon/WatermelonBrowserDemo";
import { CommunityMarquee } from "@/components/watermelon/CommunityMarquee";
import { Spotlight3DCard } from "@/components/Spotlight3DCard";
import { CardSplitAccordion, type AccordionItemData } from "@/components/watermelon/card-split-accordian";
import { LandingPage3DBoot } from "@/components/LandingPage3DBoot";

export default function Home() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"patient" | "doctor" | "hospital" | "admin">("patient");
  const [currentRole, setCurrentRole] = useState<string>("none");

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (token && role) {
      setCurrentRole(role);
    }
  }, []);

  const isBn = locale === "bn";

  const bnFaqItems: AccordionItemData[] = [
    {
      id: 1,
      title: "ডুয়াল-গেট ক্লিনিক্যাল সেফটি গার্ড কীভাবে জীবন রক্ষা করে?",
      icon: <ShieldCheck className="h-5 w-5 text-primary" />,
      tag: "CLINICAL GATE",
      content:
        "রোগীর প্রতিটি ইনপুট এআই মডেলের কাছে যাওয়ার আগে একটি কঠোর অ্যালগরিদমিক নিয়মে যাচাই হয়। বুকে তীব্র ব্যথা, শ্বাসকষ্ট বা আত্মঘাতী ভাবনার মতো রেড-ফ্ল্যাগ উপসর্গ দেখা দিলে এটি সাথে সাথে সাধারণ বুকিং বাতিল করে ৯৯৯ জরুরি সেবা এবং নিকটবর্তী জরুরি হাসপাতালের পথ দেখায়।",
    },
    {
      id: 2,
      title: "দ্বিভাষিক প্রেসক্রিপশন ও ল্যাব OCR কীভাবে মান এক্সট্রাক্ট করে?",
      icon: <FileSearch className="h-5 w-5 text-info" />,
      tag: "OCR VISION",
      content:
        "হাতে লেখা বা প্রিন্টেড বাংলা ও ইংরেজি প্রেসক্রিপশন স্ক্যান করে হিমোগ্লোবিন, প্লেটলেট, ক্রিয়েটিনিন বা সুগারের মতো মূল প্যারামিটারগুলো চিহ্নিত করা হয়। প্রতিটি মানের জন্য কনফিডেন্স স্কোর থাকে যাতে ডাক্তার সহজেই মূল স্ক্যানের সাথে মিলিয়ে ভেরিফাই করতে পারেন।",
    },
    {
      id: 3,
      title: "১০০% অনলাইন টেলিহেলথ ও অটোমেটেড গুগল মিট সিস্টেম কীভাবে কাজ করে?",
      icon: <Video className="h-5 w-5 text-primary" />,
      tag: "TELEHEALTH",
      content:
        "আমাদের সকল কনসাল্টেশন সম্পূর্ণ অনলাইনে পরিচালিত হয়। কোনো ফিজিক্যাল হসপিটাল ভিজিটের ঝামেলা নেই। অ্যাপয়েন্টমেন্ট কনফার্ম হওয়ার সাথে সাথে অটোমেটিক গুগল মিট লিংক তৈরি হয় এবং ডাক্তার নির্ধারিত সময়ে রোগীর সাথে অনলাইনে সরাসরি মিটিংয়ে অংশ নেন।",
    },
    {
      id: 4,
      title: "বিএমডিসি (BMDC) রেজিস্ট্রির মাধ্যমে কীভাবে ডাক্তারদের লাইসেন্স অডিট হয়?",
      icon: <Stethoscope className="h-5 w-5 text-warn" />,
      tag: "VERIFICATION",
      content:
        "সকল চিকিৎসককে বাংলাদেশ মেডিকেল অ্যান্ড ডেন্টাল কাউন্সিল (BMDC) এর বৈধ রেজিস্ট্রেশন নম্বর দিয়ে নিবন্ধন করতে হয়। সুপার অ্যাডমিনরা সরকারি রেকর্ডের সাথে মিলিয়ে যাচাই সাপেক্ষে ব্লু-ব্যাজ অনুমোদন দেন। ভুয়া তথ্য দিলে কারণ দর্শিয়ে অ্যাকাউন্ট স্থগিত করা হয়।",
    },
    {
      id: 5,
      title: "রোগীর কনসেন্ট ও অপরিবর্তনীয় অডিট ট্রেইল কীভাবে কাজ করে?",
      icon: <Lock className="h-5 w-5 text-danger" />,
      tag: "DATA PRIVACY",
      content:
        "রোগী তার মেডিক্যাল তথ্যের একক মালিক। যতক্ষণ না রোগী সক্রিয় সম্মতি (Consent) দিচ্ছেন, ততক্ষণ কোনো ডাক্তার তার চার্ট দেখতে পারেন না। প্রতিটি অ্যাকশন (লগইন, ফাইল খোলা, এআই ড্রাফট এডিট) ক্রিপ্টোগ্রাফিকভাবে সাইন হয়ে অপরিবর্তনীয় অডিট লগে সংরক্ষিত থাকে।",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-bg text-ink font-sans selection:bg-primary/20 selection:text-primary">
      {/* 0. High-Tech 3D Medical Hologram Opening Sequence */}
      <LandingPage3DBoot />

      {/* 1. Technical Watermelon Header / Navbar */}
      <WatermelonNavbar />

      {/* Logged In Quick Return Workspace Banner (if active session) */}
      {currentRole !== "none" && (
        <div className="container mx-auto px-4 pt-6">
          <div className="mx-auto max-w-5xl rounded-xl border border-primary/40 bg-psoft/70 p-3.5 sm:px-4 sm:py-3 shadow-[0_0_20px_var(--accent-glow)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse shrink-0" />
              <span className="text-xs sm:text-sm font-semibold text-ink font-mono">
                {isBn ? "আপনি বর্তমানে লগইন আছেন:" : "CURRENT ACTIVE WORKSPACE:"}
                <strong className="ml-1.5 uppercase text-primary font-bold">
                  [{currentRole.replace("_", " ")}]
                </strong>
              </span>
            </div>
            <Link href={homeFor(currentRole)} className="w-full sm:w-auto">
              <Button size="sm" className="btn-primary-neon text-xs font-mono w-full sm:w-auto">
                {isBn ? "আমার ড্যাশবোর্ডে প্রবেশ করুন" : "ENTER WORKSPACE"}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. Hero Section with 3D Visual Radar & Telemetry */}
      <WatermelonHero isBn={isBn} currentRole={currentRole} />

      {/* 3. Telemetry Stats Counters with Technical Crosshairs */}
      <TelemetryStats isBn={isBn} />

      {/* 4. Artistic 3D Bento Grid (Watermelon / Hyphen / Manus Style Architecture) */}
      <section className="relative z-10 py-10 sm:py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-12">
          <div className="mb-8 sm:mb-12 flex flex-col items-start md:items-center text-left md:text-center max-w-3xl mx-auto">
            <div className="text-primary mb-2 sm:mb-3 inline-flex items-center text-xs font-bold tracking-widest uppercase font-mono">
              <span className="mr-2 sm:mr-3 opacity-70">{"//"}</span>
              CORE CLINICAL ARCHITECTURE
            </div>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-ink">
              {isBn ? (
                <>
                  প্রযুক্তি যা রোগীদের রক্ষা করে, <span className="text-primary">বিভ্রান্ত করে না</span>
                </>
              ) : (
                <>
                  Engineered for safety, <span className="text-primary">grounded in evidence</span>
                </>
              )}
            </h2>
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-muted font-mono tracking-wider uppercase">
              {isBn
                ? "ডুয়াল-গেট ট্রায়াজ, দ্বিভাষিক ওসিআর ভিশন এবং সম্পূর্ণ অনলাইন টেলিহেলথ কনসালট্যান্সি।"
                : "Dual-gate triage, OCR lab parsing, online-only video teleconsultation, and tamper-proof audit trails."}
            </p>
          </div>

          <ManusBentoGrid isBn={isBn} />
        </div>
      </section>

      {/* 5. Watermelon Browser Demo Console */}
      <WatermelonBrowserDemo isBn={isBn} />

      {/* 6. Role-Based Portals Showcase (Technical 3D Spotlight Cards) */}
      <section className="relative z-10 py-10 sm:py-16 md:py-24 font-mono">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-6xl">
          <div className="rounded-2xl border border-line bg-s1/80 p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 sm:pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary tracking-wider uppercase">
                  <HeartPulse className="h-4 w-4" />
                  <span>{isBn ? "প্ল্যাটফর্মের ভূমিকাভিত্তিক পোর্টালসমূহ" : "[ ROLE-BASED HEALTHCARE PORTALS ]"}</span>
                </div>
                <p className="mt-1 text-[11px] sm:text-xs text-muted font-mono">
                  {isBn
                    ? "নিরাপদ ভূমিকাভিত্তিক অথরাইজেশন (RBAC) ও নিয়ন্ত্রিত ক্লিনিক্যাল অ্যাক্সেস ব্যবস্থা"
                    : "Cryptographically verified RBAC engineered for zero-trust clinical workflows."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-mono text-primary font-bold">
                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> RBAC ENFORCED
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href={currentRole === "patient" ? "/dashboard" : "/login"}
                className="block group"
              >
                <Spotlight3DCard className="p-4 sm:p-5 h-full border-line hover:border-primary/50 transition">
                  <div className="flex w-full items-center justify-between">
                    <span className="rounded-md bg-primary/10 p-2 sm:p-2.5 text-primary">
                      <HeartPulse className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-primary transition uppercase tracking-widest">
                      ENTER // 01 →
                    </span>
                  </div>
                  <span className="mt-3 sm:mt-4 block text-sm font-bold text-ink tracking-tight font-sans">
                    {isBn ? "রোগী পোর্টাল" : "Patient Portal"}
                  </span>
                  <p className="mt-1 text-xs text-muted leading-relaxed font-sans">
                    {isBn
                      ? "রিপোর্ট স্টোরেজ, লংগিচিউডিনাল টাইমলাইন, অনলাইন বুকিং ও ইমার্জেন্সি কার্ড।"
                      : "Reports, Longitudinal Timeline, Online Bookings & Emergency QR Card."}
                  </p>
                </Spotlight3DCard>
              </Link>

              <Link
                href={currentRole === "doctor" ? "/doctor" : "/login"}
                className="block group"
              >
                <Spotlight3DCard className="p-4 sm:p-5 h-full border-line hover:border-info/50 transition">
                  <div className="flex w-full items-center justify-between">
                    <span className="rounded-md bg-info/10 p-2 sm:p-2.5 text-info">
                      <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-info transition uppercase tracking-widest">
                      ENTER // 02 →
                    </span>
                  </div>
                  <span className="mt-3 sm:mt-4 block text-sm font-bold text-ink tracking-tight font-sans">
                    {isBn ? "ডাক্তার ওয়ার্কস্পেস" : "Doctor Workspace"}
                  </span>
                  <p className="mt-1 text-xs text-muted leading-relaxed font-sans">
                    {isBn
                      ? "বিএমডিসি ভেরিফায়েড প্রোফাইল, প্রেসক্রিপশন নিশ্চিতকরণ ও ক্রিপ্টোগ্রাফিক সাইন।"
                      : "BMDC Verified Registry, OCR Verification, Clinical Note Signing & Meet Links."}
                  </p>
                </Spotlight3DCard>
              </Link>

              <Link
                href={currentRole === "facility_admin" ? "/facility" : "/login"}
                className="block group"
              >
                <Spotlight3DCard className="p-4 sm:p-5 h-full border-line hover:border-warn/50 transition">
                  <div className="flex w-full items-center justify-between">
                    <span className="rounded-md bg-warn/10 p-2 sm:p-2.5 text-warn">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-warn transition uppercase tracking-widest">
                      ENTER // 03 →
                    </span>
                  </div>
                  <span className="mt-3 sm:mt-4 block text-sm font-bold text-ink tracking-tight font-sans">
                    {isBn ? "হাসপাতাল কমান্ড" : "Hospital Command"}
                  </span>
                  <p className="mt-1 text-xs text-muted leading-relaxed font-sans">
                    {isBn
                      ? "রিয়েল-টাইম আইসিইউ/জেনারেল সিট ক্যাপাসিটি এবং কনসালট্যান্ট রোস্টার।"
                      : "Real-time ICU/General Bed Availability & Specialist Shift Rostering."}
                  </p>
                </Spotlight3DCard>
              </Link>

              <Link
                href={currentRole === "super_admin" || currentRole === "reviewer" ? "/admin" : "/login"}
                className="block group"
              >
                <Spotlight3DCard className="p-4 sm:p-5 h-full border-line hover:border-danger/50 transition">
                  <div className="flex w-full items-center justify-between">
                    <span className="rounded-md bg-danger/10 p-2 sm:p-2.5 text-danger">
                      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-danger transition uppercase tracking-widest">
                      ENTER // 04 →
                    </span>
                  </div>
                  <span className="mt-3 sm:mt-4 block text-sm font-bold text-ink tracking-tight font-sans">
                    {isBn ? "অ্যাডমিন সেন্টার" : "Admin Center"}
                  </span>
                  <p className="mt-1 text-xs text-muted leading-relaxed font-sans">
                    {isBn
                      ? "বিএমডিসি ভেরিফিকেশন কিউ, সিস্টেম রোল সুইচ এবং অপরিবর্তনীয় অডিট লগ।"
                      : "Access Roles, Doctor Verification Queue & System Tamper Logs."}
                  </p>
                </Spotlight3DCard>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Master Workflow & User Journeys Walkthrough */}
      <section className="relative z-10 py-10 sm:py-16 md:py-24 font-mono">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-6xl">
          <div className="rounded-card border border-line bg-s1/90 p-4 sm:p-6 md:p-8 backdrop-blur-md relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4 sm:pb-5">
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-ink font-sans">
                  {isBn ? "মাস্টার ওয়ার্কফ্লো ও ইউজার জার্নি" : "Master Workflow & User Journeys"}
                </h3>
                <p className="text-[11px] sm:text-xs text-muted font-mono mt-1">
                  {isBn
                    ? "একটি প্ল্যাটফর্ম, চারটি আলাদা সুরক্ষিত পোর্টাল — পাবলিক ল্যান্ডিং থেকে হিউম্যান-রিভিউড আউটকাম"
                    : "One product, four role-based portals. Every journey ends in a human-reviewed outcome."}
                </p>
              </div>

              {/* Tab switchers */}
              <div className="grid grid-cols-4 sm:flex rounded-lg border border-line bg-s2/80 p-1 w-full sm:w-auto">
                {(["patient", "doctor", "hospital", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setActiveTab(r)}
                    className={`rounded-md px-1.5 py-1.5 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center transition ${
                      activeTab === r ? "bg-primary text-onprimary shadow-md" : "text-muted hover:text-ink"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              {activeTab === "patient" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-s2/50 p-5 relative overflow-hidden">
                    <span className="num text-xs font-bold text-primary font-mono">// STEP 01</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "রেজিস্টার ও প্রোফাইল" : "Register & Profile"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "ইমেইল ওটিপি, স্বাস্থ্য তথ্য ও আলাদা কনসেন্ট টগল (ডাক্তার শেয়ারিং ঐচ্ছিক)।"
                        : "Instant email verification, health profile, budget band and granular consent toggles."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5 relative overflow-hidden">
                    <span className="num text-xs font-bold text-primary font-mono">// STEP 02</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "রিপোর্ট আপলোড ও টাইমলাইন" : "Upload & Timeline"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "প্রেসক্রিপশন/রিপোর্ট ড্রপ করুন। OCR মান বের করবে এবং আগের রিপোর্টের সাথে ট্রেন্ড চার্ট দেখাবে।"
                        : "Drag & drop report. OCR parses lab values with confidence badges and plots historical trends."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5 relative overflow-hidden">
                    <span className="num text-xs font-bold text-primary font-mono">// STEP 03</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "স্মার্টকেয়ার ও বুকিং" : "Navigator & Booking"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "সমস্যা উল্লেখ করুন। রেড-ফ্ল্যাগ চেক শেষে উপযুক্ত ডাক্তার ম্যাচ ও সরাসরি অনলাইন মিট বুকিং।"
                        : "Input symptoms. Emergency checks first, then get matched with verified Dhaka specialists online."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "doctor" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-info font-mono">// CLINICAL 01</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "কনসেন্ট যাচাই" : "Consent Verification"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "শুধুমাত্র কেয়ার রিলেশনশিপ ও সক্রিয় সম্মতি থাকলেই রোগীর চার্ট অ্যাক্সেস সম্ভব।"
                        : "Checks active care relationship and patient consent before unlocking medical chart."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-info font-mono">// CLINICAL 02</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "AI সামারি ও মান নিশ্চিতকরণ" : "AI Summary & Extractions"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "মূল রিপোর্টের পাশাপাশি এআই প্রস্তুতকৃত ফ্যাক্ট-ভিত্তিক সামারি পড়ে মানগুলো অনুমোদন দিন।"
                        : "Compare extracted OCR values with original scans and read dated, source-linked AI summaries."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-info font-mono">// CLINICAL 03</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "নোট এডিট ও স্বাক্ষর" : "Edit & Sign Note"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "ড্রাফট নোট পরিবর্তন করে স্থায়ী ডিজিটাল স্বাক্ষর দিন। স্বাক্ষরিত নোট অপরিবর্তনীয়।"
                        : "Review AI draft clinical note, make edits, and sign. Signed versions become immutable records."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "hospital" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-warn font-mono">// FACILITY 01</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "প্রোফাইল ও কনফার্মড মূল্য" : "Profile & Verified Pricing"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "হাসপাতালের সেবাসমূহ এবং কনফার্মড টেস্ট ফির তালিকা হালনাগাদ রাখুন।"
                        : "Maintain transparent test and consultation pricing with last-confirmed dates."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-warn font-mono">// FACILITY 02</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "ডাক্তার রোস্টার" : "Doctor Rostering"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "বিএমডিসি নম্বরসহ স্পেশালিস্ট ডাক্তারদের উপস্থিতি ও চেম্বার শিডিউল পরিচালনা।"
                        : "Manage affiliated physicians with BMDC license verification and visiting schedules."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-warn font-mono">// FACILITY 03</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "অ্যাপয়েন্টমেন্ট কিউ" : "Appointment Queue"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "রোগীদের ভিজিট রিকোয়েস্ট চেক-ইন, সম্পন্ন বা রিশিডিউল করার সুবিধা।"
                        : "Manage incoming visit requests through a state machine: requested → confirmed → check-in."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "admin" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-danger font-mono">// GOVERNANCE 01</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "ভেরিফিকেশন কিউ" : "Verification Queue"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "ডাক্তার ও ডায়াগনস্টিক সেন্টারের কাগজপত্র যাচাই করে ভেরিফায়েড ব্যাজ প্রদান।"
                        : "Validate BMDC registration and facility licenses with explicit proof citations."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-danger font-mono">// GOVERNANCE 02</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "অপরিবর্তনীয় অডিট লগ" : "Append-Only Audit Log"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "প্রতিটি সংবেদনশীল অ্যাকশন (লগইন, ফাইল দেখা, কনসেন্ট প্রত্যাহার) রেকর্ড হয়।"
                        : "Real-time tamper-proof logging of logins, chart opens, OCR corrections, and consent revokes."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-s2/50 p-5">
                    <span className="num text-xs font-bold text-danger font-mono">// GOVERNANCE 03</span>
                    <h4 className="mt-2 font-bold text-ink font-sans">{isBn ? "মডেল রেজিস্ট্রি ও সেফটি" : "Model Registry & Safety"}</h4>
                    <p className="mt-1.5 text-xs text-muted leading-relaxed font-sans">
                      {isBn
                        ? "ডকুমেন্ট ক্লাসিফায়ার ML মডেল কার্ড, ম্যাক্রো-F1 মেট্রিক্স ও সেফটি গেট স্ট্যাটাস।"
                        : "Monitor document classifier accuracy, macro-F1 score, and safety gate triggers."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Key Safety Principles Bar (3D Spotlight Cards) */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-3">
            <Spotlight3DCard className="p-5 border-danger/30">
              <div className="flex items-start gap-3.5">
                <span className="rounded-lg bg-danger/10 p-2.5 text-danger shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink font-mono">{isBn ? "ক্লিনিক্যাল গেট প্রথম" : "CLINICAL GATES FIRST"}</h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {isBn
                      ? "সাশ্রয়ী হওয়ার চেয়ে জীবন রক্ষা আগে। কোনো বিপজ্জনক উপসর্গ থাকলে তাৎক্ষণিক ৯৯৯ নির্দেশিকা।"
                      : "Clinical eligibility checked before cost; emergency signals strictly override ranking."}
                  </p>
                </div>
              </div>
            </Spotlight3DCard>

            <Spotlight3DCard className="p-5 border-primary/30">
              <div className="flex items-start gap-3.5">
                <span className="rounded-lg bg-primary/10 p-2.5 text-primary shrink-0">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink font-mono">{isBn ? "স্বচ্ছ তথ্য ও প্রুভেন্যান্স" : "PROVENANCE & AUDIT"}</h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {isBn
                      ? "প্রত্যেক ডাক্তার তালিকার তথ্য সংগ্রহের উৎস, সর্বশেষ যাচাইয়ের তারিখ ও কনফিডেন্স প্রদর্শিত।"
                      : "Every provider listing shows verification status, source, date, and data confidence level."}
                  </p>
                </div>
              </div>
            </Spotlight3DCard>

            <Spotlight3DCard className="p-5 border-info/30">
              <div className="flex items-start gap-3.5">
                <span className="rounded-lg bg-info/10 p-2.5 text-info shrink-0">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-ink font-mono">{isBn ? "হিউম্যান-ইন-দ্য-লুপ" : "ASSIST, NOT REPLACE"}</h4>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {isBn
                      ? "সকল এআই আউটপুট ড্রাফট হিসেবে লেবেলযুক্ত। কোনো কৃত্রিম প্রেসক্রিপশন প্রদান করা হয় না।"
                      : "AI output is explicitly marked as draft assistance; clinicians make 100% of medical decisions."}
                  </p>
                </div>
              </div>
            </Spotlight3DCard>
          </div>
        </div>
      </section>

      {/* 9. Card Split Accordion (Watermelon UI Registry Component) */}
      <section className="relative z-10 py-16 md:py-24 font-mono">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-4xl">
          <div className="mb-10 flex flex-col items-start md:items-center text-left md:text-center">
            <div className="text-primary mb-3 inline-flex items-center text-xs font-bold tracking-widest uppercase">
              <span className="mr-3 opacity-70">{"//"}</span>
              CARD SPLIT ACCORDION ARCHITECTURE
            </div>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-ink font-sans">
              {isBn ? (
                <>
                  প্রোটোকল ও প্রায়শই জিজ্ঞাসিত <span className="text-primary">প্রশ্নোত্তর</span>
                </>
              ) : (
                <>
                  Clinical Protocols & <span className="text-primary">System Mechanics</span>
                </>
              )}
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted font-mono tracking-wider uppercase max-w-xl">
              {isBn
                ? "কার্ড স্প্লিট অ্যাকর্ডিয়ন এ ক্লিক করে সিস্টেম মেকানিক্স ও প্রোটোকলগুলো বিস্তারিত জানুন।"
                : "Interactive morphing split cards revealing core clinical logic and safeguards."}
            </p>
          </div>

          <CardSplitAccordion items={isBn ? bnFaqItems : undefined} />
        </div>
      </section>

      {/* 10. Community Feedback Marquee */}
      <CommunityMarquee isBn={isBn} />

      {/* 10. Technical Watermelon UI Footer */}
      <footer className="relative z-10 border-t border-line py-8 sm:py-12 text-center text-xs text-muted font-mono bg-s1/50 backdrop-blur-md">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 mb-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-ink font-bold tracking-wider">MEDIBRIDGE.SYS</span>
              <span className="text-muted text-[10px]">v2.6.4-dhaka</span>
            </div>
            <span className="hidden sm:inline text-line">|</span>
            <Link href="/emergency" className="text-danger hover:underline font-bold flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5" />
              {isBn ? "জরুরি হটলাইন (৯৯৯)" : "EMERGENCY HOTLINE (999)"}
            </Link>
            {currentRole === "super_admin" && (
              <>
                <span className="hidden sm:inline text-line">|</span>
                <Link href="/ml-lab" className="text-emerald-400 hover:underline flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>{isBn ? "এমএল ল্যাব কার্ড" : "ML LAB / METRICS"}</span>
                </Link>
              </>
            )}
            <span className="hidden sm:inline text-line">|</span>
            <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="text-info hover:underline flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {isBn ? "ফাস্টএপিআই ব্যাকএন্ড ডক্স" : "FASTAPI OPENAPI (/docs)"}
            </a>
            <span className="hidden sm:inline text-line">|</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && typeof (window as any).__replayMediBridge3D === "function") {
                  (window as any).__replayMediBridge3D();
                }
              }}
              className="text-ptext hover:text-primary hover:underline flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isBn ? "৩ডি ওপেনিং অ্যানিমেশন" : "3D OPENING INTRO"}</span>
            </button>
          </div>

          <p className="text-muted leading-relaxed text-[11px] max-w-2xl mx-auto">
            {isBn
              ? "মেডিব্রিজ এআই একটি হ্যাকাথন প্রোটোটাইপ। সকল রোগীর তথ্য সিন্থেটিক। এটি কোনো মেডিকেল ডিভাইস নয় এবং রোগ নির্ণয় বা চিকিৎসা প্রদান করে না।"
              : "MediBridge AI is a clinical architecture prototype. All sample patient data and directory entries are synthetic. AI operates under human clinician supervision."}
          </p>

          <div className="mt-6 text-[10px] text-muted/60 tracking-widest uppercase">
            © 2026 MEDIBRIDGE AI · DHAKA RESEARCH CONSORTIUM · ALL RIGHTS RESERVED
          </div>
        </div>
      </footer>
    </div>
  );
}
