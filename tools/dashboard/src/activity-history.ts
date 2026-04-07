// ABOUTME: Pure, testable localStorage persistence for the dashboard activity feed.
// ABOUTME: Browser-side mirror lives inline in static/activity.js (IIFE has no module loader).
//
// Storage key convention: "spacedock.dashboard.activity.v1" (bump to v2 on schema change).
// Capacity default 500 mirrors EventBuffer(db, 500) at src/server.ts.

import type { SequencedEvent } from "./types";

export type StoredEntry = SequencedEvent;

const EVICT_BATCH = 50;

function isQuotaExceeded(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "QuotaExceededError") return true;
  // Firefox uses code 1014 (NS_ERROR_DOM_QUOTA_REACHED), most others use 22.
  const code = (err as { code?: number }).code;
  return code === 22 || code === 1014;
}

export class ActivityHistory {
  constructor(
    private readonly storage: Storage,
    private readonly key: string,
    private readonly capacity: number,
  ) {}

  hydrate(): StoredEntry[] {
    const raw = this.storage.getItem(this.key);
    if (raw === null || raw === "") return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON — clear the corrupted key so future reads are clean.
      this.clear();
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredEntry[];
  }

  append(entry: StoredEntry): boolean {
    return this.appendMany([entry]);
  }

  // Batch insert. Hydrates and persists once for the whole batch instead of
  // doing one full hydrate→stringify→setItem cycle per entry. WebSocket replay
  // can deliver dozens to hundreds of events at once, so the O(N) save matters
  // more than for the single-event path that just delegates to this.
  appendMany(entries: StoredEntry[]): boolean {
    if (entries.length === 0) return true;
    const current = this.hydrate();
    for (const entry of entries) current.push(entry);
    const trimmed = current.length > this.capacity
      ? current.slice(current.length - this.capacity)
      : current;
    return this.persist(trimmed);
  }

  dedupReplay(events: StoredEntry[], lastSeq: number): StoredEntry[] {
    return events.filter((e) => e.seq > lastSeq);
  }

  detectSeqReset(events: StoredEntry[], storedLastSeq: number): boolean {
    return events.length > 0 && events[0].seq === 1 && storedLastSeq > 0;
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }

  private persist(entries: StoredEntry[]): boolean {
    try {
      this.storage.setItem(this.key, JSON.stringify(entries));
      return true;
    } catch (err) {
      if (!isQuotaExceeded(err)) {
        // Non-quota errors bubble up so callers see real problems.
        throw err;
      }
      // Evict oldest EVICT_BATCH entries and retry once.
      const evicted = entries.slice(EVICT_BATCH);
      try {
        this.storage.setItem(this.key, JSON.stringify(evicted));
        return true;
      } catch (err2) {
        if (isQuotaExceeded(err2)) {
          // Still over budget — drop silently, feed continues to render in DOM.
          return false;
        }
        throw err2;
      }
    }
  }
}
