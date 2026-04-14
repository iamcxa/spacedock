// spacebridge/ui/components/stage-timeline.tsx
// ABOUTME: Server Component — vertical stage transition timeline from events table.

import { Separator } from "@/components/ui/separator";

interface StageTransition {
  id: number;
  stage: string;
  agent: string;
  timestamp: number;
  detail: string | null;
}

interface StageTimelineProps {
  transitions: StageTransition[];
}

function formatTimestamp(epochMs: number): string {
  return new Date(epochMs).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TimelineEntry({ transition }: { transition: StageTransition }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-2 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium font-mono">{transition.stage}</span>
          <span className="text-xs text-muted-foreground">{transition.agent}</span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {formatTimestamp(transition.timestamp)}
          </span>
        </div>
        {transition.detail && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{transition.detail}</p>
        )}
      </div>
    </div>
  );
}

export function StageTimeline({ transitions }: StageTimelineProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
        Stage History
      </h2>
      <div className="rounded-lg border p-3">
        {transitions.map((t, i) => (
          <div key={t.id}>
            <TimelineEntry transition={t} />
            {i < transitions.length - 1 && <Separator className="ml-5" />}
          </div>
        ))}
      </div>
    </div>
  );
}
