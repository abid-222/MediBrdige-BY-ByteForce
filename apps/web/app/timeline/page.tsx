"use client";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { LineChart as LineChartIcon } from "lucide-react";
import { Async, Card, Chip, EmptyState, PageHeader, Select } from "@/components/ui";

const TESTS = ["HGB", "WBC", "PLT", "GLU", "RBC", "HCT", "MCV"];

export default function Timeline() {
  useGuard(["patient"]);
  const { t, locale } = useI18n();
  const [code, setCode] = useState("HGB");
  const { data, loading, error, reload } = useApi(`/observations/trends?test_code=${code}`);
  const last = data?.points.at(-1);
  return (
    <>
      <PageHeader title={t("tl.title")} subtitle={t("rep.unverifiedNote")} />
      <Select label={t("tl.test")} value={code} onChange={(e) => setCode(e.target.value)}>{TESTS.map((c) => <option key={c}>{c}</option>)}</Select>
      <Async loading={loading} error={error} onRetry={reload} empty={data?.points.length === 0} emptyNode={<EmptyState icon={LineChartIcon} title={t("tl.noData")} />} h={300}>
        {data && <>
          {data.change && <Card><p className="text-lg">{locale === "bn" ? data.change.text_bn : data.change.text_en}</p></Card>}
          <Card>
            <div role="img" aria-label={`${data.test_name} trend`} style={{ height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={data.points} margin={{ left: 0, right: 12, top: 8 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} unit={` ${data.canonical_unit}`} width={90} />
                  {last?.ref_low != null && <ReferenceArea y1={last.ref_low} y2={last.ref_high} fill="var(--primary)" fillOpacity={0.1} />}
                  <Tooltip contentStyle={{ background: "var(--surface-1)", border: "1px solid var(--border)", color: "var(--text)" }} />
                  <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4, fill: "var(--primary)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1 text-sm">{data.points.map((p: any) => (
              <li key={p.observation_id} className="flex flex-wrap items-center gap-2"><span className="num">{p.date}</span><span className="num">{p.value} {p.unit}</span>
                {p.original_unit !== p.unit && <span className="text-xs text-muted">(orig {p.original_value} {p.original_unit})</span>}
                {p.doctor_verified ? <Chip kind="doctor" /> : <Chip kind="unverified" />}{p.low_confidence && <Chip kind="low" />}</li>))}</ul>
          </Card>
          {data.warnings.map((w: any) => <Card key={w.observation_id}><p className="text-sm text-warn">⚠ {w.message}</p></Card>)}
        </>}
      </Async>
    </>
  );
}
