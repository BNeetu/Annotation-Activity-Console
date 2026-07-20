# Annotation Activity Console

A frontend take-home: an internal console for annotator tasks, backed by a
mock REST + WebSocket + SSE server. See `DECISIONS.md` for the reasoning
writeup (start there for the interview).

## Stack

Next.js (App Router) + React 18 + TypeScript (strict) + Redux Toolkit +
Tailwind + Jest/React Testing Library, per the brief's required stack.

## Running it

You need two terminals: one for the mock server, one for the app.

**1. Mock server** (REST on `:4000`, WS on `:4000/ws`, requires Node 18+):

```bash
cd mock-server
npm install
npm run mock
```

**2. App** (in the project root, a separate terminal):

```bash
cp .env.local.example .env.local   # points the app at http://localhost:4000
npm install
npm run dev
```

Open http://localhost:3000. The app talks to the mock server directly from
the browser (REST fetch, WebSocket, and EventSource), not through a Next.js
API route, so the mock server must be running first.

## Tests

```bash
npm test
```

Covers the normalizer (`src/lib/__tests__/normalize.test.ts`), the
filtered/sorted-tasks selector (`src/store/__tests__/selectors.test.ts`), and
an RTL interaction test showing that changing a filter updates the visible
rows (`src/components/__tests__/TaskList.test.tsx`).

## Tuning the mock server

The mock server's artificial per-page delay matches the brief's spec exactly
by default (200ms normally, 1200ms on every 3rd page, "to test your loading
states"), since the brief asks not to change its behavior. Both are
overridable via env vars for your own local use, but default to the spec
values with nothing set:

```bash
MOCK_FAST_DELAY_MS=200 MOCK_SLOW_DELAY_MS=1200 npm run mock   # spec defaults, shown explicitly
```

## Deploying

This repo is two separate things: a Next.js frontend and a small
Express/WebSocket **mock** server. Vercel is a great fit for the frontend,
but it doesn't run long-lived Node processes with raw WebSocket servers --
so the mock server needs a different, always-on host, and the deployed
frontend needs to be pointed at it via env vars. Deploying only the frontend
still works (it'll build and load fine), but the task list will show
"Connection failed" and there'll be no live feed, since it'll try to reach
`localhost:4000`, which only exists on your own machine (see `DECISIONS.md`'s
"Deployment note" section for exactly why this fails in a way that can look
like it's working on one computer and not another).

**1. Host the mock server somewhere that stays running** -- e.g. Render,
Railway, or Fly.io all have a free tier that works for this. Point the
service at the `mock-server/` folder specifically (it has its own
`package.json`, separate from the Next.js app), with:
- Build command: `npm install`
- Start command: `npm run mock`

The server already reads `process.env.PORT` (falls back to 4000 for local
dev), which is what these platforms require. Once deployed, note the public
URL -- it'll look like `https://your-mock-server.onrender.com`.

**2. Deploy the frontend to Vercel**, and before or after the first deploy,
set these in **Project Settings → Environment Variables**:
- `NEXT_PUBLIC_API_BASE` = `https://your-mock-server.onrender.com`
- `NEXT_PUBLIC_WS_URL` = `wss://your-mock-server.onrender.com/ws` --
  **`wss://`, not `ws://`**: once the host isn't literally `localhost`, an
  `https` page will silently block a plain `ws://` connection.

Redeploy after setting env vars -- they don't trigger a redeploy on their own.

## Project layout

```
mock-server/            unmodified mock REST/WS/SSE server from the brief
buggy/TaskTicker.tsx     fixed version of the Part 2 bug-hunt component
src/
  lib/
    types.ts             raw + normalized domain types, event types
    normalize.ts          raw -> normalized task mapping
    taskCache.ts           IndexedDB (localforage) list cache
    sanitizeSchema.ts       allowlist schema for the streamed summary
    config.ts                API_BASE/WS_URL + deployment-misconfiguration check
  store/
    tasksSlice.ts          entity-adapter task state, fetch thunk, live-event reducers
    uiSlice.ts               filters/sort/search/selection
    selectors.ts              memoized derived views
    store.ts / hooks.ts        store setup + typed hooks
  hooks/
    useTaskFeed.ts            WebSocket subscription + reconnect
    useSummaryStream.ts         SSE summary consumption, cancel-on-switch
  components/               Header, task list/filters/detail panel, status
                             summary, streamed markdown renderer
  app/                        Next.js App Router shell (single page)
DECISIONS.md               the writeup -- read this
```

This is a single-screen console: one route (`/`), no sidebar or secondary
pages. See `DECISIONS.md`'s "Scope discipline" section for what was
deliberately left out and why.

## What to know before reviewing

This was built in an offline environment (no package registry access), so
`npm install` / `npm run dev` / `npm test` have not actually been executed
end-to-end here. Static type-checking was done against the project's actual
`tsconfig.json` settings, and the mock server was syntax-checked with
`node -c`, but a real browser smoke test (WebSocket reconnect, SSE
mid-stream cancellation, the sanitizer's actual DOM output) still needs to
happen on first run. Full details, including the handful of real bugs this
process did catch, are in `DECISIONS.md`'s "AI use and verification" section.
