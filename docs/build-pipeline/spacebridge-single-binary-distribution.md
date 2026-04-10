---
id: 059
title: "bun compile single-binary distribution"
status: draft
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
depends-on: "all prior (049-058)"
---

## Problem

For distribution and ease of installation, the entire spacebridge plugin (daemon, shim, CLI, Next.js UI, Drizzle schema) should compile into a single standalone binary via `bun build --compile`. This eliminates the need for users to install Bun, Node, or manage dependencies — they download one file and it works. Entity 049's spike validated the basic feasibility; this entity applies it to the full production codebase.

## Scope

- Configure `bun build --compile` for the full spacebridge codebase
- Handle Next.js `output: 'standalone'` integration with Bun's compile step
- Bundle static assets (React UI build output) into the compiled binary
- Single entry point that dispatches to subcommands: `spacebridge start`, `spacebridge stop`, `spacebridge status`, `spacebridge mcp`, `spacebridge share`
- Cross-platform builds: macOS (arm64, x64), Linux (x64) at minimum
- Binary size optimization: tree-shake unused dependencies
- Verify all features work from compiled binary (daemon, shim, UI, SSE, IPC, tunnel)
- CI/CD pipeline for building and publishing binaries

## Acceptance Criteria

- [ ] `bun build --compile` produces a single executable for each target platform
- [ ] Compiled binary serves Next.js UI correctly (pages, static assets, API routes)
- [ ] Daemon mode works from compiled binary (auto-fork, socket, SSE)
- [ ] Shim mode works from compiled binary (MCP stdio, IPC to daemon)
- [ ] All CLI subcommands functional from compiled binary
- [ ] Binary size is reasonable (< 100MB target, document actual size)
- [ ] No external runtime dependencies required to run the binary
- [ ] Release automation: CI builds binaries on tag push

## References

- Design doc §3.1 (Runtime and framework): `bun build --compile` as distribution choice
- Entity 049 (spike): validates feasibility of Next.js + Bun + compile combination
