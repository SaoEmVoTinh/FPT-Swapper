"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Pause, Play, PlusCircle, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { CreateRequestForm } from "@/components/CreateRequestForm";
import { RequestStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";

function RequestsContent() {
  const searchParams = useSearchParams();
  const initialOpen = searchParams.get("create") === "1";

  const { requests, updateRequestStatus, actionError, clearActionError } =
    useAppState();
  const [showCreateForm, setShowCreateForm] = useState(initialOpen);
  const [createdBanner, setCreatedBanner] = useState(false);

  const isFormOpen = showCreateForm || requests.length === 0;

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

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Bạn chưa có yêu cầu đổi lớp nào. Hãy điền thông tin ở khung phía
            trên để đăng yêu cầu đầu tiên.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
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
