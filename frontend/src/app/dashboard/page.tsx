"use client";

import Link from "next/link";
import {
  ArrowRight,
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
    requests,
    discoverCards,
    matches,
    unreadMessagesCount,
  } = useAppState();

  const activeRequests = requests.filter((r) => r.status === "ACTIVE");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Xin chào, {student.fullName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {student.studentCode} • {student.campusName} • {student.major}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Tạo yêu cầu đổi lớp
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Flame className="h-4 w-4 text-orange-500" />
              Mở Discover ({discoverCards.length})
            </Link>
          </div>
        </div>

        <DisclaimerBanner compact />

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Yêu cầu đang mở</span>
              <ListChecks className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {activeRequests.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tổng {requests.length} yêu cầu đã tạo
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Ứng viên phù hợp</span>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {discoverCards.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sẵn sàng để bạn Like/Pass
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Matches hiện có</span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {matches.length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Đã ghép đôi hai chiều
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-sm font-medium">Tin nhắn chưa đọc</span>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {unreadMessagesCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Trao đổi 1-1 sau khi Match
            </p>
          </div>
        </div>

        {/* Two-column preview */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* My Active Requests */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Yêu cầu đổi lớp gần đây
              </h2>
              <Link
                href="/requests"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
              >
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {requests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900">
                        {req.courseCode}
                      </span>
                      <span className="text-xs text-slate-500">
                        {req.semesterName}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-medium">{req.currentClassCode}</span>{" "}
                      →{" "}
                      <span className="font-semibold text-orange-600">
                        {req.targetClassCode}
                      </span>
                    </p>
                  </div>
                  <RequestStatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Match mới nhất
              </h2>
              <Link
                href="/matches"
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
              >
                Quản lý Match <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {matches.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Chưa có Match nào. Hãy vào Discover để tìm người đổi lớp!
                </p>
              ) : (
                matches.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {m.partnerName} • {m.courseCode}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        {m.myClassCode} ⇄ {m.partnerClassCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MatchStatusBadge status={m.status} />
                      <Link
                        href="/chat"
                        className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
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

