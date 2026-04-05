---
id: 007
title: Dashboard as Channel Plugin — Interactive Workflow Control
status: explore
source: brainstorming session
started:
completed:
verdict:
score: 0.95
worktree: .worktrees/ensign-dashboard-channel-plugin
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- **Requires features 001-006 completed** — dashboard server (Bun), persistent daemon, real-time WebSocket feed, observability
- Claude Code v2.1.80+ with channels support
- Bun runtime + @modelcontextprotocol/sdk

## Brainstorming Spec

APPROACH:     Turn the Spacedock dashboard into a Claude Code channel plugin. The dashboard MCP server declares `claude/channel` + `claude/channel/permission` capabilities, enabling bidirectional communication between the browser UI and the FO's Claude Code session. Gate approvals, workflow commands, and permission prompts flow through the dashboard instead of requiring terminal access.
ALTERNATIVE:  Keep dashboard read-only, use Telegram/Discord for interactive control (rejected: fragmented UX — captain would need to switch between dashboard for viewing and chat app for interacting)
GUARDRAILS:   Gate approval via channel must have the same guardrails as CLI (NEVER self-approve). Sender allowlist required. Permission relay must show the same information as terminal dialog. Dashboard channel does NOT replace terminal — both remain active, first response wins.
RATIONALE:    This is the "war room" vision fully realized — a single browser UI where the captain sees all workflows, agent activity, and can approve gates, respond to permission prompts, and send commands to the FO. Channels provide the official bidirectional protocol that was missing from features 001-003.

## Architecture

### Three communication mechanisms:

**1. Inbound (Browser → FO session):**
```
Browser click "Approve Gate" 
  → Dashboard HTTP POST /api/channel/send
  → Channel server calls mcp.notification({ method: 'notifications/claude/channel', params: { content: 'approve', meta: { type: 'gate_approval', entity: '...', stage: '...' } } })
  → FO session receives <channel source="spacedock-dashboard" type="gate_approval" ...>approve</channel>
```

**2. Outbound (FO session → Browser):**
```
FO calls reply tool with gate result / status update
  → Channel server's CallToolRequestSchema handler
  → WebSocket broadcast to browser
  → Browser renders in activity feed / notification
```

**3. Permission relay (Claude Code → Browser → Claude Code):**
```
Claude Code needs tool approval (e.g., git push)
  → permission_request notification to channel server
  → WebSocket push to browser: "Claude wants to run Bash: git push. Approve?"
  → Captain clicks Approve in browser
  → Channel server sends permission notification back: { behavior: 'allow' }
  → Tool executes
```

## Acceptance Criteria

- Dashboard registers as channel plugin via `claude/channel` + `claude/channel/permission` capabilities
- Gate approval buttons in UI actually work — clicking "Approve" sends approval through channel to FO session
- Permission prompts appear in dashboard UI with approve/reject buttons
- FO replies (gate results, status updates) render in dashboard activity feed
- Sender allowlist: only configured/paired users can send commands
- Terminal and dashboard both remain active — first response wins
- `--channels plugin:spacedock-dashboard` enables interactive mode
- Dashboard works as read-only viewer when not launched with `--channels` (backward compatible)
- Works alongside Telegram/Discord channels (captain can respond from any connected channel)

### Conversation Interface (addendum — see `docs/superpowers/specs/2026-04-05-dashboard-conversation-interface.md`)

- Captain can type freeform messages in the dashboard input bar and they arrive at the FO session via channel
- FO responses render as chat bubbles in the activity feed (left-aligned, gray)
- Captain messages render as chat bubbles (right-aligned, blue)
- Long FO responses truncate with "Show more" expand
- Conversation messages and workflow events interleave chronologically in the same feed
- Messages survive browser refresh (EventBuffer replay) but clear on daemon restart
- Input bar is disabled with hint text when no channel session is connected

## Explore Findings

### File List by Layer

#### Domain — MCP Channel Server (NEW — nothing exists yet)

| File | Purpose |
|------|---------|
| `tools/dashboard/src/server.ts` | Bun HTTP + WebSocket server. `websocket.message` handler is a no-op with comment "Reserved for future bidirectional communication (gate approval)" — the primary insertion point for channel inbound message handling |
| `tools/dashboard/src/events.ts` | In-memory ring buffer (capacity 500) for AgentEvents with monotonic seq numbers. `getAll()` feeds WebSocket replay on connect |
| `tools/dashboard/src/types.ts` | All shared types: AgentEvent, SequencedEvent, EntityDetail, StageReport, FilterOptions. New channel types (ChannelMessage, PermissionRequest, PermissionResponse) will be added here |
| `tools/dashboard/src/api.ts` | HTTP route business logic — getEntityDetail, updateScore, updateTags, filterEntities. Path traversal guard is in server.ts, not here |

