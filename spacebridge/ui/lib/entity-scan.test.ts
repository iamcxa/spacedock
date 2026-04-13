// ABOUTME: Tests for entity-scan.ts — scanEntitiesForRepo with fixture dir.
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanEntitiesForRepo } from "./entity-scan";

const TMP = join(tmpdir(), `entity-scan-test-${Date.now()}`);
const PIPELINE_DIR = join(TMP, "docs", "build-pipeline");

beforeAll(() => {
  mkdirSync(PIPELINE_DIR, { recursive: true });

  writeFileSync(join(PIPELINE_DIR, "entity-001.md"), [
    "---",
    "id: 001",
    "title: First Entity",
    "status: execute",
    "---",
    "## Body",
    "content here",
  ].join("\n"));

  writeFileSync(join(PIPELINE_DIR, "entity-002.md"), [
    "---",
    "id: 002",
    "title: Second Entity",
    "status: shipped",
    "---",
    "## Body",
    "more content",
  ].join("\n"));

  // malformed: no closing ---
  writeFileSync(join(PIPELINE_DIR, "malformed.md"), [
    "---",
    "id: bad",
    "title: Malformed",
    "no closing delimiter",
  ].join("\n"));
});

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("scanEntitiesForRepo", () => {
  test("returns cards for valid entity files", async () => {
    const cards = await scanEntitiesForRepo(TMP, "test-repo");
    expect(cards.length).toBe(2);
    const slugs = cards.map((c) => c.slug).sort();
    expect(slugs).toContain("entity-001");
    expect(slugs).toContain("entity-002");
  });

  test("entity card has expected fields", async () => {
    const cards = await scanEntitiesForRepo(TMP, "test-repo");
    const first = cards.find((c) => c.slug === "entity-001");
    expect(first).toBeDefined();
    expect(first!.title).toBe("First Entity");
    expect(first!.status).toBe("execute");
    expect(first!.repoLabel).toBe("test-repo");
  });

  test("malformed entity is skipped, no throw", async () => {
    const cards = await scanEntitiesForRepo(TMP, "test-repo");
    const malformed = cards.find((c) => c.slug === "malformed");
    expect(malformed).toBeUndefined();
    expect(cards.length).toBe(2);
  });

  test("non-existent project root returns empty array", async () => {
    const cards = await scanEntitiesForRepo("/no/such/path/xyz", "missing-repo");
    expect(cards).toEqual([]);
  });
});
