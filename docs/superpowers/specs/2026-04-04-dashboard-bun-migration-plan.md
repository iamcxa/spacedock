# Dashboard Bun Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the dashboard server from Python (http.server + stdlib) to Bun (Bun.serve + TypeScript), preserving all existing functionality while enabling WebSocket and npm-based observability for future features.

**Architecture:** Bottom-up port of 6 Python modules into 5 TypeScript modules under `tools/dashboard/src/`. Each module is ported test-first: write `bun:test` tests mirroring the Python tests, then implement the TypeScript module. The Bun server uses the modern `routes` object in `Bun.serve()` with per-method handlers. Static files are served via `Bun.file()` (auto MIME detection). After all modules pass, `ctl.sh` is updated to launch `bun run` instead of `python3 -m`, and Python files are deleted.

**Tech Stack:** Bun 1.3.9, TypeScript, `bun:test` (Jest-compatible), `node:fs`, `node:path`, `node:util`

**Research corrections incorporated:**
1. Use `routes` object in `Bun.serve()` for HTTP routing (modern pattern, not the older fetch-only handler)
2. `Bun.file()` auto-detects MIME types -- no need to port Python's `MIME_TYPES` dict
3. Manual recursive walk for `discoverWorkflows()` (NOT `fs.readdirSync({recursive})`) to preserve `IGNORED_DIRS` pruning
4. Path traversal guard: use `fs.realpathSync()` (NOT `Bun.resolveSync()` which is for module resolution)
5. Query string parsing: `new URL(req.url).searchParams` (standard Web API, not Bun-specific)
6. WebSocket + routes works in Bun 1.3.9 (types fixed in @types/bun >= 1.2.6)
7. `bun test` is Jest-compatible -- import from `bun:test`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `tools/dashboard/src/parsing.ts` | Frontmatter parsing, stages block parsing, entity scanning |
| Create | `tools/dashboard/src/discovery.ts` | Recursive workflow discovery, workflow aggregation |
| Create | `tools/dashboard/src/frontmatter-io.ts` | Frontmatter read/write, entity parsing, stage report extraction |
| Create | `tools/dashboard/src/api.ts` | Entity detail, score/tag updates, entity filtering |
| Create | `tools/dashboard/src/server.ts` | Bun.serve() with routes, static serving, CLI args, logging |
| Create | `tools/dashboard/src/types.ts` | Shared TypeScript interfaces for all modules |
| Create | `tests/dashboard/parsing.test.ts` | Tests for parsing.ts (8 tests from Python) |
| Create | `tests/dashboard/discovery.test.ts` | Tests for discovery.ts (6 tests from Python) |
| Create | `tests/dashboard/frontmatter-io.test.ts` | Tests for frontmatter-io.ts (12 tests from Python: frontmatter_io + detail_rendering) |
| Create | `tests/dashboard/api.test.ts` | Tests for api.ts (7 tests from Python) |
| Create | `tests/dashboard/server.test.ts` | Tests for server.ts (14 tests from Python handlers + serve) |
| Modify | `tools/dashboard/ctl.sh:152` | Change `python3 -m tools.dashboard.serve` to `bun run tools/dashboard/src/server.ts` |
| Delete | `tools/dashboard/parsing.py` | Replaced by src/parsing.ts |
| Delete | `tools/dashboard/discovery.py` | Replaced by src/discovery.ts |
| Delete | `tools/dashboard/frontmatter_io.py` | Replaced by src/frontmatter-io.ts |
| Delete | `tools/dashboard/api.py` | Replaced by src/api.ts |
| Delete | `tools/dashboard/handlers.py` | Replaced by src/server.ts |
| Delete | `tools/dashboard/serve.py` | Replaced by src/server.ts |
| Delete | `tools/dashboard/__init__.py` | No longer needed |
| Delete | `tools/dashboard/__main__.py` | No longer needed |
| Delete | `tests/test_dashboard_parsing.py` | Replaced by tests/dashboard/parsing.test.ts |
| Delete | `tests/test_dashboard_discovery.py` | Replaced by tests/dashboard/discovery.test.ts |
| Delete | `tests/test_frontmatter_io.py` | Replaced by tests/dashboard/frontmatter-io.test.ts |
| Delete | `tests/test_detail_rendering.py` | Merged into tests/dashboard/frontmatter-io.test.ts |
| Delete | `tests/test_api.py` | Replaced by tests/dashboard/api.test.ts |
| Delete | `tests/test_dashboard_handlers.py` | Replaced by tests/dashboard/server.test.ts |
| Unchanged | `tests/test_dashboard_ctl.py` | Updated to test Bun server instead of Python (ctl.sh tests are shell-level, should mostly work as-is) |
| Unchanged | `tools/dashboard/static/*` | All frontend files unchanged |

---

## Task 1: Shared Types and Project Setup

**Files:**
- Create: `tools/dashboard/src/types.ts`

Define the shared interfaces used across all modules. This task has no tests -- it's pure type definitions consumed by later tasks.

- [ ] **Step 1: Create the `src/` directory and `types.ts`**

  ```typescript
  // tools/dashboard/src/types.ts

  export interface FrontmatterFields {
    [key: string]: string;
  }

  export interface Stage {
    name: string;
    worktree: boolean;
    concurrency: number;
    gate: boolean;
    terminal: boolean;
    initial: boolean;
  }

  export interface Entity {
    slug: string;
    path: string;
    id: string;
    status: string;
    title: string;
    score: string;
    source: string;
    worktree: string;
    [key: string]: string;
  }

  export interface Workflow {
    dir: string;
    commissioned_by: string;
  }

  export interface WorkflowData {
    dir: string;
    name: string;
    commissioned_by: string;
    entity_type: string;
    entity_label: string;
    stages: Stage[];
    entities: Entity[];
    entity_count_by_stage: Record<string, number>;
  }

  export interface ParsedEntity {
    frontmatter: FrontmatterFields;
    tags: string[];
    body: string;
  }

  export interface StageReportItem {
    status: "done" | "skip" | "fail" | "pending";
    text: string;
    detail: string;
  }

  export interface StageReport {
    stage: string;
    items: StageReportItem[];
    summary: string;
  }

  export interface EntityDetail extends ParsedEntity {
    stage_reports: StageReport[];
    filepath: string;
    slug?: string;
  }

  export interface FilterOptions {
    status?: string | null;
    tag?: string | null;
    min_score?: number | null;
    max_score?: number | null;
  }
  ```

