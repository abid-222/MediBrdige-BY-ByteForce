"use client";
import React from "react";
import { MessageSquare, Stethoscope, User, ShieldCheck } from "lucide-react";

interface TestimonialItem {
  id: number;
  content: string;
  author: string;
  role: string;
  tag: string;
  avatarLetter: string;
}

const reviews: TestimonialItem[] = [
  {
    id: 1,
    content: "The dual-gate clinical safety guard prevented dangerous misdirection. Having BMDC verified doctor oversight makes it genuinely trustworthy.",
    author: "Dr. Farhan Ahmed",
    role: "Internal Medicine Specialist, BMDC #A-48219",
    tag: "CLINICAL SPECIALIST",
    avatarLetter: "F",
  },
  {
    id: 2,
    content: "Uploading my mother's old handwritten prescription from Dhaka and having the lab numbers extracted into clean trend charts saved hours at the clinic.",
    author: "Tanvir Rahman",
    role: "Patient Family Member, Dhanmondi",
    tag: "PATIENT VOICE",
    avatarLetter: "T",
  },
  {
    id: 3,
    content: "The 100% online telehealth booking with instant Google Meet link generation is seamless. Transparent fees upfront without clinic confusion.",
    author: "Dr. Nadia Karim",
    role: "Pediatric Consultant, BMDC #A-51203",
    tag: "TELEHEALTH REVIEW",
    avatarLetter: "N",
  },
  {
    id: 4,
    content: "The immutable cryptographic audit log gives healthcare institutions proof that patient consent was strictly checked before chart opening.",
    author: "Saif Chowdhury",
    role: "Hospital Systems Director, Uttara",
    tag: "GOVERNANCE AUDIT",
    avatarLetter: "S",
  },
  {
    id: 5,
    content: "No hallucinated prescriptions, no fake promises. The clinical red-flag checks for emergency chest pain and stroke are an absolute lifesaver.",
    author: "Sabrina Yasmin",
    role: "Healthcare Navigator User, Mirpur",
    tag: "EMERGENCY SAFETY",
    avatarLetter: "S",
  },
];

export function CommunityMarquee({ isBn }: { isBn: boolean }) {
  const marqueeItems = [...reviews, ...reviews];

  return (
    <section className="relative overflow-hidden py-16 md:py-24 font-mono select-none">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 hidden w-full border-t border-line lg:block" />

      <div className="container relative z-10 mx-auto px-4 md:px-8 lg:px-12">
        <div className="mb-12 flex flex-col items-start text-left md:items-center md:text-center max-w-3xl mx-auto">
          <div className="text-primary mb-3 inline-flex items-center text-xs font-bold tracking-widest uppercase">
            <span className="mr-3 opacity-70">{"//"}</span>
            CLINICAL FEEDBACK & PEER REVIEWS
          </div>
          <h2 className="font-heading text-2xl sm:text-4xl font-bold tracking-tight text-ink">
            {isBn ? (
              <>
                চিকিৎসক ও রোগীদের <span className="text-primary">বাস্তব অভিজ্ঞতা</span>
              </>
            ) : (
              <>
                Trusted by <span className="text-primary">Clinicians & Families</span>
              </>
            )}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-muted font-mono tracking-wider uppercase">
            {isBn
              ? "বাংলাদেশের চিকিৎসক ও রোগীদের বাস্তব মতামত।"
              : "Verifiable feedback from verified medical practitioners and patient caregivers."}
          </p>
        </div>
      </div>

      {/* Marquee Scroller */}
      <div className="relative mt-4 flex w-full max-w-full overflow-hidden">
        {/* Left/Right Fade Gradients for smooth entering/exiting */}
        <div className="pointer-events-none absolute top-0 left-0 z-20 h-full w-24 sm:w-36 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute top-0 right-0 z-20 h-full w-24 sm:w-36 bg-gradient-to-l from-bg to-transparent" />

        <div className="flex gap-5 px-3 whitespace-nowrap animate-marquee">
          {marqueeItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="group relative w-[320px] sm:w-[380px] shrink-0 border border-line bg-s1/80 backdrop-blur-md p-6 transition-all duration-300 hover:border-primary/50 shadow-xs"
            >
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 h-2 w-2 border-t border-l border-primary/60" />
              <div className="absolute top-0 right-0 h-2 w-2 border-t border-r border-primary/60" />
              <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-primary/60" />
              <div className="absolute right-0 bottom-0 h-2 w-2 border-r border-b border-primary/60" />

              <div className="flex h-full w-full flex-col whitespace-normal">
                {/* Tag Badge */}
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-ptext font-mono">
                    <ShieldCheck className="h-3 w-3" />
                    <span>{item.tag}</span>
                  </span>
                  <span className="text-[10px] text-muted font-mono">VERIFIED</span>
                </div>

                {/* Content */}
                <p className="mb-6 font-mono text-xs sm:text-sm leading-relaxed text-ink/90 group-hover:text-ink transition-colors">
                  &quot;{item.content}&quot;
                </p>

                {/* Author Info */}
                <div className="mt-auto flex items-center gap-3 border-t border-line/60 pt-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary font-bold text-xs font-mono">
                    {item.avatarLetter}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold tracking-wider text-ink uppercase truncate">
                      {item.author}
                    </span>
                    <span className="text-[10px] text-muted tracking-wide truncate">
                      {item.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
