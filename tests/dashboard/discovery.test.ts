import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { IGNORED_DIRS, discoverWorkflows, aggregateWorkflow } from "../../tools/dashboard/src/discovery";

describe("discoverWorkflows", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "discovery-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("finds workflow directories with commissioned-by: spacedock@ prefix", () => {
    const wfDir = join(tmpDir, "docs", "build-pipeline");
    mkdirSync(wfDir, { recursive: true });
    writeFileSync(join(wfDir, "README.md"), "---\ncommissioned-by: spacedock@v1\nentity-type: feature\n---\n\nWorkflow\n");
    const workflows = discoverWorkflows(tmpDir);
    expect(workflows.length).toBe(1);
    expect(workflows[0].dir).toBe(wfDir);
    expect(workflows[0].commissioned_by).toBe("spacedock@v1");
  });

  test("ignores directories without spacedock@ prefix", () => {
    const dir = join(tmpDir, "other");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "README.md"), "---\ncommissioned-by: other-tool\n---\n");
    const workflows = discoverWorkflows(tmpDir);
    expect(workflows.length).toBe(0);
  });

  test("skips IGNORED_DIRS", () => {
    const gitDir = join(tmpDir, ".git", "hooks");
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(join(tmpDir, ".git", "README.md"), "---\ncommissioned-by: spacedock@v1\n---\n");
    const nmDir = join(tmpDir, "node_modules", "pkg");
    mkdirSync(nmDir, { recursive: true });
    writeFileSync(join(tmpDir, "node_modules", "README.md"), "---\ncommissioned-by: spacedock@v1\n---\n");
    const workflows = discoverWorkflows(tmpDir);
    expect(workflows.length).toBe(0);
  });

  test("finds multiple workflows in nested directories", () => {
    const wf1 = join(tmpDir, "a", "pipeline");
    const wf2 = join(tmpDir, "b", "pipeline");
    mkdirSync(wf1, { recursive: true });
    mkdirSync(wf2, { recursive: true });
    writeFileSync(join(wf1, "README.md"), "---\ncommissioned-by: spacedock@v1\n---\n");
    writeFileSync(join(wf2, "README.md"), "---\ncommissioned-by: spacedock@v2\n---\n");
    const workflows = discoverWorkflows(tmpDir);
    expect(workflows.length).toBe(2);
  });

  test("IGNORED_DIRS contains expected entries", () => {
    expect(IGNORED_DIRS.has(".git")).toBe(true);
    expect(IGNORED_DIRS.has(".worktrees")).toBe(true);
    expect(IGNORED_DIRS.has("node_modules")).toBe(true);
    expect(IGNORED_DIRS.has("__pycache__")).toBe(true);
  });
});

describe("aggregateWorkflow", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aggregate-test-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("aggregates workflow with stages and entity counts", () => {
    writeFileSync(join(tmpDir, "README.md"), [
      "---",
      "commissioned-by: spacedock@v1",
      "entity-type: feature",
      "entity-label: features",
      "stages:",
      "  defaults:",
      "    worktree: false",
      "  states:",
      "    - name: plan",
      "    - name: execute",
      "---",
      "",
      "Workflow body",
    ].join("\n"));
    writeFileSync(join(tmpDir, "feat-a.md"), "---\nid: 001\nstatus: plan\ntitle: A\n---\n");
    writeFileSync(join(tmpDir, "feat-b.md"), "---\nid: 002\nstatus: execute\ntitle: B\n---\n");
    writeFileSync(join(tmpDir, "feat-c.md"), "---\nid: 003\nstatus: plan\ntitle: C\n---\n");

    const result = aggregateWorkflow(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.name).toBe(tmpDir.split("/").pop());
    expect(result!.entity_type).toBe("feature");
    expect(result!.entity_label).toBe("features");
    expect(result!.stages.length).toBe(2);
    expect(result!.entities.length).toBe(3);
    expect(result!.entity_count_by_stage).toEqual({ plan: 2, execute: 1 });
  });

  test("returns null when no README.md", () => {
    const result = aggregateWorkflow(join(tmpDir, "nonexistent"));
    expect(result).toBeNull();
  });
});
