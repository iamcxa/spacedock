import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { parsePipelineStages, parseModHooks } from "./pipeline-parse";

const README_PATH = join(
  import.meta.dir,
  "../../../docs/build-pipeline/README.md"
);
const MODS_DIR = join(
  import.meta.dir,
  "../../../docs/build-pipeline/_mods"
);

describe("parsePipelineStages", () => {
  test("returns 11 stages in correct order from real README.md", () => {
    const stages = parsePipelineStages(README_PATH);
    expect(stages).toHaveLength(11);
    expect(stages.map((s) => s.name)).toEqual([
      "draft",
      "brainstorm",
      "alignment-gate",
      "explore",
      "clarify",
      "plan",
      "execute",
      "quality",
      "review",
      "uat",
      "shipped",
    ]);
  });

  test("gate stages: brainstorm, alignment-gate, clarify, plan, uat", () => {
    const stages = parsePipelineStages(README_PATH);
    const gates = stages.filter((s) => s.gate).map((s) => s.name);
    expect(gates).toContain("brainstorm");
    expect(gates).toContain("alignment-gate");
    expect(gates).toContain("clarify");
    expect(gates).toContain("plan");
    expect(gates).toContain("uat");
    // non-gate stages should NOT be in gates
    expect(gates).not.toContain("draft");
    expect(gates).not.toContain("explore");
    expect(gates).not.toContain("execute");
    expect(gates).not.toContain("shipped");
  });

  test("terminal: shipped is terminal", () => {
    const stages = parsePipelineStages(README_PATH);
    const shipped = stages.find((s) => s.name === "shipped");
    expect(shipped?.terminal).toBe(true);
    // others are not terminal
    const nonTerminal = stages.filter((s) => s.name !== "shipped");
    for (const s of nonTerminal) {
      expect(s.terminal).toBe(false);
    }
  });

  test("initial: draft is initial", () => {
    const stages = parsePipelineStages(README_PATH);
    const draft = stages.find((s) => s.name === "draft");
    expect(draft?.initial).toBe(true);
    // others are not initial
    const nonInitial = stages.filter((s) => s.name !== "draft");
    for (const s of nonInitial) {
      expect(s.initial).toBe(false);
    }
  });

  test("manual: draft and clarify are manual", () => {
    const stages = parsePipelineStages(README_PATH);
    const draft = stages.find((s) => s.name === "draft");
    const clarify = stages.find((s) => s.name === "clarify");
    expect(draft?.manual).toBe(true);
    expect(clarify?.manual).toBe(true);
    // non-manual stages
    const nonManual = stages.filter(
      (s) => s.name !== "draft" && s.name !== "clarify"
    );
    for (const s of nonManual) {
      expect(s.manual).toBe(false);
    }
  });

  test("feedback_to: alignment-gate->brainstorm, quality->execute, review->execute, uat->execute", () => {
    const stages = parsePipelineStages(README_PATH);
    const byName = Object.fromEntries(stages.map((s) => [s.name, s]));
    expect(byName["alignment-gate"].feedback_to).toBe("brainstorm");
    expect(byName["quality"].feedback_to).toBe("execute");
    expect(byName["review"].feedback_to).toBe("execute");
    expect(byName["uat"].feedback_to).toBe("execute");
    // stages without feedback-to
    expect(byName["draft"].feedback_to).toBe("");
    expect(byName["brainstorm"].feedback_to).toBe("");
    expect(byName["shipped"].feedback_to).toBe("");
  });

  test("returns [] for non-existent path", () => {
    const stages = parsePipelineStages("/non/existent/path/README.md");
    expect(stages).toEqual([]);
  });
});

describe("parseModHooks", () => {
  test("pr-review-loop has hooks [startup, idle, merge]", () => {
    const hookMap = parseModHooks(MODS_DIR);
    expect(hookMap.has("pr-review-loop")).toBe(true);
    const hooks = hookMap.get("pr-review-loop")!;
    expect(hooks).toContain("startup");
    expect(hooks).toContain("idle");
    expect(hooks).toContain("merge");
    expect(hooks).toHaveLength(3);
  });

  test("returns empty Map for non-existent directory", () => {
    const hookMap = parseModHooks("/non/existent/mods/dir");
    expect(hookMap.size).toBe(0);
  });
});
