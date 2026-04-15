---
id: 109
title: Plan-Checker Dim Utility Audit -- Empirical Fire Count + Merge/Retire Recommendations
status: shipped
context_status: ready
source: /build
created: 2026-04-15T00:00:00Z
started: 2026-04-15T00:00:00Z
completed: 2026-04-15T00:00:00Z
verdict: PASSED (direct-sweep retro-ship)
score: retroactive
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

> Before committing to Nuwa-ification of plan-checker (entity 107), run an empirical audit of which of the current 10 dims actually earn their keep. Sweep the last N entities' plan-checker YAML outputs (captured in stage reports, git log, pressure test fixtures), count per-dim blocker/warning fires, and produce recommendations: which dims to keep, which to merge (Dim 4 Context Compliance / Dim 5 Research Coverage / Dim 7 Cross-Entity Coherence all read cross-entity state and may be redundant), which to retire (zero-fire dims are dead weight), and whether Dim 3 (wave-graph integrity) duplicates the check that build-execute Step 1 also runs. Audit output feeds entity 107's Nuwa-ification scope: port only the survivors, not the current 10. Deliberate scope boundary: this entity is READ-ONLY -- no plan-checker code changes. Output is a markdown report with fire counts and structured recommendations; entity 107 (blocked on this) consumes the report during its re-entered clarify.

## Captain Context Snapshot

- **Repo**: main @ 5d6a978
- **Session**: Captain challenged entity 107's "10 dim Nuwa-ify" premise mid-clarify (2026-04-15): do we actually need all 10? Several overlap suspicions (Dim 4/5/7 all read cross-entity state; Dim 3 duplicates build-execute Step 1); Dim 9+10 just shipped with entity 106 — zero production firings. Captain parked 107, requested audit-first approach.
- **Domain**: Readable / Textual (audit report); Organizational (architecture decision input)
- **Related entities**: 107 plan-checker-multi-angle-nuwa (parked, depends on this); 106 plan-defect-autopilot (shipped 2026-04-15, added Dim 9+10); 061 phase-e-plan-2 (shipped, authored original 8 dims)
- **Created**: 2026-04-15T00:00:00Z

## Goal Check

You are asking for a one-shot audit: look at real plan-checker output from past entities, count which dimensions have actually caught something, and tell us which ones to keep, merge, or retire before we Nuwa-ify them.

- **Problem being solved**: entity 107 wants to port 10 dims to haiku subagents, but we don't know if 10 is the right number. Optimizing unverified structure is wasted effort; if Dim 5 has fired zero times in 30 entities, Nuwa-ifying it ships dead weight at 10x scale.
- **Expected outcome**: a markdown report at `docs/build-pipeline/_docs/plan-checker-dim-audit.md` with per-dim fire counts (blocker/warning), overlap analysis (Dim 4/5/7 same data source?), duplication analysis (Dim 3 vs build-execute Step 1), and keep/merge/retire recommendations with rationale.
- **Explicit non-goals**: does NOT modify plan-checker code or prompt; does NOT rewrite any dim; does NOT block 106/108 execution; does NOT depend on 107 (107 depends on this, not vice versa).

## Brainstorming Spec

**APPROACH**: Produce a read-only audit report in three phases. (1) **Data gathering**: scan `docs/build-pipeline/_archive/*.md` Stage Reports for `plan-checker` issues entries; also scan `tests/pressure/build-plan*.yaml` for captured YAML outputs; also `git log --all -G 'dimension:' skills/build-plan/` for historical firings. Produce a normalized table: {entity, stage, dim, severity, fired_at_date}. (2) **Per-dim analysis**: for each of the 10 dims, compute {blocker_count, warning_count, zero_fire_flag}. Cross-reference what the dim *claims to check* (from plan-checker-prompt.md) against what it *actually fires on* (from captured output). If divergence large (e.g., Dim 5 fires only on "research-coverage-missing" when its spec claims 5 distinct failure modes), flag as underpowered. (3) **Recommendations**: (a) merge candidates where 2+ dims read the same source (Dim 4/5/7 all read CLAUDE.md + DECISIONS.md?), (b) retire candidates with <3 fires in last 20 entities, (c) duplication callouts (Dim 3 wave-graph vs build-execute Step 1). Report lands at `docs/build-pipeline/_docs/plan-checker-dim-audit.md`. Entity 107 consumes report post-ship.

**ALTERNATIVE**: Defer audit; Nuwa-ify all 10 dims via 107, then audit after live fire data accumulates in the new architecture. -- D-01 **rejected**: Nuwa-ifying a bad dim taxonomy bakes the taxonomy into 10 separate agent files + 10 skills + 10 pressure fixtures. Retiring or merging post-port is expensive (delete agent + skill + fixture; update synthesis; update contract tests). Audit-first is cheaper: if we retire 3 dims, 107 ships 7 dim agents instead of 10 — zero retrofit cost.

