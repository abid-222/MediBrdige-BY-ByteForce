"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileSearch,
  FileText,
  LineChart as LineChartIcon,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import {
  Async,
  Button,
  Card,
  ChartSkeleton,
  Chip,
  EmptyState,
  GlassCard,
  PageHeader,
  Select,
} from "@/components/ui";

const TESTS_CATALOG = [
  { code: "HGB", nameEn: "Hemoglobin", nameBn: "হিমোগ্লোবিন", normal: "12.0 - 17.5 g/dL", icon: "🩸" },
  { code: "GLU", nameEn: "Fasting Glucose", nameBn: "ব্লাড গ্লুকোজ", normal: "70 - 100 mg/dL", icon: "🧪" },
  { code: "PLT", nameEn: "Platelet Count", nameBn: "প্লেটলেট কাউন্ট", normal: "150k - 450k /mcL", icon: "🛡️" },
  { code: "WBC", nameEn: "White Blood Cells", nameBn: "শ্বেতকণিকা (WBC)", normal: "4.0 - 11.0 10^3/mcL", icon: "🔬" },
  { code: "RBC", nameEn: "Red Blood Cells", nameBn: "লোহিতকণিকা (RBC)", normal: "4.2 - 5.9 10^6/mcL", icon: "🔴" },
  { code: "HCT", nameEn: "Hematocrit", nameBn: "হেমাটোক্রিট", normal: "36.0 - 50.0 %", icon: "📊" },
  { code: "MCV", nameEn: "Mean Corpuscular Vol", nameBn: "এমসিভি (MCV)", normal: "80.0 - 100.0 fL", icon: "🧬" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const item = p.payload;
  const isOutOfRange =
    item.ref_low != null &&
    item.ref_high != null &&
    (item.value < item.ref_low || item.value > item.ref_high);

  return (
    <div className="rounded-2xl border border-primary/40 bg-s1/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-[170px] space-y-1.5 font-sans">
      <div className="flex items-center justify-between border-b border-line pb-1.5 text-muted">
        <span className="flex items-center gap-1 font-mono text-[11px]">
          <Calendar className="h-3 w-3 text-primary" />
          {label}
        </span>
        {isOutOfRange && (
          <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-bold text-warn font-mono">
            Alert Range
          </span>
        )}
      </div>

      <div>
        <p className="text-[10px] text-muted uppercase font-mono tracking-wider">Observed Value</p>
        <p className="num text-xl font-bold text-ptext font-mono">
          {p.value}{" "}
          <span className="text-xs font-normal text-muted">{item?.unit}</span>
        </p>
      </div>

      {item?.ref_low != null && (
        <p className="text-[10px] text-muted font-mono">
          Reference: {item.ref_low} – {item.ref_high} {item.unit}
        </p>
      )}

      <div className="flex items-center gap-1.5 pt-1 border-t border-line/60">
        {item?.doctor_verified ? <Chip kind="doctor" /> : <Chip kind="unverified" />}
        {item?.low_confidence && <Chip kind="low" />}
      </div>
    </div>
  );
}

export default function Timeline() {
  useGuard(["patient"]);
  const { t, locale } = useI18n();
  const isBn = locale === "bn";
  const [code, setCode] = useState("HGB");

  const { data, loading, error, reload } = useApi(`/observations/trends?test_code=${code}`);
  const last = data?.points?.at(-1);
  const prev = data?.points?.length >= 2 ? data?.points?.at(-2) : null;

  const currentTestMeta = TESTS_CATALOG.find((t) => t.code === code) || {
    code,
    nameEn: code,
    nameBn: code,
    normal: "Standard Range",
    icon: "📈",
  };

  const trend = data?.change;
  const isUp = prev && last && last.value > prev.value;
  const isSame = prev && last && last.value === prev.value;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-ptext mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{isBn ? "লংগিচিউডিনাল হেলথ ট্র্যাকার" : "Longitudinal Biomarker Tracker"}</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            {isBn ? "ল্যাব টেস্ট ট্রেন্ড ও স্বাস্থ্য ইতিহাস" : "Laboratory Trends & Health Trajectory"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted max-w-2xl">
            {isBn
              ? "আপনার একাধিক প্রেসক্রিপশন ও ব্লাড রিপোর্টের ঐতিহাসিক পরিবর্তন ট্র্যাক করুন। ডাক্তার অনুমোদিত মানগুলো সরাসরি রেফারেন্স সীমার সাথে তুলনা করা হয়।"
              : "Track biomarker progression across multiple lab visits. Observe health trajectories against verified clinical reference boundaries."}
          </p>
        </div>

        <Link href="/reports/scan">
          <Button variant="primary" className="font-bold shadow-[0_0_15px_var(--accent-glow)] shrink-0">
            <UploadCloud className="h-4 w-4 mr-1.5" />
            <span>{isBn ? "নতুন রিপোর্ট স্ক্যান করুন" : "Scan New Report"}</span>
          </Button>
        </Link>
      </div>

      {/* Biomarker Selector Pills Bar */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted uppercase tracking-wider block">
          {isBn ? "বায়োমার্কার বাছাই করুন:" : "Select Clinical Biomarker:"}
        </label>
        <div className="flex flex-wrap gap-2">
          {TESTS_CATALOG.map((test) => {
            const isSelected = code === test.code;
            return (
              <button
                key={test.code}
                type="button"
                onClick={() => setCode(test.code)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all shadow-xs ${
                  isSelected
                    ? "border border-primary bg-primary text-onprimary shadow-[0_0_15px_var(--accent-glow)] scale-[1.02]"
                    : "border border-line bg-s1 text-muted hover:text-ink hover:bg-s2"
                }`}
              >
                <span>{test.icon}</span>
                <span>{isBn ? test.nameBn : test.nameEn}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? "bg-black/20 text-white" : "bg-s2 text-muted"}`}>
                  {test.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trajectory Insight Banner */}
      {!loading && data && last && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Latest Metric Card */}
          <Card className="p-4 rounded-2xl border-primary/30 bg-gradient-to-br from-s1 to-psoft/15 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[11px] font-bold text-muted uppercase font-mono">
                {isBn ? "সর্বশেষ মান (Latest Reading)" : "Latest Observation"}
              </p>
              <p className="num text-2xl font-black text-ptext font-mono mt-1">
                {last.value} <span className="text-xs font-normal text-muted">{last.unit}</span>
              </p>
              <p className="text-[11px] text-muted font-mono mt-0.5">
                {isBn ? "তারিখ:" : "Recorded on:"} {last.date}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {last.doctor_verified ? <Chip kind="doctor" /> : <Chip kind="unverified" />}
              {last.ref_low != null && (
                <span className="text-[10px] text-muted font-mono">
                  Target: {last.ref_low} – {last.ref_high}
                </span>
              )}
            </div>
          </Card>

          {/* Change Comparison Card */}
          <Card className="p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold ${
              isUp ? "bg-warn/15 text-warn" : isSame ? "bg-primary/15 text-primary" : "bg-info/15 text-info"
            }`}>
              {isUp ? <TrendingUp className="h-6 w-6" /> : isSame ? <Activity className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
            </span>
            <div>
              <p className="text-[11px] font-bold text-muted uppercase font-mono">
                {isBn ? "পূর্ববর্তী টেস্টের তুলনা" : "Trajectory Status"}
              </p>
              <p className="text-xs font-bold text-ink mt-0.5">
                {trend ? (isBn ? trend.text_bn : trend.text_en) : (isBn ? "একক পর্যবেক্ষণ সংরক্ষিত" : "Single point baseline recorded")}
              </p>
              <p className="text-[10px] text-muted font-mono mt-1">
                Standard: {currentTestMeta.normal}
              </p>
            </div>
          </Card>

          {/* Clinical Advice CTA Card */}
          <Card className="p-4 rounded-2xl bg-s2/40 flex flex-col justify-between space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted uppercase font-bold">Physician Action</span>
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted leading-tight">
              {isBn
                ? "মান অস্বাভাবিক হলে আপনার প্রেসক্রিপশন ডাক্তারকে দেখিয়ে ডোজ পুনর্বিবেচনা করুন।"
                : "Consult your verified physician if longitudinal parameters deviate from baseline."}
            </p>
            <Link href="/appointments" className="text-xs font-bold text-ptext hover:underline inline-flex items-center gap-1 pt-1">
              <span>{isBn ? "ডাক্তার পরামর্শ নিন" : "Discuss with Doctor"}</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      )}

      {/* Main Interactive Recharts Area */}
      <Async
        loading={loading}
        error={error}
        onRetry={reload}
        empty={data?.points?.length === 0}
        emptyNode={
          <EmptyState
            icon={LineChartIcon}
            title={isBn ? "এই টেস্টের কোনো আগের ডাটা নেই" : "No trend data points found"}
            body={
              isBn
                ? "এই টেস্ট কোডের কোনো রিপোর্ট স্ক্যান করা হয়নি। উপরের 'নতুন রিপোর্ট স্ক্যান করুন' বাটনে ক্লিক করে রিপোর্ট যোগ করুন।"
                : "No historical lab values found for this test code. Upload or scan a report to start tracking your health trajectory."
            }
            action={
              <Link href="/reports/scan">
                <Button size="sm" variant="primary">
                  <UploadCloud className="h-4 w-4 mr-1.5" />
                  {isBn ? "রিপোর্ট আপলোড করুন" : "Upload Report"}
                </Button>
              </Link>
            }
          />
        }
        skeleton="chart"
        h={340}
      >
        {data && (
          <Card className="p-5 sm:p-7 rounded-3xl space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                  <span>{currentTestMeta.icon}</span>
                  <span>{isBn ? currentTestMeta.nameBn : (data.test_name || code)}</span>
                  <span className="text-xs font-mono font-normal text-muted">
                    ({code} · {data.canonical_unit})
                  </span>
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {isBn ? "ক্লিনিক্যাল রেফারেন্স সীমা:" : "Normal Clinical Reference Safety Range:"}{" "}
                  <strong className="text-ink font-mono">{currentTestMeta.normal}</strong>
                </p>
              </div>
              <span className="rounded-full bg-s2 border border-line px-3 py-1 text-xs font-mono font-bold text-ptext self-start sm:self-auto">
                {data.points?.length} {isBn ? "টি পর্যবেক্ষণ" : "data points recorded"}
              </span>
            </div>

            {/* Recharts Area Container */}
            <div role="img" aria-label={`${data.test_name} trend chart`} className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.points} margin={{ left: 8, right: 16, top: 12, bottom: 4 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "monospace" }}
                    tickLine={false}
                    axisLine={false}
                    unit={` ${data.canonical_unit}`}
                    width={85}
                  />

                  {last?.ref_low != null && (
                    <ReferenceArea
                      y1={last.ref_low}
                      y2={last.ref_high}
                      fill="var(--accent)"
                      fillOpacity={0.07}
                      stroke="var(--accent)"
                      strokeOpacity={0.2}
                      strokeDasharray="4 4"
                      label={{
                        value: "Normal Range",
                        fontSize: 10,
                        fill: "var(--accent)",
                        position: "insideTopRight",
                      }}
                    />
                  )}

                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                  />

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    dot={(props: any) => {
                      const isLow = props.payload?.low_confidence;
                      const isVerified = props.payload?.doctor_verified;
                      return (
                        <circle
                          key={props.key}
                          cx={props.cx}
                          cy={props.cy}
                          r={5}
                          fill={isVerified ? "var(--accent)" : isLow ? "var(--warn)" : "var(--surface-1)"}
                          stroke={isVerified ? "var(--accent)" : isLow ? "var(--warn)" : "var(--accent)"}
                          strokeWidth={2.5}
                        />
                      );
                    }}
                    activeDot={{
                      r: 7,
                      fill: "var(--accent)",
                      stroke: "var(--surface-1)",
                      strokeWidth: 3,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted border-t border-line/60 pt-3">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
                {isBn ? "ডাক্তার কর্তৃক ভেরিফায়েড" : "Doctor verified"}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-primary bg-s1" />
                {isBn ? "অযাচাইকৃত (পেশেন্ট ড্রাফট)" : "Unverified (Patient uploaded)"}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-warn" />
                {isBn ? "কম কনফিডেন্স ওসিআর" : "Low confidence OCR"}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block h-3 w-5 opacity-40 bg-primary rounded-xs" />
                {isBn ? "স্বাভাবিক রেফারেন্স সীমা" : "Clinical reference area"}
              </span>
            </div>

            {/* Historical Observation Table */}
            <div className="border-t border-line pt-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                {isBn ? "ঐতিহাসিক রেকর্ডের তালিকা:" : "Recorded Historical Observations Log:"}
              </h3>
              <div className="divide-y divide-line/60 rounded-2xl border border-line bg-s2/30 overflow-hidden">
                {data.points.map((p: any) => (
                  <div
                    key={p.observation_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-s2/60 transition gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="num font-mono text-muted text-xs w-24">
                        {p.date}
                      </span>
                      <span className="num font-bold text-ink text-sm font-mono">
                        {p.value} <span className="text-xs font-normal text-muted">{p.unit}</span>
                      </span>
                      {p.original_unit !== p.unit && (
                        <span className="text-[10px] text-muted font-mono">
                          (original: {p.original_value} {p.original_unit})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {p.doctor_verified ? <Chip kind="doctor" /> : <Chip kind="unverified" />}
                      {p.low_confidence && <Chip kind="low" />}
                      {p.document_id && (
                        <Link
                          href={`/reports/${p.document_id}`}
                          className="text-[11px] font-semibold text-ptext hover:underline inline-flex items-center gap-1 ml-2"
                        >
                          <FileText className="h-3 w-3" />
                          <span>{isBn ? "মূল স্ক্যান" : "Scan"}</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </Async>
    </div>
  );
}
