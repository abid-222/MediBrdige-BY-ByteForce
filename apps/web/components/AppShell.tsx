"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  Compass,
  FileText,
  HeartPulse,
  Home as HomeIcon,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Palette,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api, clearSession, getRole, getToken, homeFor, setSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

type Item = [href: string, key: string, Icon: LucideIcon];

const ROLE_NAV: Record<string, Item[]> = {
  patient: [
    ["/dashboard", "nav.dashboard", LayoutDashboard],
    ["/reports", "nav.reports", FileText],
    ["/timeline", "nav.timeline", LineChart],
    ["/navigator", "nav.navigator", Compass],
    ["/directory", "nav.directory", Users],
    ["/appointments", "nav.appointments", CalendarClock],
    ["/consent", "nav.consent", ShieldCheck],
  ],
  doctor: [
    ["/doctor", "nav.doctor", Stethoscope],
    ["/appointments", "nav.appointments", CalendarClock],
    ["/directory", "nav.directory", Users],
    ["/navigator", "nav.navigator", Compass],
  ],
  facility_admin: [
    ["/facility", "nav.facility", Building2],
    ["/appointments", "nav.appointments", CalendarClock],
    ["/directory", "nav.directory", Users],
  ],
  facility_staff: [
    ["/facility", "nav.facility", Building2],
    ["/appointments", "nav.appointments", CalendarClock],
  ],
  super_admin: [
    ["/admin", "nav.admin", ShieldCheck],
    ["/directory", "nav.directory", Users],
  ],
  reviewer: [
    ["/admin", "nav.admin", ShieldCheck],
    ["/directory", "nav.directory", Users],
  ],
};

