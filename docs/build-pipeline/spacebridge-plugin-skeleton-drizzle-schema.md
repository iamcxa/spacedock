---
id: 050
title: "Spacebridge plugin skeleton + Drizzle LCD schema"
status: shipped
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-12T15:40:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-spacebridge-plugin-skeleton-drizzle-schema
issue:
pr: "#32"
intent: feature
scale: Medium
project: spacedock
depends-on: [049]
---

## Directive

> Create the spacebridge Claude Code plugin skeleton with Drizzle ORM LCD schema. The plugin needs a working foundation: plugin structure (plugin.json, agents, skills, hooks), a Drizzle ORM schema that targets SQLite now but is forward-compatible with Postgres, and the folder layout that resolves the 2-plugin question (engine + bridge). Without this skeleton, all subsequent Phase F entities (051-060) have no codebase to build on. Namespace migration from spacedock:build-* to spacebridge:build-* is also absorbed into this entity (previously entity 055 scope).

## Captain Context Snapshot

- **Repo**: main @ 78fe3d9
- **Session**: Spacebridge entity chain review + housekeeping. Archived 008/048/055, updated dependency DAG, namespace refs updated from entity 055 to 050.
- **Domain**: Organizational/Data-transforming, Readable/Textual, Runnable/Invokable
- **Related entities**: 049 -- Next.js + Bun + compile + fmodel spike (shipped), 040 -- SpaceDock Plugin Architecture v2 (draft, resolved as reference), 051 -- Unix socket IPC (draft, depends on this), 059 -- Standalone distribution (draft, depends on 053)
- **Created**: 2026-04-12T18:30:00+08:00

## Brainstorming Spec

**APPROACH**: Create spacebridge as a new Claude Code plugin in a separate repository (escalated to Q-1 -- captain decides repo location). The plugin follows standard CC plugin conventions: `.claude-plugin/plugin.json` at repo root with name "spacebridge", plus `agents/`, `skills/`, `hooks/`, `src/` directories (✓ confirmed by explore: .claude-plugin/plugin.json pattern validated by existing spacedock plugin). The `src/` directory houses a Drizzle ORM setup with `bun:sqlite` driver and a LCD schema containing 5 initial tables (sessions, entity_leases, events, comments, share_tokens). All schema columns follow the LCD discipline from the design doc §3.3: `text` for strings, `integer` PKs with autoincrement, `integer` epoch-ms timestamps, no JSON for queryable data, no engine-specific `returning` clauses (✓ confirmed by explore: current db.ts uses TEXT timestamps -- LCD discipline is a deliberate break from engine pattern). Drizzle's schema-first approach generates SQL migrations that are manually reviewed for dual SQLite/Postgres validity. A `bun:test` suite validates table creation and basic CRUD (✓ confirmed by explore: tools/dashboard/src/db.test.ts uses bun:test + :memory: DB pattern). The plugin also receives SO-related build-* skills and agent files migrated from the spacedock namespace (⚠ contradicted: design doc §2.3 places FO in engine, not bridge -- not ALL build-* skills should migrate -- see Q-2).

**ALTERNATIVE**: Create spacebridge as a `plugins/spacebridge/` subdirectory within the existing spacedock repo (monorepo approach), with its own `plugin.json` and shared bun workspace configuration. -- D-01 Rejected: blurs the 2-plugin ownership boundary. Spacedock engine is CL's upstream (clkao/spacedock); spacebridge is kent's coordination layer. Mixing them creates release coupling and makes independent distribution impossible. The design doc invariant #3 says "Fixed port, daemon lifecycle, Next.js, SSE, Drizzle, fmodel -- all private to bridge."

**GUARDRAILS**:
- LCD schema discipline from design doc §3.3: `text` strings, `integer` PKs with autoincrement, `integer` epoch-ms timestamps, no JSON for queryable data, no engine-specific `returning` clauses
- Plugin structure must be valid CC plugin (`plugin.json` with name, version, description, author, repository, license, keywords)
- Schema must compile for both SQLite and Postgres (Drizzle dual-driver pattern: `bun:sqlite` default, `pg` via `--postgres` flag)
- No fmodel-ts in this entity -- pure Drizzle tables. fmodel CQRS domains arrive in later entities (054 comments, 056 leases, 057 sessions)
- Test isolation: explicit test DB paths (`join(TMP, "test.db")`), never fall back to production `~/.spacedock/spacebridge.db` (per MEMORY.md)
- Zod event schemas use `.passthrough()` not `.strip()` to avoid silent field loss during schema evolution (design doc §3.5 gotcha)

