"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, MapPin, Search, X } from "lucide-react";

import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/app-state";

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

export function CreateRequestForm({
  onCreated,
  onCancel,
  initialCourseCode,
}: {
  onCreated?: () => void;
  onCancel?: () => void;
  initialCourseCode?: string;
}) {
  const { student, semesters, courses, addRequest } = useAppState();

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
    return (
      semesters.find((s) => s.code.toUpperCase() === "SP2027")?.id ||
      semesters.find((s) => s.isActive)?.id ||
      semesters[0]?.id ||
      ""
    );
  }, [semesterIdOverride, semesters]);

  const [courseSearch, setCourseSearch] = useState("");
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [courseIdOverride, setCourseIdOverride] = useState<string | null>(null);
  const coursePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        coursePickerRef.current &&
        !coursePickerRef.current.contains(e.target as Node)
      ) {
        setCourseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (initialCourseCode) {
      const matched = courses.find(
        (c) => c.code.toLowerCase() === initialCourseCode.trim().toLowerCase(),
      );
      if (matched) return matched.id;
    }
    return courses[0]?.id || "";
  }, [courseIdOverride, courses, initialCourseCode]);

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

  const [currentClassCodeInput, setCurrentClassCodeInput] = useState(
    () => student.className || "",
  );
  const [targetClassCodeInput, setTargetClassCodeInput] = useState("");
  const [currentSlotIdx, setCurrentSlotIdx] = useState<string>("");
  const [targetSlotIdx, setTargetSlotIdx] = useState<string>("");
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("2027-02-01");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCourseSelect = (newCourseId: string) => {
    setCourseIdOverride(newCourseId);
    setCourseSearch("");
    setCourseDropdownOpen(false);
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
    const currCode = currentClassCodeInput.trim().toUpperCase();
    const targCode = targetClassCodeInput.trim().toUpperCase();

    if (!semester || !course) {
      setError("Vui lòng chọn học kỳ và môn học.");
      return;
    }
    if (!currCode) {
      setError("Vui lòng nhập mã lớp hiện tại của bạn.");
      return;
    }
    if (currentSlotIdx === "") {
      setError("Vui lòng chọn slot học hiện tại của bạn.");
      return;
    }
    if (targCode && currCode === targCode) {
      setError("Lớp hiện tại và lớp mong muốn không được trùng nhau.");
      return;
    }

    const pickedCurrSlot = slotTemplates[Number(currentSlotIdx)];
    const pickedTargSlot =
      targCode && targetSlotIdx !== ""
        ? slotTemplates[Number(targetSlotIdx)]
        : undefined;

    const currentScheduleText = `${pickedCurrSlot.dayOfWeek} • ${pickedCurrSlot.slot}`;
    const targetScheduleText =
      targCode && pickedTargSlot
        ? `${pickedTargSlot.dayOfWeek} • ${pickedTargSlot.slot}`
        : undefined;

    setError("");
    setSubmitting(true);
    try {
      await addRequest({
        semesterId: semester.id,
        semesterName: semester.name,
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        currentClassId: `cls-custom-${currCode}`,
        currentClassCode: currCode,
        currentScheduleText,
        currentDayOfWeek: pickedCurrSlot.dayOfWeek,
        currentSlot: pickedCurrSlot.slot,
        targetClassId: targCode ? `cls-custom-${targCode}` : undefined,
        targetClassCode: targCode || undefined,
        targetScheduleText,
        targetDayOfWeek: pickedTargSlot?.dayOfWeek,
        targetSlot: pickedTargSlot?.slot,
        note: note.trim() || undefined,
        expiresAt,
      });
      setNote("");
      setTargetClassCodeInput("");
      setTargetSlotIdx("");
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

  const courseDisplayValue = courseDropdownOpen
    ? courseSearch
    : selectedCourse
      ? `${selectedCourse.code} — ${selectedCourse.name}`
      : courseSearch;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-orange-200 bg-white p-6 shadow-sm dark:border-orange-500/35 dark:bg-slate-900"
    >
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Tạo yêu cầu đổi lớp mới
        </h2>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-200">
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

      <div className="space-y-1.5" ref={coursePickerRef}>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Môn học ({courses.length} môn)
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={courseDisplayValue}
            onFocus={() => {
              setCourseSearch("");
              setCourseDropdownOpen(true);
            }}
            onChange={(e) => {
              setCourseSearch(e.target.value);
              setCourseDropdownOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setCourseDropdownOpen(false);
              } else if (e.key === "Enter" && courseDropdownOpen && filteredCourses.length > 0) {
                e.preventDefault();
                handleCourseSelect(filteredCourses[0].id);
              }
            }}
            placeholder={
              selectedCourse
                ? `${selectedCourse.code} — ${selectedCourse.name} (gõ để tìm môn khác)`
                : "Nhập mã môn hoặc tên môn (VD: MAI391, PRF192, VOV112...)"
            }
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-14 text-sm outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {(courseSearch || courseDropdownOpen) && (
              <button
                type="button"
                onClick={() => {
                  setCourseSearch("");
                  setCourseDropdownOpen(true);
                }}
                aria-label="Xóa tìm kiếm môn học"
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!courseDropdownOpen) setCourseSearch("");
                setCourseDropdownOpen((v) => !v);
              }}
              aria-label="Mở danh sách môn học"
              className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {courseDropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {filteredCourses.length === 0 ? (
                <div className="px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400">
                  Không tìm thấy môn học phù hợp với &ldquo;{courseSearch}&rdquo;
                </div>
              ) : (
                filteredCourses.slice(0, 80).map((c) => {
                  const isSelected = c.id === courseId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCourseSelect(c.id)}
                      className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/15 ${
                        isSelected
                          ? "bg-orange-50/80 font-semibold text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span>
                        <span className="font-bold">{c.code}</span>
                        <span className="text-slate-400"> — </span>
                        <span>{c.name}</span>
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-500" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Lớp hiện tại của bạn <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={currentClassCodeInput}
            autoCapitalize="characters"
            onChange={(e) =>
              setCurrentClassCodeInput(e.target.value.toUpperCase())
            }
            placeholder="VD: AI21A01, SE1801..."
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase placeholder:normal-case outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Slot học hiện tại <span className="text-rose-500">*</span>
            </label>
            <select
              value={currentSlotIdx}
              onChange={(e) => setCurrentSlotIdx(e.target.value)}
              disabled={submitting}
              required
              aria-label="Slot học hiện tại (bắt buộc)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Chọn slot học hiện tại (bắt buộc)...</option>
              {slotTemplates.map((s, idx) => (
                <option key={`cslot-${s.suffix}`} value={String(idx)}>
                  {s.dayOfWeek} • {s.slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Lớp mong muốn chuyển sang
            </label>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Không bắt buộc
            </span>
          </div>
          <input
            type="text"
            value={targetClassCodeInput}
            autoCapitalize="characters"
            onChange={(e) =>
              setTargetClassCodeInput(e.target.value.toUpperCase())
            }
            placeholder="Để trống nếu muốn đổi sang lớp khác bất kỳ (VD: AI21A02)"
            disabled={submitting}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase placeholder:normal-case outline-none focus:border-orange-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Slot mong muốn (không bắt buộc)
            </label>
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
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Đóng
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
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
