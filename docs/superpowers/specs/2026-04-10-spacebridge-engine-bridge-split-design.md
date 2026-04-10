---
title: Spacebridge — Engine/Bridge Split Architecture
date: 2026-04-10
status: active
scope: engine/UI decoupling, coordination plane, multi-repo/multi-session runtime
supersedes:
  - partial: MEMORY.md "Dashboard Single-Server Architecture (ADR-001, 2026-04-09)"
relates_to:
  - docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md
  - docs/build-pipeline/spacedock-plugin-architecture-v2.md  # entity 040
  - docs/build-pipeline/dashboard-multi-session-daemon.md    # entity 048
  - docs/build-pipeline/multi-root-workflow-discovery.md      # entity 018
tracking_until: PR1 merges into clkao/spacedock; reassess at that point
---

# Spacebridge — Engine/Bridge Split Architecture

## 1. Purpose & Context

### 1.1 Motivating problems

Three problems converge into a single architectural response:

1. **Fixed-port UI for zero-friction access.** Opening the dashboard currently requires invoking a skill (skill → tool → spawn). Every invocation spends tokens before the user even sees a UI. The right behavior is: one fixed URL (e.g. `http://127.0.0.1:8420`) that is always up, bookmarkable, and reached without any agent involvement.

2. **Multi-repo port collision.** Today's `.mcp.json` spawns `bun tools/dashboard/src/channel.ts` per Claude Code session, and that process binds port 8420 by default. Opening a second CC session in a different repo fails with `EADDRINUSE`. This blocks a basic workflow ("I have two projects open") and has already been hit in practice (entity 048 was captured while debugging this exact failure).

3. **Spacebridge as coordinator, not just UI.** The build flow roadmap (Phases D/E/F, 2026-04-10) establishes three roles: Science Officer (Discuss), First Officer (Execute), Quality Officer (Verify). Discuss-phase work is human-interactive (brainstorm / explore / clarify) and needs the messaging surface the dashboard provides. Execute-phase work is autonomous and runs in daemon mode. The interaction-density asymmetry naturally places SO inside the coordination plane (= the bridge) and FO inside the execution plane (= the engine).

### 1.2 Why a single design resolves all three

Fixed port mathematically requires a single long-lived process per machine owning that port. That process cannot be a Claude Code subprocess — subprocesses die with their session. It must be an independently-managed daemon. Once the daemon exists, it naturally hosts the coordination state that makes multi-session and role-based ownership possible. And once the daemon hosts coordination, moving Science Officer into the daemon's plugin (as opposed to the engine) follows from the role-interaction-density argument.

The three problems share one root cause: **the dashboard is currently owned by the CC session lifecycle, but both "bookmarkable UI" and "coordination across sessions" require the dashboard to outlive any single session**.

### 1.3 Relationship to D/E/F roadmap

This design does not replace the Phases D/E/F roadmap — it extends and re-scopes Phase F.

- **Phase D** (clean skill contracts + SO expansion): unchanged. This design adds one parallel work item (PR1 — ChannelProvider interface extraction) that can ship inside Phase D's window without blocking its other tasks.
- **Phase E** (role boundary restructure): unchanged scope, but gains a dependency — its output (formalized role ownership) unblocks PR2 (CoordinationClient interface extraction).
- **Phase F** (Next.js rewrite + methodology validation): re-scoped. Originally "Next.js frontend rewrite" only. Now: "Next.js frontend rewrite **inside a new spacebridge plugin**, including daemon, IPC, coordination, and mod-based QO hook". The dual-purpose framing from the original roadmap (product delivery + flow validation) is preserved.

The long-term distribution story from the D/E/F roadmap — "build flow eventually deploys on recce, carlvoe, and beyond" — is also preserved. The 2-plugin split (engine + bridge) is the structure that makes distribution possible: the bridge ships the build flow, the engine is the upstream primitive.

### 1.4 Relationship to existing entities

| Entity | Contribution | What this doc changes |
|---|---|---|
| **018** (multi-root workflow discovery, status: explore) | Provides `discoverWorkflows(roots: string[])` primitive and `validatePath()` multi-root relaxation | This doc consumes 018's primitive; bridge daemon uses it to aggregate workflows across repos. 018's scope is unchanged. |
| **040** (spacedock-plugin-architecture-v2, status: draft) | Plugin split parallel track | This doc resolves the 2-plugin vs 3-plugin question: **2-plugin** (spacedock engine + spacebridge = UI + coordinator + build studio). Entity 040 should be updated to reflect this resolution. |
| **048** (dashboard-multi-session-daemon, status: draft) | Daemon + shim architecture for multi-session within one repo | This doc supersedes 048's scope and expands it: daemon serves **all repos on a machine** (not just one), and absorbs role-aware coordination (SO/FO/QO leases, not just entity ownership). Entity 048 should be marked as "absorbed into this spec" and its acceptance criteria ported here. |

### 1.5 Supersedes ADR-001 (partial)

