"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Search } from "lucide-react";

import { ApiError, apiFetch } from "@/lib/api";
import { DEMO_CLASSES } from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";
import { AcademicClass } from "@/types";

const DEFAULT_SLOTS = [
  { suffix: "01", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 1 (07:00 - 09:15)" },
  { suffix: "02", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 2 (09:30 - 11:45)" },
  { suffix: "03", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 3 (12:30 - 14:45)" },
  { suffix: "04", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 4 (15:00 - 17:15)" },
];

const VOVINAM_SLOTS = [
  { suffix: "01", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 1 (07:00 - 08:30)" },
  { suffix: "02", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 2 (08:45 - 10:15)" },
  { suffix: "03", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 3 (10:30 - 12:00)" },
  { suffix: "04", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 4 (12:30 - 14:00)" },
  { suffix: "05", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 5 (14:15 - 15:45)" },
  { suffix: "06", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 6 (16:00 - 17:30)" },
];

interface ApiClassItem {
  id: string;
  code: string;
  course_id: string;
  semester_id: string;
  campus_id: string;
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

  const campusId = useMemo(() => {
    if (campuses.some((c) => c.id === student.campusId)) {
      return student.campusId;
    }
    return campuses[0]?.id || "";
  }, [campuses, student.campusId]);

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

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === courseId),
    [courses, courseId],
  );

  const slotTemplates = useMemo(
    () =>
      selectedCourse?.code.toUpperCase().startsWith("VOV")
        ? VOVINAM_SLOTS
        : DEFAULT_SLOTS,
    [selectedCourse],
  );

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
              lecturer: "",
              isSwappable: r.is_swappable,
              schedules: r.schedules.map((s) => ({
                id: s.id,
                dayOfWeek: s.day_of_week,
                slot: s.slot,
                room: "",
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

    if (!selectedCourse) return [];
    return slotTemplates.map((s) => ({
      id: `cls-${selectedCourse.code.toLowerCase()}-${s.suffix}`,
      code: `Lớp ${s.suffix}`,
      courseId,
      semesterId,
      campusId,
      lecturer: "",
      isSwappable: true,
      schedules: [
        {
          id: `sch-${selectedCourse.code}-${s.suffix}`,
          dayOfWeek: s.dayOfWeek,
          slot: s.slot,
          room: "",
        },
      ],
    }));
  }, [backendClasses, courseId, semesterId, campusId, selectedCourse, slotTemplates]);

  const [currentClassCodeInput, setCurrentClassCodeInput] = useState(
    () => student.className || "",
  );
  const [targetClassCodeInput, setTargetClassCodeInput] = useState("");
  const [currentSlotIdx, setCurrentSlotIdx] = useState<string>("");
  const [targetSlotIdx, setTargetSlotIdx] = useState<string>("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("2026-12-20");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectiveCurrentCode = (
    currentClassCodeInput ||
    student.className ||
    availableClasses[0]?.code ||
    ""
  ).toUpperCase();

  const defaultTargetFallback =
    availableClasses.find(
      (c) => c.code.toUpperCase() !== effectiveCurrentCode.trim().toUpperCase(),
    )?.code || "";

  const handleCourseChange = (newCourseId: string) => {
    setCourseIdOverride(newCourseId);
    setTargetClassCodeInput("");
    setCurrentSlotIdx("");
    setTargetSlotIdx("");
    setError("");
  };

  const handleSemesterChange = (newSemesterId: string) => {
    setSemesterIdOverride(newSemesterId);
    setTargetClassCodeInput("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const semester = semesters.find((s) => s.id === semesterId);
    const course = courses.find((c) => c.id === courseId);
    const currCode = effectiveCurrentCode.trim().toUpperCase();
    const targCode = targetClassCodeInput.trim().toUpperCase();

    if (!semester || !course) {
      setError("Vui lòng chọn học kỳ và môn học.");
      return;
    }
    if (!currCode || !targCode) {
      setError("Vui lòng nhập đầy đủ tên lớp hiện tại và lớp mong muốn.");
      return;
    }
    if (currCode === targCode) {
      setError("Lớp hiện tại và lớp mong muốn không được trùng nhau.");
      return;
    }

    const matchedCurr = availableClasses.find(
      (c) => c.code.toUpperCase() === currCode,
    );
    const matchedTarg = availableClasses.find(
      (c) => c.code.toUpperCase() === targCode,
    );

    const pickedCurrSlot =
      currentSlotIdx !== "" ? slotTemplates[Number(currentSlotIdx)] : undefined;
    const pickedTargSlot =
      targetSlotIdx !== "" ? slotTemplates[Number(targetSlotIdx)] : undefined;

    const currentScheduleText = pickedCurrSlot
      ? `${pickedCurrSlot.dayOfWeek} • ${pickedCurrSlot.slot}`
      : matchedCurr?.schedules[0]
        ? `${matchedCurr.schedules[0].dayOfWeek} • ${matchedCurr.schedules[0].slot}`
        : "Theo TKB trường (FAP)";

    const targetScheduleText = pickedTargSlot
      ? `${pickedTargSlot.dayOfWeek} • ${pickedTargSlot.slot}`
      : matchedTarg?.schedules[0]
        ? `${matchedTarg.schedules[0].dayOfWeek} • ${matchedTarg.schedules[0].slot}`
        : "Theo TKB trường (FAP)";

    setError("");
    setSubmitting(true);
    try {
      await addRequest({
        semesterId: semester.id,
        semesterName: semester.name,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        currentClassId: matchedCurr?.id || `cls-custom-${currCode}`,
        currentClassCode: currCode,
        currentScheduleText,
        currentDayOfWeek: pickedCurrSlot?.dayOfWeek,
        currentSlot: pickedCurrSlot?.slot,
        targetClassId: matchedTarg?.id || `cls-custom-${targCode}`,
        targetClassCode: targCode,
        targetScheduleText,
        targetDayOfWeek: pickedTargSlot?.dayOfWeek,
        targetSlot: pickedTargSlot?.slot,
        note: note.trim() || undefined,
        expiresAt,
      });
      setNote("");
      setTargetClassCodeInput("");
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
            Chỉ cần nhập tên môn + lớp (VD: MAI391 - AI21A01). Web trường sẽ cập nhật TKB sau khi đổi thành công.
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
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <MapPin className="h-4 w-4 shrink-0 text-orange-500" />
            <span className="font-semibold">{student.campusName}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              (Cùng campus mới thấy nhau)
            </span>
          </div>
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
            placeholder="Tìm mã môn hoặc tên môn (VD: MAI391, PRF192, VOV112...)"
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
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Lớp hiện tại của bạn
            {loadingClasses && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
            )}
          </label>
          <input
            type="text"
            value={currentClassCodeInput || student.className || ""}
            autoCapitalize="characters"
            onChange={(e) =>
              setCurrentClassCodeInput(e.target.value.toUpperCase())
            }
            placeholder={availableClasses[0]?.code || "VD: AI21A01"}
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase placeholder:normal-case outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {availableClasses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableClasses.slice(0, 6).map((cls) => (
                <button
                  key={`cur-${cls.id}`}
                  type="button"
                  onClick={() => setCurrentClassCodeInput(cls.code.toUpperCase())}
                  className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${
                    effectiveCurrentCode.trim().toUpperCase() ===
                    cls.code.toUpperCase()
                      ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {selectedCourse?.code} - {cls.code}
                </button>
              ))}
            </div>
          )}
          <select
            value={currentSlotIdx}
            onChange={(e) => setCurrentSlotIdx(e.target.value)}
            disabled={submitting}
            aria-label="Khung giờ lớp hiện tại (tùy chọn)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">Slot học (không bắt buộc — web trường tự cập nhật)</option>
            {slotTemplates.map((s, idx) => (
              <option key={`cslot-${s.suffix}`} value={String(idx)}>
                {s.dayOfWeek} • {s.slot}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Lớp mong muốn chuyển sang
          </label>
          <input
            type="text"
            value={targetClassCodeInput}
            autoCapitalize="characters"
            onChange={(e) =>
              setTargetClassCodeInput(e.target.value.toUpperCase())
            }
            placeholder={
              defaultTargetFallback
                ? `VD: AI21A02 hoặc ${defaultTargetFallback}`
                : "VD: AI21A02"
            }
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase placeholder:normal-case outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          {availableClasses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableClasses.slice(0, 6).map((cls) => (
                <button
                  key={`tgt-${cls.id}`}
                  type="button"
                  onClick={() => setTargetClassCodeInput(cls.code.toUpperCase())}
                  className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${
                    targetClassCodeInput.trim().toUpperCase() ===
                    cls.code.toUpperCase()
                      ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {selectedCourse?.code} - {cls.code}
                </button>
              ))}
            </div>
          )}
          <select
            value={targetSlotIdx}
            onChange={(e) => setTargetSlotIdx(e.target.value)}
            disabled={submitting}
            aria-label="Khung giờ lớp mong muốn (tùy chọn)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">Slot mong muốn (không bắt buộc)</option>
            {slotTemplates.map((s, idx) => (
              <option key={`tslot-${s.suffix}`} value={String(idx)}>
                {s.dayOfWeek} • {s.slot}
              </option>
            ))}
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
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50"
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
