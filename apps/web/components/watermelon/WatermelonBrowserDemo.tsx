"use client";
import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Compass,
  FileCheck2,
  Lock,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";

export function WatermelonBrowserDemo({ isBn }: { isBn: boolean }) {
  const [selectedCase, setSelectedCase] = useState<"cardiac" | "fever" | "ocr">("fever");

  return (
    <section className="py-16 md:py-24 relative overflow-hidden font-mono select-none">
      <div className="container relative z-10 mx-auto px-4 md:px-8 lg:px-12">
        <div className="mb-12 flex flex-col items-start md:items-center text-left md:text-center max-w-3xl mx-auto">
          <div className="text-primary mb-3 inline-flex items-center text-xs font-bold tracking-widest uppercase">
            <span className="mr-3 opacity-70">{"//"}</span>
            INTERACTIVE SYSTEM CONSOLE
          </div>
          <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-ink">
            {isBn ? (
              <>
                ক্লিনিক্যাল গেট ও এআই ট্রায়াজ <span className="text-primary">সরাসরি টেস্ট করুন</span>
              </>
            ) : (
              <>
                Live Architectural <span className="text-primary">Simulation</span>
              </>
            )}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted font-mono tracking-wider uppercase">
            {isBn
              ? "সরাসরি ব্রাউজারে দেখুন কীভাবে জরুরি রেড-ফ্ল্যাগ এবং এআই যোগ্যতা যাচাই হয়।"
              : "Witness real-time clinical gating, red-flag interception, and doctor matching."}
          </p>
        </div>

        {/* Browser Mockup Container with Corner Accents */}
        <div className="w-full max-w-5xl mx-auto border border-line bg-s1/70 backdrop-blur-xl relative group shadow-2xl rounded-card overflow-hidden">
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-primary z-20" />
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-primary z-20" />
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-primary z-20" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-primary z-20" />

          {/* Tech Header / Traffic Lights */}
          <div className="h-11 border-b border-line bg-s2/60 flex items-center px-4 md:px-6 gap-3 w-full">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-danger/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-warn/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary/80" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1 text-[11px] border border-line text-muted font-mono w-full max-w-xs text-center tracking-widest uppercase truncate rounded bg-s1/60">
                [ MEDIBRIDGE.AI // CLINICAL-GATE.SYS ]
              </div>
            </div>
            <div className="text-[10px] text-ptext font-mono font-bold hidden sm:block">
              SYS.ACTIVE
            </div>
          </div>

          {/* Console Body */}
          <div className="p-4 sm:p-8 space-y-6">
            {/* Case Selection Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-bold uppercase tracking-wider">Test Scenario:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCase("fever")}
                  className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded border transition ${
                    selectedCase === "fever"
                      ? "border-primary bg-primary text-onprimary shadow-xs"
                      : "border-line bg-s2/40 text-muted hover:text-ink"
                  }`}
                >
                  General Triage (Fever & Headache)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCase("cardiac")}
                  className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded border transition ${
                    selectedCase === "cardiac"
                      ? "border-danger bg-danger text-white shadow-xs"
                      : "border-line bg-s2/40 text-muted hover:text-ink"
                  }`}
                >
                  Emergency Red-Flag (Chest Pain)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCase("ocr")}
                  className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded border transition ${
                    selectedCase === "ocr"
                      ? "border-info bg-info text-white shadow-xs"
                      : "border-line bg-s2/40 text-muted hover:text-ink"
                  }`}
                >
                  Report Vision OCR
                </button>
              </div>
            </div>

            {/* Simulation Viewport */}
            {selectedCase === "cardiac" && (
              <div className="rounded-input border border-danger/40 bg-danger/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-danger font-bold text-sm">
                    <ShieldAlert className="h-5 w-5 animate-bounce" />
                    <span>RED-FLAG INTERCEPTION TRIGGERED</span>
                  </div>
                  <span className="font-mono text-xs text-danger font-bold uppercase px-2 py-0.5 rounded bg-danger/10 border border-danger/30">
                    Priority: Critical
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Severe chest pain with breathlessness detected. Clinical gate immediately suppresses routine appointments and presents direct emergency dispatch guidance.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-danger/20">
                  <a
                    href="tel:999"
                    className="inline-flex items-center gap-2 rounded bg-danger text-white px-4 py-2 text-xs font-bold uppercase tracking-wider shadow"
                  >
                    <PhoneCall className="h-4 w-4" />
                    <span>Call National Emergency 999</span>
                  </a>
                  <span className="text-xs text-muted font-mono">
                    Nearest Emergency Hospital: Dhaka Medical College Hospital (1.2 km)
                  </span>
                </div>
              </div>
            )}

            {selectedCase === "fever" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-input border border-line bg-s2/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-xs font-bold text-ink">Patient Query Analysis</span>
                    <span className="font-mono text-[10px] text-ptext font-bold">GATE PASSED</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono text-muted">
                    <p><strong className="text-ink">Reported Symptoms:</strong> 3-day high fever, body ache, mild headache</p>
                    <p><strong className="text-ink">Red Flags:</strong> None detected (No convulsion, no chest pain)</p>
                    <p><strong className="text-ink">Matched Specialty:</strong> Internal Medicine / General Physician</p>
                  </div>
                </div>

                <div className="rounded-input border border-primary/40 bg-psoft/20 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <span className="text-xs font-bold text-ptext">Matched Telehealth Practitioner</span>
                    <span className="font-mono text-[10px] text-ptext font-bold">BMDC VERIFIED</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-ink text-sm">Dr. Farhan Ahmed · MBBS, FCPS</p>
                    <p className="text-xs text-muted">Internal Medicine Specialist · BMDC #A-48219</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-mono text-ptext font-bold">Telehealth Fee: ৳ 500</span>
                      <Link
                        href="/appointments"
                        className="inline-flex items-center gap-1 font-bold text-xs text-ptext hover:underline"
                      >
                        <span>Book Instant Video</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedCase === "ocr" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-input border border-line bg-s2/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-xs font-bold text-ink">Raw Lab Report Input</span>
                    <span className="font-mono text-[10px] text-info font-bold">PARSED</span>
                  </div>
                  <p className="font-mono text-xs text-muted leading-relaxed">
                    Extracted from scanned PDF: Patient CBC shows Platelet count 115,000 /mcL (Mild thrombocytopenia), WBC 4.2 x 10^3 /mcL.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
                    <span className="h-2 w-2 rounded-full bg-info" />
                    <span>Confidence Score: 98.4% (Doctor Verification Required)</span>
                  </div>
                </div>

                <div className="rounded-input border border-info/40 bg-info/10 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-info/20 pb-2">
                    <span className="text-xs font-bold text-info">Longitudinal Trend Sync</span>
                    <span className="font-mono text-[10px] text-info font-bold">FHIR COMPLIANT</span>
                  </div>
                  <p className="text-xs text-muted">
                    Values plotted on timeline alongside previous 6 months of diagnostic history. Doctor can sign note with 1-click.
                  </p>
                  <Link
                    href="/reports"
                    className="inline-flex items-center gap-1 font-bold text-xs text-info hover:underline pt-1"
                  >
                    <span>Open OCR Scanner Console</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Bottom Tech Tags */}
            <div className="pt-4 border-t border-line/60">
              <p className="text-[11px] font-bold text-muted tracking-[0.2em] uppercase flex flex-wrap justify-center gap-x-4 gap-y-2">
                <Link href="/navigator" className="hover:text-primary transition-colors cursor-pointer">
                  [ AI TRIAGE ]
                </Link>
                <span className="text-muted/40">{"//"}</span>
                <Link href="/reports" className="hover:text-primary transition-colors cursor-pointer">
                  [ OCR PARSER ]
                </Link>
                <span className="text-muted/40">{"//"}</span>
                <Link href="/directory" className="hover:text-primary transition-colors cursor-pointer">
                  [ BMDC REGISTRY ]
                </Link>
                <span className="text-muted/40">{"//"}</span>
                <Link href="/admin?tab=audit" className="hover:text-primary transition-colors cursor-pointer">
                  [ AUDIT LEDGER ]
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
