---
id: 097
title: "Graft runtime overlay — eliminate build-time merge, read workflow from plugin"
status: draft
context_status: pending
source: /build
created: 2026-04-14T03:30:00Z
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
---

## Directive

> Redesign graft from build-time merge (copy + overlay → merged README) to runtime overlay (FO reads workflow README from plugin, applies LOCAL.yaml at startup). Eliminates _origin/, merged README, and the entire 3-way merge upgrade path. Motivated by 9 real-world bugs discovered during the first-ever graft init into carlove (2026-04-13/14).

## Captain Context Snapshot

- **Repo**: main @ spacedock
- **Session**: graft init carlove (2026-04-13) + FO compatibility fixes (2026-04-14)
- **Domain**: graft skill, first-officer shared core, build-pipeline workflow
- **Related entities**: entity 090 (shipped mod + migration), graft SKILL.md
- **Created**: 2026-04-14

## Problem Statement — Carlove Graft Session Postmortem

The first real-world `graft init` (spacedock build-pipeline → carlove monorepo) exposed 9 bugs, all traceable to the build-time merge architecture. Bugs are documented as pressure tests #14-22 in `tests/pressure/graft.yaml`.

### Bugs caused by copying README + _origin/

| # | Bug | Root Cause | Severity |
|---|-----|-----------|----------|
| 20 | **FO can't find workflow** — dir named `build` matches FO ignore list | Graft derived dir name from source basename without checking FO ignore list | CRITICAL — workflow invisible |
| 22 | **Dual workflow discovery** — FO finds both merged README and _origin/README | _origin/README.md retains `commissioned-by:` frontmatter, FO discovers it as second workflow | HIGH — confusing UX |
| 21 | **Missing FO runtime dirs** — _archive/, _mods/, _docs/, INDEX.md absent | Graft only copied skill-related files, not FO runtime structure | HIGH — FO startup fails |
| 4 | **Upgrade conflict — blanket policy** | 3-way merge produces per-anchor conflicts that require captain decision | MEDIUM — upgrade friction |
| 12 | **Stale anchor on upgrade** | Anchor text changed in upstream, LOCAL.yaml anchor no longer matches | MEDIUM — upgrade friction |

### Bugs in skill localization (remain in both designs)

| # | Bug | Root Cause |
|---|-----|-----------|
| 14 | **Root script false positive** — `pnpm test` at root is a stub | Auto-detect checked package.json but not CI config |
| 15 | **Agent file overwrite** — existing code-explorer.md silently replaced | No diff/warning before overwriting target repo's existing files |
| 16 | **Localize skill dir not created** — FileNotFoundError | Step 8 mkdir only created .spacedock dirs, not .claude/skills/{name}/ |
| 17 | **Verbatim validation path mismatch** — glob doesn't match local plugin | Validation assumed ~/.claude/plugins/ path, spacedock is local install |

### Bug in missing functionality

| # | Bug | Root Cause |
|---|-----|-----------|
| 18 | **Shipped stage unconfigured** | No step for configuring shipped behavior or PR mod (tracked in entity 090) |
| 19 | **No smoke test after init** | Static validation passed but never verified skills actually load |

### Fix timeline during the session

1. graft init completed — 33 files created, validation passed ✅
2. Kent: "shipped stage 該怎麼辦" → added shipped_config to LOCAL.yaml
3. Kent: "試跑一次確認是否正確" → added smoke test, all overrides verified
4. Kent: "看不到 LOCAL.yaml" → discovered we were on main, switched back to feature branch
5. Rebase failed (361 commits, .planning/ conflicts) → used merge instead
6. Kent: "移植後的 build flow 不能在 spacedock 中使用，格式不對" → discovered:
   - `.spacedock/workflows/build/` — `build` in FO ignore list (renamed to `build-pipeline/`)
   - Missing _archive/, _mods/, _docs/, INDEX.md (copied from source)
   - _origin/README.md triggered dual workflow discovery (commented out commissioned-by)
7. Kent: "能否改由直接由 spacedock 處取得 workflow？" → this entity

