---
id: 050
title: "Spacebridge plugin skeleton + Drizzle LCD schema"
status: draft
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

## Problem

The spacebridge plugin needs a working foundation: Claude Code plugin structure (`plugin.json`, agents, skills, hooks), a Drizzle ORM schema that targets SQLite now but is forward-compatible with Postgres, and the folder layout that resolves the 2-plugin question (engine + bridge). Without this skeleton, all subsequent Phase F entities have no codebase to build on.

## Scope

- Create spacebridge plugin structure: `plugin.json`, directory layout for agents/skills/hooks/src
- Set up Drizzle ORM with `bun:sqlite` driver
- Define LCD (lowest common denominator) schema following §3.3 discipline:
  - `text` for strings, `integer` primary keys with autoincrement, `integer` epoch-ms timestamps
  - No JSON columns for queryable data; JSON only for opaque blobs (event payloads, metadata)
  - No engine-specific `returning` clauses
- Tables: sessions, entity_leases, events, comments, share_tokens (initial schema, will evolve)
- Schema migration setup (Drizzle schema-first with generated SQL reviewed for dual SQLite/PG compatibility)
- Wire up `bun:test` for schema validation tests

## Acceptance Criteria

- [ ] `plugin.json` valid and loadable by Claude Code
- [ ] Drizzle schema compiles and generates migration SQL
- [ ] Generated SQL is valid for both SQLite and Postgres (manual review)
- [ ] `bun:sqlite` driver creates tables and performs basic CRUD operations
- [ ] Schema uses LCD discipline: no `serial`, no `datetime`/`timestamptz`, no engine-specific features
- [ ] Test suite validates schema creation and basic operations
- [ ] Folder layout matches 2-plugin resolution from entity 040

## References

- Design doc §3.1 (Runtime and framework): Drizzle choice rationale
- Design doc §3.3 (Drizzle with Postgres forward-compatibility): LCD schema discipline rules
- Design doc §3.5 (Scoped fmodel CQRS): which tables get fmodel treatment (🟢🟡🔴 tiers)
- Entity 040 (spacedock-plugin-architecture-v2): 2-plugin resolution consumed here
