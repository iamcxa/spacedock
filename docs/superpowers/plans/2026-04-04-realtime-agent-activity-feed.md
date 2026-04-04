# Real-time Agent Activity Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream agent lifecycle events (dispatch, completion, gate, feedback) from the First Officer to the dashboard UI in real-time via WebSocket, so the captain sees a live activity feed of what each agent is working on.

**Architecture:** The FO (an AI agent, not a code process) emits events via `curl -X POST /api/events` to the Bun dashboard server. The server uses Bun's built-in WebSocket support (`Bun.serve()` with `websocket` handler) on the same port -- no external library, no separate thread. The REST endpoint receives events, stores them in an in-memory ring buffer with sequence numbers, and broadcasts via `server.publish(topic, data)`. Browser JS opens a WebSocket connection with manual reconnection (exponential backoff) and renders events in a live activity feed panel.

**Tech Stack:** Bun 1.3.9, TypeScript, `bun:test` (Jest-compatible), Bun built-in WebSocket (pub/sub), vanilla JavaScript WebSocket API.

**Research corrections incorporated:**
1. JavaScript WebSocket has NO auto-reconnect -- must implement manually with exponential backoff (~30 LOC)
2. Bun's built-in WebSocket uses pub/sub (`server.publish()`) for broadcast -- no thread-safety issues (single-threaded event loop)
3. Architecture: FO -> REST POST `/api/events` -> Dashboard server -> WebSocket broadcast -> Browser

**Key difference from previous Python plan:**
- No `websockets` library needed (Bun has built-in WebSocket)
- No asyncio background thread (Bun is single-threaded event loop, handles HTTP + WS on same port)
- No `requirements.txt` (zero external deps needed)
- No `run_coroutine_threadsafe()` threading hack (Bun pub/sub is synchronous and safe)

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `tools/dashboard/src/events.ts` | Event types, in-memory ring buffer, sequence numbering |
| Modify | `tools/dashboard/src/types.ts` | Add event-related type exports |
| Modify | `tools/dashboard/src/server.ts` | Add WebSocket handler, `POST /api/events` route, wire event buffer + broadcast |
| Create | `tools/dashboard/static/activity.js` | WebSocket client: connect, reconnect with backoff, render activity feed |
| Modify | `tools/dashboard/static/index.html` | Add activity feed section and `activity.js` script tag |
| Modify | `tools/dashboard/static/style.css` | Activity feed panel styling (dark theme consistent) |
| Modify | `references/first-officer-shared-core.md` | Add event emission instructions at 6 lifecycle injection points |
| Create | `tests/dashboard/events.test.ts` | Unit tests for event buffer, sequence numbering |
| Modify | `tests/dashboard/server.test.ts` | Add tests for WebSocket + `POST /api/events` endpoint |

---

## Task 1: Event Data Model and Ring Buffer

**Files:**
- Create: `tools/dashboard/src/events.ts`
- Modify: `tools/dashboard/src/types.ts`
- Create: `tests/dashboard/events.test.ts`

The event model and ring buffer are pure data structures with no server dependencies. Test-first.

- [ ] **Step 1: Add event types to `types.ts`**

  Append to `tools/dashboard/src/types.ts`:

  ```typescript
  // --- Activity Feed Events ---

  export type AgentEventType = "dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle";

  export interface AgentEvent {
    type: AgentEventType;
    entity: string;
    stage: string;
    agent: string;
    timestamp: string; // ISO 8601
    detail?: string;
  }

  export interface SequencedEvent {
    seq: number;
    event: AgentEvent;
  }
  ```

