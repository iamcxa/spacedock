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

## Technical Claims

CLAIM-1: [type: project-convention] "channel.ts writes no state files — no pid/port written to STATE_DIR"
CLAIM-2: [type: project-convention] "channel.ts hardcodes port 8420 with no CLI override"
CLAIM-3: [type: project-convention] "channel.ts can determine STATE_DIR hash (needs project root for hashing)"
CLAIM-4: [type: project-convention] "ctl.sh port_in_use() function exists and works"
CLAIM-5: [type: project-convention] "createServer() is shared between server.ts and channel.ts with same API surface"
CLAIM-6: [type: library-api] "Bun supports process signal handling (SIGTERM/SIGINT) for cleanup on exit"
CLAIM-7: [type: project-convention] "ctl.sh stop only kills its own server.ts PID, not channel.ts"
CLAIM-8: [type: project-convention] "Entity 023 hot-attach tunnel reads port from STATE_DIR and would need channel_port support"

## Research Report

**Claims analyzed**: 8
**Recommendation**: PROCEED (with 1 minor correction noted)

### Verified (7 claims)

- CLAIM-1: HIGH — channel.ts writes no state files
  Codebase: Grep for `STATE_DIR|channel_port|writeFile|mkdirSync` in channel.ts returns zero matches. channel.ts only calls `createServer()` and `mcp.connect()`. No filesystem writes for state.

- CLAIM-3: HIGH — channel.ts CAN determine STATE_DIR hash
  Codebase: channel.ts lines 150-159 resolve `projectRoot` via `git rev-parse --show-toplevel` (same as ctl.sh). Can compute `PROJ_HASH=$(echo -n "$ROOT" | shasum | cut -c1-8)` equivalent in TS using `crypto.createHash("sha1")`.

- CLAIM-4: HIGH — ctl.sh `port_in_use()` exists
  Codebase: ctl.sh lines 109-111: `port_in_use() { (echo >/dev/tcp/localhost/"$1") 2>/dev/null }`. Also `find_free_port()` at lines 113-124 scans 8420-8429.

- CLAIM-5: HIGH — `createServer()` is shared
  Codebase: server.ts:49 exports `createServer(opts: ServerOptions)`. channel.ts:8 imports it. channel.ts:49 calls `createServer({port, hostname:"127.0.0.1", ...onChannelMessage})`. server.ts CLI (line 1057) calls `createServer({port, hostname, ...})` without `onChannelMessage`. Same factory, channel adds MCP callback. Return type (line 1025): `Object.assign(server, { db, eventBuffer, publishEvent, broadcastChannelStatus, shareRegistry })`.

- CLAIM-6: HIGH — Bun supports process signal handling
  Bun docs (bun.sh/guides/process/os-signals): `process.on("SIGINT", () => {...})` supported. Also `process.on("beforeExit")` and `process.on("exit")`. Standard Node.js `process` global works in Bun. Channel.ts can register `process.on("SIGTERM")` to clean up state file on exit.

- CLAIM-7: HIGH — ctl.sh stop only kills its own server.ts
  Codebase: `do_stop()` (lines 328-369) reads PID from `$PID_FILE` (`$STATE_DIR/pid`). channel.ts never writes `$STATE_DIR/pid`, so `do_stop()` cannot target it. If no PID file exists → "Dashboard is not running." Safe.

- CLAIM-8: HIGH — Tunnel hot-attach reads from STATE_DIR (with important note)
  Codebase: `do_tunnel_start()` (lines 141-200): line 143 checks `is_running()` (requires PID file), line 150 reads `$PORT_FILE`. Both in STATE_DIR.
  **Important**: `do_tunnel_start()` currently gates on `is_running()` (PID file check) at line 143-145. Even if channel.ts writes `channel_port`, `do_tunnel_start()` will REJECT with "dashboard is not running" because no PID file exists. The fix must ALSO add an `is_channel_running()` check that reads `channel_port` file and verifies the port responds, and update `do_tunnel_start()` to try channel_port when `is_running()` returns false.

### Corrected (1 claim)

- CLAIM-2: MINOR CORRECTION — channel.ts does NOT hardcode port 8420 without override
  Codebase: channel.ts lines 140-148 show `parseArgs` with `--port` option (default "8420"). It DOES accept `--port` CLI override via `parseArgs({ options: { port: { type: "string", default: "8420" } } })`.
  However, `.mcp.json` spawns with no `--port` arg: `"args": ["tools/dashboard/src/channel.ts"]`. In practice always 8420, but the CLI capability exists.
  Explore report said "no CLI override" — this is incorrect but has no impact on the approach (channel.ts state file should write whatever port it actually binds to, which it knows from `dashboard.port`).

### Unverifiable (0 claims)

None — all claims verified from codebase and/or official Bun docs.

### Edge Cases Discovered

1. **do_tunnel_start() guard**: The `is_running()` guard at line 143 blocks tunnel start when only channel.ts is active (no PID file). Plan must address this — add `is_channel_running()` as alternative path.