MEMORY.md records ADR-001 (2026-04-09, PR #27) as the decision to remove standalone mode from the dashboard: "Dashboard is now channel-only on port 8420. ctl.sh, forwardToCtlServer bridge, and standalone mode eliminated. The dashboard is spawned by Claude Code via MCP stdio transport — it cannot run without an active CC session."

That decision was correct at the time. The information then available did not include:
- The bookmarkable-URL requirement (new).
- The multi-repo collision reality (emerged during recce-cloud-infra debugging, 2026-04-10, documented in entity 048).
- The SO/FO role split and its implication that coordination belongs outside any single session (emerged during Phase C/D design, 2026-04-10).

This design walks back the "no standalone fallback" half of ADR-001. The "one process owns both MCP and HTTP" half also changes — they split into daemon (HTTP) and shim (MCP stdio). The daemon itself is the standalone dashboard that ADR-001 removed, but now with an explicit cross-session and cross-repo purpose.

**The ADR-001 walk-back is not a reversal in principle.** ADR-001's root argument was "Bun's `server.publish` is process-local, so cross-process pub/sub is hard". This design respects that: the daemon is **one process**, and all sessions connect to it via unix socket IPC. There is no cross-process pub/sub problem because there is still only one process publishing.

---

## 2. Target Architecture

### 2.1 Two plugins, two interfaces

```
┌────────────────────────────────────────────────────────────┐
│  clkao/spacedock  (engine — upstream)                      │
│  ────────────────────────────────────────────────          │
│  Responsibilities:                                         │
│    • Entities, workflows, stages, frontmatter, pipeline    │
│    • First Officer (FO) agent + execute/plan/seeding       │
│      skills                                                │
│    • Build pipeline primitives (stage state machine)       │
│    • Headless-capable: runs without bridge                 │
│                                                            │
│  Two public interfaces (defined in engine, consumed by     │
│  either the in-process fallback or the bridge shim):      │
│                                                            │
│    ① ChannelProvider                                       │
│       event/action wire. Publishes events outbound,        │
│       receives inbound actions (comments, permission       │
│       responses, entity edits).                            │
│                                                            │
│    ② CoordinationClient                                    │
│       role-aware work queue. FO asks "what should I do     │
│       next?"; SO asks "what needs discuss?"; QO asks       │
│       "what's ready for verify?".                          │
│                                                            │
│  Default in-process impls:                                 │
│    ChannelProvider → extracted from today's dashboard      │
│    CoordinationClient → single-session FO-only stub        │
│    (= today's behavior, no coordination, no sharing)       │
└─────┬──────────────────────────────────────────────────────┘
      │ interfaces
      │ (consumed by either fallback OR bridge shim)
      ▼
┌────────────────────────────────────────────────────────────┐
│  spacebridge plugin (your repo — bun-compiled CLI)         │
│  ────────────────────────────────────────────────          │
│  Agents: Science Officer (SO), Quality Officer (QO —       │
│          reserved, mod-based v1), and FO prompt overrides  │
│                                                            │
│  Build studio skills:                                      │
│    build-brainstorm, build-explore, build-clarify,         │
│    build-quality, build-pr-review, build-ship              │
│    (migrated from spacedock:build-* namespace)             │
│                                                            │
│  Daemon (Next.js App Router on Bun):                       │
│    • HTTP + SSE server                                     │
│    • React UI (replaces tools/dashboard/static)            │
│    • Coordination service (role-aware lease manager)      │
│    • Session registry (multi-root)                         │
│    • File watcher → event stream                           │
│    • Drizzle ORM (SQLite default, PG-ready schema)        │
│    • Mod hook API (for QO v1 integration)                  │
│                                                            │
│  Shim (Bun script, CC spawns via .mcp.json):                │
│    • Implements ChannelProvider + CoordinationClient        │
│    • unix socket → daemon                                  │
│    • Registers session's projectRoot with daemon            │
│                                                            │
│  CLI binary: `spacebridge <subcommand>`                    │
│    start, stop, status, mcp, share                         │
│                                                            │
│  Tunnel: pre-SaaS multi-human collaboration                │
│    external humans connect via tunnel → see live state    │
│    → leave comments → SO/FO respond                        │
└────────────────────────────────────────────────────────────┘
```

### 2.2 Three invariants

1. **Engine is headless-capable**: clkao/spacedock without spacebridge installed must still work. Its default in-process `ChannelProvider` wraps the current `tools/dashboard/` code, so existing users see zero behavior change. Its default `CoordinationClient` is a single-session stub — no coordination, no sharing — matching today's FO-only mental model.

2. **Bridge is a consumer, not a fork**: spacebridge implements the two interfaces. It does not modify engine internals. The only changes to the engine (upstream) are (a) interface definitions and (b) FO prompt modifications that wire FO's "what should I do next?" decisions through `CoordinationClient`. Both are behavior-neutral when no bridge is present.

3. **Fixed port, daemon lifecycle, Next.js, SSE, Drizzle, fmodel — all private to bridge**: engine never sees any of these. Engine sees only the two interfaces. This keeps the upstream PR surface minimal and upstream maintainers uncommitted to bridge-internal choices.

### 2.3 Why SO in bridge, FO in engine

The placement is derived from **role interaction density**, not organizational preference:

| Role | Phase | Interaction character | Natural home |
|---|---|---|---|
| SO (Science Officer) | Discuss | Captain-interactive, heavy AskUserQuestion, comment-driven clarification, file edits visible in real-time | Bridge (it IS the interaction surface) |
| FO (First Officer) | Execute | Autonomous, daemon-mode, minimal human check-ins | Engine (interaction is optional) |
| QO (Quality Officer) | Verify | Mixed: autonomous tests + review surfaces | Bridge (mod hook v1, possible agent later) |

Discuss-phase work literally cannot happen without a messaging surface. The bridge IS that surface. Placing SO in the engine would create a weird dependency: engine would need to know how to open comment channels, render Open Questions, and receive clarifications — all of which are bridge concerns. Placing SO in the bridge aligns the agent's location with the infrastructure it depends on.

FO can run without any UI at all. It's a daemon-grade role. The engine is the right home because FO's work (plan, execute, seeding) is the core primitive the engine ships.

QO starts as a **mod hook** (see section 5.4) and may graduate to an agent file later. Bridge reserves the `agents/` slot but does not commit on day one.

### 2.4 What happens to `tools/dashboard/`

- **Short term (through PR1)**: unchanged. `tools/dashboard/src/*.ts` becomes the basis for the engine's default in-process `ChannelProvider` implementation. `tools/dashboard/static/*` continues to serve the single-session UI for engine-only installs.
- **Medium term (Phase F bridge build-out)**: parallel. The new bridge ships Next.js UI inside its own plugin. Engine still has its static/ UI for headless or no-bridge installs.
- **Long term (post Phase F cutover)**: engine's `tools/dashboard/static/*` gets deleted in a final cleanup PR. Data-layer code (`db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts`) stays in the engine as the in-process default implementation.

The cleanup PR is NOT in the current 3-day scope. It happens after bridge reaches feature parity and users have migrated.

---

## 3. Technology Stack

### 3.1 Runtime and framework

| Component | Choice | Rationale |
|---|---|---|
| Runtime | Bun | Existing stack, tests already use `bun:test`, no migration cost |
| Framework | Next.js (App Router) | Unified frontend/backend, Route Handlers for API, React for UI, SSE via streaming Response |
| UI | React 19 + Server Components | Default for modern Next.js App Router |
| ORM | Drizzle | Type-safe, dual-driver (bun:sqlite + pg), ecosystem-aligned with Bun/Next |
| Domain core | fmodel (scoped) | CQRS for coordination domain; see 3.5 for scope |
| Realtime | SSE | Simpler than WebSocket through tunnel; Next.js Route Handlers support streaming responses natively |
| IPC | Unix socket | Daemon ↔ shim; macOS/Linux only (matches Spacedock platform support) |
| Distribution | `bun build --compile` | Single standalone binary; Next.js requires `output: 'standalone'` + custom bundler step |

### 3.2 Bun + Next.js + `--compile` risk

This combination is not a well-trodden path. Known concerns:

- Next.js on Bun runtime is supported from Next 15+ but has edge cases (certain webpack loaders, some SSR APIs).
- `next build --output standalone` produces a Node-compatible bundle; wiring that into `bun build --compile` requires assembling assets and resolving the server entry manually.
- Static asset handling differs between Next's built-in server and a compiled binary.

**Mitigation**: Entity 049 is a pre-Phase F spike specifically to prove this combination works end-to-end with a hello-world-scale app (render a page, serve an SSE endpoint, compile to binary, execute binary, verify both work). If the spike fails, the design falls back to raw Bun.serve + a standalone React SPA bundle — a known-good path but a structurally different UI.

Entity 049 is **not** in the 3-day PR1 scope. It runs at the start of Phase F. PR1 does not depend on it.

### 3.3 Drizzle with Postgres forward-compatibility

SQLite is the default and near-future storage. Postgres is the long-term target (for multi-user SaaS or shared team deployments).

**Schema discipline**: the Drizzle schema is written to the **lowest common denominator** of SQLite and Postgres. Specifically:

- Use `text` for string columns (maps cleanly to both).
- Use `integer` primary keys with autoincrement, not `serial`.
- Use `integer` timestamps (Unix epoch ms) rather than `datetime` / `timestamptz` — avoids timezone semantic drift between engines.
- Avoid JSON columns for structured data at the top level; prefer normalized tables. JSON is OK for opaque blobs (event payloads, metadata bags) where neither engine needs to query inside.
- Avoid engine-specific `returning` clauses; read after write if the primary key is needed.
- Migrations are written in the Drizzle schema-first style, with generated SQL reviewed for dual compatibility.

A `--postgres <url>` flag on `spacebridge start` swaps the Drizzle driver from `bun:sqlite` to `pg`. No application code changes. This is the payoff of LCD schema discipline.

### 3.4 Events over SSE (not WebSocket)

Previous dashboard uses WebSocket via `Bun.serve().publish()`. This design moves to SSE.

**Why**:

1. **Bookmarkable live UI through tunnel**: the pre-SaaS multi-human collaboration use case (section 6) requires sharing the daemon over a tunnel. SSE through cloudflared / ngrok / tailscale funnel is dramatically more reliable than WebSocket — SSE is plain HTTP/1.1 streaming, passes through any proxy that understands chunked transfer encoding. WebSocket requires proxy-side WS upgrade support, which is inconsistent across tunnel providers.

2. **Server-push is all we need**: the dashboard's realtime flow is 95% server → client (file changes, agent actions, new events, status updates). Client → server actions (comments, approvals) are discrete HTTP POSTs, which are just Next.js Route Handler POSTs. Nothing here benefits from WebSocket's bidirectional design.

3. **Next.js ergonomics**: Route Handlers support streaming `Response` bodies out of the box via `ReadableStream`. WebSocket in Next.js Route Handlers is not supported without third-party packages (`next-ws`) and those packages have varying Bun compatibility.

4. **Fewer moving parts at shutdown**: SSE connections get cleanly cut by HTTP close; no lingering WS handshake state.

The engine's in-process fallback `ChannelProvider` can keep using WebSocket (today's code). It only runs single-session / no-bridge, so tunnel concerns don't apply. No need to force the engine to change. The two implementations of `ChannelProvider` pick the transport appropriate for their context.

