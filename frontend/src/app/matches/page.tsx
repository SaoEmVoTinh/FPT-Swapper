"use client";

import Link from "next/link";
import { Check, CheckCheck, MessageSquare, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { MatchStatusBadge } from "@/components/StatusBadge";
import { useAppState } from "@/lib/app-state";

export default function MatchesPage() {
  const { matches, updateMatchStatus } = useAppState();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Danh sách Matches
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Trao đổi qua chat, xác nhận đồng thuận và hoàn tất thủ tục đổi lớp
          </p>
        </div>

        <DisclaimerBanner compact />

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm text-slate-500">
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
        ) : (
          <div className="grid gap-4">
            {matches.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-bold text-slate-900">
                      {m.partnerName}
                    </span>
                    <MatchStatusBadge status={m.status} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {m.courseCode} — {m.courseName} ({m.semesterName})
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    Trao đổi:{" "}
                    <span className="text-orange-600">{m.myClassCode}</span> ⇄{" "}
                    <span className="text-emerald-600">
                      {m.partnerClassCode}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Trạng thái xác nhận: Bạn (
                    {m.myConfirmed ? "Đã xác nhận" : "Chưa"}) • Đối tác (
                    {m.partnerConfirmed ? "Đã xác nhận" : "Chưa"})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Mở Chat
                  </Link>

                  {m.status === "PENDING_CONFIRMATION" && !m.myConfirmed && (
                    <button
                      type="button"
                      onClick={() => updateMatchStatus(m.id, "confirm")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Xác nhận đổi
                    </button>
                  )}

                  {m.status === "CONFIRMED" && (
                    <button
                      type="button"
                      onClick={() => updateMatchStatus(m.id, "complete")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Đánh dấu hoàn tất
                    </button>
                  )}

                  {(m.status === "PENDING_CONFIRMATION" ||
                    m.status === "CONFIRMED") && (
                    <button
                      type="button"
                      onClick={() => updateMatchStatus(m.id, "decline")}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Từ chối
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

