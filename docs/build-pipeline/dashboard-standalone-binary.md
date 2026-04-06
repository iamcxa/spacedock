---
id: 019
title: Dashboard Standalone Binary — bun build --compile for Zero-Dependency Distribution
status: explore
source: captain direction (multi-repo ctl.sh discussion)
started:
completed:
verdict:
score: 0.8
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- None (dashboard server already functional)

## Brainstorming Spec

APPROACH:     Use `bun build --compile` to produce a standalone executable for the dashboard server, eliminating the bun runtime requirement for end users. ctl.sh gains binary-first detection: check for prebuilt binary, fall back to `bun run` if absent. Static assets (9 files: HTML, CSS, JS) need a resolution strategy since `import.meta.dir` changes meaning in compiled mode.
ALTERNATIVE:  (A) Rewrite server to Node-compatible (rejected: Medium-Large scope, replaces 6+ Bun APIs for marginal benefit). (B) Ship bun as a bundled dependency (rejected: ~50MB redundant if user already has bun). (C) Docker image (rejected: overkill for a dev dashboard).
GUARDRAILS:   `bun run` path must remain functional (compile is optional, not mandatory). Static file resolution must work in both modes. No changes to server API or channel protocol. Cross-platform builds (macOS arm64/x64, Linux) are stretch — single-platform first.
RATIONALE:    Spacedock plugin users may not have bun installed. A standalone binary (~50MB) makes the dashboard zero-dependency. The ctl.sh fallback pattern (binary → bun run) keeps development workflow unchanged while improving distribution.

## Key Technical Challenges

1. `import.meta.dir` in compiled binary points to binary location, not source — `static/` folder resolution breaks
2. Options: (a) `--static-dir` CLI flag with default sibling lookup, (b) embed static assets at compile time, (c) both
3. channel.ts has same `import.meta.dir` usage — needs same fix
4. Build script needs to output to `tools/dashboard/dist/` with appropriate naming

## Acceptance Criteria

- `bun build --compile` produces working standalone binary
- Binary serves dashboard correctly (static files, API, WebSocket)
- ctl.sh checks for binary first, falls back to `bun run`
- Static file resolution works in both compiled and source modes
- `ctl.sh start` works from any working directory (existing fix preserved)