- [ ] **Step 2: Write failing tests for `EventBuffer`**

  Create `tests/dashboard/events.test.ts`:

  ```typescript
  import { describe, test, expect } from "bun:test";
  import { EventBuffer } from "../../tools/dashboard/src/events";

  describe("EventBuffer", () => {
    test("stores events and assigns incrementing sequence numbers", () => {
      const buf = new EventBuffer(100);
      const e1 = buf.push({
        type: "dispatch",
        entity: "feat-a",
        stage: "execute",
        agent: "ensign-feat-a-execute",
        timestamp: "2026-04-04T10:00:00Z",
      });
      const e2 = buf.push({
        type: "completion",
        entity: "feat-a",
        stage: "execute",
        agent: "ensign-feat-a-execute",
        timestamp: "2026-04-04T10:05:00Z",
      });
      expect(e1.seq).toBe(1);
      expect(e2.seq).toBe(2);
      expect(e1.event.type).toBe("dispatch");
    });

    test("getSince returns events after given sequence number", () => {
      const buf = new EventBuffer(100);
      buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "2026-04-04T10:00:00Z" });
      buf.push({ type: "completion", entity: "a", stage: "plan", agent: "e1", timestamp: "2026-04-04T10:01:00Z" });
      buf.push({ type: "dispatch", entity: "b", stage: "plan", agent: "e2", timestamp: "2026-04-04T10:02:00Z" });

      const after1 = buf.getSince(1);
      expect(after1.length).toBe(2);
      expect(after1[0].seq).toBe(2);
      expect(after1[1].seq).toBe(3);

      const after0 = buf.getSince(0);
      expect(after0.length).toBe(3);
    });

    test("getSince returns empty array when no events after seq", () => {
      const buf = new EventBuffer(100);
      buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "2026-04-04T10:00:00Z" });
      const result = buf.getSince(1);
      expect(result.length).toBe(0);
    });

    test("ring buffer evicts oldest events when capacity exceeded", () => {
      const buf = new EventBuffer(3);
      buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "t1" });
      buf.push({ type: "dispatch", entity: "b", stage: "plan", agent: "e2", timestamp: "t2" });
      buf.push({ type: "dispatch", entity: "c", stage: "plan", agent: "e3", timestamp: "t3" });
      buf.push({ type: "dispatch", entity: "d", stage: "plan", agent: "e4", timestamp: "t4" }); // evicts "a"

      const all = buf.getSince(0);
      expect(all.length).toBe(3);
      expect(all[0].event.entity).toBe("b");
      expect(all[2].event.entity).toBe("d");
      // seq numbers are still monotonic even after eviction
      expect(all[0].seq).toBe(2);
      expect(all[2].seq).toBe(4);
    });

    test("getAll returns all buffered events", () => {
      const buf = new EventBuffer(100);
      buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "t1" });
      buf.push({ type: "gate", entity: "a", stage: "plan", agent: "e1", timestamp: "t2" });
      const all = buf.getAll();
      expect(all.length).toBe(2);
      expect(all[0].seq).toBe(1);
    });

    test("validates event type", () => {
      const buf = new EventBuffer(100);
      expect(() => {
        buf.push({ type: "invalid" as any, entity: "a", stage: "s", agent: "e", timestamp: "t" });
      }).toThrow();
    });
  });
  ```

- [ ] **Step 3: Run tests to verify they fail**

  ```bash
  cd /Users/kent/Project/spacedock && bun test tests/dashboard/events.test.ts
  ```

  Expected: FAIL -- `EventBuffer` not found.

- [ ] **Step 4: Implement `EventBuffer`**

  Create `tools/dashboard/src/events.ts`:

  ```typescript
  import type { AgentEvent, AgentEventType, SequencedEvent } from "./types";

  const VALID_EVENT_TYPES: Set<string> = new Set<string>([
    "dispatch", "completion", "gate", "feedback", "merge", "idle",
  ]);

  export class EventBuffer {
    private buffer: SequencedEvent[] = [];
    private nextSeq = 1;
    private readonly capacity: number;

    constructor(capacity: number) {
      this.capacity = capacity;
    }

    push(event: AgentEvent): SequencedEvent {
      if (!VALID_EVENT_TYPES.has(event.type)) {
        throw new Error(`Invalid event type: ${event.type}`);
      }
      const entry: SequencedEvent = { seq: this.nextSeq++, event };
      this.buffer.push(entry);
      if (this.buffer.length > this.capacity) {
        this.buffer.shift();
      }
      return entry;
    }

    getSince(afterSeq: number): SequencedEvent[] {
      return this.buffer.filter((e) => e.seq > afterSeq);
    }

    getAll(): SequencedEvent[] {
      return this.buffer.slice();
    }
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**

  ```bash
  cd /Users/kent/Project/spacedock && bun test tests/dashboard/events.test.ts
  ```

  Expected: 6 tests PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/events.ts tools/dashboard/src/types.ts tests/dashboard/events.test.ts
  git commit -m "feat(dashboard): add event data model and ring buffer with tests"
  ```

