---
id: 058
title: "spacebridge share tunnel rebuild"
status: execute
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-14T18:20:00+08:00
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-spacebridge-share-tunnel-rebuild
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [057]
---

## Directive

> Rebuild the `/dashboard share` tunnel functionality for the spacebridge architecture. Pre-SaaS multi-human collaboration requires sharing a specific entity's live state with external collaborators (reviewers, domain experts, teammates) without requiring them to install anything. The new implementation uses SSE-based transport (reliable through tunnels), entity-scoped bearer-token auth, and rate limiting to prevent abuse if share links leak. The CLI command `spacebridge share --entity <slug>` creates a share token, spins up a tunnel (cloudflared/ngrok/tailscale), prints a URL. External collaborators see a read-only entity view with live SSE feed and a comment form. Comments flow back into the bridge event stream, visible to SO/FO.

## Captain Context Snapshot

- **Repo**: main @ 8bd6042
- **Session**: SO pipeline for spacebridge entities. 053/054/057/059 context ready. 058 next in queue.
- **Domain**: Runnable/Invokable (CLI command + tunnel lifecycle), Behavioral/Callable (SSE endpoint + rate limiter + comment handler + tunnel abstraction), Organizational/Data-transforming (share tokens storage + schema evolution), User-facing Visual (external share view page)
- **Scope flag**: ⚠️ likely-decomposable (4 domains, multiple subsystems: domain layer, tunnel backends, CLI, share view UI, rate limiter -- but these form one cohesive "share entity with external collaborator" feature flow)
- **Related entities**: 057 -- Session registry + file watcher (clarify, context ready -- 058 depends on this for active session tracking), 053 -- Next.js war room + SSE live feed (draft, context ready -- SSE patterns + EventSource consumer reused by share view), 054 -- Entity detail + comments API (draft, context ready -- detail rendering + comments POST endpoint reused), 050 -- Plugin skeleton + Drizzle schema (shipped -- share_tokens table exists at schema.ts:84-99, needs evolution for bearer-token model), 052 -- L2 daemon lifecycle (shipped -- daemon process hosts the tunnel)
- **Created**: 2026-04-13T22:00:00+08:00

## Brainstorming Spec

