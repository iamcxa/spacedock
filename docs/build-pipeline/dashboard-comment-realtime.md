---
id: 027
title: Dashboard Comment Realtime — 即時推送 + Reply 雙向通道
status: explore
source: captain observation (026 shipping session — reply 不顯示 + comment 需刷新)
started:
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-comment-realtime
issue:
pr:
intent: bugfix
scale: Medium
project: spacedock
---

## Stage Report

### 1. File List by Layer — DONE

**Domain / Storage**
- `tools/dashboard/src/comments.ts` — comment CRUD: addComment, addReply, resolveComment, addSuggestion, acceptSuggestion, rejectSuggestion; sidecar JSON storage at `<entity>.comments.json`
- `tools/dashboard/src/events.ts` — EventBuffer (SQLite ring buffer, capacity 500); validates event types; "comment" and "channel_response" ARE in VALID_EVENT_TYPES

**Server / Router**
- `tools/dashboard/src/server.ts` — Bun.serve() with all API routes; publishEvent() at line 1009; broadcastChannelStatus() at line 1025; WebSocket open/message/close handlers at line 629+; comment routes at lines 172-274
- `tools/dashboard/src/channel.ts` — MCP server wrapping dashboard server; FO "reply" tool handler at line 120; onChannelMessage callback at line 77; permission relay

**Frontend**
- `tools/dashboard/static/detail.js` — main detail page; detailWs WebSocket at line 814; loadComments() at line 426; submitComment() at line 368; sendCommentToChannel() at line 388; submitReply() at line 1082; applyCommentHighlights() at line 859
- `tools/dashboard/static/share.js` — share page; connectScopedWebSocket() at line 514; loadComments(path) at line 387; submitReply() at line 357

**Supporting**
- `tools/dashboard/src/db.ts` — SQLite init (events table schema)
- `tools/dashboard/src/types.ts` — AgentEvent, AgentEventType, Comment, CommentReply, CommentThread types
- `tools/dashboard/src/auth.ts` — ShareRegistry for scoped share links
- `tools/dashboard/src/comments.test.ts` — bun:test suite for comments.ts (complete coverage of all CRUD ops)

Total affected files: **8 files** across 3 layers.

---

### 2. Context Lake Insights — DONE

Stored insights for:
- `tools/dashboard/src/server.ts` — root cause analysis of missing publishEvent calls
- `tools/dashboard/static/detail.js` — WS handler gaps, captain-reply-to-FO path
- `tools/dashboard/static/share.js` — partial WS handling, reply gap
- `tools/dashboard/src/channel.ts` — FO reply path, onChannelMessage callback
- `tools/dashboard/src/comments.ts` — pure storage, no changes needed
- `tools/dashboard/src/events.ts` — event type registry, test framework confirmed

---

### 3. Scale Confirmation — DONE

Actual file count: 8 files touched across domain, router, and frontend layers. **Medium scale confirmed** — not Small. The fix spans server.ts (3 routes need publishEvent), detail.js (WS handler needs comment/channel_response cases), share.js (no new changes needed — already handles "comment" event), and channel.ts (captain reply needs onChannelMessage forwarding).

---

### 4. Root Cause Diagnosis (Systematic Debugging) — DONE

**Bug A: Comments don't appear without refresh**

Trace: `POST /api/entity/comment` (server.ts:195) → `addComment()` writes sidecar → returns JSON → **END**. No `publishEvent()` call.

Compare to working pattern: `POST /api/entity/gate/decision` (server.ts:275) calls `publishEvent(event)` after writing, which broadcasts to `"activity"` topic via `server.publish()` (server.ts:1011).

Root cause: **server.ts comment routes (line 195-274) never call publishEvent()**. Three routes affected:
- `POST /api/entity/comment` — adds comment, no broadcast
- `POST /api/entity/comment/reply` — adds reply, no broadcast
- `POST /api/entity/comment/resolve` — resolves comment, no broadcast

Same for share-scoped routes at lines 824-889.

**Bug B: FO replies via MCP don't show in UI**

Trace: FO calls `mcp__spacedock-dashboard__reply` → channel.ts `CallToolRequestSchema` handler (line 120) → `dashboard.publishEvent({type:"channel_response", ...})` → EventBuffer → `server.publish("activity", ...)` → WS broadcast to all "activity" clients.

**Gap**: `detail.js detailWs.onmessage` (line 821-843) only handles `event.type === "gate_decision"`. The `channel_response` event arrives but is silently ignored — no DOM update triggered.

Root cause: **detail.js WS handler has no case for "channel_response"** (nor for "comment" or "comment_update").

**Bug C: Captain replies not forwarded to FO**

Trace: Captain types reply in UI → `submitReply()` (detail.js:1082) → `POST /api/entity/comment/reply` → server.ts line 226 → `addReply()` writes sidecar → returns JSON → **END**. `opts.onChannelMessage` is **never called**.

Compare to working pattern: `POST /api/channel/send` (server.ts:449) calls `opts.onChannelMessage(body.content, body.meta)` at line 471, which in channel.ts forwards to FO via `mcp.notification()`.

Root cause: **POST /api/entity/comment/reply never calls opts.onChannelMessage()**. Captain reply is written to sidecar but FO session receives no notification.

**Summary of all root causes:**

