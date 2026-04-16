---
id: 120
title: "Spacebridge Session List UI -- Connected Sessions + Repo Visibility"
status: brainstorm
context_status: pending
source: entity 060 shape + captain directive (2026-04-16 "要可以看到連上去的 session 是誰，repo 有哪些")
created: 2026-04-16T20:03:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
parent: 060
children:
depends-on: [057]
---

## Directive

Add a "Connected Sessions" page or panel to Spacebridge's Next.js UI that surfaces the session registry data from entity 057's shipped domain layer (`spacebridge/src/domain/session/`). Captain must be able to see: which CC sessions are connected, which repo (projectRoot) each session owns, liveness status (last heartbeat), and a session picker to switch which repo's entities are displayed. Currently the UI hard-codes the first session's projectRoot (`entity/[slug]/page.tsx:59-66`); this entity replaces that with an explicit session-aware routing model.

## Captain Context Snapshot

- **Repo**: main @ 6a1e638
- **Session**: Entity seeded from 060 shape (US-1, US-4) on 2026-04-16; brainstorm follows directly after 117 clarify
- **Domain**: User-facing Visual, Behavioral / Callable
- **Related entities**: 060 -- Spacebridge Cutover Epic (parent); 057 -- multi-root-session-registry (shipped, dependency); 053 -- nextjs-warroom-sse-feed (shipped, war-room.tsx owner); 117 -- design-system (clarify ready, sibling -- shared header + tokens)
- **Created**: 2026-04-16T20:03:00+08:00

## Goal Check

You are asking for a UI that shows captain which Claude Code sessions are connected, what repo each owns, whether they are alive, and lets captain switch which repo's entities appear in the war room.

- **Problem being solved**: Captain has multiple CC sessions connecting to spacebridge but no way to see them. The entity detail page silently picks the first session's projectRoot via `.limit(1)`, which is a coin flip when multiple sessions are connected.
- **Expected outcome**: A session list/picker UI surfaces all connected sessions with projectRoot + liveness; entity detail page routes via explicit session choice instead of hardcoded first row; captain can switch which repo's entities the war room shows.
- **Explicit non-goals**: Daemon-side session lifecycle changes (057 owns this). Cross-session entity merging or multi-repo unified views. Session authentication or permissions. (✓ resolved by explore: parent 060 Scope: Out — share view auth is 111's scope, not 120's)

## Lens Evidence

### Lens (a) captain-stated-intent

- Captain verbatim: "要可以看到連上去的 session 是誰，repo 有哪些" -- need to see which sessions are connected and which repos exist -- directive:verbatim [primary]
- Entity 057 is hard dependency (frontmatter `depends-on: [057]`) -- entity:120 [primary]
- Registry is daemon-internal only (registry.ts:4 comment); UI cannot import directly -- API route or HTTP bridge required -- spacebridge/src/domain/session/registry.ts:4 [primary]
- Scale classified Small (frontmatter) -- entity:120 [secondary]

### Lens (b) captain-unstated-intent

- The hardcoded `.limit(1)` at entity/[slug]/page.tsx:59-66 is the concrete UX failure being targeted, not a general "show session info" request (inferred) -- spacebridge/ui/app/entity/[slug]/page.tsx:59 [primary]
- The home page (app/page.tsx:49-57) already handles multi-session correctly via dedup-by-projectRoot pattern -- session picker should reuse this exact shape (inferred) -- spacebridge/ui/app/page.tsx:16-57 [primary]
- Captain expects 117's design tokens to be consumed -- new components should not introduce ad-hoc styles (inferred from 117 clarify) -- entity:117 [secondary]
- Persistence of "active session" selection (cookie / URL query / localStorage) is unspecified -- captain decision needed (inferred) -- entity:120 directive [secondary]
- Liveness badge threshold (e.g., "stale after 60s") is unspecified -- daemon's `timeoutMs` is not exposed to UI (inferred) -- spacebridge/src/domain/session/heartbeat-monitor.ts:27 [tertiary]

### Lens (c) codebase-current-state

- SessionRegistry exposes getState() / getActiveProjectRoots() / getActiveSessionByProjectRoot() / discoverActiveWorkflows() but is daemon-internal -- spacebridge/src/domain/session/registry.ts:21,148-182 [primary]
- SessionRecord has all fields needed for UI: sessionId, projectRoot, pid, connectedAt, lastHeartbeat -- no schema changes required -- spacebridge/src/domain/session/types.ts:7-13 [primary]
- UI reads `sessions` snapshot table directly via openReadOnlyDb() in Server Components -- no IPC needed for read path -- spacebridge/ui/app/page.tsx:17-20 [primary]
- Entity detail page hardcodes `.limit(1)` and takes sessionRows[0].projectRoot as single root -- coin flip when multiple sessions connected -- spacebridge/ui/app/entity/[slug]/page.tsx:59-66 [primary]
- No `/api/sessions` route exists; only entity comments, events SSE, gate, chat, share, auto-resolve are exposed -- spacebridge/ui/app/api/ [primary]
- Events table has NO projectRoot column -- events are unscoped to a root (potential bug surfaced by Lens c, out of 120 scope) -- spacebridge/ui/app/page.tsx:73-83 [secondary]

### Lens (d) sibling-entity

