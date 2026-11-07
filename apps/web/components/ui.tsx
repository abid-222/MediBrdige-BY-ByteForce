"use client";
import { ReactNode, ButtonHTMLAttributes, useEffect, useId, useRef } from "react";
import { AlertTriangle, BadgeCheck, Bot, CircleHelp, Clock, FileSearch, Hourglass, Inbox, Info, Loader2, PhoneCall, ShieldAlert, Stethoscope, X, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
export { fmtDate, fmtDateTime, fmtTime } from "@/lib/format";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; busy?: boolean };
export function Button({ variant = "primary", busy, className = "", children, disabled, ...p }: BtnProps) {
  const v = {
    primary: "bg-primary text-onprimary hover:brightness-110 font-semibold shadow-[0_0_0_1px_var(--accent),0_0_20px_var(--accent-glow)] transition-all",
    secondary: "border border-line bg-s1 text-ink hover:bg-s2 hover:border-line/80",
    ghost: "text-ptext hover:bg-psoft",
    danger: "bg-danger text-white font-medium hover:brightness-110",
  }[variant];
  return <button {...p} disabled={disabled || busy} aria-busy={busy} className={`inline-flex items-center justify-center gap-2 rounded-input px-4 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}</button>;
}
export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) =>
  <section className={`fade-in card-shadow card-hover rounded-card border border-line bg-s1 p-4 md:p-5 ${className}`}>{children}</section>;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function Input({ label, hint, error, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1 block text-muted">{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : hint ? `${id}-h` : undefined} {...p}
        className={`w-full rounded-input border bg-s1 px-3 text-ink placeholder:text-muted ${error ? "border-danger" : "border-line"} ${p.className || ""}`} />
      {hint && !error && <span id={`${id}-h`} className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span id={`${id}-e`} role="alert" className="mt-1 block text-xs text-danger">{error}</span>}
    </div>
  );
}
export function Select({ label, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (<div className="text-sm"><label htmlFor={id} className="mb-1 block text-muted">{label}</label>
    <select id={id} {...p} className="w-full rounded-input border border-line bg-s1 px-3 text-ink">{children}</select></div>);
}
export const Why = ({ text }: { text: string }) => {
  const { t } = useI18n();
  return <p className="mt-1 text-xs text-muted"><b>{t("onb.why")}:</b> {text}</p>;
};

type ChipKind = "verified" | "pending" | "unverified" | "low" | "ai" | "emergency" | "doctor" | "stale" | "info" | "failed" | "processing" | "extracted";
export function Chip({ kind, children }: { kind: ChipKind; children?: ReactNode }) {
  const { t } = useI18n();
  // Colour never carries meaning alone: every chip has an icon and a text label.
  const m: Record<ChipKind, [string, LucideIcon, string]> = {
    verified: ["border-primary/40 bg-psoft text-ptext", BadgeCheck, t("chip.verified")],
    doctor: ["border-primary/40 bg-psoft text-ptext", Stethoscope, t("chip.doctorVerified")],
    pending: ["border-warn/40 text-warn", Hourglass, t("chip.pending")],
    unverified: ["border-dashed border-muted text-muted", CircleHelp, t("chip.unverified")],
    low: ["border-warn/40 bg-s2 text-warn", FileSearch, t("chip.lowConfidence")],
    ai: ["border-info/40 text-info", Bot, t("chip.aiDraft")],
    emergency: ["border-danger bg-danger text-white", ShieldAlert, t("chip.emergency")],
    stale: ["border-warn/40 text-warn", Clock, t("chip.stale")],
    info: ["border-info/40 text-info", Info, ""],
    failed: ["border-danger/40 text-danger", AlertTriangle, t("status.failed")],
    processing: ["border-info/40 text-info", Loader2, t("status.processing")],
    extracted: ["border-line bg-s2 text-ink", FileSearch, t("status.extracted")],
  };
  const [cls, Icon, label] = m[kind];
  return <span className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium ${cls}`}><Icon className={`h-3.5 w-3.5 ${kind === "processing" ? "animate-spin" : ""}`} aria-hidden />{children ?? label}</span>;
}
export const verChip = (v: string) => <Chip kind={v === "verified" ? "verified" : v === "pending" ? "pending" : "unverified"} />;

