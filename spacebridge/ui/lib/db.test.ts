// ABOUTME: Tests for db.ts — module shape validation.
// better-sqlite3 is unsupported in bun:test (bun issue #4290), so we only
// test that the module exports are correct and readonly is enforced via
// integration test in Next.js runtime (task-8 smoke test).
import { describe, expect, test } from "bun:test";

describe("db module", () => {
  test("openReadOnlyDb is exported as a function", async () => {
    const mod = await import("./db");
    expect(typeof mod.openReadOnlyDb).toBe("function");
  });

  test("SpacebridgeReadDb type export exists (module loads without error)", async () => {
    const mod = await import("./db");
    expect(mod).toBeDefined();
  });

});
