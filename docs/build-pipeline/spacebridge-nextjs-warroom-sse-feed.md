---
id: 053
title: "Next.js app — war room view + SSE live feed"
status: explore
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-13T18:00:00+08:00
completed:
verdict:
score: 1.0
worktree: .worktrees/spacedock-ensign-spacebridge-nextjs-warroom-sse-feed
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [052]
---

## Directive

> Build the Next.js App Router application for the spacebridge war room view with SSE live feed. This is the primary web UI surface replacing the current vanilla JS dashboard (`tools/dashboard/static/*`). The war room shows entity cards from all connected repos, their pipeline stage, owner session badge, and a real-time activity feed via SSE. The daemon spawns this as a child process (entity 052 A-5: Next.js standalone is NOT importable). Evaluate shadcn/UI + Tailwind + Radix as the component library. Design doc §3.4 covers SSE rationale, §4.4 covers file watcher debouncing.

## Captain Context Snapshot

- **Repo**: main @ 19af8f8
- **Session**: SO pipeline for spacebridge entities. 056 (lease manager) context ready. 053 is second in order.
- **Domain**: User-facing Visual, Behavioral/Callable, Organizational/Data-transforming
- **Scope flag**: ⚠️ likely-decomposable (3 domains, multiple subsystems: Next.js setup, SSE endpoint, entity card UI, live feed, daemon integration -- but these form one cohesive "view + data feed" unit)
- **Related entities**: 052 -- L2 daemon lifecycle (shipped, archived -- A-5: Next.js is child process, Q-1: hybrid composition), 049 -- Next.js + Bun + fmodel spike (shipped -- SSE proven, standalone confirmed), 050 -- Plugin skeleton + Drizzle schema (shipped -- events table, entity_leases table available for reads), 054 -- Entity detail page + comments API (draft, depends on 053), 056 -- Role-aware lease manager (context ready -- lease owner badge data)
- **Created**: 2026-04-13T17:30:00+08:00

## Brainstorming Spec

