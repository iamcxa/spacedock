# Dashboard Auth + Shareable Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deployment-agnostic authentication and shareable access to the Spacedock Dashboard -- captain can create scoped share links with passwords and TTL, reviewers see only authorized entities, and ngrok tunnel provides optional public URL for local Mac users.

**Architecture:** Three layers built bottom-up. (1) Auth middleware in server.ts -- `--host` flag controls bind address (default 127.0.0.1), token-based sessions, localhost bypass for backward compatibility. (2) Share registry -- in-memory Map of ShareLink objects with password (argon2id via Bun.password), TTL, entity/phase scope; scoped API routes and WebSocket endpoint filter events per-token. (3) ngrok integration -- `ctl.sh start --tunnel` spawns ngrok subprocess, captures tunnel URL via local API, writes to state dir.

**Tech Stack:** Bun 1.3.9, TypeScript, Bun.password (argon2id), Bun.serve() dynamic routes, bun:test. No new dependencies.

**Research corrections incorporated:**
1. Server binds 0.0.0.0 by default (not 127.0.0.1) -- `--host` flag with default `127.0.0.1` fixes this.
2. Bun.password hash/verify with argon2id confirmed -- async API, auto-generated salt.
3. ngrok free tier: interstitial warning page (header workaround `ngrok-skip-browser-warning`), 20K monthly request cap, assigned dev domain.
4. Cloudflare quick tunnel: NO SSE support, WebSocket unconfirmed -- experimental fallback only.
5. Frontend-only WebSocket filtering leaks all events -- scoped `/ws/share/:token/activity` endpoint required.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `tools/dashboard/src/auth.ts` | ShareLink type, ShareRegistry class (in-memory Map), password hash/verify, token generation, TTL enforcement |
| Modify | `tools/dashboard/src/types.ts` | Add `ShareLink`, `ShareSession` interfaces, extend `Comment.author` union with `"guest"`, add `"share_created"` to `AgentEventType` |
| Modify | `tools/dashboard/src/events.ts` | Add `"share_created"` to `VALID_EVENT_TYPES` |
| Modify | `tools/dashboard/src/server.ts` | Add `--host` flag, auth middleware for `/share/:token/*` routes, share CRUD API, scoped WebSocket endpoint, share page route |
| Modify | `tools/dashboard/src/comments.ts` | Allow `"guest"` as author in `addComment` (already supported via `author?` param -- type change only) |
| Create | `tools/dashboard/static/share.html` | Password entry + scoped reviewer view (standalone page) |
| Create | `tools/dashboard/static/share.js` | Password verification form, scoped entity rendering, comment/approve actions, scoped WebSocket connection |
| Modify | `tools/dashboard/static/detail.html` | Add share panel section in sidebar |
| Modify | `tools/dashboard/static/detail.js` | Add share link creation modal and management UI |
| Modify | `tools/dashboard/ctl.sh` | Add `--tunnel` flag, ngrok subprocess spawn, tunnel URL capture, `TUNNEL_URL_FILE` in state dir |
| Create | `tools/dashboard/src/auth.test.ts` | Unit tests for ShareRegistry -- create, verify, expire, scope |
| Create | `tests/dashboard/share.test.ts` | Integration tests for share routes -- create link, password verify, scope enforcement, expiry, scoped WebSocket |

---

## Task 1: Types and Event Infrastructure

**Files:**
- Modify: `tools/dashboard/src/types.ts`
- Modify: `tools/dashboard/src/events.ts`

This task extends the type system and event infrastructure to support share links. No tests needed -- these are type/config changes validated by Task 2's tests.

- [ ] **Step 1: Add share types to `types.ts`**

  Add after the `CommentThread` interface (line 145):

  ```typescript
  // --- Share Link Types ---

  export interface ShareLink {
    token: string;
    passwordHash: string;
    entityPaths: string[];       // scoped entity file paths
    stages: string[];            // scoped stages (empty = all)
    createdAt: string;           // ISO 8601
    expiresAt: string;           // ISO 8601
    label: string;               // human-readable label for UI
  }

  export interface ShareSession {
    token: string;               // maps back to ShareLink.token
    authenticatedAt: string;     // ISO 8601
  }
  ```

- [ ] **Step 2: Extend `Comment.author` union**

  In `types.ts` line 121, change:

  ```typescript
  author: "captain" | "fo";
  ```

  to:

  ```typescript
  author: "captain" | "fo" | "guest";
  ```

  Also update `CommentReply.author` on line 129 the same way:

  ```typescript
  author: "captain" | "fo" | "guest";
  ```

- [ ] **Step 3: Add `share_created` to `AgentEventType`**

  In `types.ts` line 78, add `"share_created"` to the union:

  ```typescript
  export type AgentEventType = "dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle"
    | "channel_message" | "channel_response" | "permission_request" | "permission_response"
    | "comment" | "suggestion" | "gate_decision" | "share_created";
  ```

- [ ] **Step 4: Add `share_created` to `VALID_EVENT_TYPES` in `events.ts`**

  In `events.ts` line 3-7, add `"share_created"` to the Set:

  ```typescript
  const VALID_EVENT_TYPES: Set<string> = new Set([
    "dispatch", "completion", "gate", "feedback", "merge", "idle",
    "channel_message", "channel_response", "permission_request", "permission_response",
    "comment", "suggestion", "gate_decision", "share_created",
  ]);
  ```

