"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EntityCard } from "@/lib/entity-scan";
import type { PipelineStage } from "@/lib/pipeline-parse";
import { SSEProvider } from "@/lib/sse-context";
import { LiveFeed } from "./live-feed";
import { PipelineGraph } from "./pipeline-graph";
import { RepoSection } from "./repo-section";

export interface RepoData {
  repoLabel: string;
  entities: EntityCard[];
}

interface WarRoomProps {
  repos: RepoData[];
  leaseMap: Record<string, { role: string; sessionId: string }>;
  stages: PipelineStage[];
  entityCountByStage: Record<string, number>;
  modHooks: { merge: string[]; lifecycle: string[] };
}

export function WarRoom({ repos, leaseMap, stages, entityCountByStage, modHooks }: WarRoomProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStage = searchParams.get("stage") ?? undefined;

  const allEntities = repos.flatMap((r) => r.entities);
  const totalEntityCount = allEntities.length;

  function handleStageClick(stageName: string) {
    if (activeStage === stageName) {
      router.push("/", { scroll: false });
    } else {
      router.push(`?stage=${stageName}`, { scroll: false });
    }
  }

  // Filter repos by active stage if set
  const filteredRepos = activeStage
    ? repos
        .map((repo) => ({
          ...repo,
          entities: repo.entities.filter((e) => e.status === activeStage),
        }))
        .filter((repo) => repo.entities.length > 0)
    : repos;

  return (
    <SSEProvider>
      <div className="flex gap-4 h-full">
        <div className="flex-1 min-w-0">
          {/* Workflow header */}
          <div className="mb-3">
            <div className="font-bold text-sm">build-pipeline</div>
            <div className="text-xs text-muted-foreground">features · {totalEntityCount} total</div>
          </div>

          {/* Pipeline graph */}
          {stages.length > 0 && (
            <div className="mb-4">
              <PipelineGraph
                stages={stages}
                entityCountByStage={entityCountByStage}
                modHooks={modHooks}
                activeStage={activeStage}
                onStageClick={handleStageClick}
              />
              {activeStage && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                    stage: {activeStage}
                    <button
                      type="button"
                      className="ml-1 hover:opacity-70"
                      onClick={() => router.push("/", { scroll: false })}
                      aria-label="Clear stage filter"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({totalEntityCount})</TabsTrigger>
              {repos.map((repo) => (
                <TabsTrigger key={repo.repoLabel} value={repo.repoLabel}>
                  {repo.repoLabel}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              {filteredRepos.map((repo) => (
                <RepoSection
                  key={repo.repoLabel}
                  repoLabel={repo.repoLabel}
                  entities={repo.entities}
                  leaseMap={leaseMap}
                />
              ))}
            </TabsContent>

            {repos.map((repo) => {
              const filtered = activeStage
                ? repo.entities.filter((e) => e.status === activeStage)
                : repo.entities;
              return (
                <TabsContent key={repo.repoLabel} value={repo.repoLabel}>
                  <RepoSection repoLabel={repo.repoLabel} entities={filtered} leaseMap={leaseMap} />
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <div className="w-80 shrink-0">
          <LiveFeed />
        </div>
      </div>
    </SSEProvider>
  );
}
