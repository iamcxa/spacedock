// ABOUTME: Pure, testable localStorage persistence for the dashboard activity feed.
// ABOUTME: Browser-side mirror lives inline in static/activity.js (IIFE has no module loader).
//
// Storage key convention: "spacedock.dashboard.activity.v1" (bump to v2 on schema change).
// Capacity default 500 mirrors EventBuffer(db, 500) at src/server.ts.

import type { SequencedEvent } from "./types";

export type StoredEntry = SequencedEvent;

export class ActivityHistory {
  constructor(
    private readonly storage: Storage,
    private readonly key: string,
    private readonly capacity: number,
  ) {}

  hydrate(): StoredEntry[] {
    return [];
  }

  append(_entry: StoredEntry): boolean {
    return false;
  }

  dedupReplay(_events: StoredEntry[], _lastSeq: number): StoredEntry[] {
    return [];
  }

  detectSeqReset(_events: StoredEntry[], _storedLastSeq: number): boolean {
    return false;
  }

  clear(): void {
    /* stub */
  }
}
