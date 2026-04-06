---
id: 017
title: Dashboard Shareable War Room — 戰情室分享與多人協作審批
status: research
source: /build brainstorming
started: 2026-04-06T07:30:00Z
completed:
verdict:
score: 0.9
worktree: .worktrees/auto-researcher-dashboard-shareable-warroom
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 015 (war room identity)
- Feature 016 (gate approval — required for shared review/approve flow)

## Brainstorming Spec

APPROACH:     整合 ngrok（或 Cloudflare Tunnel 等免費替代方案）讓戰情室可以產生公開 URL 分享給同事。每次分享可限定特定 phase/entity，並設置獨立密碼。同事 A 收到 plan phase 的連結 + 密碼，review 後 approve；同事 B 收到 execute phase 的連結 + 不同密碼。密碼驗證在 server 端，per-share scope 控制可見範圍。
ALTERNATIVE:  Screen share 或截圖分享（rejected: 沒有互動能力，同事無法直接 comment 或 approve，也無法非同步 review）。VPN/內網方案（rejected: 設定門檻高，不適合跨團隊快速分享）
GUARDRAILS:   密碼必須 server-side 驗證，不能只靠前端。Share link 必須有過期時間（預設 24h）。分享範圍嚴格限定 — per-phase scope 不能看到其他 phase 的內容。ngrok 掉線時要有重連機制或友善錯誤提示。必須考慮 ngrok 免費方案的限制（連線數、頻寬、session 時長）。
RATIONALE:    把 AI-human 協作從單人擴展到團隊 — 讓領域專家參與對應階段的 review，是戰情室概念的完整實現。Plan 階段讓架構師 review，E2E 階段讓 QA review，PR 階段讓 tech lead review — 每個人只看到自己該看的部分。

## Acceptance Criteria

- 可從 UI 產生 share link（指定 entity + phase + 密碼）
- Share link 透過 ngrok/tunnel 可從外部存取
- 密碼驗證在 server 端，錯誤密碼無法存取
- 分享範圍限定（只能看到指定 phase 的內容）
- 分享頁面支援 comment 和 approve 操作（複用 016 pattern）
- Share link 有過期時間（預設 24h，可設定）
- 每個 share 可以有不同密碼
- ngrok 斷線時顯示友善提示

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
