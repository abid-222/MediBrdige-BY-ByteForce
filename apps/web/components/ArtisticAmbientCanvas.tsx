"use client";
import React from "react";

export function ArtisticAmbientCanvas() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden
    >
      {/* 1. Ambient Primary Glowing Orb (Top Left to Center) */}
      <div
        className="absolute -top-32 -left-20 h-[520px] w-[520px] rounded-full opacity-25 dark:opacity-20 blur-[120px] animate-pulse"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, rgba(15, 157, 88, 0.05) 70%, transparent 100%)",
          animationDuration: "9s",
        }}
      />

      {/* 2. Secondary Cyan/Info Light Orb (Top Right) */}
      <div
        className="absolute top-20 -right-24 h-[440px] w-[440px] rounded-full opacity-20 dark:opacity-15 blur-[110px]"
        style={{
          background: "radial-gradient(circle, var(--info) 0%, rgba(2, 132, 199, 0.05) 65%, transparent 100%)",
        }}
      />

      {/* 3. Deep Tertiary Subtle Glow (Center Lower) */}
      <div
        className="absolute top-[45%] left-[20%] h-[600px] w-[600px] rounded-full opacity-15 dark:opacity-10 blur-[140px]"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 65%)",
        }}
      />

      {/* 4. Artistic Medical Dot-Matrix Grid with Center Falloff Mask */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(var(--border) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 35%, black 20%, transparent 85%)",
        }}
      />

      {/* 5. Subtle Angular Specular Light Beam (Hyphen / Manus signature aesthetic) */}
      <div
        className="absolute top-0 inset-x-0 h-40 opacity-40 dark:opacity-30"
        style={{
          background: "linear-gradient(180deg, var(--accent-glow) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
