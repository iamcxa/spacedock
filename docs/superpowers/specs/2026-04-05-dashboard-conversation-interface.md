# Dashboard Conversation Interface — Design Spec

> Addendum to entity 007 (Dashboard as Channel Plugin). Adds freeform conversation between the captain and FO session through the dashboard UI, alongside the existing gate approval and permission relay features.

## Context

Entity 007's original spec covers three structured interactions: gate approval buttons, permission prompt relay, and status update rendering. This spec adds a fourth: **freeform conversation** — the captain can type natural-language messages to the FO session directly from the dashboard, and FO responses appear in the same feed.

This completes the "war room" vision: a single browser UI where the captain sees all workflow activity AND can interact with the FO without switching to the terminal.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feed layout | **Unified timeline (C)** | All items — events, messages, gate prompts — in one chronological feed. Captain sees the full story without switching views. |
| Input method | **Fixed bottom input bar (A)** | Always visible, zero-click to start typing. `Enter` sends, `Shift+Enter` for newline. |
| Message styling | **Chat bubbles + event cards (A)** | Captain messages: blue right-aligned bubbles. FO responses: gray left-aligned bubbles. Workflow events: compact inline badges (existing style). Clear visual split between "human talking" and "automation running." |
| Long responses | **Summary + expand (A)** | FO bubbles truncate at ~100 chars / 3 lines. "Show more" expands inline. Keeps feed scannable. |
| History lifecycle | **Server-lifetime (B)** | Channel messages enter the existing EventBuffer (capacity 500). Browser refresh recovers via WebSocket `replay`. Daemon restart clears — acceptable because important outcomes (gate approvals, status changes) are already persisted in entity files. |
| No-channel state | **Disabled input with hint (B)** | Input grayed out: "No active session — launch with --channels to enable." But default usage IS with channels, so this is the edge case. |

## Architecture

### Message Flow

```
Captain types in dashboard input bar
  → Browser POST /api/channel/send { content: "...", meta: { type: "message" } }
  → Server validates sender (allowlist)
  → Server pushes to EventBuffer as { type: "channel_message", agent: "captain", ... }
  → Server broadcasts via WebSocket to all connected browsers (feed update)
  → Server sends MCP notification: notifications/claude/channel { content, meta }
  → FO session receives <channel source="spacedock-dashboard">message</channel>
  → FO processes and replies via channel reply tool
  → Channel server receives reply in CallToolRequestSchema handler
  → Server pushes to EventBuffer as { type: "channel_response", agent: "fo", ... }
  → Server broadcasts via WebSocket → browser renders as gray left-aligned bubble
```

### New Event Types

Extend `AgentEventType` in `types.ts`:

| Type | Source | Rendering |
|------|--------|-----------|
| `channel_message` | Captain via browser | Blue right-aligned bubble |
| `channel_response` | FO via channel reply | Gray left-aligned bubble, truncated with "Show more" |
| `permission_request` | Claude Code | Card with Approve/Reject buttons (existing 007 scope) |
| `permission_response` | Captain via browser | Inline confirmation in permission card |

Existing types unchanged: `dispatch`, `completion`, `gate`, `feedback`, `merge`, `idle`.

### Components

**Backend (server.ts extensions):**

1. `POST /api/channel/send` — receives messages from browser, validates sender, pushes to EventBuffer, sends MCP channel notification
2. `websocket.message` handler — receives structured messages from browser (currently a stub at line 215), routes to channel send logic
3. Channel connection state — tracks whether a Claude Code session is connected via channels, exposes state for the frontend indicator

**Frontend (activity.js extensions):**

1. `renderChannelMessage(entry)` — renders captain message as right-aligned blue bubble
2. `renderChannelResponse(entry)` — renders FO response as left-aligned gray bubble with truncation + "Show more"
3. Input bar event handling — `Enter` to send via POST, `Shift+Enter` for newline, disable when no channel connection
4. Channel status indicator — "Channel: connected/disconnected" in header

**Frontend (index.html additions):**

1. Input bar HTML below activity feed: `<input>` + `<button>Send</button>`
2. Channel status indicator in header alongside existing "Live" and "Auto-refresh" indicators

### Gate Approval Buttons (existing 007 scope, integrated)

Gate events render as distinct cards with Approve/Reject buttons. Clicking a button sends a structured channel message with `meta.type: "gate_approval"`. This is part of the original 007 spec — the conversation interface design ensures these cards coexist naturally with chat bubbles in the unified feed.

### Backward Compatibility