| Bug | Root Cause | File | Fix |
|-----|-----------|------|-----|
| Comment not realtime | publishEvent() not called after comment CRUD | server.ts:195-274 | Add publishEvent({type:"comment",...}) in all 3 routes |
| FO reply not shown | WS handler ignores channel_response | detail.js:821-843 | Add channel_response case to onmessage |
| Captain reply not forwarded | onChannelMessage not called in reply route | server.ts:226-254 | Call opts.onChannelMessage() with reply content |

---

### 5. Coverage Infrastructure — DONE

- **Test framework**: `bun:test` (confirmed in comments.test.ts line 1: `import { describe, test, expect } from "bun:test"`)
- **Test files**: `src/*.test.ts` pattern — auth.test.ts, comments.test.ts, db.test.ts, discovery.test.ts, frontmatter-io.test.ts, gate.test.ts, parsing.test.ts, permission-tracker.test.ts
- **Coverage command**: No `test:coverage` script in package.json. Bun supports `bun test --coverage` natively (outputs to stdout). No vitest/jest config.
- **Coverage format**: Bun native coverage — text output to stdout, no Istanbul JSON or LCOV unless `--coverage-reporter=lcov` added.
- **Comparison script**: No `coverage-summary.*` or `coverage-report.*` scripts found in `.github/scripts/` or `scripts/`.
- **Baseline strategy**: No CI baseline caching found. No committed baseline file. Coverage baseline does not exist — would need to establish one.
- **Run command**: `cd tools/dashboard && bun test` (runs all .test.ts); add `--coverage` for coverage report.

---

### Plan Stage Report

### 1. Formal plan document — DONE

Created via `superpowers:writing-plans` skill. Saved to `docs/superpowers/specs/2026-04-08-dashboard-comment-realtime.md`.

5 tasks, TDD-ordered (test-first for each fix):
- Task 1: Add publishEvent() to 3 comment routes in server.ts (lines 195-274)
- Task 2: Add opts.onChannelMessage() to reply route for captain→FO forwarding (line 226-254)
- Task 3: Add comment + channel_response handlers to detail.js WS onmessage (line 821-843)
- Task 4: Add publishEvent() to 2 share-scoped comment routes (lines 824-889)
- Task 5: Quality gate — full test suite + type check + build

### 2. Plan has concrete file paths — DONE

Every task references specific files with line numbers from root cause analysis. Three files modified: `server.ts`, `detail.js`. One file created: `server.test.ts`.

### 3. Test-first ordering — DONE

Tasks 1, 2, 4 each start with writing failing tests, then implementing the fix. Task 3 (vanilla JS frontend) cannot use bun:test for DOM logic — verified via full test suite instead. Task 5 is the final quality gate.

### 4. Quality gate steps — DONE

Task 5 includes: `bun test` (full suite), `bunx tsc --noEmit` (type check), `bun build` (build verification).

### 5. No architecture triggers — DONE

Confirmed: no schema change (EventBuffer/SQLite untouched), no cross-domain impact (changes scoped to dashboard), no new public API (existing routes fixed), no new infrastructure dependency (using existing publishEvent/onChannelMessage).

---

## Dependencies

- None

## Problem

Dashboard comment 系統有兩個即時性問題：

1. **Comment 加入後需刷新才看得到** — comment 寫入 SQLite 後沒有透過 WebSocket 廣播給已連線的客戶端。新加的 comment 只有在頁面重新載入時才從 SQLite 讀取。
2. **FO reply 沒在 UI 顯示** — `mcp__spacedock-dashboard__reply` 工具發送的訊息沒有出現在 comment thread UI 中。Captain 的第二條 reply 也沒被轉發到 FO。

根本原因：comment CRUD 操作（POST /api/entity/comment）寫入 SQLite 後沒有 publish WebSocket event，也沒有通知 MCP channel。Reply 雙向通道（dashboard UI ↔ MCP channel ↔ Claude Code）的回傳路徑不完整。

## Brainstorming Spec

APPROACH:     (1) Comment CRUD 操作後透過 WebSocket 廣播 `comment_update` 事件，包含 entity path + comment data。detail.js 監聽此事件即時更新 DOM。(2) Reply 從 dashboard UI 發送時，透過 MCP channel 轉發到 Claude Code session。FO 的 reply 透過 MCP channel 回傳後，server 廣播到 WebSocket 讓 UI 更新。
ALTERNATIVE:  (A) 短輪詢 comment endpoint（rejected: 浪費資源，延遲高）。(B) Server-Sent Events 替代 WebSocket（rejected: 已有 WebSocket 基礎設施，沒必要加第二種推送機制）。
GUARDRAILS:   不改動現有 comment 資料結構。WebSocket 廣播只推送增量（新增/更新的 comment），不重送全部。Share page 的 scoped WebSocket 也要收到 comment 更新。
RATIONALE:    Comment 是 captain 與 agent 之間最直接的協作管道。即時性是基本期望 — 加了 comment 卻看不到、reply 消失在黑洞裡，破壞了協作信任。

## Acceptance Criteria

- Comment 加入後立即出現在 UI（無需刷新）
- FO 透過 mcp reply 的訊息顯示在 comment thread 中
- Captain 在 UI 的 reply 被轉發到 Claude Code session
- Share page 也能即時收到 comment 更新
- 現有 comment 功能（新增、回覆、resolve）行為不變
