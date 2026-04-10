---
id: 049
title: "Next.js + Bun + compile + fmodel spike"
status: shipped
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-10
completed: 2026-04-10
verdict: "Partial pass: Next.js + Bun + SSE + fmodel-ts all work end-to-end. Single-binary via bun --compile is ruled out (structural conflict with Next.js standalone). Distribution pivots to shipping .next/standalone/ directory + wrapper CLI."
score: 1.0
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Problem

The spacebridge architecture depends on Next.js App Router running on Bun runtime and (originally) compiling to a standalone binary via `bun build --compile`. This combination was untested. If the stack doesn't work, the Phase F UI strategy needs a fallback.

## Scope

- Create a hello-world-scale Next.js App Router application running on Bun
- Implement a minimal SSE endpoint via Next.js Route Handler (streaming `Response`)
- Add a minimal fmodel decider (pure function, command → event) to validate the pattern
- Attempt to compile the application to a standalone binary via `bun build --compile`
- Execute the result and verify: page renders, SSE streams events, fmodel decider runs
- Document findings: what works, what doesn't, what requires workarounds

## Acceptance Criteria

- [x] Next.js App Router page renders correctly when served by Bun runtime
- [x] SSE endpoint streams events to a client through Next.js Route Handler
- [x] fmodel decider pattern (command → events, pure function) works within the Bun/Next.js environment
- [ ] ~~`bun build --compile` produces a single executable that serves the app without external dependencies~~ **Ruled out** — structural conflict, see Results
- [x] Standalone directory (`.next/standalone/`) run via `bun run ./server.js` serves both the page and SSE endpoint correctly (replacement for the single-binary AC)
- [x] Spike results documented for Phase F planning

## Results

Executed 2026-04-10 in throwaway directory `~/tmp/spacebridge-spike/` (deleted after spike).

**Stack**: Next.js 16.2.2, React 19, `@fraktalio/fmodel-ts@2.1.1`, Bun 1.3.9, macOS arm64.

### Verified working

| # | Validation | Result |
|---|---|---|
| V1 | `bun run --bun next dev` | Ready in 374ms (Turbopack) |
| V2 | SSE Route Handler streaming (`new ReadableStream` + `text/event-stream`) | curl received tick events at 1Hz, auto-close after 10 ticks |
| V3 | fmodel-ts `Decider<Cmd, State, Event>` with pure `decide` + `evolve` | `IncrementCounter(5)` → `CounterIncremented(5)` → `{count: 5}` PASS |
| V4-build | `bun run --bun next build` with `output: 'standalone'` | Produced `.next/standalone/server.js` (~7KB) + `node_modules/` + `.next/server/` |
| V5 | `bun run ./server.js` inside standalone dir | Ready in 0ms, page renders, SSE works |

### Ruled out: `bun build --compile`

Compiled 57MB binary successfully, but runtime failed:

1. **First failure**: `ENOENT: no such file or directory, chdir '/$bunfs/root/'` — Next.js standalone calls `process.chdir(__dirname)`. In a Bun-compiled binary, `__dirname` resolves to the virtual filesystem path `/$bunfs/root/`, which is not a real directory and cannot be the target of `chdir`.
2. **After patching chdir with try/catch**: `Cannot find package 'next' from '/$bunfs/root/spacebridge-spike'`. `bun build --compile` only bundles modules directly imported by the entry file; it does not walk sibling `node_modules/`. Next.js standalone relies on runtime file resolution, which is structurally incompatible with single-binary compilation.

**Root cause**: Next.js standalone = "server.js + adjacent node_modules + runtime resolution". Bun compile = "entry file + all transitive imports bundled into one blob". Different file-layout assumptions.

### New distribution path

Ship the `.next/standalone/` directory (server.js + node_modules + .next) as the distributable unit. A thin `spacebridge` CLI wrapper (bun script) dispatches subcommands and invokes `bun run server.js` for `spacebridge start`. This is the standard Next.js self-hosting pattern.

Post-build step required: copy `.next/static/` into `.next/standalone/.next/static/` and `public/` into `.next/standalone/public/` (Next.js standalone does not auto-copy these; documented in Next.js docs).

### Follow-ups triggered

- Design doc §3.1 distribution row updated (single binary → standalone directory)
- Design doc §3.2 rewritten as "spike results" with full V1-V5 table
- Design doc §9 adds D10 (directory vs single-binary decision rationale)
- Design doc §10 OQ-7 resolved
- Entity 059 re-scoped from "bun compile single-binary distribution" to "standalone directory distribution + wrapper CLI"
- Dev workflow unchanged

## References

- Design doc §3.1 (Runtime and framework): updated post-spike
- Design doc §3.2 (Spike results): full V1-V5 findings
- Design doc §9 D10: directory-not-binary decision rationale
- Design doc OQ-7: resolved 2026-04-10
