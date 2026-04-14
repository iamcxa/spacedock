// ABOUTME: TailscaleProvider — tunnel backend using tailscale funnel.
// External port is mapped from allowed set [443, 8443, 10000] to local Next.js port.
// stop() must run `tailscale funnel {extPort} off` — SIGTERM alone leaves funnel active (A-15).
// Public URL is deterministic: https://{machine}.{tailnet}.ts.net/

import { spawn, type ChildProcess } from "node:child_process";
import type { TunnelProvider } from "./provider";

const ALLOWED_EXTERNAL_PORTS = [443, 8443, 10000];

export class TailscaleProvider implements TunnelProvider {
  readonly name = "tailscale";
  private child: ChildProcess | null = null;
  private publicUrl = "";
  private externalPort = 443;

  supportsSSE(): boolean {
    return true;
  }

  allowedPorts(): number[] {
    return ALLOWED_EXTERNAL_PORTS;
  }

  async start(localPort: number): Promise<string> {
    // Use 443 as preferred external port (A-15: tailscale funnel 443 / http://localhost:{port})
    this.externalPort = ALLOWED_EXTERNAL_PORTS[0];

    this.child = spawn(
      "tailscale",
      ["funnel", String(this.externalPort), "/", `http://localhost:${localPort}`],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    this.child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(`[tailscale] ${chunk.toString()}`);
    });

    this.child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        process.stderr.write(`[tailscale] exited with code ${code}\n`);
      }
    });

    // Get public URL from `tailscale funnel status`
    this.publicUrl = await this.resolvePublicUrl(10_000);
    return this.publicUrl;
  }

  private async resolvePublicUrl(timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const result = await new Promise<string>((resolve, reject) => {
          let out = "";
          const proc = spawn("tailscale", ["funnel", "status"], {
            stdio: ["ignore", "pipe", "pipe"],
          });
          proc.stdout?.on("data", (d: Buffer) => { out += d.toString(); });
          proc.on("exit", (code) => {
            if (code === 0) resolve(out);
            else reject(new Error(`exit ${code}`));
          });
        });
        // Extract https URL from status output
        const match = result.match(/https:\/\/[\w.-]+\.ts\.net\//);
        if (match) return match[0];
      } catch {
        // not ready yet
      }
    }
    throw new Error("tailscale funnel URL not available within timeout");
  }

  async stop(): Promise<void> {
    // Must explicitly disable funnel — SIGTERM alone leaves config active (A-15, GitHub #15248)
    try {
      await new Promise<void>((resolve) => {
        const proc = spawn("tailscale", ["funnel", String(this.externalPort), "off"], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        proc.on("exit", () => resolve());
      });
    } catch {
      // best effort
    }

    if (this.child && this.child.exitCode === null) {
      this.child.kill("SIGTERM");
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try { this.child?.kill("SIGKILL"); } catch { /* already dead */ }
          resolve();
        }, 5000);
        this.child?.once("exit", () => { clearTimeout(timer); resolve(); });
      });
    }
    this.child = null;
  }

  getPublicUrl(): string {
    return this.publicUrl;
  }
}