---

## Task 2: WebSocket Handler in Bun Server

**Files:**
- Modify: `tools/dashboard/src/server.ts`
- Modify: `tests/dashboard/server.test.ts`

Add WebSocket upgrade support to the existing `Bun.serve()` call. Bun handles HTTP and WebSocket on the same port natively. Clients connect to `ws://host:port/ws/activity` and receive events via pub/sub topic `"activity"`.

- [ ] **Step 1: Write failing WebSocket tests**

  Append to `tests/dashboard/server.test.ts`:

  ```typescript
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
        entity: "feat-a",
        stage: "execute",
        agent: "ensign-feat-a-execute",
        timestamp: "2026-04-04T10:00:00Z",
      }),
    });

    // Connect WebSocket -- should receive replay
    const ws = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);
    const messages: string[] = [];
    const done = new Promise<void>((resolve) => {
      ws.onmessage = (ev) => {
        messages.push(ev.data as string);
        // Replay comes as a single "replay" message
        const parsed = JSON.parse(ev.data as string);
        if (parsed.type === "replay") resolve();
      };
      setTimeout(resolve, 1000); // timeout fallback
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
        entity: "feat-b",
        stage: "plan",
        agent: "ensign-feat-b-plan",
        timestamp: "2026-04-04T10:10:00Z",
      }),
    });

    await gotLive;
    ws.close();

    expect(liveMessages.length).toBeGreaterThanOrEqual(1);
    const msg = JSON.parse(liveMessages[0]);
    expect(msg.type).toBe("event");
    expect(msg.data.event.entity).toBe("feat-b");
    expect(msg.data.seq).toBeGreaterThan(0);
  });
  ```

