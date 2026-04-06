---
id: 016
title: Dashboard Gate Approval — UI 上的階段審批與 PR-style Review
status: plan
source: /build brainstorming
started: 2026-04-06T07:30:00Z
completed:
verdict:
score: 0.95
worktree: .worktrees/spacedock-ensign-dashboard-gate-approval
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 011 completed (collaborative review, inline comments & suggestions)
- Feature 015 (war room identity — conceptual foundation)

## Brainstorming Spec

APPROACH:     將 workflow gate approval 從 Claude Code CLI 搬到 dashboard UI。Captain 可以在 UI 上打開 plan/pr-review 等 gate stage 的 detail，像 PR review 一樣瀏覽完整內容，然後直接在 UI 上 Approve / Request Changes。Request Changes 走已有的 comment pattern（011），Approve 透過 channel 發送 gate decision 給 FO。UI 顯示 gate 狀態（pending review / approved / changes requested）。
ALTERNATIVE:  僅在 CLI 中做 gate approval，dashboard 只顯示狀態（rejected: 限制了非 CLI 用戶的參與能力，也無法支援後續多人協作分享場景）
GUARDRAILS:   Gate decision 必須經過明確的人類操作（點擊 button），不能因 UI bug 意外 approve。必須與 CLI approval 共存 — 兩邊都能操作，先到先得。必須處理 race condition（CLI 和 UI 同時 approve）。Gate state 以 FO 的 frontmatter 為 source of truth。
RATIONALE:    核心 UX 突破 — 讓非 CLI 用戶也能參與工作流決策，是戰情室從「觀看」到「操作」的關鍵跨越。結合 011 的 comment pattern，形成完整的 review → comment → approve 工作流。

## Acceptance Criteria

- Gate stage entity 在 UI 上顯示 "Pending Review" 狀態標記
- 可在 UI 上瀏覽 gate stage 的完整 stage report
- Approve button 發送 gate decision 到 FO（via channel）
- Request Changes button 觸發 comment flow（複用 011 pattern）
- CLI 和 UI 的 gate approval 共存，先到先得
- Gate 狀態即時更新（WebSocket push）
- 不會因 UI bug 意外觸發 approve（需確認步驟）

## Coverage Infrastructure

- **Test framework:** Bun built-in test runner (`bun:test`) — used in `tools/dashboard/src/*.test.ts`
- **Coverage command:** `bun test --coverage` (Bun 內建，無需額外套件)
- **Coverage format:** Bun 輸出 Istanbul-compatible JSON — `coverage/coverage-final.json`
- **Test files found:** `comments.test.ts`, `discovery.test.ts`, `frontmatter-io.test.ts`, `parsing.test.ts`
- **No `test:coverage` script in package.json** — 直接使用 `bun test`，無 npm scripts 封裝
- **No CI coverage baseline:** `.github/workflows/release.yml` 只做 release，無 coverage job、無 baseline cache、無 comparison script
- **Python tests:** `tests/` 目錄有 E2E 測試（`test_gate_guardrail.py` 等），使用 `uv run`，無 pytest-cov

## Stage Report: explore

- [x] File list grouped by layer — map all files needed for gate approval UI
- [x] Context lake insights stored for each relevant file discovered
- [x] Scale confirmation or revision based on actual file count
- [x] Coverage infrastructure discovery
- [x] Map existing gate/approval patterns in the codebase
- [x] Map existing review/comment UI patterns (entity 011)
- [x] Identify WebSocket event types needed for real-time gate status updates

### Summary

**Layer map (files affected by 016):**

| Layer | File | Purpose |
|-------|------|---------|
| Types | `tools/dashboard/src/types.ts` | 新增 `gate_decision` 到 `AgentEventType` |
| Events | `tools/dashboard/src/events.ts` | 新增 `"gate_decision"` 到 `VALID_EVENT_TYPES` set |
| Server | `tools/dashboard/src/server.ts` | 新增 `POST /api/entity/gate/decision` route |
| Channel | `tools/dashboard/src/channel.ts` | 轉發 `gate_decision` meta 給 FO via MCP notification |
| Frontend (主頁) | `tools/dashboard/static/activity.js` | 新增 gate card 渲染（Approve/Request Changes buttons） |
| Frontend (detail) | `tools/dashboard/static/detail.js` | 新增 gate status badge、sidebar Approve 按鈕、WebSocket 連線 |
| Frontend (detail) | `tools/dashboard/static/detail.html` | 新增 gate action section HTML |
| Frontend (主頁) | `tools/dashboard/static/app.js` | gate pending 狀態過濾（alert bar，015 已有） |
| FO protocol | `references/first-officer-shared-core.md` | 新增 channel gate_decision 處理文件（非強制，FO 讀 channel message） |
| FO protocol | `references/claude-first-officer-runtime.md` | 補充 gate decision 從 UI 到 FO 的 channel message 格式 |

