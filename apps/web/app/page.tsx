"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  Users,
} from "lucide-react";
import { api, getRole, getToken, homeFor, setSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Chip } from "@/components/ui";
import { Medical3DHeroBadge } from "@/components/Medical3DHeroBadge";

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

  return (
    <div className="hero-glow-bg relative -mt-4 space-y-16 pb-16 pt-6">
      {/* Logged In Quick Return Banner */}
      {currentRole !== "none" && (
        <div className="mx-auto max-w-4xl rounded-xl border border-primary/40 bg-psoft/70 px-4 py-3 shadow-[0_0_15px_var(--accent-glow)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-ink">
              {isBn ? "আপনি বর্তমানে লগইন আছেন:" : "You are currently signed in as:"}
              <strong className="ml-1.5 capitalize text-ptext">{currentRole.replace("_", " ")}</strong>
            </span>
          </div>
          <Link href={homeFor(currentRole)}>
            <Button size="sm" className="btn-primary-neon text-xs">
              {isBn ? "আমার ড্যাশবোর্ডে প্রবেশ করুন" : "Enter My Workspace"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* 1. Hero Section */}
      <section className="relative z-10 mx-auto max-w-4xl text-center">
        {/* Hackathon Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-ptext shadow-[0_0_15px_var(--accent-glow)]">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
          <span>{isBn ? "🇧🇩 বাংলাদেশের জন্য স্বাস্থ্য সমন্বয় প্ল্যাটফর্ম · ঢাকা সংস্করণ" : "🇧🇩 Healthcare Coordination for Bangladesh · Dhaka Prototype"}</span>
        </div>

        {/* Main Majestic Title */}
        <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight text-ink sm:text-6xl md:text-7xl">
          MediBridge <span className="text-ptext">AI</span>
        </h1>

        {/* Design Principle / Tagline */}
        <p className="mx-auto mt-4 max-w-2xl text-xl font-medium text-ink/90 sm:text-2xl">
          {isBn ? "এআই সহযোগিতা করবে। সিদ্ধান্ত নেবেন ডাক্তার। নিয়ন্ত্রণে থাকবেন রোগী।" : "AI assists. Doctors decide. Patients stay in control."}
        </p>

        {/* 3D Medical Hero Visual Badge */}
        <Medical3DHeroBadge />

        <p className="mx-auto mt-1 max-w-2xl text-base text-muted sm:text-lg">
          {isBn
            ? "বাংলাদেশি রোগীদের জন্য ক্লিনিক্যালভাবে সঠিক ও সাশ্রয়ী স্বাস্থ্যসেবা অনুসন্ধান, ল্যাব রিপোর্ট ডিজিটাইজেশন এবং চিকিৎসকদের জন্য অডিটেবল ওয়ার্কস্পেস।"
            : "Helping Bangladeshi patients find clinically eligible, affordability-aware care while giving doctors and hospitals a secure, source-linked AI workspace."}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/navigator">
            <Button className="btn-primary-neon h-12 px-6 text-base">
              <Compass className="mr-2 h-5 w-5" />
              {isBn ? "স্মার্টকেয়ার নেভিগেটর চালান" : "Start SmartCare Navigator"}
            </Button>
          </Link>
          <Link href="/directory">
            <Button variant="secondary" className="h-12 px-6 text-base">
              <Users className="mr-2 h-5 w-5" />
              {isBn ? "ডাক্তার ও হাসপাতাল ডিরেক্টরি" : "Browse Dhaka Directory"}
            </Button>
          </Link>
          <Link href="/ml-lab">
            <Button variant="ghost" className="h-12 px-5 text-base border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <Sparkles className="mr-2 h-4 w-4" />
              {isBn ? "এমএল ল্যাব পরিদর্শন" : "Research ML Lab"}
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" className="h-12 px-5 text-base">
              {isBn ? "লগইন করুন" : "Sign In"} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Emergency disclaimer banner */}
        <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 rounded-lg border border-border/60 bg-s1/60 px-4 py-2 text-xs text-muted backdrop-blur-sm">
          <ShieldAlert className="h-4 w-4 text-danger shrink-0" />
          <span>
            {isBn
              ? "জরুরি পরিস্থিতিতে সরাসরি ৯৯৯ কল করুন। কৃত্রিম বুদ্ধিমত্তা কোনো প্রেসক্রিপশন বা ক্লিনিক্যাল ডায়াগনোসিস দেয় না।"
              : "In medical emergencies, call 999 immediately. AI never diagnoses or prescribes medication."}
          </span>
        </div>
      </section>

      {/* 2. Role-Based Portals Showcase */}
      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-s1 to-s2/70 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ptext">
                <HeartPulse className="h-4 w-4" />
                <span>{isBn ? "প্ল্যাটফর্মের ভূমিকাভিত্তিক পোর্টালসমূহ" : "Role-Based Healthcare Portals"}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {isBn
                  ? "নিরাপদ ভূমিকাভিত্তিক অথরাইজেশন ও নিয়ন্ত্রিত অ্যাক্সেস ব্যবস্থা"
                  : "Strict role-based access control (RBAC) engineered for clinical workflows."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-psoft px-2.5 py-1 text-xs font-mono text-ptext">
                <CheckCircle2 className="h-3 w-3" /> RBAC Enforced
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href={currentRole === "patient" ? "/dashboard" : "/login"}
              className="flex flex-col items-start rounded-xl border border-border bg-s1/90 p-4 text-left transition hover:border-primary/50 hover:bg-s2 hover:shadow-[0_0_12px_var(--accent-glow)] group"
            >
              <div className="flex w-full items-center justify-between">
                <span className="rounded-md bg-psoft p-2 text-ptext">
                  <HeartPulse className="h-4 w-4" />
                </span>
                <span className="text-[10px] text-muted font-mono group-hover:text-ptext transition">Access →</span>
              </div>
              <span className="mt-3 text-sm font-semibold text-ink">{isBn ? "রোগী পোর্টাল" : "Patient Portal"}</span>
              <p className="mt-1 text-xs text-muted">Reports, Longitudinal Timeline, Bookings & Emergency Card</p>
            </Link>

            <Link
              href={currentRole === "doctor" ? "/doctor" : "/login"}
              className="flex flex-col items-start rounded-xl border border-border bg-s1/90 p-4 text-left transition hover:border-info/50 hover:bg-s2 hover:shadow-[0_0_12px_rgba(91,192,255,0.2)] group"
            >
              <div className="flex w-full items-center justify-between">
                <span className="rounded-md bg-info/10 p-2 text-info">
                  <Stethoscope className="h-4 w-4" />
                </span>
                <span className="text-[10px] text-muted font-mono group-hover:text-info transition">Access →</span>
              </div>
              <span className="mt-3 text-sm font-semibold text-ink">{isBn ? "ডাক্তার ওয়ার্কস্পেস" : "Doctor Workspace"}</span>
              <p className="mt-1 text-xs text-muted">BMDC Verified Registry, OCR Verification, Clinical Note Signing</p>
            </Link>

            <Link
              href={currentRole === "facility_admin" ? "/facility" : "/login"}
              className="flex flex-col items-start rounded-xl border border-border bg-s1/90 p-4 text-left transition hover:border-warn/50 hover:bg-s2 hover:shadow-[0_0_12px_rgba(255,200,87,0.2)] group"
            >
              <div className="flex w-full items-center justify-between">
                <span className="rounded-md bg-warn/10 p-2 text-warn">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="text-[10px] text-muted font-mono group-hover:text-warn transition">Access →</span>
              </div>
              <span className="mt-3 text-sm font-semibold text-ink">{isBn ? "হাসপাতাল কমান্ড" : "Hospital Command"}</span>
              <p className="mt-1 text-xs text-muted">Real-time ICU/General Bed Availability & Specialist Shift Roster</p>
            </Link>

            <Link
              href={currentRole === "super_admin" || currentRole === "reviewer" ? "/admin" : "/login"}
              className="flex flex-col items-start rounded-xl border border-border bg-s1/90 p-4 text-left transition hover:border-danger/50 hover:bg-s2 hover:shadow-[0_0_12px_rgba(255,92,108,0.2)] group"
            >
              <div className="flex w-full items-center justify-between">
                <span className="rounded-md bg-danger/10 p-2 text-danger">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="text-[10px] text-muted font-mono group-hover:text-danger transition">Access →</span>
              </div>
              <span className="mt-3 text-sm font-semibold text-ink">{isBn ? "অ্যাডমিন সেন্টার" : "Admin Center"}</span>
              <p className="mt-1 text-xs text-muted">Access Roles, Doctor Verification Queue & System Audit Logs</p>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. The Four Core Pillars (3D Layered Cards) */}
      <section className="relative z-10 mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {isBn ? "সমাধানের চারটি স্তম্ভ" : "The Solution: Four Pillars Working Together"}
          </h2>
          <p className="mt-2 text-sm text-muted sm:text-base">
            {isBn
              ? "কাগজে আটকে থাকা স্বাস্থ্যসেবাকে ডিজিটালাইজড ও রোগীদের নিয়ন্ত্রণে নিয়ে আসার পূর্ণাঙ্গ ইকোসিস্টেম"
              : "Replacing fragmented paper reports and blind provider choice with transparent clinical intelligence."}
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Report Intelligence */}
          <div className="card-shadow card-hover group relative flex flex-col justify-between rounded-card border border-border bg-s1 p-6 transition-all">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-psoft text-ptext transition group-hover:scale-110">
                <FileSearch className="h-6 w-6" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h3 className="font-heading text-lg font-semibold text-ink">
                  {isBn ? "১. রিপোর্ট ইন্টেলিজেন্স" : "1. Report Intelligence"}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {isBn
                  ? "পিডিএফ বা স্ক্যান করা প্রেসক্রিপশন আপলোড করুন। OCR দ্বারা সিবিসি, গ্লুকোজ ও লিপিড এক্সট্র্যাক্ট করে দীর্ঘমেয়াদী ট্রেন্ড তৈরি করে।"
                  : "Upload PDF or scan. OCR pipeline extracts CBC, Glucose and Lipid lab values, flagged for doctor verification with trend charts."}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs font-medium text-ptext">
              <span>{isBn ? "সিবিসি · গ্লুকোজ · লিপিড" : "CBC · Glucose · Lipid"}</span>
            </div>
          </div>

          {/* Card 2: SmartCare Navigator */}
          <div className="card-shadow card-hover group relative flex flex-col justify-between rounded-card border border-border bg-s1 p-6 transition-all">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-info/40 bg-info/10 text-info transition group-hover:scale-110">
                <Compass className="h-6 w-6" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h3 className="font-heading text-lg font-semibold text-ink">
                  {isBn ? "২. স্মার্টকেয়ার নেভিগেটর" : "2. SmartCare Navigator"}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {isBn
                  ? "উপসর্গ, ঢাকা শহরের এলাকা ও বাজেট অনুসারে ক্লিনিক্যাল গেট যাচাই করে ডাক্তার ও হাসপাতালের স্বচ্ছ সুপারিশ প্রদর্শন করে।"
                  : "Concern context, location and budget lead to clinically eligible, affordability-aware matches with a transparent reason for each."}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs font-medium text-info">
              <span>{isBn ? "ক্লিনিক্যাল গেট ও রেড-ফ্ল্যাগ ফার্স্ট" : "Clinical Gates & Red-Flags First"}</span>
            </div>
          </div>

          {/* Card 3: Doctor Workspace */}
          <div className="card-shadow card-hover group relative flex flex-col justify-between rounded-card border border-border bg-s1 p-6 transition-all">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-psoft text-ptext transition group-hover:scale-110">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h3 className="font-heading text-lg font-semibold text-ink">
                  {isBn ? "৩. ডক্টর ওয়ার্কস্পেস" : "3. Doctor Workspace"}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {isBn
                  ? "অনুমোদিত রোগীর চার্ট, অরিজিনাল রিপোর্টের পাশে AI সামারি এবং ড্রাফট প্রেসক্রিপশন যা ডাক্তার নিজ হাতে এডিট করে স্বাক্ষর করেন।"
                  : "Consented patient chart, source-linked AI summary, and draft notes that the doctor reviews, edits and signs into the permanent record."}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs font-medium text-ptext">
              <span>{isBn ? "হিউম্যান-ইন-দ্য-লুপ ও সিগনেচার" : "Human-in-the-Loop & Signed Notes"}</span>
            </div>
          </div>

          {/* Card 4: Admin Governance */}
          <div className="card-shadow card-hover group relative flex flex-col justify-between rounded-card border border-border bg-s1 p-6 transition-all">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-warn/40 bg-warn/10 text-warn transition group-hover:scale-110">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h3 className="font-heading text-lg font-semibold text-ink">
                  {isBn ? "৪. অ্যাডমিন গভর্ন্যান্স" : "4. Admin Governance"}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {isBn
                  ? "বিএমডিসি ও ডিজিএইচএস প্রমাণসহ ডাক্তার-হাসপাতাল ভেরিফিকেশন, অপ্রতিরোধ্য অডিট ট্রেইল ও ডেটা কনফিডেন্স ট্র্যাকিং।"
                  : "Doctor and hospital credential verification, immutable audit log of every sensitive access, and ML model registry."}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs font-medium text-warn">
              <span>{isBn ? "অডিট ট্রেইল ও ডেটা প্রুভেন্যান্স" : "Audit Trail & Provenance"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Live Workflow Walkthrough Tabs */}
      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="rounded-card border border-border bg-s1 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <h3 className="font-heading text-xl font-bold text-ink">
                {isBn ? "মাস্টার ওয়ার্কফ্লো ও ইউজার জার্নি" : "Master Workflow & User Journeys"}
              </h3>
              <p className="text-xs text-muted sm:text-sm">
                {isBn
                  ? "একটি প্ল্যাটফর্ম, চারটি আলাদা সুরক্ষিত পোর্টাল — পাবলিক ল্যান্ডিং থেকে হিউম্যান-রিভিউড আউটকাম"
                  : "One product, four role-based portals. Every journey ends in a human-reviewed outcome."}
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex rounded-input border border-border bg-s2/70 p-1">
              {(["patient", "doctor", "hospital", "admin"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setActiveTab(r)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    activeTab === r ? "bg-primary text-onprimary shadow-sm" : "text-muted hover:text-ink"
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
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-ptext">STEP 01</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "রেজিস্টার ও প্রোফাইল" : "Register & Profile"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "৬ ডিজিটের ইমেইল ওটিপি, স্বাস্থ্য তথ্য ও আলাদা কনসেন্ট টগল (ডাক্তার শেয়ারিং ঐচ্ছিক)।"
                      : "Email OTP verification, health profile, budget band and granular consent toggles."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-ptext">STEP 02</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "রিপোর্ট আপলোড ও টাইমলাইন" : "Upload & Timeline"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "প্রেসক্রিপশন/রিপোর্ট ড্রপ করুন। OCR মান বের করবে এবং আগের রিপোর্টের সাথে ট্রেন্ড চার্ট দেখাবে।"
                      : "Drag & drop report. OCR parses lab values with confidence badges and plots historical trends."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-ptext">STEP 03</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "স্মার্টকেয়ার ও বুকিং" : "Navigator & Booking"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "সমস্যা উল্লেখ করুন। রেড-ফ্ল্যাগ চেক শেষে উপযুক্ত ডাক্তার ম্যাচ ও সরাসরি অ্যাপয়েন্টমেন্ট।"
                      : "Input symptoms. Emergency checks first, then get matched with verified Dhaka specialists."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "doctor" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-info">CLINICAL 01</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "কনসেন্ট যাচাই" : "Consent Verification"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "শুধুমাত্র কেয়ার রিলেশনশিপ ও সক্রিয় সম্মতি থাকলেই রোগীর চার্ট অ্যাক্সেস সম্ভব।"
                      : "Checks active care relationship and patient consent before unlocking medical chart."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-info">CLINICAL 02</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "AI সামারি ও মান নিশ্চিতকরণ" : "AI Summary & Extractions"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "মূল রিপোর্টের পাশাপাশি এআই প্রস্তুতকৃত ফ্যাক্ট-ভিত্তিক সামারি পড়ে মানগুলো অনুমোদন দিন।"
                      : "Compare extracted OCR values with original scans and read dated, source-linked AI summaries."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-info">CLINICAL 03</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "নোট এডিট ও স্বাক্ষর" : "Edit & Sign Note"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "ড্রাফট নোট পরিবর্তন করে স্থায়ী ডিজিটাল স্বাক্ষর দিন। স্বাক্ষরিত নোট অপরিবর্তনীয়।"
                      : "Review AI draft clinical note, make edits, and sign. Signed versions become immutable records."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "hospital" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-warn">FACILITY 01</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "প্রোফাইল ও কনফার্মড মূল্য" : "Profile & Verified Pricing"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "হাসপাতালের সেবাসমূহ এবং কনফার্মড টেস্ট ফির তালিকা হালনাগাদ রাখুন।"
                      : "Maintain transparent test and consultation pricing with last-confirmed dates."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-warn">FACILITY 02</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "ডাক্তার রোস্টার" : "Doctor Rostering"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "বিএমডিসি নম্বরসহ স্পেশালিস্ট ডাক্তারদের উপস্থিতি ও চেম্বার শিডিউল পরিচালনা।"
                      : "Manage affiliated physicians with BMDC license verification and visiting schedules."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-warn">FACILITY 03</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "অ্যাপয়েন্টমেন্ট কিউ" : "Appointment Queue"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "রোগীদের ভিজিট রিকোয়েস্ট চেক-ইন, সম্পন্ন বা রিশিডিউল করার সুবিধা।"
                      : "Manage incoming visit requests through a state machine: requested → confirmed → check-in."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "admin" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-danger">GOVERNANCE 01</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "ভেরিফিকেশন কিউ" : "Verification Queue"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "ডাক্তার ও ডায়াগনস্টিক সেন্টারের কাগজপত্র যাচাই করে ভেরিফায়েড ব্যাজ প্রদান।"
                      : "Validate BMDC registration and facility licenses with explicit proof citations."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-danger">GOVERNANCE 02</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "অপরিবর্তনীয় অডিট লগ" : "Append-Only Audit Log"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "প্রতিটি সংবেদনশীল অ্যাকশন (লগইন, ফাইল দেখা, কনসেন্ট প্রত্যাহার) রেকর্ড হয়।"
                      : "Real-time tamper-proof logging of logins, chart opens, OCR corrections, and consent revokes."}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-s2/50 p-4">
                  <span className="num text-xs font-bold text-danger">GOVERNANCE 03</span>
                  <h4 className="mt-1 font-semibold text-ink">{isBn ? "মডেল রেজিস্ট্রি ও সেফটি" : "Model Registry & Safety"}</h4>
                  <p className="mt-1 text-xs text-muted">
                    {isBn
                      ? "ডকুমেন্ট ক্লাসিফায়ার ML মডেল কার্ড, ম্যাক্রো-F1 মেট্রিক্স ও সেফটি গেট স্ট্যাটাস।"
                      : "Monitor document classifier accuracy, macro-F1 score, and safety gate triggers."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Key Safety Principles Bar */}
      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-card border border-border bg-s1 p-4">
            <span className="rounded-md bg-danger/10 p-2 text-danger">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-ink">{isBn ? "ক্লিনিক্যাল গেট প্রথম" : "Clinical Gates First"}</h4>
              <p className="mt-0.5 text-xs text-muted">
                {isBn
                  ? "সাশ্রয়ী হওয়ার চেয়ে জীবন রক্ষা আগে। কোনো বিপজ্জনক উপসর্গ থাকলে তাৎক্ষণিক ৯৯৯ নির্দেশিকা।"
                  : "Clinical eligibility checked before cost; emergency signals strictly override ranking."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-card border border-border bg-s1 p-4">
            <span className="rounded-md bg-psoft p-2 text-ptext">
              <BadgeCheck className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-ink">{isBn ? "স্বচ্ছ তথ্য ও প্রুভেন্যান্স" : "Provenance & Confidence"}</h4>
              <p className="mt-0.5 text-xs text-muted">
                {isBn
                  ? "প্রত্যেক ডাক্তার তালিকার তথ্য সংগ্রহের উৎস, সর্বশেষ যাচাইয়ের তারিখ ও কনফিডেন্স প্রদর্শিত।"
                  : "Every provider listing shows verification status, source, date, and data confidence level."}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-card border border-border bg-s1 p-4">
            <span className="rounded-md bg-info/10 p-2 text-info">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-ink">{isBn ? "হিউম্যান-ইন-দ্য-লুপ" : "Assistance, Not Diagnosis"}</h4>
              <p className="mt-0.5 text-xs text-muted">
                {isBn
                  ? "সকল এআই আউটপুট ড্রাফট হিসেবে লেবেলযুক্ত। কোনো কৃত্রিম প্রেসক্রিপশন প্রদান করা হয় না।"
                  : "AI output is explicitly marked as draft assistance; clinicians make 100% of medical decisions."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer Disclaimer */}
      <footer className="relative z-10 mx-auto max-w-3xl border-t border-border/60 pt-8 text-center text-xs text-muted">
        <p>
          {isBn
            ? "মেডিব্রিজ এআই একটি হ্যাকাথন প্রোটোটাইপ। সকল রোগীর তথ্য সিন্থেটিক। এটি কোনো মেডিকেল ডিভাইস নয়।"
            : "MediBridge AI is a research prototype. All patient records and directory listings are synthetic samples for Dhaka city."}
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link href="/dev/ui" className="text-ptext hover:underline">
            {isBn ? "ডিজাইন সিস্টেম শোকেস (/dev/ui)" : "Design System Kit (/dev/ui)"}
          </Link>
          <span>·</span>
          <Link href="/emergency" className="text-danger hover:underline">
            {isBn ? "জরুরি সহায়তা (৯৯৯)" : "Emergency Hotline (999)"}
          </Link>
          <span>·</span>
          <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="text-info hover:underline">
            {isBn ? "ব্যাকএন্ড সোয়াগার ডক্স (/docs)" : "FastAPI Docs (/docs)"}
          </a>
        </div>
      </footer>
    </div>
  );
}
