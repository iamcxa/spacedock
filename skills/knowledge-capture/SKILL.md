---
name: knowledge-capture
description: Two-mode shared skill for capturing and applying knowledge from workflow findings. Mode 'capture' (called by stage ensigns) classifies findings, auto-appends D1 skill-level patterns, and stages D2 project-level candidates to the entity body. Mode 'apply' (called by First Officer in --agent context) reads pending candidates, presents each to captain via AskUserQuestion, and writes approved ones to the target CLAUDE.md or review-lessons.md. Solves the ensign-subagent AskUserQuestion limitation by splitting capture (no captain) from apply (captain-facing).
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# knowledge-capture

Shared utility skill for preserving knowledge across workflow runs. Distilled from `kc-pr-flow`'s knowledge-capture mechanism (D1/D2 dimensions) and generalized for any stage ensign to call.

## Two Modes

| Mode | Caller | Context | Captain Interaction |
|------|--------|---------|---------------------|
| `capture` | Any stage ensign (research, plan, execute, quality, review, uat) | Ensign subagent | None — findings staged only |
| `apply` | First Officer | FO `--agent` context | Yes — AskUserQuestion per candidate |

Callers MUST specify `mode: capture` or `mode: apply` in the invocation prompt. The skill's entry point dispatches to the corresponding reference file.

## Dimensions

**D1 — Skill-level patterns, auto-append, no gate**
General workflow patterns discovered during execution. Written to plugin-internal reference files (e.g., `learned-patterns.md`). Makes the plugin smarter for future runs. No captain confirmation required.

**D2 — Project-level rules, gated + staged + applied**
Project-specific rules or gotchas that should live in CLAUDE.md or review-lessons.md of the reviewed project. Requires:
1. Severity gate pass (CRITICAL/HIGH with DOC/NEW classification, or MEDIUM with 2+ recurrence)
2. Three-question test pass (recurs? non-obvious? ruleable?)
3. Captain confirmation (in apply mode only)

See `references/gates.md` for the full gate logic.

## Mode Dispatch

- `mode: capture` → follow `references/capture-mode.md`
- `mode: apply` → follow `references/apply-mode.md`

Both modes share:
- `references/classifier.md` — finding classification (root + severity)
- `references/gates.md` — D2 severity gate and 3-question test
- `references/targets.md` — multi-level CLAUDE.md target selection

## Critical Invariants

- **Capture mode never calls AskUserQuestion** — ensigns are subagents without native UI access. D2 candidates are staged in the entity body's `## Pending Knowledge Captures` section instead.
- **Apply mode is called only by FO** — FO runs in `--agent` mode where native AskUserQuestion works. This is the only correct caller for mode=apply.
- **Append-only D1 writes** — plugin reference files grow monotonically. Never rewrite or delete D1 entries.
- **Separate commits for D2 writes** — D2 apply always commits as its own change, never bundled with other work.