#### Contract — MCP Channel Capability Declarations (NEW)

| File | Purpose |
|------|---------|
| `tools/dashboard/src/server.ts` | Will need new `/api/channel/send` POST endpoint (inbound from browser → FO session) and capability advertisement (`claude/channel` + `claude/channel/permission`) |
| `tools/dashboard/package.json` | Currently only has `@sentry/bun` + `posthog-node`. Will need `@modelcontextprotocol/sdk` added |
| `tools/dashboard/bun.lock` | Dependency lockfile — will be updated when MCP SDK is added |

#### Router — WebSocket Broadcast Infrastructure (EXISTS, needs extension)

| File | Purpose |
|------|---------|
| `tools/dashboard/src/server.ts` | `server.publish("activity", ...)` for outbound broadcast already works. WebSocket `message()` handler stub at line 215 is the inbound hook point |
| `tools/dashboard/static/activity.js` | Browser WebSocket client with exponential backoff reconnect (500ms base, 2x, cap 30s). Handles `replay` + `event` message types. New types needed: `permission_request`, `channel_message` |

#### View — Frontend UI (EXISTS, needs extension)

| File | Purpose |
|------|---------|
| `tools/dashboard/static/index.html` | Two-panel layout (workflows + activity feed). Gate approval buttons and permission overlay must be added here |
| `tools/dashboard/static/app.js` | Workflow card renderer + entity table. No gate approval UI exists — needs Approve/Reject buttons on `gate` event items |
| `tools/dashboard/static/activity.js` | Activity feed renderer. Needs new render paths for permission_request events with approve/reject actions |
| `tools/dashboard/static/detail.html` | Entity detail page — shows frontmatter, stage reports, score editor. May need channel status indicator |
| `tools/dashboard/static/detail.js` | Entity detail JS — score/tag management. Lower priority for channel feature |

#### Seed / Test Infrastructure (EXISTS)

| File | Purpose |
|------|---------|
| `tests/dashboard/server.test.ts` | 29 test cases covering all HTTP endpoints + WebSocket broadcast (2 describe blocks). No test for `ws.message` inbound yet — the stub handler has no behaviour to test |
| `tests/dashboard/events.test.ts` | Unit tests for EventBuffer push/getSince/getAll |
| `tests/dashboard/api.test.ts` | Unit tests for filterEntities, updateScore, updateTags |
| `tests/dashboard/telemetry.test.ts` | Tests for PostHog/Sentry init gating |

#### Configuration & Control

| File | Purpose |
|------|---------|
| `tools/dashboard/ctl.sh` | Daemon control script — start/stop/status/health. Will need `--channel-plugin` flag passthrough to server.ts when channel mode is enabled |
| `tools/dashboard/tsconfig.json` | Strict TS config targeting esnext with bun-types |

### Existing Patterns to Reuse

1. **WebSocket broadcast**: `server.publish("activity", JSON.stringify({...}))` already works for outbound. The `websocket.message()` handler at `server.ts:215` is the exact hook for inbound channel messages from browser.
2. **EventBuffer**: Extend `AgentEventType` in `types.ts` to include a `permission_request` event type — the buffer and broadcast infrastructure handles the rest automatically.
3. **POST endpoint pattern**: `/api/events` POST handler at `server.ts:170` is the template for the new `/api/channel/send` endpoint.
4. **Path validation**: `validatePath()` at `server.ts:17` must be applied to any new endpoints that accept file paths.
5. **Telemetry integration**: `captureEvent()` in `telemetry.ts` should fire on channel events for observability.

### Claude Code Channels API Surface

The `claude/channel` + `claude/channel/permission` capability system is referenced in the entity spec but **no documentation, examples, or SDK references exist anywhere in this codebase**. The spec describes:

- MCP server declares `claude/channel` capability → enables bidirectional messaging with FO session
- MCP server declares `claude/channel/permission` capability → enables permission prompt relay
- Inbound: `mcp.notification({ method: 'notifications/claude/channel', params: { content, meta: { type, entity, stage } } })`
- Outbound: FO session calls reply tool → `CallToolRequestSchema` handler in channel server → WebSocket broadcast
- Permission relay: `permission_request` notification → browser → `{ behavior: 'allow'|'deny' }` response

