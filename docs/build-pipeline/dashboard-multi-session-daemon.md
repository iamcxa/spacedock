---
id: 048
title: Multi-Session Dashboard — Daemon + MCP Shim Architecture
status: draft
source: session discussion (recce-cloud-infra, 2026-04-10)
started:
completed:
verdict:
score: 0.7
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
note: Scope absorbed into docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md (2026-04-10). This entity remains as historical record of the initial problem framing; the authoritative design is the spacebridge doc, which extends the daemon+shim proposal with role-aware coordination, 2-plugin split, and SSE transport. Technical references to channel.ts line numbers verified against current code at commit-time.
---

## Problem

The dashboard's channel server (`tools/dashboard/src/channel.ts`) couples the HTTP UI and the MCP stdio transport inside a single `bun` process. This makes the dashboard a **per-session singleton**:

- One `createChannelServer()` call owns both the `Bun.serve()` HTTP server AND the MCP `Server` instance, plus all the state that binds them (`pendingPermissions` Map, `onChannelMessage` closure, `dashboard.publishEvent()` direct calls).
- Each Claude Code session that activates `spacedock-dashboard` via `.mcp.json` spawns its own `bun channel.ts`, which tries to bind the same port.
- Only one CC session per repo can run the dashboard at a time. Opening a second CC session in the same project fails with `EADDRINUSE`.

The short-term workaround (discovered 2026-04-10) is to pass `--port <N>` in `.mcp.json` args so each project/session gets its own port. This works for "one repo, one session" but does not enable multi-session collaboration on a shared workflow.

## Why this matters

Spacedock's value proposition is structured agent workflows. The natural evolution is **multiple agents working in parallel on the same workflow** — one CC session handling entity A's implementation while another handles entity B's validation, both visible on one dashboard. Today's architecture blocks that.

## Proposed Architecture (Daemon + Shim)

Split the monolithic channel server into two independent components:

```
                    ┌──────────────────────┐
                    │  Dashboard Daemon    │  port A (e.g., 8420)
                    │  - HTTP + UI + SSE   │
                    │  - SQLite + EventBus │
                    │  - Entity lease mgr  │
                    │  - Session registry  │
                    └──┬──────────────┬────┘
                       │ IPC          │ IPC
                       │ (unix sock)  │ (unix sock)
                  ┌────┴────┐    ┌────┴────┐
                  │MCP shim │    │MCP shim │   thin per-session procs
                  │ CC-1    │    │ CC-2    │
                  └─────────┘    └─────────┘
```

**Daemon responsibilities:**
- Serves the dashboard UI and SSE event stream
- Owns SQLite (`dashboard.db`) with EventBuffer, ShareRegistry, SnapshotStore
- Maintains a **session registry**: `session_id → shim IPC endpoint`
- Maintains an **entity lease table**: `entity_slug → { owner_session, acquired_at, expires_at }`
- Routes inbound dashboard actions (button clicks, comments, permission verdicts) to the correct shim based on entity ownership

**Shim responsibilities:**
- Spawned by Claude Code per session via `.mcp.json` (just like today)
- Connects to daemon via unix socket (e.g., `~/.spacedock/dashboard/<hash>/sock`)
- Registers itself: `{ session_id, pid, cwd }`
- Handles MCP stdio transport for that session
- Translates MCP tool calls (`reply`, `add_comment`, etc.) into daemon RPC calls
- Receives `notifications/claude/channel/*` from the daemon and forwards to CC via the MCP instance it owns

**If the daemon is not running**, the first shim to start boots it (daemon becomes a background `bun` process detached from the CC session that birthed it).

## How the UI "Shares" Across Sessions (design space)

The architecture refactor is incomplete without answering: **what does the user actually see in a shared UI?** Three options:

### Option 1: Session picker in header
- UI header dropdown: `[Session A ▼] [Session B]`
- Selection filters events/entities shown
- Effectively "two dashboards in one tab" — little real benefit over separate URLs
- **Verdict: Reject.** Solves the port conflict but not the collaboration use case.

### Option 2: Unified feed with session badges
- All events interleaved on the timeline, each tagged with `[session-A]` `[session-B]`
- Inbound actions route by "currently focused entity's owner"
- Risks: noisy feed, confusing permission prompts, UI has to track focus carefully
- **Verdict: Possible fallback.** Good for passive observation, weak for active control.

### Option 3: Entity-owned routing (**recommended**)
- Each entity has an `owned_by_session` lease recorded in the daemon
- When session A dispatches a worker for entity E, the FO acquires a lease on E (daemon increments lease counter, sets `owner=A`, `expires_at=now+30min`)
- UI shows full workflow state as today, but each entity card shows an `owned by: session-A` badge
- Detail page actions (comment, approve, reply, update_entity) route to the lease owner automatically
- Unowned entities are free — any session's FO can claim them
- Releases: explicit (session completes the stage) or time-based expiry (session crashed)
- **Why this wins:** It answers "why share a UI?" with a concrete benefit — two agents parallelizing work on one workflow, with the human seeing the global state in one place. Entity as the lock unit also kills the FO race condition naturally.

