// ABOUTME: Smoke tests for GateButtons component — verifies export shape and
// key implementation properties (fetch URL, "use client", approve/reject handlers).

import { describe, expect, test } from "bun:test";

// Note: GateButtons cannot be dynamically imported in the spacebridge test context
// (React JSX runtime not available outside the Next.js build). Static source analysis
// covers the contract; full render tests belong in the Next.js test suite.

describe("GateButtons", () => {
  test("source file begins with 'use client' directive", async () => {
    const src = await Bun.file(`${import.meta.dir}/gate-buttons.tsx`).text();
    expect(src.startsWith('"use client"')).toBe(true);
  });

  test("source file fetches /api/entities/[slug]/gate with POST", async () => {
    const src = await Bun.file(`${import.meta.dir}/gate-buttons.tsx`).text();
    // biome-ignore lint/suspicious/noTemplateCurlyInString: intentionally checking for literal template syntax in source
    expect(src).toContain("/api/entities/${entitySlug}/gate");
    expect(src).toContain('"POST"');
  });

  test("source file has Approve and Reject buttons", async () => {
    const src = await Bun.file(`${import.meta.dir}/gate-buttons.tsx`).text();
    expect(src).toContain("Approve");
    expect(src).toContain("Reject");
  });

  test("source file sends decision approve and reject", async () => {
    const src = await Bun.file(`${import.meta.dir}/gate-buttons.tsx`).text();
    expect(src).toContain('"approve"');
    expect(src).toContain('"reject"');
  });
});