- [ ] **Step 2: Write failing test for `POST /api/events`**

  Append to `tests/dashboard/server.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 3: Run tests to verify they fail**

  ```bash
  cd /Users/kent/Project/spacedock && bun test tests/dashboard/server.test.ts
  ```

  Expected: FAIL -- `/api/events` route not found, WebSocket not configured.

- [ ] **Step 4: Add WebSocket and event endpoint to `server.ts`**

  Modify `tools/dashboard/src/server.ts` -- add imports, event buffer, routes, and WebSocket handler:

  ```typescript
  // Add to imports at top:
  import { EventBuffer } from "./events";
  import type { AgentEvent } from "./types";

  // Inside createServer(), before the Bun.serve() call, add:
  const eventBuffer = new EventBuffer(500);

  // Add to the routes object:
  "/api/events": {
    GET: (req) => {
      const url = new URL(req.url);
      const sinceStr = url.searchParams.get("since");
      const since = sinceStr ? parseInt(sinceStr, 10) : 0;
      const events = since > 0 ? eventBuffer.getSince(since) : eventBuffer.getAll();
      logRequest(req, 200);
      return jsonResponse({ events });
    },
    POST: async (req) => {
      const body = await req.json() as Record<string, unknown>;
      // Validate required fields
      const required = ["type", "entity", "stage", "agent", "timestamp"];
      for (const field of required) {
        if (!body[field]) {
          logRequest(req, 400);
          return jsonResponse({ error: `Missing required field: ${field}` }, 400);
        }
      }
      try {
        const entry = eventBuffer.push(body as unknown as AgentEvent);
        // Broadcast to all WebSocket subscribers
        server.publish("activity", JSON.stringify({ type: "event", data: entry }));
        logRequest(req, 200);
        return jsonResponse({ ok: true, seq: entry.seq });
      } catch (e: any) {
        logRequest(req, 400);
        return jsonResponse({ error: e.message }, 400);
      }
    },
  },

  // Add websocket handler to Bun.serve() options (alongside routes and fetch):
  websocket: {
    open(ws) {
      ws.subscribe("activity");
      // Send replay of all buffered events
      const events = eventBuffer.getAll();
      ws.send(JSON.stringify({ type: "replay", events }));
    },
    message(_ws, _message) {
      // Client-to-server messages not used yet (future: gate approval)
    },
    close(ws) {
      ws.unsubscribe("activity");
    },
  },

  // In the fetch() fallback handler, add WebSocket upgrade before static file serving:
  // Handle WebSocket upgrade
  if (pathname === "/ws/activity") {
    const upgraded = server.upgrade(req);
    if (upgraded) return undefined as any;
    logRequest(req, 400);
    return new Response("WebSocket upgrade failed", { status: 400 });
  }
  ```

  The key structural change: `Bun.serve()` now includes a `websocket` property and the `fetch` handler attempts WebSocket upgrade for `/ws/activity` path. The `server` variable must be accessible in route handlers for `server.publish()` -- since `Bun.serve()` returns the server, and routes are defined inline, the publish calls reference the outer `server` variable.

  Full updated `createServer` function:

  ```typescript
  export function createServer(opts: ServerOptions) {
    const { projectRoot, logFile } = opts;
    const staticDir = opts.staticDir ?? join(dirname(import.meta.dir), "static");
    const eventBuffer = new EventBuffer(500);

    function logRequest(req: Request, status: number) {
      if (!logFile) return;
      const now = new Date().toISOString();
      const line = `${now} - ${req.method} ${new URL(req.url).pathname} ${status}\n`;
      appendFileSync(logFile, line);
    }

    const server = Bun.serve({
      port: opts.port,
      routes: {
        // ... (all existing routes unchanged) ...

        "/api/events": {
          GET: (req) => {
            const url = new URL(req.url);
            const sinceStr = url.searchParams.get("since");
            const since = sinceStr ? parseInt(sinceStr, 10) : 0;
            const events = since > 0 ? eventBuffer.getSince(since) : eventBuffer.getAll();
            logRequest(req, 200);
            return jsonResponse({ events });
          },
          POST: async (req) => {
            const body = await req.json() as Record<string, unknown>;
            const required = ["type", "entity", "stage", "agent", "timestamp"];
            for (const field of required) {
              if (!body[field]) {
                logRequest(req, 400);
                return jsonResponse({ error: `Missing required field: ${field}` }, 400);
              }
            }
            try {
              const entry = eventBuffer.push(body as unknown as AgentEvent);
              server.publish("activity", JSON.stringify({ type: "event", data: entry }));
              logRequest(req, 200);
              return jsonResponse({ ok: true, seq: entry.seq });
            } catch (e: any) {
              logRequest(req, 400);
              return jsonResponse({ error: e.message }, 400);
            }
          },
        },
      },
      websocket: {
        open(ws) {
          ws.subscribe("activity");
          const events = eventBuffer.getAll();
          ws.send(JSON.stringify({ type: "replay", events }));
        },
        message(_ws, _message) {
          // Reserved for future bidirectional communication (gate approval)
        },
        close(ws) {
          ws.unsubscribe("activity");
        },
      },
      fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Handle WebSocket upgrade
        if (pathname === "/ws/activity") {
          const upgraded = server.upgrade(req);
          if (upgraded) return undefined as any;
          logRequest(req, 400);
          return new Response("WebSocket upgrade failed", { status: 400 });
        }

        // ... (rest of existing static file serving unchanged) ...
      },
    });

    return server;
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**

  ```bash
  cd /Users/kent/Project/spacedock && bun test tests/dashboard/server.test.ts
  ```

  Expected: All tests PASS (existing + new WebSocket + event endpoint tests).

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/server.ts tests/dashboard/server.test.ts
  git commit -m "feat(dashboard): add WebSocket handler and POST /api/events endpoint"
  ```

---

## Task 3: Frontend Activity Feed -- WebSocket Client with Reconnection

**Files:**
- Create: `tools/dashboard/static/activity.js`
- Modify: `tools/dashboard/static/index.html`
- Modify: `tools/dashboard/static/style.css`

The frontend connects to the WebSocket, receives events, and renders them in a live activity feed panel. Manual reconnection with exponential backoff is required (browser WebSocket API has no auto-reconnect).

- [ ] **Step 1: Create `activity.js` with WebSocket client**

  Create `tools/dashboard/static/activity.js`:

  ```javascript
  (function () {
    "use strict";

    var feedContainer = document.getElementById("activity-feed");
    var statusIndicator = document.getElementById("ws-status");
    var lastSeq = 0;
    var ws = null;
    var retryCount = 0;
    var maxRetries = 10;
    var baseDelay = 500;  // ms
    var maxDelay = 30000; // ms

    function getWsUrl() {
      var loc = window.location;
      var proto = loc.protocol === "https:" ? "wss:" : "ws:";
      return proto + "//" + loc.host + "/ws/activity";
    }

    function setStatus(state) {
      if (!statusIndicator) return;
      statusIndicator.textContent = state === "connected" ? "Live" : state === "connecting" ? "Connecting..." : "Disconnected";
      statusIndicator.className = "indicator" + (state === "connected" ? "" : " paused");
    }

    function connect() {
      setStatus("connecting");
      ws = new WebSocket(getWsUrl());

      ws.onopen = function () {
        retryCount = 0;
        setStatus("connected");
      };

      ws.onmessage = function (ev) {
        var msg = JSON.parse(ev.data);
        if (msg.type === "replay") {
          // Initial replay -- render all buffered events
          if (msg.events && msg.events.length > 0) {
            msg.events.forEach(function (entry) {
              renderEvent(entry);
              if (entry.seq > lastSeq) lastSeq = entry.seq;
            });
          }
        } else if (msg.type === "event") {
          // Live event
          renderEvent(msg.data);
          if (msg.data.seq > lastSeq) lastSeq = msg.data.seq;
        }
      };

      ws.onclose = function () {
        setStatus("disconnected");
        scheduleReconnect();
      };

      ws.onerror = function () {
        // onclose will fire after onerror -- reconnect handled there
      };
    }

    function scheduleReconnect() {
      if (retryCount >= maxRetries) {
        setStatus("disconnected");
        return;
      }
      var delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
      // Add jitter: +/- 25%
      delay = delay * (0.75 + Math.random() * 0.5);
      retryCount++;
      setTimeout(connect, delay);
    }

    function statusColor(type) {
      var colors = {
        dispatch: "#58a6ff",
        completion: "#3fb950",
        gate: "#f0883e",
        feedback: "#d2a8ff",
        merge: "#79c0ff",
        idle: "#8b949e",
      };
      return colors[type] || "#8b949e";
    }

    function timeAgo(isoStr) {
      var diff = Date.now() - new Date(isoStr).getTime();
      if (diff < 60000) return Math.floor(diff / 1000) + "s ago";
      if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
      return Math.floor(diff / 3600000) + "h ago";
    }

    function renderEvent(entry) {
      if (!feedContainer) return;
      var e = entry.event;

      var item = document.createElement("div");
      item.className = "activity-item";

      var badge = document.createElement("span");
      badge.className = "activity-badge";
      badge.style.background = statusColor(e.type) + "22";
      badge.style.color = statusColor(e.type);
      badge.textContent = e.type;

      var info = document.createElement("span");
      info.className = "activity-info";
      info.textContent = e.agent + " \u2192 " + e.entity + " @ " + e.stage;

      var time = document.createElement("span");
      time.className = "activity-time";
      time.textContent = timeAgo(e.timestamp);

      item.appendChild(badge);
      item.appendChild(info);
      item.appendChild(time);

      if (e.detail) {
        var detail = document.createElement("div");
        detail.className = "activity-detail";
        detail.textContent = e.detail;
        item.appendChild(detail);
      }

      // Prepend newest at top
      feedContainer.insertBefore(item, feedContainer.firstChild);

      // Cap visible items at 100
      while (feedContainer.children.length > 100) {
        feedContainer.removeChild(feedContainer.lastChild);
      }
    }

    // Remove the "No activity yet" placeholder on first event
    var emptyState = feedContainer ? feedContainer.querySelector(".empty-state") : null;
    var origRender = renderEvent;
    renderEvent = function (entry) {
      if (emptyState && emptyState.parentNode) {
        emptyState.parentNode.removeChild(emptyState);
        emptyState = null;
      }
      origRender(entry);
    };

    connect();
  })();
  ```

- [ ] **Step 2: Add activity feed section to `index.html`**

  Modify `tools/dashboard/static/index.html` -- add an activity feed section between `</header>` and `<main>`, and add the script tag:

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Spacedock Dashboard</title>
      <link rel="stylesheet" href="style.css">
  </head>
  <body>
      <header>
          <h1>Spacedock Dashboard</h1>
          <div class="header-indicators">
              <span id="ws-status" class="indicator paused">Connecting...</span>
              <span id="refresh-indicator" class="indicator">Auto-refresh: ON</span>
          </div>
      </header>
      <div class="dashboard-layout">
          <main id="workflows-container">
              <p class="loading">Loading workflows...</p>
          </main>
          <aside id="activity-panel">
              <h3>Activity Feed</h3>
              <div id="activity-feed">
                  <p class="empty-state">No activity yet.</p>
              </div>
          </aside>
      </div>
      <script src="app.js"></script>
      <script src="activity.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 3: Add activity feed styles to `style.css`**

  Append to `tools/dashboard/static/style.css`:

  ```css
  /* --- Activity Feed --- */

  .header-indicators {
      display: flex;
      gap: 0.5rem;
      align-items: center;
  }

  .dashboard-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1.5rem;
  }

  #activity-panel {
      position: sticky;
      top: 1.5rem;
      max-height: calc(100vh - 5rem);
      overflow-y: auto;
  }

  #activity-panel h3 {
      font-size: 0.9rem;
      color: #f0f6fc;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #21262d;
  }

  .activity-item {
      padding: 0.5rem;
      border-bottom: 1px solid #21262d;
      font-size: 0.8rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: baseline;
  }

  .activity-item:first-child {
      animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
  }

  .activity-badge {
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
      font-weight: 600;
      text-transform: uppercase;
      flex-shrink: 0;
  }

  .activity-info {
      color: #c9d1d9;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
  }

  .activity-time {
      color: #8b949e;
      font-size: 0.7rem;
      flex-shrink: 0;
  }

  .activity-detail {
      width: 100%;
      color: #8b949e;
      font-size: 0.75rem;
      padding-left: 0.5rem;
      margin-top: 0.15rem;
  }

  /* Responsive: stack on narrow screens */
  @media (max-width: 768px) {
      .dashboard-layout {
          grid-template-columns: 1fr;
      }
      #activity-panel {
          position: static;
          max-height: 300px;
      }
  }
  ```

- [ ] **Step 4: Verify manually (no automated test for CSS/HTML -- visual check)**

  Start the server and open in browser to verify the layout renders correctly:
  ```bash
  cd /Users/kent/Project/spacedock && bun run tools/dashboard/src/server.ts --port 8420
  # Open http://localhost:8420/ -- verify activity panel appears on the right
  # POST a test event:
  # curl -X POST http://localhost:8420/api/events -H 'Content-Type: application/json' -d '{"type":"dispatch","entity":"test","stage":"plan","agent":"ensign-test","timestamp":"2026-04-04T10:00:00Z"}'
  # Verify it appears in the feed
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/static/activity.js tools/dashboard/static/index.html tools/dashboard/static/style.css
  git commit -m "feat(dashboard): add activity feed UI with WebSocket client and reconnection"
  ```

---

## Task 4: FO Lifecycle Event Emission Instructions

**Files:**
- Modify: `references/first-officer-shared-core.md`

The FO is an AI agent that emits events by running `curl` via the Bash tool. Add event emission instructions at each lifecycle injection point identified in the explore stage.

- [ ] **Step 1: Add event emission section to FO shared core**

  Add a new `## Event Emission` section to `references/first-officer-shared-core.md`, after the `## Status Viewer` section:

  ```markdown
  ## Event Emission

  The dashboard displays a real-time activity feed. Emit structured events at lifecycle boundaries by POSTing to the dashboard server. Determine the dashboard port from the same startup check (default 8420).

  Event format:
  ```
  curl -s -X POST http://localhost:${DASHBOARD_PORT}/api/events \
    -H 'Content-Type: application/json' \
    -d '{"type":"<TYPE>","entity":"<SLUG>","stage":"<STAGE>","agent":"<WORKER_KEY>-<SLUG>-<STAGE>","timestamp":"<ISO8601>","detail":"<OPTIONAL>"}'
  ```

  Event types and injection points:

  | Type | When | Detail field |
  |------|------|-------------|
  | `dispatch` | After step 6 (commit state transition) | "Entering {stage}" |
  | `completion` | After step 2 of Completion (stage report reviewed) | "{N} done, {N} skipped, {N} failed" |
  | `gate` | When presenting gate to captain | "Awaiting captain approval" |
  | `feedback` | When bouncing entity back to feedback-to stage | "Rejected: {reason summary}" |
  | `merge` | After successful merge/cleanup | "Merged to main" |
  | `idle` | When no entities are dispatchable and idle hooks run | "No dispatchable entities" |

  Rules:
  - Emit events only when the dashboard is running (startup check passed or was explicitly started).
  - If the `curl` POST fails (server unreachable), log a warning but do not block the workflow. Events are best-effort.
  - Use `$(date -u +%Y-%m-%dT%H:%M:%SZ)` for the timestamp.
  - The `agent` field uses the `worker_key-slug-stage` convention (e.g., `ensign-feat-a-execute`).
  ```

