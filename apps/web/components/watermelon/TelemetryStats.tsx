"use client";
import React, { useEffect, useState, useRef } from "react";
import { ShieldCheck, Brain, Stethoscope, History } from "lucide-react";

function CountingNumber({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numMatch = value.match(/\d+/);
  const target = numMatch ? parseInt(numMatch[0], 10) : 0;
  const suffix = value.replace(/\d+/g, "");

  useEffect(() => {
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(ease * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <span className="tabular-nums">
      {displayValue}
      {suffix}
    </span>
  );
}

function Crosshair({ position }: { position: "top-left" | "top-right" | "bottom-left" | "bottom-right" }) {
  const isTop = position.startsWith("top");
  const isLeft = position.endsWith("left");

  return (
    <div
      className={`absolute z-10 hidden h-4 w-4 lg:block pointer-events-none ${
        isTop ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2"
      } ${isLeft ? "left-8 -translate-x-1/2 md:left-16" : "right-8 translate-x-1/2 md:right-16"}`}
    >
      <div className="absolute top-1/2 right-0 left-0 h-px bg-primary/40" />
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-primary/40" />
    </div>
  );
}

export function TelemetryStats({ isBn }: { isBn: boolean }) {
  const stats = [
    {
      id: 1,
      value: "100%",
      label: isBn ? "বিএমডিসি রেজিস্ট্রি ভেরিফাইড" : "BMDC Verified Sources",
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    },
    {
      id: 2,
      value: "99%",
      label: isBn ? "জিরো-হ্যালুসিনেশন সেফটি গেট" : "Zero-Hallucination Gate",
      icon: <Brain className="h-6 w-6 text-primary" />,
    },
    {
      id: 3,
      value: "4500+",
      label: isBn ? "বিশেষজ্ঞ ডাক্তার ও চেম্বার" : "Specialist Registry",
      icon: <Stethoscope className="h-6 w-6 text-primary" />,
    },
    {
      id: 4,
      value: "24/7",
      label: isBn ? "ক্রিপ্টোগ্রাফিক অডিট ট্রেইল" : "Tamper-Proof Audit Log",
      icon: <History className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <section className="relative w-full overflow-hidden py-10 sm:py-16 md:py-24 font-mono select-none">
      {/* Decorative Technical Borders */}
      <div className="absolute top-0 left-0 hidden w-full border-t border-line lg:block" />
      <div className="absolute bottom-0 left-0 hidden w-full border-b border-line lg:block" />
      <div className="absolute top-0 bottom-0 left-8 hidden w-px bg-line md:left-16 lg:block" />
      <div className="absolute top-0 right-8 bottom-0 hidden w-px bg-line md:right-16 lg:block" />

      {/* Crosshairs at intersections */}
      <Crosshair position="top-left" />
      <Crosshair position="top-right" />
      <Crosshair position="bottom-left" />
      <Crosshair position="bottom-right" />

      <div className="container relative z-10 mx-auto px-4 md:px-8 lg:px-12">
        <div className="mb-10 flex flex-col items-start text-left md:items-center md:text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-ptext mb-3">
            <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
            <span>{isBn ? "লাইভ ক্লিনিক্যাল মেট্রিক্স" : "Live Clinical Reliability Metrics"}</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-ink font-sans">
            {isBn ? (
              <>
                ক্লিনিক্যাল নির্ভুলতার জন্য <span className="text-primary">বাস্তব পরিসংখ্যান</span>
              </>
            ) : (
              <>
                Engineered for <span className="text-primary">Clinical Reliability</span>
              </>
            )}
          </h2>
          <p className="mt-2.5 text-xs sm:text-sm text-muted font-sans leading-relaxed">
            {isBn
              ? "কাগজে আটকে থাকা বিভ্রান্তি দূর করে সরাসরি যাচাইকৃত স্বাস্থ্য সমন্বয়।"
              : "Verifiable metrics powering trusted diagnosis coordination across Dhaka."}
          </p>
        </div>

        {/* 4 Stats Grid with Watermelon Technical Accents */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="group relative border border-line bg-s1/60 backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:bg-s2/40 shadow-xs"
            >
              {/* Corner Accents on the box */}
              <div className="absolute top-0 left-0 h-2 w-2 border-t border-l border-primary/60" />
              <div className="absolute top-0 right-0 h-2 w-2 border-t border-r border-primary/60" />
              <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-primary/60" />
              <div className="absolute right-0 bottom-0 h-2 w-2 border-r border-b border-primary/60" />

              <div className="flex h-full w-full flex-col items-center justify-center p-5 sm:p-8 text-center">
                <div className="mb-4 opacity-80 transition-transform duration-300 group-hover:scale-110 group-hover:opacity-100">
                  {stat.icon}
                </div>
                <div className="text-ink mb-2 font-mono text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                  <CountingNumber value={stat.value} />
                </div>
                <div className="text-[11px] font-bold tracking-widest text-muted uppercase group-hover:text-ink transition-colors">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