**Gap identified**: No reference implementation, SDK docs, or examples of `claude/channel` or `claude/channel/permission` capability declarations exist in the codebase. The `@modelcontextprotocol/sdk` package is not yet in `package.json`. Research stage must verify this API exists in Claude Code v2.1.80+ and document the exact MCP capability declaration format.

### Scale Assessment

**Confirmed: Medium** — rationale:
- **Existing infrastructure to extend**: Bun WebSocket server + broadcast fully operational (86 tests passing). `ws.message` handler stub is the primary hook point.
- **New server-side code**: MCP channel server module (~1 file), `/api/channel/send` endpoint, permission relay handler
- **New frontend code**: Gate approval buttons in activity.js, permission prompt overlay in index.html, channel connection indicator
- **New test code**: ~15-20 new test cases for channel send, permission relay, allowlist enforcement, backward-compat read-only mode
- **New dependency**: `@modelcontextprotocol/sdk` — version and API surface unknown, needs research
- **Total TS files affected**: 4 existing files (server.ts, types.ts, activity.js, index.html) + 3-4 new files (channel.ts, channel.test.ts, updated static JS)
- **Critical unknown**: Claude Code `claude/channel` capability API format — no docs found in codebase. This is the primary research risk.
- **Medium confirmed**: 7-10 files total, significant new functionality but clear extension points already exist.

## Coverage Infrastructure

- **Test runner**: `bun test` (Bun 1.3.9 built-in). Run from worktree root: `cd .worktrees/ensign-dashboard-channel-plugin && bun test`
- **Current test count**: 86 tests across 8 files, all passing (5.8s)
- **Coverage command**: `bun test --coverage` — supported natively by Bun 1.3.9
- **Coverage reporters**: `--coverage-reporter=text` (default) and `--coverage-reporter=lcov` (generates `lcov.info`)
- **Coverage output dir**: `--coverage-dir=coverage` (default: `coverage/`)
- **Coverage format**: LCOV (`lcov.info`) or text summary — no Istanbul JSON (`coverage-final.json`)
- **No `test:coverage` script in `package.json`** — run directly as `bun test --coverage`
- **No CI coverage caching**: `.github/workflows/release.yml` only handles releases, no test/coverage workflow exists
- **No baseline file committed**: No `coverage-summary.*` or `coverage-report.*` in `.github/scripts/` or `scripts/`
- **Baseline strategy**: None established. Quality stage should run `bun test --coverage --coverage-reporter=text` and record pass/fail counts as the baseline.

## Stage Report: explore

- [x] File list grouped by layer — identify all files relevant to MCP channel capabilities, WebSocket communication, permission relay, dashboard integration points, and the existing Bun dashboard server
  8 TypeScript source files in `tools/dashboard/src/`, 7 static assets in `tools/dashboard/static/`, 8 test files in `tests/dashboard/`, plus `ctl.sh` and `package.json`. All grouped by layer above: domain (4), contract (3), router (2), view (5), seed/test (4), config (2).
- [x] Context lake insights stored for each relevant file discovered (search before store, use [purpose] + [pattern] + [gotcha] tags)
  12 insights stored: types.ts, events.ts, api.ts, frontmatter-io.ts, telemetry.ts, activity.js, app.js, index.html, parsing.ts, discovery.ts, ctl.sh, server.test.ts. Pre-existing insights for server.ts, ctl.sh (manual/research) and activity-feed.md (manual) found and incorporated.
- [x] Scale confirmation or revision (currently Medium) based on actual file count
  Confirmed Medium: 86 tests passing across 8 existing test files, 4 existing source files need extension, 3-4 new files needed. Primary risk is unknown Claude Code channels API surface.
- [x] Coverage infrastructure discovery — detect test runners, coverage commands, coverage format, baseline strategy
  `bun test` (built-in runner, no package.json script). `bun test --coverage` generates lcov.info. No CI coverage workflow, no committed baseline. Baseline strategy: quality stage records first-run text summary.
- [x] Map Claude Code channels API surface — identify documentation, examples, or references to `claude/channel` and `claude/channel/permission` capability declarations needed for this feature
  **No documentation found in codebase.** The `@modelcontextprotocol/sdk` is not yet in package.json. The entity spec describes the protocol (notifications/claude/channel, permission_request/response) but no reference implementation, SDK version requirement, or capability declaration format exists in any file. This is the primary unknown for the research stage.

