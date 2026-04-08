---
id: 035
title: Dashboard Collaboration UI — Entity Detail Review + Version History
status: execute
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP5)
started: 2026-04-09
completed:
verdict:
score: 0.8
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
---

## Dependencies

- 032 (SQLite Snapshots) — version history UI needs snapshot API
- 033 (MCP Tools) — real-time updates need MCP tool events

## Problem

The dashboard entity detail page is currently read-only display. Brainstorm collaboration requires it to be an interactive review surface: captain comments on spec sections, FO responds, versions are tracked, and rollback is possible.

## Scope

### 1. Entity Detail Page — 3-Panel Layout
Restructure existing detail page (`detail.html`, `detail.js`, `detail.css`):
- **Left**: Phase nav sidebar (existing, minor updates for brainstorm stage + approve button)
- **Center**: Spec panel (markdown render with text selection → add comment)
- **Right**: Comment panel (Notion-style threaded comments)
- **Bottom**: Entity activity feed with chat input + filters

### 2. Comment Panel (Notion-style)
Upgrade existing comment UI:
- Open threads sorted by time (newest first)
- Resolved threads collapsed with one-liner + resolve reason, expandable
- Manual resolve/unresolve buttons on each thread
- Auto-resolved threads labeled with reason (`section_updated`) and version
- Markdown rendering in comment content
- `selected_text` as blockquote at top of comment
- Multi-user support (author name + role display)

### 3. Text Selection → Add Comment
New JS interaction on spec panel:
- User selects text in rendered spec → popup appears with "Add Comment" button
- Popup captures `selected_text` and determines `section_heading` from DOM
- Creates comment via existing `/api/entity/comment` endpoint

### 4. Version History View
New panel (replaces spec panel when `[History]` toggled):
- Version timeline list (all versions with author, reason, timestamp)
- Diff picker: select any two versions to compare
- Section-aware diff rendering (unchanged collapsed, changed show inline diff)
- Per-changed-section `[⏪]` rollback button
- Rollback confirmation dialog with conflict warning

### 5. Permission Request UI
Enhance existing permission UI for `update_entity` operations:
- Show diff preview for body replacement and section remove
- Approve/deny buttons
- Reuses existing permission infrastructure from channel.ts

