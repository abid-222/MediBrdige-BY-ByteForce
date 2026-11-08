"use client";
import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Compass,
  FileSearch,
  FileText,
  FlaskConical,
  HeartPulse,
  Lock,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui";
import { InteractiveTelemetry3D } from "@/components/InteractiveTelemetry3D";

export function WatermelonHero({
  isBn,
  currentRole,
}: {
  isBn: boolean;
  currentRole: string;
}) {
  return (
    <section className="relative pt-8 pb-12 sm:pt-14 sm:pb-16 md:pt-16 md:pb-20 overflow-hidden font-sans select-none">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="container relative z-10 mx-auto px-4 md:px-8 lg:px-12 text-center max-w-4xl">
        {/* Sub-Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-ptext shadow-[0_0_15px_var(--accent-glow)]">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
          <span className="truncate max-w-[300px] sm:max-w-none">
            {isBn
              ? "🇧🇩 বাংলাদেশের জন্য সমন্বিত ডিজিটাল স্বাস্থ্যসেবা · ঢাকা ২০২৬"
              : "🇧🇩 HEALTHCARE COORDINATION ARCHITECTURE · DHAKA 2026"}
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="mt-5 sm:mt-6 font-heading text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink break-words">
          Healthcare that <br className="hidden sm:block" />
          is <span className="text-primary drop-shadow-[0_0_24px_var(--accent-glow)]">engineered for trust</span>
        </h1>

        {/* Guiding Principle */}
        <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl font-medium text-ink/90 max-w-2xl mx-auto px-2">
          {isBn
            ? "এআই সহযোগিতা করবে। সিদ্ধান্ত নেবেন ডাক্তার। নিয়ন্ত্রণে থাকবেন রোগী।"
            : "AI assists. Doctors decide. Patients stay in control."}
        </p>

        {/* Action Buttons - DIRECTLY VISIBLE ON SCREEN ABOVE THE FOLD */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-3xl mx-auto">
          <Link href="/navigator" className="w-full sm:w-auto">
            <Button className="btn-primary-neon w-full sm:w-auto min-h-[48px] px-6 text-xs sm:text-sm uppercase tracking-wider font-bold shadow-[0_0_20px_var(--accent-glow)] group">
              <Compass className="mr-2 h-4 w-4 group-hover:rotate-45 transition-transform" />
              <span>{isBn ? "স্মার্টকেয়ার নেভিগেটর চালান" : "Start SmartCare Navigator"}</span>
            </Button>
          </Link>

          <Link href="/reports/scan" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              className="w-full sm:w-auto min-h-[48px] px-6 text-xs sm:text-sm uppercase tracking-wider font-bold border-primary/40 bg-s1 hover:bg-s2 hover:border-primary transition group shadow-xs"
            >
              <UploadCloud className="mr-2 h-4 w-4 text-ptext group-hover:-translate-y-0.5 transition-transform" />
              <span>{isBn ? "মেডিকেল রিপোর্ট ওসিআর" : "Scan Medical Report"}</span>
            </Button>
          </Link>

          <Link href="/directory" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              className="w-full sm:w-auto min-h-[48px] px-5 text-xs sm:text-sm uppercase tracking-wider font-bold border-line bg-s1 hover:bg-s2 transition shadow-xs"
            >
              <Stethoscope className="mr-1.5 h-4 w-4 text-muted" />
              <span>{isBn ? "ডাক্তার ডিরেক্টরি" : "Browse Doctors"}</span>
            </Button>
          </Link>

          {currentRole === "super_admin" && (
            <Link href="/ml-lab" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className="w-full sm:w-auto min-h-[48px] px-4 text-xs uppercase tracking-wider font-bold border border-primary/20 text-ptext hover:bg-primary/10 transition"
              >
                <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
                <span>{isBn ? "এমএল স্টুডিও" : "ML Studio"}</span>
              </Button>
            </Link>
          )}
        </div>

        {/* 3D Medical Telemetry Spotlight Visualizer */}
        <div className="mt-8 px-1">
          <InteractiveTelemetry3D />
        </div>

        {/* 4 Core Pillars Strip - High Trust & Fully Responsive */}
        <div className="mt-8 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-left">
          <Link
            href="/navigator"
            className="group rounded-2xl border border-line bg-s1/80 p-3.5 sm:p-4 hover:border-primary/50 transition backdrop-blur-md shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-ptext">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-mono font-bold text-ptext uppercase">Zero Hallucination</span>
            </div>
            <p className="mt-2 text-xs font-bold text-ink group-hover:text-ptext transition">
              {isBn ? "ডুয়াল-গেট ট্রায়াজ" : "Dual-Gate Triage"}
            </p>
            <p className="text-[10px] text-muted leading-tight mt-0.5">
              {isBn ? "জরুরি উপসর্গ শনাক্তকরণ ও নিরাপত্তা" : "Clinical eligibility & 999 guardrails"}
            </p>
          </Link>

          <Link
            href="/reports/scan"
            className="group rounded-2xl border border-line bg-s1/80 p-3.5 sm:p-4 hover:border-info/50 transition backdrop-blur-md shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/20 text-info">
                <FileSearch className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-mono font-bold text-info uppercase">PyMuPDF + Vision</span>
            </div>
            <p className="mt-2 text-xs font-bold text-ink group-hover:text-info transition">
              {isBn ? "স্মার্ট রিপোর্ট ওসিআর" : "Neural OCR Engine"}
            </p>
            <p className="text-[10px] text-muted leading-tight mt-0.5">
              {isBn ? "স্বয়ংক্রিয় টেবিল ও টেস্ট মান নিষ্কাশন" : "Multiline PDF lab extraction"}
            </p>
          </Link>

          <Link
            href="/directory"
            className="group rounded-2xl border border-line bg-s1/80 p-3.5 sm:p-4 hover:border-warn/50 transition backdrop-blur-md shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warn/20 text-warn">
                <Video className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-mono font-bold text-warn uppercase">BMDC Verified</span>
            </div>
            <p className="mt-2 text-xs font-bold text-ink group-hover:text-warn transition">
              {isBn ? "১০০% অনলাইন টেলিহেলথ" : "100% Online Consult"}
            </p>
            <p className="text-[10px] text-muted leading-tight mt-0.5">
              {isBn ? "সরাসরি গুগল মিট লিংক ও বিশেষজ্ঞ ডাক্তার" : "Instant video consult & clear fees"}
            </p>
          </Link>

          <Link
            href="/emergency"
            className="group rounded-2xl border border-line bg-s1/80 p-3.5 sm:p-4 hover:border-danger/50 transition backdrop-blur-md shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/20 text-danger">
                <Lock className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-mono font-bold text-danger uppercase">Zero-Trust</span>
            </div>
            <p className="mt-2 text-xs font-bold text-ink group-hover:text-danger transition">
              {isBn ? "রোগীর কনসেন্ট ও অডিট" : "Patient Consent"}
            </p>
            <p className="text-[10px] text-muted leading-tight mt-0.5">
              {isBn ? "অপরিবর্তনীয় ক্রিপ্টোগ্রাফিক সুরক্ষা" : "Cryptographically signed records"}
            </p>
          </Link>
        </div>

        {/* Emergency Disclaimer Banner */}
        <div className="mx-auto mt-7 sm:mt-9 flex max-w-xl items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-muted backdrop-blur-sm shadow-xs">
          <ShieldAlert className="h-4 w-4 text-danger shrink-0 animate-pulse" />
          <span className="text-[11px] font-mono leading-tight text-left sm:text-center">
            {isBn ? (
              <>
                জরুরি পরিস্থিতিতে সরাসরি <a href="tel:999" className="text-danger font-bold hover:underline">৯৯৯ কল করুন</a>। কৃত্রিম বুদ্ধিমত্তা কোনো চূড়ান্ত প্রেসক্রিপশন বা ডায়াগনোসিস দেয় না।
              </>
            ) : (
              <>
                In medical emergencies, <a href="tel:999" className="text-danger font-bold hover:underline">call 999 immediately</a>. AI never diagnoses or prescribes medication without a doctor.
              </>
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
