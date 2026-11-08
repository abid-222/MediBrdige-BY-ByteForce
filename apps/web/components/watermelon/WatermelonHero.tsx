"use client";
import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  FileText,
  FlaskConical,
  HeartPulse,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UploadCloud,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui";
import { InteractiveTelemetry3D } from "@/components/InteractiveTelemetry3D";

function TechnicalVisualRadar() {
  return (
    <div
      className="pointer-events-none absolute top-0 right-0 bottom-0 hidden w-full items-center justify-end overflow-hidden opacity-40 dark:opacity-35 md:flex md:w-1/2 select-none"
      style={{
        WebkitMaskImage: "linear-gradient(to right, transparent, black 25%)",
        maskImage: "linear-gradient(to right, transparent, black 25%)",
      }}
      aria-hidden
    >
      <div className="relative flex h-[360px] w-[360px] items-center justify-end">
        <svg className="absolute right-0 h-[360px] w-[360px]" viewBox="0 0 360 360">
          {/* Subtle grid background */}
          <pattern id="watermelon-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
          <rect width="360" height="360" fill="url(#watermelon-grid)" />

          {/* Vertical axis line on the left side of the visual */}
          <line x1="60" y1="0" x2="60" y2="360" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          {/* Horizontal axis line */}
          <line x1="0" y1="180" x2="360" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {/* Coordinate labels */}
          <text x="65" y="16" fill="var(--primary)" fontSize="10" fontFamily="monospace" fontWeight="bold">
            GATE.01
          </text>
          <text x="300" y="174" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="monospace">
            BMDC.VERIFIED
          </text>

          {/* Glowing origin / crosshair */}
          <line x1="45" y1="180" x2="75" y2="180" stroke="var(--primary)" strokeWidth="2" />
          <line x1="60" y1="165" x2="60" y2="195" stroke="var(--primary)" strokeWidth="2" />

          {/* Radiating Half-Circles with dashed paths */}
          {[1, 2, 3, 4].map((i) => (
            <path
              key={`circle-${i}`}
              d={`M 60,${180 - i * 55} A ${i * 55},${i * 55} 0 0,1 60,${180 + i * 55}`}
              fill="none"
              stroke="var(--primary)"
              strokeOpacity={0.25 - i * 0.04}
              strokeWidth="1.2"
              strokeDasharray={i % 2 === 0 ? "2 6" : "1 4"}
            />
          ))}

          {/* Orbiting Telemetry Dots */}
          {[
            { angle: -45, r: 55 },
            { angle: 30, r: 110 },
            { angle: -20, r: 165 },
            { angle: 50, r: 220 },
            { angle: -65, r: 220 },
          ].map((dot, idx) => {
            const rad = (dot.angle * Math.PI) / 180;
            const x = 60 + Math.cos(rad) * dot.r;
            const y = 180 + Math.sin(rad) * dot.r;
            return (
              <circle
                key={`dot-${idx}`}
                cx={x}
                cy={y}
                r="2.5"
                fill="var(--primary)"
                className="animate-pulse"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function WatermelonHero({
  isBn,
  currentRole,
}: {
  isBn: boolean;
  currentRole: string;
}) {
  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden font-mono select-none">
      {/* Visual Technical Radar on Right Side (Watermelon / Hyphen Signature) */}
      <TechnicalVisualRadar />

      <div className="container relative z-10 mx-auto px-4 md:px-8 lg:px-12 text-center max-w-4xl">
        {/* Technical Sub-Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-ptext shadow-[0_0_15px_var(--accent-glow)]">
          <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
          <span>
            {isBn
              ? "🇧🇩 বাংলাদেশের জন্য স্বাস্থ্য সমন্বয় আর্কিটেকচার · ঢাকা ২০২৬"
              : "🇧🇩 HEALTHCARE COORDINATION ARCHITECTURE · DHAKA PROTOTYPE"}
          </span>
        </div>

        {/* Hero Title with Watermelon UI High-Contrast Focus */}
        <h1 className="mt-8 font-heading text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-ink">
          Healthcare that <br className="hidden sm:block" />
          is <span className="text-primary drop-shadow-[0_0_24px_var(--accent-glow)]">engineered for trust</span>
        </h1>

        {/* Guiding Principle */}
        <p className="mt-5 text-lg sm:text-2xl font-medium text-ink/90 max-w-2xl mx-auto">
          {isBn
            ? "এআই সহযোগিতা করবে। সিদ্ধান্ত নেবেন ডাক্তার। নিয়ন্ত্রণে থাকবেন রোগী।"
            : "AI assists. Doctors decide. Patients stay in control."}
        </p>

        {/* 3D Medical Telemetry Card */}
        <div className="my-8">
          <InteractiveTelemetry3D />
        </div>

        <p className="mt-2 text-xs sm:text-sm text-muted max-w-xl mx-auto uppercase tracking-wider leading-relaxed">
          {isBn
            ? "কাগজে আটকে থাকা বিভ্রান্তি দূর করে রোগীকে সঠিক চিকিৎসকের কাছে পৌঁছে দেওয়া এবং প্রেসক্রিপশন ডিজিটাইজেশনের সম্পূর্ণ নিরাপদ ব্যবস্থা।"
            : "Zero-hallucination dual-gate clinical pipeline, bilingual OCR extraction, and 100% online telehealth booking."}
        </p>

        {/* Action Buttons with Watermelon UI Cyber Styling */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/navigator">
            <Button className="btn-primary-neon h-12 px-6 text-xs sm:text-sm uppercase tracking-widest font-bold shadow-[0_0_18px_var(--accent-glow)] group">
              <Compass className="mr-2 h-4 w-4 group-hover:rotate-45 transition-transform" />
              <span>{isBn ? "স্মার্টকেয়ার নেভিগেটর চালান" : "Start SmartCare Navigator"}</span>
            </Button>
          </Link>

          <Link href={currentRole === "patient" ? "/reports/scan" : "/login?next=%2Freports%2Fscan"}>
            <Button
              variant="secondary"
              className="h-12 px-5 text-xs sm:text-sm uppercase tracking-widest font-bold border-primary/40 bg-s1/80 hover:bg-s2 hover:border-primary transition group"
            >
              <UploadCloud className="mr-2 h-4 w-4 text-ptext group-hover:-translate-y-0.5 transition-transform" />
              <span>{isBn ? "মেডিকেল রিপোর্ট ওসিআর" : "Scan Medical Report"}</span>
            </Button>
          </Link>

          <Link href="/directory">
            <Button
              variant="secondary"
              className="h-12 px-5 text-xs sm:text-sm uppercase tracking-widest font-bold border-line bg-s1/80 hover:bg-s2 transition"
            >
              <Stethoscope className="mr-2 h-4 w-4 text-muted" />
              <span>{isBn ? "ডাক্তার ডিরেক্টরি" : "Browse Doctors"}</span>
            </Button>
          </Link>

          <Link href="/ml-lab">
            <Button
              variant="ghost"
              className="h-12 px-4 text-xs sm:text-sm uppercase tracking-widest font-bold border border-primary/20 text-ptext hover:bg-primary/10 transition"
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              <span>{isBn ? "এমএল ল্যাব" : "ML Studio"}</span>
            </Button>
          </Link>
        </div>

        {/* Emergency Disclaimer Banner */}
        <div className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2.5 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-xs text-muted backdrop-blur-sm">
          <ShieldAlert className="h-4 w-4 text-danger shrink-0 animate-pulse" />
          <span className="text-[11px] font-mono leading-tight">
            {isBn
              ? "জরুরি পরিস্থিতিতে সরাসরি ৯৯৯ কল করুন। কৃত্রিম বুদ্ধিমত্তা কোনো প্রেসক্রিপশন বা ক্লিনিক্যাল ডায়াগনোসিস দেয় না।"
              : "In medical emergencies, call 999 immediately. AI never diagnoses or prescribes medication."}
          </span>
        </div>
      </div>
    </section>
  );
}
