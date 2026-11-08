"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Compass,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Stethoscope,
  Sun,
  User,
  Users,
  X,
  PhoneCall,
} from "lucide-react";
import { clearSession, getRole, getToken, homeFor } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

export function WatermelonNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>("none");
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const token = getToken();
    setRole(token ? getRole() || "none" : "none");
  }, [pathname]);

  const isBn = locale === "bn";

  const handleLogout = async () => {
    clearSession();
    setRole("none");
    setMobileMenuOpen(false);
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-white/98 dark:bg-[#0E131A]/98 backdrop-blur-xl shadow-xs transition-colors font-mono">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Brand Logo with Watermelon Cyber-Medical Glow */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center relative transition-transform duration-300 group-hover:scale-105 shadow-[0_0_14px_var(--accent-glow)] shrink-0">
            <HeartPulse className="w-4 h-4 text-primary" />
            {/* Corner Accents */}
            <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l border-primary" />
            <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r border-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-sm tracking-wider uppercase text-ink flex items-center gap-1">
              MediBridge <span className="text-primary">//</span> AI
            </span>
            <span className="text-[9px] text-muted tracking-widest hidden sm:block">
              DHAKA CLINICAL GRID
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links (Visible on 1100px+) */}
        <nav className="hidden xl:flex items-center gap-1 lg:gap-2 text-xs tracking-wider uppercase">
          <Link
            href="/navigator"
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              pathname === "/navigator"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink/80 hover:text-primary hover:bg-s2"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{isBn ? "স্মার্টকেয়ার" : "Navigator"}</span>
          </Link>
          <Link
            href="/directory"
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              pathname === "/directory"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink/80 hover:text-primary hover:bg-s2"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-primary" />
            <span>{isBn ? "ডাক্তার ও হাসপাতাল" : "Directory"}</span>
          </Link>
          <Link
            href="/appointments"
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              pathname === "/appointments"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink/80 hover:text-primary hover:bg-s2"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>{isBn ? "টেলিহেলথ" : "Telehealth"}</span>
          </Link>
          <Link
            href="/reports"
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              pathname.startsWith("/reports")
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink/80 hover:text-primary hover:bg-s2"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>{isBn ? "রিপোর্ট ওসিআর" : "Report OCR"}</span>
          </Link>
          <Link
            href="/ml-lab"
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 font-medium ${
              pathname === "/ml-lab"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink/80 hover:text-primary hover:bg-s2"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-primary" />
            <span>{isBn ? "এমএল স্টুডিও" : "Research ML"}</span>
          </Link>
        </nav>

        {/* Right Desktop Actions (Visible on 1100px+) */}
        <div className="hidden xl:flex items-center gap-2.5">
          {/* Emergency 999 Pill */}
          <Link
            href="/emergency"
            className="flex items-center gap-1.5 h-8 px-2.5 border border-danger/40 bg-danger/10 text-danger hover:bg-danger hover:text-white transition-colors text-xs font-bold rounded"
            title="Emergency Hotline 999"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>999</span>
          </Link>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            className="flex items-center justify-center h-8 px-2.5 border border-line bg-s2/50 text-[11px] font-mono font-bold text-ink hover:text-primary hover:border-primary/40 transition-colors rounded"
            title="Switch Language"
          >
            {locale === "en" ? "বাংলা" : "ENG"}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center h-8 w-8 border border-line bg-s2/50 text-ink hover:text-primary hover:border-primary/40 transition-colors rounded"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-warn" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Role Status or Get Started */}
          {role !== "none" ? (
            <div className="flex items-center gap-2">
              <Link
                href={homeFor(role)}
                className="flex items-center gap-1.5 h-8 bg-primary/15 border border-primary text-primary px-3 text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-onprimary transition-all rounded shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="capitalize">{role.replace("_", " ")} Workspace</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="flex items-center justify-center h-8 w-8 border border-line bg-s2/50 text-muted hover:text-danger hover:border-danger/40 transition-colors rounded"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center h-8 px-3 text-xs tracking-wider uppercase font-bold text-ink hover:text-primary transition-colors border border-line rounded bg-s2/30"
              >
                {isBn ? "লগইন" : "Sign In"}
              </Link>
              <Link
                href="/navigator"
                className="relative flex items-center h-8 bg-primary text-onprimary font-mono font-bold tracking-wider uppercase px-3.5 text-xs hover:bg-primary/90 transition-all active:scale-[0.97] rounded shadow-[0_0_12px_var(--accent-glow)] group"
              >
                <span>{isBn ? "শুরু করুন" : "Get Started"}</span>
                <ArrowRight className="ml-1.5 w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile & Tablet Controls (Visible below 1280px) */}
        <div className="flex xl:hidden items-center gap-2">
          {/* Emergency Pill */}
          <Link
            href="/emergency"
            className="flex items-center gap-1 h-8 px-2 border border-danger/40 bg-danger/10 text-danger text-[11px] font-bold rounded"
          >
            <PhoneCall className="w-3 h-3" />
            <span>999</span>
          </Link>

          {/* Theme Toggle Button for Mobile */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center h-8 w-8 border border-line bg-s2/50 text-ink hover:text-primary transition-colors rounded"
            title="Toggle Theme"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-warn" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Language Switcher for Mobile */}
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            className="flex items-center justify-center h-8 px-2.5 border border-line text-[11px] font-mono font-bold text-ink hover:text-primary transition-colors rounded bg-s2/50"
            aria-label="Switch Language"
          >
            {locale === "en" ? "বাং" : "EN"}
          </button>

          {/* Hamburger Menu Toggle */}
          <button
            type="button"
            className="text-ink p-1.5 border border-line rounded bg-s2/70 hover:bg-s2 transition-colors flex items-center justify-center h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Dropdown Drawer (100% Solid Opaque Surface with High Contrast) */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-line bg-white dark:bg-[#0E131A] p-4 sm:p-5 flex flex-col gap-2.5 shadow-2xl transition-all">
          <Link
            href="/navigator"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
              pathname === "/navigator"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink hover:text-primary hover:bg-s2"
            }`}
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>{isBn ? "স্মার্টকেয়ার নেভিগেটর" : "AI Symptom Navigator"}</span>
          </Link>
          <Link
            href="/directory"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
              pathname === "/directory"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink hover:text-primary hover:bg-s2"
            }`}
          >
            <Stethoscope className="w-4 h-4 text-primary shrink-0" />
            <span>{isBn ? "ডাক্তার ও হাসপাতাল ডিরেক্টরি" : "Doctors & Hospital Directory"}</span>
          </Link>
          <Link
            href="/appointments"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
              pathname === "/appointments"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink hover:text-primary hover:bg-s2"
            }`}
          >
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <span>{isBn ? "অনলাইন টেলিহেলথ বুকিং" : "Online Telehealth Booking"}</span>
          </Link>
          <Link
            href="/reports"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
              pathname.startsWith("/reports")
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink hover:text-primary hover:bg-s2"
            }`}
          >
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span>{isBn ? "মেডিকেল রিপোর্ট ওসিআর স্ক্যান" : "Medical Report OCR"}</span>
          </Link>
          <Link
            href="/ml-lab"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
              pathname === "/ml-lab"
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-ink hover:text-primary hover:bg-s2"
            }`}
          >
            <FlaskConical className="w-4 h-4 text-primary shrink-0" />
            <span>{isBn ? "এমএল স্টুডিও ও মেট্রিক্স" : "Research ML Lab"}</span>
          </Link>

          <div className="pt-3 mt-1 border-t border-line flex flex-col gap-2">
            {role !== "none" ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={homeFor(role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 bg-primary text-onprimary font-bold text-xs uppercase tracking-widest rounded-lg shadow-md flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="capitalize">{role.replace("_", " ")} Workspace</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-center py-2.5 border border-danger/40 text-danger text-xs uppercase tracking-widest rounded-lg hover:bg-danger/10 transition"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 border border-line text-xs uppercase tracking-widest text-ink hover:bg-s2 rounded-lg font-bold"
                >
                  Sign In
                </Link>
                <Link
                  href="/navigator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-primary text-onprimary font-bold text-xs uppercase tracking-widest rounded-lg shadow-md hover:bg-primary/90"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
