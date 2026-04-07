---
id: 023
title: Dashboard Tunnel Hot-Attach — ngrok 無需重啟 Server
status: explore
source: captain feedback (021 share flow testing)
started: 2026-04-07T09:15:00Z
completed:
verdict:
score: 0.8
worktree: .worktrees/spacedock-ensign-dashboard-tunnel-hot-attach
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Feature 021 completed (SQLite persistence)
- Feature 017 completed (share link + tunnel infrastructure)

## Brainstorming Spec

APPROACH:     讓 ngrok tunnel 可以 hot-attach 到已跑的 dashboard，不需要 restart server process。新增 `ctl.sh tunnel start/stop/status` 子命令，獨立管理 ngrok lifecycle。`/dashboard share` 流程改用 tunnel start 而非 restart --tunnel，避免斷開 Channel WebSocket 連線。
ALTERNATIVE:  (A) 保持現狀 restart（rejected: 斷開 Channel 連線是嚴重 UX 問題，captain 在 021 測試中發現）。(B) 在 server.ts 內建 ngrok spawn（rejected: 違反 ctl.sh 管理 daemon lifecycle 的職責分離）。
GUARDRAILS:   不改動 server.ts — ngrok 是外部 process，由 ctl.sh 管理。現有 `--tunnel` flag 在 start 時仍可用（backward compat）。tunnel start 要檢查 dashboard 是否在跑。tunnel stop 要清理 PID/URL files。
RATIONALE:    `/dashboard share` 會觸發 restart 重啟 server，導致 Channel disconnected（MCP WebSocket 斷線）。ngrok 只是一個 reverse proxy — 它連到 localhost:PORT，完全不需要 server 重啟。分離 tunnel lifecycle 讓 share flow 無損。

## Acceptance Criteria

- `ctl.sh tunnel start` 可在 dashboard 已跑時啟動 ngrok（不重啟 server）
- `ctl.sh tunnel stop` 可關閉 ngrok（不影響 dashboard）
- `ctl.sh tunnel status` 顯示 tunnel URL 或 "not running"
- `/dashboard share` 使用 `tunnel start` 而非 `restart --tunnel`
- 現有 `ctl.sh start --tunnel` 保持 backward compatible
- Channel WebSocket 連線在 share flow 中不中斷
