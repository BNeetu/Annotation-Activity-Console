"use client";

import { ArrowUp, ArrowDown, SearchX, WifiOff } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectFilteredSortedTasks, selectFlashedAt, selectTasksMeta } from "@/store/selectors";
import { fetchTasks } from "@/store/tasksSlice";
import { sortChanged, taskSelected } from "@/store/uiSlice";
import { StatusBadge } from "./StatusBadge";
import { Pagination } from "./Pagination";
import { formatTime } from "@/lib/formatters";
import type { NormalizedTask, SortKey } from "@/lib/types";

function SortHeader({ label, sortKey }: { label: string; sortKey: SortKey }) {
  const dispatch = useAppDispatch();
  const sort = useAppSelector((s) => s.ui.sort);
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => dispatch(sortChanged({ key: sortKey }))}
      className={`flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wider transition-colors ${
        active ? "text-slate-700" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
      {active ? (
        sort.direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  );
}

/**
 * A single row, split into its own component so it can independently
 * subscribe to `selectFlashedAt` -- if this lived inline in a `.map()` in
 * `TaskList`, every row would re-render (and re-derive its own flash state)
 * whenever *any* task changed, instead of just the row that changed.
 */
function TaskRow({ task, selected }: { task: NormalizedTask; selected: boolean }) {
  const dispatch = useAppDispatch();
  const flashedAt = useAppSelector((s) => selectFlashedAt(s, task.id));
  // The flash-on-update CSS animation (globals.css) plays once, on element
  // creation. Changing `key` only when `flashedAt` changes forces React to
  // recreate the DOM node -- and therefore replay the animation -- exactly
  // when a live WebSocket event touched this row, and never on an ordinary
  // page load or refetch (where flashedAt stays undefined).
  const rowKey = flashedAt ? `${task.id}:${flashedAt}` : task.id;

  return (
    <button
      key={rowKey}
      type="button"
      onClick={() => dispatch(taskSelected(task.id))}
      className={`grid w-full grid-cols-[1fr_100px_76px] sm:grid-cols-[1fr_70px_100px_76px] md:grid-cols-[1fr_70px_100px_120px_76px] items-center gap-3 border-b border-slate-50 px-5 py-3.5 text-left text-sm transition-colors hover:bg-slate-50 ${
        selected ? "bg-navy-50/60 hover:bg-navy-50/80" : ""
      } ${task.isStub ? "opacity-60" : ""} ${flashedAt ? "flash-on-update" : ""}`}
      title={task.issues.length ? task.issues.join("; ") : undefined}
    >
      <span className="truncate font-medium text-slate-800">
        {task.title}
        {task.issues.length > 0 && (
          <span className="ml-1.5 font-normal text-amber-500" aria-label="data quality issue">
            ⚠
          </span>
        )}
      </span>
      <span className="hidden truncate text-xs text-slate-400 sm:block">{task.type}</span>
      <span>
        <StatusBadge status={task.status} />
      </span>
      <span className="hidden truncate text-slate-500 md:block">{task.assignee?.name ?? "Unassigned"}</span>
      <span className="truncate font-mono text-xs text-slate-400">{formatTime(task.updatedAt)}</span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 p-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <SearchX className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">No tasks found</p>
        <p className="mt-0.5 text-xs text-slate-400">Try widening your filters or clearing the search.</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <WifiOff className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-800">Connection failed</p>
        <p className="mt-0.5 max-w-xs text-xs text-slate-500">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-medium text-rose-700 shadow-soft transition-colors hover:bg-rose-50"
      >
        Retry
      </button>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3 p-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="grid animate-pulse grid-cols-[1fr_100px_76px] sm:grid-cols-[1fr_70px_100px_76px] md:grid-cols-[1fr_70px_100px_120px_76px] items-center gap-3"
        >
          <div className="h-3.5 w-3/4 rounded bg-slate-100" />
          <div className="hidden h-3.5 w-10 rounded bg-slate-100 sm:block" />
          <div className="h-5 w-20 rounded-full bg-slate-100" />
          <div className="hidden h-3.5 w-16 rounded bg-slate-100 md:block" />
          <div className="h-3.5 w-12 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function TaskList() {
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectFilteredSortedTasks);
  const meta = useAppSelector(selectTasksMeta);
  const selectedTaskId = useAppSelector((s) => s.ui.selectedTaskId);

  const isInitialLoad = meta.status === "loading" && tasks.length === 0 && !meta.isFromCache;
  const isError = meta.status === "failed";
  const retry = () => dispatch(fetchTasks({ page: meta.page, pageSize: meta.pageSize }));

  return (
    <div className="flex h-full flex-col">
      {meta.isFromCache && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-xs text-amber-700">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
          Showing cached data{meta.cachedAt ? ` from ${formatTime(meta.cachedAt)}` : ""}
          {meta.status === "loading" ? " — refreshing…" : "."}
        </div>
      )}

      <div className="grid grid-cols-[1fr_100px_76px] sm:grid-cols-[1fr_70px_100px_76px] md:grid-cols-[1fr_70px_100px_120px_76px] items-center gap-3 border-b border-slate-100 px-5 py-3">
        <SortHeader label="Title" sortKey="title" />
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 sm:block">Type</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">Status</span>
        <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 md:block">Assignee</span>
        <SortHeader label="Updated" sortKey="updatedAt" />
      </div>

      <div className="styled-scroll flex-1 overflow-y-auto" role="table" aria-label="Tasks">
        {isInitialLoad && <SkeletonRows />}
        {isError && <ErrorState message={meta.error ?? "Unknown error."} onRetry={retry} />}
        {!isInitialLoad && !isError && tasks.length === 0 && <EmptyState />}

        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} selected={selectedTaskId === task.id} />
        ))}
      </div>

      <Pagination
        page={meta.page}
        pageSize={meta.pageSize}
        total={meta.total}
        disabled={meta.status === "loading"}
        onPageChange={(page) => dispatch(fetchTasks({ page, pageSize: meta.pageSize }))}
        onPageSizeChange={(pageSize) => dispatch(fetchTasks({ page: 1, pageSize }))}
      />
    </div>
  );
}
