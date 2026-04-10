# ChannelProvider Interface

## Purpose

`ChannelProvider` is the contract between the MCP channel layer (`channel.ts`)
and its backing dashboard server. It enables external implementations to
replace the default in-process `createServer()`.

## Why this exists

The spacedock dashboard currently couples the MCP stdio transport and the
HTTP/WebSocket server in a single process. This interface is the first step
toward decoupling them, enabling external providers like the spacebridge
daemon to serve the dashboard UI independently while the MCP channel layer
runs as a thin shim inside Claude Code.

See: `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md`

## Interface

```typescript
interface ChannelProvider {
  publishEvent(event: AgentEvent): number;
  broadcastChannelStatus(connected: boolean): void;
  readonly eventBuffer: Pick<EventBuffer, "getChannelMessagesSince">;
  readonly snapshotStore: Pick<SnapshotStore, "createSnapshot">;
  readonly port: number | undefined;
  stop(): void;
}
```

## Usage

### Default (in-process, today's behavior)

```typescript
const { mcp, dashboard } = createChannelServer({
  port: 8420,
  projectRoot: "/path/to/repo",
});
// dashboard is backed by createServer() internally
```

### With external provider

```typescript
const externalProvider = connectToBridgeDaemon();
const { mcp, dashboard } = createChannelServer({
  port: 8420,
  projectRoot: "/path/to/repo",
  provider: externalProvider,
});
// dashboard IS the external provider — createServer() is not called
```

## What the interface captures

| Member | Used by | Purpose |
|---|---|---|
| `publishEvent` | All MCP tools (reply, add_comment, reply_to_comment, update_entity) | Push events to connected UI clients |
| `broadcastChannelStatus` | Channel startup/shutdown | Notify UI of MCP connection state |
| `eventBuffer.getChannelMessagesSince` | `get_pending_messages` MCP tool | Replay messages after reconnect |
| `snapshotStore.createSnapshot` | `update_entity` MCP tool | Create pre-update snapshots for rollback |
| `port` | Channel state file + startup banner | Report the HTTP port to callers |
| `stop` | Test cleanup + graceful shutdown | Stop the HTTP server |

## Future (not in this PR)

A second interface, `CoordinationClient`, will handle role-aware work
coordination (SO/FO/QO leases). That is blocked on Phase E role boundary
formalization and will be a separate upstream PR.
