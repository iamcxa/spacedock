import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Channel Server", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "channel-test-"));
    const wfDir = join(tmpDir, "docs", "build-pipeline");
    mkdirSync(wfDir, { recursive: true });
    writeFileSync(join(wfDir, "README.md"), "---\ncommissioned-by: spacedock@v1\n---\n");
    const staticDir = join(tmpDir, "static");
    mkdirSync(staticDir);
    writeFileSync(join(staticDir, "index.html"), "<html></html>");
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("createChannelServer returns mcp server and dashboard server", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });
    expect(result.mcp).toBeDefined();
    expect(result.dashboard).toBeDefined();
    expect(typeof result.mcp.notification).toBe("function");
    result.dashboard.stop();
  });

  test("createChannelServer dashboard serves HTTP", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });
    const baseUrl = `http://localhost:${result.dashboard.port}`;
    const res = await fetch(`${baseUrl}/api/workflows`);
    expect(res.status).toBe(200);
    result.dashboard.stop();
  });

  test("createChannelServer declares channel capabilities", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });
    const serverInfo = (result.mcp as any)._serverInfo;
    expect(serverInfo.name).toBe("spacedock-dashboard");
    result.dashboard.stop();
  });

  test("MCP server has tools/list handler registered", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });
    const handler = (result.mcp as any)._requestHandlers?.get("tools/list");
    expect(handler).toBeDefined();
    result.dashboard.stop();
  });

  test("reply tool call pushes channel_response to EventBuffer", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });

    const handler = (result.mcp as any)._requestHandlers?.get("tools/call");
    expect(handler).toBeDefined();

    if (handler) {
      await handler({
        method: "tools/call",
        params: {
          name: "reply",
          arguments: { content: "Gate approved, proceeding with plan stage" },
        },
      });
    }

    const events = result.dashboard.eventBuffer.getAll();
    const responseEvents = events.filter((e: any) => e.event.type === "channel_response");
    expect(responseEvents.length).toBeGreaterThanOrEqual(1);
    expect(responseEvents[responseEvents.length - 1].event.detail).toBe(
      "Gate approved, proceeding with plan stage"
    );
    result.dashboard.stop();
  });
});
