---
id: 058
title: "spacebridge share tunnel rebuild"
status: draft
context_status: pending
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started:
completed:
verdict:
score: 0.0
worktree:
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

**APPROACH**: Build the share tunnel as a 4-layer stack on top of the spacebridge daemon and Next.js app. (1) **Domain layer** (`domain/share/`): A pure token manager following fmodel Zod schema discipline (`.passthrough()` per entities 050/056/057) but NOT full CQRS -- share tokens are short-lived CRUD, not event-sourced state. Evolve the existing `share_tokens` table (schema.ts:84-99): make `password_hash` nullable with default `null` (bearer-token entries need no password -- design doc §6.3 "the URL is the credential"), replace `entity_paths` JSON array with a single `entity_slug` text column for entity-scoped access, keep `expires_at` for TTL enforcement. Token generation reuses the proven 192-bit entropy pattern (24 random bytes → 48-char hex, dashboard auth.ts:15-18). The token manager provides `create(entitySlug, ttlHours)` → `{token, url}`, `verify(token)` → `{entitySlug, expiresAt} | null`, `revoke(token)` → `boolean`, `cleanup()` → removes expired tokens. (2) **Tunnel layer** (`tunnel/`): A backend abstraction interface `TunnelProvider { start(localPort): Promise<string>, stop(): Promise<void>, getPublicUrl(): string }` with three implementations: `CloudflaredProvider` (named tunnels via `cloudflared tunnel` CLI), `NgrokProvider` (via `ngrok http` CLI), `TailscaleProvider` (via `tailscale funnel` CLI). The daemon detects which tunnel binary is available at startup and auto-selects, with `--tunnel-backend <name>` CLI override. The tunnel exposes the Next.js app's HTTP port -- share requests route through the tunnel to the same server that serves the war room. (3) **CLI layer** (`bin/spacebridge`): `spacebridge share --entity <slug> [--ttl 7d] [--tunnel-backend cloudflared]` creates a share token via domain layer, starts the tunnel if not running, prints the bearer-token URL. `spacebridge share --revoke <share_id>` revokes a token. `spacebridge share --list` shows active tokens with expiry. (4) **View layer** (Next.js `app/share/[token]/`): A read-only page that validates the bearer token via middleware, renders the entity detail (reusing entity 054's detail component), connects to the SSE feed filtered to the shared entity (reusing entity 053's `/api/events` endpoint with entity-scope query param), and provides a nickname-based comment form that POSTs to the comments API (entity 054). Rate limiting middleware enforces N requests/minute/token at the daemon HTTP layer using an in-memory token-bucket.

**ALTERNATIVE**: Keep the password-based auth model from the old dashboard (`ShareRegistry` in `tools/dashboard/src/auth.ts`) and adapt it for SSE transport. The collaborator would still enter a password after opening the share URL, preserving the existing `password_hash NOT NULL` schema and `Bun.password.verify()` flow. -- D-01 Rejected: Design doc §6.3 explicitly chose bearer-token URLs to eliminate authentication friction. The pre-SaaS audience ("send a link to a colleague") requires "it just works" -- a password dialog adds a step and requires out-of-band password sharing. The old model was designed before the SSE-first transport decision; bearer-token + SSE is the coherent pair for tunnel-friendly sharing.

**GUARDRAILS**:
- LCD schema discipline for any new/modified columns: text strings, integer PKs with autoincrement, integer epoch-ms timestamps, no JSON for queryable data (design doc §3.3, entity 050 GUARDRAILS)
- Bearer-token entropy ≥192 bits -- reuse existing `generateToken()` pattern (24 random bytes → 48-char hex). Do NOT use shorter tokens or predictable patterns
- SSE transport only -- no WebSocket fallback. SSE passes through cloudflared/ngrok/tailscale transparently (design doc §6.2). WebSocket requires per-tunnel configuration and breaks behind corporate proxies
- Entity-scoped tokens -- share view middleware MUST verify the token's `entity_slug` matches the requested entity. No leakage of other entities, workflow-level data, or daemon internals
- Rate limiting at the daemon HTTP layer (middleware), NOT at the tunnel layer -- tunnel backends don't all expose rate limiting APIs. Use a simple in-memory token-bucket per share token

**RATIONALE**: Bearer-token URLs eliminate the password dialog friction required by the old dashboard's share system, directly implementing design doc §6.3's "the URL is the credential" mandate. The 4-layer architecture (domain → tunnel → CLI → view) cleanly separates pure token logic (testable with no I/O), tunnel provider abstraction (swappable backends), CLI UX (argument parsing), and web rendering (reuses 053/054 components). Evolving the existing `share_tokens` table rather than creating a new table preserves the 5-table LCD schema established in entity 050 and avoids table proliferation -- entity 060 (cutover) will clean up any legacy columns when the old dashboard is deleted. SSE transport through tunnels is proven viable by entity 053's spike (entity 049 confirmed SSE Route Handlers work in Bun+Next.js) and by the design doc's rationale that all three tunnel providers transparently proxy HTTP/1.1 streaming.

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
