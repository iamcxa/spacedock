"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EntityCard } from "@/lib/entity-scan";
import { LiveFeed } from "./live-feed";
import { RepoSection } from "./repo-section";

export interface RepoData {
  repoLabel: string;
  entities: EntityCard[];
}

interface WarRoomProps {
  repos: RepoData[];
  leaseMap: Record<string, { role: string; sessionId: string }>;
}

export function WarRoom({ repos, leaseMap }: WarRoomProps) {
  const allEntities = repos.flatMap((r) => r.entities);

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 min-w-0">
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({allEntities.length})</TabsTrigger>
            {repos.map((repo) => (
              <TabsTrigger key={repo.repoLabel} value={repo.repoLabel}>
                {repo.repoLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            {repos.map((repo) => (
              <RepoSection
                key={repo.repoLabel}
                repoLabel={repo.repoLabel}
                entities={repo.entities}
                leaseMap={leaseMap}
              />
            ))}
          </TabsContent>

          {repos.map((repo) => (
            <TabsContent key={repo.repoLabel} value={repo.repoLabel}>
              <RepoSection
                repoLabel={repo.repoLabel}
                entities={repo.entities}
                leaseMap={leaseMap}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <div className="w-80 shrink-0">
        <LiveFeed />
      </div>
    </div>
  );
}