**Implication for FO semantics:** Today's FO is a workflow-level orchestrator (one FO owns a repo's workflow). Option 3 downgrades FO to an **entity-worker pool** — the daemon becomes the real orchestrator (lease manager + state store), and FOs compete for entity leases. This is a shift from actor-model to shared-state-model. Worth calling out explicitly because the mental model changes for contributors.

## Coupling Points to Refactor

From reading `channel.ts` (2026-04-10):

1. **`pendingPermissions` Map** (`channel.ts:83-86`) — in-process Map keyed by `request_id`. Move into daemon; shim forwards `tool:` permission requests over IPC and awaits the response.
2. **`dashboard.publishEvent()`** (`channel.ts:135`) — direct call into the HTTP server's EventBuffer. Replace with `daemonClient.publishEvent({ session_id, event })`.
3. **`onChannelMessage`** (`channel.ts:95-124`) — HTTP-originated inbound routing callback. Daemon now owns this path; it looks up which shim to notify based on entity lease and forwards via IPC.
4. **Shared SQLite** (`dbPath`) — SQLite in WAL mode supports multi-process writers but the EventBuffer, ShareRegistry, and SnapshotStore assume single-process ownership of in-memory caches. These become daemon-only.

## Open Questions

- **IPC transport**: unix socket vs HTTP loopback vs named pipe? Unix socket is cleanest on macOS/Linux; Windows would need named pipes. Spacedock is currently macOS/Linux only, so unix socket is fine.
- **Daemon lifecycle**: Who starts/stops it? First shim boots it; last shim leaving shuts it down? Or is it a sticky daemon managed by `/dashboard start|stop`?
- **Backward compatibility**: The current single-process mode should stay available for simple use (one session, no IPC overhead). Switch modes via `--daemon` flag or auto-detect presence of daemon socket.
- **Lease expiry semantics**: Hard cutoff at expiry (orphan entity becomes unowned) vs heartbeat extension from shim? Heartbeat is more correct, harder to implement.
- **What about multi-user (non-local) scenarios?** Share tunnels already exist (`/dashboard share`). Does entity lease extend to remote participants via ShareRegistry? Out of scope for v1.
- **`channel_port` state file**: Today it's a single file per state dir. With daemon, it becomes `daemon_socket` (path to unix sock). The `/dashboard share` skill and other clients need updates.

## Non-goals for v1

- Cross-machine session sharing (different laptops → same daemon). Use `/dashboard share` tunnels for that.
- Automatic entity handoff between sessions mid-stage. Leases are acquired at dispatch and released at completion; no mid-stage transfer.
- UI-driven manual session switching. Entity routing is automatic based on lease ownership.

## Acceptance Criteria

- [ ] Daemon process can be started independently of any Claude Code session (via `spacedock-dashboard-daemon` bin or first shim boot)
- [ ] Two CC sessions in the same repo can both run without port conflict
- [ ] Both sessions' FOs can dispatch workers for **different entities** in the same workflow concurrently
- [ ] Dashboard UI shows both sessions' entities in a unified view with owner badges
- [ ] Comments/approvals/replies route to the correct session based on entity lease
- [ ] Lease expiry releases an orphaned entity when its owning session crashes (test: kill -9 a shim, verify lease frees within N minutes)
- [ ] Existing single-session usage continues to work with no config changes (backward compat)
- [ ] `/dashboard status`, `/dashboard share`, `/dashboard logs` skills all work against daemon mode

## Test Plan

- **Unit**: Lease acquire/release/expiry logic, session registry CRUD, IPC message framing
- **Integration**: Spawn daemon + 2 shims, simulate concurrent `publishEvent` and `onChannelMessage`, verify routing
- **E2E**: Start 2 real CC sessions in the same repo, dispatch FOs against different entities, verify UI shows both, verify comments reach the right session
- **Regression**: Single-session mode (no daemon) still passes existing dashboard tests

## Related Work

- **#007** (`dashboard-standalone-plugin.md`) — extracting dashboard into its own plugin. This entity builds on that separation; the daemon would live inside the dashboard plugin.
- `dashboard-warroom-identity.md` — share-link identity model may overlap with session registry.
- `dashboard-snapshot-event-store.md` — event store changes are daemon-local by definition.

## Notes

This entity was captured during a debugging session for a `EADDRINUSE` conflict on port 8420 between two CC sessions in the `recce-cloud-infra` repo. Short-term workaround applied: added `--port 8888` to that project's `.mcp.json` args so it runs on a different port from the other session. This unblocks day-to-day work but does not solve the underlying architectural limit — which is what this entity is for.
