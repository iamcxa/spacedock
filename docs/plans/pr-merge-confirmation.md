---
id: 069
title: pr-merge mod shows draft PR and gets captain approval before pushing
status: ideation
source: https://github.com/clkao/spacedock/issues/10
started: 2026-03-29T03:12:00Z
completed:
verdict:
score: 0.85
worktree:
issue: "#10"
pr:
---

The pr-merge mod's merge hook pushes and creates a PR immediately after validation gate approval without confirmation. It should show a draft PR summary (title, branch, changes) and wait for captain approval before executing, matching the issue filing guardrail pattern.

One file change: `mods/pr-merge.md` merge hook section.
