"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Ban,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MajorSelect } from "@/components/MajorSelect";
import { ApiError, apiFetch } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { DEMO_CLASSES } from "@/lib/demo-data";
import { UserRole } from "@/types";

const SUPER_ADMIN_EMAIL = "pmquan1406@gmail.com";

type AdminTab = "users" | "requests" | "academic" | "logs";
type AcademicSubTab = "courses" | "semesters" | "campuses" | "classes";
type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFY";

interface AdminOverview {
  total_students: number;
  active_students: number;
  suspended_students: number;
  total_requests: number;
  active_requests: number;
  matched_requests: number;
  total_matches: number;
  confirmed_matches: number;
  completed_matches: number;
  total_messages: number;
  total_courses: number;
  total_campuses: number;
}

interface AdminUserItem {
  id: string;
  email: string;
  student_code: string;
  full_name?: string | null;
  major?: string | null;
  campus_id: string;
  campus_code?: string | null;
  campus_name?: string | null;
  role: UserRole;
  status: AccountStatus;
  request_count: number;
  created_at: string;
}

interface AdminRequestItem {
  id: string;
  student_id: string;
  student_email: string;
  student_code: string;
  student_name?: string | null;
  campus_name?: string | null;
  course_code?: string | null;
  semester_name?: string | null;
  current_class_code?: string | null;
  target_class_code?: string | null;
  status: string;
  note?: string | null;
  created_at: string;
}

interface AdminAuditLogItem {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const {
    student,
    isAuthenticated,
    campuses,
    semesters,
    courses,
    refreshWorkspace,
  } = useAppState();

  const isSuperAdmin =
    isAuthenticated &&
    student.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;

  const [tab, setTab] = useState<AdminTab>("users");
  const [academicTab, setAcademicTab] = useState<AcademicSubTab>("courses");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [requests, setRequests] = useState<AdminRequestItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [flashMsg, setFlashMsg] = useState("");

