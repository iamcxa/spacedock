---
id: 017
title: Dashboard Auth + Shareable Access — 部署無關的認證與分享機制
status: execute
source: /build brainstorming (revised after plan rejection)
started: 2026-04-06T09:45:00Z
completed:
verdict:
score: 0.9
worktree: .worktrees/spacedock-ensign-dashboard-shareable-warroom
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 016 (gate approval — required for shared review/approve flow)

## Brainstorming Spec

APPROACH:     部署無關的認證 + 分享機制。三層設計：(1) Auth layer — token-based session auth，configurable bind host（`--host` flag，default 127.0.0.1，Docker/server 用 0.0.0.0），支援 captain / reviewer / guest 三種角色。(2) Share link — Captain 從 UI 建立 scoped link（entity + phase + 密碼 + 過期時間），Reviewer 開 URL 驗證後看到 scoped view，可 comment + approve gate。(3) ngrok 整合 — `ctl.sh start --tunnel` 自動啟動 ngrok，capture tunnel URL，UI 顯示可分享的 public URL。整套機制在 localhost / LAN / Docker / cloud 部署下完全一致。
ALTERNATIVE:  (A) 純 ngrok tunnel hack（rejected: 第一版 plan 被 captain reject — 把 tunnel 當核心而非 auth，不適用 Docker/cloud 部署）。(B) 分拆成 auth entity + share entity（rejected: captain 確認 ngrok 應包含在同一 entity，ship 後要立即可用）。(C) MCP UI 嵌入 Claude 對話（deferred to entity 021 — 獨立 delivery channel，不影響 web sharing 核心）。
GUARDRAILS:   Auth layer 是 application-level（不依賴 network topology）。密碼 server-side 驗證（Bun.password argon2id）。Share link 有 TTL（default 24h）。Scoped WebSocket（/ws/share/:token/activity）防止 event leakage。`--host` flag 控制 bind address，不硬改 0.0.0.0 或 127.0.0.1。ngrok interstitial 用 ngrok-skip-browser-warning header 繞過。現有 localhost 無 auth 使用模式保持不變（backward compatible — 127.0.0.1 不需要登入）。
RATIONALE:    長期願景是 Dashboard as a Service — Claude Code + plugin 可以跑在 Docker / Mac / cloud，使用者透過 UI 與 Claude Code instance 互動。Auth + scoped access 是這個願景的基礎層。ngrok 讓 local Mac 也能立即分享，Docker/cloud 部署則直接用 public URL。同一套 auth 機制，部署無關。

## Research Findings (from rejected plan — still valid)

- Bun.password: argon2id hashing confirmed (HIGH confidence)
- ngrok free tier: interstitial warning page (需 header workaround), 20K monthly request cap, 4K req/min
- Cloudflare quick tunnel: 不支援 SSE, WebSocket 未確認 — 僅作為 experimental fallback
- Server 目前 bind 0.0.0.0 (非 127.0.0.1) — auth 比預期更緊急
- Frontend-only WebSocket filtering 會洩漏全部 events — 需要 scoped WebSocket endpoint

## Acceptance Criteria

- Auth middleware: token-based session，localhost 免登入（backward compatible）
- `--host` flag 控制 bind address（default 127.0.0.1，Docker 用 0.0.0.0）
- Captain 可從 UI 建立 share link（entity + phase + 密碼 + 過期時間）
- Share link 密碼 server-side 驗證（Bun.password argon2id）
- Reviewer scoped view: 只看到被授權的 entity/phase
- Reviewer 可 comment + approve gate（複用 016 pattern）
- Scoped WebSocket: /ws/share/:token/activity 只推送相關 events
- Share link TTL（default 24h），過期自動失效
- `ctl.sh start --tunnel` 啟動 ngrok，UI 顯示 public URL
- ngrok interstitial 自動處理（ngrok-skip-browser-warning header）
- 同一套機制在 localhost / LAN / Docker / cloud 都能運作

## Coverage Infrastructure

