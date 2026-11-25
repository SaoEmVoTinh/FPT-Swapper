import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TermsOfUseContent } from "@/components/LegalModal";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </Link>
          <ThemeToggle variant="icon" />
        </div>

        <TermsOfUseContent />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
          <Link href="/privacy" className="font-semibold text-orange-600 hover:underline dark:text-orange-400">
            ← Xem Chính sách Bảo vệ Dữ liệu Cá nhân
          </Link>
          <span className="text-slate-400">FPT Swapper</span>
        </div>
      </div>
    </div>
  );
}
