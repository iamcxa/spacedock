// ABOUTME: TunnelProvider interface — abstraction over cloudflared/ngrok/tailscale backends.
// Capability flags: supportsSSE() and allowedPorts() drive auto-detection logic (Q-2 answer).
// detect() skips providers that fail capability checks unless forced via --tunnel-backend override.

export interface TunnelProvider {
  /** Display name for CLI messages and logging. */
  name: string;

  /** Returns true if this provider supports real-time SSE streaming.
   *  cloudflared returns false due to GET-based SSE buffering (cloudflare/cloudflared#1449).
   */
  supportsSSE(): boolean;

  /** Returns the list of allowed external-facing ports, or [] for no restriction.
   *  tailscale funnel is restricted to [443, 8443, 10000] on the external side.
   */
  allowedPorts(): number[];

  /** Start the tunnel, exposing localPort. Returns the public URL. */
  start(localPort: number): Promise<string>;

  /** Stop the tunnel and clean up. Must be idempotent. */
  stop(): Promise<void>;

  /** Returns the public URL (only valid after start() resolves). */
  getPublicUrl(): string;
}
