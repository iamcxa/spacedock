// ABOUTME: Tests for SessionRegistry.getActiveSessionByProjectRoot — most-recent-heartbeat wins.

import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb } from "../../db";
import { createSessionRegistry } from "./registry";

const ROOT_A = "/projects/alpha";
const ROOT_B = "/projects/beta";

function makeDb() {
  return createDb(join(tmpdir(), `test-session-active-${randomUUID()}.db`));
}

async function makeRegistry(db: ReturnType<typeof makeDb>) {
  return createSessionRegistry({ db });
}

describe("getActiveSessionByProjectRoot", () => {
  test("returns null when no sessions registered", async () => {
    const db = makeDb();
    const registry = await makeRegistry(db);
    expect(registry.getActiveSessionByProjectRoot(ROOT_A)).toBeNull();
  });

  test("returns sole session for matching project root", async () => {
    const db = makeDb();
    const registry = await makeRegistry(db);
    const sessionId = randomUUID();
    await registry.register({
      sessionId,
      projectRoot: ROOT_A,
      pid: 1234,
      protocolVersion: 1,
    });
    expect(registry.getActiveSessionByProjectRoot(ROOT_A)).toBe(sessionId);
  });

  test("returns null for non-matching project root", async () => {
    const db = makeDb();
    const registry = await makeRegistry(db);
    await registry.register({
      sessionId: randomUUID(),
      projectRoot: ROOT_A,
      pid: 1234,
      protocolVersion: 1,
    });
    expect(registry.getActiveSessionByProjectRoot(ROOT_B)).toBeNull();
  });

  test("most-recent heartbeat wins when two sessions share a root", async () => {
    const db = makeDb();
    let tick = 1_000_000;
    const registry = await createSessionRegistry({ db, now: () => tick });

    const sessionOld = "session-old";
    const sessionNew = "session-new";

    tick = 1_000_000;
    await registry.register({
      sessionId: sessionOld,
      projectRoot: ROOT_A,
      pid: 100,
      protocolVersion: 1,
    });

    tick = 1_000_100;
    await registry.register({
      sessionId: sessionNew,
      projectRoot: ROOT_A,
      pid: 101,
      protocolVersion: 1,
    });

    tick = 1_000_200;
    await registry.heartbeat(sessionNew);

    // sessionNew has the later heartbeat
    expect(registry.getActiveSessionByProjectRoot(ROOT_A)).toBe(sessionNew);
  });

  test("disconnected sessions are not returned", async () => {
    const db = makeDb();
    const registry = await makeRegistry(db);
    const sessionId = randomUUID();
    await registry.register({ sessionId, projectRoot: ROOT_A, pid: 999, protocolVersion: 1 });
    await registry.disconnect(sessionId, "explicit");
    expect(registry.getActiveSessionByProjectRoot(ROOT_A)).toBeNull();
  });

  test("exact string match — prefix does not match", async () => {
    const db = makeDb();
    const registry = await makeRegistry(db);
    await registry.register({
      sessionId: randomUUID(),
      projectRoot: ROOT_A,
      pid: 1234,
      protocolVersion: 1,
    });
    // "/projects/alph" must NOT match "/projects/alpha"
    expect(registry.getActiveSessionByProjectRoot("/projects/alph")).toBeNull();
    // "/projects/alpha/sub" must NOT match "/projects/alpha"
    expect(registry.getActiveSessionByProjectRoot("/projects/alpha/sub")).toBeNull();
  });
});
