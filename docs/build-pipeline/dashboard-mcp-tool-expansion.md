---
id: 033
title: Dashboard MCP Tool Expansion — Bidirectional Entity Collaboration
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP3)
started: 2026-04-08
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-mcp-tool-expansion
issue:
pr:
intent: feature
scale: Large
project: spacedock
---

## Dependencies

- 032 (SQLite Snapshots) — `update_entity` needs snapshot integration

## Problem

The dashboard MCP currently exposes only one tool (`reply`) — FO can broadcast messages but can't read comments, reply to specific threads, or update entity specs. Brainstorm collaboration requires bidirectional communication through MCP.

## Scope

5 MCP tools registered in `channel.ts`:

### 1. `reply({ content, entity? })` — Enhancement
Add optional `entity` parameter. When provided, event scoped to entity detail feed. Backwards compatible.

### 2. `get_comments({ entity, workflow? })` — New
Read entity's comment threads. Returns open + resolved comments with full thread history. Workflow parameter for multi-workflow disambiguation.

### 3. `add_comment({ entity, section_heading?, content, workflow? })` — New
FO posts comment on entity. Optional `section_heading` for section-targeted comments. Used for brainstorm analysis, questions, status updates.

### 4. `reply_to_comment({ entity, comment_id, content, resolve?, workflow? })` — New
FO replies to specific comment thread. Optional resolve flag to reply + resolve in one action.

### 5. `update_entity({ entity, reason, frontmatter?, body?, sections?, workflow? })` — New
Update entity spec. Three modes (mutually exclusive where noted):
- `frontmatter` — partial merge (no permission needed)
- `body` — full replacement (permission request with diff preview)
- `sections` — heading-targeted replace/append/remove (remove needs permission)

Integrates with snapshot system (every update creates version), auto-resolves affected comments.

### Supporting work

- **Section parser**: Parse markdown into sections by headings, fuzzy heading match, ambiguity detection
- **Entity resolution**: Slug → file path via workflow directory discovery at startup
- **Permission integration**: `body` and `sections.remove` trigger permission request with diff preview through existing channel permission infrastructure
- **Comment notification**: Forward comment/reply events to FO via `onChannelMessage` with structured metadata (`{ type: "comment_added", entity, comment_id }`)

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 3 (MCP Tool Expansion), Section 3.4 (Comment Notification), Known Limitations (Multi-Workflow).

## Acceptance Criteria

- All 5 tools registered and callable via MCP
- `reply` with `entity` parameter scopes events to entity detail feed
- `get_comments` returns full thread structure including resolved threads
- `add_comment` creates comments visible in dashboard UI
- `reply_to_comment` creates thread replies, optional resolve works
- `update_entity` frontmatter merge works without permission
- `update_entity` body replacement triggers permission request with diff
- `update_entity` section operations: replace, append, remove all work
- Section parser handles fuzzy heading match and ambiguity errors
- Snapshot created on every update_entity call
- Comments auto-resolved when their section is updated
- Comment notifications forwarded to FO via channel
- Entity resolution works with slug, errors on ambiguous multi-workflow match
