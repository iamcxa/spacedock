import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";

const WORKTREE = dirname(dirname(import.meta.dir));
const CTL_PATH = join(WORKTREE, "tools", "dashboard", "ctl.sh");

const README_CONTENT = `---
commissioned-by: spacedock@0.9.0
entity-type: task
entity-label: task
stages:
  defaults:
    worktree: false
    concurrency: 2
  states:
    - name: backlog
      initial: true
    - name: done
      terminal: true
---

# Test Workflow
`;

function makeProject(tmpDir: string): void {
  const wfDir = join(tmpDir, "my-workflow");
  mkdirSync(wfDir, { recursive: true });
  writeFileSync(join(wfDir, "README.md"), README_CONTENT);
}

function ctl(tmpDir: string, ...args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["bash", CTL_PATH, ...args, "--root", tmpDir], {
    cwd: WORKTREE,
    timeout: 15_000,
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

function getProjHash(tmpDir: string): string {
  const result = Bun.spawnSync(["bash", "-c", `echo -n "${tmpDir}" | shasum | cut -c1-8`]);
  return result.stdout.toString().trim();
}

function getStateDir(tmpDir: string): string {
  const projHash = getProjHash(tmpDir);
  return join(homedir(), ".spacedock", "dashboard", projHash);
}

function getRunningPid(tmpDir: string): number | null {
  const pidFile = join(getStateDir(tmpDir), "pid");
  if (!existsSync(pidFile)) return null;
  return parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
}

function getRunningPort(tmpDir: string): number | null {
  const portFile = join(getStateDir(tmpDir), "port");
  if (!existsSync(portFile)) return null;
  return parseInt(readFileSync(portFile, "utf-8").trim(), 10);
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

describe("Dashboard ctl.sh", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "ctl-test-"));
    makeProject(tmpDir);
  });

  afterEach(() => {
    // Best-effort stop
    try { ctl(tmpDir, "stop"); } catch {}
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("start creates PID file", () => {
    const result = ctl(tmpDir, "start");
    expect(result.exitCode).toBe(0);

    const pidFile = join(getStateDir(tmpDir), "pid");
    expect(existsSync(pidFile)).toBe(true);

    const pid = getRunningPid(tmpDir)!;
    expect(isProcessAlive(pid)).toBe(true);
  });

  test("start results in a server responding to HTTP", async () => {
    const result = ctl(tmpDir, "start");
    expect(result.exitCode).toBe(0);

    const port = getRunningPort(tmpDir);
    expect(port).not.toBeNull();

    const resp = await fetch(`http://127.0.0.1:${port}/`);
    expect(resp.status).toBe(200);
  });

  test("stop terminates the process and removes PID file", async () => {
    ctl(tmpDir, "start");
    const pid = getRunningPid(tmpDir);
    expect(pid).not.toBeNull();

    const result = ctl(tmpDir, "stop");
    expect(result.exitCode).toBe(0);

    // Wait briefly for process cleanup
    await Bun.sleep(500);
    expect(isProcessAlive(pid!)).toBe(false);

    const pidFile = join(getStateDir(tmpDir), "pid");
    expect(existsSync(pidFile)).toBe(false);
  });

  test("status shows running state", () => {
    ctl(tmpDir, "start");
    const result = ctl(tmpDir, "status");
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toLowerCase();
    expect(output).toContain("running");
    expect(output).toContain("pid");
    expect(output.replace("localhost", "127.0.0.1")).toContain("http://127.0.0.1:");
  });

  test("stale PID is cleaned up and new server starts", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    // PID 99999 is almost certainly dead
    writeFileSync(join(stateDir, "pid"), "99999\n");
    writeFileSync(join(stateDir, "port"), "8420\n");
    writeFileSync(join(stateDir, "root"), tmpDir + "\n");

    const result = ctl(tmpDir, "start");
    expect(result.exitCode).toBe(0);

    const pid = getRunningPid(tmpDir);
    expect(pid).not.toBeNull();
    expect(pid).not.toBe(99999);
  });

  test("idempotent start reports existing instance", () => {
    ctl(tmpDir, "start");
    const pid1 = getRunningPid(tmpDir);

    const result = ctl(tmpDir, "start");
    expect(result.exitCode).toBe(0);

    const pid2 = getRunningPid(tmpDir);
    expect(pid2).toBe(pid1);
    expect(result.stdout.toLowerCase()).toContain("already running");
  });

  test("start rotates existing log file", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    const logFile = join(stateDir, "dashboard.log");
    writeFileSync(logFile, "old log content\n");

    ctl(tmpDir, "start");

    const rotated = logFile + ".1";
    expect(existsSync(rotated)).toBe(true);
    expect(readFileSync(rotated, "utf-8")).toContain("old log content");
  });

  test("auto-selects next port when default is occupied", async () => {
    // Occupy port 8420 with a dummy server
    let dummy: ReturnType<typeof Bun.serve> | null = null;
    try {
      dummy = Bun.serve({
        port: 8420,
        fetch() { return new Response("ok"); },
      });
    } catch {
      // Port already in use — auto-selection should still work
    }

    try {
      const result = ctl(tmpDir, "start");
      expect(result.exitCode).toBe(0);

      const port = getRunningPort(tmpDir);
      expect(port).not.toBeNull();
      expect(port).not.toBe(8420);
      expect(port!).toBeGreaterThanOrEqual(8421);
      expect(port!).toBeLessThanOrEqual(8429);
    } finally {
      dummy?.stop();
    }
  });
});

