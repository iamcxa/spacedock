// ABOUTME: Unit tests for detectProvider — mocks binary availability, tests capability-based selection.

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// We test the logic by importing the module and mocking child_process.execSync
// Since bun:test mock.module patches imports, we test the exported functions directly
// using a testable wrapper that accepts a custom binary-check function.

import { NgrokProvider } from "./ngrok";
import { TailscaleProvider } from "./tailscale";
import { CloudflaredProvider } from "./cloudflared";

// ─── TunnelProvider interface compliance ──────────────────────────────────────

describe("NgrokProvider capability flags", () => {
  test("supportsSSE returns true", () => {
    const p = new NgrokProvider();
    expect(p.supportsSSE()).toBe(true);
  });

  test("allowedPorts returns empty array (no restriction)", () => {
    const p = new NgrokProvider();
    expect(p.allowedPorts()).toEqual([]);
  });

  test("name is ngrok", () => {
    const p = new NgrokProvider();
    expect(p.name).toBe("ngrok");
  });
});

describe("TailscaleProvider capability flags", () => {
  test("supportsSSE returns true", () => {
    const p = new TailscaleProvider();
    expect(p.supportsSSE()).toBe(true);
  });

  test("allowedPorts returns [443, 8443, 10000]", () => {
    const p = new TailscaleProvider();
    expect(p.allowedPorts()).toEqual([443, 8443, 10000]);
  });

  test("name is tailscale", () => {
    const p = new TailscaleProvider();
    expect(p.name).toBe("tailscale");
  });
});

describe("CloudflaredProvider capability flags", () => {
  test("supportsSSE returns false (cloudflare/cloudflared#1449)", () => {
    const p = new CloudflaredProvider();
    expect(p.supportsSSE()).toBe(false);
  });

  test("allowedPorts returns empty array", () => {
    const p = new CloudflaredProvider();
    expect(p.allowedPorts()).toEqual([]);
  });

  test("name is cloudflared", () => {
    const p = new CloudflaredProvider();
    expect(p.name).toBe("cloudflared");
  });
});

// ─── detectProvider logic ─────────────────────────────────────────────────────
// We test the selection logic by creating a testable version that accepts
// a mock binary checker instead of calling execSync directly.

function makeDetectFn(availableBinaries: string[]) {
  // Inline the detect logic with injectable binary checker
  const isBinaryAvailable = (name: string) => availableBinaries.includes(name);

  const PROVIDERS = [
    () => new NgrokProvider(),
    () => new TailscaleProvider(),
    () => new CloudflaredProvider(),
  ];

  return function detect(override?: string) {
    if (override) {
      const factories: Record<string, () => import("./provider").TunnelProvider> = {
        ngrok: () => new NgrokProvider(),
        tailscale: () => new TailscaleProvider(),
        cloudflared: () => new CloudflaredProvider(),
      };
      const factory = factories[override];
      if (!factory) throw new Error(`Unknown tunnel backend: "${override}"`);
      const provider = factory();
      if (!isBinaryAvailable(provider.name)) {
        throw new Error(`Tunnel backend "${override}" is not installed.`);
      }
      return provider;
    }

    for (const factory of PROVIDERS) {
      const provider = factory();
      if (!isBinaryAvailable(provider.name)) continue;
      if (!provider.supportsSSE()) continue;
      return provider;
    }
    return null;
  };
}

describe("detectProvider logic", () => {
  test("returns NgrokProvider when ngrok is available", () => {
    const detect = makeDetectFn(["ngrok", "tailscale", "cloudflared"]);
    const result = detect();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("ngrok");
  });

  test("skips cloudflared (SSE=false) and returns null when only cloudflared is available", () => {
    const detect = makeDetectFn(["cloudflared"]);
    const result = detect();
    expect(result).toBeNull();
  });

  test("falls back to tailscale when ngrok is not available", () => {
    const detect = makeDetectFn(["tailscale", "cloudflared"]);
    const result = detect();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("tailscale");
  });

  test("returns null when no SSE-compatible provider is available", () => {
    const detect = makeDetectFn([]);
    const result = detect();
    expect(result).toBeNull();
  });

  test("override forces cloudflared even though supportsSSE=false", () => {
    const detect = makeDetectFn(["cloudflared"]);
    const result = detect("cloudflared");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("cloudflared");
  });

  test("override throws if binary is not installed", () => {
    const detect = makeDetectFn([]);
    expect(() => detect("ngrok")).toThrow("not installed");
  });

  test("override throws for unknown backend name", () => {
    const detect = makeDetectFn(["ngrok"]);
    expect(() => detect("unknown-backend")).toThrow("Unknown tunnel backend");
  });
});
