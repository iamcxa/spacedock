// ABOUTME: Unit tests for TokenManager — bearer-token CRUD with lazy expiry cleanup.

import { describe, test, expect } from "bun:test";
import { createDb } from "../../db";
import { TokenManager } from "./token-manager";

function makeManager() {
  const db = createDb(":memory:");
  return { db, manager: new TokenManager(db) };
}

describe("TokenManager.create", () => {
  test("returns a ShareToken with correct entitySlug and expiry", () => {
    const { manager } = makeManager();
    const before = Date.now();
    const tok = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const after = Date.now();

    expect(tok.entitySlug).toBe("alpha");
    expect(tok.token).toHaveLength(48);
    expect(tok.createdAt).toBeGreaterThanOrEqual(before);
    expect(tok.createdAt).toBeLessThanOrEqual(after);
    expect(tok.expiresAt).toBeGreaterThan(tok.createdAt);
    expect(tok.expiresAt - tok.createdAt).toBeCloseTo(3600_000, -2);
  });

  test("token is 48-char hex (192-bit entropy)", () => {
    const { manager } = makeManager();
    const tok = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    expect(tok.token).toMatch(/^[0-9a-f]{48}$/);
  });

  test("multiple creates produce unique tokens", () => {
    const { manager } = makeManager();
    const t1 = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const t2 = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    expect(t1.token).not.toBe(t2.token);
  });
});

describe("TokenManager.verify", () => {
  test("returns token for valid, non-expired token", () => {
    const { manager } = makeManager();
    const created = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const found = manager.verify(created.token);
    expect(found).not.toBeNull();
    expect(found!.entitySlug).toBe("alpha");
    expect(found!.token).toBe(created.token);
  });

  test("returns null for expired token (0ms TTL) and lazy-deletes it", () => {
    const { manager } = makeManager();
    const created = manager.create({ entitySlug: "alpha", ttlMs: 0 });
    // Token expiresAt == createdAt, so it is already expired
    const found = manager.verify(created.token);
    expect(found).toBeNull();
    // Verify lazy delete: second verify also returns null (row is gone)
    const found2 = manager.verify(created.token);
    expect(found2).toBeNull();
    // Revoke should return false (row was already deleted by lazy cleanup)
    const revoked = manager.revoke(created.token);
    expect(revoked).toBe(false);
  });

  test("returns null for nonexistent token", () => {
    const { manager } = makeManager();
    const found = manager.verify("nonexistent-token-000000000000000000000000000");
    expect(found).toBeNull();
  });
});

describe("TokenManager.revoke", () => {
  test("returns true when token existed and is deleted", () => {
    const { manager } = makeManager();
    const created = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const result = manager.revoke(created.token);
    expect(result).toBe(true);
  });

  test("returns false when token does not exist", () => {
    const { manager } = makeManager();
    const result = manager.revoke("does-not-exist-000000000000000000000000000000");
    expect(result).toBe(false);
  });

  test("verify returns null after revoke", () => {
    const { manager } = makeManager();
    const created = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    manager.revoke(created.token);
    expect(manager.verify(created.token)).toBeNull();
  });
});

describe("TokenManager.list", () => {
  test("excludes expired tokens", () => {
    const { manager } = makeManager();
    manager.create({ entitySlug: "alpha", ttlMs: 0 }); // expired
    const valid = manager.create({ entitySlug: "beta", ttlMs: 3600_000 });
    const tokens = manager.list();
    expect(tokens.some((t) => t.token === valid.token)).toBe(true);
    expect(tokens.every((t) => t.expiresAt > Date.now())).toBe(true);
  });

  test("returns all valid tokens", () => {
    const { manager } = makeManager();
    manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    manager.create({ entitySlug: "beta", ttlMs: 3600_000 });
    const tokens = manager.list();
    expect(tokens.length).toBe(2);
  });
});

describe("entity scope isolation", () => {
  test("token created for alpha has entitySlug alpha", () => {
    const { manager } = makeManager();
    const tok = manager.create({ entitySlug: "alpha", ttlMs: 3600_000 });
    const found = manager.verify(tok.token);
    expect(found!.entitySlug).toBe("alpha");
    expect(found!.entitySlug).not.toBe("beta");
  });
});
