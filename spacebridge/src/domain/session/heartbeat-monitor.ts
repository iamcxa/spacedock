// spacebridge/src/domain/session/heartbeat-monitor.ts
// ABOUTME: Daemon-side heartbeat monitor. Scans SessionState on setInterval for stale sessions
// and calls registry.disconnect("timeout") for any session where now - lastHeartbeat > timeoutMs.

import type { SessionRegistry } from "./registry";

export interface HeartbeatMonitorOptions {
  registry: SessionRegistry;
  timeoutMs: number;   // how long without heartbeat before session is considered stale
  intervalMs: number;  // how often to scan (should be << timeoutMs)
  now?: () => number;
}

export interface HeartbeatMonitor {
  start(): void;
  stop(): void;
}

export function createHeartbeatMonitor(opts: HeartbeatMonitorOptions): HeartbeatMonitor {
  const getNow = opts.now ?? (() => Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;

  async function scan(): Promise<void> {
    const now = getNow();
    const state = opts.registry.getState();
    for (const [sessionId, record] of state.sessions) {
      if (now - record.lastHeartbeat > opts.timeoutMs) {
        try {
          await opts.registry.disconnect(sessionId, "timeout");
        } catch {
          // idempotent: session may have disconnected between scan and disconnect
        }
      }
    }
  }

  return {
    start(): void {
      if (timer) return; // already running
      timer = setInterval(() => {
        scan().catch((err) => {
          console.error("[heartbeat-monitor] scan error:", err);
        });
      }, opts.intervalMs);
    },

    stop(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}
