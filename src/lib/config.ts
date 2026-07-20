// Single source of truth for where the mock server lives. Previously this
// same `process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000"` line
// (and its WS_URL counterpart) was copy-pasted into three separate files
// (tasksSlice.ts, useTaskFeed.ts, useSummaryStream.ts) -- duplicated logic
// that only had to drift once for two of the three to disagree.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";

/**
 * True when the app is running in a real browser on a real (non-localhost)
 * origin, but is still configured to reach the mock server at `localhost`.
 *
 * This is a very specific, very common deployment mistake: `NEXT_PUBLIC_*`
 * env vars were never set on the hosting platform, so the code's localhost
 * fallback above took over. The result "works" only on the one machine that
 * happens to also have `npm run mock` running locally (browsers resolve
 * `localhost` to whatever device they're running on, not to any specific
 * server) -- and fails, with a generic "connection failed", for every other
 * visitor: a different computer, a phone, anyone else. Detecting this exact
 * shape of failure lets the UI say what's actually wrong instead of just
 * "Connection failed", which looks identical whether the mock server is
 * down, unreachable, or was simply never pointed at a real host.
 */
export function isLocalhostMisconfigured(): boolean {
  if (typeof window === "undefined") return false;
  const pageIsLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const apiIsLocal = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
  return !pageIsLocal && apiIsLocal;
}
