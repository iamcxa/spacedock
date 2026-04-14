---
id: 059
title: "Standalone directory distribution + wrapper CLI"
status: uat
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md); scope revised 2026-04-10 after entity 049 spike
started: 2026-04-14T09:00:00+08:00
worktree: .worktrees/spacedock-ensign-spacebridge-standalone-dir-distribution
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: [053]
---

## Directive

> Spacebridge needs a distribution format that (a) includes daemon + shim + Next.js UI + Drizzle schema + fmodel core, (b) installs cleanly via the Claude Code plugin mechanism, and (c) exposes a single `spacebridge` CLI with subcommands (`start`, `stop`, `status`, `mcp`, `share`). Entity 049 spike ruled out `bun build --compile` single-binary due to structural conflict with Next.js standalone output -- this entity adopts the standard Next.js self-hosting pattern instead.

## Captain Context Snapshot

- **Repo**: main @ a3d03e4
- **Session**: SO pipeline for spacebridge entities. 056/053/054/057 context ready. 059 next.
- **Domain**: Runnable/Invokable, Readable/Textual
- **Related entities**: 049 -- Next.js + Bun spike (shipped -- V4/V5 proved standalone dir run path), 053 -- War room + SSE (draft, context ready -- O-1: Next.js at `spacebridge/ui/`, O-2: SSE polls events table), 052 -- Daemon lifecycle (shipped -- L2 auto-fork, daemon.ts subcommand routing), 058 -- Share tunnel rebuild (draft, depends on 059), 060 -- Cutover delete static UI (draft, depends on 059)
- **Created**: 2026-04-13T18:50:00+08:00

## Brainstorming Spec

