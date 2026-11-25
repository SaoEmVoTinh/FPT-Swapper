"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Flame,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useAppState } from "@/lib/app-state";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { student, unreadNotificationsCount, unreadMessagesCount } = useAppState();

  const navItems = [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/discover", label: "Discover", icon: Flame },
    { href: "/requests", label: "Yêu cầu của tôi", icon: ListChecks },
    { href: "/requests/new", label: "Tạo yêu cầu", icon: PlusCircle },
    { href: "/matches", label: "Matches", icon: Sparkles },
    {
      href: "/chat",
      label: "Tin nhắn",
      icon: MessageSquare,
      badge: unreadMessagesCount,
    },
    {
      href: "/notifications",
      label: "Thông báo",
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    { href: "/profile", label: "Hồ sơ", icon: User },
    { href: "/admin", label: "Admin", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/fpt-logo2.png"
              alt="FPT ClassSwap"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl object-contain"
            />
            <div>
              <span className="font-bold text-slate-900 tracking-tight block leading-none">
                FPT ClassSwap
              </span>
              <span className="text-[11px] font-medium text-orange-600">
                MVP Preview
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/requests" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      active ? "text-orange-600" : "text-slate-400"
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

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
              {student.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {student.fullName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {student.studentCode} • {student.campusName}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/fpt-logo2.png"
            alt="FPT ClassSwap"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-bold text-slate-900">FPT ClassSwap</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Thông báo"
          >
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
            )}
          </Link>
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700"
          >
            {student.fullName.charAt(0)}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pb-20 md:pb-8">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white py-2 md:hidden">
        {[
          { href: "/dashboard", label: "Trang chủ", icon: LayoutDashboard },
          { href: "/discover", label: "Discover", icon: Flame },
          { href: "/requests", label: "Yêu cầu", icon: ListChecks },
          { href: "/matches", label: "Matches", icon: Sparkles },
          { href: "/chat", label: "Chat", icon: MessageSquare },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
                active ? "text-orange-600" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

