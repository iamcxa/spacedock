import { join } from "node:path";
import { gt } from "drizzle-orm";
import { EmptyState } from "@/components/empty-state";
import { type RepoData, WarRoom } from "@/components/war-room";
import { scanEntitiesForRepo } from "@/lib/entity-scan";
import { parseModHooks, parsePipelineStages } from "@/lib/pipeline-parse";
import { entityLeases, sessions } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function Page() {
  let connectedSessions: { projectRoot: string; sessionId: string }[] = [];
  const leaseMap: Record<string, { role: string; sessionId: string }> = {};

  try {
    const { openReadOnlyDb } = await import("@/lib/db");
    const handle = openReadOnlyDb();
    connectedSessions = handle.db
      .select({
        projectRoot: sessions.projectRoot,
        sessionId: sessions.sessionId,
      })
      .from(sessions)
      .all();

    const activeLeases = handle.db
      .select({
        entitySlug: entityLeases.entitySlug,
        role: entityLeases.role,
        sessionId: entityLeases.sessionId,
      })
      .from(entityLeases)
      .where(gt(entityLeases.expiresAt, Date.now()))
      .all();

    for (const lease of activeLeases) {
      leaseMap[lease.entitySlug] = { role: lease.role, sessionId: lease.sessionId };
    }
  } catch {
    // DB not available (daemon not running) — show empty state
  }

  if (connectedSessions.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <EmptyState />
      </main>
    );
  }

  const uniqueRoots = [...new Map(connectedSessions.map((s) => [s.projectRoot, s])).values()];

  const repoDataList = await Promise.all(
    uniqueRoots.map(async (s): Promise<RepoData> => {
      const label = s.projectRoot.split("/").pop() ?? s.projectRoot;
      const entities = await scanEntitiesForRepo(s.projectRoot, label);
      return { repoLabel: label, entities };
    }),
  );

  const nonEmpty = repoDataList.filter((r) => r.entities.length > 0);

  if (nonEmpty.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <EmptyState />
      </main>
    );
  }

  // Parse pipeline stages from first non-empty repo's README
  let stages: ReturnType<typeof parsePipelineStages> = [];
  for (const s of uniqueRoots) {
    const result = parsePipelineStages(join(s.projectRoot, "docs", "build-pipeline", "README.md"));
    if (result.length > 0) {
      stages = result;
      break;
    }
  }

  // Compute entity counts by stage (status field)
  const entityCountByStage: Record<string, number> = {};
  for (const repo of nonEmpty) {
    for (const e of repo.entities) {
      entityCountByStage[e.status] = (entityCountByStage[e.status] ?? 0) + 1;
    }
  }

  // Parse mod hooks from workflow and library mods dirs
  const mergedModHooks = new Map<string, string[]>();
  for (const s of uniqueRoots) {
    for (const [k, v] of parseModHooks(join(s.projectRoot, "docs", "build-pipeline", "_mods"))) {
      mergedModHooks.set(k, v);
    }
    for (const [k, v] of parseModHooks(join(s.projectRoot, "mods"))) {
      mergedModHooks.set(k, v);
    }
  }

  const mergeHooks: string[] = [];
  const lifecycleHooks: string[] = [];
  for (const [modName, hooks] of mergedModHooks) {
    for (const hook of hooks) {
      if (hook === "merge") {
        mergeHooks.push(modName);
      } else if (hook === "startup" || hook === "idle") {
        lifecycleHooks.push(modName);
      }
    }
  }
  const modHooks = { merge: mergeHooks, lifecycle: lifecycleHooks };

  return (
    <main className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)]">
      <h1 className="text-xl font-bold mb-4">Spacebridge War Room</h1>
      <WarRoom
        repos={nonEmpty}
        leaseMap={leaseMap}
        stages={stages}
        entityCountByStage={entityCountByStage}
        modHooks={modHooks}
      />
    </main>
  );
}
