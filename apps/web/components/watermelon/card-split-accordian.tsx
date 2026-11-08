"use client";

import React, { useState, useRef, type FC } from "react";
import {
  ChevronDown,
  ShieldCheck,
  FileSearch,
  Video,
  Lock,
  Stethoscope,
  Activity,
  HeartPulse,
  Sparkles,
} from "lucide-react";

export interface AccordionItemData {
  id: number;
  title: string;
  icon: React.ReactNode;
  content: string;
  tag?: string;
}

interface AccordionItemProps {
  item: AccordionItemData;
  setOpenId: (id: number | null) => void;
  index: number;
  total: number;
  openIndex: number;
}

export interface CardSplitAccordionProps {
  items?: AccordionItemData[];
  className?: string;
}

const DEFAULT_ITEMS: AccordionItemData[] = [
  {
    id: 1,
    title: "How does the Dual-Gate Clinical Safety Guard work?",
    icon: <ShieldCheck className="h-5 w-5 text-primary" />,
    tag: "CLINICAL GATE",
    content:
      "Every user input is parsed through a deterministic rule-engine before reaching any AI model. High-risk signals (chest pain, acute breathlessness, suicidal ideation) trigger immediate 999 emergency hotlines and hospital routing, completely bypassing standard appointment triage.",
  },
  {
    id: 2,
    title: "How does Bilingual Prescription & Lab OCR extract values?",
    icon: <FileSearch className="h-5 w-5 text-info" />,
    tag: "OCR VISION",
    content:
      "Our OCR engine accepts photos of handwritten or printed prescriptions in English and Bangla. It extracts key biomarkers (Hemoglobin, Platelets, Fasting Glucose) with per-field confidence scores and visual bounding boxes so doctors can verify against the original scan.",
  },
  {
    id: 3,
    title: "How does 100% Online Telehealth & Meet Link generation work?",
    icon: <Video className="h-5 w-5 text-primary" />,
    tag: "TELEHEALTH",
    content:
      "All consultations in MediBridge AI are conducted strictly online. When an appointment is confirmed, an encrypted Google Meet room is automatically generated with automated time slot verification, eliminating clinic waiting room congestion.",
  },
  {
    id: 4,
    title: "How are Doctors Verified via BMDC Registry?",
    icon: <Stethoscope className="h-5 w-5 text-warn" />,
    tag: "VERIFICATION",
    content:
      "Physicians register with their official Bangladesh Medical and Dental Council (BMDC) registration number. Super Admins verify license authenticity against official registries with mandatory audit documentation before granting clinical privileges.",
  },
  {
    id: 5,
    title: "What makes Patient Consent & Audit Trails tamper-proof?",
    icon: <Lock className="h-5 w-5 text-danger" />,
    tag: "DATA PRIVACY",
    content:
      "Patients retain 100% ownership of their medical charts. Doctors can only view records when an active care consent is granted. Every login, chart view, OCR edit, and consent revocation is cryptographically signed and stored in an immutable append-only audit ledger.",
  },
];

const AccordionItem: FC<AccordionItemProps> = ({
  item,
  setOpenId,
  index,
  total,
  openIndex,
}) => {
  const isOpen = index === openIndex;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const isBeforeOpen = index === openIndex - 1;
  const isAfterOpen = index === openIndex + 1;
  const isAlone = (isAfterOpen && isLast) || (isBeforeOpen && isFirst);

  // Border calculations following Watermelon Card Split Accordion physics
  const BORDER_WIDTH = "1px";
  const borderTopWidth = isFirst || isAfterOpen || isOpen ? BORDER_WIDTH : "0px";
  const borderBottomWidth = isLast || isBeforeOpen || isOpen ? BORDER_WIDTH : "0px";

  // Radius morphing calculations
  let borderRadiusClass = "rounded-none";
  if (isOpen || isAlone) {
    borderRadiusClass = "rounded-2xl";
  } else if (isBeforeOpen) {
    borderRadiusClass = "rounded-b-2xl";
  } else if (isAfterOpen) {
    borderRadiusClass = "rounded-t-2xl";
  } else if (isFirst) {
    borderRadiusClass = "rounded-t-2xl";
  } else if (isLast) {
    borderRadiusClass = "rounded-b-2xl";
  }

  return (
    <li className="list-none w-full transition-all duration-300 ease-out">
      <div
        className={`overflow-hidden border border-line bg-s1/90 transition-all duration-300 ease-out backdrop-blur-md ${borderRadiusClass} ${
          isOpen
            ? "border-primary/60 bg-s1 shadow-[0_0_25px_var(--accent-glow)] my-3"
            : "hover:bg-s2/80 my-0"
        }`}
        style={{
          borderTopWidth,
          borderBottomWidth,
        }}
      >
        <button
          type="button"
          onClick={() => setOpenId(isOpen ? null : item.id)}
          className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left transition-colors"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3.5 pr-4 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                isOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-line bg-s2 text-muted"
              }`}
            >
              {item.icon}
            </div>

            <div className="min-w-0">
              {item.tag && (
                <span className="text-[10px] font-mono tracking-widest text-primary/80 uppercase block mb-0.5">
                  // {item.tag}
                </span>
              )}
              <span className="text-sm md:text-base font-bold text-ink tracking-tight block">
                {item.title}
              </span>
            </div>
          </div>

          <div
            className={`shrink-0 ml-2 rounded-full border border-line p-1.5 transition-transform duration-300 ease-out ${
              isOpen
                ? "rotate-180 bg-primary/10 border-primary/40 text-primary"
                : "rotate-0 text-muted"
            }`}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </button>

        {/* Expandable Accordion Body with CSS Grid transition */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-line/60 px-5 pt-3.5 pb-5 text-xs md:text-sm text-muted font-mono leading-relaxed">
              <p>{item.content}</p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

export const CardSplitAccordion: FC<CardSplitAccordionProps> = ({
  items,
  className = "",
}) => {
  const defaultItems = items ?? DEFAULT_ITEMS;
  const [openId, setOpenId] = useState<number | null>(1); // 1st item open by default

  const openIndex = defaultItems.findIndex((item) => item.id === openId);

  return (
    <div className={`w-full flex flex-col items-center justify-center ${className}`}>
      <ul className="w-full max-w-3xl space-y-0">
        {defaultItems.map((item, index) => (
          <AccordionItem
            key={item.id}
            item={item}
            setOpenId={setOpenId}
            index={index}
            total={defaultItems.length}
            openIndex={openIndex}
          />
        ))}
      </ul>
    </div>
  );
};

export default CardSplitAccordion;
