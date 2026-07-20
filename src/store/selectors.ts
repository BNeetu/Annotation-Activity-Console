import { createSelector } from "@reduxjs/toolkit";
import type { NormalizedTask } from "@/lib/types";
import { tasksSelectors } from "./tasksSlice";
import type { RootState } from "./store";

export const selectAllTasks = tasksSelectors.selectAll;
export const selectTaskById = (state: RootState, id: string): NormalizedTask | undefined =>
  tasksSelectors.selectById(state, id);

/** Timestamp of the last live (WebSocket) update to this task, or undefined
 * if it has never been touched by a live event since the app loaded. Used
 * purely to drive the row-flash animation -- never by fetchTasks. */
export const selectFlashedAt = (state: RootState, id: string): number | undefined =>
  state.tasks.flashedAt[id];

const selectFilters = (state: RootState) => state.ui.filters;
const selectSort = (state: RootState) => state.ui.sort;

/**
 * The single selector every list-rendering component should read from.
 * Filtering, searching, and sorting are all derived here so components never
 * loop over raw state themselves -- keeps the "what counts as a match"
 * definition in exactly one place.
 */
export const selectFilteredSortedTasks = createSelector(
  [selectAllTasks, selectFilters, selectSort],
  (tasks, filters, sort): NormalizedTask[] => {
    const search = filters.search.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      if (filters.type !== "all" && task.type !== filters.type) return false;
      if (filters.status !== "all" && task.status !== filters.status) return false;
      if (search && !task.title.toLowerCase().includes(search) && !task.id.toLowerCase().includes(search)) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "updatedAt") {
        cmp = a.updatedAt - b.updatedAt;
      } else {
        cmp = a.title.localeCompare(b.title);
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });

    return sorted;
  }
);

/** True if any filter differs from the default "show everything" state --
 * drives whether the Reset button in the filter bar is enabled. */
export const selectHasActiveFilters = createSelector([selectFilters], (filters) => {
  return filters.type !== "all" || filters.status !== "all" || filters.search.trim() !== "";
});

/** Tasks-per-status counts among currently loaded tasks -- the small derived
 * metric shown above the task list. */
export const selectTaskCountsByStatus = createSelector([selectAllTasks], (tasks) => {
  const counts: Record<string, number> = {};
  for (const task of tasks) {
    counts[task.status] = (counts[task.status] ?? 0) + 1;
  }
  return counts;
});

/** Was previously a plain function returning `{ ...spread }` on every call --
 * a fresh object reference every render even when nothing in it changed,
 * which is exactly what triggered react-redux's "returned a different
 * result" warning. `createSelector` here memoizes on the individual
 * primitive fields, so the returned object reference is stable across
 * renders unless one of those fields actually changed. */
export const selectTasksMeta = createSelector(
  [
    (state: RootState) => state.tasks.status,
    (state: RootState) => state.tasks.error,
    (state: RootState) => state.tasks.page,
    (state: RootState) => state.tasks.pageSize,
    (state: RootState) => state.tasks.total,
    (state: RootState) => state.tasks.isFromCache,
    (state: RootState) => state.tasks.cachedAt,
    (state: RootState) => state.tasks.wsStatus,
  ],
  (status, error, page, pageSize, total, isFromCache, cachedAt, wsStatus) => ({
    status,
    error,
    page,
    pageSize,
    total,
    isFromCache,
    cachedAt,
    wsStatus,
  })
);
