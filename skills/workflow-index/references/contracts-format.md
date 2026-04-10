# CONTRACTS.md Format Specification

CONTRACTS.md tracks which entities have modified which files, their current pipeline stage, and the intent of each change. This enables cross-entity coherence checking — detecting when a new plan proposes modifying a file that another in-flight entity is also modifying.

## File Location

`docs/build-pipeline/_index/CONTRACTS.md`

## Structure

```markdown
# Contracts Index

<preamble — see sample below>

## Active Contracts

### {file path relative to repo root}

| Entity | Stage | Intent | Status | Last Updated |
|--------|-------|--------|--------|--------------|
| 046    | shipped | Filter logic moved to client-side | 🟢 final     | 2026-04-10 |
| 052    | execute | WebSocket reconnection on idle    | 🟡 in-flight | 2026-04-11 |

### {another file path}
...

## Recently Retired (last 30 days)

<entries aged out from Active Contracts when entity reaches shipped status for > 30 days>
```

## Rules for Section Ordering

- Active Contracts is first, Recently Retired second.
- Within Active Contracts, sections are ordered alphabetically by file path.
- Within each section, entries are ordered by entity advance date (oldest first).

## Rules for Status Column

| Emoji | Meaning |
|-------|---------|
| 🟢 final | Entity has shipped. Decision is locked in main branch. |
| 🟡 in-flight | Entity is between plan and shipped. Decision may still change. |
| 🔵 planned | Entity has a plan that will touch this file but execute hasn't started. |
| 🔴 reverted | Entity was abandoned or its change was rolled back. Kept for audit. |

## Rules for Last Updated Column

The `Last Updated` column records the date the entity last advanced into a new stage that touched this file. Format: `YYYY-MM-DD`.

- Written by `write` mode on `append` or `update-status` operations (always set to the current date).
- Used by `check` mode to distinguish "recent" (within threshold_days) from "old" final contracts for warning classification.
- Never edited manually — always update via workflow-index write mode.

## Rules for Reads

When `read` mode queries by file path:
1. Find the section matching the file path.
2. Parse the table into a list of `{entity, stage, intent, status, last_updated}` dicts.
3. Return matches ordered by status priority: in-flight > planned > final > reverted.

## Rules for Writes

When `write` mode appends a new entry:
1. If the file path section doesn't exist, create it alphabetically.
2. Within the section, append a new row to the table with today's date in `Last Updated`.
3. Never modify existing rows unless the operation is explicitly updating an existing entry's status (e.g., in-flight → final when entity ships) — when updating status, also refresh `Last Updated` to today.
4. Preserve blank lines and section separators exactly.
