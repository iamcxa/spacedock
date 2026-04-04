import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getEntityDetail, updateScore, updateTags, filterEntities } from "../../tools/dashboard/src/api";
import * as telemetry from "../../tools/dashboard/src/telemetry";

const sampleEntity = [
  "---",
  "id: 001",
  "title: Test Feature",
  "status: execute",
  "score: 0.85",
  "tags: urgent,backend",
  "---",
  "",
  "Body content.",
  "",
  "## Stage Report: explore",
  "",
  "- [x] Found all files",
  "  10 files identified",
  "",
  "### Summary",
  "",
  "Exploration done.",
].join("\n");

describe("getEntityDetail", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "api-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("reads entity with frontmatter, tags, body, and stage reports", () => {
    const filepath = join(tmpDir, "test.md");
    writeFileSync(filepath, sampleEntity);
    const detail = getEntityDetail(filepath);
    expect(detail.frontmatter.id).toBe("001");
    expect(detail.frontmatter.title).toBe("Test Feature");
    expect(detail.tags).toEqual(["urgent", "backend"]);
    expect(detail.body).toContain("Body content.");
    expect(detail.stage_reports.length).toBe(1);
    expect(detail.stage_reports[0].stage).toBe("explore");
    expect(detail.filepath).toBe(filepath);
  });
});

describe("updateScore", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "api-score-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("updates score in file", () => {
    const filepath = join(tmpDir, "test.md");
    writeFileSync(filepath, "---\nid: 001\nscore: 0.5\n---\n\nBody\n");
    updateScore(filepath, 0.95);
    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("score: 0.95");
    expect(content).toContain("id: 001");
  });
});

describe("updateTags", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "api-tags-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("updates tags in file", () => {
    const filepath = join(tmpDir, "test.md");
    writeFileSync(filepath, "---\nid: 001\ntags: old\n---\n\nBody\n");
    updateTags(filepath, ["urgent", "triage"]);
    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("tags: urgent,triage");
  });
});

describe("filterEntities", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "api-filter-"));
    writeFileSync(join(tmpDir, "README.md"), "---\ntitle: Readme\n---\n");
    writeFileSync(join(tmpDir, "a.md"), "---\nid: 001\nstatus: plan\nscore: 0.8\ntags: urgent,backend\n---\n\nBody A\n");
    writeFileSync(join(tmpDir, "b.md"), "---\nid: 002\nstatus: execute\nscore: 0.3\ntags: frontend\n---\n\nBody B\n");
    writeFileSync(join(tmpDir, "c.md"), "---\nid: 003\nstatus: plan\nscore: 0.95\ntags: urgent\n---\n\nBody C\n");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns all entities with no filters", () => {
    const results = filterEntities(tmpDir, {});
    expect(results.length).toBe(3);
  });

  test("filters by status", () => {
    const results = filterEntities(tmpDir, { status: "plan" });
    expect(results.length).toBe(2);
    expect(results.every((e) => e.frontmatter.status === "plan")).toBe(true);
  });

  test("filters by tag", () => {
    const results = filterEntities(tmpDir, { tag: "urgent" });
    expect(results.length).toBe(2);
  });

  test("filters by min_score and max_score", () => {
    const results = filterEntities(tmpDir, { min_score: 0.5, max_score: 0.9 });
    expect(results.length).toBe(1);
    expect(results[0].frontmatter.id).toBe("001");
  });

  test("AND-combines multiple filters", () => {
    const results = filterEntities(tmpDir, { status: "plan", tag: "urgent", min_score: 0.9 });
    expect(results.length).toBe(1);
    expect(results[0].frontmatter.id).toBe("003");
  });
});

describe("API Telemetry Events", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "api-tel-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("updateScore emits score_updated event", () => {
    const filepath = join(tmpDir, "test-entity.md");
    writeFileSync(filepath, "---\ntitle: Test Entity\nscore: 0.5\ntags:\n---\n\nBody text.\n");
    const spy = spyOn(telemetry, "captureEvent");
    try {
      updateScore(filepath, 0.9);
      expect(spy).toHaveBeenCalledWith("score_updated", {
        slug: "test-entity",
        new_score: 0.9,
      });
    } finally {
      spy.mockRestore();
    }
  });

  test("updateTags emits tags_updated event", () => {
    const filepath = join(tmpDir, "test-entity.md");
    writeFileSync(filepath, "---\ntitle: Test Entity\nscore: 0.5\ntags:\n---\n\nBody text.\n");
    const spy = spyOn(telemetry, "captureEvent");
    try {
      updateTags(filepath, ["urgent", "backend"]);
      expect(spy).toHaveBeenCalledWith("tags_updated", {
        slug: "test-entity",
        tag_count: 2,
      });
    } finally {
      spy.mockRestore();
    }
  });
});
