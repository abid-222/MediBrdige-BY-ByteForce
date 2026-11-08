"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState, useMemo, useRef } from "react";
import {
  Activity,
  Bell,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  FlaskConical,
  HeartPulse,
  History,
  Home as HomeIcon,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PhoneCall,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { api, clearSession, getRole, getToken, homeFor, setSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import { Badge, Tooltip, useToast } from "@/components/ui";
import { ArtisticAmbientCanvas } from "@/components/ArtisticAmbientCanvas";

type NavItem = {
  href: string;
  labelKey: string;
  fallbackLabel: string;
  icon: LucideIcon;
  badge?: number;
};

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const path = usePathname();
  const router = useRouter();
  const { addToast } = useToast();

  const [role, setRole] = useState<string>("none");
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [notifOpen, setNotifOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Read role from session
  useEffect(() => {
    const activeRole = getToken() ? getRole() || "none" : "none";
    setRole(activeRole);
  }, [path]);

  const isLanding = path === "/";

  // Read collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("medibridge_sidebar_collapsed");
      if (stored !== null) setCollapsed(stored === "true");
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("medibridge_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Fetch notifications if logged in
  useEffect(() => {
    if (role !== "none" && getToken()) {
      api("/notifications")
        .then((data) => {
          if (data?.items) setNotifications(data.items);
        })
        .catch(() => {});
    } else {
      setNotifications([]);
    }
  }, [role, path]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read_at).length;
  }, [notifications]);

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST", retry: false });
    } catch {}
    clearSession();
    setRole("none");
    setProfileOpen(false);
    addToast("info", "Logged out", "You have been securely signed out.");
    router.push("/login");
  };

  const isActive = (href: string) => {
    const [hPath, hQuery] = href.split("?");
    if (hQuery) {
      if (typeof window === "undefined") return path === hPath;
      const currentQuery = window.location.search.replace(/^\?/, "");
      return path === hPath && currentQuery.includes(hQuery);
    }
    if (href === "/") return path === "/";
    return path === href || (href !== "/" && path.startsWith(href + "/"));
  };

  // Safe Label Resolver: guarantees that raw keys like "nav.home" or keys starting with "nav." NEVER display on screen
  const getNavLabel = (labelKey: string, fallbackLabel: string) => {
    const val = t(labelKey);
    if (!val || val === labelKey || val.startsWith("nav.") || val.toLowerCase().startsWith("nav ")) {
      return fallbackLabel;
    }
    return val;
  };

  // Generate dynamic breadcrumb segments
  const breadcrumbs = useMemo(() => {
    if (path === "/") return [];
    const parts = path.split("/").filter(Boolean);
    const crumbs = [{ label: getNavLabel("nav.breadcrumb.home", "Home"), href: "/" }];
    let acc = "";
    for (const part of parts) {
      acc += `/${part}`;
      const name =
        part === "dashboard"
          ? getNavLabel("nav.overview", "Dashboard")
          : part === "reports"
          ? getNavLabel("nav.documents", "Prescriptions & Reports")
          : part === "timeline"
          ? getNavLabel("nav.myHealth", "Health Timeline & Vitals")
          : part === "navigator"
          ? getNavLabel("nav.navigator", "AI Symptom Navigator")
          : part === "directory"
          ? getNavLabel("nav.directory", "Doctors & Hospitals")
          : part === "appointments"
          ? getNavLabel("nav.appointments", "Online Telehealth")
          : part === "consent"
          ? getNavLabel("nav.settings", "Privacy & Consent")
          : part === "doctor"
          ? getNavLabel("nav.doctor", "Doctor Workspace")
          : part === "facility"
          ? getNavLabel("nav.facility", "Hospital Command")
          : part === "admin"
          ? getNavLabel("nav.admin", "Admin Command")
          : part === "ml-lab"
          ? getNavLabel("nav.mllab", "AI Model Studio")
          : part;
      crumbs.push({ label: name, href: acc });
    }
    return crumbs;
  }, [path, t]);

  // Primary Navigation by Role (Strict Role-Based Isolation with curated names & awesome icons)
  const roleNavItems = useMemo<NavItem[]>(() => {
    if (role === "patient") {
      return [
        { href: "/dashboard", labelKey: "nav.overview", fallbackLabel: "Dashboard", icon: LayoutDashboard },
        { href: "/timeline", labelKey: "nav.myHealth", fallbackLabel: "Health Timeline & Vitals", icon: Activity },
        { href: "/reports", labelKey: "nav.documents", fallbackLabel: "Prescriptions & Reports", icon: FileText },
        { href: "/appointments", labelKey: "nav.appointments", fallbackLabel: "Online Telehealth", icon: CalendarClock },
        { href: "/navigator", labelKey: "nav.navigator", fallbackLabel: "AI Symptom Navigator", icon: Sparkles },
        { href: "/consent", labelKey: "nav.settings", fallbackLabel: "Privacy & Consent", icon: ShieldCheck },
      ];
    }
    if (role === "doctor") {
      return [
        { href: "/doctor", labelKey: "nav.doctor", fallbackLabel: "Doctor Workspace", icon: Stethoscope },
        { href: "/doctor/patients", labelKey: "nav.patients", fallbackLabel: "Patient Roster", icon: Users },
        { href: "/appointments", labelKey: "nav.appointments", fallbackLabel: "Telehealth Schedule", icon: CalendarClock },
        { href: "/directory", labelKey: "nav.directory", fallbackLabel: "Clinical Directory", icon: Compass },
      ];
    }
    if (role === "facility_admin" || role === "facility_staff") {
      return [
        { href: "/facility", labelKey: "nav.facility", fallbackLabel: "Hospital Command", icon: Building2 },
        { href: "/appointments", labelKey: "nav.appointments", fallbackLabel: "Appointments & Shifts", icon: CalendarClock },
        { href: "/directory", labelKey: "nav.directory", fallbackLabel: "Healthcare Directory", icon: Compass },
      ];
    }
    if (role === "super_admin" || role === "reviewer") {
      return [
        { href: "/admin", labelKey: "nav.admin", fallbackLabel: "Admin Command Center", icon: ShieldCheck },
        { href: "/admin?tab=queue", labelKey: "nav.queue", fallbackLabel: "Accreditation Queue", icon: UserCheck },
        { href: "/admin?tab=users", labelKey: "nav.users", fallbackLabel: "User Management", icon: Users },
        { href: "/admin?tab=audit", labelKey: "nav.audit", fallbackLabel: "Immutable Audit Logs", icon: History },
        ...(role === "super_admin"
          ? [{ href: "/ml-lab", labelKey: "nav.mllab", fallbackLabel: "AI & ML Studio", icon: FlaskConical }]
          : []),
        { href: "/admin?tab=settings", labelKey: "nav.systemSettings", fallbackLabel: "System Configuration", icon: Settings2 },
      ];
    }
    // Guest / Logged out visitors
    return [
      { href: "/", labelKey: "nav.home", fallbackLabel: "Home", icon: HomeIcon },
      { href: "/navigator", labelKey: "nav.navigator", fallbackLabel: "AI Symptom Navigator", icon: Sparkles },
      { href: "/directory", labelKey: "nav.directory", fallbackLabel: "Doctors & Hospitals", icon: Stethoscope },
      { href: "/appointments", labelKey: "nav.appointments", fallbackLabel: "Online Telehealth", icon: CalendarClock },
      { href: "/emergency", labelKey: "emergency.help", fallbackLabel: "Emergency Hotline (999)", icon: PhoneCall },
    ];
  }, [role]);

  // Search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/directory?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-bg text-ink md:flex relative overflow-x-clip">
      <ArtisticAmbientCanvas />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-input focus:bg-primary focus:px-3 focus:py-2 focus:text-onprimary font-semibold"
      >
        Skip to main content
      </a>

      {/* =========================================================
         DESKTOP SIDEBAR
         ========================================================= */}
      {!isLanding && (
        <aside
          className={`hidden shrink-0 flex-col border-r border-line bg-s1 transition-all duration-300 md:flex ${
            collapsed ? "w-20" : "w-64"
          }`}
          aria-label="Sidebar Navigation"
        >
          {/* Brand / Logo & Toggle */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-line">
            <Link href="/" className="flex items-center gap-3 font-heading text-lg font-bold tracking-tight">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-onprimary shadow-[0_0_16px_var(--accent-glow)]">
                <HeartPulse className="h-5 w-5" aria-hidden />
              </span>
              {!collapsed && (
                <span className="fade-in font-bold">
                  MediBridge <span className="text-ptext">AI</span>
                </span>
              )}
            </Link>
            <button
              onClick={toggleSidebar}
              aria-label={collapsed ? t("common.expandSidebar") || "Expand" : t("common.collapseSidebar") || "Collapse"}
              title={collapsed ? t("common.expandSidebar") || "Expand" : t("common.collapseSidebar") || "Collapse"}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-s2 hover:text-ink transition"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation list */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main menu">
            {!collapsed && (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                {role === "none" ? "Main Navigation" : `${role.replace("_", " ")} Navigation`}
              </div>
            )}
            <div className="space-y-1">
              {roleNavItems.map(({ href, labelKey, fallbackLabel, icon: Icon, badge }) => {
                const active = isActive(href);
                const label = getNavLabel(labelKey, fallbackLabel);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-[42px] items-center gap-3 rounded-input px-3 text-xs font-semibold transition ${
                      active
                        ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)] font-bold"
                        : "text-muted hover:bg-s2 hover:text-ink"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${active ? "text-ptext" : "text-muted group-hover:text-ink"}`} />
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between">
                        <span className="truncate">{label}</span>
                        {badge !== undefined && badge > 0 && <Badge count={badge} />}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Sidebar Footer / User Profile summary */}
          <div className="border-t border-line p-3">
            {role !== "none" ? (
              <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink capitalize">{role.replace("_", " ")}</p>
                    <p className="text-[11px] text-muted font-mono">Online</p>
                  </div>
                )}
                <button
                  onClick={logout}
                  aria-label={t("nav.logout") || "Log out"}
                  title={t("nav.logout") || "Log out"}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-input border border-line text-muted hover:bg-s2 hover:text-danger transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Link href="/login" className="w-full">
                  <button className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-input border border-primary/50 bg-psoft text-xs font-semibold text-ptext hover:bg-primary hover:text-onprimary transition">
                    <LogIn className="h-3.5 w-3.5 shrink-0" />
                    {!collapsed && <span>{t("auth.login") || "Log in"}</span>}
                  </button>
                </Link>
                {!collapsed && (
                  <Link href="/register" className="w-full">
                    <button className="flex min-h-[34px] w-full items-center justify-center gap-2 rounded-input border border-line text-xs font-medium text-muted hover:bg-s2 hover:text-ink transition">
                      <UserPlus className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("auth.register") || "Register"}</span>
                    </button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* =========================================================
         MOBILE DRAWER (SLIDE-IN)
         ========================================================= */}
      {!isLanding && mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="slide-in-left relative flex w-72 max-w-[85vw] flex-col bg-s1 p-4 shadow-2xl border-r border-line z-10">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 font-heading text-lg font-bold"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-onprimary shadow-[0_0_12px_var(--accent-glow)]">
                  <HeartPulse className="h-5 w-5" />
                </span>
                <span>
                  MediBridge <span className="text-ptext">AI</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-input p-1.5 text-muted hover:bg-s2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto py-4">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                {role === "none" ? "Main Navigation" : `${role.replace("_", " ")} Navigation`}
              </div>
              {roleNavItems.map(({ href, labelKey, fallbackLabel, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium ${
                    isActive(href) ? "bg-psoft text-ptext font-semibold shadow-xs" : "text-muted hover:bg-s2 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{getNavLabel(labelKey, fallbackLabel)}</span>
                </Link>
              ))}

              {/* Mobile Auth actions */}
              <div className="pt-4 mt-2 border-t border-line">
                {role !== "none" ? (
                  <button
                    onClick={() => { setMobileOpen(false); logout(); }}
                    className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-input border border-danger/40 bg-danger/10 px-3 text-xs font-semibold text-danger hover:bg-danger hover:text-white transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t("nav.logout") || "Log out"}</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full">
                      <button className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-input border border-primary/50 bg-primary px-3 text-xs font-semibold text-onprimary shadow transition">
                        <LogIn className="h-4 w-4" />
                        <span>{t("auth.login") || "Log in"}</span>
                      </button>
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)} className="w-full">
                      <button className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-input border border-line bg-s2 px-3 text-xs font-medium text-ink hover:bg-s3 transition">
                        <UserPlus className="h-4 w-4" />
                        <span>{t("auth.register") || "Register"}</span>
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* =========================================================
         MAIN APPLICATION AREA
         ========================================================= */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header (App Pages Only) */}
        {!isLanding && (
          <header className="sticky top-0 z-20 flex min-h-[60px] items-center justify-between gap-3 border-b border-line bg-white/98 dark:bg-[#0E131A]/98 px-4 py-2 backdrop-blur-xl shadow-xs">
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open mobile menu"
            className="flex h-9 w-9 items-center justify-center rounded-input border border-line text-muted hover:bg-s2 hover:text-ink md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Quick Search Interface */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-xs md:max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("common.searchPlaceholder") || "Search doctors, reports, symptoms..."}
                className="w-full rounded-input border border-line bg-s2/50 pl-8 pr-12 text-xs text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition min-h-[36px]"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line px-1 text-[10px] text-muted font-mono">
                /
              </span>
            </div>
          </form>

          {/* Active Role Status Badge for Desktop */}
          {role !== "none" ? (
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-primary/30 bg-psoft/60 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="font-semibold text-ptext capitalize">{role.replace("_", " ")} Workspace</span>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-2 text-xs text-muted">
              <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
              <span className="font-medium text-ink/70">AI assists. Doctors decide. Patients stay in control.</span>
            </div>
          )}

          {/* Header Action Tools */}
          <div className="ml-auto flex items-center gap-2">
            {/* Emergency Hotline Button */}
            <Link
              href="/emergency"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-input border border-danger/60 bg-danger/10 px-3 text-xs font-bold text-danger hover:bg-danger hover:text-white transition shadow-sm"
            >
              <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{t("emergency.help") || "Emergency"}</span>
              <span className="sm:hidden font-mono">999</span>
            </Link>

            {/* Notification Menu / Popover */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label={t("common.notifications") || "Notifications"}
                title={t("common.notifications") || "Notifications"}
                className="relative flex h-9 w-9 items-center justify-center rounded-input border border-line text-muted hover:bg-s2 hover:text-ink transition"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-pill bg-primary px-1 text-[9px] font-bold text-onprimary shadow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="scale-in absolute right-0 mt-2 w-80 rounded-card border border-line bg-s1 p-3 shadow-2xl z-40">
                  <div className="flex items-center justify-between pb-2 border-b border-line">
                    <p className="font-bold text-xs uppercase tracking-wider text-ink">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-psoft px-2 py-0.5 text-[10px] font-semibold text-ptext">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="mt-2 max-h-60 overflow-y-auto divide-y divide-line/60">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n.id} className="py-2 text-xs">
                          <p className={`font-medium ${n.read_at ? "text-muted" : "text-ink"}`}>
                            {n.template?.replaceAll("_", " ")}
                          </p>
                          <p className="text-[10px] text-muted mt-0.5 font-mono">{n.sent_at?.slice(0, 10)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-muted">No notifications right now.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div role="group" aria-label="Language selector" className="flex overflow-hidden rounded-input border border-line text-xs">
              {(["en", "bn"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  aria-pressed={locale === l}
                  className={`px-2.5 py-1 ${
                    locale === l ? "bg-psoft font-bold text-ptext" : "text-muted hover:text-ink"
                  }`}
                >
                  {l === "en" ? "EN" : "বাংলা"}
                </button>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={t("theme.toggle") || "Toggle theme"}
              title={t("theme.toggle") || "Toggle theme"}
              className="flex h-9 w-9 items-center justify-center rounded-input border border-line text-muted hover:bg-s2 hover:text-ink transition"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Profile Menu Dropdown */}
            {role !== "none" ? (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-input border border-line bg-s2/70 px-2.5 py-1 text-xs hover:border-primary/50 transition"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-psoft text-ptext font-bold text-[11px]">
                    {role[0].toUpperCase()}
                  </span>
                  <span className="hidden sm:inline font-semibold capitalize max-w-[100px] truncate">
                    {role.replace("_", " ")}
                  </span>
                </button>

                {profileOpen && (
                  <div className="scale-in absolute right-0 mt-2 w-48 rounded-card border border-line bg-s1 p-1.5 shadow-2xl z-40">
                    <div className="px-3 py-2 border-b border-line">
                      <p className="text-xs font-bold text-ink capitalize">{role.replace("_", " ")}</p>
                      <p className="text-[10px] text-muted font-mono truncate">{getToken() ? "Authenticated" : "Guest"}</p>
                    </div>
                    <Link
                      href={homeFor(role)}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-input px-3 py-2 text-xs text-ink hover:bg-s2 transition"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-ptext" />
                      <span>My Portal</span>
                    </Link>
                    <Link
                      href="/consent"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-input px-3 py-2 text-xs text-ink hover:bg-s2 transition"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-muted" />
                      <span>{t("nav.settings") || "Settings & Consent"}</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-input px-3 py-2 text-xs text-danger hover:bg-danger/10 transition"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>{t("nav.logout") || "Log out"}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <button className="flex min-h-[36px] items-center gap-1.5 rounded-input border border-primary/40 bg-psoft px-3 text-xs font-bold text-ptext hover:bg-primary hover:text-onprimary transition">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>{t("auth.login") || "Log in"}</span>
                </button>
              </Link>
            )}
          </div>
        </header>
        )}

        {/* Main Content Body */}
        <main
          id="main"
          className={
            isLanding
              ? "w-full flex-1 p-0 overflow-x-hidden"
              : "mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 pb-24 md:p-6 md:pb-12"
          }
        >
          {!isLanding && breadcrumbs.length > 1 && (
            <div className="hidden sm:block">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={crumb.href} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-muted/40">/</span>}
                    {idx === breadcrumbs.length - 1 ? (
                      <span className="font-semibold text-ink">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-ink transition">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          )}
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (Internal App Pages Only) */}
        {!isLanding && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-s1/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl"
          aria-label="Mobile Navigation"
        >
          <Link
            href="/"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition ${
              path === "/" ? "text-ptext font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <HomeIcon className="h-4 w-4" />
            <span>{getNavLabel("nav.home", "Home")}</span>
          </Link>
          <Link
            href="/navigator"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition ${
              isActive("/navigator") ? "text-ptext font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>{getNavLabel("nav.navigator", "AI Guide")}</span>
          </Link>
          <Link
            href="/directory"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition ${
              isActive("/directory") ? "text-ptext font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            <span>{getNavLabel("nav.directory", "Doctors")}</span>
          </Link>
          <Link
            href="/appointments"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition ${
              isActive("/appointments") ? "text-ptext font-bold" : "text-muted hover:text-ink"
            }`}
          >
            <CalendarClock className="h-4 w-4" />
            <span>{getNavLabel("nav.appointments", "Telehealth")}</span>
          </Link>
          {role !== "none" ? (
            <Link
              href={homeFor(role)}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition ${
                isActive(homeFor(role)) ? "text-ptext font-bold" : "text-muted hover:text-ink"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>{getNavLabel("nav.overview", "Portal")}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition ${
                isActive("/login") ? "text-ptext font-bold" : "text-muted hover:text-ink"
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>{getNavLabel("nav.login", "Login")}</span>
            </Link>
          )}
        </nav>
        )}
      </div>
    </div>
  );
}
