"use client";
import React, { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";

export function AppLoadingScreen({
  minDurationMs = 250,
  children,
}: {
  minDurationMs?: number;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Only show on fresh page loads / initial session mount
    setMounted(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, minDurationMs);
    return () => clearTimeout(timer);
  }, [minDurationMs]);

  if (!mounted) {
    // Server render / pre-hydration: return null to avoid flash of jarring contrast
    return null;
  }

  return (
    <>
      {visible && (
        <div
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-bg select-none transition-opacity duration-300"
          style={{
            animation: "fadeOut 0.3s ease-out forwards",
            animationDelay: `${minDurationMs}ms`,
          }}
        >
          {/* Subtle soft backdrop glow */}
          <div className="absolute h-72 w-72 rounded-full bg-primary/8 blur-[80px] pointer-events-none" />

          {/* Clean Medical Logo */}
          <div className="relative flex flex-col items-center gap-3 z-10">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-s1 shadow-sm transition-all">
              <HeartPulse className="h-8 w-8 text-ptext animate-pulse" aria-hidden />
            </div>

            <div className="text-center space-y-0.5">
              <h1 className="font-heading text-lg font-bold tracking-tight text-ink flex items-center justify-center gap-1">
                <span>MediBridge</span>
                <span className="text-ptext">AI</span>
              </h1>
              <p className="text-[10px] text-muted font-mono tracking-wider uppercase">
                AI Assists · Doctors Decide · Patients Control
              </p>
            </div>

            {/* Soft progress bar */}
            <div className="mt-2 w-36 overflow-hidden rounded-full bg-s2 h-1 border border-line/60">
              <div className="h-full bg-primary rounded-full animate-progress-indeterminate" />
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
