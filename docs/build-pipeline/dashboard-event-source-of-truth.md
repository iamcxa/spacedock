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
- `tools/dashboard/static/activity.js` — IIFE 包含 ActivityHistory localStorage 層（lines 41-112）：hydrate()、persist()、appendMany()、append()、dedupReplay()、detectSeqReset()、clear()。hydrate-before-connect 區塊 lines 821-839（bug 觸發點之一）。`clearHistory()` lines 804-814（bug 根源：只清 localStorage + DOM，不清 SQLite）。ws.onmessage 中 `history.appendMany()`/`history.append()` 散布在 lines 240、251。

**Server (src/)**
- `tools/dashboard/src/events.ts` — EventBuffer class，SQLite-backed ring buffer（capacity 500）。有 push/getSince/getAll，**缺 clear()**，需新增。
- `tools/dashboard/src/server.ts` — `/api/events` 路由（lines 416-443）有 GET/POST，**缺 DELETE**，需新增。WebSocket `open()` replay（lines 624-645）：一般連線呼叫 `eventBuffer.getAll()`，share 連線做 entity 過濾 replay。

**刪除對象**
- `tools/dashboard/src/activity-history.ts` — localStorage canonical TypeScript source，移除後整個刪除（grep 確認無其他檔案 import 它）。
- `tools/dashboard/src/activity-history.test.ts` — 測試覆蓋的功能全部消失，整個刪除。

**測試**
- `tests/dashboard/events.test.ts` — EventBuffer 整合測試（bun:test + in-memory SQLite），需新增 `clear()` 測試案例。
- `tests/dashboard/server.test.ts` — HTTP 整合測試（createServer port:0），需新增 `DELETE /api/events` 測試案例。

### 2. Context lake insights — DONE

六個 store_insight 呼叫完成：activity.js、activity-history.ts、server.ts、events.ts、activity-history.test.ts、events.test.ts。

### 3. Scale confirmation — DONE

實際修改檔案：
1. `tools/dashboard/static/activity.js` — 主要修改（刪 history IIFE 全部 localStorage 呼叫、刪 hydrate-before-connect 區塊、改 clearHistory()）
2. `tools/dashboard/src/events.ts` — 新增 `clear()` 方法
3. `tools/dashboard/src/server.ts` — 新增 `DELETE /api/events` 路由

刪除檔案：
4. `tools/dashboard/src/activity-history.ts`
5. `tools/dashboard/src/activity-history.test.ts`

測試更新：
6. `tests/dashboard/events.test.ts` — 新增 clear() 案例
7. `tests/dashboard/server.test.ts` — 新增 DELETE 路由案例

**結論：scale = Small 確認正確**。核心修改 3 個檔案，另有 2 個刪除 + 2 個測試更新。影響範圍集中，無跨模組耦合。dedupReplay/detectSeqReset 邏輯保留在 activity.js（現在純粹基於 in-memory lastSeq，不再涉及 localStorage）。

### 4. Coverage infrastructure discovery — DONE

測試框架：**bun:test**（Bun 原生，無 jest/vitest）

- `tools/dashboard/src/activity-history.test.ts` — 單元測試，MockStorage DI，26 個測試案例。**移除 localStorage 後整個刪除。**
- `tests/dashboard/events.test.ts` — 整合測試，openDb(":memory:") in-process SQLite，8 個現有案例。需新增 clear() 案例。
- `tests/dashboard/server.test.ts` — HTTP 整合測試，createServer({port: 0, dbPath: ":memory:"})，包含 /api/events GET/POST 測試。需新增 DELETE 案例。

執行指令：`bun test`（在 worktree root 或 tools/dashboard/ 下）

### 5. Root cause diagnosis — DONE

**根本原因確認**：`clearHistory()`（activity.js lines 804-814）只清 localStorage（`history.clear()`）和 DOM（`clearFeedDom()`），重置 `lastSeq = 0`，**從未觸及 SQLite**。

重新整理頁面後的重現路徑：
1. `hydrate()` 回傳空陣列（localStorage 已清）→ lastSeq = 0
2. WebSocket 連線 → server `open()` 呼叫 `eventBuffer.getAll()`（SQLite 從未清過）→ replay 全部 500 筆
3. browser 接收 replay，dedupReplay(events, lastSeq=0) → 全部 500 筆都是「新」事件
4. 所有舊事件（包含缺少 `request_id` 的 `permission_request`）再次渲染

permission card 卡住的二級原因：早期 session 的 `permission_request` 事件 detail 缺少 `request_id` 欄位，`permissionTracker.track()` 在 `event.request_id` 為 falsy 時跳過加入 `pending`，因此這些 card 永遠不會被 `markResolved()` 處理。

**修復路徑**：`clearHistory()` 改為先 `fetch("/api/events", { method: "DELETE" })` 清 SQLite，成功後再 `clearFeedDom()` + 重置 lastSeq。同時移除整個 localStorage 層，SQLite 成為唯一 source of truth。

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
