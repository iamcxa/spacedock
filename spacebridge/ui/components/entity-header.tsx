// spacebridge/ui/components/entity-header.tsx
// ABOUTME: Server Component — entity header card with title, status/stage/intent badges.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EntityHeaderProps {
  title: string;
  status: string;
  stage: string;
  id: string;
  intent: string;
  scale: string;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "shipped": return "default";
    case "plan":
    case "execute":
    case "review": return "secondary";
    case "blocked": return "destructive";
    default: return "outline";
  }
}

export function EntityHeader({ title, status, stage, id, intent, scale }: EntityHeaderProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl leading-tight">{title}</CardTitle>
          <span className="text-xs text-muted-foreground font-mono shrink-0">#{id}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariant(status)}>{status}</Badge>
          {stage && <Badge variant="outline">{stage}</Badge>}
          {intent && <Badge variant="secondary">{intent}</Badge>}
          {scale && (
            <Badge variant="outline" className="text-muted-foreground">
              {scale}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
