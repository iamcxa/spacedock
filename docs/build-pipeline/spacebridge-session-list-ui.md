---
id: 120
title: "Spacebridge Session List UI -- Connected Sessions + Repo Visibility"
status: clarify
context_status: awaiting-clarify
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

**APPROACH**: Add a new `/api/sessions/route.ts` route that reads the `sessions` snapshot table via `openReadOnlyDb()` and returns `SessionRecord[]` with computed `liveness` field (alive if `lastHeartbeat` within last 60s) (✓ confirmed by explore: openReadOnlyDb pattern proven in app/page.tsx; no /api/sessions exists per Lens c). Build a `<SessionList>` Client Component (consumes 117's shared header slot, uses shadcn Card + Badge primitives) showing each session's projectRoot, last heartbeat, and a "switch to this repo" action (✓ confirmed by explore: shadcn Card + Badge already installed per 117 brainstorm Lens (c)). Replace the hardcoded `.limit(1)` in `entity/[slug]/page.tsx:59-66` with explicit session-aware routing: read session selection from URL query param (`?session={sessionId}`), fall back to most-recent-heartbeat session per `getActiveSessionByProjectRoot()` (✓ confirmed by explore: line range and .limit(1) verified during brainstorm). Add a session picker dropdown to the war room (app/page.tsx) using the existing dedup-by-projectRoot pattern (page.tsx:49-57) — picker filters which repo's `RepoData` gets rendered. Reuse home page's existing query pattern; do NOT introduce new IPC or modify the daemon-internal registry.

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

## Assumptions

A-1: The `sessions` snapshot table read pattern via `openReadOnlyDb()` is the canonical UI read path. New `/api/sessions` route follows the same pattern as `app/page.tsx:17-20` for consistency.
Confidence: Confident (0.95)
Evidence: spacebridge/ui/app/page.tsx:14-22 -- self-verified openReadOnlyDb + drizzle .select().from(sessions).all() pattern in production [primary]; spacebridge/src/domain/session/registry.ts:103 -- registry calls upsertSnapshot on every register/heartbeat (snapshot is authoritative) [primary]; brainstorm Lens (c) confirmed no /api/sessions route exists [primary].
→ Confirmed: captain, 2026-04-16 (batch, post self-verification)

A-2: SessionRecord fields (sessionId, projectRoot, pid, connectedAt, lastHeartbeat) are sufficient for the UI; no schema changes needed.
Confidence: Confident (0.95)
Evidence: spacebridge/src/domain/session/types.ts:7-13 -- self-verified SessionRecord interface { sessionId, projectRoot, pid, connectedAt, lastHeartbeat } [primary]; brainstorm Lens (c) verified all needed fields persisted [primary].
→ Confirmed: captain, 2026-04-16 (batch, post self-verification)

A-3: Entity 117 must ship before 120 executes -- 120 consumes 117's shared header + design tokens. Frontmatter `depends-on` should be updated to `[057, 117]`.
Confidence: Confident (0.90)
Evidence: docs/build-pipeline/spacebridge-design-system.md -- Q-3 captain answer "extract a shared header component used by both war room and entity detail; place ThemeToggle in the shared header" [primary]; 117 GUARDRAIL prevents siblings from shipping ad-hoc styles [primary]; current frontmatter only declares `depends-on: [057]` [primary].
→ Confirmed: captain, 2026-04-16 (batch, post self-verification) -- frontmatter update to depends-on:[057, 117] deferred to plan stage

A-4: `/api/sessions/route.ts` follows the `events/route.ts` pattern: `export const dynamic = "force-dynamic"` + lazy `await import("@/lib/db")` + drizzle `.select().from(sessions).all()` + server-computed `liveness` field added to response. Response shape: `{ sessions: SessionRecord[] }` (no /api/entities list-route exists to copy).
Confidence: Confident (0.90)
Evidence: spacebridge/ui/app/api/events/route.ts:1-15 -- canonical Next.js route pattern with force-dynamic + lazy db import + drizzle .select().all() [primary]; self-verified during clarify Step 2 -- /api/entities is [slug] sub-routes only, no list endpoint exists, brainstorm Lens (d) precedent reference was incorrect [primary].
→ Confirmed: captain, 2026-04-16 (batch, post self-verification) -- A-4 corrected during self-verification: brainstorm Lens (d) had incorrect /api/entities precedent reference; events/route.ts is the actual canonical pattern

A-5: The `events` SSE stream gap (no projectRoot column on events table) is OUT of 120 scope. 120 only changes the entity detail's projectRoot resolution; event filtering remains as-is.
Confidence: Confident (0.95)
Evidence: brainstorm Lens (c) noted "Events table has NO projectRoot column ... potential bug surfaced by Lens c, out of 120 scope" [primary]; Honest Boundary in brainstorm explicitly defers this [primary].
→ Confirmed: captain, 2026-04-16 (batch, post self-verification)

## Option Comparisons

### O-1: Session selection persistence model

How does the captain's "active session" choice persist across page reloads and navigation?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| URL query param `?session={sessionId}` | Stateless, shareable, debuggable. Bookmarkable. Works across tabs independently. | URL clutter. Captain must re-select on every fresh navigation if no default. | Low | ✅ Recommended |
| Cookie / localStorage | Persists across sessions automatically. Cleaner URLs. | Hidden state -- harder to debug. Conflicts across browser tabs (last write wins). | Low | Viable |
| Auto-most-recent-heartbeat (no explicit selection) | No UI needed for selection. Always picks the "freshest" session. | Captain has no control. If multiple sessions tie on heartbeat timing, behavior is non-deterministic. Defeats the purpose of the picker. | None | Not recommended |

Return value trace: URL query param flows through Next.js searchParams in Server Component, deterministic per-request. Cookie requires a Client Component or middleware to read. URL is simpler.

### O-2: Session picker placement

Where should the picker live in the UI?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| In 117's shared header (consistent across war room + entity detail) | Single point of control. Captain always sees current session. Consumes 117's deliverable directly. | Requires 117 ship first. Coupled to 117's header API. | Low | ✅ Recommended |
| In war room only (extend existing Tabs) | Keeps entity detail simple. Reuses 053's Tabs architecture. | Captain on entity detail page can't see/switch session without going back to war room. | Low | Viable |
| Both: war room Tabs + entity detail dropdown | Maximum flexibility. | Duplicate UI surface. Two source-of-truths for the selection. | Medium | Not recommended |

### O-3: Multi-session-per-projectRoot handling

Two CC sessions can connect with the same projectRoot (e.g., captain runs CC twice in same repo). How does the picker render this?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Show each session as distinct row (sessionId visible) | No data hidden. Captain can pick exact session. | UI clutter when most sessions share roots. SessionId is opaque. | Low | Viable |
| Group by projectRoot, expand to show sessions on click | Cleaner default view. Power users can drill down. | More complex Component. Hides info by default. | Medium | Viable |
| Use `getActiveSessionByProjectRoot()` -- show one row per root, picker selects root not session | Matches existing app/page.tsx dedup pattern. Simplest UX. | Loses sessionId visibility. If 2 sessions share root, picker can't distinguish. | Low | ✅ Recommended |

## Open Questions

Q-1: Should the API route compute `liveness` server-side or return raw `lastHeartbeat` and let the client compute it?

Domain: Behavioral / Callable
Why it matters: Server-side computation = consistent threshold across all clients but requires re-fetch when threshold changes. Client-side = flexible UI updates without re-fetching but threshold logic duplicated everywhere it renders.
Suggested options:
- (a) Server-side (response includes `liveness: 'alive' | 'stale'`, threshold is server constant)
- (b) Client-side (response includes raw `lastHeartbeat`, client computes via shared hook)
- (c) Both (response includes both raw timestamp AND computed liveness, client can override)

Q-2: When the captain navigates to an entity detail page WITHOUT a `?session=` query param (e.g., direct link, bookmark from before this entity shipped), what is the fallback behavior?

Domain: User-facing Visual, Behavioral / Callable
Why it matters: This is the migration path from current behavior. Current behavior is "first row wins" (coin flip). New behavior must be deterministic.
Suggested options:
- (a) Auto-pick most-recent-heartbeat session, display banner "Auto-selected session X — switch?" 
- (b) Show "Select a session" empty state, force captain to pick from list
- (c) Auto-pick + silent (no banner) — preserves smooth UX but hides multi-session existence
- (d) Use cookie/localStorage of last selection, fall back to most-recent-heartbeat

## Core Tensions

- **(time-based)**: 120 depends on 117 shipping for shared header consumption — 120 execute should sequence after 117 ships. Frontmatter `depends-on` must be updated.
- **(domain-based)**: Session picker placement (117 shared header vs war room Tabs) — both are valid; selection couples 120 to 117's API surface vs 053's Tabs structure.
- **(essential)**: Migration UX — the entity detail page already silently picks a session via .limit(1). Switching to explicit selection means existing bookmarks become ambiguous; captain must decide migration story (Q-2).

## Honest Boundaries

- The events SSE stream (Lens c finding) has no projectRoot column. 120 cannot fix this without expanding scope; flagged as out-of-scope structural gap that may surface during execute.
- Liveness threshold (60s default) is a UI constant, not synchronized with daemon's `timeoutMs` config. If captain reconfigures daemon timeout, UI will drift silently.
- No test fixtures exist for multi-session scenarios in spacebridge/ui/ — execute stage will need to add them, increasing test complexity beyond the "Small" estimate.

## Stage Report: explore

- [x] Files mapped: 6 across frontend (app/page.tsx, entity/[slug]/page.tsx) + domain (registry.ts, types.ts, heartbeat-monitor.ts) + 1 router precedent (events/route.ts)
  Mode B inline mapping; brainstorm 4-lens already covered file surface; no need for redundant 4-angle dispatch
- [x] Assumptions formed: 5 (Confident: 4, Likely: 1, Unclear: 0)
  A-1 snapshot read canonical (0.95); A-2 SessionRecord fields sufficient (0.95); A-3 depends-on:[117] required (0.90); A-4 response shape follows /api/entities precedent (0.75); A-5 events SSE gap out of scope (0.95)
- [x] Options surfaced: 3
  O-1 selection persistence (URL ✅ vs cookie vs auto); O-2 picker placement (117 header ✅ vs war room tabs); O-3 multi-session-per-root (dedup-by-root ✅ vs distinct rows)
- [x] Questions generated: 2
  Q-1 server vs client liveness computation; Q-2 fallback behavior for no-?session=
- [x] α markers resolved: 1 / 1
  α-1 (non-goals) resolved during brainstorm via parent 060 Scope: Out
- [x] Scale assessment: Small confirmed
  6 files mapped; data layer (057) shipped; UI patterns (053) shipped; only adapter + new component + targeted fix needed
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident≥0.90 except A-4 Likely 0.75 which only needs cross-check against existing /api/entities response, deferred to plan)
