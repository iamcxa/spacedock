# Plan-Checker Dim Utility Audit

**Entity**: 109 plan-checker-dim-utility-audit
**Date**: 2026-04-15
**Audit mode**: direct sweep (retro-ship pipeline ceremony)
**Consumer**: entity 107 plan-checker-multi-angle-nuwa (parked pending this audit)

## Executive Summary

**Recommendation to 107**: do NOT Nuwa-ify all 10 dims. Port **6 survivors** into per-dim haiku agents; keep **2 merged into 1**; **retire 1**; **defer 1** for later re-audit. Net: 7 haiku agents instead of 10.

| Dim | Name | Fire Evidence | Verdict | Rationale |
|-----|------|---------------|---------|-----------|
| 1 | Requirement Coverage | No captured fires | **keep** | Load-bearing -- missed AC coverage = silent execute skip. Absence of fires = success signal, not dead weight. |
| 2 | Task Completeness | No captured fires | **keep** | Schema-level sanity check; trivial haiku prompt; floor safeguard. |
| 3 | Dependency Correctness (wave-graph) | 3 captured fires (quality-multi-language-ratchet x2, execute-staleness-detection x1) | **keep** | Duplicates build-execute Step 1 sanity check by **design** (explicit in build-execute:357 "Dim 3's whole purpose is to be the authoritative wave-graph validator"); defense-in-depth. Wide-context need stays -- handle per 107 O-1 (move to synthesis). |
| 4 | Context Compliance | No captured fires | **merge-with-Dim-5** | Reads `## Clarify Output` + CLAUDE.md + DECISIONS.md. Shares `## Clarify Output` source with Dim 5; different failure modes (violation vs traceability) but identical data-gathering step. Post-merge: "Context & Research" dim reads all 3 sources once, emits issues for both failure classes. |
| 5 | Research Coverage | No captured fires | **merge-with-Dim-4** | Reads `## Research Findings` + `## Explore Output` + `## Clarify Output`. Merging with Dim 4 halves data-gathering cost. |
| 6 | Validation Sampling (6a/6b/6c/6d) | No captured fires in archives but referenced as load-bearing in entity 067 build-flow-tdd-discipline | **keep** | Highest-value dim (catches prose-only ACs, watch-mode hangs, wave 0 gaps, TDD drift). 4 sub-rules justify standalone haiku. |
| 7 | Cross-Entity Coherence | 5 captured fires (biome-lint, clarify-explore-revalidation x2, quality-multi-language-ratchet, build-flow-tdd-discipline) -- the **most-firing dim** | **keep** | Only dim reading CONTRACTS.md via workflow-index Skill tool. Distinct data source. Graceful-degradation path already in spec (plan-checker-prompt.md:104). High fire count = active utility. |
| 8 | Type/Test Coverage | No captured fires | **defer** | Warning-only severity (quality ratchet is enforcement). Plan-time early warning value unclear -- if quality always catches it, Dim 8 is pre-noise. Re-audit after 10 more entities or if quality-stage caught-too-late events accumulate. |
| 9 | Stale-Line-Anchor | 0 fires (shipped 2026-04-15 with 106) | **keep (provisional)** | Just shipped; zero data. Keep as-is for 107 port; re-audit at N=10 entities. Rationale for keeping despite no data: the class of bug it catches (104/105 retrospective) is proven real; absence of fires is expected until next drift event. |
| 10 | Circular-AC | 0 fires (shipped 2026-04-15 with 106) | **retire** | Scope argument: the Circular-AC *rule* (skills/task-execution/SKILL.md) catches the exact same pattern at task-execution time with zero plan-time false-positive risk. Dim 10 pre-flags at plan-check but task-execution semantic-pass rule is the authoritative catch. Dim 10 adds plan-check latency for a case task-execution handles correctly. **Except**: if Dim 10 surfaces patterns that escape the task-execution semantic-pass (e.g., ACs that fail both raw and PLAN-excluded greps), keep -- but that case has zero captured fires to support keeping. |