### 6. Entity Activity Feed
- Entity-scoped (filtered to this entity's events)
- Chat input at bottom (sends channel message with `meta.entity`)
- Filter bar: Stage, Type, Author dropdowns

### 7. Global Feed Filters (Home Page)
- Filter bar: Entity, Stage, Type, Author multi-select dropdowns
- AND logic for stacked filters
- URL querystring reflects active filters (shareable)

### 8. Brainstorm Gate UI
- `[Approve]` button in phase nav during brainstorm gate
- Profile display (shows current or recommended profile)

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 5 (Comment Lifecycle), Section 6 (Dashboard UI Changes).

## Acceptance Criteria

- Entity detail page renders in 3-panel layout
- Text selection on spec creates section-targeted comments
- Comment panel shows open/resolved threads with resolve/unresolve
- Auto-resolved comments display reason and version
- Version history shows timeline with diff between any two versions
- Section-level rollback works from version history UI
- Rollback confirmation shows conflict warning
- Permission request shows diff preview for body/remove operations
- Entity activity feed shows only this entity's events
- Chat input sends entity-scoped channel messages
- All feed filters work (stage, type, author)
- Global feed filters work with AND logic and URL querystring
- Brainstorm approve button triggers gate approval

## Stage Report (plan)

### Scope Triage

**Entity title**: "Entity Detail Review + Version History" — scope anchor is the detail page as a collaborative review surface.

#### Value / Effort Ranking

| # | Feature | Value | Effort | Decision |
|---|---------|-------|--------|----------|
| 1 | 3-panel layout restructure | High — foundation for everything | Medium | **IN 035** |
| 2 | Version history panel + diff viewer | High — title feature | Medium | **IN 035** |
| 3 | Rollback confirmation + permission modal | High — completes 032/033 loop | Medium | **IN 035** |
| 4 | Comment panel upgrade (threading, resolve reason) | High — core review UX | Medium | **IN 035** |
| 5 | Entity activity feed + chat input | Medium — useful but independent | High | **DEFER → 042** |
| 6 | Global feed filters (home page) | Low for detail page — different surface | Medium | **DEFER → 043** |
| 7 | Brainstorm gate approve button | Medium — but depends on 039 design | Low | **DEFER → 039** |

**Rationale for defers**:
- Activity feed + chat (5): Architecturally requires server-side `?entity=` filter on `/api/events` and a new chat endpoint. Independent surface — does not block reviewing/versioning. Own entity (042) keeps this clean.
- Global feed filters (6): Entirely on `index.html`/`app.js` — different file, no overlap with detail page changes. Own entity (043).
- Brainstorm gate approve button (7): 039 (`dashboard-gate-review-redesign`) is the right home — it covers the full gate UX redesign. Adding an approve button in 035 before 039's design is settled would be premature.

**035 core scope**: 3-panel layout + version history + rollback modal + comment panel upgrade (threading + resolve reason display).

---

### Layout Decision — 3-Panel ASCII Sketch

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Dashboard   [Entity Title]                    [History] [Share]  │  top-bar (sticky)
└─────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┬──────────────┐
│                                                      │  COMMENTS    │
│  SPEC PANEL (center, scrollable)                     │  PANEL       │
│  ┌──────────────────────────────────────────────┐    │  (right,     │
│  │  ## Problem                                  │    │  320px,      │
│  │  rendered markdown with <mark> highlights    │    │  sticky top) │
│  │                                              │    │              │
│  │  [selected text → tooltip → add comment]     │    │  [open       │
│  │                                              │    │   threads]   │
│  │  ## Scope                                    │    │              │
│  │  ...                                         │    │  [resolved   │
│  └──────────────────────────────────────────────┘    │   threads    │
│                                                      │   collapsed] │
│  ┌─ Metadata / Score / Tags / Gate ────────────┐     │              │
│  │  (collapsed accordion, below spec body)      │     └──────────────┘
│  └──────────────────────────────────────────────┘
│
│  [Stage Reports accordion, below]
└──────────────────────────────────────────────────────┘

VERSION HISTORY PANEL (replaces spec panel when [History] toggled):
┌──────────────────────────────────────────────────────┬──────────────┐
│  VERSION HISTORY                            [← Back to Spec]        │
│  ┌──────────────┐  ┌──────────────────────────────┐  │  (comments   │
│  │ Timeline     │  │  DIFF VIEWER                 │  │   panel      │
│  │ v1 author    │  │  Compare: v1 ▼ → v3 ▼        │  │   unchanged) │
│  │ v2 author    │  │  ── ## Problem ──  unchanged  │  │              │
│  │ v3 author ●  │  │  ── ## Scope ──   modified    │  │              │
│  │ (click →diff)│  │    - old line                 │  │              │
│  └──────────────┘  │    + new line                 │  │              │
│                    │    [⏪ Rollback section]       │  │              │
│                    └──────────────────────────────┘  │              │
└──────────────────────────────────────────────────────┴──────────────┘
```

**Layout implementation**:
- `detail.html`: Change `.detail-layout` from `grid-template-columns: 1fr 320px` to `1fr 320px` with a new `.detail-center` wrapper div replacing `<main>`. The 320px comments panel becomes the right column.
- Metadata / Score / Tags / Gate: Move into collapsible accordions inside `.detail-center` (below spec body). This frees the sidebar for comments only. On narrow screens (`< 900px`): single column, comments panel collapses to an overlay triggered by a "Comments (N)" button.
- Version history: Hidden `#version-panel` div inside `.detail-center`. Toggle via `#history-btn` in top-bar. Spec panel (`#spec-panel`) and version panel are mutually exclusive via CSS `display:none`.

---

### Diff Renderer Choice

**Decision: custom inline renderer using the `diff` package already installed.**

Rationale:
- `diff` npm package (v5.2.0) is already a dependency (`tools/dashboard/package.json`). The server uses `createPatch` from it; the `/api/entity/diff` endpoint returns unified patch strings.
- `diff2html` would add ~80KB to the static bundle (CDN) for a feature used on one panel. The dashboard is intentionally zero-build-step (vanilla JS served directly by Bun) — adding a CDN dependency for a niche panel is disproportionate.
- The diff format from `createPatch` is standard unified diff. Parsing `+++`/`---`/`@@`/`+`/`-` lines in ~40 lines of vanilla JS is straightforward and produces exactly what we need: colored line-by-line inline display with collapsed unchanged sections.
- Custom renderer also allows section-level collapse (unchanged sections hidden by default, expanded on click) — this is the primary UX need and `diff2html` doesn't natively support section-level collapsing the way the spec requires.

**Renderer implementation**: `parseDiffHunks(unifiedPatch)` function in detail.js — splits on `@@` markers, emits `+` lines in green, `-` in red, context lines collapsed behind "show N unchanged lines" toggle.

---

### Task Breakdown — Ordered Atomic Commits

**Commit 1**: `feat(detail): move metadata/gate/share panels into accordions below spec body`
- Files: `detail.html`, `detail.js`, `detail.css`
- Changes: Wrap metadata-panel, management-panel, gate-panel, link-sharing into `<details>`/`<summary>` accordions inside `<main>`. Free sidebar for comments-only. ~50 LOC HTML/CSS, ~20 JS.
- Why first: enables the 3-panel layout without breaking existing sidebar features.

**Commit 2**: `feat(detail): 3-panel CSS layout — center spec + right comments`
- Files: `detail.html`, `detail.css`
- Changes: Add `.detail-center` wrapper. Change `.detail-layout` grid to `1fr 320px`. Move `#comment-threads` section into right column as fixed-width panel. Add narrow-screen media query (`< 900px`: stack to single column, comment panel hidden behind toggle button). ~60 LOC CSS, ~20 HTML.

**Commit 3**: `feat(detail): comment panel upgrade — threading + resolve reason + version display`
- Files: `detail.js`, `detail.css`, `tools/dashboard/src/types.ts`, `tools/dashboard/src/comments.ts`, `tools/dashboard/src/server.ts`
- Changes:
  - Schema: Add `resolved_reason?: string` and `resolved_version?: number` to `Comment` interface in `types.ts`. Update `resolveComment()` in `comments.ts` to accept optional `{reason, version}`. Update `POST /api/entity/comment/resolve` in `server.ts` to pass reason/version.
  - Update `autoResolveComments()` in `channel.ts` to pass `reason: "section_updated"` + `version: snap.version`.
  - UI: `renderComments()` in `detail.js` — show reply thread in sidebar cards (not just in popover), show resolved reason tag (`section_updated @ v3`) on resolved cards, collapse resolved cards behind toggle. ~120 LOC JS, ~40 CSS.

**Commit 4**: `feat(detail): version history panel — timeline list + version picker`
- Files: `detail.html`, `detail.js`, `detail.css`
- Changes: Add `#version-panel` div (hidden). Add `#history-btn` to top-bar. Toggle handler: hide `#spec-panel`, show `#version-panel`. On show, fetch `GET /api/entity/versions?entity=<slug>`. Render timeline list (version, author, reason, timestamp, rollback_section badge if rollback). Click version item → set "from" picker. ~100 LOC JS, ~60 CSS.

**Commit 5**: `feat(detail): diff viewer — section-aware unified diff rendering`
- Files: `detail.js`, `detail.css`
- Changes: `parseDiffHunks(patch)` function parses unified diff string into segments. `renderDiffSection(sectionDiff)` renders each section: unchanged = collapsed summary, modified = inline +/- lines, added/removed = full highlight. Fetch `GET /api/entity/diff?entity=&from=&to=` when user picks two versions. ~120 LOC JS, ~50 CSS.

**Commit 6**: `feat(detail): rollback button + confirmation modal`
- Files: `detail.html`, `detail.js`, `detail.css`
- Changes: Add `#rollback-modal` overlay (hidden). Add `[⏪]` rollback button per modified section in diff viewer. Button click: populate modal with section heading + version target + conflict warning (if any from diff response). Confirm → `POST /api/entity/rollback`. On success: reload entity body, refresh version list, show toast. Add `rollback` WS event handler in `detailWs.onmessage` to refresh body on remote rollback. ~100 LOC JS, ~40 CSS, ~20 HTML.

**Commit 7**: `feat(detail): permission request modal — diff preview + approve/deny`
- Files: `detail.html`, `detail.js`, `detail.css`
- Changes: Add `permission_request` handler in `detailWs.onmessage`. Parse `event.detail` JSON for `{request_id, tool_name, description, input_preview}`. Show `#permission-modal` with diff preview (reuse `parseDiffHunks` renderer). Approve → `POST /api/channel` with `{content: "allow", meta: {type: "permission_response", request_id}}`. Deny → same with `"deny"`. Auto-dismiss on timeout (120s countdown). ~80 LOC JS, ~40 CSS, ~15 HTML.

---

### Rollback Modal Flow

```
User selects two versions in version picker
  → diff loads, sections rendered
  → modified section shows [⏪ Rollback to vN] button

Click [⏪ Rollback to vN]
  → modal opens with:
     - Section heading
     - "Restore to version N (by author, timestamp)"
     - Conflict warning if present: yellow banner
       "Warning: Other sections modified since v3: ## Scope, ## Acceptance Criteria"
     - [Confirm Rollback] [Cancel] buttons

Click [Confirm Rollback]
  → POST /api/entity/rollback {entity, path, section_heading, to_version, author:"captain"}
  → On success:
     - Modal closes
     - Entity body reloads (loadEntity())
     - Version list refreshes (loadVersions())
     - Toast: "Section rolled back → v{new_version}"
  → On error (404 snapshot not found / 400 section not found):
     - Modal shows error message inline
     - [Close] button
```

---

### Schema Extensions

**`Comment` interface** — add two optional fields to `types.ts`:

```typescript
export interface Comment {
  // ... existing fields ...
  resolved: boolean;
  resolved_reason?: string;   // e.g. "section_updated", "manual"
  resolved_version?: number;  // snapshot version at time of auto-resolve
  thread: CommentReply[];
}
```

**`resolveComment()` signature change** in `comments.ts`:
```typescript
export function resolveComment(
  entityPath: string,
  commentId: string,
  opts?: { reason?: string; version?: number }
): Comment
```

Writes `resolved_reason` and `resolved_version` into the sidecar JSON. Backward compatible — fields are optional, existing sidecars without them render as `resolved: true` with no reason label.

**`autoResolveComments()` in `channel.ts`**: pass `{reason: "section_updated", version: snap.version}`.

**`POST /api/entity/comment/resolve` in `server.ts`**: accept optional `reason` and `version` in request body.

No database schema changes — comments live in JSON sidecars, not SQLite.

---

### Follow-up Entities Being Created

- **042** — Entity Activity Feed + Chat Input (deferred from 035 scope 5)
- **043** — Global Feed Filters, Home Page (deferred from 035 scope 6)

Note: Brainstorm gate approve button stays in **039** (`dashboard-gate-review-redesign`, already draft).

---

### Estimated Commits

| Commit | Description | Est. LOC |
|--------|-------------|----------|
| 1 | Metadata/gate/share → accordions | ~90 |
| 2 | 3-panel CSS layout | ~80 |
| 3 | Comment panel upgrade + schema | ~200 |
| 4 | Version history panel | ~160 |
| 5 | Diff viewer (custom renderer) | ~170 |
| 6 | Rollback modal | ~160 |
| 7 | Permission request modal | ~135 |
| **Total** | | **~995** |

7 atomic commits. Each commit leaves the page in a working state. Order is dependency-safe: layout first, then panels, then modals that depend on panels.

---

## Stage Report (explore)

### Key File Inventory

| File | Role |
|------|------|
| `tools/dashboard/static/detail.html` | Detail page HTML — 2-column layout (main + sidebar) |
| `tools/dashboard/static/detail.js` | All detail page logic (~1100 lines) |
| `tools/dashboard/static/detail.css` | Styles (not read — referenced by HTML) |
| `tools/dashboard/src/server.ts` | HTTP router — all REST endpoints |
| `tools/dashboard/src/snapshots.ts` | SnapshotStore + section parser + diff + rollback |
| `tools/dashboard/src/channel.ts` | MCP channel server + 5 tools (reply/get_comments/add_comment/reply_to_comment/update_entity) |
| `tools/dashboard/src/comments.ts` | Comment CRUD (sidecar file persistence) |
| `tools/dashboard/src/types.ts` | Shared TypeScript types |

---

### Current Detail UI Architecture

**Layout** (`detail.html`): Two-column grid — `<main>` (entity body + dependency graph + stage reports) and `<aside>` sidebar (phase nav, metadata, score/tags, gate review, share links, comments panel). No center/right 3-panel layout yet.

**Body rendering**: `renderBody()` splits at `## Stage Report:`, renders only the pre-report body via `marked.parse()` + `DOMPurify.sanitize()`.

**Comment system** (`detail.js` lines 426–519):
- `loadComments()` — polling `GET /api/entity/comments?path=...`, returns `{comments, suggestions}`
- `renderComments()` — flat list sorted unresolved-first; each comment shows `selected_text`, content, author, section heading, and a Resolve button
- Highlights: `applyCommentHighlights()` (lines 897–969) — walks rendered DOM text, wraps `selected_text` matches in `<mark class="comment-highlight">` elements with `data-comment-ids`
- Popover: clicking a `<mark>` shows inline popover with thread replies (lines 1003–end)
- Text selection → tooltip: `mouseup` listener captures selection, shows `#comment-tooltip` at cursor position

**WS handler** (`detail.js` lines 821–880, `initGateReview` IIFE):
- Connects to `GET /ws/activity`
- Handles `event.type === 'gate_decision'` — updates gate badge
- Handles `event.type === 'comment'` — calls `loadComments()` (reload)
- Handles `event.type === 'channel_response'` — inserts transient FO message card at top of `#comment-threads`
- Does NOT handle `event.type === 'rollback'` or `'permission_request'` in detail.js (those exist in server but no UI consumer)

**Suggestion system**: Partial — `renderSuggestionCard()` shows diff_from/diff_to, accept/reject buttons. `POST /api/entity/suggestion/accept` and `/reject` endpoints present.

**What is missing for the spec**:
- No 3-panel layout (center spec + right comments)
- No version history panel
- No permission request UI (rollback confirmation, diff preview for body/remove)
- No entity-scoped activity feed with chat input
- No global feed filter bar (home page)
- No brainstorm gate approve button
- Comment panel has no threading UI (replies exist in popover only, not in sidebar cards)
- Comment cards don't show resolve reason or version for auto-resolved

---

### Snapshot HTTP API Surface

All endpoints registered in `tools/dashboard/src/server.ts`:

**GET `/api/entity/versions?entity=<slug>`**
- Returns: `{ entity: string, versions: SnapshotVersion[] }`
- `SnapshotVersion`: `{ version, author, reason, source, created_at, rollback_from_version, rollback_section }`

**GET `/api/entity/diff?entity=<slug>&from=<n>&to=<n>`**
- Returns: `{ from: number, to: number, sections: SectionDiff[] }`
- `SectionDiff`: `{ heading, status: "added"|"modified"|"unchanged"|"removed", diff?: string }`
- `diff` field is unified patch format (from `createPatch` in the `diff` npm package)

**POST `/api/entity/rollback`**
- Body: `{ entity, path, section_heading, to_version, author? }`
- Returns: `{ new_version: number, warning: string | null }`
- Side effects: writes file, publishes `rollback` WS event, creates snapshot

**Comment endpoints** (existing):
- `GET /api/entity/comments?path=<filepath>` → `{ comments, suggestions }`
- `POST /api/entity/comment` body: `{ path, selected_text, section_heading, content }`
- `POST /api/entity/comment/reply` body: `{ path, comment_id, content, author? }`
- `POST /api/entity/comment/resolve` body: `{ path, comment_id }`

---

### Integration Points for Review UI + Version History

1. **3-panel layout**: CSS grid restructure of `detail.html` + `detail.js`. Main changes: split existing `<main>` into center spec panel + rearrange `<aside>` comments into right panel. Gate/metadata/share sidebar sections need collapsing or moving.

2. **Version history toggle**: Add `[History]` button to spec panel header. On click, hide spec panel `#entity-body`, show new `#version-history` div. Fetch `GET /api/entity/versions` on open, render timeline list. Diff picker calls `GET /api/entity/diff`.

3. **Section rollback button**: From diff result, each `status:"modified"` section renders a rollback button. Click → confirmation dialog → `POST /api/entity/rollback`. On success, re-fetch entity body and re-render.

4. **Conflict warning**: `rollback` response's `warning` field — show as yellow banner in confirmation dialog.

5. **Permission request UI**: `event.type === 'permission_request'` WS events already published by server (channel.ts line 134, server.ts line 492). detail.js currently has no handler. Need to add case in `detailWs.onmessage` to show approve/deny modal with diff preview from `detail` field.

6. **Entity activity feed**: `GET /api/events` (existing) returns all events. Need entity filter. Check if server supports `?entity=` query param — not confirmed, may need server-side addition. Chat input calls `POST /api/channel` with `meta.entity`.

7. **Auto-resolve labeling**: Comment sidecar format needs to expose `resolve_reason` and `resolve_version` fields. Currently `resolveComment()` marks `resolved: true` with no reason stored — requires sidecar schema extension.

8. **`section_heading` DOM mapping**: `applyCommentHighlights()` uses text-search to locate `selected_text` in rendered DOM. For "add comment" flow, section heading is determined by walking up DOM from selection anchor to find nearest `<h2>`/`<h3>` heading — this logic exists in `submitComment()` (detail.js ~line 360–403). Reuse for review panel.

---

### Risks and Unknowns

1. **`/api/events?entity=` filter missing** — Entity-scoped activity feed requires server filter. Need to verify or add `entity` query param support in `GET /api/events`.

2. **Auto-resolve reason not stored** — `resolveComment()` marks resolved but does not record `reason` (e.g. `section_updated`) or `version`. Schema extension needed before comment panel can display "auto-resolved: section_updated at v3".

3. **3-panel layout vs. existing sidebar** — The sidebar contains 6 panel sections (phase nav, metadata, score/tags, gate, share, comments). The spec calls for right panel = comments only. Metadata/score/tags/gate/share need to be collapsed, hidden, or moved to a settings drawer. Layout restructure is non-trivial.

4. **`diff` format** — `/api/entity/diff` returns unified patch strings from `createPatch`. The UI will need a diff renderer (e.g. `diff2html` library, or custom inline renderer). No existing diff renderer in the dashboard.

5. **`rollback` WS event not handled** — Server publishes `type:"rollback"` on `POST /api/entity/rollback` but detail.js has no handler. Version history UI must reload after rollback — add handler.

6. **Suggestion system overlap** — There is an existing suggestion system (`suggestion-card`, `diff_from`/`diff_to` fields, accept/reject endpoints) that partially overlaps with "text selection → propose edit" workflows. Clarify whether this is distinct from the new inline comment flow or should be unified.

7. **`GET /api/entity/versions` uses slug not path** — Unlike comment endpoints which use `?path=<filepath>`, versions/diff/rollback use entity slug. Need consistent entity identification strategy in the UI (currently detail.js uses `entityPath` — the full file path).

---

### Recommendation: Profile + Stage Skips

**Suggested profile**: `haiku` for design/profile and `sonnet` for build (large JS refactor + CSS grid restructure).

**Stage skips**: None recommended. This is a Large feature with significant layout restructure and multiple new panels. The explore → design → build → quality flow is appropriate.

**Design stage is critical**: The 3-panel layout restructure and the decision about where metadata/gate/share panels go must be resolved in design before build starts. Attempting to build without a clear layout plan will cause rework.

**Suggested build decomposition** (design stage should validate):
1. CSS/HTML layout restructure (3-panel grid)
2. Version history panel + timeline + diff viewer
3. Rollback confirmation + permission request UI
4. Comment panel upgrade (threading, resolve reason, multi-user)
5. Entity activity feed + chat input
6. Global feed filters (home page — lowest risk, separate file)
7. Brainstorm gate approve button

---

### Verification of Cached Context

**`tools/dashboard/src/snapshots.ts`** — CONFIRMED CURRENT. SnapshotStore, parseSections, findSectionByHeading, replaceSection, removeSection all present and match cached description. `createSnapshot` takes `{entity, body, frontmatter, author, reason, source}` — caller passes PRE-write state.

**`tools/dashboard/src/channel.ts`** — CONFIRMED CURRENT. 5 MCP tools present. Permission async pattern via `pendingPermissions` Map with "tool:" prefix IDs. `requestPermissionAndWait` publishes `permission_request` event. Auto-resolve on section update confirmed.

**`tools/dashboard/static/detail.js` WS handler (cached: "ONLY handles gate_decision")** — STALE. Current state (lines 821–880) handles THREE event types:
- `gate_decision` — original
- `comment` — added (calls `loadComments()`)
- `channel_response` — added (inserts FO message card)

The 027 explore finding is outdated. Comment events are now wired. What remains missing: `rollback` and `permission_request` event handlers in detail.js.