### Summary

Deep exploration of the Bun dashboard server confirms feature 007 has strong infrastructure to build on: the WebSocket broadcast system is fully operational (86 tests pass), and `server.ts:215` (`websocket.message` stub) is the exact hook for inbound channel messages. The four critical extension points are: (1) `websocket.message` handler for inbound browser→FO messages, (2) new `/api/channel/send` POST endpoint, (3) `activity.js` for rendering permission prompts with approve/reject actions, (4) `index.html` for the permission overlay. The primary research risk is the Claude Code `claude/channel` + `claude/channel/permission` capability API — no documentation, reference implementation, or SDK version exists in this codebase. The `@modelcontextprotocol/sdk` package needs to be added. Scale confirmed Medium.

## Technical Claims

CLAIM-1: [type: library-api] "MCP server declares claude/channel capability via capabilities.experimental['claude/channel']: {} to enable bidirectional messaging"
CLAIM-2: [type: library-api] "MCP server declares claude/channel/permission capability via capabilities.experimental['claude/channel/permission']: {} for permission relay"
CLAIM-3: [type: library-api] "Inbound uses mcp.notification({ method: 'notifications/claude/channel', params: { content, meta } }) to send messages to FO session"
CLAIM-4: [type: library-api] "FO session receives channel messages as <channel source='name' key='val'>content</channel> XML tags"
CLAIM-5: [type: library-api] "Outbound FO replies arrive via CallToolRequestSchema handler — FO calls a 'reply' tool exposed by the channel server"
CLAIM-6: [type: library-api] "Permission relay: Claude Code sends notifications/claude/channel/permission_request with {request_id, tool_name, description, input_preview}; server responds with notifications/claude/channel/permission with {request_id, behavior: 'allow'|'deny'}"
CLAIM-7: [type: library-api] "@modelcontextprotocol/sdk provides Server class (from /server/index.js), StdioServerTransport (from /server/stdio.js), and schema types (from /types.js)"
CLAIM-8: [type: version] "Claude Code v2.1.80+ supports claude/channel; v2.1.81+ supports claude/channel/permission"
CLAIM-9: [type: version] "--channels plugin:name@marketplace or --dangerously-load-development-channels server:name enables channel plugins"
CLAIM-10: [type: framework] "Bun.serve() HTTP+WebSocket server and MCP StdioServerTransport can coexist in same process (confirmed by fakechat reference implementation)"
CLAIM-11: [type: project-convention] "server.publish('activity', JSON.stringify({...})) is the pattern for WebSocket broadcast"
CLAIM-12: [type: project-convention] "EventBuffer with capacity 500 and monotonic seq numbers handles event storage; new event types are additive"
CLAIM-13: [type: project-convention] "AgentEventType union in types.ts is extended by adding new string literals"
CLAIM-14: [type: project-convention] "POST /api/events handler pattern is the template for new POST /api/channel/send"
CLAIM-15: [type: project-convention] "websocket.message() handler stub at server.ts:215 is the hook for inbound browser messages"
CLAIM-16: [type: framework] "Bun WebSocket ws.send() and server.publish() work with JSON.stringify for structured messages"
CLAIM-17: [type: library-api] "MCP SDK Server class supports notification sending via server.notification() method"

## Research Report

**Claims analyzed**: 17
**Recommendation**: PROCEED (with architectural correction)

### Verified (15 claims)

- CLAIM-1: HIGH — `capabilities.experimental['claude/channel']: {}` is the correct declaration
  Explorer: No existing usage in codebase (expected — new feature)
  Web: Official Channels Reference at code.claude.com/docs/en/channels-reference confirms exact syntax. Fakechat reference implementation uses `capabilities: { tools: {}, experimental: { 'claude/channel': {} } }`

- CLAIM-2: HIGH — `capabilities.experimental['claude/channel/permission']: {}` is the correct declaration
  Explorer: No existing usage (expected)
  Web: Channels Reference confirms: "A claude/channel/permission: {} entry under experimental capabilities in your Server constructor". Requires Claude Code v2.1.81+

- CLAIM-3: HIGH — `mcp.notification({ method: 'notifications/claude/channel', params: { content, meta } })` is correct
  Web: Channels Reference provides exact format. `content` becomes `<channel>` tag body, each `meta` key becomes a tag attribute. Keys must be identifiers (letters, digits, underscores only — hyphens silently dropped)

