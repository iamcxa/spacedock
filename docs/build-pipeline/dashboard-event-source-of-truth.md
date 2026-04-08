---
id: 026
title: Dashboard Event Single Source of Truth — 移除 localStorage 冗餘快取
status: explore
source: captain observation (024 shipping session — stale permission cards)
started: 2026-04-08T08:50:00+08:00
completed:
verdict:
score: 0.75
worktree: .worktrees/spacedock-ensign-dashboard-event-source-of-truth
issue:
pr:
intent: bugfix
scale: Small
project: spacedock
---

## Stage Report

### 1. File list grouped by layer — DONE

**Browser (static/)**
- `tools/dashboard/static/activity.js` — IIFE 包含 ActivityHistory localStorage 層（lines 41-112）、hydrate-before-connect（lines 821-839）、`clearHistory()`（lines 804-814，bug 根源）、所有 `history.*` 呼叫散布在 ws.onmessage 處理中

**Server (src/)**
- `tools/dashboard/src/events.ts` — EventBuffer class，SQLite-backed ring buffer；需新增 `clear()` 方法
- `tools/dashboard/src/server.ts` — `/api/events` 路由（lines 416-443）有 GET/POST，缺 DELETE；WebSocket `open()` replay 邏輯（lines 624-645）

**刪除對象**
- `tools/dashboard/src/activity-history.ts` — localStorage canonical TypeScript source，移除後可整個刪除（無其他檔案 import 它）
- `tools/dashboard/src/activity-history.test.ts` — 測試覆蓋的功能全部消失，整個刪除

**測試**
- `tests/dashboard/events.test.ts` — EventBuffer 現有測試，需新增 `clear()` 測試案例
- `tests/dashboard/server.test.ts` — HTTP 整合測試，需新增 `DELETE /api/events` 測試案例

### 2. Context lake insights — DONE

四個 store_insight 呼叫完成（activity.js、activity-history.ts、server.ts、events.ts）。

### 3. Scale confirmation — DONE

實際修改檔案：
1. `tools/dashboard/static/activity.js` — 主要修改（刪 localStorage 層、改 clearHistory）
2. `tools/dashboard/src/events.ts` — 新增 `clear()` 方法
3. `tools/dashboard/src/server.ts` — 新增 `DELETE /api/events` 路由

刪除檔案：
4. `tools/dashboard/src/activity-history.ts`
5. `tools/dashboard/src/activity-history.test.ts`

測試更新：
6. `tests/dashboard/events.test.ts` — 新增 clear() 測試
7. `tests/dashboard/server.test.ts` — 新增 DELETE 路由測試

**結論：scale = Small 確認正確**。核心修改 3 個檔案，另有 2 個刪除 + 2 個測試更新。影響範圍集中，無跨模組耦合。

### 4. Coverage infrastructure discovery — DONE

測試框架：**bun:test**（Bun 原生）

- `tools/dashboard/src/activity-history.test.ts` — 單元測試，MockStorage DI，26 個測試案例（hydrate/append/appendMany/dedupReplay/detectSeqReset/clear + integration scenarios）
- `tests/dashboard/events.test.ts` — 整合測試，openDb(":memory:") in-process SQLite，8 個測試案例
- `tests/dashboard/server.test.ts` — HTTP 整合測試，createServer({port: 0}) random port，包含 /api/events GET/POST 的測試

執行指令：`bun test`（在 tools/dashboard/ 下）

### 5. Root cause diagnosis — DONE

**根本原因確認**：`clearHistory()`（activity.js line 804-814）只清 localStorage（`history.clear()`）和 DOM（`clearFeedDom()`），並重置 `lastSeq = 0`。

清除後 WebSocket 若中斷重連，`open()` handler 會呼叫 `eventBuffer.getAll()`（SQLite，從未被清除），立即 replay 全部 500 筆事件回 browser。若不重連，重新整理頁面後：
1. `hydrate()` 回傳空陣列（localStorage 已清）
2. WebSocket 連線 → server replay SQLite 全部事件
3. 所有舊事件（包含缺少 `request_id` 的 `permission_request`）再次出現

缺少 `request_id` 的 `permission_request` 事件無法被 permissionTracker 折疊（`track()` 只在 `event.request_id` 存在時加入 `pending`），導致 29h 前的 permission card 永遠殘留在 feed 裡。

**修復路徑**：`clearHistory()` 改為 `fetch("/api/events", { method: "DELETE" })` 先清 SQLite，成功後再 `clearFeedDom()`，完全消除舊事件重現問題。

## Dependencies

- None

## Problem

Activity feed 事件同時存在 SQLite DB（server, 容量 500）和 localStorage（browser, 無上限）兩份。`Clear history` 只清 localStorage，但 WebSocket 連線時 server 立即 `getAll()` replay 全部 500 條回來 — 舊事件又出現。

早期 session 的 `permission_request` 事件缺少 `request_id`，無法被 permission tracker 折疊，導致 29h 前的未解決 permission cards 永遠卡在 feed 裡。

根本原因：localStorage cache 與 SQLite DB 是重複的 state，造成 state 分裂。WebSocket replay 延遲 <100ms（本地 server），instant paint 價值極低。

## Brainstorming Spec

APPROACH:     移除 localStorage 作為 event cache。SQLite DB 成為唯一 source of truth。activity.js 的 hydrate 改為空操作，移除 dedup/detectSeqReset 邏輯。`Clear history` 改為呼叫 `DELETE /api/events` 清 SQLite + 清 DOM。整個 ActivityHistory localStorage 層可以拿掉。
ALTERNATIVE:  (A) 保留 localStorage 但讓 Clear 也清 SQLite（最小修，但保留冗餘架構）(rejected: 治標不治本，dedup 邏輯仍是技術債)。(B) 加 TTL 讓舊事件自動過期（rejected: 不解決根本的雙 source 問題）。
GUARDRAILS:   WebSocket replay 行為不變。feed 視覺呈現不變。permission tracker 折疊邏輯不動。share page 的 filtered replay 不受影響。
RATIONALE:    Captain 觀察到 Clear history 無法真正清除舊事件。架構分析確認 localStorage 是多餘的 — WebSocket replay 是同樣的資料，延遲可忽略。移除冗餘層簡化程式碼並消除 state 分裂。

## Acceptance Criteria

- `Clear history` 清除 SQLite DB 事件 + DOM，重新整理後 feed 為空
- 移除 localStorage event cache（不再寫入或讀取 `spacedock-activity-history`）
- WebSocket replay 仍為 feed 唯一資料來源
- 缺少 `request_id` 的舊 permission_request 事件在清除後不再出現
- share page filtered replay 不受影響
- 現有 permission tracker 折疊邏輯不變