**Post-audit 10-dim taxonomy for 107**:
1. Requirement Coverage
2. Task Completeness
3. Dependency Correctness (wave-graph) -- 107 O-1 hosts in synthesis layer
4+5 merged: Context & Research Traceability
6. Validation Sampling (4 sub-rules)
7. Cross-Entity Coherence
8. (deferred)
9. Stale-Line-Anchor (provisional)
10. (retired)

→ **7 per-dim haiku agents** + 1 synthesis-layer Dim 3 check. If Dim 8 returns at next audit = 8 agents.

## Data Sources Swept

- `docs/build-pipeline/_archive/*.md` (18 shipped entities) -- captured plan-checker YAML in Stage Reports / docs
- `git log --all --pretty=format:"%s" | grep plan-checker` -- dispatch/revision commit messages
- `tests/pressure/*.yaml` -- captured pressure-test fixture YAML
- `skills/build-plan/references/plan-checker-prompt.md:19-172` -- ground-truth dim definitions (10 dims)
- `skills/build-execute/SKILL.md:325-370` -- Dim 3 duplication analysis (build-execute Step 1 wave-graph sanity check)

### Captured Fires (raw count, not statistically significant sample)

```
Dim 3 dependency_correctness: 3
  - _archive/quality-multi-language-ratchet.md:780 (task-1, task-2)
  - _archive/quality-multi-language-ratchet.md:785 (task-3, task-4, task-5)
  - _archive/execute-staleness-detection.md:298 (task-1, task-2)

Dim 7 cross_entity_coherence: 5
  - _archive/spacebridge-biome-lint-husky-precommit.md:396 (warning)
  - _archive/clarify-explore-revalidation.md:503 (warning)
  - _archive/clarify-explore-revalidation.md:507 (warning)
  - _archive/quality-multi-language-ratchet.md:790 (task-7)
  - _archive/build-flow-tdd-discipline.md:504 (warning)

Dim 1/2/4/5/6/8/9/10: 0 captured fires

Revision iter aggregate signals:
  - 106 plan-defect-autopilot iter 2: 1 blocker + 3 warnings resolved (dims unknown)
  - 103 shape-pre-build-alignment-skill iter 2: 5 blockers resolved (dims unknown)
```

### Data Limitation Caveat

**Captured fires ≠ total fires.** Plan-checker issues are transient: fires that get auto-resolved during the revision loop do NOT survive in git history or archived entity bodies (only the post-revision clean YAML survives). The 8 captured fires above are literally documentation examples preserved in entity bodies, not a sample of production fires.

**What this means for the audit**: fire counts are a lower bound, not an accurate population. A "0 captured fires" dim may have fired 10 times during plan revision loops with zero history preserved. The audit uses structural analysis + captured samples + fire-class reasoning, NOT statistical significance.

**Retire/merge decisions rely on**:
1. Structural overlap (Dim 4+5 share 1 of 3 data sources → merge gain clear)
2. Duplication with downstream stages (Dim 3 is intentional defense-in-depth, Dim 10 is redundant with task-execution rule)
3. Severity asymmetry (Dim 8 is warning-only + quality stage enforcement downstream)
4. Fire-class intent (Dim 1/2 absence-of-fires = success, Dim 10 absence = unproven)

### Instrumentation Gap (meta-finding)

Plan-checker output is **not persisted** systematically. Revision-loop resolved issues disappear; only the last clean YAML survives. Future audits would benefit from:
- Append plan-checker output JSON to `## Stage Report: plan` as a structured history block (not free-form markdown)
- Count per-dim fires over revision iterations, not just final state
- Out of scope for entity 109; recommend as entity 110+ candidate.

## Per-Dim Analysis

### ## Dim 1: Requirement Coverage

