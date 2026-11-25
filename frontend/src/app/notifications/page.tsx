"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { playNotificationBell } from "@/lib/sound";

interface NotificationPrefs {
  notify_email: boolean;
  notify_push: boolean;
  vapid_public_key?: string | null;
  push_subscriptions_count: number;
}

export default function NotificationsPage() {
  const {
    notifications,
    isAuthenticated,
    markNotificationRead,
    soundEnabled,
    toggleSound,
  } = useAppState();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    notify_email: true,
    notify_push: true,
    push_subscriptions_count: 0,
  });
  const [prefNotice, setPrefNotice] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    apiFetch<NotificationPrefs>("/notifications/preferences")
      .then((data) => {
        if (!cancelled) setPrefs(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const updatePref = async (patch: Partial<Pick<NotificationPrefs, "notify_email" | "notify_push">>) => {
    setSavingPrefs(true);
    setPrefNotice(null);
    try {
      const updated = await apiFetch<NotificationPrefs>("/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      setPrefs(updated);
      setPrefNotice("Đã lưu tùy chọn thông báo ngoài app.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleEnableBrowserPush = async () => {
    setPrefNotice(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPrefNotice("Trình duyệt hiện tại không hỗ trợ Web Push.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setPrefNotice("Bạn chưa cấp quyền thông báo cho trình duyệt.");
      return;
    }
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const json = sub.toJSON();
          if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
            await apiFetch("/notifications/push-subscriptions", {
              method: "POST",
              body: JSON.stringify({
                endpoint: json.endpoint,
                keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
                user_agent: navigator.userAgent.slice(0, 200),
              }),
            });
          }
        }
      }
      await updatePref({ notify_push: true });
      setPrefNotice("Đã bật thông báo trình duyệt / Web Push thành công.");
    } catch {
      setPrefNotice("Đã cấp quyền thông báo trình duyệt.");
    }
  };

  const handleTestDispatch = async () => {
    setPrefNotice(null);
    try {
      const res = await apiFetch<{ email_sent: boolean; push_targets: number }>(
        "/notifications/test-dispatch",
        { method: "POST" },
      );
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("FPT ClassSwap", {
          body: "Thông báo thử nghiệm hoạt động bình thường!",
          icon: "/fpt-logo2.png",
        });
      }
      setPrefNotice(
        `Đã kiểm tra kênh ngoài app (Email SMTP: ${res.email_sent ? "Đã gửi" : "Sẵn sàng khi cấu hình SMTP"} • Push endpoints: ${res.push_targets}).`,
      );
    } catch {
      setPrefNotice("Không thể gửi kiểm tra thông báo.");
    }
  };

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

        {isAuthenticated && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Thông báo ngoài ứng dụng (Email &amp; Web Push)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nhận cảnh báo ngay khi có Like, Match mới hoặc tin nhắn khi bạn đóng tab.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestDispatch}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Send className="h-3.5 w-3.5 text-orange-500" />
                Kiểm tra gửi
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={prefs.notify_email}
                  disabled={savingPrefs}
                  onChange={(e) => void updatePref({ notify_email: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500"
                />
                <Mail className="h-3.5 w-3.5 text-orange-500" />
                Email thông báo
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={prefs.notify_push}
                  disabled={savingPrefs}
                  onChange={(e) => void updatePref({ notify_push: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500"
                />
                <BellRing className="h-3.5 w-3.5 text-orange-500" />
                Web Push
              </label>
              <button
                type="button"
                onClick={handleEnableBrowserPush}
                className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
              >
                Cấp quyền Push trình duyệt
              </button>
            </div>
            {prefNotice && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {prefNotice}
              </p>
            )}
          </div>
        )}

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
