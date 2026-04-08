import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "./server";

const TMP = join(import.meta.dir, "__test_server__");
const ENTITY_FILE = "test-entity.md";
const ENTITY_FULL = join(TMP, ENTITY_FILE);

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
      dbPath: join(TMP, "test.db"),
    });
    try {
      const addr = server.url;
      const res = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Test comment",
        }),
      });
      expect(res.status).toBe(200);
      const events = server.eventBuffer.getAll();
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
      dbPath: join(TMP, "test.db"),
    });
    try {
      const addr = server.url;
      // Create a comment first
      const createRes = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Parent comment",
        }),
      });
      const comment = await createRes.json();
      const beforeCount = server.eventBuffer.getAll().length;

      const res = await fetch(`${addr}api/entity/comment/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
          comment_id: comment.id,
          content: "Test reply",
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.getAll().slice(beforeCount);
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
      dbPath: join(TMP, "test.db"),
    });
    try {
      const addr = server.url;
      // Create a comment first
      const createRes = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Comment to resolve",
        }),
      });
      const comment = await createRes.json();
      const beforeCount = server.eventBuffer.getAll().length;

      const res = await fetch(`${addr}api/entity/comment/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
          comment_id: comment.id,
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.getAll().slice(beforeCount);
      const commentEvents = newEvents.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
    } finally {
      server.stop();
    }
  });
});

describe("captain reply forwards to FO via onChannelMessage", () => {
  test("POST /api/entity/comment/reply calls onChannelMessage", async () => {
    const messages: { content: string; meta?: Record<string, string> }[] = [];
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
      dbPath: join(TMP, "test.db"),
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
          path: ENTITY_FULL,
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
          path: ENTITY_FULL,
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

describe("share-scoped comment routes publish events", () => {
  test("POST /api/share/:token/entity/comment publishes a comment event", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
      dbPath: join(TMP, "test.db"),
    });
    try {
      const addr = server.url;
      // Create a share link first
      const shareRes = await fetch(`${addr}api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "test123",
          entityPaths: [ENTITY_FULL],
          stages: [],
          label: "test share",
        }),
      });
      const shareData = await shareRes.json();
      const token = shareData.token;

      const beforeCount = server.eventBuffer.getAll().length;

      const res = await fetch(`${addr}api/share/${token}/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
          selected_text: "Some text",
          section_heading: "Spec",
          content: "Guest comment via share",
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.getAll().slice(beforeCount);
      const commentEvents = newEvents.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
      expect(commentEvents[0].event.agent).toBe("guest");
    } finally {
      server.stop();
    }
  });

  test("POST /api/share/:token/entity/comment/reply publishes a comment event", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
      dbPath: join(TMP, "test.db"),
    });
    try {
      const addr = server.url;
      // Create comment via main route first
      const commentRes = await fetch(`${addr}api/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
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
          password: "test123",
          entityPaths: [ENTITY_FULL],
          stages: [],
          label: "test share",
        }),
      });
      const shareData = await shareRes.json();
      const token = shareData.token;

      const beforeCount = server.eventBuffer.getAll().length;

      const res = await fetch(`${addr}api/share/${token}/entity/comment/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_FULL,
          comment_id: comment.id,
          content: "Guest reply via share",
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.getAll().slice(beforeCount);
      const commentEvents = newEvents.filter((e) => e.event.type === "comment");
      expect(commentEvents.length).toBeGreaterThanOrEqual(1);
      expect(commentEvents[0].event.agent).toBe("guest");
    } finally {
      server.stop();
    }
  });
});

