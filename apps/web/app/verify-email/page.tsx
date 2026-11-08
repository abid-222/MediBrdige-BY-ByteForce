"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Input } from "@/components/ui";

function Inner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isBn = locale === "bn";
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [dev, setDev] = useState("");
  const [wait, setWait] = useState(30);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const cachedDev = sessionStorage.getItem("dev_otp");
    if (cachedDev) {
      setDev(cachedDev);
      setCode(cachedDev);
    }
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);

    try {
      await api("/auth/verify-email", { body: { email, code: code.trim() } });
      setSuccess(
        isBn
          ? "ইমেইল সফলভাবে ভেরিফাই হয়েছে! লগইন পেজে রিডাইরেক্ট করা হচ্ছে..."
          : "Email successfully verified! Redirecting to login portal..."
      );
      setTimeout(() => router.push("/login"), 1000);
    } catch (e: any) {
      setErr(e.message || (isBn ? "ভেরিফিকেশন কোডটি সঠিক নয় বা মেয়াদোত্তীর্ণ।" : "Invalid or expired verification code."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr("");
    try {
      const r = await api("/auth/resend-otp", { body: { email } }).catch((e) => ({
        message: e.message,
        dev_otp: "",
      }));
      if (r.dev_otp) {
        setDev(r.dev_otp);
        setCode(r.dev_otp);
        sessionStorage.setItem("dev_otp", r.dev_otp);
      }
      setWait(45);
    } catch (e: any) {
      setErr(e.message || "Failed to resend code.");
    }
  };

  return (
    <div className="relative mx-auto mt-6 max-w-md pb-16">
      {/* 3D Ambient Glowing Orb */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[80px]" />

      <div className="rounded-3xl border border-primary/30 bg-gradient-to-b from-s1/95 via-s1/85 to-s2/90 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_25px_var(--accent-glow)] backdrop-blur-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/40 bg-psoft shadow-[0_0_15px_var(--accent-glow)]">
            <Mail className="h-6 w-6 text-ptext" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {isBn ? "ইমেইল ভেরিফিকেশন" : "Verify Your Email"}
          </h1>
          <p className="mt-1 text-xs text-muted font-mono break-all">{email}</p>
        </div>

        {/* Dev OTP Fast Pass Pill */}
        {dev && (
          <div
            onClick={() => setCode(dev)}
            className="mb-4 cursor-pointer rounded-xl border border-info/40 bg-info/10 p-3 text-center transition hover:bg-info/20 shadow-sm"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-info">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isBn ? "১-ক্লিক অটো-ফিল টেস্ট ওটিপি:" : "1-Click Dev OTP:"}</span>
              <span className="font-mono text-sm font-extrabold underline">{dev}</span>
            </div>
            <span className="text-[10px] text-muted">{isBn ? "ক্লিক করলেই অটো-ফিল হবে" : "Click to auto-fill code"}</span>
          </div>
        )}

        <form onSubmit={verify} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink">
              {isBn ? "৬-সংখ্যার ওটিপি কোড" : "6-Digit Security Code"}
            </label>
            <div className="relative">
              <Input
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="pl-9 font-mono tracking-widest text-center text-lg font-bold"
              />
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted" />
            </div>
          </div>

          {err && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {success && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-primary/40 bg-psoft p-3 text-xs text-ptext shadow-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={busy || code.length < 6}
            busy={busy}
            className="w-full h-11 text-sm font-bold shadow-[0_0_20px_var(--accent-glow)] active:scale-[0.99] transition"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {isBn ? "ভেরিফাই ও প্রবেশ করুন" : "Verify & Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
          <button
            type="button"
            disabled={wait > 0}
            onClick={resend}
            className="text-ptext hover:underline disabled:text-muted disabled:no-underline"
          >
            {wait > 0
              ? `${isBn ? "পুনরায় কোড পাঠান" : "Resend in"} ${wait}s`
              : (isBn ? "কোড পুনরায় পাঠান" : "Resend Code")}
          </button>

          <Link href="/login" className="text-muted hover:text-ink">
            {isBn ? "লগইন পেজে ফিরুন" : "Back to Login"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
