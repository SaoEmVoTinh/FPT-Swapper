"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Mail,
  Megaphone,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { NotificationItem } from "@/types";

interface NotificationPrefs {
  notify_email: boolean;
  notify_push: boolean;
  vapid_public_key?: string | null;
  push_subscriptions_count: number;
}

type NotificationFilter = "ALL" | "UNREAD" | "MATCH" | "MESSAGE" | "SYSTEM";

function getNotificationCategoryMeta(n: NotificationItem) {
  const text = `${n.title} ${n.body}`.toLowerCase();

  if (
    /cảnh cáo|vi phạm|báo cáo|tạm khóa|ban quản trị|đình chỉ/.test(text)
  ) {
    return {
      filterGroup: "SYSTEM" as const,
      label: "Cảnh báo • BQT",
      Icon: ShieldAlert,
      stripe: "border-l-4 border-l-rose-500",
      unreadBox:
        "border-rose-200 bg-rose-50/50 dark:border-rose-500/35 dark:bg-rose-500/10",
      iconBg: n.isRead
        ? "bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400"
        : "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
      badgeClass:
        "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    };
  }

  if (n.type === "MATCH") {
    const confirmed = /đồng thuận|hoàn tất|thành công/.test(text);
    return {
      filterGroup: "MATCH" as const,
      label: confirmed ? "Match • Đã đồng thuận" : "Match • Đổi lớp",
      Icon: confirmed ? CheckCircle2 : Sparkles,
      stripe: confirmed
        ? "border-l-4 border-l-emerald-500"
        : "border-l-4 border-l-orange-500",
      unreadBox: confirmed
        ? "border-emerald-200 bg-emerald-50/45 dark:border-emerald-500/35 dark:bg-emerald-500/10"
        : "border-orange-200 bg-orange-50/45 dark:border-orange-500/35 dark:bg-orange-500/10",
      iconBg: n.isRead
        ? confirmed
          ? "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400"
        : confirmed
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300",
      badgeClass: confirmed
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
        : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
    };
  }

  if (n.type === "MESSAGE") {
    return {
      filterGroup: "MESSAGE" as const,
      label: "Tin nhắn",
      Icon: MessageSquare,
      stripe: "border-l-4 border-l-sky-500",
      unreadBox:
        "border-sky-200 bg-sky-50/45 dark:border-sky-500/35 dark:bg-sky-500/10",
      iconBg: n.isRead
        ? "bg-sky-50 text-sky-500 dark:bg-sky-500/10 dark:text-sky-400"
        : "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
      badgeClass:
        "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    };
  }

  if (/hết hạn|nhắc nhở/.test(text)) {
    return {
      filterGroup: "SYSTEM" as const,
      label: "Nhắc nhở",
      Icon: Clock,
      stripe: "border-l-4 border-l-amber-500",
      unreadBox:
        "border-amber-200 bg-amber-50/45 dark:border-amber-500/35 dark:bg-amber-500/10",
      iconBg: n.isRead
        ? "bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400"
        : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
      badgeClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    };
  }

  return {
    filterGroup: "SYSTEM" as const,
    label: "Hệ thống",
    Icon: Megaphone,
    stripe: "border-l-4 border-l-indigo-500",
    unreadBox:
      "border-indigo-200 bg-indigo-50/45 dark:border-indigo-500/35 dark:bg-indigo-500/10",
    iconBg: n.isRead
      ? "bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400"
      : "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    badgeClass:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  };
}

export default function NotificationsPage() {
  const {
    notifications,
    isAuthenticated,
    markNotificationRead,
  } = useAppState();
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
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
        new Notification("FPT Swapper", {
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
  const categoryCounts = useMemo(() => {
    let match = 0;
    let message = 0;
    let system = 0;
    for (const item of notifications) {
      const grp = getNotificationCategoryMeta(item).filterGroup;
      if (grp === "MATCH") match += 1;
      else if (grp === "MESSAGE") message += 1;
      else system += 1;
    }
    return { match, message, system };
  }, [notifications]);

  const visibleNotifications = useMemo(() => {
    if (filter === "ALL") return notifications;
    if (filter === "UNREAD") return unreadList;
    return notifications.filter(
      (n) => getNotificationCategoryMeta(n).filterGroup === filter,
    );
  }, [filter, notifications, unreadList]);

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
          {unreadList.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300 sm:self-auto"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc tất cả
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "ALL" as const, label: `Tất cả (${notifications.length})` },
            { key: "UNREAD" as const, label: `Chưa đọc (${unreadList.length})` },
            {
              key: "MATCH" as const,
              label: `Match • Đổi lớp (${categoryCounts.match})`,
            },
            {
              key: "MESSAGE" as const,
              label: `Tin nhắn (${categoryCounts.message})`,
            },
            {
              key: "SYSTEM" as const,
              label: `Hệ thống & Cảnh báo (${categoryCounts.system})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? "bg-slate-900 text-white dark:bg-orange-500"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
              {filter === "UNREAD"
                ? "Bạn đã đọc hết tất cả thông báo."
                : "Chưa có thông báo nào trong mục này."}
            </div>
          ) : (
            visibleNotifications.map((n) => {
              const meta = getNotificationCategoryMeta(n);
              const Icon = meta.Icon;

              return (
                <div
                  key={n.id}
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 transition-colors ${meta.stripe} ${
                    n.isRead
                      ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      : meta.unreadBox
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        {!n.isRead && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Mới
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
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
