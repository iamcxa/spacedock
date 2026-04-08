---
id: 024
title: Dashboard Unified Server + Channel — 消除雙 Instance 問題
status: pr-review
source: captain feedback (021 tunnel + channel testing)
started: 2026-04-08T10:00:00+08:00
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-unified-server-channel
issue:
pr: '#15'
intent: feature
scale: Medium
project: spacedock
depends-on: [023]
---

## Dependencies

- Feature 007 completed (channel plugin)
- Feature 021 completed (SQLite persistence)
- Feature 023 in progress (tunnel hot-attach)

## Problem

Dashboard 目前有兩種啟動模式，產生雙 instance 問題：

| | `ctl.sh start` (Dashboard mode) | `.mcp.json` (Channel mode) |
|---|---|---|
| 進程 | `bun server.ts` (daemon) | `bun channel.ts` (Claude Code subprocess) |
| Port | 8421 (auto-selected) | 8420 (default) |
| MCP Channel | ❌ 無 | ✅ StdioServerTransport |
| ctl.sh 管理 | ✅ start/stop/status | ❌ Claude Code 管理 |
| Tunnel | ✅ `--tunnel` flag | ❌ 需手動 |

Captain 想要 tunnel + channel 同時可用，但目前必須手動把 ngrok 指向 channel instance。
`ctl.sh` 不知道 channel.ts instance 的存在，channel.ts 不知道 ctl.sh 的 tunnel 功能。

## Brainstorming Spec

APPROACH:     讓 ctl.sh 偵測 Claude Code spawn 的 channel.ts instance（透過 port scan 或 PID file），並讓 tunnel/share 功能直接 attach 到那個 instance。如果沒有 channel instance，fallback 到現有 server.ts 模式。ctl.sh 成為「找到最佳 dashboard instance 並管理周邊功能（tunnel, share）」的統一入口。
ALTERNATIVE:  (A) 讓 channel.ts 自己管理 tunnel（rejected: 違反 ctl.sh 管 lifecycle 的職責分離）。(B) 合併 server.ts 和 channel.ts 為同一個 binary，啟動時偵測是否被 Claude Code spawn（rejected: 過度耦合）。(C) 讓 ctl.sh start --channel 也能建立 MCP 連線（rejected: ctl.sh 是 bash script，不能建立 stdio MCP transport）。
GUARDRAILS:   不改動 channel.ts 的 MCP 連線機制。ctl.sh 保持 bash-only（no Python/Node dependency）。偵測邏輯要 robust（port 可能被其他 process 佔用）。
RATIONALE:    Dashboard 的價值在於 channel 連線（可以跟 Claude Code 雙向溝通）+ tunnel（可以公開分享）。兩者分離在不同 instance 讓 UX 破碎 — captain 必須手動管理兩個 process。統一偵測讓 `/dashboard share` 自動做正確的事。

## Acceptance Criteria

- `ctl.sh status` 顯示 channel.ts instance（如果有的話）
- `ctl.sh tunnel start` 自動偵測 channel instance 並 attach ngrok 到正確的 port
- `/dashboard share` 在 channel mode 下不需要重啟任何 process
- 如果沒有 channel instance，`ctl.sh start --tunnel` 行為不變（backward compat）
- Channel WebSocket 連線在整個 share flow 中不中斷
- `ctl.sh stop` 不會 kill Claude Code 管理的 channel.ts（只管自己啟動的 server.ts）
