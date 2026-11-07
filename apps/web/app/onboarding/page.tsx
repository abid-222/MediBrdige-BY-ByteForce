"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input, Select, Why } from "@/components/ui";

const CONSENTS = ["privacy", "data_use", "doctor_share", "research"] as const;
const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const FIELDS = ["full_name", "dob", "sex", "phone", "division", "district", "upazila", "emergency_name", "emergency_phone"];

export default function Onboarding() {
  useGuard(["patient"]);
  const { t } = useI18n(); const router = useRouter();
  const [step, setStep] = useState(1);
  const [p, setP] = useState<any>({ full_name: "", dob: "", sex: "", phone: "", division: "Dhaka", district: "Dhaka", upazila: "", emergency_name: "", emergency_phone: "" });
  const [h, setH] = useState({ conditions: "", allergies: "", medications: "" });
  const [budget, setBudget] = useState("flexible");
  const [cons, setCons] = useState<Record<string, boolean>>({ privacy: false, data_use: false, doctor_share: false, research: false });
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/patients/me").then((d) => {
      setP((x: any) => ({ ...x, ...Object.fromEntries(FIELDS.filter((k) => d[k]).map((k) => [k, d[k]])) }));
      setStep(Math.min(d.onboarding_step || 1, 7));   // resume exactly where the user stopped
    }).catch(() => {});
  }, []);
  const body = (n: number, extra: any = {}) => ({ ...Object.fromEntries(FIELDS.map((k) => [k, p[k] || null])), onboarding_step: n, ...extra });
  const save = (n: number, extra: any = {}) => api("/patients/me", { method: "PUT", body: body(n, extra) });
  const next = async () => {
    setErr("");
    try {
      if (step === 5) await save(6, { conditions: splitList(h.conditions), allergies: splitList(h.allergies), medications: splitList(h.medications) });
      else if (step === 6) { await api("/patients/me/preferences", { method: "PUT", body: { budget } }); await save(7); }
      else await save(step + 1);
      setStep(step + 1);
    } catch (e: any) { setErr(e.message); }
  };
  const finish = async () => {
    try {
      for (const c of CONSENTS) if (cons[c]) await api("/consents", { body: { consent_type: c } }).catch(() => {});
      await save(7, { onboarding_completed: true });
      router.push("/dashboard");
    } catch (e: any) { setErr(e.message); }
  };
  const set = (k: string) => (e: any) => setP({ ...p, [k]: e.target.value });
  return (
    <Card className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl">{t("onb.title")}</h1>
      <div className="h-2 rounded-pill bg-s2"><div className="h-2 rounded-pill bg-primary" style={{ width: `${(step / 7) * 100}%` }} /></div>
      <p className="text-sm text-muted">{t("onb.step")} <span className="num">{step}/7</span> — {t(`onb.s${step}`)}</p>
      {step === 1 && <><Input label={t("auth.fullName")} value={p.full_name || ""} onChange={set("full_name")} /><Input label={t("onb.dob")} type="date" value={p.dob || ""} onChange={set("dob")} />
        <Select label={t("onb.sex")} value={p.sex || ""} onChange={set("sex")}><option value="">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select><Why text={t("onb.whyBasic")} /></>}
      {step === 2 && <Input label={t("onb.phone")} inputMode="tel" value={p.phone || ""} onChange={set("phone")} />}
      {step === 3 && <><Input label={t("onb.division")} value={p.division || ""} onChange={set("division")} /><Input label={t("onb.district")} value={p.district || ""} onChange={set("district")} /><Input label={t("onb.upazila")} value={p.upazila || ""} onChange={set("upazila")} /><Why text={t("onb.whyLocation")} /></>}
      {step === 4 && <><Input label={t("onb.ecName")} value={p.emergency_name || ""} onChange={set("emergency_name")} /><Input label={t("onb.ecPhone")} inputMode="tel" value={p.emergency_phone || ""} onChange={set("emergency_phone")} /></>}
      {step === 5 && <><Input label={t("onb.conditions")} value={h.conditions} onChange={(e) => setH({ ...h, conditions: e.target.value })} /><Input label={t("onb.allergies")} value={h.allergies} onChange={(e) => setH({ ...h, allergies: e.target.value })} /><Input label={t("onb.medicines")} value={h.medications} onChange={(e) => setH({ ...h, medications: e.target.value })} /><Why text={t("onb.whyHealth")} /></>}
      {step === 6 && <><Select label={t("onb.budget")} value={budget} onChange={(e) => setBudget(e.target.value)}>{["low", "medium", "high", "flexible"].map((b) => <option key={b} value={b}>{t(`onb.budget.${b}`)}</option>)}</Select><Why text={t("onb.whyBudget")} /></>}
      {step === 7 && <div className="space-y-2">{CONSENTS.map((c) => (
        <label key={c} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={cons[c]} onChange={(e) => setCons({ ...cons, [c]: e.target.checked })} />{t(`onb.consent.${c}`)}</label>))}</div>}
      {err && <p role="alert" className="text-sm text-danger">⚠ {err}</p>}
      <div className="flex justify-between">
        <Button variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>{t("common.back")}</Button>
        <div className="flex gap-2">
          {(step === 5 || step === 6) && <Button variant="ghost" onClick={() => setStep(step + 1)}>{t("common.skip")}</Button>}
          {step < 7 ? <Button onClick={next}>{t("common.next")}</Button> : <Button disabled={!(cons.privacy && cons.data_use)} onClick={finish}>{t("onb.finish")}</Button>}
        </div>
      </div>
    </Card>
  );
}
