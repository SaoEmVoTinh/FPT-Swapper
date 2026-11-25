"use client";

import { useState } from "react";
import { BookOpen, Building2, CalendarDays, Layers, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  DEMO_CLASSES,
  DEMO_COURSES,
  DEMO_SEMESTERS,
} from "@/lib/demo-data";
import { useAppState } from "@/lib/app-state";

type AdminTab = "campuses" | "semesters" | "courses" | "classes";

export default function AdminPage() {
  const { campuses } = useAppState();
  const [tab, setTab] = useState<AdminTab>("classes");

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <ShieldCheck className="h-6 w-6 text-orange-500" />
              Admin — Dữ liệu học vụ
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý danh mục Campus, Học kỳ, Môn học và Lớp học (thủ công /
              CSV import)
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Campuses", count: campuses.length, icon: Building2 },
            { label: "Học kỳ", count: DEMO_SEMESTERS.length, icon: CalendarDays },
            { label: "Môn học", count: DEMO_COURSES.length, icon: BookOpen },
            { label: "Lớp học", count: DEMO_CLASSES.length, icon: Layers },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">{item.label}</span>
                  <Icon className="h-4 w-4 text-orange-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {item.count}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {(
            [
              { id: "classes", label: "Lớp học" },
              { id: "courses", label: "Môn học" },
              { id: "semesters", label: "Học kỳ" },
              { id: "campuses", label: "Campus" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "bg-orange-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table Content */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {tab === "classes" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã lớp</th>
                    <th className="px-4 py-3">Giảng viên</th>
                    <th className="px-4 py-3">Lịch học</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_CLASSES.map((cls) => (
                    <tr key={cls.id}>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {cls.code}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{cls.lecturer}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {cls.schedules[0]
                          ? `${cls.schedules[0].dayOfWeek} • ${cls.schedules[0].slot}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          Cho phép đổi
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "courses" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã môn</th>
                    <th className="px-4 py-3">Tên môn học</th>
                    <th className="px-4 py-3">Số tín chỉ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_COURSES.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-semibold">{c.code}</td>
                      <td className="px-4 py-3 text-slate-600">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "semesters" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã học kỳ</th>
                    <th className="px-4 py-3">Tên học kỳ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DEMO_SEMESTERS.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 font-semibold">{s.code}</td>
                      <td className="px-4 py-3 text-slate-600">{s.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            s.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {s.isActive ? "Đang mở" : "Sắp tới"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "campuses" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã</th>
                    <th className="px-4 py-3">Tên cơ sở</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campuses.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-semibold">{c.code}</td>
                      <td className="px-4 py-3 text-slate-600">{c.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

