# Dashboard Comment Realtime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three root causes preventing comment realtime push and reply bidirectional channel in the Spacedock dashboard.

**Architecture:** Three independent bugfixes that wire up existing infrastructure (publishEvent, onChannelMessage, WS onmessage) that was already built but never connected for comment CRUD operations. Each fix follows a working pattern already present in the codebase (gate_decision route, channel/send route, share.js WS handler).

**Tech Stack:** Bun, TypeScript (server), vanilla JS (frontend), bun:test

---

## File Structure

| File | Role | Change |
|------|------|--------|
| `tools/dashboard/src/server.ts` | API routes + WS broadcast | Modify: add publishEvent() to 3 comment routes (lines 195-274) + 2 share-scoped routes (lines 824-889); add opts.onChannelMessage() to reply route (line 242-247) |
| `tools/dashboard/static/detail.js` | Detail page WS handler | Modify: add `comment` and `channel_response` cases to detailWs.onmessage (lines 821-843) |
| `tools/dashboard/src/server.test.ts` | Server integration tests | Create: test that comment routes call publishEvent and onChannelMessage |

---

## Task 1: Test and fix — server.ts comment routes missing publishEvent

**Files:**
- Create: `tools/dashboard/src/server.test.ts`
- Modify: `tools/dashboard/src/server.ts:195-274`

- [ ] **Step 1: Write failing tests for publishEvent in comment routes**

Create `tools/dashboard/src/server.test.ts`:

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "./server";

const TMP = join(import.meta.dir, "__test_server__");
const ENTITY_PATH = "test-entity.md";
const ENTITY_FULL = join(TMP, ENTITY_PATH);

