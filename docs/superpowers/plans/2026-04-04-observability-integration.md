# Observability Integration (PostHog + Sentry) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in PostHog analytics and Sentry error tracking to the Spacedock dashboard server and UI — all no-op when unconfigured, metadata-only for privacy.

**Architecture:** A single `tools/dashboard/src/telemetry.ts` module gates all SDK access behind env var checks. PostHog (`posthog-node`) tracks workflow events and entity mutations. Sentry (`@sentry/bun`) captures server errors via try/catch wrappers in route handlers (Bun.serve has no auto-instrumentation). A `/api/config` endpoint exposes the PostHog JS key to the frontend for optional client-side page view tracking. Codex Python scripts get a lightweight standalone PostHog call (guarded by env var + try/except import) since they cannot import the TS module.

**Tech Stack:** Bun/TypeScript + optional `posthog-node` + optional `@sentry/bun`. PostHog JS client via CDN script tag for frontend. Python `posthog` package (optional) for codex scripts. No Langfuse (removed from scope — Spacedock makes no LLM calls).

**Research corrections incorporated:**
1. Sentry has NO auto-instrumentation for `Bun.serve()` route handlers — all error capture uses manual try/catch with `Sentry.captureException()`.
2. All SDKs use env-var-check-before-import guard pattern — never import if not configured.
3. PostHog `capture()` API supports arbitrary custom events for workflow tracking.
4. Privacy: manual instrumentation only, metadata properties explicitly constructed — never entity body content.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `tools/dashboard/src/telemetry.ts` | Guarded init + helpers for PostHog and Sentry (~90 lines) |
| Create | `tests/dashboard/telemetry.test.ts` | Unit tests for telemetry module (guard logic, event helpers, error capture) |
| Modify | `tools/dashboard/src/server.ts` | Call `telemetryInit()` at startup, wrap route handlers with try/catch + Sentry, add `/api/config` endpoint |
| Modify | `tests/dashboard/server.test.ts` | Tests for Sentry error capture in routes and `/api/config` endpoint |
| Modify | `tools/dashboard/src/api.ts` | Emit PostHog events on score/tag mutations |
| Modify | `tests/dashboard/api.test.ts` | Tests for PostHog event emission on mutations |
| Modify | `tools/dashboard/static/index.html` | Add optional PostHog JS snippet (loaded conditionally via `/api/config`) |
| Modify | `tools/dashboard/static/detail.html` | Add optional PostHog JS snippet (same pattern) |
| Modify | `tools/dashboard/static/app.js` | Load PostHog JS config from `/api/config`, initialize if present |
| Modify | `tools/dashboard/static/detail.js` | Load PostHog JS config from `/api/config`, track page view + management actions |
| Modify | `scripts/codex_prepare_dispatch.py` | Emit PostHog `entity_dispatched` event (standalone Python call) |
| Modify | `scripts/codex_finalize_terminal_entity.py` | Emit PostHog `entity_completed` event (standalone Python call) |
| Create | `tests/dashboard/telemetry-codex.test.ts` | Tests for codex script telemetry emission (shell-out tests) |
| Modify | `tools/dashboard/package.json` | Add `posthog-node` and `@sentry/bun` as optional dependencies |

---

## Task 1: Telemetry Module — Guard Logic, PostHog Helpers, and Sentry Error Capture

**Files:**
- Create: `tests/dashboard/telemetry.test.ts`
- Create: `tools/dashboard/src/telemetry.ts`

The core module that gates all SDK access behind env var checks. Nothing imports PostHog or Sentry unless the corresponding env var is present.

