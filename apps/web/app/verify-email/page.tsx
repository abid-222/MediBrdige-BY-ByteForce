"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input } from "@/components/ui";

function Inner() {
  const { t } = useI18n(); const router = useRouter();
  const email = useSearchParams().get("email") || "";
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [dev, setDev] = useState("");
  const [wait, setWait] = useState(30);
  useEffect(() => { setDev(sessionStorage.getItem("dev_otp") || ""); }, []);
  useEffect(() => { if (wait <= 0) return; const id = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(id); }, [wait]);
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try { await api("/auth/verify-email", { body: { email, code } }); router.push("/login"); }
    catch (e: any) { setErr(e.message); }
  };
  const resend = async () => { const r = await api("/auth/resend-otp", { body: { email } }).catch((e) => ({ message: e.message, dev_otp: "" })); setDev(r.dev_otp || ""); setWait(30); };
  return (
    <Card className="mx-auto mt-6 max-w-md space-y-4 md:mt-12">
      <h1 className="text-2xl">{t("auth.verifyTitle")}</h1>
      <p className="text-sm text-muted">{email}</p>
      {dev && <p className="num text-sm text-info">{t("auth.devOtp")} {dev}</p>}
      <form onSubmit={verify} className="space-y-3">
        <Input label={t("auth.otp")} inputMode="numeric" maxLength={6} className="num" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
        {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
        <Button className="w-full">{t("common.submit")}</Button>
      </form>
      <Button variant="ghost" disabled={wait > 0} onClick={resend}>{wait > 0 ? `${t("auth.resendIn")} ${wait}s` : t("auth.resend")}</Button>
    </Card>
  );
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
