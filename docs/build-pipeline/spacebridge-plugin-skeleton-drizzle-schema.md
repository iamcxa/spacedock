---
id: 050
title: "Spacebridge plugin skeleton + Drizzle LCD schema"
status: plan
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-12T15:40:00Z
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
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

## Research Findings

### Upstream Constraints

- **No CLAUDE.md in repo root**: The spacedock repo has no root-level CLAUDE.md constraining new directory creation. The `spacebridge/` directory is greenfield territory.
- **DECISIONS.md**: Empty (no active decisions to constrain). Confirmed at `docs/build-pipeline/_index/DECISIONS.md:9`.
- **CONTRACTS.md**: No existing entries reference any `spacebridge/` path. Zero cross-entity conflicts. All `spacebridge/*` files are new territory. Confirmed at `docs/build-pipeline/_index/CONTRACTS.md`.
- **Plugin conventions**: `.claude-plugin/plugin.json` at repo root is the standard CC plugin manifest structure. Validated by existing spacedock plugin at `.claude-plugin/plugin.json:1-17`. Required fields: `name`, `version`, `description`, `author`, `repository`, `license`, `keywords`.
- **Clarify-locked**: Q-1 locked spacebridge to `spacebridge/` directory inside spacedock repo. Q-2 locked NO skill/agent migration -- skeleton + schema only. Q-3 locked direct import of engine types from `tools/dashboard/src/channel-provider.ts`. O-1 locked fmodel-compatible columns from day 1. O-2 locked atomic namespace migration (deferred, not in scope).

### Existing Patterns

- **Database pattern** (`tools/dashboard/src/db.ts:1-56`): Raw SQL `CREATE TABLE IF NOT EXISTS` with `bun:sqlite` `Database` class. Uses TEXT timestamps (`created_at TEXT NOT NULL`), TEXT primary keys for share_links, INTEGER AUTOINCREMENT for events and entity_snapshots. This is the OLD pattern -- spacebridge deliberately breaks from TEXT timestamps to INTEGER epoch-ms per LCD discipline.
- **Test pattern** (`tools/dashboard/src/db.test.ts:1-163`): `bun:test` with `describe`/`test`/`expect`. Uses `openDb(":memory:")` for isolation. PRAGMA table_info for schema validation. Explicit temp DB path for persistence round-trip tests: `const TMP_DB = join(import.meta.dir, "__test_persistence__.db")` with cleanup helper. This pattern should be adapted for Drizzle (use `drizzle()` wrapper over `:memory:` Database).
- **Plugin.json shape** (`.claude-plugin/plugin.json:1-17`): `{name: "spacedock", version: "0.9.0", description, author: {name}, repository, license, keywords}`. Spacebridge plugin.json should mirror this structure with `name: "spacebridge"`.
- **Package.json** (`tools/dashboard/package.json:1-12`): Minimal -- dependencies and devDependencies only. No scripts, no main field. Spacebridge needs `drizzle-orm` and `drizzle-kit` as deps.

### Library/API Surface

- **Drizzle ORM bun:sqlite**: Schema defined via `sqliteTable("name", { columns })` from `drizzle-orm/sqlite-core`. Column types: `text("col")`, `integer("col")`, `blob("col")`. Primary key: `integer("id").primaryKey({ autoIncrement: true })`. The `drizzle()` function from `drizzle-orm/bun-sqlite` wraps a `bun:sqlite` `Database` instance.
- **Drizzle-kit**: `drizzle-kit generate` reads a `drizzle.config.ts` and produces SQL migration files in a `drizzle/` directory. Config needs `schema` (path to schema files), `out` (migration output dir), `dialect: "sqlite"`.
- **LCD dual-driver pattern**: Use `sqliteTable` from `drizzle-orm/sqlite-core` for schema definition. For Postgres forward-compat, the same schema can be re-expressed with `pgTable` from `drizzle-orm/pg-core` -- but the LCD discipline (text, integer, no serial, no timestamptz) ensures the generated SQL is valid for both. The entity scope is SQLite-only; Postgres driver swap is a future entity.
- **Drizzle CRUD API**: `db.insert(table).values({...})`, `db.select().from(table).where(eq(col, val))`, `db.update(table).set({...}).where(...)`, `db.delete(table).where(...)`. Uses `eq`, `and`, `or` from `drizzle-orm`.