- CLAIM-4: HIGH — FO receives `<channel source="name" key="val">content</channel>` XML tags
  Web: Channels Reference confirms: "The event arrives in Claude's context wrapped in a `<channel>` tag. The `source` attribute is set automatically from your server's configured name"

- CLAIM-5: HIGH — FO replies via a standard MCP tool (reply tool) registered with `CallToolRequestSchema`
  Web: Channels Reference section "Expose a reply tool" confirms the pattern. Tool registered via `ListToolsRequestSchema` + `CallToolRequestSchema` handlers. The tool schema and name are developer-defined (not a fixed protocol method)

- CLAIM-6: HIGH — Permission relay protocol confirmed exactly
  Web: Channels Reference "Relay permission prompts" section confirms:
  - Outbound from Claude Code: `notifications/claude/channel/permission_request` with params `{request_id, tool_name, description, input_preview}`
  - Inbound verdict: `notifications/claude/channel/permission` with params `{request_id, behavior: 'allow'|'deny'}`
  - `request_id` is 5 lowercase letters from a-z excluding 'l'
  - First response wins (terminal or remote)
  - Relay covers Bash/Write/Edit tool approvals only (not project trust or MCP consent)

- CLAIM-7: HIGH — SDK exports confirmed
  Web: npm confirms `@modelcontextprotocol/sdk` v1.29.0 (latest). Channels Reference imports show:
  - `import { Server } from '@modelcontextprotocol/sdk/server/index.js'`
  - `import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'`
  - `import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'`
  Fakechat uses `"@modelcontextprotocol/sdk": "^1.0.0"` in package.json

- CLAIM-8: HIGH — Version requirements confirmed
  Web: Channels Reference states: "Channels are in research preview and require Claude Code v2.1.80 or later" and "Permission relay requires Claude Code v2.1.81 or later"

- CLAIM-9: HIGH — CLI flags confirmed (with correction on exact format)
  Web: Channels Reference confirms: `--channels plugin:name@marketplace` for production, `--dangerously-load-development-channels server:name` for development. During research preview, custom channels need `--dangerously-load-development-channels`

- CLAIM-10: HIGH — Same-process coexistence confirmed
  Web: Fakechat reference implementation runs MCP stdio transport AND Bun.serve() HTTP+WebSocket in the same process. The Channels Reference webhook example does exactly the same. Quote: "The listener needs access to the mcp instance, so it runs in the same process"

- CLAIM-11: HIGH — `server.publish("activity", ...)` pattern confirmed
  Explorer: `server.ts:181` — `server.publish("activity", JSON.stringify({ type: "event", data: entry }))`

- CLAIM-12: HIGH — EventBuffer pattern confirmed
  Explorer: `events.ts` — capacity 500, monotonic seq numbers, `push()` returns SequencedEvent, `getSince()`/`getAll()` for replay

- CLAIM-13: HIGH — AgentEventType is a simple string union, extensible by adding literals
  Explorer: `types.ts:75` — `export type AgentEventType = "dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle"`

- CLAIM-14: HIGH — POST /api/events handler is a clean template
  Explorer: `server.ts:170-188` — validates required fields, pushes to buffer, broadcasts via WebSocket

- CLAIM-16: HIGH — Bun WebSocket JSON broadcast confirmed
  Explorer: `server.ts:181` uses `JSON.stringify`, `server.ts:213` uses `ws.send(JSON.stringify(...))`

### Corrected (2 claims)

- CLAIM-15: MEDIUM CORRECTION — websocket.message stub is for browser→server messages, NOT for channel inbound
  Explorer: `server.ts:215` — the stub handles messages FROM browser WebSocket clients. This is correct for browser→dashboard communication (e.g., gate approval clicks via WebSocket). However, the entity spec's architecture shows browser→dashboard communication going through HTTP POST (`/api/channel/send`), not WebSocket messages. The WebSocket `message` handler COULD be used as an alternative to POST for browser→server commands, but the MCP channel inbound path (dashboard→FO session) uses `mcp.notification()` on the MCP Server instance, not the Bun WebSocket.
  **Fix**: Clarify two distinct inbound paths: (1) Browser→Dashboard via HTTP POST `/api/channel/send` or WebSocket message, (2) Dashboard→FO session via `mcp.notification({ method: 'notifications/claude/channel', ... })`. The websocket.message stub handles path (1), not path (2).