- [ ] **Step 5: Verify type check passes**

  Run: `cd tools/dashboard && bunx tsc --noEmit`
  Expected: No errors (types are additive, no existing code breaks).

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/types.ts tools/dashboard/src/events.ts
  git commit -m "feat(share): add ShareLink types and share_created event type"
  ```

---

## Task 2: ShareRegistry -- Auth Core Module

**Files:**
- Create: `tools/dashboard/src/auth.ts`
- Create: `tools/dashboard/src/auth.test.ts`

The ShareRegistry is the core of the auth system. It manages share link lifecycle: create (with password hashing), verify (password check + TTL check), lookup, and delete. Test-first.

- [ ] **Step 1: Write failing tests for ShareRegistry**

  Create `tools/dashboard/src/auth.test.ts`:

  ```typescript
  import { describe, test, expect, beforeEach } from "bun:test";
  import { ShareRegistry } from "./auth";

  let registry: ShareRegistry;

  beforeEach(() => {
    registry = new ShareRegistry();
  });

  describe("ShareRegistry.create", () => {
    test("creates a share link with hashed password and returns token", async () => {
      const link = await registry.create({
        password: "reviewer-pass-123",
        entityPaths: ["/path/to/entity.md"],
        stages: [],
        label: "Test Link",
        ttlHours: 24,
      });
      expect(link.token).toBeTruthy();
      expect(link.token.length).toBeGreaterThan(16);
      expect(link.passwordHash).not.toBe("reviewer-pass-123");
      expect(link.passwordHash).toContain("$argon2");
      expect(link.entityPaths).toEqual(["/path/to/entity.md"]);
      expect(link.stages).toEqual([]);
      expect(link.label).toBe("Test Link");
      expect(new Date(link.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    test("generates unique tokens for each link", async () => {
      const link1 = await registry.create({
        password: "pass1",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Link 1",
        ttlHours: 24,
      });
      const link2 = await registry.create({
        password: "pass2",
        entityPaths: ["/b.md"],
        stages: [],
        label: "Link 2",
        ttlHours: 24,
      });
      expect(link1.token).not.toBe(link2.token);
    });
  });

  describe("ShareRegistry.verify", () => {
    test("returns true for correct password on valid link", async () => {
      const link = await registry.create({
        password: "correct-password",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Test",
        ttlHours: 24,
      });
      const result = await registry.verify(link.token, "correct-password");
      expect(result).toBe(true);
    });

    test("returns false for wrong password", async () => {
      const link = await registry.create({
        password: "correct-password",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Test",
        ttlHours: 24,
      });
      const result = await registry.verify(link.token, "wrong-password");
      expect(result).toBe(false);
    });

    test("returns false for non-existent token", async () => {
      const result = await registry.verify("nonexistent-token", "any-pass");
      expect(result).toBe(false);
    });

    test("returns false for expired link", async () => {
      const link = await registry.create({
        password: "pass",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Expired",
        ttlHours: 0,
      });
      // Force expiry by setting expiresAt to the past
      const stored = registry.get(link.token)!;
      stored.expiresAt = new Date(Date.now() - 1000).toISOString();
      const result = await registry.verify(link.token, "pass");
      expect(result).toBe(false);
    });
  });

  describe("ShareRegistry.get", () => {
    test("returns link for valid token", async () => {
      const link = await registry.create({
        password: "pass",
        entityPaths: ["/a.md"],
        stages: ["explore"],
        label: "My Link",
        ttlHours: 12,
      });
      const found = registry.get(link.token);
      expect(found).not.toBeNull();
      expect(found!.entityPaths).toEqual(["/a.md"]);
      expect(found!.stages).toEqual(["explore"]);
    });

    test("returns null for expired link and auto-cleans", async () => {
      const link = await registry.create({
        password: "pass",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Expired",
        ttlHours: 0,
      });
      const stored = registry.get(link.token)!;
      stored.expiresAt = new Date(Date.now() - 1000).toISOString();
      const found = registry.get(link.token);
      expect(found).toBeNull();
    });

    test("returns null for unknown token", () => {
      const found = registry.get("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("ShareRegistry.list", () => {
    test("returns all non-expired links", async () => {
      await registry.create({
        password: "p1",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Link A",
        ttlHours: 24,
      });
      await registry.create({
        password: "p2",
        entityPaths: ["/b.md"],
        stages: [],
        label: "Link B",
        ttlHours: 24,
      });
      const all = registry.list();
      expect(all.length).toBe(2);
    });

    test("excludes expired links from list", async () => {
      const link = await registry.create({
        password: "p",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Expired",
        ttlHours: 1,
      });
      // Force expiry via direct Map access
      const stored = registry["links"].get(link.token)!;
      stored.expiresAt = new Date(Date.now() - 1000).toISOString();
      const all = registry.list();
      expect(all.length).toBe(0);
    });
  });

  describe("ShareRegistry.delete", () => {
    test("removes a link by token", async () => {
      const link = await registry.create({
        password: "p",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Deletable",
        ttlHours: 24,
      });
      const deleted = registry.delete(link.token);
      expect(deleted).toBe(true);
      expect(registry.get(link.token)).toBeNull();
    });

    test("returns false for unknown token", () => {
      expect(registry.delete("nonexistent")).toBe(false);
    });
  });

  describe("ShareRegistry.isInScope", () => {
    test("returns true when entity path is in scope", async () => {
      const link = await registry.create({
        password: "p",
        entityPaths: ["/a.md", "/b.md"],
        stages: [],
        label: "Scoped",
        ttlHours: 24,
      });
      expect(registry.isInScope(link.token, "/a.md")).toBe(true);
      expect(registry.isInScope(link.token, "/b.md")).toBe(true);
    });

    test("returns false when entity path is not in scope", async () => {
      const link = await registry.create({
        password: "p",
        entityPaths: ["/a.md"],
        stages: [],
        label: "Scoped",
        ttlHours: 24,
      });
      expect(registry.isInScope(link.token, "/c.md")).toBe(false);
    });

    test("returns false for unknown token", () => {
      expect(registry.isInScope("unknown", "/a.md")).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd tools/dashboard && bun test src/auth.test.ts`
  Expected: FAIL -- module `./auth` not found.

- [ ] **Step 3: Implement ShareRegistry**

  Create `tools/dashboard/src/auth.ts`:

  ```typescript
  import type { ShareLink } from "./types";

  export interface CreateShareInput {
    password: string;
    entityPaths: string[];
    stages: string[];
    label: string;
    ttlHours: number;
  }

  function generateToken(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  export class ShareRegistry {
    private links: Map<string, ShareLink> = new Map();

    async create(input: CreateShareInput): Promise<ShareLink> {
      const token = generateToken();
      const passwordHash = await Bun.password.hash(input.password);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + input.ttlHours * 60 * 60 * 1000);

      const link: ShareLink = {
        token,
        passwordHash,
        entityPaths: input.entityPaths,
        stages: input.stages,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        label: input.label,
      };

      this.links.set(token, link);
      return link;
    }

    async verify(token: string, password: string): Promise<boolean> {
      const link = this.get(token);
      if (!link) return false;
      return Bun.password.verify(password, link.passwordHash);
    }

    get(token: string): ShareLink | null {
      const link = this.links.get(token);
      if (!link) return null;
      if (new Date(link.expiresAt).getTime() < Date.now()) {
        this.links.delete(token);
        return null;
      }
      return link;
    }

    list(): ShareLink[] {
      const now = Date.now();
      const result: ShareLink[] = [];
      for (const [token, link] of this.links) {
        if (new Date(link.expiresAt).getTime() < now) {
          this.links.delete(token);
        } else {
          result.push(link);
        }
      }
      return result;
    }

    delete(token: string): boolean {
      return this.links.delete(token);
    }

    isInScope(token: string, entityPath: string): boolean {
      const link = this.get(token);
      if (!link) return false;
      return link.entityPaths.includes(entityPath);
    }

    entries(): IterableIterator<[string, ShareLink]> {
      return this.links.entries();
    }
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd tools/dashboard && bun test src/auth.test.ts`
  Expected: All tests PASS.

- [ ] **Step 5: Run full test suite to check no regressions**

  Run: `cd tools/dashboard && bun test`
  Expected: All existing tests still pass.

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/auth.ts tools/dashboard/src/auth.test.ts
  git commit -m "feat(share): add ShareRegistry with password hashing and TTL"
  ```

---

## Task 3: --host Flag and Bind Address Control

**Files:**
- Modify: `tools/dashboard/src/server.ts`

This task adds the `--host` flag to control the bind address. Default changes from 0.0.0.0 (Bun default) to 127.0.0.1 (secure default). This is a critical security fix -- the server is currently LAN-accessible without auth.

- [ ] **Step 1: Add `hostname` to `ServerOptions` and `Bun.serve()` call**

  In `server.ts`, add `hostname` to the `ServerOptions` interface (line 19-25):

  ```typescript
  interface ServerOptions {
    port: number;
    hostname: string;
    projectRoot: string;
    staticDir?: string;
    logFile?: string;
    onChannelMessage?: (content: string, meta?: Record<string, string>) => void;
  }
  ```

  In `Bun.serve()` call (line 58), add hostname:

  ```typescript
  const server = Bun.serve({
    port: opts.port,
    hostname: opts.hostname,
    routes: {
  ```

- [ ] **Step 2: Add `--host` CLI argument and update `createServer` call**

  In the CLI entry point (line 643-651), add `host` to `parseArgs`:

  ```typescript
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      port: { type: "string", default: "8420" },
      host: { type: "string", default: "127.0.0.1" },
      root: { type: "string" },
      "log-file": { type: "string" },
    },
    strict: true,
  });
  ```

  Update the `createServer` call (line 668):

  ```typescript
  const hostname = values.host!;
  const server = createServer({ port, hostname, projectRoot, staticDir, logFile });
  ```

  Update the banner (line 670):

  ```typescript
  const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] Spacedock Dashboard started on http://${hostname}:${server.port}/ (root: ${projectRoot})`;
  ```

- [ ] **Step 3: Verify type check passes**

  Run: `cd tools/dashboard && bunx tsc --noEmit`
  Expected: Errors for missing `hostname` in other `createServer` callers (if any). Check and fix.

- [ ] **Step 4: Update test files that call `createServer` directly**

  Search for `createServer` calls in test files and add `hostname: "127.0.0.1"`:

  Run: `grep -rn "createServer" tools/dashboard/`

  For each test that calls `createServer(...)`, add `hostname: "127.0.0.1"` to the options object.

- [ ] **Step 5: Run full test suite**

  Run: `cd tools/dashboard && bun test`
  Expected: All tests PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/server.ts
  git commit -m "feat(auth): add --host flag, default bind to 127.0.0.1 for security"
  ```

---

## Task 4: Share Link CRUD API Routes

**Files:**
- Modify: `tools/dashboard/src/server.ts`
- Create: `tests/dashboard/share.test.ts`

This task adds the API routes for creating, listing, and deleting share links. The ShareRegistry is instantiated in `createServer` and exposed via REST endpoints. Test-first.

- [ ] **Step 1: Write integration tests for share CRUD**

  Create `tests/dashboard/share.test.ts`:

  ```typescript
  import { describe, test, expect, beforeAll, afterAll } from "bun:test";
  import { mkdirSync, writeFileSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { createServer } from "../../tools/dashboard/src/server";

  const TMP = join(import.meta.dir, "__test_share__");
  const ENTITY_PATH = join(TMP, "docs/build-pipeline/test-entity.md");
  const ENTITY_CONTENT = "---\nid: 001\ntitle: Test\nstatus: explore\n---\n\nBody text.\n";

  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(() => {
    mkdirSync(join(TMP, "docs/build-pipeline"), { recursive: true });
    writeFileSync(ENTITY_PATH, ENTITY_CONTENT);
    server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
    });
    baseUrl = `http://127.0.0.1:${server.port}`;
  });

  afterAll(() => {
    server.stop();
    rmSync(TMP, { recursive: true, force: true });
  });

  describe("POST /api/share", () => {
    test("creates a share link and returns token", async () => {
      const res = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "reviewer-pass",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Test Share",
          ttlHours: 24,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.token).toBeTruthy();
      expect(data.label).toBe("Test Share");
      expect(data.entityPaths).toEqual([ENTITY_PATH]);
      // passwordHash must NOT be returned to client
      expect(data.passwordHash).toBeUndefined();
    });

    test("returns 400 when password is missing", async () => {
      const res = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "No Pass",
          ttlHours: 24,
        }),
      });
      expect(res.status).toBe(400);
    });

    test("returns 400 when entityPaths is empty", async () => {
      const res = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "pass",
          entityPaths: [],
          stages: [],
          label: "Empty",
          ttlHours: 24,
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/share/list", () => {
    test("returns all active share links without passwordHash", async () => {
      const res = await fetch(`${baseUrl}/api/share/list`);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(Array.isArray(data.links)).toBe(true);
      for (const link of data.links) {
        expect(link.passwordHash).toBeUndefined();
        expect(link.token).toBeTruthy();
      }
    });
  });

  describe("DELETE /api/share/:token", () => {
    test("deletes an existing share link", async () => {
      // Create a link first
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "to-delete",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Deletable",
          ttlHours: 24,
        }),
      });
      const { token } = await createRes.json() as any;

      const delRes = await fetch(`${baseUrl}/api/share/${token}`, {
        method: "DELETE",
      });
      expect(delRes.status).toBe(200);

      // Verify it's gone
      const listRes = await fetch(`${baseUrl}/api/share/list`);
      const { links } = await listRes.json() as any;
      const found = links.find((l: any) => l.token === token);
      expect(found).toBeUndefined();
    });

    test("returns 404 for unknown token", async () => {
      const res = await fetch(`${baseUrl}/api/share/nonexistent`, {
        method: "DELETE",
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/share/:token/verify", () => {
    test("returns 200 with scope for correct password", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "verify-me",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Verify Test",
          ttlHours: 24,
        }),
      });
      const { token } = await createRes.json() as any;

      const verifyRes = await fetch(`${baseUrl}/api/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "verify-me" }),
      });
      expect(verifyRes.status).toBe(200);
      const data = await verifyRes.json() as any;
      expect(data.ok).toBe(true);
      expect(data.scope).toBeTruthy();
      expect(data.scope.entityPaths).toEqual([ENTITY_PATH]);
    });

    test("returns 401 for wrong password", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "correct",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Auth Test",
          ttlHours: 24,
        }),
      });
      const { token } = await createRes.json() as any;

      const verifyRes = await fetch(`${baseUrl}/api/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wrong" }),
      });
      expect(verifyRes.status).toBe(401);
    });

    test("returns 404 for expired link", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "pass",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Expired",
          ttlHours: 0,
        }),
      });
      const { token } = await createRes.json() as any;

      // Force expiry via internal registry access
      const link = server.shareRegistry.get(token);
      if (link) link.expiresAt = new Date(Date.now() - 1000).toISOString();

      const verifyRes = await fetch(`${baseUrl}/api/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "pass" }),
      });
      expect(verifyRes.status).toBe(404);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd tools/dashboard && bun test ../../tests/dashboard/share.test.ts`
  Expected: FAIL -- no `/api/share` route exists yet.

- [ ] **Step 3: Add ShareRegistry to server and implement share CRUD routes**

  In `server.ts`, add import at the top:

  ```typescript
  import { ShareRegistry } from "./auth";
  ```

  Inside `createServer()`, instantiate the registry (after `const eventBuffer`):

  ```typescript
  const shareRegistry = new ShareRegistry();
  ```

  Add these routes inside the `routes: {}` block:

  ```typescript
  "/api/share": {
    POST: async (req) => {
      try {
        const body = await req.json() as {
          password?: string;
          entityPaths?: string[];
          stages?: string[];
          label?: string;
          ttlHours?: number;
        };
        if (!body.password) {
          logRequest(req, 400);
          return jsonResponse({ error: "Missing required field: password" }, 400);
        }
        if (!body.entityPaths || body.entityPaths.length === 0) {
          logRequest(req, 400);
          return jsonResponse({ error: "Missing required field: entityPaths (must be non-empty)" }, 400);
        }
        const link = await shareRegistry.create({
          password: body.password,
          entityPaths: body.entityPaths,
          stages: body.stages ?? [],
          label: body.label ?? "Share Link",
          ttlHours: body.ttlHours ?? 24,
        });
        // Publish share_created event
        const event: AgentEvent = {
          type: "share_created",
          entity: link.label,
          stage: "",
          agent: "captain",
          timestamp: new Date().toISOString(),
          detail: `Share link created: ${link.label} (${link.entityPaths.length} entities, expires ${link.expiresAt})`,
        };
        const entry = eventBuffer.push(event);
        server.publish("activity", JSON.stringify({ type: "event", data: entry }));
        // Return link WITHOUT passwordHash
        const { passwordHash, ...safeLink } = link;
        logRequest(req, 200);
        return jsonResponse(safeLink);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        logRequest(req, 500);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    },
  },
  "/api/share/list": {
    GET: (req) => {
      const links = shareRegistry.list().map(({ passwordHash, ...rest }) => rest);
      logRequest(req, 200);
      return jsonResponse({ links });
    },
  },
  ```

  For dynamic routes (`/api/share/:token/verify` and `DELETE /api/share/:token`), add them inside the `fetch()` fallback handler, before the static file serving section. In the `fetch(req)` function, after `const pathname = url.pathname;` add:

  ```typescript
  // Share link dynamic routes
  const shareVerifyMatch = pathname.match(/^\/api\/share\/([a-f0-9]+)\/verify$/);
  if (shareVerifyMatch && req.method === "POST") {
    const token = shareVerifyMatch[1];
    try {
      const body = await req.json() as { password?: string };
      if (!body.password) {
        logRequest(req, 400);
        return jsonResponse({ error: "Missing required field: password" }, 400);
      }
      const link = shareRegistry.get(token);
      if (!link) {
        logRequest(req, 404);
        return jsonResponse({ error: "Share link not found or expired" }, 404);
      }
      const valid = await shareRegistry.verify(token, body.password);
      if (!valid) {
        logRequest(req, 401);
        return jsonResponse({ error: "Invalid password" }, 401);
      }
      const { passwordHash, ...scope } = link;
      logRequest(req, 200);
      return jsonResponse({ ok: true, scope });
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)));
      logRequest(req, 500);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  }

  const shareDeleteMatch = pathname.match(/^\/api\/share\/([a-f0-9]+)$/);
  if (shareDeleteMatch && req.method === "DELETE") {
    const token = shareDeleteMatch[1];
    const deleted = shareRegistry.delete(token);
    if (!deleted) {
      logRequest(req, 404);
      return jsonResponse({ error: "Share link not found" }, 404);
    }
    logRequest(req, 200);
    return jsonResponse({ ok: true });
  }
  ```

  **Important:** The `fetch()` handler must become `async` for the `await req.json()` in the verify route. Change `fetch(req) {` to `async fetch(req) {`.

  At the bottom of `createServer`, expose shareRegistry on the returned server object:

  ```typescript
  return Object.assign(server, { eventBuffer, publishEvent, broadcastChannelStatus, shareRegistry });
  ```

- [ ] **Step 4: Run share tests**

  Run: `cd tools/dashboard && bun test ../../tests/dashboard/share.test.ts`
  Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

  Run: `cd tools/dashboard && bun test`
  Expected: All tests PASS (no regressions).

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/server.ts tests/dashboard/share.test.ts
  git commit -m "feat(share): add share link CRUD API routes with password verification"
  ```

---

## Task 5: Scoped Entity API for Share Viewers

**Files:**
- Modify: `tests/dashboard/share.test.ts`
- Modify: `tools/dashboard/src/server.ts`

Reviewers accessing via a share token should only see entities within their scope. This task adds scoped routes: `GET /api/share/:token/entity/detail`, `GET /api/share/:token/entity/comments`, and `POST /api/share/:token/entity/comment` (guest author).

- [ ] **Step 1: Add scoped entity tests**

  Append to `tests/dashboard/share.test.ts`:

  ```typescript
  describe("GET /api/share/:token/entity/detail", () => {
    let shareToken: string;

    beforeAll(async () => {
      const res = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "scope-test",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Scoped Detail",
          ttlHours: 24,
        }),
      });
      const data = await res.json() as any;
      shareToken = data.token;
    });

    test("returns entity detail for in-scope path", async () => {
      const res = await fetch(
        `${baseUrl}/api/share/${shareToken}/entity/detail?path=${encodeURIComponent(ENTITY_PATH)}`
      );
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.frontmatter.id).toBe("001");
    });

    test("returns 403 for out-of-scope path", async () => {
      const outOfScope = join(TMP, "docs/build-pipeline/other.md");
      writeFileSync(outOfScope, "---\nid: 002\ntitle: Other\nstatus: plan\n---\n\nOther body.\n");
      const res = await fetch(
        `${baseUrl}/api/share/${shareToken}/entity/detail?path=${encodeURIComponent(outOfScope)}`
      );
      expect(res.status).toBe(403);
    });

    test("returns 404 for expired token", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "expiry",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Expired Scope",
          ttlHours: 0,
        }),
      });
      const { token } = await createRes.json() as any;
      const link = server.shareRegistry.get(token);
      if (link) link.expiresAt = new Date(Date.now() - 1000).toISOString();

      const res = await fetch(
        `${baseUrl}/api/share/${token}/entity/detail?path=${encodeURIComponent(ENTITY_PATH)}`
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/share/:token/entity/comments", () => {
    test("returns comments for in-scope entity", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "comments-test",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Comments Scope",
          ttlHours: 24,
        }),
      });
      const { token } = await createRes.json() as any;

      const res = await fetch(
        `${baseUrl}/api/share/${token}/entity/comments?path=${encodeURIComponent(ENTITY_PATH)}`
      );
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.comments).toBeDefined();
    });
  });

  describe("POST /api/share/:token/entity/comment", () => {
    test("adds a guest comment on in-scope entity", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "guest-comment",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "Guest Comment",
          ttlHours: 24,
        }),
      });
      const { token } = await createRes.json() as any;

      const res = await fetch(`${baseUrl}/api/share/${token}/entity/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: ENTITY_PATH,
          selected_text: "Body text",
          section_heading: "",
          content: "Guest feedback here",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.author).toBe("guest");
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd tools/dashboard && bun test ../../tests/dashboard/share.test.ts`
  Expected: FAIL -- scoped routes not implemented yet.

- [ ] **Step 3: Implement scoped share routes in `fetch()` handler**

  In `server.ts`, inside the `fetch()` handler, add after the share verify/delete routes (before the static file section):

  ```typescript
  // Scoped share entity routes: /api/share/:token/entity/...
  const shareEntityMatch = pathname.match(/^\/api\/share\/([a-f0-9]+)\/entity\/(.+)$/);
  if (shareEntityMatch) {
    const token = shareEntityMatch[1];
    const subRoute = shareEntityMatch[2];
    const link = shareRegistry.get(token);
    if (!link) {
      logRequest(req, 404);
      return jsonResponse({ error: "Share link not found or expired" }, 404);
    }

    const url = new URL(req.url);

    if (subRoute === "detail" && req.method === "GET") {
      const filepath = url.searchParams.get("path");
      if (!filepath) {
        logRequest(req, 400);
        return jsonResponse({ error: "path required" }, 400);
      }
      if (!shareRegistry.isInScope(token, filepath)) {
        logRequest(req, 403);
        return jsonResponse({ error: "Entity not in share scope" }, 403);
      }
      if (!validatePath(filepath, projectRoot)) {
        logRequest(req, 403);
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      try {
        const data = getEntityDetail(filepath);
        logRequest(req, 200);
        return jsonResponse(data);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        logRequest(req, 500);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    if (subRoute === "comments" && req.method === "GET") {
      const filepath = url.searchParams.get("path");
      if (!filepath) {
        logRequest(req, 400);
        return jsonResponse({ error: "path required" }, 400);
      }
      if (!shareRegistry.isInScope(token, filepath)) {
        logRequest(req, 403);
        return jsonResponse({ error: "Entity not in share scope" }, 403);
      }
      if (!validatePath(filepath, projectRoot)) {
        logRequest(req, 403);
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      try {
        const thread = getComments(filepath);
        logRequest(req, 200);
        return jsonResponse(thread);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        logRequest(req, 500);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }

    if (subRoute === "comment" && req.method === "POST") {
      try {
        const body = await req.json() as {
          path: string;
          selected_text: string;
          section_heading: string;
          content: string;
        };
        if (!body.path || !body.selected_text || !body.content) {
          logRequest(req, 400);
          return jsonResponse({ error: "Missing required fields" }, 400);
        }
        if (!shareRegistry.isInScope(token, body.path)) {
          logRequest(req, 403);
          return jsonResponse({ error: "Entity not in share scope" }, 403);
        }
        if (!validatePath(body.path, projectRoot)) {
          logRequest(req, 403);
          return jsonResponse({ error: "Forbidden" }, 403);
        }
        const comment = addComment(body.path, {
          selected_text: body.selected_text,
          section_heading: body.section_heading,
          content: body.content,
          author: "guest",
        });
        logRequest(req, 200);
        return jsonResponse(comment);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        logRequest(req, 500);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    }
  }
  ```

- [ ] **Step 4: Run share tests**

  Run: `cd tools/dashboard && bun test ../../tests/dashboard/share.test.ts`
  Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

  Run: `cd tools/dashboard && bun test`
  Expected: All tests PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/server.ts tests/dashboard/share.test.ts
  git commit -m "feat(share): add scoped entity detail, comments, and guest comment routes"
  ```

---

## Task 6: Scoped WebSocket Endpoint

**Files:**
- Modify: `tools/dashboard/src/server.ts`
- Modify: `tools/dashboard/src/auth.ts`
- Modify: `tests/dashboard/share.test.ts`

This task adds a scoped WebSocket at `/ws/share/:token/activity` that only forwards events matching the share link's entity scope. This prevents event leakage to shared reviewers.

- [ ] **Step 1: Add scoped WebSocket tests**

  Append to `tests/dashboard/share.test.ts`:

  ```typescript
  describe("WebSocket /ws/share/:token/activity", () => {
    test("connects and receives replay for valid token", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "ws-test",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "WS Scoped",
          ttlHours: 24,
        }),
      });
      const { token } = await createRes.json() as any;

      const wsUrl = `ws://127.0.0.1:${server.port}/ws/share/${token}/activity`;
      const ws = new WebSocket(wsUrl);
      const messages: any[] = [];

      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });

      ws.onmessage = (ev) => {
        messages.push(JSON.parse(String(ev.data)));
      };

      // Wait for replay message
      await new Promise((r) => setTimeout(r, 200));
      ws.close();

      const replayMessages = messages.filter((m) => m.type === "replay");
      expect(replayMessages.length).toBe(1);
    });

    test("rejects connection for expired token", async () => {
      const createRes = await fetch(`${baseUrl}/api/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "ws-expire",
          entityPaths: [ENTITY_PATH],
          stages: [],
          label: "WS Expired",
          ttlHours: 0,
        }),
      });
      const { token } = await createRes.json() as any;
      const link = server.shareRegistry.get(token);
      if (link) link.expiresAt = new Date(Date.now() - 1000).toISOString();

      const wsUrl = `ws://127.0.0.1:${server.port}/ws/share/${token}/activity`;
      const ws = new WebSocket(wsUrl);

      const result = await new Promise<string>((resolve) => {
        ws.onopen = () => resolve("opened");
        ws.onerror = () => resolve("error");
        ws.onclose = () => resolve("closed");
        setTimeout(() => resolve("timeout"), 2000);
      });

      expect(result === "error" || result === "closed").toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd tools/dashboard && bun test ../../tests/dashboard/share.test.ts`
  Expected: FAIL -- scoped WebSocket endpoint not implemented.

- [ ] **Step 3: Implement scoped WebSocket**

  In `server.ts`, inside the `fetch()` handler, add the scoped WebSocket upgrade **before** the existing `/ws/activity` handler:

  ```typescript
  // Scoped WebSocket for share links
  const shareWsMatch = pathname.match(/^\/ws\/share\/([a-f0-9]+)\/activity$/);
  if (shareWsMatch) {
    const token = shareWsMatch[1];
    const link = shareRegistry.get(token);
    if (!link) {
      logRequest(req, 403);
      return new Response("Share link not found or expired", { status: 403 });
    }
    const upgraded = server.upgrade(req, {
      data: { shareToken: token, entityPaths: link.entityPaths },
    });
    if (upgraded) return undefined as any;
    logRequest(req, 400);
    return new Response("WebSocket upgrade failed", { status: 400 });
  }
  ```

  Modify the `websocket.open` handler to be scope-aware:

  ```typescript
  open(ws) {
    const wsData = ws.data as { shareToken?: string; entityPaths?: string[] } | undefined;
    if (wsData?.shareToken) {
      // Scoped share WebSocket -- subscribe to per-token topic
      ws.subscribe(`share:${wsData.shareToken}`);
      // Replay only scoped events
      const entitySlugs = new Set(
        (wsData.entityPaths ?? []).map((p: string) =>
          p.replace(/\.md$/, "").split("/").pop()!
        )
      );
      const events = eventBuffer.getAll().filter(
        (e) => entitySlugs.has(e.event.entity)
      );
      ws.send(JSON.stringify({ type: "replay", events }));
    } else {
      ws.subscribe("activity");
      const events = eventBuffer.getAll();
      ws.send(JSON.stringify({ type: "replay", events }));
      ws.send(JSON.stringify({ type: "channel_status", connected: channelConnected }));
    }
  },
  ```

  Update `close` handler:

  ```typescript
  close(ws) {
    const wsData = ws.data as { shareToken?: string } | undefined;
    if (wsData?.shareToken) {
      ws.unsubscribe(`share:${wsData.shareToken}`);
    } else {
      ws.unsubscribe("activity");
    }
  },
  ```

  Update `publishEvent` to also forward scoped events to share topics:

  ```typescript
  function publishEvent(event: AgentEvent): number {
    const entry = eventBuffer.push(event);
    server.publish("activity", JSON.stringify({ type: "event", data: entry }));
    // Forward to scoped share topics
    for (const [token, link] of shareRegistry.entries()) {
      const entitySlugs = new Set(
        link.entityPaths.map((p) => p.replace(/\.md$/, "").split("/").pop()!)
      );
      if (entitySlugs.has(event.entity)) {
        server.publish(`share:${token}`, JSON.stringify({ type: "event", data: entry }));
      }
    }
    return entry.seq;
  }
  ```

  Also consolidate existing inline `eventBuffer.push` + `server.publish` pairs to use `publishEvent` instead, so scoped forwarding works uniformly. Replace each pattern of:

  ```typescript
  const entry = eventBuffer.push(event);
  server.publish("activity", JSON.stringify({ type: "event", data: entry }));
  ```

  with:

  ```typescript
  publishEvent(event);
  ```

  This applies to: `/api/events` POST handler, `/api/channel/send` POST handler, `/api/entity/gate/decision` POST handler, `/api/share` POST handler, and the WebSocket `message` handler. Note: some of these use `entry.seq` for the response -- for those, keep `const seq = publishEvent(event);` and use `seq` in the response.

- [ ] **Step 4: Run share tests**

  Run: `cd tools/dashboard && bun test ../../tests/dashboard/share.test.ts`
  Expected: All tests PASS.

- [ ] **Step 5: Run full test suite**

  Run: `cd tools/dashboard && bun test`
  Expected: All tests PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/src/server.ts tools/dashboard/src/auth.ts tests/dashboard/share.test.ts
  git commit -m "feat(share): add scoped WebSocket endpoint with entity-filtered events"
  ```

---

## Task 7: Share Page -- Password Entry and Reviewer UI

**Files:**
- Create: `tools/dashboard/static/share.html`
- Create: `tools/dashboard/static/share.js`
- Modify: `tools/dashboard/src/server.ts`

This task creates the reviewer-facing share page. When a reviewer opens `/share/:token`, they see a password form. After verification, the page renders a scoped entity view with comment capabilities.

- [ ] **Step 1: Create share.html**

  Create `tools/dashboard/static/share.html`:

  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Spacedock -- Shared Review</title>
      <link rel="stylesheet" href="/detail.css">
      <style>
          .auth-container {
              max-width: 400px;
              margin: 120px auto;
              padding: 2rem;
              border: 1px solid var(--border, #333);
              border-radius: 8px;
              background: var(--bg-card, #1a1a2e);
          }
          .auth-container h2 { margin-top: 0; }
          .auth-container input[type="password"] {
              width: 100%;
              padding: 0.5rem;
              margin: 0.5rem 0;
              box-sizing: border-box;
              background: var(--bg-input, #0d0d1a);
              border: 1px solid var(--border, #333);
              color: var(--text, #e0e0e0);
              border-radius: 4px;
          }
          .auth-container .btn { width: 100%; margin-top: 0.5rem; }
          .auth-error { color: #ff6b6b; margin-top: 0.5rem; display: none; }
          .share-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.75rem 1rem;
              background: var(--bg-card, #1a1a2e);
              border-bottom: 1px solid var(--border, #333);
          }
          .share-header .label { font-weight: 600; }
          .share-header .expires { font-size: 0.85rem; opacity: 0.7; }
          .scoped-entities { padding: 1rem; }
          .entity-card {
              border: 1px solid var(--border, #333);
              border-radius: 6px;
              padding: 1rem;
              margin-bottom: 1rem;
              background: var(--bg-card, #1a1a2e);
              cursor: pointer;
          }
          .entity-card:hover { border-color: var(--accent, #4a9eff); }
          .entity-card h3 { margin: 0 0 0.5rem 0; }
          .entity-card .meta { font-size: 0.85rem; opacity: 0.7; }
      </style>
  </head>
  <body>
      <div id="auth-view" class="auth-container">
          <h2>Review Access</h2>
          <p id="share-label-display"></p>
          <input type="password" id="password-input" placeholder="Enter password" autofocus>
          <button id="verify-btn" class="btn">Verify</button>
          <p id="auth-error" class="auth-error">Incorrect password. Please try again.</p>
      </div>

      <div id="review-view" style="display:none;">
          <div class="share-header">
              <span class="label" id="review-label"></span>
              <span class="expires" id="review-expires"></span>
          </div>
          <div class="scoped-entities" id="entity-list">
              <!-- Entity cards rendered here by share.js -->
          </div>
          <div id="entity-detail-view" style="display:none;">
              <button id="back-to-list" class="btn btn-small" style="margin:1rem;">&larr; Back to list</button>
              <div class="detail-layout">
                  <main class="detail-main">
                      <section id="entity-body" class="entity-body"></section>
                  </main>
                  <aside class="detail-sidebar">
                      <section class="comments-panel" id="comments-panel">
                          <h3>Comments</h3>
                          <div id="comment-threads" class="comment-threads">
                              <div class="empty-state">Select text to add a comment</div>
                          </div>
                      </section>
                      <section class="gate-panel" id="gate-panel" style="display:none;">
                          <h3>Gate Review</h3>
                          <div id="gate-actions" class="gate-actions">
                              <button id="gate-approve-btn" class="btn gate-btn approve">Approve</button>
                              <button id="gate-request-changes-btn" class="btn gate-btn request-changes">Request Changes</button>
                          </div>
                      </section>
                  </aside>
              </div>
          </div>
      </div>

      <div id="comment-tooltip" class="comment-tooltip" style="display:none;">
          <textarea id="comment-input" class="comment-textarea" placeholder="Add a comment..." rows="2"></textarea>
          <div class="tooltip-actions">
              <button id="comment-submit" class="btn btn-small">Comment</button>
              <button id="comment-cancel" class="btn btn-small btn-secondary">Cancel</button>
          </div>
      </div>

      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
      <script src="/share.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 2: Create share.js**

  Create `tools/dashboard/static/share.js`:

  ```javascript
  (function () {
    "use strict";

    // Extract token from URL path: /share/:token
    var pathParts = window.location.pathname.split("/");
    var token = pathParts[2];
    if (!token) {
      document.getElementById("auth-view").textContent = "Invalid share link.";
      return;
    }

    var scope = null;

    // --- Auth View ---
    var authView = document.getElementById("auth-view");
    var reviewView = document.getElementById("review-view");
    var passwordInput = document.getElementById("password-input");
    var verifyBtn = document.getElementById("verify-btn");
    var authError = document.getElementById("auth-error");

    verifyBtn.addEventListener("click", doVerify);
    passwordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") doVerify();
    });

    function doVerify() {
      var password = passwordInput.value;
      if (!password) return;
      verifyBtn.disabled = true;
      authError.style.display = "none";

      fetch("/api/share/" + token + "/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password }),
      })
        .then(function (res) {
          if (res.status === 401) {
            authError.style.display = "block";
            verifyBtn.disabled = false;
            return null;
          }
          if (res.status === 404) {
            authView.textContent = "This share link has expired or does not exist.";
            return null;
          }
          return res.json();
        })
        .then(function (data) {
          if (!data) return;
          scope = data.scope;
          showReviewView();
        })
        .catch(function () {
          authError.textContent = "Connection error. Please try again.";
          authError.style.display = "block";
          verifyBtn.disabled = false;
        });
    }

    // --- Review View ---
    function showReviewView() {
      authView.style.display = "none";
      reviewView.style.display = "block";
      document.getElementById("review-label").textContent = scope.label || "Shared Review";
      document.getElementById("review-expires").textContent =
        "Expires: " + new Date(scope.expiresAt).toLocaleString();
      renderEntityList();
      connectScopedWebSocket();
    }

    function renderEntityList() {
      var container = document.getElementById("entity-list");
      container.textContent = "";
      scope.entityPaths.forEach(function (path) {
        fetch("/api/share/" + token + "/entity/detail?path=" + encodeURIComponent(path))
          .then(function (res) { return res.json(); })
          .then(function (data) {
            var card = document.createElement("div");
            card.className = "entity-card";

            var h3 = document.createElement("h3");
            h3.textContent = data.frontmatter.title || path.split("/").pop();
            card.appendChild(h3);

            var meta = document.createElement("div");
            meta.className = "meta";
            meta.textContent = "Status: " + (data.frontmatter.status || "\u2014") +
              " | Score: " + (data.frontmatter.score || "\u2014");
            card.appendChild(meta);

            card.addEventListener("click", function () {
              showEntityDetail(path, data);
            });
            container.appendChild(card);
          });
      });
    }

    function showEntityDetail(path, data) {
      document.getElementById("entity-list").style.display = "none";
      var detailView = document.getElementById("entity-detail-view");
      detailView.style.display = "block";

      // Render body safely with DOMPurify
      var bodyEl = document.getElementById("entity-body");
      if (typeof marked !== "undefined" && typeof DOMPurify !== "undefined") {
        bodyEl.innerHTML = DOMPurify.sanitize(marked.parse(data.body || ""));
      } else {
        bodyEl.textContent = data.body || "";
      }

      loadComments(path);
      setupCommentTooltip(path);

      document.getElementById("back-to-list").onclick = function () {
        detailView.style.display = "none";
        document.getElementById("entity-list").style.display = "block";
      };
    }

    function loadComments(path) {
      fetch("/api/share/" + token + "/entity/comments?path=" + encodeURIComponent(path))
        .then(function (res) { return res.json(); })
        .then(function (thread) {
          var container = document.getElementById("comment-threads");
          container.textContent = "";
          if (!thread.comments || thread.comments.length === 0) {
            var empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "No comments yet. Select text to add one.";
            container.appendChild(empty);
            return;
          }
          thread.comments.forEach(function (c) {
            var div = document.createElement("div");
            div.className = "comment-item";

            var author = document.createElement("div");
            author.className = "comment-author";
            author.textContent = c.author;
            div.appendChild(author);

            var text = document.createElement("div");
            text.className = "comment-text";
            text.textContent = c.content;
            div.appendChild(text);

            var time = document.createElement("div");
            time.className = "comment-time";
            time.textContent = new Date(c.timestamp).toLocaleString();
            div.appendChild(time);

            container.appendChild(div);
          });
        });
    }

    var currentCommentPath = null;
    function setupCommentTooltip(path) {
      currentCommentPath = path;
      var tooltip = document.getElementById("comment-tooltip");
      var input = document.getElementById("comment-input");
      var submitBtn = document.getElementById("comment-submit");
      var cancelBtn = document.getElementById("comment-cancel");

      document.getElementById("entity-body").addEventListener("mouseup", function () {
        var sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          tooltip.style.display = "none";
          return;
        }
        var range = sel.getRangeAt(0);
        var rect = range.getBoundingClientRect();
        tooltip.style.display = "block";
        tooltip.style.position = "fixed";
        tooltip.style.top = (rect.bottom + 8) + "px";
        tooltip.style.left = rect.left + "px";
        input.value = "";
        input.dataset.selectedText = sel.toString();
      });

      submitBtn.onclick = function () {
        var selectedText = input.dataset.selectedText;
        var content = input.value.trim();
        if (!content || !selectedText) return;
        fetch("/api/share/" + token + "/entity/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: currentCommentPath,
            selected_text: selectedText,
            section_heading: "",
            content: content,
          }),
        }).then(function () {
          tooltip.style.display = "none";
          loadComments(currentCommentPath);
        });
      };

      cancelBtn.onclick = function () {
        tooltip.style.display = "none";
      };
    }

    // --- Scoped WebSocket ---
    function connectScopedWebSocket() {
      var protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      var wsUrl = protocol + "//" + window.location.host + "/ws/share/" + token + "/activity";
      var ws = new WebSocket(wsUrl);
      ws.onmessage = function (ev) {
        try {
          var msg = JSON.parse(ev.data);
          if (msg.type === "event" && msg.data && msg.data.event) {
            if (msg.data.event.type === "comment" && currentCommentPath) {
              loadComments(currentCommentPath);
            }
          }
        } catch (e) { /* ignore parse errors */ }
      };
      ws.onclose = function () {
        setTimeout(connectScopedWebSocket, 3000);
      };
    }
  })();
  ```

- [ ] **Step 3: Add `/share/:token` route to serve share.html**

  In `server.ts`, inside the `fetch()` handler, add before the static file section:

  ```typescript
  // Serve share page for /share/:token
  const sharePageMatch = pathname.match(/^\/share\/[a-f0-9]+$/);
  if (sharePageMatch && req.method === "GET") {
    const shareHtml = join(staticDir, "share.html");
    if (existsSync(shareHtml)) {
      logRequest(req, 200);
      return new Response(Bun.file(shareHtml));
    }
    logRequest(req, 404);
    return new Response("Not Found", { status: 404 });
  }
  ```

- [ ] **Step 4: Run full test suite**

  Run: `cd tools/dashboard && bun test`
  Expected: All tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/static/share.html tools/dashboard/static/share.js tools/dashboard/src/server.ts
  git commit -m "feat(share): add reviewer-facing share page with password auth and scoped view"
  ```

---

## Task 8: Share Link Creation UI in Detail Page

**Files:**
- Modify: `tools/dashboard/static/detail.html`
- Modify: `tools/dashboard/static/detail.js`

This task adds a "Create Share Link" button and modal to the entity detail sidebar. Captain can set password, TTL, and label, then copy the resulting share URL.

- [ ] **Step 1: Add share section to detail.html sidebar**

  In `detail.html`, add after the gate panel section (after line 74, before the comments-panel section):

  ```html
  <section class="share-panel" id="share-panel">
      <h3>Share</h3>
      <button id="create-share-btn" class="btn btn-small">Create Share Link</button>
      <div id="share-links" class="share-links"></div>
      <div id="share-modal" class="share-modal" style="display:none;">
          <label>Password:
              <input type="text" id="share-password" class="share-input" placeholder="Set a password">
          </label>
          <label>Label:
              <input type="text" id="share-label-input" class="share-input" placeholder="e.g. Review for Alice">
          </label>
          <label>Expires in (hours):
              <input type="number" id="share-ttl" class="share-input" value="24" min="1" max="168">
          </label>
          <div class="share-modal-actions">
              <button id="share-submit" class="btn btn-small">Create</button>
              <button id="share-cancel" class="btn btn-small btn-secondary">Cancel</button>
          </div>
          <div id="share-result" style="display:none;">
              <p>Share link created:</p>
              <input type="text" id="share-url" class="share-input" readonly>
              <button id="share-copy" class="btn btn-small">Copy</button>
          </div>
      </div>
  </section>
  ```

- [ ] **Step 2: Add share creation logic to detail.js**

  Append to the end of `detail.js` (before the closing of the IIFE if one exists, or at the end of the file):

  ```javascript
  // --- Share Link Creation ---
  (function initSharePanel() {
    var createBtn = document.getElementById("create-share-btn");
    var modal = document.getElementById("share-modal");
    var submitBtn = document.getElementById("share-submit");
    var cancelBtn = document.getElementById("share-cancel");
    var copyBtn = document.getElementById("share-copy");
    var shareResult = document.getElementById("share-result");
    var shareUrlInput = document.getElementById("share-url");
    var shareLinksContainer = document.getElementById("share-links");

    if (!createBtn) return;

    createBtn.addEventListener("click", function () {
      modal.style.display = modal.style.display === "none" ? "block" : "none";
      shareResult.style.display = "none";
    });

    cancelBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });

    submitBtn.addEventListener("click", function () {
      var password = document.getElementById("share-password").value;
      var label = document.getElementById("share-label-input").value || "Share Link";
      var ttl = parseInt(document.getElementById("share-ttl").value, 10) || 24;

      if (!password) {
        alert("Password is required.");
        return;
      }

      var params = new URLSearchParams(window.location.search);
      var entityPath = params.get("path");
      if (!entityPath) return;

      fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password,
          entityPaths: [entityPath],
          stages: [],
          label: label,
          ttlHours: ttl,
        }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.token) {
            var url = window.location.origin + "/share/" + data.token;
            shareUrlInput.value = url;
            shareResult.style.display = "block";
            loadShareLinks();
          }
        });
    });

    copyBtn.addEventListener("click", function () {
      shareUrlInput.select();
      navigator.clipboard.writeText(shareUrlInput.value).then(function () {
        copyBtn.textContent = "Copied!";
        setTimeout(function () { copyBtn.textContent = "Copy"; }, 2000);
      });
    });

    function loadShareLinks() {
      fetch("/api/share/list")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          shareLinksContainer.textContent = "";
          if (!data.links || data.links.length === 0) {
            var empty = document.createElement("div");
            empty.className = "empty-state";
            empty.textContent = "No active share links";
            shareLinksContainer.appendChild(empty);
            return;
          }
          data.links.forEach(function (link) {
            var div = document.createElement("div");
            div.className = "share-link-item";

            var labelSpan = document.createElement("span");
            labelSpan.className = "share-link-label";
            labelSpan.textContent = link.label;
            div.appendChild(labelSpan);

            var expiresSpan = document.createElement("span");
            expiresSpan.className = "share-link-expires";
            expiresSpan.textContent = "Expires: " + new Date(link.expiresAt).toLocaleString();
            div.appendChild(expiresSpan);

            var deleteBtn = document.createElement("button");
            deleteBtn.className = "btn btn-small btn-danger share-delete";
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener("click", function () {
              fetch("/api/share/" + link.token, { method: "DELETE" })
                .then(function () { loadShareLinks(); });
            });
            div.appendChild(deleteBtn);

            shareLinksContainer.appendChild(div);
          });
        });
    }

    loadShareLinks();
  })();
  ```

- [ ] **Step 3: Run full test suite**

  Run: `cd tools/dashboard && bun test`
  Expected: All tests PASS.

- [ ] **Step 4: Commit**

  ```bash
  git add tools/dashboard/static/detail.html tools/dashboard/static/detail.js
  git commit -m "feat(share): add share link creation UI in entity detail sidebar"
  ```

---

## Task 9: ngrok Tunnel Integration in ctl.sh

**Files:**
- Modify: `tools/dashboard/ctl.sh`

This task adds `--tunnel` flag to `ctl.sh start`. When provided, it spawns ngrok as a subprocess after the dashboard starts, captures the tunnel URL from ngrok's local API (port 4040), and writes it to the state directory. This is the final convenience layer -- auth and sharing already work without it.

- [ ] **Step 1: Add `--tunnel` flag to argument parsing**

  In `ctl.sh`, add the `TUNNEL_MODE` variable (after line 13, alongside other flag variables):

  ```bash
  TUNNEL_MODE=false
  ```

  Add to the case statement in the while loop (after the `--channel` case around line 47):

  ```bash
  --tunnel)
      TUNNEL_MODE=true; shift ;;
  ```

  Add `TUNNEL_URL_FILE` and `TUNNEL_PID_FILE` to state files (after `LOG_FILE` around line 76):

  ```bash
  TUNNEL_URL_FILE="$STATE_DIR/tunnel_url"
  TUNNEL_PID_FILE="$STATE_DIR/tunnel_pid"
  ```

  Update the usage function to document `--tunnel`:

  ```bash
  echo "  --tunnel     Launch ngrok tunnel for public access (requires ngrok installed)"
  ```

- [ ] **Step 2: Add ngrok spawn and URL capture to `do_start()`**

  At the end of `do_start()`, after the health check succeeds (after the `return 0` inside the health check success branch), add a tunnel section. Place this before the final `return` of `do_start`:

  ```bash
  # --- Tunnel mode ---
  if [[ "$TUNNEL_MODE" == "true" ]]; then
      if ! command -v ngrok &>/dev/null; then
          echo "Warning: ngrok not found in PATH. Skipping tunnel." >&2
          return 0
      fi

      # Kill any existing ngrok for this port
      if [[ -f "$TUNNEL_PID_FILE" ]]; then
          local old_pid
          old_pid="$(cat "$TUNNEL_PID_FILE")"
          kill "$old_pid" 2>/dev/null || true
          rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
      fi

      # Spawn ngrok -- bind to dashboard port with host header
      nohup ngrok http "$selected_port" \
          --log=stdout \
          > "$STATE_DIR/ngrok.log" 2>&1 &
      local ngrok_pid=$!
      echo "$ngrok_pid" > "$TUNNEL_PID_FILE"

      # Poll ngrok API for tunnel URL (up to 10 seconds)
      local tunnel_url=""
      local t_attempts=0
      local t_max=20
      while [[ $t_attempts -lt $t_max ]]; do
          tunnel_url="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
              | grep -o '"public_url":"[^"]*"' \
              | head -1 \
              | cut -d'"' -f4 || true)"
          if [[ -n "$tunnel_url" ]]; then
              break
          fi
          sleep 0.5
          t_attempts=$((t_attempts + 1))
      done

      if [[ -n "$tunnel_url" ]]; then
          echo "$tunnel_url" > "$TUNNEL_URL_FILE"
          echo "Tunnel:    ${tunnel_url} (PID: ${ngrok_pid})"
          echo "Note: ngrok free tier shows an interstitial page on first visit."
          echo "      API calls should include 'ngrok-skip-browser-warning' header."
      else
          echo "Warning: ngrok started but tunnel URL not captured. Check $STATE_DIR/ngrok.log" >&2
      fi
  fi
  ```

- [ ] **Step 3: Add tunnel cleanup to `do_stop()`**

  In `do_stop()`, add tunnel cleanup before the existing dashboard PID cleanup (before `kill "$pid"`):

  ```bash
  # Stop tunnel if running
  if [[ -f "$TUNNEL_PID_FILE" ]]; then
      local tunnel_pid
      tunnel_pid="$(cat "$TUNNEL_PID_FILE")"
      kill "$tunnel_pid" 2>/dev/null || true
      rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
      echo "Tunnel stopped."
  fi
  ```

- [ ] **Step 4: Add tunnel info to `do_status()`**

  After the existing status output (after the `echo "  Log:     ${LOG_FILE}"` line), add:

  ```bash
  if [[ -f "$TUNNEL_URL_FILE" ]]; then
      local tunnel_url
      tunnel_url="$(cat "$TUNNEL_URL_FILE")"
      if [[ -f "$TUNNEL_PID_FILE" ]] && kill -0 "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null; then
          echo "  Tunnel:  ${tunnel_url}"
      else
          echo "  Tunnel:  (not running)"
          rm -f "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
      fi
  fi
  ```

- [ ] **Step 5: Update `clean_stale()` to include tunnel files**

  Change `clean_stale` to:

  ```bash
  clean_stale() {
      rm -f "$PID_FILE" "$PORT_FILE" "$ROOT_FILE" "$TUNNEL_PID_FILE" "$TUNNEL_URL_FILE"
  }
  ```

- [ ] **Step 6: Update `--host` flag pass-through to server**

  In `do_start()`, the `nohup bun run` command needs to pass `--host 0.0.0.0` when tunnel mode is active (ngrok connects via localhost, but for LAN/tunnel access the server needs to listen on all interfaces):

  ```bash
  local host_flag=""
  if [[ "$TUNNEL_MODE" == "true" ]]; then
      host_flag="--host 0.0.0.0"
  fi

  nohup bun run "$REPO_ROOT/$entry_script" \
      --port "$selected_port" \
      --root "$ROOT" \
      --log-file "$LOG_FILE" \
      $host_flag \
      > /dev/null 2>&1 &
  ```

- [ ] **Step 7: Test tunnel flag manually**

  Run: `tools/dashboard/ctl.sh start --tunnel` (requires ngrok installed)
  Expected: Dashboard starts, ngrok spawns, tunnel URL printed. If ngrok not installed, warning printed.
  Run: `tools/dashboard/ctl.sh status`
  Expected: Shows tunnel URL.
  Run: `tools/dashboard/ctl.sh stop`
  Expected: Both dashboard and ngrok stopped.

- [ ] **Step 8: Commit**

  ```bash
  git add tools/dashboard/ctl.sh
  git commit -m "feat(share): add --tunnel flag to ctl.sh for ngrok public URL"
  ```

---

## Task 10: Quality Gates -- Type Check + Full Test Suite

**Files:** None (verification only)

- [ ] **Step 1: Run type check**

  Run: `cd tools/dashboard && bunx tsc --noEmit`
  Expected: No errors.

- [ ] **Step 2: Run full test suite**

  Run: `cd tools/dashboard && bun test`
  Expected: All tests PASS (including new auth and share tests).

- [ ] **Step 3: Run share integration tests specifically**

  Run: `cd tools/dashboard && bun test ../../tests/dashboard/share.test.ts`
  Expected: All tests PASS.

- [ ] **Step 4: Verify backward compatibility -- localhost access without auth**

  Start the server: `cd tools/dashboard && bun run src/server.ts --port 8499`
  Test: `curl -s http://127.0.0.1:8499/api/workflows`
  Expected: 200 response with workflow data -- no auth required for direct localhost access.
  Stop: Ctrl+C

- [ ] **Step 5: Commit if any fixes were needed**

  ```bash
  git add -A
  git commit -m "fix(share): address quality gate findings"
  ```