- [ ] **Step 1: Write tests for guard logic, PostHog helpers, and Sentry capture**

  Create `tests/dashboard/telemetry.test.ts`:

  ```typescript
  import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";

  // Save original env vars and restore after each test
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
      POSTHOG_HOST: process.env.POSTHOG_HOST,
      SENTRY_DSN: process.env.SENTRY_DSN,
    };
    delete process.env.POSTHOG_API_KEY;
    delete process.env.POSTHOG_HOST;
    delete process.env.SENTRY_DSN;
  });

  afterEach(() => {
    // Restore env
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  describe("Telemetry Guard Logic", () => {
    test("init() with no env vars is no-op", async () => {
      // Dynamic import to pick up clean env
      const mod = await import("../../tools/dashboard/src/telemetry");
      mod.telemetryInit();
      expect(mod.posthogEnabled()).toBe(false);
      expect(mod.sentryEnabled()).toBe(false);
    });

    test("captureEvent() silently does nothing when PostHog is not configured", async () => {
      const mod = await import("../../tools/dashboard/src/telemetry");
      mod.telemetryInit();
      // Should not throw
      mod.captureEvent("test_event", { key: "value" });
    });

    test("captureException() silently does nothing when Sentry is not configured", async () => {
      const mod = await import("../../tools/dashboard/src/telemetry");
      mod.telemetryInit();
      // Should not throw
      mod.captureException(new Error("test"));
    });

    test("posthogEnabled() returns true when POSTHOG_API_KEY is set", async () => {
      process.env.POSTHOG_API_KEY = "phc_test123";
      process.env.POSTHOG_HOST = "https://app.posthog.com";
      const mod = await import("../../tools/dashboard/src/telemetry");
      mod.telemetryInit();
      expect(mod.posthogEnabled()).toBe(true);
    });

    test("sentryEnabled() returns true when SENTRY_DSN is set", async () => {
      process.env.SENTRY_DSN = "https://key@sentry.io/123";
      const mod = await import("../../tools/dashboard/src/telemetry");
      mod.telemetryInit();
      expect(mod.sentryEnabled()).toBe(true);
    });

    test("getPosthogJsConfig() returns null when not configured", async () => {
      const mod = await import("../../tools/dashboard/src/telemetry");
      expect(mod.getPosthogJsConfig()).toBeNull();
    });

    test("getPosthogJsConfig() returns config when POSTHOG_API_KEY is set", async () => {
      process.env.POSTHOG_API_KEY = "phc_test123";
      process.env.POSTHOG_HOST = "https://app.posthog.com";
      const mod = await import("../../tools/dashboard/src/telemetry");
      const config = mod.getPosthogJsConfig();
      expect(config).toEqual({
        apiKey: "phc_test123",
        host: "https://app.posthog.com",
      });
    });

    test("getPosthogJsConfig() uses default host when POSTHOG_HOST is not set", async () => {
      process.env.POSTHOG_API_KEY = "phc_test123";
      const mod = await import("../../tools/dashboard/src/telemetry");
      const config = mod.getPosthogJsConfig();
      expect(config).toEqual({
        apiKey: "phc_test123",
        host: "https://us.i.posthog.com",
      });
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/telemetry.test.ts
  ```

  Expected: Cannot find module `../../tools/dashboard/src/telemetry`.

