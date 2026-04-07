import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseStagesBlock, parseDependsOn } from "./parsing";

const TMP = join(import.meta.dir, "__test_parsing__");

describe("parseStagesBlock extended fields", () => {
  beforeAll(() => {
    mkdirSync(TMP, { recursive: true });

    writeFileSync(
      join(TMP, "README.md"),
      [
        "---",
        "commissioned-by: spacedock@test",
        "stages:",
        "  defaults:",
        "    worktree: true",
        "    concurrency: 2",
        "  states:",
        "    - name: explore",
        "      initial: true",
        "      model: sonnet",
        "    - name: execute",
        "      model: opus",
        "    - name: quality",
        "      feedback-to: execute",
        "      model: haiku",
        "    - name: pr-review",
        "      gate: true",
        "      feedback-to: execute",
        "      model: opus",
        "    - name: shipped",
        "      terminal: true",
        "      worktree: false",
        "---",
        "",
      ].join("\n")
    );
  });

  afterAll(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  test("parses feedback_to from feedback-to field", () => {
    const stages = parseStagesBlock(join(TMP, "README.md"));
    expect(stages).not.toBeNull();

    const quality = stages!.find((s) => s.name === "quality");
    expect(quality).toBeDefined();
    expect(quality!.feedback_to).toBe("execute");

    const prReview = stages!.find((s) => s.name === "pr-review");
    expect(prReview).toBeDefined();
    expect(prReview!.feedback_to).toBe("execute");
  });

  test("feedback_to defaults to empty string when absent", () => {
    const stages = parseStagesBlock(join(TMP, "README.md"));
    const explore = stages!.find((s) => s.name === "explore");
    expect(explore!.feedback_to).toBe("");
  });

  test("parses model field", () => {
    const stages = parseStagesBlock(join(TMP, "README.md"));
    expect(stages!.find((s) => s.name === "explore")!.model).toBe("sonnet");
    expect(stages!.find((s) => s.name === "quality")!.model).toBe("haiku");
    expect(stages!.find((s) => s.name === "shipped")!.model).toBe("");
  });

  test("conditional defaults to false", () => {
    const stages = parseStagesBlock(join(TMP, "README.md"));
    for (const stage of stages!) {
      expect(stage.conditional).toBe(false);
    }
  });

  test("preserves existing fields", () => {
    const stages = parseStagesBlock(join(TMP, "README.md"));
    expect(stages!.find((s) => s.name === "explore")!.initial).toBe(true);
    expect(stages!.find((s) => s.name === "pr-review")!.gate).toBe(true);
    expect(stages!.find((s) => s.name === "shipped")!.terminal).toBe(true);
    expect(stages!.find((s) => s.name === "shipped")!.worktree).toBe(false);
  });
});

describe("parseDependsOn", () => {
  test("parses bracket-wrapped ID list", () => {
    expect(parseDependsOn("[007, 016]")).toEqual([7, 16]);
  });

  test("parses single ID", () => {
    expect(parseDependsOn("[003]")).toEqual([3]);
  });

  test("returns empty array for empty string", () => {
    expect(parseDependsOn("")).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(parseDependsOn(undefined)).toEqual([]);
  });

  test("handles no brackets (bare numbers)", () => {
    expect(parseDependsOn("007, 016")).toEqual([7, 16]);
  });

  test("handles whitespace variations", () => {
    expect(parseDependsOn("[ 007 , 016 ]")).toEqual([7, 16]);
  });
});