/** Document lifecycle label — never shows "Verified" unless a doctor actually verified the values. */
export function docStatus(d: { status: string; verifiedCount?: number; total?: number; lowCount?: number }): ChipKind {
  if (d.status === "failed") return "failed";
  if (d.status === "processing" || d.status === "uploaded") return "processing";
  if (d.status === "unsupported") return "failed";
  if (d.total && d.verifiedCount === d.total) return "verified";
  if ((d.lowCount ?? 0) > 0) return "low";
  return "extracted";
}

export function StatTile({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="card-shadow rounded-card border border-line bg-s1 p-4">
      <div className="flex items-center justify-between text-xs text-muted"><span>{label}</span>{Icon && <Icon className="h-4 w-4 text-ptext" aria-hidden />}</div>
      <div className="num mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
export function EmergencyBanner({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="w-full emergency-pulse rounded-card border-2 border-danger bg-s1 p-4 shadow-[0_0_20px_rgba(255,92,108,0.2)]">
      <div className="flex items-center gap-2 text-xl text-danger"><ShieldAlert className="h-6 w-6" aria-hidden /><h2>{t("emergency.title")}</h2></div>
      <p className="mt-2">{text || t("emergency.body")}</p>
      <a href="tel:999" className="btn-link mt-3 gap-2 rounded-input bg-danger px-6 font-semibold text-white hover:brightness-110"><PhoneCall className="h-4 w-4" aria-hidden />999</a>
    </div>
  );
}
export const AiBanner = () => <div className="mb-3"><Chip kind="ai" /></div>;
export const Skeleton = ({ h = 80 }: { h?: number }) => <div className="skeleton" style={{ height: h }} aria-busy aria-label="Loading" role="status" />;

export function EmptyState({ icon: Icon = Inbox, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line bg-s1 px-6 py-10 text-center">
      <span className="rounded-pill bg-psoft p-3 text-ptext"><Icon className="h-6 w-6" aria-hidden /></span>
      <p className="font-medium">{title}</p>{body && <p className="max-w-sm text-sm text-muted">{body}</p>}{action}
    </div>
  );
}

export function Async({ loading, error, empty, emptyNode, onRetry, children, h }: { loading: boolean; error: string | null; empty?: boolean; emptyNode?: ReactNode; onRetry?: () => void; children: ReactNode; h?: number }) {
  const { t } = useI18n();
  if (loading) return <Skeleton h={h} />;
  if (error) return <Card><p className="flex items-center gap-2 text-danger" role="alert"><AlertTriangle className="h-4 w-4" aria-hidden />{error}</p>{onRetry && <Button variant="secondary" className="mt-3" onClick={onRetry}>{t("common.retry")}</Button>}</Card>;
  if (empty) return <>{emptyNode ?? <EmptyState title={t("common.empty")} />}</>;
  return <>{children}</>;
}

/** Accessible modal: focus moves in, Escape closes, focus returns to the opener, background is inert to screen readers. */
export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    prev.current = document.activeElement;
    ref.current?.querySelector<HTMLElement>("button, [href], input, textarea, select")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {   // simple focus trap
        const f = ref.current.querySelectorAll<HTMLElement>("button, [href], input, textarea, select");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); (prev.current as HTMLElement | null)?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-card border border-line bg-s1 p-5 shadow-glow">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xl">{title}</h2><button onClick={onClose} aria-label={t("common.close")} className="rounded-input p-2 hover:bg-s2"><X className="h-4 w-4" /></button></div>
        {children}
      </div>
    </div>
  );
}