- [ ] **Step 3: Implement `tools/dashboard/src/telemetry.ts`**

  ```typescript
  /**
   * Observability integration — opt-in PostHog analytics and Sentry error tracking.
   *
   * All SDK imports are gated behind environment variable checks. When the
   * corresponding env var is absent, helpers are silent no-ops. This module
   * is the ONLY place that imports posthog-node or @sentry/bun.
   *
   * Environment variables:
   *   POSTHOG_API_KEY  — PostHog project API key (enables analytics)
   *   POSTHOG_HOST     — PostHog instance URL (default: https://us.i.posthog.com)
   *   SENTRY_DSN       — Sentry DSN (enables error tracking)
   */

  let _posthog: any = null;
  let _sentry: any = null;

  export function telemetryInit(): void {
    _posthog = null;
    _sentry = null;

    // PostHog — analytics
    const apiKey = process.env.POSTHOG_API_KEY;
    if (apiKey) {
      try {
        // Dynamic require to avoid import errors when package is not installed
        const { PostHog } = require("posthog-node");
        _posthog = new PostHog(apiKey, {
          host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
          flushAt: 1,
          flushInterval: 0,
        });
      } catch (err) {
        console.error(
          `[telemetry] PostHog configured but SDK not available: ${err}`
        );
      }
    }

    // Sentry — error tracking
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      try {
        const Sentry = require("@sentry/bun");
        Sentry.init({
          dsn,
          sendDefaultPii: false,
          tracesSampleRate: 0.0,
        });
        _sentry = Sentry;
      } catch (err) {
        console.error(
          `[telemetry] Sentry configured but SDK not available: ${err}`
        );
      }
    }
  }

  export function posthogEnabled(): boolean {
    return _posthog !== null;
  }

  export function sentryEnabled(): boolean {
    return _sentry !== null;
  }

  export function captureEvent(
    eventName: string,
    properties?: Record<string, unknown>
  ): void {
    if (!_posthog) return;
    _posthog.capture({
      distinctId: "spacedock-server",
      event: eventName,
      properties: properties ?? {},
    });
  }

  export function captureException(err?: Error): void {
    if (!_sentry) return;
    _sentry.captureException(err);
  }

  export function getPosthogJsConfig(): {
    apiKey: string;
    host: string;
  } | null {
    const apiKey = process.env.POSTHOG_API_KEY;
    if (!apiKey) return null;
    return {
      apiKey,
      host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    };
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/telemetry.test.ts
  ```

  Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/src/telemetry.ts tests/dashboard/telemetry.test.ts
  git commit -m "feat: add telemetry module with env-var-gated PostHog and Sentry helpers"
  ```

---

## Task 2: Install npm Dependencies

**Files:**
- Modify: `tools/dashboard/package.json` (create if not exists)

Add the optional dependencies. Since the dashboard is a Bun project, these are normal npm dependencies — but telemetry.ts guards them behind env var checks so the dashboard still works without them configured.

- [ ] **Step 1: Add posthog-node and @sentry/bun**

  ```bash
  cd tools/dashboard && bun add posthog-node @sentry/bun
  ```

  This creates or updates `package.json` and `bun.lockb`.

- [ ] **Step 2: Verify the packages resolve**

  ```bash
  cd tools/dashboard && bun -e "require('posthog-node'); require('@sentry/bun'); console.log('ok')"
  ```

  Expected: `ok`

- [ ] **Step 3: Commit**

  ```bash
  git add tools/dashboard/package.json tools/dashboard/bun.lockb
  git commit -m "deps: add posthog-node and @sentry/bun as dashboard dependencies"
  ```

---

## Task 3: Wire Telemetry into Dashboard Server — Sentry Error Capture

**Files:**
- Modify: `tools/dashboard/src/server.ts:31-172`
- Modify: `tests/dashboard/server.test.ts`

Initialize telemetry at server startup. Wrap each route handler body with try/catch that calls `captureException()` before returning a 500 JSON error. Research confirmed Bun.serve has NO auto-instrumentation for Sentry — manual wrapping is required.

- [ ] **Step 1: Add Sentry error capture tests to `tests/dashboard/server.test.ts`**

  Append to the existing describe block in `tests/dashboard/server.test.ts`:

  ```typescript
  test("route handler error returns 500 and does not crash server", async () => {
    // Force an error by requesting entity detail with a path that exists
    // but contains invalid frontmatter (triggers a parse error)
    const badFile = join(tmpDir, "docs", "build-pipeline", "bad-entity.md");
    writeFileSync(badFile, "not valid frontmatter at all");
    const res = await fetch(
      `${baseUrl}/api/entity/detail?path=${encodeURIComponent(badFile)}`
    );
    // Server should return 500 with JSON error, not crash
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
  ```

- [ ] **Step 2: Run test to verify current behavior**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/server.test.ts
  ```

  Expected: The new test may fail or throw because there is no error handling currently — the server may crash or return an unexpected response.

- [ ] **Step 3: Add telemetry import and error wrapping to `server.ts`**

  At the top of `tools/dashboard/src/server.ts`, add the import:

  ```typescript
  import { telemetryInit, captureException, getPosthogJsConfig } from "./telemetry";
  ```

  In the `createServer` function, call `telemetryInit()` at the start of the function body (before the `Bun.serve` call):

  ```typescript
  export function createServer(opts: ServerOptions) {
    const { projectRoot, logFile } = opts;
    const staticDir = opts.staticDir ?? join(dirname(import.meta.dir), "static");

    telemetryInit();

    function logRequest(req: Request, status: number) {
  ```

  Wrap each route handler body with try/catch. Example for `/api/workflows`:

  ```typescript
  "/api/workflows": {
    GET: (req) => {
      try {
        const workflows = discoverWorkflows(projectRoot);
        const result = workflows
          .map((wf) => aggregateWorkflow(wf.dir))
          .filter((d): d is NonNullable<typeof d> => d !== null);
        logRequest(req, 200);
        return jsonResponse(result);
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        logRequest(req, 500);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    },
  },
  ```

  Apply the same try/catch pattern to ALL route handlers:
  - `/api/entity/detail` GET
  - `/api/entities` GET
  - `/api/entity/score` POST
  - `/api/entity/tags` POST
  - `/detail` GET
  - `/` GET
  - The `fetch()` fallback handler

  For each handler, wrap the entire body in try/catch, call `captureException()` in the catch, then return a 500 JSON error response. Keep the existing validation checks (400, 403) outside the try/catch — they are intentional responses, not errors.

  Pattern for handlers with validation:

  ```typescript
  "/api/entity/detail": {
    GET: (req) => {
      const url = new URL(req.url);
      const filepath = url.searchParams.get("path");
      if (!filepath) {
        logRequest(req, 400);
        return jsonResponse({ error: "path required" }, 400);
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
    },
  },
  ```

- [ ] **Step 4: Run all server tests**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/server.test.ts
  ```

  Expected: All tests pass (existing + new error handling test).

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/src/server.ts tests/dashboard/server.test.ts
  git commit -m "feat: wire Sentry error capture into dashboard route handlers"
  ```

---

## Task 4: Add `/api/config` Endpoint for Frontend PostHog Config

**Files:**
- Modify: `tools/dashboard/src/server.ts`
- Modify: `tests/dashboard/server.test.ts`

The frontend needs to know whether PostHog is configured and what the API key + host are. This endpoint exposes only the public PostHog project key (safe for frontend), never Sentry DSN.

- [ ] **Step 1: Add `/api/config` tests**

  Append to `tests/dashboard/server.test.ts`:

  ```typescript
  test("GET /api/config returns posthog config when env var set", async () => {
    // Note: test environment may not have POSTHOG_API_KEY set,
    // so this tests the endpoint shape. The config value depends on env.
    const res = await fetch(`${baseUrl}/api/config`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = await res.json();
    // Should have posthog key (null or object)
    expect("posthog" in data).toBe(true);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/server.test.ts
  ```

  Expected: FAIL — 404 for `/api/config`.

- [ ] **Step 3: Add `/api/config` route to `server.ts`**

  In the `routes` object, add before the `/detail` route:

  ```typescript
  "/api/config": {
    GET: (req) => {
      const posthog = getPosthogJsConfig();
      logRequest(req, 200);
      return jsonResponse({ posthog });
    },
  },
  ```

- [ ] **Step 4: Run server tests**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/server.test.ts
  ```

  Expected: All tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/src/server.ts tests/dashboard/server.test.ts
  git commit -m "feat: add /api/config endpoint for frontend PostHog configuration"
  ```

---

## Task 5: PostHog Events for API Mutations

**Files:**
- Modify: `tools/dashboard/src/api.ts`
- Modify: `tests/dashboard/api.test.ts`

Emit PostHog events when entities are mutated (score update, tag update). Only metadata is sent — slug and new values, never entity body content.

- [ ] **Step 1: Add telemetry event tests to `tests/dashboard/api.test.ts`**

  Read the existing test file first. Then append a new describe block:

  ```typescript
  import { mock } from "bun:test";

  describe("API Telemetry Events", () => {
    let tmpDir: string;
    let entityPath: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), "api-tel-test-"));
      entityPath = join(tmpDir, "test-entity.md");
      writeFileSync(
        entityPath,
        "---\ntitle: Test Entity\nscore: 0.5\ntags:\n---\n\nBody text.\n"
      );
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    test("updateScore emits score_updated event", async () => {
      // Mock the telemetry module
      const telemetry = await import("../../tools/dashboard/src/telemetry");
      const captureSpy = mock(() => {});
      const original = telemetry.captureEvent;
      telemetry.captureEvent = captureSpy as any;

      try {
        const { updateScore } = await import("../../tools/dashboard/src/api");
        updateScore(entityPath, 0.9);
        expect(captureSpy).toHaveBeenCalledWith("score_updated", {
          slug: "test-entity",
          new_score: 0.9,
        });
      } finally {
        telemetry.captureEvent = original;
      }
    });

    test("updateTags emits tags_updated event", async () => {
      const telemetry = await import("../../tools/dashboard/src/telemetry");
      const captureSpy = mock(() => {});
      const original = telemetry.captureEvent;
      telemetry.captureEvent = captureSpy as any;

      try {
        const { updateTags } = await import("../../tools/dashboard/src/api");
        updateTags(entityPath, ["urgent", "backend"]);
        expect(captureSpy).toHaveBeenCalledWith("tags_updated", {
          slug: "test-entity",
          tag_count: 2,
        });
      } finally {
        telemetry.captureEvent = original;
      }
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/api.test.ts
  ```

  Expected: FAIL — `captureEvent` is not called by `updateScore`/`updateTags`.

- [ ] **Step 3: Add PostHog events to `tools/dashboard/src/api.ts`**

  Add import at the top:

  ```typescript
  import { captureEvent } from "./telemetry";
  import { basename } from "node:path";
  ```

  Modify `updateScore()` — add event emission after the file write:

  ```typescript
  export function updateScore(filepath: string, newScore: number): void {
    const text = readFileSync(filepath, "utf-8");
    const updated = updateEntityScore(text, newScore);
    writeFileSync(filepath, updated);
    const slug = basename(filepath).replace(/\.md$/, "");
    captureEvent("score_updated", { slug, new_score: newScore });
  }
  ```

  Modify `updateTags()` — add event emission after the file write:

  ```typescript
  export function updateTags(filepath: string, tags: string[]): void {
    const text = readFileSync(filepath, "utf-8");
    const updated = updateEntityTags(text, tags);
    writeFileSync(filepath, updated);
    const slug = basename(filepath).replace(/\.md$/, "");
    captureEvent("tags_updated", { slug, tag_count: tags.length });
  }
  ```

- [ ] **Step 4: Run API tests**

  ```bash
  cd tools/dashboard && bun test tests/dashboard/api.test.ts
  ```

  Expected: All tests pass (existing + new telemetry tests).

- [ ] **Step 5: Commit**

  ```bash
  git add tools/dashboard/src/api.ts tests/dashboard/api.test.ts
  git commit -m "feat: emit PostHog events on entity score and tag updates"
  ```

---

## Task 6: Frontend PostHog JS Integration

**Files:**
- Modify: `tools/dashboard/static/index.html`
- Modify: `tools/dashboard/static/detail.html`
- Modify: `tools/dashboard/static/app.js`
- Modify: `tools/dashboard/static/detail.js`

Add optional PostHog JS client to the frontend. The JS code fetches `/api/config` at startup — if PostHog is configured, it loads the PostHog JS snippet and tracks page views. If not configured, it's a complete no-op (no script tag, no network requests).

- [ ] **Step 1: Add PostHog JS loader to `app.js`**

  At the beginning of the IIFE in `tools/dashboard/static/app.js`, add the PostHog initialization code:

  ```javascript
  // --- Optional PostHog analytics ---
  (function initPosthogAnalytics() {
    fetch("/api/config")
      .then(function (res) { return res.json(); })
      .then(function (config) {
        if (!config.posthog) return;
        // Load PostHog JS snippet
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        posthog.init(config.posthog.apiKey, {
          api_host: config.posthog.host,
          capture_pageview: true,
          persistence: "memory",
        });
      })
      .catch(function () { /* PostHog init failed silently — analytics are optional */ });
  })();
  ```

  The `persistence: "memory"` option ensures no cookies or localStorage are used — privacy-friendly.

- [ ] **Step 2: Add PostHog JS loader to `detail.js`**

  At the top of `tools/dashboard/static/detail.js`, before the existing code, add:

  ```javascript
  // --- Optional PostHog analytics ---
  var posthogReady = fetch("/api/config")
    .then(function (res) { return res.json(); })
    .then(function (config) {
      if (!config.posthog) return false;
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      posthog.init(config.posthog.apiKey, {
        api_host: config.posthog.host,
        capture_pageview: true,
        persistence: "memory",
      });
      return true;
    })
    .catch(function () { return false; });
  ```

  Then in the `saveScore()` function, after the successful API call, add PostHog tracking:

  ```javascript
  function saveScore() {
    var score = parseFloat(document.getElementById('score-slider').value);
    apiFetch('/api/entity/score', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({path: entityPath, score: score})
    }).then(function() {
      loadEntity();
      if (window.posthog) posthog.capture('score_saved', {score: score});
    });
  }
  ```

  In the `addTag()` function, after `saveTags()` is called, add:

  ```javascript
  function addTag() {
    var input = document.getElementById('tag-input');
    var tag = input.value.trim();
    if (!tag || currentTags.indexOf(tag) !== -1) return;
    currentTags.push(tag);
    input.value = '';
    saveTags();
    if (window.posthog) posthog.capture('tag_added');
  }
  ```

  In the `removeTag()` function, add:

  ```javascript
  function removeTag(tag) {
    currentTags = currentTags.filter(function(t) { return t !== tag; });
    saveTags();
    if (window.posthog) posthog.capture('tag_removed');
  }
  ```

- [ ] **Step 3: Add observability status indicator to `index.html`**

  In `tools/dashboard/static/index.html`, add a status indicator next to the existing auto-refresh indicator in the header:

  ```html
  <header>
      <h1>Spacedock Dashboard</h1>
      <span id="refresh-indicator" class="indicator">Auto-refresh: ON</span>
      <span id="telemetry-indicator" class="indicator" style="display:none"></span>
  </header>
  ```

  Then in `app.js`, update the PostHog initialization callback to show the indicator:

  ```javascript
  // Inside the initPosthogAnalytics() success callback, after posthog.init():
  var indicator = document.getElementById("telemetry-indicator");
  if (indicator) {
    indicator.textContent = "Analytics: ON";
    indicator.style.display = "";
  }
  ```

- [ ] **Step 4: Add observability status indicator to `detail.html`**

  In `tools/dashboard/static/detail.html`, add a status indicator in the nav bar:

  ```html
  <nav class="top-bar">
      <a href="/" class="back-link">&larr; Back to Dashboard</a>
      <span id="entity-title" class="nav-title"></span>
      <span id="telemetry-indicator" class="indicator" style="display:none"></span>
  </nav>
  ```

  In `detail.js`, update the PostHog ready callback:

  ```javascript
  // After the posthog.init() call in the posthogReady promise:
  var indicator = document.getElementById("telemetry-indicator");
  if (indicator) {
    indicator.textContent = "Analytics: ON";
    indicator.style.display = "";
  }
  ```

- [ ] **Step 5: Manual smoke test**

  Start the dashboard and verify the `/api/config` endpoint works:

  ```bash
  cd tools/dashboard && bun run src/server.ts --port 8420 --root /path/to/project &
  curl -s http://localhost:8420/api/config | jq .
  kill %1
  ```

  Expected: `{"posthog": null}` (since no env vars are set). The page should load normally without errors in the browser console. The telemetry indicator should remain hidden.

- [ ] **Step 6: Commit**

  ```bash
  git add tools/dashboard/static/app.js tools/dashboard/static/detail.js tools/dashboard/static/index.html tools/dashboard/static/detail.html
  git commit -m "feat: add optional PostHog JS frontend analytics with status indicator"
  ```

---

## Task 7: Codex Script Telemetry — Dispatch and Finalization Events

**Files:**
- Modify: `scripts/codex_prepare_dispatch.py`
- Modify: `scripts/codex_finalize_terminal_entity.py`

These Python scripts are the agent-side telemetry emission points. Since they cannot import the TS telemetry module, they make standalone PostHog calls using the Python `posthog` package (guarded by env var + try/except import). This is a lightweight addition — if `posthog` is not installed, the scripts work exactly as before.

- [ ] **Step 1: Add telemetry helper to `codex_prepare_dispatch.py`**

  At the end of the imports section, add:

  ```python
  def _emit_telemetry(event_name: str, properties: dict) -> None:
      """Emit a PostHog event if configured. Silent no-op otherwise."""
      api_key = os.environ.get("POSTHOG_API_KEY")
      if not api_key:
          return
      try:
          import posthog
          posthog.project_api_key = api_key
          posthog.host = os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com")
          posthog.capture("spacedock-agent", event_name, properties)
      except Exception:
          pass  # Telemetry must never block the workflow
  ```

  At the end of the main function (after the JSON output and git commit), add:

  ```python
  _emit_telemetry("entity_dispatched", {
      "slug": entity_path.stem,
      "stage": stage_name,
      "agent_id": dispatch_agent_id,
  })
  ```

  (Use the actual variable names from the existing `main()` function — read the file to confirm exact names.)

- [ ] **Step 2: Add telemetry helper to `codex_finalize_terminal_entity.py`**

  Add the same `_emit_telemetry` helper function. Then at the end of the main function (after archiving and JSON output), add:

  ```python
  _emit_telemetry("entity_completed", {
      "slug": entity_path.stem,
      "verdict": verdict,
  })
  ```

  (Use the actual variable names from the existing `main()` function.)

- [ ] **Step 3: Verify scripts still work without posthog installed**

  ```bash
  # Ensure POSTHOG_API_KEY is not set
  unset POSTHOG_API_KEY
  python3 scripts/codex_prepare_dispatch.py --help
  python3 scripts/codex_finalize_terminal_entity.py --help
  ```

  Expected: Both scripts show help text without errors. No import failures.

- [ ] **Step 4: Commit**

  ```bash
  git add scripts/codex_prepare_dispatch.py scripts/codex_finalize_terminal_entity.py
  git commit -m "feat: add opt-in PostHog telemetry to codex dispatch and finalize scripts"
  ```

---

## Task 8: Integration Verification and Quality Gate

**Files:**
- No new files — verification only

Final verification that all integrations are no-op when unconfigured and work correctly when configured.

- [ ] **Step 1: Run all dashboard tests**

  ```bash
  cd tools/dashboard && bun test
  ```

  Expected: All tests pass (telemetry, server, api, discovery, parsing, frontmatter-io, ctl).

- [ ] **Step 2: Verify no-op behavior**

  Start the server without any telemetry env vars and confirm normal operation:

  ```bash
  cd tools/dashboard && bun run src/server.ts --port 8421 --root "$(git rev-parse --show-toplevel)" &
  SERVER_PID=$!

  # All existing endpoints should work exactly as before
  curl -s http://localhost:8421/api/workflows | head -c 100
  curl -s http://localhost:8421/api/config
  curl -s http://localhost:8421/ | head -c 50

  kill $SERVER_PID
  ```

  Expected: All endpoints return correct data. `/api/config` returns `{"posthog": null}`. No telemetry-related errors in output.

- [ ] **Step 3: Verify privacy — grep for body content leakage**

  Search all modified files to confirm no entity body content is ever sent to telemetry:

  ```bash
  # In telemetry.ts: only captureEvent and captureException are exported
  # In api.ts: only slug and numeric values are sent
  # In codex scripts: only slug, stage, verdict are sent
  # In frontend JS: only score (number) and tag add/remove events are tracked

  grep -n "body\|content\|text" tools/dashboard/src/telemetry.ts
  grep -n "captureEvent" tools/dashboard/src/api.ts
  ```

  Expected: No references to entity body content in telemetry calls. Only metadata properties (slug, score, tag_count, stage, verdict).

- [ ] **Step 4: Verify backward compatibility — existing tests still pass**

  ```bash
  cd tools/dashboard && bun test
  ```

  Expected: All existing tests pass unchanged. No regressions.

---

## Quality Gates Summary

1. **No-op when unconfigured**: `telemetryInit()` sets `_posthog = null` and `_sentry = null` when env vars are absent. All helpers check for null before calling SDK methods. `/api/config` returns `{posthog: null}`. Frontend JS gracefully handles null config.

2. **Privacy — metadata only**: PostHog events contain only: slug, stage name, score (number), tag count, verdict, agent ID. Never entity body content, file contents, or full file paths.

3. **Env-var gating**: Three env vars control everything: `POSTHOG_API_KEY`, `POSTHOG_HOST` (optional, has default), `SENTRY_DSN`. No config files, no CLI flags for telemetry.

4. **Error resilience**: SDK import failures are caught and logged to stderr. Telemetry failures never block or crash the main workflow. The `_emit_telemetry` helper in Python scripts uses bare `except Exception: pass`.

5. **No Langfuse**: Removed from scope. Spacedock makes no LLM calls — Langfuse would add 8 transitive deps for zero value.
