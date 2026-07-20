# DECISIONS.md

## Key decisions and tradeoffs

**Thunks over RTK Query.** RTK Query is a great fit when most of your data
needs are "fetch a resource, cache it, invalidate it." Here the interesting
data doesn't come from request/response at all -- it comes from a WebSocket
feed and an SSE stream, both of which RTK Query doesn't model natively (you'd
be reaching for its more experimental streaming APIs, or bolting the same
manual subscription code onto it anyway). Given that, a plain `createEntityAdapter`
slice with `createAsyncThunk` for the one real REST call (`fetchTasks`) is
simpler to reason about, and keeps the live-event and cache-hydration logic
in the same reducer style as the fetch logic, rather than split across two
different state-management mental models.

*(The counter-argument -- RTK Query as the default choice -- is fair and
worth debating live: `fetchTasks` alone would benefit from RTK Query's
built-in loading/error states and cache invalidation, and adopting it there
wouldn't conflict with anything else in this codebase. The reasoning above
is specifically about why the WebSocket and SSE portions -- most of the
"real-time" surface this exercise is testing -- don't fit RTK Query's
request/response model without working against it. A hybrid, RTK Query for
`fetchTasks` and hand-written hooks for the two streams, is a reasonable
next iteration.)*

**Normalization approach.** `normalize.ts` treats every field defensively:
`type` is matched against a known set and falls back to `"unknown"` with the
original string preserved (`rawType`); `status` is matched case/spelling
insensitively against known aliases and falls back to `"unknown"`; timestamps
accept epoch-ms or ISO and fall back to `Date.now()`; counts accept numeric
strings; a malformed (but non-null) assignee is treated as unassigned. Every
fallback appends a human-readable message to that task's `issues[]` rather
than throwing or dropping the row -- the UI surfaces these with a small ⚠ and
a tooltip so bad data is visible instead of silently swallowed. The *only*
thing that gets dropped is a record with no usable `id` at all, since nothing
in the entity adapter, selectors, or real-time merge logic can key off it.

**Typing the messy data.** `RawTask` models the wire shape with `unknown` for
every field except `id`, so nothing downstream can accidentally trust
unvalidated data through an `any`. `NormalizedTask` is a discriminated union
on `type` (image/audio/text/unknown), which doesn't pay for itself with
today's identical-shaped variants, but means adding a type-specific field
later is a compiler-checked, exhaustive-switch-friendly change instead of an
optional-field free-for-all. There is no `any` anywhere in `src/` outside
comments referring to the English word.

**Real-time merge strategy.** `task.updated` / `task.assigned` patch an
existing entity via `updateOne`, or -- if the event references a task we
haven't loaded (the mock server does this on purpose for ids beyond the
current page) -- create a minimal, visibly-marked "stub" entity via
`upsertOne` so the event isn't lost. `annotation.created` increments the
count on the loaded entity, or, if the task isn't loaded, stashes the bump in
`pendingAnnotationBumps` keyed by task id; the moment that task is fetched
(current page load or future pagination), the pending bump is applied and
cleared. This means no event is ever silently dropped just because of load
order, without inventing fake full task records for things we know nothing
about. A live update also stamps `flashedAt[id]`, which drives a one-time CSS
highlight on that row (`TaskList.tsx`) -- purely so a status/assignee change
arriving without a manual refresh is visibly noticeable, not just true in
state.

## Streamed markdown: how it's rendered safely

