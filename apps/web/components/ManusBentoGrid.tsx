"use client";
import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  Compass,
  FileCheck2,
  FileSearch,
  FileText,
  Fingerprint,
  HeartPulse,
  Lock,
  ScanLine,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
  Zap,
} from "lucide-react";
import { Spotlight3DCard } from "./Spotlight3DCard";
import { Button, Chip } from "./ui";

export function ManusBentoGrid({ isBn }: { isBn: boolean }) {
  return (
    <div className="relative mx-auto max-w-6xl space-y-6">
      {/* Section Header */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-ptext">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{isBn ? "ক্লিনিক্যাল সুরক্ষা ও সেবাসমূহ" : "Clinical Capabilities & Safeguards"}</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-ink">
          {isBn
            ? "স্বচ্ছ, অডিটেবল ও সম্পূর্ণ রোগী-নিয়ন্ত্রিত ডিজিটাল স্বাস্থ্যসেবা"
            : "Human-Centered, Zero-Hallucination Healthcare"}
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          {isBn
            ? "কোনো সাধারণ জেনেরিক এআই নয় — প্রতিটি সিদ্ধান্ত চিকিৎসকের অনুমোদিত এবং বিএমডিসি রেজিস্ট্রি দ্বারা সুরক্ষিত।"
            : "Engineered beyond generic AI templates. Every insight is dual-gated by licensed physicians and BMDC records."}
        </p>
      </div>

      {/* Bento Grid 4-Card Asymmetric Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CARD 1: Dual-Gate Clinical AI (Span 2) */}
        <Spotlight3DCard className="md:col-span-2 p-6 flex flex-col justify-between border-primary/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-psoft text-ptext border border-primary/30">
                  <Brain className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-ink">
                    {isBn ? "ডুয়েল-গেট ক্লিনিক্যাল এআই ইঞ্জিন" : "Dual-Gate Clinical AI Engine"}
                  </h3>
                  <p className="text-xs text-muted">
                    {isBn ? "রোগীর লক্ষণ বিশ্লেষণ ও চিকিৎসক ভেরিফিকেশন ফিল্টার" : "Zero-hallucination verification pipeline"}
                  </p>
                </div>
              </div>
              <Chip kind="verified">{isBn ? "সুরক্ষিত" : "Dual Gated"}</Chip>
            </div>

            {/* Interactive Pipeline Diagram (Manus / Hyphen Aesthetic) */}
            <div className="relative rounded-card border border-line bg-s2/40 p-4 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 text-xs">
                {/* Stage 1 */}
                <div className="rounded-input border border-line bg-s1 p-3 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">GATE 01</span>
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  <p className="font-bold text-ink">{isBn ? "রেড ফ্ল্যাগ ফিল্টার" : "Emergency Triaging"}</p>
                  <p className="text-[11px] text-muted">{isBn ? "৯৯৯ জরুরি শনাক্তকরণ" : "Chest pain, stroke, trauma detection"}</p>
                </div>

                {/* Stage 2 */}
                <div className="rounded-input border border-primary/40 bg-psoft/30 p-3 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-ptext font-bold">GATE 02</span>
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  </div>
                  <p className="font-bold text-ptext">{isBn ? "ক্লিনিক্যাল এআই গাইড" : "Eligibility Matching"}</p>
                  <p className="text-[11px] text-muted">{isBn ? "উপযুক্ত বিশেষজ্ঞ বাছাই" : "Clinical guidelines & affordability"}</p>
                </div>

                {/* Stage 3 */}
                <div className="rounded-input border border-line bg-s1 p-3 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted">FINAL</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-ptext" />
                  </div>
                  <p className="font-bold text-ink">{isBn ? "ডাক্তারের সিদ্ধান্ত" : "Doctor Verification"}</p>
                  <p className="text-[11px] text-muted">{isBn ? "BMDC ডাক্তারের সরাসরি সাক্ষাত" : "Licensed doctor oversight"}</p>
                </div>
              </div>

              {/* Connecting background light beam */}
              <div
                className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                aria-hidden
              />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
            <span className="text-muted font-mono">{isBn ? "কোনো ক্ষতিকারক হ্যালুসিনেশন নেই" : "Strict WHO & BMDC Clinical Safety Standard"}</span>
            <Link href="/navigator" className="font-bold text-ptext hover:underline inline-flex items-center gap-1">
              <span>{isBn ? "পরীক্ষা করুন" : "Try Symptom Navigator"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Spotlight3DCard>

        {/* CARD 2: Bilingual OCR & Report Digitizer (Span 1) */}
        <Spotlight3DCard className="p-6 flex flex-col justify-between border-info/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info/10 text-info border border-info/30">
                <ScanLine className="h-5 w-5" />
              </span>
              <span className="font-mono text-xs text-info font-bold">98.4% OCR Acc</span>
            </div>

            <div>
              <h3 className="font-bold text-base text-ink">
                {isBn ? "দ্বিভাষিক মেডিকেল ওসিআর" : "Bilingual Medical OCR"}
              </h3>
              <p className="text-xs text-muted mt-1">
                {isBn
                  ? "বাংলা ও ইংরেজি প্রেসক্রিপশন ও ল্যাব টেস্টের নিখুঁত স্ক্যান"
                  : "Digitizes printed & doctor handwriting into structured FHIR records"}
              </p>
            </div>

            {/* Micro Simulated OCR Preview */}
            <div className="rounded-input border border-line bg-s2/50 p-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="font-mono text-muted">Complete Blood Count</span>
                <span className="text-ptext font-bold">Verified</span>
              </div>
              <div className="space-y-1 font-mono text-muted text-[10px]">
                <div className="flex justify-between">
                  <span>Hemoglobin:</span>
                  <span className="text-ink font-bold">13.8 g/dL (Normal)</span>
                </div>
                <div className="flex justify-between">
                  <span>Platelets:</span>
                  <span className="text-ink font-bold">240,000 /mcL</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-line/60">
            <Link href="/reports/scan" className="text-xs font-bold text-info hover:underline inline-flex items-center gap-1">
              <span>{isBn ? "রিপোর্ট স্ক্যানার চালান" : "Start OCR Report Scanner"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Spotlight3DCard>

        {/* CARD 3: 100% Online Telehealth Matcher (Span 1) */}
        <Spotlight3DCard className="p-6 flex flex-col justify-between border-warn/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warn/10 text-warn border border-warn/30">
                <Video className="h-5 w-5" />
              </span>
              <Chip kind="doctor">{isBn ? "অনলাইন" : "100% Telehealth"}</Chip>
            </div>

            <div>
              <h3 className="font-bold text-base text-ink">
                {isBn ? "সাশ্রয়ী অনলাইন টেলিহেলথ" : "Affordability-Aware Telehealth"}
              </h3>
              <p className="text-xs text-muted mt-1">
                {isBn
                  ? "সরাসরি গুগল মিট লিংক, স্বচ্ছ ফি তালিকা ও ভেরিফাইড বিএমডিসি ডাক্তার"
                  : "Smart fee filtering, instant video meeting link, and verified practitioner booking"}
              </p>
            </div>

            {/* Telehealth Micro Preview */}
            <div className="rounded-input border border-line bg-s2/50 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Dr. Farhan Ahmed</span>
                <span className="font-mono text-[11px] text-ptext font-bold">৳ 500 BDT</span>
              </div>
              <p className="text-[11px] text-muted">Internal Medicine • BMDC #A-48219</p>
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Google Meet link auto-generated</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-line/60">
            <Link href="/appointments" className="text-xs font-bold text-warn hover:underline inline-flex items-center gap-1">
              <span>{isBn ? "টেলিহেলথ বুকিং করুন" : "Book Video Consult"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Spotlight3DCard>

        {/* CARD 4: Immutable Cryptographic Audit Ledger (Span 2) */}
        <Spotlight3DCard className="md:col-span-2 p-6 flex flex-col justify-between border-primary/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-psoft text-ptext border border-primary/30">
                  <Fingerprint className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-ink">
                    {isBn ? "ক্রিপ্টোগ্রাফিক ইমিউটেবল অডিট লেজার" : "Cryptographic Immutable Audit Ledger"}
                  </h3>
                  <p className="text-xs text-muted">
                    {isBn
                      ? "প্রতিটি ক্লিনিক্যাল ও প্রশাসনিক সিদ্ধান্তের অপরিবর্তনীয় ডিজিটাল প্রমাণ"
                      : "SHA-256 tamper-evident log linking every action to a licensed actor"}
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-s2 border border-line text-muted">
                SHA-256 Provenance
              </span>
            </div>

            {/* Cryptographic Hash Chain Micro Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-input border border-line bg-s1 p-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>BLOCK #08492</span>
                  <span className="text-ptext">Verified</span>
                </div>
                <p className="font-bold text-ink truncate text-[11px]">doctor.credential.verify</p>
                <p className="text-[10px] text-muted truncate">Actor: reviewer@medibridge · BMDC: A-48219</p>
                <div className="pt-1 text-[9px] text-muted truncate">
                  Hash: 0x8f2c...7e91a0
                </div>
              </div>

              <div className="rounded-input border border-line bg-s1 p-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span>BLOCK #08493</span>
                  <span className="text-ptext">Verified</span>
                </div>
                <p className="font-bold text-ink truncate text-[11px]">patient.consent.grant</p>
                <p className="text-[10px] text-muted truncate">Subject: patient_me · Scope: read_reports</p>
                <div className="pt-1 text-[9px] text-muted truncate">
                  Hash: 0x4a1e...b389f4
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
            <span className="text-muted font-mono text-[11px]">{isBn ? "প্রমাণপত্র ছাড়া কোনো ডেটা বিকৃতি সম্ভব নয়" : "Tamper-Proof Audit Standard for Health Sovereignty"}</span>
            <Link href="/admin?tab=audit" className="font-bold text-ptext hover:underline inline-flex items-center gap-1">
              <span>{isBn ? "অডিট লগ দেখুন" : "View Audit Records"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Spotlight3DCard>
      </div>
    </div>
  );
}
