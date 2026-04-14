// ABOUTME: Next.js standalone child-process helpers for daemon lifecycle integration.
// spawnNextjsChild: spawns bun run server.js with PORT + DB env vars, pipes stderr with [nextjs] prefix.
// shutdownNextjsChild: SIGTERM with timeout-gated SIGKILL fallback.
// resolveNextjsServerScript: locates .next/standalone/ui/server.js under pluginRoot.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface SpawnOpts {
  serverScript: string;
  port: number;
  dbPath: string;
  stateDir: string;
}

export function spawnNextjsChild(opts: SpawnOpts): ChildProcess {
  const child = spawn("bun", ["run", opts.serverScript], {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(opts.port),
      SPACEBRIDGE_DB_PATH: opts.dbPath,
      SPACEBRIDGE_STATE_DIR: opts.stateDir,
    },
  });

  // Pipe child stderr to daemon stderr with [nextjs] prefix
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[nextjs] ${chunk.toString()}`);
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stderr.write(`[nextjs] ${chunk.toString()}`);
  });

  return child;
}

export async function shutdownNextjsChild(child: ChildProcess, timeoutMs = 5000): Promise<void> {
  return new Promise<void>((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }

    const onExit = () => {
      clearTimeout(killTimer);
      resolve();
    };

    child.once("exit", onExit);

    child.kill("SIGTERM");

    const killTimer = setTimeout(() => {
      child.removeListener("exit", onExit);
      try {
        child.kill("SIGKILL");
      } catch {
        /* already dead */
      }
      // Wait briefly for SIGKILL to land
      child.once("exit", () => resolve());
      // Hard fallback in case even SIGKILL doesn't fire exit event
      setTimeout(resolve, 500);
    }, timeoutMs);
  });
}

interface ResolveOpts {
  checkExists?: boolean;
}

export function resolveNextjsServerScript(
  pluginRoot: string,
  opts: ResolveOpts = { checkExists: true },
): string {
  const scriptPath = join(pluginRoot, "ui", ".next", "standalone", "ui", "server.js");
  if (opts.checkExists !== false && !existsSync(scriptPath)) {
    throw new Error(
      `Next.js standalone server not found at ${scriptPath}. Run: cd spacebridge/ui && bun run build`,
    );
  }
  return scriptPath;
}
