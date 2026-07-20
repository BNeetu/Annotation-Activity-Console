import localforage from "localforage";
import type { NormalizedTask } from "./types";

/**
 * Client-side cache of the most recently loaded task list, so a reload shows
 * something instantly instead of a blank loading screen. This is a
 * stale-while-revalidate cache, not a source of truth: the network response
 * always wins and always overwrites this cache once it arrives.
 */

const store = localforage.createInstance({
  name: "annotation-console",
  storeName: "task_cache",
});

const CACHE_KEY = "tasks:list:v1";

export interface TaskListCacheEntry {
  tasks: NormalizedTask[];
  cachedAt: number;
  page: number;
  pageSize: number;
  total: number;
}

/** Write is intentionally fire-and-forget from the caller's perspective --
 * IndexedDB writes go through localforage's own async queue and never block
 * the main thread; callers should not `await` this before rendering. */
export async function writeTaskListCache(entry: TaskListCacheEntry): Promise<void> {
  try {
    await store.setItem(CACHE_KEY, entry);
  } catch (err) {
    // Caching is a nice-to-have; a quota error or private-browsing
    // restriction should never break the app.
    console.warn("[taskCache] failed to write cache", err);
  }
}

export async function readTaskListCache(): Promise<TaskListCacheEntry | null> {
  try {
    const value = await store.getItem<TaskListCacheEntry>(CACHE_KEY);
    return value ?? null;
  } catch (err) {
    console.warn("[taskCache] failed to read cache", err);
    return null;
  }
}
