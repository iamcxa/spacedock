// tools/dashboard/src/channel-provider.ts
// ABOUTME: ChannelProvider interface — the contract between the MCP channel layer
// ABOUTME: and its backing dashboard server. Enables external providers (e.g., bridge shim).

import type { AgentEvent, SnapshotSource } from "./types";
import type { EventBuffer } from "./events";
import type { SnapshotStore } from "./snapshots";

/**
 * Input for creating an entity snapshot.
 * Extracted from SnapshotStore.createSnapshot() parameter shape.
 */
export interface CreateSnapshotInput {
  entity: string;
  body: string;
  frontmatter?: Record<string, string> | null;
  author: string;
  reason: string;
  source?: SnapshotSource;
  rollback_from_version?: number | null;
  rollback_section?: string | null;
}

/**
 * The contract between createChannelServer (MCP layer) and its backing
 * dashboard server. The default implementation wraps createServer() from
 * server.ts. External implementations (e.g., the spacebridge unix socket
 * shim) can provide their own.
 *
 * Design: docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md §2.1
 */
export interface ChannelProvider {
  /** Push an event to all connected clients (SSE/WS). Returns the sequence number. */
  publishEvent(event: AgentEvent): number;

  /** Notify connected clients of MCP channel connection status. */
  broadcastChannelStatus(connected: boolean): void;

  /** Access to channel message replay (used by get_pending_messages MCP tool). */
  readonly eventBuffer: Pick<EventBuffer, "getChannelMessagesSince">;

  /** Access to entity snapshot creation (used by update_entity MCP tool). */
  readonly snapshotStore: Pick<SnapshotStore, "createSnapshot">;

  /** The HTTP port the provider is listening on, if applicable. */
  readonly port: number | undefined;

  /** Graceful shutdown. */
  stop(): void;
}
