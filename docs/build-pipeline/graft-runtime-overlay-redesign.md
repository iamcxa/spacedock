---
id: 101
title: "Graft runtime overlay — eliminate build-time merge, read workflow from plugin"
status: clarify
context_status: awaiting-clarify
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

**APPROACH**: Runtime overlay — FO reads workflow README directly from the installed spacedock plugin at startup, then applies LOCAL.yaml overrides in-memory before proceeding with normal stage dispatch. (✓ confirmed by explore: FO resolves plugin dir via ${CLAUDE_SKILL_DIR}/../.. -- see A-1; runtime overlay mechanism is a design decision -- see O-1, O-2)

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
- `_origin/` directory entirely (README, skill copies, agent copies) (✓ confirmed by explore: replaced by hash-based manifest -- see A-3, A-4)
- Merged `README.md` in workflow dir (FO reads from plugin) (design decision: depends on O-1 discovery mechanism choice)
- 3-way merge on upgrade (replaced by hash-based idempotent reapply) (✓ confirmed by explore: full reapply is simpler and preserves all upstream changes -- see A-3)
- `_docs/` copying (FO reads from plugin source path) (⚠ contradicted: references/first-officer-shared-core.md has no _docs/ reference in startup steps 1-7 -- _docs/ is consumed by skills/humans, not FO core; elimination is correct but rationale is inaccurate -- see A-6)

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

## Assumptions

A-1: FO's spacedock plugin directory is resolvable in grafted repos via `${CLAUDE_SKILL_DIR}/../..` because `spacedock:first-officer` is always loaded from the installed plugin (not localized by graft). This means FO can always find the source plugin's workflow README.
Confidence: 🟢 Confident (0.90)
Evidence: skills/first-officer/SKILL.md:8 -- `${CLAUDE_SKILL_DIR}/../../references/` relative path; agents/first-officer.md -- `skills: ["spacedock:first-officer"]` is a plugin reference, never localized
→ Confirmed: captain, 2026-04-14 (batch)

A-2: Runtime overlay applies ONLY to the workflow README. Localized skills remain as build-time file copies in `.claude/skills/` because the Claude Code skill loader requires `SKILL.md` files on disk at invocation time.
Confidence: 🟢 Confident (0.90)
Evidence: Entity 101 APPROACH "What stays local: .claude/skills/ -- localized skills (content changes require file copies)"; skill loader resolves `.claude/skills/{name}/SKILL.md` synchronously at skill invocation
→ Confirmed: captain, 2026-04-14 (batch)

A-3: Hash-based skill upgrade replaces 3-way merge with "full reapply" -- read fresh plugin `SKILL.md` + apply LOCAL.yaml `skill_overrides` from scratch. Stale anchors (anchor text changed upstream) are detected and escalated to captain, same behavioral contract as current design.
Confidence: 🟢 Confident (0.90)
Evidence: Entity 101 APPROACH "compute current plugin SKILL.md hash → if changed → read from plugin → reapply LOCAL.yaml anchors → write to .claude/skills/. No 3-way merge."
→ Confirmed: captain, 2026-04-14 (batch)

A-4: Manifest v2 retains the current schema structure (`source.plugin`, `source.workflow_path`, `skills[].tier`, `skills[].name`) but adds per-skill `source_hash` for change detection and removes `_origin/` dependency.
Confidence: 🟢 Confident (0.85)
Evidence: skills/graft/SKILL.md:108-178 -- current manifest schema; entity 101 proposes `source_hash` addition as structural simplification, not a full schema redesign
→ Confirmed: captain, 2026-04-14 (batch)

A-5: Migration from v1 to v2 computes `source_hash` values from existing `_origin/` files before deleting the `_origin/` directory. One-time operation via new `graft migrate` sub-command.
Confidence: 🟡 Likely (0.70)
Evidence: Entity 101 AC "Existing carlove graft can be migrated via graft migrate"; `_origin/` at SKILL.md:80-89 contains all upstream originals needed for hash computation; no prior migration precedent exists (first version of graft)
→ Confirmed: captain, 2026-04-14 (batch)

