import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseFrontmatter, parseStagesBlock, scanEntities } from "../../tools/dashboard/src/parsing";

describe("parseFrontmatter", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "parse-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("extracts flat key:value fields", () => {
    const filepath = join(tmpDir, "test.md");
    writeFileSync(filepath, "---\nid: 001\ntitle: Test Entity\nstatus: execute\nscore: 0.85\n---\n\nBody text here.\n");
    const fields = parseFrontmatter(filepath);
    expect(fields).toEqual({
      id: "001",
      title: "Test Entity",
      status: "execute",
      score: "0.85",
    });
  });

  test("skips indented lines (nested YAML)", () => {
    const filepath = join(tmpDir, "nested.md");
    writeFileSync(filepath, "---\nid: 002\nstages:\n  defaults:\n    worktree: true\n---\n\nBody\n");
    const fields = parseFrontmatter(filepath);
    expect(fields.id).toBe("002");
    expect(fields.stages).toBe("");
    expect(fields["  defaults"]).toBeUndefined();
  });

  test("handles empty frontmatter", () => {
    const filepath = join(tmpDir, "empty.md");
    writeFileSync(filepath, "---\n---\n\nBody only.\n");
    const fields = parseFrontmatter(filepath);
    expect(fields).toEqual({});
  });

  test("handles colons in values", () => {
    const filepath = join(tmpDir, "colon.md");
    writeFileSync(filepath, "---\ntitle: A: B: C\nid: 1\n---\n");
    const fields = parseFrontmatter(filepath);
    expect(fields.title).toBe("A: B: C");
    expect(fields.id).toBe("1");
  });
});

describe("parseStagesBlock", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "stages-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("parses stages with defaults and states", () => {
    const filepath = join(tmpDir, "README.md");
    writeFileSync(filepath, [
      "---",
      "commissioned-by: spacedock@v1",
      "stages:",
      "  defaults:",
      "    worktree: true",
      "    concurrency: 3",
      "  states:",
      "    - name: plan",
      "      gate: true",
      "    - name: execute",
      "      concurrency: 1",
      "    - name: shipped",
      "      terminal: true",
      "---",
      "",
      "Body",
    ].join("\n"));
    const stages = parseStagesBlock(filepath);
    expect(stages).not.toBeNull();
    expect(stages!.length).toBe(3);
    expect(stages![0]).toEqual({
      name: "plan",
      worktree: true,
      concurrency: 3,
      gate: true,
      terminal: false,
      initial: false,
    });
    expect(stages![1]).toEqual({
      name: "execute",
      worktree: true,
      concurrency: 1,
      gate: false,
      terminal: false,
      initial: false,
    });
    expect(stages![2]).toEqual({
      name: "shipped",
      worktree: true,
      concurrency: 3,
      gate: false,
      terminal: true,
      initial: false,
    });
  });

  test("returns null when no stages block", () => {
    const filepath = join(tmpDir, "README.md");
    writeFileSync(filepath, "---\nid: 001\ntitle: No stages\n---\n\nBody\n");
    const stages = parseStagesBlock(filepath);
    expect(stages).toBeNull();
  });

  test("returns null when stages block has no states", () => {
    const filepath = join(tmpDir, "README.md");
    writeFileSync(filepath, "---\nstages:\n  defaults:\n    worktree: true\n---\n\nBody\n");
    const stages = parseStagesBlock(filepath);
    expect(stages).toBeNull();
  });
});

describe("scanEntities", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "scan-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("scans .md files excluding README.md", () => {
    writeFileSync(join(tmpDir, "README.md"), "---\ntitle: Readme\n---\n");
    writeFileSync(join(tmpDir, "alpha.md"), "---\nid: 001\ntitle: Alpha\nstatus: plan\nscore: 0.8\n---\n\nBody\n");
    writeFileSync(join(tmpDir, "beta.md"), "---\nid: 002\ntitle: Beta\nstatus: execute\n---\n\nBody\n");
    const entities = scanEntities(tmpDir);
    expect(entities.length).toBe(2);
    expect(entities[0].slug).toBe("alpha");
    expect(entities[0].title).toBe("Alpha");
    expect(entities[0].status).toBe("plan");
    expect(entities[0].score).toBe("0.8");
    expect(entities[1].slug).toBe("beta");
    expect(entities[1].status).toBe("execute");
    expect(entities[1].score).toBe("");
  });
});