**APPROACH**: Create a Next.js App Router application at `spacebridge/app/` (or `spacebridge/ui/`) using React 19, shadcn/UI + Tailwind CSS v4 + Radix primitives as the component library (captain directive) (✓ research: shadcn CLI v4 supports Bun via `bunx shadcn@latest init` -- no `--bun` flag; Tailwind v4 default; Radix pure React, no Bun compat issues; non-interactive shadcn components work in Server Components). The app has two main surfaces: (1) **War room page** (`/`) — a Server Component that fetches entity data from the spacebridge Drizzle DB on initial render, displaying entity cards grouped by connected repo. Each card shows slug, title, status, current stage, and an owner session badge (from entity 056's lease data). (2) **Live feed panel** — a Client Component that connects to an SSE endpoint (`/api/events`) via `EventSource`, rendering new events (stage transitions, comments, file changes) as they arrive. The SSE endpoint is a Next.js Route Handler using streaming `Response` with `ReadableStream` (proven by entity 049 V2 spike). The daemon (`bin/daemon.ts`) spawns the Next.js standalone server as a child process on port 8420 (entity 052 A-5 decision), managing its lifecycle (spawn on daemon start, SIGTERM on daemon stop). Entity data comes from two sources: (a) Drizzle DB tables (`events`, `entity_leases`, `sessions`) for persistent state, (b) entity markdown files parsed from connected sessions' `project_root` paths for entity content/frontmatter. File watcher events from the daemon are debounced per design doc §4.4 before being pushed to the SSE stream. The app is built with `next build --output standalone` and the standalone directory is the deployable artifact (entity 049 ruling).

**ALTERNATIVE**: Use the existing vanilla JS IIFE dashboard architecture (`tools/dashboard/static/*`) extended with new features, served directly by Bun.serve() instead of Next.js. -- D-01 Rejected: the vanilla JS dashboard has no component model, no type safety, no SSR, and uses inline CSS that doesn't scale. Entity 049 spike confirmed Next.js + Bun works. The captain's directive explicitly calls for shadcn/UI + Tailwind + Radix evaluation, which requires React. The design doc §3 explicitly says "Next.js App Router" for the bridge UI. Maintaining two UI stacks (old vanilla + new Next.js) creates migration debt.

**GUARDRAILS**:
- SSE, not WebSocket, for realtime transport -- passes through tunnels (cloudflared, ngrok, tailscale), natively supported by Next.js Route Handlers (design doc §3.4)
- Next.js standalone output (`output: 'standalone'`) is the build artifact -- daemon spawns it as child process, NOT imported (entity 052 A-5)
- Port 8420 (ADR-001, entity 045 shipped) -- the Next.js app must listen on this port
- Drizzle DB access is read-only from the Next.js app -- writes go through daemon's unix socket coordination layer (entity 056). The Next.js app reads the same SQLite DB file for Server Component rendering
- No fmodel domain logic in the UI -- the war room reads projections (snapshot tables), not event logs. fmodel aggregates live in the daemon process
- Debounced file watcher events per design doc §4.4 -- the daemon debounces before pushing to SSE, not the client
- Entity markdown parsing must handle missing/malformed frontmatter gracefully (real-world entity files have varying completeness)

**RATIONALE**: Next.js App Router is the design doc's chosen UI framework for spacebridge. The 049 spike validated the full stack (Next.js 16 + Bun + SSE + fmodel). Server Components enable fast initial page load (entity list rendered server-side from DB), while Client Components handle the SSE live feed. shadcn/UI + Tailwind provides a production-quality component library with accessible primitives (Radix) and consistent styling -- the standard stack for new Next.js App Router projects. The child process architecture (from 052) cleanly separates concerns: daemon owns coordination/persistence, Next.js owns rendering/SSE streaming. SQLite's WAL mode (already enabled in db.ts) allows concurrent reads from the Next.js process while the daemon writes.

## Acceptance Criteria

- [ ] Given the daemon is running, when a browser navigates to `http://127.0.0.1:8420/`, then the war room page renders with entity cards from all connected repos (how to verify: start daemon + connect shim, open browser, assert cards visible)
- [ ] Given entity cards are rendered, when an entity has an active lease, then its card shows the owner session badge with role (SO/FO/QO) (how to verify: acquire lease via entity 056 API, reload page, assert badge visible)
- [ ] Given the SSE endpoint at `/api/events`, when a client connects via EventSource, then it receives a stream of events as they occur (how to verify: `curl -N http://127.0.0.1:8420/api/events` shows streaming event data)
- [ ] Given the live feed is connected, when a new stage transition event occurs, then it appears in the feed within 1 second (how to verify: trigger stage transition, observe feed update timing)
- [ ] Given a browser tab on the war room, when the page is refreshed (F5), then the full state loads correctly from Server Component (no stale state, no hydration mismatch) (how to verify: refresh page, assert entity cards match current DB state)
- [ ] Given 3 browser tabs connected to SSE simultaneously, when an event occurs, then all 3 receive it (how to verify: open 3 tabs, trigger event, assert all feeds updated)
- [ ] Given the daemon has no connected sessions, when the war room loads, then it shows an empty state with guidance (how to verify: start daemon with no shims, open browser, assert empty state rendered)
- [ ] Given the Next.js app is built with `next build`, when `bun run .next/standalone/server.js` is executed, then the standalone server starts and serves the war room correctly (how to verify: build, run standalone, assert page renders)

## Research Findings

### shadcn/UI + Tailwind v4 + Radix on Bun + Next.js App Router

**Confirmed working**: `bunx shadcn@latest init` (without `--bun` flag) on Bun 1.3.x + Next.js 16 + React 19. shadcn CLI v4 (March 2026) defaults to Tailwind v4 with `tw-animate-css`. Radix primitives are pure React -- no Bun Node.js compat layer issues.

**Key gotchas for 053 implementation**:
- G1: Use `bunx shadcn@latest init`, NOT `bunx --bun shadcn@latest init` (the `--bun` flag causes failures)
- G3: Tailwind v4 requires class names as visible string literals at build time -- no dynamic `className={\`text-${color}-500\`}`. All variants must be complete class strings
- G5: `tw-animate-css` may need explicit install (`bun add tw-animate-css`) if missing after init
- G7: Client Components cannot import Server Components -- pass server data as props/children, not via direct import

**Tailwind v4 architecture change**: drops `tailwind.config.js` entirely. Configuration via CSS `@theme` + `@import` directives. PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`). Greenfield project = no migration concern.

**Server/Client Component pattern for shadcn**:
- Non-interactive components (Card, Badge, Separator): usable directly in Server Components
- Interactive components (Dialog, Sheet, Tabs): have `"use client"`, use as leaf Client Components with server data passed as props
- Entity list initial render: Server Component fetches from Drizzle, passes to Client Component for interactivity

## References

- Design doc §3.4 (Events over SSE): rationale for SSE over WebSocket, tunnel compatibility
- Design doc §4.4 (File watcher): debouncing strategy for file change events
- Entity 049 (shipped): Next.js + Bun + SSE + fmodel spike -- V2 confirmed SSE Route Handler works, V5 confirmed standalone serves correctly
- Entity 052 (shipped): A-5 -- Next.js standalone is NOT importable, daemon spawns as child process. Q-1 -- direct import + child process hybrid composition
- Entity 050 (shipped): Drizzle schema with events, entity_leases, sessions tables -- read-only data source for UI
- Entity 056 (context ready): lease manager provides owner session badge data via entity_leases table
- Captain note (2026-04-13): evaluate shadcn/UI + Tailwind + Radix as component library

## Assumptions

A-1: SQLite WAL mode allows concurrent reads from the Next.js process while the daemon writes -- no DB locking conflicts.
Confidence: 🟢 Confident (0.95)
Evidence: spacebridge/src/db.ts:23 -- `sqlite.exec("PRAGMA journal_mode = WAL")` already enabled for file DBs. SQLite WAL specification: multiple concurrent readers + one writer is the designed use case.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: `next build --output standalone` produces deployable artifact; daemon spawns `bun run .next/standalone/server.js` as child process.
Confidence: 🟢 Confident (0.95)
Evidence: entity 049 V4-V5 -- build produced `.next/standalone/server.js`, `bun run ./server.js` served correctly. Entity 052 A-5 -- confirmed NOT importable, child process is the only option.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: shadcn init via `bunx shadcn@latest init` (no `--bun` flag), Tailwind v4 default, `tw-animate-css` for animations.
Confidence: 🟢 Confident (0.90)
Evidence: (✓ research: shadcn CLI v4 docs confirm Bun first-class support; G1 gotcha documented and avoidable)
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Non-interactive shadcn components (Card, Badge, Separator) usable in Server Components; interactive ones (Dialog, Tabs, Sheet) require `"use client"`.
Confidence: 🟢 Confident (0.90)
Evidence: (✓ research: shadcn generates `"use client"` only on hook-using components; Next.js RSC boundary rules apply)
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Entity card data (slug, title, status, stage) comes from entity markdown frontmatter -- same parsing logic as `tools/dashboard/src/frontmatter-io.ts`.
Confidence: 🟢 Confident (0.85)
Evidence: tools/dashboard/src/frontmatter-io.ts -- existing YAML frontmatter parser handles all entity fields. Can be extracted or re-implemented in the Next.js app.
→ Confirmed: captain, 2026-04-13 (batch)

A-6: Post-build step required: copy `.next/static/` into `.next/standalone/.next/static/` and `public/` into `.next/standalone/public/` (Next.js standalone doesn't auto-copy these).
Confidence: Confident (0.95)
Evidence: entity 049 Results section -- explicitly documented this post-build step. Standard Next.js standalone deployment requirement.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Next.js app directory layout

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| `spacebridge/ui/` as separate subproject with own package.json | Clean separation: daemon src/ and UI ui/ are siblings; independent dependency trees; no accidental import of daemon code from UI | Two package.json files to manage; need to configure daemon to find ui/.next/standalone/ path; slight workspace overhead | Medium | Recommended |
| Next.js at spacebridge/ root (add next/react to root package.json) | Single package.json; simpler imports; `next build` runs from project root | Mixes daemon deps (drizzle, node:net) with UI deps (next, react, shadcn); `next build` might try to bundle daemon code; harder to reason about what runs where | Medium | Not recommended |
| `spacebridge/web/` (same as ui/ but different name) | Same pros as ui/ | Same cons; `web/` is less conventional than `ui/` for Next.js projects | Medium | Viable |

Return value trace: daemon.ts `spawn()` needs the path to `server.js`. With `ui/`, the path is `${pluginRoot}/ui/.next/standalone/server.js`. With root, it's `${pluginRoot}/.next/standalone/server.js`. Both work; `ui/` is cleaner for separation of concerns.

→ Selected: `spacebridge/ui/` as separate subproject -- captain, 2026-04-13

### O-2: SSE data flow -- how the Next.js SSE endpoint gets real-time events

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Poll events table (500ms interval) | Simplest; no IPC between daemon and Next.js; SQLite WAL handles concurrent reads; latency ≤ 500ms + render | Polling wastes queries when no events; 500ms latency floor; scales poorly if many SSE clients each poll independently | Low | Recommended |
| Daemon HTTP push to Next.js private endpoint | Sub-100ms latency; push-based = zero wasted queries; daemon is the single event source | Adds HTTP client in daemon + route in Next.js; daemon must know Next.js URL; coupling between processes increases | Medium | Viable |
| Shared SQLite NOTIFY/trigger mechanism | Event-driven; no polling | SQLite has no built-in NOTIFY; would need a file-watch on the WAL or custom trigger; fragile and non-portable | High | Not recommended |

Design doc invariant check: §3.4 says "SSE is one-way server→client". The internal daemon→Next.js data flow is orthogonal. Poll is simplest for v1; push can be added later without changing the SSE client contract. Return value trace: SSE endpoint reads events table → streams to EventSource → client renders. No downstream consumer depends on push latency being <500ms for v1.

→ Selected: Poll events table (500ms interval) -- captain, 2026-04-13

### O-3: Entity data source for Server Component rendering

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Filesystem parse at request time (read entity markdown from project_root paths via sessions table) | Always fresh; no sync lag; matches existing frontmatter-io.ts pattern | I/O per request (filesystem reads); entity files may be on different volumes; sessions table needed for project_root lookup; parsing cost per entity | Medium | Recommended |
| Daemon pre-parses entities into DB projection table | Fast DB reads; no filesystem I/O at request time; consistent data shape | New table + sync logic; staleness risk if file changes before watcher updates DB; entity 057 (session registry) may own this later | Medium | Viable |
| Hybrid: DB for stage/status (from events table), filesystem for title/content | Fast for card rendering (DB); fresh for detail view (filesystem) | Two data paths; inconsistency risk between DB stage and filesystem frontmatter | Medium | Viable |

Design doc invariant check: entity 057 (session registry) will eventually provide a cached entity projection. For v1, filesystem parse is the simplest approach that guarantees freshness. When 057 ships, the data source can switch to DB. Dependency inversion (inject entity scanner, same as A-7 in entity 056) makes this swap clean.

→ Selected: Filesystem parse at request time -- captain, 2026-04-13

## Open Questions

Q-1: Does entity 053 include the daemon-side file watcher implementation, or is that a separate entity?

Domain: Runnable/Invokable, Behavioral/Callable

Why it matters: The APPROACH says "file watcher events from the daemon are debounced per design doc §4.4". But daemon.ts (entity 052) shipped without a file watcher -- it only has session management and coordination stub. Including the watcher in 053 means 053 owns both UI and daemon-side event generation. Excluding it means the SSE feed only shows events that are explicitly written to the events table by other subsystems (stage transitions from FO, comments from 054), not file changes.

Suggested options: (a) Include file watcher in 053 -- daemon watches entity files, writes change events to events table, SSE streams them. Complete real-time experience. (b) Exclude file watcher -- 053 only consumes existing events table data. File watcher becomes a separate entity. Simpler 053 scope but live feed is limited to explicit events. (c) Minimal watcher -- daemon polls entity frontmatter for stage changes on a 5s interval (simpler than fs.watch), writes to events table. Not true file-watching but covers the primary use case.

→ Answer: (b) Exclude -- entity 057 (Multi-root session registry + file watcher) already owns the file watcher scope. 053 consumes events table data written by FO (stage transitions), 057 (file changes), and 054 (comments). -- captain, 2026-04-13

Q-2: Which shadcn components should be included in v1? This scopes the component library integration and affects the UI Spec.

Domain: User-facing Visual

Why it matters: shadcn is "copy-paste" -- you add individual components, not the whole library. Adding too many upfront creates unused code; too few means building custom components that shadcn already provides. The v1 set determines the visual language for entity 054 and beyond.

Suggested options: (a) Minimal: Card, Badge, Separator, Skeleton (loading states) -- just enough for entity cards + feed, (b) Standard: add Tabs, ScrollArea, Tooltip, DropdownMenu -- enables richer war room interactions, (c) Comprehensive: add Sheet, Dialog, Command, Table -- prepares for entity 054's detail view, (d) Captain decides based on war room wireframe

→ Answer: (b) Standard -- Card, Badge, Separator, Skeleton, Tabs, ScrollArea, Tooltip, Button. Richer war room interactions without over-provisioning for 054. -- captain, 2026-04-13

Q-3: What grouping/layout should the war room use for entity cards across multiple repos?

Domain: User-facing Visual

Why it matters: Multi-repo awareness is a core feature. The grouping strategy affects information density, navigation, and how users mentally map entities to repos. This decision feeds directly into the UI Spec.

Suggested options: (a) Group by repo with collapsible sections -- clear hierarchy, scalable, (b) Flat grid with repo badge on each card -- simpler, good for few repos, (c) Kanban columns by pipeline stage with repo color coding -- stage-centric view, (d) Tabs per repo -- clean separation but loses cross-repo overview

→ Answer: (a) Group by repo with collapsible sections. Tabs component for "All" + per-repo filtering. Clear hierarchy, scalable to many repos. -- captain, 2026-04-13

## UI Spec

### Design System
- **Component library**: shadcn/UI (copy-paste model) + Tailwind CSS v4 + Radix primitives
- **Init command**: `bunx shadcn@latest init` (NOT `--bun` flag)
- **CSS config**: Tailwind v4 via `@import "tailwindcss"` + `@theme inline {}` in `globals.css` (no `tailwind.config.js`)
- **Animations**: `tw-animate-css` package

### v1 Component Set
Card, Badge, Separator, Skeleton, Tabs, ScrollArea, Tooltip, Button

### Component Hierarchy
```
app/layout.tsx (Server Component -- root layout, theme, fonts)
└── app/page.tsx (Server Component -- fetch entities from filesystem + leases from DB)
    ├── <Tabs> (Client Component -- "All" + per-repo tabs)
    │   └── <RepoSection> (Server Component -- collapsible repo group)
    │       └── <EntityCard> (Server Component -- Card + Badge + Tooltip)
    │           ├── slug, title, status badge
    │           ├── current stage badge
    │           └── owner session badge (from entity_leases, if leased)
    └── <LiveFeed> (Client Component -- "use client", EventSource SSE consumer)
        ├── <ScrollArea> (wraps feed entries)
        └── <FeedEntry> (event type icon + entity slug + timestamp + detail)

app/api/events/route.ts (Route Handler -- SSE endpoint, polls events table 500ms)
```

### Layout Pattern
- **Desktop**: Two-column layout. Left: entity cards (grouped by repo via Tabs). Right: live feed (ScrollArea, newest on top).
- **Mobile (v1)**: Single column, live feed below cards. No special mobile treatment in v1.

### Key Interactions
- Tab switching filters cards by repo ("All" shows all repos)
- Repo sections are collapsible (default: expanded)
- Entity card click → navigates to entity detail page (entity 054, link only in v1)
- Live feed auto-scrolls to newest event (top, since newest-first rendering)
- Skeleton loaders during Server Component data fetch

### Empty / Loading / Error States
- **No sessions**: Full-page empty state with guidance ("No Claude Code sessions connected. Start a session with spacebridge installed to see entities here.")
- **Loading**: Skeleton cards (Skeleton component) while Server Component fetches
- **SSE disconnect**: Feed shows "Reconnecting..." banner, EventSource auto-reconnects

### Accessibility
- Radix primitives provide keyboard navigation + ARIA by default
- Badge colors use semantic tokens (not raw hex) for contrast compliance
- Tab panels use proper `role="tabpanel"` via shadcn Tabs component

## Stage Report: explore

- [x] Files mapped: 14 across ui(new), daemon, schema, ipc
  ui: 0 existing + ~10 new files (layout, page, SSE route, components, styles, config); daemon: 1 modify (bin/daemon.ts child spawn); schema: 2 read-only (schema.ts, db.ts); ipc: 1 read (types.ts for event shape)
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 through A-6 all Confident (0.85-0.95); WAL, standalone, shadcn, RSC boundaries, frontmatter parsing, post-build copy
- [x] Options surfaced: 3
  O-1 app directory layout; O-2 SSE data flow; O-3 entity data source
- [x] Questions generated: 3
  Q-1 file watcher scope; Q-2 shadcn component set for v1; Q-3 entity card grouping layout
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Medium
  ~14 files across 4 layers; cohesive "view + data feed" unit despite 3-domain scope; decomposition not recommended
- [x] Research dispatched: 1 researcher for 1 topic (post-brainstorm Step 3.5)
  shadcn/UI + Tailwind v4 + Bun: confirmed working, 7 gotchas documented, Tailwind v4 CSS-only config verified

## Stage Report: clarify

- [x] Assumptions confirmed: 6 / 6
  All batch-confirmed by captain, 2026-04-13. Zero reclassified.
- [x] Options selected: 3 / 3
  O-1: spacebridge/ui/ separate subproject. O-2: Poll events table 500ms. O-3: Filesystem parse at request time.
- [x] Questions answered: 3 / 3
  Q-1: Exclude file watcher (entity 057 owns it). Q-2: Standard shadcn set (Card, Badge, Separator, Skeleton, Tabs, ScrollArea, Tooltip, Button). Q-3: Group by repo with collapsible sections + Tabs.
- [x] UI Spec produced: yes
  Component hierarchy, layout pattern (2-column desktop), v1 component set, empty/loading/error states, accessibility notes.
- [x] Sufficiency gate: PASS
  All assumptions confirmed, all options selected, all questions answered, UI Spec produced, zero unresolved items.
