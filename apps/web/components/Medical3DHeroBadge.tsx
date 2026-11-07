"use client";
import React from "react";
import { Activity, ShieldCheck, Sparkles, Brain, Lock } from "lucide-react";

export function Medical3DHeroBadge() {
  return (
    <div className="relative mx-auto flex items-center justify-center py-6 select-none perspective-1000">
      {/* Background Soft Glow */}
      <div className="absolute h-64 w-64 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />

      {/* Floating 3D Interactive Card */}
      <div className="group relative flex flex-col items-center gap-3 rounded-card border border-primary/30 bg-gradient-to-br from-s1/90 via-s1/70 to-psoft/20 p-5 shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_24px_var(--accent-glow)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:-rotate-1">
        {/* Top Floating Mini Badges */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-psoft/40 px-2.5 py-0.5 text-[10px] font-bold text-ptext shadow-sm">
            <Sparkles className="h-3 w-3" />
            <span>Dual-Gate Clinical AI</span>
          </span>
          <span className="flex items-center gap-1 rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info">
            <Lock className="h-3 w-3" />
            <span>Zero Hallucination</span>
          </span>
        </div>

        {/* Central Abstract Health Graphic (SVG Node Visualization) */}
        <div className="relative flex h-28 w-60 items-center justify-center overflow-hidden rounded-input border border-line bg-s2/50">
          <svg className="w-full h-full" viewBox="0 0 240 100" fill="none">
            {/* Grid Lines */}
            <line x1="0" y1="25" x2="240" y2="25" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2="240" y2="50" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
            <line x1="0" y1="75" x2="240" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />

            {/* Glowing EKG Pulse Line */}
            <path
              d="M 10 50 L 50 50 L 65 30 L 75 70 L 85 20 L 95 80 L 105 50 L 150 50 L 165 35 L 175 65 L 185 50 L 230 50"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_var(--accent-glow)]"
            />

            {/* Reference Range Band */}
            <rect x="0" y="30" width="240" height="40" fill="var(--accent)" fillOpacity="0.05" />

            {/* Node markers */}
            <circle cx="85" cy="20" r="4" fill="var(--accent)" className="animate-ping" />
            <circle cx="85" cy="20" r="3" fill="var(--accent-ink)" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="175" cy="65" r="3" fill="var(--accent-ink)" stroke="var(--accent)" strokeWidth="2" />
          </svg>

          {/* Overlay Stat Label */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-s1/90 border border-line px-1.5 py-0.5 text-[9px] font-mono text-ptext">
            <span>99.8% Clinical Gate</span>
          </div>
        </div>

        {/* Bottom Micro Architecture Text */}
        <div className="flex items-center justify-between w-full text-[11px] text-muted border-t border-line/60 pt-2 font-mono">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>BMDC Verified</span>
          </span>
          <span>Dhaka Prototype</span>
        </div>
      </div>
    </div>
  );
}
