"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Flag, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MatchStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";

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
    conversations[0]?.id || null
  );
  const [draft, setDraft] = useState("");
  const [reported, setReported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tin nhắn 1-1</h1>
            <p className="text-sm text-slate-500">
              Chỉ mở cuộc trò chuyện khi hai bên đã Match
            </p>
          </div>
          {realtimeStatus !== "disconnected" && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                realtimeStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  realtimeStatus === "connected" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {realtimeStatus === "connected" ? "Trực tuyến" : "Đang kết nối..."}
            </span>
          )}
        </div>

        <div className="grid h-[calc(100vh-14rem)] min-h-[480px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-3">
          {/* Conversation List */}
          <div
            className={`border-r border-slate-200 overflow-y-auto ${
              selectedId ? "hidden md:block" : "block"
            }`}
          >
            <div className="border-b border-slate-100 p-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Hội thoại ({conversations.length})
            </div>
            {conversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                Chưa có cuộc trò chuyện nào.
              </p>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(conv.id);
                      setReported(false);
                    }}
                    className={`w-full border-b border-slate-100 p-4 text-left transition-colors ${
                      isSelected ? "bg-orange-50/70" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-900">
                        {conv.partnerName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {conv.lastMessageAt}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-orange-600">
                      {conv.courseCode}: {conv.myClassCode} ⇄{" "}
                      {conv.partnerClassCode}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {conv.lastMessage}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* Active Chat Pane */}
          <div
            className={`md:col-span-2 flex flex-col h-full ${
              !selectedId ? "hidden md:flex" : "flex"
            }`}
          >
            {!activeConv ? (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
                Chọn một cuộc trò chuyện để bắt đầu nhắn tin.
              </div>
            ) : (
              <>
                {/* Swap Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 md:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {activeConv.partnerName}
                        </span>
                        <MatchStatusBadge status={activeConv.matchStatus} />
                      </div>
                      <p className="text-xs text-slate-600">
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
                      onClick={() => setReported(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      {reported ? "Đã báo cáo" : "Báo cáo"}
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                  {activeMessages.map((msg) => {
                    const isMe = msg.senderId === student.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? "bg-orange-500 text-white rounded-br-sm"
                              : "bg-slate-100 text-slate-800 rounded-bl-sm"
                          }`}
                        >
                          <p className="leading-relaxed">{msg.content}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isMe ? "text-orange-100" : "text-slate-400"
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

                {/* Input */}
                <form
                  onSubmit={handleSend}
                  className="flex items-center gap-2 border-t border-slate-200 p-3 bg-slate-50/50"
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Nhập tin nhắn trao đổi lịch đổi lớp..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
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
    </AppShell>
  );
}

