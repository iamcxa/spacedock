// spacebridge/src/domain/session/watcher.ts
// ABOUTME: File watcher with dynamic scope driven by session registry.
// Watches workflow dirs discovered from active session project roots.
// Events are 🟡 event-log only (no decider) — appended to events table with sentinel values.
// macOS FSEvents only emits "rename"; debounce key = filename only (A-9 gotcha).

import { watch, type FSWatcher } from "node:fs";
import type { SpacebridgeDb } from "../../db";
import { events as eventsTable } from "../../schema";
import type { SessionRegistry } from "./registry";

export interface FileWatcher {
  recomputeScope(): Promise<void>;
  close(): void;
}

export interface FileWatcherOptions {
  registry: SessionRegistry;
  db: SpacebridgeDb;
  onFileChange?: (event: { filename: string; workflowDir: string }) => void;
  now?: () => number;
}

export function createFileWatcher(opts: FileWatcherOptions): FileWatcher {
  const getNow = opts.now ?? (() => Date.now());
  // Map of workflowDir → FSWatcher
  const watchers = new Map<string, FSWatcher>();
  // Debounce map: filename → timer (per A-9: macOS emits "rename" only, key = filename)
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function startWatcher(workflowDir: string): void {
    if (watchers.has(workflowDir)) return;
    try {
      const watcher = watch(workflowDir, { recursive: true }, (event, filename) => {
        if (!filename) return;
        // Q-1 answer: only *.md files
        if (!filename.endsWith(".md")) return;

        // Debounce per filename (~100ms) — collapses git burst events
        const existing = debounceTimers.get(filename);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          debounceTimers.delete(filename);
          // Write file_change event to events table (O-2: sentinel values)
          opts.db.insert(eventsTable).values({
            type: "file_change",
            entity: "*",
            stage: "watcher",
            agent: "file-watcher",
            timestamp: getNow(),
            detail: filename,
            workflowDir,
          }).then(() => {
            opts.onFileChange?.({ filename, workflowDir });
          }).catch((err: Error) => {
            console.error("[file-watcher] failed to append event:", err);
          });
        }, 100);
        debounceTimers.set(filename, timer);
      });
      watchers.set(workflowDir, watcher);
    } catch (err) {
      console.error(`[file-watcher] failed to watch ${workflowDir}:`, err);
    }
  }

  function stopWatcher(workflowDir: string): void {
    const watcher = watchers.get(workflowDir);
    if (watcher) {
      watcher.close();
      watchers.delete(workflowDir);
    }
  }

  return {
    async recomputeScope(): Promise<void> {
      const workflows = opts.registry.discoverActiveWorkflows();
      const newDirs = new Set(workflows.map((wf) => wf.dir));

      // Start watchers for newly discovered dirs
      for (const dir of newDirs) {
        if (!watchers.has(dir)) {
          startWatcher(dir);
        }
      }

      // Stop watchers for dirs no longer in scope
      for (const dir of watchers.keys()) {
        if (!newDirs.has(dir)) {
          stopWatcher(dir);
        }
      }
    },

    close(): void {
      // Clear all debounce timers
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();
      // Close all watchers
      for (const dir of Array.from(watchers.keys())) {
        stopWatcher(dir);
      }
    },
  };
}
