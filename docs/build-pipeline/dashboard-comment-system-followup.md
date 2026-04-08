---
id: 030
title: Dashboard Comment System Followup — 027 Hotfixes + IME Support
status: pr-draft
source: captain testing of 027 (PR #17) — discovered 3 issues during live verification
started: 2026-04-08
completed:
verdict:
score: 0.92
worktree: .worktrees/spacedock-ensign-dashboard-comment-system-followup
issue:
pr:
intent: bugfix
scale: Medium
project: spacedock
---

## Dependencies

- Builds on 027 (already shipped) — fixes follow-up issues discovered during testing

## Problem

PR #17 (027 dashboard-comment-realtime) shipped 3 fixes for the comment system, but live testing by the captain revealed three critical follow-up issues that need addressing:

### Bug 1: Test pollution of production SQLite (CRITICAL)

`tools/dashboard/src/server.test.ts` (created by 027 execute stage) calls `createServer()` without passing `dbPath`, so it defaults to `~/.spacedock/dashboard.db` (the production database). Every test run pollutes the captain's real activity feed with test events ("Test comment", "Parent comment", "Captain reply to FO", etc.).

**Evidence**: After 027 PR merge, captain's activity feed showed 14+ entries from `test-entity` that match exact strings from server.test.ts test cases. These were never real captain interactions.

### Bug 2: Bug B (FO reply → UI) not actually fixed

The 027 fix added a `channel_response` event handler in `detail.js:849-851` that calls `loadComments()`. But this is logically incorrect:

- `channel_response` events are **not** comments — they're a separate event type
- `loadComments()` only fetches `/api/entity/comment` endpoint, which returns the existing comment list
- When a `channel_response` arrives, `loadComments()` finds no new comments
- The FO's reply text (in `event.detail`) is never displayed to the captain

**Evidence**: Captain confirmed via screenshot that FO replies via `mcp__spacedock-dashboard__reply` are not appearing in the comment thread or anywhere in the UI.

### Bug 3: IME (Chinese input) submits prematurely

The reply input box in `detail.js submitReply()` (or wherever Enter is handled) doesn't check `event.isComposing`. When a CJK user types Chinese and presses Enter to confirm IME selection, the text is submitted before the IME selection completes.

**Evidence**: Captain reported the bug while testing 027 with Chinese reply text — character selection triggers premature submit.

## Brainstorming Spec

APPROACH:
  (1) **Test isolation**: Update server.test.ts createServer calls to pass `dbPath: join(TMP, "test.db")`. Add cleanup of this DB in afterAll. Verify that running tests does NOT touch ~/.spacedock/dashboard.db.

  (2) **Real Bug B fix**: Replace `loadComments()` call in channel_response handler with logic that displays the FO reply directly. Two options:
      (a) Append the FO reply as a special "FO Channel" message in the comment thread UI
      (b) Show the reply in a dedicated "FO Channel Messages" panel separate from comments
  Option (a) is preferred — it keeps captain↔FO conversation in one thread.

  (3) **IME fix**: Add `event.isComposing` check to all Enter-key handlers in detail.js. Pattern: `if (e.key === 'Enter' && !e.isComposing) { submit(); }`. Apply same fix to share.js if it has reply inputs.

ALTERNATIVE:
  (Bug 1) (A) Skip dbPath fix and use a sidecar mock — rejected: real fix is one line.
  (Bug 2) (B) Convert channel_response to a comment in SQLite — rejected: changes data model, mixes concerns.
  (Bug 3) (C) Use keyup instead of keydown — rejected: still triggers on IME Enter selection in some browsers.

GUARDRAILS:
  - Test isolation must use a unique temp DB path per test (or clean between tests)
  - FO reply display must visually distinguish from captain comments (different color/badge)
  - IME fix must not break Shift+Enter newline behavior (if any)
  - All changes must keep PR #17's existing tests passing
  - Add new tests: dbPath isolation test, channel_response render test (DOM-based), IME composition test

RATIONALE:
  These three bugs broke captain trust in the comment system after a fresh ship. They block proper testing of 027's intended behavior and pollute the activity feed. Fixing them is necessary before adding more features (028 mermaid, 030+ workflows). IME bug is critical for CJK users — Spacedock has bilingual operators.

## Acceptance Criteria

- `bun test` does NOT write to `~/.spacedock/dashboard.db` (verify before/after row count)
- New test: `expect(productionDbPath).not.toHaveBeenWritten()` or equivalent
- FO reply via MCP appears in comment thread UI within 1 second of arrival
- FO reply visually distinguished from captain comments (e.g., FO badge or color)
- Captain can type Chinese in reply input without premature submission
- Shift+Enter still creates newline (if previously supported) — confirm or N/A
- All existing 89 tests still pass after changes
- New tests added: ≥3 (1 for DB isolation, 1 for channel_response display, 1 for IME composition)

## Out of Scope (separate entities)

- Cross-instance WebSocket sync between 8420 and 8421 (architectural — needs its own entity 031)
- Activity feed grouping by workflow (enhancement — needs its own entity 032)
- dist/server.js committed accidentally in PR #18 (gitignore issue — small fix in this entity or separate)
