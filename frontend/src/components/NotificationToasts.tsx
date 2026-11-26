"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";

export interface ToastNotice {
  id: string;
  notificationId?: string;
  type: "MATCH" | "MESSAGE" | "SYSTEM";
  title: string;
  body: string;
  href?: string;
}

function getToastStyle(t: ToastNotice) {
  const text = `${t.title} ${t.body}`.toLowerCase();
  if (/cảnh cáo|vi phạm|báo cáo|tạm khóa|ban quản trị|đình chỉ/.test(text)) {
    return {
      label: "Cảnh báo • BQT",
      Icon: ShieldAlert,
      border: "border-rose-200 border-l-rose-500 dark:border-rose-500/40 dark:border-l-rose-500",
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    };
  }
  if (t.type === "MATCH") {
    const confirmed = /đồng thuận|hoàn tất|thành công/.test(text);
    return {
      label: "Match • Đổi lớp",
      Icon: confirmed ? CheckCircle2 : Sparkles,
      border: confirmed
        ? "border-emerald-200 border-l-emerald-500 dark:border-emerald-500/40 dark:border-l-emerald-500"
        : "border-orange-200 border-l-orange-500 dark:border-orange-500/40 dark:border-l-orange-500",
      iconBg: confirmed
        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
      badge: confirmed
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
    };
  }
  if (t.type === "MESSAGE") {
    return {
      label: "Tin nhắn mới",
      Icon: MessageSquare,
      border: "border-sky-200 border-l-sky-500 dark:border-sky-500/40 dark:border-l-sky-500",
      iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
      badge: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    };
  }
  return {
    label: "Hệ thống",
    Icon: Megaphone,
    border: "border-indigo-200 border-l-indigo-500 dark:border-indigo-500/40 dark:border-l-indigo-500",
    iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  };
}

export function NotificationToasts({
  toasts,
  onDismiss,
  onSelect,
}: {
  toasts: ToastNotice[];
  onDismiss: (id: string) => void;
  onSelect?: (toast: ToastNotice) => void;
}) {
  const router = useRouter();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Thông báo mới"
      className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2.5 md:bottom-5"
    >
      {toasts.map((toast) => {
        const style = getToastStyle(toast);
        const Icon = style.Icon;
        return (
          <div
            key={toast.id}
            role="status"
            onClick={() => {
              onSelect?.(toast);
              onDismiss(toast.id);
              if (toast.href) {
                router.push(toast.href);
              }
            }}
            className={`pointer-events-auto flex cursor-pointer items-start gap-3 rounded-2xl border border-l-4 bg-white/95 p-3.5 shadow-xl backdrop-blur transition-all hover:translate-y-[-1px] dark:bg-slate-900/95 ${style.border}`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${style.badge}`}
              >
                {style.label}
              </span>
              <p className="mt-1 truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                {toast.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                {toast.body}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              aria-label="Đóng thông báo"
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
