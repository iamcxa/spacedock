"use client";
// spacebridge/ui/components/connection-indicator.tsx
// ABOUTME: Header widget showing CC session connection status.
// Polls /api/daemon/status every 10s. Shows green dot + count when connected,
// yellow when no sessions, red when daemon unreachable.

import { useCallback, useEffect, useState } from "react";

type ConnState = "connected" | "no-sessions" | "unreachable" | "loading";

interface DaemonStatus {
  connectedSessions: number;
  totalSessions: number;
  uptimeMs: number;
}

export function ConnectionIndicator() {
  const [state, setState] = useState<ConnState>("loading");
  const [status, setStatus] = useState<DaemonStatus | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/daemon/status");
      if (!res.ok) {
        setState("unreachable");
        setStatus(null);
        return;
      }
      const data = (await res.json()) as DaemonStatus;
      setStatus(data);
      setState(data.connectedSessions > 0 ? "connected" : "no-sessions");
    } catch {
      setState("unreachable");
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, 10_000);
    return () => clearInterval(timer);
  }, [poll]);

  const dotColor =
    state === "connected"
      ? "bg-green-400"
      : state === "no-sessions"
        ? "bg-yellow-400"
        : state === "unreachable"
          ? "bg-red-400"
          : "bg-muted-foreground/40 animate-pulse";

  const label =
    state === "connected"
      ? `${status?.connectedSessions} CC session${(status?.connectedSessions ?? 0) > 1 ? "s" : ""}`
      : state === "no-sessions"
        ? "No CC sessions"
        : state === "unreachable"
          ? "Daemon offline"
          : "...";

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title={label}>
      <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </div>
  );
}
