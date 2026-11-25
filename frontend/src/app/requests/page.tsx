"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Flame, Pause, Play, PlusCircle, Search, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CreateRequestForm } from "@/components/CreateRequestForm";
import { RequestStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";
import { SwapRequestStatus } from "@/types";

type StatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "MATCHED";

function RequestsContent() {
  const searchParams = useSearchParams();
  const initialOpen = searchParams.get("create") === "1";

  const { requests, updateRequestStatus, actionError, clearActionError } =
    useAppState();
  const [showCreateForm, setShowCreateForm] = useState(initialOpen);
  const [createdBanner, setCreatedBanner] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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

      {createdBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
          <h1 className="text-2xl font-bold text-slate-900">
            Yêu cầu đổi lớp ({requests.length})
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo yêu cầu mới và quản lý trạng thái các yêu cầu đổi lớp của bạn
            trên cùng một trang
          </p>
        </div>

        {requests.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setCreatedBanner(false);
              setShowCreateForm((prev) => !prev);
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors ${
              showCreateForm
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  statusFilter === item.key
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Bạn chưa có yêu cầu đổi lớp nào. Hãy điền thông tin ở khung phía
            trên để đăng yêu cầu đầu tiên.
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Không có yêu cầu nào khớp bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
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
                  <>
                    <Link
                      href={`/discover?course=${encodeURIComponent(req.courseCode)}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                    >
                      <Flame className="h-3.5 w-3.5" />
                      Tìm đối tác
                    </Link>
                    <button
                      type="button"
                      onClick={() => updateRequestStatus(req.id, "PAUSED")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
  );
}

export default function MyRequestsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <RequestsContent />
      </Suspense>
    </AppShell>
  );
}
