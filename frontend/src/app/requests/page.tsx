"use client";

import Link from "next/link";
import { Pause, Play, PlusCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequestStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";

export default function MyRequestsPage() {
  const { requests, updateRequestStatus, actionError, clearActionError } = useAppState();

  return (
    <AppShell>
      <div className="space-y-6">
        {actionError && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={clearActionError}
              className="text-xs font-semibold underline"
            >
              Đóng
            </button>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Yêu cầu đổi lớp của tôi
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý trạng thái các yêu cầu đổi lớp bạn đã tạo
            </p>
          </div>
          <Link
            href="/requests/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Tạo yêu cầu mới
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">
              Bạn chưa có yêu cầu đổi lớp nào.
            </p>
            <Link
              href="/requests/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Tạo yêu cầu đầu tiên
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-bold text-slate-900">
                      {req.courseCode} — {req.courseName}
                    </span>
                    <RequestStatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-slate-600">
                    Học kỳ:{" "}
                    <span className="font-medium text-slate-800">
                      {req.semesterName}
                    </span>{" "}
                    • Hạn:{" "}
                    <span className="font-medium text-slate-800">
                      {req.expiresAt}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-800">
                      Hiện tại: {req.currentClassCode}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-lg bg-orange-50 px-2.5 py-1 font-semibold text-orange-700">
                      Mong muốn: {req.targetClassCode}
                    </span>
                  </div>
                  {req.note && (
                    <p className="text-xs italic text-slate-500">
                      Ghi chú: {req.note}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {req.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, "PAUSED")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Tạm ẩn
                    </button>
                  )}
                  {req.status === "PAUSED" && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, "ACTIVE")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Mở lại
                    </button>
                  )}
                  {(req.status === "ACTIVE" || req.status === "PAUSED") && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, "CANCELLED")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

