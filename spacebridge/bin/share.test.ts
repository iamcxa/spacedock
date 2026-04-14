// ABOUTME: Unit tests for share CLI argument parsing and TTL parsing.
// No IPC mocking needed — tests cover pure argument/TTL logic only.

import { describe, test, expect } from "bun:test";
import { parseTtl, parseArgs } from "./share";

// ─── parseTtl ──────────────────────────────────────────────────────────────────

describe("parseTtl", () => {
  test("parses days: 7d → 7 * 24 * 60 * 60 * 1000", () => {
    expect(parseTtl("7d")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  test("parses days: 1d → 86400000", () => {
    expect(parseTtl("1d")).toBe(86_400_000);
  });

  test("parses hours: 24h → 86400000", () => {
    expect(parseTtl("24h")).toBe(86_400_000);
  });

  test("parses hours: 1h → 3600000", () => {
    expect(parseTtl("1h")).toBe(3_600_000);
  });

  test("parses minutes: 30m → 1800000", () => {
    expect(parseTtl("30m")).toBe(1_800_000);
  });

  test("throws for invalid format: '7days'", () => {
    expect(() => parseTtl("7days")).toThrow("Invalid TTL format");
  });

  test("throws for invalid format: '1w'", () => {
    expect(() => parseTtl("1w")).toThrow("Invalid TTL format");
  });

  test("throws for empty string", () => {
    expect(() => parseTtl("")).toThrow("Invalid TTL format");
  });
});

// ─── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs — create subcommand", () => {
  test("--entity slug → create with default 7d TTL", () => {
    const args = parseArgs(["--entity", "my-entity"]);
    expect(args.subcommand).toBe("create");
    if (args.subcommand === "create") {
      expect(args.entitySlug).toBe("my-entity");
      expect(args.ttlMs).toBe(7 * 24 * 60 * 60 * 1000);
      expect(args.tunnelBackend).toBeUndefined();
    }
  });

  test("--entity slug --ttl 1d → create with 1d TTL", () => {
    const args = parseArgs(["--entity", "my-entity", "--ttl", "1d"]);
    expect(args.subcommand).toBe("create");
    if (args.subcommand === "create") {
      expect(args.ttlMs).toBe(86_400_000);
    }
  });

  test("--entity slug --ttl 24h → create with 24h TTL", () => {
    const args = parseArgs(["--entity", "my-entity", "--ttl", "24h"]);
    expect(args.subcommand).toBe("create");
    if (args.subcommand === "create") {
      expect(args.ttlMs).toBe(86_400_000);
    }
  });

  test("--entity slug --tunnel-backend ngrok → create with backend override", () => {
    const args = parseArgs(["--entity", "my-entity", "--tunnel-backend", "ngrok"]);
    expect(args.subcommand).toBe("create");
    if (args.subcommand === "create") {
      expect(args.tunnelBackend).toBe("ngrok");
    }
  });

  test("--entity slug --tunnel-backend tailscale → tailscale backend", () => {
    const args = parseArgs(["--entity", "slug", "--tunnel-backend", "tailscale"]);
    if (args.subcommand === "create") {
      expect(args.tunnelBackend).toBe("tailscale");
    }
  });

  test("--entity slug --tunnel-backend cloudflared → cloudflared backend", () => {
    const args = parseArgs(["--entity", "slug", "--tunnel-backend", "cloudflared"]);
    if (args.subcommand === "create") {
      expect(args.tunnelBackend).toBe("cloudflared");
    }
  });

  test("missing --entity throws usage error", () => {
    expect(() => parseArgs([])).toThrow("Usage:");
  });

  test("--entity without value throws error", () => {
    expect(() => parseArgs(["--entity"])).toThrow("--entity requires a slug");
  });
});

describe("parseArgs — revoke subcommand", () => {
  test("--revoke <token> → revoke", () => {
    const args = parseArgs(["--revoke", "abc123token"]);
    expect(args.subcommand).toBe("revoke");
    if (args.subcommand === "revoke") {
      expect(args.token).toBe("abc123token");
    }
  });

  test("--revoke without value throws error", () => {
    expect(() => parseArgs(["--revoke"])).toThrow("--revoke requires a token");
  });
});

describe("parseArgs — list subcommand", () => {
  test("--list → list", () => {
    const args = parseArgs(["--list"]);
    expect(args.subcommand).toBe("list");
  });

  test("--list takes priority over other flags", () => {
    const args = parseArgs(["--entity", "my-entity", "--list"]);
    expect(args.subcommand).toBe("list");
  });
});
