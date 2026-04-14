"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FeedEntry {
  id: number;
  type: string;
  entity: string;
  stage: string;
  agent: string;
  timestamp: number;
  detail?: string | null;
}

function formatRelative(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function LiveFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onopen = () => setStatus("connected");
    es.onerror = () => setStatus("reconnecting");
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as FeedEntry;
        setEntries((prev) => [evt, ...prev].slice(0, 200));
      } catch {
        // ignore malformed events
      }
    };
    return () => es.close();
  }, []);

  // Auto-scroll to newest (top) when entries change — per MEMORY auto-scroll direction gotcha
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="flex flex-col h-full border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Live Feed</h3>
        {status === "reconnecting" && (
          <span className="text-xs text-destructive">Reconnecting...</span>
        )}
        {status === "connected" && (
          <span className="text-xs text-muted-foreground">{entries.length} events</span>
        )}
      </div>
      <ScrollArea className="flex-1" ref={scrollRef}>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Waiting for events...</p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => (
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
