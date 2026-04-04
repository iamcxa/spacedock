import { readdirSync, existsSync, type Dirent } from "node:fs";
import { join, basename } from "node:path";
import { parseFrontmatter, parseStagesBlock, scanEntities } from "./parsing";
import type { Workflow, WorkflowData } from "./types";

export const IGNORED_DIRS = new Set([
  ".git", ".worktrees", "node_modules", "vendor", "dist", "build", "__pycache__", "tests",
]);

/**
 * Manual recursive walk that mimics Python os.walk() with dirnames pruning.
 * Does NOT use fs.readdirSync({recursive}) because that returns a flat list
 * with no ability to prune directories mid-walk.
 */
function walkDir(
  dir: string,
  callback: (dirPath: string, filenames: string[]) => void
): void {
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(dir, { withFileTypes: true, encoding: "utf-8" }) as Dirent<string>[];
  } catch {
    return;
  }
  const subdirs: string[] = [];
  const filenames: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        subdirs.push(entry.name);
      }
    } else {
      filenames.push(entry.name);
    }
  }
  callback(dir, filenames);
  for (const sub of subdirs) {
    walkDir(join(dir, sub), callback);
  }
}

export function discoverWorkflows(root: string): Workflow[] {
  const workflows: Workflow[] = [];
  walkDir(root, (dirPath, filenames) => {
    if (!filenames.includes("README.md")) return;
    const readmePath = join(dirPath, "README.md");
    const fields = parseFrontmatter(readmePath);
    const commissionedBy = fields["commissioned-by"] ?? "";
    if (commissionedBy.startsWith("spacedock@")) {
      workflows.push({ dir: dirPath, commissioned_by: commissionedBy });
    }
  });
  return workflows;
}

export function aggregateWorkflow(workflowDir: string): WorkflowData | null {
  const readmePath = join(workflowDir, "README.md");
  if (!existsSync(readmePath)) return null;

  const fields = parseFrontmatter(readmePath);
  const stages = parseStagesBlock(readmePath) ?? [];
  const entities = scanEntities(workflowDir);

  const entityCountByStage: Record<string, number> = {};
  for (const e of entities) {
    const status = e.status;
    if (status) {
      entityCountByStage[status] = (entityCountByStage[status] ?? 0) + 1;
    }
  }

  return {
    dir: workflowDir,
    name: basename(workflowDir),
    commissioned_by: fields["commissioned-by"] ?? "",
    entity_type: fields["entity-type"] ?? "",
    entity_label: fields["entity-label"] ?? fields["entity-type"] ?? "entity",
    stages,
    entities,
    entity_count_by_stage: entityCountByStage,
  };
}
