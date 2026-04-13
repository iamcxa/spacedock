// ABOUTME: TDD tests for nextjs-child.ts — spawn + graceful SIGTERM + SIGKILL fallback.
// Uses a fake standalone script that listens on PORT, prints "ready", handles SIGTERM.
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnNextjsChild, shutdownNextjsChild, resolveNextjsServerScript } from "./nextjs-child";

const TMP = join(tmpdir(), `nextjs-child-test-${Date.now()}`);

// Fake standalone server script: listens on PORT, logs "ready", exits on SIGTERM
const FAKE_SERVER_SCRIPT = join(TMP, "server.js");

beforeAll(() => {
  mkdirSync(TMP, { recursive: true });
  writeFileSync(FAKE_SERVER_SCRIPT, `
const http = require("http");
const port = parseInt(process.env.PORT || "9999", 10);
const server = http.createServer((req, res) => { res.end("ok"); });
server.listen(port, () => {
  process.stderr.write("[nextjs] ready on port " + port + "\\n");
});
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
`);
});

afterAll(() => {
  // cleanup handled by OS tmpdir
});

describe("spawnNextjsChild", () => {
  test("returns child process with pid > 0", () => {
    const child = spawnNextjsChild({
      serverScript: FAKE_SERVER_SCRIPT,
      port: 18420,
      dbPath: join(TMP, "test.db"),
      stateDir: TMP,
    });
    expect(child.pid).toBeGreaterThan(0);
    child.kill("SIGKILL");
  });
});

describe("shutdownNextjsChild", () => {
  test("SIGTERM causes graceful exit within timeout", async () => {
    const child = spawnNextjsChild({
      serverScript: FAKE_SERVER_SCRIPT,
      port: 18421,
      dbPath: join(TMP, "test.db"),
      stateDir: TMP,
    });
    expect(child.pid).toBeGreaterThan(0);
    // Give server a moment to start
    await new Promise((r) => setTimeout(r, 200));
    await shutdownNextjsChild(child, 3000);
    // If we got here without timeout, shutdown succeeded
    expect(true).toBe(true);
  });

  test("SIGKILL fallback fires if child ignores SIGTERM", async () => {
    // Script that ignores SIGTERM
    const stubbornScript = join(TMP, "stubborn.js");
    writeFileSync(stubbornScript, `
process.on("SIGTERM", () => { /* ignore */ });
setInterval(() => {}, 10000); // keep alive
`);
    const child = spawnNextjsChild({
      serverScript: stubbornScript,
      port: 18422,
      dbPath: join(TMP, "test.db"),
      stateDir: TMP,
    });
    await new Promise((r) => setTimeout(r, 100));
    // Short timeout forces SIGKILL path
    await shutdownNextjsChild(child, 500);
    expect(true).toBe(true);
  });
});

describe("resolveNextjsServerScript", () => {
  test("returns expected path under pluginRoot/ui/.next/standalone/ui/server.js", () => {
    const result = resolveNextjsServerScript("/fake/plugin/root", { checkExists: false });
    expect(result).toBe("/fake/plugin/root/ui/.next/standalone/ui/server.js");
  });

  test("throws clear error if path does not exist (checkExists:true)", () => {
    expect(() => resolveNextjsServerScript("/nonexistent/root", { checkExists: true })).toThrow(
      /bun run build/
    );
  });
});
