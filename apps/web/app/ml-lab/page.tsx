"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Brain, CheckCircle2, FlaskConical, Info, Layers, Loader2, ShieldAlert } from "lucide-react";
import { api, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import { Async, Button, Card, Chip, GlassCard, PageHeader, ProgressBar, Skeleton, SkeletonTable, StatTile, Textarea, useToast } from "@/components/ui";

/* =========================================================
   CONFUSION MATRIX HEATMAP
   ========================================================= */
function ConfusionMatrix({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  const max = Math.max(...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `auto repeat(${labels.length}, minmax(60px, 80px))` }}>
        {/* header row */}
        <div className="p-1 text-xs text-muted" />
        {labels.map((l) => (
          <div key={l} className="p-1 text-center text-xs font-medium text-muted truncate">{l}</div>
        ))}
        {/* data rows */}
        {matrix.map((row, r) => (
          <>
            <div key={`lbl-${r}`} className="flex items-center pr-2 text-xs font-medium text-muted justify-end">{labels[r]}</div>
            {row.map((cell, c) => {
              const intensity = max > 0 ? cell / max : 0;
              const isDiag = r === c;
              const bg = isDiag
                ? `rgba(57,255,136,${0.15 + intensity * 0.75})`
                : cell > 0
                ? `rgba(255,92,108,${0.15 + intensity * 0.6})`
                : "var(--surface-2)";
              return (
                <div key={`${r}-${c}`}
                  className="heatmap-cell aspect-square"
                  style={{ background: bg, color: intensity > 0.5 && isDiag ? "var(--accent-ink)" : "var(--text)" }}
                  title={`Actual: ${labels[r]}, Predicted: ${labels[c]}, Count: ${cell}`}>
                  {cell}
                </div>
              );
            })}
          </>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Rows = actual class · Columns = predicted class · Green diagonal = correct predictions</p>
    </div>
  );
}

/* =========================================================
   MODEL CARD
   ========================================================= */
function ModelCard({ model }: { model: any }) {
  const metrics = model.metrics || {};
  const perClass = metrics.per_class_recall || {};
  const cm = metrics.confusion_matrix;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{model.name}</h2>
          <p className="text-sm text-muted mt-0.5">v{model.version} · {model.algorithm}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-pill border border-warn/40 bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">
            <AlertTriangle className="h-3 w-3" /> {model.approval_status?.replace(/_/g, " ")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-pill border border-info/40 bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
            <Info className="h-3 w-3" /> {metrics.data || "synthetic"} data
          </span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Macro F1" value={<span className="text-ptext">{(metrics.macro_f1 * 100).toFixed(0)}%</span>} accent />
        <StatTile label="Train samples" value={metrics.n_train ?? "—"} />
        <StatTile label="Test samples" value={metrics.n_test ?? "—"} />
        <StatTile label="Classes" value={cm?.labels?.length ?? "—"} />
      </div>

      {/* Per-class recall */}
      {Object.keys(perClass).length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted">Per-class recall</h3>
          <div className="space-y-2">
            {Object.entries(perClass).map(([cls, recall]) => (
              <div key={cls}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium capitalize">{cls}</span>
                  <span className="num text-ptext">{((recall as number) * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={(recall as number) * 100} max={100} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confusion matrix */}
      {cm && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted">Confusion matrix (test set)</h3>
          <ConfusionMatrix labels={cm.labels} matrix={cm.matrix} />
        </div>
      )}

      {/* Training info */}
      {model.training_data_note && (
        <p className="text-xs text-muted border-t border-line pt-3">{model.training_data_note}</p>
      )}
    </Card>
  );
}

/* =========================================================
   INTERACTIVE CLASSIFIER
   ========================================================= */
function ClassifierTool() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const classify = async () => {
    if (!text.trim()) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await api("/ml/document-classify", { body: { text } });
      setResult(r);
      addToast("success", "Classification complete", `Label: ${r.label} · Confidence: ${Math.round((r.confidence ?? 0) * 100)}%`);
    } catch (e: any) {
      setErr(e.message);
      addToast("error", "Classification failed", e.message);
    } finally { setBusy(false); }
  };

  const confidenceColor = result?.abstain ? "text-warn" : result?.confidence > 0.75 ? "text-ptext" : "text-warn";

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-psoft p-2 text-ptext"><FlaskConical className="h-4 w-4" /></span>
        <div>
          <h2 className="font-semibold">{t("ml.classify")}</h2>
          <p className="text-xs text-muted">Paste extracted report text to test the document classifier</p>
        </div>
      </div>

      <div className="text-sm">
        <label className="mb-1 block text-muted">{t("ml.inputLabel")}</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="e.g. CBC report: WBC 6.2 × 10³/μL, RBC 4.5 × 10⁶/μL, HGB 13.8 g/dL..."
          className="w-full rounded-input border border-line bg-s2 px-3 py-2 text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
        />
      </div>

      <Button onClick={classify} busy={busy} disabled={text.trim().length < 10}>
        {busy ? "Classifying…" : "Classify text"}
      </Button>

      {err && <p role="alert" className="flex items-center gap-2 text-sm text-danger"><AlertTriangle className="h-4 w-4" />{err}</p>}

      {result && (
        <div className="rounded-card border border-line bg-s2 p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted">{t("ml.result")}</h3>
          {result.abstain ? (
            <div className="flex items-center gap-2 text-warn">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">{t("ml.abstain")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-ptext" />
              <span className={`text-xl font-bold capitalize ${confidenceColor}`}>{result.label}</span>
            </div>
          )}
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Confidence</span>
              <span className={`num font-medium ${confidenceColor}`}>{Math.round((result.confidence ?? 0) * 100)}%</span>
            </div>
            <ProgressBar value={(result.confidence ?? 0) * 100} max={100} />
          </div>
          {result.scores && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs text-muted font-medium">Score distribution</p>
              {Object.entries(result.scores as Record<string, number>).sort(([, a], [, b]) => (b as number) - (a as number)).map(([cls, score]) => (
                <div key={cls} className="flex items-center gap-2 text-xs">
                  <span className="w-20 capitalize text-muted truncate">{cls}</span>
                  <div className="flex-1 progress-bar-track" style={{ height: 4 }}>
                    <div className="progress-bar-fill" style={{ width: `${Math.round((score as number) * 100)}%` }} />
                  </div>
                  <span className="num w-10 text-right text-muted">{Math.round((score as number) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* =========================================================
   OCR LOW-CONFIDENCE QUEUE
   ========================================================= */
function OcrQueue() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useApi("/admin/ocr-review");
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <Layers className="h-4 w-4 text-warn" />{t("ml.ocrQueue")}
      </h2>
      <Async loading={loading} error={error} onRetry={reload} empty={!data?.items?.length} skeleton="table"
        emptyNode={<p className="text-sm text-muted py-4 text-center">No low-confidence observations pending review.</p>}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Confidence</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: any) => (
                <tr key={item.observation_id}>
                  <td className="font-medium">{item.test_code}</td>
                  <td className="num">{item.value}</td>
                  <td className="text-muted">{item.unit || "—"}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar-track w-16" style={{ height: 4 }}>
                        <div className="progress-bar-fill" style={{
                          width: `${Math.round((item.confidence ?? 0) * 100)}%`,
                          background: (item.confidence ?? 0) < 0.5 ? "var(--danger)" : "var(--warn)"
                        }} />
                      </div>
                      <span className="num text-xs text-warn">{Math.round((item.confidence ?? 0) * 100)}%</span>
                    </div>
                  </td>
                  <td className="text-muted text-xs">{item.document_id?.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Async>
    </Card>
  );
}

/* =========================================================
   PAGE
   ========================================================= */
export default function MlLab() {
  useGuard(["super_admin", "reviewer"]);
  const { t } = useI18n();
  const { data, loading, error, reload } = useApi("/admin/models");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("ml.title")}
        subtitle="Real model metrics from ml/metrics.json · Synthetic training data · Research prototype only"
      />

      {/* Safety disclaimer banner */}
      <GlassCard className="border-warn/30 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-warn mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-warn text-sm">Research prototype — not for clinical use</p>
          <p className="text-xs text-muted mt-0.5">{t("ml.disclaimer")} All metrics are on synthetic data. This classifier is for demonstration purposes only and has not undergone clinical validation.</p>
        </div>
      </GlassCard>

      {/* Model Registry */}
      <Async loading={loading} error={error} onRetry={reload} empty={!data?.models?.length}
        emptyNode={<p className="text-sm text-muted text-center py-8">No models registered yet.</p>}>
        {data?.models?.map((m: any) => <ModelCard key={m.id} model={m} />)}
      </Async>

      {/* Interactive Classifier — only if logged in and endpoint available */}
      {getToken() && <ClassifierTool />}

      {/* OCR Low-Confidence Queue */}
      <OcrQueue />
    </div>
  );
}
