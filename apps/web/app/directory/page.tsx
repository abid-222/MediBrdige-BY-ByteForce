"use client";
import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { useI18n } from "@/lib/i18n";
import { Stethoscope } from "lucide-react";
import { Async, Card, Chip, EmptyState, fmtDate, PageHeader, Select, verChip } from "@/components/ui";

export default function Directory() {
  const { t, locale } = useI18n();
  const [spec, setSpec] = useState(""); const [verified, setVerified] = useState(false);
  const meta = useApi("/directory/meta");
  const q = `/directory/doctors?page_size=50${spec ? `&specialty=${spec}` : ""}${verified ? "&verified_only=true" : ""}`;
  const { data, loading, error, reload } = useApi(q);
  return (
    <>
      <PageHeader title={t("dir.title")} subtitle={t("common.sample")} />
      <div className="flex flex-wrap items-end gap-3">
        <Select label={t("dir.specialty")} value={spec} onChange={(e) => setSpec(e.target.value)}>
          <option value="">{t("dir.all")}</option>
          {meta.data?.specialties.map((s: any) => <option key={s.code} value={s.code}>{locale === "bn" && s.name_bn ? s.name_bn : s.name_en}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={verified} onChange={(e) => setVerified(e.target.checked)} />{t("dir.verifiedOnly")}</label>
      </div>
      <Async loading={loading} error={error} onRetry={reload} empty={data?.items.length === 0} emptyNode={<EmptyState icon={Stethoscope} title={t("common.noResults")} />} h={160}>
        <div className="grid gap-3 md:grid-cols-2">
          {data?.items.map((d: any) => (
            <Link key={d.id} href={`/directory/doctors/${d.id}`}>
              <Card className="h-full transition hover:border-primary">
                <div className="flex items-start justify-between gap-2"><h2 className="flex items-center gap-2 text-lg font-medium"><Stethoscope className="h-4 w-4 text-ptext" aria-hidden />{d.full_name}</h2>{verChip(d.verification)}</div>
                <p className="text-sm text-muted">{d.specialty} · <span className="num">{d.experience_years}y</span></p>
                {d.chambers[0] && <p className="mt-2 text-sm">{d.chambers[0].facility_name} · <span className="num">{d.chambers[0].fee_label}</span></p>}
                <div className="mt-2 flex flex-wrap gap-1">{d.stale && <Chip kind="stale" />}{d.is_sample && <Chip kind="info">Sample</Chip>}<span className="num text-xs text-muted">{t("dir.lastVerified")}: {fmtDate(d.last_verified_at)}</span></div>
              </Card>
            </Link>))}
        </div>
      </Async>
    </>
  );
}
