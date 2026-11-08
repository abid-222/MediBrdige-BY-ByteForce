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
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>("none");
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  // Scroll detection to trigger elevated distinct navbar background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 font-mono ${
          scrolled
            ? "bg-[#F8FAFC]/98 dark:bg-[#0A0F16]/98 backdrop-blur-2xl border-b-2 border-emerald-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.85)]"
            : "bg-white/95 dark:bg-[#07090D]/95 backdrop-blur-md border-b border-line shadow-xs"
        }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Brand Logo with High-Contrast Solid Mark */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_0_16px_rgba(16,185,129,0.45)] transition-transform duration-300 group-hover:scale-105">
              <HeartPulse className="h-5 w-5 text-white stroke-[2.2]" aria-hidden />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-tight flex items-center">
                MediBridge <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black ml-1">AI</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase hidden sm:block">
                Dhaka Clinical Grid
              </span>
            </div>
          </Link>

          {/* Center Desktop Navigation Links (Visible on 1100px+) */}
          <nav className="hidden xl:flex items-center gap-1.5 lg:gap-2 text-xs tracking-wider uppercase">
            <Link
              href="/navigator"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                pathname === "/navigator"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? "স্মার্টকেয়ার" : "Navigator"}</span>
            </Link>
            <Link
              href="/directory"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                pathname === "/directory"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? "ডাক্তার ও হাসপাতাল" : "Directory"}</span>
            </Link>
            <Link
              href="/appointments"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                pathname === "/appointments"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? "টেলিহেলথ" : "Telehealth"}</span>
            </Link>
            <Link
              href="/reports"
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                pathname.startsWith("/reports")
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isBn ? "রিপোর্ট ওসিআর" : "Report OCR"}</span>
            </Link>
            {role === "super_admin" && (
              <Link
                href="/ml-lab"
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  pathname === "/ml-lab"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                    : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 font-bold"
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isBn ? "এমএল স্টুডিও" : "Research ML"}</span>
              </Link>
            )}
          </nav>

          {/* Right Desktop Actions (Visible on 1100px+) */}
          <div className="hidden xl:flex items-center gap-2.5">
            {/* Emergency 999 Pill */}
            <Link
              href="/emergency"
              className="flex items-center gap-1.5 h-8 px-2.5 border border-danger/40 bg-danger/10 text-danger hover:bg-danger hover:text-white transition-colors text-xs font-bold rounded-lg"
              title="Emergency Hotline 999"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>999</span>
            </Link>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "bn" : "en")}
              className="flex items-center justify-center h-8 px-2.5 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 transition-colors rounded-lg"
              title="Switch Language"
            >
              {locale === "en" ? "বাংলা" : "ENG"}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center h-8 w-8 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 transition-colors rounded-lg"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            </button>

            {/* Role Status or Get Started */}
            {role !== "none" ? (
              <div className="flex items-center gap-2">
                <Link
                  href={homeFor(role)}
                  className="flex items-center gap-1.5 h-8 bg-emerald-500/15 border border-emerald-500/50 text-emerald-700 dark:text-emerald-300 px-3 text-xs font-extrabold tracking-wider uppercase hover:bg-emerald-600 hover:text-white transition-all rounded-lg shadow-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="capitalize">{role.replace("_", " ")} Workspace</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  className="flex items-center justify-center h-8 w-8 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-muted hover:text-danger hover:border-danger/40 transition-colors rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center h-8 px-3 text-xs tracking-wider uppercase font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100/80 dark:bg-slate-800/80"
                >
                  {isBn ? "লগইন" : "Sign In"}
                </Link>
                <Link
                  href="/navigator"
                  className="relative flex items-center h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold tracking-wider uppercase px-3.5 text-xs transition-all active:scale-[0.97] rounded-lg shadow-md group"
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
              className="flex items-center gap-1 h-8 px-2 border border-danger/40 bg-danger/10 text-danger text-[11px] font-bold rounded-lg"
            >
              <PhoneCall className="w-3 h-3" />
              <span>999</span>
            </Link>

            {/* Theme Toggle Button for Mobile */}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center h-8 w-8 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:text-emerald-600 transition-colors rounded-lg"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Language Switcher for Mobile */}
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "bn" : "en")}
              className="flex items-center justify-center h-8 px-2.5 border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 transition-colors rounded-lg"
              aria-label="Switch Language"
            >
              {locale === "en" ? "বাং" : "EN"}
            </button>

            {/* Hamburger Menu Toggle */}
            <button
              type="button"
              className="text-slate-900 dark:text-white p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center h-8 w-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile & Tablet Dropdown Drawer (100% Solid Opaque Surface with High Contrast) */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-b-2 border-emerald-500/40 bg-white dark:bg-[#0A0F16] p-4 sm:p-5 flex flex-col gap-2.5 shadow-2xl transition-all">
            <Link
              href="/navigator"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
                pathname === "/navigator"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isBn ? "স্মার্টকেয়ার নেভিগেটর" : "AI SmartCare Navigator"}</span>
            </Link>
            <Link
              href="/directory"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
                pathname === "/directory"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isBn ? "ডাক্তার ও হাসপাতাল ডিরেক্টরি" : "Doctors & Hospital Directory"}</span>
            </Link>
            <Link
              href="/appointments"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
                pathname === "/appointments"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isBn ? "অনলাইন টেলিহেলথ বুকিং" : "Online Telehealth Booking"}</span>
            </Link>
            <Link
              href="/reports"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
                pathname.startsWith("/reports")
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                  : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 hover:bg-emerald-500/10 font-bold"
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{isBn ? "মেডিকেল রিপোর্ট ওসিআর স্ক্যান" : "Medical Report OCR"}</span>
            </Link>
            {role === "super_admin" && (
              <Link
                href="/ml-lab"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 py-2.5 px-3 rounded-lg text-xs uppercase tracking-wider transition ${
                  pathname === "/ml-lab"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/40 shadow-xs"
                    : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 hover:bg-emerald-500/10 font-bold"
                }`}
              >
                <FlaskConical className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{isBn ? "এমএল স্টুডিও ও মেট্রিক্স" : "Research ML Lab"}</span>
              </Link>
            )}

            <div className="pt-3 mt-1 border-t border-line flex flex-col gap-2">
              {role !== "none" ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href={homeFor(role)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-md flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="capitalize">{role.replace("_", " ")} Workspace</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-center py-2.5 border border-danger/40 text-danger text-xs uppercase tracking-widest rounded-lg hover:bg-danger/10 transition font-bold"
                  >
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 border border-slate-300 dark:border-slate-700 text-xs uppercase tracking-widest text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/navigator"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-md hover:bg-emerald-500"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
      {/* Spacer to prevent fixed navbar from overlapping page content on initial load */}
      <div className="h-16 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
