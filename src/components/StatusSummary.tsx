"use client";

import { useAppSelector } from "@/store/hooks";
import { selectTaskCountsByStatus } from "@/store/selectors";
import { STATUS_STYLES } from "./StatusBadge";
import { Card } from "./Card";
import type { TaskStatus } from "@/lib/types";

const STATUSES: TaskStatus[] = ["todo", "in_progress", "qa", "blocked", "done", "unknown"];

/**
 * Tasks-per-status counts (the brief's suggested bonus "small derived
 * metric"). Each status gets its own bordered card so the row reads as six
 * distinct figures rather than one dense strip, with the same color dot
 * `StatusBadge` uses in the table -- reused, not a second color system, so
 * "Done" here is visually the same "Done" as the badge in the row below it.
 */
export function StatusSummary() {
  const counts = useAppSelector(selectTaskCountsByStatus);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="Task counts by status">
      {STATUSES.map((status) => {
        const style = STATUS_STYLES[status];
        return (
          <Card key={status} padded>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {style.label}
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{counts[status] ?? 0}</div>
          </Card>
        );
      })}
    </div>
  );
}