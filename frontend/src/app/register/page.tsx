"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { LegalDocType, LegalModal } from "@/components/LegalModal";
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
  const [className, setClassName] = useState("");
  const [password, setPassword] = useState("");
  const [agreePrivacyTerms, setAgreePrivacyTerms] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedCampusId = campuses.some((c) => c.id === campusId)
    ? campusId
    : campuses[0]?.id || "";
  const selectedCampusObj = campuses.find((c) => c.id === selectedCampusId);

  const handleReviewStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !fullName.trim() ||
      !studentCode.trim() ||
      !email.trim() ||
      className.trim().length < 2 ||
      password.length < 8
    ) {
      setError("Vui lòng điền đầy đủ thông tin (bao gồm Lớp) và mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    if (!agreePrivacyTerms) {
      setError(
        "Vui lòng đồng ý với Chính sách Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP) & Điều khoản sử dụng.",
      );
      return;
    }
    setError("");
    setConfirmStep(true);
  };

  const handleSubmit = async () => {
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
          class_name: className.trim().toUpperCase(),
          password,
          agree_privacy_terms: agreePrivacyTerms,
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
      setConfirmStep(false);
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
              alt="FPT Swapper"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl object-contain"
            />
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              FPT Swapper
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

        {!confirmStep ? (
          <form onSubmit={handleReviewStep} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Trịnh Trần Phương T"
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
                  placeholder="DE120497"
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
                placeholder="ttpt1204@gmail.com hoặc ttpt1204@fpt.edu.vn"
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
                Lớp (VD: AI21A01, SE1801)
              </label>
              <input
                type="text"
                value={className}
                autoCapitalize="characters"
                onChange={(e) => setClassName(e.target.value.toUpperCase())}
                placeholder="AI21A01"
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase placeholder:normal-case outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mật khẩu (tối thiểu 8 ký tự)
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

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              <input
                type="checkbox"
                checked={agreePrivacyTerms}
                onChange={(e) => setAgreePrivacyTerms(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
              />
              <span>
                Tôi xác nhận đã đọc và đồng ý với{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLegalDoc("privacy");
                  }}
                  className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
                >
                  Chính sách Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP)
                </button>{" "}
                và{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLegalDoc("terms");
                  }}
                  className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
                >
                  Điều khoản sử dụng
                </button>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
            >
              Kiểm tra &amp; Xác nhận thông tin
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200">
              <p className="inline-flex items-center gap-1.5 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                Xác nhận thông tin trước khi tạo tài khoản
              </p>
              <p className="mt-1">
                <strong>Email</strong> và <strong>Mã sinh viên</strong> sẽ được khóa cố định và{" "}
                <strong>không thể tự thay đổi</strong> sau khi hoàn tất đăng ký. Vui lòng kiểm tra kỹ thông tin bên dưới.
              </p>
            </div>

            <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Họ và tên</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{fullName.trim()}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Mã sinh viên</span>
                <span className="font-bold uppercase text-orange-600 dark:text-orange-400">
                  {studentCode.trim().toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Email</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{email.trim().toLowerCase()}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Campus</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedCampusObj ? `${selectedCampusObj.name} (${selectedCampusObj.code})` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200/70 pb-2 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Ngành học</span>
                <span className="text-right font-semibold text-slate-900 dark:text-slate-100">{major.trim()}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400">Lớp</span>
                <span className="font-bold uppercase text-slate-900 dark:text-slate-100">
                  {className.trim().toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setError("");
                  setConfirmStep(false);
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại sửa
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {submitting ? "Đang tạo tài khoản..." : "Xác nhận & Đăng ký"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-orange-600 hover:underline"
          >
            Đăng nhập
          </Link>
        </div>
        <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Quân, Hoàng — AI21A01 • Campus Đà Nẵng
        </p>
      </div>

      <LegalModal
        doc={legalDoc}
        onClose={() => setLegalDoc(null)}
        onSwitchDoc={setLegalDoc}
      />
    </div>
  );
}
