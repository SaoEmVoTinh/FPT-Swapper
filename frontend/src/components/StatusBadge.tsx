import { MatchStatus, SwapRequestStatus } from "@/types";

const REQUEST_STATUS_MAP: Record<
  SwapRequestStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Nháp", className: "bg-slate-100 text-slate-700 border-slate-200" },
  ACTIVE: { label: "Đang mở", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PAUSED: { label: "Tạm ẩn", className: "bg-amber-50 text-amber-700 border-amber-200" },
  MATCHED: { label: "Đã Match", className: "bg-orange-50 text-orange-700 border-orange-200" },
  COMPLETED: { label: "Hoàn tất", className: "bg-blue-50 text-blue-700 border-blue-200" },
  CANCELLED: { label: "Đã hủy", className: "bg-rose-50 text-rose-700 border-rose-200" },
  EXPIRED: { label: "Hết hạn", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

const MATCH_STATUS_MAP: Record<
  MatchStatus,
  { label: string; className: string }
> = {
  PENDING_CONFIRMATION: {
    label: "Chờ xác nhận",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DECLINED: {
    label: "Đã từ chối",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  COMPLETED: {
    label: "Đã hoàn tất",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
};

export function RequestStatusBadge({ status }: { status: SwapRequestStatus }) {
  const cfg = REQUEST_STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const cfg = MATCH_STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

