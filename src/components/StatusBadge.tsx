import type { TaskStatus } from "@/lib/types";

interface StatusStyle {
  dot: string;
  text: string;
  bg: string;
  label: string;
  hex: string;
}

/** Single source of truth for status color + label, shared by the table
 * badge and the status filter dropdown. Hex values (not just Tailwind
 * classes) are included because native <option> elements only reliably
 * accept inline `color`/`background` styles -- Tailwind utility classes
 * don't render inside a browser's native dropdown popup on every OS.
 *
 * Deliberately typed as a plain interface with explicit named keys, not
 * `Record<TaskStatus, StatusStyle>`: this project's tsconfig has
 * `noUncheckedIndexedAccess` on, and TypeScript's built-in `Record<K, V>`
 * utility is treated as having an implicit index signature under that flag
 * -- so `STATUS_STYLES[status]` (and even `STATUS_STYLES.unknown`) would
 * type-check as `StatusStyle | undefined` despite every key demonstrably
 * being present. A hand-written interface with explicit named properties
 * has no such index signature, so access is correctly typed as always
 * defined. */
interface StatusStylesMap {
  todo: StatusStyle;
  in_progress: StatusStyle;
  qa: StatusStyle;
  blocked: StatusStyle;
  done: StatusStyle;
  unknown: StatusStyle;
}

export const STATUS_STYLES: StatusStylesMap = {
  todo: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-100/80", label: "To do", hex: "#64748B" },
  in_progress: { dot: "bg-navy-500", text: "text-navy-700", bg: "bg-navy-50", label: "In progress", hex: "#385B8A" },
  qa: { dot: "bg-amber-500", text: "text-amber-800", bg: "bg-amber-50", label: "QA", hex: "#B45309" },
  blocked: { dot: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", label: "Blocked", hex: "#BE123C" },
  done: { dot: "bg-emerald-500", text: "text-emerald-800", bg: "bg-emerald-50", label: "Done", hex: "#047857" },
  unknown: { dot: "bg-slate-300", text: "text-slate-500", bg: "bg-slate-50", label: "Unknown", hex: "#94A3B8" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const c = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-medium tracking-wide ${c.bg} ${c.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
