"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input } from "@/components/ui";

export default function Register() {
  const { t } = useI18n(); const router = useRouter();
  const [f, setF] = useState({ email: "", password: "", full_name: "" });
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try {
      const r = await api("/auth/register", { body: f });
      setMsg(t("auth.genericSent"));
      sessionStorage.setItem("dev_otp", r.dev_otp || "");
      setTimeout(() => router.push(`/verify-email?email=${encodeURIComponent(f.email)}`), 600);
    } catch (e: any) { setErr(e.message); }
  };
  return (
    <Card className="mx-auto mt-6 max-w-md space-y-4 md:mt-12">
      <h1 className="text-2xl">{t("auth.register")}</h1>
      <form onSubmit={submit} className="space-y-3">
        <Input label={t("auth.fullName")} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        <Input label={t("auth.email")} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <Input label={t("auth.password")} type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
        {msg && <p role="status" className="text-sm text-ptext">{msg}</p>}
        <Button className="w-full">{t("auth.register")}</Button>
      </form>
      <Link href="/apply" className="block text-sm text-muted">{t("auth.apply")}</Link>
    </Card>
  );
}
