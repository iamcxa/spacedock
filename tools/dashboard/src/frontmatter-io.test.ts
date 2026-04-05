import { describe, test, expect } from "bun:test";
import { updateWorkflowStages } from "./frontmatter-io";
import type { Stage } from "./types";

const SAMPLE_README = [
  "---",
  "commissioned-by: spacedock@test",
  "entity-type: feature",
  "stages:",
  "  defaults:",
  "    worktree: true",
  "    concurrency: 2",
  "  states:",
  "    - name: explore",
  "      initial: true",
  "      model: sonnet",
  "    - name: quality",
  "      feedback-to: execute",
  "      model: haiku",
  "    - name: shipped",
  "      terminal: true",
  "      worktree: false",
  "---",
  "",
  "# Pipeline Description",
  "",
  "Body content preserved.",
].join("\n");

function makeStage(overrides: Partial<Stage> & { name: string }): Stage {
  return {
    worktree: true,
    concurrency: 2,
    gate: false,
    terminal: false,
    initial: false,
    feedback_to: "",
    conditional: false,
    model: "",
    ...overrides,
  };
}

describe("updateWorkflowStages", () => {
  test("replaces states block with new stages", () => {
    const stages: Stage[] = [
      makeStage({ name: "explore", initial: true, model: "sonnet" }),
      makeStage({ name: "build", model: "opus" }),
      makeStage({ name: "shipped", terminal: true, worktree: false }),
    ];
    const result = updateWorkflowStages(SAMPLE_README, stages);

    // Body preserved
    expect(result).toContain("# Pipeline Description");
    expect(result).toContain("Body content preserved.");

    // Non-stage frontmatter preserved
    expect(result).toContain("commissioned-by: spacedock@test");
    expect(result).toContain("entity-type: feature");

    // Defaults preserved
    expect(result).toContain("worktree: true");
    expect(result).toContain("concurrency: 2");

    // New stages present
    expect(result).toContain("- name: explore");
    expect(result).toContain("- name: build");
    expect(result).toContain("- name: shipped");

    // Old stages removed
    expect(result).not.toContain("- name: quality");
  });

  test("writes feedback-to field", () => {
    const stages: Stage[] = [
      makeStage({ name: "execute" }),
      makeStage({ name: "quality", feedback_to: "execute", model: "haiku" }),
      makeStage({ name: "shipped", terminal: true, worktree: false }),
    ];
    const result = updateWorkflowStages(SAMPLE_README, stages);
    expect(result).toContain("feedback-to: execute");
  });

  test("writes gate and conditional flags", () => {
    const stages: Stage[] = [
      makeStage({ name: "plan", gate: true }),
      makeStage({ name: "seeding", conditional: true }),
      makeStage({ name: "shipped", terminal: true, worktree: false }),
    ];
    const result = updateWorkflowStages(SAMPLE_README, stages);
    expect(result).toContain("gate: true");
    expect(result).toContain("conditional: true");
  });

  test("omits false booleans and empty strings", () => {
    const stages: Stage[] = [
      makeStage({ name: "explore" }),
      makeStage({ name: "shipped", terminal: true, worktree: false }),
    ];
    const result = updateWorkflowStages(SAMPLE_README, stages);

    const lines = result.split("\n");
    const exploreIdx = lines.findIndex((l) => l.includes("- name: explore"));
    const nextLine = lines[exploreIdx + 1];
    expect(nextLine).not.toContain("gate: false");
    expect(nextLine).not.toContain("feedback-to:");
  });

  test("preserves valid YAML frontmatter boundaries", () => {
    const stages: Stage[] = [makeStage({ name: "explore" })];
    const result = updateWorkflowStages(SAMPLE_README, stages);
    const lines = result.split("\n");
    expect(lines[0]).toBe("---");
    const secondDash = lines.indexOf("---", 1);
    expect(secondDash).toBeGreaterThan(0);
  });

  test("throws on missing frontmatter", () => {
    expect(() => updateWorkflowStages("no frontmatter here", [])).toThrow("Missing YAML frontmatter");
  });
});
