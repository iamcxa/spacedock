// spacebridge/src/application/suggestion-applier.ts
// ABOUTME: Application-layer module for applying inline edit suggestions to entity markdown files.
// This is the ONLY module in entity 089 that performs file I/O (per 054 O-2 domain boundary rule).
// Pure applyBodyEdit() is exported separately for testing and dry-run preview.

import { readFileSync, writeFileSync } from "node:fs";

// ─── FrontmatterProtectionError ───────────────────────────────────────────────

/**
 * Thrown when diff_from or diff_to would touch the YAML frontmatter region
 * (content between the opening and closing `---` delimiters).
 * Captain guardrail 2026-04-16: frontmatter must never be modified by suggestion apply.
 */
export class FrontmatterProtectionError extends Error {
  readonly name = "FrontmatterProtectionError";
  constructor(reason: string) {
    super(`Frontmatter protection violation: ${reason}`);
  }
}

// ─── Pure text transform ───────────────────────────────────────────────────────

/**
 * Apply a text substitution to the body of a markdown document with YAML frontmatter.
 * Ported verbatim from tools/dashboard/src/comments.ts:83-109.
 *
 * Frontmatter guard (captain 2026-04-16):
 * - If diff_from spans into the frontmatter region, throws FrontmatterProtectionError.
 * - If diff_to starts with "---" (could create a false frontmatter delimiter at col 0), throws FrontmatterProtectionError.
 */
export function applyBodyEdit(fileText: string, diffFrom: string, diffTo: string): string {
  // Find frontmatter boundary to only operate on body text
  const lines = fileText.split("\n");
  if (!lines.length || lines[0].trim() !== "---") {
    throw new Error("Missing YAML frontmatter");
  }
  let fmEnd: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      fmEnd = i;
      break;
    }
  }
  if (fmEnd === null) {
    throw new Error("Unterminated YAML frontmatter");
  }

  const frontmatterPart = lines.slice(0, fmEnd + 1).join("\n");
  const bodyPart = lines.slice(fmEnd + 1).join("\n");

  // Frontmatter guard: reject diff_from that crosses the frontmatter boundary
  // (i.e., the text is found in fileText but NOT in bodyPart alone)
  if (fileText.includes(diffFrom) && !bodyPart.includes(diffFrom)) {
    throw new FrontmatterProtectionError(
      "diff_from text spans into or is located within the YAML frontmatter region"
    );
  }

  // Frontmatter guard: reject diff_to that starts with "---" at column 0
  // to prevent creating a false YAML frontmatter delimiter in the body
  if (diffTo.startsWith("---")) {
    throw new FrontmatterProtectionError(
      "diff_to starts with '---' which could introduce a false YAML frontmatter delimiter"
    );
  }

  if (!bodyPart.includes(diffFrom)) {
    throw new Error("Text not found in entity body: diff_from text not found");
  }
  // Intentionally replaces only the first occurrence — suggestion targets a specific text selection
  const newBody = bodyPart.replace(diffFrom, diffTo);
  return frontmatterPart + "\n" + newBody;
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface ApplySuggestionResult {
  /** True if the file was written. False in dry-run mode. */
  written: boolean;
  /** Preview of what the file content would look like after the edit (always populated). */
  preview: string;
}

// ─── Impure file I/O wrapper ──────────────────────────────────────────────────

/**
 * Apply a suggestion to an entity markdown file on disk.
 *
 * @param entityFilePath - Absolute path to the entity markdown file.
 * @param diffFrom - Text to find and replace (first occurrence only, body only).
 * @param diffTo - Replacement text.
 * @param options.dryRun - If true, return a preview without writing the file.
 *
 * Throws on: missing frontmatter, unterminated frontmatter, diff_from not found,
 * FrontmatterProtectionError if diff crosses YAML delimiters.
 *
 * File is NOT modified if an error is thrown (read-compute-write, never partial write).
 */
export function applySuggestion(
  entityFilePath: string,
  diffFrom: string,
  diffTo: string,
  options?: { dryRun?: boolean }
): ApplySuggestionResult {
  const fileText = readFileSync(entityFilePath, "utf-8");
  // Compute result BEFORE writing — if applyBodyEdit throws, file is untouched
  const preview = applyBodyEdit(fileText, diffFrom, diffTo);

  if (options?.dryRun) {
    return { written: false, preview };
  }

  writeFileSync(entityFilePath, preview, "utf-8");
  return { written: true, preview };
}
