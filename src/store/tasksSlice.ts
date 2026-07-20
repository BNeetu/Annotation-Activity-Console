import { createAsyncThunk, createEntityAdapter, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { normalizeTasks } from "@/lib/normalize";
import { readTaskListCache, writeTaskListCache } from "@/lib/taskCache";
import { API_BASE, isLocalhostMisconfigured } from "@/lib/config";
import type {
  AnnotationCreatedEvent,
  NormalizedTask,
  RawTasksResponse,
  TaskAssignedEvent,
  TaskUpdatedEvent,
} from "@/lib/types";

const tasksAdapter = createEntityAdapter<NormalizedTask>();

export interface TasksState {
  ids: NormalizedTask["id"][];
  entities: Record<string, NormalizedTask>;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
  /** True once we've shown data straight from IndexedDB, before the network
   * response for that page has come back. Drives the "stale" badge in the UI. */
  isFromCache: boolean;
  cachedAt: number | null;
  /**
   * annotation.created events that arrived for a task we haven't loaded yet.
   * Applied (and cleared) the moment that task shows up via upsert.
   */
  pendingAnnotationBumps: Record<string, number>;
  wsStatus: "connecting" | "open" | "reconnecting" | "closed";
  /**
   * Timestamp of the last *live* (WebSocket-driven) change to each task id.
   * Populated only by taskUpdated/taskAssigned/annotationCreated -- never by
   * fetchTasks -- so the UI can flash exactly the rows a real-time event
   * touched, and never flash on an ordinary page load/refetch.
   */
  flashedAt: Record<string, number>;
}

const initialState: TasksState = tasksAdapter.getInitialState({
  status: "idle",
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
  isFromCache: false,
  cachedAt: null,
  pendingAnnotationBumps: {},
  wsStatus: "closed",
  flashedAt: {},
}) as TasksState;

/** Load the cached list (if any) into state immediately on app start. This is
 * separate from the network fetch thunk below -- cache-then-revalidate, not
 * cache-as-fallback-on-error. */
export const hydrateFromCache = createAsyncThunk("tasks/hydrateFromCache", async () => {
  return readTaskListCache();
});

export const fetchTasks = createAsyncThunk(
  "tasks/fetchTasks",
  async (args: { page: number; pageSize?: number }) => {
    const pageSize = args.pageSize ?? 20;
    const res = await fetch(`${API_BASE}/api/tasks?page=${args.page}&pageSize=${pageSize}`);
    if (!res.ok) {
      throw new Error(`Failed to load tasks: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as RawTasksResponse;
    const tasks = normalizeTasks(data.items);

    // Best-effort cache write; never blocks the UI on the result.
    void writeTaskListCache({
      tasks,
      cachedAt: Date.now(),
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
    });

    return { tasks, page: data.page, pageSize: data.pageSize, total: data.total };
  }
);

function applyPendingBump(state: TasksState, taskId: string) {
  const bump = state.pendingAnnotationBumps[taskId];
  if (bump) {
    const existing = state.entities[taskId];
    if (existing) {
      existing.annotationCount += bump;
    }
    delete state.pendingAnnotationBumps[taskId];
  }
}

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    /** task.updated: patch status/updatedAt on an existing task, or create a
     * minimal stub if we haven't loaded that task yet (per the brief: handle
     * events that reference tasks outside the loaded page gracefully). */
    taskUpdated(state, action: PayloadAction<TaskUpdatedEvent["payload"]>) {
      const { id } = action.payload;
      const existing = state.entities[id];
      const status = normalizeIncomingStatus(action.payload.status);
      const updatedAt = normalizeIncomingTimestamp(action.payload.updatedAt);
      state.flashedAt[id] = Date.now();

      if (existing) {
        tasksAdapter.updateOne(state, {
          id,
          changes: {
            ...(status ? { status } : {}),
            ...(updatedAt ? { updatedAt } : {}),
          },
        });
      } else {
        tasksAdapter.upsertOne(state, makeStub(id, { status, updatedAt }));
      }
    },
    /** task.assigned: same stub-or-patch strategy as taskUpdated. */
    taskAssigned(state, action: PayloadAction<TaskAssignedEvent["payload"]>) {
      const { id, assignee } = action.payload;
      const normalizedAssignee =
        assignee && typeof assignee === "object" && "id" in assignee && "name" in assignee
          ? (assignee as { id: string; name: string })
          : null;
      const existing = state.entities[id];
      state.flashedAt[id] = Date.now();
      if (existing) {
        tasksAdapter.updateOne(state, { id, changes: { assignee: normalizedAssignee } });
      } else {
        tasksAdapter.upsertOne(state, makeStub(id, { assignee: normalizedAssignee }));
      }
    },
    /** annotation.created: bump the count if the task is loaded; otherwise
     * remember the bump and apply it once the task arrives. */
    annotationCreated(state, action: PayloadAction<AnnotationCreatedEvent["payload"]>) {
      const { taskId } = action.payload;
      const existing = state.entities[taskId];
      if (existing) {
        existing.annotationCount += 1;
        state.flashedAt[taskId] = Date.now();
      } else {
        state.pendingAnnotationBumps[taskId] = (state.pendingAnnotationBumps[taskId] ?? 0) + 1;
      }
    },
    wsStatusChanged(state, action: PayloadAction<TasksState["wsStatus"]>) {
      state.wsStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateFromCache.fulfilled, (state, action) => {
        if (action.payload) {
          tasksAdapter.setAll(state, action.payload.tasks);
          state.page = action.payload.page;
          state.pageSize = action.payload.pageSize;
          state.total = action.payload.total;
          state.isFromCache = true;
          state.cachedAt = action.payload.cachedAt;
        }
      })
      .addCase(fetchTasks.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        // Fresh network data always wins over cache, and always for the
        // whole page (not merged field-by-field) since it's the source of
        // truth for "what does this page currently look like".
        tasksAdapter.setMany(state, action.payload.tasks);
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.total = action.payload.total;
        state.isFromCache = false;
        for (const task of action.payload.tasks) {
          applyPendingBump(state, task.id);
        }
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = "failed";
        // A bare "Failed to fetch" (the browser's generic network-error
        // message) tells the person nothing actionable. When it matches the
        // specific, very common "deployed but still pointing at localhost"
        // misconfiguration, say that instead -- see lib/config.ts.
        state.error = isLocalhostMisconfigured()
          ? `Can't reach the mock server at ${API_BASE} -- this looks like a deployed build that was never given a real NEXT_PUBLIC_API_BASE/NEXT_PUBLIC_WS_URL. Set those to a publicly hosted mock server's https/wss URL and redeploy.`
          : (action.error.message ?? "Unknown error loading tasks");
      });
  },
});

function makeStub(
  id: string,
  patch: Partial<Pick<NormalizedTask, "status" | "updatedAt" | "assignee">>
): NormalizedTask {
  return {
    id,
    title: `(unloaded task ${id})`,
    type: "unknown",
    rawType: "unknown",
    status: patch.status ?? "unknown",
    assignee: patch.assignee ?? null,
    annotationCount: 0,
    updatedAt: patch.updatedAt ?? Date.now(),
    meta: {},
    issues: ["stub created from a real-time event before the task was loaded from the API"],
    isStub: true,
  };
}

function normalizeIncomingStatus(raw: unknown): NormalizedTask["status"] | undefined {
  if (typeof raw !== "string") return undefined;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const map: Record<string, NormalizedTask["status"]> = {
    todo: "todo",
    in_progress: "in_progress",
    inprogress: "in_progress",
    qa: "qa",
    blocked: "blocked",
    done: "done",
  };
  return map[key] ?? "unknown";
}

function normalizeIncomingTimestamp(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

export const { taskUpdated, taskAssigned, annotationCreated, wsStatusChanged } = tasksSlice.actions;
export const tasksReducer = tasksSlice.reducer;
export const tasksSelectors = tasksAdapter.getSelectors<{ tasks: TasksState }>((state) => state.tasks);