## Brainstorming Spec

**APPROACH**: Runtime overlay — FO reads workflow README directly from the installed spacedock plugin at startup, then applies LOCAL.yaml overrides in-memory before proceeding with normal stage dispatch.

What stays local (project-specific state):
- `LOCAL.yaml` — override definitions + shipped_config
- `manifest.yaml` — source tracking with content hashes (replaces _origin/ full copies)
- `_index/` — CONTRACTS.md, DECISIONS.md, INDEX.md (workflow state)
- `_archive/` — completed entities
- `_mods/` — project-specific mods
- Entities (`*.md`) — project work items
- `.claude/skills/` — localized skills (content changes require file copies)
- `.claude/agents/` — localized agents

What is eliminated:
- `_origin/` directory entirely (README, skill copies, agent copies)
- Merged `README.md` in workflow dir (FO reads from plugin)
- 3-way merge on upgrade (replaced by hash-based idempotent reapply)
- `_docs/` copying (FO reads from plugin source path)

Localized skill upgrade path (hash-based):
```yaml
# manifest.yaml
skills:
  - name: build-quality
    tier: localize
    source_hash: "a3f2c1..."  # SHA256 of plugin's SKILL.md at graft/last-upgrade time
    override_count: 4
```
Upgrade: compute current plugin SKILL.md hash → if changed → read from plugin → reapply LOCAL.yaml anchors → write to .claude/skills/. No 3-way merge. Anchor not found = stale override (escalate to captain, same as now).

**ALTERNATIVE**: Keep build-time merge, fix the 5 bugs individually — D-01 rejected because the bugs are systemic (copying creates an entire maintenance surface) not incidental (individual oversights). Fixing #20 still leaves #22, fixing #22 still leaves #21, etc. The copy-and-merge architecture is the root cause.

**GUARDRAILS**:
- FO shared core must know how to read workflow README from a plugin path (new discovery source)
- LOCAL.yaml readme_operations must be applied in FO's working memory, not as a file transform
- `graft upgrade` becomes: update manifest hashes + reapply overrides to localized skills (much simpler)
- `graft diff` changes meaning: diff plugin current vs localized skills (not _origin vs .claude/skills/)
- `graft status` checks manifest hashes vs plugin current (not _origin file comparison)
- Backward compat: existing graft dirs with _origin/ should be migrateable to the new format

**RATIONALE**: The carlove session proved that build-time merge creates O(N) bugs where N = number of files copied. Runtime overlay reduces the copy surface to only files that must have different content (localized skills), eliminating ~half the bug class. The plugin system already proves this pattern works — verbatim skills are zero-maintenance because they reference the plugin directly.

## Acceptance Criteria

- FO discovers grafted workflows by reading a manifest that points to the plugin's workflow README path (how to verify: `graft init` creates manifest, FO reads it at startup)
- FO applies LOCAL.yaml readme_operations in-memory at startup without a merged README file existing on disk (how to verify: no README.md in workflow dir, FO still initializes correctly)
- `graft init` no longer creates _origin/ directory or merged README.md (how to verify: file listing after init)
- `graft init` still creates localized skills in .claude/skills/ with overrides applied (how to verify: skill content check)
- `graft upgrade` uses hash comparison instead of 3-way merge for localized skills (how to verify: change plugin skill, run upgrade, verify reapply)
- `graft upgrade` for README changes is automatic — FO reads plugin directly (how to verify: change plugin README, restart FO, verify new config)
- `graft diff` shows diff between plugin's current skill content and localized .claude/skills/ content (how to verify: run graft diff after manual skill edit)
- `graft status` reports hash drift between manifest and plugin current (how to verify: update plugin, run status)
- Existing carlove graft (_origin/ format) can be migrated to new format via `graft migrate` (how to verify: run on carlove)
- Pressure tests #20, #22 are structurally impossible in new design (how to verify: review the architecture — no README copy = no dual discovery, no local dir name = no ignore list collision)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate)

## Canonical References

(clarify stage will populate)
