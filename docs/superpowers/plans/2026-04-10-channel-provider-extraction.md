# ChannelProvider Interface Extraction — PR1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a `ChannelProvider` interface from the dashboard server so that `createChannelServer()` can accept an external provider (future: bridge's unix socket client) instead of being hardwired to the in-process `createServer()`.

**Architecture:** Define a narrow interface capturing exactly what `channel.ts` uses from the dashboard server (`publishEvent`, `broadcastChannelStatus`, `eventBuffer.getChannelMessagesSince`, `snapshotStore.createSnapshot`, `port`). Use TypeScript's `Pick` utility type to narrow `EventBuffer` and `SnapshotStore` to only the methods channel.ts actually calls. Refactor `createChannelServer` to accept an optional `ChannelProvider`; when absent, fall back to `createServer()` (today's behavior, behavior-neutral).

**Tech Stack:** TypeScript, Bun, bun:test. No new dependencies.

**Design doc:** `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md` §7.1-§7.4

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| **Create** | `tools/dashboard/src/channel-provider.ts` | `ChannelProvider` interface definition + `CreateSnapshotInput` extracted type |
| **Create** | `tools/dashboard/src/channel-provider.test.ts` | Type satisfaction test + mock provider injection test |
| **Modify** | `tools/dashboard/src/server.ts:1243` | Annotate return type to satisfy `ChannelProvider` |
| **Modify** | `tools/dashboard/src/channel.ts:59,88` | Accept optional `ChannelProvider` parameter, fall back to `createServer()` |
| **Create** | `tools/dashboard/src/CHANNEL-PROVIDER.md` | Interface contract doc for upstream reviewers |

Existing test files (`server.test.ts`, `channel.test.ts`, all `tests/dashboard/*.test.ts`) are NOT modified — they must pass unchanged to prove behavior neutrality.

---

### Task 1: Define ChannelProvider interface

**Files:**
- Create: `tools/dashboard/src/channel-provider.ts`
- Create: `tools/dashboard/src/channel-provider.test.ts`

- [ ] **Step 1: Write the interface file**

```typescript
// tools/dashboard/src/channel-provider.ts
// ABOUTME: ChannelProvider interface — the contract between the MCP channel layer
// ABOUTME: and its backing dashboard server. Enables external providers (e.g., bridge shim).

import type { AgentEvent, SequencedEvent, EntitySnapshot, SnapshotSource } from "./types";
import type { EventBuffer } from "./events";
import type { SnapshotStore } from "./snapshots";

/**
 * Input for creating an entity snapshot.
 * Extracted from SnapshotStore.createSnapshot() parameter shape.
 */
export interface CreateSnapshotInput {
  entity: string;
  body: string;
  frontmatter?: Record<string, string> | null;
  author: string;
  reason: string;
  source?: SnapshotSource;
  rollback_from_version?: number | null;
  rollback_section?: string | null;
}

/**
 * The contract between createChannelServer (MCP layer) and its backing
 * dashboard server. The default implementation wraps createServer() from
 * server.ts. External implementations (e.g., the spacebridge unix socket
 * shim) can provide their own.
 *
 * Design: docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md §2.1
 */
export interface ChannelProvider {
  /** Push an event to all connected clients (SSE/WS). Returns the sequence number. */
  publishEvent(event: AgentEvent): number;

  /** Notify connected clients of MCP channel connection status. */
  broadcastChannelStatus(connected: boolean): void;

  /** Access to channel message replay (used by get_pending_messages MCP tool). */
  readonly eventBuffer: Pick<EventBuffer, "getChannelMessagesSince">;

  /** Access to entity snapshot creation (used by update_entity MCP tool). */
  readonly snapshotStore: Pick<SnapshotStore, "createSnapshot">;

  /** The HTTP port the provider is listening on, if applicable. */
  readonly port: number | undefined;

  /** Graceful shutdown. */
  stop(): void;
}
```

