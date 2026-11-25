"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MajorSelect } from "@/components/MajorSelect";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { Campus, StudentProfile } from "@/types";

function ProfileForm({
  student,
  campuses,
  updateStudent,
}: {
  student: StudentProfile;
  campuses: Campus[];
  updateStudent: (patch: Partial<StudentProfile>) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(student.fullName);
  const [major, setMajor] = useState(student.major);
  const [campusId, setCampusId] = useState(student.campusId);
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
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể lưu hồ sơ. Vui lòng thử lại.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
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
            Email
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
          disabled={saving}
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-orange-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
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

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Ngành &amp; Chuyên ngành
        </label>
        <MajorSelect
          value={major}
          onChange={setMajor}
          disabled={saving}
        />
      </div>

      <div className="pt-2 flex justify-end">
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
  const { student, campuses, updateStudent } = useAppState();

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

        <ProfileForm
          key={`${student.id}-${student.campusId}`}
          student={student}
          campuses={campuses}
          updateStudent={updateStudent}
        />
      </div>
    </AppShell>
  );
}