**Scale 確認：** Medium 維持。實際 touch points = 10 個檔案，主要是 frontend + server 層。無新 DB schema，無新 sidecar format（複用 comment sidecar）。

**Gate/approval 現有模式：**
- FO 在 `first-officer-shared-core.md` 定義 gate 流程：stage 完成後 emit `gate` event → 等待 captain 回應 → NEVER self-approve
- `claude-first-officer-runtime.md:58` 明確：「Only the captain can approve or reject gates」
- 目前 CLI approval = captain 在 terminal 輸入文字回應 FO 的 gate presentation
- Channel protocol 目前無 `gate_decision` meta type — 這是 016 需要定義的新協定

**Feature 011 review/comment 模式（可複用）：**
- `comments.ts`：sidecar JSON (`*.comments.json`) 儲存 comment threads
- `detail.js`：text selection → tooltip → POST `/api/entity/comment` → `sendCommentToChannel()` 帶 `meta.type: "comment"`
- `activity.js`：`renderPermissionRequest()` 是最接近 gate card 的現有 UI pattern（card + 雙按鈕 + 點擊禁用 + resolve 標記）
- Request Changes 可直接觸發現有 comment tooltip，無需新 UI 元件

**WebSocket 事件類型 (016 新增)：**
- 新增 event type：`gate_decision` — 記錄 captain 從 UI 送出的 gate decision
- 現有 `gate` event type 已存在，用於 FO 發出「Awaiting captain approval」
- `detail.js` 目前無 WebSocket — 需新增 WS 連線以接收 real-time gate status push

**Key design constraints:**
1. `VALID_EVENT_TYPES` 在 `events.ts` hardcoded — 必須同步更新 types.ts 和 events.ts
2. Gate state source of truth = FO frontmatter，非 dashboard。"Pending Review" badge 由前端讀 `frontmatter.status` + 對比 workflow stages 的 `gate: true` 推導
3. Race condition 防護：按鈕 click 後立即 disable（同 permission card pattern），FO 收到第一個 gate decision 後忽略後續重複
4. detail.html 不載入 activity.js — 需在 detail.js 內新增獨立 WebSocket 連線，或抽出共用 WS 模組

## Technical Claims

CLAIM-1: [type: framework] "Bun.serve() routes can handle POST /api/entity/gate/decision with JSON body parsing via await req.json()"
CLAIM-2: [type: project-convention] "Channel protocol (MCP notification via channel.ts) can carry gate_decision meta type without protocol changes — meta is Record<string, string>"
CLAIM-3: [type: project-convention] "Permission card UI pattern in activity.js (renderPermissionRequest) can be reused for gate approval cards (dual-button + disable-on-click + resolve)"
CLAIM-4: [type: project-convention] "detail.js can add independent WebSocket connection to /ws/activity for real-time gate status — detail.html does NOT load activity.js"
CLAIM-5: [type: project-convention] "VALID_EVENT_TYPES in events.ts is a hardcoded Set that must be manually synced with AgentEventType in types.ts"
CLAIM-6: [type: domain-rule] "Gate state source of truth is FO frontmatter — dashboard derives Pending Review from status + gate:true stage property"
CLAIM-7: [type: project-convention] "Feature 011 comment pattern (text selection -> tooltip -> POST /api/entity/comment -> sendCommentToChannel) can serve as Request Changes flow"
CLAIM-8: [type: domain-rule] "Race condition between CLI and UI gate approval can be handled by first writer wins in FO (FO ignores duplicate decisions)"

## Research Report

**Claims analyzed**: 8
**Recommendation**: REVISE

### Verified (6 claims)

