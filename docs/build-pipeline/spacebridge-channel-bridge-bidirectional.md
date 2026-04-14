---
id: 099
title: "Spacebridge channel bridge — UI ↔ daemon ↔ CC bidirectional communication"
status: draft
context_status: pending
source: captain observation (2026-04-14 — new UI has no channel support, blocks cutover)
created: 2026-04-14T13:00:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
depends-on: [053, 054, 057]
---

## Directive

> The new spacebridge Next.js UI reads from SQLite readonly but has no bidirectional communication with CC sessions. The old dashboard (tools/dashboard/) provides 5 MCP tools (reply, get_comments, add_comment, reply_to_comment, update_entity) + get_pending_messages for reconnect recovery — all via the MCP stdio channel. The new UI must achieve feature parity before cutover (entity 060) can proceed. Build the channel bridge: Next.js UI ↔ daemon (socket/HTTP) ↔ CC session (MCP shim). Captain must be able to approve gates, write comments, and receive FO messages directly from the spacebridge UI.

## Problem Statement

The spacebridge daemon already has the IPC plumbing:
- `channel-provider-bridge.ts` — forwards ChannelProvider calls via socket RPC ✅
- `socket-server.ts` — handles RPC requests from shims ✅  
- MCP shim (`cli.ts mcp`) — CC session connects via stdio ✅
- Session registry (entity 057) — tracks connected sessions ✅

But the Next.js UI is **disconnected from this plumbing**:
1. UI reads DB readonly — cannot call daemon RPC methods
2. UI has no write path — captain actions don't reach CC sessions
3. UI has no push channel — FO messages only land in DB, not pushed to browser
4. No gate interaction — captain can't approve/reject from UI

### Architecture Gap

```
OLD (working):
  CC (FO) ←→ MCP stdio ←→ Dashboard Channel Server ←→ Browser (WebSocket)
                                    ↑
                              Captain actions

NEW (broken):
  CC (FO) ←→ MCP shim ←→ Daemon ←→ SQLite DB ← readonly ← Next.js UI
                                                              ⚠️ no write back
                                                              ⚠️ no push to browser
```

### Target Architecture

```
  CC (FO) ←→ MCP shim ←→ Daemon ←→ SQLite DB ← readonly ← Next.js Server Components
                              ↕                                    ↕
                         Socket RPC                          API Routes (write)
                              ↕                                    ↕
                    Session Registry              Next.js Route Handlers → daemon RPC
                              ↕                                    ↕
                         Event Bus ──────────────→ SSE endpoint → Browser (EventSource)
                              ↑
                    Captain actions from UI → Route Handler → daemon RPC → MCP tool response
```

## Key Capabilities Needed

| Capability | Old Dashboard | New UI Target | Mechanism |
|---|---|---|---|
| FO → captain message | `reply` MCP tool → WS push | daemon event → SSE push to browser | Events table + SSE poll (053 already does this) |
| Captain → FO message | Chat input → channel message → `get_pending_messages` | UI form → Route Handler → daemon RPC → MCP response | New: write path from UI to daemon |
| Gate approve/reject | Dashboard button → channel message | UI button → Route Handler → write gate decision to DB/daemon | New: gate interaction API |
| Captain comments → FO | `get_comments` MCP tool reads comments | FO reads comments table (already works via 054 persistence) | ✅ Already works (FO can query DB) |
| Reconnect recovery | `get_pending_messages` replays missed events | `getChannelMessagesSince` via bridge RPC | Bridge already implements this |

## Acceptance Criteria

- Given a CC session with FO running, when FO calls the `reply` MCP tool with a message, then the message appears in the spacebridge UI's activity feed within 2 seconds (how to verify: FO sends reply, browser shows message in SSE feed)
- Given the spacebridge UI with a chat input, when captain types a message and submits, then the connected CC session receives the message via `get_pending_messages` MCP tool (how to verify: submit chat in UI, FO calls get_pending_messages, assert message appears)
- Given an entity at a gate stage (plan/uat), when the UI shows an approve/reject button and captain clicks approve, then the gate decision is written to DB and the FO's next idle/poll cycle detects the approval (how to verify: click approve in UI, FO event loop picks up approval)
- Given the MCP shim disconnects and reconnects, when FO calls `get_pending_messages` with the last known sequence, then all messages sent during the disconnect window are returned (how to verify: disconnect shim, send 3 messages from UI, reconnect, assert 3 messages in response)
- Given the spacebridge UI is open in a browser, when the Next.js dev server starts, then the UI connects to the daemon via Route Handler → socket RPC and displays the connection status (how to verify: start daemon + UI, assert "Connected" indicator in UI header)

## Dependencies

- Entity 053 (shipped) — Next.js app, SSE endpoint, entity cards
- Entity 054 (shipped) — Comments API, Route Handlers pattern
- Entity 057 (shipped) — Session registry, socket-server RPC handling
- Blocks: Entity 060 (cutover) — cannot delete old dashboard until channel parity achieved

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
