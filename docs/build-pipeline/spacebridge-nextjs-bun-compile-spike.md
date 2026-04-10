---
id: 049
title: "Next.js + Bun + compile + fmodel spike"
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
---

## Problem

The spacebridge architecture depends on Next.js App Router running on Bun runtime and compiling to a standalone binary via `bun build --compile`. This combination is not well-trodden — Next.js on Bun has edge cases (webpack loaders, SSR APIs), and wiring `next build --output standalone` into `bun build --compile` requires manual assembly of assets and server entry resolution. If this stack doesn't work, the entire Phase F UI strategy needs a fallback (raw Bun.serve + React SPA bundle).

## Scope

- Create a hello-world-scale Next.js App Router application running on Bun
- Implement a minimal SSE endpoint via Next.js Route Handler (streaming `Response`)
- Add a minimal fmodel decider (pure function, command → event) to validate the pattern
- Compile the application to a standalone binary via `bun build --compile`
- Execute the compiled binary and verify: page renders, SSE streams events, fmodel decider runs
- Document findings: what works, what doesn't, what requires workarounds

## Acceptance Criteria

- [ ] Next.js App Router page renders correctly when served by Bun runtime
- [ ] SSE endpoint streams events to a browser client through Next.js Route Handler
- [ ] fmodel decider pattern (command → events, pure function) works within the Bun/Next.js environment
- [ ] `bun build --compile` produces a single executable that serves the app without external dependencies
- [ ] Compiled binary serves both the page and SSE endpoint correctly
- [ ] If spike fails: documented fallback path (Bun.serve + React SPA) with specific failure reasons
- [ ] Spike results documented for Phase F planning

## References

- Design doc §3.1 (Runtime and framework): technology stack choices and rationale
- Design doc §3.2 (Bun + Next.js + `--compile` risk): known concerns and mitigation strategy
- Design doc OQ-7: feasibility question this spike resolves
