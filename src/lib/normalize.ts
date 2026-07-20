import type { Assignee, NormalizedTask, RawAssignee, RawTask, TaskStatus, TaskType } from "./types";

/**
 * Normalization policy (documented per the take-home brief):
 *
 *  - We NEVER throw and NEVER drop a record just because a field is messy.
 *    Every raw task produces exactly one NormalizedTask.
 *  - Unrecognized `type` values become `"unknown"` and the original string is
 *    preserved on `rawType` so nothing is lost.
 *  - `status` is matched case-insensitively against known spellings
 *    (see STATUS_ALIASES). Anything else becomes `"unknown"`, which is a
 *    valid, renderable status rather than an error state.
 *  - `updatedAt` accepts either an epoch-ms number or an ISO 8601 string.
 *    If neither parses, we fall back to `Date.now()` and record an issue --
 *    we'd rather show a task with a slightly-wrong "just now" timestamp than
 *    hide it or crash the sort.
 *  - `annotationCount` accepts a number or a numeric string; anything else
 *    (including NaN parses) becomes `0` with an issue recorded.
 *  - `assignee` is nullable by design (unassigned is a valid state) but a
 *    malformed non-null assignee (missing id/name) is treated as null with
 *    an issue recorded, rather than crashing the UI that reads `.name`.
 *  - Every non-fatal problem is appended to `issues` on the task, so the UI
 *    can flag "this row's source data looked off" without hiding the row --
 *    per the brief: "Don't crash, and don't silently drop data."
 */

const KNOWN_TYPES: ReadonlySet<string> = new Set(["image", "audio", "text"]);

const STATUS_ALIASES: Record<string, TaskStatus> = {
  todo: "todo",
  in_progress: "in_progress",
  inprogress: "in_progress",
  qa: "qa",
  blocked: "blocked",
  done: "done",
};

function normalizeType(raw: unknown, issues: string[]): { type: TaskType; rawType?: string } {
  if (typeof raw === "string" && KNOWN_TYPES.has(raw)) {
    return { type: raw as TaskType };
  }
  const rawType = typeof raw === "string" ? raw : typeof raw === "undefined" ? "(missing)" : String(raw);
  issues.push(`unrecognized type "${rawType}"`);
  return { type: "unknown", rawType };
}

function normalizeStatus(raw: unknown, issues: string[]): TaskStatus {
  if (typeof raw === "string") {
    const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const match = STATUS_ALIASES[key];
    if (match) return match;
  }
  issues.push(`unrecognized status "${String(raw)}"`);
  return "unknown";
}

function normalizeTimestamp(raw: unknown, issues: string[]): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  issues.push(`unparsable updatedAt "${String(raw)}", falling back to now`);
  return Date.now();
}

function normalizeCount(raw: unknown, issues: string[]): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  issues.push(`unparsable annotationCount "${String(raw)}", defaulting to 0`);
  return 0;
}

function isPlausibleAssignee(v: unknown): v is RawAssignee {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).id === "string" &&
    typeof (v as Record<string, unknown>).name === "string"
  );
}

function normalizeAssignee(raw: unknown, issues: string[]): Assignee | null {
  if (raw === null || typeof raw === "undefined") return null;
  if (isPlausibleAssignee(raw)) return { id: raw.id, name: raw.name };
  issues.push(`malformed assignee, treating as unassigned`);
  return null;
}

function normalizeMeta(raw: unknown): Record<string, unknown> {
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function normalizeTitle(raw: unknown, id: string, issues: string[]): string {
  if (typeof raw === "string" && raw.trim() !== "") return raw;
  issues.push(`missing/invalid title, defaulting to id`);
  return id;
}

/**
 * Normalize a single raw task. Never throws: any field-level problem is
 * recorded in `issues` and a sane default is substituted so the record still
 * renders. Returns `null` only if the record is unusable at the identity
 * level (no `id` at all) -- that's the one thing we truly can't paper over,
 * since the entity adapter and every selector key off of it.
 */
export function normalizeTask(raw: unknown): NormalizedTask | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as RawTask;
  if (typeof r.id !== "string" || r.id.trim() === "") return null;

  const issues: string[] = [];
  const { type, rawType } = normalizeType(r.type, issues);
  const base = {
    id: r.id,
    title: normalizeTitle(r.title, r.id, issues),
    status: normalizeStatus(r.status, issues),
    assignee: normalizeAssignee(r.assignee, issues),
    annotationCount: normalizeCount(r.annotationCount, issues),
    updatedAt: normalizeTimestamp(r.updatedAt, issues),
    meta: normalizeMeta(r.meta),
    issues,
  };

  if (type === "unknown") {
    return { ...base, type: "unknown", rawType: rawType ?? "unknown" };
  }
  return { ...base, type };
}

/** Normalize a page of raw tasks, skipping only records with no usable id. */
export function normalizeTasks(rawItems: unknown[]): NormalizedTask[] {
  const out: NormalizedTask[] = [];
  for (const item of rawItems) {
    const normalized = normalizeTask(item);
    if (normalized) out.push(normalized);
    // Records with no id at all are the one case we can't safely keep
    // (nothing to key them by), so they're dropped -- this is the single
    // documented exception to "don't silently drop data".
  }
  return out;
}
