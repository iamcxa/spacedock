import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Dashboard Server", () => {
  let tmpDir: string;
  let server: ReturnType<typeof import("../../tools/dashboard/src/server").createServer> extends Promise<infer T> ? T : never;
  let baseUrl: string;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "server-test-"));

    // Create a workflow structure
    const wfDir = join(tmpDir, "docs", "build-pipeline");
    mkdirSync(wfDir, { recursive: true });
    writeFileSync(join(wfDir, "README.md"), [
      "---",
      "commissioned-by: spacedock@v1",
      "entity-type: feature",
      "stages:",
      "  states:",
      "    - name: plan",
      "    - name: execute",
      "---",
      "",
      "Workflow",
    ].join("\n"));
    writeFileSync(join(wfDir, "feat-a.md"), "---\nid: 001\ntitle: Feature A\nstatus: plan\nscore: 0.8\ntags: urgent\n---\n\nBody A\n");
    writeFileSync(join(wfDir, "feat-b.md"), "---\nid: 002\ntitle: Feature B\nstatus: execute\nscore: 0.5\n---\n\nBody B\n");

    // Create static dir with test files
    const staticDir = join(tmpDir, "static");
    mkdirSync(staticDir);
    writeFileSync(join(staticDir, "index.html"), "<html><body>Dashboard</body></html>");
    writeFileSync(join(staticDir, "detail.html"), "<html><body>Detail</body></html>");
    writeFileSync(join(staticDir, "style.css"), "body { color: white; }");
    writeFileSync(join(staticDir, "app.js"), "console.log('app');");

    // Import and start server
    const { createServer } = await import("../../tools/dashboard/src/server");
    const srv = createServer({ port: 0, projectRoot: tmpDir, staticDir });
    baseUrl = `http://localhost:${srv.port}`;
    server = srv;
  });

  afterAll(() => {
    server?.stop();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("GET /api/workflows returns workflow data", async () => {
    const res = await fetch(`${baseUrl}/api/workflows`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].name).toBe("build-pipeline");
    expect(data[0].entities.length).toBe(2);
  });

  test("GET /api/entity/detail returns entity detail", async () => {
    const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
    const res = await fetch(`${baseUrl}/api/entity/detail?path=${encodeURIComponent(filepath)}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.frontmatter.title).toBe("Feature A");
    expect(data.tags).toEqual(["urgent"]);
    expect(data.filepath).toBe(filepath);
  });

  test("GET /api/entity/detail returns 400 without path param", async () => {
    const res = await fetch(`${baseUrl}/api/entity/detail`);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("path required");
  });

  test("GET /api/entity/detail returns 403 for path traversal", async () => {
    const res = await fetch(`${baseUrl}/api/entity/detail?path=${encodeURIComponent("/etc/passwd")}`);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  test("GET /api/entities returns filtered entities", async () => {
    const dir = join(tmpDir, "docs", "build-pipeline");
    const res = await fetch(`${baseUrl}/api/entities?dir=${encodeURIComponent(dir)}&status=plan`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].frontmatter.title).toBe("Feature A");
  });

  test("POST /api/entity/score updates score", async () => {
    const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
    const res = await fetch(`${baseUrl}/api/entity/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filepath, score: 0.99 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("score: 0.99");
  });

  test("POST /api/entity/tags updates tags", async () => {
    const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
    const res = await fetch(`${baseUrl}/api/entity/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filepath, tags: ["critical", "backend"] }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("tags: critical,backend");
  });

  test("POST /api/entity/score returns 403 for path traversal", async () => {
    const res = await fetch(`${baseUrl}/api/entity/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/etc/passwd", score: 1.0 }),
    });
    expect(res.status).toBe(403);
  });

  test("GET / serves index.html", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const text = await res.text();
    expect(text).toContain("Dashboard");
  });

  test("GET /detail serves detail.html", async () => {
    const res = await fetch(`${baseUrl}/detail`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Detail");
  });

  test("GET /style.css serves static file with correct MIME", async () => {
    const res = await fetch(`${baseUrl}/style.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
  });

  test("GET /nonexistent returns 404", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
  });

  test("POST /api/unknown returns 404", async () => {
    const res = await fetch(`${baseUrl}/api/unknown`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  // --- WebSocket and Event Endpoint Tests ---

  test("POST /api/events accepts valid event", async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "dispatch",
        entity: "feat-c",
        stage: "plan",
        agent: "ensign-feat-c-plan",
        timestamp: "2026-04-04T11:00:00Z",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.seq).toBe("number");
  });

  test("POST /api/events rejects invalid event type", async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "invalid",
        entity: "feat-c",
        stage: "plan",
        agent: "e",
        timestamp: "t",
      }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test("POST /api/events rejects missing fields", async () => {
    const res = await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "dispatch" }),
    });
    expect(res.status).toBe(400);
  });

  test("GET /api/events returns buffered events", async () => {
    // Ensure at least one event exists
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "dispatch",
        entity: "get-test",
        stage: "plan",
        agent: "e1",
        timestamp: "2026-04-04T10:00:00Z",
      }),
    });
    const res = await fetch(`${baseUrl}/api/events`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.events)).toBe(true);
    expect(data.events.length).toBeGreaterThan(0);
    expect(typeof data.events[0].seq).toBe("number");
  });

  test("GET /api/events?since=N returns events after N", async () => {
    const allRes = await fetch(`${baseUrl}/api/events`);
    const allData = await allRes.json();
    const lastSeq = allData.events[allData.events.length - 1].seq;

    const res = await fetch(`${baseUrl}/api/events?since=${lastSeq}`);
    const data = await res.json();
    expect(data.events.length).toBe(0);
  });

  test("WebSocket upgrade on /ws/activity succeeds", async () => {
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);
    const opened = await new Promise<boolean>((resolve) => {
      ws.onopen = () => resolve(true);
      ws.onerror = () => resolve(false);
    });
    expect(opened).toBe(true);
    ws.close();
  });

  test("WebSocket receives replay of buffered events on connect", async () => {
    // POST an event first
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "dispatch",
        entity: "replay-test",
        stage: "execute",
        agent: "ensign-replay-test-execute",
        timestamp: "2026-04-04T10:00:00Z",
      }),
    });

    // Connect WebSocket -- should receive replay
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);
    const messages: string[] = [];
    const done = new Promise<void>((resolve) => {
      ws.onmessage = (ev) => {
        messages.push(ev.data as string);
        const parsed = JSON.parse(ev.data as string);
        if (parsed.type === "replay") resolve();
      };
      setTimeout(resolve, 1000);
    });
    await done;
    ws.close();

    expect(messages.length).toBeGreaterThanOrEqual(1);
    const replay = JSON.parse(messages[0]);
    expect(replay.type).toBe("replay");
    expect(Array.isArray(replay.events)).toBe(true);
  });

  test("WebSocket receives live events after POST /api/events", async () => {
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);
    await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });

    // Skip the initial replay message
    const liveMessages: string[] = [];
    let replayDone = false;
    const gotLive = new Promise<void>((resolve) => {
      ws.onmessage = (ev) => {
        const parsed = JSON.parse(ev.data as string);
        if (parsed.type === "replay") {
          replayDone = true;
          return;
        }
        if (replayDone) {
          liveMessages.push(ev.data as string);
          resolve();
        }
      };
      setTimeout(resolve, 2000);
    });

    // POST a new event after connection is established
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "completion",
        entity: "live-test",
        stage: "plan",
        agent: "ensign-live-test-plan",
        timestamp: "2026-04-04T10:10:00Z",
      }),
    });

    await gotLive;
    ws.close();

    expect(liveMessages.length).toBeGreaterThanOrEqual(1);
    const msg = JSON.parse(liveMessages[0]);
    expect(msg.type).toBe("event");
    expect(msg.data.event.entity).toBe("live-test");
    expect(msg.data.seq).toBeGreaterThan(0);
  });

  // --- Observability Tests ---

  test("GET /api/config returns posthog config shape", async () => {
    const res = await fetch(`${baseUrl}/api/config`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect("posthog" in data).toBe(true);
  });

  test("route handler error returns 500 and does not crash server", async () => {
    const badFile = join(tmpDir, "docs", "build-pipeline", "bad-entity.md");
    writeFileSync(badFile, "not valid frontmatter at all");
    const res = await fetch(
      `${baseUrl}/api/entity/detail?path=${encodeURIComponent(badFile)}`
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe("Event Pipeline Integration", () => {
  let tmpDir: string;
  let server: ReturnType<typeof import("../../tools/dashboard/src/server").createServer> extends Promise<infer T> ? T : never;
  let baseUrl: string;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "event-int-test-"));
    const wfDir = join(tmpDir, "docs", "build-pipeline");
    mkdirSync(wfDir, { recursive: true });
    writeFileSync(join(wfDir, "README.md"), "---\ncommissioned-by: spacedock@v1\n---\n");

    const staticDir = join(tmpDir, "static");
    mkdirSync(staticDir);
    writeFileSync(join(staticDir, "index.html"), "<html></html>");

    const { createServer } = await import("../../tools/dashboard/src/server");
    const srv = createServer({ port: 0, projectRoot: tmpDir, staticDir });
    baseUrl = `http://localhost:${srv.port}`;
    server = srv;
  });

  afterAll(() => {
    server?.stop();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("POST /api/events -> WebSocket broadcast -> multiple clients receive in order", async () => {
    const ws1 = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);
    const ws2 = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);

    await Promise.all([
      new Promise<void>((r) => { ws1.onopen = () => r(); }),
      new Promise<void>((r) => { ws2.onopen = () => r(); }),
    ]);

    // Skip replay messages
    const skipReplay = (ws: WebSocket) => new Promise<void>((r) => {
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "replay") r();
      };
      setTimeout(r, 500);
    });
    await Promise.all([skipReplay(ws1), skipReplay(ws2)]);

    // Collect live events from both clients
    const msgs1: any[] = [];
    const msgs2: any[] = [];
    const got1 = new Promise<void>((r) => {
      ws1.onmessage = (ev) => { msgs1.push(JSON.parse(ev.data as string)); if (msgs1.length === 2) r(); };
      setTimeout(r, 2000);
    });
    const got2 = new Promise<void>((r) => {
      ws2.onmessage = (ev) => { msgs2.push(JSON.parse(ev.data as string)); if (msgs2.length === 2) r(); };
      setTimeout(r, 2000);
    });

    // POST two events
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "dispatch", entity: "int-a", stage: "plan", agent: "e1", timestamp: "2026-04-04T12:00:00Z" }),
    });
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "completion", entity: "int-a", stage: "plan", agent: "e1", timestamp: "2026-04-04T12:01:00Z" }),
    });

    await Promise.all([got1, got2]);
    ws1.close();
    ws2.close();

    // Both clients received both events in order
    expect(msgs1.length).toBe(2);
    expect(msgs2.length).toBe(2);
    expect(msgs1[0].data.event.type).toBe("dispatch");
    expect(msgs1[1].data.event.type).toBe("completion");
    expect(msgs1[1].data.seq).toBeGreaterThan(msgs1[0].data.seq);
  });

  test("reconnecting client receives replay of missed events", async () => {
    // POST an event while no WS clients are connected
    await fetch(`${baseUrl}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "gate", entity: "int-b", stage: "quality", agent: "e2", timestamp: "2026-04-04T13:00:00Z" }),
    });

    // Connect a new client -- should receive replay including the missed event
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);
    const replay = await new Promise<any>((resolve) => {
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "replay") resolve(msg);
      };
      setTimeout(() => resolve(null), 1000);
    });
    ws.close();

    expect(replay).not.toBeNull();
    expect(replay.events.length).toBeGreaterThan(0);
    const gateEvent = replay.events.find((e: any) => e.event.entity === "int-b");
    expect(gateEvent).toBeDefined();
    expect(gateEvent.event.type).toBe("gate");
  });
});