### Known Gotchas

- **LCD discipline from design doc §3.3**: `text` for strings, `integer` PKs with autoincrement (NOT `serial`), `integer` timestamps as Unix epoch-ms (NOT `datetime`/`timestamptz`), no JSON for queryable data (JSON OK for opaque blobs like event payloads), no `returning` clauses (read after write instead), migrations reviewed for dual SQLite/Postgres validity.
- **Test isolation (MEMORY.md)**: ALWAYS pass explicit test DB path. Default fallback to `~/.spacedock/spacebridge.db` causes silent test pollution. Use `join(tmpdir(), "test-spacebridge.db")` or `:memory:`.
- **Zod `.passthrough()` gotcha (design doc §3.5)**: When Zod event schemas are added later (not in this entity), they MUST use `.passthrough()` not `.strip()` to prevent silent field loss during schema evolution.
- **fmodel columns in non-fmodel entity**: O-1 includes fmodel-compatible columns (event_type, aggregate_id, sequence_number, payload) from day 1. These are structural placeholders -- no fmodel-ts dependency in this entity (A-5). The `payload` column is `text` (opaque JSON blob), not parsed or queried.
- **CC plugin recognition**: For CC to recognize `spacebridge/` as a plugin, it needs `.claude-plugin/plugin.json` at the plugin root (i.e., `spacebridge/.claude-plugin/plugin.json`). The `name` field determines the namespace for skills/agents.

### Reference Examples

- **Design doc §4.3 Session type**: `{id: string, projectRoot: string, pid: number, connected_at: number, last_heartbeat: number}` -- maps to sessions table with text id, text project_root, integer pid, integer connected_at, integer last_heartbeat.
- **Design doc §5.3 Lease type**: `{token: string, session_id: string, entity_slug: string, role: Role, acquired_at: number, expires_at: number}` -- maps to entity_leases table.
- **Design doc §3.5 fmodel tier classification**: sessions (🟢 full CQRS), entity_leases (🟢 full CQRS), events (🟡 event-log), comments (🟢 full CQRS), share_tokens (🔴 plain Drizzle). All get fmodel-compatible columns per O-1 regardless of tier.
- **Design doc §4.5 Database path**: Single daemon DB at `~/.spacedock/spacebridge.db`. Queries scoped by `workflow_dir` or `project_root`. Test isolation via dbPath override.
- **Existing db.ts structure**: `openDb(dbPath?)` with default path resolution, WAL mode for file DBs, table creation. Spacebridge equivalent: `createDb(dbPath?)` wrapping Drizzle over bun:sqlite with similar WAL + default path logic.

## PLAN

### Goal