- [ ] **Step 2: Add dispatch event instruction inline**

  In the `## Dispatch` section, after step 6 ("Commit the state transition"), add:

  ```markdown
  6.5. Emit dispatch event: `curl -s -X POST http://localhost:${DASHBOARD_PORT}/api/events -H 'Content-Type: application/json' -d "{\"type\":\"dispatch\",\"entity\":\"${SLUG}\",\"stage\":\"${NEXT_STAGE}\",\"agent\":\"${WORKER_KEY}-${SLUG}-${NEXT_STAGE}\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"detail\":\"Entering ${NEXT_STAGE}\"}"` (skip if dashboard not running).
  ```

- [ ] **Step 3: Add completion event instruction inline**

  In the `## Completion and Gates` section, after step 3 ("If checklist items are missing, send the worker back"), add:

  ```markdown
  3.5. Emit completion event with the checklist count summary as detail (skip if dashboard not running).
  ```

  After the gate presentation logic, add:

  ```markdown
  If the stage is gated:
  - Emit gate event with detail "Awaiting captain approval" (skip if dashboard not running).
  ```

- [ ] **Step 4: Add feedback/merge event instructions inline**

  In the `## Feedback Rejection Flow` section, add after the rejection bounce step:

  ```markdown
  Emit feedback event with detail summarizing the rejection reason (skip if dashboard not running).
  ```

  In the `## Merge and Cleanup` section (or equivalent), add:

  ```markdown
  After successful merge, emit merge event with detail "Merged to main" (skip if dashboard not running).
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add references/first-officer-shared-core.md
  git commit -m "docs(fo): add event emission instructions at lifecycle injection points"
  ```