**RATIONALE**: A separate repo gives clean ownership boundaries matching the engine/bridge split. The spacedock plugin (engine) is CL's upstream; the spacebridge plugin (bridge) is kent's coordination + interaction layer. Starting with skeleton + schema establishes the foundation all subsequent entities build on. The LCD schema discipline pays for itself at the Postgres migration point -- no application code changes required, only a driver swap. Absorbing the namespace migration (ex-entity 055) into this entity is natural: creating the new plugin is when the `spacebridge:*` namespace comes into existence.

## Acceptance Criteria

- [ ] Given a fresh `spacebridge` directory, when `plugin.json` is present, then Claude Code recognizes it as a valid plugin (how to verify: install as local plugin, check `claude --print-config` shows spacebridge skills)
- [ ] Given Drizzle schema files, when `bun run drizzle-kit generate` runs, then SQL migration files are produced (how to verify: `ls drizzle/` shows `.sql` migration files)
- [ ] Given generated migration SQL, when reviewed for LCD compliance, then no SQLite-only or Postgres-only features appear (how to verify: `grep -E 'serial|timestamptz|datetime|RETURNING' drizzle/*.sql` returns 0 matches)
- [ ] Given the 5 initial tables (sessions, entity_leases, events, comments, share_tokens), when basic CRUD operations run against `bun:sqlite`, then inserts/reads/updates/deletes succeed (how to verify: `bun test src/schema.test.ts`)
- [ ] Given a test using the schema, when it creates a DB, then it uses an explicit temp path, not the production DB location (how to verify: `grep -r 'spacebridge.db' src/*.test.ts` returns 0 matches)
- [ ] Given build-* skills and agents need to exist in spacebridge namespace, when the plugin is loaded, then `spacebridge:build-brainstorm` (and siblings) are accessible (how to verify: install plugin, invoke `/spacebridge:build-brainstorm --help` or skill list)

## Assumptions

A-1: Use `bun:sqlite` driver for Drizzle ORM (not Postgres) as the initial storage backend.
Confidence: Confident (0.95)
Evidence: Design doc §3.1 -- "SQLite is the default and near-future storage"; entity 049 spike ran entirely on Bun runtime.
→ Confirmed: captain, 2026-04-12 (batch)

A-2: Use `bun:test` with `:memory:` SQLite for schema validation tests, co-located with source files.
Confidence: Confident (0.90)
Evidence: tools/dashboard/src/db.test.ts:9 -- `openDb(":memory:")` pattern; 15 test files co-located in src/.
→ Confirmed: captain, 2026-04-12 (batch)

