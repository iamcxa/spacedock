---
id: 026
title: Dashboard Event Single Source of Truth — 移除 localStorage 冗餘快取
status: execute
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
