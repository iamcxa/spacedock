// ABOUTME: Unit tests for middleware rate limiter and token extraction logic.
// Tests pure functions only — no Next.js runtime needed.

import { describe, test, expect, beforeEach } from "bun:test";
import {
  checkRateLimit,
  resetRateLimitMap,
  extractTokenFromPath,
  extractTokenFromUrl,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from "./middleware";

beforeEach(() => {
  resetRateLimitMap();
});

// ─── Rate limiter ──────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  test("allows first request", () => {
    expect(checkRateLimit("tok1")).toBe(true);
  });

  test("allows up to RATE_LIMIT_MAX (60) requests", () => {
    const token = "tok-limit";
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(checkRateLimit(token)).toBe(true);
    }
  });

  test("blocks request 61 (exceeds limit)", () => {
    const token = "tok-block";
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      checkRateLimit(token);
    }
    expect(checkRateLimit(token)).toBe(false);
  });

  test("request 60 passes, request 61 returns 429 boundary", () => {
    const token = "tok-boundary";
    let lastResult = false;
    for (let i = 1; i <= RATE_LIMIT_MAX; i++) {
      lastResult = checkRateLimit(token);
    }
    expect(lastResult).toBe(true); // request 60 passes
    expect(checkRateLimit(token)).toBe(false); // request 61 blocked
  });

  test("resets after window expires", () => {
    const token = "tok-reset";
    const now = Date.now();
    // Fill bucket
    for (let i = 0; i < RATE_LIMIT_MAX + 1; i++) {
      checkRateLimit(token, now);
    }
    expect(checkRateLimit(token, now)).toBe(false);
    // Advance past window
    expect(checkRateLimit(token, now + RATE_LIMIT_WINDOW_MS + 1)).toBe(true);
  });

  test("different tokens have independent buckets", () => {
    const tokenA = "tok-a";
    const tokenB = "tok-b";
    for (let i = 0; i < RATE_LIMIT_MAX + 1; i++) {
      checkRateLimit(tokenA);
    }
    // tokenA is blocked
    expect(checkRateLimit(tokenA)).toBe(false);
    // tokenB is unaffected
    expect(checkRateLimit(tokenB)).toBe(true);
  });
});

// ─── Token extraction ──────────────────────────────────────────────────────────

describe("extractTokenFromPath", () => {
  test("/share/<token> extracts token", () => {
    expect(extractTokenFromPath("/share/abc123token")).toBe("abc123token");
  });

  test("/share/<token>/subpath extracts token", () => {
    expect(extractTokenFromPath("/share/abc123/extra")).toBe("abc123");
  });

  test("/api/share/events returns null (no token in path)", () => {
    expect(extractTokenFromPath("/api/share/events")).toBeNull();
  });

  test("/entity/slug returns null", () => {
    expect(extractTokenFromPath("/entity/my-entity")).toBeNull();
  });

  test("root path returns null", () => {
    expect(extractTokenFromPath("/")).toBeNull();
  });
});

describe("extractTokenFromUrl", () => {
  function makeUrl(path: string, query?: Record<string, string>): URL {
    const u = new URL(`http://localhost${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    }
    return u;
  }

  test("/share/<token> extracts from path", () => {
    expect(extractTokenFromUrl(makeUrl("/share/mytoken"))).toBe("mytoken");
  });

  test("/api/share/events?token=<token> extracts from query", () => {
    expect(extractTokenFromUrl(makeUrl("/api/share/events", { token: "qtoken" }))).toBe("qtoken");
  });

  test("/api/share/comments?token=<token> extracts from query", () => {
    expect(extractTokenFromUrl(makeUrl("/api/share/comments", { token: "ctoken" }))).toBe("ctoken");
  });

  test("path takes priority over query param", () => {
    expect(extractTokenFromUrl(makeUrl("/share/pathtoken", { token: "qtoken" }))).toBe("pathtoken");
  });

  test("returns null when no token present", () => {
    expect(extractTokenFromUrl(makeUrl("/api/share/events"))).toBeNull();
  });
});
