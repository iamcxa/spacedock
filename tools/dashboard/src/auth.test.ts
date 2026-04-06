import { describe, test, expect, beforeEach } from "bun:test";
import { ShareRegistry } from "./auth";

let registry: ShareRegistry;

beforeEach(() => {
  registry = new ShareRegistry();
});

describe("ShareRegistry.create", () => {
  test("creates a share link with hashed password and returns token", async () => {
    const link = await registry.create({
      password: "reviewer-pass-123",
      entityPaths: ["/path/to/entity.md"],
      stages: [],
      label: "Test Link",
      ttlHours: 24,
    });
    expect(link.token).toBeTruthy();
    expect(link.token.length).toBeGreaterThan(16);
    expect(link.passwordHash).not.toBe("reviewer-pass-123");
    expect(link.passwordHash).toContain("$argon2");
    expect(link.entityPaths).toEqual(["/path/to/entity.md"]);
    expect(link.stages).toEqual([]);
    expect(link.label).toBe("Test Link");
    expect(new Date(link.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test("generates unique tokens for each link", async () => {
    const link1 = await registry.create({
      password: "pass1",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Link 1",
      ttlHours: 24,
    });
    const link2 = await registry.create({
      password: "pass2",
      entityPaths: ["/b.md"],
      stages: [],
      label: "Link 2",
      ttlHours: 24,
    });
    expect(link1.token).not.toBe(link2.token);
  });
});

describe("ShareRegistry.verify", () => {
  test("returns true for correct password on valid link", async () => {
    const link = await registry.create({
      password: "correct-password",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Test",
      ttlHours: 24,
    });
    const result = await registry.verify(link.token, "correct-password");
    expect(result).toBe(true);
  });

  test("returns false for wrong password", async () => {
    const link = await registry.create({
      password: "correct-password",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Test",
      ttlHours: 24,
    });
    const result = await registry.verify(link.token, "wrong-password");
    expect(result).toBe(false);
  });

  test("returns false for non-existent token", async () => {
    const result = await registry.verify("nonexistent-token", "any-pass");
    expect(result).toBe(false);
  });

  test("returns false for expired link", async () => {
    const link = await registry.create({
      password: "pass",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Expired",
      ttlHours: 0,
    });
    // Force expiry by setting expiresAt to the past
    const stored = registry.get(link.token)!;
    stored.expiresAt = new Date(Date.now() - 1000).toISOString();
    const result = await registry.verify(link.token, "pass");
    expect(result).toBe(false);
  });
});

describe("ShareRegistry.get", () => {
  test("returns link for valid token", async () => {
    const link = await registry.create({
      password: "pass",
      entityPaths: ["/a.md"],
      stages: ["explore"],
      label: "My Link",
      ttlHours: 12,
    });
    const found = registry.get(link.token);
    expect(found).not.toBeNull();
    expect(found!.entityPaths).toEqual(["/a.md"]);
    expect(found!.stages).toEqual(["explore"]);
  });

  test("returns null for expired link and auto-cleans", async () => {
    const link = await registry.create({
      password: "pass",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Expired",
      ttlHours: 0,
    });
    const stored = registry.get(link.token)!;
    stored.expiresAt = new Date(Date.now() - 1000).toISOString();
    const found = registry.get(link.token);
    expect(found).toBeNull();
  });

  test("returns null for unknown token", () => {
    const found = registry.get("nonexistent");
    expect(found).toBeNull();
  });
});

describe("ShareRegistry.list", () => {
  test("returns all non-expired links", async () => {
    await registry.create({
      password: "p1",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Link A",
      ttlHours: 24,
    });
    await registry.create({
      password: "p2",
      entityPaths: ["/b.md"],
      stages: [],
      label: "Link B",
      ttlHours: 24,
    });
    const all = registry.list();
    expect(all.length).toBe(2);
  });

  test("excludes expired links from list", async () => {
    const link = await registry.create({
      password: "p",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Expired",
      ttlHours: 1,
    });
    // Force expiry via direct Map access
    const stored = registry["links"].get(link.token)!;
    stored.expiresAt = new Date(Date.now() - 1000).toISOString();
    const all = registry.list();
    expect(all.length).toBe(0);
  });
});

describe("ShareRegistry.delete", () => {
  test("removes a link by token", async () => {
    const link = await registry.create({
      password: "p",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Deletable",
      ttlHours: 24,
    });
    const deleted = registry.delete(link.token);
    expect(deleted).toBe(true);
    expect(registry.get(link.token)).toBeNull();
  });

  test("returns false for unknown token", () => {
    expect(registry.delete("nonexistent")).toBe(false);
  });
});

describe("ShareRegistry.isInScope", () => {
  test("returns true when entity path is in scope", async () => {
    const link = await registry.create({
      password: "p",
      entityPaths: ["/a.md", "/b.md"],
      stages: [],
      label: "Scoped",
      ttlHours: 24,
    });
    expect(registry.isInScope(link.token, "/a.md")).toBe(true);
    expect(registry.isInScope(link.token, "/b.md")).toBe(true);
  });

  test("returns false when entity path is not in scope", async () => {
    const link = await registry.create({
      password: "p",
      entityPaths: ["/a.md"],
      stages: [],
      label: "Scoped",
      ttlHours: 24,
    });
    expect(registry.isInScope(link.token, "/c.md")).toBe(false);
  });

  test("returns false for unknown token", () => {
    expect(registry.isInScope("unknown", "/a.md")).toBe(false);
  });
});
