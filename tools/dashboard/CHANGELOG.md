# Changelog

## Unreleased

### feat: dashboard channel plugin — interactive workflow control (007)

The dashboard can now act as a Claude Code channel plugin, enabling bidirectional communication between the captain's browser and the first officer's Claude Code session.

**New CLI flag:**

```bash
ctl.sh start --channel
```

Launches in channel mode. Claude Code spawns the dashboard via stdio using the MCP protocol. Without `--channel`, the dashboard runs as a read-only viewer exactly as before (backward compatible).

**New MCP channel server:**

`src/channel.ts` is the channel-mode entry point. It creates an MCP `Server` with `claude/channel` and `claude/channel/permission` capability declarations, connects to Claude Code over stdio, and starts the Bun HTTP+WebSocket server in the same process.

**New API endpoint:**

`POST /api/channel/send` — accepts captain messages and permission verdicts from the browser and forwards them to the FO session via `mcp.notification()`. In standalone mode, messages are recorded in the event buffer but not forwarded.

**New frontend features:**

- Chat bubbles: captain messages (right-aligned, blue) and FO replies (left-aligned, gray) interleaved with workflow events in the activity feed
- Input bar: freeform message entry, disabled with hint text when no channel session is connected
- Permission cards: tool approval prompts from Claude Code with Approve / Deny buttons
- Channel status indicator: shows whether a Claude Code channel session is active

**New dependency:**

`@modelcontextprotocol/sdk ^1.0.0` (MIT, Anthropic) — provides `Server`, `StdioServerTransport`, and MCP schema types.

**Requirements:** Claude Code v2.1.80+ for channel messaging; v2.1.81+ for permission relay.
