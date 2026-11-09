"use client";
import React, { useState } from "react";
import { Activity, ShieldCheck, Sparkles, Brain, Lock, Heart, CheckCircle2, RefreshCw } from "lucide-react";
import { Spotlight3DCard } from "./Spotlight3DCard";

export function InteractiveTelemetry3D() {
  const [pulseRate, setPulseRate] = useState<"normal" | "active">("normal");

  return (
    <div className="relative mx-auto flex items-center justify-center py-6 select-none">
      {/* Background Soft Accent Glow */}
      <div className="absolute h-72 w-80 rounded-full bg-primary/15 blur-[75px] pointer-events-none" />

      {/* 3D Spotlight Tilt Card */}
      <Spotlight3DCard
        tiltMaxAngle={9}
        className="w-full max-w-xl border-primary/40 p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_var(--accent-glow)]"
      >
        <div className="flex flex-col gap-3.5 sm:gap-4">
          {/* Header Row: Live Status + Dual Gate Indicators */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-ink">
                Live Telemetry
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-psoft/50 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-ptext shadow-xs">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Zero Hallucination</span>
              </span>
              <button
                type="button"
                onClick={() => setPulseRate((prev) => (prev === "normal" ? "active" : "normal"))}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-s2 px-2 py-0.5 text-[10px] sm:text-[11px] font-mono text-muted hover:text-ink transition hover:border-primary/50"
                title="Toggle pulse simulation rhythm"
              >
                <Heart className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${pulseRate === "active" ? "text-danger animate-bounce" : "text-primary"}`} />
                <span>{pulseRate === "normal" ? "72 BPM" : "108 BPM"}</span>
              </button>
            </div>
          </div>

          {/* Central 3D Visualizer: EKG Medical Waveform Display */}
          <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-input border border-line bg-gradient-to-b from-s2/60 to-s1/40 p-2">
            {/* Fine Medical Grid Background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
                backgroundSize: "16px 16px",
              }}
            />

            {/* Glowing EKG SVG Graph with Animated Sweep */}
            <svg
              className="w-full h-full relative z-10"
              viewBox="0 0 400 120"
              fill="none"
              preserveAspectRatio="none"
            >
              {/* Reference Baseline Bands */}
              <line x1="0" y1="60" x2="400" y2="60" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
              <rect x="0" y="35" width="400" height="50" fill="var(--accent)" fillOpacity="0.04" />

              {/* Pulsing Cardiac Path */}
              <path
                d="M 0 60 L 40 60 L 55 60 L 65 42 L 75 78 L 88 18 L 102 96 L 115 60 L 135 60 L 155 50 L 175 68 L 190 60 L 230 60 L 245 42 L 255 78 L 268 18 L 282 96 L 295 60 L 320 60 L 340 50 L 360 68 L 375 60 L 400 60"
                stroke="var(--accent)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_10px_var(--accent-glow)]"
              />

              {/* Dynamic Radar Lead Node */}
              <circle
                cx={pulseRate === "active" ? "268" : "88"}
                cy="18"
                r="4.5"
                fill="var(--accent)"
                className="animate-ping"
              />
              <circle
                cx={pulseRate === "active" ? "268" : "88"}
                cy="18"
                r="3.5"
                fill="var(--surface-1)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
            </svg>

            {/* Telemetry Float Tag */}
            <div className="absolute bottom-2.5 right-3 z-20 flex items-center gap-1.5 rounded-pill border border-primary/40 bg-s1/90 px-2.5 py-1 text-[10px] font-mono text-ptext shadow-sm backdrop-blur-md">
              <Sparkles className="h-3 w-3" />
              <span>99.8% Clinical Safety Guard</span>
            </div>
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="rounded-input border border-line/60 bg-s2/40 p-2">
              <span className="block text-[10px] text-muted uppercase font-mono tracking-wider">Source Grounding</span>
              <span className="font-bold text-xs text-ink flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-ptext" />
                <span>100% BMDC</span>
              </span>
            </div>
            <div className="rounded-input border border-line/60 bg-s2/40 p-2">
              <span className="block text-[10px] text-muted uppercase font-mono tracking-wider">AI Doctor Gate</span>
              <span className="font-bold text-xs text-ink flex items-center justify-center gap-1 mt-0.5">
                <Lock className="h-3.5 w-3.5 text-info" />
                <span>Dual-Gated</span>
              </span>
            </div>
            <div className="rounded-input border border-line/60 bg-s2/40 p-2">
              <span className="block text-[10px] text-muted uppercase font-mono tracking-wider">Audit Trail</span>
              <span className="font-bold text-xs text-ink flex items-center justify-center gap-1 mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-ptext" />
                <span>Immutable</span>
              </span>
            </div>
          </div>
        </div>
      </Spotlight3DCard>
    </div>
  );
}

export default InteractiveTelemetry3D;
