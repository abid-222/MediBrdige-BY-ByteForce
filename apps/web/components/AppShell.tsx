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
  Home as HomeIcon,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Palette,
  PhoneCall,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  User,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { api, clearSession, getRole, getToken, homeFor, setSession } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import { Badge, Tooltip, useToast } from "@/components/ui";

type NavItem = {
  href: string;
  labelKey: string;
  fallbackLabel: string;
  icon: LucideIcon;
  badge?: number;
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
  const { addToast } = useToast();

  const [role, setRole] = useState<string>("none");
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [switching, setSwitching] = useState<string | null>(null);
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

  const switchDemoRole = async (email: string, targetRole: string, targetPath: string) => {
    setSwitching(targetRole);
    try {
      const res = await api("/auth/login", { body: { email, password: "Demo@12345" } });
      setSession(res.access_token, res.role);
      setRole(res.role);
      setMobileOpen(false);
      addToast("success", `Switched to ${targetRole.replace("_", " ")} persona`, `Logged in as ${email}`);
      router.push(targetPath);
    } catch (e: any) {
      addToast("error", "Demo switch failed", e.message || "Please check credentials");
    } finally {
      setSwitching(null);
    }
  };

  const isActive = (href: string) => path === href || (href !== "/" && path.startsWith(href + "/"));

  // Generate dynamic breadcrumb segments
  const breadcrumbs = useMemo(() => {
    if (path === "/") return [];
    const parts = path.split("/").filter(Boolean);
    const crumbs = [{ label: t("nav.breadcrumb.home") || "Home", href: "/" }];
    let acc = "";
    for (const part of parts) {
      acc += `/${part}`;
      const name =
        part === "dashboard"
          ? t("nav.overview") || "Overview"
          : part === "reports"
          ? t("nav.documents") || "Medical Documents"
          : part === "timeline"
          ? t("nav.myHealth") || "My Health"
          : part === "navigator"
          ? t("nav.navigator") || "Find Care"
          : part === "directory"
          ? t("nav.directory") || "Directory"
          : part === "appointments"
          ? t("nav.appointments") || "Appointments"
          : part === "consent"
          ? t("nav.settings") || "Settings & Consent"
          : part === "doctor"
          ? t("nav.doctor") || "Doctor Portal"
          : part === "facility"
          ? t("nav.facility") || "Hospital Portal"
          : part === "admin"
          ? t("nav.admin") || "Admin Center"
          : part === "ml-lab"
          ? t("nav.mllab") || "ML & Data Science Lab"
          : part;
      crumbs.push({ label: name, href: acc });
    }
    return crumbs;
  }, [path, t]);

  // Primary Navigation by Role
  const roleNavItems = useMemo<NavItem[]>(() => {
    if (role === "patient") {
      return [
        { href: "/dashboard", labelKey: "nav.overview", fallbackLabel: "Overview", icon: LayoutDashboard },
        { href: "/timeline", labelKey: "nav.myHealth", fallbackLabel: "My Health", icon: LineChart },
        { href: "/reports", labelKey: "nav.documents", fallbackLabel: "Medical Documents", icon: FileText },
        { href: "/appointments", labelKey: "nav.appointments", fallbackLabel: "Appointments", icon: CalendarClock },
        { href: "/consent", labelKey: "nav.settings", fallbackLabel: "Settings & Consent", icon: ShieldCheck },
      ];
    }
    if (role === "doctor") {
      return [
        { href: "/doctor", labelKey: "nav.doctor", fallbackLabel: "Doctor Workspace", icon: Stethoscope },
        { href: "/appointments", labelKey: "nav.appointments", fallbackLabel: "Appointments", icon: CalendarClock },
      ];
    }
    if (role === "facility_admin" || role === "facility_staff") {
      return [
        { href: "/facility", labelKey: "nav.facility", fallbackLabel: "Hospital Portal", icon: Building2 },
        { href: "/appointments", labelKey: "nav.appointments", fallbackLabel: "Appointments", icon: CalendarClock },
      ];
    }
    if (role === "super_admin" || role === "reviewer") {
      return [
        { href: "/admin", labelKey: "nav.admin", fallbackLabel: "Admin Center", icon: ShieldCheck },
        { href: "/ml-lab", labelKey: "nav.mllab", fallbackLabel: "ML & Data Science Lab", icon: FlaskConical },
      ];
    }
    return [];
  }, [role]);

  // Search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/directory?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-bg text-ink md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-input focus:bg-primary focus:px-3 focus:py-2 focus:text-onprimary font-semibold"
      >
        Skip to main content
      </a>

      {/* =========================================================
         DESKTOP SIDEBAR
         ========================================================= */}
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
          {/* Always accessible core links */}
          <div className="space-y-1">
            <Link
              href="/"
              className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-xs font-semibold transition ${
                path === "/"
                  ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                  : "text-muted hover:bg-s2 hover:text-ink"
              }`}
            >
              <HomeIcon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Home</span>}
            </Link>

            <Link
              href="/navigator"
              className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-xs font-semibold transition ${
                isActive("/navigator")
                  ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                  : "text-muted hover:bg-s2 hover:text-ink"
              }`}
            >
              <Compass className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t("nav.navigator") || "Find Care"}</span>}
            </Link>

            <Link
              href="/directory"
              className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-xs font-semibold transition ${
                isActive("/directory")
                  ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                  : "text-muted hover:bg-s2 hover:text-ink"
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t("nav.directory") || "Directory"}</span>}
            </Link>
          </div>

          {/* Role-Specific Portal Section */}
          {roleNavItems.length > 0 && (
            <div className="pt-4 mt-2 border-t border-line/60">
              {!collapsed && (
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                  {role.replace("_", " ")} Portal
                </div>
              )}
              <div className="space-y-1">
                {roleNavItems.map(({ href, labelKey, fallbackLabel, icon: Icon, badge }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-xs font-semibold transition ${
                        active
                          ? "border border-primary/40 bg-psoft text-ptext shadow-[0_0_12px_var(--accent-glow)]"
                          : "text-muted hover:bg-s2 hover:text-ink"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <div className="flex flex-1 items-center justify-between">
                          <span>{t(labelKey) || fallbackLabel}</span>
                          {badge !== undefined && badge > 0 && <Badge count={badge} />}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Demo Persona 1-Click Switcher Card in Sidebar */}
          {!collapsed && (
            <div className="mt-5 rounded-xl border border-primary/30 bg-s2/60 p-3 fade-in">
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
          )}

          {/* Design Kit / Dev UI Link */}
          <div className="pt-3">
            <Link
              href="/dev/ui"
              className={`flex min-h-[38px] items-center gap-3 rounded-input px-3 text-xs text-muted hover:bg-s2 hover:text-ink ${
                isActive("/dev/ui") ? "text-ptext font-medium" : ""
              }`}
            >
              <Palette className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>Design Kit (/dev/ui)</span>}
            </Link>
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

      {/* =========================================================
         MOBILE DRAWER (SLIDE-IN)
         ========================================================= */}
      {mobileOpen && (
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
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium ${
                  path === "/" ? "bg-psoft text-ptext font-semibold" : "text-muted hover:bg-s2 hover:text-ink"
                }`}
              >
                <HomeIcon className="h-4 w-4" />
                <span>Home</span>
              </Link>
              <Link
                href="/navigator"
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium ${
                  isActive("/navigator") ? "bg-psoft text-ptext font-semibold" : "text-muted hover:bg-s2 hover:text-ink"
                }`}
              >
                <Compass className="h-4 w-4" />
                <span>{t("nav.navigator") || "Find Care"}</span>
              </Link>
              <Link
                href="/directory"
                onClick={() => setMobileOpen(false)}
                className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium ${
                  isActive("/directory") ? "bg-psoft text-ptext font-semibold" : "text-muted hover:bg-s2 hover:text-ink"
                }`}
              >
                <Users className="h-4 w-4" />
                <span>{t("nav.directory") || "Directory"}</span>
              </Link>

              {roleNavItems.map(({ href, labelKey, fallbackLabel, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex min-h-[42px] items-center gap-3 rounded-input px-3 text-sm font-medium ${
                    isActive(href) ? "bg-psoft text-ptext font-semibold" : "text-muted hover:bg-s2 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(labelKey) || fallbackLabel}</span>
                </Link>
              ))}

              <div className="pt-4 mt-2 border-t border-line">
                <p className="px-3 text-xs font-semibold uppercase text-muted mb-2">Switch Demo Persona</p>
                <div className="space-y-1">
                  {DEMO_PERSONAS.map((p) => (
                    <button
                      key={p.role}
                      onClick={() => switchDemoRole(p.email, p.role, p.path)}
                      className={`flex w-full min-h-[38px] items-center justify-between rounded-input px-3 text-xs font-medium ${
                        role === p.role ? "bg-primary text-onprimary font-semibold" : "text-muted hover:bg-s2"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <p.icon className="h-4 w-4" />
                        <span>{p.label}</span>
                      </span>
                      {role === p.role && <span>Active</span>}
                    </button>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* =========================================================
         MAIN APPLICATION AREA
         ========================================================= */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex min-h-[60px] items-center justify-between gap-3 border-b border-line bg-s1/90 px-4 py-2 backdrop-blur-md">
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

          {/* Persona Pills for Desktop */}
          <div className="hidden xl:flex items-center gap-1 rounded-full border border-line bg-s2/60 px-2 py-0.5 text-xs">
            <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-ptext" /> Demo:
            </span>
            {DEMO_PERSONAS.map((p) => {
              const isCurrent = role === p.role;
              return (
                <button
                  key={p.role}
                  onClick={() => switchDemoRole(p.email, p.role, p.path)}
                  disabled={switching !== null}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition ${
                    isCurrent
                      ? "bg-primary text-onprimary font-semibold shadow-[0_0_8px_var(--accent-glow)]"
                      : "text-muted hover:bg-s1 hover:text-ink"
                  }`}
                >
                  {switching === p.role ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

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

        {/* Main Content Body with responsive max width */}
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 pb-24 md:p-6 md:pb-12">
          {breadcrumbs.length > 1 && (
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

        {/* Mobile Bottom Navigation Bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-s1/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden shadow-2xl"
          aria-label="Mobile Navigation"
        >
          <Link
            href="/"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
              path === "/" ? "text-ptext font-bold" : "text-muted"
            }`}
          >
            <HomeIcon className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <Link
            href="/navigator"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
              isActive("/navigator") ? "text-ptext font-bold" : "text-muted"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Find</span>
          </Link>
          <Link
            href="/directory"
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
              isActive("/directory") ? "text-ptext font-bold" : "text-muted"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Directory</span>
          </Link>
          {role !== "none" ? (
            <Link
              href={homeFor(role)}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
                isActive(homeFor(role)) ? "text-ptext font-bold" : "text-muted"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Portal</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
                isActive("/login") ? "text-ptext font-bold" : "text-muted"
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
