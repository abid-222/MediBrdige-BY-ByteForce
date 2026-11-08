"use client";
import React, {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock,
  FileSearch,
  Hourglass,
  Info,
  Inbox,
  Loader2,
  PhoneCall,
  Search,
  ShieldAlert,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
export { fmtDate, fmtDateTime, fmtTime } from "@/lib/format";

/* =========================================================
   1. BUTTON COMPONENT
   ========================================================= */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  busy?: boolean;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  busy = false,
  icon: Icon,
  iconPosition = "left",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-onprimary font-semibold shadow-[0_0_0_1px_var(--accent),0_0_18px_var(--accent-glow)] hover:brightness-110 active:scale-[0.98]",
    secondary:
      "border border-line bg-s1 text-ink hover:bg-s2 hover:border-line/80 active:scale-[0.98]",
    outline:
      "border border-primary/50 text-ptext bg-transparent hover:bg-psoft/30 active:scale-[0.98]",
    ghost:
      "text-ptext hover:bg-psoft active:scale-[0.98]",
    danger:
      "bg-danger text-white font-medium hover:brightness-110 active:scale-[0.98]",
  };

  const sizeStyles: Record<ButtonSize, string> = {
    xs: "px-2.5 py-1 text-xs min-h-[28px] gap-1.5 rounded-lg",
    sm: "px-3 py-1.5 text-xs min-h-[34px] gap-1.5 rounded-input",
    md: "px-4 py-2 text-sm min-h-[42px] gap-2 rounded-input",
    lg: "px-6 py-2.5 text-base min-h-[48px] gap-2.5 rounded-card",
  };

  return (
    <button
      {...props}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`inline-flex items-center justify-center font-medium transition-all select-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
      ) : Icon && iconPosition === "left" ? (
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      ) : null}
      {children}
      {!busy && Icon && iconPosition === "right" && (
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      )}
    </button>
  );
}

/* =========================================================
   2. SPINNER
   ========================================================= */
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sz = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-8 w-8" }[size];
  return <Loader2 className={`animate-spin text-primary ${sz} ${className}`} aria-label="Loading" role="status" />;
}

/* =========================================================
   3. CARDS
   ========================================================= */
export function Card({
  children,
  className = "",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <section
      className={`fade-in card-shadow rounded-card border border-line bg-s1 p-4 md:p-5 transition-all ${
        hover ? "card-hover" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function GlassCard({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <section
      className={`glass rounded-card p-4 md:p-5 transition-all ${
        hover ? "card-hover" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

/* =========================================================
   4. PAGE HEADER & BREADCRUMBS
   ========================================================= */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1.5 text-xs text-muted">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-muted/60">/</span>}
            {isLast || !item.href ? (
              <span className="font-medium text-ink truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <a href={item.href} className="hover:text-ink hover:underline truncate max-w-[150px]">
                {item.label}
              </a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">{actions}</div>}
    </div>
  );
}

/* =========================================================
   5. INPUTS, TEXTAREA, SEARCH, SELECT
   ========================================================= */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
}

export function Input({ label, hint, error, icon: Icon, id: explicitId, className = "", ...props }: InputProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  return (
    <div className="text-sm w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block font-medium text-xs uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <span className="absolute left-3 text-muted pointer-events-none">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
          className={`w-full rounded-input border bg-s1 px-3 py-2.5 min-h-[42px] text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition ${
            Icon ? "pl-9" : ""
          } ${error ? "border-danger focus-visible:ring-danger/40" : "border-line"} ${className}`}
        />
      </div>
      {hint && !error && (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-1 block text-xs text-danger font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, id: explicitId, className = "", ...props }: TextareaProps) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  return (
    <div className="text-sm w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block font-medium text-xs uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
        className={`w-full rounded-input border bg-s1 px-3 py-2 text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition resize-y min-h-[80px] ${
          error ? "border-danger focus-visible:ring-danger/40" : "border-line"
        } ${className}`}
      />
      {hint && !error && (
        <span id={`${id}-hint`} className="mt-1 block text-xs text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-1 block text-xs text-danger font-medium flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search...",
  className = "",
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 h-4 w-4 text-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-input border border-line bg-s2/60 pl-9 pr-8 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition min-h-[36px]"
      />
      {value && onClear && (
        <button
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2.5 p-0.5 rounded text-muted hover:text-ink transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Select({
  label,
  hint,
  error,
  children,
  id: explicitId,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string; error?: string }) {
  const generatedId = useId();
  const id = explicitId || generatedId;

  return (
    <div className="text-sm w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block font-medium text-xs uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          {...props}
          className={`w-full appearance-none rounded-input border bg-s1 px-3 py-2.5 min-h-[42px] pr-8 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition ${
            error ? "border-danger focus-visible:ring-danger/40" : "border-line"
          } ${className}`}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
      </div>
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </div>
  );
}

export const Why = ({ text }: { text: string }) => {
  const { t } = useI18n();
  return (
    <p className="mt-1 text-xs text-muted">
      <b>{t("onb.why")}:</b> {text}
    </p>
  );
};

/* =========================================================
   6. BADGES, CHIPS & STATUS TOKENS
   ========================================================= */
export type ChipKind =
  | "verified"
  | "pending"
  | "unverified"
  | "low"
  | "ai"
  | "emergency"
  | "doctor"
  | "stale"
  | "info"
  | "failed"
  | "processing"
  | "extracted";

export function Chip({ kind, children }: { kind: ChipKind; children?: ReactNode }) {
  const { t } = useI18n();
  const m: Record<ChipKind, [string, LucideIcon, string]> = {
    verified: ["border-primary/40 bg-psoft text-ptext", BadgeCheck, t("chip.verified")],
    doctor: ["border-primary/40 bg-psoft text-ptext", Stethoscope, t("chip.doctorVerified")],
    pending: ["border-warn/40 text-warn bg-warn/10", Hourglass, t("chip.pending")],
    unverified: ["border-dashed border-muted text-muted bg-s2/40", CircleHelp, t("chip.unverified")],
    low: ["border-warn/40 bg-s2 text-warn", FileSearch, t("chip.lowConfidence")],
    ai: ["border-info/40 text-info bg-info/10", Bot, t("chip.aiDraft")],
    emergency: ["border-danger bg-danger text-white", ShieldAlert, t("chip.emergency")],
    stale: ["border-warn/40 text-warn bg-warn/5", Clock, t("chip.stale")],
    info: ["border-info/40 text-info bg-info/10", Info, ""],
    failed: ["border-danger/40 text-danger bg-danger/10", AlertTriangle, t("status.failed")],
    processing: ["border-info/40 text-info bg-info/10", Loader2, t("status.processing")],
    extracted: ["border-line bg-s2 text-ink", FileSearch, t("status.extracted")],
  };
  const [cls, Icon, label] = m[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-xs font-medium select-none ${cls}`}>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${kind === "processing" ? "animate-spin" : ""}`} aria-hidden />
      {children ?? label}
    </span>
  );
}

export const verChip = (v: string) => (
  <Chip kind={v === "verified" ? "verified" : v === "pending" ? "pending" : "unverified"} />
);

export function docStatus(d: {
  status: string;
  verifiedCount?: number;
  total?: number;
  lowCount?: number;
}): ChipKind {
  if (d.status === "failed") return "failed";
  if (d.status === "processing" || d.status === "uploaded") return "processing";
  if (d.status === "unsupported") return "failed";
  if (d.total && d.verifiedCount === d.total) return "verified";
  if ((d.lowCount ?? 0) > 0) return "low";
  return "extracted";
}

export function Badge({
  count,
  variant = "primary",
  dot = false,
}: {
  count?: number;
  variant?: "primary" | "danger" | "warn" | "neutral" | "info";
  dot?: boolean;
}) {
  const v = {
    primary: "bg-primary text-onprimary",
    danger: "bg-danger text-white",
    warn: "bg-warn text-black",
    neutral: "bg-s2 border border-line text-muted",
    info: "bg-info text-white",
  }[variant];

  if (dot) {
    return <span className={`inline-block h-2 w-2 rounded-full ${v}`} aria-hidden />;
  }

  if (count === undefined || count === null || count === 0) return null;
  return (
    <span
      className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-pill px-1 text-[10px] font-bold select-none ${v}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* =========================================================
   7. STAT TILE
   ========================================================= */
export function StatTile({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: boolean;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendClass =
    trend === "up" ? "stat-trend-up" : trend === "down" ? "stat-trend-down" : "stat-trend-neutral";

  return (
    <div
      className={`card-shadow rounded-card border p-4 transition-all card-hover ${
        accent
          ? "border-primary/40 bg-gradient-to-br from-s1 to-psoft/20 shadow-[0_0_15px_var(--accent-glow)]"
          : "border-line bg-s1"
      }`}
    >
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-medium tracking-wide">{label}</span>
        {Icon && (
          <span className={`rounded-lg p-1.5 ${accent ? "bg-psoft text-ptext" : "bg-s2 text-muted"}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <div className="num mt-2 text-2xl font-bold tracking-tight text-ink">{value}</div>
      {trend && trendLabel && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs ${trendClass}`}>
          {TrendIcon && <TrendIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   8. PROGRESS BAR
   ========================================================= */
export function ProgressBar({
  value,
  max = 100,
  label,
  indeterminate = false,
}: {
  value?: number;
  max?: number;
  label?: string;
  indeterminate?: boolean;
}) {
  const pct = indeterminate ? undefined : Math.min(100, Math.round(((value ?? 0) / max) * 100));

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex justify-between text-xs text-muted font-medium">
          <span>{label}</span>
          {pct !== undefined && <span className="num">{pct}%</span>}
        </div>
      )}
      <div className="progress-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        {indeterminate ? (
          <div className="progress-bar-indeterminate" />
        ) : (
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   9. SKELETON LOADERS
   ========================================================= */
export const Skeleton = ({ h = 80, className = "" }: { h?: number; className?: string }) => (
  <div
    className={`skeleton rounded-card ${className}`}
    style={{ height: h }}
    aria-busy="true"
    aria-label="Loading"
    role="status"
  />
);

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton skeleton-text ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ rows = 1 }: { rows?: number }) {
  return (
    <div className="rounded-card border border-line bg-s1 p-4 space-y-3" aria-busy="true" role="status">
      <div className="flex items-center gap-3">
        <div className="skeleton skeleton-circle h-9 w-9" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton skeleton-text w-1/2" />
          <div className="skeleton skeleton-text w-1/3" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4 w-full rounded" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-card border border-line bg-s1 overflow-hidden" aria-busy="true" role="status">
      <div className="bg-s2 px-4 py-2.5 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-3.5 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-t border-line px-4 py-3 flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-3.5 rounded flex-1" style={{ opacity: 1 - c * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ h = 240 }: { h?: number }) {
  return (
    <div className="rounded-card border border-line bg-s1 p-4" aria-busy="true" role="status">
      <div className="skeleton h-4 w-32 rounded mb-4" />
      <div className="skeleton rounded-card" style={{ height: h }} />
    </div>
  );
}

/* =========================================================
   10. TABLES
   ========================================================= */
export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-line bg-s1">
      <table className={`data-table ${className}`}>{children}</table>
    </div>
  );
}

/* =========================================================
   11. TABS
   ========================================================= */
export function TabGroup<T extends string>({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: { key: T; label: string; icon?: LucideIcon; count?: number }[];
  active: T;
  onChange: (k: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`flex flex-wrap gap-1 rounded-card border border-line bg-s2/70 p-1 select-none ${className}`}
    >
      {tabs.map(({ key, label, icon: Icon, count }) => {
        const isSelected = active === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 rounded-input px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isSelected
                ? "bg-s1 text-ink shadow-sm border border-line/80"
                : "text-muted hover:text-ink hover:bg-s1/50"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{label}</span>
            {count !== undefined && count > 0 && (
              <Badge count={count} variant={isSelected ? "primary" : "neutral"} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================
   12. TOOLTIPS
   ========================================================= */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded-md bg-s2 border border-line px-2 py-1 text-[11px] font-medium text-ink shadow-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 whitespace-nowrap z-30"
      >
        {text}
      </div>
    </div>
  );
}

/* =========================================================
   13. DROPDOWN MENU
   ========================================================= */
export interface DropdownItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={`scale-in absolute mt-2 w-48 rounded-card border border-line bg-s1 p-1 shadow-2xl z-40 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-input px-3 py-2 text-xs font-medium transition ${
                  item.danger
                    ? "text-danger hover:bg-danger/10"
                    : "text-ink hover:bg-s2"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   14. MULTI-STEP INDICATOR
   ========================================================= */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="step-indicator w-full select-none" aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1 min-w-0">
          <div
            className={`step-dot ${i < current ? "done" : i === current ? "active" : ""}`}
            aria-current={i === current ? "step" : undefined}
          >
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          {i < steps.length - 1 && <div className={`step-line ${i < current ? "done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   15. EMERGENCY BANNER & AI BANNER
   ========================================================= */
export function EmergencyBanner({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="w-full emergency-pulse rounded-card border-2 border-danger bg-s1 p-4 shadow-[0_0_20px_rgba(255,92,108,0.25)]"
    >
      <div className="flex items-center gap-2 text-xl font-bold text-danger">
        <ShieldAlert className="h-6 w-6 shrink-0" aria-hidden />
        <h2>{t("emergency.title")}</h2>
      </div>
      <p className="mt-2 text-sm text-ink leading-relaxed">{text || t("emergency.body")}</p>
      <a
        href="tel:999"
        className="btn-link mt-3 inline-flex items-center gap-2 rounded-input bg-danger px-6 font-bold text-white hover:brightness-110 shadow-lg"
      >
        <PhoneCall className="h-4 w-4" aria-hidden />
        999
      </a>
    </div>
  );
}

export const AiBanner = () => (
  <div className="mb-3">
    <Chip kind="ai" />
  </div>
);

/* =========================================================
   16. EMPTY STATE & ASYNC CONTAINER
   ========================================================= */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line bg-s1/60 px-6 py-12 text-center fade-in">
      <span className="rounded-2xl bg-psoft/80 p-3.5 text-ptext shadow-inner">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <p className="font-semibold text-ink text-base">{title}</p>
      {body && <p className="max-w-sm text-xs text-muted leading-relaxed">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Async({
  loading,
  error,
  empty,
  emptyNode,
  onRetry,
  children,
  h,
  skeleton,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyNode?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
  h?: number;
  skeleton?: "table" | "card" | "chart";
}) {
  const { t } = useI18n();

  if (loading) {
    if (skeleton === "table") return <SkeletonTable />;
    if (skeleton === "card") return <SkeletonCard />;
    if (skeleton === "chart") return <ChartSkeleton h={h} />;
    return <Skeleton h={h} />;
  }

  if (error) {
    return (
      <Card className="border-danger/40">
        <div className="flex items-start gap-2.5 text-danger" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-semibold text-sm">Error Loading Content</p>
            <p className="text-xs text-muted mt-0.5">{error}</p>
          </div>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        )}
      </Card>
    );
  }

  if (empty) return <>{emptyNode ?? <EmptyState title={t("common.empty")} />}</>;

  return <>{children}</>;
}

/* =========================================================
   17. ACCESSIBLE DIALOG (MODAL)
   ========================================================= */
export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    prev.current = document.activeElement;
    ref.current?.querySelector<HTMLElement>("button, [href], input, textarea, select")?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>("button, [href], input, textarea, select");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      (prev.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="scale-in w-full max-w-lg rounded-card border border-line bg-s1 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-input p-1.5 text-muted hover:bg-s2 hover:text-ink transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   18. TOAST SYSTEM
   ========================================================= */
export type ToastKind = "success" | "error" | "warning" | "info";
export type ToastItem = { id: string; kind: ToastKind; title: string; body?: string };
export type ToastCtx = { addToast: (kind: ToastKind, title: string, body?: string) => void };

const ToastContext = createContext<ToastCtx>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((kind: ToastKind, title: string, body?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, kind, title, body }]);
    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const icons: Record<ToastKind, LucideIcon> = {
    success: CheckCircle2,
    error: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors: Record<ToastKind, string> = {
    success: "text-ptext",
    error: "text-danger",
    warning: "text-warn",
    info: "text-info",
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div id="toast-root" aria-live="polite" aria-label="Notifications">
        {toasts.map(({ id, kind, title, body }) => {
          const Icon = icons[kind];
          return (
            <div key={id} className={`toast toast-${kind}`} role="alert">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colors[kind]}`} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-ink">{title}</p>
                {body && <p className="text-xs text-muted mt-0.5 leading-relaxed">{body}</p>}
              </div>
              <button
                onClick={() => remove(id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-1 text-muted hover:bg-s2 hover:text-ink transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
