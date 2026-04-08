import { describe, test, expect } from "bun:test";
import { parseDiffHunks } from "./diff-utils";

describe("parseDiffHunks", () => {
  test("returns empty array for empty patch", () => {
    expect(parseDiffHunks("")).toEqual([]);
  });

  test("classifies added lines", () => {
    const patch = "+added line";
    const result = parseDiffHunks(patch);
    expect(result).toEqual([{ type: "add", text: "added line" }]);
  });

  test("classifies removed lines", () => {
    const patch = "-removed line";
    const result = parseDiffHunks(patch);
    expect(result).toEqual([{ type: "del", text: "removed line" }]);
  });

  test("classifies context lines", () => {
    const patch = " context line";
    const result = parseDiffHunks(patch);
    expect(result).toEqual([{ type: "ctx", text: "context line" }]);
  });

  test("skips --- and +++ file header lines", () => {
    const patch = "--- a/file.md\n+++ b/file.md\n+real add";
    const result = parseDiffHunks(patch);
    expect(result).toEqual([{ type: "add", text: "real add" }]);
  });

  test("skips @@ hunk header lines", () => {
    const patch = "@@ -1,3 +1,4 @@\n context\n+added";
    const result = parseDiffHunks(patch);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "ctx", text: "context" });
    expect(result[1]).toEqual({ type: "add", text: "added" });
  });

  test("handles mixed patch with all three types", () => {
    const patch = [
      "--- a/entity.md",
      "+++ b/entity.md",
      "@@ -1,4 +1,4 @@",
      " unchanged line",
      "-old line",
      "+new line",
      " another unchanged",
    ].join("\n");
    const result = parseDiffHunks(patch);
    expect(result).toEqual([
      { type: "ctx", text: "unchanged line" },
      { type: "del", text: "old line" },
      { type: "add", text: "new line" },
      { type: "ctx", text: "another unchanged" },
    ]);
  });

  test("ignores lines that do not start with +, -, or space", () => {
    const patch = "some random line\n+added";
    const result = parseDiffHunks(patch);
    expect(result).toEqual([{ type: "add", text: "added" }]);
  });

  test("slices the sigil character from text", () => {
    const patch = "+ leading space preserved";
    const result = parseDiffHunks(patch);
    expect(result[0].text).toBe(" leading space preserved");
  });
});
