/**
 * Display-only timestamp formatting.
 *
 * NOTE on why NormalizedTask.updatedAt is a `number` (epoch-ms), not a
 * `Date`: Redux Toolkit's state is expected to be plain, serializable data --
 * RTK's default middleware actively warns (via `serializableCheck`) when
 * non-serializable values like `Date` instances end up in the store, because
 * they break redux-devtools time-travel, `JSON.stringify` on persisted
 * state, and equality checks in memoized selectors. So normalization
 * converts *inconsistent formats* (epoch-ms or ISO string) into one
 * consistent, serializable representation -- but that representation is a
 * number, with `Date` construction pushed to the presentation layer, here.
 */
export function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString();
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString();
}

/** "3s ago" / "5m ago" / falls back to a full date+time beyond an hour. */
export function formatRelative(epochMs: number, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - epochMs) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return formatDateTime(epochMs);
}
