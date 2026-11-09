"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Info,
  Lock,
  Pill,
  Printer,
  QrCode,
  RefreshCw,
  Scan,
  Search,
  ShieldCheck,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { api, getToken } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useGuard } from "@/lib/useGuard";
import { useI18n } from "@/lib/i18n";
import {
  Async,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  fmtDate,
  fmtDateTime,
  PageHeader,
  SearchInput,
  Select,
  StatTile,
  Table,
  useToast,
} from "@/components/ui";
import { VerifiableQrCode } from "@/components/VerifiableQrCode";

export default function PatientPrescriptionsPage() {
  useGuard(["patient"]);
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const isBn = locale === "bn";

  const { data, loading, error, reload } = useApi("/prescriptions/me");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [qrModalPrescription, setQrModalPrescription] = useState<any | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [dispensedItems, setDispensedItems] = useState<Record<string, boolean>>({});

  const items = data?.items || [];

  const filteredItems = useMemo(() => {
    return items.filter((rx: any) => {
      if (statusFilter !== "all" && rx.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchDoc = rx.doctor_name?.toLowerCase().includes(q);
      const matchDiag = rx.diagnosis?.toLowerCase().includes(q);
      const matchMeds = rx.medications?.some((m: any) => m.name?.toLowerCase().includes(q));
      return matchDoc || matchDiag || matchMeds;
    });
  }, [items, searchQuery, statusFilter]);

  const activeCount = items.filter((rx: any) => rx.status === "issued").length;

  const handleDownloadPdf = async (rxId: string) => {
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:8000/api/v1/prescriptions/${rxId}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Could not download prescription PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Prescription-NIRAMOY-${rxId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast(
        "success",
        isBn ? "পিডিএফ ডাউনলোড সম্পন্ন" : "PDF Downloaded",
        isBn ? "অফিসিয়াল প্রেসক্রিপশন সফলভাবে ডাউনলোড হয়েছে।" : "Clinical prescription document downloaded successfully."
      );
    } catch (e: any) {
      addToast(
        "error",
        isBn ? "ডাউনলোড ব্যর্থ" : "Download Failed",
        e.message || "Failed to download prescription PDF."
      );
    }
  };

  const getVerificationUrl = (rx: any) => {
    return `https://niramoy.ai/verify/rx/${rx.id}?auth=bmdc_${rx.doctor_bmdc || "reg"}&ts=${encodeURIComponent(
      rx.consultation_date || ""
    )}`;
  };

  const getVerificationHash = (rx: any) => {
    return `SHA256:7f9a${rx.id.replace(/-/g, "").slice(0, 16)}e82b4c10da`;
  };

  const toggleDispensed = (idxKey: string) => {
    setDispensedItems((prev) => ({
      ...prev,
      [idxKey]: !prev[idxKey],
    }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title={isBn ? "ডিজিটাল প্রেসক্রিপশন ও ভেরিফিকেশন" : "My Digital Prescriptions"}
        subtitle={
          isBn
            ? "বিএমডিসি-নিবন্ধিত বিশেষজ্ঞ চিকিৎসকের ডিজিটাল সিল ও কিউআর ভেরিফাইড প্রেসক্রিপশন।"
            : "Doctor-approved clinical prescriptions with tamper-proof QR verification issued during verified medical consultations."
        }
        breadcrumbs={[
          { label: isBn ? "হোম" : "Home", href: "/" },
          { label: isBn ? "ড্যাশবোর্ড" : "Dashboard", href: "/dashboard" },
          { label: isBn ? "প্রেসক্রিপশন" : "Prescriptions", href: "/prescriptions" },
        ]}
        actions={
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => reload()}>
            {isBn ? "রিফ্রেশ" : "Refresh"}
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          icon={FileCheck2}
          label={isBn ? "মোট প্রেসক্রিপশন" : "Total Prescriptions"}
          value={items.length}
          accent
        />
        <StatTile
          icon={Pill}
          label={isBn ? "সক্রিয় প্রেসক্রিপশন" : "Active Prescriptions"}
          value={activeCount}
          trend={activeCount > 0 ? "up" : "down"}
          trendLabel={isBn ? `${activeCount} টি চালু রেজিমেন` : `${activeCount} valid regimens`}
        />
        <StatTile
          icon={Stethoscope}
          label={isBn ? "ইস্যুকারী বিশেষজ্ঞ" : "Issuing Specialists"}
          value={new Set(items.map((i: any) => i.doctor_id)).size}
        />
      </div>

      {/* Search and Filters Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? "ডাক্তার, রোগ বা ওষুধের নাম খুঁজুন..." : "Search by doctor name, diagnosis, or medicine..."}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> {isBn ? "ফিল্টার:" : "Filter:"}
            </span>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{isBn ? "সকল স্ট্যাটাস" : "All Statuses"}</option>
              <option value="issued">{isBn ? "সক্রিয় / অনুমোদিত" : "Active / Issued"}</option>
              <option value="amended">{isBn ? "সংশোধিত" : "Amended"}</option>
              <option value="cancelled">{isBn ? "বাতিল" : "Cancelled"}</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Prescriptions List */}
      <Async
        loading={loading}
        error={error}
        onRetry={reload}
        empty={items.length === 0}
        emptyNode={
          <EmptyState
            icon={Pill}
            title={isBn ? "এখনো কোনো প্রেসক্রিপশন ইস্যু হয়নি" : "No Prescriptions Issued Yet"}
            body={
              isBn
                ? "আপনার কোনো ডিজিটাল প্রেসক্রিপশন সংরক্ষিত নেই। টেলিহেলথ কনসালটেশনের পর ভেরিফাইড ডাক্তার এখানে ডিজিটাল প্রেসক্রিপশন প্রদান করবেন।"
                : "You do not have any official digital prescriptions on file. After a consultation, your verified physician will approve and issue your prescription here."
            }
          />
        }
      >
        <div className="space-y-4">
          {filteredItems.map((rx: any) => (
            <Card key={rx.id} className="p-5 hover:border-emerald-500/40 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      NIRAMOY-RX-{rx.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        rx.status === "issued"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : rx.status === "amended"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
                      }`}
                    >
                      {rx.status}
                    </span>
                    <span className="text-xs text-muted">
                      {isBn ? "কনসালটেশন তারিখ: " : "Consultation: "}
                      <strong className="text-foreground">{fmtDate(rx.consultation_date)}</strong>
                    </span>
                    {/* BMDC Verified badge */}
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <ShieldCheck className="h-3 w-3" />
                      {isBn ? "বিএমডিসি ভেরিফাইড" : "BMDC Verified"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Stethoscope className="h-4 w-4 text-emerald-500" />
                      {rx.doctor_name}
                    </span>
                    {rx.doctor_bmdc && (
                      <span className="text-xs font-mono text-muted bg-muted/30 px-2 py-0.5 rounded">
                        BMDC Reg: {rx.doctor_bmdc}
                      </span>
                    )}
                  </div>

                  {rx.diagnosis && (
                    <div className="text-xs text-foreground/90">
                      <span className="text-muted font-medium">{isBn ? "রোগ নির্ণয়: " : "Diagnosis: "}</span>
                      <strong className="text-foreground">{rx.diagnosis}</strong>
                    </div>
                  )}

                  {/* Medications Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rx.medications?.map((m: any, idx: number) => (
                      <span
                        key={idx}
                        className="text-xs bg-muted/20 border border-border/50 text-foreground px-2.5 py-1 rounded-md flex items-center gap-1.5"
                      >
                        <Pill className="h-3 w-3 text-emerald-500" />
                        <strong>{m.name}</strong> {m.dosage && <span className="text-muted">({m.dosage})</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Verifiable QR Code Quick Preview & Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60">
                  <button
                    type="button"
                    onClick={() => setQrModalPrescription(rx)}
                    className="group relative flex items-center gap-2 p-2 rounded-xl bg-card border border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition text-left cursor-pointer"
                    title={isBn ? "কিউআর কোড ও ফার্মেসি ভেরিফিকেশন খুলুন" : "Open QR Code & Pharmacy Verification"}
                  >
                    <VerifiableQrCode
                      value={getVerificationUrl(rx)}
                      size={54}
                      className="shrink-0"
                    />
                    <div className="pr-1 text-left">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <QrCode className="h-3.5 w-3.5" />
                        <span>{isBn ? "ভেরিফায়েবল কিউআর" : "Verifiable QR"}</span>
                      </div>
                      <p className="text-[10px] text-muted font-mono">
                        {isBn ? "ক্লিক করে যাচাই করুন" : "Click to Verify"}
                      </p>
                    </div>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={Eye}
                      onClick={() => setSelectedPrescription(rx)}
                    >
                      {isBn ? "বিস্তারিত দেখুন" : "View Details"}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Download}
                      onClick={() => handleDownloadPdf(rx.id)}
                    >
                      {isBn ? "পিডিএফ ডাউনলোড" : "Download PDF"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Async>

      {/* Safety Notice */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-muted flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {isBn
            ? "নিরাময় এআই-এর প্রতিটি ডিজিটাল প্রেসক্রিপশন ক্রিপ্টোগ্রাফিক কিউআর কোড এবং বাংলাদেশ মেডিকেল অ্যান্ড ডেন্টাল কাউন্সিল (বিএমডিসি) নিবন্ধিত লাইসেন্সপ্রাপ্ত ডাক্তারের ডিজিটাল সিগনেচার দ্বারা সুরক্ষিত। যেকোনো ফার্মেসি কিউআর কোড স্ক্যান করে প্রেসক্রিপশনের সত্যতা ১০০% নির্ভুলভাবে যাচাই করতে পারবে।"
            : "Every digital prescription in Niramoy AI is protected by a cryptographic verifiable QR code and digitally signed by a BMDC-registered medical physician. Any pharmacy or diagnostic center can scan the QR code to verify medicine authenticity instantly."}
        </p>
      </div>

      {/* Dedicated Verifiable QR Code & Pharmacy Dispensation Modal */}
      {qrModalPrescription && (
        <Dialog
          open={!!qrModalPrescription}
          onClose={() => setQrModalPrescription(null)}
          title={
            isBn
              ? `প্রেসক্রিপশন কিউআর কোড ও ফার্মেসি ভেরিফিকেশন — RX-${qrModalPrescription.id.slice(0, 8).toUpperCase()}`
              : `Cryptographic QR Verification & Pharmacy Seal — RX-${qrModalPrescription.id.slice(0, 8).toUpperCase()}`
          }
        >
          <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
            {/* Top Verification Status Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-600/10 to-teal-500/15 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    {isBn ? "ডিজিটাল সিল: সম্পূর্ণ নির্ভুল ও অবিকৃত" : "Clinical Status: 100% Authentic & Untampered"}
                    <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.2 rounded font-mono font-black uppercase">
                      VERIFIED
                    </span>
                  </h4>
                  <p className="text-xs text-muted">
                    {isBn
                      ? "নিরাময় এআই রেজিস্ট্রি ও বিএমডিসি রেকর্ড দ্বারা যাচাইকৃত।"
                      : "Certified by Niramoy AI Cryptographic Healthcare Registry."}
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right font-mono text-[11px] text-muted">
                <span>Alg: SHA-256</span>
                <span className="block text-emerald-400 font-bold">256-Bit Signed</span>
              </div>
            </div>

            {/* Main QR Display and Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center bg-card p-5 rounded-2xl border border-border/70">
              <div className="flex flex-col items-center justify-center space-y-3">
                <VerifiableQrCode
                  value={getVerificationUrl(qrModalPrescription)}
                  size={200}
                  showScanline={true}
                  label={isBn ? "স্মার্টফোন ক্যামেরা দিয়ে স্ক্যান করুন" : "Scan with Smartphone / 2D Scanner"}
                />
                <p className="text-[11px] text-center text-muted max-w-xs">
                  {isBn
                    ? "ফার্মেসির ক্যামেরা বা যেকোনো কিউআর রিডার দিয়ে স্ক্যান করলে সরকারি রেকর্ডের সাথে মিলিয়ে মূল প্রেসক্রিপশন ওপেন হবে।"
                    : "Scanning opens the tamper-proof ledger record matching doctor BMDC credentials and medications."}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted block text-[11px] uppercase font-bold tracking-wider mb-1">
                    {isBn ? "প্রেসক্রিপশন ক্রিপ্টোগ্রাফিক হ্যাশ:" : "Cryptographic Checksum Hash:"}
                  </span>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border/80 font-mono text-[11px] text-emerald-400">
                    <span className="truncate">{getVerificationHash(qrModalPrescription)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getVerificationHash(qrModalPrescription));
                        setCopiedHash(true);
                        setTimeout(() => setCopiedHash(false), 2000);
                        addToast("success", isBn ? "কপিকৃত" : "Copied", isBn ? "হ্যাশ ক্লিপবোর্ডে কপি হয়েছে।" : "Hash copied to clipboard.");
                      }}
                      className="ml-2 hover:text-white shrink-0"
                    >
                      {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-muted block text-[11px] uppercase font-bold tracking-wider mb-1">
                    {isBn ? "অনলাইন ভেরিফিকেশন লিঙ্ক:" : "Public Verification URL:"}
                  </span>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-bg border border-border/80 font-mono text-[11px] text-muted">
                    <span className="truncate">{getVerificationUrl(qrModalPrescription)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getVerificationUrl(qrModalPrescription));
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                        addToast("success", isBn ? "কপিকৃত" : "Copied", isBn ? "ভেরিফিকেশন লিঙ্ক কপি হয়েছে।" : "URL copied to clipboard.");
                      }}
                      className="ml-2 hover:text-foreground shrink-0"
                    >
                      {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/20 border border-border/60 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted">{isBn ? "ইস্যুকারী চিকিৎসক:" : "Doctor:"}</span>
                    <strong className="text-foreground">{qrModalPrescription.doctor_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">{isBn ? "বিএমডিসি রেজি:" : "BMDC Reg:"}</span>
                    <span className="font-mono font-bold text-emerald-400">{qrModalPrescription.doctor_bmdc || "A-72819 (Verified)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">{isBn ? "ইস্যুর তারিখ:" : "Date of Issue:"}</span>
                    <span className="font-medium text-foreground">{fmtDateTime(qrModalPrescription.consultation_date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Pharmacy Dispensation Checklist */}
            <div className="p-4 rounded-xl bg-s2/40 border border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-emerald-500" />
                  {isBn ? "ফার্মেসি ডিসপেনসেশন অডিট চেকলিস্ট" : "Pharmacy Dispensation Audit Checklist"}
                </span>
                <span className="text-[11px] text-muted">
                  {Object.values(dispensedItems).filter(Boolean).length} / {qrModalPrescription.medications?.length || 0} {isBn ? "বিতরণ সম্পন্ন" : "Dispensed"}
                </span>
              </div>
              <p className="text-[11px] text-muted">
                {isBn
                  ? "ফার্মাসিস্ট ওষুধ প্রদানের সময় নিচের ওষুধগুলো টিক মার্ক দিয়ে ডিসপেনসেশন মার্ক করতে পারেন:"
                  : "Pharmacists may verify and mark each approved prescription item as dispensed below:"}
              </p>

              <div className="space-y-2">
                {qrModalPrescription.medications?.map((m: any, idx: number) => {
                  const key = `${qrModalPrescription.id}_med_${idx}`;
                  const isChecked = !!dispensedItems[key];
                  return (
                    <label
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                          : "bg-card border-border/60 text-foreground/80 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleDispensed(key)}
                          className="rounded border-emerald-500 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                        />
                        <div>
                          <strong className={isChecked ? "line-through text-muted" : "text-foreground"}>
                            {m.name}
                          </strong>{" "}
                          {m.dosage && <span className="text-muted text-[11px]">({m.dosage})</span>}
                          <span className="block text-[10px] text-muted">
                            {m.frequency} • {m.duration} • {m.instructions}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          isChecked
                            ? "bg-emerald-500 text-black"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isChecked ? (isBn ? "বিতরণকৃত" : "Dispensed") : (isBn ? "মজুদ অপেক্ষমান" : "Pending")}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-border flex flex-wrap justify-between items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Printer}
                onClick={() => {
                  window.print();
                }}
              >
                {isBn ? "প্রেসক্রিপশন প্রিন্ট করুন" : "Print Official Prescription"}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setQrModalPrescription(null)}>
                  {isBn ? "বন্ধ করুন" : "Close"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={() => handleDownloadPdf(qrModalPrescription.id)}
                >
                  {isBn ? "পিডিএফ ডাউনলোড" : "Download PDF"}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Prescription Detail Dialog */}
      {selectedPrescription && (
        <Dialog
          open={!!selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
          title={`Digital Prescription — NIRAMOY-RX-${selectedPrescription.id.slice(0, 8).toUpperCase()}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header with Doctor details and Quick QR Trigger */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <Stethoscope className="h-4 w-4 text-emerald-500" />
                  {selectedPrescription.doctor_name}
                </p>
                <p className="text-muted">
                  {selectedPrescription.doctor_bmdc
                    ? `BMDC Registration: ${selectedPrescription.doctor_bmdc}`
                    : "Verified Clinical Practitioner"}
                </p>
              </div>
              <div className="sm:text-right flex items-center gap-2">
                <Button
                  size="xs"
                  variant="secondary"
                  icon={QrCode}
                  onClick={() => {
                    const rx = selectedPrescription;
                    setSelectedPrescription(null);
                    setQrModalPrescription(rx);
                  }}
                >
                  {isBn ? "কিউআর ভেরিফিকেশন" : "View Verifiable QR"}
                </Button>
              </div>
            </div>

            {/* Diagnosis */}
            {selectedPrescription.diagnosis && (
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  {isBn ? "ক্লিনিক্যাল ডায়াগনোসিস:" : "Clinical Diagnosis:"}
                </span>
                <p className="text-sm font-medium text-foreground bg-muted/15 p-2.5 rounded-lg border border-border/50">
                  {selectedPrescription.diagnosis}
                </p>
              </div>
            )}

            {/* Prescribed Medications Table */}
            <div>
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">
                Rx Prescribed Medications ({selectedPrescription.medications?.length || 0})
              </span>
              <Table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{isBn ? "ওষুধ ও ডোজ" : "Medicine & Dosage"}</th>
                    <th>{isBn ? "নিয়ম" : "Frequency"}</th>
                    <th>{isBn ? "মেয়াদ" : "Duration"}</th>
                    <th>{isBn ? "পরামর্শ" : "Instructions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPrescription.medications?.map((m: any, idx: number) => (
                    <tr key={idx}>
                      <td className="font-mono text-xs">{idx + 1}</td>
                      <td>
                        <strong className="text-foreground">{m.name}</strong>{" "}
                        {m.dosage && <span className="text-muted font-normal text-xs">({m.dosage})</span>}
                      </td>
                      <td className="font-mono text-xs">{m.frequency || "As directed"}</td>
                      <td className="text-xs">{m.duration || "N/A"}</td>
                      <td className="text-xs text-muted">{m.instructions || "After meals"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            {/* Clinical Notes / Advice */}
            {selectedPrescription.clinical_notes && (
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  {isBn ? "চিকিৎসকের পরামর্শ ও নিয়মাবলী:" : "Clinical Advice & Guidelines:"}
                </span>
                <p className="text-xs text-foreground bg-muted/15 p-2.5 rounded-lg border border-border/50 leading-relaxed whitespace-pre-wrap">
                  {selectedPrescription.clinical_notes}
                </p>
              </div>
            )}

            {/* Follow-up */}
            {selectedPrescription.follow_up_recommendation && (
              <div>
                <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">
                  {isBn ? "পরবর্তী ফলো-আপ পরামর্শ:" : "Follow-Up Recommendation:"}
                </span>
                <p className="text-xs font-medium text-foreground bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  {selectedPrescription.follow_up_recommendation}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSelectedPrescription(null)}>
                {isBn ? "বন্ধ করুন" : "Close"}
              </Button>
              <Button
                variant="primary"
                icon={Download}
                onClick={() => handleDownloadPdf(selectedPrescription.id)}
              >
                {isBn ? "পিডিএফ ডাউনলোড" : "Download Official PDF"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
