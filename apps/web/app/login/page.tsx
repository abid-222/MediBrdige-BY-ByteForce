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
import { Button, Input } from "@/components/ui";

type PortalRole = "patient" | "doctor" | "hospital" | "admin";

const ROLES_CONFIG: Record<
  PortalRole,
  {
    nameEn: string;
    nameBn: string;
    badgeEn: string;
    badgeBn: string;
    descEn: string;
    descBn: string;
    demoEmail: string;
    color: string;
    borderColor: string;
    icon: typeof HeartPulse;
  }
> = {
  patient: {
    nameEn: "Patient Portal",
    nameBn: "রোগী পোর্টাল",
    badgeEn: "Health Records & Reports",
    badgeBn: "স্বাস্থ্য তথ্য ও ল্যাব রিপোর্ট",
    descEn: "Access medical records, OCR lab reports, longitudinal health trends, and video consultations.",
    descBn: "ব্যক্তিগত স্বাস্থ্য তথ্য, প্রেসক্রিপশন, ল্যাব টেস্ট ফলাফল এবং অনলাইন ডাক্তার পরামর্শ।",
    demoEmail: "patient1@demo.medibridge.dev",
    color: "text-primary bg-primary/10",
    borderColor: "border-primary/50",
    icon: HeartPulse,
  },
  doctor: {
    nameEn: "Doctor Workspace",
    nameBn: "ডাক্তার ওয়ার্কস্পেস",
    badgeEn: "BMDC Verified Clinician",
    badgeBn: "বিএমডিসি ভেরিফায়েড চিকিৎসক",
    descEn: "Review patient history, verify lab observations, manage teleconsultations, and sign notes.",
    descBn: "রোগীর হিস্ট্রি পর্যবেক্ষণ, ল্যাব ভ্যালু অনুমোদন এবং ডিজিটাল প্রেসক্রিপশন স্বাক্ষর।",
    demoEmail: "doctor1@demo.medibridge.dev",
    color: "text-info bg-info/10",
    borderColor: "border-info/50",
    icon: Stethoscope,
  },
  hospital: {
    nameEn: "Hospital Command",
    nameBn: "হাসপাতাল কমান্ড",
    badgeEn: "Facility Operations",
    badgeBn: "হাসপাতাল পরিচালনা",
    descEn: "Manage facility departments, bed availability, visiting doctor rosters, and shift queues.",
    descBn: "হাসপাতালের সিট ক্যাপাসিটি, কনসালট্যান্ট রোস্টার এবং রোগী চেক-ইন পরিচালনা।",
    demoEmail: "hospital@demo.medibridge.dev",
    color: "text-warn bg-warn/10",
    borderColor: "border-warn/50",
    icon: Building2,
  },
  admin: {
    nameEn: "Super Admin",
    nameBn: "সিস্টেম অ্যাডমিন",
    badgeEn: "Governance & Audit",
    badgeBn: "সিকিউরিটি ও গভর্ন্যান্স",
    descEn: "Verify doctor licenses, inspect tamper-proof audit trails, and oversee system safety.",
    descBn: "ডাক্তার লাইসেন্স ভেরিফিকেশন, অপরিবর্তনীয় অডিট লগ এবং সিস্টেম সিকিউরিটি পর্যবেক্ষণ।",
    demoEmail: "admin@demo.medibridge.dev",
    color: "text-danger bg-danger/10",
    borderColor: "border-danger/50",
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
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  // Check URL params for prefilled email from registration
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "true" && !registeredSuccess) {
      setRegisteredSuccess(true);
      const emailParam = params.get("email");
      if (emailParam && email !== emailParam) {
        setEmail(emailParam);
        setPassword("");
      }
    }
  }

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
        setErr(
          e.message ||
            (isBn
              ? "লগইন ব্যর্থ হয়েছে। ইমেইল বা পাসওয়ার্ড সঠিক কিনা পুনরায় পরীক্ষা করুন।"
              : "Login failed. Please check your credentials or select a verified role above.")
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto mt-4 max-w-xl space-y-6 pb-16 px-4">
      {/* Background radial aura */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-[90px]" />

      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-onprimary shadow-[0_0_18px_var(--accent-glow)] transition-transform group-hover:scale-105">
            <HeartPulse className="h-6 w-6" />
          </div>
          <span className="font-heading font-extrabold text-2xl tracking-tight text-ink">
            {isBn ? "নিরাময়" : "Niramoy"}{" "}
            <span className="text-ptext font-mono font-black">AI</span>
          </span>
        </Link>

        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-ink pt-2">
          {isBn ? "ক্লিনিক্যাল পোর্টালে সাইন-ইন" : "Clinical Portal Sign In"}
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
          {isBn
            ? "আপনার নির্দিষ্ট রোল নির্বাচন করুন অথবা ডেমো ক্রেডেনশিয়াল দিয়ে সরাসরি প্রবেশ করুন।"
            : "Select your role below or enter your registered credentials to access your secure portal."}
        </p>
      </div>

      {/* Role Selection Tabs - Formal & Clean */}
      <div className="rounded-2xl border border-line bg-s1/90 p-1.5 shadow-md backdrop-blur-md">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(Object.keys(ROLES_CONFIG) as PortalRole[]).map((role) => {
            const cfg = ROLES_CONFIG[role];
            const Icon = cfg.icon;
            const isSelected = activeRole === role;

            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={`flex flex-col items-center justify-center rounded-xl p-2.5 sm:p-3 text-center transition-all ${
                  isSelected
                    ? `border ${cfg.borderColor} bg-s2 text-ink shadow-sm ring-1 ring-primary/30`
                    : "border border-transparent text-muted hover:bg-s2/50 hover:text-ink"
                }`}
              >
                <span className={`rounded-lg p-2 ${cfg.color} mb-1.5`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className={`text-xs font-bold leading-snug ${isSelected ? "text-ink" : "text-muted"}`}>
                  {isBn ? cfg.nameBn : cfg.nameEn}
                </span>
                <span className="text-[10px] text-muted/70 font-mono mt-0.5 uppercase tracking-wider">
                  {role}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Login Card - Formal & High Trust */}
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-s1 via-s1 to-s2/40 p-6 sm:p-8 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.6),0_0_20px_var(--accent-glow)] backdrop-blur-xl space-y-6">
        {/* Selected Role Header Info */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeConfig.color}`}>
              <ActiveIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-ink">
                  {isBn ? activeConfig.nameBn : activeConfig.nameEn}
                </h2>
                <span className="rounded-full bg-s2 px-2 py-0.5 text-[10px] font-mono font-bold text-ptext border border-line">
                  {isBn ? activeConfig.badgeBn : activeConfig.badgeEn}
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5 leading-tight">
                {isBn ? activeConfig.descBn : activeConfig.descEn}
              </p>
            </div>
          </div>
        </div>

        {/* 1-Click Fast Demo Login Banner */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-psoft/30 p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-ink">
                {isBn ? "তাৎক্ষণিক টেস্ট লগইন:" : "Instant Demo Login:"}
              </span>{" "}
              <span className="text-muted font-mono text-[11px]">{activeConfig.demoEmail}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => submit(undefined, activeConfig.demoEmail, "Demo@12345")}
            disabled={busy}
            className="shrink-0 rounded-xl bg-primary text-onprimary px-3 py-1.5 text-xs font-bold transition hover:brightness-110 active:scale-95 shadow-sm"
          >
            {isBn ? "১-ক্লিক লগইন" : "1-Click Login"}
          </button>
        </div>

        {/* Registration Success Banner */}
        {registeredSuccess && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3.5 text-xs text-ptext flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <span>
              {isBn
                ? "রেজিস্ট্রেশন সফল হয়েছে! আপনার অ্যাকাউন্টে সাইন-ইন করুন।"
                : "Registration successful! Please sign in with your credentials."}
            </span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink flex items-center justify-between">
              <span>{isBn ? "ইমেইল ঠিকানা" : "Email Address"}</span>
              <span className="text-[10px] text-muted font-mono">Official / Registered</span>
            </label>
            <div className="relative">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="pl-9 text-xs sm:text-sm"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-ink">
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
                className="pl-9 pr-10 text-xs sm:text-sm"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted hover:text-ink transition"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {err && (
            <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-danger/40 bg-danger/10 p-3.5 text-xs text-danger shadow-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{err}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            busy={busy}
            className="w-full h-11 text-xs sm:text-sm font-bold shadow-[0_0_20px_var(--accent-glow)] active:scale-[0.99] transition mt-2"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            <span>{isBn ? "পোর্টালে প্রবেশ করুন" : "Sign In to Portal"}</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        {/* Patient Register Prompt */}
        <div className="rounded-2xl border border-line bg-s2/40 p-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-ink">
              {isBn ? "নতুন রোগী? ডিজিটাল অ্যাকাউন্ট নেই?" : "New to Niramoy AI?"}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {isBn
                ? "মাত্র ২ মিনিটে সম্পূর্ণ ফ্রি স্বাস্থ্য অ্যাকাউন্ট তৈরি করুন।"
                : "Create your patient account to store records & get AI reports."}
            </p>
          </div>
          <Link href="/register">
            <Button size="xs" variant="outline" className="font-semibold shrink-0">
              {isBn ? "রেজিস্টার করুন" : "Register Free"}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Security & Emergency Footer Notes */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4 text-[11px] text-muted">
          <Link href="/apply" className="flex items-center gap-1.5 text-info hover:underline">
            <Stethoscope className="h-3.5 w-3.5" />
            <span>{isBn ? "ডাক্তার বা ক্লিনিক হিসেবে আবেদন" : "Apply as Clinician"}</span>
          </Link>

          <Link href="/emergency" className="flex items-center gap-1.5 text-danger hover:underline font-bold">
            <PhoneCall className="h-3.5 w-3.5" />
            <span>{isBn ? "জরুরি হটলাইন (৯৯৯)" : "Emergency 999"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