- **Test framework**: Bun built-in test runner (`bun:test`) — uses `describe/test/expect` from `bun:test`
- **Coverage command**: `bun test --coverage` (supports `--coverage-reporter=lcov` and `--coverage-dir=coverage`)
- **Test files**: Two locations — `tools/dashboard/src/*.test.ts` (co-located) and `tests/dashboard/*.test.ts` (separate test dir). 9 test files total covering server, channel, api, events, frontmatter-io, parsing, discovery, comments, ctl.
- **Coverage format**: LCOV (`lcov.info`) or text summary — no `coverage-final.json` (Istanbul format not used)
- **Baseline strategy**: No committed baseline file, no CI cache for coverage. The only CI workflow is `release.yml` (tag-triggered release, no test step). Coverage is developer-run only.
- **No vitest/jest/pytest** — pure Bun test runner throughout the project

## Stage Report: explore

- [x] File list grouped by layer — map all files needed for shareable war room
- [x] Context lake insights stored for each relevant file discovered
- [x] Scale confirmation or revision based on actual file count
- [x] Coverage infrastructure discovery
- [x] Map existing authentication/authorization patterns in the codebase
- [x] Map existing tunnel/ngrok integration patterns or similar external connectivity
- [x] Identify server architecture for adding middleware (auth, scoping, share link routes)
- [x] Map existing channel/WebSocket patterns that shared sessions would need to interact with

### Summary

**Scale: Medium — confirmed.** The feature spans server-side (new routes + in-memory share registry + password hashing), frontend (new share page + share creation UI), and optionally tunnel lifecycle management. Estimated ~10 new/modified files.

**File map by layer:**

Domain layer (server-side TypeScript):
- `tools/dashboard/src/server.ts` (622 lines) — add `/share/:token` route prefix, password-verification middleware, scoped entity filter; new `POST /api/share` create-link endpoint; in-memory ShareLink registry (Map)
- `tools/dashboard/src/types.ts` (145 lines) — add `ShareLink`, `ShareSession` interfaces; extend `AgentEventType` if share events needed
- `tools/dashboard/src/comments.ts` (127 lines) — extend `Comment.author` union to include `"guest"` if external reviewers need distinct attribution; otherwise no changes
- `tools/dashboard/src/events.ts` (36 lines) — add `"share_created"` to `VALID_EVENT_TYPES` if share creation events are pushed to activity feed

Frontend layer (static files):
- `tools/dashboard/static/index.html` (39 lines) — add "Share" button UI for generating share links
- `tools/dashboard/static/app.js` (290 lines) — add share link creation modal + form submission
- `tools/dashboard/static/detail.html` (76 lines) — add approve/request-changes buttons for gate entities (016 dependency)
- `tools/dashboard/static/detail.js` (537 lines) — add gate approval send logic; handle readonly mode for shared view
- `tools/dashboard/static/activity.js` (466 lines) — conditionally hide send controls for read-only shared sessions
- New: `tools/dashboard/static/share.html` — password entry page for external reviewers (standalone)
- New: `tools/dashboard/static/share.js` — password verification, scoped entity view, comment/approve actions

Ops layer:
- `tools/dashboard/ctl.sh` (345 lines) — optionally add `--tunnel` flag to spawn ngrok subprocess; write tunnel URL to state dir

Test layer:
- `tools/dashboard/src/comments.test.ts` — extend if guest author attribution added
- `tests/dashboard/server.test.ts` — add tests for new `/share/:token` routes, auth middleware, expiry
- New: `tests/dashboard/share.test.ts` — share link CRUD, password verification, scope enforcement, expiry