---

## Task 5: Integration Test -- Full Event Pipeline

**Files:**
- Modify: `tests/dashboard/server.test.ts`

End-to-end test: POST an event via REST, verify it arrives on a connected WebSocket client. This validates the full pipeline: REST -> EventBuffer -> publish -> WebSocket.

- [ ] **Step 1: Write integration test**

  Add a new `describe` block to `tests/dashboard/server.test.ts`:

  ```typescript
  describe("Event Pipeline Integration", () => {
    test("POST /api/events -> WebSocket broadcast -> client receives in order", async () => {
      // Connect two WebSocket clients
      const ws1 = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);
      const ws2 = new WebSocket(`${baseUrl.replace("http", "ws")}/ws/activity`);

      await Promise.all([
        new Promise<void>((r) => { ws1.onopen = () => r(); }),
        new Promise<void>((r) => { ws2.onopen = () => r(); }),
      ]);

      // Skip replay messages
      const skip = (ws: WebSocket) => new Promise<void>((r) => {
        ws.onmessage = (ev) => {
          const msg = JSON.parse(ev.data as string);
          if (msg.type === "replay") r();
        };
        setTimeout(r, 500);
      });
      await Promise.all([skip(ws1), skip(ws2)]);

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
  ```

- [ ] **Step 2: Run all tests**

  ```bash
  cd /Users/kent/Project/spacedock && bun test tests/dashboard/
  ```

  Expected: All tests PASS -- events.test.ts (6 tests) + server.test.ts (existing + new WebSocket + event + integration tests).

