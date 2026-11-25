"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  DEMO_CLASSES,
  DEMO_COURSES,
  DEMO_SEMESTERS,
} from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";
import { AcademicClass } from "@/types";

const DEFAULT_SLOTS = [
  { suffix: "01", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 1 (07:30 - 09:50)" },
  { suffix: "02", dayOfWeek: "Thứ 2 & Thứ 4", slot: "Slot 2 (10:00 - 12:20)" },
  { suffix: "03", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 3 (12:50 - 15:10)" },
  { suffix: "04", dayOfWeek: "Thứ 3 & Thứ 5", slot: "Slot 4 (15:20 - 17:40)" },
];

export default function NewRequestPage() {
  const router = useRouter();
  const { student, campuses, addRequest } = useAppState();

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
  const [semesterId, setSemesterId] = useState(DEMO_SEMESTERS[0].id);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseId, setCourseId] = useState(DEMO_COURSES[0].id);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return DEMO_COURSES;
    return DEMO_COURSES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [courseSearch]);

  const availableClasses: AcademicClass[] = useMemo(() => {
    const seeded = DEMO_CLASSES.filter(
      (c) =>
        c.courseId === courseId &&
        c.semesterId === semesterId &&
        c.campusId === campusId &&
        c.isSwappable
    );
    if (seeded.length >= 2) return seeded;

    const course = DEMO_COURSES.find((c) => c.id === courseId);
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
  }, [courseId, semesterId, campusId, campuses]);

  const [currentClassId, setCurrentClassId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const selectedCurrentClassId = availableClasses.some((c) => c.id === currentClassId)
    ? currentClassId
    : availableClasses[0]?.id || "";
  const selectedTargetClassId = availableClasses.some((c) => c.id === targetClassId)
    ? targetClassId
    : availableClasses[1]?.id || "";
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("2026-12-20");
  const [error, setError] = useState("");

  const syncClassDefaults = (
    nextCourseId: string,
    nextSemesterId: string,
    nextCampusId: string
  ) => {
    const seeded = DEMO_CLASSES.filter(
      (c) =>
        c.courseId === nextCourseId &&
        c.semesterId === nextSemesterId &&
        c.campusId === nextCampusId &&
        c.isSwappable
    );
    if (seeded.length >= 2) {
      setCurrentClassId(seeded[0].id);
      setTargetClassId(seeded[1].id);
    } else {
      const course = DEMO_COURSES.find((c) => c.id === nextCourseId);
      const campus = campuses.find((cp) => cp.id === nextCampusId);
      const tag = (campus?.code || "HN").toLowerCase();
      const code = course?.code.toLowerCase() || "";
      setCurrentClassId(code ? `cls-${code}-${tag}-01` : "");
      setTargetClassId(code ? `cls-${code}-${tag}-02` : "");
    }
    setError("");
  };

  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    syncClassDefaults(newCourseId, semesterId, campusId);
  };

  const handleCampusChange = (newCampusId: string) => {
    setCampusIdOverride(newCampusId);
    syncClassDefaults(courseId, semesterId, newCampusId);
  };

  const handleSemesterChange = (newSemesterId: string) => {
    setSemesterId(newSemesterId);
    syncClassDefaults(courseId, newSemesterId, campusId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const semester = DEMO_SEMESTERS.find((s) => s.id === semesterId);
    const course = DEMO_COURSES.find((c) => c.id === courseId);
    const currCls = availableClasses.find((c) => c.id === selectedCurrentClassId);
    const targCls = availableClasses.find((c) => c.id === selectedTargetClassId);

    if (!semester || !course || !currCls || !targCls) {
      setError("Môn học hoặc học kỳ này chưa có đủ lớp khả dụng trong danh mục.");
      return;
    }
    if (currCls.id === targCls.id) {
      setError("Lớp hiện tại và lớp mong muốn không được trùng nhau.");
      return;
    }

    const formatSchedule = (cls: typeof currCls) =>
      cls.schedules[0]
        ? `${cls.schedules[0].dayOfWeek} • ${cls.schedules[0].slot}`
        : "Chưa cập nhật lịch";

    addRequest({
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

    router.push("/requests");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/requests"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Tạo yêu cầu đổi lớp
            </h1>
            <p className="text-sm text-slate-500">
              Hỗ trợ {DEMO_COURSES.length} môn học tại 5 cơ sở trên toàn quốc
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
        >
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Cơ sở (Campus)
              </label>
              <select
                value={campusId}
                onChange={(e) => handleCampusChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              >
                {campuses.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.name} ({cp.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Học kỳ
              </label>
              <select
                value={semesterId}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              >
                {DEMO_SEMESTERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Môn học ({filteredCourses.length}/{DEMO_COURSES.length} môn)
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
                  const firstMatch = DEMO_COURSES.find(
                    (c) =>
                      c.code.toLowerCase().includes(q) ||
                      c.name.toLowerCase().includes(q)
                  );
                  if (firstMatch) {
                    handleCourseChange(firstMatch.id);
                  }
                }}
                placeholder="Tìm mã môn hoặc tên môn (VD: PRF192, SWP391, JPD126...)"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3.5 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <select
              value={courseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Lớp hiện tại của bạn
              </label>
              <select
                value={selectedCurrentClassId}
                onChange={(e) => setCurrentClassId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Lớp mong muốn chuyển sang
              </label>
              <select
                value={selectedTargetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
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

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Thời hạn yêu cầu
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Ghi chú tùy chọn
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Mình bị trùng lịch thực tập buổi sáng, cần chuyển sang slot chiều..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/requests"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              Đăng yêu cầu
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
