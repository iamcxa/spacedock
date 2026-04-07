// ABOUTME: Pure module tracking pending permission requests and computing
// ABOUTME: conversation-continues / timeout resolution signals. Duplicated into
// ABOUTME: static/activity.js for classic-IIFE runtime consumption.

export type TrackedEvent = {
  type: string; // "permission_request" | "channel_message" | "channel_response" | "permission_response" | ...
  seq: number;
  request_id?: string; // present on permission_request
  timestamp_ms: number; // client receive time, used for 30s timeout
};

export type PermissionTracker = {
  track(event: TrackedEvent): string[];
  tick(now_ms: number): string[];
  resolve(request_id: string): void;
  _pending(): ReadonlyArray<{ request_id: string; seq: number; timestamp_ms: number }>;
};

const TIMEOUT_MS = 30_000;

export function createPermissionTracker(): PermissionTracker {
  const pending = new Map<string, { seq: number; timestamp_ms: number }>();

  function track(event: TrackedEvent): string[] {
    if (event.type === "permission_request" && event.request_id) {
      pending.set(event.request_id, { seq: event.seq, timestamp_ms: event.timestamp_ms });
      return [];
    }
    // Conversation-continues heuristic: any non-permission_request event
    // resolves all pending requests with seq strictly less than this event's seq.
    const resolved: string[] = [];
    for (const [id, entry] of pending) {
      if (entry.seq < event.seq) {
        resolved.push(id);
      }
    }
    for (const id of resolved) {
      pending.delete(id);
    }
    return resolved;
  }

  function tick(now_ms: number): string[] {
    const expired: string[] = [];
    for (const [id, entry] of pending) {
      if (now_ms - entry.timestamp_ms >= TIMEOUT_MS) {
        expired.push(id);
      }
    }
    for (const id of expired) {
      pending.delete(id);
    }
    return expired;
  }

  function resolve(request_id: string): void {
    pending.delete(request_id);
  }

  function _pending(): ReadonlyArray<{ request_id: string; seq: number; timestamp_ms: number }> {
    const result: { request_id: string; seq: number; timestamp_ms: number }[] = [];
    for (const [id, entry] of pending) {
      result.push({ request_id: id, seq: entry.seq, timestamp_ms: entry.timestamp_ms });
    }
    return result;
  }

  return { track, tick, resolve, _pending };
}
