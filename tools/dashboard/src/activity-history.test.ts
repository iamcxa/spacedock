import { describe, test, expect, beforeEach } from "bun:test";
import { ActivityHistory, type StoredEntry } from "./activity-history";

const KEY = "spacedock.dashboard.activity.v1";

// Mock Storage implementing the Web Storage API surface with configurable
// quota-exceeded behavior for testing eviction + retry paths.
class MockStorage implements Storage {
  private data = new Map<string, string>();
  public quotaExceededRemaining = 0;

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.quotaExceededRemaining > 0) {
      this.quotaExceededRemaining -= 1;
      const err = new Error("Quota exceeded") as Error & { code?: number };
      err.name = "QuotaExceededError";
      err.code = 22;
      throw err;
    }
    this.data.set(key, value);
  }

  // Test helper — snapshot current size of the persisted array at KEY.
  storedCount(key: string): number {
    const raw = this.data.get(key);
    if (!raw) return 0;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }
}

function makeEntry(seq: number): StoredEntry {
  return {
    seq,
    event: {
      type: "dispatch",
      entity: "test",
      stage: "execute",
      agent: "worker",
      timestamp: "2026-04-07T00:00:00Z",
    },
  };
}

function makeHistory(storage: MockStorage, capacity: number = 500): ActivityHistory {
  return new ActivityHistory(storage, KEY, capacity);
}

describe("ActivityHistory.hydrate", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = new MockStorage();
  });

  test("returns [] when key is empty", () => {
    const h = makeHistory(storage);
    expect(h.hydrate()).toEqual([]);
  });

  test("returns parsed entries when key contains valid JSON array", () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    storage.setItem(KEY, JSON.stringify(entries));
    const h = makeHistory(storage);
    const result = h.hydrate();
    expect(result).toHaveLength(3);
    expect(result[0].seq).toBe(1);
    expect(result[2].seq).toBe(3);
  });

  test("returns [] and clears key when JSON is malformed", () => {
    storage.setItem(KEY, "{not valid json");
    const h = makeHistory(storage);
    expect(h.hydrate()).toEqual([]);
    expect(storage.getItem(KEY)).toBeNull();
  });

  test("returns [] when stored value is not an array", () => {
    storage.setItem(KEY, JSON.stringify({ not: "an array" }));
    const h = makeHistory(storage);
    expect(h.hydrate()).toEqual([]);
  });
});

describe("ActivityHistory.append", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = new MockStorage();
  });

  test("appends a new entry and persists to storage", () => {
    const h = makeHistory(storage, 500);
    expect(h.append(makeEntry(1))).toBe(true);
    expect(storage.storedCount(KEY)).toBe(1);
    expect(h.hydrate()[0].seq).toBe(1);
  });

  test("evicts oldest entries when count exceeds capacity", () => {
    const h = makeHistory(storage, 3);
    h.append(makeEntry(1));
    h.append(makeEntry(2));
    h.append(makeEntry(3));
    h.append(makeEntry(4));
    h.append(makeEntry(5));
    const stored = h.hydrate();
    expect(stored).toHaveLength(3);
    expect(stored.map((e) => e.seq)).toEqual([3, 4, 5]);
  });

  test("on QuotaExceededError, evicts oldest 50 entries and retries setItem", () => {
    const h = makeHistory(storage, 500);
    // Pre-populate 100 entries successfully.
    for (let i = 1; i <= 100; i++) h.append(makeEntry(i));
    expect(storage.storedCount(KEY)).toBe(100);

    // Next setItem will throw QuotaExceededError once, then succeed.
    storage.quotaExceededRemaining = 1;
    const ok = h.append(makeEntry(101));
    expect(ok).toBe(true);
    // Started with 100, tried to add 1 → 101, then evicted 50 → 51.
    expect(storage.storedCount(KEY)).toBe(51);
  });

  test("on persistent QuotaExceededError, returns false without throwing", () => {
    const h = makeHistory(storage, 500);
    for (let i = 1; i <= 10; i++) h.append(makeEntry(i));

    // Both the initial setItem and the retry after eviction will throw.
    storage.quotaExceededRemaining = 2;
    let result: boolean | undefined;
    expect(() => {
      result = h.append(makeEntry(11));
    }).not.toThrow();
    expect(result).toBe(false);
  });
});

describe("ActivityHistory.appendMany", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = new MockStorage();
  });

  test("returns true and is a no-op when given an empty batch", () => {
    const h = makeHistory(storage, 500);
    expect(h.appendMany([])).toBe(true);
    expect(storage.storedCount(KEY)).toBe(0);
  });

  test("persists once for a batch of N entries (single setItem)", () => {
    const h = makeHistory(storage, 500);
    let setItemCalls = 0;
    const realSet = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      setItemCalls += 1;
      realSet(key, value);
    };
    const batch = [makeEntry(1), makeEntry(2), makeEntry(3), makeEntry(4), makeEntry(5)];
    expect(h.appendMany(batch)).toBe(true);
    expect(setItemCalls).toBe(1);
    expect(storage.storedCount(KEY)).toBe(5);
  });

  test("trims oldest entries when batch pushes total over capacity", () => {
    const h = makeHistory(storage, 4);
    h.append(makeEntry(1));
    h.append(makeEntry(2));
    expect(h.appendMany([makeEntry(3), makeEntry(4), makeEntry(5), makeEntry(6)])).toBe(true);
    const stored = h.hydrate();
    expect(stored).toHaveLength(4);
    expect(stored.map((e) => e.seq)).toEqual([3, 4, 5, 6]);
  });
});

