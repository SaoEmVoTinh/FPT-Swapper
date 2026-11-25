"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MajorSelect } from "@/components/MajorSelect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch, ApiError } from "@/lib/api";
import { AuthMeResponse, useAppState } from "@/lib/app-state";

export default function RegisterPage() {
  const router = useRouter();
  const { campuses, setAuthenticatedUser } = useAppState();
  const [fullName, setFullName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [email, setEmail] = useState("");
  const [campusId, setCampusId] = useState("");
  const [major, setMajor] = useState("Kỹ thuật phần mềm");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCampusId = campuses.some((c) => c.id === campusId)
    ? campusId
    : campuses[0]?.id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !studentCode.trim() || !email.trim() || password.length < 6) {
      setError("Vui lòng điền đầy đủ thông tin và mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const createdUser = await apiFetch<AuthMeResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName.trim(),
          student_code: studentCode.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          campus_id: selectedCampusId,
          major: major.trim(),
          password,
        }),
      });
      setAuthenticatedUser(createdUser);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Đăng ký thất bại. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
            Tạo tài khoản sinh viên
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Tham gia kết nối đổi lớp cùng sinh viên FPT
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Họ và tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn An"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mã sinh viên
              </label>
              <input
                type="text"
                value={studentCode}
                autoCapitalize="characters"
                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                placeholder="HE180123"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase placeholder:normal-case outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@gmail.com hoặc annvhe180123@fpt.edu.vn"
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Campus
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setCampusId(e.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Ngành &amp; Chuyên ngành
            </label>
            <MajorSelect
              value={major}
              onChange={setMajor}
              disabled={submitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Mật khẩu (tối thiểu 6 ký tự)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-orange-600 hover:underline"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