- **Definition** (plan-checker-prompt.md:33-35): every AC in `## Acceptance Criteria` has ≥1 covering task (by `acceptance_criteria` field).
- **Data source**: entity body AC list + PLAN tasks.
- **blocker_count**: 0 captured
- **warning_count**: 0 captured (dim has no warning severity)
- **Overlap with other dims**: none (distinct data source: AC-vs-task coverage matrix).
- **Verdict**: keep
- **Rationale**: absence of captured fires is a success signal for this dim -- if it fired, the plan would have shipped with uncovered ACs and execute would skip them silently. The entire value proposition is "never let a plan ship with an uncovered AC", so 0 fires = plan authors respect the schema. Nuwa port preserves the floor safeguard.

### ## Dim 2: Task Completeness

- **Definition** (plan-checker-prompt.md:37-39): every task has `id/model/wave/read_first/action/acceptance_criteria/files_modified`; no TBD/placeholder.
- **Data source**: per-task schema check.
- **blocker_count**: 0 captured
- **warning_count**: 0 captured
- **Overlap with other dims**: mild -- Dim 6a also checks `acceptance_criteria` content (runnable command). Dim 2 checks presence, Dim 6a checks quality; complementary not redundant.
- **Verdict**: keep
- **Rationale**: trivial schema check; haiku prompt would be ~20 lines; floor safeguard against malformed task blocks.

### ## Dim 3: Dependency Correctness (wave-graph)

- **Definition** (plan-checker-prompt.md:41-48): wave N `read_first` references wave <N outputs; `files_modified` overlap rules; cycle detection.
- **Data source**: full PLAN task list (cross-task structural).
- **blocker_count**: 2 captured (quality-multi-language-ratchet, execute-staleness-detection)
- **warning_count**: 1 captured (quality-multi-language-ratchet task-7 ordering)
- **Overlap / duplication**: **intentional duplication with build-execute Step 1**. skills/build-execute/SKILL.md:353-370 explicitly documents build-execute as a downstream sanity check: "If step 1's wave dependency sanity check surfaces an ordering violation ... write dimension_3 dependency violation, feedback-to: plan". build-execute:357 states "Dim 3's whole purpose is to be the authoritative wave-graph validator" -- the build-execute duplicate is defense-in-depth.
- **Verdict**: keep (but 107 hosts in synthesis layer per O-1 recommendation)
- **Rationale**: defense-in-depth is load-bearing; retiring Dim 3 would force build-execute to own the full responsibility, breaking the "plan-checker pre-approval is the authoritative validator" contract. Port strategy is decided by 107 O-1 (synthesis-layer correlation), not this audit.

### ## Dim 4: Context Compliance

- **Definition** (plan-checker-prompt.md:50-58): check `## Clarify Output` locked decisions + CLAUDE.md + DECISIONS.md; any violation = blocker (downgrade to warning if plan acknowledges conflict).
- **Data source**: (a) `## Clarify Output`, (b) CLAUDE.md at root + subdirs, (c) DECISIONS.md.
- **blocker_count**: 0 captured
- **warning_count**: 0 captured
- **Overlap**: shares `## Clarify Output` with Dim 5. Shares CLAUDE.md reading with Dim 5 (Dim 5 does not explicitly cite CLAUDE.md but traces back to it via `## Clarify Output` context). DECISIONS.md reading is unique to Dim 4.
- **Verdict**: merge-with-Dim-5
- **Rationale**: Dim 4 and Dim 5 both require reading the same 2-3 entity body sections (`## Clarify Output` and often `## Explore Output` / `## Research Findings`). Merging them into a single "Context & Research Traceability" dim halves data-gathering cost per plan-check pass. Different failure modes (violation vs traceability) coexist in the merged dim as 2 issue classes. Cites: 2+ shared data sources (`## Clarify Output`, entity body context read), overlapping failure scope (both block on cross-entity consistency issues).

### ## Dim 5: Research Coverage