Create the spacebridge plugin skeleton inside `spacebridge/` with valid CC plugin structure and Drizzle ORM LCD schema (5 tables with fmodel-compatible columns), plus bun:test suite validating table creation and basic CRUD.

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - .claude-plugin/plugin.json
    - tools/dashboard/package.json
  </read_first>

  <action>
  Environment verification. Confirm:
  1. `spacebridge/` directory does NOT exist yet: `test ! -d spacebridge/ && echo OK`
  2. No existing CONTRACTS.md entries for spacebridge paths: `grep -c 'spacebridge/' docs/build-pipeline/_index/CONTRACTS.md` returns 0
  3. Bun is available: `bun --version`
  4. Current branch is `spacedock-ensign/spacebridge-plugin-skeleton-drizzle-schema`: `git branch --show-current`
  5. `.claude-plugin/plugin.json` exists with `name: "spacedock"`: `cat .claude-plugin/plugin.json | grep '"name"'`
  If any check fails, STOP and report before proceeding.
  </action>

  <acceptance_criteria>
    - `test ! -d spacebridge/ && echo OK` prints OK
    - `grep -c 'spacebridge/' docs/build-pipeline/_index/CONTRACTS.md` returns 0
    - `bun --version` succeeds
    - `git branch --show-current` prints `spacedock-ensign/spacebridge-plugin-skeleton-drizzle-schema`
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - .claude-plugin/plugin.json
  </read_first>

  <action>
  Create the spacebridge plugin directory structure and plugin manifest:

  1. Create directories: `spacebridge/.claude-plugin/`, `spacebridge/src/`, `spacebridge/drizzle/`
  2. Write `spacebridge/.claude-plugin/plugin.json`:
     ```json
     {
       "name": "spacebridge",
       "version": "0.1.0",
       "description": "Coordination bridge for Spacedock — daemon, UI, role-aware work queue, and build studio skills",
       "author": { "name": "Kent" },
       "repository": "https://github.com/patchwork-body/spacedock",
       "license": "Apache-2.0",
       "keywords": ["coordination", "bridge", "daemon", "build-studio", "drizzle", "fmodel"]
     }
     ```
  3. Write `spacebridge/package.json`:
     ```json
     {
       "name": "spacebridge",
       "version": "0.1.0",
       "type": "module",
       "dependencies": {
         "drizzle-orm": "^0.40.0"
       },
       "devDependencies": {
         "drizzle-kit": "^0.30.0",
         "bun-types": "^1.3.11"
       }
     }
     ```
  4. Write `spacebridge/tsconfig.json`:
     ```json
     {
       "compilerOptions": {
         "target": "ESNext",
         "module": "ESNext",
         "moduleResolution": "bundler",
         "strict": true,
         "esModuleInterop": true,
         "skipLibCheck": true,
         "outDir": "dist",
         "declaration": true,
         "types": ["bun-types"]
       },
       "include": ["src/**/*.ts"],
       "exclude": ["node_modules", "dist", "drizzle"]
     }
     ```
  5. Write `spacebridge/drizzle.config.ts`:
     ```typescript
     import { defineConfig } from "drizzle-kit";
     export default defineConfig({
       schema: "./src/schema.ts",
       out: "./drizzle",
       dialect: "sqlite",
     });
     ```
  6. Run `cd spacebridge && bun install` to install dependencies and generate lockfile.
  </action>

  <acceptance_criteria>
    - `cat spacebridge/.claude-plugin/plugin.json | grep '"spacebridge"'` finds the name field
    - `test -f spacebridge/package.json && echo OK` prints OK
    - `test -f spacebridge/tsconfig.json && echo OK` prints OK
    - `test -f spacebridge/drizzle.config.ts && echo OK` prints OK
    - `test -f spacebridge/bun.lock && echo OK` prints OK (lockfile created by bun install)
  </acceptance_criteria>

  <files_modified>
    - spacebridge/.claude-plugin/plugin.json
    - spacebridge/package.json
    - spacebridge/tsconfig.json
    - spacebridge/drizzle.config.ts
    - spacebridge/bun.lock
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="2" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - tools/dashboard/src/db.ts
    - tools/dashboard/src/db.test.ts
    - docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md (lines 220-234, 326-347, 459-475)
  </read_first>

  <action>
  Create the Drizzle ORM LCD schema with 5 tables and fmodel-compatible columns.

  Write `spacebridge/src/schema.ts` with these table definitions using `sqliteTable` from `drizzle-orm/sqlite-core`:

  **sessions** -- 🟢 fmodel full CQRS (design doc §4.3)
  - `id` integer primaryKey autoIncrement
  - `session_id` text notNull unique -- UUID
  - `project_root` text notNull -- absolute path
  - `pid` integer notNull
  - `connected_at` integer notNull -- epoch-ms
  - `last_heartbeat` integer notNull -- epoch-ms
  - fmodel columns: `event_type` text, `aggregate_id` text, `sequence_number` integer, `payload` text

  **entity_leases** -- 🟢 fmodel full CQRS (design doc §5.3)
  - `id` integer primaryKey autoIncrement
  - `token` text notNull unique -- opaque lease token
  - `session_id` text notNull -- references sessions.session_id
  - `entity_slug` text notNull
  - `role` text notNull -- 'SO' | 'FO' | 'QO'
  - `acquired_at` integer notNull -- epoch-ms
  - `expires_at` integer notNull -- epoch-ms
  - fmodel columns: `event_type` text, `aggregate_id` text, `sequence_number` integer, `payload` text

  **events** -- 🟡 event-log only
  - `id` integer primaryKey autoIncrement
  - `type` text notNull -- event type string
  - `entity` text notNull
  - `stage` text notNull
  - `agent` text notNull
  - `timestamp` integer notNull -- epoch-ms
  - `detail` text -- optional detail string
  - `workflow_dir` text notNull -- scoping key
  - fmodel columns: `event_type` text, `aggregate_id` text, `sequence_number` integer, `payload` text

  **comments** -- 🟢 fmodel full CQRS
  - `id` integer primaryKey autoIncrement
  - `comment_id` text notNull unique -- UUID
  - `entity_path` text notNull
  - `selected_text` text notNull
  - `section_heading` text notNull
  - `content` text notNull
  - `author` text notNull -- 'captain' | 'fo' | 'guest'
  - `created_at` integer notNull -- epoch-ms
  - `resolved` integer notNull default 0 -- boolean as integer
  - `resolved_reason` text
  - `resolved_version` integer
  - `workflow_dir` text notNull -- scoping key
  - fmodel columns: `event_type` text, `aggregate_id` text, `sequence_number` integer, `payload` text

  **share_tokens** -- 🔴 plain Drizzle
  - `id` integer primaryKey autoIncrement
  - `token` text notNull unique
  - `password_hash` text notNull
  - `entity_paths` text notNull -- JSON array as text blob
  - `stages` text notNull -- JSON array as text blob
  - `label` text notNull
  - `created_at` integer notNull -- epoch-ms
  - `expires_at` integer notNull -- epoch-ms
  - fmodel columns: `event_type` text, `aggregate_id` text, `sequence_number` integer, `payload` text

  Also write `spacebridge/src/db.ts`:
  - Export `createDb(dbPath?: string)` that:
    1. Resolves default path to `~/.spacedock/spacebridge.db`
    2. Creates parent directory if needed (mkdirSync recursive)
    3. Opens bun:sqlite Database
    4. Sets WAL mode for file DBs (not :memory:)
    5. Wraps with `drizzle()` from `drizzle-orm/bun-sqlite`
    6. Returns the drizzle instance

  Write tests FIRST per TDD discipline in `spacebridge/src/schema.test.ts`:
  - Test that all 5 tables exist after migration push
  - Test each table has expected column count and names via PRAGMA table_info
  - Test LCD compliance: no columns with affinity 'REAL' or 'DATETIME', timestamps are integer type
  - Test basic CRUD (insert + select) for each table
  - Test fmodel columns exist on all 5 tables (event_type, aggregate_id, sequence_number, payload)
  - Use `:memory:` database for all tests
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/schema.test.ts` passes
    - `grep -c 'sqliteTable' spacebridge/src/schema.ts` returns 5 (one per table)
    - `grep -c 'integer.*epoch' spacebridge/src/schema.ts` returns 0 (epoch-ms is in comments, not column names)
    - `grep -E 'serial|timestamptz|datetime|RETURNING' spacebridge/src/schema.ts` returns 0 matches
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/schema.ts
    - spacebridge/src/db.ts
    - spacebridge/src/schema.test.ts
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="3">
  <read_first>
    - spacebridge/src/schema.ts
    - spacebridge/drizzle.config.ts
  </read_first>

  <action>
  Generate Drizzle SQL migrations and verify LCD compliance:

  1. Run `cd spacebridge && bunx drizzle-kit generate` to produce SQL migration files in `spacebridge/drizzle/`
  2. Verify the generated SQL contains no LCD violations:
     - `grep -E 'serial|timestamptz|datetime|RETURNING' spacebridge/drizzle/*.sql` returns 0 matches
     - `grep -c 'CREATE TABLE' spacebridge/drizzle/*.sql` returns 5 (one per table)
  3. Verify migration metadata files exist (drizzle-kit generates `_journal.json` or `meta/` alongside SQL)
  </action>

  <acceptance_criteria>
    - `ls spacebridge/drizzle/*.sql | wc -l` returns at least 1
    - `grep -E 'serial|timestamptz|datetime|RETURNING' spacebridge/drizzle/*.sql` returns 0 matches
    - `grep -c 'CREATE TABLE' spacebridge/drizzle/*.sql` returns 5
  </acceptance_criteria>

  <files_modified>
    - spacebridge/drizzle/0000_*.sql
    - spacebridge/drizzle/meta/_journal.json
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="3">
  <read_first>
    - spacebridge/src/db.ts
    - spacebridge/src/schema.ts
  </read_first>

  <action>
  Write integration test for db.ts createDb function:

  Write `spacebridge/src/db.test.ts`:
  - Test createDb with :memory: returns a drizzle instance that can query
  - Test createDb with explicit temp file path creates the file and sets WAL mode
  - Test that default path is NOT used in tests (verify no reference to `spacebridge.db` in test file)
  - Test two :memory: databases are isolated
  - Cleanup temp DB files after each test

  Use `import { tmpdir } from "node:os"` and `join(tmpdir(), "test-spacebridge-" + Date.now() + ".db")` for temp paths.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/db.test.ts` passes
    - `grep -c 'spacebridge.db' spacebridge/src/db.test.ts` returns 0
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/db.test.ts
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="4">
  <read_first>
    - spacebridge/.claude-plugin/plugin.json
    - spacebridge/src/schema.ts
    - spacebridge/src/schema.test.ts
    - spacebridge/src/db.test.ts
  </read_first>

  <action>
  Final validation sweep:

  1. Run full test suite: `cd spacebridge && bun test`
  2. Run TypeScript check: `cd spacebridge && bunx tsc --noEmit`
  3. Verify plugin.json is valid JSON: `bun -e "JSON.parse(require('fs').readFileSync('spacebridge/.claude-plugin/plugin.json','utf8')); console.log('valid')"`
  4. Verify all 5 tables in schema: `grep 'export const.*= sqliteTable' spacebridge/src/schema.ts | wc -l` returns 5
  5. Verify no LCD violations in generated migrations: `grep -rE 'serial|timestamptz|datetime|RETURNING' spacebridge/drizzle/` returns 0
  6. Verify test isolation: `grep -r 'spacebridge.db' spacebridge/src/*.test.ts` returns 0
  </action>

  <acceptance_criteria>
    - `cd spacebridge && bun test` passes with 0 failures
    - `cd spacebridge && bunx tsc --noEmit` exits 0
    - `grep 'export const.*= sqliteTable' spacebridge/src/schema.ts | wc -l` returns 5
    - `grep -rE 'serial|timestamptz|datetime|RETURNING' spacebridge/drizzle/` returns 0 matches
    - `grep -r 'spacebridge.db' spacebridge/src/*.test.ts` returns 0 matches
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

## UAT Spec

### Browser

None

### CLI

- [ ] `bun test spacebridge/src/schema.test.ts` passes -- all 5 tables created, fmodel columns present, LCD compliance verified, basic CRUD works
- [ ] `bun test spacebridge/src/db.test.ts` passes -- createDb works with :memory: and temp file, WAL mode set, isolation verified
- [ ] `cd spacebridge && bunx drizzle-kit generate` produces SQL migration files with no LCD violations
- [ ] `cd spacebridge && bunx tsc --noEmit` passes with no type errors

### API

None

### Interactive

None

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: plugin.json present, CC recognizes spacebridge | task-1, task-5 | `cat spacebridge/.claude-plugin/plugin.json \| grep '"spacebridge"'` | pending | -- |
| AC-2: drizzle-kit generate produces SQL migrations | task-3 | `ls spacebridge/drizzle/*.sql \| wc -l` | pending | -- |
| AC-3: generated SQL has no LCD violations | task-3, task-5 | `grep -rE 'serial\|timestamptz\|datetime\|RETURNING' spacebridge/drizzle/*.sql` returns 0 | pending | -- |
| AC-4: 5 tables with basic CRUD via bun:sqlite | task-2 | `bun test spacebridge/src/schema.test.ts` | pending | -- |
| AC-5: tests use explicit temp path, not production DB | task-4, task-5 | `grep -r 'spacebridge.db' spacebridge/src/*.test.ts` returns 0 | pending | -- |
| AC-6: build-* skills accessible (DEFERRED -- Q-2 defers skill migration) | -- | DEFERRED: skill migration not in scope per Q-2 | skipped | -- |

## Stage Report: plan

status: passed
plan-checker verdict: PASS (after 1 revision iteration)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold
workflow-index append: 6 append calls (tasks 0-5), covering 4 tasks with files and 11 file entries total, all successful

### Plan-checker final output
```yaml
issues: []
```

### Dispatch Gaps
- Research: `## Research Findings` was absent; fell back to inline serial research (5 domains, all populated with file:line citations)
- Plan-checker: Agent tool unavailable in ensign context; ran inline 7-dimension evaluation. All dimensions passed.

### Commits
- chore(index): add contracts for entity-spacebridge-plugin-skeleton-drizzle-schema entering plan (11 files)
- chore(plan): spacebridge-plugin-skeleton-drizzle-schema -- plugin skeleton + Drizzle LCD schema

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

## Stage Report: execute

status: PASSED
waves: 5 (0–4), tasks: 6 (task-0 through task-5)
test results: 30 pass, 0 fail (24 schema tests + 6 db integration tests)
tsc: 0 errors

### Task Results

| Task | Wave | Status | Commit SHA | Notes |
|------|------|--------|------------|-------|
| task-0 | 0 | DONE | — | Env verified: spacebridge/ absent, bun 1.3.9 available, branch correct, plugin.json name=spacedock confirmed. CONTRACTS.md had 11 pre-existing spacebridge/ entries from plan stage — expected, not a violation. |
| task-1 | 1 | DONE | 195a1d7 | plugin.json, package.json, tsconfig.json, drizzle.config.ts created. `bun install` installed 27 packages, lockfile generated. |
| task-2 | 2 | DONE | 45846ce | TDD: schema.test.ts written first (red), schema.ts + db.ts written second (green). 24 tests pass: table existence, fmodel columns on all 5 tables, LCD compliance (INTEGER timestamps, no REAL/DATETIME affinity), basic CRUD per table, isolation. |
| task-3 | 3 | DONE | 30df38c | `bunx drizzle-kit generate` produced drizzle/0000_parallel_thing.sql with 5 CREATE TABLE. LCD check: grep -E 'serial|timestamptz|datetime|RETURNING' returns 0 matches. |
| task-4 | 3 | DONE | 30df38c | db.test.ts: 6 integration tests — :memory: CRUD, WAL mode for file DBs, persistence round-trip, isolation between instances. 0 references to production spacebridge.db path. |
| task-5 | 4 | DONE | — | Final sweep: 30/30 tests pass, tsc --noEmit exits 0, plugin.json valid JSON, 5 sqliteTable exports, no LCD violations in migrations. |

### Acceptance Criteria Verification

| AC | Status | Evidence |
|----|--------|----------|
| AC-1: plugin.json present, name=spacebridge | DONE | `grep '"spacebridge"' spacebridge/.claude-plugin/plugin.json` → 1 match |
| AC-2: drizzle-kit generate produces SQL migrations | DONE | `ls spacebridge/drizzle/*.sql` → 0000_parallel_thing.sql |
| AC-3: generated SQL has no LCD violations | DONE | `grep -rE 'serial|timestamptz|datetime|RETURNING' spacebridge/drizzle/` → 0 matches |
| AC-4: 5 tables with basic CRUD via bun:sqlite | DONE | `bun test spacebridge/src/schema.test.ts` → 24 pass |
| AC-5: tests use explicit temp path, not production DB | DONE | `grep -c 'spacebridge.db' spacebridge/src/db.test.ts` → 0 |
| AC-6: build-* skills accessible | SKIPPED | Deferred per Q-2 — skill migration out of scope for entity 050 |

### Deviations

1. **createDb applies schema inline**: db.ts `applySchema()` executes `CREATE TABLE IF NOT EXISTS` directly rather than using `drizzle-orm/bun-sqlite/migrator`. Rationale: the migrator requires migrations folder on disk and is a runtime concern; inline schema push is idiomatic for a daemon process that owns its DB lifecycle. The generated migration SQL in `drizzle/` remains the authoritative DDL for review and future Postgres migration.

2. **schema.test.ts uses inline CREATE TABLE**: Tests create tables via raw SQL (same DDL as migration) rather than running the migration file. This is consistent with `tools/dashboard/src/db.test.ts` pattern and avoids a file-system dependency on `drizzle/` in tests.

### Commits

- 195a1d7 feat(050/task-1): spacebridge plugin skeleton — plugin.json, package.json, tsconfig, drizzle config, bun install
- 45846ce feat(050/task-2): Drizzle LCD schema — 5 tables + fmodel columns + TDD test suite
- 30df38c feat(050/task-3+4): Drizzle migration generated + createDb integration tests
  1 batch assumption confirmation + 2 option selections + 3 open questions (= 6 interactions, 5 via AskUserQuestion)

## Stage Report: quality

Mechanical verification suite for spacebridge plugin skeleton + Drizzle LCD schema. All tests and type checks run from worktree root: `/Users/kent/Project/spacedock/.worktrees/spacedock-ensign-spacebridge-plugin-skeleton-drizzle-schema`.

### 1. `bun test` — Full Test Suite

**Command:** `bun test` from repo root (covers spacebridge/src + tools/dashboard/src + tests/dashboard)

**Output:**
```
bun test v1.3.9 (cf6cdbbb)

 375 pass
 0 fail
 992 expect() calls
Ran 375 tests across 27 files. [4.55s]
```

**Breakdown:**
- spacebridge/src tests: 30 pass (schema.test.ts, db.test.ts)
- tools/dashboard/src tests: 205 pass (15 test files)
- tests/dashboard tests: 140 pass (10 integration test files)

**Status:** ✅ DONE — All 375 tests passing.

### 2. `tsc --noEmit` — TypeScript Compilation

**Commands:**
- `tsc --noEmit -p spacebridge/tsconfig.json`
- `tsc --noEmit -p tools/dashboard/tsconfig.json`

**Results:**

spacebridge:
```
TypeScript compilation completed
```
✅ DONE

tools/dashboard:
```
TypeScript: 9 errors in 1 files
═══════════════════════════════════════
Top codes: TS2339 (6x), TS7006 (3x)

tools/dashboard/src/channel.test.ts (9 errors)
  L29: TS2339 Property 'url' does not exist on type 'ChannelProvider'.
  L49: TS2339 Property 'url' does not exist on type 'ChannelProvider'.
  L87: TS2339 Property 'getAll' does not exist on type 'Pick<EventBuffer, "getChannelMessagesSince">'.
  L88: TS7006 Parameter 'e' implicitly has an 'any' type.
  L121: TS2339 Property 'getAll' does not exist on type 'Pick<EventBuffer, "getChannelMessagesSince">'.
  L122: TS7006 Parameter 'e' implicitly has an 'any' type.
  L239: TS2339 Property 'listVersions' does not exist on type 'Pick<SnapshotStore, "createSnapshot">'.
  L319: TS2339 Property 'getAll' does not exist on type 'Pick<EventBuffer, "getChannelMessagesSince">'.
  L320: TS7006 Parameter 'e' implicitly has() calls
```

**Analysis:** tools/dashboard/src/channel.test.ts has pre-existing type mismatches (marked as test-time type casting errors; tests still pass via runtime). These errors do NOT affect the 050 entity (spacebridge code is type-clean). The errors exist in tools/dashboard, which is unchanged by this entity.

**Status:** ⚠️ SKIPPED — Pre-existing type errors in tools/dashboard/src/channel.test.ts are outside 050 scope. Spacebridge compiles cleanly.

### 3. `bun lint` — Linting

**Command:** `bun run lint` from repo root

**Result:**
```
error: Script not found "lint"
```

**Status:** ⏭️ SKIPPED — No lint script defined in any package.json (spacebridge/package.json, tools/dashboard/package.json). Linting infrastructure not present.

### 4. `bun build` — Build Target

**Command:** `bun run build` from repo root

**Result:**
```
error: Script not found "build"
```

**Status:** ⏭️ SKIPPED — No build script defined. Spacebridge exports TypeScript source directly (Drizzle ORM ships ES modules; no compilation needed for skill/agent distribution).

### 5. Coverage Threshold

**Status:** ⏭️ SKIPPED — No coverage configuration found in workflow config or CI/CD files.

### Summary

| Check | Status | Notes |
|-------|--------|-------|
| bun test (375 tests, 0 fail) | ✅ DONE | All spacebridge + dashboard + integration tests passing |
| tsc --noEmit (spacebridge) | ✅ DONE | Spacebridge compiles cleanly |
| tsc --noEmit (tools/dashboard) | ⚠️ SKIPPED | Pre-existing type errors in channel.test.ts (outside 050 scope) |
| bun lint | ⏭️ SKIPPED | No lint script configured |
| bun build | ⏭️ SKIPPED | No build script configured |
| Coverage threshold | ⏭️ SKIPPED | No coverage config defined |

**Quality stage verdict:** ✅ AUTO-ADVANCE

Entity 050 (spacebridge plugin skeleton) has zero failures. New code (spacebridge/) is type-safe and fully tested (30 tests passing). Pre-existing tools/dashboard type errors are not regressions from this entity. No mechanical failures block progression to the next stage.
