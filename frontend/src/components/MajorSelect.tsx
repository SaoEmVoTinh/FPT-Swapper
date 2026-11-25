"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  FPT_MAJOR_GROUPS,
  findFacultyBySpecialization,
} from "@/lib/fpt-majors";

interface MajorSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MajorSelect({ value, onChange, disabled }: MajorSelectProps) {
  const matchedGroup = findFacultyBySpecialization(value);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(
    matchedGroup?.id || FPT_MAJOR_GROUPS[0].id
  );
  const [open, setOpen] = useState(false);

  const activeGroup =
    FPT_MAJOR_GROUPS.find((g) => g.id === selectedFacultyId) ||
    matchedGroup ||
    FPT_MAJOR_GROUPS[0];

  return (
    <div className="space-y-2">
      {/* Trigger displaying currently chosen Ngành & Chuyên ngành */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm outline-none transition-colors hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:bg-slate-100"
      >
        <div className="min-w-0">
          {matchedGroup && (
            <span className="block text-[11px] font-bold text-orange-600 truncate">
              {matchedGroup.faculty}
            </span>
          )}
          <span className="block truncate font-medium text-slate-900">
            {value || "Chọn chuyên ngành"}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expandable selector: Orange Ngành tabs on top, smaller Chuyên ngành underneath */}
      {open && !disabled && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. Chọn Ngành
            </p>
            <div className="flex flex-wrap gap-1.5">
              {FPT_MAJOR_GROUPS.map((group) => {
                const isSelected = group.id === activeGroup.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedFacultyId(group.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      isSelected
                        ? "bg-orange-500 text-white shadow-sm"
                        : "border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                    }`}
                  >
                    {group.faculty}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2.5">
            <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
              2. Chọn Chuyên ngành ({activeGroup.faculty})
            </p>
            <div className="grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {activeGroup.specializations.map((spec) => {
                const active = value === spec;
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => {
                      onChange(spec);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                      active
                        ? "border-orange-500 bg-orange-50 font-semibold text-orange-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/40"
                    }`}
                  >
                    <span className="leading-snug">{spec}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-orange-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
