"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
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
  Sparkles,
  User,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/app-state";
import { MatchItem } from "@/types";

export default function DiscoverPage() {
  const {
    student,
    discoverCards,
    isAuthenticated,
    swipeCard,
    refreshWorkspace,
    actionError,
    clearActionError,
  } = useAppState();
  const [matchedModal, setMatchedModal] = useState<MatchItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [likeFeedback, setLikeFeedback] = useState<string | null>(null);

  const visibleCards = onlyCompatible
    ? discoverCards.filter((c) => c.isCompatible)
    : discoverCards;
  const compatibleCount = discoverCards.filter((c) => c.isCompatible).length;
  const currentCard = visibleCards[0];

  const handleSwipe = async (action: "LIKE" | "PASS") => {
    if (!currentCard || swiping) return;
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
          `Đã gửi Like cho ${currentCard.studentDisplayName} (${currentCard.courseCode}). Khi họ Like lại bạn, hai bạn sẽ Match!`
        );
      }
    } finally {
      setSwiping(false);
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

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Flame className="h-6 w-6 text-orange-500" />
              Discover đổi lớp
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tin đăng tại cơ sở{" "}
              <span className="font-semibold text-slate-700">
                {student.campusName}
              </span>{" "}
              ({visibleCards.length} tin)
            </p>
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          )}
        </div>

        {/* Filter bar: All campus posts vs compatible with my requests */}
        {isAuthenticated && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOnlyCompatible(false)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                !onlyCompatible
                  ? "bg-orange-500 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Tất cả trong campus ({discoverCards.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyCompatible(true)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                onlyCompatible
                  ? "bg-orange-500 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Khớp yêu cầu của tôi ({compatibleCount})
            </button>
          </div>
        )}

        {likeFeedback && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
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

        {!currentCard ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {onlyCompatible
                ? "Chưa có tin nào khớp đúng 2 chiều với yêu cầu của bạn"
                : `Chưa có tin đăng mới tại ${student.campusName}`}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {onlyCompatible
                ? "Bạn có thể chuyển sang tab 'Tất cả trong campus' để xem toàn bộ tin đăng đổi lớp tại cơ sở của mình."
                : "Hãy tạo yêu cầu đổi lớp mới hoặc quay lại sau để xem tin đăng từ các sinh viên cùng cơ sở."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
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
                href="/requests/new"
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Tạo yêu cầu đổi lớp
              </Link>
              <Link
                href="/matches"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xem Matches
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {currentCard.semesterName}
                </span>
                <span className="text-xs font-medium text-white/90">
                  {currentCard.campusName}
                </span>
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
                {currentCard.courseCode}
              </h2>
              <p className="text-sm text-white/90">{currentCard.courseName}</p>
            </div>

            {/* Swap Comparison */}
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Lớp họ đang học
                  </span>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {currentCard.currentClassCode}
                  </p>
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {currentCard.currentScheduleText}
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
                    Lớp họ muốn sang
                  </span>
                  <p className="mt-1 text-lg font-bold text-orange-700">
                    {currentCard.targetClassCode}
                  </p>
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-orange-900/80">
                    <ArrowLeftRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                    {currentCard.targetScheduleText}
                  </p>
                </div>
              </div>

              {/* Minimal Profile (Privacy-safe: no email/phone) */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {currentCard.studentDisplayName}{" "}
                      <span className="font-normal text-slate-400">
                        ({currentCard.studentCodeMasked})
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {currentCard.major}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Info className="h-3.5 w-3.5" />
                  {showDetails ? "Ẩn" : "Chi tiết"}
                </button>
              </div>

              {showDetails && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-1.5">
                  <p>
                    <span className="font-semibold text-slate-800">
                      Giảng viên lớp hiện tại:
                    </span>{" "}
                    {currentCard.lecturerCurrent}
                  </p>
                  <p className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    Thông tin liên hệ cá nhân (email, SĐT) được ẩn để bảo vệ
                    quyền riêng tư.
                  </p>
                </div>
              )}

              {currentCard.note && (
                <div className="rounded-xl bg-slate-50 p-3.5 text-sm italic text-slate-600">
                  &ldquo;{currentCard.note}&rdquo;
                </div>
              )}

              {/* Swipe Actions */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  disabled={swiping}
                  onClick={() => handleSwipe("PASS")}
                  className="flex h-14 w-32 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 disabled:opacity-60"
                >
                  <X className="h-5 w-5" />
                  Bỏ qua
                </button>
                <button
                  type="button"
                  disabled={swiping || Boolean(currentCard.hasCourseConflict)}
                  onClick={() => handleSwipe("LIKE")}
                  title={
                    currentCard.hasCourseConflict
                      ? "Bạn đang có yêu cầu khác cho môn này"
                      : undefined
                  }
                  className="flex h-14 flex-1 max-w-xs items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50"
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
            </div>
          </div>
        )}
      </div>

      {/* Match Modal */}
      {matchedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
              It&apos;s a Match!
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Bạn và{" "}
              <span className="font-semibold text-slate-900">
                {matchedModal.partnerName}
              </span>{" "}
              đã cùng Like yêu cầu đổi lớp môn{" "}
              <span className="font-semibold">{matchedModal.courseCode}</span> (
              {matchedModal.myClassCode} ⇄ {matchedModal.partnerClassCode}).
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/chat"
                onClick={() => setMatchedModal(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <MessageSquare className="h-4 w-4" />
                Nhắn tin ngay
              </Link>
              <button
                type="button"
                onClick={() => setMatchedModal(null)}
                className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
