// ABOUTME: Pure diff parsing utilities — extracted from version-history.js for testability.
// ABOUTME: parseDiffHunks converts unified diff patch strings into typed line arrays.

export type DiffLine = { type: "add" | "del" | "ctx"; text: string };

/**
 * Parse a unified diff patch string into an array of typed lines.
 * Skips file headers (---/+++) and hunk headers (@@).
 */
export function parseDiffHunks(patch: string): DiffLine[] {
  const lines = patch.split("\n");
  const result: DiffLine[] = [];
  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith("@@")) continue;
    if (line.startsWith("+")) {
      result.push({ type: "add", text: line.slice(1) });
    } else if (line.startsWith("-")) {
      result.push({ type: "del", text: line.slice(1) });
    } else if (line.startsWith(" ")) {
      result.push({ type: "ctx", text: line.slice(1) });
    }
  }
  return result;
}
