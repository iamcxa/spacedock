"use client";

// ABOUTME: Shared SSE context provider. Extracts EventSource logic from LiveFeed so both
// LiveFeed and PipelineGraph share a single SSE connection (O-2 decision, entity 094).

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface SSEEvent {
  id: number;
  type: string;
  entity: string;
  stage: string;
  agent: string;
  timestamp: number;
  detail?: string | null;
}

interface SSEContextValue {
  events: SSEEvent[];
  status: "connecting" | "connected" | "reconnecting";
}

const SSEContext = createContext<SSEContextValue | null>(null);

export function SSEProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onopen = () => setStatus("connected");
    es.onerror = () => setStatus("reconnecting");
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as SSEEvent;
        setEvents((prev) => [evt, ...prev].slice(0, 200));
      } catch {
        // ignore malformed events
      }
    };
    return () => es.close();
  }, []);

  return <SSEContext.Provider value={{ events, status }}>{children}</SSEContext.Provider>;
}

export function useSSE(): SSEContextValue {
  const ctx = useContext(SSEContext);
  if (!ctx) {
    throw new Error("useSSE must be used within SSEProvider");
  }
  return ctx;
}