- CLAIM-17: HIGH CORRECTION — The method is `mcp.notification()` (not `server.notification()`)
  Web: All examples in Channels Reference use `await mcp.notification({...})` where `mcp` is the `Server` instance variable name. The method is `.notification()` on the Server class instance.
  **Fix**: Minor naming clarification. The entity spec already uses `mcp.notification()` which is correct. The variable name `mcp` is conventional (used in all official examples) but any variable name works.

### Unverifiable (0 claims)

None — all claims verified with HIGH confidence.

### Critical Architecture Insight (NEW — not in original spec)

**The dashboard cannot be BOTH the existing Bun HTTP+WS server AND the MCP channel server in its current form.**

The current dashboard (`tools/dashboard/src/server.ts`) is a standalone Bun HTTP+WebSocket server started directly via `bun server.ts`. It is NOT an MCP server — it has no MCP Server instance, no stdio transport, and is not spawned by Claude Code.

A channel server must:
1. Be spawned by Claude Code as a subprocess
2. Communicate with Claude Code over stdio (StdioServerTransport)
3. Be registered in `.mcp.json` or as a plugin

**Two viable architectures:**

**Option A: Separate MCP channel process + existing dashboard process**
- The MCP channel server (`channel.ts`) is a new file spawned by Claude Code via stdio
- The channel server starts its own HTTP listener (or connects to the existing dashboard) to relay messages
- The existing dashboard continues as-is, with the channel server as a bridge
- Pro: Minimal changes to existing dashboard. Con: Two processes to coordinate.

**Option B: Dashboard becomes the MCP channel server (refactor)**
- `server.ts` becomes the MCP server entry point, spawned by Claude Code
- The MCP server creates both the stdio transport AND the Bun HTTP+WebSocket server (like fakechat does)
- Pro: Single process, clean architecture. Con: Dashboard only works when launched via Claude Code `--channels` (but backward compat requires it to work standalone too).

**Option C (recommended): Hybrid — channel module wraps dashboard**
- New `channel.ts` is the MCP channel server entry point (spawned by Claude Code via stdio)
- `channel.ts` imports and starts the dashboard server programmatically (the `createServer()` function already exists and is exported)
- `channel.ts` holds the MCP Server instance and bridges between MCP notifications and the dashboard's EventBuffer + WebSocket broadcast
- When launched standalone (`bun server.ts`), dashboard works read-only as before
- When launched as channel (`bun channel.ts` via Claude Code), dashboard has full bidirectional capability
- Pro: Reuses existing infrastructure, backward compatible, clean separation. Con: Slight complexity in having two entry points.

**This is a MEDIUM correction — it affects the implementation architecture but the spec's described message flows are correct in principle.**

### Recommendation Criteria

- 0 high-severity corrections to control flow or data model
- 2 corrections: 1 minor (naming), 1 medium (architecture clarification — two entry points needed, not one)
- The medium correction does NOT invalidate the spec — the message flows described are exactly what the official Channels API supports
- All 17 claims verified with HIGH confidence from official documentation + reference implementation
- The primary unknown (Claude Code channels API surface) is now fully resolved

**PROCEED** — The Claude Code Channels API exists exactly as described in the entity spec. The `@modelcontextprotocol/sdk` (^1.0.0 or latest 1.29.0) provides all needed types. The plan stage should adopt Option C architecture (hybrid entry point) to maintain backward compatibility.

### Sources

- [Channels Reference — Claude Code Docs](https://code.claude.com/docs/en/channels-reference) — complete API specification
- [Fakechat Reference Implementation](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/fakechat) — official Anthropic channel plugin using Bun + MCP SDK
- [@modelcontextprotocol/sdk on npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — v1.29.0, Bun-compatible
- [Claude Code Channels Overview](https://code.claude.com/docs/en/channels) — feature availability, enterprise controls

## Stage Report: research

- [x] Claims extracted from spec, explore results, and conversation interface design spec — 17 claims covering library-api (8), version (2), framework (2), project-convention (5)
- [x] Per-claim verification with evidence from Explorer (codebase grep/read), Web Search (official docs, npm, GitHub), and reference implementation (fakechat)
- [x] Cross-referenced synthesis with confidence levels — 15 HIGH verified, 2 corrections (1 minor naming, 1 medium architecture)
- [x] Corrections for incorrect assumptions with cited sources — architecture insight: channel server needs separate entry point wrapping dashboard via createServer()
- [x] Research report written to entity file with PROCEED recommendation
