# Spacedock Dashboard

A real-time web UI for Spacedock workflows. Shows workflow state, agent activity, and — when launched in channel mode — provides bidirectional communication between the captain and the first officer's Claude Code session.

## Quick Start

```bash
# Start standalone (read-only viewer)
tools/dashboard/ctl.sh start

# Start in channel mode (bidirectional, requires Claude Code --channels)
tools/dashboard/ctl.sh start --channel
```

Open the URL printed by the start command (default: http://127.0.0.1:8420/).

## Architecture

The dashboard has two entry points:

| Entry point | Launched by | Capabilities |
|-------------|-------------|--------------|
| `src/server.ts` | `ctl.sh start` | Read-only: workflow view, activity feed, entity detail |
| `src/channel.ts` | `ctl.sh start --channel` | All of the above + bidirectional channel communication |

Both entry points are fully backward compatible — the read-only viewer works whether or not Claude Code is connected.

### Channel Mode

When launched with `--channel`, the dashboard registers as a Claude Code channel plugin. Claude Code spawns `src/channel.ts` over stdio using the MCP protocol. The channel server creates both the MCP transport (stdio) and the Bun HTTP+WebSocket server in the same process.

```
Claude Code <--stdio/MCP--> channel.ts <--WebSocket--> Browser
                                  |
                             server.ts (createServer)
```

**Inbound (browser → FO session):**
```
Captain types in input bar
  → POST /api/channel/send
  → mcp.notification({ method: 'notifications/claude/channel', ... })
  → FO receives <channel source="spacedock-dashboard">message</channel>
```

**Outbound (FO session → browser):**
```
FO calls reply tool
  → CallToolRequestSchema handler
  → EventBuffer.push({ type: 'channel_response', ... })
  → WebSocket broadcast to browser
  → Renders as FO chat bubble in activity feed
```

**Permission relay (Claude Code → browser → Claude Code):**
```
Claude Code needs tool approval
  → notifications/claude/channel/permission_request
  → WebSocket push: permission card with Approve / Deny buttons
  → Captain clicks Approve
  → POST /api/channel/send (type: permission_response)
  → mcp.notification({ method: 'notifications/claude/channel/permission', behavior: 'allow' })
```

### MCP Capability Declarations

`src/channel.ts` declares these capabilities in the MCP Server constructor:

```typescript
capabilities: {
  experimental: {
    'claude/channel': {},           // bidirectional messaging (Claude Code v2.1.80+)
    'claude/channel/permission': {}, // permission relay (Claude Code v2.1.81+)
  },
  tools: {},
}
```

## CLI Reference

```
ctl.sh <start|stop|status|logs|restart> [options]

Options:
  --port PORT    Port to serve on (default: 8420, auto-selects 8420–8429)
  --root DIR     Project root (default: git toplevel or cwd)
  --channel      Launch in channel mode (MCP + dashboard, for Claude Code --channels)
  --all          (status) Show all dashboard instances
  --follow       (logs) Tail the log file
```

### Using with Claude Code channels

Register the dashboard as a development channel plugin:

```bash
claude --dangerously-load-development-channels server:spacedock-dashboard \
       --channels plugin:spacedock-dashboard
```

Or add to `.mcp.json`:

```json
{
  "mcpServers": {
    "spacedock-dashboard": {
      "command": "bun",
      "args": ["tools/dashboard/src/channel.ts", "--root", "."]
    }
  }
}
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workflows` | List all workflows with entity counts |
| GET | `/api/events?since=N` | Activity feed events since sequence N |
| POST | `/api/events` | Publish a new agent event |
| GET | `/api/entities/:workflow/:slug` | Entity detail (frontmatter, body, stage reports) |
| POST | `/api/entities/:workflow/:slug/score` | Update entity score |
| POST | `/api/entities/:workflow/:slug/tags` | Update entity tags |
| GET | `/api/search` | Search/filter entities |
| GET | `/api/posthog-config` | PostHog JS config for browser telemetry |
| POST | `/api/channel/send` | Send captain message or permission verdict to FO session |

### POST /api/channel/send

Sends a message from the browser to the FO session via MCP channel notification. Only active in channel mode; in standalone mode the message is recorded in the event buffer but not forwarded.

Request body:
```json
{
  "content": "approve",
  "meta": {
    "type": "permission_response",
    "request_id": "abcde"
  }
}
```

For plain captain messages, omit `meta` or set `meta.type` to anything other than `permission_response`.

## New Event Types (Channel Mode)

| Type | Direction | Description |
|------|-----------|-------------|
| `channel_message` | Browser → buffer | Captain message sent to FO |
| `channel_response` | FO → browser | FO reply rendered as chat bubble |
| `permission_request` | Claude Code → browser | Tool approval prompt with Approve/Deny |
| `permission_response` | Browser → Claude Code | Captain verdict relayed back |

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.0.0 | MCP Server, StdioServerTransport, request schemas |
| `@sentry/bun` | ^10.46.0 | Error capture |
| `posthog-node` | ^5.28.8 | Usage telemetry |

## Development

```bash
# Run tests
bun test

# Type check
bunx tsc --noEmit

# Coverage report
bun test --coverage

# Shell syntax check
bash -n ctl.sh
```

Tests live in `tests/dashboard/`. The test suite uses Bun's built-in test runner.
