import { scanEntitiesForRepo } from "@/lib/entity-scan";
import { sessions, entityLeases } from "@/lib/schema";
import { gt } from "drizzle-orm";
import { WarRoom, type RepoData } from "@/components/war-room";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function Page() {
  let connectedSessions: { projectRoot: string; sessionId: string }[] = [];
  let leaseMap: Record<string, { role: string; sessionId: string }> = {};

  try {
    const { openReadOnlyDb } = await import("@/lib/db");
    const handle = openReadOnlyDb();
    connectedSessions = handle.db.select({
      projectRoot: sessions.projectRoot,
      sessionId: sessions.sessionId,
    }).from(sessions).all();

    const activeLeases = handle.db.select({
      entitySlug: entityLeases.entitySlug,
      role: entityLeases.role,
      sessionId: entityLeases.sessionId,
    }).from(entityLeases).where(gt(entityLeases.expiresAt, Date.now())).all();

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
    })
  );

  const nonEmpty = repoDataList.filter((r) => r.entities.length > 0);

  if (nonEmpty.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <EmptyState />
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 h-[calc(100vh-4rem)]">
      <h1 className="text-xl font-bold mb-4">Spacebridge War Room</h1>
      <WarRoom repos={nonEmpty} leaseMap={leaseMap} />
    </main>
  );
}
