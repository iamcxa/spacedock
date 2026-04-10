---
id: 059
title: "Standalone directory distribution + wrapper CLI"
status: draft
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md); scope revised 2026-04-10 after entity 049 spike
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
depends-on: "all prior (049-058)"
---

## Problem

Spacebridge needs a distribution format that (a) includes daemon + shim + Next.js UI + Drizzle schema + fmodel core, (b) installs cleanly via the Claude Code plugin mechanism, and (c) exposes a single `spacebridge` CLI with subcommands (`start`, `stop`, `status`, `mcp`, `share`). Entity 049 spike ruled out `bun build --compile` single-binary due to structural conflict with Next.js standalone output — this entity adopts the standard Next.js self-hosting pattern instead.

## Scope

- Build pipeline: `bun run --bun next build` with `output: 'standalone'` produces `.next/standalone/` containing `server.js`, bundled `node_modules/`, and `.next/server/`
- Post-build step: copy `.next/static/` into `.next/standalone/.next/static/` and `public/` into `.next/standalone/public/` (required for Next.js standalone asset serving)
- Thin `spacebridge` CLI wrapper (bun script) that dispatches subcommands:
  - `spacebridge start [--port 8420] [--postgres URL]` → `bun run /path/to/standalone/server.js` with env vars
  - `spacebridge stop` → locate daemon via pidfile, send SIGTERM
  - `spacebridge status` → read pidfile, check socket, print summary
  - `spacebridge mcp` → start the MCP stdio shim (not the daemon); CC invokes this via `.mcp.json`
  - `spacebridge share [--entity SLUG]` → create tunnel + print share URL
- Plugin manifest wiring: Claude Code plugin installer extracts the standalone dir + wrapper to a stable path
- Cross-platform: macOS (arm64, x64), Linux (x64). `.next/standalone/` is platform-agnostic JS; only the wrapper entry needs to find the right `bun` binary
- Total install size target: < 150MB (Next.js standalone + node_modules is typically 80-120MB)
- Verify all features work from the packaged distribution: daemon boots, UI serves, MCP shim connects, SSE streams, IPC routes, tunnel opens
- Release automation: CI builds + packages on tag push

## Acceptance Criteria

- [ ] `bun run --bun next build` with `output: 'standalone'` produces a valid `.next/standalone/` directory
- [ ] Post-build static/public copy step is scripted and idempotent
- [ ] `spacebridge` CLI wrapper implemented as a bun script with all 5 subcommands
- [ ] `spacebridge start` boots the daemon on port 8420 (or `--port` override) and the UI is reachable
- [ ] `spacebridge mcp` runs the MCP stdio shim for CC `.mcp.json` consumption
- [ ] `spacebridge stop` and `spacebridge status` work against a running daemon
- [ ] Packaged distribution works end-to-end: install via Claude Code plugin mechanism, launch, all features functional
- [ ] Install size documented and under 150MB target
- [ ] Release automation: CI builds + uploads distribution on tag push
- [ ] Upgrade path documented: how a user moves from an old version to a new one without losing their spacebridge data (`~/.spacedock/spacebridge.db`)

## References

- Design doc §3.1 (Runtime and framework): distribution row (post-spike update)
- Design doc §3.2 (Spike results): why single-binary was ruled out
- Design doc §9 D10: decision rationale for directory-not-binary
- Entity 049 (shipped 2026-04-10): V4/V5 results proving standalone directory run path
