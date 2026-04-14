// spacebridge/src/ipc/coordination-client-stub.test.ts
// ABOUTME: Tests for the CoordinationClient stub (noop placeholder until entity 056).

import { describe, expect, test } from "bun:test";
import { createCoordinationClientStub } from "./coordination-client-stub";

describe("CoordinationClientStub", () => {
  test("getAvailableWork returns empty array", async () => {
    const stub = createCoordinationClientStub();
    const result = await stub.getAvailableWork("FO");
    expect(result).toEqual([]);
  });

  test("getAvailableWork does not throw for any role", async () => {
    const stub = createCoordinationClientStub();
    for (const role of ["SO", "FO", "QO"] as const) {
      const r = await stub.getAvailableWork(role);
      expect(Array.isArray(r)).toBe(true);
    }
  });

  test("acquireEntity returns a stub LeaseToken with expected shape", async () => {
    const stub = createCoordinationClientStub();
    const token = await stub.acquireEntity("some-entity", "FO", "session-123");
    expect(token.session_id).toBe("session-123");
    expect(token.entity_slug).toBe("some-entity");
    expect(token.role).toBe("FO");
    expect(token.token.startsWith("stub-")).toBe(true);
    expect(typeof token.acquired_at).toBe("number");
    expect(typeof token.expires_at).toBe("number");
    expect(token.expires_at).toBeGreaterThan(token.acquired_at);
  });

  test("releaseEntity is noop and does not throw", async () => {
    const stub = createCoordinationClientStub();
    const token = await stub.acquireEntity("entity", "SO", "sess");
    await expect(stub.releaseEntity(token, "done")).resolves.toBeUndefined();
    await expect(stub.releaseEntity(token, "abort")).resolves.toBeUndefined();
  });

  test("extendLease is noop and does not throw", async () => {
    const stub = createCoordinationClientStub();
    const token = await stub.acquireEntity("entity", "QO", "sess");
    await expect(stub.extendLease(token)).resolves.toBeUndefined();
  });
});