### 3.5 Scoped fmodel CQRS application

fmodel adds front-loaded complexity but pays off in event replay, pure-function testability, and postgres migration ease. The complexity is mitigated by **scoping** — not every module gets the CQRS treatment.

| Layer | fmodel usage | Modules | Rationale |
|---|---|---|---|
| 🟢 **Full CQRS** | commands + decider + events + projections | Session registry, Entity lease (role-aware), Work queue / coordination, Comments + replies (with auto-resolve), Activity event stream | These are intent-driven (command generates event), benefit from replay (tunnel participants catching up), and need pure-function testability (no race conditions across sessions) |
| 🟡 **Event log only** | events stored, but no decider (event source is environment, not command) | File change events (from watcher), External webhooks (if added later) | Events are observations, not intents. Append to log so SSE clients can replay from a seq number. No decider layer because there's no "command" to validate. |
| 🔴 **No fmodel** | plain Drizzle / file I/O | Entity markdown read/write, `discoverWorkflows` dir scan, frontmatter parse/serialize, UI queries with pagination, Next.js page components | Stateless transforms, I/O adapters, or read-only queries. fmodel would be over-engineering. |

**Known fmodel gotcha (from MEMORY.md)**: Zod's default `.strip()` behavior drops unknown fields, which can silently lose event data during schema evolution. All event schemas use `.passthrough()` or explicit version tagging with migration functions. This is a hard-learned lesson from carlvoe (qnow repo).

