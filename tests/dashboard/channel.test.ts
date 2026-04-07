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

  test("permission_request notification pushes event to EventBuffer", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });

    const handler = (result.mcp as any)._notificationHandlers?.get(
      "notifications/claude/channel/permission_request"
    );
    expect(handler).toBeDefined();

    if (handler) {
      await handler({
        method: "notifications/claude/channel/permission_request",
        params: {
          request_id: "abcde",
          tool_name: "Bash",
          description: "Execute a shell command",
          input_preview: "git push origin main",
        },
      });
    }

    const events = result.dashboard.eventBuffer.getAll();
    const permEvents = events.filter((e: any) => e.event.type === "permission_request");
    expect(permEvents.length).toBeGreaterThanOrEqual(1);
    const last = permEvents[permEvents.length - 1].event;
    expect(last.detail).toContain("abcde");
    expect(last.detail).toContain("Bash");
    result.dashboard.stop();
  });

  test("sendPermissionVerdict is returned from createChannelServer", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });
    expect(typeof result.sendPermissionVerdict).toBe("function");
    result.dashboard.stop();
  });
});

describe("Channel Integration", () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "channel-int-test-"));
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

  test("captain message via POST -> event in buffer -> FO reply -> response in buffer", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });
    const baseUrl = `http://localhost:${result.dashboard.port}`;

    // Captain sends a message
    const sendRes = await fetch(`${baseUrl}/api/channel/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Approve gate for 007", meta: { type: "message" } }),
    });
    expect(sendRes.status).toBe(200);

    // Simulate FO reply via the reply tool handler
    const callHandler = (result.mcp as any)._requestHandlers?.get("tools/call");
    if (callHandler) {
      await callHandler({
        method: "tools/call",
        params: {
          name: "reply",
          arguments: { content: "Gate 007 approved, advancing to plan" },
        },
      });
    }

    // Verify both events are in the buffer
    const events = result.dashboard.eventBuffer.getAll();
    const captainMsg = events.find((e: any) => e.event.type === "channel_message" && e.event.detail === "Approve gate for 007");
    const foReply = events.find((e: any) => e.event.type === "channel_response" && e.event.detail === "Gate 007 approved, advancing to plan");

    expect(captainMsg).toBeDefined();
    expect(foReply).toBeDefined();
    expect(foReply!.seq).toBeGreaterThan(captainMsg!.seq);

    result.dashboard.stop();
  });

  test("permission request -> captain verdict -> permission response in buffer", async () => {
    const { createChannelServer } = await import("../../tools/dashboard/src/channel");
    const result = createChannelServer({
      port: 0,
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
    });
    const baseUrl = `http://localhost:${result.dashboard.port}`;

    // Simulate permission request from Claude Code
    const notifHandler = (result.mcp as any)._notificationHandlers?.get(
      "notifications/claude/channel/permission_request"
    );
    if (notifHandler) {
      await notifHandler({
        method: "notifications/claude/channel/permission_request",
        params: {
          request_id: "fghij",
          tool_name: "Bash",
          description: "Execute a shell command",
          input_preview: "rm -rf node_modules",
        },
      });
    }

    // Captain sends verdict
    const verdictRes = await fetch(`${baseUrl}/api/channel/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "deny",
        meta: { type: "permission_response", request_id: "fghij" },
      }),
    });
    expect(verdictRes.status).toBe(200);

    // Verify events
    const events = result.dashboard.eventBuffer.getAll();
    const permReq = events.find((e: any) => e.event.type === "permission_request");
    const permRes = events.find((e: any) => e.event.type === "permission_response");

    expect(permReq).toBeDefined();
    expect(permRes).toBeDefined();
    expect(permRes!.event.detail).toBe("deny");
    expect(permRes!.seq).toBeGreaterThan(permReq!.seq);

    result.dashboard.stop();
  });

  test("backward compat: dashboard without channel still serves HTTP", async () => {
    const { createServer } = await import("../../tools/dashboard/src/server");
    const srv = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: tmpDir,
      staticDir: join(tmpDir, "static"),
      dbPath: ":memory:",
    });
    const baseUrl = `http://localhost:${srv.port}`;

    // POST to channel/send works (pushes event, but no MCP bridge)
    const res = await fetch(`${baseUrl}/api/channel/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "hello", meta: { type: "message" } }),
    });
    expect(res.status).toBe(200);

    // Existing endpoints work
    const wfRes = await fetch(`${baseUrl}/api/workflows`);
    expect(wfRes.status).toBe(200);

    srv.stop();
  });
});
