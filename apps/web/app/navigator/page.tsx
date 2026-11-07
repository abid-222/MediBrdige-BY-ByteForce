"use client";
import Link from "next/link";
import { useState } from "react";
import { api, getToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { AlertTriangle, ArrowRight, Compass, MapPin, ShieldAlert } from "lucide-react";
import { Button, Card, Chip, EmergencyBanner, EmptyState, GlassCard, PageHeader, StepIndicator, useToast, verChip } from "@/components/ui";

const RF: [string, string][] = [
  ["chest pain with shortness of breath", "nav2.rf.chest"],
  ["severe bleeding", "nav2.rf.bleed"],
  ["unconscious", "nav2.rf.uncon"],
  ["face drooping slurred speech sudden weakness", "nav2.rf.stroke"],
  ["seizure", "nav2.rf.seizure"],
];

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? "var(--accent)" : pct >= 40 ? "var(--warn)" : "var(--text-muted)";
  return (
    <div className="flex items-center gap-2">
      <div className="score-bar-track flex-1">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="num text-xs text-muted w-8 text-right">{score}</span>
    </div>
  );
}

function MatchCard({ c, sel, onToggle }: { c: any; sel: boolean; onToggle: () => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const id = `${c.doctor_id}:${c.facility_id}`;

  const affordClass = {
    affordable: "text-ptext",
    "needs-review": "text-warn",
    not_confirmed: "text-muted",
  }[c.cost_state as string] ?? "text-muted";

  return (
    <Card className={`space-y-3 transition-all ${sel ? "border-primary/60 shadow-[0_0_0_1px_var(--accent)]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{c.doctor_name}</h2>
          <p className="text-sm text-muted mt-0.5">{c.specialty} · {c.facility_name}</p>
        </div>
        {verChip(c.verification)}
      </div>

      {c.score != null && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Match score</span><span className="num text-ptext">{c.score}/100</span>
          </div>
          <ScoreBar score={c.score} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`num text-sm font-medium ${affordClass}`}>{c.fee_label}</span>
        {c.cost_state === "not_confirmed" && <Chip kind="unverified" />}
        {c.gate === "needs_review" && <Chip kind="pending">{t("nav2.review")}</Chip>}
        {c.stale && <Chip kind="stale" />}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <MapPin className="h-3 w-3" />{t("dir.confidence")}: <span className="num">{c.data_confidence}</span>
      </div>

      {/* Reasons (expandable) */}
      {c.reasons?.length > 0 && (
        <div>
          <button onClick={() => setExpanded((x) => !x)}
            className="flex items-center gap-1 text-sm text-ptext hover:underline">
            {t("nav2.why")} {expanded ? "▲" : "▼"}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1 text-sm slide-up">
              {c.reasons.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-muted">
                  <span className="mt-0.5 text-ptext">•</span>{r}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <Link href={`/directory/doctors/${c.doctor_id}`} className="btn-link text-sm text-ptext font-medium">
          {t("dir.book")} →
        </Link>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted hover:text-ink">
          <input type="checkbox" className="h-4 w-4 rounded" checked={sel} onChange={onToggle} />
          {t("nav2.compare")}
        </label>
      </div>
    </Card>
  );
}

function CompareTable({ cards, sel }: { cards: any[]; sel: string[] }) {
  const selected = cards.filter((c: any) => sel.includes(`${c.doctor_id}:${c.facility_id}`));
  const rows: { key: string; label: string }[] = [
    { key: "doctor_name", label: "Doctor" },
    { key: "specialty", label: "Specialty" },
    { key: "facility_name", label: "Facility" },
    { key: "fee_label", label: "Fee" },
    { key: "verification", label: "Verification" },
    { key: "data_confidence", label: "Data confidence" },
  ];
  return (
    <Card className="overflow-x-auto">
      <h3 className="mb-3 font-semibold">Comparison</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Field</th>
            {selected.map((c: any, i: number) => <th key={i}>{c.doctor_name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label }) => (
            <tr key={key}>
              <td className="font-medium text-muted">{label}</td>
              {selected.map((c: any, i: number) => (
                <td key={i}>{key === "verification" ? verChip(c[key]) : String(c[key] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function Navigator() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [text, setText] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const [budgetFirst, setBF] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string[]>([]);

  const run = async () => {
    setBusy(true); setErr(""); setRes(null); setSel([]);
    try {
      const body = { text, lang: locale, extra_red_flags: flags, budget_first: budgetFirst, district: "Dhaka" };
      const r = getToken()
        ? await api("/navigator/matches", { body })
        : { ...(await api("/navigator/triage", { body })), eligible: [], needs_review: [], loginNeeded: true };
      setRes(r);
      setStep(2);
      if (r.emergency) {
        addToast("error", "Emergency detected", "Call 999 immediately");
      } else {
        const total = (r.eligible?.length ?? 0) + (r.needs_review?.length ?? 0);
        addToast("success", "Search complete", `Found ${total} match${total !== 1 ? "es" : ""}`);
      }
    } catch (e: any) {
      setErr(e.message);
      addToast("error", "Search failed", e.message);
    } finally { setBusy(false); }
  };

  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-3));
  const cards = [...(res?.eligible || []), ...(res?.needs_review || [])];

  const steps = ["Your concern", "Options", "Results"];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav2.title")} subtitle={t("nav2.disclaimer")} />

      {/* Step indicator */}
      <StepIndicator steps={steps} current={step} />

      {/* Emergency full-screen takeover */}
      {res?.emergency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg scale-in">
            <EmergencyBanner text={res.guidance} />
            <button onClick={() => { setRes(null); setStep(0); }} className="mt-4 w-full rounded-input border border-line bg-s1 py-2 text-sm text-muted hover:text-ink">
              Go back
            </button>
          </div>
        </div>
      )}

      {/* Step 0: Concern */}
      {step === 0 && (
        <Card className="space-y-4 slide-up">
          <div>
            <label className="mb-1 block text-sm text-muted">{t("nav2.concern")}</label>
            <textarea
              className="w-full rounded-input border border-line bg-s2 p-3 text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
              rows={4}
              placeholder="e.g. I have had a persistent cough for 2 weeks with mild fever…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-muted">{t("nav2.redflags")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {RF.map(([v, k]) => (
                <label key={v}
                  className={`flex cursor-pointer items-center gap-3 rounded-input border p-3 text-sm transition-all ${flags.includes(v) ? "border-danger/50 bg-danger/10 text-danger" : "border-line bg-s2 hover:border-warn/40"}`}>
                  <input type="checkbox" className="h-4 w-4 flex-shrink-0" checked={flags.includes(v)} onChange={(e) => setFlags(e.target.checked ? [...flags, v] : flags.filter((x) => x !== v))} />
                  <span>{t(k)}</span>
                  {flags.includes(v) && <ShieldAlert className="ml-auto h-4 w-4 flex-shrink-0" />}
                </label>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-ink">
            <input type="checkbox" className="h-4 w-4" checked={budgetFirst} onChange={(e) => setBF(e.target.checked)} />
            {t("nav2.budgetFirst")}
          </label>

          {flags.length > 0 && (
            <GlassCard className="border-warn/30 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warn mt-0.5 flex-shrink-0" />
              <p className="text-sm text-warn">Emergency symptoms flagged. The search will prioritise safety first. If this is life-threatening, call 999 immediately.</p>
            </GlassCard>
          )}

          <div className="flex justify-end">
            <Button disabled={text.length < 2} busy={busy} onClick={run}>
              {t("nav2.search")} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {err && <p role="alert" className="flex items-center gap-2 text-sm text-danger"><AlertTriangle className="h-4 w-4" />{err}</p>}
        </Card>
      )}

      {/* Step 2: Results */}
      {step === 2 && res && !res.emergency && (
        <div className="space-y-4 slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Results</h2>
              <p className="text-sm text-muted">
                {cards.length} match{cards.length !== 1 ? "es" : ""}
                {res.excluded_count > 0 && ` · ${res.excluded_count} excluded as clinically unsuitable`}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setRes(null); setStep(0); }}>
              New search
            </Button>
          </div>

          {res.loginNeeded && (
            <Card className="border-info/30">
              <p className="text-sm">Log in to see personalised, budget-aware matches.</p>
              <Link href="/login"><Button variant="secondary" size="sm" className="mt-2">{t("auth.login")} →</Button></Link>
            </Card>
          )}

          {res.unsupported && <Card><p className="text-warn">{res.message}</p></Card>}

          {!res.unsupported && cards.length === 0 && !res.loginNeeded && (
            <EmptyState icon={Compass} title={t("common.noResults")} body="Try a different concern or fewer filters." />
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {cards.map((c: any) => {
              const id = `${c.doctor_id}:${c.facility_id}`;
              return <MatchCard key={id} c={c} sel={sel.includes(id)} onToggle={() => toggle(id)} />;
            })}
          </div>

          {sel.length >= 2 && <CompareTable cards={cards} sel={sel} />}

          <p className="text-xs text-muted">{t("nav2.disclaimer")} {t("common.sample")}</p>
        </div>
      )}

      {/* Loading state between step 0 and step 2 */}
      {busy && (
        <Card className="text-center py-8 space-y-3">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted text-sm">Searching for the best matches…</p>
        </Card>
      )}
    </div>
  );
}
