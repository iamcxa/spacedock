// ABOUTME: Tests for entity-parse.ts — splitFrontmatter + parseEntity with graceful fallback.
import { describe, expect, test } from "bun:test";
import { parseEntity, splitFrontmatter } from "./entity-parse";

describe("splitFrontmatter", () => {
  test("valid frontmatter returns fields and body", () => {
    const text = `---\nid: 042\ntitle: My Entity\nstatus: execute\n---\n## Body\nsome content`;
    const [fm, body] = splitFrontmatter(text);
    expect(fm.id).toBe("042");
    expect(fm.title).toBe("My Entity");
    expect(fm.status).toBe("execute");
    expect(body).toContain("## Body");
  });

  test("missing frontmatter returns empty fm and full text as body", () => {
    const text = "No frontmatter here\nJust body text";
    const [fm, body] = splitFrontmatter(text);
    expect(Object.keys(fm)).toHaveLength(0);
    expect(body).toBe(text);
  });

  test("malformed frontmatter (no closing ---) returns empty fm and full text as body", () => {
    const text = "---\nid: 042\ntitle: broken\nno closing delimiter";
    const [fm, body] = splitFrontmatter(text);
    expect(Object.keys(fm)).toHaveLength(0);
    expect(body).toBe(text);
  });

  test("multi-line body is preserved intact", () => {
    const text = `---\nid: 001\n---\nLine 1\nLine 2\nLine 3\n\n## Section\nContent`;
    const [, body] = splitFrontmatter(text);
    expect(body).toContain("Line 1");
    expect(body).toContain("Line 2");
    expect(body).toContain("## Section");
  });
});

describe("parseEntity", () => {
  test("valid entity returns frontmatter, tags, and body", () => {
    const text = `---\nid: 007\ntitle: Test\ntags: foo,bar\n---\n## Directive\nsome content`;
    const result = parseEntity(text);
    expect(result.frontmatter.id).toBe("007");
    expect(result.tags).toEqual(["foo", "bar"]);
    expect(result.body).toContain("## Directive");
  });

  test("missing frontmatter returns empty fm and no tags", () => {
    const text = "No frontmatter, just body text";
    const result = parseEntity(text);
    expect(Object.keys(result.frontmatter)).toHaveLength(0);
    expect(result.tags).toHaveLength(0);
    expect(result.body).toBe(text);
  });
});
