"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api";
import { DEMO_CLASSES } from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";
import { AcademicClass } from "@/types";

const DEFAULT_SLOTS = [
  { suffix: "01", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 1 (07:30 - 09:50)" },
  { suffix: "02", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 2 (10:00 - 12:20)" },
  { suffix: "03", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 3 (12:50 - 15:10)" },
  { suffix: "04", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 4 (15:20 - 17:40)" },
];

interface ApiClassItem {
  id: string;
  code: string;
  course_id: string;
  semester_id: string;
  campus_id: string;
  lecturer?: string | null;
  is_swappable: boolean;
  schedules: Array<{
    id: string;
    day_of_week: string;
    slot: string;
    room?: string | null;
  }>;
}

export function CreateRequestForm({
  onCreated,
  onCancel,
}: {
  onCreated?: () => void;
  onCancel?: () => void;
}) {
  const { student, campuses, semesters, courses, isAuthenticated, addRequest } =
    useAppState();

  const [campusIdOverride, setCampusIdOverride] = useState<string | null>(null);
  const campusId = useMemo(() => {
    if (campusIdOverride && campuses.some((c) => c.id === campusIdOverride)) {
      return campusIdOverride;
    }
    if (campuses.some((c) => c.id === student.campusId)) {
      return student.campusId;
    }
    return campuses[0]?.id || "";
  }, [campusIdOverride, campuses, student.campusId]);

  const [semesterIdOverride, setSemesterIdOverride] = useState<string | null>(
    null,
  );
  const semesterId = useMemo(() => {
    if (
      semesterIdOverride &&
      semesters.some((s) => s.id === semesterIdOverride)
    ) {
      return semesterIdOverride;
    }
    return semesters.find((s) => s.isActive)?.id || semesters[0]?.id || "";
  }, [semesterIdOverride, semesters]);

  const [courseSearch, setCourseSearch] = useState("");
  const [courseIdOverride, setCourseIdOverride] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [courseSearch, courses]);

  const courseId = useMemo(() => {
    if (courseIdOverride && courses.some((c) => c.id === courseIdOverride)) {
      return courseIdOverride;
    }
    return courses[0]?.id || "";
  }, [courseIdOverride, courses]);

  const [classesCache, setClassesCache] = useState<{
    key: string;
    items: AcademicClass[] | null;
  } | null>(null);

  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      val,
    );
  const shouldFetchBackend =
    isAuthenticated &&
    Boolean(courseId && semesterId && campusId) &&
    isUuid(courseId) &&
    isUuid(semesterId) &&
    isUuid(campusId);
  const fetchKey = shouldFetchBackend
    ? `${courseId}:${semesterId}:${campusId}`
    : "";

  useEffect(() => {
    if (!shouldFetchBackend) return;

    let cancelled = false;
    apiFetch<ApiClassItem[]>("/academic/classes/ensure", {
      method: "POST",
      body: JSON.stringify({
        course_id: courseId,
        semester_id: semesterId,
        campus_id: campusId,
      }),
    })
      .then((rows) => {
        if (cancelled) return;
        setClassesCache({
          key: fetchKey,
          items: rows
            .filter((r) => r.is_swappable)
            .map((r) => ({
              id: r.id,
              code: r.code,
              courseId: r.course_id,
              semesterId: r.semester_id,
              campusId: r.campus_id,
              lecturer: r.lecturer || "Đang cập nhật",
              isSwappable: r.is_swappable,
              schedules: r.schedules.map((s) => ({
                id: s.id,
                dayOfWeek: s.day_of_week,
                slot: s.slot,
                room: s.room || "",
              })),
            })),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setClassesCache({ key: fetchKey, items: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldFetchBackend, fetchKey, courseId, semesterId, campusId]);

  const loadingClasses = shouldFetchBackend && classesCache?.key !== fetchKey;
  const backendClasses =
    shouldFetchBackend && classesCache?.key === fetchKey
      ? classesCache.items
      : null;

  const availableClasses: AcademicClass[] = useMemo(() => {
    if (backendClasses && backendClasses.length > 0) {
      return backendClasses;
    }

    const seeded = DEMO_CLASSES.filter(
      (c) =>
        c.courseId === courseId &&
        c.semesterId === semesterId &&
        c.campusId === campusId &&
        c.isSwappable,
    );
    if (seeded.length >= 2) return seeded;

    const course = courses.find((c) => c.id === courseId);
    if (!course) return [];
    const campus = campuses.find((cp) => cp.id === campusId);
    const campusTag = campus?.code || "HN";

    return DEFAULT_SLOTS.map((s) => ({
      id: `cls-${course.code.toLowerCase()}-${campusTag.toLowerCase()}-${s.suffix}`,
      code: `${course.code}_${campusTag}_${s.suffix}`,
      courseId,
      semesterId,
      campusId,
      lecturer: "Đang cập nhật",
      isSwappable: true,
      schedules: [
        {
          id: `sch-${course.code}-${s.suffix}`,
          dayOfWeek: s.dayOfWeek,
          slot: s.slot,
          room: "P.201",
        },
      ],
    }));
  }, [backendClasses, courseId, semesterId, campusId, courses, campuses]);

  const [currentClassId, setCurrentClassId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const selectedCurrentClassId = availableClasses.some(
    (c) => c.id === currentClassId,
  )
    ? currentClassId
    : availableClasses[0]?.id || "";
  const selectedTargetClassId = availableClasses.some(
    (c) => c.id === targetClassId,
  )
    ? targetClassId
    : availableClasses[1]?.id || "";

  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("2026-12-20");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCourseChange = (newCourseId: string) => {
    setCourseIdOverride(newCourseId);
    setCurrentClassId("");
    setTargetClassId("");
    setError("");
  };

  const handleCampusChange = (newCampusId: string) => {
    setCampusIdOverride(newCampusId);
    setCurrentClassId("");
    setTargetClassId("");
    setError("");
  };

  const handleSemesterChange = (newSemesterId: string) => {
    setSemesterIdOverride(newSemesterId);
    setCurrentClassId("");
    setTargetClassId("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const semester = semesters.find((s) => s.id === semesterId);
    const course = courses.find((c) => c.id === courseId);
    const currCls = availableClasses.find(
      (c) => c.id === selectedCurrentClassId,
    );
    const targCls = availableClasses.find(
      (c) => c.id === selectedTargetClassId,
    );

    if (!semester || !course || !currCls || !targCls) {
      setError(
        "Môn học hoặc học kỳ này chưa có đủ lớp khả dụng trong danh mục.",
      );
      return;
    }
    if (currCls.id === targCls.id) {
      setError("Lớp hiện tại và lớp mong muốn không được trùng nhau.");
      return;
    }

    const formatSchedule = (cls: AcademicClass) =>
      cls.schedules[0]
        ? `${cls.schedules[0].dayOfWeek} • ${cls.schedules[0].slot}`
        : "Chưa cập nhật lịch";

    setError("");
    setSubmitting(true);
    try {
      await addRequest({
        semesterId: semester.id,
        semesterName: semester.name,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        currentClassId: currCls.id,
        currentClassCode: currCls.code,
        currentScheduleText: formatSchedule(currCls),
        targetClassId: targCls.id,
        targetClassCode: targCls.code,
        targetScheduleText: formatSchedule(targCls),
        note: note.trim() || undefined,
        expiresAt,
      });
      setNote("");
      onCreated?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Không thể tạo yêu cầu đổi lớp. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm dark:border-orange-500/35 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Tạo yêu cầu đổi lớp mới
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hỗ trợ {courses.length} môn học tại {campuses.length} cơ sở trên
            toàn quốc
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Cơ sở (Campus)
          </label>
          <select
            value={campusId}
            onChange={(e) => handleCampusChange(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {campuses.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.name} ({cp.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Học kỳ
          </label>
          <select
            value={semesterId}
            onChange={(e) => handleSemesterChange(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Môn học ({filteredCourses.length}/{courses.length} môn)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={courseSearch}
            onChange={(e) => {
              const val = e.target.value;
              setCourseSearch(val);
              const q = val.trim().toLowerCase();
              const firstMatch = courses.find(
                (c) =>
                  c.code.toLowerCase().includes(q) ||
                  c.name.toLowerCase().includes(q),
              );
              if (firstMatch) {
                handleCourseChange(firstMatch.id);
              }
            }}
            placeholder="Tìm mã môn hoặc tên môn (VD: PRF192, SWP391, JPD126...)"
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <select
          value={courseId}
          onChange={(e) => handleCourseChange(e.target.value)}
          disabled={submitting}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          {filteredCourses.length === 0 ? (
            <option value="">Không tìm thấy môn học phù hợp</option>
          ) : (
            filteredCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Lớp hiện tại của bạn
            {loadingClasses && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
            )}
          </label>
          <select
            value={selectedCurrentClassId}
            onChange={(e) => setCurrentClassId(e.target.value)}
            disabled={submitting || loadingClasses}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {availableClasses.length === 0 ? (
              <option value="">Không có lớp khả dụng</option>
            ) : (
              availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.code} ({cls.schedules[0]?.slot || "N/A"})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Lớp mong muốn chuyển sang
          </label>
          <select
            value={selectedTargetClassId}
            onChange={(e) => setTargetClassId(e.target.value)}
            disabled={submitting || loadingClasses}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {availableClasses.length === 0 ? (
              <option value="">Không có lớp khả dụng</option>
            ) : (
              availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.code} ({cls.schedules[0]?.slot || "N/A"})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Thời hạn yêu cầu
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Ghi chú tùy chọn
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            placeholder="VD: Trùng lịch thực tập buổi sáng..."
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            Đóng
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || loadingClasses}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {submitting ? "Đang đăng..." : "Đăng yêu cầu"}
        </button>
      </div>
    </form>
  );
}
