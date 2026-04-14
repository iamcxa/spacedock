// spacebridge/src/domain/session/shutdown.ts
// ABOUTME: Graceful shutdown handler for session registry, file watcher, and heartbeat monitor.
// A-12: on SIGTERM/SIGINT, disconnect all sessions through decider pipeline before exit.
// Order: stop monitor → close watcher → disconnectAll registry.

import type { HeartbeatMonitor } from "./heartbeat-monitor";
import type { FileWatcher } from "./watcher";
import type { SessionRegistry } from "./registry";

export interface ShutdownHandlerOptions {
  registry: SessionRegistry;
  watcher: FileWatcher;
  monitor: HeartbeatMonitor;
}

export function registerShutdownHandler(opts: ShutdownHandlerOptions): void {
  async function shutdown(signal: string): Promise<void> {
    console.log(`[shutdown] received ${signal}, starting graceful shutdown`);
    // 1. Stop heartbeat monitor (no more scans during shutdown)
    opts.monitor.stop();
    // 2. Close all file watchers
    opts.watcher.close();
    // 3. Disconnect all active sessions through decider pipeline (A-12)
    const events = await opts.registry.disconnectAll("shutdown");
    console.log(`[shutdown] disconnected ${events.length} sessions, event log complete`);
  }

  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((err) => {
      console.error("[shutdown] SIGTERM handler error:", err);
    });
  });

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((err) => {
      console.error("[shutdown] SIGINT handler error:", err);
    });
  });
}