beforeAll(() => {
  mkdirSync(TMP, { recursive: true });
  writeFileSync(ENTITY_FULL, "---\nid: 001\ntitle: Test\nstatus: explore\nscore: 0.8\n---\n\n## Spec\n\nSome text to select.\n");
});

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("comment routes publish events", () => {
  test("POST /api/entity/comment publishes a comment event", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
    });
    try {
      const addr = server.url;
      const res = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Test comment",
        }),
      });
      expect(res.status).toBe(200);
      const events = server.eventBuffer.since(0);
      const commentEvents = events.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
      expect(commentEvents[0].event.entity).toBe("test-entity");
      expect(commentEvents[0].event.detail).toContain("Test comment");
    } finally {
      server.stop();
    }
  });

  test("POST /api/entity/comment/reply publishes a comment event", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
    });
    try {
      const addr = server.url;
      // Create a comment first
      const createRes = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Parent comment",
        }),
      });
      const comment = await createRes.json();
      const beforeCount = server.eventBuffer.since(0).length;

      const res = await fetch(`${addr}api/entity/comment/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          comment_id: comment.id,
          content: "Test reply",
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.since(0).slice(beforeCount);
      const commentEvents = newEvents.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
    } finally {
      server.stop();
    }
  });

  test("POST /api/entity/comment/resolve publishes a comment event", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
    });
    try {
      const addr = server.url;
      // Create a comment first
      const createRes = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Comment to resolve",
        }),
      });
      const comment = await createRes.json();
      const beforeCount = server.eventBuffer.since(0).length;

      const res = await fetch(`${addr}api/entity/comment/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          comment_id: comment.id,
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.since(0).slice(beforeCount);
      const commentEvents = newEvents.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
    } finally {
      server.stop();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/dashboard && bun test src/server.test.ts`
Expected: FAIL — `commentEvents.length` is 0 because routes don't call publishEvent.

- [ ] **Step 3: Add publishEvent to POST /api/entity/comment**

In `tools/dashboard/src/server.ts`, after `addComment()` returns (line 216), before `logRequest(req, 200)` (line 217), add:

```typescript
            // Broadcast comment event for realtime updates
            const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
            publishEvent({
              type: "comment",
              entity: entitySlug,
              stage: "",
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: comment.content,
            });
```

- [ ] **Step 4: Add publishEvent to POST /api/entity/comment/reply**

In `tools/dashboard/src/server.ts`, after `addReply()` returns (line 244), before `logRequest(req, 200)` (line 246), add:

```typescript
            // Broadcast comment event for realtime updates
            const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
            publishEvent({
              type: "comment",
              entity: entitySlug,
              stage: "",
              agent: body.author ?? "captain",
              timestamp: new Date().toISOString(),
              detail: reply.content,
            });
```

- [ ] **Step 5: Add publishEvent to POST /api/entity/comment/resolve**

In `tools/dashboard/src/server.ts`, after `resolveComment()` returns (line 265), before `logRequest(req, 200)` (line 266), add:

```typescript
            // Broadcast comment event for realtime updates
            const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
            publishEvent({
              type: "comment",
              entity: entitySlug,
              stage: "",
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: "resolved",
            });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test src/server.test.ts`
Expected: PASS — all 3 tests find comment events in EventBuffer.

- [ ] **Step 7: Commit**

```bash
git add tools/dashboard/src/server.ts tools/dashboard/src/server.test.ts
git commit -m "fix(dashboard): add publishEvent to comment routes for realtime push"
```

---

## Task 2: Test and fix — captain reply route missing onChannelMessage

**Files:**
- Modify: `tools/dashboard/src/server.test.ts`
- Modify: `tools/dashboard/src/server.ts:226-254`

- [ ] **Step 1: Write failing test for onChannelMessage in reply route**

Append to `tools/dashboard/src/server.test.ts`:

```typescript
describe("captain reply forwards to FO via onChannelMessage", () => {
  test("POST /api/entity/comment/reply calls onChannelMessage", async () => {
    const messages: { content: string; meta?: Record<string, string> }[] = [];
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
      onChannelMessage: async (content, meta) => {
        messages.push({ content, meta });
      },
    });
    try {
      const addr = server.url;
      // Create a comment first
      const createRes = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Parent comment",
        }),
      });
      const comment = await createRes.json();

      const res = await fetch(`${addr}api/entity/comment/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          comment_id: comment.id,
          content: "Captain reply to FO",
        }),
      });
      expect(res.status).toBe(200);
      // onChannelMessage should have been called for the reply
      const replyMessages = messages.filter((m) => m.meta?.type === "comment_reply");
      expect(replyMessages.length).toBe(1);
      expect(replyMessages[0].content).toBe("Captain reply to FO");
      expect(replyMessages[0].meta?.comment_id).toBe(comment.id);
    } finally {
      server.stop();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `cd tools/dashboard && bun test src/server.test.ts`
Expected: the onChannelMessage test FAILS — `replyMessages.length` is 0.

- [ ] **Step 3: Add onChannelMessage call to reply route**

In `tools/dashboard/src/server.ts`, in the `/api/entity/comment/reply` POST handler, after the publishEvent call added in Task 1 and before `logRequest(req, 200)`, add:

```typescript
            // Forward captain reply to FO via channel
            if (opts.onChannelMessage) {
              opts.onChannelMessage(body.content, {
                type: "comment_reply",
                entity_path: body.path,
                comment_id: body.comment_id,
              });
            }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test src/server.test.ts`
Expected: PASS — all tests including onChannelMessage test.

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/src/server.ts tools/dashboard/src/server.test.ts
git commit -m "fix(dashboard): forward captain reply to FO via onChannelMessage"
```

---

## Task 3: Fix — detail.js WS handler for comment and channel_response events

**Files:**
- Modify: `tools/dashboard/static/detail.js:821-843`

Note: This is vanilla JS in a static file — no bun:test for DOM logic. Manual verification via browser or the E2E pipeline. The server-side tests from Tasks 1-2 cover the data path; this task covers the last mile (WS message -> DOM update).

- [ ] **Step 1: Add comment event handler to detailWs.onmessage**

In `tools/dashboard/static/detail.js`, in the `detailWs.onmessage` handler (line 821-843), after the existing `gate_decision` if-block (line 825-841) and before the closing `};` of onmessage (line 843), add:

```javascript
        // Realtime comment updates — reload comments when any comment event arrives
        if (event.type === 'comment' && typeof loadComments === 'function') {
          loadComments();
        }

        // Channel response (FO reply) — reload comments to show FO replies in thread
        if (event.type === 'channel_response' && typeof loadComments === 'function') {
          loadComments();
        }
```

Both handlers call `loadComments()` which re-fetches the full comment thread from the API and re-renders, matching the pattern already used in `submitComment()` (line 382) and `submitReply()` (line 1093). This is the same approach share.js already uses (line 522-531).

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd tools/dashboard && bun test`
Expected: PASS — all existing tests. The detail.js change doesn't affect server-side tests.

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/static/detail.js
git commit -m "fix(dashboard): handle comment and channel_response in detail WS handler"
```

---

## Task 4: Fix — share-scoped comment routes missing publishEvent

**Files:**
- Modify: `tools/dashboard/src/server.ts:824-889`
- Modify: `tools/dashboard/src/server.test.ts`

- [ ] **Step 1: Write failing test for share-scoped comment publishEvent**

Append to `tools/dashboard/src/server.test.ts`:

```typescript
describe("share-scoped comment routes publish events", () => {
  test("POST /api/share/:token/comment publishes a comment event", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
    });
    try {
      const addr = server.url;
      // Create a share link first
      const shareRes = await fetch(`${addr}api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_paths: [ENTITY_PATH],
          stages: [],
          password: "test123",
          label: "test share",
        }),
      });
      const shareData = await shareRes.json();
      const token = shareData.token;

      // Authenticate
      await fetch(`${addr}api/share/${token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "test123" }),
      });

      const beforeCount = server.eventBuffer.since(0).length;

      const res = await fetch(`${addr}api/share/${token}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Guest comment via share",
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.since(0).slice(beforeCount);
      const commentEvents = newEvents.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
      expect(commentEvents[0].event.agent).toBe("guest");
    } finally {
      server.stop();
    }
  });

  test("POST /api/share/:token/comment/reply publishes a comment event", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
    });
    try {
      const addr = server.url;
      // Create comment via main route first
      const commentRes = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Parent for share reply",
        }),
      });
      const comment = await commentRes.json();

      // Create share link
      const shareRes = await fetch(`${addr}api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_paths: [ENTITY_PATH],
          stages: [],
          password: "test123",
          label: "test share",
        }),
      });
      const shareData = await shareRes.json();
      const token = shareData.token;

      // Authenticate
      await fetch(`${addr}api/share/${token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "test123" }),
      });

      const beforeCount = server.eventBuffer.since(0).length;

      const res = await fetch(`${addr}api/share/${token}/comment/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          comment_id: comment.id,
          content: "Guest reply via share",
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.since(0).slice(beforeCount);
      const commentEvents = newEvents.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
      expect(commentEvents[0].event.agent).toBe("guest");
    } finally {
      server.stop();
    }
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `cd tools/dashboard && bun test src/server.test.ts`
Expected: FAIL — share-scoped routes don't call publishEvent.

- [ ] **Step 3: Add publishEvent to share-scoped comment route**

In `tools/dashboard/src/server.ts`, in the share-scoped comment POST handler (around line 844-851), after `addComment()` returns and before `logRequest(req, 200)` (line 850), add:

```typescript
              const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
              publishEvent({
                type: "comment",
                entity: entitySlug,
                stage: "",
                agent: "guest",
                timestamp: new Date().toISOString(),
                detail: comment.content,
              });
```

- [ ] **Step 4: Add publishEvent to share-scoped reply route**

In `tools/dashboard/src/server.ts`, in the share-scoped reply POST handler (around line 878-883), after `addReply()` returns and before `logRequest(req, 200)` (line 882), add:

```typescript
              const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
              publishEvent({
                type: "comment",
                entity: entitySlug,
                stage: "",
                agent: "guest",
                timestamp: new Date().toISOString(),
                detail: reply.content,
              });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test src/server.test.ts`
Expected: PASS — all tests including share-scoped ones.

- [ ] **Step 6: Commit**

```bash
git add tools/dashboard/src/server.ts tools/dashboard/src/server.test.ts
git commit -m "fix(dashboard): add publishEvent to share-scoped comment routes"
```

---

## Task 5: Quality gate — full test suite + type check

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd tools/dashboard && bun test`
Expected: PASS — all tests including existing comments.test.ts, db.test.ts, etc.

- [ ] **Step 2: Run type check**

Run: `cd tools/dashboard && bunx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 3: Verify build**

Run: `cd tools/dashboard && bun build src/server.ts --target=bun --outdir=dist`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Final commit (if any type/lint fixes needed)**

Only if Steps 1-3 revealed issues that required fixes.