- Entity 053 (shipped) owns war-room.tsx Tabs architecture -- session picker can integrate as a new tab or extend the existing Tabs structure -- entity:053 [primary]
- Entity 057 (shipped) owns spacebridge/src/domain/session/* -- 120 must NOT modify domain layer, only consume via UI -- entity:057 [primary]
- Entity 117 (clarify ready) ships shared header + ThemeToggle + design tokens -- 120 should consume these. Recommendation: declare `depends-on: [117]` for execution ordering -- entity:117 [secondary]
- No `/api/sessions/*` contracts exist -- greenfield route. Closest precedent: `/api/entities` response shapes -- entity:053 [secondary]

## Core Tensions

- **(domain-based)**: Registry is daemon-internal but UI needs the data. Two read paths exist: (1) direct DB read of `sessions` snapshot table (zero IPC, what page.tsx already does), (2) new HTTP API route. Tension: which path is canonical going forward?
- **(time-based)**: 117 design system not yet shipped — 120 execute should sequence after 117 to consume tokens cleanly; otherwise 120 ships ad-hoc styles that 117 retroactively tokenizes.
- **(essential)**: Session-picker persistence model (URL query vs cookie vs auto-most-recent-heartbeat) — captain decision required, no codebase precedent.

## Honest Boundaries

- The `events` table has no `projectRoot` column (Lens c finding) — events SSE is unscoped to a session/repo. This is a structural gap that may surface during 120 execute but is out of 120 scope.
- The daemon's heartbeat `timeoutMs` is configured at startup but not exposed to UI — liveness threshold display is a UI-side computation that may drift from daemon's actual timeout.
- Lens b inferred captain wants 117 dependency, but the entity 120 frontmatter does not currently declare `depends-on: [117]` — this should be added during clarify or plan.

## Brainstorming Spec

**APPROACH**: Add a new `/api/sessions/route.ts` route that reads the `sessions` snapshot table via `openReadOnlyDb()` and returns `SessionRecord[]` with computed `liveness` field (alive if `lastHeartbeat` within last 60s). Build a `<SessionList>` Client Component (consumes 117's shared header slot, uses shadcn Card + Badge primitives) showing each session's projectRoot, last heartbeat, and a "switch to this repo" action. Replace the hardcoded `.limit(1)` in `entity/[slug]/page.tsx:59-66` with explicit session-aware routing: read session selection from URL query param (`?session={sessionId}`), fall back to most-recent-heartbeat session per `getActiveSessionByProjectRoot()`. Add a session picker dropdown to the war room (app/page.tsx) using the existing dedup-by-projectRoot pattern (page.tsx:49-57) — picker filters which repo's `RepoData` gets rendered. Reuse home page's existing query pattern; do NOT introduce new IPC or modify the daemon-internal registry.

**ALTERNATIVE**: Add an HTTP IPC bridge from the Next.js UI to the daemon process to call `sessionRegistry.getState()` directly, bypassing the snapshot table. -- D-01 Rejected: the snapshot table IS the persistence layer for the registry (registry.ts calls upsertSnapshot/deleteSnapshot on register/heartbeat). Adding an IPC bridge duplicates the read path and forces an extra process boundary for data already available locally. The home page already proves direct snapshot reads work. Daemon-internal boundary (registry.ts:4 comment) is preserved.

**GUARDRAILS**:
- Do NOT modify `spacebridge/src/domain/session/*` — entity 057 owns that layer (CONTRACTS.md staked)
- Do NOT introduce new IPC mechanisms — the snapshot table read is the canonical path
- Consume entity 117's design tokens (no hardcoded colors); add session picker to 117's shared header rather than duplicating layout
- Server Components pattern preferred (matches page.tsx); only use Client Components for interactive picker dropdown
- Liveness threshold (default 60s) must be a UI constant, documented, and not silently drift from daemon's `timeoutMs`

**RATIONALE**: The snapshot table is already the canonical UI read path (proven by app/page.tsx working today), and the registry methods are intentionally daemon-internal per the codebase comment. Adding an HTTP IPC bridge would solve a problem we don't have. The work decomposes naturally into: one new API route (for client-side picker fetches and live updates), one new Client Component (the picker), one targeted fix in entity/[slug]/page.tsx (replace .limit(1) with session-aware routing), and integration into 117's shared header. This is Small scale because the data layer is already shipped (057), the UI patterns are already in place (053), and the design system foundation lands first (117).

## Acceptance Criteria

- Given multiple CC sessions are connected to the daemon, when captain visits the war room, then a session picker shows all sessions with their projectRoot and last-heartbeat timestamp (how to verify: connect 2 mock sessions, browser devtools inspect picker DOM, assert ≥2 entries with distinct sessionIds)
- Given captain selects a session in the picker, when an entity detail page loads, then the page resolves `projectRoot` from the selected session, NOT from `sessions.limit(1)` (how to verify: `grep -n '.limit(1)' spacebridge/ui/app/entity/[slug]/page.tsx` returns 0 matches; URL query param `?session=` is parsed and used)
- Given a session has no heartbeat for >60 seconds, when the session list re-renders, then a "stale" badge appears next to that session (how to verify: mock `lastHeartbeat` to 61s ago, render component, assert Badge with `variant="destructive"` or equivalent stale indicator)
- Given the `/api/sessions` route is called, when no sessions are connected, then the response is `{ sessions: [] }` with HTTP 200 (how to verify: `curl http://localhost:3000/api/sessions` with daemon stopped returns valid JSON)
