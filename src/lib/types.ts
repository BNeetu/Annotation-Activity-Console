/**
 * Domain model for the annotation console.
 *
 * The wire format (see mock-server/server.js) is intentionally messy:
 *  - `type` is a free string, sometimes a value we don't recognize ("video").
 *  - `status` arrives with inconsistent casing/spelling ("InProgress", "QA", "BLOCKED").
 *  - `updatedAt` is sometimes an epoch-ms number, sometimes an ISO string.
 *  - `annotationCount` is sometimes a string, sometimes a number.
 *  - `assignee` is sometimes null.
 *
 * `RawTask` models the wire shape defensively (mostly `unknown`), and
 * `NormalizedTask` is the clean internal model the rest of the app works with.
 * The mapping between them lives in `normalize.ts`.
 */

// ---- Wire (raw) shapes -----------------------------------------------------

/** What we actually get over the wire. Deliberately loose: fields may be
 * missing or malformed, so we treat everything but `id` as `unknown`. */
export interface RawTask {
  id: string;
  title?: unknown;
  type?: unknown;
  status?: unknown;
  assignee?: unknown;
  annotationCount?: unknown;
  updatedAt?: unknown;
  meta?: unknown;
}

export interface RawTasksResponse {
  page: number;
  pageSize: number;
  total: number;
  items: RawTask[];
}

export interface RawAssignee {
  id: string;
  name: string;
}

// ---- Normalized (clean) domain model ---------------------------------------

/** Known task types. `unknown` is a first-class member of the union rather
 * than something we throw away -- the mock server deliberately sends "video",
 * and real backends will always eventually surprise you with a new type. */
export type TaskType = "image" | "audio" | "text" | "unknown";

/** Canonical status enum. Every raw casing/spelling variant
 * (InProgress/in_progress, QA/qa, BLOCKED/blocked, ...) maps into exactly one
 * of these. `unknown` covers anything we don't recognize, so we never crash
 * or silently drop a task just because of a new status string. */
export type TaskStatus = "todo" | "in_progress" | "qa" | "blocked" | "done" | "unknown";

export interface Assignee {
  id: string;
  name: string;
}

/**
 * A discriminated union on `type`. Each variant carries the fields that only
 * make sense for that task type. Today the mock data doesn't actually vary
 * fields by type, so every variant has the same shape -- but the union is
 * structured so that adding type-specific fields later (e.g. `durationMs` for
 * audio, `resolution` for image) doesn't require touching unrelated code
 * paths, and so a switch over `task.type` is exhaustively checked by the
 * compiler.
 */
export type NormalizedTask =
  | (TaskBase & { type: "image" })
  | (TaskBase & { type: "audio" })
  | (TaskBase & { type: "text" })
  | (TaskBase & { type: "unknown"; rawType: string });

interface TaskBase {
  id: string;
  title: string;
  status: TaskStatus;
  assignee: Assignee | null;
  annotationCount: number;
  /** Always a normalized epoch-ms number, regardless of wire format. */
  updatedAt: number;
  meta: Record<string, unknown>;
  /**
   * Non-fatal problems found while normalizing this record (unrecognized
   * status string, unparsable timestamp that we fell back on, etc). Kept so
   * the UI can surface "this row's data looked odd" without hiding the row.
   */
  issues: string[];
  /**
   * True when this entry was created from a live WebSocket event that
   * referenced a task we hadn't loaded from REST yet. It's a minimal stub,
   * not a fully-loaded task -- the UI should render it distinctly and
   * upgrade it in place once/if the full record arrives.
   */
  isStub?: boolean;
}

// ---- Real-time event payloads ----------------------------------------------

export interface TaskUpdatedEvent {
  kind: "task.updated";
  payload: {
    id: string;
    status?: unknown;
    updatedAt?: unknown;
  };
}

export interface TaskAssignedEvent {
  kind: "task.assigned";
  payload: {
    id: string;
    assignee?: unknown;
  };
}

export interface AnnotationCreatedEvent {
  kind: "annotation.created";
  payload: {
    taskId: string;
    by?: unknown;
    at?: unknown;
  };
}

export type TaskFeedEvent = TaskUpdatedEvent | TaskAssignedEvent | AnnotationCreatedEvent;

// ---- Filter/sort UI state ---------------------------------------------------

export type SortKey = "updatedAt" | "title";
export type SortDirection = "asc" | "desc";

export interface TaskFilters {
  type: TaskType | "all";
  status: TaskStatus | "all";
  search: string;
}

export interface TaskSort {
  key: SortKey;
  direction: SortDirection;
}
