---
id: 052
title: "L2 auto-fork daemon lifecycle"
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
scale: Small
project: spacedock
depends-on: [051]
---

## Directive

> Implement the L2 auto-fork daemon lifecycle for spacebridge. The first shim to start checks for an existing daemon socket; if absent, it forks a detached daemon process, waits for the socket, then connects. A lock file prevents two simultaneous shims from both forking daemons. Includes daemon shutdown policy (last shim disconnect vs sticky) and `spacebridge start/stop/status` CLI subcommands. Entity 051 provides the unix socket IPC layer; this entity manages the daemon process lifecycle around it.

## Captain Context Snapshot

- **Repo**: main @ 49562b7
- **Session**: SO pipeline session. Entity 050 (plugin skeleton) in review, entity 051 (unix socket IPC) clarified and ready for FO. Continuing Tier 1 chain: 050→051→052→053.
- **Domain**: Runnable/Invokable, Behavioral/Callable, Organizational/Data-transforming
- **Related entities**: 051 -- Unix socket IPC + ChannelProvider client/server (clarify/ready), 050 -- Spacebridge plugin skeleton + Drizzle LCD schema (plan/review), 053 -- Next.js warroom SSE feed (draft, depends on 052)
- **Created**: 2026-04-13T08:30:00+08:00

## Brainstorming Spec

**APPROACH**: Implement the L2 auto-fork daemon lifecycle in two parts: **shim-side auto-fork** and **daemon-side entry/CLI**. The shim startup sequence (in `spacebridge/src/shim.ts` or similar) follows the design doc §4.2 pseudocode exactly: attempt `connect(~/.spacedock/spacebridge.sock)` → on ECONNREFUSED/ENOENT, acquire `flock(~/.spacedock/spacebridge.lock)` → re-check socket under lock → if still absent, `spawn()` the daemon as detached (`stdio: 'ignore'`, `.unref()`) → `wait_for_socket(path, timeout: 5s)` with polling → release lock → connect. The daemon invocation is resolved at runtime: if `SPACEBRIDGE_DEV=1` or no compiled binary detected, use `['bun', 'spacebridge/bin/daemon.ts', 'start']`; otherwise `['spacebridge', 'start']`. The daemon entry point (`spacebridge/bin/daemon.ts`) parses `start|stop|status` subcommands. `start` boots the unix socket server (from entity 051), writes a PID file at `~/.spacedock/spacebridge.pid`, and enters the event loop. `stop` reads the PID file and sends SIGTERM. `status` reads PID file + queries socket for connected session count and uptime. Shutdown policy: daemon runs sticky by default (survives last shim disconnect), stoppable via `spacebridge stop` or SIGTERM. An optional `SPACEBRIDGE_AUTO_STOP=1` env var enables auto-stop-on-last-disconnect for CI/testing. `SPACEBRIDGE_NO_AUTOFORK=1` disables shim auto-fork entirely (for development where daemon is started manually).

**ALTERNATIVE**: Use launchd/systemd user agent (L3 model) -- daemon auto-starts on user login via a plist/service file, always-available without any CC session. -- D-01 Rejected: adds platform-specific install complexity (plist for macOS, systemd for Linux, nothing for Windows), introduces an onboarding step ("install the service"), and violates the "zero-token UI, zero onboarding" principle. L2 auto-fork achieves the same UX with no install step. Design doc §4.1 explicitly chose L2 over L3 for these reasons. Migration path to L3 is purely an install-script change if needed later.

**GUARDRAILS**:
- Socket path: `~/.spacedock/spacebridge.sock` (design doc §4.2, inherited from entity 051)
- Lock file: `~/.spacedock/spacebridge.lock` using `flock` (design doc §4.2)
- Daemon invocation resolution: `SPACEBRIDGE_DEV` env var or sibling binary detection (design doc §4.2)
- Test isolation: use temp directories for socket/lock/pid files in tests, never production paths (MEMORY.md test isolation pattern)
- Entity 051 owns the socket server/client implementation; this entity only manages the process lifecycle (fork, wait, stop, status) around 051's server
- Node.js `net` module for socket operations (entity 051 A-5 decision: Bun native API underdocumented, net module is stable)

**RATIONALE**: L2 auto-fork is the only lifecycle model that satisfies both the fixed-port requirement (daemon owns port 8420 and socket path) and zero-onboarding (no manual `start` needed, no launchd install). The double-check-under-lock pattern from design doc §4.2 is a well-known concurrency primitive (compare: singleton daemon patterns in Docker, PostgreSQL pg_ctl, Redis sentinel). The shim-side implementation is ~50 lines of startup logic; the daemon CLI is ~30 lines of subcommand routing. The sticky-by-default shutdown policy matches user expectation: once the daemon is up, it stays up across CC sessions, avoiding repeated cold-start latency. The auto-stop option for CI prevents zombie daemons in test environments.

## Acceptance Criteria

- Given no daemon running (no socket file exists), when the first shim starts, then it acquires the lock file, forks a detached daemon process, waits for the socket to appear (≤5s), releases the lock, and connects to the daemon (how to verify: `bun test` -- start shim with no daemon, assert PID file created, socket file exists, shim connected)
- Given a shim auto-forking a daemon, when a second shim starts within 100ms, then it blocks on the lock file, finds the daemon already running after lock acquisition, and connects without spawning a second daemon (how to verify: `bun test` -- race two shim startups with shared temp dir, assert exactly one daemon PID, both shims connected)
- Given a running daemon, when the shim that started it exits (CC session ends), then the daemon continues running (sticky default) and subsequent shims connect without re-forking (how to verify: `bun test` -- start shim, disconnect, start second shim, assert same daemon PID, no new fork)
- Given `spacebridge status` invoked, when a daemon is running, then it reports daemon PID, uptime, and count of connected sessions (how to verify: `bun test` -- start daemon, connect 2 shims, run status subcommand, assert output includes PID, uptime > 0, sessions = 2)
- Given `spacebridge stop` invoked, when a daemon is running, then it sends SIGTERM, daemon shuts down gracefully, socket and PID files are cleaned up (how to verify: `bun test` -- start daemon, run stop, assert PID file removed, socket file removed, process exited)
- Given `SPACEBRIDGE_NO_AUTOFORK=1` set, when a shim starts with no daemon running, then it skips auto-fork and reports an error (how to verify: `bun test` -- set env var, start shim, assert no fork attempt, error logged)
- Given `SPACEBRIDGE_AUTO_STOP=1` set, when the last connected shim disconnects, then the daemon shuts down automatically (how to verify: `bun test` -- set env var, start daemon via shim, disconnect all shims, assert daemon process exits within 5s)

## References

- Design doc §4.1 (L2 auto-fork daemon lifecycle): lifecycle options analysis and L2 choice rationale
- Design doc §4.2 (Auto-fork implementation sketch): pseudocode for the startup sequence
- Entity 051 (clarify/ready): unix socket IPC + ChannelProvider -- provides the socket server this entity manages
- Entity 050 (plan/review): plugin skeleton -- directory structure where daemon code lives (`spacebridge/` inside spacedock)
- Entity 051 A-5 decision: Node.js net module for socket operations (captain-corrected from Bun native API)
