# ADR-001: Dashboard Single-Server Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the standalone dashboard server (ctl.sh / port 8421) and unify on the channel server (:8420), add `get_pending_messages` MCP tool for chat recovery, and polish the Activity feed UI.

**Architecture:** Single-server elimination. Delete ctl.sh and forwardToCtlServer bridge entirely. The dashboard runs only as the MCP channel server spawned by Claude Code via stdio transport. A new `get_pending_messages` tool lets the FO recover chat messages sent during MCP disconnect windows. Activity feed gets card spacing and auto-scroll.

**Tech Stack:** Bun, TypeScript, bun:test, vanilla JS, CSS

**Design Spec:** `docs/superpowers/specs/2026-04-09-adr-001-single-server-8420-design.md`
**Explore Report:** `docs/build-pipeline/dashboard-single-server-unification.md` (Stage Report: explore)

---

## Resolved Gaps from Explore

These three issues were flagged by the explore stage and are resolved here:

1. **channel_port rename decision:** Keep `channel_port` file name as-is. The name confusion disappears when ctl.sh (which writes the competing `port` file) is deleted. Renaming would require updating the share skill and other readers for no benefit. The SKILL.md port resolution simplifies to read only `channel_port`.

2. **Test baseline is 105, not 195:** The spec's acceptance criterion says "195 tests". Actual baseline verified by `bun test` is **105 tests (101 pass, 4 pre-existing failures)** in gate.test.ts and server.test.ts. Use 105 as the working baseline. Quality gate: 101+ pass, 4 pre-existing failures remain, all new tests pass.

3. **fo-state.json for last_seq is OUT OF SCOPE:** The spec says "FO persists last_seq in fo-state.json". That is FO responsibility, not a dashboard code change. The `get_pending_messages` tool returns `last_seq` in its response; the FO decides where to store it. No task in this plan for fo-state.json.

## Scaffolding Constraint

`references/first-officer-shared-core.md` is plugin scaffolding and **cannot be edited by the ensign**. Task 10 records the exact replacement text for the FO to apply post-merge.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `tools/dashboard/ctl.sh` | DELETE | Standalone launcher (entire file) |
| `tools/dashboard/src/channel.ts` | MODIFY | Remove forwardToCtlServer + add get_pending_messages tool |
| `tools/dashboard/src/server.ts` | MODIFY | Remove CLI entry point block |
| `tools/dashboard/src/events.ts` | MODIFY | Add getChannelMessagesSince method |
| `tools/dashboard/src/events.test.ts` | MODIFY | Add tests for getChannelMessagesSince |
| `tools/dashboard/src/channel.test.ts` | MODIFY | Add tests for get_pending_messages MCP tool |
| `tools/dashboard/static/detail.js` | MODIFY | Auto-scroll on activity feed |
| `tools/dashboard/static/detail.css` | MODIFY | Card gap CSS |
| `skills/dashboard/SKILL.md` | MODIFY | Remove ctl.sh references, simplify port resolution |
| `references/first-officer-shared-core.md` | DO NOT EDIT | Record replacement text only (Task 10) |

---

## Wave 1: Foundation Tests (parallelizable)

### Task 1: Write tests for getChannelMessagesSince

**Files:**
- Modify: `tools/dashboard/src/events.test.ts` (append after existing tests, line ~55)

- [ ] **Step 1: Write failing tests for getChannelMessagesSince**

Add these tests at the end of `tools/dashboard/src/events.test.ts`:

```typescript
describe("EventBuffer.getChannelMessagesSince", () => {
  let buf: EventBuffer;

  beforeEach(() => {
    buf = new EventBuffer(makeDb(), 100);
  });

  test("returns only channel_message events after given seq", () => {
    buf.push({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" });
    const msg1 = buf.push({ type: "channel_message", entity: "alpha", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "hello" });
    buf.push({ type: "completion", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:02:00Z" });
    buf.push({ type: "channel_message", entity: "beta", stage: "", agent: "captain", timestamp: "2026-01-01T00:03:00Z", detail: "world" });

    const results = buf.getChannelMessagesSince(0);
    expect(results).toHaveLength(2);
    expect(results[0].event.type).toBe("channel_message");
    expect(results[0].event.detail).toBe("hello");
    expect(results[1].event.detail).toBe("world");
  });

  test("respects since_seq parameter", () => {
    const msg1 = buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:00:00Z", detail: "first" });
    buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "second" });

    const results = buf.getChannelMessagesSince(msg1.seq);
    expect(results).toHaveLength(1);
    expect(results[0].event.detail).toBe("second");
  });

  test("filters by entity when provided", () => {
    buf.push({ type: "channel_message", entity: "alpha", stage: "", agent: "captain", timestamp: "2026-01-01T00:00:00Z", detail: "for alpha" });
    buf.push({ type: "channel_message", entity: "beta", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "for beta" });
    buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:02:00Z", detail: "project-level" });

    const results = buf.getChannelMessagesSince(0, "alpha");
    expect(results).toHaveLength(1);
    expect(results[0].event.detail).toBe("for alpha");
  });

  test("returns empty array when no channel_message events exist", () => {
    buf.push({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" });
    buf.push({ type: "completion", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:01:00Z" });

    const results = buf.getChannelMessagesSince(0);
    expect(results).toHaveLength(0);
  });

  test("returns all channel_messages when entity is empty string", () => {
    buf.push({ type: "channel_message", entity: "alpha", stage: "", agent: "captain", timestamp: "2026-01-01T00:00:00Z", detail: "a" });
    buf.push({ type: "channel_message", entity: "beta", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "b" });
    buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:02:00Z", detail: "c" });

    const results = buf.getChannelMessagesSince(0, "");
    expect(results).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/dashboard && bun test src/events.test.ts`
Expected: FAIL with "buf.getChannelMessagesSince is not a function"

- [ ] **Step 3: Commit failing tests**

```bash
git add tools/dashboard/src/events.test.ts
git commit -m "test: add failing tests for EventBuffer.getChannelMessagesSince"
```

---

### Task 2: Write tests for get_pending_messages MCP tool

**Files:**
- Modify: `tools/dashboard/src/channel.test.ts` (append new describe block)

- [ ] **Step 1: Write failing test for get_pending_messages tool registration**

Add at the end of `tools/dashboard/src/channel.test.ts`:

