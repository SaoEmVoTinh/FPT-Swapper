"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BookCheck,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Star,
  X,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MatchStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";
import { MatchStatus } from "@/types";

type MatchFilter = "ALL" | "PENDING_CONFIRMATION" | "CONFIRMED" | "COMPLETED";

const CAMPUS_GUIDES: Record<
  string,
  { title: string; office: string; steps: string[] }
> = {
  "Hà Nội": {
    title: "FPTU Hà Nội (Hòa Lạc)",
    office: "Phòng Dịch vụ Sinh viên — Tòa Alpha, tầng 1",
    steps: [
      "Kiểm tra chắc chắn lớp mới không trùng slot với môn khác trên FAP.",
      "Hai sinh viên nhắn tin thống nhất thời gian lên FAP / nộp đơn chuyển lớp chéo cùng lúc.",
      "Gửi đơn qua FAP (Academic → Registration → Chuyển lớp) hoặc trực tiếp Phòng Dịch vụ Sinh viên trong tuần đầu học kỳ.",
      "Sau khi FAP cập nhật lớp mới, bấm 'Đánh dấu hoàn tất' và đánh giá đối tác.",
    ],
  },
  "Đà Nẵng": {
    title: "FPTU Đà Nẵng",
    office: "Phòng Đào tạo & CTSV — Khu đô thị FPT City",
    steps: [
      "Đối chiếu giảng viên & lịch học trên FAP để tránh trùng tiết.",
      "Liên hệ đối tác qua Chat để gửi mail/đơn chuyển lớp cùng thời điểm.",
      "Nộp đơn xin đổi lớp chéo tại Phòng Đào tạo theo thông báo đầu kỳ.",
      "Xác nhận kết quả trên FAP rồi hoàn tất & chấm điểm uy tín trên FPT ClassSwap.",
    ],
  },
  "TP. Hồ Chí Minh": {
    title: "FPTU TP. Hồ Chí Minh",
    office: "Phòng CTSV & Đào tạo — Khu Công nghệ cao Q.9",
    steps: [
      "Kiểm tra điều kiện mở đổi lớp đầu học kỳ và lịch không trùng slot.",
      "Thống nhất giờ làm thủ tục với đối tác trong phần Chat.",
      "Thực hiện chuyển lớp chéo trên cổng FAP / Phòng Đào tạo đúng hạn chót học kỳ.",
      "Kiểm tra lại TKB mới trên FAP trước khi bấm 'Đánh dấu hoàn tất'.",
    ],
  },
  "Quy Nhơn": {
    title: "FPTU Quy Nhơn",
    office: "Phòng Dịch vụ Sinh viên — Khu đô thị An Phú Thịnh",
    steps: [
      "Kiểm tra trùng lịch học và danh sách môn được phép chuyển.",
      "Trao đổi với đối tác và nộp đơn chuyển lớp theo hướng dẫn Phòng Đào tạo.",
      "Bấm 'Đánh dấu hoàn tất' khi FAP đã ghi nhận lớp mới.",
    ],
  },
  "Cần Thơ": {
    title: "FPTU Cần Thơ",
    office: "Phòng Đào tạo & Dịch vụ Sinh viên — KDC Hoàng Quân",
    steps: [
      "Xác nhận không trùng slot và đúng kỳ học hiện tại.",
      "Cùng đối tác nộp đơn chuyển lớp tại Phòng Đào tạo hoặc cổng FAP.",
      "Hoàn tất quy trình trên FPT ClassSwap và đánh giá đối tác.",
    ],
  },
};

