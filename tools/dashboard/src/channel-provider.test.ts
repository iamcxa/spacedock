// tools/dashboard/src/channel-provider.test.ts
// ABOUTME: Tests that ChannelProvider interface is correctly defined and that
// ABOUTME: the in-process DashboardServer from createServer() satisfies it.

import { describe, test, expect } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ChannelProvider } from "./channel-provider";
import { createServer } from "./server";
import { createChannelServer } from "./channel";
import type { AgentEvent, SequencedEvent } from "./types";

const TMP = join(import.meta.dir, "__test_provider__");

describe("ChannelProvider interface", () => {
  test("createServer() return satisfies ChannelProvider", () => {
    mkdirSync(TMP, { recursive: true });
    try {
      const server = createServer({
        port: 0,
        hostname: "127.0.0.1",
        projectRoot: TMP,
        dbPath: join(TMP, "test.db"),
      });
      try {
        // Type assertion: if this compiles, the interface is satisfied
        const provider: ChannelProvider = server;

        // Runtime checks: all required members exist and are callable
        expect(typeof provider.publishEvent).toBe("function");
        expect(typeof provider.broadcastChannelStatus).toBe("function");
        expect(typeof provider.eventBuffer.getChannelMessagesSince).toBe("function");
        expect(typeof provider.snapshotStore.createSnapshot).toBe("function");
        expect(typeof provider.port).toBe("number");
        expect(typeof provider.stop).toBe("function");
      } finally {
        server.stop();
      }
    } finally {
      rmSync(TMP, { recursive: true, force: true });
    }
  });
});

describe("ChannelProvider injection", () => {
  test("createChannelServer uses injected provider instead of createServer", () => {
    mkdirSync(TMP, { recursive: true });
    const events: AgentEvent[] = [];

    const mockProvider: ChannelProvider = {
      publishEvent(event: AgentEvent): number {
        events.push(event);
        return events.length;
      },
      broadcastChannelStatus(_connected: boolean): void {},
      eventBuffer: {
        getChannelMessagesSince(_afterSeq: number, _entity?: string): SequencedEvent[] {
          return [];
        },
      },
      snapshotStore: {
        createSnapshot(input: any) {
          return { id: 1, entity: input.entity, version: 1, body: input.body,
            frontmatter: null, author: input.author, reason: input.reason,
            source: input.source ?? "update", rollback_from_version: null,
            rollback_section: null, created_at: new Date().toISOString() };
        },
      },
      port: 9999,
      stop() {},
    };

    try {
      const { dashboard } = createChannelServer({
        port: 0,
        projectRoot: TMP,
        provider: mockProvider,
      });

      // The returned dashboard should be our mock, not a new Bun.serve
      expect(dashboard.port).toBe(9999);
      expect(typeof dashboard.publishEvent).toBe("function");

      // Trigger a publishEvent through the dashboard and verify mock received it
      dashboard.publishEvent({
        type: "channel_response",
        entity: "",
        stage: "",
        agent: "fo",
        timestamp: new Date().toISOString(),
        detail: "test message",
      });

      expect(events.length).toBe(1);
      expect(events[0].detail).toBe("test message");
    } finally {
      rmSync(TMP, { recursive: true, force: true });
    }
  });

  test("createChannelServer falls back to createServer when no provider given", () => {
    mkdirSync(TMP, { recursive: true });
    try {
      const { dashboard } = createChannelServer({
        port: 0,
        projectRoot: TMP,
        dbPath: join(TMP, "test.db"),
      });

      try {
        // Should have a real Bun server with a numeric port
        expect(typeof dashboard.port).toBe("number");
        expect(dashboard.port).not.toBe(0); // OS-assigned port
        expect(typeof dashboard.publishEvent).toBe("function");
        expect(typeof dashboard.eventBuffer.getChannelMessagesSince).toBe("function");
      } finally {
        dashboard.stop();
      }
    } finally {
      rmSync(TMP, { recursive: true, force: true });
    }
  });
});
