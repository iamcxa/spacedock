import { describe, test, expect, beforeEach } from "bun:test";
import { createPermissionTracker, type TrackedEvent, type PermissionTracker } from "./permission-tracker";

function makeEvent(type: string, seq: number, opts?: { request_id?: string; timestamp_ms?: number }): TrackedEvent {
  return {
    type,
    seq,
    request_id: opts?.request_id,
    timestamp_ms: opts?.timestamp_ms ?? 1000,
  };
}

describe("PermissionTracker.track", () => {
  let tracker: PermissionTracker;
  beforeEach(() => {
    tracker = createPermissionTracker();
  });

  test("1. track(permission_request) returns [] and adds to pending", () => {
    const result = tracker.track(makeEvent("permission_request", 5, { request_id: "req1" }));
    expect(result).toEqual([]);
    expect(tracker._pending()).toEqual([{ request_id: "req1", seq: 5, timestamp_ms: 1000 }]);
  });

  test("2. track(channel_message) after pending request returns resolved ids", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "req1" }));
    const result = tracker.track(makeEvent("channel_message", 6));
    expect(result).toEqual(["req1"]);
    expect(tracker._pending()).toEqual([]);
  });

  test("3. two permission_requests do not resolve each other", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "X" }));
    const result = tracker.track(makeEvent("permission_request", 6, { request_id: "Y" }));
    expect(result).toEqual([]);
    expect(tracker._pending()).toHaveLength(2);
  });

  test("4. non-permission event resolves all pending with lower seq", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "X" }));
    tracker.track(makeEvent("permission_request", 6, { request_id: "Y" }));
    const result = tracker.track(makeEvent("channel_message", 7));
    expect(result.sort()).toEqual(["X", "Y"]);
    expect(tracker._pending()).toEqual([]);
  });

  test("5. older-seq non-permission event does not resolve newer pending", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "X" }));
    const result = tracker.track(makeEvent("channel_message", 4));
    expect(result).toEqual([]);
    expect(tracker._pending()).toHaveLength(1);
  });

  test("8. resolve() removes from pending so track does not re-resolve", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "X" }));
    tracker.resolve("X");
    const result = tracker.track(makeEvent("channel_message", 6));
    expect(result).toEqual([]);
    expect(tracker._pending()).toEqual([]);
  });

  test("10. replay scenario: req A, msg, req B, req C, msg — all resolved", () => {
    tracker.track(makeEvent("permission_request", 1, { request_id: "A" }));
    const r1 = tracker.track(makeEvent("channel_message", 2));
    expect(r1).toEqual(["A"]);

    tracker.track(makeEvent("permission_request", 3, { request_id: "B" }));
    tracker.track(makeEvent("permission_request", 4, { request_id: "C" }));
    const r2 = tracker.track(makeEvent("channel_message", 5));
    expect(r2.sort()).toEqual(["B", "C"]);

    expect(tracker._pending()).toEqual([]);
  });

  test("11. reentrance: mixed type loop never throws or leaks", () => {
    const events: TrackedEvent[] = [
      makeEvent("permission_request", 1, { request_id: "a" }),
      makeEvent("channel_message", 2),
      makeEvent("permission_request", 3, { request_id: "b" }),
      makeEvent("channel_response", 4),
      makeEvent("permission_request", 5, { request_id: "c" }),
      makeEvent("dispatch", 6),
    ];
    expect(() => {
      for (const ev of events) tracker.track(ev);
    }).not.toThrow();
    expect(tracker._pending()).toEqual([]);
  });
});

describe("PermissionTracker.tick", () => {
  let tracker: PermissionTracker;
  beforeEach(() => {
    tracker = createPermissionTracker();
  });

  test("6. tick returns expired ids past 30s threshold", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "X", timestamp_ms: 1000 }));
    const result = tracker.tick(32000); // 31s elapsed
    expect(result).toEqual(["X"]);
    expect(tracker._pending()).toEqual([]);
  });

  test("7. tick returns [] when under 30s threshold", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "X", timestamp_ms: 1000 }));
    const result = tracker.tick(10000); // 9s elapsed
    expect(result).toEqual([]);
    expect(tracker._pending()).toHaveLength(1);
  });

  test("9. resolve() prevents tick from returning the id", () => {
    tracker.track(makeEvent("permission_request", 5, { request_id: "X", timestamp_ms: 1000 }));
    tracker.resolve("X");
    const result = tracker.tick(100000);
    expect(result).toEqual([]);
  });
});

describe("PermissionTracker hydration scenarios", () => {
  let tracker: PermissionTracker;
  beforeEach(() => {
    tracker = createPermissionTracker();
  });

  test("12. hydration batch: req_A, msg, req_B, req_C, msg — all resolved", () => {
    tracker.track(makeEvent("permission_request", 1, { request_id: "A", timestamp_ms: 100 }));
    const r1 = tracker.track(makeEvent("channel_message", 2, { timestamp_ms: 200 }));
    expect(r1).toEqual(["A"]);

    tracker.track(makeEvent("permission_request", 3, { request_id: "B", timestamp_ms: 300 }));
    tracker.track(makeEvent("permission_request", 4, { request_id: "C", timestamp_ms: 400 }));
    const r2 = tracker.track(makeEvent("channel_message", 5, { timestamp_ms: 500 }));
    expect(r2.sort()).toEqual(["B", "C"]);

    expect(tracker._pending()).toEqual([]);
  });

  test("13. hydration with trailing pending: msg, req_A, msg, req_B — req_B stays pending", () => {
    tracker.track(makeEvent("channel_message", 1, { timestamp_ms: 100 }));
    tracker.track(makeEvent("permission_request", 2, { request_id: "A", timestamp_ms: 200 }));
    const r1 = tracker.track(makeEvent("channel_message", 3, { timestamp_ms: 300 }));
    expect(r1).toEqual(["A"]);

    tracker.track(makeEvent("permission_request", 4, { request_id: "B", timestamp_ms: 400 }));
    expect(tracker._pending()).toEqual([{ request_id: "B", seq: 4, timestamp_ms: 400 }]);
  });
});