  // User search + create form
  const [userSearch, setUserSearch] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newMajor, setNewMajor] = useState("Kỹ thuật phần mềm");
  const [newCampusId, setNewCampusId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("STUDENT");
  const [creatingUser, setCreatingUser] = useState(false);

  // Per-user actions
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(
    null,
  );
  const [resetUserTarget, setResetUserTarget] = useState<AdminUserItem | null>(
    null,
  );
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  // Swap requests filter + delete
  const [requestSearch, setRequestSearch] = useState("");
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  // Add course form
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCredits, setCourseCredits] = useState(3);
  const [creatingCourse, setCreatingCourse] = useState(false);

  const selectedCampusId = newCampusId || campuses[0]?.id || "";

  const loadAdminBundle = useCallback(async (searchQuery: string) => {
    const qParam = searchQuery.trim()
      ? `?q=${encodeURIComponent(searchQuery.trim())}`
      : "";
    const [ov, usr, reqs, logs] = await Promise.all([
      apiFetch<AdminOverview>("/admin/overview"),
      apiFetch<AdminUserItem[]>(`/admin/users${qParam}`),
      apiFetch<AdminRequestItem[]>("/admin/requests?limit=100"),
      apiFetch<AdminAuditLogItem[]>("/admin/audit-logs?limit=50"),
    ]);
    return { ov, usr, reqs, logs };
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    loadAdminBundle("")
      .then((data) => {
        if (cancelled) return;
        setOverview(data.ov);
        setUsers(data.usr);
        setRequests(data.reqs);
        setAuditLogs(data.logs);
        setErrorMsg("");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(
          err instanceof ApiError
            ? err.message
            : "Không thể tải dữ liệu quản trị.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, loadAdminBundle]);

  async function refreshAll(searchOverride?: string) {
    if (!isSuperAdmin) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await loadAdminBundle(
        searchOverride !== undefined ? searchOverride : userSearch,
      );
      setOverview(data.ov);
      setUsers(data.usr);
      setRequests(data.reqs);
      setAuditLogs(data.logs);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Không thể tải lại dữ liệu quản trị.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampusId) {
      setErrorMsg("Vui lòng chọn cơ sở học tập.");
      return;
    }
    setCreatingUser(true);
    setErrorMsg("");
    setFlashMsg("");
    try {
      const created = await apiFetch<AdminUserItem>("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: newEmail.trim(),
          student_code: newCode.trim().toUpperCase(),
          full_name: newFullName.trim(),
          major: newMajor,
          campus_id: selectedCampusId,
          password: newPassword,
          role: newRole,
        }),
      });
      setFlashMsg(
        `Đã tạo tài khoản ${created.full_name || created.email} (${created.student_code}).`,
      );
      setNewEmail("");
      setNewCode("");
      setNewFullName("");
      setNewPassword("");
      setNewRole("STUDENT");
      setShowCreateUser(false);
      await refreshAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể tạo tài khoản.",
      );
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleToggleStatus(target: AdminUserItem) {
    const nextStatus: AccountStatus =
      target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setBusyUserId(target.id);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch<AdminUserItem>(`/admin/users/${target.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setFlashMsg(
        nextStatus === "SUSPENDED"
          ? `Đã khóa tài khoản ${target.email}.`
          : `Đã mở khóa tài khoản ${target.email}.`,
      );
      await refreshAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : "Không thể cập nhật trạng thái tài khoản.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUserTarget) return;
    setBusyUserId(resetUserTarget.id);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch(`/admin/users/${resetUserTarget.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ new_password: resetPasswordValue }),
      });
      setFlashMsg(
        `Đã đặt lại mật khẩu cho tài khoản ${resetUserTarget.email}.`,
      );
      setResetUserTarget(null);
      setResetPasswordValue("");
      await refreshAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể đặt lại mật khẩu.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDeleteUser(target: AdminUserItem) {
    setBusyUserId(target.id);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch(`/admin/users/${target.id}`, {
        method: "DELETE",
      });
      setConfirmDeleteUserId(null);
      setFlashMsg(`Đã xóa tài khoản ${target.email} và dữ liệu liên quan.`);
      await refreshAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể xóa tài khoản.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDeleteRequest(reqId: string) {
    setBusyRequestId(reqId);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch(`/admin/requests/${reqId}`, { method: "DELETE" });
      setFlashMsg("Đã xóa tin đăng đổi lớp.");
      await refreshAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể xóa tin đăng.",
      );
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCourse(true);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch("/academic/courses", {
        method: "POST",
        body: JSON.stringify({
          code: courseCode.trim().toUpperCase(),
          name: courseName.trim(),
          credits: Number(courseCredits) || 3,
        }),
      });
      setFlashMsg(`Đã thêm môn học ${courseCode.trim().toUpperCase()}.`);
      setCourseCode("");
      setCourseName("");
      setCourseCredits(3);
      await Promise.all([refreshWorkspace(), refreshAll()]);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể thêm môn học.",
      );
    } finally {
      setCreatingCourse(false);
    }
  }

  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.student_email.toLowerCase().includes(q) ||
        r.student_code.toLowerCase().includes(q) ||
        (r.student_name ?? "").toLowerCase().includes(q) ||
        (r.course_code ?? "").toLowerCase().includes(q) ||
        (r.current_class_code ?? "").toLowerCase().includes(q) ||
        (r.target_class_code ?? "").toLowerCase().includes(q),
    );
  }, [requests, requestSearch]);

  if (!isSuperAdmin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
            Không có quyền truy cập trang Quản trị
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Trang Admin chỉ cấp quyền truy cập duy nhất cho tài khoản quản trị
            viên hệ thống ({SUPER_ADMIN_EMAIL}).
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Về Tổng quan
            </Link>
            {!isAuthenticated && (
              <Link
                href="/login"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Đăng nhập tài khoản Admin
              </Link>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const mainTabs: Array<{
    key: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "users", label: `Tài khoản (${users.length})`, icon: Users },
    {
      key: "requests",
      label: `Tin đăng (${requests.length})`,
      icon: ClipboardList,
    },
    { key: "academic", label: "Học vụ", icon: BookOpen },
    { key: "logs", label: `Nhật ký (${auditLogs.length})`, icon: Activity },
  ];

  const academicTabs: Array<{
    key: AcademicSubTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "courses", label: `Môn học (${courses.length})`, icon: BookOpen },
    {
      key: "semesters",
      label: `Học kỳ (${semesters.length})`,
      icon: CalendarDays,
    },
    {
      key: "campuses",
      label: `Cơ sở (${campuses.length})`,
      icon: Building2,
    },
    {
      key: "classes",
      label: `Lớp mẫu (${DEMO_CLASSES.length})`,
      icon: ShieldCheck,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Trung tâm Quản trị FPT Swapper
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Quyền Super Admin duy nhất:{" "}
                <span className="font-semibold text-slate-800">
                  {student.email}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refreshAll()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Làm mới dữ liệu
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMsg}
          </div>
        )}
        {flashMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {flashMsg}
          </div>
        )}

        {/* Overview KPIs */}
        {overview && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tài khoản</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {overview.total_students}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {overview.active_students} hoạt động ·{" "}
                {overview.suspended_students} đang khóa
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tin đăng đổi lớp
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {overview.total_requests}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {overview.active_requests} đang tìm · {overview.matched_requests}{" "}
                đã ghép
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Cặp ghép (Matches)
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {overview.total_matches}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {overview.confirmed_matches} xác nhận ·{" "}
                {overview.completed_matches} hoàn tất
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tin nhắn & Học vụ
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {overview.total_messages}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {overview.total_courses} môn học · {overview.total_campuses} cơ
                sở
              </p>
            </div>
          </div>
        )}

        {/* Main Tabs */}
        <div className="flex flex-wrap gap-2">
          {mainTabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ═════════ TAB 1: USERS ═════════ */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  refreshAll(userSearch);
                }}
                className="flex flex-1 items-center gap-2"
              >
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tìm theo email, mã SV, họ tên, ngành..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tìm
                </button>
              </form>

              <button
                type="button"
                onClick={() => setShowCreateUser((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <UserPlus className="h-4 w-4" />
                {showCreateUser ? "Đóng form" : "Thêm tài khoản"}
              </button>
            </div>

            {/* Create User Form */}
            {showCreateUser && (
              <form
                onSubmit={handleCreateUser}
                className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm"
              >
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tạo tài khoản sinh viên mới
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="ten@fpt.edu.vn"
                      className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Mã sinh viên *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={4}
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="DE210999"
                      className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm uppercase outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Mật khẩu khởi tạo *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
                      className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Cơ sở *
                    </label>
                    <select
                      value={selectedCampusId}
                      onChange={(e) => setNewCampusId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    >
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      Vai trò
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="MODERATOR">MODERATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Ngành / Chuyên ngành
                  </label>
                  <MajorSelect value={newMajor} onChange={setNewMajor} />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {creatingUser ? "Đang tạo..." : "Xác nhận tạo tài khoản"}
                  </button>
                </div>
              </form>
            )}

            {/* Reset Password Inline Box */}
            {resetUserTarget && (
              <form
                onSubmit={handleResetPassword}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="text-sm text-amber-950">
                  Đặt lại mật khẩu mới cho{" "}
                  <span className="font-bold">{resetUserTarget.email}</span> (
                  {resetUserTarget.student_code})
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Mật khẩu mới (>= 6 ký tự)"
                    className="rounded-xl border border-amber-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busyUserId === resetUserTarget.id}
                    className="rounded-xl bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
                  >
                    Lưu mật khẩu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetUserTarget(null);
                      setResetPasswordValue("");
                    }}
                    className="rounded-xl border border-amber-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-sm font-semibold text-amber-900"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {/* User List */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Chưa có tài khoản phù hợp.
                  </p>
                ) : (
                  users.map((u) => {
                    const isSelfSuperAdmin =
                      u.email.toLowerCase() === SUPER_ADMIN_EMAIL;
                    const busy = busyUserId === u.id;
                    return (
                      <div
                        key={u.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {u.full_name || "Chưa cập nhật tên"}
                            </span>
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {u.student_code}
                            </span>
                            <span
                              className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                                u.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {u.status === "ACTIVE"
                                ? "Hoạt động"
                                : "Đang khóa"}
                            </span>
                            {u.role !== "STUDENT" && (
                              <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                {u.role}
                              </span>
                            )}
                            {isSelfSuperAdmin && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                                <LockKeyhole className="h-3 w-3" />
                                Super Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{u.email}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {u.campus_name || u.campus_code || "Campus"} ·{" "}
                            {u.major || "Chưa chọn ngành"} · {u.request_count}{" "}
                            tin đăng · Tạo lúc {formatDateTime(u.created_at)}
                          </p>
                        </div>

                        {!isSelfSuperAdmin && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleToggleStatus(u)}
                              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                                u.status === "ACTIVE"
                                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {u.status === "ACTIVE" ? (
                                <>
                                  <Ban className="h-3.5 w-3.5" />
                                  Khóa
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Mở khóa
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setResetUserTarget(u);
                                setResetPasswordValue("");
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              Đổi MK
                            </button>

                            {confirmDeleteUserId === u.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDeleteUser(u)}
                                  className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                                >
                                  Xác nhận xóa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setConfirmDeleteUserId(u.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xóa
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════════ TAB 2: SWAP REQUESTS ═════════ */}
        {tab === "requests" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Lọc theo mã SV, môn học, mã lớp..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Không có tin đăng nào.
                  </p>
                ) : (
                  filteredRequests.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700">
                            {r.course_code || "COURSE"}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {r.current_class_code || "?"} →{" "}
                            {r.target_class_code || "?"}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {r.student_name || r.student_email} ({r.student_code})
                          · {r.campus_name || "Campus"} ·{" "}
                          {r.semester_name || "Học kỳ"} ·{" "}
                          {formatDateTime(r.created_at)}
                        </p>
                        {r.note && (
                          <p className="text-xs italic text-slate-500 dark:text-slate-400">
                            “{r.note}”
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={busyRequestId === r.id}
                        onClick={() => handleDeleteRequest(r.id)}
                        className="inline-flex items-center gap-1.5 self-start rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:self-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa tin
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═════════ TAB 3: ACADEMIC CATALOG ═════════ */}
        {tab === "academic" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {academicTabs.map((item) => {
                const Icon = item.icon;
                const active = academicTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAcademicTab(item.key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-orange-500 text-white"
                        : "border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {academicTab === "courses" && (
              <div className="space-y-4">
                <form
                  onSubmit={handleCreateCourse}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm sm:grid-cols-4"
                >
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="Mã môn (VD: SWP391)"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm uppercase outline-none focus:border-orange-400"
                  />
                  <input
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="Tên môn học"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:col-span-2"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={courseCredits}
                      onChange={(e) =>
                        setCourseCredits(Number(e.target.value) || 3)
                      }
                      className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={creatingCourse}
                      className="flex-1 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      + Thêm môn
                    </button>
                  </div>
                </form>

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {course.code}
                          </span>
                          <span className="rounded-lg bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {course.credits} tín chỉ
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {course.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {academicTab === "semesters" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm">
                <div className="space-y-3">
                  {semesters.map((semester) => (
                    <div
                      key={semester.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {semester.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Mã kỳ: {semester.code}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          semester.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-200 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {semester.isActive ? "Đang mở" : "Lưu trữ"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {academicTab === "campuses" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {campuses.map((campus) => (
                    <div
                      key={campus.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70"
                    >
                      <p className="text-xs font-bold uppercase text-orange-600">
                        {campus.code}
                      </p>
                      <p className="mt-1 font-bold text-slate-900 dark:text-slate-100">
                        {campus.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {academicTab === "classes" && (
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm">
                <div className="space-y-3">
                  {DEMO_CLASSES.map((cls) => {
                    const course = courses.find((c) => c.id === cls.courseId);
                    const campus = campuses.find((c) => c.id === cls.campusId);
                    return (
                      <div
                        key={cls.id}
                        className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {cls.code}
                            </span>
                            <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                              {course?.code ?? cls.courseId}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {campus?.name ?? "Campus"} · {cls.lecturer}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          {cls.isSwappable ? "Cho phép đổi" : "Đóng"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═════════ TAB 4: AUDIT LOGS ═════════ */}
        {tab === "logs" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Chưa có nhật ký quản trị nào.
                </p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                          {log.action}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {log.entity_type}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Thực hiện bởi:{" "}
                      <span className="font-semibold">
                        {log.actor_email || "System"}
                      </span>
                    </p>
                    {log.details && (
                      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:text-slate-300">
                        {JSON.stringify(log.details)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
