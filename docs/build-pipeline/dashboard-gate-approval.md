---
id: 016
title: Dashboard Gate Approval — UI 上的階段審批與 PR-style Review
status: research
source: /build brainstorming
started: 2026-04-06T07:30:00Z
completed:
verdict:
score: 0.95
worktree: .worktrees/auto-researcher-dashboard-gate-approval
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