- [ ] **Step 2: Verify the file compiles**

  Run: `cd /Users/kent/Project/spacedock && bun build tools/dashboard/src/types.ts --no-bundle 2>&1 | head -5`

  Expected: No type errors.

- [ ] **Step 3: Commit**

  ```bash
  git add tools/dashboard/src/types.ts
  git commit -m "feat(dashboard): add shared TypeScript types for Bun migration"
  ```

---

## Task 2: parsing.ts -- Frontmatter and Entity Scanning

**Files:**
- Create: `tests/dashboard/parsing.test.ts`
- Create: `tools/dashboard/src/parsing.ts`
- Reference: `tools/dashboard/parsing.py` (Python source, 149 LOC)
- Reference: `tests/test_dashboard_parsing.py` (Python tests, 8 tests)

Port `parse_frontmatter()`, `parse_stages_block()`, and `scan_entities()`. This module has no internal dependencies (only uses `types.ts`).

- [ ] **Step 1: Write tests for `parseFrontmatter()`**

  Create `tests/dashboard/parsing.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/parsing.test.ts 2>&1`

  Expected: FAIL -- `parseFrontmatter` cannot be resolved.

- [ ] **Step 3: Implement `parseFrontmatter()` in `parsing.ts`**

  Create `tools/dashboard/src/parsing.ts`:

  ```typescript
  import { readFileSync } from "node:fs";
  import { join, basename, extname } from "node:path";
  import type { FrontmatterFields, Stage, Entity } from "./types";

  export function parseFrontmatter(filepath: string): FrontmatterFields {
    const text = readFileSync(filepath, "utf-8");
    const lines = text.split("\n");
    const fields: FrontmatterFields = {};
    let inFm = false;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      if (line === "---") {
        if (inFm) break;
        inFm = true;
        continue;
      }
      if (inFm && line.includes(":")) {
        if (line.length > 0 && line[0] !== " " && line[0] !== "\t") {
          const idx = line.indexOf(":");
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          fields[key] = val;
        }
      }
    }
    return fields;
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/parsing.test.ts 2>&1`

  Expected: 4 tests pass.

- [ ] **Step 5: Write tests for `parseStagesBlock()`**

  Append to `tests/dashboard/parsing.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 6: Implement `parseStagesBlock()` in `parsing.ts`**

  Append to `tools/dashboard/src/parsing.ts`:

  ```typescript
  export function parseStagesBlock(filepath: string): Stage[] | null {
    const text = readFileSync(filepath, "utf-8");
    const allLines = text.split("\n").map((l) => l.replace(/\r$/, ""));

    // Extract frontmatter lines
    const lines: string[] = [];
    let inFm = false;
    for (const line of allLines) {
      if (line === "---") {
        if (inFm) break;
        inFm = true;
        continue;
      }
      if (inFm) lines.push(line);
    }

    // Find stages: line
    let stagesStart: number | null = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trimEnd() === "stages:") {
        stagesStart = i;
        break;
      }
    }
    if (stagesStart === null) return null;

    const defaults: Record<string, string> = {};
    const states: Record<string, string>[] = [];
    let i = stagesStart + 1;
    let stagesIndent: number | null = null;

    while (i < lines.length) {
      const line = lines[i];
      const stripped = line.trimStart();
      if (!stripped) { i++; continue; }
      const indent = line.length - stripped.length;
      if (stagesIndent === null) {
        stagesIndent = indent;
      } else if (indent < stagesIndent) {
        break;
      }

      if (indent === stagesIndent) {
        if (stripped === "defaults:") {
          i++;
          while (i < lines.length) {
            const dline = lines[i];
            const dstripped = dline.trimStart();
            if (!dstripped) { i++; continue; }
            const dindent = dline.length - dstripped.length;
            if (dindent <= stagesIndent!) break;
            if (dstripped.includes(":")) {
              const idx = dstripped.indexOf(":");
              defaults[dstripped.slice(0, idx).trim()] = dstripped.slice(idx + 1).trim();
            }
            i++;
          }
          continue;
        } else if (stripped === "states:") {
          i++;
          let currentState: Record<string, string> | null = null;
          while (i < lines.length) {
            const sline = lines[i];
            const sstripped = sline.trimStart();
            if (!sstripped) { i++; continue; }
            const sindent = sline.length - sstripped.length;
            if (sindent <= stagesIndent!) break;
            if (sstripped.startsWith("- name:")) {
              const name = sstripped.slice("- name:".length).trim();
              currentState = { name };
              states.push(currentState);
            } else if (currentState !== null && sstripped.includes(":") && !sstripped.startsWith("- ")) {
              const idx = sstripped.indexOf(":");
              currentState[sstripped.slice(0, idx).trim()] = sstripped.slice(idx + 1).trim();
            }
            i++;
          }
          continue;
        }
      }
      i++;
    }

    if (states.length === 0) return null;

    const defaultWorktree = (defaults.worktree ?? "false").toLowerCase() === "true";
    const defaultConcurrency = parseInt(defaults.concurrency ?? "2", 10);

    return states.map((state) => ({
      name: state.name,
      worktree: (state.worktree ?? String(defaultWorktree)).toLowerCase() === "true",
      concurrency: parseInt(state.concurrency ?? String(defaultConcurrency), 10),
      gate: (state.gate ?? "false").toLowerCase() === "true",
      terminal: (state.terminal ?? "false").toLowerCase() === "true",
      initial: (state.initial ?? "false").toLowerCase() === "true",
    }));
  }
  ```

- [ ] **Step 7: Run tests to verify they pass**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/parsing.test.ts 2>&1`

  Expected: 7 tests pass.

- [ ] **Step 8: Write test for `scanEntities()`**

  Append to `tests/dashboard/parsing.test.ts`:

  ```typescript
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
      expect(entities[1].score).toBe("");  // missing field defaults to ""
    });
  });
  ```

