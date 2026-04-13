---
id: 053
title: "Next.js app — war room view + SSE live feed"
status: draft
context_status: pending
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started:
completed:
verdict:
score: 0.0
worktree:
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
