// ABOUTME: NgrokProvider — tunnel backend using ngrok CLI.
// URL extraction via ngrok local API at http://127.0.0.1:4040/api/tunnels.
// supportsSSE() = true (ngrok v3 HTTP/1.1 upstream confirmed safe).
// allowedPorts() = [] (no port restrictions).

import { spawn, type ChildProcess } from "node:child_process";
import type { TunnelProvider } from "./provider";

export class NgrokProvider implements TunnelProvider {
  readonly name = "ngrok";
  private child: ChildProcess | null = null;
  private publicUrl = "";

  supportsSSE(): boolean {
    return true;
  }

  allowedPorts(): number[] {
    return [];
  }

  async start(localPort: number): Promise<string> {
    this.child = spawn("ngrok", ["http", String(localPort)], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(`[ngrok] ${chunk.toString()}`);
    });

    this.child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        process.stderr.write(`[ngrok] exited with code ${code}\n`);
      }
    });

    // Poll ngrok local API until tunnel is ready
    this.publicUrl = await this.waitForUrl(10_000);
    return this.publicUrl;
  }

  private async waitForUrl(timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const res = await fetch("http://127.0.0.1:4040/api/tunnels");
        if (res.ok) {
          const data = await res.json() as { tunnels: Array<{ public_url: string; proto: string }> };
          const https = data.tunnels.find((t) => t.proto === "https");
          if (https) return https.public_url;
          const http = data.tunnels.find((t) => t.proto === "http");
          if (http) return http.public_url;
        }
      } catch {
        // not ready yet
      }
    }
    throw new Error("ngrok tunnel URL not available within timeout");
  }

  async stop(): Promise<void> {
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch { /* already dead */ }
        resolve();
      }, 5000);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
    });
  }

  getPublicUrl(): string {
    return this.publicUrl;
  }
}