- [ ] **Step 2: Write the type satisfaction test**

```typescript
// tools/dashboard/src/channel-provider.test.ts
// ABOUTME: Tests that ChannelProvider interface is correctly defined and that
// ABOUTME: the in-process DashboardServer from createServer() satisfies it.

import { describe, test, expect } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ChannelProvider } from "./channel-provider";
import { createServer } from "./server";

const TMP = join(import.meta.dir, "__test_provider__");

describe("ChannelProvider interface", () => {
  test("createServer() return satisfies ChannelProvider", () => {
    mkdirSync(TMP, { recursive: true });
    try {
      const server = createServer({
        port: 0,
        hostname: "127.0.0.1",
        projectRoot: TMP,
        dbPath: join(TMP, "test.db"),
      });
      try {
        // Type assertion: if this compiles, the interface is satisfied
        const provider: ChannelProvider = server;

        // Runtime checks: all required members exist and are callable
        expect(typeof provider.publishEvent).toBe("function");
        expect(typeof provider.broadcastChannelStatus).toBe("function");
        expect(typeof provider.eventBuffer.getChannelMessagesSince).toBe("function");
        expect(typeof provider.snapshotStore.createSnapshot).toBe("function");
        expect(typeof provider.port).toBe("number");
        expect(typeof provider.stop).toBe("function");
      } finally {
        server.stop();
      }
    } finally {
      rmSync(TMP, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `cd /Users/kent/Project/spacedock && bun test tools/dashboard/src/channel-provider.test.ts`

Expected: PASS — `createServer()` already returns an object with all these members. The type assertion `const provider: ChannelProvider = server` should compile because `Pick<EventBuffer, "getChannelMessagesSince">` is a subset of `EventBuffer` and `Pick<SnapshotStore, "createSnapshot">` is a subset of `SnapshotStore`.

If TypeScript complains about the `port` property (Bun's `Server.port` might be `number` not `number | undefined`), fix the interface to match the actual return type: `readonly port: number;`.

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/src/channel-provider.ts tools/dashboard/src/channel-provider.test.ts
git commit -m "refactor(channel): extract ChannelProvider interface

Define the contract between createChannelServer (MCP layer) and its
backing dashboard server. Uses Pick<EventBuffer> and Pick<SnapshotStore>
to narrow the interface to exactly what channel.ts consumes.

Includes type satisfaction test proving createServer() return value
implements the interface. No behavior change.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Refactor createChannelServer to accept optional ChannelProvider

**Files:**
- Modify: `tools/dashboard/src/channel.ts:49-59,88-89`

- [ ] **Step 1: Write failing test — createChannelServer with explicit provider**

Add to `tools/dashboard/src/channel-provider.test.ts`:

```typescript
import { createChannelServer } from "./channel";
import type { AgentEvent, SequencedEvent } from "./types";

