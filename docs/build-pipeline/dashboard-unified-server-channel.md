---
id: 024
title: Dashboard Unified Server + Channel — 消除雙 Instance 問題
status: explore
source: captain feedback (021 tunnel + channel testing)
started: 2026-04-08T10:00:00+08:00
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-unified-server-channel
issue:
pr:
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

## Stage Report

### 1. File List Grouped by Layer — DONE

**Layer: channel (MCP subprocess, Claude Code managed)**
- `tools/dashboard/src/channel.ts` — MCP Server + HTTP dashboard launcher；`import.meta.main` 建立 StdioServerTransport 與 Claude Code 通訊，預設 port 8420，不寫任何 state file
- `.mcp.json` (repo root) — Claude Code MCP 設定，直接 spawn `bun tools/dashboard/src/channel.ts`（無 port 參數）

**Layer: server (ctl.sh daemon)**
- `tools/dashboard/src/server.ts` — `createServer()` 核心 HTTP+WebSocket factory；CLI entry point 接受 `--host`/`--port`/`--root`/`--log-file`
- `tools/dashboard/src/events.ts` — SQLite-backed EventBuffer (capacity 500)，供 WebSocket replay

**Layer: ctl.sh**
- `tools/dashboard/ctl.sh` — bash-only lifecycle manager；`do_start()` 依 `--channel` flag 決定啟動 server.ts 或 channel.ts；`do_tunnel_start()` 只從 `STATE_DIR/port` 讀 port，不知道外部 channel.ts instance

**Layer: domain/support**
- `tools/dashboard/src/discovery.ts` — 遞迴 walk 找 workflow 目錄（不需修改）
- `tools/dashboard/src/api.ts` — entity CRUD helpers（不需修改）
- `tools/dashboard/src/auth.ts` — ShareRegistry（不需修改）
- `tools/dashboard/src/db.ts` — SQLite schema init（不需修改）
- `tools/dashboard/src/types.ts` — 共用型別（不需修改）
- `tools/dashboard/src/telemetry.ts` — PostHog/Sentry 整合（不需修改）
- `tools/dashboard/src/frontmatter-io.ts` — frontmatter 讀寫（不需修改）
- `tools/dashboard/src/comments.ts` — comment/suggestion CRUD（不需修改）
- `tools/dashboard/src/parsing.ts` — YAML frontmatter parser（不需修改）
- `tools/dashboard/src/permission-tracker.ts` — permission 狀態追蹤（不需修改）
- `tools/dashboard/src/activity-history.ts` — activity 歷史（不需修改）

**Layer: dashboard UI (static)**
- `tools/dashboard/static/activity.js` — WebSocket client；已處理 `channel_status` 事件（line 254）；不需修改
- `tools/dashboard/static/app.js` — workflow entity 列表 UI（不需修改）
- `tools/dashboard/static/index.html`, `detail.html`, `share.html` — HTML 入口（不需修改）
- `tools/dashboard/static/detail.js`, `share.js`, `editor.js`, `visualizer.js`, `dependency-graph.js` — 各頁面 JS（不需修改）
- `tools/dashboard/static/style.css`, `detail.css` — 樣式（不需修改）

**Layer: skill**
- `skills/dashboard/SKILL.md` — `/dashboard share` flow；Step 1/3 假設只有 ctl.sh instance，需更新以支援 channel instance 偵測

**Layer: tests**
- `tests/dashboard/ctl.test.ts` — ctl.sh 整合測試（需新增 channel detection 測試）
- `tests/dashboard/channel.test.ts` — channel server 測試（需新增 state file 寫入測試）
- `tests/dashboard/server.test.ts` — HTTP server 測試（不需修改）
- `tests/dashboard/api.test.ts`, `events.test.ts`, `share.test.ts`, `discovery.test.ts`, `frontmatter-io.test.ts`, `parsing.test.ts`, `telemetry.test.ts` — 其他測試（不需修改）

### 2. Context Lake Insights — DONE

已為以下檔案呼叫 `store_insight`：
- `tools/dashboard/ctl.sh` — detection gap 分析、key functions
- `tools/dashboard/src/channel.ts` — launch context、state file missing 問題
- `tools/dashboard/src/server.ts` — createServer API、CLI entry point、channel status
- `tools/dashboard/src/events.ts` — EventBuffer 摘要
- `tools/dashboard/static/activity.js` — channel_status handling
- `skills/dashboard/SKILL.md` — share flow gap
- `.mcp.json` — 雙 instance 根本原因

