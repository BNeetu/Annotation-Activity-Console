"use client";

import type { ReactNode } from "react";
import { Inbox, Clock, MessagesSquare, UserRound, Tag } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectTaskById } from "@/store/selectors";
import { StatusBadge } from "./StatusBadge";
import { SummaryMarkdown } from "./SummaryMarkdown";
import { formatDateTime } from "@/lib/formatters";
import type { RootState } from "@/store/store";

function MetaItem({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
      <Icon className="h-3.5 w-3.5 text-slate-300" strokeWidth={1.75} />
      {children}
    </span>
  );
}

export function TaskDetailPanel() {
  const selectedTaskId = useAppSelector((s) => s.ui.selectedTaskId);
  const task = useAppSelector((s: RootState) => (selectedTaskId ? selectTaskById(s, selectedTaskId) : undefined));

  if (!selectedTaskId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-300">
          <Inbox className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">No task selected</p>
          <p className="mt-0.5 text-xs text-slate-400">Choose a task from the list to see its details.</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Task <span className="font-mono">{selectedTaskId}</span> isn&apos;t loaded yet.
      </div>
    );
  }

  return (
    // Keying on task.id replays the entry animation each time the selection
    // changes, giving the panel a light "slide in" feel without any manual
    // animation-state bookkeeping.
    <div key={task.id} className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 p-6">
        <h2 className="text-lg font-semibold leading-snug text-slate-900">{task.title}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusBadge status={task.status} />
          <MetaItem icon={Tag}>{task.type === "unknown" ? `unknown (${task.rawType})` : task.type}</MetaItem>
          <MetaItem icon={UserRound}>{task.assignee?.name ?? "Unassigned"}</MetaItem>
          <MetaItem icon={MessagesSquare}>{task.annotationCount} annotations</MetaItem>
          <MetaItem icon={Clock}>{formatDateTime(task.updatedAt)}</MetaItem>
        </div>
        {task.isStub && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
            This task arrived via a live event before its full record loaded. Details may be incomplete.
          </p>
        )}
        {task.issues.length > 0 && (
          <ul className="mt-4 list-inside list-disc space-y-0.5 text-xs text-amber-600">
            {task.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="styled-scroll flex-1 overflow-y-auto">
        <SummaryMarkdown taskId={task.id} />
      </div>
    </div>
  );
}
