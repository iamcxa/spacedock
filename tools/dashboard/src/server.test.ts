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
