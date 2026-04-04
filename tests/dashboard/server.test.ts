import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("Dashboard Server", () => {
  let tmpDir: string;
  let server: ReturnType<typeof import("../../tools/dashboard/src/server").createServer> extends Promise<infer T> ? T : never;
  let baseUrl: string;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "server-test-"));

    // Create a workflow structure
    const wfDir = join(tmpDir, "docs", "build-pipeline");
    mkdirSync(wfDir, { recursive: true });
    writeFileSync(join(wfDir, "README.md"), [
      "---",
      "commissioned-by: spacedock@v1",
      "entity-type: feature",
      "stages:",
      "  states:",
      "    - name: plan",
      "    - name: execute",
      "---",
      "",
      "Workflow",
    ].join("\n"));
    writeFileSync(join(wfDir, "feat-a.md"), "---\nid: 001\ntitle: Feature A\nstatus: plan\nscore: 0.8\ntags: urgent\n---\n\nBody A\n");
    writeFileSync(join(wfDir, "feat-b.md"), "---\nid: 002\ntitle: Feature B\nstatus: execute\nscore: 0.5\n---\n\nBody B\n");

    // Create static dir with test files
    const staticDir = join(tmpDir, "static");
    mkdirSync(staticDir);
    writeFileSync(join(staticDir, "index.html"), "<html><body>Dashboard</body></html>");
    writeFileSync(join(staticDir, "detail.html"), "<html><body>Detail</body></html>");
    writeFileSync(join(staticDir, "style.css"), "body { color: white; }");
    writeFileSync(join(staticDir, "app.js"), "console.log('app');");

    // Import and start server
    const { createServer } = await import("../../tools/dashboard/src/server");
    const srv = createServer({ port: 0, projectRoot: tmpDir, staticDir });
    baseUrl = `http://localhost:${srv.port}`;
    server = srv;
  });

  afterAll(() => {
    server?.stop();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("GET /api/workflows returns workflow data", async () => {
    const res = await fetch(`${baseUrl}/api/workflows`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].name).toBe("build-pipeline");
    expect(data[0].entities.length).toBe(2);
  });

  test("GET /api/entity/detail returns entity detail", async () => {
    const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
    const res = await fetch(`${baseUrl}/api/entity/detail?path=${encodeURIComponent(filepath)}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.frontmatter.title).toBe("Feature A");
    expect(data.tags).toEqual(["urgent"]);
    expect(data.filepath).toBe(filepath);
  });

  test("GET /api/entity/detail returns 400 without path param", async () => {
    const res = await fetch(`${baseUrl}/api/entity/detail`);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("path required");
  });

  test("GET /api/entity/detail returns 403 for path traversal", async () => {
    const res = await fetch(`${baseUrl}/api/entity/detail?path=${encodeURIComponent("/etc/passwd")}`);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  test("GET /api/entities returns filtered entities", async () => {
    const dir = join(tmpDir, "docs", "build-pipeline");
    const res = await fetch(`${baseUrl}/api/entities?dir=${encodeURIComponent(dir)}&status=plan`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].frontmatter.title).toBe("Feature A");
  });

  test("POST /api/entity/score updates score", async () => {
    const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
    const res = await fetch(`${baseUrl}/api/entity/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filepath, score: 0.99 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("score: 0.99");
  });

  test("POST /api/entity/tags updates tags", async () => {
    const filepath = join(tmpDir, "docs", "build-pipeline", "feat-a.md");
    const res = await fetch(`${baseUrl}/api/entity/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filepath, tags: ["critical", "backend"] }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    const content = readFileSync(filepath, "utf-8");
    expect(content).toContain("tags: critical,backend");
  });

  test("POST /api/entity/score returns 403 for path traversal", async () => {
    const res = await fetch(`${baseUrl}/api/entity/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/etc/passwd", score: 1.0 }),
    });
    expect(res.status).toBe(403);
  });

  test("GET / serves index.html", async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const text = await res.text();
    expect(text).toContain("Dashboard");
  });

  test("GET /detail serves detail.html", async () => {
    const res = await fetch(`${baseUrl}/detail`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Detail");
  });

  test("GET /style.css serves static file with correct MIME", async () => {
    const res = await fetch(`${baseUrl}/style.css`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/css");
  });

  test("GET /nonexistent returns 404", async () => {
    const res = await fetch(`${baseUrl}/nonexistent`);
    expect(res.status).toBe(404);
  });

  test("POST /api/unknown returns 404", async () => {
    const res = await fetch(`${baseUrl}/api/unknown`, { method: "POST" });
    expect(res.status).toBe(404);
  });

  test("route handler error returns 500 and does not crash server", async () => {
    const badFile = join(tmpDir, "docs", "build-pipeline", "bad-entity.md");
    writeFileSync(badFile, "not valid frontmatter at all");
    const res = await fetch(
      `${baseUrl}/api/entity/detail?path=${encodeURIComponent(badFile)}`
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
