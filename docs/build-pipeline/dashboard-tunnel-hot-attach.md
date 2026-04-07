---
id: 023
title: Dashboard Tunnel Hot-Attach — ngrok 無需重啟 Server
status: plan
source: captain feedback (021 share flow testing)
started: 2026-04-07T09:15:00Z
completed:
verdict:
score: 0.8
worktree:
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

## Explore Results

**Scale:** Small (2 files to modify)

**File map:**

| File | Layer | Purpose |
|------|-------|---------|
| `tools/dashboard/ctl.sh` | infra | Extract tunnel spawn block into `tunnel start/stop/status` subcommands |
| `skills/dashboard/SKILL.md` | skill | Fix `/dashboard share` flow: `restart --tunnel` → `tunnel start` |

**Notes:**
- Health check bug fix (`return 0` → `break`) already landed on main (commit `2ac2388`)
- ngrok is an external OS process — it connects to `localhost:PORT` as a reverse proxy
- Dashboard MCP channel uses stdio transport, has no `instructions` field, single static `reply` tool
- ngrok lifecycle is entirely managed by `ctl.sh`, zero references in `server.ts` or `channel.ts`
- #44731 (MCP instruction delta fork) assessed as **zero risk** — tunnel start/stop does not touch MCP transport

## Technical Claims

CLAIM-1: [type: project-convention] "ctl.sh has tunnel spawn logic embedded in the `start` subcommand (do_start), not as a separate subcommand"
CLAIM-2: [type: tool-behavior] "ngrok can be started independently pointing at an already-running localhost server — it is a reverse proxy to localhost:PORT"
CLAIM-3: [type: project-convention] "The `/dashboard share` skill triggers `restart --tunnel` when dashboard is running but tunnel is not active"
CLAIM-4: [type: project-convention] "Backward compat: `--tunnel` flag on `start` subcommand must be preserved"
CLAIM-5: [type: tool-behavior] "ngrok local API at http://127.0.0.1:4040/api/tunnels returns the public tunnel URL"
CLAIM-6: [type: project-convention] "ctl.sh uses STATE_DIR files (tunnel_pid, tunnel_url) to track tunnel state; clean_stale removes them"
CLAIM-7: [type: project-convention] "ngrok lifecycle is entirely managed by ctl.sh — zero references in server.ts or channel.ts"
CLAIM-8: [type: project-convention] "ctl.sh currently has only 5 subcommands: start, stop, status, logs, restart — no `tunnel` subcommand exists"
CLAIM-9: [type: domain-rule] "do_stop already handles tunnel cleanup (kills tunnel_pid, removes tunnel files)"
CLAIM-10: [type: tool-behavior] "ngrok http <port> is the correct command to start an HTTP tunnel"

## Research Report

**Claims analyzed**: 10
**Recommendation**: PROCEED

### Verified (9 claims)

- CLAIM-1: CONFIRMED HIGH — tunnel spawn is inside do_start() at lines 212-258
  Explorer: `ctl.sh:212-258` — entire tunnel block is gated by `if [[ "$TUNNEL_MODE" == "true" ]]` inside do_start(). No separate tunnel subcommand exists. Extracting this block into `do_tunnel_start()` and wiring a `tunnel` top-level subcommand is the core refactor.

- CLAIM-2: CONFIRMED HIGH — ngrok operates independently of the target server
  Web (ngrok docs, sitepoint.com, medium.com): ngrok runs as a separate process. You start your local server first, then run `ngrok http <port>` in another terminal. Stopping/restarting your app does not terminate the ngrok session. ngrok is purely a reverse proxy — it forwards traffic to localhost:PORT.
  Explorer: ctl.sh already does this — starts bun server first (line 172-177), then spawns ngrok (line 228) pointing at the same port. The proposal to run tunnel independently is architecturally sound.

- CLAIM-3: CONFIRMED HIGH — SKILL.md line 82 uses `restart --tunnel`
  Explorer: `skills/dashboard/SKILL.md:82` — exact text: `"Running, no tunnel" -> restart with tunnel: bash {ctl} restart --tunnel --root {project_root}"`. This is the line that causes the WebSocket disconnect problem. The fix changes this to `tunnel start` (no server restart needed).

