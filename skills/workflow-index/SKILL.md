---
name: workflow-index
description: Use whenever the user mentions CONTRACTS.md, DECISIONS.md, INDEX.md, cross-entity coherence, workflow-level index, plan-checker Dimension 7, or needs to look up which entity is in-flight, planned, or recently shipped on a specific file path under tools/dashboard/ or anywhere in the spacedock build-pipeline. Make sure to use this skill when an entity advances stages and its file touches need recording in CONTRACTS, when a captain decision in clarify needs persisting as a D-{slug}-{n} entry in DECISIONS.md, when INDEX.md is stale and needs rebuilding (FO startup or idle hooks), when a plan-checker is running Dimension 7 cross-entity coherence validation on a proposed plan's files_modified list, or when looking up prior decisions for a specific file. Trigger phrases include 'rebuild INDEX', 'update CONTRACTS', 'append contract', 'capture decision', 'D-046-1', 'workflow index', 'cross-entity coherence', 'in-flight on', 'recently shipped on', 'plan-checker Dim 7'. Three modes (read/write/check) — see SKILL.md body for routing.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
---

# workflow-index

Shared utility skill for maintaining and querying workflow-level coherence artifacts under `docs/build-pipeline/_index/`. Three modes determine behavior:

| Mode | Caller | Purpose |
|------|--------|---------|
| `read` | Any ensign, plan-checker, mods | Query CONTRACTS.md or DECISIONS.md by file path or entity slug. Returns structured matches. |
| `write` | Stage ensigns at transitions, workflow-index-maintainer mod | Append new entries to CONTRACTS.md / DECISIONS.md. Update INDEX.md. Preserves existing entries; never rewrites unrelated sections. |
| `check` | build-plan's plan-checker (Dimension 7 — Cross-Entity Coherence) | Given a proposed plan's `files_modified` list, find other entities touching the same files. Classify as in-flight (blocker) or recent (warning). Return structured issue list. |

## Mode Dispatch

The caller must specify `mode` in the invocation prompt. Based on mode, read the corresponding reference file for detailed instructions:

- `mode: read` → follow `references/read-mode.md`
- `mode: write` → follow `references/write-mode.md`
- `mode: check` → follow `references/check-mode.md`

Each reference file describes the expected inputs, processing steps, and output format for that mode.

## File Format References

The canonical file formats are documented in:

- `references/contracts-format.md` — CONTRACTS.md structure
- `references/decisions-format.md` — DECISIONS.md structure including supersede semantics

These formats are the contract between workflow-index (writer) and callers (readers). Changes require updating both this skill and all consumers (plan-checker, mods).

## Rules

- **Never rewrite unrelated sections** — Edit the minimal region required by the operation. Use Edit with specific `old_string` / `new_string` matches, not wholesale Write.
- **Decisions are append-only** — Never delete a decision entry. Use supersede mechanism (set Status to 🔴 superseded, reference new decision in Supersedes field).
- **Commits are separate from code changes** — Workflow-index writes always get their own commit with a `chore(index):` or `docs(decisions):` prefix, never bundled with feature code. Commit granularity is **one commit per write operation invocation** — `update-status` → one commit per file, `update-status-bulk` → one commit per entity transition. See `references/write-mode.md` for per-operation commit templates.
- **Idempotent reads** — `read` mode never mutates state. Safe to call repeatedly.