- [ ] **Step 9: Implement `scanEntities()` in `parsing.ts`**

  Append to `tools/dashboard/src/parsing.ts`:

  ```typescript
  export function scanEntities(directory: string): Entity[] {
    const glob = new Bun.Glob("*.md");
    const files = Array.from(glob.scanSync({ cwd: directory })).sort();
    const entities: Entity[] = [];

    for (const filename of files) {
      if (filename === "README.md") continue;
      const filepath = join(directory, filename);
      const slug = filename.replace(/\.md$/, "");
      const fields = parseFrontmatter(filepath);
      const entity: Entity = {
        ...fields,
        slug,
        path: filepath,
        id: fields.id ?? "",
        status: fields.status ?? "",
        title: fields.title ?? "",
        score: fields.score ?? "",
        source: fields.source ?? "",
        worktree: fields.worktree ?? "",
      };
      entities.push(entity);
    }
    return entities;
  }
  ```

- [ ] **Step 10: Run all parsing tests**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/parsing.test.ts 2>&1`

  Expected: 8 tests pass.

- [ ] **Step 11: Commit**

  ```bash
  git add tools/dashboard/src/parsing.ts tests/dashboard/parsing.test.ts
  git commit -m "feat(dashboard): port parsing.py to TypeScript with tests"
  ```

---

## Task 3: discovery.ts -- Workflow Discovery

**Files:**
- Create: `tests/dashboard/discovery.test.ts`
- Create: `tools/dashboard/src/discovery.ts`
- Reference: `tools/dashboard/discovery.py` (Python source, 70 LOC)
- Reference: `tests/test_dashboard_discovery.py` (Python tests, 6 tests)

Port `discoverWorkflows()` and `aggregateWorkflow()`. Uses manual recursive walk (not `fs.readdirSync({recursive})`) to preserve `IGNORED_DIRS` pruning behavior from Python's `os.walk()`.

- [ ] **Step 1: Write tests for `discoverWorkflows()`**

  Create `tests/dashboard/discovery.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/discovery.test.ts 2>&1`

  Expected: FAIL -- module not found.

- [ ] **Step 3: Implement `discoverWorkflows()` with manual recursive walk**

  Create `tools/dashboard/src/discovery.ts`:

  ```typescript
  import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
  import { join, basename } from "node:path";
  import { parseFrontmatter, parseStagesBlock, scanEntities } from "./parsing";
  import type { Workflow, WorkflowData } from "./types";

  export const IGNORED_DIRS = new Set([
    ".git", ".worktrees", "node_modules", "vendor", "dist", "build", "__pycache__", "tests",
  ]);

  /**
   * Manual recursive walk that mimics Python os.walk() with dirnames pruning.
   * Does NOT use fs.readdirSync({recursive}) because that returns a flat list
   * with no ability to prune directories mid-walk.
   */
  function walkDir(
    dir: string,
    callback: (dirPath: string, filenames: string[]) => void
  ): void {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const subdirs: string[] = [];
    const filenames: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          subdirs.push(entry.name);
        }
      } else {
        filenames.push(entry.name);
      }
    }
    callback(dir, filenames);
    for (const sub of subdirs) {
      walkDir(join(dir, sub), callback);
    }
  }

  export function discoverWorkflows(root: string): Workflow[] {
    const workflows: Workflow[] = [];
    walkDir(root, (dirPath, filenames) => {
      if (!filenames.includes("README.md")) return;
      const readmePath = join(dirPath, "README.md");
      const fields = parseFrontmatter(readmePath);
      const commissionedBy = fields["commissioned-by"] ?? "";
      if (commissionedBy.startsWith("spacedock@")) {
        workflows.push({ dir: dirPath, commissioned_by: commissionedBy });
      }
    });
    return workflows;
  }

  export function aggregateWorkflow(workflowDir: string): WorkflowData | null {
    const readmePath = join(workflowDir, "README.md");
    if (!existsSync(readmePath)) return null;

    const fields = parseFrontmatter(readmePath);
    const stages = parseStagesBlock(readmePath) ?? [];
    const entities = scanEntities(workflowDir);

    const entityCountByStage: Record<string, number> = {};
    for (const e of entities) {
      const status = e.status;
      if (status) {
        entityCountByStage[status] = (entityCountByStage[status] ?? 0) + 1;
      }
    }

    return {
      dir: workflowDir,
      name: basename(workflowDir),
      commissioned_by: fields["commissioned-by"] ?? "",
      entity_type: fields["entity-type"] ?? "",
      entity_label: fields["entity-label"] ?? fields["entity-type"] ?? "entity",
      stages,
      entities,
      entity_count_by_stage: entityCountByStage,
    };
  }
  ```

- [ ] **Step 4: Write test for `aggregateWorkflow()`**

  Append to `tests/dashboard/discovery.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 5: Run all discovery tests**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/discovery.test.ts 2>&1`

  Expected: 6 tests pass (matches Python test count).

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/discovery.ts tests/dashboard/discovery.test.ts
  git commit -m "feat(dashboard): port discovery.py to TypeScript with tests"
  ```

---

## Task 4: frontmatter-io.ts -- Read/Write and Stage Reports

**Files:**
- Create: `tests/dashboard/frontmatter-io.test.ts`
- Create: `tools/dashboard/src/frontmatter-io.ts`
- Reference: `tools/dashboard/frontmatter_io.py` (Python source, 172 LOC)
- Reference: `tests/test_frontmatter_io.py` (8 tests) + `tests/test_detail_rendering.py` (4 tests)

Port all 7 functions from `frontmatter_io.py`. This module operates on strings (no file I/O) except `extractStageReports` which uses `splitFrontmatter` internally. Merges the Python `test_frontmatter_io.py` and `test_detail_rendering.py` test files since they test the same module.

- [ ] **Step 1: Write tests for `splitFrontmatter()` and `parseTags()`**

  Create `tests/dashboard/frontmatter-io.test.ts`:

  ```typescript
  import { describe, test, expect } from "bun:test";
  import {
    splitFrontmatter,
    parseTags,
    parseEntity,
    updateFrontmatterFields,
    updateEntityScore,
    updateEntityTags,
    extractStageReports,
  } from "../../tools/dashboard/src/frontmatter-io";

  describe("splitFrontmatter", () => {
    test("splits frontmatter and body", () => {
      const text = "---\nid: 001\ntitle: Test\n---\n\nBody content here.\n";
      const [fm, body] = splitFrontmatter(text);
      expect(fm).toEqual({ id: "001", title: "Test" });
      expect(body).toBe("\nBody content here.\n");
    });

    test("throws on missing frontmatter", () => {
      expect(() => splitFrontmatter("No frontmatter")).toThrow("Missing YAML frontmatter");
    });

    test("throws on unterminated frontmatter", () => {
      expect(() => splitFrontmatter("---\nid: 001\nno closing")).toThrow("Unterminated YAML frontmatter");
    });
  });

  describe("parseTags", () => {
    test("parses comma-separated tags", () => {
      expect(parseTags("urgent,triage,finance")).toEqual(["urgent", "triage", "finance"]);
    });

    test("handles empty and whitespace", () => {
      expect(parseTags("")).toEqual([]);
      expect(parseTags("  ")).toEqual([]);
    });

    test("trims whitespace around tags", () => {
      expect(parseTags(" a , b , c ")).toEqual(["a", "b", "c"]);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/frontmatter-io.test.ts 2>&1`

  Expected: FAIL -- module not found.

