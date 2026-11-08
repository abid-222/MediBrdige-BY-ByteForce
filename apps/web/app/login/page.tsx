"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { api, homeFor, setSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input } from "@/components/ui";

type PortalRole = "patient" | "doctor" | "hospital" | "admin";

const ROLES_CONFIG: Record<
  PortalRole,
  {
    nameEn: string;
    nameBn: string;
    descEn: string;
    descBn: string;
    demoEmail: string;
    color: string;
    glow: string;
    border: string;
    icon: typeof HeartPulse;
  }
> = {
  patient: {
    nameEn: "Patient Portal",
    nameBn: "রোগী পোর্টাল",
    descEn: "View health profile, upload OCR medical reports, and access digital prescriptions.",
    descBn: "স্বাস্থ্য প্রোফাইল, ওসিআর রিপোর্ট স্ক্যানার এবং ডিজিটাল প্রেসক্রিপশন দেখুন।",
    demoEmail: "patient1@demo.medibridge.dev",
    color: "text-primary bg-psoft",
    glow: "shadow-[0_0_20px_var(--accent-glow)]",
    border: "border-primary",
    icon: HeartPulse,
  },
  doctor: {
    nameEn: "Doctor & Specialist",
    nameBn: "ডাক্তার ও বিশেষজ্ঞ",
    descEn: "Review patient history, verify lab observations, and compose digital prescriptions.",
    descBn: "রোগীর হিস্ট্রি পর্যালোচনা, ল্যাব টেস্ট যাচাই এবং প্রেসক্রিপশন তৈরি করুন।",
    demoEmail: "doctor1@demo.medibridge.dev",
    color: "text-info bg-info/10",
    glow: "shadow-[0_0_20px_rgba(91,192,255,0.3)]",
    border: "border-info",
    icon: Stethoscope,
  },
  hospital: {
    nameEn: "Hospital & Facility",
    nameBn: "হাসপাতাল ও ক্লিনিক",
    descEn: "Manage facility departments, doctor schedules, and clinical operations.",
    descBn: "হাসপাতাল বিভাগ, ডাক্তারদের শিডিউল এবং অপারেশন পরিচালনা করুন।",
    demoEmail: "hospital@demo.medibridge.dev",
    color: "text-warn bg-warn/10",
    glow: "shadow-[0_0_20px_rgba(255,200,87,0.3)]",
    border: "border-warn",
    icon: Building2,
  },
  admin: {
    nameEn: "Super Admin",
    nameBn: "সিস্টেম অ্যাডমিন",
    descEn: "Verify doctor licenses, monitor ML pipelines, and inspect system audit logs.",
    descBn: "ডাক্তারদের লাইসেন্স যাচাই, এমএল মডেল পর্যবেক্ষণ এবং অডিট লগ দেখুন।",
    demoEmail: "admin@demo.medibridge.dev",
    color: "text-danger bg-danger/10",
    glow: "shadow-[0_0_20px_rgba(255,92,108,0.3)]",
    border: "border-danger",
    icon: ShieldCheck,
  },
};

