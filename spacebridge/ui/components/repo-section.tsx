import type { EntityCard } from "@/lib/entity-scan";
import { EntityCardComponent } from "./entity-card";

interface RepoSectionProps {
  repoLabel: string;
  entities: EntityCard[];
  leaseMap: Record<string, { role: string; sessionId: string }>;
}

export function RepoSection({ repoLabel, entities, leaseMap }: RepoSectionProps) {
  return (
    <details open className="mb-6">
      <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-3 select-none">
        {repoLabel} ({entities.length})
      </summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
        {entities.map((entity) => (
          <EntityCardComponent key={entity.slug} entity={entity} lease={leaseMap[entity.slug]} />
        ))}
      </div>
    </details>
  );
}
