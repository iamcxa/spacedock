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

describe("parseEntity", () => {
  test("parses entity with frontmatter, tags, and body", () => {
    const text = "---\nid: 001\ntags: urgent,backend\n---\n\nBody content.\n";
    const entity = parseEntity(text);
    expect(entity.frontmatter.id).toBe("001");
    expect(entity.tags).toEqual(["urgent", "backend"]);
    expect(entity.body).toContain("Body content.");
  });
});

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
