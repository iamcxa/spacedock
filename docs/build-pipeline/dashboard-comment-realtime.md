---
id: 027
title: Dashboard Comment Realtime — 即時推送 + Reply 雙向通道
status: quality
source: captain observation (026 shipping session — reply 不顯示 + comment 需刷新)
started: 2026-04-08T03:26:00Z
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