- [ ] **Step 3: Commit**

  ```bash
  git add tests/dashboard/server.test.ts
  git commit -m "test(dashboard): add full event pipeline integration tests"
  ```

---

## Task 6: Run All Tests and Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full dashboard test suite**

  ```bash
  cd /Users/kent/Project/spacedock && bun test tests/dashboard/
  ```

  Expected: All tests pass. No regressions in existing tests.

- [ ] **Step 2: Verify no TypeScript errors**

  ```bash
  cd /Users/kent/Project/spacedock && bunx tsc --noEmit tools/dashboard/src/events.ts tools/dashboard/src/server.ts tools/dashboard/src/types.ts 2>&1 || true
  ```

- [ ] **Step 3: Smoke test -- start server, POST event, verify WebSocket delivery**

  ```bash
  # Terminal 1: Start server
  bun run tools/dashboard/src/server.ts --port 8499

  # Terminal 2: Connect WebSocket and POST event
  # (use websocat or browser devtools)
  curl -s -X POST http://localhost:8499/api/events \
    -H 'Content-Type: application/json' \
    -d '{"type":"dispatch","entity":"test-entity","stage":"execute","agent":"ensign-test-execute","timestamp":"2026-04-04T15:00:00Z","detail":"Entering execute"}'
  # Should return: {"ok":true,"seq":1}

  curl -s http://localhost:8499/api/events
  # Should return: {"events":[{"seq":1,"event":{...}}]}
  ```

- [ ] **Step 4: Final commit with all changes**

  If any loose changes remain:
  ```bash
  git add -A
  git commit -m "feat(dashboard): real-time agent activity feed -- WebSocket event streaming"
  ```

---

## Spec Coverage Verification

| Acceptance Criterion | Task |
|---------------------|------|
| FO emits structured events: `{type, entity, stage, agent, timestamp}` | Task 1 (types), Task 4 (FO instructions) |
| WebSocket server starts alongside FO, configurable port | Task 2 (same port as HTTP -- Bun built-in) |
| Dashboard UI connects via WebSocket, renders live activity feed | Task 3 (activity.js + index.html) |
| Activity feed shows: agent name, entity title, current stage, elapsed time | Task 3 (renderEvent function) |
| Reconnection handling: UI reconnects and replays missed events | Task 3 (exponential backoff), Task 2 (replay on connect) |
| Gate pending events highlighted in UI with approve/reject buttons | Stretch goal -- not implemented in this plan (event type renders with distinct color) |
| Multiple concurrent workflows visible in single feed | Task 3 (all events render in one feed, agent field includes context) |