- Dashboard without `--channels`: input bar disabled, activity feed works as before (dispatch/completion/gate events only), no conversation messages
- Existing `/api/events` POST endpoint unchanged — workflow events still flow through it
- Existing WebSocket broadcast unchanged — new event types are additive
- Existing EventBuffer unchanged — new event types just enter the same buffer

## UI Specification

### Activity Feed Item Types

```
┌─────────────────────────────────────┐
│ Activity Feed                       │
├─────────────────────────────────────┤
│ DISPATCH  ensign → 007 @ explore 5m │  ← compact badge (existing)
│                                     │
│ COMPLETE  explore done — 12 in.. 3m │  ← compact badge (existing)
│                                     │
│        ┌─────────────────────┐      │
│        │ 先暫停，archived     │      │  ← captain bubble (blue, right)
│        │ entities 要顯示     │      │
│        └─────────────────────┘      │
│  ┌─────────────────────┐           │
│  │ 收到。掃描 _archive/ │           │  ← FO bubble (gray, left)
│  │ 找到 6 個 shipped... │           │
│  │ Show more ↓          │           │
│  └─────────────────────┘           │
│                                     │
│ DISPATCH  researcher → 007 @ r.. 1m │  ← compact badge (existing)
│                                     │
│ ┌─────────────────────────────┐    │
│ │ GATE  plan review — 007      │    │  ← gate card (orange border)
│ │ [Approve] [Reject]           │    │
│ └─────────────────────────────┘    │
├─────────────────────────────────────┤
│ [Message to FO...           ] [Send]│  ← fixed input bar
└─────────────────────────────────────┘
```

### Header Indicators

```
Spacedock Dashboard          [Live] [Channel: connected] [Auto-refresh: ON]
```

When channel is disconnected:
```
Spacedock Dashboard          [Live] [Channel: disconnected] [Auto-refresh: ON]
```

### Input Bar States

| State | Appearance | Behavior |
|-------|-----------|----------|
| Connected | White input, blue Send button | `Enter` sends, `Shift+Enter` newline |
| Disconnected | Gray input, disabled Send | Placeholder: "No active session — launch with --channels to enable" |
| Sending | Input disabled momentarily | Re-enables after POST completes or fails |

### Message Bubble Styling

| Element | Captain (outbound) | FO (inbound) |
|---------|-------------------|--------------|
| Alignment | Right | Left |
| Background | `#1f6feb` (blue) | `#21262d` (dark gray) |
| Text color | `#f0f6fc` (white) | `#c9d1d9` (light gray) |
| Border radius | `12px 12px 2px 12px` | `12px 12px 12px 2px` |
| Max width | 80% of feed width | 80% of feed width |
| Truncation | None (captain messages are short) | 3 lines or ~100 chars (whichever first), "Show more" link |

### "Show More" Behavior

- Default: `max-height: 4.2em; overflow: hidden` (approx 3 lines at 1.4 line-height)
- "Show more" click: removes max-height, text changes to "Show less"
- Expanded state persists until feed scrolls the item out of view or page refresh

## Scope Impact on Entity 007

### New Acceptance Criteria (append to existing)

- Captain can type freeform messages in the dashboard input bar and they arrive at the FO session via channel
- FO responses render as chat bubbles in the activity feed (left-aligned, gray)
- Captain messages render as chat bubbles (right-aligned, blue)
- Long FO responses truncate with "Show more" expand
- Conversation messages and workflow events interleave chronologically in the same feed
- Messages survive browser refresh (EventBuffer replay) but clear on daemon restart
- Input bar is disabled with hint text when no channel session is connected

### Unchanged Acceptance Criteria (from original 007 spec)

- Dashboard registers as channel plugin via `claude/channel` + `claude/channel/permission` capabilities
- Gate approval buttons in UI actually work
- Permission prompts appear in dashboard UI with approve/reject buttons
- Sender allowlist: only configured/paired users can send commands
- Terminal and dashboard both remain active — first response wins
- `--channels plugin:spacedock-dashboard` enables interactive mode
- Dashboard works as read-only viewer when not launched with `--channels`
- Works alongside Telegram/Discord channels

## Out of Scope

- **Message persistence across daemon restarts** — not needed; important outcomes already in entity files
- **Rich text input** (markdown editor, file attachments) — captain sends plain text, FO renders markdown in responses
- **Message threading** — unified timeline is flat, no reply-to-specific-message
- **Multiple captain sessions** — single captain per dashboard instance (sender allowlist handles identity)
- **Archived entities display** — separate enhancement, not part of 007's channel plugin scope
