import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { aggregateWorkflow } from "./discovery";

const TMP = join(import.meta.dir, "__test_workflow__");

function writeEntity(dir: string, filename: string, frontmatter: Record<string, string>) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(frontmatter)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push("---", "");
  writeFileSync(join(dir, filename), lines.join("\n"));
}

describe("aggregateWorkflow with _archive/", () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });
    mkdirSync(join(TMP, "_archive"), { recursive: true });

    // README with workflow frontmatter
    writeFileSync(
      join(TMP, "README.md"),
      [
        "---",
        "commissioned-by: spacedock@test",
        "entity-type: feature",
        "entity-label: feature",
        "stages:",
        "  states:",
        "    - name: explore",
        "    - name: plan",
        "    - name: execute",
        "---",
        "",
      ].join("\n")
    );

    // Active entities
    writeEntity(TMP, "active-one.md", { id: "001", title: "Active One", status: "explore", score: "0.8", source: "test" });
    writeEntity(TMP, "active-two.md", { id: "002", title: "Active Two", status: "plan", score: "0.7", source: "test" });

    // Archived entities
    writeEntity(join(TMP, "_archive"), "shipped-one.md", { id: "003", title: "Shipped One", status: "shipped", score: "0.9", source: "test" });
    writeEntity(join(TMP, "_archive"), "shipped-two.md", { id: "004", title: "Shipped Two", status: "shipped", score: "0.85", source: "test" });
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  test("includes archived entities with archived field", () => {
    const data = aggregateWorkflow(TMP);
    expect(data).not.toBeNull();

    const entities = data!.entities;
    // Should have 4 total entities (2 active + 2 archived)
    expect(entities.length).toBe(4);

    const archived = entities.filter((e) => e.archived === "true");
    expect(archived.length).toBe(2);
    expect(archived.map((e) => e.slug).sort()).toEqual(["shipped-one", "shipped-two"]);

    const active = entities.filter((e) => e.archived !== "true");
    expect(active.length).toBe(2);
  });

  test("archived entities do not inflate active stage counts", () => {
    const data = aggregateWorkflow(TMP);
    expect(data).not.toBeNull();

    // "shipped" status should be counted separately, not mixed into explore/plan/execute
    expect(data!.entity_count_by_stage["explore"]).toBe(1);
    expect(data!.entity_count_by_stage["plan"]).toBe(1);
    expect(data!.entity_count_by_stage["shipped"]).toBe(2);
  });

  test("works when _archive/ does not exist", () => {
    // Create a temp workflow without _archive/
    const noArchive = join(import.meta.dir, "__test_no_archive__");
    mkdirSync(noArchive, { recursive: true });
    writeFileSync(
      join(noArchive, "README.md"),
      "---\ncommissioned-by: spacedock@test\nentity-type: feature\n---\n"
    );
    writeEntity(noArchive, "only-one.md", { id: "001", title: "Only One", status: "explore", score: "0.5", source: "test" });

    const data = aggregateWorkflow(noArchive);
    expect(data).not.toBeNull();
    expect(data!.entities.length).toBe(1);
    expect(data!.entities[0].archived).toBeUndefined();

    rmSync(noArchive, { recursive: true, force: true });
  });
});
