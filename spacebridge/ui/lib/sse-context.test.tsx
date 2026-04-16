// ABOUTME: Tests for shared SSE context provider (O-2 decision: single EventSource shared by LiveFeed + PipelineGraph).
// Uses source-analysis pattern (matching project convention) since React JSX runtime is not
// available in the bun:test context outside Next.js build.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const SRC_PATH = join(import.meta.dir, "sse-context.tsx");

describe("sse-context.tsx source structure", () => {
  test("begins with 'use client' directive", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src.startsWith('"use client"')).toBe(true);
  });

  test("exports SSEProvider", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("export function SSEProvider");
  });

  test("exports useSSE hook", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("export function useSSE");
  });

  test("exports SSEEvent type", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("export");
    expect(src).toContain("SSEEvent");
  });

  test("uses createContext", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("createContext");
  });

  test("SSEEvent interface has required fields (id, type, entity, stage, agent, timestamp, detail)", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("id:");
    expect(src).toContain("type:");
    expect(src).toContain("entity:");
    expect(src).toContain("stage:");
    expect(src).toContain("agent:");
    expect(src).toContain("timestamp:");
    expect(src).toContain("detail");
  });

  test("context value shape includes events array and status", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("events");
    expect(src).toContain("status");
    expect(src).toContain('"connecting"');
    expect(src).toContain('"connected"');
    expect(src).toContain('"reconnecting"');
  });

  test("opens EventSource at /api/events", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain('EventSource("/api/events")');
  });

  test("closes EventSource on unmount (cleanup in useEffect)", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("es.close()");
  });

  test("caps events array at 200 entries", async () => {
    const src = await Bun.file(SRC_PATH).text();
    expect(src).toContain("200");
  });

  test("useSSE throws when used outside provider", async () => {
    const src = await Bun.file(SRC_PATH).text();
    // Must have a null-context guard that throws
    expect(src).toContain("throw");
    expect(src).toContain("SSEProvider");
  });

  test("SSE disconnection graceful degradation: onerror sets reconnecting but does NOT clear events", async () => {
    const src = await Bun.file(SRC_PATH).text();
    // onerror must set status to reconnecting
    expect(src).toContain("reconnecting");
    // onerror must NOT call setEvents (no state clear on error)
    // Check that onerror handler only sets status, does not call setEvents
    const onerrorMatch = src.match(/es\.onerror\s*=\s*\([^)]*\)\s*=>\s*\{([^}]*)\}/s);
    if (onerrorMatch) {
      // Arrow function block form — check it doesn't call setEvents
      expect(onerrorMatch[1]).not.toContain("setEvents");
    } else {
      // Inline arrow without block: `es.onerror = () => setStatus("reconnecting")`
      // This is fine — only setting status
      const inlineMatch = src.match(/es\.onerror\s*=\s*\(\)\s*=>\s*setStatus/);
      expect(inlineMatch).not.toBeNull();
    }
  });

  test("events are stored newest-first (prepend, not append)", async () => {
    const src = await Bun.file(SRC_PATH).text();
    // Newest-first pattern: [evt, ...prev] or unshift equivalent
    const newestFirst = src.includes("[evt, ...prev]") || src.includes("unshift");
    expect(newestFirst).toBe(true);
  });
});