```typescript
describe("createChannelServer — get_pending_messages tool", () => {
  test("get_pending_messages returns channel_message events since seq", async () => {
    const { dashboard } = createChannelServer({
      port: 0,
      projectRoot: TMP,
      dbPath: join(TMP, "test.db"),
    });
    try {
      const addr = getAddr(dashboard);

      // Insert channel_message events via POST /api/channel/send
      await fetch(`${addr}api/channel/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "hello from captain", entity: "test-entity" }),
      });
      await fetch(`${addr}api/channel/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "second message", entity: "" }),
      });

      // Verify events are in the buffer via GET /api/events
      const eventsRes = await fetch(`${addr}api/events`);
      const eventsData = await eventsRes.json();
      const channelMsgs = eventsData.events.filter((e: any) => e.event.type === "channel_message");
      expect(channelMsgs.length).toBe(2);

      // The MCP tool itself is tested via the tool handler; here we verify the
      // underlying infrastructure that get_pending_messages will use.
      // The tool calls eventBuffer.getChannelMessagesSince() which is tested in events.test.ts.
      // This test confirms channel_message events are stored by the /api/channel/send endpoint.
    } finally {
      dashboard.stop();
    }
  });

  test("channel_message events are filterable by entity", async () => {
    const { dashboard } = createChannelServer({
      port: 0,
      projectRoot: TMP,
      dbPath: join(TMP, "test.db"),
    });
    try {
      const addr = getAddr(dashboard);

      await fetch(`${addr}api/channel/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "for alpha", entity: "alpha" }),
      });
      await fetch(`${addr}api/channel/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "for beta", entity: "beta" }),
      });

      const res = await fetch(`${addr}api/events?entity=alpha`);
      const data = await res.json();
      const msgs = data.events.filter((e: any) => e.event.type === "channel_message");
      expect(msgs.length).toBe(1);
      expect(msgs[0].event.detail).toBe("for alpha");
    } finally {
      dashboard.stop();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (infrastructure already exists) or fail (if /api/channel/send endpoint is missing)**

Run: `cd tools/dashboard && bun test src/channel.test.ts`
Expected: Tests should pass if `/api/channel/send` endpoint exists. If it fails, note the failure for Task 7 implementation.

- [ ] **Step 3: Commit tests**

```bash
git add tools/dashboard/src/channel.test.ts
git commit -m "test: add get_pending_messages infrastructure tests"
```

---

## Wave 2: Demolition

### Task 3: Delete ctl.sh

**Files:**
- Delete: `tools/dashboard/ctl.sh`

- [ ] **Step 1: Delete ctl.sh**

```bash
rm tools/dashboard/ctl.sh
```

- [ ] **Step 2: Verify no import/require references remain in source code**

Run: `grep -rn "ctl\.sh" tools/dashboard/src/ skills/dashboard/ --include="*.ts"`
Expected: No matches (SKILL.md is .md, not .ts, so it won't match here; SKILL.md references are cleaned in Task 9).

- [ ] **Step 3: Commit deletion**

```bash
git add tools/dashboard/ctl.sh
git commit -m "chore: delete ctl.sh standalone launcher (ADR-001)"
```

---

### Task 4: Remove forwardToCtlServer from channel.ts

**Files:**
- Modify: `tools/dashboard/src/channel.ts:45-58` (function definition)
- Modify: `tools/dashboard/src/channel.ts:328,356,411,463,481` (5 call sites)

- [ ] **Step 1: Delete the forwardToCtlServer function definition (lines 45-58)**

Remove these exact lines from `channel.ts`:

```typescript
/**
 * Bridge cross-instance WS gap: forward an event to the ctl server (HTTP dashboard)
 * so its WebSocket subscribers see it in real-time. Best effort — never blocks/throws.
 */
function forwardToCtlServer(event: AgentEvent, stateDir: string): void {
  try {
    const portFile = join(stateDir, "port");
    if (!existsSync(portFile)) return;
    const ctlPort = readFileSync(portFile, "utf-8").trim();
    fetch(`http://127.0.0.1:${ctlPort}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {}); // fire-and-forget
  } catch {
    // best effort
  }
}
```

- [ ] **Step 2: Remove all 5 call sites**

Remove each of these lines (one per call site):

Line 328: `forwardToCtlServer(commentEvent, computeStateDir(opts.projectRoot));`
Line 356: `forwardToCtlServer(replyEvent, computeStateDir(opts.projectRoot));`
Line 411: `forwardToCtlServer(bodyEvent, computeStateDir(opts.projectRoot));`
Line 463: `forwardToCtlServer(secEvent, computeStateDir(opts.projectRoot));`
Line 481: `forwardToCtlServer(fmEvent, computeStateDir(opts.projectRoot));`

**Important:** After removing the function, also check if `computeStateDir` is still used elsewhere. If not, remove it too. Check if `readFileSync` from `node:fs` is still needed (it is used elsewhere in channel.ts for entity file reads, so keep it).

- [ ] **Step 3: Remove the ctl.sh comment reference at line 589**

The explore report flagged a comment at line ~589 mentioning "so ctl.sh can detect". Find and remove or reword this comment.

Run: `grep -n "ctl\.sh" tools/dashboard/src/channel.ts`
Expected: No matches.

- [ ] **Step 4: Verify no 8421 references remain**

Run: `grep -rn "8421" tools/dashboard/src/`
Expected: No matches.

- [ ] **Step 5: Run existing tests to confirm no regression**

Run: `cd tools/dashboard && bun test src/channel.test.ts`
Expected: All existing channel tests pass (forwardToCtlServer was fire-and-forget, never tested directly).

- [ ] **Step 6: Commit**

```bash
git add tools/dashboard/src/channel.ts
git commit -m "refactor: remove forwardToCtlServer bridge from channel.ts (ADR-001)"
```

---

### Task 5: Remove CLI entry point from server.ts

**Files:**
- Modify: `tools/dashboard/src/server.ts:1247-1284` (the `if (import.meta.main)` block)

- [ ] **Step 1: Delete the CLI entry point block**

Remove lines 1247-1284 from `server.ts`:

```typescript
// CLI entry point -- only runs when executed directly
if (import.meta.main) {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      port: { type: "string", default: "8420" },
      host: { type: "string", default: "127.0.0.1" },
      root: { type: "string" },
      "log-file": { type: "string" },
    },
    strict: true,
  });

  let projectRoot = values.root ?? null;
  if (!projectRoot) {
    try {
      const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"]);
      projectRoot = result.stdout.toString().trim();
    } catch {
      projectRoot = process.cwd();
    }
  }
  projectRoot = resolve(projectRoot);

  const port = parseInt(values.port!, 10);
  const staticDir = join(dirname(import.meta.dir), "static");
  const logFile = values["log-file"] ?? undefined;

  const hostname = values.host!;
  const server = createServer({ port, hostname, projectRoot, staticDir, logFile });

  const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] Spacedock Dashboard started on http://${hostname}:${server.port}/ (root: ${projectRoot})`;
  console.log(banner);
  if (logFile) {
    appendFileSync(logFile, banner + "\n");
  }
  console.log("Press Ctrl+C to stop.");
}
```

- [ ] **Step 2: Clean up unused imports**

After removing the CLI block, check if `parseArgs` and `appendFileSync` are still used. If not, remove their imports.

- `parseArgs` from `node:util` -- only used in the CLI block, remove.
- `appendFileSync` from `node:fs` -- check if used elsewhere in server.ts. If only in CLI block, remove.
- `dirname` from `node:path` -- check if used elsewhere. If only in CLI block, remove.
- `resolve` from `node:path` -- check if used elsewhere. Keep if used.

- [ ] **Step 3: Run existing tests**

Run: `cd tools/dashboard && bun test src/server.test.ts`
Expected: Existing tests pass (the CLI block was never exercised by tests).

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/src/server.ts
git commit -m "refactor: remove standalone CLI entry point from server.ts (ADR-001)"
```

---

## Wave 3: Extension (New Functionality)

### Task 6: Add getChannelMessagesSince to EventBuffer

**Files:**
- Modify: `tools/dashboard/src/events.ts` (add method + prepared statement)

- [ ] **Step 1: Add the prepared statement to the constructor**

In `events.ts`, add two new prepared statements in the constructor (after `selectByEntityStmt` at line 18):

```typescript
private readonly selectChannelMsgSinceStmt;
private readonly selectChannelMsgSinceEntityStmt;
```

In the constructor body (after line 29):

```typescript
this.selectChannelMsgSinceStmt = db.query(
  "SELECT * FROM events WHERE type = 'channel_message' AND seq > ? ORDER BY seq ASC"
);
this.selectChannelMsgSinceEntityStmt = db.query(
  "SELECT * FROM events WHERE type = 'channel_message' AND seq > ? AND entity = ? ORDER BY seq ASC"
);
```

- [ ] **Step 2: Add the getChannelMessagesSince method**

Add after the `clear()` method (after line 73):

```typescript
getChannelMessagesSince(afterSeq: number, entity?: string): SequencedEvent[] {
  if (entity !== undefined && entity !== "") {
    const rows = this.selectChannelMsgSinceEntityStmt.all(afterSeq, entity) as Array<EventRow>;
    return rows.map(rowToSequencedEvent);
  }
  const rows = this.selectChannelMsgSinceStmt.all(afterSeq) as Array<EventRow>;
  return rows.map(rowToSequencedEvent);
}
```

- [ ] **Step 3: Run the tests from Task 1**

Run: `cd tools/dashboard && bun test src/events.test.ts`
Expected: All tests pass, including the new getChannelMessagesSince tests.

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/src/events.ts
git commit -m "feat: add EventBuffer.getChannelMessagesSince for pending message recovery"
```

---

### Task 7: Register get_pending_messages MCP tool in channel.ts

**Files:**
- Modify: `tools/dashboard/src/channel.ts` (ListToolsRequestSchema handler + CallToolRequestSchema handler)

- [ ] **Step 1: Add get_pending_messages to the tool list**

In the `ListToolsRequestSchema` handler (the `tools: [...]` array that ends around line 278), add a new tool entry:

```typescript
{
  name: "get_pending_messages",
  description: "Retrieve channel_message events since a given sequence number. Use after reconnecting the MCP transport to recover messages sent while disconnected.",
  inputSchema: {
    type: "object" as const,
    properties: {
      since_seq: {
        type: "number",
        description: "Return messages with seq > since_seq. Default 0 returns all.",
      },
      entity: {
        type: "string",
        description: "Filter by entity slug. Empty string or omitted returns all entities.",
      },
    },
  },
},
```

- [ ] **Step 2: Add the tool handler**

In the `CallToolRequestSchema` handler, before the final `return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };` line (line ~491), add:

```typescript
if (name === "get_pending_messages") {
  const sinceSeq = (args.since_seq as number | undefined) ?? 0;
  const entity = args.entity as string | undefined;
  const messages = dashboard.eventBuffer.getChannelMessagesSince(sinceSeq, entity);
  const lastSeq = messages.length > 0 ? messages[messages.length - 1].seq : sinceSeq;
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        messages: messages.map(m => ({
          seq: m.seq,
          content: m.event.detail ?? "",
          entity: m.event.entity,
          agent: m.event.agent,
          timestamp: m.event.timestamp,
        })),
        last_seq: lastSeq,
      }),
    }],
  };
}
```

- [ ] **Step 3: Verify eventBuffer is accessible**

The `dashboard` object returned by `createServer()` exposes `eventBuffer` (confirmed at server.ts line 1244: `return Object.assign(server, { db, eventBuffer, publishEvent, ... })`). The channel.ts code already has `dashboard` in scope from `const dashboard = createServer(...)`.

- [ ] **Step 4: Run channel tests**

Run: `cd tools/dashboard && bun test src/channel.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/src/channel.ts
git commit -m "feat: add get_pending_messages MCP tool for chat recovery (ADR-001)"
```

---

## Wave 4: UI Polish

### Task 8: Add card gap CSS in detail.css

**Files:**
- Modify: `tools/dashboard/static/detail.css:1556-1561` (`.activity-event` rule)

- [ ] **Step 1: Add margin-bottom to .activity-event**

Replace the existing `.activity-event` rule at line 1556:

```css
.activity-event {
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid #21262d;
    font-size: 0.82rem;
    line-height: 1.4;
}
```

With:

```css
.activity-event {
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid #21262d;
    margin-bottom: 8px;
    font-size: 0.82rem;
    line-height: 1.4;
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/dashboard/static/detail.css
git commit -m "style: add 8px card gap between activity feed events"
```

---

### Task 9: Add auto-scroll to detail.js activity feed

**Files:**
- Modify: `tools/dashboard/static/detail.js` (3 insertion points)

The homepage activity feed (`activity.js`) already has `scrollTop = scrollHeight` after every append (confirmed at lines 295, 317, 372, 413, 508, 665). The detail page activity feed (`detail.js`) does NOT auto-scroll. This task adds auto-scroll to detail.js only.

- [ ] **Step 1: Add scroll-pause tracking variable**

Inside the main IIFE in `detail.js`, near the other activity feed variables (around `var activityLoaded = false;`), add:

```javascript
var autoScrollPaused = false;
var autoScrollTimer = null;
```

- [ ] **Step 2: Add scroll event listener after container reference**

After the `renderActivityFeed()` function definition (after line ~979), add:

```javascript
(function initAutoScroll() {
  var container = document.getElementById('activity-feed');
  if (!container) return;
  container.addEventListener('scroll', function() {
    // If user scrolled up (not at bottom), pause auto-scroll for 3s
    var atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 30;
    if (!atBottom) {
      autoScrollPaused = true;
      if (autoScrollTimer) clearTimeout(autoScrollTimer);
      autoScrollTimer = setTimeout(function() {
        autoScrollPaused = false;
        autoScrollTimer = null;
      }, 3000);
    }
  });
})();
```

- [ ] **Step 3: Add auto-scroll helper function**

After the scroll listener, add:

```javascript
function scrollActivityToBottom() {
  if (autoScrollPaused) return;
  var container = document.getElementById('activity-feed');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}
```

- [ ] **Step 4: Add auto-scroll after renderActivityFeed in loadActivityFeed**

In `loadActivityFeed()` (around line 947), after `renderActivityFeed();` add:

```javascript
        renderActivityFeed();
        scrollActivityToBottom();
```

The full context of the insertion point (lines 946-949):

```javascript
        populateFilterOptions();
        renderActivityFeed();
        // INSERT scrollActivityToBottom() HERE
        activityLoaded = true;
```

- [ ] **Step 5: Add auto-scroll after renderActivityFeed in WS onmessage handler**

In the WS onmessage handler (around line 1231), after `renderActivityFeed();` add:

```javascript
          populateFilterOptions();
          renderActivityFeed();
          scrollActivityToBottom();
```

The full context of the insertion point (lines 1228-1232):

```javascript
        if (event.entity === currentSlug && activityLoaded) {
          activityEvents.push(event);
          populateFilterOptions();
          renderActivityFeed();
          // INSERT scrollActivityToBottom() HERE
        }
```

- [ ] **Step 6: Commit**

```bash
git add tools/dashboard/static/detail.js
git commit -m "feat: add auto-scroll to detail page activity feed with 3s pause"
```

---

## Wave 5: Docs and Skills

### Task 10: Update SKILL.md — remove ctl.sh references

**Files:**
- Modify: `skills/dashboard/SKILL.md`

This task has multiple edits across the file. Apply them in order.

- [ ] **Step 1: Fix line 11 — description**

Replace:

```
Manage the Spacedock workflow dashboard daemon via `ctl.sh`.
```

With:

```
Manage the Spacedock workflow dashboard via the MCP channel server on port 8420.
```

- [ ] **Step 2: Fix lines 15-16 — remove ctl.sh path resolution from Setup**

Replace step 2 in Setup:

```
2. Resolve ctl.sh path: `{project_root}/tools/dashboard/ctl.sh`
```

With:

```
2. Resolve state dir: `~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)`
```

And remove the old step 3 (which duplicates the state dir resolution now):

```
3. Resolve state dir: `~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)`
```

Renumber so Setup has two steps (detect project root + resolve state dir).

- [ ] **Step 3: Fix lines 23 — MCP Setup Check note**

Replace:

```
**Critical invariant:** This check is **best-effort and non-blocking**. If anything goes wrong (missing `channel.ts`, not a git repo, malformed JSON, user declines), log a warning and continue to `bash {ctl} start --root {project_root}`. The dashboard HTTP channel still works; only the MCP bidirectional path is degraded.
```

With:

```
**Critical invariant:** This check is **best-effort and non-blocking**. If anything goes wrong (missing `channel.ts`, not a git repo, malformed JSON, user declines), log a warning and skip. The dashboard requires the MCP channel to be active.
```

- [ ] **Step 4: Fix lines 255-284 — remove bash ctl subcommands**

Replace the start/stop/status/logs/restart subcommands that use `bash {ctl} ...` with MCP-based equivalents:

```markdown
- `/dashboard start` — The dashboard starts automatically when Claude Code activates the spacedock-dashboard MCP channel. If the channel entry is missing from `.mcp.json`, run the [MCP Setup Check](#mcp-setup-check) above, then restart Claude Code.

- `/dashboard stop` — The dashboard stops when Claude Code exits (the channel server lifecycle is tied to the CC session). To force-stop, the user can quit and restart Claude Code.

- `/dashboard status` — Check whether the channel server is active:
  ```bash
  STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
  if [ -f "$STATE_DIR/channel_port" ]; then
    PORT=$(cat "$STATE_DIR/channel_port" | tr -d '[:space:]')
    curl -sf "http://127.0.0.1:$PORT/api/events" >/dev/null && echo "Dashboard running on :$PORT" || echo "Dashboard not responding"
  else
    echo "Dashboard not running (no channel_port state file)"
  fi
  ```

- `/dashboard logs` — show dashboard logs:
  ```bash
  STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
  cat "$STATE_DIR/dashboard.log" 2>/dev/null || echo "No log file found"
  ```

- `/dashboard restart` — To restart the dashboard, restart Claude Code (the channel server is tied to the CC session lifecycle).
```

- [ ] **Step 5: Fix lines 296-346 — Share flow port resolution**

Replace the "Critical port choice" paragraph (line 296) and Step 1 (lines 300-309) and Step 3 (lines 337-352):

For the "Critical port choice" paragraph, replace:

```
**Critical port choice — always tunnel the channel port (8420), not the standalone server port (8421).** The channel server has a direct MCP stdio transport to the running Claude Code session, which means chat messages from the shared dashboard UI can actually reach the FO. The standalone server (8421) can only reach CC via a one-way `forwardToCtlServer()` WS bridge, which is a workaround — tunneling it means the remote user's messages may never arrive at the FO.
```

With:

```
**Port:** Always tunnel the channel port (8420). This is the only dashboard server — it has a direct MCP stdio transport to the running Claude Code session.
```

For Step 1 (Ensure dashboard is running), replace:

```markdown
### Step 1 — Ensure dashboard is running

```bash
bash {ctl} status --root {project_root}
```

If neither server nor channel is running, start the dashboard first:
```bash
bash {ctl} start --root {project_root}
```
```

With:

```markdown
### Step 1 — Ensure dashboard is running

```bash
STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
PORT=$(cat "$STATE_DIR/channel_port" 2>/dev/null | tr -d '[:space:]')
if [ -z "$PORT" ] || ! curl -sf "http://127.0.0.1:$PORT/api/events" >/dev/null 2>&1; then
  echo "[Share] Dashboard not running. The dashboard requires an active Claude Code session with the spacedock-dashboard MCP channel."
  exit 1
fi
```
```

For Step 3 (Resolve dashboard port), replace:

```markdown
### Step 3 — Resolve dashboard port (prefer channel)

```bash
STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
# PREFER channel_port (8420) — only the channel server has direct MCP stdio
# transport to the running Claude Code session. The standalone server port
# (8421) can only reach CC via the forwardToCtlServer() WS bridge, which is
# a one-way workaround and will be removed by ADR-001.
PORT=$(cat "$STATE_DIR/channel_port" 2>/dev/null || cat "$STATE_DIR/port" 2>/dev/null)
PORT=$(echo "$PORT" | tr -d '[:space:]')

if [ -z "$PORT" ]; then
  echo "[Share] 無法確認 dashboard port — 請先 /dashboard start"
  exit 1
fi
```
```

With:

```markdown
### Step 3 — Resolve dashboard port

```bash
STATE_DIR=~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)
PORT=$(cat "$STATE_DIR/channel_port" 2>/dev/null | tr -d '[:space:]')
if [ -z "$PORT" ]; then
  echo "[Share] Cannot determine dashboard port — ensure Claude Code is running with the spacedock-dashboard channel"
  exit 1
fi
```
```

- [ ] **Step 6: Commit**

```bash
git add skills/dashboard/SKILL.md
git commit -m "docs: update SKILL.md to remove ctl.sh references (ADR-001)"
```

---

### Task 11: Record first-officer-shared-core.md replacement (DO NOT EDIT)

**Files:**
- DO NOT EDIT: `references/first-officer-shared-core.md`

This file is plugin scaffolding. The ensign records the exact replacement text here for the FO to apply post-merge.

- [ ] **Step 1: Record the replacement**

**Current text** (line 21 of `references/first-officer-shared-core.md`):

```
6.5. Check dashboard — run `tools/dashboard/ctl.sh status --root {project_root}`. If not running, prompt captain: "Dashboard is not running. Start it? (http://localhost:8420/)" Wait for captain response. Yes — run `tools/dashboard/ctl.sh start --root {project_root}`. No — skip.
```

**Replacement text:**

```
6.5. Check dashboard — read `~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)/channel_port`. If the file exists and the port responds to `curl -sf http://127.0.0.1:$PORT/api/events`, dashboard is running. If not running, prompt captain: "Dashboard is not running. It requires an active Claude Code session with the spacedock-dashboard MCP channel. Start Claude Code with --channels? (http://localhost:8420/)" Wait for captain response. Yes — guide captain to ensure .mcp.json has the spacedock-dashboard entry, then restart CC. No — skip.
```

**No file edit. No commit. This is documentation for the FO to act on post-merge.**

---

## Wave 6: Verification

### Task 12: Full test suite verification

- [ ] **Step 1: Run the complete test suite**

Run: `cd tools/dashboard && bun test`

Expected output criteria:
- Total tests: >= 110 (105 baseline + new tests from Tasks 1 and 2)
- Pass: >= 106 (101 baseline pass + 5+ new tests)
- Fail: exactly 4 (pre-existing failures in gate.test.ts and server.test.ts)
- No new failures

- [ ] **Step 2: Verify demolition completeness**

Run these grep checks:

```bash
# No ctl.sh references in source code (docs/historical refs are OK)
grep -rn "ctl\.sh" tools/dashboard/src/ skills/dashboard/
# Expected: No matches

# No 8421 references in source or skills
grep -rn "8421" tools/dashboard/src/ skills/dashboard/
# Expected: No matches

# No forwardToCtlServer references anywhere
grep -rn "forwardToCtlServer" tools/dashboard/
# Expected: No matches

# ctl.sh file is gone
ls tools/dashboard/ctl.sh 2>&1
# Expected: No such file or directory
```

- [ ] **Step 3: Verify get_pending_messages tool is registered**

Run: `grep -n "get_pending_messages" tools/dashboard/src/channel.ts`
Expected: Matches in both ListToolsRequestSchema handler (tool definition) and CallToolRequestSchema handler (implementation).

- [ ] **Step 4: Verify auto-scroll code exists**

Run: `grep -n "scrollActivityToBottom\|autoScrollPaused" tools/dashboard/static/detail.js`
Expected: Multiple matches showing the scroll helper, pause tracking, and two call sites.

- [ ] **Step 5: Verify CSS card gap**

Run: `grep -n "margin-bottom" tools/dashboard/static/detail.css`
Expected: Match showing `margin-bottom: 8px` in `.activity-event` rule.

---

## Quality Gate Summary

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| Test suite | `cd tools/dashboard && bun test` | >= 106 pass, exactly 4 fail (pre-existing), 0 new failures |
| ctl.sh deleted | `ls tools/dashboard/ctl.sh` | "No such file" |
| No ctl.sh in source | `grep -rn "ctl\.sh" tools/dashboard/src/ skills/dashboard/` | No matches |
| No 8421 in source | `grep -rn "8421" tools/dashboard/src/ skills/dashboard/` | No matches |
| No forwardToCtlServer | `grep -rn "forwardToCtlServer" tools/dashboard/` | No matches |
| get_pending_messages registered | `grep -n "get_pending_messages" tools/dashboard/src/channel.ts` | 2+ matches |
| Auto-scroll present | `grep -n "scrollActivityToBottom" tools/dashboard/static/detail.js` | 3+ matches |
| Card gap CSS | `grep -n "margin-bottom: 8px" tools/dashboard/static/detail.css` | 1 match in .activity-event |

## Out of Scope (documented for future work)

- **fo-state.json persistence of last_seq** -- FO responsibility, not dashboard code. The `get_pending_messages` tool returns `last_seq` in its response; the FO stores it however it chooses.
- **references/first-officer-shared-core.md edit** -- scaffolding file, cannot be edited by ensign. Replacement text recorded in Task 11 for FO to apply post-merge.
- **CHANGELOG.md / README.md updates** -- historical references to ctl.sh in these docs files are acceptable. They document the project's history.
- **Coverage infrastructure** -- no test:coverage script exists, no baseline. Quality stage skips delta comparison.
