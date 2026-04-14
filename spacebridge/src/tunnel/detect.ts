// ABOUTME: detectProvider — auto-selects tunnel backend in priority order (ngrok > tailscale > cloudflared).
// Capability checks: skips providers where supportsSSE()=false unless forced via override.
// Credential storage: relies on provider-native storage (Q-1 answer) — no spacebridge config needed.

import { execSync } from "node:child_process";
import type { TunnelProvider } from "./provider";
import { NgrokProvider } from "./ngrok";
import { TailscaleProvider } from "./tailscale";
import { CloudflaredProvider } from "./cloudflared";

function isBinaryAvailable(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Ordered by priority: ngrok > tailscale > cloudflared (O-2)
const PROVIDERS: Array<() => TunnelProvider> = [
  () => new NgrokProvider(),
  () => new TailscaleProvider(),
  () => new CloudflaredProvider(),
];

const PROVIDER_NAMES: Record<string, () => TunnelProvider> = {
  ngrok: () => new NgrokProvider(),
  tailscale: () => new TailscaleProvider(),
  cloudflared: () => new CloudflaredProvider(),
};

/**
 * Detects which tunnel provider to use.
 * @param override - force a specific provider by name (--tunnel-backend flag). Bypasses capability checks.
 * @returns A TunnelProvider instance, or null if none are available.
 */
export function detectProvider(override?: string): TunnelProvider | null {
  if (override) {
    const factory = PROVIDER_NAMES[override];
    if (!factory) {
      throw new Error(
        `Unknown tunnel backend: "${override}". Valid options: ngrok, tailscale, cloudflared`
      );
    }
    const provider = factory();
    if (!isBinaryAvailable(provider.name)) {
      throw new Error(
        `Tunnel backend "${override}" is not installed. Install it and try again.`
      );
    }
    return provider;
  }

  for (const factory of PROVIDERS) {
    const provider = factory();
    if (!isBinaryAvailable(provider.name)) continue;
    if (!provider.supportsSSE()) continue; // skip cloudflared for SSE use cases (Q-2)
    return provider;
  }

  return null;
}

export function installGuide(): string {
  return [
    "No tunnel provider found. Install one of:",
    "  ngrok:      https://ngrok.com/download",
    "  tailscale:  https://tailscale.com/download",
    "  cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    "",
    "Note: cloudflared has known SSE buffering issues (cloudflare/cloudflared#1449).",
    "For real-time share views, ngrok or tailscale are recommended.",
  ].join("\n");
}
