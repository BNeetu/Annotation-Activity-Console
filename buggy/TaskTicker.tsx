// buggy/TaskTicker.tsx
//
// Fixed version. See DECISIONS.md for the root-cause writeup of each bug;
// each fix below is marked with the same (A)/(B)/(C) labels as the original
// plus the additional bugs found beyond those three call-outs.
import React, { useEffect, useState } from "react";

type Task = { id: string; title: string; updatedAt: number };

export function TaskTicker({ apiBase }: { apiBase: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setTick] = useState(0); // (A) value itself is unused; it only exists to force a re-render each second

  // (A) BUG: stale closure. The original read `tick` from the closure captured
  // when the effect first ran, so every tick set the same value (0 -> 1,
  // forever), and worse, it re-read state that could be stale under
  // StrictMode's double-invoke. Using the updater-function form reads the
  // latest state instead of a captured variable, and doesn't need `tick` in
  // the dependency array at all.
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // (B) BUG: no null-guard, so this fired `fetch(".../api/tasks/null")` on
  // mount before any task was ever selected. Also (B2): fetched tasks were
  // `push`ed onto the *existing* array reference and that mutated array was
  // passed back into `setState`, so React sometimes skipped re-rendering
  // (same reference) and, when it did re-render, previously-selected tasks
  // were duplicated instead of updated. Also (B3): rapid re-selection could
  // let an older, slower request resolve after a newer one and overwrite it
  // (a classic race condition) since nothing tracked which request was still
  // wanted.
  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;

    fetch(`${apiBase}/api/tasks/${selectedId}`)
      .then((r) => r.json())
      .then((t: Task) => {
        if (cancelled) return; // ignore stale responses from a since-changed selection
        setTasks((prev) => {
          const withoutExisting = prev.filter((existing) => existing.id !== t.id);
          return [...withoutExisting, t]; // new array, no duplicates, no mutation
        });
      })
      .catch(() => {
        if (!cancelled) {
          // Swallow-but-don't-crash: a failed detail fetch shouldn't take down
          // the ticker. A production version would surface this in the UI.
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiBase, selectedId]);

  // (C) BUG: `Array.prototype.sort` mutates in place. Calling it directly on
  // the `tasks` state array during render mutates state outside of
  // `setState`, which both violates React's rules and can produce
  // inconsistent renders (two renders of "the same" state end up looking
  // at a array that a *previous* render already reordered). Sort a copy.
  const sorted = [...tasks].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <ul>
      {sorted.map((t) => (
        // (D) BUG: `key={i}` used the array index, which changes identity
        // every time the list is re-sorted/re-ordered, causing React to
        // misattribute DOM nodes (and any per-row local state) across
        // reorders. Keying by the stable task id fixes reconciliation.
        <li key={t.id} onClick={() => setSelectedId(t.id)}>
          {t.title} (updated {Math.floor((Date.now() - t.updatedAt) / 1000)}s ago)
        </li>
      ))}
    </ul>
  );
}
