"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppState } from "@/lib/app-state";

export function LandingHeaderActions() {
  const { isAuthenticated, student } = useAppState();

  return (
    <div className="flex items-center gap-2.5">
      <ThemeToggle variant="icon" />
      {isAuthenticated ? (
        <>
          <Link
            href="/profile"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-orange-300 hover:bg-orange-50/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-orange-500/40 dark:hover:bg-slate-800"
          >
            {student.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                {student.fullName.charAt(0)}
              </span>
            )}
            <span className="max-w-[140px] truncate">{student.fullName}</span>
            {student.studentCode && (
              <span className="hidden text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:inline">
                ({student.studentCode})
              </span>
            )}
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 sm:text-sm"
          >
            Vào ứng dụng
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
          >
            Đăng ký
          </Link>
        </>
      )}
    </div>
  );
}
