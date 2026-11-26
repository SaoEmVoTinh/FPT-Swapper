"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Flame, HeartHandshake, MapPin, ShieldCheck } from "lucide-react";

import { LegalDocType, LegalModal } from "@/components/LegalModal";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);

  return (
    <footer
      className={`border-t border-slate-200 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 ${
        compact ? "mt-8" : ""
      }`}
    >
      <div
        className={`mx-auto max-w-6xl px-4 sm:px-6 ${
          compact ? "py-7 lg:px-8" : "py-10"
        }`}
      >
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Disclaimer */}
          <div className="space-y-3 sm:col-span-2 lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/fpt-logo2.png"
                alt="FPT Swapper"
                width={32}
                height={32}
                className="h-8 w-8 rounded-xl object-contain"
              />
              <div>
                <span className="block text-base font-bold text-slate-900 dark:text-slate-100">
                  FPT Swapper
                </span>
                <span className="block text-[11px] font-medium text-orange-600 dark:text-orange-400">
                  Kết nối đổi lớp sinh viên FPTU
                </span>
              </div>
            </Link>
            <p className="max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Nền tảng hỗ trợ sinh viên FPT tìm người đổi lớp tương thích hai chiều
              theo từng Campus, trò chuyện trực tiếp sau khi Match và tự hoàn tất thủ
              tục chuyển lớp trên FAP.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                <MapPin className="h-3 w-3 text-orange-500" />5 Campus: HN • ĐN • HCM • QN • CT
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                <HeartHandshake className="h-3 w-3 text-emerald-500" />
                Không phải cổng FAP chính thức
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              Tính năng chính
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                  Tổng quan (Dashboard)
                </Link>
              </li>
              <li>
                <Link href="/discover" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                  Discover &amp; Ghép đổi 2-3 bên
                </Link>
              </li>
              <li>
                <Link href="/requests" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                  Yêu cầu đổi lớp của tôi
                </Link>
              </li>
              <li>
                <Link href="/matches" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                  Danh sách Matches &amp; Hướng dẫn FAP
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                  Nhắn tin 1-1 Realtime
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-2.5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
              Pháp lý &amp; Hỗ trợ
            </h3>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => setLegalDoc("privacy")}
                  className="text-left hover:text-orange-600 hover:underline dark:hover:text-orange-400"
                >
                  Chính sách bảo mật
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setLegalDoc("terms")}
                  className="text-left hover:text-orange-600 hover:underline dark:hover:text-orange-400"
                >
                  Điều khoản sử dụng
                </button>
              </li>
              <li>
                <Link href="/profile" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                  Hồ sơ &amp; Quản lý tài khoản
                </Link>
              </li>
              <li>
                <Link href="/notifications" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                  Trung tâm thông báo
                </Link>
              </li>
              <li className="pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-slate-400" />
                  TKB chính thức cập nhật trên FAP
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Attribution Bar */}
        <div className="mt-7 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:text-left">
          <p>© 2026 FPT Swapper — Student Connection Platform</p>
          <p className="font-medium text-slate-600 dark:text-slate-300">
            Phát triển bởi <span className="font-semibold text-orange-600 dark:text-orange-400">Quân, Hoàng</span> • Lớp{" "}
            <span className="font-semibold">AI21A01</span> — Campus Đà Nẵng
          </p>
        </div>
      </div>

      <LegalModal
        doc={legalDoc}
        onClose={() => setLegalDoc(null)}
        onSwitchDoc={setLegalDoc}
      />
    </footer>
  );
}
