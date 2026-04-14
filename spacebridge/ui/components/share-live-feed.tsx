"use client";

// ABOUTME: ShareLiveFeed — entity-filtered SSE feed for share view.
// Connects to /api/share/events?token=<token>, filters by entitySlug client-side
// (defense-in-depth per MEMORY). Shows reconnect banner on disconnect (A-13).

import { useState, useEffect } from "react";
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

interface ShareLiveFeedProps {
  token: string;
  entitySlug: string;
}

export function ShareLiveFeed({ token, entitySlug }: ShareLiveFeedProps) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  useEffect(() => {
    const url = `/api/share/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onopen = () => setStatus("connected");
    es.onerror = () => setStatus("reconnecting");
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as FeedEntry;
        // Defense-in-depth: filter to scoped entity (MEMORY: client-side filter)
        if (evt.entity !== entitySlug) return;
        setEntries((prev) => [evt, ...prev].slice(0, 100));
      } catch { /* ignore malformed events */ }
    };

    return () => es.close();
  }, [token, entitySlug]);

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Live Updates</h3>
        {status === "reconnecting" && (
          <span className="text-xs text-destructive">Reconnecting...</span>
        )}
        {status === "connected" && entries.length > 0 && (
          <span className="text-xs text-muted-foreground">{entries.length} events</span>
        )}
      </div>
      <ScrollArea className="h-40">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Waiting for updates...</p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => (
              <div key={`${entry.id}-${entry.timestamp}`} className="text-xs p-2 rounded bg-muted">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-mono font-medium">{entry.type}</span>
                  <span className="text-muted-foreground shrink-0">{formatRelative(entry.timestamp)}</span>
                </div>
                {entry.detail && (
                  <div className="text-muted-foreground truncate">{entry.detail}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