describe("snapshot HTTP endpoints", () => {
  const SNAP_TMP = join(import.meta.dir, "__test_snapshots__");
  const SNAP_ENTITY = join(SNAP_TMP, "snap-entity.md");
  const SNAP_DB = join(SNAP_TMP, "snap.db");

  function freshServer() {
    try { rmSync(SNAP_TMP, { recursive: true, force: true }); } catch {}
    mkdirSync(SNAP_TMP, { recursive: true });
    writeFileSync(
      SNAP_ENTITY,
      "---\nid: 999\ntitle: Snap Test\nstatus: plan\n---\n\n## Alpha\nalpha-current\n\n## Beta\nbeta-current\n",
    );
    return createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: SNAP_TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(SNAP_TMP, "test.log"),
      dbPath: SNAP_DB,
    });
  }

  test("GET /api/entity/versions returns 400 when entity missing", async () => {
    const server = freshServer();
    try {
      const res = await fetch(`${server.url}api/entity/versions`);
      expect(res.status).toBe(400);
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });

  test("GET /api/entity/versions returns empty array for unknown entity", async () => {
    const server = freshServer();
    try {
      const res = await fetch(`${server.url}api/entity/versions?entity=nope`);
      expect(res.status).toBe(200);
      const body = await res.json() as { entity: string; versions: unknown[] };
      expect(body.entity).toBe("nope");
      expect(body.versions).toEqual([]);
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });

  test("GET /api/entity/versions returns versions after direct snapshot create", async () => {
    const server = freshServer();
    try {
      server.snapshotStore.createSnapshot({
        entity: "snap-entity",
        body: "## Alpha\nv1\n",
        author: "fo",
        reason: "initial",
      });
      server.snapshotStore.createSnapshot({
        entity: "snap-entity",
        body: "## Alpha\nv2\n",
        author: "fo",
        reason: "update",
      });
      const res = await fetch(`${server.url}api/entity/versions?entity=snap-entity`);
      expect(res.status).toBe(200);
      const body = await res.json() as { versions: Array<{ version: number }> };
      expect(body.versions.length).toBe(2);
      expect(body.versions[0].version).toBe(1);
      expect(body.versions[1].version).toBe(2);
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });

  test("GET /api/entity/diff returns 400 on missing params", async () => {
    const server = freshServer();
    try {
      const res = await fetch(`${server.url}api/entity/diff?entity=x`);
      expect(res.status).toBe(400);
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });

  test("GET /api/entity/diff returns SectionDiff[] for valid versions", async () => {
    const server = freshServer();
    try {
      server.snapshotStore.createSnapshot({
        entity: "snap-entity",
        body: "## Alpha\nold\n",
        author: "fo",
        reason: "r",
      });
      server.snapshotStore.createSnapshot({
        entity: "snap-entity",
        body: "## Alpha\nnew\n",
        author: "fo",
        reason: "r",
      });
      const res = await fetch(`${server.url}api/entity/diff?entity=snap-entity&from=1&to=2`);
      expect(res.status).toBe(200);
      const body = await res.json() as {
        from: number;
        to: number;
        sections: Array<{ heading: string; status: string; diff?: string }>;
      };
      expect(body.from).toBe(1);
      expect(body.to).toBe(2);
      const alpha = body.sections.find((s) => s.heading === "## Alpha")!;
      expect(alpha.status).toBe("modified");
      expect(alpha.diff).toBeDefined();
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });

  test("POST /api/entity/rollback returns 403 on path outside projectRoot", async () => {
    const server = freshServer();
    try {
      const res = await fetch(`${server.url}api/entity/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "snap-entity",
          path: "/etc/passwd",
          section_heading: "## Alpha",
          to_version: 1,
        }),
      });
      expect(res.status).toBe(403);
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });

  test("POST /api/entity/rollback writes new body and creates new version", async () => {
    const server = freshServer();
    try {
      // Seed v1 with "old alpha" content
      server.snapshotStore.createSnapshot({
        entity: "snap-entity",
        body: "## Alpha\nold-alpha\n\n## Beta\nbeta-old\n",
        author: "fo",
        reason: "v1",
      });
      const res = await fetch(`${server.url}api/entity/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "snap-entity",
          path: SNAP_ENTITY,
          section_heading: "## Alpha",
          to_version: 1,
          author: "captain",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as { new_version: number; warning: string | null };
      expect(body.new_version).toBe(2);
      // File should have rolled back Alpha section but left Beta intact
      const { readFileSync } = await import("node:fs");
      const disk = readFileSync(SNAP_ENTITY, "utf-8");
      expect(disk).toContain("old-alpha");
      expect(disk).toContain("beta-current"); // Beta was not touched
      expect(disk).not.toContain("alpha-current");
      // Frontmatter preserved
      expect(disk).toContain("id: 999");
      expect(disk).toContain("status: plan");
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });

  test("POST /api/entity/rollback emits rollback event to event buffer", async () => {
    const server = freshServer();
    try {
      server.snapshotStore.createSnapshot({
        entity: "snap-entity",
        body: "## Alpha\nold-alpha\n\n## Beta\nbeta-old\n",
        author: "fo",
        reason: "v1",
      });
      const beforeCount = server.eventBuffer.getAll().length;
      const res = await fetch(`${server.url}api/entity/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "snap-entity",
          path: SNAP_ENTITY,
          section_heading: "## Alpha",
          to_version: 1,
        }),
      });
      expect(res.status).toBe(200);
      const newEvents = server.eventBuffer.getAll().slice(beforeCount);
      const rollbackEvents = newEvents.filter((e) => e.event.type === "rollback");
      expect(rollbackEvents.length).toBe(1);
      expect(rollbackEvents[0].event.entity).toBe("snap-entity");
    } finally {
      server.stop();
      rmSync(SNAP_TMP, { recursive: true, force: true });
    }
  });
});

describe("GET /api/events entity filter", () => {
  test("returns only events for the specified entity", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
      dbPath: join(TMP, "test-events-filter.db"),
    });
    try {
      const addr = server.url;
      await fetch(`${addr}api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" }),
      });
      await fetch(`${addr}api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "completion", entity: "beta", stage: "build", agent: "fo", timestamp: "2026-01-01T00:01:00Z" }),
      });
      await fetch(`${addr}api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gate", entity: "alpha", stage: "quality", agent: "fo", timestamp: "2026-01-01T00:02:00Z" }),
      });

      const res = await fetch(`${addr}api/events?entity=alpha`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.events).toHaveLength(2);
      expect(data.events.every((e: any) => e.event.entity === "alpha")).toBe(true);
    } finally {
      server.stop();
    }
  });

  test("returns all events when no entity param", async () => {
    const server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      staticDir: join(import.meta.dir, "../static"),
      logFile: join(TMP, "test.log"),
      dbPath: join(TMP, "test-events-nofilter.db"),
    });
    try {
      const addr = server.url;
      await fetch(`${addr}api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" }),
      });
      await fetch(`${addr}api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "completion", entity: "beta", stage: "build", agent: "fo", timestamp: "2026-01-01T00:01:00Z" }),
      });

      const res = await fetch(`${addr}api/events`);
      const data = await res.json();
      expect(data.events.length).toBeGreaterThanOrEqual(2);
    } finally {
      server.stop();
    }
  });
});
