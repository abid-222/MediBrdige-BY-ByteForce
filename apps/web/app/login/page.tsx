"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, homeFor, setSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input } from "@/components/ui";

export default function Login() {
  const { t } = useI18n(); const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await api("/auth/login", { body: { email, password } });
      setSession(r.access_token, r.role);
      if (r.status === "pending") return router.push("/apply");
      if (r.role === "patient") {
        const p = await api("/patients/me");
        return router.push(p.onboarding_completed ? "/dashboard" : "/onboarding");
      }
      router.push(homeFor(r.role));
    } catch (e: any) {
      if (e.code === "email_not_verified") router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      else setErr(e.message);
    } finally { setBusy(false); }
  };
  return (
    <Card className="mx-auto mt-6 max-w-md space-y-4 md:mt-12">
      <h1 className="text-2xl">{t("auth.login")}</h1>
      <form onSubmit={submit} className="space-y-3">
        <Input label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
        <Button disabled={busy} className="w-full">{t("auth.login")}</Button>
      </form>
      <Link href="/register" className="block text-sm text-ptext">{t("auth.register")}</Link>
    </Card>
  );
}
