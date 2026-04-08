// ABOUTME: Tests for the snapshot module — parser, store, diff, and rollback.

import { describe, test, expect } from "bun:test";
import { parseSections } from "./snapshots";

describe("parseSections", () => {
  test("returns empty for headingless markdown", () => {
    const result = parseSections("just some text\nwith no headings\n");
    expect(result).toEqual([]);
  });

  test("splits two top-level sections", () => {
    const md = "## One\nbody one\n\n## Two\nbody two\n";
    const result = parseSections(md);
    expect(result.length).toBe(2);
    expect(result[0].heading).toBe("## One");
    expect(result[0].level).toBe(2);
    expect(result[0].body).toBe("body one\n");
    expect(result[1].heading).toBe("## Two");
    expect(result[1].body).toBe("body two\n");
  });

  test("nests subheadings inside parent section", () => {
    const md = "## A\nalpha\n### A.1\nsub a\n## B\nbeta\n";
    const result = parseSections(md);
    // ## A, ### A.1, ## B → 3 sections
    expect(result.length).toBe(3);
    const sectionA = result.find((s) => s.heading === "## A")!;
    // ## A's body should span to start of ## B and include the ### A.1 subsection
    expect(sectionA.body).toContain("alpha");
    expect(sectionA.body).toContain("### A.1");
    expect(sectionA.body).toContain("sub a");
    const sectionB = result.find((s) => s.heading === "## B")!;
    expect(sectionB.body).toBe("beta\n");
  });

  test("ignores headings in backtick code fences", () => {
    const md = "## Real\nbefore\n```\n## fake heading\n```\nafter\n## Other\nx\n";
    const result = parseSections(md);
    expect(result.length).toBe(2);
    expect(result[0].heading).toBe("## Real");
    expect(result[1].heading).toBe("## Other");
    // Make sure the fake heading is part of the body, not a separate section
    expect(result[0].body).toContain("## fake heading");
  });

  test("ignores headings in tilde code fences", () => {
    const md = "## Real\nbefore\n~~~\n## fake heading\n~~~\nafter\n## Other\nx\n";
    const result = parseSections(md);
    expect(result.length).toBe(2);
    expect(result[0].heading).toBe("## Real");
    expect(result[1].heading).toBe("## Other");
    expect(result[0].body).toContain("## fake heading");
  });

  test("handles section terminating at higher-level heading", () => {
    const md = "# Top\nintro\n## Child\nchild body\n# Next Top\nlast\n";
    const result = parseSections(md);
    // # Top, ## Child, # Next Top → 3 sections
    expect(result.length).toBe(3);
    const top = result.find((s) => s.heading === "# Top")!;
    // # Top nests ## Child; ends at # Next Top
    expect(top.body).toContain("intro");
    expect(top.body).toContain("## Child");
    expect(top.body).toContain("child body");
    expect(top.body).not.toContain("last");
  });

  test("strips trailing # from heading text", () => {
    const md = "## Heading Text ##\nbody\n";
    const result = parseSections(md);
    expect(result.length).toBe(1);
    expect(result[0].heading).toBe("## Heading Text");
  });
});