A-6: `_docs/` is NOT parsed by FO at startup -- it is reference material for humans and skills only. FO's startup sequence (shared-core Steps 1-7) references only `README.md` (Step 3) and `_mods/` (Step 4). Eliminating `_docs/` copying is correct but the entity's stated rationale ("FO reads from plugin source path") is inaccurate.
Confidence: 🟢 Confident (0.95)
Evidence: references/first-officer-shared-core.md -- zero references to `_docs/` in any startup step; `_docs/SO-FO-DISPATCH-SPLIT.md` is consumed by skills (build-explore, build-plan), not FO core
→ Confirmed: captain, 2026-04-14 (batch)

## Option Comparisons

### O-1: How does FO discover a grafted workflow's README?

Entity 101 eliminates the merged README from the grafted workflow directory. FO currently discovers workflows by scanning for `README.md` files with `commissioned-by:` frontmatter (shared-core:8-12). Without a local README, FO needs a new discovery mechanism. **O-1 choice constrains O-2** -- if O-1=C, O-2 is moot (graft pre-applies everything).

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| A: Manifest pointer -- FO adds `.spacedock/workflows/*/manifest.yaml` as 4th discovery source; reads `source.plugin` + `source.workflow_path`; resolves plugin via `${CLAUDE_SKILL_DIR}/../..`; reads README from plugin | Clean separation (manifest = graft artifact, README = plugin artifact); eliminates bugs #20 and #22 structurally; no README duplication on disk | FO gains manifest parsing code; couples FO startup to graft's manifest schema; 4th discovery source adds startup complexity | Medium | Recommended |
| B: Redirect README -- thin README.md in workflow dir with `source-plugin:` + `source-workflow:` fields; FO's existing `commissioned-by:` scan finds it, follows redirect to plugin | Minimal FO scan change; backward-compatible discovery pattern; tooling that expects README still finds one | README still on disk (thin but present); must omit full `commissioned-by:` content to prevent bug #22 dual-config; adds redirect parsing branch to FO | Low | Viable |
| C: Full pre-computation -- graft writes complete merged README (current approach minus `_origin/`); zero FO change | No FO changes at all; simplest implementation; fixes bugs #21 (dir structure) and partially #22 (no `_origin/` README) | Merged README on disk retains bug #22 risk if FO also discovers plugin's original; "runtime overlay" goal abandoned; must re-run graft on every LOCAL.yaml change | Low | Viable |

### O-2: Who applies LOCAL.yaml readme_operations? (Only relevant if O-1 = A or B)

If FO reads the README from the plugin (O-1=A or B), the LOCAL.yaml `readme_operations` must be applied somewhere to customize stage definitions (e.g., skill ref rewrites from `spacedock:build-quality` to `build-quality`).

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| A: FO at startup (runtime) -- FO reads LOCAL.yaml, applies `readme_operations` to plugin README in-memory before parsing stages | True runtime overlay; LOCAL.yaml changes take effect on FO restart without re-running graft; plugin README is always the authoritative source | FO must parse LOCAL.yaml op format; increases FO startup complexity; LOCAL.yaml syntax errors surface at FO startup, not graft time | Medium | Viable |
| B: Graft pre-applies into overlay artifact -- graft writes pre-computed stage overrides (e.g., `overrides.yaml` with final field values); FO reads the artifact, not LOCAL.yaml directly | FO stays simple (reads one structured YAML); errors caught at graft time; clear ownership boundary between graft (writes) and FO (reads) | Must re-run `graft localize` after LOCAL.yaml edit; artifact can become stale if graft not re-run; one extra file in workflow dir | Low | Recommended |

## Open Questions

Q-1: LOCAL.yaml `readme_operations` uses `new_value` for `set-stage-field` ops (SKILL.md:195), but overhaul `recipe-format.md` uses `value` for the same operation. Graft Design Principle #3 states "LOCAL.yaml operations use the same op language as overhaul recipes." Which field name is canonical?

Domain: Readable/Textual

Why it matters: Entity 101 will either keep or revise the `readme_operations` format. Any parser (FO if O-2=A, or graft) needs one canonical field name. The divergence may be intentional (graft's persistent overlay context differs from overhaul's one-shot) or an oversight.

