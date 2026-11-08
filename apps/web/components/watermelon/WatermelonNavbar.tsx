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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
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
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 font-mono ${
        scrolled
          ? "bg-[#0b0f13]/90 dark:bg-[#0b0f13]/90 bg-white/90 backdrop-blur-md border-b border-line shadow-lg py-2.5"
          : "bg-transparent border-b border-white/5 py-4"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between">
        {/* Brand Logo with Watermelon Cyber-Medical Glow */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center relative transition-transform duration-300 group-hover:scale-105 shadow-[0_0_14px_var(--accent-glow)]">
            <HeartPulse className="w-4 h-4 text-primary" />
            {/* Corner Accents */}
            <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l border-primary" />
            <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r border-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-sm tracking-widest uppercase text-ink flex items-center gap-1">
              MediBridge <span className="text-primary">//</span> AI
            </span>
            <span className="text-[9px] text-muted tracking-widest hidden sm:block">
              DHAKA CLINICAL GRID
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs tracking-wider uppercase">
          <Link
            href="/navigator"
            className={`transition-colors hover:text-primary flex items-center gap-1.5 ${
              pathname === "/navigator" ? "text-primary font-bold" : "text-muted"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBn ? "স্মার্টকেয়ার" : "Navigator"}</span>
          </Link>
          <Link
            href="/directory"
            className={`transition-colors hover:text-primary flex items-center gap-1.5 ${
              pathname === "/directory" ? "text-primary font-bold" : "text-muted"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{isBn ? "ডাক্তার ও হাসপাতাল" : "Directory"}</span>
          </Link>
          <Link
            href="/appointments"
            className={`transition-colors hover:text-primary flex items-center gap-1.5 ${
              pathname === "/appointments" ? "text-primary font-bold" : "text-muted"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isBn ? "টেলিহেলথ" : "Telehealth"}</span>
          </Link>
          <Link
            href="/reports"
            className={`transition-colors hover:text-primary flex items-center gap-1.5 ${
              pathname.startsWith("/reports") ? "text-primary font-bold" : "text-muted"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isBn ? "রিপোর্ট ওসিআর" : "OCR Scan"}</span>
          </Link>
          <Link
            href="/ml-lab"
            className={`transition-colors hover:text-primary flex items-center gap-1.5 ${
              pathname === "/ml-lab" ? "text-primary font-bold" : "text-muted"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{isBn ? "এমএল স্টুডিও" : "ML Studio"}</span>
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            className="flex items-center justify-center h-8 px-2.5 border border-line bg-s2/40 text-[11px] font-mono font-bold text-muted hover:text-ink hover:border-primary/40 transition-colors rounded"
            title="Switch Language"
          >
            {locale === "en" ? "বাংলা" : "ENG"}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center h-8 w-8 border border-line bg-s2/40 text-muted hover:text-ink hover:border-primary/40 transition-colors rounded"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Role Status or Get Started */}
          {role !== "none" ? (
            <div className="flex items-center gap-2">
              <Link
                href={homeFor(role)}
                className="flex items-center gap-1.5 h-8 bg-primary/20 border border-primary text-primary px-3 text-xs font-bold tracking-widest uppercase hover:bg-primary hover:text-onprimary transition-all rounded shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="capitalize">{role.replace("_", " ")} Portal</span>
              </Link>
              <button
                onClick={handleLogout}
                title="Log out"
                className="flex items-center justify-center h-8 w-8 border border-line bg-s2/40 text-muted hover:text-danger hover:border-danger/40 transition-colors rounded"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center h-8 px-3 text-xs tracking-widest uppercase text-muted hover:text-ink transition-colors"
              >
                {isBn ? "লগইন" : "Sign In"}
              </Link>
              <Link
                href="/navigator"
                className="relative flex items-center h-8 bg-primary text-onprimary font-mono font-bold tracking-widest uppercase px-4 text-xs hover:bg-primary/90 transition-all active:scale-[0.97] rounded shadow-[0_0_12px_var(--accent-glow)] group"
              >
                <span>{isBn ? "শুরু করুন" : "Get Started"}</span>
                <ArrowRight className="ml-1.5 w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            className="flex items-center justify-center h-8 px-2 border border-line text-[11px] font-mono text-muted rounded"
          >
            {locale === "en" ? "বাং" : "EN"}
          </button>
          <button
            className="text-ink p-1.5 border border-line rounded bg-s2/40"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-line bg-[#0b0f13] dark:bg-[#0b0f13] bg-s1 p-4 flex flex-col gap-3 shadow-2xl">
          <Link
            href="/navigator"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-xs uppercase tracking-wider text-muted hover:text-primary"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{isBn ? "স্মার্টকেয়ার নেভিগেটর" : "AI Navigator"}</span>
          </Link>
          <Link
            href="/directory"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-xs uppercase tracking-wider text-muted hover:text-primary"
          >
            <Stethoscope className="w-4 h-4 text-primary" />
            <span>{isBn ? "ডাক্তার ও হাসপাতাল ডিরেক্টরি" : "Doctor Directory"}</span>
          </Link>
          <Link
            href="/appointments"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-xs uppercase tracking-wider text-muted hover:text-primary"
          >
            <Activity className="w-4 h-4 text-primary" />
            <span>{isBn ? "অনলাইন টেলিহেলথ" : "Telehealth"}</span>
          </Link>
          <Link
            href="/reports"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-xs uppercase tracking-wider text-muted hover:text-primary"
          >
            <FileText className="w-4 h-4 text-primary" />
            <span>{isBn ? "মেডিকেল রিপোর্ট ওসিআর" : "Report OCR"}</span>
          </Link>
          <Link
            href="/ml-lab"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 text-xs uppercase tracking-wider text-muted hover:text-primary"
          >
            <FlaskConical className="w-4 h-4 text-primary" />
            <span>{isBn ? "এমএল স্টুডিও" : "Research ML Lab"}</span>
          </Link>

          <div className="pt-2 border-t border-line flex flex-col gap-2">
            {role !== "none" ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={homeFor(role)}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-primary/20 border border-primary text-primary font-bold text-xs uppercase tracking-widest rounded"
                >
                  <span className="capitalize">{role.replace("_", " ")} Portal</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-center py-2 border border-danger/40 text-danger text-xs uppercase tracking-widest rounded"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 border border-line text-xs uppercase tracking-widest text-muted hover:text-ink rounded"
                >
                  Sign In
                </Link>
                <Link
                  href="/navigator"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-primary text-onprimary font-bold text-xs uppercase tracking-widest rounded shadow"
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
