"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Flag, Search, Send, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MatchStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";

const QUICK_REPLIES = [
  "Chào bạn, lịch rảnh để mình cùng lên FAP / trao đổi là khi nào?",
  "Mình đã kiểm tra kỹ lịch lớp mới rồi, rất phù hợp nhé!",
  "Mình đã bấm xác nhận đổi lớp ở trang Matches rồi.",
];

const REPORT_REASONS = [
  "Thông tin lớp không đúng thực tế",
  "Không phản hồi / bỏ hẹn đổi lớp",
  "Ngôn ngữ thiếu tôn trọng",
  "Khác",
];

export default function ChatPage() {
  const {
    student,
    conversations,
    messages,
    sendMessage,
    loadConversationMessages,
    realtimeStatus,
    updateMatchStatus,
  } = useAppState();

  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id || null,
  );

  useEffect(() => {
    const convParam = new URLSearchParams(window.location.search).get("conv");
    if (convParam) {
      queueMicrotask(() => setSelectedId(convParam));
    }
  }, []);

  const [convSearch, setConvSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [reportedIds, setReportedIds] = useState<Record<string, boolean>>({});
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const filteredConversations = useMemo(() => {
    const q = convSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.partnerName.toLowerCase().includes(q) ||
        c.courseCode.toLowerCase().includes(q) ||
        c.myClassCode.toLowerCase().includes(q) ||
        c.partnerClassCode.toLowerCase().includes(q),
    );
  }, [conversations, convSearch]);

  const activeConv =
    conversations.find((c) => c.id === selectedId) || conversations[0] || null;

  const activeMessages = activeConv
    ? messages.filter((m) => m.conversationId === activeConv.id)
    : [];

  useEffect(() => {
    if (activeConv?.id) {
      loadConversationMessages(activeConv.id);
    }
  }, [activeConv?.id, loadConversationMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !draft.trim()) return;
    sendMessage(activeConv.id, draft);
    setDraft("");
  };

  const isReported = activeConv ? Boolean(reportedIds[activeConv.id]) : false;

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Tin nhắn 1-1
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chỉ mở cuộc trò chuyện khi hai bên đã Match
            </p>
          </div>
          {realtimeStatus !== "disconnected" && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                realtimeStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeStatus === "connected"
                    ? "bg-emerald-500"
                    : "bg-amber-500 animate-pulse"
                }`}
              />
              {realtimeStatus === "connected"
                ? "Trực tuyến"
                : "Đang kết nối..."}
            </span>
          )}
        </div>

        <div className="grid h-[calc(100vh-14rem)] min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
          {/* Conversation List */}
          <div
            className={`flex flex-col border-r border-slate-200 dark:border-slate-800 ${
              selectedId ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="space-y-2.5 border-b border-slate-100 p-3.5 dark:border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Hội thoại ({conversations.length})
              </div>
              {conversations.length > 0 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={convSearch}
                    onChange={(e) => setConvSearch(e.target.value)}
                    placeholder="Tìm tên hoặc mã môn..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-orange-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {conversations.length === 0
                    ? "Chưa có cuộc trò chuyện nào."
                    : "Không tìm thấy hội thoại phù hợp."}
                </p>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeConv?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full border-b border-slate-100 p-4 text-left transition-colors dark:border-slate-800 ${
                        isSelected
                          ? "bg-orange-50/70 dark:bg-orange-500/15"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {conv.partnerName}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {conv.unreadCount > 0 && (
                            <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {conv.unreadCount}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {conv.lastMessageAt}
                          </span>
                        </div>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                        {conv.courseCode}: {conv.myClassCode} ⇄{" "}
                        {conv.partnerClassCode}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {conv.lastMessage}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Chat Pane */}
          <div
            className={`flex h-full flex-col md:col-span-2 ${
              !selectedId ? "hidden md:flex" : "flex"
            }`}
          >
            {!activeConv ? (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500 dark:text-slate-400">
                Chọn một cuộc trò chuyện để bắt đầu nhắn tin.
              </div>
            ) : (
              <>
                {/* Swap Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/90">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {activeConv.partnerName}
                        </span>
                        <MatchStatusBadge status={activeConv.matchStatus} />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {activeConv.courseCode} • {activeConv.myClassCode} ⇄{" "}
                        {activeConv.partnerClassCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeConv.matchStatus === "PENDING_CONFIRMATION" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateMatchStatus(activeConv.matchId, "confirm")
                        }
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Xác nhận đổi lớp
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isReported}
                      onClick={() => setReportModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      {isReported ? "Đã báo cáo" : "Báo cáo"}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4 dark:bg-slate-950/60">
                  {activeMessages.map((msg) => {
                    const isMe = msg.senderId === student.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                            isMe
                              ? "rounded-br-sm bg-orange-500 text-white"
                              : "rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                          }`}
                        >
                          <p className="leading-relaxed">{msg.content}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isMe
                                ? "text-orange-100"
                                : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            {msg.createdAt}
                            {msg.pending ? " • Đang gửi..." : ""}
                            {msg.failed ? " • Gửi thất bại" : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies */}
                <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setDraft(q)}
                      className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/15 dark:hover:text-orange-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSend}
                  className="flex items-center gap-2 border-t border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Nhập tin nhắn trao đổi lịch đổi lớp..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white transition-colors hover:bg-orange-600"
                    aria-label="Gửi tin nhắn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Báo cáo vi phạm ({activeConv.partnerName})
              </h2>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-sm ${
                    reportReason === reason
                      ? "border-orange-300 bg-orange-50/60 text-slate-900 dark:border-orange-500/40 dark:bg-orange-500/15 dark:text-slate-100"
                      : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={reportReason === reason}
                    onChange={() => setReportReason(reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportedIds((prev) => ({ ...prev, [activeConv.id]: true }));
                  setReportModalOpen(false);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Gửi báo cáo
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