- CLAIM-4: CONFIRMED HIGH — `--tunnel` flag already exists and works on `start`
  Explorer: `ctl.sh:47-48` parses `--tunnel` flag, sets `TUNNEL_MODE=true`. `do_start()` checks `TUNNEL_MODE` at line 168 (host flag) and line 213 (spawn ngrok). Backward compat means keeping this flag working — when `start --tunnel` is used, it should still start server + tunnel together.

- CLAIM-6: CONFIRMED HIGH — STATE_DIR tunnel files are properly tracked
  Explorer: `ctl.sh:81-82` defines `TUNNEL_URL_FILE` and `TUNNEL_PID_FILE`. `clean_stale()` at line 94 removes both. `do_start()` writes them at lines 232/251. `do_stop()` reads and cleans them at lines 278-283. `do_status()` checks them at lines 341-349.

- CLAIM-7: CONFIRMED HIGH — zero ngrok/tunnel references in server.ts or channel.ts
  Explorer: Grep for `ngrok|tunnel` in `tools/dashboard/src/` returned zero matches. ngrok is purely a ctl.sh concern.

- CLAIM-8: CONFIRMED HIGH — exactly 5 subcommands in the case dispatch
  Explorer: `ctl.sh:413-424` — case dispatch handles `start|stop|status|logs|restart`. No `tunnel` subcommand exists. The proposal adds `tunnel` as a new top-level subcommand with sub-actions `start/stop/status`.

- CLAIM-9: CONFIRMED HIGH — do_stop handles tunnel cleanup
  Explorer: `ctl.sh:277-283` — `do_stop()` checks for `TUNNEL_PID_FILE`, reads the PID, kills it, removes both `TUNNEL_PID_FILE` and `TUNNEL_URL_FILE`. This logic should be extracted into `do_tunnel_stop()` and called from both `do_stop()` (for full shutdown) and `tunnel stop` (for tunnel-only shutdown).

- CLAIM-10: CONFIRMED HIGH — `ngrok http <port>` is the correct command
  Explorer: `ctl.sh:228` uses `ngrok http "$selected_port"`. Web (ngrok docs): `ngrok http [port]` is the standard command to create an HTTP tunnel.

### Corrected (1 claim)

- CLAIM-5: CORRECTED MINOR — `/api/tunnels` works but is deprecated; `/api/endpoints` is recommended
  Explorer: `ctl.sh:239` currently uses `curl -s http://127.0.0.1:4040/api/tunnels` to capture the public URL.
  Context Lake: Prior entity 017 research noted `/api/endpoints` as the recommended endpoint.
  Web (ngrok.com/docs/agent/api): `/api/tunnels` is explicitly marked deprecated: "This API is deprecated. Use the list endpoints API instead." Both still work — ngrok guarantees no breaking changes without explicit opt-in. The v3.16.0 agent (Nov 2024) introduced the endpoints terminology. Full removal planned for future v4 release.
  **Fix**: When extracting tunnel logic into `do_tunnel_start()`, consider updating the URL capture from `/api/tunnels` to `/api/endpoints`. This is a minor improvement, not a blocker. The response format differs (array key is `"endpoints"` vs `"tunnels"`, field is `"url"` vs `"public_url"`), so the grep pattern would need adjustment. This can be done as part of the extraction or deferred.

### Unverifiable (0 claims)

None.

### Recommendation Criteria

- 0 corrections affecting control flow, data model, or architecture
- 1 minor correction (deprecated API endpoint — still functional, non-breaking)
- All 10 claims verified with codebase evidence
- **PROCEED** — the plan's core assumptions are correct. The ngrok API deprecation is a minor improvement opportunity, not a blocker.

## Coverage Infrastructure

No coverage infrastructure applicable — this is a shell script + skill doc change, no runtime code.

## Stage Report: research

- [x] Claims extracted from plan (10 claims)
- [x] Explorer subagent dispatched and returned — all 10 claims verified against codebase (ctl.sh, SKILL.md, server.ts, channel.ts)
- [x] Context7 subagent dispatched and returned — ngrok is an external CLI tool, not a library; prior context lake insights from entity 017 research used instead
- [x] Web subagent dispatched and returned — ngrok docs (ngrok.com/docs/agent/api), ngrok blog (agent-endpoints), community guides verified
- [x] Cross-reference synthesis completed — 9 HIGH confidence, 1 MINOR correction
- [x] Research report written to entity
- [x] Insights cached to context lake (2 insights: entity report + ctl.sh API deprecation correction)
