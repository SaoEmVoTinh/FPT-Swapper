"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  Ban,
  Calendar,
  CheckCircle2,
  Flame,
  GraduationCap,
  Heart,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  User,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ApiError, apiFetch } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { MatchItem, SwapInsights, ThreeWayCycle } from "@/types";

export default function DiscoverPage() {
  const {
    student,
    discoverCards,
    isAuthenticated,
    swipeCard,
    undoLastSwipe,
    blockStudent,
    refreshWorkspace,
    actionError,
    clearActionError,
  } = useAppState();

  const [matchedModal, setMatchedModal] = useState<MatchItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "cycles" | "insights">("cards");
  const [cycles, setCycles] = useState<ThreeWayCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(false);
  const [insights, setInsights] = useState<SwapInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [busyCycleKey, setBusyCycleKey] = useState<string | null>(null);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [likeFeedback, setLikeFeedback] = useState<string | null>(null);

  useEffect(() => {
    const courseParam = new URLSearchParams(window.location.search).get("course");
    if (courseParam) {
      queueMicrotask(() => setSearchQuery(courseParam));
    }
  }, []);

  const uniqueCourseCodes = useMemo(() => {
    const seen = new Set<string>();
    for (const card of discoverCards) {
      if (card.courseCode) seen.add(card.courseCode);
    }
    return Array.from(seen).slice(0, 6);
  }, [discoverCards]);

  const visibleCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return discoverCards.filter((c) => {
      if (onlyCompatible && !c.isCompatible) return false;
      if (!q) return true;
      return (
        c.courseCode.toLowerCase().includes(q) ||
        c.courseName.toLowerCase().includes(q) ||
        c.currentClassCode.toLowerCase().includes(q) ||
        c.targetClassCode.toLowerCase().includes(q) ||
        c.major.toLowerCase().includes(q) ||
        c.studentDisplayName.toLowerCase().includes(q)
      );
    });
  }, [discoverCards, onlyCompatible, searchQuery]);

  const compatibleCount = discoverCards.filter((c) => c.isCompatible).length;
  const currentCard = visibleCards[0];

  const handleSwipe = async (action: "LIKE" | "PASS") => {
    if (!currentCard || swiping) return;
    if (action === "LIKE" && currentCard.hasCourseConflict) return;
    clearActionError();
    setLikeFeedback(null);
    setShowDetails(false);
    setSwiping(true);
    try {
      const result = await swipeCard(currentCard.requestId, action);
      if (result.matched && result.match) {
        setMatchedModal(result.match);
      } else if (action === "LIKE") {
        setLikeFeedback(
          `Đã gửi Like cho ${currentCard.studentDisplayName} (${currentCard.courseCode}). Khi họ Like lại bạn, hai bạn sẽ Match!`,
        );
      }
    } finally {
      setSwiping(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchedModal || !currentCard || swiping) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        void handleSwipe("PASS");
      } else if (e.key === "ArrowRight" && !currentCard.hasCourseConflict) {
        e.preventDefault();
        void handleSwipe("LIKE");
      } else if (e.key.toLowerCase() === "i") {
        setShowDetails((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const fetchCycles = async (): Promise<ThreeWayCycle[]> => {
    if (!isAuthenticated) return [];
    return apiFetch<ThreeWayCycle[]>("/class-swap/cycles");
  };

  const loadCycles = async () => {
    if (!isAuthenticated) return;
    setCyclesLoading(true);
    try {
      const list = await fetchCycles();
      setCycles(list);
    } catch {
      // ignore cycle load error
    } finally {
      setCyclesLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode !== "cycles" || !isAuthenticated) return;
    let cancelled = false;
    apiFetch<ThreeWayCycle[]>("/class-swap/cycles")
      .then((list) => {
        if (!cancelled) setCycles(list);
      })
      .catch(() => {
        // ignore cycle load error
      })
      .finally(() => {
        if (!cancelled) setCyclesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, isAuthenticated]);

  useEffect(() => {
    if (viewMode !== "insights" || !isAuthenticated) return;
    let cancelled = false;
    apiFetch<SwapInsights>("/class-swap/insights")
      .then((res) => {
        if (!cancelled) setInsights(res);
      })
      .catch(() => {
        // ignore insights error
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, isAuthenticated]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshWorkspace();
      if (viewMode === "cycles" && isAuthenticated) {
        await loadCycles();
      } else if (viewMode === "insights" && isAuthenticated) {
        setInsightsLoading(true);
        const res = await apiFetch<SwapInsights>("/class-swap/insights");
        setInsights(res);
        setInsightsLoading(false);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleUndo = async () => {
    if (undoing || !isAuthenticated) return;
    clearActionError();
    setLikeFeedback(null);
    setUndoing(true);
    try {
      const ok = await undoLastSwipe();
      if (ok) {
        setLikeFeedback("Đã hoàn tác lượt vuốt gần nhất của bạn.");
      }
    } finally {
      setUndoing(false);
    }
  };

  const handleBlockCardOwner = async () => {
    if (!currentCard?.studentId || blocking) return;
    clearActionError();
    setBlocking(true);
    try {
      await blockStudent(currentCard.studentId, "Chặn từ Discover");
      setShowDetails(false);
      setLikeFeedback(`Đã chặn ${currentCard.studentDisplayName}. Tin của họ sẽ không hiển thị nữa.`);
    } catch {
      // handled by actionError
    } finally {
      setBlocking(false);
    }
  };

  const handleAcceptCycle = async (cycle: ThreeWayCycle) => {
    const key = `${cycle.req_a_id}-${cycle.req_b_id}-${cycle.req_c_id}`;
    setBusyCycleKey(key);
    clearActionError();
    try {
      const updated = await apiFetch<ThreeWayCycle>("/class-swap/cycles/accept", {
        method: "POST",
        body: JSON.stringify({
          req_a_id: cycle.req_a_id,
          req_b_id: cycle.req_b_id,
          req_c_id: cycle.req_c_id,
        }),
      });
      setCycles((prev) =>
        prev.map((c) =>
          `${c.req_a_id}-${c.req_b_id}-${c.req_c_id}` === key ? updated : c
        )
      );
      await refreshWorkspace();
      setLikeFeedback(
        updated.status === "CONFIRMED"
          ? "Cả 3 sinh viên đã xác nhận vòng đổi lớp! Nhóm chat 3 bên đã được tạo."
          : "Đã xác nhận tham gia vòng đổi 3 bên. Chờ 2 bạn còn lại đồng ý."
      );
    } catch (err) {
      setLikeFeedback(
        err instanceof ApiError ? err.message : "Không thể xác nhận vòng đổi 3 bên."
      );
    } finally {
      setBusyCycleKey(null);
    }
  };

  const handleDeclineCycle = async (proposalId: string) => {
    setBusyCycleKey(proposalId);
    try {
      await apiFetch(`/class-swap/cycles/${proposalId}/decline`, { method: "POST" });
      await Promise.all([loadCycles(), refreshWorkspace()]);
    } finally {
      setBusyCycleKey(null);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              <Flame className="h-6 w-6 text-orange-500" />
              Discover đổi lớp
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Tin đăng tại cơ sở{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {student.campusName}
              </span>{" "}
              ({visibleCards.length} tin)
            </p>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoing}
                title="Hoàn tác lượt vuốt gần nhất"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${undoing ? "animate-spin" : ""}`} />
                Hoàn tác
              </button>
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
            </div>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="space-y-2.5">
          {isAuthenticated && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode("cards");
                  setOnlyCompatible(false);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  viewMode === "cards" && !onlyCompatible
                    ? "bg-orange-500 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Tất cả trong campus ({discoverCards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("cards");
                  setOnlyCompatible(true);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  viewMode === "cards" && onlyCompatible
                    ? "bg-orange-500 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Khớp yêu cầu của tôi ({compatibleCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCyclesLoading(true);
                  setViewMode("cycles");
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  viewMode === "cycles"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25"
                }`}
              >
                <Repeat className="h-3.5 w-3.5" />
                Đổi vòng 3 bên (A→B→C→A)
              </button>
              <button
                type="button"
                onClick={() => {
                  setInsightsLoading(true);
                  setViewMode("insights");
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                  viewMode === "insights"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Gợi ý &amp; Heatmap
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã môn, tên môn, lớp, ngành..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {uniqueCourseCodes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {uniqueCourseCodes.map((code) => {
                const active =
                  searchQuery.trim().toLowerCase() === code.toLowerCase();
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSearchQuery(active ? "" : code)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? "bg-slate-900 text-white dark:bg-orange-500"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-orange-400 dark:hover:text-orange-300"
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {likeFeedback && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200">
            <span>{likeFeedback}</span>
            <button
              type="button"
              onClick={() => setLikeFeedback(null)}
              className="text-xs font-semibold underline"
            >
              Đóng
            </button>
          </div>
        )}

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

        {viewMode === "cycles" ? (
          <div className="space-y-4">
            {cyclesLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-violet-500" />
                Đang tìm chu trình đổi lớp 3 bên phù hợp...
              </div>
            ) : cycles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                <Repeat className="mx-auto h-8 w-8 text-violet-500" />
                <h2 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
                  Chưa có vòng đổi 3 bên A→B→C→A khả dụng
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Hệ thống tự động phát hiện khi có 3 sinh viên cùng môn &amp; cùng cơ sở tạo thành vòng khép kín.
                </p>
              </div>
            ) : (
              cycles.map((cycle) => {
                const key = `${cycle.req_a_id}-${cycle.req_b_id}-${cycle.req_c_id}`;
                const busy = busyCycleKey === key || busyCycleKey === cycle.proposal_id;
                return (
                  <div
                    key={cycle.proposal_id || key}
                    className="space-y-3 rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-500/30 dark:bg-slate-900"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {cycle.course_code} — {cycle.course_name}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Học kỳ: {cycle.semester_name}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          cycle.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                        }`}
                      >
                        {cycle.status === "CONFIRMED"
                          ? "Đã chốt 3 bên"
                          : cycle.status === "PENDING_CONFIRMATION"
                            ? "Đang chờ xác nhận"
                            : "Gợi ý chu trình"}
                      </span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {cycle.participants.map((p, idx) => (
                        <div
                          key={p.request_id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/70"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                            <span>
                              {idx === 0 ? "Bạn" : p.student_name}
                            </span>
                            <span
                              className={
                                p.accepted
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }
                            >
                              {p.accepted ? "✓ Đồng ý" : "Chờ"}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600 dark:text-slate-300">
                            {cycle.course_code} - {p.current_class_code} →{" "}
                            <span className="font-semibold text-violet-600 dark:text-violet-300">
                              {cycle.course_code} - {p.target_class_code}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {cycle.status === "CONFIRMED" && cycle.conversation_id && (
                        <Link
                          href={`/chat?conv=${encodeURIComponent(cycle.conversation_id)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Mở nhóm chat 3 bên
                        </Link>
                      )}
                      {!cycle.my_accepted && cycle.status !== "CONFIRMED" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAcceptCycle(cycle)}
                          className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                        >
                          {busy ? "Đang gửi..." : "Đồng ý tham gia vòng 3 bên"}
                        </button>
                      )}
                      {cycle.proposal_id && cycle.status === "PENDING_CONFIRMATION" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeclineCycle(cycle.proposal_id!)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/35 dark:text-rose-300 dark:hover:bg-rose-500/15"
                        >
                          Từ chối
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : viewMode === "insights" ? (
          <div className="space-y-5">
            {insightsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-emerald-500" />
                Đang phân tích gợi ý thông minh &amp; nhu cầu đổi lớp...
              </div>
            ) : (
              <>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Gợi ý thông minh phù hợp nhất ({insights?.recommendations.length ?? 0})
                    </h2>
                  </div>
                  {!insights || insights.recommendations.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Chưa có gợi ý nổi bật trong campus của bạn.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {insights.recommendations.map((rec) => (
                        <div
                          key={rec.request_id}
                          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                {rec.score}% phù hợp
                              </span>
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {rec.course_code} - {rec.current_class_code} → {rec.course_code} - {rec.target_class_code}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {rec.partner_name} ({rec.trust_score.toFixed(1)}★) • {rec.current_schedule_text}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {rec.reasons.map((rs) => (
                                <span
                                  key={rs}
                                  className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
                                >
                                  {rs}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(rec.course_code);
                              setViewMode("cards");
                            }}
                            className="shrink-0 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                          >
                            Xem thẻ
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Heatmap nhu cầu theo lớp / môn tại Campus
                  </h2>
                  {!insights || insights.heatmap.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Chưa đủ dữ liệu nhu cầu đang mở.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {insights.heatmap.map((h) => {
                        const maxAct = Math.max(1, ...insights.heatmap.map((x) => x.total_activity));
                        const pct = Math.max(12, Math.round((h.total_activity / maxAct) * 100));
                        return (
                          <div
                            key={h.class_id}
                            className="space-y-1.5 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {h.course_code} - {h.class_code}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  Muốn vào: {h.entering_count}
                                </span>
                                <span className="text-rose-600 dark:text-rose-400">
                                  Muốn ra: {h.leaving_count}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    h.heat_level === "HIGH"
                                      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                                      : h.heat_level === "MEDIUM"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                  }`}
                                >
                                  {h.heat_level === "HIGH" ? "Rất hot" : h.heat_level === "MEDIUM" ? "Sôi động" : "Ổn định"}
                                </span>
                              </div>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full ${
                                  h.heat_level === "HIGH"
                                    ? "bg-rose-500"
                                    : h.heat_level === "MEDIUM"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : !currentCard ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
              {searchQuery.trim()
                ? `Không tìm thấy tin đăng khớp "${searchQuery.trim()}"`
                : onlyCompatible
                  ? "Chưa có tin nào khớp đúng 2 chiều với yêu cầu của bạn"
                  : `Chưa có tin đăng mới tại ${student.campusName}`}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {searchQuery.trim()
                ? "Hãy xóa bộ lọc hoặc thử tìm kiếm theo mã môn khác."
                : onlyCompatible
                  ? "Bạn có thể chuyển sang tab 'Tất cả trong campus' để xem toàn bộ tin đăng đổi lớp tại cơ sở của mình."
                  : "Hãy tạo yêu cầu đổi lớp mới hoặc quay lại sau để xem tin đăng từ các sinh viên cùng cơ sở."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Xóa tìm kiếm
                </button>
              )}
              {onlyCompatible && discoverCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyCompatible(false)}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  Xem tất cả tin trong campus ({discoverCards.length})
                </button>
              )}
              <Link
                href="/requests?create=1"
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Tạo yêu cầu đổi lớp
              </Link>
              <Link
                href="/matches"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Xem Matches
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative">
            {visibleCards.length > 1 && (
              <div className="pointer-events-none absolute inset-x-4 -bottom-2.5 h-6 rounded-b-3xl border border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-800/80" />
            )}

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                    {currentCard.semesterName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-black/15 px-2.5 py-0.5 text-[11px] font-semibold">
                      1 / {visibleCards.length}
                    </span>
                    <span className="text-xs font-medium text-white/90">
                      {currentCard.campusName}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentCard.isReciprocalReady ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      Đã Like bạn — Like lại để Match ngay!
                    </span>
                  ) : currentCard.isCompatible ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold text-white">
                      Khớp ngược chiều với yêu cầu của bạn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                      Tin đăng trong campus {currentCard.campusName}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                  {currentCard.courseCode} - {currentCard.currentClassCode}
                </h2>
                <p className="text-sm text-white/90">
                  {currentCard.courseName}
                </p>
              </div>

              {/* Swap Comparison */}
              <div className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Lớp họ đang học
                    </span>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                      {currentCard.courseCode} - {currentCard.currentClassCode}
                    </p>
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {currentCard.currentScheduleText}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-500/35 dark:bg-orange-500/15">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-300">
                      Lớp họ muốn sang
                    </span>
                    <p className="mt-1 text-lg font-bold text-orange-700 dark:text-orange-300">
                      {currentCard.courseCode} - {currentCard.targetClassCode}
                    </p>
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-orange-900/80 dark:text-orange-200/80">
                      <ArrowLeftRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500 dark:text-orange-400" />
                      {currentCard.targetScheduleText}
                    </p>
                  </div>
                </div>

                {/* Minimal Profile */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {currentCard.studentDisplayName}{" "}
                          <span className="font-normal text-slate-400">
                            ({currentCard.studentCodeMasked})
                          </span>
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-current" />
                          {(currentCard.studentTrustScore ?? 5).toFixed(1)}
                          {(currentCard.studentCompletedSwaps ?? 0) > 0
                            ? ` • ${currentCard.studentCompletedSwaps} lần đổi`
                            : ""}
                        </span>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {currentCard.major}
                        {currentCard.studentClassName
                          ? ` • Lớp ${currentCard.studentClassName}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDetails((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Info className="h-3.5 w-3.5" />
                    {showDetails ? "Ẩn" : "Chi tiết"}
                  </button>
                </div>

                {currentCard.scheduleConflictWarning && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{currentCard.scheduleConflictWarning}</span>
                  </div>
                )}

                {showDetails && (
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                    <p>
                      Phòng học và giảng viên chi tiết sẽ tự động hiển thị trên thời khóa biểu web trường (FAP) sau khi hai bạn đổi lớp thành công.
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      Chỉ sinh viên trong cùng campus ({currentCard.campusName}) mới nhìn thấy bài đăng của nhau. Thông tin liên hệ cá nhân được ẩn trừ khi bật tùy chọn chia sẻ sau Match.
                    </p>
                    {isAuthenticated && currentCard.studentId && (
                      <div className="pt-1">
                        <button
                          type="button"
                          disabled={blocking}
                          onClick={handleBlockCardOwner}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {blocking ? "Đang chặn..." : "Chặn người dùng này"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {currentCard.note && (
                  <div className="rounded-xl bg-slate-50 p-3.5 text-sm italic text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    &ldquo;{currentCard.note}&rdquo;
                  </div>
                )}

                {/* Swipe Actions */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      disabled={swiping}
                      onClick={() => handleSwipe("PASS")}
                      className="flex h-14 w-32 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                    >
                      <X className="h-5 w-5" />
                      Bỏ qua
                    </button>
                    <button
                      type="button"
                      disabled={
                        swiping || Boolean(currentCard.hasCourseConflict)
                      }
                      onClick={() => handleSwipe("LIKE")}
                      title={
                        currentCard.hasCourseConflict
                          ? "Bạn đang có yêu cầu khác cho môn này"
                          : undefined
                      }
                      className="flex h-14 max-w-xs flex-1 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
                    >
                      {swiping ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Heart className="h-5 w-5 fill-current" />
                      )}
                      {currentCard.hasCourseConflict
                        ? "Đã có yêu cầu khác"
                        : currentCard.isCompatible
                          ? "Like để đổi"
                          : "Nhận đổi & Like"}
                    </button>
                  </div>
                  <p className="hidden text-center text-[11px] text-slate-400 sm:block">
                    Mẹo: Phím{" "}
                    <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      ←
                    </kbd>{" "}
                    Bỏ qua •{" "}
                    <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      →
                    </kbd>{" "}
                    Like •{" "}
                    <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      I
                    </kbd>{" "}
                    Chi tiết
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Match Modal */}
      {matchedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
              It&apos;s a Match!
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Bạn và{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {matchedModal.partnerName}
              </span>{" "}
              đã cùng Like yêu cầu đổi lớp môn{" "}
              <span className="font-semibold">{matchedModal.courseCode}</span> (
              {matchedModal.myClassCode} ⇄ {matchedModal.partnerClassCode}).
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href={
                  matchedModal.conversationId
                    ? `/chat?conv=${encodeURIComponent(matchedModal.conversationId)}`
                    : "/chat"
                }
                onClick={() => setMatchedModal(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <MessageSquare className="h-4 w-4" />
                Nhắn tin ngay
              </Link>
              <button
                type="button"
                onClick={() => setMatchedModal(null)}
                className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Tiếp tục Discover
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