describe("Channel Detection", () => {
  let tmpDir: string;
  let channelServer: ReturnType<typeof Bun.serve> | null = null;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "ctl-channel-test-"));
    makeProject(tmpDir);
  });

  afterEach(() => {
    try { ctl(tmpDir, "stop"); } catch {}
    try { ctl(tmpDir, "tunnel", "stop"); } catch {}
    channelServer?.stop();
    channelServer = null;
    // Clean up channel_port state file
    const stateDir = getStateDir(tmpDir);
    const channelPortFile = join(stateDir, "channel_port");
    if (existsSync(channelPortFile)) {
      rmSync(channelPortFile);
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("status shows channel instance when channel_port file exists and port responds", () => {
    // Simulate a channel.ts instance: write channel_port + serve HTTP
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");
    writeFileSync(join(stateDir, "root"), tmpDir + "\n");

    const result = ctl(tmpDir, "status");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("channel");
    expect(result.stdout).toContain(String(channelPort));
  });

  test("status cleans stale channel_port when port is not in use", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    // Write a port that nothing is listening on
    writeFileSync(join(stateDir, "channel_port"), "19999\n");
    writeFileSync(join(stateDir, "root"), tmpDir + "\n");

    const result = ctl(tmpDir, "status");
    expect(result.exitCode).toBe(0);
    // Should NOT show channel as running
    expect(result.stdout.toLowerCase()).not.toContain("channel");
    // Stale file should be cleaned
    expect(existsSync(join(stateDir, "channel_port"))).toBe(false);
  });

  test("tunnel start works with channel-only instance (no PID file)", () => {
    // This test requires ngrok, so we just verify ctl.sh doesn't reject
    // with "dashboard is not running" when channel_port exists
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");

    const result = ctl(tmpDir, "tunnel", "start");
    // Should NOT fail with "dashboard is not running"
    // It may fail with "ngrok not found" -- that's fine, it means we passed the guard
    if (result.exitCode !== 0) {
      expect(result.stderr).not.toContain("dashboard is not running");
    }
  }, 20_000);

  test("status --all shows channel-only instances", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");
    writeFileSync(join(stateDir, "root"), tmpDir + "\n");

    const result = ctl(tmpDir, "status", "--all");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toLowerCase()).toContain("channel");
    expect(result.stdout).toContain(String(channelPort));
  });

  test("stop does NOT kill channel instance (only ctl-managed server)", () => {
    const stateDir = getStateDir(tmpDir);
    mkdirSync(stateDir, { recursive: true });
    channelServer = Bun.serve({
      port: 0,
      fetch() { return new Response("ok"); },
    });
    const channelPort = channelServer.port;
    writeFileSync(join(stateDir, "channel_port"), String(channelPort) + "\n");

    const result = ctl(tmpDir, "stop");
    expect(result.exitCode).toBe(0);
    // channel_port file should remain (channel is Claude Code-managed)
    expect(existsSync(join(stateDir, "channel_port"))).toBe(true);
  });
});
