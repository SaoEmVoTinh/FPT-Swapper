"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Flame,
  Pause,
  Play,
  PlusCircle,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CreateRequestForm } from "@/components/CreateRequestForm";
import { RequestStatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { SwapRequestStatus, TimetableSlot } from "@/types";

type StatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "MATCHED";

const TKB_DAYS = [
  { key: "T2", label: "Thứ 2" },
  { key: "T3", label: "Thứ 3" },
  { key: "T4", label: "Thứ 4" },
  { key: "T5", label: "Thứ 5" },
  { key: "T6", label: "Thứ 6" },
  { key: "T7", label: "Thứ 7" },
];

export default function MyRequestsPage() {
  const {
    requests,
    isAuthenticated,
    updateRequestStatus,
    actionError,
    clearActionError,
  } = useAppState();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTimetable, setShowTimetable] = useState(false);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [createdBanner, setCreatedBanner] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!showTimetable || !isAuthenticated) return;
    let cancelled = false;
    apiFetch<TimetableSlot[]>("/class-swap/timetable")
      .then((rows) => {
        if (!cancelled) setTimetableSlots(rows);
      })
      .catch(() => { });
    return () => {
      cancelled = true;
    };
  }, [showTimetable, isAuthenticated, requests]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      queueMicrotask(() => setShowCreateForm(true));
    }
  }, []);

  const isFormOpen = showCreateForm || requests.length === 0;

  const counts = useMemo(
    () => ({
      ALL: requests.length,
      ACTIVE: requests.filter((r) => r.status === "ACTIVE").length,
      PAUSED: requests.filter((r) => r.status === "PAUSED").length,
      MATCHED: requests.filter((r) => r.status === "MATCHED").length,
    }),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((req) => {
      if (
        statusFilter !== "ALL" &&
        req.status !== (statusFilter as SwapRequestStatus)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        req.courseCode.toLowerCase().includes(q) ||
        req.courseName.toLowerCase().includes(q) ||
        req.currentClassCode.toLowerCase().includes(q) ||
        req.targetClassCode.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, searchQuery]);

  const filterTabs: Array<{ key: StatusFilter; label: string }> = [
    { key: "ALL", label: `Tất cả (${counts.ALL})` },
    { key: "ACTIVE", label: `Đang mở (${counts.ACTIVE})` },
    { key: "PAUSED", label: `Tạm ẩn (${counts.PAUSED})` },
    { key: "MATCHED", label: `Đã Match (${counts.MATCHED})` },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {actionError && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200">
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

        {createdBanner && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200">
            <span>Đã tạo yêu cầu đổi lớp mới thành công.</span>
            <button
              type="button"
              onClick={() => setCreatedBanner(false)}
              className="text-xs font-semibold underline"
            >
              Đóng
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Yêu cầu đổi lớp ({requests.length})
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tạo yêu cầu mới và quản lý trạng thái các yêu cầu đổi lớp của bạn
              trên cùng một trang
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTimetable((prev) => !prev)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${showTimetable
                ? "bg-slate-900 text-white dark:bg-slate-700"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
            >
              <CalendarDays className="h-4 w-4" />
              {showTimetable ? "Ẩn TKB tuần" : "Xem TKB tuần"}
            </button>
            {requests.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCreatedBanner(false);
                  setShowCreateForm((prev) => !prev);
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors ${showCreateForm
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
              >
                {showCreateForm ? (
                  <>
                    <X className="h-4 w-4" />
                    Đóng form tạo
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Tạo yêu cầu mới
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {showTimetable && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Thời khóa biểu tuần hiện tại của bạn
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Phòng học &amp; giảng viên sẽ hiện đầy đủ trên web trường (FAP) sau khi đổi thành công
              </span>
            </div>
            {timetableSlots.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chưa có dữ liệu lịch học chi tiết cho các lớp hiện tại.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TKB_DAYS.map((day) => {
                  const dayItems = timetableSlots.filter((s) => s.day_key === day.key);
                  return (
                    <div
                      key={day.key}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {day.label}
                      </p>
                      {dayItems.length === 0 ? (
                        <p className="mt-1.5 text-[11px] text-slate-400">Trống</p>
                      ) : (
                        <div className="mt-2 space-y-1.5">
                          {dayItems.map((slot, idx) => (
                            <div
                              key={`${slot.class_code}-${slot.slot_key}-${idx}`}
                              className="rounded-lg border border-orange-200 bg-white px-2.5 py-2 text-xs dark:border-orange-500/30 dark:bg-slate-900"
                            >
                              <p className="font-bold text-orange-600 dark:text-orange-400">
                                {slot.course_code} - {slot.class_code}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                {slot.slot_label}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isFormOpen && (
          <CreateRequestForm
            onCreated={() => {
              setShowCreateForm(false);
              setCreatedBanner(true);
            }}
            onCancel={
              requests.length > 0 ? () => setShowCreateForm(false) : undefined
            }
          />
        )}

        {requests.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${statusFilter === item.key
                    ? "bg-slate-900 text-white dark:bg-orange-500"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc theo môn hoặc lớp..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bạn chưa có yêu cầu đổi lớp nào. Hãy điền thông tin ở khung phía
              trên để đăng yêu cầu đầu tiên.
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Không có yêu cầu nào khớp bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {req.courseCode} — {req.courseName}
                    </span>
                    <RequestStatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Học kỳ:{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {req.semesterName}
                    </span>{" "}
                    • Hạn:{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {req.expiresAt}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      Hiện tại: {req.courseCode} - {req.currentClassCode}
                      {req.currentScheduleText && !req.currentScheduleText.startsWith("Theo TKB")
                        ? ` (${req.currentScheduleText})`
                        : ""}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-lg bg-orange-50 px-2.5 py-1 font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                      Mong muốn: {req.courseCode} - {req.targetClassCode}
                      {req.targetScheduleText && !req.targetScheduleText.startsWith("Theo TKB")
                        ? ` (${req.targetScheduleText})`
                        : ""}
                    </span>
                  </div>
                  {req.scheduleConflictWarning && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {req.scheduleConflictWarning}
                    </div>
                  )}
                  {req.note && (
                    <p className="text-xs italic text-slate-500 dark:text-slate-400">
                      Ghi chú: {req.note}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {req.status === "ACTIVE" && (
                    <>
                      <Link
                        href={`/discover?course=${encodeURIComponent(req.courseCode)}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-300 dark:hover:bg-orange-500/25"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        Tìm đối tác
                      </Link>
                      <button
                        type="button"
                        onClick={() => updateRequestStatus(req.id, "PAUSED")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        Tạm ẩn
                      </button>
                    </>
                  )}
                  {req.status === "PAUSED" && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, "ACTIVE")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Mở lại
                    </button>
                  )}
                  {(req.status === "ACTIVE" || req.status === "PAUSED") && (
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, "CANCELLED")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/35 dark:text-rose-300 dark:hover:bg-rose-500/15"
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
