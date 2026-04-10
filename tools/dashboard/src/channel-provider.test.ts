// tools/dashboard/src/channel-provider.test.ts
// ABOUTME: Tests that ChannelProvider interface is correctly defined and that
// ABOUTME: the in-process DashboardServer from createServer() satisfies it.

import { describe, test, expect } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ChannelProvider } from "./channel-provider";
import { createServer } from "./server";

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
