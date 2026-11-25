"use client";

import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";

export default function NotificationsPage() {
  const { notifications, markNotificationRead } = useAppState();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thông báo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cập nhật về Match mới, tin nhắn và thông báo hệ thống
          </p>
        </div>

        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                n.isRead
                  ? "border-slate-200 bg-white"
                  : "border-orange-200 bg-orange-50/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    n.isRead
                      ? "bg-slate-100 text-slate-500"
                      : "bg-orange-100 text-orange-600"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                    <span>{n.createdAt}</span>
                    {n.href && (
                      <Link
                        href={n.href}
                        className="font-semibold text-orange-600 hover:underline"
                      >
                        Xem chi tiết
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => markNotificationRead(n.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Đã đọc
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

