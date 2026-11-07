"use client";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileSearch,
  FileText,
  History,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  AiBanner,
  Async,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  fmtDate,
  fmtDateTime,
  GlassCard,
  PageHeader,
  StatTile,
  TabGroup,
  Table,
  useToast,
} from "@/components/ui";
import Link from "next/link";

export default function PatientChartPage() {
  useGuard(["doctor"]);
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { addToast } = useToast();

  // API hooks
  const chart = useApi(`/doctor/patients/${id}`);
  const observations = useApi(`/patients/${id}/observations`);
  const doctorMe = useApi("/auth/me");

  // Local state
  const [activeTab, setActiveTab] = useState<"observations" | "notes" | "documents">("observations");
  const [confirmSignOpen, setConfirmSignOpen] = useState(false);
  const [addendumModalOpen, setAddendumModalOpen] = useState(false);
  const [addendumText, setAddendumText] = useState("");
  const [selectedNoteForAddendum, setSelectedNoteForAddendum] = useState<any | null>(null);

  // AI & Note draft states
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [verifyingObsId, setVerifyingObsId] = useState<string | null>(null);

  // Observation verification handler
  const handleVerifyObservation = async (obsId: string, testCode: string) => {
    setVerifyingObsId(obsId);
    try {
      await api(`/observations/${obsId}/verify`, { method: "POST" });
      observations.reload();
      addToast("success", `Observation Verified`, `${testCode} verified and signed.`);
    } catch (e: any) {
      addToast("error", "Verification Failed", e.message);
    } finally {
      setVerifyingObsId(null);
    }
  };

  // Generate AI Clinical Summary
  const handleGenerateSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const res = await api("/ai/clinical-summary", {
        body: { patient_id: id, lang: locale },
      });
      setAiSummary(res);
      addToast("success", "AI Summary Generated", "Extracted facts from recent patient observations.");
    } catch (e: any) {
      addToast("error", "Summary Failed", e.message);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Create AI Note Draft
  const handleAiNoteDraft = async () => {
    setNoteSaving(true);
    try {
      const draftRes = await api("/ai/note-draft", {
        body: { patient_id: id, lang: locale },
      });
      const noteRes = await api("/clinical-notes/draft", {
        body: {
          patient_id: id,
          text: draftRes.draft_text,
          ai_assisted: true,
        },
      });
      setActiveNote(noteRes);
      setNoteContent(noteRes.text || draftRes.draft_text);
      setActiveTab("notes");
      chart.reload();
      addToast("success", "AI Draft Prepared", "Edit and review before signing.");
    } catch (e: any) {
      addToast("error", "Draft Failed", e.message);
    } finally {
      setNoteSaving(false);
    }
  };

  // Create Blank Note Draft
  const handleBlankNoteDraft = async () => {
    setNoteSaving(true);
    try {
      const noteRes = await api("/clinical-notes/draft", {
        body: { patient_id: id, text: "", ai_assisted: false },
      });
      setActiveNote(noteRes);
      setNoteContent("");
      setActiveTab("notes");
      chart.reload();
      addToast("success", "Draft Created", "Compose your consultation note.");
    } catch (e: any) {
      addToast("error", "Failed to Create Draft", e.message);
    } finally {
      setNoteSaving(false);
    }
  };

  // Save Note Text
  const handleSaveDraft = async () => {
    if (!activeNote) return;
    setNoteSaving(true);
    try {
      await api(`/clinical-notes/${activeNote.id}`, {
        method: "PUT",
        body: { text: noteContent },
      });
      addToast("success", "Draft Saved", "Version updated.");
    } catch (e: any) {
      addToast("error", "Save Failed", e.message);
    } finally {
      setNoteSaving(false);
    }
  };

  // Sign Note (Locking)
  const handleConfirmSign = async () => {
    if (!activeNote) return;
    setNoteSaving(true);
    setConfirmSignOpen(false);
    try {
      // First save content
      await api(`/clinical-notes/${activeNote.id}`, {
        method: "PUT",
        body: { text: noteContent },
      });
      // Then sign
      const signed = await api(`/clinical-notes/${activeNote.id}/sign`, {
        method: "POST",
      });
      setActiveNote(signed);
      chart.reload();
      addToast("success", "Clinical Note Signed & Locked", "The note is now an official, immutable record.");
    } catch (e: any) {
      addToast("error", "Signing Failed", e.message);
    } finally {
      setNoteSaving(false);
    }
  };

  // Add Addendum to Locked Note
  const handleAddendumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteForAddendum || !addendumText.trim()) return;
    try {
      await api(`/clinical-notes/${selectedNoteForAddendum.id}/addendum`, {
        method: "POST",
        body: { text: addendumText.trim() },
      });
      setAddendumModalOpen(false);
      setAddendumText("");
      setSelectedNoteForAddendum(null);
      chart.reload();
      addToast("success", "Addendum Added", "Official addendum appended to signed note.");
    } catch (e: any) {
      addToast("error", "Addendum Failed", e.message);
    }
  };

  const obsItems = observations.data?.items || [];
  const unverifiedObs = obsItems.filter((o: any) => !o.doctor_verified);
  const flaggedObs = obsItems.filter((o: any) => o.low_confidence || o.flagged_wrong);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/doctor">
          <Button size="xs" variant="ghost" icon={ArrowLeft}>
            Back to Workspace
          </Button>
        </Link>
      </div>

      <PageHeader
        title={chart.data?.name || "Patient Clinical Chart"}
        subtitle={`Patient ID: ${id} · ${chart.data?.sex ? `Sex: ${chart.data.sex}` : ""} ${
          chart.data?.dob ? `· DOB: ${chart.data.dob}` : ""
        } · Audited Access Under Active Consent`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Doctor Workspace", href: "/doctor" },
          { label: chart.data?.name || "Patient Chart", href: `/doctor/patients/${id}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={Sparkles}
              busy={aiSummaryLoading}
              onClick={handleGenerateSummary}
            >
              AI Summary
            </Button>
            <Button
              size="sm"
              icon={FileText}
              busy={noteSaving}
              onClick={handleAiNoteDraft}
            >
              Draft AI Note
            </Button>
          </div>
        }
      />

      {/* Metrics Stat Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Activity}
          label="Observations"
          value={obsItems.length}
          accent
        />
        <StatTile
          icon={FileCheck}
          label="Pending Verification"
          value={unverifiedObs.length}
          trend={unverifiedObs.length > 0 ? "down" : "up"}
          trendLabel={unverifiedObs.length > 0 ? `${unverifiedObs.length} need review` : "All verified"}
        />
        <StatTile
          icon={FileText}
          label="Available Reports"
          value={chart.data?.documents?.length ?? "—"}
        />
        <StatTile
          icon={Stethoscope}
          label="Clinical Notes"
          value={chart.data?.notes?.length ?? "—"}
        />
      </div>

      {/* AI Clinical Summary Banner */}
      {aiSummary && (
        <Card className="space-y-3 border-info/40 bg-gradient-to-br from-s1 to-info/5">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-info" />
              <h2 className="text-sm font-bold text-ink">AI Extracted Clinical Summary</h2>
              <Chip kind="ai" />
            </div>
            <span className="text-xs text-muted">Observations Cross-Reference</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Extracted Facts:</p>
            {aiSummary.known_facts?.map((f: any, idx: number) => (
              <div key={idx} className="rounded-input border border-line bg-s1 p-2.5 text-xs text-ink">
                <span className="font-bold text-ptext">• </span>
                {f.text}
              </div>
            ))}
          </div>

          {aiSummary.unknown?.length > 0 && (
            <div className="text-xs text-muted pt-2 border-t border-line/60">
              <span className="font-bold">Missing Fields: </span>
              {aiSummary.unknown.join(", ")}
            </div>
          )}

          <div className="rounded-input border border-line/60 bg-s2/40 p-2 text-[11px] text-muted leading-relaxed">
            {aiSummary.disclaimer || "AI assistance draft. Requires independent clinical review."}
          </div>
        </Card>
      )}

      {/* Tabs */}
      <TabGroup
        tabs={[
          { key: "observations", label: "Lab Observations & Verification", count: unverifiedObs.length },
          { key: "notes", label: "Clinical Notes & Consultation", count: chart.data?.notes?.length },
          { key: "documents", label: "Patient Scans & Documents", count: chart.data?.documents?.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB 1: LAB OBSERVATIONS & DOCTOR VERIFICATION */}
      {activeTab === "observations" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <Activity className="h-4 w-4 text-ptext" />
                <span>Extracted Lab Markers</span>
              </h2>
              <p className="text-[11px] text-muted">
                Verify values to lock them into the patient's official clinical record
              </p>
            </div>
            <Button
              size="xs"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => observations.reload()}
            >
              Refresh
            </Button>
          </div>

          <Async
            loading={observations.loading && !observations.data}
            error={observations.error}
            onRetry={observations.reload}
            empty={obsItems.length === 0}
            emptyNode={
              <EmptyState
                icon={Activity}
                title="No observations on file"
                body="Patient has not uploaded any laboratory reports or records."
              />
            }
            skeleton="table"
          >
            <Table>
              <thead>
                <tr>
                  <th>Test Marker</th>
                  <th>Observed Value</th>
                  <th>Observed Date</th>
                  <th>OCR Confidence</th>
                  <th>Verification Status</th>
                  <th className="text-right">Doctor Action</th>
                </tr>
              </thead>
              <tbody>
                {obsItems.map((o: any) => {
                  const isVerified = Boolean(o.doctor_verified);
                  const isLow = Boolean(o.low_confidence);
                  const isFlagged = Boolean(o.flagged_wrong);
                  const isBusy = verifyingObsId === o.id;

                  return (
                    <tr
                      key={o.id}
                      className={`transition ${isFlagged ? "bg-warn/10" : "hover:bg-s2/40"}`}
                    >
                      <td className="font-bold text-ink uppercase">{o.test_code}</td>
                      <td className="num font-bold text-ptext">
                        {o.value} <span className="text-xs font-normal text-muted">{o.unit || "—"}</span>
                      </td>
                      <td className="num text-xs text-muted">{fmtDate(o.observed_on)}</td>
                      <td>
                        {isLow ? (
                          <Chip kind="low" />
                        ) : (
                          <span className="text-xs font-mono text-muted">High (&gt;80%)</span>
                        )}
                        {isFlagged && (
                          <span className="ml-1.5 text-xs text-warn font-semibold">Flagged Wrong</span>
                        )}
                      </td>
                      <td>
                        {isVerified ? (
                          <Chip kind="doctor">Verified</Chip>
                        ) : (
                          <Chip kind="unverified">Unverified</Chip>
                        )}
                      </td>
                      <td className="text-right">
                        {isVerified ? (
                          <span className="text-xs font-mono text-ptext flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <Button
                            size="xs"
                            variant="primary"
                            busy={isBusy}
                            onClick={() => handleVerifyObservation(o.id, o.test_code)}
                          >
                            Verify Value
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Async>
        </Card>
      )}

      {/* TAB 2: CLINICAL NOTES & SIGNING */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {/* Note Editor Card */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
              <div>
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-ptext" />
                  <span>Consultation Note Editor</span>
                </h2>
                <p className="text-[11px] text-muted">
                  Draft consultation notes. Once signed, the note is cryptographically locked.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="xs" variant="secondary" onClick={handleBlankNoteDraft}>
                  New Blank Note
                </Button>
                <Button size="xs" variant="outline" icon={Sparkles} onClick={handleAiNoteDraft}>
                  New AI Assisted
                </Button>
              </div>
            </div>

            {activeNote ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono">Note ID: {activeNote.id?.slice(0, 10)}…</span>
                    {activeNote.ai_assisted && <Chip kind="ai" />}
                    <Chip kind={activeNote.locked ? "doctor" : "pending"}>
                      {activeNote.status?.toUpperCase()}
                    </Chip>
                  </div>
                  {activeNote.signed_at && (
                    <span className="num text-xs text-muted">
                      Signed on {fmtDateTime(activeNote.signed_at)}
                    </span>
                  )}
                </div>

                <textarea
                  value={noteContent}
                  disabled={activeNote.locked}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={8}
                  placeholder="Document clinical assessment, observations, and treatment recommendations..."
                  className={`w-full rounded-input border bg-s2/60 p-3 text-xs text-ink font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition resize-y ${
                    activeNote.locked ? "opacity-80 cursor-not-allowed border-line/60" : "border-line"
                  }`}
                />

                <div className="flex items-center justify-between border-t border-line/60 pt-3">
                  <span className="text-[11px] text-muted">
                    {activeNote.locked
                      ? "This note is signed and locked. To append new findings, use the Addendum feature below."
                      : "Unsigned notes do not appear in the official patient record."}
                  </span>

                  <div className="flex items-center gap-2">
                    {!activeNote.locked && (
                      <>
                        <Button
                          size="xs"
                          variant="secondary"
                          busy={noteSaving}
                          onClick={handleSaveDraft}
                        >
                          Save Draft
                        </Button>
                        <Button
                          size="xs"
                          variant="primary"
                          disabled={!noteContent.trim()}
                          onClick={() => setConfirmSignOpen(true)}
                        >
                          Sign & Lock Note
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-card border border-dashed border-line p-8 text-center text-xs text-muted">
                <p>No active note draft open. Select an existing note below or create a new consultation note.</p>
              </div>
            )}
          </Card>

          {/* Existing Notes Archive */}
          <Card className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Historical Consultation Notes Archive ({chart.data?.notes?.length || 0})
            </h3>

            {chart.data?.notes?.length > 0 ? (
              <div className="divide-y divide-line/60">
                {chart.data.notes.map((n: any) => (
                  <div key={n.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-ink font-mono">Note #{n.id?.slice(0, 8)}</span>
                        <Chip kind={n.status === "signed" || n.status === "addended" ? "doctor" : "pending"}>
                          {n.status}
                        </Chip>
                        {n.ai_assisted && <Chip kind="ai" />}
                      </div>
                      <p className="text-[11px] text-muted mt-1 font-mono">
                        Version {n.version} · {n.signed_at ? `Signed ${fmtDateTime(n.signed_at)}` : "Draft"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={async () => {
                          const noteData = await api(`/clinical-notes/${n.id}/versions`);
                          setActiveNote({ ...n, locked: n.status !== "draft" });
                          const currentVer = noteData.items?.at(-1);
                          setNoteContent(currentVer?.text || "");
                        }}
                      >
                        Load Note
                      </Button>

                      {n.status !== "draft" && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setSelectedNoteForAddendum(n);
                            setAddendumModalOpen(true);
                          }}
                        >
                          + Addendum
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted py-2">No historical notes on file for this patient.</p>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: PATIENT DOCUMENTS */}
      {activeTab === "documents" && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div>
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-ptext" />
                <span>Patient Document Archive</span>
              </h2>
              <p className="text-[11px] text-muted">Uploaded diagnostic reports and scans</p>
            </div>
          </div>

          {chart.data?.documents?.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Processing Status</th>
                  <th>Document Identifier</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {chart.data.documents.map((d: any) => (
                  <tr key={d.id} className="hover:bg-s2/40 transition">
                    <td className="font-bold text-ink uppercase">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-ptext" />
                        <span>{d.doc_type || "Report"}</span>
                      </div>
                    </td>
                    <td>
                      <Chip kind={d.status === "verified" ? "verified" : "pending"}>
                        {d.status}
                      </Chip>
                    </td>
                    <td className="num text-xs text-muted font-mono">{d.id?.slice(0, 16)}…</td>
                    <td className="text-right">
                      <Link href={`/reports/${d.id}`} target="_blank">
                        <Button size="xs" variant="secondary" icon={ExternalLink}>
                          Inspect Scan
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={FileText}
              title="No documents shared"
              body="Patient has not granted document scope or uploaded files."
            />
          )}
        </Card>
      )}

      {/* Confirm Note Signing Modal */}
      <Dialog
        open={confirmSignOpen}
        title="Sign Clinical Note?"
        onClose={() => setConfirmSignOpen(false)}
      >
        <div className="space-y-4 text-sm">
          <div className="rounded-card border border-primary/40 bg-psoft/10 p-3.5 text-xs space-y-2">
            <p className="font-bold text-ink text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-ptext" />
              <span>BMDC Clinical Signing Confirmation</span>
            </p>
            <p className="text-muted leading-relaxed">
              Signing locks this consultation note into an official, immutable clinical record.
              Once signed, you cannot edit the text directly; only formal clinical addenda can be appended.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmSignOpen(false)}
              disabled={noteSaving}
            >
              Back to Editing
            </Button>
            <Button
              size="sm"
              busy={noteSaving}
              onClick={handleConfirmSign}
            >
              Confirm & Sign Note
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Addendum Dialog */}
      <Dialog
        open={addendumModalOpen}
        title={`Addendum to Note #${selectedNoteForAddendum?.id?.slice(0, 8)}`}
        onClose={() => setAddendumModalOpen(false)}
      >
        <form onSubmit={handleAddendumSubmit} className="space-y-4 text-sm">
          <p className="text-xs text-muted">
            The addendum will be permanently appended to the signed note with an immutable timestamp and your BMDC credentials.
          </p>

          <textarea
            required
            rows={5}
            value={addendumText}
            onChange={(e) => setAddendumText(e.target.value)}
            placeholder="Document clinical update, lab review findings, or treatment adjustment..."
            className="w-full rounded-input border border-line bg-s1 p-3 text-xs text-ink font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAddendumModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Append Addendum
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
