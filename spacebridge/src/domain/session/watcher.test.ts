// spacebridge/src/domain/session/watcher.test.ts
// ABOUTME: Integration tests for file watcher — scope expansion/contraction, debounce, *.md filter.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SpacebridgeDb } from "../../db";
import { createDb } from "../../db";
import { events as eventsTable } from "../../schema";
import type { SessionRegistry } from "./registry";
import type { SessionState } from "./types";
import { createFileWatcher } from "./watcher";

let db: SpacebridgeDb;
let tmpDir: string;

beforeEach(() => {
  db = createDb(":memory:");
  tmpDir = mkdtempSync(join(tmpdir(), "watcher-test-"));
});

afterEach(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
});

function makeWorkflowDir(name: string): string {
  const dir = join(tmpDir, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeRegistry(workflowDirs: string[]): SessionRegistry {
  return {
    register: async () => [],
    heartbeat: async () => [],
    disconnect: async () => [],
    disconnectAll: async () => [],
    getState: () => ({ sessions: new Map() }) as SessionState,
    getActiveProjectRoots: () => [],
    discoverActiveWorkflows: () =>
      workflowDirs.map((dir) => ({ dir, commissioned_by: "spacedock@test" })),
  };
}

describe("scope expansion and contraction", () => {
  test("adds watcher when recomputeScope called with new dir", async () => {
    const dir = makeWorkflowDir("workflow-a");
    const received: string[] = [];
    const registry = makeRegistry([dir]);

    const watcher = createFileWatcher({
      registry,
      db,
      onFileChange: ({ filename }) => received.push(filename),
    });

    await watcher.recomputeScope();

    // Write a .md file to trigger the watcher
    writeFileSync(join(dir, "test-entity.md"), "# test");
    await new Promise((resolve) => setTimeout(resolve, 250));
    watcher.close();

    expect(received.length).toBeGreaterThan(0);
    expect(received[0]).toContain(".md");
  });

  test("scope contract: watcher removed when dir no longer in scope", async () => {
    const dirA = makeWorkflowDir("workflow-a");
    const dirB = makeWorkflowDir("workflow-b");

    let activeDirs = [dirA, dirB];
    const registry: SessionRegistry = {
      ...makeRegistry([]),
      discoverActiveWorkflows: () =>
        activeDirs.map((d) => ({ dir: d, commissioned_by: "spacedock@test" })),
    };

    const received: string[] = [];
    const watcher = createFileWatcher({
      registry,
      db,
      onFileChange: ({ filename }) => received.push(filename),
    });

    await watcher.recomputeScope();

    // Remove dirB from scope
    activeDirs = [dirA];
    await watcher.recomputeScope();

    // Write to dirB — should NOT trigger since watcher was closed
    const countBefore = received.length;
    writeFileSync(join(dirB, "entity.md"), "# test");
    await new Promise((resolve) => setTimeout(resolve, 250));
    watcher.close();

    expect(received.length).toBe(countBefore);
  });
});

describe("*.md filter", () => {
  test("only *.md files pass through — .ts file ignored", async () => {
    const dir = makeWorkflowDir("workflow-filter");
    const received: string[] = [];
    const registry = makeRegistry([dir]);

    const watcher = createFileWatcher({
      registry,
      db,
      onFileChange: ({ filename }) => received.push(filename),
    });

    await watcher.recomputeScope();

    // Write a .ts file — should be ignored
    writeFileSync(join(dir, "index.ts"), "export {}");
    await new Promise((resolve) => setTimeout(resolve, 250));
    watcher.close();

    const tsEvents = received.filter((f) => f.endsWith(".ts"));
    expect(tsEvents.length).toBe(0);
  });
});

describe("debounce", () => {
  test("rapid writes to same file produce single event", async () => {
    const dir = makeWorkflowDir("workflow-debounce");
    const received: string[] = [];
    const registry = makeRegistry([dir]);

    const watcher = createFileWatcher({
      registry,
      db,
      onFileChange: ({ filename }) => received.push(filename),
    });

    await watcher.recomputeScope();

    // Write same file 5 times rapidly
    for (let i = 0; i < 5; i++) {
      writeFileSync(join(dir, "entity.md"), `# version ${i}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    watcher.close();

    // Should be debounced to 1-2 events (not 5)
    expect(received.length).toBeLessThanOrEqual(2);
  });
});

describe("events table sentinel values (O-2)", () => {
  test("file change writes event with correct sentinel values", async () => {
    const dir = makeWorkflowDir("workflow-sentinel");
    const registry = makeRegistry([dir]);

    const watcher = createFileWatcher({ registry, db });

    await watcher.recomputeScope();
    writeFileSync(join(dir, "entity.md"), "# test");
    await new Promise((resolve) => setTimeout(resolve, 250));
    watcher.close();

    const rows = await db.select().from(eventsTable).all();
    const fileChangeRows = rows.filter((r) => r.type === "file_change");
    expect(fileChangeRows.length).toBeGreaterThan(0);
    const row = fileChangeRows[0];
    expect(row.entity).toBe("*");
    expect(row.stage).toBe("watcher");
    expect(row.agent).toBe("file-watcher");
    expect(row.workflowDir).toBe(dir);
  });
});