**APPROACH**: Create a thin `spacebridge/bin/cli.ts` as the unified CLI entry point (✓ confirmed by explore: daemon.ts:258-268 already has subcommand routing for start/stop/status via `Bun.argv[2]` -- cli.ts adds mcp/share and delegates daemon commands) -- a bun script that parses `process.argv` and dispatches to existing modules. The 5 subcommands map to existing infrastructure: (1) `start` delegates to `bin/daemon.ts` cmdStart (✓ confirmed by explore: daemon.ts:31 `cmdStart()` fully implemented -- socket server, PID file, SIGTERM/SIGINT handlers, auto-stop timer); (2) `stop` reads the PID file from `~/.spacedock/spacebridge.pid` via `readPidFile()` (✓ confirmed by explore: daemon.ts:132 `cmdStop()` already implemented -- reads PID, sends SIGTERM, cleans up socket); (3) `status` reads the PID file, checks process liveness via `isProcessAlive()`, and pings the unix socket for uptime/session count (✓ confirmed by explore: daemon.ts:160 `cmdStatus()` fully implemented -- uses `__status` RPC method at daemon.ts:67 to query live daemon state); (4) `mcp` starts the MCP stdio shim (✓ confirmed by explore: channel-provider-bridge.ts exists, auto-fork.ts:62 `autoForkDaemon()` is the shim-side startup logic); (5) `share` creates a tunnel for remote access (entity 058 scope -- 059 stubs it with a "not yet implemented" message). The build pipeline is a `scripts/build.sh` that: (a) runs `bun run --bun next build` in `spacebridge/ui/` (entity 053's Next.js app, `output: 'standalone'` in `next.config.ts`), (b) copies `ui/.next/static/` into `ui/.next/standalone/.next/static/` and `ui/public/` into `ui/.next/standalone/public/` (required post-build step proven by entity 049 V4-V5), (c) validates the result by checking `server.js` exists in standalone dir. Plugin manifest: update `.claude-plugin/plugin.json` to wire `spacebridge` as the CLI command (bin entry) so Claude Code's plugin installer registers the command. CI: a GitHub Actions workflow triggered on tag push (`v*`) that runs the build script and packages the result as a release artifact.

**ALTERNATIVE**: Use a shell script (`#!/bin/bash`) wrapper instead of a bun script (`#!/usr/bin/env bun`) for the CLI entry point. -- D-01 Rejected: shell scripts lose type safety, IDE support, and import access to existing TypeScript modules (daemon/pid.ts, daemon/lock.ts). The existing daemon.ts is already a bun script. Consistency favors bun. The only advantage (no bun runtime dependency) is irrelevant because the entire stack requires bun.

**GUARDRAILS**:
- `.next/standalone/` is the distribution unit -- never `bun build --compile` (design doc D10, entity 049 ruling) (✓ confirmed by explore: design doc §3.2:202-207 documents structural conflict)
- Post-build static/public copy is required for Next.js standalone asset serving (entity 049 V4-V5) (✓ confirmed by explore: entity 053 A-6 already confirmed this step)
- `~/.spacedock/spacebridge.db` is the single DB path -- never bundled or copied during install, user data persists across upgrades (design doc §4.5) (✓ confirmed by explore: db.ts:116 `defaultDbPath()` returns `~/.spacedock/spacebridge.db`)
- daemon.ts already has start/stop/status subcommand routing -- 059 wraps it, does not reimplement (✓ confirmed by explore: daemon.ts:258-268 `Bun.argv[2]` routing verified)
- Plugin manifest `.claude-plugin/plugin.json` already exists -- modify, don't recreate (✓ confirmed by explore: plugin.json exists with basic metadata, no bin/mcp entries yet)

**RATIONALE**: The CLI wrapper is deliberately thin -- most functionality already exists in daemon.ts (start/stop/status), channel-provider-bridge.ts (mcp), and will exist in entity 058 (share). Entity 059 provides the "single entry point" UX and the build/distribution pipeline that packages everything into an installable unit. The standard Next.js self-hosting pattern (ship `.next/standalone/` directory) was chosen over single-binary after entity 049 proved `bun build --compile` has structural conflicts with Next.js (virtual-fs chdir failure, no sibling node_modules bundling). The Claude Code plugin mechanism already handles "install a directory" naturally -- there is no UX regression from not shipping a single file (design doc D10).

## Acceptance Criteria

- [ ] Given the CLI entry point at `spacebridge/bin/cli.ts`, when `bun run bin/cli.ts start` is executed, then the daemon boots on port 8420 and the UI is reachable at `http://127.0.0.1:8420/` (how to verify: run command, curl localhost:8420, assert HTML response)
- [ ] Given a running daemon, when `bun run bin/cli.ts stop` is executed, then the daemon receives SIGTERM and shuts down cleanly (how to verify: check PID file removed, port 8420 no longer bound)
- [ ] Given a running daemon, when `bun run bin/cli.ts status` is executed, then it prints daemon PID, uptime, and connected session count (how to verify: run command, assert output contains PID and uptime)
- [ ] Given `bun run bin/cli.ts mcp` is executed, when CC connects via `.mcp.json` stdio transport, then the MCP shim starts and communicates with the daemon (how to verify: check shim process starts, connects to unix socket)
- [ ] Given `bun run bin/cli.ts share` is executed, then it prints "Not yet implemented -- see entity 058" (how to verify: run command, assert message)
- [ ] Given `scripts/build.sh` is run from spacebridge/, when the build completes, then `ui/.next/standalone/server.js` exists and `ui/.next/standalone/.next/static/` contains copied assets (how to verify: run script, check file existence)
- [ ] Given the packaged distribution, when installed via Claude Code plugin mechanism, then `spacebridge start` is available as a command (how to verify: install, run `spacebridge --help`)

## References

- Design doc §3.1 (Runtime and framework): distribution row (post-spike update)
- Design doc §3.2 (Spike results): why single-binary was ruled out
- Design doc D10: decision rationale for directory-not-binary
- Entity 049 (shipped 2026-04-10): V4/V5 results proving standalone directory run path
- Entity 052 (shipped): L2 auto-fork, daemon.ts subcommand routing

## Assumptions

A-1: daemon.ts already implements cmdStart, cmdStop, cmdStatus with full functionality -- cli.ts delegates to these, does not reimplement.
Confidence: 🟢 Confident (0.95)
Evidence: daemon.ts:31 cmdStart (socket server + PID + shutdown handlers), daemon.ts:132 cmdStop (read PID + SIGTERM), daemon.ts:160 cmdStatus (__status RPC query). Line 258-268 routes via `Bun.argv[2]`.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: The MCP shim entry point is `autoForkDaemon()` from auto-fork.ts, which checks for existing daemon and starts the shim connection.
Confidence: 🟢 Confident (0.90)
Evidence: auto-fork.ts:62 `autoForkDaemon()` exported. channel-provider-bridge.ts:18 creates the ChannelProvider bridge over a SocketClient. Together they form the shim startup path for the `mcp` subcommand.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: `~/.spacedock/spacebridge.db` path persists across upgrades -- the CLI/build never touches user data.
Confidence: 🟢 Confident (0.95)
Evidence: db.ts:116 `defaultDbPath()` returns `${homedir()}/.spacedock/spacebridge.db`. This is outside the plugin install directory. Upgrades replace plugin files but not `~/.spacedock/`.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Build script runs `bun run --bun next build` from `spacebridge/ui/` with `output: 'standalone'` in next.config.ts.
Confidence: 🟢 Confident (0.90)
Evidence: Entity 049 V4-V5 verified this exact command. Entity 053 O-1 placed Next.js at `spacebridge/ui/`. Note: `ui/` directory doesn't exist yet (053 not executed) -- build script validates existence before running.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Post-build static/public copy is a 2-line `cp -r` operation that is idempotent.
Confidence: 🟢 Confident (0.95)
Evidence: Entity 049 Results section documents this step. Entity 053 A-6 confirmed it. Standard Next.js standalone deployment step.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: CLI entry point architecture -- new cli.ts vs extend daemon.ts

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| New `bin/cli.ts` that imports daemon command functions + adds mcp/share | Clean separation: daemon.ts stays the daemon process entry (auto-fork spawns it), cli.ts is the user-facing entry. Each file has one responsibility | Indirection: cli.ts imports from daemon.ts which has its own argv routing. Two entry points to maintain | Low | Recommended |
| Extend daemon.ts with mcp/share subcommands directly | One file, zero indirection, daemon.ts is already a CLI | Mixes daemon-lifecycle commands (start/stop/status run as the daemon process) with non-daemon commands (mcp runs as a shim process, share runs as a tunnel process). Auto-fork spawns daemon.ts specifically for `start` -- adding unrelated subcommands clutters | Low | Viable |
| cli.ts spawns daemon.ts as subprocess for start (no imports) | Maximum isolation -- cli.ts is pure router, daemon.ts is pure daemon | Loses type-safe import of readPidFile/isProcessAlive for stop/status -- would re-implement or shell out | Medium | Not recommended |

Return value trace: auto-fork.ts:62 `autoForkDaemon()` spawns `bin/daemon.ts start` as a detached process. If daemon.ts gains `mcp`/`share` subcommands, auto-fork still works (only calls with `start`). But cli.ts as a separate entry keeps daemon.ts focused on daemon-process-only logic. No downstream consumer breaks either way.

Design doc invariant check: §3.1:186 says "thin `spacebridge` CLI wrapper". This implies a separate wrapper, not extending daemon.ts. The design doc envisions daemon.ts as the daemon process and a wrapper as the user-facing CLI.

→ Selected: 新建 bin/cli.ts，委派 daemon 命令 + 新增 mcp/share (captain, 2026-04-13, interactive)

## Open Questions

Q-1: How does the Claude Code plugin mechanism register `spacebridge` as a CLI command available to the user?

Domain: Readable/Textual, Runnable/Invokable

Why it matters: The acceptance criterion says "spacebridge start is available as a command" after plugin install. But `.claude-plugin/plugin.json` currently has no `bin` or `commands` field -- just metadata (name, version, description). If CC plugins don't support a `bin` entry, the CLI might need to be registered via a different mechanism (e.g., the plugin's skills invoke it, or the user runs `bun spacebridge/bin/cli.ts` directly instead of a bare `spacebridge` command).

