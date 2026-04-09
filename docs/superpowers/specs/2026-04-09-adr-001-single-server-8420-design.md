# ADR-001: Single-Server Dashboard Unification on Port 8420

**Date:** 2026-04-09
**Status:** Design — Pending approval
**Supersedes:** `2026-04-08-dashboard-unified-server-channel.md` (which attempted coexistence; this spec eliminates one side entirely)

---

## Background

The Spacedock dashboard currently runs in **two independent modes** that share a SQLite database but maintain separate in-memory state:

1. **Standalone server** (`ctl.sh`, port 8421) — launched manually, persistent daemon, no MCP.
2. **Channel server** (`channel.ts`, port 8420) — spawned by Claude Code via MCP stdio transport, lives as long as the CC session.

Cross-instance sync is patched via `forwardToCtlServer()` in `channel.ts`: events published on 8420 are HTTP POSTed to 8421 so browsers connected to either server see the same activity feed. This is a workaround for Bun's `server.publish()` being process-local.

### Why the coexistence approach failed

The 2026-04-08 "unified server + channel" design tried to make `ctl.sh` detect and cooperate with channel instances. Implementation revealed a hard constraint in Claude Code's MCP integration:

> **MCP channels MUST use stdio transport — they cannot connect to a pre-existing HTTP server.**

This means the channel server is **always spawned fresh** by Claude Code via `bun channel.ts`. There is no way to share a single OS process between the standalone mode and the channel mode. The two-instance architecture is a consequence of trying to preserve standalone mode at all.

### Why two servers is painful

- **WS bridge fragility** — `forwardToCtlServer()` is one-way, silently drops events on network errors, and adds a whole class of debugging surface ("did the bridge deliver this?").
- **Port confusion** — status, logs, share all need to consult two state files (`port` and `channel_port`); the `/dashboard share` bug from this session was directly caused by this.
- **SQLite contention** — two writers on the same DB file; we've already hit test pollution and lock contention bugs.
- **Ambiguous semantics** — which server is "the" dashboard? Status shows two URLs. Users see two "running" messages. Browsers connected to 8421 can't actually reach the FO except via the bridge.
- **Chat → FO unreliability** — chat messages sent to 8421 go through `forwardToCtlServer()` → 8420 → `mcp.notification()`. Any link in this chain can fail silently.

---

## Decision

**Eliminate the standalone server (port 8421) and `ctl.sh` entirely. The dashboard runs only as the channel server on port 8420, spawned by Claude Code via MCP stdio.**

### Trade-off explicitly accepted

Dashboard requires a running Claude Code session. No more `bash ctl.sh start` — users must launch the dashboard by interacting with Claude Code (e.g., `/dashboard start` triggers an MCP tool call that spawns channel.ts, or the dashboard comes up automatically when CC is launched with `--channels`).

### Why this is the right call

1. **Single source of truth** — one process, one port, one SQLite writer, one WS subscriber set. All the cross-instance bug classes evaporate.
2. **Direct FO path** — chat, comments, notifications all use the same stdio pipe to CC. No more "is the bridge working?" debugging.
3. **Matches the mental model** — the dashboard is a war room for the CC session. It genuinely doesn't make sense without CC.
4. **Simpler share flow** — one port to tunnel, no scoping ambiguity. The `/dashboard share` rewrite we just committed already reflects this direction.

---

## Scope

### A. Remove standalone mode

**Delete:**
1. `tools/dashboard/ctl.sh` — the entire standalone launcher script.
2. `tools/dashboard/src/channel.ts` → `forwardToCtlServer()` function and all call sites.
3. `tools/dashboard/src/server.ts` → any code paths that exist only to support `ctl.sh` (e.g., standalone-mode option branches, if any).
4. State files specific to standalone mode: `~/.spacedock/dashboard/<hash>/port`, `pid`, `ngrok.log`, `ngrok.pid`, `root`.
5. All references to port 8421 in docs, tests, scripts.

**Modify:**
6. `tools/dashboard/skills/dashboard/SKILL.md` — `/dashboard start|stop|status|logs|restart` subcommands must work via MCP tool calls (or direct `bun channel.ts` invocation) instead of `bash ctl.sh ...`.
7. `tools/dashboard/src/channel.ts` — write a single `channel_port` state file (already done per 04-08 spec); rename to just `port` since there's only one server now.
8. FO startup check — detect the channel MCP transport instead of polling `ctl.sh status`.
9. Dashboard UI "Channel: connected" badge — already reflects the browser WS layer (Layer 1), keep as-is. Document that there is no separate "standalone server" state to display.
10. `/dashboard share` skill — already rewritten in commit `996adc4` to prefer channel port. After ADR-001 lands, remove the `channel_port` vs `port` fallback since there's only one.

### B. Bidirectional chat reliability — `get_pending_messages` MCP tool

