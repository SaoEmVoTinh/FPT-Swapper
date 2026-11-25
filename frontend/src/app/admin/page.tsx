"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Ban,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Flag,
  KeyRound,
  LockKeyhole,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
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

type AdminTab = "users" | "requests" | "reports" | "academic" | "logs" | "security";
type AcademicSubTab = "courses" | "semesters" | "campuses" | "classes";
type AccountStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFY";
type ReportStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";

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
  open_reports?: number;
}

interface AdminReportItem {
  id: string;
  reporter_id?: string | null;
  reporter_email?: string | null;
  reporter_label?: string | null;
  reported_student_id?: string | null;
  reported_email?: string | null;
  reported_label?: string | null;
  conversation_id?: string | null;
  reason: string;
  details?: string | null;
  status: ReportStatus;
  resolved_by_email?: string | null;
  resolution_note?: string | null;
  created_at: string;
  updated_at: string;
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

interface AdminAnalyticsSeriesItem {
  date: string;
  new_students: number;
  new_requests: number;
  new_matches: number;
  confirmed_matches: number;
  new_messages: number;
}

interface AdminAnalyticsResponse {
  days: number;
  series: AdminAnalyticsSeriesItem[];
  request_status_breakdown: Record<string, number>;
  match_status_breakdown: Record<string, number>;
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
    (student.role === "SUPER_ADMIN" ||
      student.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL);
  const isAdminOrAbove =
    isSuperAdmin || (isAuthenticated && student.role === "ADMIN");
  const isStaff =
    isAdminOrAbove || (isAuthenticated && student.role === "MODERATOR");

  const [tab, setTab] = useState<AdminTab>("users");
  const [academicTab, setAcademicTab] = useState<AcademicSubTab>("courses");

  // Admin 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetup, setTotpSetup] = useState<{
    secret: string;
    otpauth_uri: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [busy2FA, setBusy2FA] = useState(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [requests, setRequests] = useState<AdminRequestItem[]>([]);
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [reportFilter, setReportFilter] = useState<string>("ALL");
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [busyReportId, setBusyReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [flashMsg, setFlashMsg] = useState("");

  // Broadcast announcement state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastCampusId, setBroadcastCampusId] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Course edit + Timetable import state
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseCredits, setEditCourseCredits] = useState(3);
  const [importingTkb, setImportingTkb] = useState(false);
  const [importCampusId, setImportCampusId] = useState("");
  const [importSemesterId, setImportSemesterId] = useState("");

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
    const [ov, an, usr, reqs, reps, logs] = await Promise.all([
      apiFetch<AdminOverview>("/admin/overview"),
      apiFetch<AdminAnalyticsResponse>("/admin/analytics?days=14"),
      apiFetch<AdminUserItem[]>(`/admin/users${qParam}`),
      apiFetch<AdminRequestItem[]>("/admin/requests?limit=100"),
      apiFetch<AdminReportItem[]>("/admin/reports"),
      apiFetch<AdminAuditLogItem[]>("/admin/audit-logs?limit=50"),
    ]);
    return { ov, an, usr, reqs, reps, logs };
  }, []);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;
    Promise.all([
      loadAdminBundle(""),
      apiFetch<{ totp_enabled: boolean }>("/auth/2fa/status"),
    ])
      .then(([data, twoFa]) => {
        if (cancelled) return;
        setOverview(data.ov);
        setAnalytics(data.an);
        setUsers(data.usr);
        setRequests(data.reqs);
        setReports(data.reps);
        setAuditLogs(data.logs);
        setTotpEnabled(Boolean(twoFa.totp_enabled));
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
  }, [isStaff, loadAdminBundle]);

