"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Lock, Mail, RotateCcw } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch, ApiError } from "@/lib/api";
import { AuthMeResponse, useAppState } from "@/lib/app-state";

export default function LoginPage() {
  const router = useRouter();
  const { setAuthenticatedUser, refreshAuth } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ email/mã sinh viên và mật khẩu.");
      return;
    }

    setError("");
    setPendingDeleteAccount(false);
    setSubmitting(true);
    try {
      const loginRes = await apiFetch<{ user?: AuthMeResponse | null }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          totp_code: totpCode.trim() || undefined,
        }),
      });
      if (loginRes.user) {
        setAuthenticatedUser(loginRes.user);
      } else {
        await refreshAuth();
      }
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message.includes("2FA")) {
          setNeeds2FA(true);
        }
        if (err.message.includes("chờ xóa")) {
          setPendingDeleteAccount(true);
        }
        setError(err.message);
      } else {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestoreAccount = async () => {
    setError("");
    setSubmitting(true);
    try {
      const restoreRes = await apiFetch<{ user?: AuthMeResponse | null }>(
        "/auth/restore-account",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
            totp_code: totpCode.trim() || undefined,
          }),
        },
      );
      if (restoreRes.user) {
        setAuthenticatedUser(restoreRes.user);
      } else {
        await refreshAuth();
      }
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể khôi phục tài khoản.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="absolute right-4 top-4">
          <ThemeToggle variant="icon" />
        </div>
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image
              src="/fpt-logo2.png"
              alt="FPT ClassSwap"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-contain"
            />
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              FPT ClassSwap
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Đăng nhập
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sử dụng tài khoản sinh viên FPT đã đăng ký trên hệ thống
          </p>
        </div>

        {error && (
          <div className="mb-4 space-y-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200">
            <p>{error}</p>
            {pendingDeleteAccount && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleRestoreAccount}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Khôi phục tài khoản ngay
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email hoặc Mã sinh viên
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@gmail.com hoặc HE180123"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
          </div>

          {needs2FA && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mã xác thực 2FA (6 chữ số)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-orange-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="123456"
                  disabled={submitting}
                  className="w-full rounded-xl border border-orange-300 py-2.5 pl-10 pr-3.5 text-sm tracking-widest outline-none focus:border-orange-500 dark:border-orange-500/40 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
          >
            Đăng ký ngay
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-slate-400">
          <Link href="/privacy" className="hover:text-orange-600 hover:underline">
            Chính sách bảo mật (NĐ 13/2023)
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-orange-600 hover:underline">
            Điều khoản sử dụng
          </Link>
        </div>
      </div>
    </div>
  );
}
