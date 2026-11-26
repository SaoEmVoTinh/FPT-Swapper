"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Download,
  KeyRound,
  Loader2,
  LogOut,
  PauseCircle,
  PlayCircle,
  Save,
  Shield,
  Star,
  Trash2,
  User,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MajorSelect } from "@/components/MajorSelect";
import { ApiError, apiFetch } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { BlockedStudent, Campus, StudentProfile } from "@/types";

const SUPER_ADMIN_EMAIL = "pmquan1406@gmail.com";

type ProfileTab = "profile" | "security" | "activity" | "danger";

interface AccountSummary {
  id: string;
  email: string;
  student_code: string;
  role: string;
  status: string;
  created_at: string;
  full_name?: string | null;
  major?: string | null;
  campus_id: string;
  campus_code?: string | null;
  campus_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  share_contact_after_match?: boolean;
  share_email_after_match?: boolean;
  share_student_code_after_match?: boolean;
  trust_score?: number;
  completed_swaps_count?: number;
  no_show_count?: number;
  total_requests: number;
  active_requests: number;
  paused_requests: number;
  matched_requests: number;
  total_matches: number;
  confirmed_matches: number;
  unread_notifications: number;
}

interface BulkToggleResponse {
  updated_count: number;
  status: string;
}

function ProfileForm({
  student,
  campuses,
  initialBio,
  initialShareEmail,
  initialShareStudentCode,
  updateStudent,
  onSaved,
}: {
  student: StudentProfile;
  campuses: Campus[];
  initialBio: string;
  initialShareEmail: boolean;
  initialShareStudentCode: boolean;
  updateStudent: (patch: Partial<StudentProfile>) => Promise<void>;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(student.fullName);
  const [major, setMajor] = useState(student.major);
  const [className, setClassName] = useState(student.className || "");
  const [campusId, setCampusId] = useState(student.campusId);
  const [avatarUrl, setAvatarUrl] = useState(student.avatarUrl || "");
  const [bio, setBio] = useState(initialBio);
  const [shareEmail, setShareEmail] = useState(initialShareEmail);
  const [shareStudentCode, setShareStudentCode] = useState(
    initialShareStudentCode,
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCampusId = campuses.some((c) => c.id === campusId)
    ? campusId
    : campuses[0]?.id || student.campusId;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const campus = campuses.find((c) => c.id === selectedCampusId);
      await updateStudent({
        fullName: fullName.trim() || student.fullName,
        major: major.trim() || student.major,
        className: className.trim().toUpperCase() || undefined,
        campusId: selectedCampusId,
        campusName: campus?.name || student.campusName,
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim(),
        shareContactAfterMatch: shareEmail && shareStudentCode,
        shareEmailAfterMatch: shareEmail,
        shareStudentCodeAfterMatch: shareStudentCode,
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể lưu hồ sơ. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200">
          Đã lưu thay đổi hồ sơ vào hệ thống.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Họ và tên
          </label>
          <input
            type="text"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Campus
          </label>
          <select
            value={selectedCampusId}
            onChange={(e) => setCampusId(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Ngành &amp; Chuyên ngành
          </label>
          <MajorSelect value={major} onChange={setMajor} disabled={saving} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Lớp (VD: AI21A01)
          </label>
          <input
            type="text"
            minLength={2}
            maxLength={32}
            value={className}
            autoCapitalize="characters"
            onChange={(e) => setClassName(e.target.value.toUpperCase())}
            disabled={saving}
            placeholder="AI21A01"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase placeholder:normal-case outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Ảnh đại diện (URL tùy chọn)
        </label>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          disabled={saving}
          placeholder="https://..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Giới thiệu ngắn (hiển thị cho đối tác trao đổi lớp)
        </label>
        <textarea
          rows={3}
          maxLength={1000}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={saving}
          placeholder="VD: Cần đổi slot sáng để tránh trùng lịch làm thêm / đồ án..."
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-sm dark:border-slate-700 dark:bg-slate-800/70">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            Chia sẻ thông tin liên hệ sau khi Match được xác nhận
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Cả hai lựa chọn đều mặc định tắt, hoàn toàn tùy chọn và không bắt buộc
            để sử dụng tính năng Chat 1-1. Bạn có thể bật riêng từng thông tin.
          </p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/80 bg-white/80 p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
          <input
            type="checkbox"
            checked={shareEmail}
            onChange={(e) => setShareEmail(e.target.checked)}
            disabled={saving}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Chia sẻ Email sau khi Match được xác nhận
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chỉ hiển thị Email của bạn cho đối tác khi hai bên cùng xác nhận Match.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200/80 bg-white/80 p-2.5 dark:border-slate-700 dark:bg-slate-900/60">
          <input
            type="checkbox"
            checked={shareStudentCode}
            onChange={(e) => setShareStudentCode(e.target.checked)}
            disabled={saving}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
          />
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Chia sẻ MSSV đầy đủ sau khi Match được xác nhận
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trước Match MSSV luôn được che 4 ký tự đầu + <code>****</code>; chỉ hiện đầy đủ cho đối tác nếu bạn bật mục này.
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Đang lưu..." : "Lưu hồ sơ"}
        </button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const {
    student,
    campuses,
    isAuthenticated,
    updateStudent,
    refreshWorkspace,
    logout,
  } = useAppState();

  const [tab, setTab] = useState<ProfileTab>("profile");
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Identity correction request state
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [corrEmail, setCorrEmail] = useState("");
  const [corrStudentCode, setCorrStudentCode] = useState("");
  const [corrReason, setCorrReason] = useState("");
  const [sendingCorrection, setSendingCorrection] = useState(false);

  // Activity bulk actions / export
  const [busyActivity, setBusyActivity] = useState(false);
  const [blocks, setBlocks] = useState<BlockedStudent[]>([]);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Self-delete account
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isSuperAdmin =
    isAuthenticated &&
    student.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;

  const fetchSummary = useCallback(async () => {
    if (!isAuthenticated) return null;
    return apiFetch<AccountSummary>("/students/me/summary");
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    Promise.all([
      fetchSummary(),
      apiFetch<BlockedStudent[]>("/students/me/blocks").catch(() => []),
    ])
      .then(([data, blockRows]) => {
        if (cancelled) return;
        if (data) {
          setSummary(data);
        }
        setBlocks(blockRows);
      })
      .catch(() => {
        // ignore background summary error
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchSummary]);

  async function handleUnblock(targetId: string) {
    setUnblockingId(targetId);
    setNotice("");
    setErrorMsg("");
    try {
      await apiFetch(`/students/me/blocks/${targetId}`, { method: "DELETE" });
      setBlocks((prev) => prev.filter((b) => b.student_id !== targetId));
      setNotice("Đã bỏ chặn người dùng.");
      await refreshWorkspace();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Không thể bỏ chặn.");
    } finally {
      setUnblockingId(null);
    }
  }

  async function reloadSummary() {
    if (!isAuthenticated) return;
    try {
      const data = await fetchSummary();
      if (data) {
        setSummary(data);
      }
    } catch {
      // ignore
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    setErrorMsg("");
    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }
    setChangingPassword(true);
    try {
      await apiFetch("/students/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Đổi mật khẩu thành công.");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Không thể đổi mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleRequestIdentityCorrection(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    setErrorMsg("");
    const trimmedEmail = corrEmail.trim();
    const trimmedCode = corrStudentCode.trim().toUpperCase();
    const trimmedReason = corrReason.trim();
    if (!trimmedEmail && !trimmedCode) {
      setErrorMsg("Vui lòng nhập ít nhất Email mới hoặc MSSV mới cần đính chính.");
      return;
    }
    if (trimmedReason.length < 5) {
      setErrorMsg("Vui lòng nhập lý do đính chính (tối thiểu 5 ký tự).");
      return;
    }
    setSendingCorrection(true);
    try {
      const res = await apiFetch<{ message: string }>(
        "/students/me/identity-correction-request",
        {
          method: "POST",
          body: JSON.stringify({
            requested_email: trimmedEmail || null,
            requested_student_code: trimmedCode || null,
            reason: trimmedReason,
          }),
        },
      );
      setCorrEmail("");
      setCorrStudentCode("");
      setCorrReason("");
      setShowCorrectionForm(false);
      setNotice(
        res.message ||
          "Đã gửi yêu cầu đính chính tới Quản trị viên để xác minh và cập nhật.",
      );
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Không thể gửi yêu cầu đính chính. Vui lòng thử lại.",
      );
    } finally {
      setSendingCorrection(false);
    }
  }

  async function handleBulkToggle(action: "pause-all" | "resume-all") {
    setNotice("");
    setErrorMsg("");
    setBusyActivity(true);
    try {
      const res = await apiFetch<BulkToggleResponse>(
        `/students/me/requests/${action}`,
        { method: "POST" },
      );
      await Promise.all([refreshWorkspace(), reloadSummary()]);
      setNotice(
        action === "pause-all"
          ? `Đã tạm dừng ${res.updated_count} tin đăng đang mở.`
          : `Đã kích hoạt lại ${res.updated_count} tin đăng đang tạm dừng.`,
      );
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Không thể cập nhật trạng thái tin đăng.",
      );
    } finally {
      setBusyActivity(false);
    }
  }

  async function handleExportData() {
    setNotice("");
    setErrorMsg("");
    setBusyActivity(true);
    try {
      const data = await apiFetch<Record<string, unknown>>("/students/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fpt-swapper-${student.studentCode.toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice("Đã tải xuống bản sao dữ liệu tài khoản (.json).");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Không thể xuất dữ liệu tài khoản.",
      );
    } finally {
      setBusyActivity(false);
    }
  }

  async function handleDeleteOwnAccount(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    setErrorMsg("");
    if (deleteConfirmText.trim().toUpperCase() !== "XOA TAI KHOAN") {
      setErrorMsg('Vui lòng gõ chính xác "XOA TAI KHOAN" để xác nhận.');
      return;
    }
    setDeletingAccount(true);
    try {
      await apiFetch("/students/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      await logout();
      router.push("/login");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể xóa tài khoản.",
      );
      setDeletingAccount(false);
    }
  }

  const initials = (student.fullName || student.studentCode || "SV")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

  const tabs: Array<{
    key: ProfileTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "profile", label: "Hồ sơ cá nhân", icon: User },
    { key: "security", label: "Tài khoản & Bảo mật", icon: KeyRound },
    { key: "activity", label: "Hoạt động & Dữ liệu", icon: Shield },
    { key: "danger", label: "Xóa tài khoản", icon: Trash2 },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Account Overview Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-4">
            {student.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-xl font-bold text-white">
                {initials || "SV"}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {student.fullName}
                </h1>
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {student.studentCode}
                </span>
                <span className="rounded-lg bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                  {student.role}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Uy tín {(summary?.trust_score ?? student.trustScore ?? 5).toFixed(1)}
                  {(summary?.completed_swaps_count ?? 0) > 0
                    ? ` · ${summary?.completed_swaps_count} đổi thành công`
                    : ""}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                {student.email}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {student.campusName} · {student.major}
                {summary?.created_at &&
                  ` · Tham gia ${new Date(summary.created_at).toLocaleDateString("vi-VN")}`}
              </p>
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            )}
          </div>

          {summary && (
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">Tin đang tìm</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {summary.active_requests}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">Tin tạm dừng</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {summary.paused_requests}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">Matches</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {summary.total_matches}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                <p className="text-xs text-slate-500 dark:text-slate-400">Thông báo mới</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {summary.unread_notifications}
                </p>
              </div>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200">
            <span>
              Bạn đang xem ở chế độ demo. Hãy đăng nhập để lưu thay đổi vào hệ
              thống, đổi mật khẩu và quản lý tài khoản thật.
            </span>
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-orange-500"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200">
            {errorMsg}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-200">
            {notice}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            const isDanger = item.key === "danger";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setNotice("");
                  setErrorMsg("");
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? isDanger
                      ? "bg-rose-600 text-white"
                      : "bg-slate-900 text-white dark:bg-orange-500"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ════════ TAB 1: PROFILE ════════ */}
        {tab === "profile" && (
          <ProfileForm
            key={`${student.id}-${student.campusId}-${summary?.bio ?? student.bio ?? ""}-${Boolean(summary?.share_email_after_match ?? student.shareEmailAfterMatch)}-${Boolean(summary?.share_student_code_after_match ?? student.shareStudentCodeAfterMatch)}`}
            student={student}
            campuses={campuses}
            initialBio={summary?.bio ?? student.bio ?? ""}
            initialShareEmail={Boolean(
              summary?.share_email_after_match ?? student.shareEmailAfterMatch,
            )}
            initialShareStudentCode={Boolean(
              summary?.share_student_code_after_match ??
                student.shareStudentCodeAfterMatch,
            )}
            updateStudent={updateStudent}
            onSaved={reloadSummary}
          />
        )}

        {/* ════════ TAB 2: SECURITY & IDENTITY ════════ */}
        {tab === "security" && (
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Thông tin định danh cố định (Email &amp; Mã sinh viên)
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Email và Mã sinh viên được khóa tự sửa trực tiếp sau khi xác nhận đăng ký. Nếu thông tin đăng ký bị sai, bạn có thể gửi yêu cầu đính chính cho Quản trị viên.
                  </p>
                </div>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => setShowCorrectionForm((v) => !v)}
                    className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-500/35 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25"
                  >
                    {showCorrectionForm ? "Đóng biểu mẫu" : "Yêu cầu đính chính"}
                  </button>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={summary?.email || student.email}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-800 dark:disabled:text-slate-300"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mã sinh viên
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={summary?.student_code || student.studentCode}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none disabled:bg-slate-100 disabled:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:disabled:bg-slate-800 dark:disabled:text-slate-300"
                  />
                </div>
              </div>

              {showCorrectionForm && isAuthenticated && (
                <form
                  onSubmit={handleRequestIdentityCorrection}
                  className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Gửi yêu cầu đính chính Email / MSSV tới Quản trị viên
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Email đề xuất sửa (nếu sai)
                      </label>
                      <input
                        type="email"
                        value={corrEmail}
                        onChange={(e) => setCorrEmail(e.target.value)}
                        disabled={sendingCorrection}
                        placeholder="ttpt1204@fpt.edu.vn"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                        MSSV đề xuất sửa (nếu sai)
                      </label>
                      <input
                        type="text"
                        value={corrStudentCode}
                        onChange={(e) => setCorrStudentCode(e.target.value)}
                        disabled={sendingCorrection}
                        placeholder="DE120497"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Lý do đính chính <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      minLength={5}
                      maxLength={500}
                      value={corrReason}
                      onChange={(e) => setCorrReason(e.target.value)}
                      disabled={sendingCorrection}
                      placeholder="VD: Nhập nhầm 1 ký tự MSSV lúc đăng ký..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingCorrection}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                    >
                      {sendingCorrection && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Gửi yêu cầu đính chính
                    </button>
                  </div>
                </form>
              )}
            </div>

            <form
              onSubmit={handleChangePassword}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Đổi mật khẩu
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mật khẩu mới tối thiểu 8 ký tự và khác mật khẩu hiện tại.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  required
                  disabled={!isAuthenticated || changingPassword}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    disabled={!isAuthenticated || changingPassword}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nhập lại mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    disabled={!isAuthenticated || changingPassword}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isAuthenticated || changingPassword}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" />
                  {changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ════════ TAB 3: ACTIVITY & DATA EXPORT ════════ */}
        {tab === "activity" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Quản lý nhanh tin đăng đổi lớp
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tạm ẩn toàn bộ tin đăng khi bạn đã đổi xong hoặc bận, và bật
                  lại bất cứ lúc nào.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!isAuthenticated || busyActivity}
                  onClick={() => handleBulkToggle("pause-all")}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
                >
                  <PauseCircle className="h-4 w-4" />
                  Tạm dừng tất cả tin đang mở ({summary?.active_requests ?? 0})
                </button>

                <button
                  type="button"
                  disabled={!isAuthenticated || busyActivity}
                  onClick={() => handleBulkToggle("resume-all")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                >
                  <PlayCircle className="h-4 w-4" />
                  Mở lại tin đang tạm dừng ({summary?.paused_requests ?? 0})
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Sao lưu dữ liệu cá nhân
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tải về file JSON chứa thông tin tài khoản, các yêu cầu đổi
                  lớp và lịch sử thông báo của bạn.
                </p>
              </div>

              <button
                type="button"
                disabled={!isAuthenticated || busyActivity}
                onClick={handleExportData}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Tải dữ liệu cá nhân (.json)
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                  <Ban className="h-4 w-4 text-rose-500" />
                  Danh sách người dùng đã chặn ({blocks.length})
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Người bị chặn sẽ không hiển thị trong Discover và không thể nhắn tin với bạn.
                </p>
              </div>
              {blocks.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn chưa chặn sinh viên nào.
                </p>
              ) : (
                <div className="space-y-2">
                  {blocks.map((b) => (
                    <div
                      key={b.student_id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {b.full_name || "Sinh viên"} ({b.student_code_masked})
                        </p>
                        {b.reason && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {b.reason}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={unblockingId === b.student_id}
                        onClick={() => handleUnblock(b.student_id)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      >
                        {unblockingId === b.student_id ? "Đang bỏ..." : "Bỏ chặn"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ TAB 4: DANGER ZONE ════════ */}
        {tab === "danger" && (
          <div className="space-y-4 rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-500/35 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-700 dark:text-rose-400">
                  Xóa tài khoản vĩnh viễn
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Tài khoản sẽ chuyển sang trạng thái chờ xóa trong 14 ngày (bạn
                  có thể đăng nhập lại để khôi phục trước khi hết hạn). Các Match
                  đang mở sẽ bị hủy để thông báo cho đối tác, và dữ liệu báo cáo
                  vi phạm (nếu có) sẽ được ẩn danh hóa khi xóa vĩnh viễn.
                </p>
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Tài khoản Super Admin chính ({SUPER_ADMIN_EMAIL}) được khóa
                tính năng tự xóa để bảo vệ toàn hệ thống.
              </div>
            ) : (
              <form onSubmit={handleDeleteOwnAccount} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nhập mật khẩu hiện tại để xác thực
                  </label>
                  <input
                    type="password"
                    required
                    disabled={!isAuthenticated || deletingAccount}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Gõ <span className="font-bold text-rose-700 dark:text-rose-400">XOA TAI KHOAN</span>{" "}
                    để xác nhận
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isAuthenticated || deletingAccount}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="XOA TAI KHOAN"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-800"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!isAuthenticated || deletingAccount}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingAccount
                      ? "Đang xóa tài khoản..."
                      : "Xóa vĩnh viễn tài khoản"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
