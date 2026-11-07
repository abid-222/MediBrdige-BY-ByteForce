"use client";
import React, { useEffect, useState } from "react";
import { HeartPulse, Sparkles, Activity, ShieldCheck } from "lucide-react";

export function AppLoadingScreen({
  minDurationMs = 600,
  children,
}: {
  minDurationMs?: number;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, minDurationMs);
    return () => clearTimeout(timer);
  }, [minDurationMs]);

  if (!mounted || visible) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-bg select-none transition-opacity duration-300">
        {/* Subtle radial glow background */}
        <div className="absolute h-96 w-96 rounded-full bg-primary/10 blur-[90px] pointer-events-none" />

        {/* 3D Pulsing Medical Brand Logo */}
        <div className="relative flex flex-col items-center gap-4 z-10">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/40 bg-s1 shadow-[0_0_40px_var(--accent-glow)] transition-all">
            {/* Orbiting ring */}
            <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 animate-ping opacity-30" />
            <HeartPulse className="h-10 w-10 text-ptext animate-pulse" aria-hidden />
          </div>

          <div className="text-center space-y-1">
            <h1 className="font-heading text-xl font-bold tracking-tight text-ink flex items-center justify-center gap-1.5">
              <span>MediBridge</span>
              <span className="text-ptext">AI</span>
            </h1>
            <p className="text-[11px] text-muted font-mono tracking-wider uppercase">
              AI Assists · Doctors Decide · Patients Control
            </p>
          </div>

          {/* Smooth Determinate / Indeterminate Bar */}
          <div className="mt-2 w-48 overflow-hidden rounded-full bg-s2/80 h-1 border border-line">
            <div className="h-full bg-primary rounded-full animate-progress-indeterminate" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
