---
id: 060
title: "Cutover — delete engine tools/dashboard/static"
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
scale: Small
project: spacedock
depends-on: [059]
---

## Directive

> Once the spacebridge plugin reaches full feature parity with the old static dashboard and users have migrated, the legacy `tools/dashboard/static/*` files in the engine repo become dead code. They add maintenance burden, confuse contributors about which UI is authoritative, and bloat the engine. This entity is the final cleanup: remove the old static UI from the engine, keeping only the data-layer code that serves as the in-process default `ChannelProvider` implementation.

## Captain Context Snapshot

- **Repo**: main @ bd0e83d
- **Session**: 2026-04-11 journal — entity 060 was drafted alongside 049-059 as a spacebridge Phase F stub (commit bebe7e2) following the engine/bridge split design (commit 517d5db).
- **Domain**: Behavioral/Callable (in-process `ChannelProvider` default), Readable/Textual (docs + migration note), Organizational/Data-transforming (engine surface-area reduction)
- **Scope flag**: ⚠️ likely-decomposable (2 signals: "migrate" verb in scope + 3 domains tagged — explore should verify this stays atomic)
- **Related entities**: 059 -- Standalone directory distribution + wrapper CLI (clarify, context_status: ready); 053 -- Next.js warroom + SSE feed (plan, ready); 058 -- share tunnel rebuild (clarify, ready); 047 -- entity body rendering hotfixes (shipped)
- **Created**: 2026-04-13T14:55:00Z

## Brainstorming Spec

**APPROACH**: One atomic PR targeting clkao/spacedock upstream that (a) deletes `tools/dashboard/static/*` wholesale, (b) refactors `server.ts` (currently 9 `staticDir` references at lines 26, 51, 745, 809, 878, 1170, 1179, 1182-1183) so static-serving becomes opt-in — the default `ChannelProvider` runs headless (API-only), and external consumers that want a UI pass their own `staticDir` option, (c) updates engine tests that assert on HTML responses to target the new headless contract or mock a `staticDir`, and (d) adds a short migration note to the engine README pointing users to the spacebridge plugin for UI. The in-process `ChannelProvider` when no `staticDir` is provided should return a JSON 404 with a `migration_guide_url` field (needs clarification -- deferred to explore) on HTML-expecting routes, while preserving all `/api/*` routes unchanged.

**ALTERNATIVE**: Phased removal — ship a release that logs a deprecation warning when `staticDir` is active, wait N release cycles, then delete in a follow-up. -- D-01 Rejected because the design doc §2.4 already scheduled the deprecation phase at the *release-pipeline* level: 059 ships the new distribution channel (spacebridge plugin), users migrate during the 059-060 gap window, and 060 is specifically the final Long-term step. Running another deprecation cycle inside 060 double-gates work already gated, and bloats an upstream PR that reviewers want atomic.

**GUARDRAILS**:
- PR targets clkao/spacedock (upstream engine repo), not a Kent fork — coordination with upstream maintainer required before merge
- Data-layer code must be preserved verbatim: `db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts` (public API surface consumed by spacebridge and any other downstream)
- 059 (standalone directory distribution + wrapper CLI) **must be shipped** before this entity's PR opens — it is the distribution channel replacement
- Post-cutover engine `bun test` must pass in headless mode (no browser fixtures, no static-file 200-assertions)
- Migration note should be concise — users who followed the design-doc timeline already migrated; this is a pointer, not a tutorial

**RATIONALE**: Atomic deletion is cleaner than phased removal because the migration *already happened* in the 059 → 060 release window — the deprecation ritual belongs upstream in the lifecycle, not inside this entity. Keeping 060 atomic also respects upstream reviewer ergonomics: a single PR that says "delete N files, refactor one, update docs" is reviewable in one pass, whereas a phased variant forces upstream to accept a deprecation warning PR now and a deletion PR later, doubling the coordination burden for a project Kent doesn't own. The opt-in `staticDir` refactor (vs. removing the parameter entirely) also preserves optionality — if a third-party consumer wants to self-host HTML, they still can, which reduces upstream's surface-area risk in accepting the change.

## Acceptance Criteria

- Given `tools/dashboard/static/` is deleted, when `bun test` runs in the engine repo, then all tests pass with zero failures in headless mode (how to verify: `bun test` in engine checkout, assert exit code 0)
- Given the default `ChannelProvider` is constructed without a `staticDir` option, when a request hits `/` or `/detail.html`, then the response is JSON-shaped (either 404 + migration pointer, or a redirect to the spacebridge plugin docs) — NOT HTML (how to verify: `curl -sI localhost:${port}/` asserting `content-type: application/json` or 3xx redirect; `curl -s localhost:${port}/ | jq .migration_guide_url` returns non-null)
- Given the engine README after 060, when a reader searches for "spacebridge" or "migrated", then the README surfaces a migration note (how to verify: `grep -ic "spacebridge\|migrated" tools/dashboard/README.md` returns ≥1)
- Given the pre-060 data-layer API surface, when an external TypeScript consumer imports `db.ts`/`snapshots.ts`/`api.ts`/`entity-resolver.ts`/`frontmatter-io.ts`/`events.ts` after 060, then all exported type signatures are byte-identical (how to verify: `tsc --noEmit` against a consumer fixture; zero type errors; `git diff bd0e83d..HEAD -- tools/dashboard/src/{db,snapshots,api,entity-resolver,frontmatter-io,events}.ts` shows zero substantive changes)
- Given the upstream PR on clkao/spacedock is opened, when upstream CI runs, then all required checks pass (how to verify: `gh pr checks {pr_number}` shows green for all required contexts)

## References

- Design doc §2.4 (What happens to tools/dashboard/): phased removal plan (short/medium/long term)
- Upstream repo: clkao/spacedock
- Engine server refactor target: `tools/dashboard/src/server.ts` (9 `staticDir` references at lines 26, 51, 745, 809, 878, 1170, 1179, 1182-1183 as of bd0e83d)
- Engine data-layer preservation set: `db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts`
- Prior-session journal entry: 2026-04-11 09-24-15-842829.md (spacebridge track, Phase F stub creation)
