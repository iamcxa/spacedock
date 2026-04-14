// ABOUTME: Integration tests for full token lifecycle across TokenManager + schema.
// Tests create→verify→list→revoke→verify pattern with :memory: DB.

import { describe, test, expect } from "bun:test";
import { createDb } from "../../db";
import { TokenManager } from "./token-manager";

function makeManager() {
  const db = createDb(":memory:");
  return new TokenManager(db);
}

describe("full token lifecycle", () => {
  test("create → verify → list → revoke → verify returns null", () => {
    const manager = makeManager();

    const tok = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    expect(tok.token).toHaveLength(48);
    expect(tok.entitySlug).toBe("alpha");

    const found = manager.verify(tok.token);
    expect(found).not.toBeNull();
    expect(found!.token).toBe(tok.token);

    const list1 = manager.list();
    expect(list1.some((t) => t.token === tok.token)).toBe(true);

    const revoked = manager.revoke(tok.token);
    expect(revoked).toBe(true);

    const afterRevoke = manager.verify(tok.token);
    expect(afterRevoke).toBeNull();

    const list2 = manager.list();
    expect(list2.some((t) => t.token === tok.token)).toBe(false);
  });
});

describe("expired token lifecycle", () => {
  test("create with 0ms TTL → verify returns null → list excludes it", () => {
    const manager = makeManager();

    const tok = manager.create({ entitySlug: "alpha", ttlMs: 0 });
    const found = manager.verify(tok.token);
    expect(found).toBeNull();

    const list = manager.list();
    expect(list.some((t) => t.token === tok.token)).toBe(false);
  });
});

describe("entity scope", () => {
  test("token created for alpha has entitySlug alpha — not beta", () => {
    const manager = makeManager();
    const tok = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const found = manager.verify(tok.token);
    expect(found!.entitySlug).toBe("alpha");
    expect(found!.entitySlug).not.toBe("beta");
  });
});

describe("multiple tokens per entity", () => {
  test("create 3 tokens → list returns 3 → revoke one → list returns 2", () => {
    const manager = makeManager();

    const t1 = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const t2 = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const t3 = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });

    const list1 = manager.list();
    expect(list1.length).toBe(3);

    manager.revoke(t2.token);

    const list2 = manager.list();
    expect(list2.length).toBe(2);
    expect(list2.some((t) => t.token === t1.token)).toBe(true);
    expect(list2.some((t) => t.token === t3.token)).toBe(true);
    expect(list2.some((t) => t.token === t2.token)).toBe(false);
  });
});

describe("cleanup", () => {
  test("cleanup() removes expired tokens and returns count", () => {
    const manager = makeManager();

    manager.create({ entitySlug: "alpha", ttlMs: 0 }); // expired
    manager.create({ entitySlug: "alpha", ttlMs: 0 }); // expired
    manager.create({ entitySlug: "beta", ttlMs: 3600_000 }); // valid

    const count = manager.cleanup();
    expect(count).toBe(2);

    const remaining = manager.list();
    expect(remaining.length).toBe(1);
    expect(remaining[0].entitySlug).toBe("beta");
  });
});

describe("rate limit test — 429 boundary (middleware unit)", () => {
  test("request 60 passes, request 61 blocked", async () => {
    // Test the rate limiter logic directly (imported from middleware)
    const { checkRateLimit, resetRateLimitMap, RATE_LIMIT_MAX } = await import(
      "../../../ui/middleware"
    );
    resetRateLimitMap();

    const token = "integration-test-token";
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(checkRateLimit(token)).toBe(true);
    }
    expect(checkRateLimit(token)).toBe(false);

    resetRateLimitMap();
  });
});
