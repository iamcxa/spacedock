// spacebridge/src/application/suggestion-applier.test.ts
// ABOUTME: Tests for SuggestionApplier -- the ONLY file-I/O module in entity 089.
// Covers applyBodyEdit (pure string transform) and applySuggestion (file read/write).
// Also verifies dry-run mode and frontmatter guard (captain guardrails 2026-04-16).

import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyBodyEdit,
  applySuggestion,
  FrontmatterProtectionError,
} from "./suggestion-applier";

// ─── applyBodyEdit (pure) ──────────────────────────────────────────────────────

const SAMPLE_DOC = `---
id: 089
title: "Test Entity"
---

## Section

This is the body text that can be edited.
Another line here.
Duplicate text here. Duplicate text here.
`;

describe("applyBodyEdit", () => {
  it("replaces diff_from with diff_to in body (preserving frontmatter)", () => {
    const result = applyBodyEdit(SAMPLE_DOC, "body text that can be edited", "body text that was edited");
    expect(result).toContain("body text that was edited");
    expect(result).not.toContain("body text that can be edited");
    // frontmatter intact
    expect(result).toContain('title: "Test Entity"');
    expect(result.startsWith("---\n")).toBe(true);
  });

  it("throws on missing frontmatter (no leading ---)", () => {
    const noFm = "This is just body text\nNo frontmatter here\n";
    expect(() => applyBodyEdit(noFm, "body text", "new text")).toThrow("Missing YAML frontmatter");
  });

  it("throws on unterminated frontmatter (no closing ---)", () => {
    const unterminated = "---\nid: 089\ntitle: Test\n\nNo closing delimiter\n";
    expect(() => applyBodyEdit(unterminated, "No closing", "something")).toThrow("Unterminated YAML frontmatter");
  });

  it("throws when diff_from not found in body", () => {
    expect(() => applyBodyEdit(SAMPLE_DOC, "text that does not exist", "replacement")).toThrow(
      "Text not found in entity body: diff_from text not found"
    );
  });

  it("replaces only first occurrence of diff_from", () => {
    const result = applyBodyEdit(SAMPLE_DOC, "Duplicate text here.", "REPLACED.");
    const count = (result.match(/REPLACED\./g) ?? []).length;
    expect(count).toBe(1);
    expect(result).toContain("Duplicate text here.");
  });

  it("does not modify frontmatter even if diff_from appears there", () => {
    const docWithFmMatch = `---
id: 089
title: "target phrase"
---

The target phrase appears in body too.
`;
    // diff_from appears in BOTH frontmatter and body — must NOT touch frontmatter
    const result = applyBodyEdit(docWithFmMatch, "target phrase", "replaced phrase");
    expect(result).toContain('title: "target phrase"');
    expect(result).toContain("replaced phrase");
    // frontmatter still has original
    const fmEnd = result.indexOf("---\n\n");
    const frontmatter = result.slice(0, fmEnd + 3);
    expect(frontmatter).toContain("target phrase");
  });
});

// ─── Dry-run mode ─────────────────────────────────────────────────────────────

describe("applySuggestion dry-run mode", () => {
  it("returns diff preview without writing when dryRun: true", () => {
    const tmp = mkdtempSync(join(tmpdir(), "sg-test-"));
    const filePath = join(tmp, "entity.md");
    writeFileSync(filePath, SAMPLE_DOC, "utf-8");

    const result = applySuggestion(filePath, "body text that can be edited", "body text DRY RUN", { dryRun: true });

    // File must NOT be modified
    const fileContent = readFileSync(filePath, "utf-8");
    expect(fileContent).toBe(SAMPLE_DOC);

    // Must return preview of what would be written
    expect(result.preview).toBeDefined();
    expect(result.preview).toContain("body text DRY RUN");
    expect(result.written).toBe(false);
  });

  it("writes file and returns written:true when dryRun not set", () => {
    const tmp = mkdtempSync(join(tmpdir(), "sg-test-"));
    const filePath = join(tmp, "entity.md");
    writeFileSync(filePath, SAMPLE_DOC, "utf-8");

    const result = applySuggestion(filePath, "body text that can be edited", "body text WRITTEN");

    const fileContent = readFileSync(filePath, "utf-8");
    expect(fileContent).toContain("body text WRITTEN");
    expect(result.written).toBe(true);
  });
});

// ─── Frontmatter guard ────────────────────────────────────────────────────────

describe("FrontmatterProtectionError", () => {
  it("is thrown when diff_from text spans into frontmatter region", () => {
    // Craft a diff_from that crosses the frontmatter boundary
    const doc = `---
id: 089
---

Body starts here.
`;
    // diff_from that would match the frontmatter closing --- and body together
    const crossBoundary = "---\n\nBody starts here.";
    expect(() => applyBodyEdit(doc, crossBoundary, "replacement")).toThrow(FrontmatterProtectionError);
  });

  it("is thrown when diff_to would introduce frontmatter delimiters at position 0", () => {
    // diff_to that starts with --- could create false frontmatter
    const doc = `---
id: 089
---

Body line one.
`;
    // diff_from exists only in body; but diff_to starts with --- which could corrupt frontmatter boundary detection
    // The guard must reject any diff_to starting with "---" if it would appear at column 0 and could look like YAML delimiter
    expect(() => applyBodyEdit(doc, "Body line one.", "---\nnew frontmatter attempt")).toThrow(FrontmatterProtectionError);
  });
});

// ─── applySuggestion file I/O ─────────────────────────────────────────────────

describe("applySuggestion (file I/O)", () => {
  it("reads file, applies edit, writes result back", () => {
    const tmp = mkdtempSync(join(tmpdir(), "sg-test-"));
    const filePath = join(tmp, "entity.md");
    writeFileSync(filePath, SAMPLE_DOC, "utf-8");

    applySuggestion(filePath, "Another line here.", "A modified line.");

    const result = readFileSync(filePath, "utf-8");
    expect(result).toContain("A modified line.");
    expect(result).not.toContain("Another line here.");
    // frontmatter still intact
    expect(result).toContain('title: "Test Entity"');
  });

  it("throws when diff_from not found in file, leaving file unchanged", () => {
    const tmp = mkdtempSync(join(tmpdir(), "sg-test-"));
    const filePath = join(tmp, "entity.md");
    writeFileSync(filePath, SAMPLE_DOC, "utf-8");

    expect(() => applySuggestion(filePath, "text that does not exist in file", "replacement")).toThrow(
      "Text not found in entity body: diff_from text not found"
    );

    // File must be unchanged
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe(SAMPLE_DOC);
  });
});