Suggested options: (a) Align to overhaul's `value` -- fix graft SKILL.md (preserves Design Principle #3), (b) Keep graft's `new_value` -- more descriptive for persistent overlays (revise Design Principle #3), (c) Support both with fallback (fragile, adds parser complexity)

Q-2: Workflow directory naming strategy for `.spacedock/workflows/{name}/`. Current graft init derives name from source basename with truncation (`build-pipeline` → `build`). Bug #20 showed `build` collides with FO's ignore list. Even without a local README, the workflow dir stores entities, `_index/`, `_mods/` and must be discoverable by status tooling.

Domain: Organizational/Data-transforming

Why it matters: Bug #20 was CRITICAL -- the grafted workflow became invisible to FO. The naming strategy must prevent collisions with FO's ignore list (`.git`, `.worktrees`, `node_modules`, `vendor`, `dist`, `build`, `__pycache__` -- shared-core:10) AND remain human-readable for captain navigation.

Suggested options: (a) Always use full source basename without truncation (e.g., `build-pipeline` not `build`), (b) Validate derived name against FO ignore list at init time and reject/warn on collision, (c) Both a + b (belt and suspenders)

Q-3: Library mods at target repo root `mods/`. FO scans `mods/*.md` at repo root for library mods (shared-core:19). Graft init only populates `{workflow_dir}/_mods/`, not repo-root `mods/`. Library mods like `workflow-index-maintainer.md` have no workflow-level override in `_mods/` and would be missing in grafted repos.

Domain: Organizational/Data-transforming

Why it matters: If the grafted workflow depends on library mod behavior (e.g., `_index/` maintenance via `workflow-index-maintainer` startup hook), the missing mod means the behavior silently disappears. Currently 3 library mods exist in spacedock (`pr-review-loop`, `pr-merge`, `workflow-index-maintainer`); only `pr-review-loop` has a workflow-level override in `docs/build-pipeline/_mods/`.

Suggested options: (a) Graft init copies required library mods to target repo root `mods/`, (b) FO also checks plugin's `mods/` directory for library mods at startup (runtime read from plugin), (c) Target repo configures library mods independently (graft documents the requirement in PREREQUISITES.md), (d) Workflow mods at `_mods/` absorb all library mod responsibilities (eliminate library mod dependency)

## Decomposition Recommendation

⚠️ Entity 101 spans 3 capability areas with a clear dependency chain. Decomposition is optional but recommended for review isolation:

1. `graft-fo-plugin-discovery` -- FO shared core adds grafted-workflow discovery via manifest pointer or redirect README (Small, domain: Behavioral/Callable)
2. `graft-v2-core` -- Rewrite graft SKILL.md: revised design principles, manifest v2 schema, LOCAL.yaml handling, all 5 sub-commands adapted for hash-based architecture (Large, domain: Runnable/Invokable + Readable/Textual)
3. `graft-v1-v2-migration` -- Add `graft migrate` sub-command for existing carlove-format grafts (Small-Medium, domain: Organizational/Data-transforming)

Dependencies:
- 2 depends on 1 (graft v2 init/upgrade relies on FO's new discovery mechanism)
- 3 depends on 2 (migration target format defined by v2 core)

Alternative: keep as single entity with ordered plan tasks -- entity 1 is small enough (1-2 files) to be a plan task within entity 2.

## Canonical References

(clarify stage will populate)

## Stage Report: explore

- [x] Files mapped: 20 across domain, contract, config, test
  domain: 5 (graft/overhaul/commission/FO/refit skills), contract: 4 (FO shared-core, runtime, SO-FO split, recipe-format), config: 10 (README, plugin.json, agent def, 4 mods, 3 entity docs), test: 1 (pressure/graft.yaml)
- [x] Assumptions formed: 6 (Confident: 5, Likely: 1, Unclear: 0)
  A-1 plugin dir (0.90), A-2 README-only overlay (0.90), A-3 hash reapply (0.90), A-4 manifest v2 (0.85), A-5 migration (0.70), A-6 _docs/ not FO-parsed (0.95)
- [x] Options surfaced: 2
  O-1 FO discovery mechanism (3 options, A recommended); O-2 LOCAL.yaml applicator (2 options, gated by O-1)
- [x] Questions generated: 3
  Q-1 op field name divergence; Q-2 workflow dir naming collision; Q-3 library mod porting gap
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Large
  20 files across 4 layers; 698-line SKILL.md full rewrite; 5 sub-commands affected; decomposition recommended
- [x] Research dispatched: 0 researchers (skipped -- all claims are internal architecture, no external tech dependencies)