- **Definition** (plan-checker-prompt.md:60-68): every task `read_first` traces to `## Research Findings` / `## Explore Output` / `## Clarify Output` citation.
- **Data source**: task `read_first` list + entity body research sections.
- **blocker_count**: 0 captured
- **warning_count**: 0 captured (dim has no warning severity in spec)
- **Overlap**: shares `## Clarify Output` and `## Explore Output` reads with Dim 4. Also shares entity body parse step.
- **Verdict**: merge-with-Dim-4
- **Rationale**: same merge target. Cites 2+ shared data sources (`## Clarify Output`, `## Explore Output`), overlapping entity body parse pass. Post-merge: Dim 4-5 renamed "Context & Research Traceability" -- emits violation issues (old Dim 4) AND dangling-reference issues (old Dim 5) under one dim.

### ## Dim 6: Validation Sampling (Full Nyquist)

- **Definition** (plan-checker-prompt.md:70-94): 4 sub-rules: 6a automated-verify-presence, 6b feedback-latency, 6c sampling-continuity (3-task window), 6d wave 0 completeness + test_first rules.
- **Data source**: per-task `acceptance_criteria` content + wave structure + Wave 0 task files.
- **blocker_count**: 0 captured (but entity 067 build-flow-tdd-discipline documents 6d as load-bearing for TDD discipline)
- **warning_count**: 0 captured
- **Overlap**: none with Dim 4/5/7 (per-task AC content is unique). Mild overlap with Dim 2 (Dim 2 checks AC presence, Dim 6a checks AC runnable quality) -- but complementary.
- **Verdict**: keep
- **Rationale**: highest-value dim. 4 sub-rules cover 4 distinct failure modes (prose-only AC, watch-mode hangs, Nyquist sampling gaps, TDD discipline violations). Entity 067 made 6d load-bearing. Absence of fires is success signal for a dim that prevents entire classes of execute-time failures.

### ## Dim 7: Cross-Entity Coherence

- **Definition** (plan-checker-prompt.md:96-113): call `spacedock:workflow-index` read mode with `files_modified` list; in-flight conflict = blocker; recent final = warning; no entries = pass. Graceful degradation on Skill-tool unavailable = warning.
- **Data source**: CONTRACTS.md via workflow-index Skill tool (NOT direct Read).
- **blocker_count**: 0 captured (task-7 issue at quality-multi-language-ratchet:790 was a blocker severity)
- **warning_count**: 4 captured (biome-lint, clarify-explore-revalidation x2, build-flow-tdd-discipline)
- **Overlap**: none -- only dim reading CONTRACTS.md; unique data source.
- **Verdict**: keep -- **highest captured fire count (5) of any dim**.
- **Rationale**: active utility proven by fire count. Only dim with cross-entity coordination logic; retiring would break the workflow-index feedback loop. Graceful-degradation path already specified in prompt (fallback to "Skill tool unavailable" warning).

### ## Dim 8: Type/Test Coverage at Plan Time

- **Definition** (plan-checker-prompt.md:115-126): 8a test-file pairing; 8b type-check config coverage. Severity warning-only.
- **Data source**: `files_modified` paths + tsconfig paths from entity research sections.
- **blocker_count**: 0 (warning-only dim by design)
- **warning_count**: 0 captured
- **Overlap**: 8a overlaps conceptually with Dim 6d test_first rules but different angle (8a is pairing heuristic, 6d is schema requirement).
- **Verdict**: defer (re-audit at N=10 more entities or if quality-stage catches regressions that plan-time would have flagged)
- **Rationale**: pure warning severity; quality stage ratchet is the enforcement point per spec note. If quality stage never lets a type-coverage gap through, Dim 8 is pre-noise. If quality catches regressions that plan-time Dim 8 would have caught earlier, Dim 8 justifies its existence. No data either way yet. Defer port -- keep dim definition in monolithic prompt for now; 107 ships 7 or 8 per-dim haiku agents depending on this re-audit outcome.

### ## Dim 9: Stale-Line-Anchor

