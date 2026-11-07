"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, HeartPulse, KeyRound, Loader2, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { api, homeFor, setSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input } from "@/components/ui";

export default function Login() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [quickRole, setQuickRole] = useState<string | null>(null);

  const isBn = locale === "bn";

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
        setErr(e.message || "Login failed");
      }
    } finally {
      setBusy(false);
      setQuickRole(null);
    }
  };

  const handleQuickLogin = (roleEmail: string, roleName: string) => {
    setQuickRole(roleName);
    setEmail(roleEmail);
    setPassword("Demo@12345");
    submit(undefined, roleEmail, "Demo@12345");
  };

  return (
    <div className="mx-auto mt-4 max-w-xl space-y-6">
      {/* 1-Click Demo Login Box */}
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-b from-s1 to-s2/80 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ptext">
            <Sparkles className="h-4 w-4" />
            <span>{isBn ? "এক ক্লিকে ডেমো লগইন" : "1-Click Demo Logins (No typing needed)"}</span>
          </div>
          <span className="font-mono text-xs text-muted">PW: Demo@12345</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          {isBn
            ? "নিচের যেকোনো বাটনে ক্লিক করলেই সরাসরি সেই রোলের ড্যাশবোর্ডে প্রবেশ করবেন:"
            : "Click any role below to instantly log in and access its full dashboard:"}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => handleQuickLogin("patient1@demo.medibridge.dev", "Patient")}
            disabled={busy}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-s1 p-3 text-center transition hover:border-primary hover:bg-s2 hover:shadow-[0_0_12px_var(--accent-glow)] disabled:opacity-50"
          >
            <span className="rounded-md bg-psoft p-2 text-ptext">
              {quickRole === "Patient" ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-ink">{isBn ? "রোগী" : "Patient"}</span>
            <span className="text-[10px] text-muted">patient1</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("doctor1@demo.medibridge.dev", "Doctor")}
            disabled={busy}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-s1 p-3 text-center transition hover:border-info hover:bg-s2 hover:shadow-[0_0_12px_rgba(91,192,255,0.2)] disabled:opacity-50"
          >
            <span className="rounded-md bg-info/10 p-2 text-info">
              {quickRole === "Doctor" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-ink">{isBn ? "ডাক্তার" : "Doctor"}</span>
            <span className="text-[10px] text-muted">doctor1</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("hospital@demo.medibridge.dev", "Hospital")}
            disabled={busy}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-s1 p-3 text-center transition hover:border-warn hover:bg-s2 hover:shadow-[0_0_12px_rgba(255,200,87,0.2)] disabled:opacity-50"
          >
            <span className="rounded-md bg-warn/10 p-2 text-warn">
              {quickRole === "Hospital" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-ink">{isBn ? "হাসপাতাল" : "Hospital"}</span>
            <span className="text-[10px] text-muted">hospital</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin("admin@demo.medibridge.dev", "Admin")}
            disabled={busy}
            className="flex flex-col items-center justify-center rounded-xl border border-border bg-s1 p-3 text-center transition hover:border-danger hover:bg-s2 hover:shadow-[0_0_12px_rgba(255,92,108,0.2)] disabled:opacity-50"
          >
            <span className="rounded-md bg-danger/10 p-2 text-danger">
              {quickRole === "Admin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            </span>
            <span className="mt-1.5 text-xs font-semibold text-ink">{isBn ? "অ্যাডমিন" : "Admin"}</span>
            <span className="text-[10px] text-muted">admin</span>
          </button>
        </div>
      </div>

      {/* Manual Login Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold">{t("auth.login")}</h1>
          <Link href="/register" className="text-xs text-ptext hover:underline">
            {isBn ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "Create new account"}
          </Link>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Input
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="patient1@demo.medibridge.dev"
            required
          />
          <Input
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
          <Button disabled={busy} busy={busy} className="w-full">
            <KeyRound className="mr-2 h-4 w-4" />
            {t("auth.login")}
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-3 text-xs text-muted">
          <span>{isBn ? "ডেমো অ্যাকাউন্ট পাসওয়ার্ড:" : "Demo accounts password:"} <strong className="font-mono text-ink">Demo@12345</strong></span>
          <Link href="/register" className="text-ptext hover:underline">
            {t("auth.register")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
