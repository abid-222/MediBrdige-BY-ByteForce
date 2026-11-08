"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Users,
  Calendar,
  Building2,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input } from "@/components/ui";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const DIVISIONS = [
  "Dhaka",
  "Chittagong",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

export default function Register() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isBn = locale === "bn";

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    dob: "",
    sex: "male",
    blood_group: "O+",
    division: "Dhaka",
    district: "Dhaka",
    emergency_name: "",
    emergency_relation: "Spouse",
    emergency_phone: "",
    chronic_notes: "",
    consent: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Compute dynamic completion percentage for 3D progress ring
  const calculateProgress = () => {
    let score = 0;
    if (form.full_name.trim().length >= 3) score += 20;
    if (form.email.includes("@") && form.email.includes(".")) score += 20;
    if (form.password.length >= 8) score += 20;
    if (form.phone.trim().length >= 7) score += 15;
    if (form.dob) score += 10;
    if (form.emergency_name && form.emergency_phone) score += 15;
    return Math.min(100, score);
  };

  const progress = calculateProgress();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (form.password.length < 8) {
      setErr(isBn ? "পাসওয়ার্ড ন্যূনতম ৮ অক্ষরের হতে হবে।" : "Password must be at least 8 characters long.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setErr(isBn ? "পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মিলছে না।" : "Passwords do not match.");
      return;
    }

    if (!form.consent) {
      setErr(isBn ? "অনুগ্রহ করে শর্তাবলী ও তথ্যের গোপনীয়তা নীতি স্বীকার করুন।" : "Please accept the medical privacy consent to proceed.");
      return;
    }

    setBusy(true);

    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        dob: form.dob || undefined,
        sex: form.sex || undefined,
        blood_group: form.blood_group || undefined,
        division: form.division || undefined,
        district: form.district || undefined,
        emergency_name: form.emergency_name.trim() || undefined,
        emergency_phone: form.emergency_phone.trim() || undefined,
        emergency_relation: form.emergency_relation || undefined,
      };

      const res = await api("/auth/register", { body: payload });
      setMsg(isBn ? "রোগীর অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ভেরিফিকেশন কোড পাঠানো হয়েছে।" : "Patient account successfully registered! Verification code sent.");

      if (res.dev_otp) {
        sessionStorage.setItem("dev_otp", res.dev_otp);
      }

      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
      }, 700);
    } catch (e: any) {
      setErr(e.message || (isBn ? "অ্যাকাউন্ট তৈরি করতে ব্যর্থ হয়েছে।" : "Registration failed. Please check your information."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative mx-auto mt-2 max-w-3xl pb-16">
      {/* Background 3D Ambient Hologram Glows */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
      <div className="pointer-events-none absolute top-1/3 -right-20 -z-10 h-72 w-72 rounded-full bg-info/10 blur-[80px]" />

      {/* 3D Header Section */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-s1/80 px-4 py-1.5 shadow-[0_0_20px_var(--accent-glow)] backdrop-blur">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-semibold tracking-wide uppercase text-ptext">
            {isBn ? "ডিজিটাল স্বাস্থ্য রেজিস্ট্রেশন" : "Official Patient Intake & E-Health Record"}
          </span>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
            DGHS / BMDC Aligned
          </span>
        </div>

        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {isBn ? "রোগীর ডিজিটাল অ্যাকাউন্ট তৈরি করুন" : "Create Patient Medical Account"}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          {isBn
            ? "ডিজিটাল প্রেসক্রিপশন, এআই রিপোর্ট বিশ্লেষণ, ল্যাব হিস্ট্রি এবং বিএমডিসি নিবন্ধিত বিশেষজ্ঞ ডাক্তারদের সেবা পেতে আপনার স্বাস্থ্য প্রোফাইল তৈরি করুন।"
            : "Complete your official intake form to activate zero-hallucination report analysis, digital prescriptions, and direct consultation with verified specialists."}
        </p>
      </div>

      {/* 3D Main Glassmorphic Card */}
      <div className="group relative rounded-3xl border border-primary/30 bg-gradient-to-b from-s1/95 via-s1/80 to-s2/90 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_25px_var(--accent-glow)] backdrop-blur-2xl transition-all duration-300">
        
        {/* Top Floating Mini 3D Health Meter & Step Switcher */}
        <div className="mb-6 rounded-2xl border border-border/80 bg-s2/60 p-4 shadow-inner backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-primary/50 bg-psoft shadow-[0_0_15px_var(--accent-glow)]">
                <HeartPulse className="h-6 w-6 text-ptext" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">
                    {isBn ? "স্বাস্থ্য রেকর্ড প্রোফাইল সমাপ্তি:" : "Health Record Completion:"}
                  </span>
                  <span className="font-mono text-xs font-extrabold text-ptext">{progress}%</span>
                </div>
                <div className="mt-1 h-2 w-36 sm:w-48 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all duration-500 shadow-[0_0_10px_var(--accent-glow)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Section Nav Pill Buttons */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeStep === 1
                    ? "border border-primary/50 bg-primary/20 text-ptext font-bold shadow-sm"
                    : "text-muted hover:text-ink hover:bg-s1"
                }`}
              >
                1. {isBn ? "অ্যাকাউন্ট" : "Account"}
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeStep === 2
                    ? "border border-primary/50 bg-primary/20 text-ptext font-bold shadow-sm"
                    : "text-muted hover:text-ink hover:bg-s1"
                }`}
              >
                2. {isBn ? "মেডিকেল তথ্য" : "Medical Info"}
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeStep === 3
                    ? "border border-primary/50 bg-primary/20 text-ptext font-bold shadow-sm"
                    : "text-muted hover:text-ink hover:bg-s1"
                }`}
              >
                3. {isBn ? "জরুরি যোগাযোগ" : "Emergency"}
              </button>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} className="space-y-6">

          {/* SECTION 1: ACCOUNT & CREDENTIALS */}
          <div className={`space-y-4 ${activeStep === 1 ? "block" : "hidden sm:block"}`}>
            <div className="flex items-center gap-2 border-b border-border/70 pb-2">
              <User className="h-4 w-4 text-ptext" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-ptext">
                {isBn ? "১. অ্যাকাউন্ট ও নিরাপত্তা তথ্য" : "1. Account & Security Credentials"}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "পুরো নাম (এনআইডি / অফিসিয়াল নাম)" : "Full Legal Name (as on NID/Passport)"} <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    required
                    placeholder="e.g. Mohammad Anisur Rahman"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="pl-9"
                  />
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "ইমেইল ঠিকানা" : "Email Address"} <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    required
                    placeholder="patient@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="pl-9"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "মোবাইল / হোয়াটসঅ্যাপ নম্বর" : "Mobile / WhatsApp Number"}
                </label>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="01712345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="pl-9"
                  />
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" : "Secure Password (min 8 chars)"} <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="pl-9 pr-10"
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"} <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    className="pl-9 pr-10"
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-muted hover:text-ink"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: MEDICAL DEMOGRAPHICS */}
          <div className={`space-y-4 ${activeStep === 2 ? "block" : "hidden sm:block"}`}>
            <div className="flex items-center gap-2 border-b border-border/70 pb-2">
              <Activity className="h-4 w-4 text-ptext" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-ptext">
                {isBn ? "২. ব্যক্তিগত ও ক্লিনিক্যাল ডেমোগ্রাফিক্স" : "2. Medical & Clinical Demographics"}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "জন্ম তারিখ" : "Date of Birth"}
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="pl-9"
                  />
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "লিঙ্গ" : "Biological Sex / Gender"}
                </label>
                <select
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                  className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="male">{isBn ? "পুরুষ (Male)" : "Male"}</option>
                  <option value="female">{isBn ? "মহিলা (Female)" : "Female"}</option>
                  <option value="other">{isBn ? "অন্যান্য (Other)" : "Other"}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "রক্তের গ্রুপ" : "Blood Group"}
                </label>
                <select
                  value={form.blood_group}
                  onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                  className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-sm font-bold text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Division & District */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "প্রশাসনিক বিভাগ" : "Division (Bangladesh)"}
                </label>
                <div className="relative">
                  <select
                    value={form.division}
                    onChange={(e) => setForm({ ...form, division: e.target.value })}
                    className="w-full rounded-input border border-line bg-s1 pl-9 pr-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    {DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "জেলা / শহর" : "District / City"}
                </label>
                <div className="relative">
                  <Input
                    placeholder="e.g. Dhaka, Chittagong, Sylhet"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    className="pl-9"
                  />
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: EMERGENCY GUARDIAN & BASELINE NOTES */}
          <div className={`space-y-4 ${activeStep === 3 ? "block" : "hidden sm:block"}`}>
            <div className="flex items-center gap-2 border-b border-border/70 pb-2">
              <ShieldCheck className="h-4 w-4 text-ptext" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-ptext">
                {isBn ? "৩. জরুরি অভিভাবক ও প্রাথমিক স্বাস্থ্য নোট" : "3. Emergency Guardian & Health Baseline"}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "জরুরি যোগাযোগের ব্যক্তির নাম" : "Emergency Contact Name"}
                </label>
                <Input
                  placeholder="e.g. Nasreen Sultana"
                  value={form.emergency_name}
                  onChange={(e) => setForm({ ...form, emergency_name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "সম্পর্ক" : "Relationship"}
                </label>
                <select
                  value={form.emergency_relation}
                  onChange={(e) => setForm({ ...form, emergency_relation: e.target.value })}
                  className="w-full rounded-input border border-line bg-s1 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="Spouse">{isBn ? "স্বামী / স্ত্রী (Spouse)" : "Spouse"}</option>
                  <option value="Parent">{isBn ? "পিতা / মাতা (Parent)" : "Parent"}</option>
                  <option value="Sibling">{isBn ? "ভাই / বোন (Sibling)" : "Sibling"}</option>
                  <option value="Child">{isBn ? "সন্তান (Child)" : "Child"}</option>
                  <option value="Guardian">{isBn ? "অভিভাবক (Guardian)" : "Guardian"}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">
                  {isBn ? "জরুরি ফোন নম্বর" : "Emergency Phone"}
                </label>
                <Input
                  type="tel"
                  placeholder="01812345678"
                  value={form.emergency_phone}
                  onChange={(e) => setForm({ ...form, emergency_phone: e.target.value })}
                />
              </div>
            </div>

            {/* Optional Baseline Condition */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">
                {isBn ? "পূর্ববর্তী রোগ বা ওষুধের অ্যালার্জি (যদি থাকে)" : "Known Chronic Conditions / Drug Allergies (Optional)"}
              </label>
              <textarea
                rows={2}
                placeholder={isBn ? "যেমন: ডায়াবেটিস, উচ্চ রক্তচাপ, বা পেনিসিলিন এলার্জি..." : "e.g., Hypertension, Type 2 Diabetes, or Penicillin allergy..."}
                value={form.chronic_notes}
                onChange={(e) => setForm({ ...form, chronic_notes: e.target.value })}
                className="w-full rounded-input border border-line bg-s1 p-2.5 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="rounded-xl border border-primary/20 bg-psoft/30 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-line text-primary focus:ring-primary"
              />
              <span className="text-xs text-ink/90 leading-relaxed">
                {isBn
                  ? "আমি নিশ্চিত করছি যে প্রদত্ত স্বাস্থ্য তথ্য সঠিক এবং আমি মেডিট্রিজ এআই-এর ডিজিটাল স্বাস্থ্য রেকর্ড ও নিরাপত্তা নীতিমালা মেনে চলছি। চিকিৎসকের পর্যালোচনার পূর্ব পর্যন্ত এআই পরামর্শ তথ্যমূলক সহায়িকা হিসেবে গণ্য হবে।"
                  : "I confirm the medical details provided are accurate and consent to digital health record storage under MediBridge AI privacy standards. I understand AI clinical insights assist and do not replace final doctor judgment."}
              </span>
            </label>
          </div>

          {/* Alert Messages */}
          {err && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3.5 text-xs text-danger shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}

          {msg && (
            <div role="status" className="flex items-center gap-2 rounded-xl border border-primary/40 bg-psoft p-3.5 text-xs text-ptext shadow-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={busy}
              busy={busy}
              className="w-full h-12 text-base font-bold shadow-[0_0_24px_var(--accent-glow)] active:scale-[0.99] transition"
            >
              <HeartPulse className="mr-2 h-5 w-5" />
              {isBn ? "রোগীর অ্যাকাউন্ট সম্পন্ন করুন" : "Complete Patient Registration"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Bottom Switchers & Role Links */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted sm:flex-row">
          <div>
            <span>{isBn ? "ইতিমধ্যে অ্যাকাউন্ট আছে?" : "Already have an account?"} </span>
            <Link href="/login" className="font-bold text-ptext hover:underline">
              {isBn ? "এখানে লগইন করুন" : "Sign In to Patient Portal"}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-muted">|</span>
            <Link href="/apply" className="flex items-center gap-1 text-info hover:underline">
              <Stethoscope className="h-3.5 w-3.5" />
              <span>{isBn ? "ডাক্তার বা ক্লিনিক রেজিস্ট্রেশন" : "Doctor / Hospital Apply"}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
