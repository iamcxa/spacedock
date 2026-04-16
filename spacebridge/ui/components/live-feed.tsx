"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSSE } from "@/lib/sse-context";

function formatRelative(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function LiveFeed() {
  const { events, status } = useSSE();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest (top) when events change — per MEMORY auto-scroll direction gotcha
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [events]);

  return (
    <div className="flex flex-col h-full border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Live Feed</h3>
        {status === "reconnecting" && (
          <span className="text-xs text-destructive">Reconnecting...</span>
        )}
        {status === "connected" && (
          <span className="text-xs text-muted-foreground">{events.length} events</span>
        )}
      </div>
      <ScrollArea className="flex-1" ref={scrollRef}>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Waiting for events...</p>
        ) : (
          <div className="space-y-1">
            {events.map((entry) => (
              <div key={`${entry.id}-${entry.timestamp}`} className="text-xs p-2 rounded bg-muted">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-mono font-medium truncate">{entry.entity}</span>
                  <span className="text-muted-foreground shrink-0">
                    {formatRelative(entry.timestamp)}
                  </span>
                </div>
                <div className="text-muted-foreground truncate">
                  {entry.type} → {entry.stage}
                  {entry.detail && <span> · {entry.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
