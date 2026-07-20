"use client";

import { Search, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { filtersReset, searchChanged, statusFilterChanged, typeFilterChanged } from "@/store/uiSlice";
import { selectHasActiveFilters } from "@/store/selectors";
import { STATUS_STYLES } from "@/components/StatusBadge";
import type { TaskStatus, TaskType } from "@/lib/types";

const TYPE_OPTIONS: Array<{ value: TaskType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "image", label: "Image" },
  { value: "audio", label: "Audio" },
  { value: "text", label: "Text" },
  { value: "unknown", label: "Unknown" },
];

const STATUS_OPTIONS: Array<TaskStatus | "all"> = ["all", "todo", "in_progress", "qa", "blocked", "done", "unknown"];

const controlClass =
  "rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-sm text-slate-600 shadow-soft transition-colors hover:border-slate-300 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100";

export function TaskFilterBar() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.ui.filters);
  const hasActiveFilters = useAppSelector(selectHasActiveFilters);

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 bg-white px-5 py-3.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search title or id…"
          value={filters.search}
          onChange={(e) => dispatch(searchChanged(e.target.value))}
          aria-label="Search tasks"
          className="w-56 rounded-lg border border-slate-200/80 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-600 shadow-soft transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
        />
      </div>

      <select
        aria-label="Type"
        value={filters.type}
        onChange={(e) => dispatch(typeFilterChanged(e.target.value as TaskType | "all"))}
        className={controlClass}
      >
        {TYPE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Colored via inline `style`, not Tailwind classes -- a native
          <option>'s dropdown popup is rendered by the OS/browser chrome, not
          by our page's CSS, so only inline styles (not utility classes)
          reliably show up inside it. The colors match the same STATUS_STYLES
          map the table's badges use, so "QA" here is the same amber as the
          "QA" badge in the row below it. */}
      <select
        aria-label="Status"
        value={filters.status}
        onChange={(e) => dispatch(statusFilterChanged(e.target.value as TaskStatus | "all"))}
        className={controlClass}
        style={{ color: filters.status === "all" ? undefined : STATUS_STYLES[filters.status].hex }}
      >
        <option value="all" style={{ color: "#475569" }}>
          All statuses
        </option>
        {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
          <option key={s} value={s} style={{ color: STATUS_STYLES[s as TaskStatus].hex }}>
            {STATUS_STYLES[s as TaskStatus].label}
          </option>
        ))}
      </select>

      {/* Same bordered-chip treatment as the selects above, so it reads as
          part of the filter row rather than a separate ghost button. */}
      <button
        type="button"
        onClick={() => dispatch(filtersReset())}
        disabled={!hasActiveFilters}
        className={`flex items-center gap-1.5 ${controlClass} font-medium disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300 disabled:shadow-none disabled:hover:border-slate-100`}
      >
        <X className="h-3.5 w-3.5" />
        Reset
      </button>
    </div>
  );
}