A-3: Use INTEGER epoch-ms for all timestamp columns (deliberate break from engine's TEXT timestamps).
Confidence: Confident (0.95)
Evidence: Design doc §3.3 -- "Use integer timestamps (Unix epoch ms) rather than datetime/timestamptz"; current db.ts:23 uses `created_at TEXT` which is the OLD pattern being replaced.
→ Confirmed: captain, 2026-04-12 (batch)

A-4: Follow standard CC plugin structure: `.claude-plugin/plugin.json` at repo root with name, version, description, author, repository, license, keywords.
Confidence: Confident (0.95)
Evidence: .claude-plugin/plugin.json -- spacedock plugin uses exactly this pattern; marketplace.json optional for local development.
→ Confirmed: captain, 2026-04-12 (batch)

A-5: No fmodel-ts dependency in this entity -- pure Drizzle table definitions only.
Confidence: Confident (0.90)
Evidence: Brainstorm GUARDRAILS explicitly excludes fmodel; design doc §3.5 assigns fmodel to entities 054 (comments), 056 (leases), 057 (sessions).
→ Confirmed: captain, 2026-04-12 (batch)

A-6: Zod event schemas (when added later) must use `.passthrough()` not `.strip()` to prevent silent field loss during schema evolution.
Confidence: Confident (0.85)
Evidence: Design doc §3.5 -- "All event schemas use .passthrough() or explicit version tagging"; noted as hard-learned lesson from carlvoe (qnow repo).
→ Confirmed: captain, 2026-04-12 (batch)

## Option Comparisons

### O-1: Event sourcing column strategy

Should the initial 5 tables include fmodel-compatible columns (event_type, aggregate_id, sequence_number, payload) now, or add them via migration when entities 054/056/057 ship?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Include fmodel columns now | Later entities start immediately without migration; schema designed for its end state from day 1 | Unused columns in v1; payload column must be opaque blob (JSON) per LCD discipline | Low | Recommended |
| Minimal columns now, migrate later | YAGNI; cleaner initial schema; no unused columns | Requires Drizzle migration for every fmodel entity; migration bugs risk; contradicts "design for fmodel from day 1" design intent | Medium | Viable |

→ Selected: Include fmodel columns now (captain, 2026-04-12, interactive)

### O-2: Namespace migration strategy

How to migrate agent/skill files from `spacedock:*` to `spacebridge:*` namespace?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Copy SO-related files to spacebridge, leave originals in spacedock | Zero breaking changes; gradual migration; both namespaces work during transition | Duplicated files; drift risk between copies; maintenance burden | Low | Viable |
| Move SO-related files to spacebridge, update all refs atomically | Single source of truth; no duplication; clean cut | Breaking change for spacedock:build-* users; requires coordinated commit across repos | Low | Recommended |
| Move files + add alias stubs in spacedock | Single source of truth; backward compatible via stubs | CC plugin system may not support cross-plugin skill aliases; untested mechanism | Medium | Not recommended |

→ Selected: Move SO-related files to spacebridge, update all refs atomically (captain, 2026-04-12, interactive). Captain note: no cross-repo coordination needed -- all development happens in kent's spacedock fork. Engine changes PR to clkao after everything is complete. This resolves the "cross-repo" concern in the Cons column.

## Open Questions

Q-1: Where should the spacebridge repo live and how should it be bootstrapped?

Domain: Organizational/Data-transforming

Why it matters: Every subsequent entity (051-060) targets this repo. The path, git remote, and relationship to spacedock (dependency? sibling? subtree?) determine the development workflow for the entire Phase F.

Suggested options: (a) `~/Project/spacebridge/` as a standalone repo with its own git remote, (b) A directory under spacedock like `spacebridge/` with a separate `.claude-plugin/plugin.json` but shared git history, (c) A git subtree within spacedock that can be split out later

→ Answer: (b) spacedock repo 內的 spacebridge/ 目錄，獨立 .claude-plugin/plugin.json，共享 git history。開發期全部在 kent's spacedock fork 完成，engine 改動完成後 PR 給 clkao。 (captain, 2026-04-12, interactive)

Q-2: Which skills and agents should migrate to spacebridge vs stay in spacedock?

Domain: Runnable/Invokable

Why it matters: The brainstorm assumed ALL build-* skills migrate, but design doc §2.3 places FO in engine (autonomous, daemon-grade) and SO in bridge (interaction-heavy). If FO stays in engine, its skills (build-plan, build-execute, build-quality) should too. Migrating everything contradicts the architecture.

Suggested options: (a) SO + discuss-phase skills only (build-brainstorm, build-explore, build-clarify, science-officer agent) move to spacebridge; FO + execute-phase skills stay in spacedock, (b) All build-* skills move to spacebridge since they are all "build studio" skills regardless of which agent invokes them, (c) Defer migration entirely -- just create the plugin skeleton + schema; migrate skills in a follow-up entity when the daemon exists

�� Answer: (c) 延後遷移。這個 entity 只建 skeleton + schema，不搬任何 skill/agent。等 daemon 存在後再決定 skill 分割策略。這也意味著 brainstorm APPROACH 中的 namespace migration 部分從 050 scope 中移除。 (captain, 2026-04-12, interactive)

Q-3: How does spacebridge consume spacedock engine types (ChannelProvider, CoordinationClient) across repo boundaries?

Domain: Behavioral/Callable

Why it matters: Entity 051 (IPC) implements ChannelProvider on the bridge side. The TypeScript interface is defined at `tools/dashboard/src/channel-provider.ts` in the engine repo. If spacebridge is a separate repo, it needs access to this type definition without creating a hard import dependency on the engine.

Suggested options: (a) Copy the interface definition to spacebridge and keep in sync manually, (b) Publish a `@spacedock/interfaces` npm package from the engine containing only the type definitions, (c) Redefine the interface independently in spacebridge -- the unix socket wire protocol is the real contract, not the TypeScript type

→ Answer: 直接 import 同 repo 的 type。Q-1 決定 spacebridge 在 spacedock repo 內，所以 spacebridge/src/ 可以直接 import tools/dashboard/src/channel-provider.ts 的 type。零摩擦，之後抽離 repo 時再處理。 (captain, 2026-04-12, interactive)

## Canonical References

- tools/dashboard/src/channel-provider.ts -- ChannelProvider interface (bridge ↔ engine seam, direct import target for spacebridge)

## References

- Design doc §3.1 (Runtime and framework): Drizzle choice rationale
- Design doc §3.3 (Drizzle with Postgres forward-compatibility): LCD schema discipline rules
- Design doc §3.5 (Scoped fmodel CQRS): which tables get fmodel treatment (🟢🟡🔴 tiers)
- Design doc §2.3 (Why SO in bridge, FO in engine): role placement rationale
- Entity 040 (spacedock-plugin-architecture-v2): 2-plugin resolution consumed here
- Entity 049 (shipped): spike validated Next.js 16 + Bun + fmodel-ts + standalone dir
- Entity 055 (archived): namespace migration scope absorbed into this entity
- tools/dashboard/src/channel-provider.ts: ChannelProvider interface (bridge ↔ engine seam)
- tools/dashboard/src/db.ts: current raw SQLite schema (reference, not target)

## Stage Report: explore

- [x] Files mapped: 9 across config, domain, contract, test
  config: 3 (plugin.json, marketplace.json, package.json), domain: 2 (db.ts, types.ts), contract: 2 (channel-provider.ts, CHANNEL-PROVIDER.md), test: 2 (db.test.ts, channel-provider.test.ts)
- [x] Assumptions formed: 6 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 through A-4, A-6 Confident via design doc + codebase evidence; A-5 Confident via brainstorm guardrails
- [x] Options surfaced: 2
  O-1 event sourcing column strategy; O-2 namespace migration strategy
- [x] Questions generated: 3
  Q-1 repo location (from alpha marker); Q-2 skill migration scope (design doc contradiction); Q-3 cross-repo type consumption
- [x] α markers resolved: 0 / 1
  α-1 (repo location) escalated to Q-1 -- requires captain decision, no codebase evidence resolves it
- [x] Scale assessment: confirmed Medium
  9 reference files mapped; new plugin estimated at 10-15 files (plugin.json, schema files, tests, package.json, drizzle config, agent/skill stubs)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Medium scope, no children proposed
- [x] Assumptions confirmed: 6 / 6 (0 corrected)
  A-1 through A-6 confirmed via batch -- all Confident, captain approved without corrections
- [x] Options selected: 2 / 2
  O-1 Include fmodel columns now (recommended); O-2 Move files atomically (captain narrowed: no cross-repo, defer skill migration to later entity)
- [x] Questions answered: 3 / 3 (0 deferred)
  Q-1 spacebridge/ dir inside spacedock repo; Q-2 defer skill migration (skeleton + schema only); Q-3 direct import same-repo types
- [x] Canonical refs added: 1
  tools/dashboard/src/channel-provider.ts (direct import target)
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  captain must say "execute 050" or launch FO in separate session
- [x] Clarify duration: 5 questions asked, session complete
  1 batch assumption confirmation + 2 option selections + 3 open questions (= 6 interactions, 5 via AskUserQuestion)