Pipeline: `remark-gfm` (markdown) → `rehype-raw` (lets embedded HTML join the
parsed tree instead of being left as escaped text) → `rehype-sanitize` (with
an explicit allowlist schema in `src/lib/sanitizeSchema.ts`, based on
`rehype-sanitize`'s default safe schema) → `react-markdown`'s React renderer.
`dangerouslySetInnerHTML` is never used anywhere in this path.

Sanitization happens **once, in one place**: the `rehype-sanitize` step,
before any React node is created. Concretely, for this feed's payload: the
`<script>alert(...)</script>` tag isn't on the allowed-tag list, so it (and
its contents) is dropped outright; the `<img src=x onerror="...">` tag *is*
allowed (images are useful in real summaries), but `onerror` isn't on the
allowed-attributes list for `img`, so the attribute is stripped and the
handler never attaches -- the browser just tries (and fails) to load `src=x`
as an image, which `SummaryMarkdown.tsx` catches via its own `onError`
(added *after* sanitization, not a reintroduction of the stripped handler)
to show a small "Image unavailable" placeholder instead of a broken-image
icon. Everything else (headings, lists, bold/italic, the \`\`\`ts code block,
links) passes through untouched.

## IndexedDB caching

We cache the most recently loaded page of tasks (`localforage`, under a
single `tasks:list:v1` key: page, pageSize, total, tasks, and a `cachedAt`
timestamp). On app start we dispatch `hydrateFromCache` first, which paints
whatever was cached immediately, then unconditionally dispatch `fetchTasks`
for page 1 -- the network response always overwrites the cache's page in
state and in storage, so cache is a *display optimization*, never a source of
truth. While a page is showing cached data, the UI shows a yellow "showing
cached data as of HH:MM:SS -- refreshing…" strip, so staleness is visible
rather than silently swapped in. The write itself never blocks rendering:
`writeTaskListCache` is fired with `void` (not awaited) from inside the fetch
thunk, and `localforage`'s IndexedDB writes are already async off the main
thread.

## What we handled vs. deliberately didn't

Handled: inconsistent status casing/spelling, mixed timestamp formats,
string-or-number counts, null/malformed assignees, an unrecognized task type,
events referencing not-yet-loaded tasks, WebSocket reconnect with backoff,
mid-stream task switching for the SSE summary, and the untrusted-HTML
sanitization requirement.

Deliberately not handled (documented, not silently ignored): server-side
filter/search params aren't used even though the mock accepts `type`/`status`
query params -- filtering/search is done client-side over the currently
loaded page(s) only, so it won't find matches on pages you haven't paged to
yet. With more time this would move to server-side filtering to match across
the full 137-row set. We also don't currently persist `pendingAnnotationBumps`
or the WS reconnect attempt counter across a full page reload (in-memory
only) -- acceptable for this exercise since reconnecting from a fresh mount
just resubscribes cleanly.

## What we'd do next with more time

- Server-side (or at least full-dataset) filter/search instead of
  page-scoped client filtering.
- Optimistic "assign to me" with rollback (listed as bonus; not implemented
  here to keep the core surface reviewable).
- Virtualize the task list for the full 137+ row case.
- Cache streamed summaries in IndexedDB so a revisited task renders instantly
  instead of re-streaming.
- Add an integration test that exercises the WebSocket stub-then-upgrade path
  and the SSE cancel-on-switch behavior with a fake EventSource/WebSocket,
  since the current test suite covers normalization, selectors, and one RTL
  interaction per the brief's stated minimum, but not the two hooks directly.

## Scope discipline

An earlier pass added a multi-page shell (Analytics and Settings routes, a
collapsible sidebar), a custom serif display font, and layered entrance
animations. None of that was asked for by the brief, and it made the app
harder to explain, not easier -- more surface area to walk an interviewer
through, more custom design tokens to justify, more code that isn't in
service of the six things actually being evaluated. All of it was removed:

- Deleted `app/analytics`, `app/settings`, `AppShell.tsx`, `Sidebar.tsx`,
  `Topbar.tsx`. This is a single-screen console; there's nothing to
  navigate to, so there's no sidebar.
- The multi-color, percentage-annotated KPI cards became `StatusSummary.tsx`
  -- a plain count-per-status readout, which is the brief's own suggested
  bonus ("a small derived metric... shown as a simple chart"), nothing more.
- Dropped the custom serif font, the multi-tier shadow system, and the
  `fadeIn`/`slideInRight`/`pulseRing` keyframes from `tailwind.config.js`.
  What's left: one accent color (`navy`, used consistently for
  selected/active state), one shadow, and the one animation that's actually
  load-bearing for a grading criterion -- the live-update row flash (see
  "Real-time merge strategy" above), which directly demonstrates "the UI
  updates in real time without a manual refresh."
- Removed dead code this left behind: `tasksSlice.liveEventCount` and
  `selectors.selectAssigneeWorkload` (only the deleted Analytics page read
  them), `uiSlice.hideStubs` (only the deleted Settings page could toggle
  it), and `taskCache.clearTaskListCache` (had no caller left after Settings
  was removed).
- Removed the unused `recharts` dependency from `package.json` (only
  consumer was the deleted Analytics page).

What stayed, deliberately: the Reset-filters button (a small, direct aid to
the *required* filter feature, not a separate feature) and the page-size
selector next to the pagination count (same reasoning -- pagination is
required, choosing a page size is a normal part of that control, not an
addition to it).

## Deployment note: a localhost misconfiguration, and how it's now diagnosed

Deploying the frontend to Vercel without also hosting `mock-server/`
somewhere public (and pointing `NEXT_PUBLIC_API_BASE`/`NEXT_PUBLIC_WS_URL`
at it) produces a specific, easy-to-misread failure: it can appear to work
on whichever machine also happens to be running `npm run mock` locally
(browsers resolve `localhost` to whatever device they're on, and browsers
specifically exempt `localhost` from HTTPS mixed-content blocking), while
failing with a generic "Connection failed" / stuck "Reconnecting" on every
other device -- a different computer, a phone, anyone else.

There's no code bug in this -- `process.env.NEXT_PUBLIC_API_BASE ?? "..."`
does exactly what it's written to do. The fix is a deployment configuration
one: host `mock-server/` on a platform that keeps a Node process running
(Render/Railway/Fly all work), then set both env vars in Vercel to that
host's `https`/`wss` URL and redeploy. `wss://`, specifically, not `ws://` --
once the host isn't literally `localhost`, an `https` page will silently
block a plain `ws://` connection via mixed-content policy, which looks like
the exact same failure for a different reason.

What the code *does* now do: `lib/config.ts` centralizes `API_BASE`/`WS_URL`
(previously duplicated across three files) and exports
`isLocalhostMisconfigured()`, which detects this specific shape of
misconfiguration (real deployed origin, but still configured to reach
`localhost`). `tasksSlice`'s `fetchTasks.rejected` handler and the header's
connection-status tooltip both use it to show what's actually wrong instead
of the browser's generic, identical-looking "Failed to fetch" /
"Reconnecting" for every possible failure cause.

## AI use and verification

This project (app code, mock-server pass-through, tests, and this document)
was produced with AI assistance in an environment without network access to
install packages or run `next build` / `next dev` / a browser. Static
type-checking was done by hand-running `tsc --noEmit` with the project's
actual `tsconfig.json` flags (including `noUncheckedIndexedAccess`) and its
`@/*` path alias via a throwaway project config, rather than trusting a
looser set of ad-hoc CLI flags -- an earlier, looser check missed real
issues that only surfaced later on Vercel's build (see below). The mock
server was verified unchanged from the brief via `node -c` (syntax only) and
a manual diff against the brief's listing.

Real bugs this process found and fixed, post-hoc:

- Two `noUncheckedIndexedAccess` type errors that only failed on Vercel's
  real build, not the project's own looser local checks: a `Record<string,
  T>` lookup where even the literal fallback key was typed as possibly
  `undefined`, and a `Record<TaskStatus, T>` lookup where TypeScript treats
  the built-in `Record<K, V>` utility as having an implicit index signature
  regardless of `K` being a finite union -- fixed by replacing it with a
  hand-written `interface` with explicit keys, which has no such signature.
- A `selectTasksMeta` selector that was a plain function returning a fresh
  `{ ...spread }` object on every call -- a new reference every render even
  when nothing in it changed, exactly what react-redux's "selector returned
  a different result" warning flags. Fixed with a proper `createSelector`.
- A Next.js/Babel conflict: a root-level `babel.config.js` (needed for Jest)
  made Next.js disable SWC app-wide, and `next/font` requires SWC. Fixed by
  renaming it to `babel.config.jest.js` (outside Next's auto-detected
  filenames) and pointing `jest.config.js`'s `babel-jest` transform at it
  explicitly.

Full runtime verification (`npm install && npm run dev`, `npm test`,
exercising the WebSocket reconnect and SSE cancel-mid-stream paths in a real
browser) has **not** been performed in this environment. Treat the real-time
hooks and the sanitizer output in particular as needing a live smoke test.

## Bug hunt (Part 2) -- root causes

See `buggy/TaskTicker.tsx` for the fixed component; each fix is inline with a
comment. Root causes:

1. **Stale-closure tick (bug A).** `setTick(tick + 1)` inside `setInterval`
   captured the `tick` value from the render when the effect first ran (and
   never re-ran, since the effect's dependency array is `[]`), so every tick
   computed the same `0 + 1` rather than incrementing. Fixed by using the
   functional updater form `setTick((t) => t + 1)`, which always reads the
   latest state instead of a captured variable.
2. **Fetching `/api/tasks/null` and direct state mutation (bug B).** The
   detail-fetch effect ran on mount before any task was selected (no
   null-guard on `selectedId`), and on success it called `prev.push(t)` and
   returned the *same* mutated array reference to `setState` -- this both
   violates React's "don't mutate state" rule and can make React bail out of
   re-rendering (identical reference) or, when it does re-render, show
   duplicate rows for a re-selected task. Fixed with an early `return` when
   `selectedId` is `null`, and by building a new array (`filter` out any
   existing row with that id, then spread in the fresh one) instead of
   mutating in place.
3. **No cancellation of in-flight detail fetches (also bug B).** Rapidly
   selecting different tasks could let an older, slower response resolve
   after a newer one and stomp on it, since nothing tracked whether the
   effect that started the fetch was still the "current" one. Fixed with a
   `cancelled` flag set in the effect's cleanup function, checked before
   applying the response.
4. **Mutating `.sort()` on state during render (bug C).** `tasks.sort(...)`
   sorts the array in place and returns the same reference; calling it
   directly on the `tasks` state array *during render* mutates state outside
   of `setState`, which can produce inconsistent results across renders
   (each render potentially re-mutating an array a previous render already
   reordered, and confusing anything that held a reference to the old
   array). Fixed by sorting a shallow copy (`[...tasks].sort(...)`).
5. **`key={i}` on a re-orderable list (bug D).** Using the array index as the
   React key means an item's key changes whenever the list is resorted (a
   task at index 2 today might be at index 0 tomorrow), which breaks React's
   reconciliation -- it can reuse the wrong DOM node/state for what looks
   like "the same" list position but is actually a different task. Fixed by
   keying on the stable `t.id`.

That's five distinct, independently-fixable bugs (the brief asked for at
least four); (2) and (3) both live in the same effect but are separate root
causes (mutation vs. race condition), so they're called out individually
above even though the fix touches the same block of code.
