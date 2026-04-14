// ABOUTME: CloudflaredProvider — tunnel backend using cloudflared quick tunnels.
// supportsSSE() = false — cloudflared buffers GET-based SSE until connection close
// (cloudflare/cloudflared#1449, open since 2024, unresolved). Auto-detection skips this
// provider for SSE use cases. User can force with --tunnel-backend cloudflared.
// URL extracted from stderr (pattern: https://*.trycloudflare.com).
// Credentials: uses ~/.cloudflared/ per Q-1 answer (provider-native credential storage).

import { type ChildProcess, spawn } from "node:child_process";
import type { TunnelProvider } from "./provider";

export class CloudflaredProvider implements TunnelProvider {
  readonly name = "cloudflared";
  private child: ChildProcess | null = null;
  private publicUrl = "";

  supportsSSE(): boolean {
    // cloudflared GET-based SSE is buffered — not suitable for real-time streaming
    // See: cloudflare/cloudflared#1449
    return false;
  }

  allowedPorts(): number[] {
    return [];
  }

  async start(localPort: number): Promise<string> {
    this.child = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${localPort}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    // cloudflared prints the URL to stderr
    this.publicUrl = await this.waitForUrl(30_000);
    return this.publicUrl;
  }

  private async waitForUrl(timeoutMs: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("cloudflared URL not available within timeout"));
      }, timeoutMs);

      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        process.stderr.write(`[cloudflared] ${text}`);
        const match = text.match(/https:\/\/[\w-]+\.trycloudflare\.com/);
        if (match) {
          clearTimeout(timer);
          this.child?.stderr?.removeListener("data", onData);
          resolve(match[0]);
        }
      };

      this.child?.stderr?.on("data", onData);
      this.child?.on("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`cloudflared exited unexpectedly with code ${code}`));
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* already dead */
        }
        resolve();
      }, 5000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  getPublicUrl(): string {
    return this.publicUrl;
  }
}
