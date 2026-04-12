---
id: 050
title: "Spacebridge plugin skeleton + Drizzle LCD schema"
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

**APPROACH**: Create spacebridge as a new Claude Code plugin in a separate repository (needs clarification -- deferred to explore). The plugin follows standard CC plugin conventions: `.claude-plugin/plugin.json` at repo root with name "spacebridge", plus `agents/`, `skills/`, `hooks/`, `src/` directories. The `src/` directory houses a Drizzle ORM setup with `bun:sqlite` driver and a LCD schema containing 5 initial tables (sessions, entity_leases, events, comments, share_tokens). All schema columns follow the LCD discipline from the design doc §3.3: `text` for strings, `integer` PKs with autoincrement, `integer` epoch-ms timestamps, no JSON for queryable data, no engine-specific `returning` clauses. Drizzle's schema-first approach generates SQL migrations that are manually reviewed for dual SQLite/Postgres validity. A `bun:test` suite validates table creation and basic CRUD. The plugin also receives the build-* skill and agent files migrated from the spacedock namespace (previously entity 055 scope) -- these files are copied, not moved, to preserve backward compatibility during transition.

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

## References

- Design doc §3.1 (Runtime and framework): Drizzle choice rationale
- Design doc §3.3 (Drizzle with Postgres forward-compatibility): LCD schema discipline rules
- Design doc §3.5 (Scoped fmodel CQRS): which tables get fmodel treatment (🟢🟡🔴 tiers)
- Entity 040 (spacedock-plugin-architecture-v2): 2-plugin resolution consumed here
- Entity 049 (shipped): spike validated Next.js 16 + Bun + fmodel-ts + standalone dir
- Entity 055 (archived): namespace migration scope absorbed into this entity