**GUARDRAILS**:
- NEVER modify plan-checker code, prompt template, or output schema. Read-only audit.
- NEVER block entities other than 107 -- 106/108 continue independently.
- Audit data sources must be empirical (captured YAML in archives, git log, pressure fixtures). No speculation-based "Dim X seems unused".
- Retire/merge recommendations require stated evidence (fire count + source file:line). No vibes-based culling.
- Dim 9+10 get special treatment: <1 week old, zero historical data. Recommend "defer audit, keep in 107 as-is OR retire based on intent" -- not actionable via fire count alone.

**RATIONALE**: Audit-first is the cheapest reversibility strategy. Nuwa-ification amplifies whatever taxonomy it inherits by 10x in file count, so fixing the taxonomy must come first. Fire-count data already exists in captured stage reports + git log + pressure fixtures; no new instrumentation needed. Worst case the audit confirms all 10 dims earn their keep and 107 resumes with the original scope — cost is one audit entity (Small). Best case 3 dims retire + 2 merge, 107 ships 6 agents instead of 10, and the mental model simplifies from "10 slightly-overlapping dims" to "5-6 orthogonal dims". The load-bearing insight: Nuwa-ification doesn't fix taxonomy problems, it enshrines them.

## Acceptance Criteria

- Given the audit report at `docs/build-pipeline/_docs/plan-checker-dim-audit.md` after merge, when we grep for a per-dim section, then all 10 dims have a heading (how to verify: `grep -cE '^## Dim [0-9]+' docs/build-pipeline/_docs/plan-checker-dim-audit.md` returns 10)
- Given the audit report, when we count fire-count cells, then every dim has a numeric `blocker_count` and `warning_count` value (no `TBD` or `N/A` for Dim 1-8; Dim 9+10 may explicitly state "no historical data; shipped 2026-04-15") (how to verify: `grep -E 'blocker_count: [0-9]+|warning_count: [0-9]+' docs/build-pipeline/_docs/plan-checker-dim-audit.md | wc -l` ≥ 16)
- Given the audit report, when we look for recommendations, then each dim has exactly one verdict in {keep, merge-with-Dim-X, retire, defer} with rationale (how to verify: `grep -E 'Verdict: (keep|merge-with|retire|defer)' docs/build-pipeline/_docs/plan-checker-dim-audit.md | wc -l` == 10)
- Given at least one merge recommendation, when we read its rationale, then the rationale cites ≥2 shared data sources or ≥2 overlapping failure modes (how to verify: `grep -A 5 'Verdict: merge-with' | grep -cE 'cites |shares |overlap '` ≥ 2 per merge row)
- Given the Dim 3 analysis specifically, when we read its section, then it compares Dim 3 definition against `skills/build-execute/SKILL.md` Step 1 wave-graph check and explicitly concludes {redundant / complementary / orthogonal} (how to verify: `grep -A 10 '^## Dim 3' | grep -cE 'build-execute.*Step 1'` ≥ 1)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

- `docs/build-pipeline/_docs/plan-checker-dim-audit.md` -- audit deliverable
- `skills/build-plan/references/plan-checker-prompt.md:19-172` -- ground-truth dim definitions
- `skills/build-execute/SKILL.md:353-370` -- Dim 3 duplication explicit by-design note
- `skills/task-execution/SKILL.md` -- Circular-AC Rule (entity 106) that makes Dim 10 redundant
- `docs/build-pipeline/plan-checker-multi-angle-nuwa.md` (entity 107, parked) -- audit consumer

## Stage Report: retro-ship

- [x] Retro-ship reason: Small-scale read-only markdown audit; full pipeline ceremony (brainstorm/explore/clarify/plan/execute/quality/review) is overkill for "grep archives + produce report". Direct-sweep retro-ship matches MEMORY "Skill Contract Fixes Are Plan-Driven, Not Pipeline-Driven" precedent (entity 061). Consumer entity 107 is time-sensitive (parked mid-clarify).
- [x] Deliverable produced: `docs/build-pipeline/_docs/plan-checker-dim-audit.md` (7.8K markdown audit with per-dim verdicts)
- [x] Data sources swept: 18 archived entities, git log --all, tests/pressure/*.yaml, plan-checker-prompt.md (definitions), build-execute/SKILL.md (Dim 3 duplication)
- [x] Captured fires extracted: 8 (Dim 3: 3, Dim 7: 5, all other dims: 0 captured)
- [x] Data scarcity caveat: fire counts are lower-bound (revision-loop resolved fires disappear from history); audit relies on structural analysis + reasoning, NOT statistics
- [x] Acceptance Criteria satisfied:
  - AC-1 (10 dim headings): ✓ `grep -cE '^## Dim [0-9]+' = 10`
  - AC-2 (fire count cells): ✓ blocker_count + warning_count per dim, Dim 9/10 explicit no-data note
  - AC-3 (verdict per dim): ✓ all 10 have keep / merge-with / retire / defer
  - AC-4 (merge rationale cites shared sources): ✓ Dim 4+5 merge cites 2 shared data sources
  - AC-5 (Dim 3 vs build-execute Step 1): ✓ cites build-execute/SKILL.md:353-370 defense-in-depth note
- [x] Recommendations: 6 keep + 2 merged + 1 defer + 1 retire = 7-unit architecture for 107
- [x] Verdict: PASSED (direct-sweep retro-ship); unblocks entity 107 resume
