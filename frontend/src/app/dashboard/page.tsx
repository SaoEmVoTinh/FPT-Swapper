"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Flame,
  ListChecks,
  MessageSquare,
  PlusCircle,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MatchStatusBadge, RequestStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";

export default function DashboardPage() {
  const {
    student,
    isAuthenticated,
    requests,
    discoverCards,
    matches,
    unreadMessagesCount,
  } = useAppState();

  const activeRequests = requests.filter((r) => r.status === "ACTIVE");
  const hasAnyRequest = requests.length > 0;
  const hasAnyMatch = matches.length > 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {!isAuthenticated && (
          <div className="flex flex-col gap-3 rounded-2xl border border-orange-200 bg-orange-50/80 p-4 dark:border-orange-500/35 dark:bg-orange-500/15 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-orange-900 dark:text-orange-200">
              Bạn đang xem ở chế độ khách. Hãy đăng nhập hoặc đăng ký để đồng
              bộ dữ liệu thật từ hệ thống.
            </p>
            <div className="flex shrink-0 gap-2">
              <Link
                href="/login"
                className="rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-orange-300 bg-white px-3.5 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-500/40 dark:bg-slate-900 dark:text-orange-300 dark:hover:bg-slate-800"
              >
                Đăng ký
              </Link>
            </div>
          </div>
        )}

        {/* Hero Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/60 p-6 shadow-sm dark:border-orange-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-orange-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                {student.campusName}
                {student.className ? ` • Lớp ${student.className}` : ""} • {student.major}
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Xin chào, {student.fullName}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isAuthenticated
                  ? `Mã sinh viên ${student.studentCode} • Sẵn sàng ghép đôi đổi lớp`
                  : "Chế độ xem trước • Đăng nhập tài khoản sinh viên để lưu & ghép lớp"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/requests?create=1"
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-600"
              >
                <PlusCircle className="h-4 w-4" />
                Tạo yêu cầu đổi lớp
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Flame className="h-4 w-4 text-orange-500" />
                Mở Discover ({discoverCards.length})
              </Link>
            </div>
          </div>
        </div>

        <DisclaimerBanner compact />

        {/* Quick Onboarding Checklist when user hasn't finished setup */}
        {isAuthenticated && (!hasAnyRequest || !hasAnyMatch) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Bắt đầu nhanh trong 3 bước
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Link
                href="/requests?create=1"
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/40 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10"
              >
                {hasAnyRequest ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    1. Đăng tin đổi lớp
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {hasAnyRequest
                      ? `Đã tạo ${requests.length} yêu cầu`
                      : "Chọn môn, lớp đang học và lớp muốn đổi"}
                  </p>
                </div>
              </Link>

              <Link
                href="/discover"
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/40 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10"
              >
                <Flame className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    2. Quẹt Discover
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {discoverCards.length} tin đang mở tại {student.campusName}
                  </p>
                </div>
              </Link>

              <Link
                href="/matches"
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:border-orange-200 hover:bg-orange-50/40 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10"
              >
                {hasAnyMatch ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    3. Match 2 chiều &amp; Chat
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Cả 2 cùng Like sẽ mở phòng chat ngay
                  </p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Clickable Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/requests"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/40"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-sm font-medium">Yêu cầu đang mở</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500 group-hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-400">
                <ListChecks className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {activeRequests.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tổng {requests.length} yêu cầu đã tạo
            </p>
          </Link>

          <Link
            href="/discover"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/40"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-sm font-medium">Tin trong campus</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-orange-500 group-hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400">
                <Flame className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {discoverCards.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Sẵn sàng để bạn Like/Pass
            </p>
          </Link>

          <Link
            href="/matches"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/40"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-sm font-medium">Matches hiện có</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {matches.length}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Đã ghép đôi hai chiều
            </p>
          </Link>

          <Link
            href="/chat"
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/40"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-sm font-medium">Tin nhắn chưa đọc</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-400">
                <MessageSquare className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
              {unreadMessagesCount}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Trao đổi 1-1 sau khi Match
            </p>
          </Link>
        </div>

        {/* Two-column preview */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Active Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Yêu cầu đổi lớp gần đây
              </h2>
              <Link
                href="/requests"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                Quản lý &amp; tạo mới <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {requests.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Bạn chưa có yêu cầu nào. Hãy tạo yêu cầu đầu tiên!
                </p>
              ) : (
                requests.slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {req.courseCode}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {req.semesterName}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium">
                          {req.courseCode} - {req.currentClassCode}
                        </span>{" "}
                        →{" "}
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {req.targetClassCode
                            ? `${req.courseCode} - ${req.targetClassCode}`
                            : "Lớp khác bất kỳ"}
                        </span>
                      </p>
                    </div>
                    <RequestStatusBadge status={req.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Match mới nhất
              </h2>
              <Link
                href="/matches"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                Quản lý Match <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {matches.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Chưa có Match nào. Hãy vào Discover để tìm người đổi lớp!
                </p>
              ) : (
                matches.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/60"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {m.partnerName} • {m.courseCode}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {m.courseCode} - {m.myClassCode} ⇄ {m.courseCode} - {m.partnerClassCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MatchStatusBadge status={m.status} />
                      <Link
                        href={
                          m.conversationId
                            ? `/chat?conv=${encodeURIComponent(m.conversationId)}`
                            : "/chat"
                        }
                        className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                      >
                        Chat
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
