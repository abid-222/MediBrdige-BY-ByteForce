"use client";
import Link from "next/link";
import { useState } from "react";
import { api, getToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Compass } from "lucide-react";
import { Button, Card, Chip, EmergencyBanner, EmptyState, PageHeader, verChip } from "@/components/ui";

const RF: [string, string][] = [["chest pain with shortness of breath", "nav2.rf.chest"], ["severe bleeding", "nav2.rf.bleed"], ["unconscious", "nav2.rf.uncon"], ["face drooping slurred speech sudden weakness", "nav2.rf.stroke"], ["seizure", "nav2.rf.seizure"]];

export default function Navigator() {
  const { t, locale } = useI18n();
  const [text, setText] = useState(""); const [flags, setFlags] = useState<string[]>([]); const [budgetFirst, setBF] = useState(false);
  const [res, setRes] = useState<any>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [sel, setSel] = useState<string[]>([]);
  const run = async () => {
    setBusy(true); setErr(""); setRes(null);
    try {
      const body = { text, lang: locale, extra_red_flags: flags, budget_first: budgetFirst, district: "Dhaka" };
      setRes(getToken() ? await api("/navigator/matches", { body }) : { ...(await api("/navigator/triage", { body })), eligible: [], needs_review: [], loginNeeded: true });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-3));
  const cards = [...(res?.eligible || []), ...(res?.needs_review || [])];
  return (
    <>
      <PageHeader title={t("nav2.title")} subtitle={t("nav2.disclaimer")} />
      <Card className="space-y-3">
        <label className="block text-sm"><span className="mb-1 block text-muted">{t("nav2.concern")}</span>
          <textarea className="w-full rounded-input border border-line bg-s2 p-3 text-ink" rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <fieldset><legend className="mb-1 text-sm text-muted">{t("nav2.redflags")}</legend>
          {RF.map(([v, k]) => <label key={v} className="mb-1 flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={flags.includes(v)} onChange={(e) => setFlags(e.target.checked ? [...flags, v] : flags.filter((x) => x !== v))} />{t(k)}</label>)}</fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={budgetFirst} onChange={(e) => setBF(e.target.checked)} />{t("nav2.budgetFirst")}</label>
        <Button busy={busy} disabled={text.length < 2} onClick={run}>{t("nav2.search")}</Button>
        {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
      </Card>
      {res?.emergency && <EmergencyBanner text={res.guidance} />}   {/* emergency replaces everything: no cards, no prices */}
      {res && !res.emergency && <>
        {res.loginNeeded && <Card><Link href="/login" className="text-ptext">{t("auth.login")} →</Link></Card>}
        {res.unsupported && <Card><p className="text-warn">{res.message}</p></Card>}
        {!res.unsupported && cards.length === 0 && !res.loginNeeded && <EmptyState icon={Compass} title={t("common.noResults")} />}
        {res.excluded_count > 0 && <p className="text-sm text-muted"><span className="num">{res.excluded_count}</span> {t("nav2.excluded")}</p>}
        <div className="grid gap-3 md:grid-cols-2">{cards.map((c: any) => {
          const id = `${c.doctor_id}:${c.facility_id}`;
          return (<Card key={id} className="space-y-2">
            <div className="flex items-start justify-between gap-2"><h2 className="text-xl">{c.doctor_name}</h2>{verChip(c.verification)}</div>
            <p className="text-sm text-muted">{c.specialty} · {c.facility_name}</p>
            <p className="num">{c.fee_label} {c.cost_state === "not_confirmed" && <Chip kind="unverified" />}</p>
            <div className="flex flex-wrap gap-1">{c.gate === "needs_review" && <Chip kind="pending">{t("nav2.review")}</Chip>}{c.stale && <Chip kind="stale" />}<span className="text-xs text-muted">{t("dir.confidence")}: {c.data_confidence}</span></div>
            <details><summary className="cursor-pointer text-sm text-ptext">{t("nav2.why")}</summary><ul className="mt-1 list-disc pl-5 text-sm">{c.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul></details>
            <div className="flex gap-2"><Link href={`/directory/doctors/${c.doctor_id}`} className="text-sm text-ptext">{t("dir.book")}</Link>
              <label className="ml-auto flex items-center gap-1 text-xs"><input type="checkbox" className="h-5 w-5" checked={sel.includes(id)} onChange={() => toggle(id)} />{t("nav2.compare")}</label></div>
          </Card>);
        })}</div>
        {sel.length >= 2 && <Card className="overflow-x-auto"><table className="w-full text-sm"><tbody>
          {["doctor_name", "facility_name", "fee_label", "verification", "data_confidence"].map((k) => <tr key={k} className="border-t border-line first:border-0">{cards.filter((c: any) => sel.includes(`${c.doctor_id}:${c.facility_id}`)).map((c: any, i: number) => <td key={i} className="p-2">{String(c[k])}</td>)}</tr>)}</tbody></table></Card>}
        <p className="text-xs text-muted">{t("nav2.disclaimer")} {t("common.sample")}</p>
      </>}
    </>
  );
}