- **Definition** (plan-checker-prompt.md:127-132): dry-run every `file:line` anchor; emit blocker if file missing or content drifted; auto-rewrite on single-match per entity 106 Q-5.
- **Data source**: every `read_first` / `acceptance_criteria` entry with `file:line` pattern.
- **blocker_count**: 0 (shipped 2026-04-15 with entity 106, <1 day old)
- **warning_count**: 0
- **Overlap**: none.
- **Verdict**: keep (provisional) -- re-audit at N=10 entities
- **Rationale**: the class of bug it catches (entity 104 task-0 line-anchor drift) is proven real; absence of fires is expected until next drift event; auto-rewrite policy (Q-5) makes Dim 9 self-healing. Nuwa port is safe.

### ## Dim 10: Circular-AC

- **Definition** (plan-checker-prompt.md:134-138): dry-run `grep -c` ACs with and without `## PLAN` / `## UAT Spec` / `<task>` blocks excluded; count differ = blocker.
- **Data source**: every `acceptance_criteria` command with `grep -c '<pattern>' <file>` shape.
- **blocker_count**: 0 (shipped 2026-04-15 with entity 106)
- **warning_count**: 0
- **Overlap with other stages**: **redundant with task-execution Circular-AC Rule**. skills/task-execution/SKILL.md (entity 106 Part A) already classifies grep-AC failures as semantic-pass when the search string lives inside PLAN/UAT/task-definition blocks. That's the authoritative catch at task-execution time -- the troop returns DONE with scope_observation finding, no BLOCKED, no captain interrupt. Dim 10 pre-flags the same class at plan-check time but task-execution handles it correctly regardless.
- **Verdict**: retire
- **Rationale**: cites redundant coverage -- task-execution Circular-AC Rule is the authoritative catch. Dim 10 adds plan-check latency (Read every AC grep pattern) for cases task-execution handles without captain interrupt. Zero captured fires. If future audit reveals Dim 10 catches circular ACs that task-execution semantic-pass MISSES (patterns where both raw and excluded greps equal zero, or where the plan-body match is not the sole match), reopen for keep. Current evidence: the failure mode Dim 10 targets is already handled downstream; plan-check adds cost without unique value.
  - Citation: skills/task-execution/SKILL.md Circular-AC Rule (entity 106 Part A, shipped 2026-04-15)
  - Citation: entity 106 Acceptance Criteria #4 (pressure-test fixture verifies task-execution handles the case at runtime, not plan-check)

## Recommendations Summary for Entity 107

1. Port survivors: Dim 1, 2, 6, 7, 9 → 5 per-dim haiku agents (straightforward)
2. Port merged: Dim 4+5 → 1 "Context & Research Traceability" haiku agent
3. Port Dim 3 via 107 O-1 → synthesis-layer correlation in main session (not a per-dim haiku)
4. Defer Dim 8 → stay in monolithic prompt; re-audit later
5. Retire Dim 10 → delete from plan-checker-prompt.md; task-execution Circular-AC Rule is authoritative
6. **Total: 6 per-dim haiku agents + 1 synthesis-layer check = 7 runtime units** (vs 107's originally-planned 10)

## Residual Risk

- Data scarcity caveat (captured fires ≠ total fires) means retire/merge decisions rely on structural analysis + reasoning, not statistics. If post-ship behavior of Nuwa-ified plan-checker shows 107's 7-unit architecture misses bugs the original 10 caught, captain can always port the deferred/retired dims later at known cost (one new agent + skill + fixture per restored dim).
- Dim 10 retirement assumes task-execution Circular-AC Rule is correctly implemented (entity 106 just shipped, zero production validation). If 106 post-ship reveals Rule misfires, re-examine Dim 10.
- Merge of Dim 4+5 risks conflating failure modes -- mitigation: emit both issue classes under the merged dim, do NOT collapse them into a single generic "context failure" issue.

## Next Actions

1. Entity 109 retro-ship (this report is the deliverable).
2. Entity 107 resume clarify: re-read this audit, update APPROACH to target the 7-unit architecture, proceed from Step 3 (O-1) in next SO session.
3. Future entity 110+ candidate: instrument plan-checker output persistence so audits become statistical instead of structural.
