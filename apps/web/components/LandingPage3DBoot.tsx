"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Activity, ShieldCheck, Sparkles, Stethoscope, ChevronRight, Play, Eye } from "lucide-react";

export function LandingPage3DBoot() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [stage, setStage] = useState<"initializing" | "syncing" | "ready" | "exiting">("initializing");
  const [progress, setProgress] = useState(0);

  const startBootSequence = useCallback(() => {
    setActive(true);
    setStage("initializing");
    setProgress(0);

    // Timeline
    const p1 = setTimeout(() => {
      setProgress(42);
      setStage("syncing");
    }, 450);

    const p2 = setTimeout(() => {
      setProgress(88);
      setStage("ready");
    }, 1150);

    const p3 = setTimeout(() => {
      setProgress(100);
      setStage("exiting");
    }, 1900);

    const p4 = setTimeout(() => {
      setActive(false);
      try {
        sessionStorage.setItem("mb_boot_seen", "1");
      } catch (e) {}
    }, 2500);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(p4);
    };
  }, []);

  const skipBoot = useCallback(() => {
    setActive(false);
    try {
      sessionStorage.setItem("mb_boot_seen", "1");
    } catch (e) {}
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const alreadySeen = sessionStorage.getItem("mb_boot_seen");
      if (!alreadySeen) {
        startBootSequence();
      }
    } catch (e) {
      // Fallback
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipBoot();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [skipBoot, startBootSequence]);

  // Expose replay function globally for the Replay button
  useEffect(() => {
    (window as any).__replayMediBridge3D = startBootSequence;
    return () => {
      delete (window as any).__replayMediBridge3D;
    };
  }, [startBootSequence]);

  if (!mounted || !active) return null;

  return (
    <div
      role="dialog"
      aria-label="MediBridge 3D System Initialization"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden transition-all duration-700 select-none ${
        stage === "exiting" ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{
        background: "radial-gradient(circle at center, var(--surface-1) 0%, var(--bg) 100%)",
      }}
    >
      {/* 3D Horizon Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-30"
        style={{ perspective: "600px" }}
      >
        <div
          className="absolute inset-x-[-50%] bottom-[-20%] h-[140%] w-[200%] origin-bottom"
          style={{
            transform: "rotateX(62deg) translateY(-20%)",
            backgroundImage: `
              linear-gradient(to right, var(--primary) 1px, transparent 1px),
              linear-gradient(to bottom, var(--primary) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, transparent 80%)",
            WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, transparent 80%)",
          }}
        />
      </div>

      {/* Cybernetic HUD Frame Accents */}
      <div className="pointer-events-none absolute inset-6 border border-line/40 rounded-2xl flex flex-col justify-between p-6">
        {/* Top Telemetry */}
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="font-bold text-ptext">BOOT.SEQ // MEDIBRIDGE-V2</span>
            <span className="hidden sm:inline opacity-60">| DHAKA-BMDC-GRID: ACTIVE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted/80">LAT 23.8103° N // LON 90.4125° E</span>
          </div>
        </div>

        {/* Bottom Telemetry */}
        <div className="flex items-center justify-between text-[11px] font-mono text-muted">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>DUAL-GATE CLINICAL SAFETY: ZERO-HALLUCINATION ENFORCED</span>
          </div>
          <span className="font-mono text-ptext font-bold">{progress}% READY</span>
        </div>
      </div>

      {/* Skip Button */}
      <button
        type="button"
        onClick={skipBoot}
        className="absolute top-8 right-8 z-50 flex items-center gap-1.5 rounded-full border border-line bg-s1/90 px-3.5 py-1.5 text-xs font-mono font-semibold text-muted hover:text-ink hover:border-primary transition shadow-md backdrop-blur-md"
      >
        <span>Skip [Esc]</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* Central 3D Gyroscope Hologram */}
      <div
        className="relative flex items-center justify-center h-[340px] w-[340px] sm:h-[420px] sm:w-[420px]"
        style={{ perspective: "1000px" }}
      >
        {/* Ambient Radial Bloom */}
        <div className="absolute h-64 w-64 rounded-full bg-primary/20 blur-[90px] pointer-events-none animate-pulse" />

        {/* Outer 3D Gyroscope Ring 1 */}
        <div
          className="absolute inset-4 rounded-full border-2 border-dashed border-primary/40 animate-[spin_12s_linear_infinite]"
          style={{
            transform: "rotateX(65deg) rotateY(20deg)",
            transformStyle: "preserve-3d",
          }}
        />

        {/* Outer 3D Gyroscope Ring 2 */}
        <div
          className="absolute inset-8 rounded-full border border-primary/60 animate-[spin_8s_linear_infinite_reverse]"
          style={{
            transform: "rotateY(65deg) rotateX(25deg)",
            transformStyle: "preserve-3d",
          }}
        />

        {/* Middle 3D Gyroscope Ring 3 */}
        <div
          className="absolute inset-14 rounded-full border-2 border-primary/80 animate-[spin_6s_ease-in-out_infinite]"
          style={{
            transform: "rotateX(40deg) rotateZ(35deg)",
            transformStyle: "preserve-3d",
          }}
        />

        {/* Central Luminous Hologram Core: Floating Medical Cross with Pulse */}
        <div
          className="relative z-10 flex flex-col items-center justify-center p-8 rounded-3xl border border-primary/60 bg-s1/90 shadow-[0_0_50px_var(--accent-glow),0_20px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl animate-[pulse_2.5s_easeInOut_infinite]"
          style={{
            transform: "translateZ(50px)",
          }}
        >
          {/* Medical Icon with Hologram Sweep */}
          <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_30px_var(--accent-glow)]">
            <Stethoscope className="h-10 w-10 animate-bounce" />
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div
                className="w-full h-1/2 bg-white/30 blur-xs animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"
                style={{
                  transform: "rotate(45deg) translateY(-50%)",
                }}
              />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans">
            MediBridge <span className="text-primary font-mono">AI</span>
          </h1>
          <p className="text-[11px] font-mono tracking-widest uppercase text-muted mt-1 text-center">
            Zero-Hallucination Clinical Portal
          </p>

          {/* Cardiac Pulse Line */}
          <div className="mt-4 w-48 h-6 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 160 24" fill="none">
              <path
                d="M 0 12 L 35 12 L 45 4 L 55 20 L 65 2 L 75 22 L 85 12 L 160 12"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_6px_var(--primary)]"
              />
            </svg>
          </div>
        </div>

        {/* Orbital Medical Nodes */}
        {[
          { label: "BMDC", angle: 0, r: 155 },
          { label: "OCR", angle: 90, r: 155 },
          { label: "GATE-01", angle: 180, r: 155 },
          { label: "TELEHEALTH", angle: 270, r: 155 },
        ].map((node, i) => {
          const rad = (node.angle * Math.PI) / 180;
          const x = Math.cos(rad) * node.r;
          const y = Math.sin(rad) * node.r;
          return (
            <div
              key={i}
              className="absolute flex items-center justify-center rounded-full border border-primary/60 bg-s1 px-2.5 py-1 text-[9px] font-mono font-bold text-ptext shadow-md backdrop-blur-md animate-pulse"
              style={{
                transform: `translate(${x}px, ${y}px) translateZ(30px)`,
              }}
            >
              {node.label}
            </div>
          );
        })}
      </div>

      {/* Progress Telemetry Readout */}
      <div className="mt-6 flex flex-col items-center gap-2 max-w-sm w-full px-6">
        <div className="w-full h-1.5 rounded-full bg-s2 border border-line overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_var(--primary)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-[11px] font-mono text-muted">
          <span>
            {stage === "initializing" && "CALIBRATING CLINICAL SAFETY MESH..."}
            {stage === "syncing" && "SYNCHRONIZING BANGLADESH BMDC REGISTRY..."}
            {stage === "ready" && "ALL MEDICAL GATES ARMED · ZERO HALLUCINATION LOCK"}
            {stage === "exiting" && "ENTERING CLINICAL WORKSPACE..."}
          </span>
          <span className="font-bold text-ptext">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
