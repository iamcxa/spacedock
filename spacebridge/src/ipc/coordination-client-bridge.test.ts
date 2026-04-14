// spacebridge/src/ipc/coordination-client-bridge.test.ts
// ABOUTME: Unit tests for the real CoordinationClient bridge against :memory: DB.

import { beforeEach, describe, expect, test } from "bun:test";
import { createDb } from "../db";
import { LeaseExpired, LeaseNotFound } from "../domain/lease/errors";
import { createCoordinationClientBridge } from "./coordination-client-bridge";
import type { CoordinationClient, EntityRef } from "./coordination-client-stub";

const DURATION = 300_000;

function makeScanner(entities: EntityRef[]): () => Promise<EntityRef[]> {
  return async () => entities;
}

const testEntities: EntityRef[] = [
  { slug: "ent-a", workflow_dir: "/wf", current_stage: "execute", status: "active" },
  { slug: "ent-b", workflow_dir: "/wf", current_stage: "review", status: "active" },
];

let nowMs = 1_000_000;
function fakeNow() {
  return nowMs;
}

beforeEach(() => {
  nowMs = 1_000_000;
});

async function makeClient(entities = testEntities) {
  const db = createDb(":memory:");
  const client = await createCoordinationClientBridge({
    db,
    entityScanner: makeScanner(entities),
    leaseDurationMs: DURATION,
    now: fakeNow,
  });
  // Satisfy CoordinationClient interface typecheck
  const _: CoordinationClient = client;
  return { client, db };
}

describe("getAvailableWork", () => {
  test("returns all entities when none are leased (AC-7)", async () => {
    const { client } = await makeClient();
    const result = await client.getAvailableWork("FO");
    expect(result.length).toBe(2);
  });

  test("excludes entity that has active lease for the same role (AC-7)", async () => {
    const { client } = await makeClient();
    await client.acquireEntity("ent-a", "FO", "sess-1");
    const result = await client.getAvailableWork("FO");
    expect(result.map((e) => e.slug)).not.toContain("ent-a");
    expect(result.map((e) => e.slug)).toContain("ent-b");
  });

  test("does not exclude entity leased by a different role", async () => {
    const { client } = await makeClient();
    await client.acquireEntity("ent-a", "SO", "sess-1");
    const result = await client.getAvailableWork("FO");
    expect(result.map((e) => e.slug)).toContain("ent-a");
  });
});

describe("acquireEntity + releaseEntity", () => {
  test("acquire returns a LeaseToken with correct fields (AC-1)", async () => {
    const { client } = await makeClient();
    const token = await client.acquireEntity("ent-a", "FO", "sess-1");
    expect(token.entity_slug).toBe("ent-a");
    expect(token.role).toBe("FO");
    expect(token.session_id).toBe("sess-1");
    expect(token.acquired_at).toBe(nowMs);
    expect(token.expires_at).toBe(nowMs + DURATION);
  });

  test("release('done') returns entity to pool (AC-8)", async () => {
    const { client } = await makeClient();
    const token = await client.acquireEntity("ent-a", "FO", "sess-1");
    await client.releaseEntity(token, "done");
    const result = await client.getAvailableWork("FO");
    expect(result.map((e) => e.slug)).toContain("ent-a");
  });

  test("release('abort') also frees lease (AC-9)", async () => {
    const { client } = await makeClient();
    const token = await client.acquireEntity("ent-a", "FO", "sess-1");
    await client.releaseEntity(token, "abort");
    const result = await client.getAvailableWork("FO");
    expect(result.map((e) => e.slug)).toContain("ent-a");
  });

  test("releaseEntity with unknown token throws LeaseNotFound (O-2)", async () => {
    const { client } = await makeClient();
    const fakeToken = {
      token: "nonexistent",
      session_id: "s",
      entity_slug: "x",
      role: "FO" as const,
      acquired_at: nowMs,
      expires_at: nowMs + DURATION,
    };
    await expect(client.releaseEntity(fakeToken, "done")).rejects.toThrow(LeaseNotFound);
  });
});

describe("extendLease", () => {
  test("updates expiry (AC-4)", async () => {
    const { client } = await makeClient();
    const token = await client.acquireEntity("ent-a", "FO", "sess-1");
    nowMs += 10_000;
    await client.extendLease(token);
    // After extend, entity should remain leased
    const result = await client.getAvailableWork("FO");
    expect(result.map((e) => e.slug)).not.toContain("ent-a");
  });

  test("throws LeaseExpired on expired lease (O-2)", async () => {
    const { client } = await makeClient();
    const token = await client.acquireEntity("ent-a", "FO", "sess-1");
    nowMs += DURATION + 1;
    await expect(client.extendLease(token)).rejects.toThrow(LeaseExpired);
  });
});
