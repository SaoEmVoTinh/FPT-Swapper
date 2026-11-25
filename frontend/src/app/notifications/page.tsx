"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { playNotificationBell } from "@/lib/sound";

export default function NotificationsPage() {
  const { notifications, markNotificationRead, soundEnabled, toggleSound } =
    useAppState();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const unreadList = useMemo(
    () => notifications.filter((n) => !n.isRead),
    [notifications],
  );
  const visibleNotifications = onlyUnread ? unreadList : notifications;

  const handleMarkAllRead = () => {
    for (const item of unreadList) {
      markNotificationRead(item.id);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Thông báo ({unreadList.length} chưa đọc)
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cập nhật về Match mới, tin nhắn và thông báo hệ thống
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unreadList.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đọc tất cả
              </button>
            )}
            <button
              type="button"
              onClick={() => playNotificationBell("notification", true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Bell className="h-3.5 w-3.5 text-orange-500" />
              Nghe thử chuông
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                soundEnabled
                  ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-300"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              {soundEnabled ? "Chuông: Bật" : "Chuông: Tắt"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOnlyUnread(false)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              !onlyUnread
                ? "bg-slate-900 text-white dark:bg-orange-500"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Tất cả ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setOnlyUnread(true)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
              onlyUnread
                ? "bg-slate-900 text-white dark:bg-orange-500"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            Chưa đọc ({unreadList.length})
          </button>
        </div>

        <div className="space-y-3">
          {visibleNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {onlyUnread
                ? "Bạn đã đọc hết tất cả thông báo."
                : "Chưa có thông báo nào."}
            </div>
          ) : (
            visibleNotifications.map((n) => {
              const Icon =
                n.type === "MATCH"
                  ? Sparkles
                  : n.type === "MESSAGE"
                    ? MessageSquare
                    : Bell;
              const iconBg = n.isRead
                ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                : n.type === "MESSAGE"
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                  : "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400";

              return (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                    n.isRead
                      ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      : "border-orange-200 bg-orange-50/40 dark:border-orange-500/35 dark:bg-orange-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {n.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {n.body}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                        <span>{n.createdAt}</span>
                        {n.href && (
                          <Link
                            href={n.href}
                            className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
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
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Đã đọc
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
