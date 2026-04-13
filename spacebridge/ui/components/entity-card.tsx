import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { EntityCard } from "@/lib/entity-scan";

interface EntityCardProps {
  entity: EntityCard;
  lease?: { role: string; sessionId: string };
}

export function EntityCardComponent({ entity, lease }: EntityCardProps) {
  return (
    <TooltipProvider>
      <Link href={`/entity/${entity.slug}`} className="block">
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-sm font-mono truncate">{entity.slug}</CardTitle>
              {lease && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {lease.role}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Leased by session {lease.sessionId}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{entity.title}</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">{entity.status}</Badge>
              {entity.stage && (
                <Badge variant="outline" className="text-xs">{entity.stage}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </TooltipProvider>
  );
}
