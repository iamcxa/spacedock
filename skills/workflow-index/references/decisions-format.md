# DECISIONS.md Format Specification

DECISIONS.md is an append-only log of captain-approved decisions during the build flow. Decisions are never deleted; they are superseded when replaced by newer decisions. This preserves full audit history.

## File Location

`docs/build-pipeline/_index/DECISIONS.md`

## Entry Structure

Each decision is a `## D-{entity-slug}-{sequence}` heading followed by structured fields. Sequence starts at 1 per entity and increments for each decision sourced from that entity.

```markdown
## D-046-1: Filter UI is client-side

**Source**: entity 046, clarify stage, 2026-04-10
**Scope**: tools/dashboard/static/app.js
**Rationale**: Client-side filter keeps server load low; user count too small for server-side
**Related entities**: [046, 052, 059]
**Status**: 🟢 active
**Supersedes**: none

---
```

## Required Fields

Every decision entry must include:

| Field | Format | Purpose |
|-------|--------|---------|
| Heading | `## D-{slug}-{seq}: {short title}` | Stable ID used for cross-referencing and supersede tracking |
| **Source** | `entity {slug}, {stage} stage, {YYYY-MM-DD}` | Where the decision originated |
| **Scope** | File path or paths the decision applies to | Enables reverse lookup by file |
| **Rationale** | 1-2 sentences of reasoning | Future readers need to understand WHY |
| **Related entities** | `[slug, slug, ...]` | Entities affected by or referencing this decision |
| **Status** | `🟢 active` or `🔴 superseded by D-XXX-Y` | Current state |
| **Supersedes** | `none` or `D-XXX-Y` | Previous decision this replaces, if any |

## Supersede Mechanism

When a new decision replaces an older one:

1. Write the new decision entry with `Supersedes: D-{old-id}`.
2. Edit the old entry's Status field: `Status: 🔴 superseded by D-{new-id}`.
3. Do NOT remove the old entry. It remains in the file for audit history.
4. Commit both changes in the same commit: `docs(decisions): supersede D-046-1 with D-052-1`.

## Rules for Reads

When `read` mode queries DECISIONS.md:
- Query by file path → find entries whose Scope contains the path, return only those with Status 🟢 active by default (include 🔴 superseded if caller explicitly requests history).
- Query by entity slug → find entries where Source entity matches OR Related entities contains the slug.

## Rules for Writes

- Always append new entries at the end of the file, before any trailing `---` separator.
- Never reorder existing entries.
- When updating a Supersedes target's Status, use Edit with specific old/new string match — do not rewrite the whole entry.
