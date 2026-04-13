// ABOUTME: Smoke tests for build-distill skill — validates SKILL.md conventions,
// frontmatter fields, referenced files existence, step count, and Rules section.

import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SKILL_DIR = join(import.meta.dir, "..");
const SKILL_MD = join(SKILL_DIR, "SKILL.md");
const COMPARISON_DIMENSIONS = join(SKILL_DIR, "references", "comparison-dimensions.md");

// Parse YAML frontmatter from a markdown file
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^"|"$/g, "");
    result[key] = val;
  }
  return result;
}

describe("build-distill SKILL.md existence", () => {
  test("SKILL.md exists", () => {
    expect(existsSync(SKILL_MD)).toBe(true);
  });

  test("comparison-dimensions.md reference exists", () => {
    expect(existsSync(COMPARISON_DIMENSIONS)).toBe(true);
  });
});

describe("build-distill frontmatter", () => {
  const content = readFileSync(SKILL_MD, "utf-8");
  const fm = parseFrontmatter(content);

  test("has YAML frontmatter block", () => {
    expect(content.startsWith("---\n")).toBe(true);
    expect(content).toMatch(/^---\n[\s\S]*?\n---/);
  });

  test("frontmatter has 'name' field", () => {
    expect(fm["name"]).toBeDefined();
    expect(fm["name"].length).toBeGreaterThan(0);
  });

  test("name uses only letters, numbers, hyphens (no special chars)", () => {
    expect(fm["name"]).toMatch(/^[a-zA-Z0-9-]+$/);
  });

  test("frontmatter has 'description' field", () => {
    expect(fm["description"]).toBeDefined();
    expect(fm["description"].length).toBeGreaterThan(0);
  });

  test("description starts with 'Use when'", () => {
    expect(fm["description"]).toMatch(/^Use when/);
  });

  test("description does NOT summarize workflow steps (no step counts)", () => {
    // description should not describe the internal process
    const desc = fm["description"];
    expect(desc).not.toMatch(/\d+ (fixed )?dimension/i);
    expect(desc).not.toMatch(/reads source and target/i);
    expect(desc).not.toMatch(/scores gaps/i);
    expect(desc).not.toMatch(/produces entity drafts/i);
  });

  test("frontmatter total length under 1024 chars", () => {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    expect(match).not.toBeNull();
    expect(match![0].length).toBeLessThanOrEqual(1024);
  });
});

describe("build-distill SKILL.md structure", () => {
  const content = readFileSync(SKILL_MD, "utf-8");

  test("has H1 title", () => {
    expect(content).toMatch(/^# .+/m);
  });

  test("has role/overview paragraph after H1", () => {
    // First paragraph after frontmatter should describe the skill's role
    expect(content).toMatch(/You are a semi-interactive skill/);
  });

  test("declares step count (Six steps)", () => {
    expect(content).toMatch(/Six steps/i);
  });

  test("step count declaration matches actual step headers", () => {
    const stepHeaders = content.match(/^## Step \d+/gm) ?? [];
    expect(stepHeaders.length).toBe(6);
  });

  test("has Tools Available section", () => {
    expect(content).toMatch(/## Tools Available/);
  });

  test("Tools Available section lists Can use and NOT available", () => {
    expect(content).toMatch(/\*\*Can use:\*\*/);
    expect(content).toMatch(/\*\*NOT available/);
  });

  test("has Input Contract section", () => {
    expect(content).toMatch(/## Input Contract/);
  });

  test("has Output Contract section", () => {
    expect(content).toMatch(/## Output Contract/);
  });

  test("has Rules section", () => {
    expect(content).toMatch(/^## Rules/m);
  });

  test("Rules section contains NEVER markers", () => {
    const rulesIdx = content.indexOf("## Rules");
    expect(rulesIdx).toBeGreaterThan(-1);
    const rulesSection = content.slice(rulesIdx);
    const neverCount = (rulesSection.match(/\*\*NEVER/g) ?? []).length;
    expect(neverCount).toBeGreaterThanOrEqual(3);
  });

  test("Rules section contains ALWAYS markers", () => {
    const rulesIdx = content.indexOf("## Rules");
    const rulesSection = content.slice(rulesIdx);
    const alwaysCount = (rulesSection.match(/\*\*ALWAYS/g) ?? []).length;
    expect(alwaysCount).toBeGreaterThanOrEqual(1);
  });
});

describe("build-distill reference file content", () => {
  const dimContent = readFileSync(COMPARISON_DIMENSIONS, "utf-8");

  test("comparison-dimensions.md defines exactly 7 dimensions", () => {
    const dims = dimContent.match(/^## Dimension \d+:/gm) ?? [];
    expect(dims.length).toBe(7);
  });

  test("SKILL.md references comparison-dimensions.md correctly", () => {
    const skillContent = readFileSync(SKILL_MD, "utf-8");
    expect(skillContent).toMatch(/references\/comparison-dimensions\.md/);
  });

  test("SKILL.md step count matches role paragraph declaration", () => {
    const skillContent = readFileSync(SKILL_MD, "utf-8");
    // The role paragraph says "Six steps" and there must be 6 Step headers
    expect(skillContent).toMatch(/Six steps/i);
    const stepHeaders = skillContent.match(/^## Step \d+/gm) ?? [];
    expect(stepHeaders.length).toBe(6);
  });

  test("comparison-dimensions.md has scoring guidance for each dimension", () => {
    const dims = dimContent.match(/\*\*Scoring guidance\*\*/g) ?? [];
    expect(dims.length).toBe(7);
  });
});

describe("build-distill siblings pattern conformance", () => {
  const content = readFileSync(SKILL_MD, "utf-8");

  test("uses double dash (--) not em dash in section headers", () => {
    // em dash is — (U+2014), double dash is --
    const headers = content.match(/^#.+/gm) ?? [];
    for (const h of headers) {
      expect(h).not.toContain("\u2014");
    }
  });

  test("step headers follow ## Step N: pattern", () => {
    const stepHeaders = content.match(/^## Step \d+/gm) ?? [];
    expect(stepHeaders.length).toBe(6);
    // All steps should be numbered sequentially
    for (let i = 1; i <= 6; i++) {
      expect(content).toMatch(new RegExp(`## Step ${i}:`));
    }
  });
});
