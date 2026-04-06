---
id: 021
title: Dashboard SQLite Persistence — Share Links & Event History 持久化
status: pr-review
source: captain feedback (013 testing session)
started: 2026-04-07T08:00:00Z
completed:
verdict:
score: 0.9
worktree: .worktrees/spacedock-ensign-dashboard-sqlite-persistence
issue:
pr: '#10'
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 017 completed (share link infrastructure)

## Brainstorming Spec

APPROACH:     使用 Bun 內建 `bun:sqlite`（零依賴）將 share links 和 event history 持久化到 SQLite。目前兩者都是 in-memory（Map + array），server 重啟後全部遺失。SQLite 檔案存放於 `~/.spacedock/dashboard.db`。Share links 表保留 token, passwordHash, entityPaths, stages, label, createdAt, expiresAt。Events 表保留 activity feed history。啟動時載入，寫入時同步。
ALTERNATIVE:  (A) JSON file persistence（rejected: 併發寫入不安全，沒有 query 能力）。(B) 外部 DB 如 PostgreSQL（rejected: 違反 zero-dependency 原則）。
GUARDRAILS:   使用 Bun 內建 `bun:sqlite`，不引入外部依賴。現有 API 不變 — 只改底層儲存。TTL expiry 仍由應用層處理（query 時過濾）。DB 檔案不進 git。
RATIONALE:    Captain 在測試 share link 時發現 server 重啟導致所有 share links 失效。同一 session 中 dashboard restart 也導致 activity feed 全部清空（5+ 小時歷史消失）。對於持續使用的場景（過夜 review、long-running pipeline monitoring），兩者都需要持久化。優先級提升至 0.9 — 影響日常使用體驗。

## Acceptance Criteria

- Share links 在 server 重啟後仍然有效
- Event history 在 server 重啟後保留（activity feed 不清空）
- SQLite 檔案位於 `~/.spacedock/dashboard.db`
- 現有 API 完全相容（無 breaking changes）
- 過期的 share links 仍由 TTL 控制（不因持久化而永久存在）
- `bun:sqlite` 零外部依賴