describe("ChannelProvider injection", () => {
  test("createChannelServer uses injected provider instead of createServer", () => {
    mkdirSync(TMP, { recursive: true });
    const events: AgentEvent[] = [];
    let channelStatus: boolean | null = null;

    const mockProvider: ChannelProvider = {
      publishEvent(event: AgentEvent): number {
        events.push(event);
        return events.length;
      },
      broadcastChannelStatus(connected: boolean): void {
        channelStatus = connected;
      },
      eventBuffer: {
        getChannelMessagesSince(_afterSeq: number, _entity?: string): SequencedEvent[] {
          return [];
        },
      },
      snapshotStore: {
        createSnapshot(input: any) {
          return { id: 1, entity: input.entity, version: 1, body: input.body,
            frontmatter: null, author: input.author, reason: input.reason,
            source: input.source ?? "update", rollback_from_version: null,
            rollback_section: null, created_at: new Date().toISOString() };
        },
      },
      port: 9999,
      stop() {},
    };

    try {
      const { dashboard } = createChannelServer({
        port: 0,
        projectRoot: TMP,
        provider: mockProvider,
      });

      // The returned dashboard should be our mock, not a new Bun.serve
      expect(dashboard.port).toBe(9999);
      expect(typeof dashboard.publishEvent).toBe("function");

      // Trigger a publishEvent through the dashboard and verify mock received it
      dashboard.publishEvent({
        type: "channel_response",
        entity: "",
        stage: "",
        agent: "fo",
        timestamp: new Date().toISOString(),
        detail: "test message",
      });

      expect(events.length).toBe(1);
      expect(events[0].detail).toBe("test message");
    } finally {
      rmSync(TMP, { recursive: true, force: true });
    }
  });

  test("createChannelServer falls back to createServer when no provider given", () => {
    mkdirSync(TMP, { recursive: true });
    try {
      const { dashboard } = createChannelServer({
        port: 0,
        projectRoot: TMP,
        dbPath: join(TMP, "test.db"),
      });

      try {
        // Should have a real Bun server with a numeric port
        expect(typeof dashboard.port).toBe("number");
        expect(dashboard.port).not.toBe(0); // OS-assigned port
        expect(typeof dashboard.publishEvent).toBe("function");
        expect(typeof dashboard.eventBuffer.getChannelMessagesSince).toBe("function");
      } finally {
        dashboard.stop();
      }
    } finally {
      rmSync(TMP, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/kent/Project/spacedock && bun test tools/dashboard/src/channel-provider.test.ts`

Expected: FAIL — `createChannelServer` does not yet accept a `provider` option.

- [ ] **Step 3: Modify ChannelServerOptions to include optional provider**

In `tools/dashboard/src/channel.ts`, update the `ChannelServerOptions` interface (line 49-57):

```typescript
// Before (line 49-57):
interface ChannelServerOptions {
  port: number;
  projectRoot: string;
  staticDir?: string;
  logFile?: string;
  dbPath?: string;
  /** Override permission request timeout (ms). Default 120_000. Used in tests. */
  permissionTimeoutMs?: number;
}

// After:
import type { ChannelProvider } from "./channel-provider";

interface ChannelServerOptions {
  port: number;
  projectRoot: string;
  staticDir?: string;
  logFile?: string;
  dbPath?: string;
  /** Override permission request timeout (ms). Default 120_000. Used in tests. */
  permissionTimeoutMs?: number;
  /** External ChannelProvider. When provided, createServer() is NOT called;
   *  the channel layer uses this provider instead. */
  provider?: ChannelProvider;
}
```

- [ ] **Step 4: Modify createChannelServer to use provider when given**

In `tools/dashboard/src/channel.ts`, replace the `createServer()` call (line 88-125) with a conditional:

```typescript
// Before (line 88):
  const dashboard = createServer({
    port: opts.port,
    hostname: "127.0.0.1",
    projectRoot: opts.projectRoot,
    staticDir: opts.staticDir,
    logFile: opts.logFile,
    dbPath: opts.dbPath,
    onChannelMessage: async (content, meta) => {
      // ... (lines 95-124)
    },
  });

// After:
  // Build the onChannelMessage callback (needed for both provider modes)
  const onChannelMessage = async (content: string, meta?: Record<string, string>) => {
    try {
      if (meta?.type === "permission_response" && meta?.request_id) {
        const reqId = meta.request_id;
        if (reqId.startsWith("tool:")) {
          const pending = pendingPermissions.get(reqId);
          if (pending) {
            clearTimeout(pending.timer);
            pendingPermissions.delete(reqId);
            pending.resolve(content === "allow");
          }
        } else {
          const behavior = content === "allow" ? "allow" : "deny";
          await sendPermissionVerdict(reqId, behavior as "allow" | "deny");
        }
      } else {
        await mcp.notification({
          method: "notifications/claude/channel",
          params: { content, meta: meta ?? {} },
        });
      }
    } catch {
      // MCP transport not connected — message recorded in EventBuffer but not forwarded
    }
  };

  const dashboard = opts.provider ?? createServer({
    port: opts.port,
    hostname: "127.0.0.1",
    projectRoot: opts.projectRoot,
    staticDir: opts.staticDir,
    logFile: opts.logFile,
    dbPath: opts.dbPath,
    onChannelMessage,
  });
```

**Important nuance:** When `opts.provider` is given, the `onChannelMessage` callback is NOT wired into the provider — the external provider (bridge daemon) owns that flow via IPC. The callback is only used for the in-process default path. This is correct because the bridge daemon handles inbound message routing itself (see design doc §5.3).

However, there's a wrinkle: if provider is injected, `onChannelMessage` still needs to be callable from the HTTP routes that receive captain messages. The current code wires this via `createServer({ onChannelMessage })`. When a provider is injected, the provider must handle inbound messages differently — but for PR1, we don't need to solve that. PR1 is behavior-neutral: the only callers that matter are (a) the default in-process path (unchanged) and (b) the new mock-based test (which doesn't test inbound messages).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/kent/Project/spacedock && bun test tools/dashboard/src/channel-provider.test.ts`

Expected: All 3 tests PASS:
1. "createServer() return satisfies ChannelProvider" — unchanged from Task 1
2. "createChannelServer uses injected provider instead of createServer" — NEW, uses mock
3. "createChannelServer falls back to createServer when no provider given" — NEW, default path

- [ ] **Step 6: Run full existing test suite to verify behavior neutrality**

Run: `cd /Users/kent/Project/spacedock && bun test`

Expected: ALL tests pass (202 in `tools/dashboard/src/` + 140 in `tests/dashboard/`). Zero failures. If any test fails, it means the refactor changed behavior — diagnose and fix before proceeding.

- [ ] **Step 7: Commit**

```bash
git add tools/dashboard/src/channel.ts tools/dashboard/src/channel-provider.test.ts
git commit -m "refactor(channel): convert createChannelServer to accept provider

createChannelServer now takes an optional \`provider\` field in its
options. When provided, the channel layer uses this ChannelProvider
instead of calling createServer() internally.

Default behavior (no provider) is unchanged — createServer() is still
called, preserving today's embedded single-process mode.

Includes integration tests for both paths: mock provider injection
and default fallback.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Documentation

**Files:**
- Create: `tools/dashboard/src/CHANNEL-PROVIDER.md`

- [ ] **Step 1: Write the interface contract doc**

```markdown
# ChannelProvider Interface

## Purpose

`ChannelProvider` is the contract between the MCP channel layer (`channel.ts`)
and its backing dashboard server. It enables external implementations to
replace the default in-process `createServer()`.

## Why this exists

The spacedock dashboard currently couples the MCP stdio transport and the
HTTP/WebSocket server in a single process. This interface is the first step
toward decoupling them, enabling external providers like the spacebridge
daemon to serve the dashboard UI independently while the MCP channel layer
runs as a thin shim inside Claude Code.

See: `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md`

## Interface

```typescript
interface ChannelProvider {
  publishEvent(event: AgentEvent): number;
  broadcastChannelStatus(connected: boolean): void;
  readonly eventBuffer: Pick<EventBuffer, "getChannelMessagesSince">;
  readonly snapshotStore: Pick<SnapshotStore, "createSnapshot">;
  readonly port: number | undefined;
  stop(): void;
}
```

## Usage

### Default (in-process, today's behavior)

```typescript
const { mcp, dashboard } = createChannelServer({
  port: 8420,
  projectRoot: "/path/to/repo",
});
// dashboard is backed by createServer() internally
```

### With external provider

```typescript
const externalProvider = connectToBridgeDaemon();
const { mcp, dashboard } = createChannelServer({
  port: 8420,
  projectRoot: "/path/to/repo",
  provider: externalProvider,
});
// dashboard IS the external provider — createServer() is not called
```

## What the interface captures

| Member | Used by | Purpose |
|---|---|---|
| `publishEvent` | All MCP tools (reply, add_comment, reply_to_comment, update_entity) | Push events to connected UI clients |
| `broadcastChannelStatus` | Channel startup/shutdown | Notify UI of MCP connection state |
| `eventBuffer.getChannelMessagesSince` | `get_pending_messages` MCP tool | Replay messages after reconnect |
| `snapshotStore.createSnapshot` | `update_entity` MCP tool | Create pre-update snapshots for rollback |
| `port` | Channel state file + startup banner | Report the HTTP port to callers |
| `stop` | Test cleanup + graceful shutdown | Stop the HTTP server |

## Future (not in this PR)

A second interface, `CoordinationClient`, will handle role-aware work
coordination (SO/FO/QO leases). That is blocked on Phase E role boundary
formalization and will be a separate upstream PR.
```

- [ ] **Step 2: Commit**

```bash
git add tools/dashboard/src/CHANNEL-PROVIDER.md
git commit -m "docs(channel): ChannelProvider interface contract and rationale

Explains the interface purpose, usage patterns (default vs external
provider), and what each member is used for. References the spacebridge
design doc for broader architectural context.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Verification Checklist

After all tasks are complete, verify before opening the PR:

- [ ] `bun test` from repo root: all tests pass (existing + new)
- [ ] `bun tsc --noEmit` (if tsconfig exists): no type errors
- [ ] `git diff main...HEAD --stat`: only these files changed:
  - `tools/dashboard/src/channel-provider.ts` (new)
  - `tools/dashboard/src/channel-provider.test.ts` (new)
  - `tools/dashboard/src/channel.ts` (modified — import + ChannelServerOptions + conditional)
  - `tools/dashboard/src/CHANNEL-PROVIDER.md` (new)
- [ ] No changes to: `server.ts`, `types.ts`, `events.ts`, `snapshots.ts`, `static/*`, `db.ts`
- [ ] `git log --oneline main..HEAD`: exactly 3 commits in order:
  1. `refactor(channel): extract ChannelProvider interface`
  2. `refactor(channel): convert createChannelServer to accept provider`
  3. `docs(channel): ChannelProvider interface contract and rationale`

## Self-Review Notes

**Spec coverage check against design doc §7:**
- §7.1 "define the interface" → Task 1 ✓
- §7.1 "refactor createChannelServer to accept provider" → Task 2 ✓
- §7.1 "in-process default" → Task 2 step 4 (the `??` fallback) ✓
- §7.3 commit structure (4 commits) → adjusted to 3 commits: interface commit and refactor+default commit are merged because the default IS the current `createServer()` — it's not a separate implementation to write, just a `??` fallback. A 4th commit for the default alone would be an empty commit.
- §7.4 non-goals verified: no CoordinationClient, no daemon, no IPC, no Next.js, no Drizzle, no fmodel, no dbPath change, no port default change, no static/* change, no new dependencies ✓

**Type consistency check:**
- `ChannelProvider.publishEvent` signature matches `server.ts:1213` `publishEvent(event: AgentEvent): number` ✓
- `ChannelProvider.broadcastChannelStatus` matches `server.ts:1238` `broadcastChannelStatus(connected: boolean)` ✓
- `ChannelProvider.eventBuffer.getChannelMessagesSince` matches `events.ts:83` ✓
- `ChannelProvider.snapshotStore.createSnapshot` matches `snapshots.ts:155` ✓
- `CreateSnapshotInput` fields match `snapshots.ts:155-163` ✓
- `ChannelServerOptions.provider` is `ChannelProvider | undefined` (optional) ✓
- Mock provider in test returns `EntitySnapshot`-shaped object matching `types.ts:171-183` ✓