**Estimated cost**: ~15-20% additional effort on Phase F entities 050-056 (the coordination-layer scaffolding) compared to a pure-CRUD approach. The payoff breaks even at the second or third coordination feature, and by Phase F cutover is clearly net-positive.

---

## 4. Multi-Repo & Fixed Port Resolution

### 4.1 L2 auto-fork daemon lifecycle

Lifecycle options considered:

- **L1 (manual start/stop)**: user runs `spacebridge start`. Clean but adds an onboarding step and breaks "zero-token UI" when user forgets.
- **L2 (auto-fork on first shim)**: the first shim that starts checks for an existing daemon socket. If absent, it forks a detached daemon, waits for the socket to appear, then connects. Daemon outlives the shim that birthed it.
- **L3 (launchd/systemd user agent)**: "proper" daemon, installed via plist, auto-starts on login. Most correct but platform-specific and adds install complexity.

**Chosen: L2.** Reasons:

- Satisfies "fixed port + zero-token UI" at the cost of one bounded cold-start latency on the first session of a boot (a few hundred ms).
- No user onboarding step beyond plugin install.
- No launchd/systemd complexity.
- Debuggable: shim's auto-fork can be disabled via env var for development.

L3 remains a future option if users request "UI available before any CC session" (current design requires *some* CC session to have started to auto-boot the daemon). The migration from L2 to L3 is purely an install-script change; no code restructure.

### 4.2 Auto-fork implementation sketch

```
shim startup:
  socket_path = ~/.spacedock/spacebridge.sock
  try:
    connect(socket_path)
  except ECONNREFUSED or ENOENT:
    acquire lock file (~/.spacedock/spacebridge.lock) with flock
    // lock prevents race: two shims simultaneously not finding daemon
    // and both forking
    try:
      connect(socket_path)  // re-check under lock
    except:
      // Invocation differs by install mode:
      //   dev:        ['bun', 'path/to/spacebridge/bin/daemon.ts', 'start']
      //   compiled:   ['spacebridge', 'start']  (bun --compile binary)
      // The shim resolves which via SPACEBRIDGE_DEV env var or presence
      // of a sibling compiled binary next to the shim's own location.
      spawn(daemon_invocation(), {
        detached: true,
        stdio: 'ignore',
      }).unref()
      wait_for_socket(socket_path, timeout: 5s)
    release lock
    connect(socket_path)

  register_session({
    projectRoot: <git rev-parse>,
    session_id: uuid(),
    pid: process.pid,
  })
```

Lock file ensures that two shims starting simultaneously do not both try to fork the daemon. The second shim finds the daemon already booted (by the first) once it acquires the lock.

### 4.3 Session registry and multi-root discovery

The daemon maintains a session registry:

```typescript
// 🟢 fmodel full CQRS domain
type Session = {
  id: string;             // uuid
  projectRoot: string;    // absolute path
  pid: number;
  connected_at: number;
  last_heartbeat: number;
};

// commands
type SessionCommand =
  | { type: 'register'; session: Session }
  | { type: 'heartbeat'; id: string; at: number }
  | { type: 'disconnect'; id: string };

// events (after decider)
type SessionEvent =
  | { type: 'session_registered'; session: Session }
  | { type: 'session_heartbeat'; id: string; at: number }
  | { type: 'session_disconnected'; id: string };
```

