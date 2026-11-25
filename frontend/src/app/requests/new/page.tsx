"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import {
  DEMO_CLASSES,
  DEMO_COURSES,
  DEMO_SEMESTERS,
} from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";

export default function NewRequestPage() {
  const router = useRouter();
  const { addRequest } = useAppState();

  const [semesterId, setSemesterId] = useState(DEMO_SEMESTERS[0].id);
  const [courseId, setCourseId] = useState(DEMO_COURSES[0].id);

  const availableClasses = useMemo(
    () =>
      DEMO_CLASSES.filter(
        (c) => c.courseId === courseId && c.semesterId === semesterId && c.isSwappable
      ),
    [courseId, semesterId]
  );

  const [currentClassId, setCurrentClassId] = useState(
    availableClasses[0]?.id || ""
  );
  const [targetClassId, setTargetClassId] = useState(
    availableClasses[1]?.id || ""
  );
  const [note, setNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("2026-12-20");
  const [error, setError] = useState("");

  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId);
    const filtered = DEMO_CLASSES.filter(
      (c) => c.courseId === newCourseId && c.semesterId === semesterId && c.isSwappable
    );
    setCurrentClassId(filtered[0]?.id || "");
    setTargetClassId(filtered[1]?.id || "");
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const semester = DEMO_SEMESTERS.find((s) => s.id === semesterId);
    const course = DEMO_COURSES.find((c) => c.id === courseId);
    const currCls = availableClasses.find((c) => c.id === currentClassId);
    const targCls = availableClasses.find((c) => c.id === targetClassId);

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
              Chọn lớp từ danh mục chuẩn do Admin quản lý
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
                Học kỳ
              </label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              >
                {DEMO_SEMESTERS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Môn học
              </label>
              <select
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              >
                {DEMO_COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Lớp hiện tại của bạn
              </label>
              <select
                value={currentClassId}
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
                value={targetClassId}
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