Suggested options: (a) Add a `bin` field to plugin.json (e.g., `"bin": {"spacebridge": "bin/cli.ts"}`) -- if CC plugin spec supports it, this is the cleanest path. (b) No global command -- users run `bun /path/to/spacebridge/bin/cli.ts start` directly or via an alias. Simpler, no plugin spec dependency. (c) Register as a CC skill that wraps the CLI -- `spacebridge:start`, `spacebridge:stop`, etc. Integrates with CC UX but adds skill boilerplate.

→ Answer: (b) 不註冊全域命令 -- 使用者直接執行 `bun bin/cli.ts start` 或設 alias。MCP shim 透過 .mcp.json stdio transport 啟動，不需要全域 CLI。簡單且不依賴 CC plugin spec 的 bin 欄位。 (captain, 2026-04-13, interactive)

## Stage Report: explore

- [x] Files mapped: 4 across bin, ipc, daemon, plugin-config
  bin/daemon.ts (modify -- already has start/stop/status), bin/cli.ts (new -- entry point), scripts/build.sh (new), .claude-plugin/plugin.json (modify)
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 through A-5 all Confident (0.90-0.95); daemon.ts commands, auto-fork shim, DB path, build step, post-build copy all verified
- [x] Options surfaced: 1
  O-1 CLI entry point architecture (new cli.ts vs extend daemon.ts)
- [x] Questions generated: 1
  Q-1 CC plugin mechanism for CLI command registration
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Small
  4 files across 3 layers; thin wrapper + build script + plugin config
- [x] Research dispatched: 0 researchers (skipped -- Small entity, all tech validated by entity 049 spike and existing codebase)

## Canonical References

- `spacebridge/bin/daemon.ts` -- cmdStart/cmdStop/cmdStatus implementations (A-1), argv routing at line 258 (O-1 comparison)
- `spacebridge/src/daemon/auto-fork.ts` -- autoForkDaemon() shim entry point (A-2)
- `spacebridge/src/ipc/channel-provider-bridge.ts` -- ChannelProvider RPC bridge for mcp subcommand (A-2)
- `spacebridge/src/db.ts` -- defaultDbPath() for upgrade persistence (A-3)
- `spacebridge/.claude-plugin/plugin.json` -- plugin manifest to modify (Q-1)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Small entity, no decomposition recommendation
- [x] Re-validation: 5 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  All evidence verified in current session; Small scope, no gaps from templates
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 confirmed batch
- [x] Options selected: 1 / 1
  O-1 new bin/cli.ts (recommended) -- clean separation from daemon.ts
- [x] Questions answered: 1 / 1
  Q-1 no global CLI command -- users run bun bin/cli.ts directly, MCP via .mcp.json
- [x] Open exploration: 0 gray areas surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 0 via freeform)
  Captain noted CI discussion is premature; complete on first iteration
- [x] Canonical refs added: 5
  daemon.ts, auto-fork.ts, channel-provider-bridge.ts, db.ts, plugin.json
- [x] Context status: ready
  Gate passed: all 5 assumptions confirmed, 1 option selected, 1 Q answered
- [x] Handoff mode: loose
  No auto_advance in frontmatter; captain must say "execute 059" to advance
- [x] Clarify duration: 4 questions asked, session complete
  1 batch confirmation + 1 option selection + 1 Q answer + 1 exploration iteration