describe("ActivityHistory.dedupReplay", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = new MockStorage();
  });

  test("given seq=5 already in localStorage, when replay sends seq=5 again, returns empty array", () => {
    const h = makeHistory(storage);
    const fresh = h.dedupReplay([makeEntry(5)], 5);
    expect(fresh).toEqual([]);
  });

  test("given lastSeq=5, when replay sends [3,4,5,6,7], returns only [6,7]", () => {
    const h = makeHistory(storage);
    const replay = [makeEntry(3), makeEntry(4), makeEntry(5), makeEntry(6), makeEntry(7)];
    const fresh = h.dedupReplay(replay, 5);
    expect(fresh.map((e) => e.seq)).toEqual([6, 7]);
  });

  test("given lastSeq=0 (no history), returns all replay events", () => {
    const h = makeHistory(storage);
    const replay = [makeEntry(1), makeEntry(2), makeEntry(3)];
    const fresh = h.dedupReplay(replay, 0);
    expect(fresh.map((e) => e.seq)).toEqual([1, 2, 3]);
  });
});

describe("ActivityHistory.detectSeqReset", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = new MockStorage();
  });

  test("returns true when replay[0].seq === 1 and storedLastSeq > 0", () => {
    const h = makeHistory(storage);
    expect(h.detectSeqReset([makeEntry(1), makeEntry(2)], 42)).toBe(true);
  });

  test("returns false when replay[0].seq === 1 and storedLastSeq === 0 (fresh install)", () => {
    const h = makeHistory(storage);
    expect(h.detectSeqReset([makeEntry(1), makeEntry(2)], 0)).toBe(false);
  });

  test("returns false when replay[0].seq > 1 (normal resume)", () => {
    const h = makeHistory(storage);
    expect(h.detectSeqReset([makeEntry(10), makeEntry(11)], 9)).toBe(false);
  });

  test("returns false when replay is empty", () => {
    const h = makeHistory(storage);
    expect(h.detectSeqReset([], 42)).toBe(false);
  });
});

describe("ActivityHistory.clear", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = new MockStorage();
  });

  test("removes the storage key", () => {
    storage.setItem(KEY, JSON.stringify([makeEntry(1)]));
    const h = makeHistory(storage);
    h.clear();
    expect(storage.getItem(KEY)).toBeNull();
  });

  test("subsequent hydrate() returns []", () => {
    const h = makeHistory(storage);
    h.append(makeEntry(1));
    h.append(makeEntry(2));
    h.clear();
    expect(h.hydrate()).toEqual([]);
  });
});

describe("ActivityHistory integration scenarios", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = new MockStorage();
  });

  test("full lifecycle: append 10, hydrate, dedup replay of [5..15], result has 15 entries no duplicates", () => {
    const h = makeHistory(storage, 500);
    for (let i = 1; i <= 10; i++) h.append(makeEntry(i));

    const hydrated = h.hydrate();
    expect(hydrated).toHaveLength(10);
    const lastSeq = Math.max(...hydrated.map((e) => e.seq));
    expect(lastSeq).toBe(10);

    const replay: StoredEntry[] = [];
    for (let i = 5; i <= 15; i++) replay.push(makeEntry(i));
    const fresh = h.dedupReplay(replay, lastSeq);
    expect(fresh.map((e) => e.seq)).toEqual([11, 12, 13, 14, 15]);

    for (const entry of fresh) h.append(entry);
    const final = h.hydrate();
    expect(final).toHaveLength(15);
    expect(final.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  test("seq reset scenario: 10 entries stored, replay [1,2,3] triggers clear + fresh hydrate", () => {
    const h = makeHistory(storage, 500);
    for (let i = 1; i <= 10; i++) h.append(makeEntry(i));
    const storedLastSeq = 10;

    const replay = [makeEntry(1), makeEntry(2), makeEntry(3)];
    expect(h.detectSeqReset(replay, storedLastSeq)).toBe(true);

    h.clear();
    expect(h.hydrate()).toEqual([]);

    // After clear, all replay events are fresh.
    const fresh = h.dedupReplay(replay, 0);
    expect(fresh).toHaveLength(3);
    for (const entry of fresh) h.append(entry);
    expect(h.hydrate().map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  test("namespace key `spacedock.dashboard.activity.v1` is used consistently", () => {
    const h = makeHistory(storage, 500);
    h.append(makeEntry(1));
    expect(storage.getItem(KEY)).not.toBeNull();
    expect(storage.getItem("other.key")).toBeNull();
  });
});