### 3. Scale Confirmation — DONE

維持 **Medium** 不變。

實際受影響檔案：
- 需修改：`ctl.sh`, `channel.ts`, `skills/dashboard/SKILL.md` (3 files)
- 需新增測試：`tests/dashboard/ctl.test.ts`, `tests/dashboard/channel.test.ts` (2 files)
- 合計 5 檔案，改動集中，邏輯清楚。Medium 正確。

### 4. Coverage Infrastructure — DONE

- **Coverage command**: `bun test --coverage`（documented in `tools/dashboard/README.md` line 172）
- **Test runner**: Bun built-in (`bun:test`)，tests 在 `tests/dashboard/`
- **Coverage format**: Bun 原生輸出（text table to stdout），無 Istanbul JSON 或 LCOV 輸出設定
- **Comparison script**: 無（`.github/workflows/release.yml` 無 coverage 步驟）
- **Baseline strategy**: 無 CI coverage baseline；無已 committed coverage 檔案
- **結論**: coverage 為 local dev only，無 CI enforcement，無 baseline 比較

### 5. Dual-Instance Architecture Mapping — DONE

**server.ts 啟動路徑（ctl.sh managed）:**
```
ctl.sh start
  → nohup bun tools/dashboard/src/server.ts --port PORT --root ROOT --log-file LOG
  → 寫 STATE_DIR/pid, STATE_DIR/port, STATE_DIR/root
  → server.ts: createServer({port, hostname:"127.0.0.1", ...})
  → HTTP + WebSocket on PORT, channelConnected=false
```

**channel.ts 啟動路徑（Claude Code managed）:**
```
.mcp.json → Claude Code spawns: bun tools/dashboard/src/channel.ts
  → channel.ts: createChannelServer({port:8420, ...})
    → createServer({port:8420, hostname:"127.0.0.1", ...})
    → StdioServerTransport.connect() — stdout 接管做 MCP
  → 不寫任何 state file
  → HTTP + WebSocket on 8420, channelConnected=true
```

**重疊與衝突：**
- 兩者都呼叫 `createServer()`，監聽 HTTP + WebSocket
- 若同時存在，port 8420 衝突（channel.ts 固定 8420，server.ts 的 find_free_port 會選 8421+）
- `ctl.sh tunnel start` 只讀 `STATE_DIR/port`，channel.ts instance 無此 file → tunnel 找錯 port 或失敗
- `ctl.sh status` 不顯示 channel.ts instance
- `ctl.sh stop` 不影響 channel.ts（claude code 管的），這是**正確**行為

**偵測方案評估：**
1. **Port scan** (`port_in_use()` already exists in ctl.sh) — 可掃 8420-8429 找 HTTP 200 回應，但無法區分 channel vs server instance
2. **State file by channel.ts** — channel.ts 啟動時寫 `STATE_DIR/channel_port`，ctl.sh 讀此 file（**推薦**：bash-friendly，無 race，精確）
3. **pgrep/ps** — `pgrep -f "channel.ts"` 找 PID，再從 `/proc/PID/cmdline` 找 port — macOS/Linux 相容性差，且 port 不在 cmdline 裡（無 --port 參數）

**推薦實作：**
- `channel.ts` 啟動時寫 `~/.spacedock/dashboard/{hash}/channel_port`
- `ctl.sh` 新增 `is_channel_running()` 函數讀此 file 並驗證 port 可用
- `do_tunnel_start()` 優先用 channel_port，fallback 到 port（server.ts mode）
- `do_status()` 顯示 channel instance 行

### 6. Dependency Verification — DONE

Entity 023 (`dashboard-tunnel-hot-attach`) 已 shipped。

Git log 確認：
```
30fd55a shipped: 023 dashboard-tunnel-hot-attach — archived
d7be279 feat(dashboard): hot-attach ngrok tunnel without server restart (#14)
```

Entity 023 的成果（`do_tunnel_start()` hot-attach 邏輯、ngrok `/api/endpoints` 輪詢）已在當前 branch 上可用。024 可直接在此基礎上擴充 channel detection。

## Coverage Infrastructure

- **Coverage command**: `bun test --coverage` (在 `tools/dashboard/` 目錄執行)
- **Comparison script**: 無
- **Format**: Bun 原生 text table，無 JSON/LCOV 輸出
- **Baseline strategy**: 無 CI baseline，本地開發用