- [ ] **Step 3: Implement `splitFrontmatter()`, `parseTags()`, `parseEntity()` in `frontmatter-io.ts`**

  Create `tools/dashboard/src/frontmatter-io.ts`:

  ```typescript
  import type { FrontmatterFields, ParsedEntity, StageReport, StageReportItem } from "./types";

  export function splitFrontmatter(text: string): [FrontmatterFields, string] {
    const lines = text.split("\n");
    if (!lines.length || lines[0].trim() !== "---") {
      throw new Error("Missing YAML frontmatter");
    }
    let end: number | null = null;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        end = i;
        break;
      }
    }
    if (end === null) {
      throw new Error("Unterminated YAML frontmatter");
    }
    const fm: FrontmatterFields = {};
    for (const line of lines.slice(1, end)) {
      if (!line.includes(":")) continue;
      const idx = line.indexOf(":");
      fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    const body = lines.slice(end + 1).join("\n");
    return [fm, body];
  }

  export function parseTags(rawTags: string): string[] {
    if (!rawTags || !rawTags.trim()) return [];
    return rawTags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  export function parseEntity(text: string): ParsedEntity {
    const [fm, body] = splitFrontmatter(text);
    return {
      frontmatter: fm,
      tags: parseTags(fm.tags ?? ""),
      body,
    };
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/frontmatter-io.test.ts 2>&1`

  Expected: 6 tests pass.

- [ ] **Step 5: Write tests for `updateFrontmatterFields()`, `updateEntityScore()`, `updateEntityTags()`**

  Append to `tests/dashboard/frontmatter-io.test.ts`:

  ```typescript
  describe("updateFrontmatterFields", () => {
    test("updates existing fields in place", () => {
      const text = "---\nid: 001\nstatus: plan\nscore: 0.5\n---\n\nBody\n";
      const result = updateFrontmatterFields(text, { status: "execute", score: "0.9" });
      expect(result).toContain("status: execute");
      expect(result).toContain("score: 0.9");
      expect(result).toContain("id: 001");
      expect(result).toContain("\nBody\n");
    });

    test("adds new fields at end of frontmatter", () => {
      const text = "---\nid: 001\n---\n\nBody\n";
      const result = updateFrontmatterFields(text, { tags: "urgent" });
      expect(result).toContain("tags: urgent");
      expect(result).toContain("id: 001");
    });

    test("preserves field order", () => {
      const text = "---\nid: 001\ntitle: Test\nstatus: plan\n---\n\nBody\n";
      const result = updateFrontmatterFields(text, { title: "Updated" });
      const lines = result.split("\n");
      const idIdx = lines.indexOf("id: 001");
      const titleIdx = lines.indexOf("title: Updated");
      const statusIdx = lines.indexOf("status: plan");
      expect(idIdx).toBeLessThan(titleIdx);
      expect(titleIdx).toBeLessThan(statusIdx);
    });
  });

  describe("updateEntityScore", () => {
    test("updates score field", () => {
      const text = "---\nid: 001\nscore: 0.5\n---\n\nBody\n";
      const result = updateEntityScore(text, 0.95);
      expect(result).toContain("score: 0.95");
    });
  });

  describe("updateEntityTags", () => {
    test("updates tags as comma-separated string", () => {
      const text = "---\nid: 001\ntags: old\n---\n\nBody\n";
      const result = updateEntityTags(text, ["urgent", "triage", "finance"]);
      expect(result).toContain("tags: urgent,triage,finance");
    });
  });
  ```

- [ ] **Step 6: Implement `updateFrontmatterFields()`, `updateEntityScore()`, `updateEntityTags()`**

  Append to `tools/dashboard/src/frontmatter-io.ts`:

  ```typescript
  export function updateFrontmatterFields(text: string, updates: Record<string, string>): string {
    const lines = text.split("\n");
    if (!lines.length || lines[0].trim() !== "---") {
      throw new Error("Missing YAML frontmatter");
    }
    let end: number | null = null;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        end = i;
        break;
      }
    }
    if (end === null) {
      throw new Error("Unterminated YAML frontmatter");
    }
    const fmLines = lines.slice(1, end);
    const bodyLines = lines.slice(end + 1);
    const seen = new Set<string>();
    const out: string[] = [];

    for (const line of fmLines) {
      if (!line.includes(":")) {
        out.push(line);
        continue;
      }
      const idx = line.indexOf(":");
      const key = line.slice(0, idx).trim();
      if (key in updates) {
        out.push(`${key}: ${updates[key]}`);
        seen.add(key);
      } else {
        out.push(line);
      }
    }
    for (const [key, value] of Object.entries(updates)) {
      if (!seen.has(key)) {
        out.push(`${key}: ${value}`);
      }
    }
    return ["---", ...out, "---", ...bodyLines].join("\n");
  }

  export function updateEntityScore(text: string, newScore: number): string {
    return updateFrontmatterFields(text, { score: String(newScore) });
  }

  export function updateEntityTags(text: string, tags: string[]): string {
    const tagsStr = tags.map((t) => t.trim()).filter(Boolean).join(",");
    return updateFrontmatterFields(text, { tags: tagsStr });
  }
  ```

