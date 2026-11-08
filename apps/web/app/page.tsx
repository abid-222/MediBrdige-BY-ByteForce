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
  Lock,
  PhoneCall,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
  Users,
  Video,
} from "lucide-react";
import { getRole, getToken, homeFor } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { WatermelonNavbar } from "@/components/watermelon/WatermelonNavbar";
import { WatermelonHero } from "@/components/watermelon/WatermelonHero";
import { TelemetryStats } from "@/components/watermelon/TelemetryStats";
import { ManusBentoGrid } from "@/components/ManusBentoGrid";
import { Spotlight3DCard } from "@/components/Spotlight3DCard";
import { CardSplitAccordion, type AccordionItemData } from "@/components/watermelon/card-split-accordian";

export default function Home() {
  const { t, locale } = useI18n();
  const router = useRouter();
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
      {/* 1. Technical Navbar */}
      <WatermelonNavbar />

      {/* Logged In Quick Return Workspace Banner (if active session) */}
      {currentRole !== "none" && (
        <div className="container mx-auto px-4 pt-6">
          <div className="mx-auto max-w-5xl rounded-2xl border border-primary/40 bg-psoft/70 p-4 shadow-[0_0_20px_var(--accent-glow)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
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

      {/* 2. Hero Section with Direct Above-the-Fold Action Buttons */}
      <WatermelonHero isBn={isBn} currentRole={currentRole} />

      {/* 3. Telemetry Stats Counters */}
      <TelemetryStats isBn={isBn} />

      {/* 4. Core Clinical Architecture Bento Grid */}
      <section className="relative z-10 py-10 sm:py-16 md:py-20">
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
                : "Dual-gate triage, OCR lab parsing, online video teleconsultation, and tamper-proof audit trails."}
            </p>
          </div>

          <ManusBentoGrid isBn={isBn} />
        </div>
      </section>

      {/* 5. Role-Based Portals Showcase (Technical 3D Spotlight Cards) */}
      <section className="relative z-10 py-10 sm:py-16 md:py-20 font-mono">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-6xl">
          <div className="rounded-3xl border border-line bg-s1/80 p-5 sm:p-7 md:p-9 shadow-2xl backdrop-blur-md relative overflow-hidden">
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 sm:pb-5">
              <div>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-primary tracking-wider uppercase">
                  <HeartPulse className="h-4 w-4" />
                  <span>{isBn ? "ভূমিকাভিত্তিক স্বাস্থ্য পোর্টালসমূহ" : "[ ROLE-BASED HEALTHCARE PORTALS ]"}</span>
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
                    <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
                      <HeartPulse className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-primary transition uppercase tracking-widest font-bold">
                      ENTER // 01 →
                    </span>
                  </div>
                  <span className="mt-4 block text-sm font-bold text-ink tracking-tight font-sans group-hover:text-ptext transition">
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
                    <span className="rounded-xl bg-info/10 p-2.5 text-info">
                      <Stethoscope className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-info transition uppercase tracking-widest font-bold">
                      ENTER // 02 →
                    </span>
                  </div>
                  <span className="mt-4 block text-sm font-bold text-ink tracking-tight font-sans group-hover:text-info transition">
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
                    <span className="rounded-xl bg-warn/10 p-2.5 text-warn">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-warn transition uppercase tracking-widest font-bold">
                      ENTER // 03 →
                    </span>
                  </div>
                  <span className="mt-4 block text-sm font-bold text-ink tracking-tight font-sans group-hover:text-warn transition">
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
                    <span className="rounded-xl bg-danger/10 p-2.5 text-danger">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] text-muted font-mono group-hover:text-danger transition uppercase tracking-widest font-bold">
                      ENTER // 04 →
                    </span>
                  </div>
                  <span className="mt-4 block text-sm font-bold text-ink tracking-tight font-sans group-hover:text-danger transition">
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

      {/* 6. Clinical Protocols & FAQ (Clean Split Accordion) */}
      <section className="relative z-10 py-12 sm:py-16 md:py-20 font-mono">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-4xl">
          <div className="mb-10 flex flex-col items-start md:items-center text-left md:text-center">
            <div className="text-primary mb-3 inline-flex items-center text-xs font-bold tracking-widest uppercase">
              <span className="mr-3 opacity-70">{"//"}</span>
              CLINICAL FAQ & ARCHITECTURE
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
                ? "সিস্টেম মেকানিক্স ও ক্লিনিক্যাল সুরক্ষা বিধি সম্পর্কে বিস্তারিত জানুন।"
                : "Directly explore the core algorithmic safeguards and patient privacy standards."}
            </p>
          </div>

          <CardSplitAccordion items={isBn ? bnFaqItems : undefined} />
        </div>
      </section>

      {/* 7. Action-Oriented Bottom CTA Banner */}
      <section className="relative z-10 py-12 sm:py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-s1 via-s1 to-psoft/30 p-8 sm:p-12 text-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6),0_0_25px_var(--accent-glow)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-ptext mx-auto mb-4 shadow-sm">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="font-heading text-2xl sm:text-4xl font-bold text-ink tracking-tight">
              {isBn ? "স্বাস্থ্যসেবা শুরু করতে প্রস্তুত?" : "Ready to Coordinate Your Care?"}
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-muted max-w-xl mx-auto leading-relaxed">
              {isBn
                ? "আমাদের স্মার্টকেয়ার নেভিগেটর বা ওসিআর স্ক্যানার দিয়ে এখনই সেকেন্ডের মধ্যে উপসর্গ বিশ্লেষণ বা ল্যাব টেস্ট ডিজিটাইজ করুন।"
                : "Try the SmartCare symptom triage or upload your clinical test report to generate an instant plain-language summary and specialist recommendation."}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/navigator">
                <Button className="btn-primary-neon min-h-[46px] px-6 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_var(--accent-glow)]">
                  <Compass className="mr-2 h-4 w-4" />
                  <span>{isBn ? "স্মার্টকেয়ার নেভিগেটর" : "Start SmartCare"}</span>
                </Button>
              </Link>
              <Link href="/reports/scan">
                <Button variant="secondary" className="min-h-[46px] px-6 text-xs sm:text-sm font-bold uppercase tracking-wider border-primary/40 bg-s1 hover:bg-s2">
                  <UploadCloud className="mr-2 h-4 w-4 text-ptext" />
                  <span>{isBn ? "রিপোর্ট ওসিআর স্ক্যান" : "Scan Medical Report"}</span>
                </Button>
              </Link>
              <Link href="/directory">
                <Button variant="outline" className="min-h-[46px] px-5 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  <span>{isBn ? "ডাক্তার তালিকা" : "Find Doctors"}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Technical Footer */}
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
              <span>FASTAPI OPENAPI (/docs)</span>
            </a>
          </div>

          <p className="text-muted leading-relaxed text-[11px] max-w-2xl mx-auto">
            {isBn
              ? "মেডিব্রিজ এআই একটি হ্যাকাথন প্রোটোটাইপ। সকল রোগীর তথ্য সিন্থেটিক। এটি কোনো স্বয়ংক্রিয় মেডিকেল ডিভাইস নয় এবং চিকিৎসকের সম্মতি ছাড়া প্রেসক্রিপশন প্রদান করে না।"
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
