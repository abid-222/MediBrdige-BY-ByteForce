"use client";
import React, { useRef, useState, MouseEvent, ReactNode } from "react";

export interface Spotlight3DCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  spotlightSize?: number;
  tiltMaxAngle?: number;
  enableTilt?: boolean;
  enableSpotlight?: boolean;
  onClick?: () => void;
}

export function Spotlight3DCard({
  children,
  className = "",
  spotlightColor = "var(--accent-glow)",
  spotlightSize = 340,
  tiltMaxAngle = 7,
  enableTilt = true,
  enableSpotlight = true,
  onClick,
}: Spotlight3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCoords({ x, y });
    setOpacity(1);

    if (enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -tiltMaxAngle;
      const rotateY = ((x - centerX) / centerX) * tiltMaxAngle;
      setTilt({ x: rotateX, y: rotateY });
    }
  };

  const handleMouseLeave = () => {
    setOpacity(0);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: enableTilt
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`
          : undefined,
        transition: "transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease",
        transformStyle: "preserve-3d",
      }}
      className={`group relative overflow-hidden rounded-card border border-line bg-s1/90 backdrop-blur-xl transition-all ${className}`}
    >
      {/* Specular Top Edge Light Refraction (Manus/Hyphen style) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        aria-hidden
      />

      {/* Dynamic Cursor Spotlight Beam */}
      {enableSpotlight && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            opacity,
            background: `radial-gradient(${spotlightSize}px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 80%)`,
          }}
          aria-hidden
        />
      )}

      {/* Card Content with 3D Depth Layer */}
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
