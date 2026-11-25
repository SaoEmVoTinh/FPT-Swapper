"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Download,
  Flame,
  Languages,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { usePwaInstall } from "@/components/PwaManager";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppState } from "@/lib/app-state";
import { useLocale } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { locale, toggleLocale, t } = useLocale();
  const { canInstall, triggerInstall } = usePwaInstall();

  const {
    student,
    isAuthenticated,
    logout,
    soundEnabled,
    toggleSound,
    unreadNotificationsCount,
    unreadMessagesCount,
  } = useAppState();

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const isSuperAdmin =
    isAuthenticated &&
    (["SUPER_ADMIN", "ADMIN", "MODERATOR"].includes(student.role) ||
      student.email.trim().toLowerCase() === "pmquan1406@gmail.com");

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/discover", label: t("nav.discover"), icon: Flame },
    { href: "/requests", label: t("nav.requests"), icon: ListChecks },
    { href: "/matches", label: t("nav.matches"), icon: Sparkles },
    {
      href: "/chat",
      label: t("nav.chat"),
      icon: MessageSquare,
      badge: unreadMessagesCount,
    },
    {
      href: "/notifications",
      label: t("nav.notifications"),
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    { href: "/profile", label: t("nav.profile"), icon: User },
    ...(isSuperAdmin
      ? [{ href: "/admin", label: t("nav.admin"), icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-orange-600 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-white"
      >
        {t("a11y.skipToContent")}
      </a>
      {/* Desktop Sidebar */}
      <aside className="hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-100 px-5 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/fpt-logo2.png"
              alt="FPT Swapper"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-contain"
            />
            <div>
              <span className="block font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100">
                FPT Swapper
              </span>
              <span className="mt-1 inline-block rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-300">
                {student.campusName}
              </span>
            </div>
          </Link>
        </div>

        <nav aria-label="Điều hướng chính" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-orange-50 text-orange-700 shadow-xs ring-1 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      active
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <Link href="/profile" className="group flex min-w-0 items-center gap-3">
              {student.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.avatarUrl}
                  alt={student.fullName}
                  className="h-9 w-9 shrink-0 rounded-full border border-orange-100 object-cover dark:border-slate-700"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700 transition-colors group-hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:group-hover:bg-orange-500/30">
                  {student.fullName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-orange-600 dark:text-slate-100 dark:group-hover:text-orange-400">
                  {student.fullName}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {student.studentCode} • {student.campusName}
                </p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={toggleLocale}
                title={t("lang.toggleTitle")}
                aria-label={t("lang.toggleTitle")}
                className="rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {locale.toUpperCase()}
              </button>
              <ThemeToggle variant="icon" />
              <button
                type="button"
                onClick={toggleSound}
                title={
                  soundEnabled ? "Tắt tiếng chuông báo" : "Bật tiếng chuông báo"
                }
                aria-label={
                  soundEnabled ? "Tắt tiếng chuông báo" : "Bật tiếng chuông báo"
                }
                className={`rounded-lg p-2 transition-colors ${
                  soundEnabled
                    ? "bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/25"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {canInstall && (
            <button
              type="button"
              onClick={triggerInstall}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-300"
            >
              <Download className="h-3.5 w-3.5" />
              {t("pwa.install")}
            </button>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("auth.logout")}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/25"
            >
              <LogIn className="h-3.5 w-3.5" />
              {t("auth.login")}
            </Link>
          )}
          <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-400">
            <Link href="/privacy" className="hover:text-orange-600 hover:underline">
              {t("legal.privacy")}
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-orange-600 hover:underline">
              {t("legal.terms")}
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
        <div className="flex items-center justify-between px-3 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/fpt-logo2.png"
              alt="FPT Swapper"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              FPT Swapper
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleLocale}
              aria-label={t("lang.toggleTitle")}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Languages className="h-3.5 w-3.5" />
              {locale.toUpperCase()}
            </button>
            <ThemeToggle variant="icon" />
            <button
              type="button"
              onClick={toggleSound}
              aria-label={soundEnabled ? "Tắt tiếng chuông" : "Bật tiếng chuông"}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-orange-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              )}
            </button>
            <Link
              href="/notifications"
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Thông báo"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </Link>
            <Link
              href="/profile"
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
              aria-label="Hồ sơ"
            >
              {student.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.avatarUrl}
                  alt={student.fullName}
                  className="h-8 w-8 object-cover"
                />
              ) : (
                student.fullName.charAt(0)
              )}
            </Link>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden min-[380px]:inline">Đăng xuất</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-[11px] font-semibold text-white"
              >
                <LogIn className="h-3.5 w-3.5" />
                Đăng nhập
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Mở menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="space-y-2 border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {student.fullName} ({student.studentCode})
              </span>
              <ThemeToggle variant="pill" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <User className="h-3.5 w-3.5" />
                Hồ sơ &amp; Tài khoản
              </Link>
              <Link
                href="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <Bell className="h-3.5 w-3.5" />
                Thông báo ({unreadNotificationsCount})
              </Link>
              {isSuperAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="col-span-2 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-300"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Trang Quản trị (Admin)
                </Link>
              )}
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất khỏi tài khoản
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white"
              >
                <LogIn className="h-3.5 w-3.5" />
                Đăng nhập tài khoản
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 pb-20 md:pb-8 md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav aria-label="Thanh điều hướng di động" className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {[
          { href: "/dashboard", label: "Trang chủ", icon: LayoutDashboard },
          { href: "/discover", label: "Discover", icon: Flame },
          { href: "/requests", label: "Yêu cầu", icon: ListChecks },
          { href: "/matches", label: "Matches", icon: Sparkles },
          {
            href: "/chat",
            label: "Chat",
            icon: MessageSquare,
            badge: unreadMessagesCount,
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
                active
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.badge ? (
                <span className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
                  {item.badge}
                </span>
              ) : null}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