Chat input (both homepage and entity detail pages) currently sends messages via `POST /api/channel/send`, which stores a `channel_message` event and calls `mcp.notification({ method: "notifications/claude/channel" })` to push to the FO session. This **does work** when the stdio pipe is active — we verified it this session — but messages sent while the MCP transport is disconnected (e.g., during CC restart) are lost to the FO. They remain in the EventBuffer but the FO never learns about them.

**Add MCP tool: `get_pending_messages`**

```typescript
{
  name: "get_pending_messages",
  description: "Retrieve channel_message events since a given sequence number. Use after reconnecting the MCP transport to recover messages sent while disconnected.",
  params: {
    since_seq?: number,   // default 0 → all messages in buffer
    entity?: string,      // optional filter; "" or omitted returns all
  },
  returns: {
    messages: Array<{
      seq: number,
      content: string,
      entity: string,     // "" = project-level, "slug" = entity-scoped
      agent: string,      // "captain" (from dashboard UI) or other
      timestamp: string,
    }>,
    last_seq: number,     // for the FO to track and pass as since_seq next time
  }
}
```

**Implementation notes:**
- Read from existing `EventBuffer` filtering on `type === "channel_message"`.
- No schema changes — EventBuffer already has `entity`, `agent`, `timestamp`, `detail` fields.
- Keep existing `mcp.notification()` push path — it's still the fastest delivery mechanism when the transport is up. `get_pending_messages` is the fallback/recovery path.
- FO's responsibility to persist `last_seq` across reconnects (e.g., in `~/.spacedock/fo-state.json` or similar).

### C. Activity feed UI polish

1. **Card margin** — activity event cards need ≥8px vertical gap between them. Currently they render flush against each other (seen in earlier screenshots from this session).
2. **Auto-scroll to latest** — on initial load and on every WS realtime event push, scroll the `#activity-feed` container to the bottom. Preserve user scroll position if they manually scrolled up (debounce resume for 3s after manual scroll).

---

## Acceptance Criteria

1. `tools/dashboard/ctl.sh` file is deleted; no references to it remain in the repo (verified via `grep -r ctl\.sh`).
2. `forwardToCtlServer()` function and all call sites are removed from `channel.ts`. No references to port 8421 remain (verified via `grep -rn 8421`).
3. `/dashboard share` skill works against the channel port (8420) and does not fall back to any other port.
4. New MCP tool `get_pending_messages` is registered and returns `channel_message` events filtered by `since_seq` and optional `entity`.
5. FO can reconnect after a CC restart and call `get_pending_messages({ since_seq: last_known_seq })` to recover messages sent during the disconnected window — no messages lost.
6. Activity feed cards have a visible vertical gap (≥8px) between adjacent cards, both on entity detail pages and the homepage.
7. Activity feed automatically scrolls to the latest message on initial load and on every WS push. Manual scroll-up by the user pauses auto-scroll for 3 seconds.
8. All existing dashboard tests pass (195 tests as of this session baseline). New tests cover `get_pending_messages` and the auto-scroll behavior.

---

## Out of Scope

- **Vanilla JS → React/Next.js migration** — tracked in handoff notes but not part of ADR-001.
- **Custom snapshots → git-based versioning** — tracked in handoff notes but not part of ADR-001.
- **Scoped share links with password** — the dashboard UI's per-entity "Share" panel already handles this use case; `/dashboard share` skill explicitly does not.
- **MEMORY.md cleanup** of entries that become stale after ADR-001 (e.g., "WebSocket Cross-Instance Limitation", "CustomEvent Bridge Pattern") — tracked separately, do as post-landing cleanup.

---

## Open Questions

None. All brainstorming questions resolved:

1. Standalone mode removal → accepted.
2. Bidirectional chat approach → Option A (`get_pending_messages` MCP tool) + keep existing notification push as fast path.
3. UI polish → folded into acceptance criteria.

---

## Key Files

| File | Change |
|------|--------|
| `tools/dashboard/ctl.sh` | **DELETE** |
| `tools/dashboard/src/channel.ts` | Remove `forwardToCtlServer()`, rename `channel_port` state to `port`, add `get_pending_messages` tool handler |
| `tools/dashboard/src/server.ts` | Remove standalone-mode code paths (if any); no other changes to HTTP routes |
| `tools/dashboard/src/events.ts` | Add `getChannelMessagesSince(seq: number, entity?: string)` method for the new MCP tool |
| `tools/dashboard/static/detail.js` | Activity feed: ≥8px card margin (CSS), auto-scroll on load + WS push |
| `tools/dashboard/static/activity.js` | Same UI polish for homepage feed |
| `tools/dashboard/static/detail.css` | Card margin CSS rule |
| `tools/dashboard/skills/dashboard/SKILL.md` | Remove `bash ctl.sh` references, remove `channel_port` fallback |
| `references/first-officer-shared-core.md` (line 21) | Replace "Check dashboard — run `ctl.sh status`" step with MCP transport detection |
