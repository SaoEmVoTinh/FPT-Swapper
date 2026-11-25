"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Download,
  KeyRound,
  Loader2,
  LogOut,
  PauseCircle,
  PlayCircle,
  Save,
  Shield,
  Trash2,
  User,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MajorSelect } from "@/components/MajorSelect";
import { ApiError, apiFetch } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { Campus, StudentProfile } from "@/types";

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
  updateStudent,
  onSaved,
}: {
  student: StudentProfile;
  campuses: Campus[];
  initialBio: string;
  updateStudent: (patch: Partial<StudentProfile>) => Promise<void>;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(student.fullName);
  const [major, setMajor] = useState(student.major);
  const [campusId, setCampusId] = useState(student.campusId);
  const [avatarUrl, setAvatarUrl] = useState(student.avatarUrl || "");
  const [bio, setBio] = useState(initialBio);
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
        campusId: selectedCampusId,
        campusName: campus?.name || student.campusName,
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim(),
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          Đã lưu thay đổi hồ sơ vào hệ thống.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
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
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
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
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
          >
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Ngành &amp; Chuyên ngành
        </label>
        <MajorSelect value={major} onChange={setMajor} disabled={saving} />
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
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
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
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
        />
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
    refreshAuth,
    refreshWorkspace,
    logout,
  } = useAppState();

  const [tab, setTab] = useState<ProfileTab>("profile");
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Identity form state (email & student code)
  const [identityEmail, setIdentityEmail] = useState("");
  const [identityCode, setIdentityCode] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Activity bulk actions / export
  const [busyActivity, setBusyActivity] = useState(false);

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
    fetchSummary()
      .then((data) => {
        if (cancelled || !data) return;
        setSummary(data);
        setIdentityEmail(data.email);
        setIdentityCode(data.student_code);
      })
      .catch(() => {
        // ignore background summary error
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchSummary]);

  async function reloadSummary() {
    if (!isAuthenticated) return;
    try {
      const data = await fetchSummary();
      if (data) {
        setSummary(data);
        setIdentityEmail(data.email);
        setIdentityCode(data.student_code);
      }
    } catch {
      // ignore
    }
  }

  async function handleSaveIdentity(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    setErrorMsg("");
    setSavingIdentity(true);
    try {
      const updated = await apiFetch<AccountSummary>("/students/me/account", {
        method: "PATCH",
        body: JSON.stringify({
          email: identityEmail.trim(),
          student_code: identityCode.trim().toUpperCase(),
        }),
      });
      setSummary(updated);
      setIdentityEmail(updated.email);
      setIdentityCode(updated.student_code);
      await refreshAuth();
      setNotice("Đã cập nhật thông tin đăng nhập (Email / Mã sinh viên).");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Không thể cập nhật thông tin tài khoản.",
      );
    } finally {
      setSavingIdentity(false);
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
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {student.studentCode}
                </span>
                <span className="rounded-lg bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                  {student.role}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-600">
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Đăng xuất
              </button>
            )}
          </div>

          {summary && (
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span>
              Bạn đang xem ở chế độ demo. Hãy đăng nhập để lưu thay đổi vào hệ
              thống, đổi mật khẩu và quản lý tài khoản thật.
            </span>
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMsg}
          </div>
        )}
        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
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
                      : "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
            key={`${student.id}-${student.campusId}-${summary?.bio ?? student.bio ?? ""}`}
            student={student}
            campuses={campuses}
            initialBio={summary?.bio ?? student.bio ?? ""}
            updateStudent={updateStudent}
            onSaved={reloadSummary}
          />
        )}

        {/* ════════ TAB 2: SECURITY & IDENTITY ════════ */}
        {tab === "security" && (
          <div className="space-y-6">
            <form
              onSubmit={handleSaveIdentity}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Thông tin đăng nhập (Email &amp; Mã sinh viên)
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Bạn có thể đăng nhập bằng Email hoặc Mã sinh viên.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!isAuthenticated || isSuperAdmin || savingIdentity}
                    value={identityEmail || student.email}
                    onChange={(e) => setIdentityEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-500 dark:text-slate-400"
                  />
                  {isSuperAdmin && (
                    <p className="mt-1 text-xs text-slate-400">
                      Email Super Admin được cố định để bảo vệ quyền quản trị.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mã sinh viên
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    disabled={!isAuthenticated || savingIdentity}
                    value={identityCode || student.studentCode}
                    onChange={(e) => setIdentityCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-orange-500 disabled:bg-slate-100 disabled:text-slate-500 dark:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!isAuthenticated || savingIdentity}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {savingIdentity ? "Đang cập nhật..." : "Cập nhật định danh"}
                </button>
              </div>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Đổi mật khẩu
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Mật khẩu mới tối thiểu 6 ký tự và khác mật khẩu hiện tại.
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
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 disabled:bg-slate-100"
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
                    minLength={6}
                    disabled={!isAuthenticated || changingPassword}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nhập lại mật khẩu mới
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    disabled={!isAuthenticated || changingPassword}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 disabled:bg-slate-100"
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
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  <PauseCircle className="h-4 w-4" />
                  Tạm dừng tất cả tin đang mở ({summary?.active_requests ?? 0})
                </button>

                <button
                  type="button"
                  disabled={!isAuthenticated || busyActivity}
                  onClick={() => handleBulkToggle("resume-all")}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Tải dữ liệu cá nhân (.json)
              </button>
            </div>
          </div>
        )}

        {/* ════════ TAB 4: DANGER ZONE ════════ */}
        {tab === "danger" && (
          <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-rose-700">
                  Xóa tài khoản vĩnh viễn
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Hành động này sẽ xóa vĩnh viễn hồ sơ, toàn bộ yêu cầu đổi
                  lớp, lượt quẹt, cặp Match, đoạn chat và thông báo của bạn.
                  Không thể khôi phục sau khi xóa.
                </p>
              </div>
            </div>

            {isSuperAdmin ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
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
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Gõ <span className="font-bold text-rose-700">XOA TAI KHOAN</span>{" "}
                    để xác nhận
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!isAuthenticated || deletingAccount}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="XOA TAI KHOAN"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-rose-500 disabled:bg-slate-100"
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
