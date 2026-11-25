"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DEMO_CAMPUSES } from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";

export default function ProfilePage() {
  const { student, updateStudent } = useAppState();
  const [fullName, setFullName] = useState(student.fullName);
  const [major, setMajor] = useState(student.major);
  const [campusId, setCampusId] = useState(student.campusId);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const campus = DEMO_CAMPUSES.find((c) => c.id === campusId);
    updateStudent({
      fullName: fullName.trim() || student.fullName,
      major: major.trim() || student.major,
      campusId,
      campusName: campus?.name || student.campusName,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hồ sơ sinh viên
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Thông tin cá nhân cơ bản dùng chung cho ClassSwap, StudyBuddy và
            TeamFinder
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          {saved && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
              Đã lưu thay đổi hồ sơ.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mã sinh viên
              </label>
              <input
                type="text"
                disabled
                value={student.studentCode}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email trường
              </label>
              <input
                type="email"
                disabled
                value={student.email}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Họ và tên
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Campus
              </label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              >
                {DEMO_CAMPUSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Ngành học
              </label>
              <input
                type="text"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <Save className="h-4 w-4" />
              Lưu hồ sơ
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

