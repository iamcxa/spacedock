// ABOUTME: Integration tests for SSE route handler — content-type, backlog flush, abort.
// Opens temp DB, pre-inserts events, calls GET(), asserts SSE stream behavior.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";

const TMP = join(tmpdir(), `sse-test-${Date.now()}`);

function createTestDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.exec(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, entity TEXT NOT NULL, stage TEXT NOT NULL,
    agent TEXT NOT NULL, timestamp INTEGER NOT NULL,
    detail TEXT, workflow_dir TEXT NOT NULL,
    event_type TEXT, aggregate_id TEXT, sequence_number INTEGER, payload TEXT
  )`);
  return sqlite;
}

async function readChunks(body: ReadableStream<Uint8Array>, timeoutMs: number, stopOn = "data:"): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value, done } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
    if (result.includes(stopOn)) break;
  }
  reader.cancel();
  return result;
}

describe("GET /api/events", () => {
  test("response has text/event-stream content-type", async () => {
    mkdirSync(TMP, { recursive: true });
    const dbPath = join(TMP, "sse1.db");
    const sqlite = createTestDb(dbPath);
    sqlite.close();

    process.env.SPACEBRIDGE_DB_PATH = dbPath;
    const { GET } = await import("./route");
    const ac = new AbortController();
    const req = new Request("http://localhost/api/events", { signal: ac.signal });
    const res = await GET(req);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(res.headers.get("cache-control")).toBe("no-cache");
    ac.abort();
  });

  test("stream opens with ping comment", async () => {
    mkdirSync(TMP, { recursive: true });
    const dbPath = join(TMP, "sse2.db");
    const sqlite = createTestDb(dbPath);
    sqlite.close();

    process.env.SPACEBRIDGE_DB_PATH = dbPath;
    const { GET } = await import("./route");
    const ac = new AbortController();
    const req = new Request("http://localhost/api/events", { signal: ac.signal });
    const res = await GET(req);
    expect(res.body).not.toBeNull();
    const text = await readChunks(res.body!, 2000, ": ping");
    expect(text).toContain(": ping");
    ac.abort();
  });

  test("pre-inserted events appear in backlog flush", async () => {
    mkdirSync(TMP, { recursive: true });
    const dbPath = join(TMP, "sse3.db");
    const sqlite = createTestDb(dbPath);
    sqlite.exec(`INSERT INTO events (type, entity, stage, agent, timestamp, workflow_dir)
      VALUES ('stage_transition', 'test-entity', 'execute', 'agent1', ${Date.now()}, '/tmp')`);
    sqlite.exec(`INSERT INTO events (type, entity, stage, agent, timestamp, workflow_dir)
      VALUES ('stage_transition', 'test-entity2', 'review', 'agent2', ${Date.now()}, '/tmp')`);
    sqlite.close();

    process.env.SPACEBRIDGE_DB_PATH = dbPath;
    // Clear module cache so new DB path is picked up
    const { GET } = await import("./route");
    const ac = new AbortController();
    const req = new Request("http://localhost/api/events?since=0", { signal: ac.signal });
    const res = await GET(req);
    const text = await readChunks(res.body!, 3000);
    expect(text).toContain("test-entity");
    ac.abort();
  });

  test("force-dynamic export present", async () => {
    const mod = await import("./route");
    expect((mod as Record<string, unknown>).dynamic).toBe("force-dynamic");
  });
});
