"use client";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { Async, Card, ChartSkeleton, Chip, EmptyState, GlassCard, PageHeader, Select } from "@/components/ui";
import { LineChart as LineChartIcon } from "lucide-react";

const TESTS = ["HGB", "WBC", "PLT", "GLU", "RBC", "HCT", "MCV"];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-card border border-line bg-s1 p-3 shadow-lg text-sm min-w-[140px]">
      <p className="num font-medium text-muted mb-1">{label}</p>
      <p className="num text-xl font-bold text-ptext">{p.value} <span className="text-sm font-normal text-muted">{p.payload?.unit}</span></p>
      {p.payload?.doctor_verified ? <Chip kind="doctor" /> : <Chip kind="unverified" />}
      {p.payload?.low_confidence && <Chip kind="low" />}
    </div>
  );
}

export default function Timeline() {
  useGuard(["patient"]);
  const { t, locale } = useI18n();
  const [code, setCode] = useState("HGB");
  const { data, loading, error, reload } = useApi(`/observations/trends?test_code=${code}`);
  const last = data?.points?.at(-1);

  const trend = data?.change;
  const trendUp = trend?.direction === "up";
  const TrendIcon = trend ? (trendUp ? TrendingUp : TrendingDown) : Activity;
  const trendColor = trendUp ? "text-ptext" : "text-warn";

  return (
    <div className="space-y-6">
      <PageHeader title={t("tl.title")} subtitle={t("rep.unverifiedNote")} />

      <Select label={t("tl.test")} value={code} onChange={(e) => setCode(e.target.value)}>
        {TESTS.map((c) => <option key={c}>{c}</option>)}
      </Select>

      {/* Change summary card */}
      {!loading && data?.change && (
        <GlassCard className="flex items-center gap-3">
          <span className={`rounded-lg p-2 bg-psoft ${trendColor}`}>
            <TrendIcon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className={`font-semibold ${trendColor}`}>{locale === "bn" ? trend.text_bn : trend.text_en}</p>
            <p className="text-xs text-muted mt-0.5">Latest: <span className="num font-medium text-ink">{last?.value} {last?.unit}</span> on {last?.date}</p>
          </div>
        </GlassCard>
      )}

      <Async
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.points?.length === 0}
        emptyNode={<EmptyState icon={LineChartIcon} title={t("tl.noData")} body="Upload a report with this test code to start tracking." />}
        skeleton="chart"
        h={300}>
        {data && (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{data.test_name || code}</h2>
              <span className="text-xs text-muted num">{data.points?.length} data points</span>
            </div>
            <div role="img" aria-label={`${data.test_name} trend chart`} style={{ height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={data.points} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} unit={` ${data.canonical_unit}`} width={80} />
                  {last?.ref_low != null && (
                    <ReferenceArea y1={last.ref_low} y2={last.ref_high}
                      fill="var(--warn)" fillOpacity={0.08}
                      label={{ value: "Ref range", fontSize: 10, fill: "var(--warn)", position: "right" }} />
                  )}
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const isLow = props.payload?.low_confidence;
                      const isVerified = props.payload?.doctor_verified;
                      return (
                        <circle
                          key={props.key}
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill={isVerified ? "var(--accent)" : isLow ? "var(--warn)" : "var(--surface-1)"}
                          stroke={isVerified ? "var(--accent)" : isLow ? "var(--warn)" : "var(--accent)"}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: "var(--accent)", stroke: "var(--surface-1)", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-primary" />Doctor verified</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full border-2 border-primary bg-s1" />Unverified</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-warn" />Low confidence</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-5 opacity-30 bg-warn" />Reference range</span>
            </div>

            {/* Value list */}
            <div className="border-t border-line pt-3">
              <ul className="space-y-2 text-sm">
                {data.points.map((p: any) => (
                  <li key={p.observation_id} className="flex flex-wrap items-center gap-2 py-1">
                    <span className="num text-muted w-24 flex-shrink-0">{p.date}</span>
                    <span className="num font-semibold text-ink">{p.value}</span>
                    <span className="text-muted">{p.unit}</span>
                    {p.original_unit !== p.unit && <span className="text-xs text-muted">(orig {p.original_value} {p.original_unit})</span>}
                    {p.doctor_verified ? <Chip kind="doctor" /> : <Chip kind="unverified" />}
                    {p.low_confidence && <Chip kind="low" />}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        )}
      </Async>

      {data?.warnings?.map((w: any) => (
        <Card key={w.observation_id}><p className="text-sm text-warn">⚠ {w.message}</p></Card>
      ))}
    </div>
  );
}
