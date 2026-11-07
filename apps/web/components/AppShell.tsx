"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Building2, CalendarClock, FileText, HeartPulse, LayoutDashboard, LineChart, LogIn, LogOut, Moon, PhoneCall, ShieldCheck, Stethoscope, Sun, Users, Compass, type LucideIcon } from "lucide-react";
import { api, clearSession, getRole, getToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

type Item = [href: string, key: string, Icon: LucideIcon];
const NAV: Record<string, Item[]> = {
  patient: [["/dashboard", "nav.dashboard", LayoutDashboard], ["/reports", "nav.reports", FileText], ["/timeline", "nav.timeline", LineChart], ["/navigator", "nav.navigator", Compass], ["/directory", "nav.directory", Users], ["/appointments", "nav.appointments", CalendarClock], ["/consent", "nav.consent", ShieldCheck]],
  doctor: [["/doctor", "nav.doctor", Stethoscope], ["/appointments", "nav.appointments", CalendarClock], ["/directory", "nav.directory", Users]],
  facility_admin: [["/facility", "nav.facility", Building2], ["/appointments", "nav.appointments", CalendarClock]],
  facility_staff: [["/facility", "nav.facility", Building2], ["/appointments", "nav.appointments", CalendarClock]],
  super_admin: [["/admin", "nav.admin", ShieldCheck], ["/directory", "nav.directory", Users]],
  reviewer: [["/admin", "nav.admin", ShieldCheck], ["/directory", "nav.directory", Users]],
  none: [["/directory", "nav.directory", Users], ["/navigator", "nav.navigator", Compass], ["/login", "nav.login", LogIn]],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("none");
  useEffect(() => { setRole(getToken() ? getRole() || "none" : "none"); }, [path]);
  const items = NAV[role] || NAV.none;
  const logout = async () => {
    try { await api("/auth/logout", { method: "POST", retry: false }); } catch { /* token may already be invalid: still clear locally */ }
    clearSession(); setRole("none"); router.push("/login");
  };
  const active = (href: string) => path === href || (href !== "/" && path.startsWith(href + "/")) || (href === path);
  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-input focus:bg-primary focus:px-3 focus:py-2 focus:text-onprimary">Skip to content</a>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-s1 p-4 md:flex" aria-label="Sidebar">
        <Link href="/" className="mb-6 flex items-center gap-2 font-heading text-lg font-semibold">
          <span className="rounded-input bg-primary p-1.5 text-onprimary"><HeartPulse className="h-5 w-5" aria-hidden /></span>{t("app.name")}
        </Link>
        <nav className="flex-1 space-y-1" aria-label="Primary">
          {items.map(([href, key, Icon]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-3 rounded-input px-3 text-sm transition ${active(href) ? "bg-psoft font-semibold text-ptext border border-primary/40 shadow-[0_0_16px_var(--accent-glow)]" : "text-muted hover:bg-s2 hover:text-ink"}`}>
              <Icon className="h-4 w-4" aria-hidden />{t(key)}
            </Link>
          ))}
        </nav>
        {role !== "none" && <button onClick={logout} className="mt-4 flex min-h-[44px] items-center gap-3 rounded-input px-3 text-sm text-muted hover:bg-s2"><LogOut className="h-4 w-4" aria-hidden />{t("nav.logout")}</button>}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-s1/90 px-4 py-2 backdrop-blur">
          <Link href="/" className="flex items-center gap-2 font-heading font-semibold md:hidden"><HeartPulse className="h-5 w-5 text-ptext" aria-hidden />{t("app.name")}</Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/emergency" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-input border border-danger px-3 text-sm font-semibold text-danger hover:bg-s2"><PhoneCall className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">{t("emergency.help")}</span><span className="sm:hidden">999</span></Link>
            <div role="group" aria-label={t("lang.switch")} className="flex overflow-hidden rounded-input border border-line text-sm">
              {(["en", "bn"] as const).map((l) => (
                <button key={l} onClick={() => setLocale(l)} aria-pressed={locale === l} className={`px-3 ${locale === l ? "bg-psoft font-medium text-ptext" : "text-muted"}`}>{l === "en" ? "EN" : "বাংলা"}</button>
              ))}
            </div>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={t("theme.toggle")} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-input border border-line">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            {role !== "none" && <button onClick={logout} aria-label={t("nav.logout")} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-input border border-line md:hidden"><LogOut className="h-4 w-4" /></button>}
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-4 pb-24 md:p-6 md:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-line bg-s1 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile">
          {items.slice(0, 5).map(([href, key, Icon]) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} className={`flex min-h-[56px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${active(href) ? "text-ptext" : "text-muted"}`}>
              <Icon className="h-5 w-5" aria-hidden /><span className="truncate">{t(key)}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
