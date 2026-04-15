---
id: 101
title: "Graft runtime overlay — eliminate build-time merge, read workflow from plugin"
status: draft
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

## Directive Annotations (explore cross-check 2026-04-15)

- All `_origin/` references in Problem Statement + Spec (lines 40, 93, 94, 96, 118) (⚠ path-convention: actual codebase uses `.origin/` dot-prefix; 28 matches in skills/graft/SKILL.md + 28 in tests/pressure/graft.yaml. Pressure test #22 observes `_origin/` as actual-broken-state; convention is `.origin/`) [primary]
- "the entire 3-way merge upgrade path" (L26) (✓ confirmed by explore: skills/graft/SKILL.md:33,536 — 3-way merge is prose-driven procedure in SKILL.md, not code) [primary]
- "FO ignore list" causing bug #20 (L44) (✓ confirmed by explore: references/first-officer-shared-core.md:10 literal list `.git .worktrees node_modules vendor dist build __pycache__`) [primary]
- "_origin/README retains commissioned-by" bug #22 (L45) (✓ confirmed by explore: first-officer-shared-core.md:10-11 frontmatter-scan with no path-prefix filter beyond ignore list; no dedup guard between discovery sources) [primary]
- Hash-based upgrade premise (L99-108) (⚠ refuted as existing state: zero hash/sha256/content-hash matches in skills/graft/; manifest tracks `version`, `commit_sha`, `grafted_at` only. 101 must BUILD source_hash field + hash compare. Not a premise-check — it's a deliverable.) [primary]
- GUARDRAIL "FO shared core must know how to read workflow README from a plugin path" (L113) (✓ confirmed by explore: zero plugin-path-read capability today; FO discovery is filesystem-scan only. This is a NEW FO primitive 101 must add.) [primary]
- "existing graft dirs with _origin/ should be migrateable to the new format" (L118) (✓ confirmed codebase state: zero `migrate`/`migration` keywords in skills/graft/SKILL.md; `graft migrate` command must be built) [primary]

## Assumptions

### A-1: `.origin/` (dot-prefix) is the canonical convention, NOT `_origin/` (underscore)
- **Confidence**: Confident (0.95)
- **Evidence**: skills/graft/SKILL.md has 28 `.origin/` matches, 0 `_origin/` matches; tests/pressure/graft.yaml has 28 `.origin/` matches; 1 pressure-test observation of `_origin/` is actual-broken-state documentation (test #22 at :586) [primary]
- **Additional evidence**: .origin/ dot-prefix likely intended to hide from FO scan, though Angle iv seed 8 confirms this doesn't currently work (no dedup) [secondary]

### A-2: FO has ZERO mechanism today to read workflow README from a plugin path; all discovery is filesystem-scan
- **Confidence**: Confident (0.95)
- **Evidence**: references/first-officer-shared-core.md:5-26 Step 2 discovery: explicit path → project-local recursive README scan (ignore list) → `~/.claude/workflows/`. No `{plugin_dir}` or `spacedock_plugin_dir` token resolved for README reading (only for invoking commission/bin/status CLI at :33) [primary]
- **Additional evidence**: Angle iv seed 1 refuted; claude-first-officer-runtime.md:31-65 shows agent-dispatch resolves via plugin loader but README reading is not plugin-aware [primary]

### A-3: FO ignore list literal at first-officer-shared-core.md:10 contains `build` — this IS bug #20's root cause
- **Confidence**: Confident (0.95)
- **Evidence**: references/first-officer-shared-core.md:10 "Ignore `.git`, `.worktrees`, `node_modules`, `vendor`, `dist`, `build`, and `__pycache__`" [primary]
- **Additional evidence**: tests/pressure/graft.yaml:552-581 pressure test workflow-dir-name-collides-with-fo-ignore-list documents the exact collision (history: 2026-04-14 actual=A unfixed, manual rename workaround) [primary]

### A-4: Manifest.yaml already exists in graft but has NO source_hash / content_hash / sha256 field
- **Confidence**: Confident (0.95)
- **Evidence**: skills/graft/SKILL.md:82,109,407,464,487,579,604 — manifest.yaml tracks `version`, `commit_sha`, `grafted_at` only. Zero grep matches for `sha256`, `source_hash`, `content_hash` in skills/graft/ [primary]
- **Additional evidence**: Angle iv seed 2 partial-confirmed (exists but schema lacks 101's required field); 101 L99-108 proposes the new schema [primary]

### A-5: LOCAL.yaml `readme_operations` are applied at graft-time only (produce merged README file on disk); never applied at FO runtime
- **Confidence**: Confident (0.95)
- **Evidence**: `readme_operations` keyword matches only in skills/graft/ (:190,425,536); zero matches in references/first-officer-*.md [primary]
- **Additional evidence**: Angle iv seed 5 refuted; Angle i documents the current anchor model is stage-field addressing via `set-stage-field` op (overhaul recipe vocabulary), which is structured YAML-frontmatter edits not body-section insertion [primary]

### A-6: LOCAL.yaml op vocabulary is stage-field addressing (structured YAML edits), NOT free-text "insert after section Y"
- **Confidence**: Confident (0.90)
- **Evidence**: skills/graft/SKILL.md:185-235 LOCAL.yaml schema: `readme_operations` uses `set-stage-field` op targeting `stage + field` pairs; skill-content override uses `anchor/replace` (text find-replace) [primary]
- **Additional evidence**: Angle i "Unknown Unknowns" flags this: body-section anchor insertion is NOT supported — if 101's runtime overlay needs body operations, it's a new op type [secondary]

### A-7: Graft init copy surface OMITS _archive/, _mods/, _docs/, _index/INDEX.md — confirmed root cause of bug #21
- **Confidence**: Confident (0.95)
- **Evidence**: skills/graft/SKILL.md:398-434 Phase 4 Step 9 copy order only covers `.origin/`, skills/, agents/, manifest.yaml, LOCAL.yaml, merged README [primary]
- **Additional evidence**: tests/pressure/graft.yaml:583-612 missing-fo-runtime-structure-after-init pressure test (history: 2026-04-14 actual=A unfixed) [primary]

### A-8: No pre-write diff/overwrite-guard in graft init (bug #15 root cause)
- **Confidence**: Confident (0.95)
- **Evidence**: Angle iv seed 9 refuted; zero overwrite/diff-before/already-exists keyword matches in skills/graft/ [primary]
- **Additional evidence**: graft status (line 607) detects drift AFTER the fact via git diff; no pre-write check at init time [secondary]

### A-9: No post-init smoke test (bug #19 root cause); no root-script-false-positive guard (bug #14 root cause)
- **Confidence**: Confident (0.95)
- **Evidence**: Angle iv seeds 10+11 refuted; zero smoke/post-init-verify matches + skills/graft/SKILL.md:374-382 reads package.json scripts with no stub heuristic [primary]
- **Additional evidence**: Captain ran manual smoke test during carlove session (Directive L70 "Kent: 試跑一次確認是否正確") [secondary]

### A-10: Entity 090 (shipped-stage-mod-and-graft-migration) is at `status: clarify / context_status: ready` — NOT fully shipped; Part 2 (shipped_config migration) explicitly defers to 101
- **Confidence**: Confident (0.95)
- **Evidence**: docs/build-pipeline/shipped-stage-mod-and-graft-migration.md frontmatter: `status: clarify, context_status: ready`; file on main (not archived) [primary]
- **Additional evidence**: Angle ii reports 090 A-4 (L76-79) "097 plans to completely replace graft's build-time merge with runtime overlay" — explicit deferral; 090's O-1 captain decision puts Part 2 under 101's scope [primary]
- **Coordination risk**: 090 Part 1 (pr-review-loop mod) is independent; Part 2 graft changes must not race with 101 (see Q-2)

### A-11: Multiple concurrent writers on `references/first-officer-shared-core.md` + `claude-first-officer-runtime.md` — 101 must coordinate
- **Confidence**: Confident (0.90)
- **Evidence**: Angle iii CONTRACTS.md:214-219+239-246: 4 concurrent writers on first-officer-shared-core.md (kc-pr-flow ✅final + review-stage-parallel-skill-dispatch 🟡in-flight + pre-ship-confidence-gate 🟡in-flight + flatten-dispatch-troops-architecture 🔵planned) [primary]
- **Additional evidence**: 101's new FO primitive (plugin-path README discovery) is a new Step in the shared-core doc; depending on where it inserts, may collide with the other 3 writers' edits [primary]

### A-12: 9 bugs from carlove session all have pressure-test fixtures #14-22; NONE are fixed (actual=A status across all)
- **Confidence**: Confident (0.95)
- **Evidence**: tests/pressure/graft.yaml:1-235 contains bugs #1-13 + bd0e83d commit added #14-19 (2026-04-13) + 840b963 added #20-22 (2026-04-14) [primary]
- **Additional evidence**: Angle ii confirmed no subsequent fix commits; fix status "tests added, fixes pending on entity 101" [primary]

## Option Comparisons

### O-1: 101 scope decomposition

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) 3-way decomposition: 101 (FO plugin-path primitive) + 101b (graft core redesign) + 101c (backward-compat + 5 skill-loc bugs)** | Cleanest separation of concerns; 101 becomes Small-Medium (single new FO capability); 101b becomes Medium; 101c parallel-ships bug cleanup | 3 coordinated entities require strict sequencing (101 → 101b → 101c); more FO dispatch overhead | High (coordination) | Viable |
| **(b) 2-way decomposition: 101 (FO primitive + graft core redesign) + 101b (backward-compat migrate + 5 skill-loc bugs)** | Groups architectural work in 101; 101b is orthogonal cleanup; ships faster than 3-way; preserves captain's one-entity-per-HIGH pattern from 108 | 101 itself stays Large-ish (FO primitive + graft core) | Medium | ✅ Recommended |
| **(c) Keep single Large entity — all 9 bugs + architecture + migrate in one** | Matches frontmatter `scale: Large`; ships complete redesign in one cycle | Long-running worktree, high pressure/interrupt risk; 5 orthogonal skill-localization bugs dilute focus on the architectural work | High | Viable |

**Recommendation validation**: Option (b) groups "what must ship together" (FO plugin-path primitive + graft core redesign — they're tightly coupled) while separating "orthogonal cleanup" (backward-compat + skill-loc bugs don't depend on new architecture). Captain pattern from 108: one entity per HIGH finding. Here the HIGH finding IS "build-time merge architecture is wrong" — one entity. Skill-loc bugs are MEDIUM and orthogonal. (✅ validated)

### O-2: Backward-compat strategy for carlove's existing `.origin/` graft

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Build `graft migrate` command (per Directive AC L132)** | Respects captain commitment; zero manual work for carlove; idempotent | New graft subcommand; migration logic is load-bearing correctness (misapplied migration corrupts state) | Medium | ✅ Recommended |
| **(b) Manual migration docs only (no subcommand)** | Less code; captain runs the migration as recipe | Captain toil; inconsistent execution across carlove + future grafts; breaks Directive AC L132 | Low | Not recommended |
| **(c) Dual-support mode — new graft reads either `.origin/`-old or manifest-new** | No migration needed; old grafts work forever | Permanent technical debt; two codepaths in graft forever; violates 101's "eliminate entire 3-way merge path" | High | Not recommended |

**Recommendation validation**: Option (a) matches Directive AC L132 explicit commitment. Return trace: `graft migrate` reads existing .origin/manifest.yaml → computes source_hash from current plugin state → writes new manifest.yaml with source_hash + deletes .origin/ + reapplies LOCAL.yaml to .claude/skills/. 2-level trace confirmed; domain invariant (backward-compat for carlove) respected. (✅ validated)

### O-3: FO plugin-path README discovery — new primitive integration

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Add 4th discovery source to first-officer-shared-core.md Step 2: explicit path → project-local → user-scoped → plugin-manifest path** | Minimal edit; additive to existing protocol; other discovery sources unchanged | Merge conflict with 3 concurrent FO-shared-core writers (A-11) — careful insertion point needed | Low | ✅ Recommended |
| **(b) Replace project-local README scan entirely with plugin-manifest read** | Eliminates bug #22 (dual discovery) structurally — only one source for workflow README | Breaking change for every non-grafted spacedock consumer; violates 090 decision "workflow-index migration is gradual"; huge blast radius | High | Not recommended |
| **(c) New subsection in LOCAL.yaml declaring where to read workflow README from** | Per-workflow flexibility; doesn't touch FO shared core for non-grafted cases | New config surface; FO must branch on LOCAL.yaml presence; complexity adds to LOCAL.yaml schema | Medium | Viable |

**Recommendation validation**: Option (a) aligns with additive-edit discipline to minimize merge risk per A-11. Plan stage must pick insertion line range outside the 3 concurrent writers' scope. (✅ validated)

## Open Questions

### Q-1: Decomposition granularity — accept the 2-way split (O-1b) or prefer 3-way (O-1a) / single Large (O-1c)?
- **Domain**: scope management
- **Why it matters**: 101 current scope (per Directive + 10 ACs + 9 bugs + new FO primitive + migrate command + LOCAL.yaml runtime apply + hash schema + coordinate with 090) is genuinely Large and spans 3 concerns (architecture / backward-compat / skill-loc cleanup). Decomposition ratio affects ship cadence and merge-conflict risk against A-11's 3 concurrent writers.
- **Suggested options**: See O-1 table (3-way / 2-way / single).
- **Evidence for options**: [primary]

### Q-2: How to coordinate with entity 090's Part 2 (shipped_config migration) which defers to 101?
- **Domain**: cross-entity coordination
- **Why it matters**: A-10 confirms 090 at `clarify/ready` is waiting. 090 Part 1 (pr-review-loop mod) is independent and can ship without 101. 090 Part 2 explicitly says "absorbed by 101". If 090 ships Part 1+Part 2 before 101, graft/SKILL.md gets shipped_config migration that 101 will promptly rewrite. If 090 ships Part 1 only, Part 2 must be folded into 101's scope.
- **Suggested options**:
  1. **090 ships Part 1 only; 101 absorbs Part 2 (shipped_config migration)** — cleanest; 090's A-4 already anticipated this
  2. **090 ships both parts first; 101 rewrites on top** — more churn but unblocks 090
  3. **Merge 090 into 101 entirely** — abandon 090 as entity; 101 takes over all graft work
- **Evidence for options**: [primary]

### Q-3: Does 101 include the 5 skill-localization bugs (#14 root-script, #15 overwrite-guard, #16 dir-create, #17 verbatim-glob, #19 smoke-test) or spawn as separate entity?
- **Domain**: scope boundary
- **Why it matters**: These 5 bugs are orthogonal to the architecture redesign — they're skill-localization correctness issues that persist in both build-time merge AND runtime overlay designs (per Directive L50-57 "remain in both designs"). Including them bloats 101; excluding them leaves technical debt unless a follow-up entity is spawned.
- **Suggested options**:
  1. **Spawn 101c as skill-localization-hardening** (per O-1a 3-way recommendation) — ships parallel to 101
  2. **Include in 101 as "cleanup tasks"** (per O-1c single Large) — one-entity-to-ship
  3. **Defer indefinitely — known-gap log** — accept bugs as v1 trade-off (MEDIUM severity); captain pattern matches entity 108's known-gap handling
- **Evidence for options**: [primary]

### Q-4: When captain says "read workflow README from plugin at startup" — is the intent to read from `{spacedock_plugin_dir}/docs/build-pipeline/README.md` literally, or a more abstract plugin-provided manifest pointing to a workflow README location?
- **Domain**: architectural foundation
- **Why it matters**: The concrete API depends on what "plugin" means in runtime context. Option (i): FO looks up `.claude-plugin/plugin.json` in each discovered plugin + reads a new `workflow_readme` field pointing to the README path. Option (ii): FO hardcodes `{plugin_dir}/docs/build-pipeline/README.md` as convention. Option (iii): manifest.yaml in the grafted dir points to plugin + README path by string.
- **Suggested options**:
  1. **Option (i) plugin.json declares workflow_readme** — most future-proof, requires plugin.json schema extension, other plugins can adopt
  2. **Option (ii) hardcoded convention** — simplest, assumes spacedock naming convention universally
  3. **Option (iii) manifest.yaml declares full path** — most flexible per-graft, slight duplication vs plugin.json
- **Evidence for options**: [primary]

## Core Tensions

- **essential**: **Architecture-first vs bug-cleanup-first ship order** — Q-3 decides whether 101's ship unblocks 060 cutover (architecture only) vs waits for full 9-bug cleanup. Captain framing "build-time merge is systemic" (Directive L110) argues for architecture-first; carlove UAT experience argues that skill-loc bugs bite in practice.
- **time-based**: **101 vs 3 concurrent FO-shared-core writers** — A-11 documents 4 concurrent planned/in-flight writers on first-officer-shared-core.md. 101's new discovery source adds a 5th writer. Merge-conflict risk climbs with each day 101 stays out of CONTRACTS. Plan stage must pick insertion point precisely.
- **domain-based**: **Skill localization bugs vs architecture redesign** — bugs #14/#15/#17/#19 are correctness issues in the `graft localize` subcommand that persist in both build-time and runtime designs. They are orthogonal to the core "eliminate build-time merge" thesis; lumping them into 101 dilutes the architectural focus.

## Honest Boundaries

- **Explore did not read overhaul recipe op vocabulary** (Angle i Follow-up Topics) — LOCAL.yaml currently reuses overhaul ops, so extending the op set for runtime-overlay may require coordinated changes to overhaul skill too. Plan stage must audit.
- **Explore did not verify Claude Code plugin loader precedence** (Angle i Unknown Unknowns) — does `.claude/skills/foo` shadow `spacedock:foo`? This affects 101's LOCAL.yaml runtime apply design; untested here.
- **Explore did not read `tools/dashboard/src/channel.ts` in full** — indirectly referenced via 090 deferral chain; not a 101 target but connected.
- **Plugin.json schema extension is speculative** (O-3 option (i) + Q-4 option (i)) — assumes Claude Code plugin manifest is schema-extensible; not verified against Claude Code docs this explore.
- **Pressure tests #14-22 fix verification is out of 101 explore scope** — plan stage must check each test's expected-vs-actual after 101's code lands.

## Decomposition Recommendation

⚠️ **Decomposition warranted — 101 scope spans 3 orthogonal concerns**:

Recommended split (per O-1 option (b) — 2-way):

- **101 (this entity)** — `scale: Medium` (revised from Large), `intent: feature`, scope: architecture redesign
  1. New FO primitive: plugin-path workflow README discovery (plugin.json schema extension for `workflow_readme` field; FO shared-core Step 2 adds 4th source per O-3a)
  2. Graft core redesign: manifest.yaml source_hash schema; eliminate `.origin/` directory; eliminate merged README.md; LOCAL.yaml runtime apply by FO
  3. Hash-based upgrade flow for localized skills (replaces 3-way merge)
  4. `graft init` updated to new format
  5. All 10 Directive ACs satisfied
  6. Absorb 090 Part 2 (shipped_config migration) per Q-2 option 1
  - Domain: `spacedock-graft-runtime-overlay`

- **101b graft-backward-compat-and-localization-hardening** (child, spawn at handoff per Q-3 option 1) — `scale: Medium`, `intent: feature`, scope: migration + orthogonal bug cleanup
  1. `graft migrate` subcommand (per Directive AC L132) — converts carlove's `.origin/` format to new manifest+hash format
  2. Bug #14 fix: root-script false-positive detection (skip stub scripts at root)
  3. Bug #15 fix: pre-write diff/confirm before overwriting existing `.claude/skills` / `.claude/agents` files
  4. Bug #16 fix: `mkdir -p .claude/skills/{name}/` at init
  5. Bug #17 fix: verbatim validation glob for local plugin installs
  6. Bug #19 fix: post-init smoke test (load skills, verify no import errors)
  7. Validate by re-running carlove `graft migrate` + full pressure-test sweep #14-22
  - Domain: `spacedock-graft-hardening`
  - Depends-on: 101
  - Parent: 101

## Stage Report: explore

- [x] Files mapped: 15 across contract, router, test, config layers
  contract: 4 (first-officer-shared-core, claude-first-officer-runtime, plugin.json, build-pipeline/README.md), router: 4 (skills/graft/SKILL.md sections + various skill entries), test: 1 (tests/pressure/graft.yaml with 22 cases), config: 6 (agents/first-officer.md, entity 090 body, entity 101 body, DECISIONS.md, CONTRACTS.md rows for FO + README)
- [x] Assumptions formed: 12 (Confident: 12, Likely: 0, Unclear: 0)
  A-1 through A-12 all Confident; strong multi-angle convergence on every finding
- [x] Options surfaced: 3
  O-1 decomposition granularity; O-2 backward-compat strategy; O-3 FO plugin-path discovery integration
- [x] Questions generated: 4
  Q-1 decomposition preference; Q-2 090 coordination; Q-3 skill-loc bugs scope; Q-4 plugin-path discovery concrete API
- [x] α markers resolved: 0 / 0 (no α markers in brainstorm spec; Directive + Brainstorming Spec + 10 ACs sufficient)
- [x] Scale assessment: confirmed Large for current full-scope framing; revises to Medium+Medium if decomposed per O-1b
  Single entity would genuinely be Large (architecture + 9 bugs + migrate + coordination with 090 + 3 concurrent FO writers). 2-way decomposition per O-1b yields 101 (Medium arch) + 101b (Medium cleanup).
- [x] Research dispatched: 0 researchers (skipped -- all assumptions grounded in codebase evidence; no external tech claims requiring validation)

SO self-investigation this entity (per MEMORY `so-self-investigation-first`):
- Path convention `.origin/` vs `_origin/` → self-resolved (codebase grep: 28/28 matches confirm `.origin/`)
- Entity 097 vs 101 naming confusion → self-resolved (read entity frontmatter: id=101; confusion is 090's stale body text from old numbering)
- Entity 090 ship state → self-resolved (frontmatter: clarify/ready, not shipped; Part 2 defers to 101 per 090 A-4)
- Sibling CONTRACTS "planned" vs code-shipped → self-resolved via cascade (MEMORY A-10 pattern; established in 099 session)
4 of ~7 potential Qs self-resolved, 4 genuine Qs sent to captain (signal ratio ~57%).
