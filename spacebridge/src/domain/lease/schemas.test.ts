// spacebridge/src/domain/lease/schemas.test.ts
// ABOUTME: Minimal smoke tests for Zod lease command/event schemas.

import { describe, expect, test } from "bun:test";
import { parseCommand, parseEvent } from "./schemas";

describe("parseCommand", () => {
  test("accepts valid acquire command", () => {
    const cmd = parseCommand({
      type: "acquire",
      entitySlug: "my-entity",
      role: "FO",
      sessionId: "sess-1",
      leaseDurationMs: 300_000,
    });
    expect(cmd.type).toBe("acquire");
  });

  test("rejects empty object", () => {
    expect(() => parseCommand({})).toThrow();
  });

  test("rejects unknown role", () => {
    expect(() =>
      parseCommand({
        type: "acquire",
        entitySlug: "x",
        role: "UNKNOWN",
        sessionId: "s",
        leaseDurationMs: 1000,
      }),
    ).toThrow();
  });

  test("accepts valid release command", () => {
    const cmd = parseCommand({ type: "release", token: "tok", outcome: "done" });
    expect(cmd.type).toBe("release");
  });

  test("accepts valid extend command", () => {
    const cmd = parseCommand({ type: "extend", token: "tok", leaseDurationMs: 5000 });
    expect(cmd.type).toBe("extend");
  });

  test("accepts valid expire command", () => {
    const cmd = parseCommand({ type: "expire", token: "tok", now: Date.now() });
    expect(cmd.type).toBe("expire");
  });
});

describe("parseEvent", () => {
  test("accepts valid acquired event", () => {
    const now = Date.now();
    const ev = parseEvent({
      type: "acquired",
      token: "tok",
      entitySlug: "ent",
      role: "SO",
      sessionId: "sess",
      acquiredAt: now,
      expiresAt: now + 300_000,
    });
    expect(ev.type).toBe("acquired");
  });

  test("rejects empty object", () => {
    expect(() => parseEvent({})).toThrow();
  });
});

describe("error classes", () => {
  test("LeaseConflict is instanceof Error with correct name", async () => {
    const { LeaseConflict } = await import("./errors");
    const e = new LeaseConflict("ent", "FO", "tok");
    expect(e instanceof Error).toBe(true);
    expect(e.name).toBe("LeaseConflict");
  });

  test("LeaseNotFound is instanceof Error with correct name", async () => {
    const { LeaseNotFound } = await import("./errors");
    const e = new LeaseNotFound("tok");
    expect(e instanceof Error).toBe(true);
    expect(e.name).toBe("LeaseNotFound");
  });

  test("LeaseExpired is instanceof Error with correct name", async () => {
    const { LeaseExpired } = await import("./errors");
    const e = new LeaseExpired("tok", Date.now());
    expect(e instanceof Error).toBe(true);
    expect(e.name).toBe("LeaseExpired");
  });
});