  async function refreshAll(searchOverride?: string) {
    if (!isStaff) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await loadAdminBundle(
        searchOverride !== undefined ? searchOverride : userSearch,
      );
      setOverview(data.ov);
      setAnalytics(data.an);
      setUsers(data.usr);
      setRequests(data.reqs);
      setReports(data.reps);
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

  async function handleChangeRole(target: AdminUserItem, nextRole: UserRole) {
    setBusyUserId(target.id);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch(`/admin/users/${target.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      setFlashMsg(`Đã cập nhật vai trò của ${target.email} thành ${nextRole}.`);
      await refreshAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể cập nhật vai trò.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleSetup2FA() {
    setBusy2FA(true);
    setErrorMsg("");
    setFlashMsg("");
    try {
      const res = await apiFetch<{ secret: string; otpauth_uri: string }>(
        "/auth/2fa/setup",
        { method: "POST" },
      );
      setTotpSetup(res);
      setTotpCode("");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể khởi tạo 2FA.",
      );
    } finally {
      setBusy2FA(false);
    }
  }

  async function handleEnable2FA(e: React.FormEvent) {
    e.preventDefault();
    setBusy2FA(true);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch("/auth/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      setTotpEnabled(true);
      setTotpSetup(null);
      setTotpCode("");
      setFlashMsg("Đã bật xác thực 2FA cho tài khoản quản trị.");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Mã OTP không hợp lệ.",
      );
    } finally {
      setBusy2FA(false);
    }
  }

  async function handleDisable2FA(e: React.FormEvent) {
    e.preventDefault();
    setBusy2FA(true);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch("/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({
          password: disablePassword,
          code: totpCode.trim(),
        }),
      });
      setTotpEnabled(false);
      setDisablePassword("");
      setTotpCode("");
      setFlashMsg("Đã tắt xác thực 2FA.");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể tắt 2FA.",
      );
    } finally {
      setBusy2FA(false);
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

  async function handleResolveReport(
    reportId: string,
    status: ReportStatus,
    action: "NONE" | "WARN" | "SUSPEND",
  ) {
    setBusyReportId(reportId);
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch<AdminReportItem>(`/admin/reports/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          action,
          resolution_note: reportNotes[reportId]?.trim() || null,
        }),
      });
      setFlashMsg(
        action === "SUSPEND"
          ? "Đã xử lý báo cáo và tạm khóa tài khoản vi phạm."
          : action === "WARN"
            ? "Đã xử lý báo cáo và gửi cảnh cáo."
            : "Đã cập nhật trạng thái báo cáo.",
      );
      await refreshAll();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Không thể xử lý báo cáo.",
      );
    } finally {
      setBusyReportId(null);
    }
  }

  function handleExportCsv(resource: "users" | "requests" | "reports" | "audit_logs") {
    window.open(`/api/v1/admin/export/${resource}`, "_blank", "noopener,noreferrer");
  }

  async function handleBulkUserStatus(newStatus: "ACTIVE" | "SUSPENDED") {
    if (selectedUserIds.length === 0) return;
    setErrorMsg("");
    setFlashMsg("");
    try {
      const res = await apiFetch<{ updated: number; skipped: number }>(
        "/admin/users/bulk-status",
        {
          method: "POST",
          body: JSON.stringify({ student_ids: selectedUserIds, status: newStatus }),
        },
      );
      setSelectedUserIds([]);
      setFlashMsg(
        `Đã cập nhật hàng loạt ${res.updated} tài khoản (bỏ qua ${res.skipped}).`,
      );
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Thao tác hàng loạt thất bại.");
    }
  }

  async function handleBulkDeleteRequests() {
    if (selectedRequestIds.length === 0) return;
    setErrorMsg("");
    setFlashMsg("");
    try {
      const res = await apiFetch<{ deleted: number }>("/admin/requests/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ request_ids: selectedRequestIds }),
      });
      setSelectedRequestIds([]);
      setFlashMsg(`Đã xóa hàng loạt ${res.deleted} tin đăng.`);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Không thể xóa hàng loạt.");
    }
  }

  async function handleUpdateCourse(courseId: string) {
    if (!editCourseName.trim()) return;
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch(`/academic/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editCourseName.trim(),
          credits: Number(editCourseCredits) || 3,
        }),
      });
      setEditingCourseId(null);
      setFlashMsg("Đã cập nhật thông tin môn học.");
      await Promise.all([refreshWorkspace(), refreshAll()]);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Không thể sửa môn học.");
    }
  }

  async function handleDeleteCourse(courseId: string, code: string) {
    setErrorMsg("");
    setFlashMsg("");
    try {
      await apiFetch(`/academic/courses/${courseId}`, { method: "DELETE" });
      setFlashMsg(`Đã xóa môn học ${code}.`);
      await Promise.all([refreshWorkspace(), refreshAll()]);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Không thể xóa môn học.");
    }
  }

  async function handleTimetableFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportingTkb(true);
    setErrorMsg("");
    setFlashMsg("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (typeof reader.result !== "string") return;
        const res = await apiFetch<{
          created_classes: number;
          updated_classes: number;
          created_schedules: number;
          errors: string[];
        }>("/admin/academic/import-timetable", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            content_base64: reader.result,
            semester_id: importSemesterId || semesters.find((s) => s.isActive)?.id || null,
            campus_id: importCampusId || campuses[0]?.id || null,
          }),
        });
        setFlashMsg(
          `Import TKB thành công: +${res.created_classes} lớp mới, cập nhật ${res.updated_classes} lớp, +${res.created_schedules} lịch học${res.errors.length ? ` (${res.errors.length} dòng lỗi)` : ""}.`,
        );
        await Promise.all([refreshWorkspace(), refreshAll()]);
      } catch (err) {
        setErrorMsg(err instanceof ApiError ? err.message : "Import TKB thất bại.");
      } finally {
        setImportingTkb(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleDownloadSampleTkbCsv() {
    const sample =
      "course_code,class_code,day_of_week,slot,campus_code,semester_code\n" +
      "PRJ301,SE1805,Thứ 2 & Thứ 4,Slot 1 (07:00 - 09:15),HN,FA2025\n" +
      "VOV112,Lớp 02,Thứ 3 & Thứ 5,Slot 2 (08:45 - 10:15),HN,FA2025\n";
    const blob = new Blob(["\ufeff" + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fpt_timetable_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setSendingBroadcast(true);
    setErrorMsg("");
    setFlashMsg("");
    try {
      const res = await apiFetch<{ sent_count: number }>("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          campus_id: broadcastCampusId || null,
        }),
      });
      setBroadcastTitle("");
      setBroadcastBody("");
      setFlashMsg(`Đã gửi thông báo toàn hệ thống tới ${res.sent_count} tài khoản.`);
      await refreshAll();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : "Không thể gửi thông báo.");
    } finally {
      setSendingBroadcast(false);
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

  if (!isStaff) {
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
            Trang Admin chỉ dành cho các tài khoản quản trị (SUPER_ADMIN, ADMIN,
            MODERATOR).
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
    {
      key: "reports",
      label: `Báo cáo (${reports.filter((r) => r.status === "OPEN" || r.status === "UNDER_REVIEW").length}/${reports.length})`,
      icon: Flag,
    },
    { key: "academic", label: "Học vụ", icon: BookOpen },
    { key: "logs", label: `Nhật ký (${auditLogs.length})`, icon: Activity },
    { key: "security", label: "Bảo mật 2FA", icon: LockKeyhole },
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
                Vai trò:{" "}
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {student.role}
                </span>{" "}
                · {student.email}
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
          <div className="space-y-4">
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
                  {overview.total_courses} môn · {overview.total_campuses} cơ sở ·{" "}
                  {overview.open_reports ?? 0} báo cáo chờ
                </p>
              </div>
            </div>

            {analytics && analytics.series.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                      Xu hướng 14 ngày gần nhất (Tin đăng / Matches / Tin nhắn)
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      Cam: Yêu cầu • Xanh: Match • Tím: Tin nhắn
                    </span>
                  </div>
                  <div className="flex h-32 items-end gap-1.5">
                    {(() => {
                      const maxVal = Math.max(
                        1,
                        ...analytics.series.map((s) =>
                          Math.max(s.new_requests, s.new_matches, s.new_messages),
                        ),
                      );
                      return analytics.series.map((d) => (
                        <div
                          key={d.date}
                          className="flex flex-1 flex-col items-center gap-1"
                          title={`${d.date}: ${d.new_requests} yêu cầu, ${d.new_matches} match, ${d.new_messages} tin nhắn`}
                        >
                          <div className="flex h-24 w-full items-end justify-center gap-0.5">
                            <div
                              className="w-1.5 rounded-t bg-orange-500"
                              style={{ height: `${Math.max(4, Math.round((d.new_requests / maxVal) * 90))}%` }}
                            />
                            <div
                              className="w-1.5 rounded-t bg-emerald-500"
                              style={{ height: `${Math.max(4, Math.round((d.new_matches / maxVal) * 90))}%` }}
                            />
                            <div
                              className="w-1.5 rounded-t bg-violet-500"
                              style={{ height: `${Math.max(4, Math.round((d.new_messages / maxVal) * 90))}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-slate-400">
                            {d.date.slice(8)}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {isAdminOrAbove && (
                  <form
                    onSubmit={handleSendBroadcast}
                    className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <h2 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <Megaphone className="h-4 w-4 text-orange-500" />
                      Thông báo toàn hệ thống
                    </h2>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Tiêu đề thông báo..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <textarea
                      rows={2}
                      required
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Nội dung gửi tới sinh viên..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-orange-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={broadcastCampusId}
                        onChange={(e) => setBroadcastCampusId(e.target.value)}
                        aria-label="Chọn cơ sở nhận thông báo"
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">Tất cả cơ sở</option>
                        {campuses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={sendingBroadcast}
                        className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                      >
                        {sendingBroadcast ? "Đang gửi..." : "Phát tin"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportCsv("users")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  Xuất CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateUser((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  <UserPlus className="h-4 w-4" />
                  {showCreateUser ? "Đóng form" : "Thêm tài khoản"}
                </button>
              </div>
            </div>

            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-xs dark:border-orange-500/35 dark:bg-orange-500/10">
                <span className="font-semibold text-orange-800 dark:text-orange-200">
                  Đã chọn {selectedUserIds.length} tài khoản
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBulkUserStatus("SUSPENDED")}
                    className="rounded-lg bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700"
                  >
                    Khóa hàng loạt
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleBulkUserStatus("ACTIVE")}
                    className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700"
                  >
                    Mở khóa hàng loạt
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}

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
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 8 ký tự"
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
                      {isSuperAdmin && (
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      )}
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
                    minLength={8}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Mật khẩu mới (>= 8 ký tự)"
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
                        <div className="flex items-start gap-3">
                          {!isSelfSuperAdmin && (
                            <input
                              type="checkbox"
                              aria-label={`Chọn ${u.email}`}
                              checked={selectedUserIds.includes(u.id)}
                              onChange={(e) =>
                                setSelectedUserIds((prev) =>
                                  e.target.checked
                                    ? [...prev, u.id]
                                    : prev.filter((id) => id !== u.id),
                                )
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500"
                            />
                          )}
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
                        </div>

                        {!isSelfSuperAdmin && (
                          <div className="flex flex-wrap items-center gap-2">
                            {isSuperAdmin && (
                              <select
                                value={u.role}
                                disabled={busy}
                                aria-label={`Vai trò của ${u.email}`}
                                onChange={(e) =>
                                  handleChangeRole(u, e.target.value as UserRole)
                                }
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <option value="STUDENT">STUDENT</option>
                                <option value="MODERATOR">MODERATOR</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              </select>
                            )}
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-sm">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Lọc theo mã SV, môn học, mã lớp..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900"
                />
              </div>
              <button
                type="button"
                onClick={() => handleExportCsv("requests")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Xuất CSV
              </button>
            </div>

            {selectedRequestIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs dark:border-rose-500/35 dark:bg-rose-500/10">
                <span className="font-semibold text-rose-800 dark:text-rose-200">
                  Đã chọn {selectedRequestIds.length} tin đăng
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBulkDeleteRequests()}
                    className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white hover:bg-rose-700"
                  >
                    Xóa hàng loạt
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRequestIds([])}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}

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
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          aria-label={`Chọn tin ${r.course_code || r.id}`}
                          checked={selectedRequestIds.includes(r.id)}
                          onChange={(e) =>
                            setSelectedRequestIds((prev) =>
                              e.target.checked
                                ? [...prev, r.id]
                                : prev.filter((id) => id !== r.id),
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500"
                        />
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

                {isAdminOrAbove && (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Import danh sách lớp &amp; lịch học từ Excel (.xlsx) / CSV
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Cột bắt buộc: <code>course_code, class_code, day_of_week, slot</code> (tùy chọn: <code>campus_code, semester_code</code>).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadSampleTkbCsv}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Tải file mẫu CSV
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={importCampusId || campuses[0]?.id || ""}
                        onChange={(e) => setImportCampusId(e.target.value)}
                        aria-label="Cơ sở mặc định khi import TKB"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {campuses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                      <select
                        value={importSemesterId || semesters.find((s) => s.isActive)?.id || semesters[0]?.id || ""}
                        onChange={(e) => setImportSemesterId(e.target.value)}
                        aria-label="Học kỳ mặc định khi import TKB"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {semesters.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600">
                        <Upload className="h-3.5 w-3.5" />
                        {importingTkb ? "Đang import..." : "Chọn file .xlsx / .csv"}
                        <input
                          type="file"
                          accept=".xlsx,.csv"
                          disabled={importingTkb}
                          onChange={handleTimetableFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    {courses.map((course) => {
                      const isEditing = editingCourseId === course.id;
                      return (
                        <div
                          key={course.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {course.code}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-lg bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {course.credits} tín chỉ
                              </span>
                              {isAdminOrAbove && (
                                <>
                                  <button
                                    type="button"
                                    aria-label={`Sửa môn ${course.code}`}
                                    onClick={() => {
                                      setEditingCourseId(isEditing ? null : course.id);
                                      setEditCourseName(course.name);
                                      setEditCourseCredits(course.credits);
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Xóa môn ${course.code}`}
                                    onClick={() => void handleDeleteCourse(course.id, course.code)}
                                    className="rounded-lg border border-rose-200 bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <input
                                type="text"
                                value={editCourseName}
                                onChange={(e) => setEditCourseName(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              />
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={editCourseCredits}
                                onChange={(e) => setEditCourseCredits(Number(e.target.value) || 3)}
                                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => void handleUpdateCourse(course.id)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                Lưu
                              </button>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                              {course.name}
                            </p>
                          )}
                        </div>
                      );
                    })}
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
                              {course?.code ?? cls.courseId} - {cls.code}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {campus?.name ?? "Campus"}
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

        {/* ═════════ TAB: REPORTS MODERATION QUEUE ═════════ */}
        {tab === "reports" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
              {(["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setReportFilter(st)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      reportFilter === st
                        ? "bg-slate-900 text-white dark:bg-orange-500"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    {st === "ALL" ? `Tất cả (${reports.length})` : st}
                  </button>
                ),
              )}
              </div>
              <button
                type="button"
                onClick={() => handleExportCsv("reports")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Xuất CSV
              </button>
            </div>

            <div className="space-y-3">
              {reports.filter((r) => reportFilter === "ALL" || r.status === reportFilter)
                .length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  Không có báo cáo nào trong bộ lọc này.
                </div>
              ) : (
                reports
                  .filter((r) => reportFilter === "ALL" || r.status === reportFilter)
                  .map((rep) => {
                    const busy = busyReportId === rep.id;
                    return (
                      <div
                        key={rep.id}
                        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {rep.reason}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                rep.status === "RESOLVED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                  : rep.status === "DISMISSED"
                                    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                              }`}
                            >
                              {rep.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatDateTime(rep.created_at)}
                          </span>
                        </div>

                        <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                          <p>
                            Người báo cáo:{" "}
                            <span className="font-semibold">
                              {rep.reporter_label || rep.reporter_email || "Đã ẩn danh"}
                            </span>
                          </p>
                          <p>
                            Người bị báo cáo:{" "}
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              {rep.reported_label || rep.reported_email || "Đã ẩn danh"}
                            </span>
                          </p>
                        </div>

                        {rep.details && (
                          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {rep.details}
                          </p>
                        )}

                        {rep.resolution_note && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            Ghi chú xử lý ({rep.resolved_by_email || "Staff"}):{" "}
                            {rep.resolution_note}
                          </p>
                        )}

                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            value={reportNotes[rep.id] ?? rep.resolution_note ?? ""}
                            onChange={(e) =>
                              setReportNotes((prev) => ({
                                ...prev,
                                [rep.id]: e.target.value,
                              }))
                            }
                            placeholder="Ghi chú lý do xử lý (sẽ gửi tới người báo cáo)..."
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleResolveReport(rep.id, "RESOLVED", "WARN")
                              }
                              className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                              Cảnh cáo
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleResolveReport(rep.id, "RESOLVED", "SUSPEND")
                              }
                              className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              Khóa TK
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleResolveReport(rep.id, "RESOLVED", "NONE")
                              }
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Đã xử lý
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                handleResolveReport(rep.id, "DISMISSED", "NONE")
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* ═════════ TAB 4: AUDIT LOGS ═════════ */}
        {tab === "logs" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleExportCsv("audit_logs")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Xuất CSV Nhật ký
              </button>
            </div>
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
                      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {JSON.stringify(log.details)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        )}

        {/* ═════════ TAB 5: ADMIN 2FA SECURITY ═════════ */}
        {tab === "security" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Xác thực 2 lớp (2FA TOTP) cho Quản trị viên
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Bảo vệ tài khoản quản trị bằng mã OTP 6 chữ số (Google
                  Authenticator / Authy).
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  totpEnabled
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {totpEnabled ? "Đang bật 2FA" : "Chưa bật 2FA"}
              </span>
            </div>

            {!totpEnabled ? (
              <div className="space-y-4">
                <button
                  type="button"
                  disabled={busy2FA}
                  onClick={handleSetup2FA}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {totpSetup ? "Tạo lại khóa bí mật" : "Thiết lập 2FA ngay"}
                </button>

                {totpSetup && (
                  <form
                    onSubmit={handleEnable2FA}
                    className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/40 p-4 dark:border-orange-500/35 dark:bg-orange-500/10"
                  >
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Nhập mã khóa sau vào ứng dụng Authenticator:
                    </p>
                    <p className="break-all rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                      {totpSetup.secret}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        placeholder="Nhập mã OTP 6 số"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tracking-widest outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={busy2FA}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-orange-500"
                      >
                        Xác nhận kích hoạt
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleDisable2FA}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70"
              >
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tắt 2FA (yêu cầu mật khẩu hiện tại + mã OTP 6 số):
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    required
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Mật khẩu hiện tại"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="Mã OTP 6 số"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tracking-widest outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={busy2FA}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Tắt 2FA
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