export default function Login() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isBn = locale === "bn";

  const [activeRole, setActiveRole] = useState<PortalRole>("patient");
  const [email, setEmail] = useState("patient1@demo.medibridge.dev");
  const [password, setPassword] = useState("Demo@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const activeConfig = ROLES_CONFIG[activeRole];
  const ActiveIcon = activeConfig.icon;

  const handleRoleChange = (role: PortalRole) => {
    setActiveRole(role);
    setEmail(ROLES_CONFIG[role].demoEmail);
    setPassword("Demo@12345");
    setErr("");
  };

  const submit = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setBusy(true);
    setErr("");
    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    try {
      const r = await api("/auth/login", { body: { email: loginEmail, password: loginPass } });
      setSession(r.access_token, r.role);
      if (r.status === "pending") return router.push("/apply");

      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const nextTarget = params?.get("next");
      const safeNext = nextTarget && nextTarget.startsWith("/") && !nextTarget.startsWith("//") ? nextTarget : null;

      if (r.role === "patient") {
        try {
          const p = await api("/patients/me");
          if (!p.onboarding_completed) return router.push("/onboarding");
          return router.push(safeNext || "/dashboard");
        } catch {
          return router.push(safeNext || "/dashboard");
        }
      }
      router.push(safeNext || homeFor(r.role));
    } catch (e: any) {
      if (e.code === "email_not_verified") {
        router.push(`/verify-email?email=${encodeURIComponent(loginEmail)}`);
      } else {
        setErr(e.message || (isBn ? "লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড চেক করুন।" : "Login failed. Please check your credentials."));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto mt-2 max-w-2xl space-y-6 pb-12">
      {/* 3D Ambient Glowing Orbs */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/15 blur-[90px]" />
      <div className="pointer-events-none absolute bottom-10 -right-10 -z-10 h-64 w-64 rounded-full bg-info/10 blur-[80px]" />

      {/* Header Banner */}
      <div className="text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-s1/80 px-4 py-1.5 shadow-[0_0_20px_var(--accent-glow)] backdrop-blur">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-semibold tracking-wide uppercase text-ptext">
            {isBn ? "নিরাপদ ডিজিটাল হেলথ অথেনটিকেশন" : "Secure Healthcare Authentication"}
          </span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {isBn ? "মেডিকেল পোর্টালে সাইন-ইন করুন" : "Sign In to MediBridge AI"}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {isBn
            ? "আপনার নির্দিষ্ট রোল নির্বাচন করুন অথবা ডেমো ক্রেডেনশিয়াল দিয়ে সরাসরি প্রবেশ করুন।"
            : "Select your role below or enter your verified email to access your clinical portal."}
        </p>
      </div>

      {/* 3D Interactive Role Selector Bar */}
      <div className="rounded-2xl border border-border/80 bg-s1/90 p-2 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(ROLES_CONFIG) as PortalRole[]).map((role) => {
            const cfg = ROLES_CONFIG[role];
            const Icon = cfg.icon;
            const isSelected = activeRole === role;

            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={`flex flex-col items-center justify-center rounded-xl p-3 text-center transition-all duration-300 ${
                  isSelected
                    ? `border ${cfg.border} bg-s2/90 ${cfg.glow} scale-[1.02]`
                    : "border border-transparent bg-s1/40 hover:bg-s2/50 text-muted"
                }`}
              >
                <span className={`rounded-lg p-2.5 ${cfg.color} shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={`mt-2 text-xs font-bold ${isSelected ? "text-ink" : "text-muted"}`}>
                  {isBn ? cfg.nameBn : cfg.nameEn}
                </span>
                <span className="text-[10px] text-muted font-mono">{role}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Main Login Card with Glassmorphism */}
      <div className="relative rounded-3xl border border-primary/30 bg-gradient-to-b from-s1/95 via-s1/85 to-s2/90 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_25px_var(--accent-glow)] backdrop-blur-2xl">
        {/* Selected Role Mini-Hero Header */}
        <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <span className={`rounded-xl p-2.5 ${activeConfig.color} shadow-sm`}>
              <ActiveIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">
                {isBn ? activeConfig.nameBn : activeConfig.nameEn}
              </h2>
              <p className="text-xs text-muted max-w-sm">
                {isBn ? activeConfig.descBn : activeConfig.descEn}
              </p>
            </div>
          </div>

          {/* 1-Click Fast Pass Badge */}
          <button
            type="button"
            onClick={() => submit(undefined, activeConfig.demoEmail, "Demo@12345")}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-psoft px-3 py-1.5 text-xs font-bold text-ptext transition hover:brightness-110 active:scale-95 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isBn ? "১-ক্লিক ডেমো লগইন" : "1-Click Login"}</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink">
              {isBn ? "ইমেইল ঠিকানা" : "Email Address"}
            </label>
            <div className="relative">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@demo.medibridge.dev"
                className="pl-9"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink">
                {isBn ? "পাসওয়ার্ড" : "Password"}
              </label>
              <span className="font-mono text-[11px] text-muted">
                Demo: <strong className="text-ink">Demo@12345</strong>
              </span>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-9 pr-10"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {err && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            busy={busy}
            className="w-full h-11 text-sm font-bold shadow-[0_0_20px_var(--accent-glow)] active:scale-[0.99] transition"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            {isBn ? "পোর্টালে প্রবেশ করুন" : "Sign In to Dashboard"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        {/* Prominent 3D Patient Registration Banner */}
        <div className="mt-6 rounded-2xl border border-primary/40 bg-gradient-to-r from-psoft/40 via-s1/60 to-psoft/20 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-extrabold text-ptext">
                <HeartPulse className="h-4 w-4" />
                <span>{isBn ? "নতুন রোগী? ডিজিটাল অ্যাকাউন্ট নেই?" : "New Patient? Create Health Record"}</span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                {isBn
                  ? "মাত্র ২ মিনিটে সম্পূর্ণ ফ্রি ডিজিটাল প্রেসক্রিপশন ও রিপোর্ট ট্র্যাকিং অ্যাকাউন্ট খুলুন।"
                  : "Register in 2 minutes for zero-hallucination report analysis & e-prescriptions."}
              </p>
            </div>

            <Link href="/register">
              <Button size="sm" variant="outline" className="shrink-0 border-primary/50 text-ptext hover:bg-primary/20">
                {isBn ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "Register Patient"}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer Role Links */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted">
          <Link href="/apply" className="flex items-center gap-1 text-info hover:underline">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>{isBn ? "ডাক্তার বা ক্লিনিক হিসেবে আবেদন করুন" : "Apply as Doctor / Hospital"}</span>
          </Link>

          <Link href="/navigator" className="flex items-center gap-1 text-warn hover:underline">
            <PhoneCall className="h-3.5 w-3.5" />
            <span>{isBn ? "জরুরি সহায়তা (৯৯৯) / কেয়ার নেভিগেটর" : "Emergency (999) / Care Navigator"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