- CLAIM-1: CONFIRMED — HIGH — Bun.serve() routes support POST handlers with JSON body parsing
  Explorer: 10 existing POST handlers in server.ts (lines 129-462), all using `await req.json()` pattern
  Web (Bun docs): Bun.serve routes API (v1.2.3+) explicitly supports per-HTTP-method handlers `{ GET: fn, POST: async req => { const body = await req.json(); ... } }`. Bun 1.3 (Oct 2025) further enhanced routes with dynamic params.
  Adding `/api/entity/gate/decision` follows the identical pattern used by `/api/entity/score`, `/api/entity/comment`, etc.

- CLAIM-2: CONFIRMED — HIGH — Channel protocol can carry gate_decision meta type without changes
  Explorer: channel.ts:54-68 `onChannelMessage` callback receives `(content, meta)`. Only `meta?.type === "permission_response"` is special-cased (line 56); all other meta types fall through to the generic `mcp.notification({ method: "notifications/claude/channel", params: { content, meta: meta ?? {} } })` path (line 61-63).
  Explorer: `meta` typed as `Record<string, string>` in server.ts:24 and channel.ts (open schema, no validation).
  Web (MCP SDK): MCP supports custom notification methods with arbitrary params over JSON-RPC 2.0.
  A new `gate_decision` meta type requires zero protocol changes — it flows through the existing generic path.

- CLAIM-3: CONFIRMED — HIGH — Permission card UI pattern is directly reusable for gate approval cards
  Explorer: activity.js:325-404 `renderPermissionRequest()` creates a card with: header, description, dual buttons (Approve/Reject), click handlers that (1) disable both buttons immediately, (2) POST to /api/channel/send, (3) add `.resolved` class and verdict text on success, (4) re-enable on failure.
  This is exactly the UX pattern needed for gate approval cards — same dual-button, disable-on-click, resolve flow.

- CLAIM-4: CONFIRMED — HIGH — detail.js has no WebSocket; needs independent connection
  Explorer: Grep for "WebSocket" and "/ws/activity" in detail.js returned zero matches. detail.html (line 74) only loads `detail.js`, not `activity.js`.
  Web (Bun docs): WebSocket upgrade happens in the `fetch` fallback handler (server.ts:531), not in routes. Multiple browser clients can connect to the same `/ws/activity` endpoint — each gets its own ServerWebSocket instance subscribed to the "activity" topic via `ws.subscribe("activity")` (server.ts:485).
  No limitation on multiple concurrent WebSocket connections from different pages.

- CLAIM-5: CONFIRMED — HIGH — VALID_EVENT_TYPES and AgentEventType are already out of sync (existing bug)
  Explorer: types.ts:78-80 defines `AgentEventType` with 12 members: dispatch, completion, gate, feedback, merge, idle, channel_message, channel_response, permission_request, permission_response, **comment, suggestion**.
  Explorer: events.ts:3-6 defines `VALID_EVENT_TYPES` with only 10 members — **missing "comment" and "suggestion"**.
  This confirms the manual sync requirement AND reveals a pre-existing bug where comment/suggestion events would be rejected by EventBuffer.push() at runtime. The plan must add "gate_decision" to BOTH files and should also fix the existing "comment"/"suggestion" gap.

- CLAIM-7: CONFIRMED — HIGH — Feature 011 comment pattern can serve as Request Changes flow
  Explorer: detail.js:316-353 `submitComment()` POSTs to `/api/entity/comment` then calls `sendCommentToChannel()` which POSTs to `/api/channel/send` with `meta.type: "comment"`. The full pipeline: text selection -> tooltip -> POST comment -> channel notification to FO.
  "Request Changes" can trigger this same flow — captain selects problematic text, adds comment explaining the issue, which gets routed to FO via the existing channel. No new UI components needed for the basic flow.

### Corrected (2 claims)

- CLAIM-6: CORRECTION — MEDIUM — Gate state derivation is more nuanced than described
  Explorer: FO frontmatter `status` field reflects the current stage name (e.g., "plan", "execute"), NOT a separate "gate pending" flag. The `gate: true` property is on the stage definition in the workflow README, not on entity frontmatter.
  Explorer: first-officer-shared-core.md:117-131 — FO checks "whether the completed stage is gated" by reading stage properties. Gate state = entity `status` matches a stage that has `gate: true` in the README stage definition.
  **Fix**: The dashboard must cross-reference entity `status` against the workflow's stage definitions (already available in `WorkflowData.stages`) to determine if an entity is at a gate. It cannot derive this from entity frontmatter alone — it needs `stages.find(s => s.name === entity.status && s.gate)`. This is already available client-side since `/api/workflows` returns stage definitions including `gate: boolean`. The explore report's description is functionally correct but could mislead the planner into thinking gate state is a frontmatter field.

