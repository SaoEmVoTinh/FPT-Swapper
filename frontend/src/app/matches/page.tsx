"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCheck,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MatchStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";
import { MatchStatus } from "@/types";

type MatchFilter = "ALL" | "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED";

export default function MatchesPage() {
  const {
    matches,
    isAuthenticated,
    updateMatchStatus,
    refreshWorkspace,
    actionError,
    clearActionError,
  } = useAppState();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MatchFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(
    () => ({
      ALL: matches.length,
      PENDING_CONFIRMATION: matches.filter(
        (m) => m.status === "PENDING_CONFIRMATION",
      ).length,
      CONFIRMED: matches.filter((m) => m.status === "CONFIRMED").length,
      COMPLETED: matches.filter((m) => m.status === "COMPLETED").length,
    }),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return matches.filter((m) => {
      if (
        statusFilter !== "ALL" &&
        m.status !== (statusFilter as MatchStatus)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        m.partnerName.toLowerCase().includes(q) ||
        m.courseCode.toLowerCase().includes(q) ||
        m.myClassCode.toLowerCase().includes(q) ||
        m.partnerClassCode.toLowerCase().includes(q)
      );
    });
  }, [matches, statusFilter, searchQuery]);

  const handleAction = async (
    matchId: string,
    action: "confirm" | "decline" | "complete",
  ) => {
    clearActionError();
    setBusyId(matchId);
    try {
      await updateMatchStatus(matchId, action);
    } finally {
      setBusyId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  };

  const filterTabs: Array<{ key: MatchFilter; label: string }> = [
    { key: "ALL", label: `Tất cả (${counts.ALL})` },
    {
      key: "PENDING_CONFIRMATION",
      label: `Chờ xác nhận (${counts.PENDING_CONFIRMATION})`,
    },
    { key: "CONFIRMED", label: `Đã xác nhận (${counts.CONFIRMED})` },
    { key: "COMPLETED", label: `Hoàn tất (${counts.COMPLETED})` },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Danh sách Matches ({matches.length})
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Trao đổi qua chat, xác nhận đồng thuận và hoàn tất thủ tục đổi
              lớp
            </p>
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          )}
        </div>

        <DisclaimerBanner compact />

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

        {matches.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {filterTabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                    statusFilter === item.key
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
                placeholder="Tìm đối tác, môn, mã lớp..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bạn chưa có Match nào. Hãy vào Discover để Like các yêu cầu phù
              hợp.
            </p>
            <Link
              href="/discover"
              className="mt-4 inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Mở Discover
            </Link>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Không có Match nào khớp bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMatches.map((m) => {
              const isBusy = busyId === m.id;
              const bothConfirmed = m.myConfirmed && m.partnerConfirmed;
              const isCompleted = m.status === "COMPLETED";

              return (
                <div
                  key={m.id}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {m.partnerName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {m.partnerCampus}
                        </span>
                        <MatchStatusBadge status={m.status} />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {m.courseCode} — {m.courseName} ({m.semesterName})
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Trao đổi:{" "}
                        <span className="rounded-md bg-orange-50 px-2 py-0.5 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                          {m.myClassCode}
                        </span>{" "}
                        ⇄{" "}
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {m.partnerClassCode}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={
                          m.conversationId
                            ? `/chat?conv=${encodeURIComponent(m.conversationId)}`
                            : "/chat"
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Mở Chat
                      </Link>

                      {m.status === "PENDING_CONFIRMATION" &&
                        !m.myConfirmed && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleAction(m.id, "confirm")}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Xác nhận đổi
                          </button>
                        )}

                      {m.status === "CONFIRMED" && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAction(m.id, "complete")}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="h-3.5 w-3.5" />
                          )}
                          Đánh dấu hoàn tất
                        </button>
                      )}

                      {(m.status === "PENDING_CONFIRMATION" ||
                        m.status === "CONFIRMED") && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAction(m.id, "decline")}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/35 dark:text-rose-300 dark:hover:bg-rose-500/15"
                        >
                          <X className="h-3.5 w-3.5" />
                          Từ chối
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stepper progress bar */}
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] dark:bg-emerald-500/20">
                        1
                      </span>
                      Đã ghép đôi
                    </div>
                    <div
                      className={`flex items-center gap-1.5 font-semibold ${
                        bothConfirmed
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          bothConfirmed
                            ? "bg-emerald-100 dark:bg-emerald-500/20"
                            : "bg-amber-100 dark:bg-amber-500/20"
                        }`}
                      >
                        2
                      </span>
                      Bạn ({m.myConfirmed ? "OK" : "Chưa"}) • Đối tác (
                      {m.partnerConfirmed ? "OK" : "Chưa"})
                    </div>
                    <div
                      className={`flex items-center gap-1.5 font-semibold ${
                        isCompleted
                          ? "text-blue-700 dark:text-blue-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          isCompleted
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        }`}
                      >
                        3
                      </span>
                      {isCompleted ? "Đã hoàn tất đổi lớp" : "Chờ hoàn tất"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