2. **State file cleanup race**: If Claude Code kills channel.ts with SIGKILL (no handler runs), `channel_port` file becomes stale. Detection: `port_in_use()` on the stored port. ctl.sh already has this function — reuse for validation.

3. **Hash consistency**: channel.ts uses `git rev-parse --show-toplevel` which resolves symlinks differently in worktrees. Verify that worktree root and main repo root produce the same hash. In practice: worktrees have their own `.git` file → `git rev-parse --show-toplevel` returns worktree root, not main repo root. This means a worktree channel.ts would compute a DIFFERENT hash than `ctl.sh` run from the main repo. **Mitigation**: channel.ts should resolve to the actual repo root (following `.git` file if it's a worktree pointer), OR the STATE_DIR hash should be documented as "per-working-directory" which is actually correct behavior (different worktrees = different dashboard instances).

4. **status --all gap**: `do_status_all()` (lines 416-453) only scans for `pid` files. It won't show channel-only instances. Plan should add `channel_port` file scanning to `do_status_all()`.

### Recommendation Criteria

- 1 minor correction (CLAIM-2: `--port` CLI exists but unused in .mcp.json) — does not affect control flow or data model
- 0 architectural corrections
- 3 edge cases discovered (tunnel guard, cleanup race, worktree hash) — all addressable in plan
- **Recommendation: PROCEED** — all technical assumptions are sound, correction is minor

## Stage Report: research

- [x] Claims extracted from plan (8 claims)
- [x] Explorer verification — codebase cross-checked for all 8 claims
- [x] Context7/Library docs verification — Bun signal handling confirmed via official docs
- [x] Web research verification — Bun process.on() SIGTERM/SIGINT support confirmed
- [x] Cross-reference synthesis completed — all HIGH confidence
- [x] Research report written to entity
- [x] Corrections documented (1 minor: CLAIM-2 --port CLI exists)
- [x] Edge cases documented (tunnel guard, cleanup race, worktree hash, status --all)

## Stage Report: plan

- [x] Plan document created — formal plan saved to `docs/superpowers/specs/2026-04-08-dashboard-unified-server-channel.md` with 6 tasks, TDD ordering (failing tests -> implementation -> verification), concrete file paths
- [x] Research corrections incorporated — CLAIM-2 correction (use `dashboard.port` not hardcoded 8420), all 4 edge cases addressed: (1) `do_tunnel_start()` guard updated to try `is_channel_running()` as alternative, (2) SIGKILL cleanup race handled via `port_in_use()` validation in `is_channel_running()`, (3) worktree hash addressed in `computeStateDir` documentation note, (4) `do_status_all()` updated to scan `channel_port` files
- [x] Quality gate steps included — `bun test` (channel + ctl), `bun build` type-check, `bash -n` syntax check, backward compatibility verification
- [x] Plan committed on branch (3da5241)

## Stage Report: execute

1. **Task 1 complete** — DONE. channel.ts failing tests committed (ac0bcfa). Added `Channel State File` describe block with 5 tests: writeChannelState, writeChannelState actual port, cleanChannelState, cleanChannelState no-op, computeStateDir.
2. **Task 2 complete** — DONE. channel.ts state file implementation committed (f9b9427). Added `computeStateDir()`, `writeChannelState()`, `cleanChannelState()` exports. Wired into CLI entry point with SIGTERM/SIGINT/exit cleanup handlers and mcp.onclose cleanup. Hash consistency verified (bash shasum == Node crypto.createHash("sha1")). All 15 channel tests pass.
3. **Task 3 complete** — DONE. ctl.sh failing tests committed (a0d79fc). Added `Channel Detection` describe block with 5 tests: status shows channel, stale cleanup, tunnel without PID, status --all, stop safety.
4. **Task 4 complete** — DONE. ctl.sh channel detection implementation committed (b1784b8). Added `CHANNEL_PORT_FILE`, `is_channel_running()`, `get_channel_port()`, `clean_stale_channel()`. Updated `do_tunnel_start()` to try channel port when no PID file. Replaced `do_status()` with server+channel dual detection. Replaced `do_status_all()` to scan channel_port files. Two test adjustments: stale cleanup message changed to avoid "channel" substring match, tunnel test timeout increased to 20s (ngrok installed in CI). All 13 ctl tests pass.
5. **Task 5 complete** — DONE. SKILL.md share flow updated and committed (06090be). Step 1 now mentions "server or channel" detection. Step 3 reads `channel_port` as fallback when `port` file is absent.
6. **Task 6 complete** — DONE. All integration checks pass:
   - Channel tests: 15 pass, 0 fail
   - Ctl tests: 13 pass, 0 fail
   - Type-check: `bun build` bundles successfully, no TS errors
   - Bash syntax: `bash -n ctl.sh` clean (exit 0)
   - Backward compat: all original `Dashboard ctl.sh` tests still pass (server-only mode unmodified)