- CLAIM-8: CORRECTION — MEDIUM — "First writer wins" is NOT documented in FO protocol; race condition handling must be designed
  Explorer: first-officer-shared-core.md and claude-first-officer-runtime.md contain NO mention of "first writer wins", "duplicate decision", or "ignore subsequent" gate decisions. The FO protocol only states:
  - "never self-approve" (shared-core:129)
  - "Only the captain can approve or reject gates" (runtime:58)
  - "keep the worker alive while waiting at the gate" (shared-core:131)
  Explorer: The FO is an AI agent reading conversation context, not a state machine with duplicate-detection logic. If both CLI (captain text in terminal) and UI (channel message) send gate decisions, the FO would process whichever it sees first in its conversation, but there is NO explicit dedup mechanism.
  **Fix**: The plan must design an explicit race-condition strategy. Options:
  (a) UI-side: after sending gate decision via channel, disable buttons and show "Decision sent — waiting for FO confirmation". If FO already advanced (status changed), show "Already approved via CLI".
  (b) FO-side: document a convention where FO checks entity status before acting on a gate decision — if entity already advanced past the gated stage, ignore the late decision.
  (c) Both: UI polls entity status to detect if gate was already resolved elsewhere.
  The explore report's claim that "FO ignores duplicate decisions" is an assumption, not a verified behavior.

### Unverifiable (0 claims)

(None — all claims had sufficient evidence from codebase and documentation.)

### Recommendation Criteria

**REVISE** recommended because:
1. CLAIM-8 correction affects the race-condition handling strategy — a core architectural concern of this feature. The plan cannot assume "first writer wins" behavior exists; it must explicitly design dedup/race handling.
2. CLAIM-6 correction affects how the dashboard determines gate state — the plan must specify the cross-reference logic between entity status and workflow stage definitions, not imply gate state lives in entity frontmatter.
3. CLAIM-5 reveals a pre-existing bug (comment/suggestion missing from VALID_EVENT_TYPES) that should be fixed as part of this feature's event type additions.

## Stage Report: research

- [x] Claims extracted from plan (8 claims)
- [x] Explorer subagent dispatched and returned — codebase verification of all 8 claims with file:line citations
- [x] Context7 subagent dispatched and returned — library docs verified via Bun.sh official docs and MCP SDK GitHub
- [x] Web subagent dispatched and returned — Bun HTTP/WebSocket docs confirmed framework claims
- [x] Cross-reference synthesis completed — 6 CONFIRMED (HIGH), 2 CORRECTED (MEDIUM)
- [x] Research report written to entity
- [x] Insights cached to context lake (via prior explore stage insights; new findings documented in report)

## Stage Report: plan

- [x] Formal plan document created via `Skill: "superpowers:writing-plans"` and saved to `docs/superpowers/plans/2026-04-06-dashboard-gate-approval.md`
- [x] Plan has concrete file paths for all new and modified files — 4 backend files (types.ts, events.ts, server.ts, gate.test.ts) + 4 frontend files (detail.html, detail.js, detail.css, activity.js)
- [x] Plan uses test-first ordering — Tasks 1 and 2 write failing tests before implementation; Task 7 adds integration tests
- [x] Plan incorporates all research corrections:
  - CLAIM-5 bug fix: Task 1 adds "comment", "suggestion", "gate_decision" to VALID_EVENT_TYPES (events.ts lines 3-6)
  - CLAIM-6 gate derivation: Task 5 uses `stages.find(s => s.name === entityStatus && s.gate === true)` cross-referencing WorkflowData.stages
  - CLAIM-8 race condition: Task 5 implements UI-side handling — buttons disable immediately on click, confirmation dialog prevents accidental approval, WebSocket detects external gate_decision events, status polling (3s interval) detects when FO advances entity past gate
- [x] Plan includes quality gate steps — QG-1 through QG-6 covering type check, full test suite, and 4 manual E2E scenarios
