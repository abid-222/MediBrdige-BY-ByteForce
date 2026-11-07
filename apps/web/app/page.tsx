"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRole, getToken, homeFor } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card } from "@/components/ui";

export default function Home() {
  const { t } = useI18n();
  const router = useRouter();
  useEffect(() => { if (getToken()) router.replace(homeFor(getRole())); }, [router]);
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-3xl text-ptext">{t("app.name")}</h1>
      <p className="max-w-xl text-lg text-muted">{t("tagline")}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/register"><Button>{t("auth.register")}</Button></Link>
        <Link href="/login"><Button variant="secondary">{t("auth.login")}</Button></Link>
        <Link href="/navigator"><Button variant="ghost">{t("nav.navigator")}</Button></Link>
      </div>
      <Card><p className="text-sm text-muted">{t("common.sample")}</p></Card>
    </div>
  );
}
