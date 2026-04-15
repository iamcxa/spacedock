---
id: 112
title: Graft Backward-Compat and Localization Hardening -- Migration + Bug Sweep (101b)
status: draft
context_status: pending
source: entity 101 explore+clarify decomposition (2026-04-15 O-1 option-b 2-way split + Q-3 option-1 spawn-at-handoff)
created: 2026-04-15T18:55:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent: 101
children:
depends-on: [101]
---

## Directive

Migration + bug-cleanup follow-on to 101's graft runtime overlay redesign. 101 ships the new architecture (manifest.yaml source_hash schema, `.origin/` elimination, LOCAL.yaml runtime apply); 112 ships the migration path + orthogonal bug fixes that would otherwise bloat 101 above Medium scope.

### Scope (6 deliverables per 101 Decomposition Recommendation)

1. `graft migrate` subcommand (per Directive AC L132) — converts carlove's `.origin/` format to new manifest+hash format
2. Bug #14 fix: root-script false-positive detection (skip stub scripts at root)
3. Bug #15 fix: pre-write diff/confirm before overwriting existing `.claude/skills` / `.claude/agents` files
4. Bug #16 fix: `mkdir -p .claude/skills/{name}/` at init
5. Bug #17 fix: verbatim validation glob for local plugin installs
6. Bug #19 fix: post-init smoke test (load skills, verify no import errors)

### Validation

Re-run carlove `graft migrate` + full pressure-test sweep #14-22 on real carlove graft directory (per 101 explore postmortem).

### Out of scope

- 101's architecture redesign (source_hash schema, LOCAL.yaml, hash-upgrade) — belongs to 101
- New bugs discovered during execute — either in-scope triage OR spawn follow-up (per scope discipline)

## Captain Context Snapshot

Spawned at 101 handoff per Q-3 option-1 decision. Parent 101 scope is architecture-only; 112 absorbs migration + bug cleanup to keep both entities at Medium. Depends-on 101 to inherit the new manifest+hash format before the migration subcommand can target it.

Domain: `spacedock-graft-hardening`.

Parent 101 explore+clarify output lives in `docs/build-pipeline/graft-runtime-overlay-redesign.md` § Decomposition Recommendation (Confirmed).