On `session_registered`, the daemon calls `discoverWorkflows([...all_distinct_project_roots])` (reusing entity 018's primitive). The union of all active sessions' project roots is the daemon's active discovery scope.

On `session_disconnected` (or heartbeat timeout), the session is removed. Discovery scope recomputes.

### 4.4 File watcher

The daemon spawns a watcher (Bun's native `fs.watch` or `chokidar` for cross-platform consistency) on the union of workflow directories derived from the session registry. File change events become 🟡 event-log entries (observations, no decider), which are then pushed to all connected SSE clients.

Debouncing: file writes during git operations or editor saves often fire multiple events per file in quick succession. The watcher debounces at ~100ms per (file, change-type) pair.

### 4.5 Database path under daemon architecture

**Single daemon = single database.** Unlike the per-session embedded mode (where each CC session gets its own in-process state), the daemon has one process and one SQLite file: `~/.spacedock/spacebridge.db`. All repos share this database, with queries scoped by `workflow_dir` or `project_root` as schema keys.

This is the **correct** shape under daemon architecture — not a bug. The previous "per-repo dbPath" idea (from early brainstorming) applied only to the pre-daemon world where each process owned its own DB. Under daemon, a single DB is the natural design.

Test isolation still uses `dbPath` override — tests pass a temp path instead of the default. The production default is a single shared file.

---

## 5. Coordination Model

### 5.1 Role-aware CoordinationClient API

This is the interface engine exports for FO (and, when Phase E completes, for SO/QO in the bridge) to delegate coordination decisions.

```typescript
// engine: packages/core/coordination.ts (upstream PR2)
export type Role = 'SO' | 'FO' | 'QO';

export type EntityRef = {
  slug: string;
  workflow_dir: string;
  current_stage: string;
  status: string;
};

export type LeaseToken = {
  session_id: string;
  entity_slug: string;
  role: Role;
  acquired_at: number;
  expires_at: number;
  token: string; // opaque to caller
};

export interface CoordinationClient {
  /**
   * Ask for work matching a role. Bridge returns entities that are
   * in the role's phase and not currently leased by another session.
   */
  getAvailableWork(role: Role): Promise<EntityRef[]>;

  /**
   * Claim exclusive ownership of an entity for a role. Fails if
   * another session already holds a lease for the same (entity, role).
   */
  acquireEntity(
    slug: string,
    role: Role,
    sessionId: string,
  ): Promise<LeaseToken>;

  /**
   * Release a lease. Outcome records whether the work completed
   * successfully or aborted (affects the entity's next-phase eligibility).
   */
  releaseEntity(
    token: LeaseToken,
    outcome: 'done' | 'abort',
  ): Promise<void>;

  /**
   * Extend a lease before expiry. Shim calls this periodically while
   * the owning role's work is active.
   */
  extendLease(token: LeaseToken): Promise<void>;
}
```

### 5.2 Default in-process implementation (engine fallback)

When no bridge is present, the engine ships a single-session stub:

```typescript
// engine: packages/core/coordination-default.ts
class InProcessCoordinationClient implements CoordinationClient {
  private sessionId: string;

  async getAvailableWork(role: Role): Promise<EntityRef[]> {
    // Single session, FO-only: scan workflow dirs, return entities
    // matching the role's phase with no "in progress" guard
    // (since there's no other session to conflict with).
    return scanEntitiesForRole(role);
  }

  async acquireEntity(slug, role, sessionId): Promise<LeaseToken> {
    // Always succeeds — no contention possible in single-session mode.
    return { session_id: sessionId, entity_slug: slug, role, ... };
  }

  async releaseEntity(): Promise<void> { /* noop */ }
  async extendLease(): Promise<void> { /* noop */ }
}
```

This preserves today's behavior exactly: engine-only installs have no coordination and no lease contention, because there is only one session.

### 5.3 Bridge implementation (unix socket RPC)

The bridge shim implements the same interface as RPC calls to the daemon over unix socket. The daemon hosts the authoritative lease table as a 🟢 full CQRS aggregate:

```typescript
// bridge: packages/core/coordination-domain.ts
type Lease = {
  token: string;
  session_id: string;
  entity_slug: string;
  role: Role;
  acquired_at: number;
  expires_at: number;
};

type LeaseCommand =
  | { type: 'acquire'; slug: string; role: Role; session_id: string }
  | { type: 'release'; token: string; outcome: 'done' | 'abort' }
  | { type: 'extend'; token: string }
  | { type: 'expire'; token: string };  // emitted by janitor

type LeaseEvent =
  | { type: 'acquired'; lease: Lease }
  | { type: 'released'; token: string; outcome: 'done' | 'abort' }
  | { type: 'extended'; token: string; new_expiry: number }
  | { type: 'expired'; token: string };

// Pure decider — no I/O, testable in isolation
const decide = (cmd: LeaseCommand, state: LeaseState): LeaseEvent[] => {
  switch (cmd.type) {
    case 'acquire': {
      const conflict = state.leases.find(
        l => l.entity_slug === cmd.slug && l.role === cmd.role
      );
      if (conflict) throw new LeaseConflict(conflict);
      return [{ type: 'acquired', lease: newLease(cmd) }];
    }
    // ...
  }
};
```

The decider is pure. Tests are `assert.deepEqual(decide(cmd, state), expected_events)` with no mocks. Janitors (lease expiry) run as scheduled commands that produce `expire` events through the same pipeline.

### 5.4 QO as mod hook (v1)

Quality Officer starts as a bridge mod, not an agent. The bridge exposes a mod registration API:

```typescript
// bridge: mod hook API
bridge.mods.register({
  id: 'qo-pr-review',
  hooks: {
    'entity.stage_transition': async ({ entity, from_stage, to_stage }) => {
      if (to_stage === 'pr-draft') {
        await invokeSkill('kc-pr-review', { entity_slug: entity.slug });
        await invokeSkill('kc-pr-create', { entity_slug: entity.slug });
      }
    },
    'entity.ready_for_verify': async ({ entity }) => {
      await invokeSubagent('pr-review-toolkit', { target: entity });
      await invokeSubagent('trailofbits', { target: entity });
      await invokeSkill('e2e-flow', { entity_slug: entity.slug });
    },
  },
});
```

Mods are:
- Declared in the bridge plugin's config or discovered via a convention path.
- Stateless: they observe events and invoke skills/subagents. They do not own state; any persistence happens via the bridge's normal APIs.
- Composable: multiple mods can register for the same hook.
- Disposable: if the pattern doesn't justify a QO persona, the mod stays as the permanent solution.

**QO as agent (future path)**: if mod hooks accumulate enough responsibility (pr-review + trailofbits + e2e-flow planning + verify workflow owning) that "QO as a persona" becomes natural, the evolution is mechanical: create `agents/quality-officer.md`, move the mod logic into the agent's skill loadout, update the `CoordinationClient` consumers to query `QO` work. The mod infrastructure stays as the extension point for future hooks.

This lets the "is QO a persona?" question answer itself through observed workload rather than upfront design.

### 5.5 FO prompt modifications (engine-side, part of PR2)

FO's current prompt makes coordination decisions implicitly — "pick the next entity that needs work" is baked into skill logic. Under the new architecture, these become explicit `CoordinationClient` calls:

- "What should I work on next?" → `getAvailableWork('FO')`
- "I'm starting work on entity X" → `acquireEntity(X, 'FO', sessionId)`
- "I'm done / aborting" → `releaseEntity(token, outcome)`
- Periodic (every N seconds during long operations) → `extendLease(token)`

The prompt rewrite is scoped to **delegation language**: "call `getAvailableWork` before picking a target", "acquire a lease before dispatching an ensign", etc. The FO's internal reasoning (how to execute the chosen work) is unchanged.

In headless engine mode, these calls go through the in-process default client, which always succeeds. FO behaves identically to today.

---

## 6. Tunnel / Multi-Human Collaboration (pre-SaaS)

### 6.1 Use case

Before spacebridge becomes a hosted SaaS, users need a quick way to share a specific entity's flow with a human collaborator (reviewer, domain expert, teammate) so they can participate without installing anything.

Flow:
1. User runs `spacebridge share --entity <slug>` (or enables share on a workflow dir).
2. Bridge spins up a tunnel (cloudflared named tunnel, ngrok, tailscale funnel — bridge supports multiple backends).
3. Bridge prints a URL: `https://<random>.spacebridge.dev/<share_id>`.
4. User sends URL to a human collaborator.
5. Collaborator opens URL in browser → sees the shared entity's live state (SSE-driven) → can leave comments via a POST form.
6. Comments from the collaborator become events in the bridge's event stream → visible to SO/FO running in the owner's CC session → SO/FO respond.

### 6.2 Why SSE makes this easy

SSE over tunnel Just Works. Cloudflared, ngrok, and tailscale all transparently proxy HTTP/1.1 streaming responses. WebSocket over these tunnels requires per-tunnel configuration (ngrok `--proto http`, cloudflared named tunnels need WS support explicitly, etc.) and frequently breaks behind corporate proxies.

The pre-SaaS audience is specifically people who are sending a link to a colleague — "it should just work" is a hard requirement, not an optimization.

### 6.3 Auth model (v1)

- Share links are **bearer-token URLs**: the URL itself is the credential. Anyone with the URL can see and comment.
- Tokens are scoped to a specific entity (not the whole workflow or the whole bridge).
- Tokens have an expiry (default: 7 days, configurable).
- Tokens can be revoked via `spacebridge share --revoke <share_id>`.
- Comments from tunnel participants are attributed to a nickname they choose (not verified — this is pre-SaaS, not auth-grade).

Proper multi-user auth (OAuth, sessions, per-user permissions) is out of scope for the current design. It's deferred to the SaaS transition.

### 6.4 Rate limiting

Tunnel endpoints are rate-limited at the daemon: N requests per minute per share token. Prevents tunnel abuse if a share link leaks.

---

## 7. Upstream PR Strategy

### 7.1 Two PRs, not one

**PR1 — ChannelProvider interface extraction** (current 3-day sprint):
- Scope: define the interface, refactor `channel.ts` to accept a provider, ship in-process default.
- Behavior-neutral: all existing tests pass unchanged.
- No new features, no new dependencies, no schema changes.
- Target: merge into clkao/spacedock next week.

**PR2 — CoordinationClient interface + FO delegation** (after Phase E completes):
- Scope: define the role-aware coordination interface, refactor FO prompts to delegate, ship in-process single-session default.
- Blocked on: Phase E role boundary formalization (can't define `Role` type until SO/FO/QO ownership is stable).
- Target: unscheduled. Estimated Phase E completion window.

### 7.2 Why split

- **PR1 is low-risk, high-confidence**: pure refactor, behavior-neutral. clkao can review and merge without committing to larger architecture.
- **PR2 is design-heavy**: introduces a new concept (roles, leases) that affects FO skill authoring. Deserves its own review cycle and is premature until Phase E defines the role boundaries.
- **Independent value**: PR1 unlocks bridge development in the user's own repo (spacebridge shim can start implementing `ChannelProvider` as soon as PR1 merges). Bridge does not block on PR2 — it can run with its own `CoordinationClient` extension shipped alongside PR1's interface, then switch to the upstream interface once PR2 merges.

### 7.3 PR1 commit structure

Proposed commit sequence for PR1 (each independently revertible):

1. `refactor(channel): extract ChannelProvider interface`
2. `refactor(channel): convert createChannelServer to accept provider`
3. `refactor(channel): in-process default implementation`
4. `docs(channel): ChannelProvider interface contract and rationale`

Each commit compiles and passes tests. The 4th commit adds a short README in `tools/dashboard/src/` explaining the interface's purpose and how a future external provider would consume it.

### 7.4 PR1 non-goals

Explicitly **out of scope** for PR1:
- `CoordinationClient` (PR2)
- Daemon, unix socket, IPC (bridge-internal)
- Next.js, Drizzle, fmodel (bridge-internal)
- Database path changes (preserved as-is)
- Port defaults changes (still 8420)
- Any change to `tools/dashboard/static/*`
- Any new dependencies

Reviewing clkao should see a small, focused refactor with a clear rationale. Nothing should surprise them.

---

## 8. Roadmap & Entity Layout

### 8.1 3-day sprint (this week)

**Goal**: PR1 merged into clkao/spacedock.

| Day | Work | Artifact |
|---|---|---|
| Day 0 (today) | Finish brainstorming, write this design doc, update D/E/F D.5 | specs + updated roadmap |
| Day 1 | Draft PR1 implementation plan (via `writing-plans` skill), create 049-060 entity stubs (via subagent), begin PR1 Task 1 (interface definition) | plan doc + entity stubs + first commits |
| Day 2 | PR1 Task 2 (refactor createChannelServer), Task 3 (in-process impl), all tests pass | working refactor |
| Day 3 | PR1 Task 4 (docs + polish), open PR to clkao/spacedock | live PR |

### 8.2 Entity roadmap (activated in Phase F, stubs created in 3-day window)

All entities below are created as `status: draft` stubs during the 3-day window so the war room shows the roadmap. They are not activated until their dependencies resolve.

| Entity | Title | Phase | Scale | Depends on |
|---|---|---|---|---|
| 049 | Next.js + Bun + `--compile` + fmodel spike | Phase F start | Small | none |
| 050 | Spacebridge plugin skeleton + Drizzle LCD schema | Phase F | Medium | 049 |
| 051 | Unix socket IPC + `ChannelProvider` client/server | Phase F | Medium | 050, PR1 merged |
| 052 | L2 auto-fork daemon lifecycle | Phase F | Small | 051 |
| 053 | Next.js app — war room view + SSE live feed | Phase F | Medium | 052 |
| 054 | Entity detail page + comments API (parity part 1) | Phase F | Medium | 053 |
| 055 | SO/QO agent + build-* skill namespace migration | Phase F | Medium | 054 |
| 056 | Role-aware lease manager (fmodel core) | Phase F | Large | 055, PR2 merged |
| 057 | Multi-root session registry + file watcher | Phase F | Medium | 053 |
| 058 | `spacebridge share` tunnel rebuild | Phase F end | Medium | 057 |
| 059 | `bun --compile` single-binary distribution | Phase F end | Small | all prior |
| 060 | Cutover — delete engine `tools/dashboard/static/*` | Phase F end | Small | 059 + migrated users |

### 8.3 Dependencies on non-Phase-F work

- **PR1** (ChannelProvider) merges into engine upstream → unblocks 051.
- **PR2** (CoordinationClient) merges into engine upstream → unblocks 056's role-aware wire.
- **Phase E** role boundary formalization → unblocks PR2 design.
- **Entity 018** (multi-root discovery) primitive → consumed by 057.
- **Entity 040** (plugin split v2) 2-plugin resolution → consumed by 050 (folder layout).
- **Entity 048** (multi-session daemon) → absorbed into this design; its scope moves into 051 + 052 + 056.

### 8.4 Check-in / activate cadence

After each completed entity, the user returns to this design doc and decides which entity to activate next based on:
- Current Phase D/E/F status
- PR1 / PR2 upstream merge status
- Learnings that might modify remaining entity scopes

The user does not need to hold the whole roadmap in memory — the design doc + the entity stubs + the D/E/F roadmap are the external memory. Each check-in is a bounded decision: "given current state, which entity next?" — typically a 5-minute decision, not a re-planning session.

---

## 9. Design Decisions Log

Decisions taken during brainstorming, recorded for future review:

**D1: Why SSE over WebSocket (§3.4)**
- Tunnel reliability through cloudflared/ngrok/tailscale
- Server-push is all we need; client→server is discrete POSTs
- Next.js Route Handler native support for streaming responses
- Simpler shutdown semantics
- Engine fallback can keep WebSocket (context-specific choice, not global ban)

**D2: Why scoped fmodel, not全打 (§3.5)**
- Full CQRS on pure I/O adapters is over-engineering
- Three-tier split (🟢🟡🔴) matches natural problem structure
- Estimated 15-20% extra effort on coordination-layer entities, breaks even by second coordination feature

**D3: Why 2-plugin, not 3 (§1.4, §2.1)**
- Resolves D/E/F Phase D.5 Open Question 1
- Splitting UI and build studio into separate plugins adds coordination cost without clear benefit
- SO/QO agents + build-* skills + UI + daemon all share the same "interaction surface" identity → one plugin
- Engine stays lean (pipeline primitives + FO); bridge owns everything human-facing

**D4: Why L2 daemon lifecycle, not L1/L3 (§4.1)**
- L1 (manual start) breaks "zero-token UI" when user forgets
- L3 (launchd) adds install complexity without day-one benefit
- L2 auto-fork balances fixed-port requirement with zero onboarding friction
- Future L3 migration is a script change, not a code restructure

**D5: Why partial supersede of ADR-001, not full reversal (§1.5)**
- ADR-001's root constraint ("cross-process pub/sub is hard") still holds and is respected: single daemon process handles all publishing
- The "no standalone fallback" half of ADR-001 is walked back because new requirements (bookmarkable UI, multi-repo, coordination) demand session-independent state
- The walk-back is additive: engine's in-process mode still exists for headless/no-bridge installs

**D6: Why PR1 and PR2 split (§7.1)**
- PR1 is low-risk pure refactor; PR2 introduces new concepts (roles, leases)
- PR1 can ship now; PR2 must wait for Phase E role boundary
- Independent value: bridge can start building against PR1's interface before PR2 lands

**D7: Why QO starts as mod, not agent (§5.4)**
- Avoids committing to persona identity before workload justifies it
- Mod API is a general bridge extension point, reusable for other hooks
- Natural evolution path if QO workload stabilizes into a persona

**D8: Why Drizzle LCD schema discipline (§3.3)**
- Postgres is the long-term storage target but SQLite is the near-future default
- LCD schema (integer keys, text columns, epoch-ms timestamps, no JSON column for queryable data) avoids a painful migration later
- `--postgres` flag is a driver swap, not an application rewrite

**D9: Why Phase F is re-scoped, not parallel to D/E/F (§1.3)**
- Phase F was already "Next.js frontend rewrite + methodology validation"
- Bridge plugin scope is a natural expansion: the Next.js rewrite now lives inside a new plugin rather than in-place
- Dual-purpose preservation: Phase F still dogfoods the new flow while building the product

---

## 10. Open Questions

Questions deferred out of the 3-day window. Each has a resolution trigger:

**OQ-1: Mod API exact shape** (§5.4)
- v1 mod API lists hooks (`entity.stage_transition`, `entity.ready_for_verify`) but does not lock down the signature or the invocation model (inline vs subagent vs background task)
- **Resolution trigger**: Phase F entity 055 (SO/QO agent migration) — mod API is defined as part of that entity's scope

**OQ-2: Tunnel auth hardening** (§6.3)
- v1 uses bearer-token URLs with 7-day expiry
- Not sufficient for any scenario where the link might be forwarded widely
- **Resolution trigger**: SaaS transition design (post Phase F)

**OQ-3: Postgres migration timing** (§3.3)
- Design is PG-ready but SQLite is the default through all of Phase F
- When do we flip the default? Multi-user install? Shared team install? SaaS?
- **Resolution trigger**: first observed need for multi-writer concurrency or cross-machine access

**OQ-4: QO persona upgrade decision** (§5.4)
- Mod-based QO is v1; agent-based QO is possible evolution
- Criteria for "mod has accumulated enough workload to deserve a persona" not formalized
- **Resolution trigger**: Phase E post-mortem + 3-5 entity observation period after Phase F ships

**OQ-5: Build pipeline stage consolidation** (raised during this brainstorming, 2026-04-10)
- The D/E/F roadmap does not currently include reducing the number of pipeline stages.
- The user flagged during this brainstorming session that the current pipeline feels too long ("pipeline 太長了"), and noted that adding SO was their rigor fix, not a length fix.
- **Recommendation**: Phase E should adopt stage consolidation as an **explicit evaluation criterion** during role boundary restructuring. When SO/FO/QO ownership is formalized, some existing stages may naturally merge (example candidates: brainstorm+explore could collapse into "SO discovery" if SO owns both).
- **Resolution trigger**: Phase E kickoff. Not part of this design; tracked here to avoid being forgotten.

**OQ-6: Cross-machine shared daemon**
- Design assumes one daemon per machine (localhost socket)
- Team deployments may want "one daemon for the whole team, accessed via HTTPS"
- **Resolution trigger**: first team deployment request or SaaS transition

**OQ-7: Next.js + Bun + `--compile` feasibility**
- Entity 049 spike addresses this
- If spike fails, fallback is raw Bun.serve + React SPA bundle — a structural alternative
- **Resolution trigger**: entity 049 spike outcome

---

## References

- Build flow roadmap Phases D/E/F: `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md`
- Entity 040 (plugin split v2): `docs/build-pipeline/spacedock-plugin-architecture-v2.md`
- Entity 048 (multi-session daemon): `docs/build-pipeline/dashboard-multi-session-daemon.md`
- Entity 018 (multi-root workflow discovery): `docs/build-pipeline/multi-root-workflow-discovery.md`
- ADR-001 (single-server 8420): `docs/superpowers/specs/2026-04-09-adr-001-single-server-8420-design.md`
- MEMORY.md notes: "Dashboard Single-Server Architecture (ADR-001, 2026-04-09)", "MCP Channels Require stdio Transport (2026-04-09)", "Test Isolation for SQLite Servers (2026-04-08)"
- fmodel Zod gotcha (carlvoe/qnow repo): MEMORY.md references to `fmodel-middleware.ts` Zod strip issue