export default function MatchesPage() {
  const {
    student,
    matches,
    isAuthenticated,
    updateMatchStatus,
    reviewMatch,
    refreshWorkspace,
    actionError,
    clearActionError,
  } = useAppState();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MatchFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideCampus, setGuideCampus] = useState<string>(
    CAMPUS_GUIDES[student.campusName] ? student.campusName : "Hà Nội"
  );
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewOutcome, setReviewOutcome] = useState<"SUCCESS" | "NO_SHOW">("SUCCESS");
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTargetId || submittingReview) return;
    setSubmittingReview(true);
    clearActionError();
    try {
      await reviewMatch(reviewTargetId, {
        rating: reviewRating,
        outcome: reviewOutcome,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSuccessMsg("Cảm ơn bạn đã gửi đánh giá! Điểm uy tín của đối tác đã được cập nhật.");
      setReviewTargetId(null);
      setReviewComment("");
      setReviewRating(5);
      setReviewOutcome("SUCCESS");
    } catch {
      // handled by actionError
    } finally {
      setSubmittingReview(false);
    }
  };

  const selectedGuide = CAMPUS_GUIDES[guideCampus] || CAMPUS_GUIDES["Hà Nội"];

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

        {/* Campus swap checklist guide */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100">
              <BookCheck className="h-4 w-4 text-orange-500" />
              Checklist thủ tục đổi lớp chính thức tại Campus ({selectedGuide.title})
            </span>
            {guideOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {guideOpen && (
            <div className="space-y-3 border-t border-slate-100 px-4 py-3.5 text-xs dark:border-slate-800">
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(CAMPUS_GUIDES).map((cname) => (
                  <button
                    key={cname}
                    type="button"
                    onClick={() => setGuideCampus(cname)}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                      guideCampus === cname
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cname}
                  </button>
                ))}
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Nơi tiếp nhận: <span className="text-orange-600 dark:text-orange-400">{selectedGuide.office}</span>
              </p>
              <ol className="list-inside list-decimal space-y-1 text-slate-600 dark:text-slate-300">
                {selectedGuide.steps.map((st, idx) => (
                  <li key={idx}>{st}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {reviewSuccessMsg && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200">
            <span>{reviewSuccessMsg}</span>
            <button
              type="button"
              onClick={() => setReviewSuccessMsg(null)}
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-current" />
                          {(m.partnerTrustScore ?? 5).toFixed(1)}
                          {(m.partnerCompletedSwaps ?? 0) > 0
                            ? ` • ${m.partnerCompletedSwaps} thành công`
                            : ""}
                        </span>
                        {(m.partnerNoShows ?? 0) > 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                            {m.partnerNoShows} lần bỏ hẹn
                          </span>
                        )}
                        <MatchStatusBadge status={m.status} />
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {m.courseCode} — {m.courseName} ({m.semesterName})
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Trao đổi:{" "}
                        <span className="rounded-md bg-orange-50 px-2 py-0.5 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                          {m.courseCode} - {m.myClassCode}
                        </span>{" "}
                        ⇄{" "}
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {m.courseCode} - {m.partnerClassCode}
                        </span>
                      </p>
                      {m.scheduleConflictWarning && (
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          {m.scheduleConflictWarning}
                        </div>
                      )}
                      {(m.status === "CONFIRMED" || m.status === "COMPLETED") && (
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          {m.partnerEmail ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200">
                              <Mail className="h-3.5 w-3.5" />
                              Liên hệ: {m.partnerEmail}
                              {m.partnerStudentCode ? ` (${m.partnerStudentCode})` : ""}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">
                              Thông tin email/MSSV được ẩn theo cài đặt riêng tư của đối tác.
                            </span>
                          )}
                        </div>
                      )}
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

                      {isAuthenticated &&
                        (m.status === "CONFIRMED" || m.status === "COMPLETED") &&
                        (m.myReviewSubmitted ? (
                          <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            Đã đánh giá
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReviewTargetId(reviewTargetId === m.id ? null : m.id);
                              setReviewRating(5);
                              setReviewOutcome("SUCCESS");
                              setReviewComment("");
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                          >
                            <Star className="h-3.5 w-3.5" />
                            Đánh giá / No-show
                          </button>
                        ))}
                    </div>
                  </div>

                  {reviewTargetId === m.id && (
                    <form
                      onSubmit={handleSubmitReview}
                      className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-slate-800/70"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Đánh giá đối tác {m.partnerName}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className={`rounded-lg p-1 ${
                                star <= reviewRating
                                  ? "text-amber-500"
                                  : "text-slate-300 dark:text-slate-600"
                              }`}
                            >
                              <Star className="h-4 w-4 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewOutcome("SUCCESS");
                            setReviewRating(5);
                          }}
                          className={`rounded-lg px-3 py-1.5 font-semibold ${
                            reviewOutcome === "SUCCESS"
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          Đã đổi thành công
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewOutcome("NO_SHOW");
                            setReviewRating(1);
                          }}
                          className={`rounded-lg px-3 py-1.5 font-semibold ${
                            reviewOutcome === "NO_SHOW"
                              ? "bg-rose-600 text-white"
                              : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          Báo bỏ hẹn (No-show)
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={500}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Nhận xét thêm (tùy chọn)..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewTargetId(null)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                        >
                          {submittingReview ? "Đang lưu..." : "Gửi đánh giá"}
                        </button>
                      </div>
                    </form>
                  )}

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