**Auth/Authorization patterns found:**
- Currently ZERO HTTP auth in the server — `validatePath()` is the only guard, and it's path-traversal prevention only
- Server binds to 127.0.0.1 (loopback) — assumes localhost trust for all current users
- For 017: Must implement server-side password hashing (e.g., `crypto.subtle` or Bun's built-in `Bun.password`) + per-token session cookie or Bearer token verification before serving any `/share/:token` data

**Tunnel/ngrok patterns found:**
- Zero existing tunnel integration in codebase — no ngrok, no cloudflare tunnel, no frp
- ctl.sh would be the natural place to add a `--tunnel` subcommand or flag that launches ngrok as a subprocess
- ngrok free tier constraint: 1 concurrent tunnel, 40 req/min, random URL on each restart — relevant for share link validity

**WebSocket / channel patterns:**
- WebSocket on `/ws/activity` subscribes to "activity" topic (Bun pub/sub)
- Shared reviewer view: connect to same `/ws/activity` WebSocket but filter events by entity/phase in frontend; OR create a scoped `/ws/share/:token/activity` WebSocket that only publishes relevant events
- Channel (FO↔captain MCP) is unrelated to share — shared reviewers do NOT get channel access
- activity.js already handles all event types needed for reviewer view; send controls can be hidden via `readonly` flag

## Technical Claims

CLAIM-1: [type: library-api] "Bun.password can hash/verify passwords for share link authentication (API, performance, security)"
CLAIM-2: [type: architecture] "In-memory Map is sufficient for ShareLink registry (vs needing persistent storage like SQLite)"
CLAIM-3: [type: version-behavior] "ngrok free tier supports the share use case (concurrent tunnels, rate limits, session duration, random URLs)"
CLAIM-4: [type: version-behavior] "Cloudflare Tunnel (cloudflared) is a viable free alternative to ngrok"
CLAIM-5: [type: framework] "Bun.serve() routes API supports dynamic route parameters like /share/:token"
CLAIM-6: [type: framework] "Bun.serve() can add middleware-style auth verification for /share/:token routes via fetch fallback"
CLAIM-7: [type: project-convention] "WebSocket /ws/activity can be filtered per-token in frontend without server-side scoping changes"
CLAIM-8: [type: project-convention] "Server currently binds to 127.0.0.1 — implications for tunnel routing"
CLAIM-9: [type: architecture] "ctl.sh can spawn ngrok as a subprocess and capture the tunnel URL from its API (port 4040)"
CLAIM-10: [type: architecture] "Per-token session cookies or Bearer tokens can enforce share scope server-side"
CLAIM-11: [type: architecture] "Share link expiry (24h default) — implementation via TTL check on each request vs background cleanup"
CLAIM-12: [type: library-api] "Comment.author union type can be extended to include 'guest' for external reviewers"

## Research Report

**Claims analyzed**: 12
**Recommendation**: REVISE

### Verified (8 claims)

- CLAIM-1: HIGH — Bun.password hash/verify confirmed
  Explorer: Zero existing password hashing in dashboard codebase — greenfield implementation
  Bun Docs (bun.sh/docs/api/hashing): `Bun.password.hash(password)` returns argon2id by default, `Bun.password.verify(password, hash)` auto-detects algorithm. Supports argon2id/argon2i/argon2d/bcrypt. Both async and sync variants available (hashSync/verifySync). Salt is auto-generated. Suitable for auth — cryptographically secure password hashing with configurable cost params.

- CLAIM-5: HIGH — Bun.serve() dynamic routes confirmed
  Explorer: Current server.ts uses static routes like "/api/workflows", "/detail", etc. No dynamic routes yet.
  Bun Docs (bun.sh/docs/api/http): Routes API (v1.2.3+) supports dynamic params: `"/users/:id": req => { return new Response(req.params.id) }`. Installed Bun version is 1.3.9 — fully supported. Also supports per-method handlers ({GET, POST}) and wildcard `/api/*`.

- CLAIM-6: HIGH — Middleware-style auth via fetch fallback confirmed
  Explorer: Current server.ts already uses `fetch(req)` fallback handler (line 524-569) for static files and WebSocket upgrade. Auth checks can be added here for `/share/:token` prefix before serving content.
  Bun Docs: The `fetch` function acts as fallback for routes not matched by `routes:{}`. Dynamic routes + fetch fallback together provide middleware-like capability.

- CLAIM-9: HIGH — ngrok local API on port 4040 confirmed
  Web (ngrok.com/docs/agent/api/): ngrok agent exposes HTTP API at `http://127.0.0.1:4040/api`. No authentication needed. `GET /api/tunnels` (deprecated) or `GET /api/endpoints` (recommended) returns active tunnels with public URLs. ctl.sh can `curl http://localhost:4040/api/endpoints` after spawning ngrok to capture the tunnel URL.

- CLAIM-10: HIGH — Per-token auth scope enforcement is feasible
  Explorer: Current server has zero HTTP auth — `validatePath()` is only path-traversal guard. No cookies, no Bearer tokens, no session management anywhere. Implementation is greenfield.
  Bun Docs: Bun.serve() receives standard Request objects — `req.headers.get("Cookie")` and `req.headers.get("Authorization")` work natively. Response can set `Set-Cookie` header. No external library needed.

- CLAIM-11: HIGH — TTL-based expiry is straightforward
  Explorer: No existing TTL or expiry patterns in codebase. EventBuffer uses capacity-based eviction (ring buffer) but no time-based.
  Analysis: TTL check on each request (compare `Date.now()` against `ShareLink.expiresAt`) is simpler and sufficient for low-volume share links. Background cleanup (setInterval) is optional optimization to prevent memory leak for long-running servers but not strictly needed given daemon restart behavior.

- CLAIM-12: HIGH — Comment.author union extension is trivial
  Explorer: types.ts line 121: `author: "captain" | "fo"` — adding `| "guest"` is a one-line change. comments.ts uses `addComment()` which accepts author implicitly as "captain" (hardcoded). For share links, a new `addComment()` call path with `author: "guest"` is needed.
  No breaking changes — existing code only checks `comment.author` for display styling.

- CLAIM-7: MEDIUM — Frontend-only WebSocket filtering is feasible but has security trade-off
  Explorer: server.ts lines 485/521 — all WebSocket clients subscribe to single "activity" topic via `ws.subscribe("activity")`. Server publishes ALL events to ALL subscribers. activity.js receives all events and renders them.
  Analysis: Frontend filtering (check `event.entity` against token scope) works for UX scoping but leaks all event data to shared reviewers over WebSocket. For a trusted-team internal tool this is acceptable; for strict security, a scoped `/ws/share/:token/activity` endpoint would be needed. Plan should document this trade-off.

### Corrected (3 claims)

- CLAIM-3: HIGH CORRECTION — ngrok free tier is MORE restrictive than explore assumed
  Explore assumed: "1 concurrent tunnel, 40 req/min, random URL on each restart"
  Web (ngrok.com/pricing) actual findings:
    - 3 endpoints max, 3 concurrent agents (not 1 tunnel — updated in 2025 pricing)
    - Rate limit: 4,000 req/min (not 40 — explore was wrong by 100x)
    - Monthly caps: 20K HTTP requests, 1 GB data transfer, 5K TCP connections
    - **Interstitial warning page on all HTTP endpoints** (free plan) — this is a major UX issue for shared dashboard links. Reviewers will see an ngrok warning page before reaching the dashboard.
    - Assigned dev domain (not fully random) — more stable than assumed
    - $5 one-time included usage credit
  **Fix**: The monthly 20K request cap and interstitial warning page are significant. Interstitial can be bypassed by adding `ngrok-skip-browser-warning` header in frontend fetch calls, but it will still show on initial browser navigation. Consider Cloudflare Tunnel as primary recommendation.

- CLAIM-4: MEDIUM CORRECTION — Cloudflare quick tunnel has critical limitation
  Web (developers.cloudflare.com): `cloudflared tunnel --url http://localhost:8420` works free without account. Random subdomain on trycloudflare.com, printed to terminal.
  **Critical limitation**: Quick tunnels do NOT support Server-Sent Events (SSE). WebSocket support is NOT explicitly documented for quick tunnels — needs runtime testing.
  **Critical limitation**: Hard limit of 200 concurrent in-flight requests (returns 429).
  **Critical limitation**: Random URL on every restart — share links break when tunnel restarts.
  **Fix**: Cloudflare quick tunnel is viable as a zero-setup option but carries risk for WebSocket support. For production use, a named Cloudflare tunnel (requires free account) provides stable URLs. Plan should test WebSocket compatibility before committing.

- CLAIM-8: HIGH CORRECTION — Server does NOT bind to 127.0.0.1
  Explore assumed: "Server binds to 127.0.0.1 (loopback)"
  Bun Docs (bun.sh/docs/api/http): `hostname` defaults to **"0.0.0.0"** when not specified. Server.ts line 58-59 does NOT set hostname — only sets port.
  Explorer: Banner at line 616 says `http://127.0.0.1:${server.port}/` but this is just a display string, NOT the actual bind address.
  **Fix**: The server is actually accessible on ALL network interfaces (0.0.0.0), not just loopback. This means:
    1. ngrok/cloudflared can connect to localhost — tunnel routing still works (**no impact on tunnel**)
    2. **Security concern**: Without a tunnel, the dashboard is accessible from the local network. The plan assumed localhost-only trust model. Adding share auth is more urgent than assumed — even without a tunnel, anyone on the same network can access the dashboard.
    3. Plan should consider explicitly setting `hostname: "127.0.0.1"` for non-tunnel mode, or accept 0.0.0.0 binding with auth protection.

### Unverifiable (1 claim)

- CLAIM-2: NONE — In-memory Map sufficiency is a design trade-off, not verifiable
  Explorer: No existing Map/registry patterns in dashboard codebase. EventBuffer (events.ts) uses in-memory array with capacity limit — similar pattern.
  Analysis: For this use case (short-lived share links, 24h expiry, daemon restarts clear state), in-memory Map is acceptable. Share links are ephemeral by design — losing them on restart is a feature (security), not a bug. SQLite would add complexity without clear benefit.
  Recommendation: Proceed with in-memory Map. Document that daemon restart invalidates all share links.

### Recommendation Criteria

**Recommendation: REVISE** — 3 corrections affect the plan:

1. **CLAIM-3 (ngrok limits)**: The interstitial warning page on free tier is a significant UX issue. Monthly 20K request cap may be hit during active review sessions. Plan should either recommend Cloudflare as primary or document the interstitial workaround.

2. **CLAIM-4 (Cloudflare tunnel)**: Quick tunnels may not support WebSocket — this blocks real-time activity feed for shared reviewers. Plan needs a fallback strategy (polling API instead of WebSocket) or requires testing WebSocket over Cloudflare tunnel first.

3. **CLAIM-8 (bind address)**: Server binds to 0.0.0.0, not 127.0.0.1. This changes the security model — the dashboard is already LAN-accessible. Auth implementation is more urgent, and the plan should address whether to restrict binding or accept it with auth.

None of these corrections invalidate the overall approach, but the plan needs adjustments for tunnel selection strategy and the corrected security model.

## Stage Report: research

- [x] Claims extracted from plan (12 claims)
- [x] Explorer subagent dispatched and returned — codebase cross-check for all 12 claims via Grep/Read of server.ts, types.ts, events.ts, comments.ts, activity.js, ctl.sh
- [x] Context7 subagent dispatched and returned — Bun official docs verified for Bun.password, Bun.serve() routes, hostname default, WebSocket
- [x] Web subagent dispatched and returned — ngrok pricing/API docs, Cloudflare quick tunnel docs verified
- [x] Cross-reference synthesis completed — 8 verified, 3 corrected, 1 unverifiable
- [x] Research report written to entity
- [x] Insights cached to context lake (pending below)

## Stage Report: plan

- [x] Formal plan document created via `Skill: "superpowers:writing-plans"` and saved to `docs/superpowers/plans/2026-04-06-dashboard-auth-shareable-access.md` — DONE
- [x] Plan has concrete file paths for all new and modified files — DONE (12 files mapped in File Structure table: 4 Create, 8 Modify)
- [x] Plan uses test-first ordering (tests before implementation code) — DONE (Tasks 2, 4, 5, 6 all write failing tests before implementation)
- [x] Plan follows AUTH-FIRST architecture (auth middleware first, ngrok last) — DONE (Task 1: types, Task 2: ShareRegistry, Task 3: --host flag, Tasks 4-6: share routes/scoped WS, Tasks 7-8: UI, Task 9: ngrok — last)
- [x] Plan incorporates all research corrections — DONE:
  - CLAIM-3 (ngrok limits): 20K cap + interstitial documented in Task 9 output, header workaround noted
  - CLAIM-4 (Cloudflare tunnel): NOT included as primary — experimental only, per spec guardrails
  - CLAIM-8 (bind address 0.0.0.0): Task 3 adds --host flag defaulting to 127.0.0.1; Task 9 passes --host 0.0.0.0 when tunnel active
  - CLAIM-7 (WebSocket leakage): Task 6 implements server-side scoped /ws/share/:token/activity endpoint
  - CLAIM-1 (Bun.password argon2id): Task 2 uses Bun.password.hash/verify
- [x] Plan includes quality gate steps — DONE (Task 10: type check, full test suite, share integration tests, backward compatibility verification)