- [ ] **Step 7: Run tests to verify they pass**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/frontmatter-io.test.ts 2>&1`

  Expected: 11 tests pass.

- [ ] **Step 8: Write tests for `extractStageReports()`**

  Append to `tests/dashboard/frontmatter-io.test.ts`:

  ```typescript
  describe("extractStageReports", () => {
    const sampleText = [
      "---",
      "id: 001",
      "---",
      "",
      "Some body text.",
      "",
      "## Stage Report: explore",
      "",
      "- [x] File list grouped by layer",
      "  726 LOC across 6 modules",
      "- [ ] SKIP: Optional task",
      "  Not needed for this entity",
      "- [ ] FAIL: Broken step",
      "  Error details here",
      "- [ ] Pending item",
      "  Still waiting",
      "",
      "### Summary",
      "",
      "Exploration complete with full mapping.",
      "",
      "## Stage Report: research",
      "",
      "- [x] Claims verified",
      "  13 claims analyzed",
      "",
      "### Summary",
      "",
      "All claims verified.",
    ].join("\n");

    test("extracts multiple stage reports", () => {
      const reports = extractStageReports(sampleText);
      expect(reports.length).toBe(2);
      expect(reports[0].stage).toBe("explore");
      expect(reports[1].stage).toBe("research");
    });

    test("parses checklist item statuses correctly", () => {
      const reports = extractStageReports(sampleText);
      const items = reports[0].items;
      expect(items.length).toBe(4);
      expect(items[0].status).toBe("done");
      expect(items[0].text).toBe("File list grouped by layer");
      expect(items[0].detail).toBe("726 LOC across 6 modules");
      expect(items[1].status).toBe("skip");
      expect(items[2].status).toBe("fail");
      expect(items[3].status).toBe("pending");
    });

    test("extracts summary text", () => {
      const reports = extractStageReports(sampleText);
      expect(reports[0].summary).toBe("Exploration complete with full mapping.");
      expect(reports[1].summary).toBe("All claims verified.");
    });

    test("returns empty array when no stage reports", () => {
      const text = "---\nid: 001\n---\n\nJust body, no reports.\n";
      const reports = extractStageReports(text);
      expect(reports.length).toBe(0);
    });
  });
  ```

- [ ] **Step 9: Implement `extractStageReports()`**

  Append to `tools/dashboard/src/frontmatter-io.ts`:

  ```typescript
  export function extractStageReports(text: string): StageReport[] {
    const [, body] = splitFrontmatter(text);
    const reports: StageReport[] = [];
    const pattern = /^## Stage Report: (.+)$/m;
    const sections = body.split(pattern);

    // sections[0] is text before first report, then alternating: stage_name, section_body
    for (let i = 1; i < sections.length; i += 2) {
      const stageName = sections[i].trim();
      const sectionBody = i + 1 < sections.length ? sections[i + 1] : "";

      const items: StageReportItem[] = [];
      let summary = "";

      // Extract summary
      const summaryParts = sectionBody.split(/^### Summary\s*$/m);
      const checklistText = summaryParts[0];
      if (summaryParts.length > 1) {
        summary = summaryParts[1].trim();
      }

      // Parse checklist items
      const itemPattern = /^- \[(x| )\] ((?:SKIP: |FAIL: )?)(.+)$/;
      const lines = checklistText.split("\n");
      for (let j = 0; j < lines.length; j++) {
        const m = lines[j].match(itemPattern);
        if (m) {
          const [, checked, prefix, itemText] = m;
          let status: StageReportItem["status"];
          if (checked === "x") {
            status = "done";
          } else if (prefix.startsWith("SKIP")) {
            status = "skip";
          } else if (prefix.startsWith("FAIL")) {
            status = "fail";
          } else {
            status = "pending";
          }
          let detail = "";
          if (j + 1 < lines.length && lines[j + 1].startsWith("  ")) {
            detail = lines[j + 1].trim();
          }
          items.push({ status, text: itemText.trim(), detail });
        }
      }

      reports.push({ stage: stageName, items, summary });
    }
    return reports;
  }
  ```

- [ ] **Step 10: Run all frontmatter-io tests**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/frontmatter-io.test.ts 2>&1`

  Expected: 15 tests pass (8 from frontmatter_io + 4 from detail_rendering + 3 from parseTags).

- [ ] **Step 11: Commit**

  ```bash
  git add tools/dashboard/src/frontmatter-io.ts tests/dashboard/frontmatter-io.test.ts
  git commit -m "feat(dashboard): port frontmatter-io.py to TypeScript with tests"
  ```

---

## Task 5: api.ts -- Entity Detail and Management

**Files:**
- Create: `tests/dashboard/api.test.ts`
- Create: `tools/dashboard/src/api.ts`
- Reference: `tools/dashboard/api.py` (Python source, 104 LOC)
- Reference: `tests/test_api.py` (Python tests, 7 tests)

Port `getEntityDetail()`, `updateScore()`, `updateTags()`, and `filterEntities()`. Depends on `frontmatter-io.ts` and `parsing.ts`.

- [ ] **Step 1: Write tests for `getEntityDetail()`**

  Create `tests/dashboard/api.test.ts`:

  ```typescript
  import { describe, test, expect, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { getEntityDetail, updateScore, updateTags, filterEntities } from "../../tools/dashboard/src/api";

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
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/api.test.ts 2>&1`

  Expected: FAIL -- module not found.

- [ ] **Step 3: Implement `getEntityDetail()`, `updateScore()`, `updateTags()`**

  Create `tools/dashboard/src/api.ts`:

  ```typescript
  import { readFileSync, writeFileSync } from "node:fs";
  import { join, basename, extname } from "node:path";
  import {
    parseEntity,
    extractStageReports,
    updateEntityScore,
    updateEntityTags,
  } from "./frontmatter-io";
  import type { EntityDetail, FilterOptions } from "./types";

  export function getEntityDetail(filepath: string): EntityDetail {
    const text = readFileSync(filepath, "utf-8");
    const entity = parseEntity(text);
    return {
      ...entity,
      stage_reports: extractStageReports(text),
      filepath,
    };
  }

  export function updateScore(filepath: string, newScore: number): void {
    const text = readFileSync(filepath, "utf-8");
    const updated = updateEntityScore(text, newScore);
    writeFileSync(filepath, updated);
  }

  export function updateTags(filepath: string, tags: string[]): void {
    const text = readFileSync(filepath, "utf-8");
    const updated = updateEntityTags(text, tags);
    writeFileSync(filepath, updated);
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/api.test.ts 2>&1`

  Expected: 3 tests pass.

- [ ] **Step 5: Write tests for `filterEntities()`**

  Append to `tests/dashboard/api.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 6: Implement `filterEntities()`**

  Append to `tools/dashboard/src/api.ts`:

  ```typescript
  function scanEntitiesDetailed(directory: string): EntityDetail[] {
    const glob = new Bun.Glob("*.md");
    const files = Array.from(glob.scanSync({ cwd: directory })).sort();
    const entities: EntityDetail[] = [];

    for (const filename of files) {
      if (filename === "README.md") continue;
      const filepath = join(directory, filename);
      const text = readFileSync(filepath, "utf-8");
      const entity = parseEntity(text);
      entities.push({
        ...entity,
        stage_reports: extractStageReports(text),
        filepath,
        slug: filename.replace(/\.md$/, ""),
      });
    }
    return entities;
  }

  export function filterEntities(directory: string, filters: FilterOptions): EntityDetail[] {
    const entities = scanEntitiesDetailed(directory);
    return entities.filter((entity) => {
      const fm = entity.frontmatter;
      if (filters.status && fm.status !== filters.status) return false;
      if (filters.tag && !entity.tags.includes(filters.tag)) return false;
      if (filters.min_score != null) {
        const scoreStr = fm.score ?? "";
        if (!scoreStr) return false;
        const score = parseFloat(scoreStr);
        if (isNaN(score) || score < filters.min_score) return false;
      }
      if (filters.max_score != null) {
        const scoreStr = fm.score ?? "";
        if (!scoreStr) return false;
        const score = parseFloat(scoreStr);
        if (isNaN(score) || score > filters.max_score) return false;
      }
      return true;
    });
  }
  ```

- [ ] **Step 7: Run all api tests**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/api.test.ts 2>&1`

  Expected: 8 tests pass (7 from Python + 1 additional AND-combine test).

- [ ] **Step 8: Commit**

  ```bash
  git add tools/dashboard/src/api.ts tests/dashboard/api.test.ts
  git commit -m "feat(dashboard): port api.py to TypeScript with tests"
  ```

---

## Task 6: server.ts -- Bun.serve() with Routes, Static Serving, CLI

**Files:**
- Create: `tests/dashboard/server.test.ts`
- Create: `tools/dashboard/src/server.ts`
- Reference: `tools/dashboard/handlers.py` (Python source, 170 LOC)
- Reference: `tools/dashboard/serve.py` (Python source, 61 LOC)
- Reference: `tests/test_dashboard_handlers.py` (Python tests, 14 tests)

This is the largest task -- it replaces both `handlers.py` and `serve.py` with a single `server.ts` using `Bun.serve()` with the modern `routes` API. Key research findings applied:
- `routes` object for path matching (not the older `fetch` handler)
- `Bun.file()` for static serving with auto MIME detection
- `fs.realpathSync()` for path traversal guard (not `Bun.resolveSync()`)
- `new URL(req.url).searchParams` for query string parsing
- `util.parseArgs()` for CLI argument parsing
- `Bun.spawnSync()` for git toplevel resolution

- [ ] **Step 1: Write tests for API routes (GET /api/workflows, GET /api/entity/detail)**

  Create `tests/dashboard/server.test.ts`:

  ```typescript
  import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
  import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";

  /**
   * Helper: start a Bun dashboard server on a random port and return the base URL.
   * Uses Bun.spawn to run server.ts as a subprocess.
   */
  function startServer(
    projectRoot: string,
    opts: { port?: number; logFile?: string } = {}
  ): { proc: ReturnType<typeof Bun.spawn>; baseUrl: string; port: number } {
    const port = opts.port ?? 0;
    const args = [
      "bun", "run", join(import.meta.dir, "../../tools/dashboard/src/server.ts"),
      "--port", String(port),
      "--root", projectRoot,
    ];
    if (opts.logFile) {
      args.push("--log-file", opts.logFile);
    }
    const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
    return { proc, baseUrl: "", port }; // port resolved in beforeAll
  }

  // For testing, we import the createServer function directly and use it in-process
  // to avoid subprocess management complexity. This matches how Bun.serve() works.

  describe("Dashboard Server", () => {
    let tmpDir: string;
    let server: ReturnType<typeof import("../../tools/dashboard/src/server").createServer> extends Promise<infer T> ? T : never;
    let baseUrl: string;

    beforeAll(async () => {
      tmpDir = mkdtempSync(join(tmpdir(), "server-test-"));

      // Create a workflow structure
      const wfDir = join(tmpDir, "docs", "build-pipeline");
      mkdirSync(wfDir, { recursive: true });
      writeFileSync(join(wfDir, "README.md"), [
        "---",
        "commissioned-by: spacedock@v1",
        "entity-type: feature",
        "stages:",
        "  states:",
        "    - name: plan",
        "    - name: execute",
        "---",
        "",
        "Workflow",
      ].join("\n"));
      writeFileSync(join(wfDir, "feat-a.md"), "---\nid: 001\ntitle: Feature A\nstatus: plan\nscore: 0.8\ntags: urgent\n---\n\nBody A\n");
      writeFileSync(join(wfDir, "feat-b.md"), "---\nid: 002\ntitle: Feature B\nstatus: execute\nscore: 0.5\n---\n\nBody B\n");

      // Create static dir with test files
      const staticDir = join(tmpDir, "static");
      mkdirSync(staticDir);
      writeFileSync(join(staticDir, "index.html"), "<html><body>Dashboard</body></html>");
      writeFileSync(join(staticDir, "detail.html"), "<html><body>Detail</body></html>");
      writeFileSync(join(staticDir, "style.css"), "body { color: white; }");
      writeFileSync(join(staticDir, "app.js"), "console.log('app');");

      // Import and start server
      const { createServer } = await import("../../tools/dashboard/src/server");
      const srv = createServer({ port: 0, projectRoot: tmpDir, staticDir });
      baseUrl = `http://localhost:${srv.port}`;
      server = srv;
    });

    afterAll(() => {
      server?.stop();
      rmSync(tmpDir, { recursive: true, force: true });
    });

    test("GET /api/workflows returns workflow data", async () => {
      const res = await fetch(`${baseUrl}/api/workflows`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].name).toBe("build-pipeline");
      expect(data[0].entities.length).toBe(2);
    });

    test("GET /api/entity/detail returns entity detail", async () => {
      const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
      const res = await fetch(`${baseUrl}/api/entity/detail?path=${encodeURIComponent(filepath)}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.frontmatter.title).toBe("Feature A");
      expect(data.tags).toEqual(["urgent"]);
      expect(data.filepath).toBe(filepath);
    });

    test("GET /api/entity/detail returns 400 without path param", async () => {
      const res = await fetch(`${baseUrl}/api/entity/detail`);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("path required");
    });

    test("GET /api/entity/detail returns 403 for path traversal", async () => {
      const res = await fetch(`${baseUrl}/api/entity/detail?path=${encodeURIComponent("/etc/passwd")}`);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Forbidden");
    });

    test("GET /api/entities returns filtered entities", async () => {
      const dir = join(tmpDir, "docs", "build-pipeline");
      const res = await fetch(`${baseUrl}/api/entities?dir=${encodeURIComponent(dir)}&status=plan`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBe(1);
      expect(data[0].frontmatter.title).toBe("Feature A");
    });

    test("POST /api/entity/score updates score", async () => {
      const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
      const res = await fetch(`${baseUrl}/api/entity/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filepath, score: 0.99 }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      const content = readFileSync(filepath, "utf-8");
      expect(content).toContain("score: 0.99");
    });

    test("POST /api/entity/tags updates tags", async () => {
      const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
      const res = await fetch(`${baseUrl}/api/entity/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filepath, tags: ["critical", "backend"] }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      const content = readFileSync(filepath, "utf-8");
      expect(content).toContain("tags: critical,backend");
    });

    test("POST /api/entity/score returns 403 for path traversal", async () => {
      const res = await fetch(`${baseUrl}/api/entity/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/etc/passwd", score: 1.0 }),
      });
      expect(res.status).toBe(403);
    });

    test("GET / serves index.html", async () => {
      const res = await fetch(`${baseUrl}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      const text = await res.text();
      expect(text).toContain("Dashboard");
    });

    test("GET /detail serves detail.html", async () => {
      const res = await fetch(`${baseUrl}/detail`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Detail");
    });

    test("GET /style.css serves static file with correct MIME", async () => {
      const res = await fetch(`${baseUrl}/style.css`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/css");
    });

    test("GET /nonexistent returns 404", async () => {
      const res = await fetch(`${baseUrl}/nonexistent`);
      expect(res.status).toBe(404);
    });

    test("POST /api/unknown returns 404", async () => {
      const res = await fetch(`${baseUrl}/api/unknown`, { method: "POST" });
      expect(res.status).toBe(404);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/server.test.ts 2>&1`

  Expected: FAIL -- cannot resolve `../../tools/dashboard/src/server`.

- [ ] **Step 3: Implement `server.ts` with `createServer()` and `Bun.serve()` routes**

  Create `tools/dashboard/src/server.ts`:

  ```typescript
  import { realpathSync, existsSync, appendFileSync } from "node:fs";
  import { join, resolve, sep, extname, dirname } from "node:path";
  import { parseArgs } from "node:util";
  import { discoverWorkflows, aggregateWorkflow } from "./discovery";
  import { getEntityDetail, updateScore, updateTags, filterEntities } from "./api";

  interface ServerOptions {
    port: number;
    projectRoot: string;
    staticDir?: string;
    logFile?: string;
  }

  function validatePath(filepath: string, projectRoot: string): boolean {
    try {
      const resolved = realpathSync(filepath);
      const root = realpathSync(projectRoot);
      return resolved === root || resolved.startsWith(root + sep);
    } catch {
      return false;
    }
  }

  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  export function createServer(opts: ServerOptions) {
    const { projectRoot, logFile } = opts;
    const staticDir = opts.staticDir ?? join(dirname(import.meta.dir), "static");

    function logRequest(req: Request, status: number) {
      if (!logFile) return;
      const now = new Date().toISOString();
      const line = `${now} - ${req.method} ${new URL(req.url).pathname} ${status}\n`;
      appendFileSync(logFile, line);
    }

    const server = Bun.serve({
      port: opts.port,
      routes: {
        "/api/workflows": {
          GET: (req) => {
            const workflows = discoverWorkflows(projectRoot);
            const result = workflows
              .map((wf) => aggregateWorkflow(wf.dir))
              .filter((d): d is NonNullable<typeof d> => d !== null);
            logRequest(req, 200);
            return jsonResponse(result);
          },
        },
        "/api/entity/detail": {
          GET: (req) => {
            const url = new URL(req.url);
            const filepath = url.searchParams.get("path");
            if (!filepath) {
              logRequest(req, 400);
              return jsonResponse({ error: "path required" }, 400);
            }
            if (!validatePath(filepath, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const data = getEntityDetail(filepath);
            logRequest(req, 200);
            return jsonResponse(data);
          },
        },
        "/api/entities": {
          GET: (req) => {
            const url = new URL(req.url);
            const directory = url.searchParams.get("dir") ?? ".";
            if (!validatePath(directory, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const status = url.searchParams.get("status") ?? undefined;
            const tag = url.searchParams.get("tag") ?? undefined;
            const minScoreStr = url.searchParams.get("min_score");
            const maxScoreStr = url.searchParams.get("max_score");
            const results = filterEntities(directory, {
              status: status || null,
              tag: tag || null,
              min_score: minScoreStr ? parseFloat(minScoreStr) : null,
              max_score: maxScoreStr ? parseFloat(maxScoreStr) : null,
            });
            logRequest(req, 200);
            return jsonResponse(results);
          },
        },
        "/api/entity/score": {
          POST: async (req) => {
            const body = await req.json() as { path: string; score: number };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            updateScore(body.path, body.score);
            logRequest(req, 200);
            return jsonResponse({ ok: true });
          },
        },
        "/api/entity/tags": {
          POST: async (req) => {
            const body = await req.json() as { path: string; tags: string[] };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            updateTags(body.path, body.tags);
            logRequest(req, 200);
            return jsonResponse({ ok: true });
          },
        },
        "/detail": {
          GET: (req) => {
            const filepath = join(staticDir, "detail.html");
            if (!existsSync(filepath)) {
              logRequest(req, 404);
              return new Response("Not Found", { status: 404 });
            }
            logRequest(req, 200);
            return new Response(Bun.file(filepath));
          },
        },
        "/": {
          GET: (req) => {
            const filepath = join(staticDir, "index.html");
            logRequest(req, 200);
            return new Response(Bun.file(filepath));
          },
        },
      },
      fetch(req) {
        // Fallback handler for static files and unmatched routes
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Serve static files
        const filename = pathname.slice(1); // remove leading /
        if (filename) {
          const filepath = resolve(staticDir, filename);
          const realStaticDir = realpathSync(staticDir);
          try {
            const realFilepath = realpathSync(filepath);
            if (!realFilepath.startsWith(realStaticDir)) {
              logRequest(req, 403);
              return new Response("Forbidden", { status: 403 });
            }
          } catch {
            logRequest(req, 404);
            return new Response("Not Found", { status: 404 });
          }
          if (existsSync(filepath)) {
            logRequest(req, 200);
            return new Response(Bun.file(filepath));
          }
        }

        logRequest(req, 404);
        if (req.method === "POST") {
          return jsonResponse({ error: "Not found" }, 404);
        }
        return new Response("Not Found", { status: 404 });
      },
    });

    return server;
  }

  // CLI entry point -- only runs when executed directly
  if (import.meta.main) {
    const { values } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        port: { type: "string", default: "8420" },
        root: { type: "string" },
        "log-file": { type: "string" },
      },
      strict: true,
    });

    let projectRoot = values.root ?? null;
    if (!projectRoot) {
      try {
        const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"]);
        projectRoot = result.stdout.toString().trim();
      } catch {
        projectRoot = process.cwd();
      }
    }
    projectRoot = resolve(projectRoot);

    const port = parseInt(values.port!, 10);
    const staticDir = join(dirname(import.meta.dir), "static");
    const logFile = values["log-file"] ?? undefined;

    const server = createServer({ port, projectRoot, staticDir, logFile });

    const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] Spacedock Dashboard started on http://127.0.0.1:${server.port}/ (root: ${projectRoot})`;
    console.log(banner);
    if (logFile) {
      appendFileSync(logFile, banner + "\n");
    }
    console.log("Press Ctrl+C to stop.");
  }
  ```

- [ ] **Step 4: Run all server tests**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/server.test.ts 2>&1`

  Expected: 13 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/src/server.ts tests/dashboard/server.test.ts
  git commit -m "feat(dashboard): port handlers.py + serve.py to Bun server.ts with tests"
  ```

---

## Task 7: Update ctl.sh and Delete Python Files

**Files:**
- Modify: `tools/dashboard/ctl.sh:152`
- Delete: `tools/dashboard/parsing.py`, `discovery.py`, `frontmatter_io.py`, `api.py`, `handlers.py`, `serve.py`, `__init__.py`, `__main__.py`
- Delete: `tests/test_dashboard_parsing.py`, `tests/test_dashboard_discovery.py`, `tests/test_frontmatter_io.py`, `tests/test_detail_rendering.py`, `tests/test_api.py`, `tests/test_dashboard_handlers.py`
- Modify: `tests/test_dashboard_ctl.py` (update if needed)

- [ ] **Step 1: Update ctl.sh to launch Bun instead of Python**

  In `tools/dashboard/ctl.sh`, change line 152 from:

  ```bash
      nohup python3 -m tools.dashboard.serve \
  ```

  to:

  ```bash
      nohup bun run tools/dashboard/src/server.ts \
  ```

- [ ] **Step 2: Run the full TypeScript test suite**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/ 2>&1`

  Expected: All tests pass across all 5 test files.

- [ ] **Step 3: Run the ctl.sh tests**

  Run: `cd /Users/kent/Project/spacedock && python3 -m pytest tests/test_dashboard_ctl.py -v 2>&1`

  Expected: All 8 ctl.sh tests pass (they test shell-level behavior, which should work the same with the Bun server).

  Note: If any ctl.sh tests fail because they import Python modules, those tests need to be updated to not depend on Python imports. The ctl.sh tests should only use subprocess calls to ctl.sh itself.

- [ ] **Step 4: Delete Python source files**

  ```bash
  cd /Users/kent/Project/spacedock
  rm tools/dashboard/parsing.py
  rm tools/dashboard/discovery.py
  rm tools/dashboard/frontmatter_io.py
  rm tools/dashboard/api.py
  rm tools/dashboard/handlers.py
  rm tools/dashboard/serve.py
  rm tools/dashboard/__init__.py
  rm tools/dashboard/__main__.py
  ```

- [ ] **Step 5: Delete Python test files**

  ```bash
  cd /Users/kent/Project/spacedock
  rm tests/test_dashboard_parsing.py
  rm tests/test_dashboard_discovery.py
  rm tests/test_frontmatter_io.py
  rm tests/test_detail_rendering.py
  rm tests/test_api.py
  rm tests/test_dashboard_handlers.py
  ```

- [ ] **Step 6: Verify no Python remnants break anything**

  Run: `cd /Users/kent/Project/spacedock && bun test tests/dashboard/ 2>&1`

  Expected: All TypeScript tests still pass.

  Run: `cd /Users/kent/Project/spacedock && python3 -m pytest tests/test_dashboard_ctl.py -v 2>&1`

  Expected: ctl.sh tests still pass (they don't import Python dashboard modules).

- [ ] **Step 7: Commit**

  ```bash
  git add -A tools/dashboard/ tests/
  git commit -m "feat(dashboard): complete Bun migration — remove Python files, update ctl.sh"
  ```

---

## Quality Gates

These gates must pass before the feature is considered complete:

1. **TypeScript tests pass:** `bun test tests/dashboard/` — all tests green across 5 test files
2. **ctl.sh tests pass:** `python3 -m pytest tests/test_dashboard_ctl.py -v` — all 8 tests green
3. **No Python files remain:** `ls tools/dashboard/*.py` returns nothing
4. **ctl.sh uses Bun:** `grep -c 'bun run' tools/dashboard/ctl.sh` returns at least 1
5. **ctl.sh does not reference Python:** `grep -c 'python3' tools/dashboard/ctl.sh` returns 0
6. **Manual smoke test:** `bun run tools/dashboard/src/server.ts --root .` → browser opens dashboard → workflows/entities display correctly → score/tag editing works → detail view renders
7. **Daemon smoke test:** `tools/dashboard/ctl.sh start` → `ctl.sh status` shows running → `ctl.sh stop` cleans up → no Python process involved
8. **Static files unchanged:** `git diff --name-only tools/dashboard/static/` shows no changes
9. **Backward compatibility:** `tools/dashboard/ctl.sh start` followed by frontend interactions (workflow list, entity detail, score update, tag update) all work identically to the Python version
10. **Path traversal security:** Attempt to access `/api/entity/detail?path=/etc/passwd` returns 403 Forbidden (same as Python version)
