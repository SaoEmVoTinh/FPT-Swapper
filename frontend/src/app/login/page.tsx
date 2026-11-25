"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch, ApiError } from "@/lib/api";
import { AuthMeResponse, useAppState } from "@/lib/app-state";

export default function LoginPage() {
  const router = useRouter();
  const { setAuthenticatedUser, refreshAuth } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ email/mã sinh viên và mật khẩu.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const loginRes = await apiFetch<{ user?: AuthMeResponse | null }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
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
        setError(err.message);
      } else {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
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
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Đăng nhập</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sử dụng tài khoản sinh viên FPT đã đăng ký trên hệ thống
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
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
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100"
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
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-semibold text-orange-600 hover:underline"
          >
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