const DEMO_PERSONAS = [
  { role: "patient", label: "Patient", email: "patient1@demo.medibridge.dev", icon: HeartPulse, path: "/dashboard" },
  { role: "doctor", label: "Doctor", email: "doctor1@demo.medibridge.dev", icon: Stethoscope, path: "/doctor" },
  { role: "facility_admin", label: "Hospital", email: "hospital@demo.medibridge.dev", icon: Building2, path: "/facility" },
  { role: "super_admin", label: "Admin", email: "admin@demo.medibridge.dev", icon: ShieldCheck, path: "/admin" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("none");
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    setRole(getToken() ? getRole() || "none" : "none");
  }, [path]);

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST", retry: false });
    } catch {}
    clearSession();
    setRole("none");
    router.push("/login");
  };

  const switchDemoRole = async (email: string, targetRole: string, targetPath: string) => {
    setSwitching(targetRole);
    try {
      const res = await api("/auth/login", { body: { email, password: "Demo@12345" } });
      setSession(res.access_token, res.role);
      setRole(res.role);
      router.push(targetPath);
    } catch (e: any) {
      alert("Demo login failed: " + (e.message || "Please check credentials"));
    } finally {
      setSwitching(null);
    }
  };

  const active = (href: string) => path === href || (href !== "/" && path.startsWith(href + "/"));

  const navItems = role !== "none" && ROLE_NAV[role] ? ROLE_NAV[role] : [];

  return (
    <div className="min-h-screen md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-input focus:bg-primary focus:px-3 focus:py-2 focus:text-onprimary"
      >
        Skip to content
      </a>

      {/* Sidebar Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-s1 p-4 md:flex" aria-label="Sidebar">
        {/* Brand Logo */}
        <Link href="/" className="mb-6 flex items-center gap-2.5 font-heading text-lg font-bold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-onprimary shadow-[0_0_16px_var(--accent-glow)]">
            <HeartPulse className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-ink">
            MediBridge <span className="text-ptext">AI</span>
          </span>
        </Link>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto" aria-label="Primary">
          {/* Always accessible links */}
          <Link
            href="/"
            aria-current={path === "/" ? "page" : undefined}
            className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium transition ${
              path === "/"
                ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                : "text-muted hover:bg-s2 hover:text-ink"
            }`}
          >
            <HomeIcon className="h-4 w-4" aria-hidden />
            <span>Home</span>
          </Link>

          <Link
            href="/navigator"
            aria-current={active("/navigator") ? "page" : undefined}
            className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium transition ${
              active("/navigator")
                ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                : "text-muted hover:bg-s2 hover:text-ink"
            }`}
          >
            <Compass className="h-4 w-4" aria-hidden />
            <span>{t("nav.navigator")}</span>
          </Link>

          <Link
            href="/directory"
            aria-current={active("/directory") ? "page" : undefined}
            className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium transition ${
              active("/directory")
                ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                : "text-muted hover:bg-s2 hover:text-ink"
            }`}
          >
            <Users className="h-4 w-4" aria-hidden />
            <span>{t("nav.directory")}</span>
          </Link>

          {/* Role specific navigation items */}
          {navItems.length > 0 && (
            <div className="pt-3">
              <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {role.replace("_", " ")} Portal
              </div>
              <div className="space-y-1">
                {navItems
                  .filter(([href]) => href !== "/directory" && href !== "/navigator")
                  .map(([href, key, Icon]) => (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active(href) ? "page" : undefined}
                      className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium transition ${
                        active(href)
                          ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                          : "text-muted hover:bg-s2 hover:text-ink"
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span>{t(key)}</span>
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Quick Demo Switcher Section in Sidebar */}
          <div className="mt-5 rounded-xl border border-primary/30 bg-s2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ptext">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Demo Portals</span>
            </div>
            <p className="mt-1 text-[11px] text-muted">1-Click role preview:</p>
            <div className="mt-2 space-y-1">
              {DEMO_PERSONAS.map((p) => {
                const Icon = p.icon;
                const isCurrent = role === p.role;
                return (
                  <button
                    key={p.role}
                    onClick={() => switchDemoRole(p.email, p.role, p.path)}
                    disabled={switching !== null}
                    className={`flex w-full min-h-[34px] items-center justify-between rounded-lg px-2.5 text-xs font-medium transition ${
                      isCurrent
                        ? "bg-primary text-onprimary shadow-[0_0_10px_var(--accent-glow)]"
                        : "text-muted hover:bg-s1 hover:text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{p.label}</span>
                    </span>
                    {switching === p.role ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isCurrent ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider">Active</span>
                    ) : (
                      <span className="text-[10px] text-muted font-mono">enter →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/dev/ui"
              className={`flex min-h-[38px] items-center gap-3 rounded-input px-3 text-xs text-muted hover:bg-s2 hover:text-ink ${
                active("/dev/ui") ? "text-ptext font-medium" : ""
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Design Kit (/dev/ui)</span>
            </Link>
          </div>
        </nav>

        {/* User Status / Logout */}
        <div className="border-t border-line pt-3">
          {role !== "none" ? (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink capitalize">{role.replace("_", " ")}</p>
                <p className="text-[11px] text-muted font-mono">Signed in</p>
              </div>
              <button
                onClick={logout}
                aria-label={t("nav.logout")}
                title={t("nav.logout")}
                className="flex h-9 w-9 items-center justify-center rounded-input border border-border text-muted hover:bg-s2 hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Link href="/login" className="w-full">
                <button className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-input border border-primary/50 bg-psoft text-xs font-semibold text-ptext hover:bg-primary hover:text-onprimary transition">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>{t("auth.login")}</span>
                </button>
              </Link>
              <Link href="/register" className="w-full">
                <button className="flex min-h-[36px] w-full items-center justify-center gap-2 rounded-input border border-line text-xs font-medium text-muted hover:bg-s2 hover:text-ink transition">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{t("auth.register")}</span>
                </button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex min-h-[58px] items-center justify-between gap-2 border-b border-line bg-s1/90 px-4 py-2 backdrop-blur">
          {/* Mobile Brand */}
          <Link href="/" className="flex items-center gap-2 font-heading font-semibold md:hidden">
            <HeartPulse className="h-5 w-5 text-ptext" aria-hidden />
            <span className="text-ink">MediBridge</span>
          </Link>

          {/* Quick Demo Switcher Pills in Header (Both Desktop & Tablet) */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-border bg-s2/80 px-2 py-1 text-xs">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-ptext" /> Demo:
            </span>
            {DEMO_PERSONAS.map((p) => {
              const isCurrent = role === p.role;
              return (
                <button
                  key={p.role}
                  onClick={() => switchDemoRole(p.email, p.role, p.path)}
                  disabled={switching !== null}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    isCurrent
                      ? "bg-primary text-onprimary font-semibold shadow-[0_0_10px_var(--accent-glow)]"
                      : "text-muted hover:bg-s1 hover:text-ink"
                  }`}
                >
                  {switching === p.role ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Header Action Items */}
          <div className="ml-auto flex items-center gap-2">
            {/* Direct Login/Register buttons when not logged in */}
            {role === "none" ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <button className="flex min-h-[38px] items-center gap-1.5 rounded-input border border-primary/40 bg-psoft px-3 text-xs font-semibold text-ptext hover:bg-primary hover:text-onprimary transition">
                    <LogIn className="h-3.5 w-3.5" />
                    <span>{t("auth.login")}</span>
                  </button>
                </Link>
                <Link href="/register">
                  <button className="flex min-h-[38px] items-center gap-1.5 rounded-input border border-line px-3 text-xs font-medium text-muted hover:bg-s2 hover:text-ink transition">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Register</span>
                  </button>
                </Link>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-psoft px-3 py-1 text-xs font-medium text-ptext capitalize">
                  {role.replace("_", " ")}
                </span>
                <button
                  onClick={logout}
                  className="flex min-h-[38px] items-center gap-1 rounded-input border border-line px-2.5 text-xs text-muted hover:bg-s2 hover:text-danger"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {/* Emergency Hotline Button */}
            <Link
              href="/emergency"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-input border border-danger bg-danger/10 px-3 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition"
            >
              <PhoneCall className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{t("emergency.help")}</span>
              <span className="sm:hidden font-mono font-bold">999</span>
            </Link>

            {/* Language Switcher */}
            <div role="group" aria-label={t("lang.switch")} className="flex overflow-hidden rounded-input border border-line text-xs">
              {(["en", "bn"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  aria-pressed={locale === l}
                  className={`px-2.5 py-1.5 ${locale === l ? "bg-psoft font-semibold text-ptext" : "text-muted hover:text-ink"}`}
                >
                  {l === "en" ? "EN" : "বাংলা"}
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={t("theme.toggle")}
              className="flex h-9 w-9 items-center justify-center rounded-input border border-line text-muted hover:bg-s2 hover:text-ink transition"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 pb-24 md:p-6 md:pb-10">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-s1 pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg"
          aria-label="Mobile"
        >
          <Link
            href="/"
            className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              path === "/" ? "text-ptext font-semibold" : "text-muted"
            }`}
          >
            <HomeIcon className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link
            href="/navigator"
            className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              active("/navigator") ? "text-ptext font-semibold" : "text-muted"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Find</span>
          </Link>
          <Link
            href="/directory"
            className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
              active("/directory") ? "text-ptext font-semibold" : "text-muted"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Directory</span>
          </Link>
          {role !== "none" ? (
            <Link
              href={homeFor(role)}
              className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
                active(homeFor(role)) ? "text-ptext font-semibold" : "text-muted"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Portal</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
                active("/login") ? "text-ptext font-semibold" : "text-muted"
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
