// ABOUTME: Tests for the snapshot module — parser, store, diff, and rollback.

import { describe, test, expect } from "bun:test";
import { openDb } from "./db";
import { parseSections, SnapshotStore, findSectionByHeading, replaceSection } from "./snapshots";

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

describe("SnapshotStore", () => {
  function makeStore() {
    const db = openDb(":memory:");
    return { db, store: new SnapshotStore(db) };
  }

  test("createSnapshot starts version at 1 for a new entity", () => {
    const { db, store } = makeStore();
    const snap = store.createSnapshot({
      entity: "foo",
      body: "hello",
      author: "captain",
      reason: "initial",
    });
    expect(snap.version).toBe(1);
    expect(snap.entity).toBe("foo");
    expect(snap.body).toBe("hello");
    expect(snap.source).toBe("update");
    db.close();
  });

  test("createSnapshot auto-increments version per entity", () => {
    const { db, store } = makeStore();
    store.createSnapshot({ entity: "foo", body: "v1", author: "captain", reason: "a" });
    store.createSnapshot({ entity: "bar", body: "v1", author: "captain", reason: "a" });
    const foo2 = store.createSnapshot({ entity: "foo", body: "v2", author: "captain", reason: "b" });
    const bar2 = store.createSnapshot({ entity: "bar", body: "v2", author: "captain", reason: "b" });
    expect(foo2.version).toBe(2);
    expect(bar2.version).toBe(2);
    db.close();
  });

  test("createSnapshot stores frontmatter as JSON string", () => {
    const { db, store } = makeStore();
    const snap = store.createSnapshot({
      entity: "foo",
      body: "",
      frontmatter: { status: "plan", score: "0.9" },
      author: "captain",
      reason: "t",
    });
    expect(snap.frontmatter).not.toBeNull();
    const parsed = JSON.parse(snap.frontmatter!);
    expect(parsed.status).toBe("plan");
    expect(parsed.score).toBe("0.9");
    db.close();
  });

  test("createSnapshot persists author, reason, and explicit source", () => {
    const { db, store } = makeStore();
    const snap = store.createSnapshot({
      entity: "foo",
      body: "body",
      author: "fo",
      reason: "integration test",
      source: "create",
    });
    expect(snap.author).toBe("fo");
    expect(snap.reason).toBe("integration test");
    expect(snap.source).toBe("create");
    db.close();
  });

  test("createSnapshot defaults source to 'update'", () => {
    const { db, store } = makeStore();
    const snap = store.createSnapshot({ entity: "foo", body: "x", author: "c", reason: "r" });
    expect(snap.source).toBe("update");
    db.close();
  });

  test("getSnapshot returns null for missing version", () => {
    const { db, store } = makeStore();
    expect(store.getSnapshot("foo", 1)).toBeNull();
    db.close();
  });

  test("getSnapshot returns full row for existing version", () => {
    const { db, store } = makeStore();
    store.createSnapshot({ entity: "foo", body: "alpha", author: "c", reason: "r" });
    const got = store.getSnapshot("foo", 1);
    expect(got).not.toBeNull();
    expect(got!.body).toBe("alpha");
    expect(got!.entity).toBe("foo");
    expect(got!.version).toBe(1);
    db.close();
  });

  test("listVersions returns versions in ascending order", () => {
    const { db, store } = makeStore();
    store.createSnapshot({ entity: "foo", body: "v1", author: "c", reason: "r1" });
    store.createSnapshot({ entity: "foo", body: "v2", author: "c", reason: "r2" });
    store.createSnapshot({ entity: "foo", body: "v3", author: "c", reason: "r3" });
    const versions = store.listVersions("foo");
    expect(versions.length).toBe(3);
    expect(versions[0].version).toBe(1);
    expect(versions[1].version).toBe(2);
    expect(versions[2].version).toBe(3);
    expect(versions[0].reason).toBe("r1");
    db.close();
  });

  test("listVersions returns empty array for unknown entity", () => {
    const { db, store } = makeStore();
    expect(store.listVersions("nope")).toEqual([]);
    db.close();
  });

  test("createSnapshot is atomic — MAX+INSERT cannot collide on duplicate version", () => {
    const { db, store } = makeStore();
    // Simulate a racer trying to force an out-of-band insert at version 1
    // while a normal createSnapshot also computes version 1. The unique
    // index must reject the duplicate.
    db.query(
      `INSERT INTO entity_snapshots
        (entity, version, body, frontmatter, author, reason, source, created_at)
       VALUES (?, 1, ?, NULL, 'racer', 'forced', 'update', ?)`,
    ).run("foo", "racer-body", new Date().toISOString());
    // Now creating through the store should land on version 2 (MAX+1),
    // not collide with the forced v1.
    const snap = store.createSnapshot({
      entity: "foo",
      body: "real",
      author: "captain",
      reason: "r",
    });
    expect(snap.version).toBe(2);
    // And attempting another forced v2 insert must fail with the unique constraint.
    let threw = false;
    try {
      db.query(
        `INSERT INTO entity_snapshots
          (entity, version, body, frontmatter, author, reason, source, created_at)
         VALUES (?, 2, ?, NULL, 'racer', 'forced', 'update', ?)`,
      ).run("foo", "dup", new Date().toISOString());
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    db.close();
  });
});

describe("diffVersions", () => {
  function seed(entity: string, bodies: string[]) {
    const db = openDb(":memory:");
    const store = new SnapshotStore(db);
    for (const b of bodies) {
      store.createSnapshot({ entity, body: b, author: "c", reason: "r" });
    }
    return { db, store };
  }

  test("marks unchanged sections", () => {
    const { db, store } = seed("foo", [
      "## A\nalpha\n## B\nbeta\n",
      "## A\nalpha\n## B\nbeta\n",
    ]);
    const result = store.diffVersions("foo", 1, 2);
    expect(result.sections.length).toBe(2);
    expect(result.sections.every((s) => s.status === "unchanged")).toBe(true);
    db.close();
  });

  test("detects modified sections with patch", () => {
    const { db, store } = seed("foo", [
      "## A\nalpha\n## B\nbeta\n",
      "## A\nalpha-v2\n## B\nbeta\n",
    ]);
    const result = store.diffVersions("foo", 1, 2);
    const sectionA = result.sections.find((s) => s.heading === "## A")!;
    expect(sectionA.status).toBe("modified");
    expect(sectionA.diff).toBeDefined();
    expect(sectionA.diff).toContain("alpha");
    expect(sectionA.diff).toContain("alpha-v2");
    const sectionB = result.sections.find((s) => s.heading === "## B")!;
    expect(sectionB.status).toBe("unchanged");
    db.close();
  });

  test("detects added sections", () => {
    const { db, store } = seed("foo", [
      "## A\nalpha\n",
      "## A\nalpha\n## B\nbeta\n",
    ]);
    const result = store.diffVersions("foo", 1, 2);
    const sectionB = result.sections.find((s) => s.heading === "## B")!;
    expect(sectionB.status).toBe("added");
    db.close();
  });

  test("detects removed sections", () => {
    const { db, store } = seed("foo", [
      "## A\nalpha\n## B\nbeta\n",
      "## A\nalpha\n",
    ]);
    const result = store.diffVersions("foo", 1, 2);
    const sectionB = result.sections.find((s) => s.heading === "## B")!;
    expect(sectionB.status).toBe("removed");
    db.close();
  });

  test("throws on missing version", () => {
    const { db, store } = seed("foo", ["## A\nalpha\n"]);
    expect(() => store.diffVersions("foo", 1, 99)).toThrow();
    expect(() => store.diffVersions("foo", 99, 1)).toThrow();
    db.close();
  });
});

describe("rollbackSection", () => {
  function seed(entity: string, bodies: string[]) {
    const db = openDb(":memory:");
    const store = new SnapshotStore(db);
    for (const b of bodies) {
      store.createSnapshot({ entity, body: b, author: "c", reason: "r" });
    }
    return { db, store };
  }

  test("creates new version with target body for the rolled-back section", () => {
    const { db, store } = seed("foo", [
      "## A\nalpha-v1\n## B\nbeta-v1\n",
      "## A\nalpha-v2\n## B\nbeta-v2\n",
    ]);
    const result = store.rollbackSection({
      entity: "foo",
      currentBody: "## A\nalpha-v2\n## B\nbeta-v2\n",
      currentFrontmatter: {},
      sectionHeading: "## A",
      toVersion: 1,
      author: "captain",
    });
    // Section A should revert to v1 (alpha-v1); B should still be v2 (beta-v2)
    expect(result.newBody).toContain("alpha-v1");
    expect(result.newBody).toContain("beta-v2");
    expect(result.newBody).not.toContain("alpha-v2");
    expect(result.newSnapshot.version).toBe(3);
    db.close();
  });

  test("sets source=rollback and rollback_from_version on new snapshot", () => {
    const { db, store } = seed("foo", [
      "## A\nv1\n",
      "## A\nv2\n",
    ]);
    const result = store.rollbackSection({
      entity: "foo",
      currentBody: "## A\nv2\n",
      currentFrontmatter: {},
      sectionHeading: "## A",
      toVersion: 1,
      author: "captain",
    });
    expect(result.newSnapshot.source).toBe("rollback");
    expect(result.newSnapshot.rollback_from_version).toBe(1);
    expect(result.newSnapshot.rollback_section).toBe("## A");
    db.close();
  });

  test("throws on missing section in target", () => {
    const { db, store } = seed("foo", ["## A\nalpha\n"]);
    expect(() =>
      store.rollbackSection({
        entity: "foo",
        currentBody: "## A\nalpha\n",
        currentFrontmatter: {},
        sectionHeading: "## C",
        toVersion: 1,
        author: "c",
      }),
    ).toThrow(/Section not found in target/);
    db.close();
  });

  test("throws on ambiguous section heading (substring matches multiple)", () => {
    const { db, store } = seed("foo", [
      "## Bug A\nx\n## Bug B\ny\n",
      "## Bug A\nxx\n## Bug B\nyy\n",
    ]);
    expect(() =>
      store.rollbackSection({
        entity: "foo",
        currentBody: "## Bug A\nxx\n## Bug B\nyy\n",
        currentFrontmatter: {},
        sectionHeading: "Bug",
        toVersion: 1,
        author: "c",
      }),
    ).toThrow(/Ambiguous/);
    db.close();
  });
});

describe("findSectionByHeading", () => {
  test("prefers exact match over substring match", () => {
    const md = "## Context\ncontext body\n## Context Addendum\naddendum body\n";
    const sections = parseSections(md);
    const found = findSectionByHeading(sections, "## Context");
    expect(found).not.toBeNull();
    expect(found!.heading).toBe("## Context");
  });

  test("falls back to substring match when no exact match", () => {
    const md = "## Context Addendum\nbody\n";
    const sections = parseSections(md);
    const found = findSectionByHeading(sections, "Addendum");
    expect(found).not.toBeNull();
    expect(found!.heading).toBe("## Context Addendum");
  });

  test("returns null when no match", () => {
    const md = "## Context\nbody\n";
    const sections = parseSections(md);
    expect(findSectionByHeading(sections, "Missing")).toBeNull();
  });
});

describe("replaceSection", () => {
  test("preserves surrounding sections", () => {
    const md = "## A\nalpha\n## B\nbeta\n## C\ngamma\n";
    const sections = parseSections(md);
    const sectionB = sections.find((s) => s.heading === "## B")!;
    const result = replaceSection(md, sectionB, "replaced-body\n");
    expect(result).toContain("## A\nalpha");
    expect(result).toContain("## B\nreplaced-body");
    expect(result).toContain("## C\ngamma");
    expect(result).not.toContain("\nbeta\n");
  });
});