**APPROACH**: Build the share tunnel as a 4-layer stack on top of the spacebridge daemon and Next.js app. (1) **Domain layer** (`domain/share/`): A pure token manager following fmodel Zod schema discipline (`.passthrough()` per entities 050/056/057) but NOT full CQRS -- share tokens are short-lived CRUD, not event-sourced state (✓ confirmed by explore: share_tokens table at schema.ts:82-99 already marked `[plain drizzle]` not `[full CQRS]`). Recreate the `share_tokens` table with bearer-token schema (⚠ contradicted: APPROACH said "evolve" but share_tokens has `password_hash TEXT NOT NULL` + `entity_paths TEXT NOT NULL` as JSON array -- these are structurally incompatible with bearer-token model. Since spacebridge has no production data (entity 050 seed only), clean recreate is simpler than ALTER TABLE. See O-1). Token generation reuses the proven 192-bit entropy pattern (24 random bytes → 48-char hex, dashboard auth.ts:15-18). The token manager provides `create(entitySlug, ttlHours)` → `{token, url}`, `verify(token)` → `{entitySlug, expiresAt} | null`, `revoke(token)` → `boolean`, `cleanup()` → removes expired tokens. (2) **Tunnel layer** (`tunnel/`): A backend abstraction interface `TunnelProvider { start(localPort): Promise<string>, stop(): Promise<void>, getPublicUrl(): string }` with three implementations: `CloudflaredProvider` (named tunnels via `cloudflared tunnel` CLI), `NgrokProvider` (via `ngrok http` CLI), `TailscaleProvider` (via `tailscale funnel` CLI). The daemon detects which tunnel binary is available at startup and auto-selects, with `--tunnel-backend <name>` CLI override. The tunnel exposes the Next.js app's HTTP port -- share requests route through the tunnel to the same server that serves the war room. (3) **CLI layer** (`bin/spacebridge`): `spacebridge share --entity <slug> [--ttl 7d] [--tunnel-backend cloudflared]` creates a share token via domain layer, starts the tunnel if not running, prints the bearer-token URL. `spacebridge share --revoke <share_id>` revokes a token. `spacebridge share --list` shows active tokens with expiry. (4) **View layer** (Next.js `app/share/[token]/`): A read-only page that validates the bearer token via middleware, renders the entity detail (reusing entity 054's detail component), connects to the SSE feed filtered to the shared entity (reusing entity 053's `/api/events` endpoint with entity-scope query param), and provides a nickname-based comment form that POSTs to the comments API (entity 054). Rate limiting middleware enforces N requests/minute/token at the daemon HTTP layer using an in-memory token-bucket.

**ALTERNATIVE**: Keep the password-based auth model from the old dashboard (`ShareRegistry` in `tools/dashboard/src/auth.ts`) and adapt it for SSE transport. The collaborator would still enter a password after opening the share URL, preserving the existing `password_hash NOT NULL` schema and `Bun.password.verify()` flow. -- D-01 Rejected: Design doc §6.3 explicitly chose bearer-token URLs to eliminate authentication friction. The pre-SaaS audience ("send a link to a colleague") requires "it just works" -- a password dialog adds a step and requires out-of-band password sharing. The old model was designed before the SSE-first transport decision; bearer-token + SSE is the coherent pair for tunnel-friendly sharing.

**GUARDRAILS**:
- LCD schema discipline for any new/modified columns: text strings, integer PKs with autoincrement, integer epoch-ms timestamps, no JSON for queryable data (design doc §3.3, entity 050 GUARDRAILS)
- Bearer-token entropy ≥192 bits -- reuse existing `generateToken()` pattern (24 random bytes → 48-char hex). Do NOT use shorter tokens or predictable patterns
- SSE transport only -- no WebSocket fallback. SSE passes through ngrok and tailscale transparently (⚠ research contradicted: cloudflared GET-based SSE is BUFFERED until connection close -- cloudflare/cloudflared#1449, open since 2024, unresolved. Design doc §6.2 claim "SSE Just Works" is incorrect for cloudflared quick tunnels. ngrok v3 HTTP/1.1 upstream confirmed safe. tailscale funnel TCP proxy confirmed safe but port-restricted to 443/8443/10000 -- see Q-2)
- Entity-scoped tokens -- share view middleware MUST verify the token's `entity_slug` matches the requested entity. No leakage of other entities, workflow-level data, or daemon internals
- Rate limiting at the daemon HTTP layer (middleware), NOT at the tunnel layer -- tunnel backends don't all expose rate limiting APIs. Use a simple in-memory token-bucket per share token

**RATIONALE**: Bearer-token URLs eliminate the password dialog friction required by the old dashboard's share system, directly implementing design doc §6.3's "the URL is the credential" mandate. The 4-layer architecture (domain → tunnel → CLI → view) cleanly separates pure token logic (testable with no I/O), tunnel provider abstraction (swappable backends), CLI UX (argument parsing), and web rendering (reuses 053/054 components). Recreating the `share_tokens` table with a clean bearer-token schema (see O-1 explore finding) preserves the 5-table count established in entity 050 while eliminating the password_hash + entity_paths columns incompatible with the bearer-token model -- no migration needed since spacebridge has no production data. SSE transport through tunnels is proven viable by entity 053's spike (entity 049 confirmed SSE Route Handlers work in Bun+Next.js) and by the design doc's rationale that all three tunnel providers transparently proxy HTTP/1.1 streaming.

## Acceptance Criteria

- [ ] Given `spacebridge share --entity my-entity`, when the command runs, then it creates a share token in the `share_tokens` table and prints a URL containing the token (how to verify: `bun test spacebridge/src/domain/share/token-manager.test.ts` -- assert token row exists with correct entity_slug and expiry)
- [ ] Given a valid share URL, when an external user opens it in a browser, then they see the entity's current state rendered as a read-only detail view with live SSE updates (how to verify: `curl -N https://<tunnel-url>/share/<token>` returns HTML; SSE stream at `/api/events?token=<token>` delivers events)
- [ ] Given a share page with a comment form, when the external user submits a comment with a nickname, then the comment appears in the bridge event stream and is visible to the local SO/FO session (how to verify: POST to `/api/comments` with bearer token, assert event in events table with comment type)
- [ ] Given a share token with 7-day default expiry, when the expiry time passes, then the token is no longer valid and the share URL returns 401 (how to verify: `bun test` -- create token with 0ms TTL, assert `verify()` returns null)
- [ ] Given `spacebridge share --revoke <share_id>`, when the command runs, then the token is deleted and subsequent access returns 401 (how to verify: `bun test` -- create, revoke, assert verify returns null)
- [ ] Given a share token with rate limit N=60 requests/minute, when a client exceeds 60 requests in one minute, then subsequent requests return 429 Too Many Requests (how to verify: integration test -- send 61 requests in rapid succession, assert 429 on request 61)
- [ ] Given an SSE connection through a cloudflared tunnel, when events are pushed by the daemon, then the external client receives them without degradation (how to verify: manual E2E -- start tunnel, connect EventSource, trigger event, assert received)
- [ ] Given a share token scoped to entity "alpha", when the share view attempts to load entity "beta", then it returns 403 Forbidden (how to verify: `bun test` -- assert scope check rejects cross-entity access)

## References

- Design doc §6.1 (Use case): collaboration flow description
- Design doc §6.2 (Why SSE makes this easy): tunnel reliability rationale
- Design doc §6.3 (Auth model v1): bearer-token URL design and limitations
- Design doc §6.4 (Rate limiting): abuse prevention strategy
- `spacebridge/src/schema.ts:84-99` -- existing share_tokens table (needs evolution for bearer-token model)
- `tools/dashboard/src/auth.ts` -- old ShareRegistry pattern (password-based, being superseded)
- `tools/dashboard/static/share.js` -- old share view UI (password dialog pattern being replaced)
- Entity 053 decisions: O-1 `spacebridge/ui/` separate subproject, O-2 poll events table 500ms, O-3 filesystem parse at request time
- Entity 054 decisions: O-1 single-level replies, O-2 suggestions deferred to v2, O-3 section-based anchoring
- Entity 057 decisions: O-2 events table + sentinel values (entity="*", stage="watcher") for file change events

## Assumptions

A-1: share_tokens table is recreated with a clean bearer-token schema (not migrated via ALTER TABLE) since spacebridge has no production data -- entity 050 seeded the table but no tokens exist.
Confidence: 🟢 Confident (0.95)
Evidence: schema.ts:82 comment `[plain drizzle]` -- not event-sourced, no migration log. db.ts:97 uses `CREATE TABLE IF NOT EXISTS` -- no migration framework. spacebridge/src/schema.test.ts:325 confirms table exists but only uses test fixtures. No production share tokens have ever been created.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: `spacebridge share` CLI communicates with daemon via IPC over the existing unix socket (same pattern as `spacebridge status` which sends RPC over socket-server).
Confidence: 🟢 Confident (0.90)
Evidence: bin/daemon.ts:65-77 -- `onRpcRequest` handler already routes by `req.method` (e.g., `"__status"`). Adding `"share_create"`, `"share_revoke"`, `"share_list"` methods follows the same pattern. socket-client.ts provides the shim-side IPC client. bin/daemon.ts:172-230 -- status subcommand already sends RPC over socket and parses response.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Daemon manages tunnel lifecycle -- starts tunnel on first share create, stops tunnel when all share tokens are revoked/expired.
Confidence: 🟡 Likely (0.75)
Evidence: Design doc §6.1:557 -- "Bridge spins up a tunnel." The bridge is the daemon. bin/daemon.ts owns long-lived state and process management (PID file, signal handlers, auto-stop timer). But no tunnel code exists yet -- the lifecycle policy (on-demand vs always-on) is not specified in the design doc.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Bearer token validation via Next.js middleware querying share_tokens table with Drizzle ORM.
Confidence: 🟢 Confident (0.90)
Evidence: Entity 053 O-3 -- filesystem parse at request time shows Next.js reads spacebridge DB directly. schema.ts exports `shareTokens` for Drizzle queries. Entity 053 O-2 -- events table polled at 500ms, demonstrating Next.js → SQLite read pattern. share_tokens query would follow identical pattern.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Rate limiting uses an in-memory token-bucket Map per share token at the Next.js middleware layer.
Confidence: 🟡 Likely (0.70)
Evidence: No rate limiting code exists in spacebridge. Design doc §6.4:582 says "rate-limited at the daemon: N requests per minute per share token" -- confirms per-token granularity. In-memory Map is simplest for single-daemon architecture (design doc §1.2 -- one daemon per machine). Token-bucket is a standard algorithm, no external dependency needed.
→ Confirmed: captain, 2026-04-13 (batch)

A-6: External collaborator comments use `author: "guest:{nickname}"` format in the comments table, consistent with the existing `author` text column that already supports 'captain' | 'fo' | 'guest'.
Confidence: 🟢 Confident (0.85)
Evidence: schema.ts:69 -- `author: text("author").notNull()` with no enum constraint. Design doc §6.3:576 -- "Comments attributed to a nickname they choose (not verified)." The `guest:{nickname}` convention distinguishes external nicknames from authenticated roles without schema changes.
→ Confirmed: captain, 2026-04-13 (batch)

A-7: SSE feed for the share view filters events by entity slug using a SQL WHERE clause on the events table `entity` column.
Confidence: 🟢 Confident (0.90)
Evidence: schema.ts:47 -- `entity: text("entity").notNull()`. Entity 053 O-2 -- SSE endpoint polls events table at 500ms. Entity 057 O-2 -- file watcher events use sentinel `entity="*"`, which would naturally be excluded by `WHERE entity = ?` (exact match). The share view adds `AND` for token-scoped filtering.
→ Confirmed: captain, 2026-04-13 (batch)

A-8: Share view pages live in `spacebridge/ui/app/share/[token]/` following entity 053's O-1 decision (`spacebridge/ui/` as separate Next.js subproject).
Confidence: 🟢 Confident (0.95)
Evidence: Entity 053 O-1 selected `spacebridge/ui/` as the Next.js app root. `spacebridge/ui/` does not exist yet (053 not executed), but the path is authoritative per 053's clarify decisions. Next.js `[token]` dynamic route segment is the standard pattern for bearer-token URL routing.
→ Confirmed: captain, 2026-04-13 (batch)

A-9: Share view comments are flat (single-level, no threading) per entity 054's O-1 decision.
Confidence: 🟢 Confident (0.95)
Evidence: Entity 054 O-1 -- "Single-level replies" selected by captain. Share view reuses 054's comments component, inheriting the flat structure. No threading UI needed.
→ Confirmed: captain, 2026-04-13 (batch)

A-10: Lazy token cleanup on `verify()` -- expired tokens are deleted when accessed, consistent with old ShareRegistry pattern.
Confidence: 🟢 Confident (0.85)
Evidence: tools/dashboard/src/auth.ts:75-78 -- `get(token)` checks `expires_at < Date.now()`, deletes if expired, returns null. Same pattern applies to the new token manager's `verify()` method. No cron-based cleanup needed for v1.
→ Confirmed: captain, 2026-04-13 (batch)

A-11: Token generation reuses the 192-bit entropy pattern (24 random bytes → 48-char hex string) proven in the old dashboard.
Confidence: 🟢 Confident (0.95)
Evidence: tools/dashboard/src/auth.ts:15-18 -- `crypto.getRandomValues(new Uint8Array(24))` → hex encoding. 192 bits provides ~1.58e57 possible tokens, sufficient for pre-SaaS scale. GUARDRAILS bullet 2 mandates ≥192 bits.
→ Confirmed: captain, 2026-04-13 (batch)

A-15: TailscaleProvider maps an allowed external port (443 preferred) to the local Next.js port. `tailscale funnel 443 / http://localhost:8420` is valid -- the port restriction (443/8443/10000) applies to external-facing ports, not local targets. `stop()` must always run `tailscale funnel {extPort} off` as cleanup -- SIGTERM alone leaves funnel config active in tailscale daemon (researcher finding).
Confidence: 🟢 Confident (0.85)
Evidence: Researcher finding -- tailscale funnel is TCP proxy, port restriction on external port only. `tailscale funnel PORT off` required for cleanup (GitHub issue #15248). External URL deterministic: `https://{machine}.{tailnet}.ts.net/`.
→ Confirmed: captain, 2026-04-13 (interactive)

A-14: Share create is NOT idempotent -- each `spacebridge share --entity slug` invocation creates a new token. Multiple active tokens per entity allowed for per-collaborator granularity (share with Alice, share with Bob, revoke Alice's without affecting Bob). Token lifecycle: (1) manual revoke via `--revoke <share_id>`, (2) TTL expiry with lazy cleanup on verify() (A-10), (3) daemon restart preserves tokens in SQLite -- tunnel restarts on next share operation, old tokens remain valid. Entity deletion does not auto-revoke tokens (share view shows 404). Default TTL 7 days (design doc §6.3), CLI `--ttl` adjustable at creation time. No post-creation TTL modification -- revoke and recreate. Dashboard share management UI (with optional password protection) deferred to a new entity (depends on 058 + 054).
Confidence: 🟢 Confident (0.90)
Evidence: Design doc §6.3:574-575 -- "Default: 7 days, configurable" + "Tokens can be revoked." tools/dashboard/src/auth.ts:39-63 -- old ShareRegistry creates new token every time (no idempotency check). Captain decision: dashboard UI + password → new entity.
→ Confirmed: captain, 2026-04-13 (interactive)

A-13: Share view error states follow Next.js `error.tsx` + `not-found.tsx` conventions. 401/403/429 pages show concise messages (no navigation bar -- external users have no dashboard context). Loading uses shadcn Skeleton component (entity 053 Q-2 standard set). SSE disconnect shows "Reconnecting..." banner with EventSource auto-reconnect (entity 053 explore pattern).
Confidence: 🟢 Confident (0.90)
Evidence: Entity 053 Q-2 -- shadcn standard set includes Skeleton. Entity 053 explore -- SSE disconnect banner with EventSource auto-reconnect documented. Next.js error.tsx/not-found.tsx is the standard App Router error handling pattern.
→ Confirmed: captain, 2026-04-13 (interactive)

A-12: Tunnel failure handling has three layers: (1) no binary found -- detect() returns null, CLI prints installation guide for each provider and exits with code 1; (2) startup failure -- provider stderr forwarded to user, CLI exit 1; (3) mid-run disconnect -- daemon detects child process exit event and marks tunnel as down. Share tokens are NOT auto-revoked (tunnel can be restarted).
Confidence: 🟢 Confident (0.85)
Evidence: bin/daemon.ts:106-117 -- graceful shutdown pattern with signal handlers and PID cleanup. bin/daemon.ts:132-156 -- cmdStop handles stale PID cleanup. Same error discipline applies to tunnel child processes.
→ Confirmed: captain, 2026-04-13 (interactive)

## Option Comparisons

### O-1: Schema evolution strategy -- how to transition share_tokens from password-based to bearer-token model

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Recreate share_tokens with clean bearer-token schema (drop password_hash, entity_paths; add entity_slug) | Clean schema, no migration code, no nullable workarounds; entity 050 seed has no production data | Technically drops a table that entity 050 tests verify -- tests need update; if any downstream code depends on old columns it breaks | Low | Recommended |
| ALTER TABLE to make password_hash nullable, add entity_slug, keep entity_paths | Preserves existing DDL structure; backward compatible with any code referencing old columns | password_hash still in schema even though bearer-token never uses it; entity_paths JSON array is LCD violation for new code; messy hybrid | Medium | Not recommended |
| Create new share_links table alongside share_tokens | Complete separation; old table untouched; new code gets clean schema | 6th table breaks 5-table LCD count; two share tables is confusing; entity 060 cutover must clean up both | Medium | Not recommended |

Return value trace: `shareTokens` export from schema.ts is imported by schema.test.ts (5 tests verify table structure). db.ts:97 creates the DDL inline. No other file imports `shareTokens` -- no downstream consumers beyond tests. Recreating the table means updating schema.ts + db.ts + schema.test.ts, all co-located.

Design doc invariant check: §3.3 LCD discipline requires text strings, integer PKs, integer timestamps, no JSON for queryable data. The new schema (`entity_slug TEXT NOT NULL` replacing `entity_paths TEXT NOT NULL` JSON array) is MORE LCD-compliant than the current schema. §6.3 bearer-token model has no password_hash requirement. No forward-looking invariant (Postgres migration, multi-machine, SaaS) depends on the old column structure.
→ Selected: 重建 share_tokens（刪除 password_hash、entity_paths，新增 entity_slug）(captain, 2026-04-13, interactive)

### O-2: Tunnel provider auto-detection -- how to select which tunnel backend to use when multiple are installed

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| First-found priority order (ngrok > tailscale > cloudflared) with `--tunnel-backend` override | Zero-config; ngrok first because SSE confirmed working; cloudflared last due to SSE buffering bug; simple `which` check | May pick wrong provider if user has multiple; no persistent preference | Low | Recommended |
| Config file (`.spacedock/tunnel.toml`) with fallback to first-found | Persistent preference; supports provider-specific config (auth tokens, tunnel names) | Adds config management; overkill for v1 pre-SaaS; another file to maintain | Medium | Viable |
| Always require `--tunnel-backend` flag, no auto-detect | Explicit, no surprises; user always knows which provider | Poor UX for common case (one provider installed); friction on every share command | Low | Not recommended |

Return value trace: `detect()` returns a `TunnelProvider` instance → passed to daemon's tunnel lifecycle → `provider.start(port)` returns public URL → stored alongside share token. No downstream consumer depends on which provider was selected -- they only consume the URL.

Design doc invariant check: §6.1:558 says "bridge supports multiple backends" -- all three options satisfy this. §6.2:568 says "it should just work" -- Option A best matches this UX requirement. The `--tunnel-backend` override ensures no lock-in. (⚠ research update: priority order changed from cloudflared-first to ngrok-first because cloudflared GET-based SSE is buffered -- cloudflare/cloudflared#1449)
→ Selected: 優先順序自動偵測（ngrok > tailscale > cloudflared），--tunnel-backend 可覆寫 (captain, 2026-04-13, interactive)

## Open Questions

Q-1: Where should tunnel provider credentials (cloudflared cert, ngrok auth token) be stored and how should they be configured?

Domain: Runnable/Invokable, Organizational/Data-transforming

Why it matters: cloudflared requires a `cert.pem` or tunnel credentials file for named tunnels, ngrok requires an auth token for persistent tunnels, tailscale requires the device to be logged in. The storage location affects security (plain text vs keychain), portability (per-machine vs per-project), and the CLI UX for initial setup.

Suggested options: (a) Environment variables (`CLOUDFLARED_TOKEN`, `NGROK_AUTHTOKEN`, `TAILSCALE_AUTHKEY`) -- simplest, follows 12-factor convention, each provider's own CLI already reads these. (b) Config file at `~/.spacedock/tunnel.toml` -- persistent, one place for all providers, but adds config management scope. (c) Rely on each provider's own credential storage (cloudflared `~/.cloudflared/`, ngrok `~/.ngrok2/ngrok.yml`, tailscale system auth) -- zero spacebridge-specific config, but requires users to set up each provider independently.
→ Answer: (c) 各 provider 自己的憑證儲存 -- 零 spacebridge 配置，用戶獨立設定各 provider。cloudflared 用 ~/.cloudflared/，ngrok 用 ~/.ngrok2/ngrok.yml，tailscale 用系統 auth。 (captain, 2026-04-13, interactive)

Q-2: How should the TunnelProvider interface handle providers with known SSE limitations or port restrictions?

Domain: Behavioral/Callable, Runnable/Invokable

Why it matters: Research found cloudflared GET-based SSE is buffered (cloudflare/cloudflared#1449, open since 2024) and tailscale funnel only allows ports 443/8443/10000 (not 8420). If these are silently included in auto-detection, users get broken SSE or port errors. The TunnelProvider contract needs to surface these constraints.

Suggested options: (a) Add `supportsSSE(): boolean` and `allowedPorts(): number[]` capability methods to TunnelProvider interface -- detect() skips providers that fail capability checks for the current use case. cloudflared returns false for SSE, tailscale returns [443, 8443, 10000]. (b) Exclude cloudflared entirely from v1 (only ngrok + tailscale) -- simplest, but removes a popular provider. Re-add when #1449 is fixed. (c) Include all three but print a warning when auto-detecting cloudflared: "⚠ cloudflared may buffer SSE responses. Use --tunnel-backend ngrok for real-time streaming." Let user override.
→ Answer: (a) 能力旗標 + 自動跳過 -- TunnelProvider 介面加 supportsSSE() 和 allowedPorts() 方法。detect() 自動跳過不符合條件的 provider。cloudflared SSE=false，tailscale ports=[443,8443,10000]。用戶仍可用 --tunnel-backend 強制覆寫。 (captain, 2026-04-13, interactive)

## Canonical References

- `spacebridge/src/schema.ts:82-99` -- share_tokens table (recreate for bearer-token model per O-1)
- `spacebridge/src/db.ts:97-112` -- share_tokens DDL (recreate alongside schema.ts)
- `spacebridge/bin/daemon.ts:65-77` -- onRpcRequest handler (share RPC methods per A-2)
- `spacebridge/bin/daemon.ts:106-117` -- graceful shutdown pattern (tunnel cleanup per A-12)
- `tools/dashboard/src/auth.ts:15-18` -- generateToken() 192-bit entropy pattern (reuse per A-11)
- `tools/dashboard/src/auth.ts:75-78` -- lazy expiry cleanup pattern (reuse per A-10)
- `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md` -- §6.1-§6.4 tunnel/collaboration spec

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Entity is Medium scope, 4 domains but cohesive flow (CLI → daemon → tunnel → view), no children proposed
- [x] Re-validation: 11 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  All file:line citations verified against files read this session; no drift detected
- [x] Assumptions confirmed: 15 / 15 (0 corrected)
  A-1 through A-11 confirmed batch; A-12 (tunnel failure handling), A-13 (share view error states), A-14 (share idempotency + token lifecycle), A-15 (tailscale port remap) confirmed interactive
- [x] Options selected: 2 / 2
  O-1 recreate share_tokens (recommended); O-2 auto-detect ngrok > tailscale > cloudflared (recommended)
- [x] Questions answered: 2 / 2
  Q-1 provider-native credential storage; Q-2 capability flags + auto-skip for SSE/port limitations
- [x] Open exploration: 4 gray areas surfaced (2 from templates, 0 from CONTRACTS, 0 from directive, 2 via freeform)
  A-12 tunnel failure handling (template: Runnable/failure mode); A-13 share view error states (template: Visual/empty-loading-error); A-14 share idempotency + dashboard UI scope (captain freeform); A-15 tailscale port remap (captain freeform)
- [x] Canonical refs added: 7
  schema.ts, db.ts, daemon.ts (x2), auth.ts (x2), design doc
- [x] Context status: ready
  Gate passed: all 15 assumptions confirmed, all 2 options selected, all 2 Qs answered
- [x] Handoff mode: loose
  No auto_advance in frontmatter; captain must say "execute 058" to advance
- [x] Clarify duration: 9 questions asked, session complete
  1 batch confirmation + 2 option selections + 2 Q answers + 4 exploration iterations

## Stage Report: explore

- [x] Files mapped: 14 across schema(2), daemon(1), domain/share(3 new), tunnel(5 new), view(3 new, depends on 053)
  schema: schema.ts + db.ts (recreate share_tokens DDL); daemon: bin/daemon.ts (add share RPC handlers); domain/share: types.ts + token-manager.ts + token-manager.test.ts (new); tunnel: provider.ts + cloudflared.ts + ngrok.ts + tailscale.ts + detect.ts (new); view: app/share/[token]/page.tsx + api route + middleware (new, inside spacebridge/ui/ from entity 053)
- [x] Assumptions formed: 11 (Confident: 9, Likely: 2, Unclear: 0)
  A-1 through A-2, A-4, A-6 through A-11 Confident (0.85-0.95); A-3 Likely (0.75, tunnel lifecycle not specified in design doc); A-5 Likely (0.70, no rate limiting precedent in codebase)
- [x] Options surfaced: 2
  O-1 schema evolution strategy (recreate vs evolve vs new table); O-2 tunnel auto-detection (priority order vs config vs explicit flag)
- [x] Questions generated: 1
  Q-1 tunnel provider credentials storage and configuration
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Medium
  14 files across 5 layers; 3 modify existing + 11 new. Scope flag present (4 domains) but decomposition not recommended: all 4 layers serve one cohesive flow (CLI → daemon → tunnel → view), breaking them into child entities would create artificial boundaries with tight coupling at every seam.
- [x] Research dispatched: 1 researcher for 1 topic (post-brainstorm Step 3.5, tunnel CLI validation)
  Tunnel backend CLIs (cloudflared/ngrok/tailscale): dispatched, pending return. Design doc §6.2 provides baseline confidence; researcher validates programmatic spawning + URL extraction + SSE compatibility.
