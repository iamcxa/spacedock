---
name: workflow-index
description: Read, write, and check the workflow-level index artifacts (CONTRACTS.md, DECISIONS.md, INDEX.md) that track cross-entity coherence. Three modes — read (query by file or entity), write (append entries after entity stage changes), check (plan-checker Dim 7 cross-entity coherence validation). Used by build-plan's plan-checker, stage ensigns that need to look up prior decisions, and the workflow-index-maintainer mod.
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
- **Commits are separate** — Workflow-index writes get their own commit (`chore(index): update CONTRACTS for entity-046`), never bundled with code changes.
- **Idempotent reads** — `read` mode never mutates state. Safe to call repeatedly.
