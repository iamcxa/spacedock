---
id: 018
title: Dashboard Multi-root Aggregation — 跨 Repo Workflow 聚合
status: explore
source: /build brainstorming (forge audit of build skill)
started:
completed:
verdict:
score: 0.8
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 015 (war room layout — MISSIONS 左欄已就緒，018 擴展為跨 repo 分組)

## Brainstorming Spec

APPROACH:     Extend `discoverWorkflows()` in `tools/dashboard/src/discovery.ts` to accept `roots: string[]` instead of a single `root: string`. Server startup assembles roots from: (1) `projectRoot` (existing `--root` flag), (2) `~/.claude/workflows/` (already defined in FO shared-core as a search source), (3) `SPACEDOCK_EXTRA_ROOTS` env var (comma-separated, optional). Align build skill's Phase I Step 2 search with the same three sources plus `${CLAUDE_PLUGIN_ROOT}/` for plugin-bundled workflows.

ALTERNATIVE:  (A) Symlink — `ln -s` the build-pipeline into each project. Zero code change but manual per-project setup, doesn't scale, pollutes git status. (B) `--extra-root` CLI flag — explicit but requires user to remember the flag every time. (C) Copy workflow directory into each project — duplicates state, entity divergence risk.

GUARDRAILS:   (1) `validatePath()` in server.ts currently constrains all file ops to `projectRoot` — must extend to allow paths under any discovered root, not just the primary one. Security boundary: only roots explicitly configured, no wildcard expansion. (2) Dedup: same workflow dir discovered via multiple roots should appear once. (3) Backward compatible: single-root usage (no env var, no ~/.claude/workflows/) must work identically to today. (4) Dashboard UI: workflow cards already show `dir` path — no UI change needed, the path naturally distinguishes cross-project workflows.

RATIONALE:    Symlink (A) is a workaround, not a solution — every new project needs manual setup. `--extra-root` (B) is explicit but high friction. Multi-root discovery (chosen) aligns dashboard and build skill on the same search strategy, matching FO shared-core's existing `~/.claude/workflows/` convention. One fix addresses both the build skill's cross-project gap (forge finding #3) and dashboard visibility.

## Acceptance Criteria

- `discoverWorkflows(["/project/carlove", "~/.claude/workflows/"])` returns workflows from both roots without duplicates
- Dashboard started with `--root /project/carlove` shows build-pipeline entities when `~/.claude/workflows/` contains a symlink or the workflow dir
- `SPACEDOCK_EXTRA_ROOTS=/path/to/spacedock/docs/build-pipeline` adds that single workflow to discovery
- Existing single-root behavior unchanged when env var is unset and `~/.claude/workflows/` doesn't exist
- `validatePath()` accepts file operations within any discovered workflow root, not just primary projectRoot
- Build skill Phase I Step 2 search sources aligned with dashboard discovery (same 3 sources + plugin root)
