---
id: 077
title: "Cross-phase skepticism -- validation gates between pipeline stages"
status: draft
context_status: awaiting-clarify
source: GSD distillation during 075 clarify session (2026-04-13); GSD verify-phase.md, execute-phase.md
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
depends-on: [075]
---

## Directive

> Spacedock's build pipeline trusts prior phase conclusions by default. Plan trusts clarify's confirmed assumptions. Execute trusts plan's task list. Quality checks mechanical correctness (tsc/test/lint) but not goal achievement. This means errors that pass one phase propagate unchallenged through subsequent phases.
>
> GSD codifies cross-phase skepticism as a mandatory design principle: each phase re-validates prior phase conclusions before building on them. Specifically:
> - Discuss presents prior decisions as "revisit or keep?" (not immutable)
> - Plan injects prior CONTEXT.md so planner can challenge decisions
> - Execute runs a regression gate (prior phase test suites) before verification
> - Execute does key-links verification (prior wave artifacts actually exist and are wired)
> - Verify uses goal-backward reasoning: "task completion ≠ goal achievement"
>
> Spacedock has SOME skepticism (explore Step 3.7 verifies brainstorm claims, quality runs tests, review dispatches independent reviewers) but the gaps are:
> 1. Clarify trusts explore output uncritically -- captain is forced to be the skeptic instead of the decision-maker
> 2. Plan does NOT re-validate clarify assumptions against current codebase state
> 3. Execute does NOT verify plan assumptions still hold (codebase may have moved)
> 4. Quality checks test pass/fail but NOT whether the entity's GOAL was achieved
> 5. No regression gate: execute may break prior entity functionality
>
> Scope includes: clarify-stage explore re-validation, researcher vs code-explorer disambiguation, plan-stage clarify re-validation, execute-stage plan assumption check, goal-backward verification, and regression gate.

## Captain Context Snapshot

- **Repo**: main @ 5440359
- **Session**: No recent session context (GSD-adjacent journal entries from Phase 15-19 verification workflows)
- **Domain**: Runnable / Invokable, Readable / Textual, Organizational / Data-transforming
- **Scope flag**: ⚠️ likely-decomposable
- **Related entities**: 075 -- Research dispatch architecture (clarify/ready), 076 -- Clarify open exploration loop (clarify/ready), 072 -- Build-Explore Domain-Aware Gray Areas (draft), 074 -- Pipeline verification quality uplift (draft)
- **Created**: 2026-04-13T02:00:00Z

## Brainstorming Spec

**APPROACH**: Implement cross-phase skepticism as a series of validation gates inserted at specific points in four pipeline skills, each re-validating the prior phase's conclusions against current codebase state before proceeding. The five gates are: (1) Clarify Step 1.5 -- evidence freshness + internal consistency check on explore's assumptions before presenting to captain (✓ confirmed by explore: skills/build-clarify/SKILL.md:91-108 -- Step 1 reads entity body then Step 2 presents assumptions with NO intervening validation; gap confirmed), (2) Plan Step 0.5 -- re-read clarify-confirmed assumptions' cited evidence to verify it still holds (✓ confirmed by explore: skills/build-plan/SKILL.md:70-80 -- Step 1 Topic Extraction has no re-validation of assumption evidence; gap confirmed), (3) Execute Wave Pre-check -- compare plan's `files_modified` targets against current file hashes (✓ confirmed by explore: skills/build-execute/SKILL.md:62-68 -- Step 1 builds wave graph with no staleness check against codebase; gap confirmed), (4) Goal-backward verification reading `## Acceptance Criteria` and `## Directive` against actual code changes (⚠ contradicted: skills/build-quality/SKILL.md:10 -- quality is explicitly "mechanical, no judgment"; goal-backward requires judgment -- see O-1), (5) Regression gate using CONTRACTS.md to find prior entities that touched the same files, run their test suites (✓ confirmed by explore: CONTRACTS.md tracks file-entity ownership; mechanical test execution fits quality's contract). Additionally, document researcher vs code-explorer disambiguation in SO agent and reference docs. Each gate uses fractional step numbering (proven in entity 076) and has a clear pass/fail contract.

**ALTERNATIVE**: Instead of distributed gates in each skill, implement a centralized "skepticism engine" -- a new shared module that all skills call with their prior-phase artifacts, returning a validation report (`validatePriorPhase({stage, entity})` -> `{passed, issues[]}`). -- D-01 Rejected: centralization introduces a new abstraction that must understand every phase's artifact format (assumptions from clarify, tasks from plan, file hashes from execute, test results from quality). The distributed approach is simpler -- each skill validates its own upstream using patterns it already knows. Build-explore Step 3.7 (brainstorm claim verification) is the existence proof that per-skill validation gates work. A centralized engine would also create a single point of failure and need to evolve with every skill change.

**GUARDRAILS**:
- Each gate must have a clear pass/fail contract -- no ambiguous "warning" states that skills silently ignore. Staleness = warn + proceed-with-caution option. Contradiction = hard block.
- Entity 075 decisions are authoritative -- 077's clarify re-validation must respect researcher dispatch architecture (SO orchestrates, hybrid annotation format). Do NOT re-implement research dispatch logic.
- CONTRACTS.md is the single source for cross-entity file ownership -- regression gate must use it, not invent a parallel tracking mechanism
- Fractional step numbering for all insertions -- no renumbering of existing steps (proven in entity 076 A-1)
- Each gate is independently deployable -- shipping clarify re-validation should not require plan/execute/quality gates to ship simultaneously
- Do NOT modify `## Directive` or `## Captain Context Snapshot` sections (immutable per pipeline rules)

**RATIONALE**: The distributed gate approach is correct because it mirrors how the pipeline already works: each skill owns its step sequence and validates its own inputs. Build-explore Step 3.7 is the existence proof -- a validation gate inside a single skill that cross-references brainstorm claims against codebase evidence. Entity 077 generalizes this pattern to the remaining phase boundaries. The centralized alternative would require a new module understanding ALL phase artifact formats -- an abstraction that doesn't exist and would need to evolve with every skill change. Each skill already knows its upstream's artifact format (clarify knows explore's A-n/Q-n format, plan knows clarify's confirmed annotation format, etc.), making distributed validation a natural extension rather than new infrastructure.

## Acceptance Criteria

- [ ] Given explore produced an assumption citing `channel.ts:399` as evidence, when clarify Step 1.5 runs, then it re-reads `channel.ts:399` and verifies the cited behavior still holds before presenting to captain (how to verify: run clarify on a test entity with file:line citation, confirm re-read happens before Step 2 batch presentation)
- [ ] Given two assumptions that contradict each other (A-1 says X, A-3 implies not-X), when clarify Step 1.5 consistency check runs, then it flags the contradiction as a new Open Question before presenting to captain (how to verify: create entity with contradicting assumptions, run clarify, verify new Q-n exists)
- [ ] Given explore surfaced 2 semantically identical options (rephrased versions), when clarify Step 1.5 option validity check runs, then it merges them and notes the dedup in the entity body (how to verify: create entity with duplicate options, run clarify, verify single option remains with dedup note)
- [ ] Given explore missed a domain-template gray area, when clarify Step 1.5 coverage check runs, then it adds the missing gray area as a new assumption or question (how to verify: compare entity explore output against domain templates, run clarify, verify new item exists for uncovered template)
- [ ] Given clarify self-verification passes with 0 issues, when captain sees the assumptions in Step 2, then they are presented as pre-validated with evidence-freshness timestamp (how to verify: read Step 2 output, confirm "pre-validated" annotation present)
- [ ] Given a clarify-confirmed assumption citing file:line evidence, when build-plan Step 0.5 runs, then it re-reads the cited file:line and verifies the evidence still holds (how to verify: run build-plan on entity with confirmed assumptions, confirm re-read log)
- [ ] Given a clarify assumption whose evidence is invalidated (file changed since clarify), when plan Step 0.5 detects the mismatch, then it flags a blocker and halts task generation (how to verify: modify cited file between clarify and plan, run plan, verify blocker output)
- [ ] Given a plan with `files_modified` targets, when execute starts a wave, then the Wave Pre-check compares file hashes against plan-time state and warns if stale (how to verify: modify a files_modified target between plan and execute, run execute, verify staleness warning)
- [ ] Given a completed execute stage, when quality Step 1.5 runs, then it re-reads each Acceptance Criterion and verifies it is met by actual code changes (how to verify: run quality on entity, confirm per-criterion verification output)
- [ ] Given a completed execute that produced stub code not wired into runtime, when goal-backward verification runs, then it detects the orphan and flags it (how to verify: create entity where execute writes a function never imported, run quality, verify orphan detection)
- [ ] Given entity modifying `daemon.ts` (also modified by prior entity 052), when quality Step 2.5 regression gate runs, then it finds 052 via CONTRACTS.md and runs 052's test suite (how to verify: run quality on entity with overlapping CONTRACTS.md entries, verify prior test suite execution)
- [ ] Given a regression gate failure, when quality reports, then the failure is classified as cross-entity regression and routed back to execute with prior entity context (how to verify: create scenario where prior entity test fails, verify routing to execute with regression classification)
- [ ] Given SO agent or build-explore reference docs, when researcher vs code-explorer disambiguation docs exist, then each tool's purpose, dispatch trigger, and overlap zone are clearly documented (how to verify: grep for "code-explorer" and "researcher" in updated docs, confirm role distinction present)

## Decomposition Recommendation

⚠️ This entity touches 4 pipeline skills across 3 domains with 5 distinct sub-scopes. Each gate is independently deployable (per GUARDRAILS). Recommended split:

1. `clarify-explore-revalidation` -- Clarify Step 1.5 (evidence freshness, internal consistency, option validity, coverage check) + researcher vs code-explorer documentation (Runnable/Invokable + Readable/Textual). ACs 1-6, 13.
2. `plan-assumption-revalidation` -- Plan Step 0.5 (re-read clarify-confirmed assumption evidence against codebase) (Runnable/Invokable). ACs 7-8.
3. `execute-staleness-detection` -- Execute Wave Pre-check (file hash comparison against plan-time state) (Runnable/Invokable). AC 9.
4. `quality-goal-backward-regression` -- Goal-backward verification + regression gate (Runnable/Invokable + Organizational/Data-transforming). ACs 10-12. Note: O-1 (goal-backward placement) must be resolved before this child can be planned.

Dependencies:
- All 4 children are independently deployable (no hard dependencies between them)
- Each validates its OWN upstream phase -- they do not chain through each other
- 1 has the most ACs (7) and is the most complex; recommend starting there
- 4 depends on O-1 resolution (goal-backward placement decision)
- All inherit parent's depends-on: [075]

## Assumptions

A-1: Each gate inserts as a fractional step in its target skill using the pattern proven by entity 076 (Step 4.5 in build-clarify).
Confidence: Confident (0.95)
Evidence: Entity 076 A-1 confirmed fractional numbering; skills/build-clarify/SKILL.md:171-220, skills/build-plan/SKILL.md:70, skills/build-execute/SKILL.md:62, skills/build-quality/SKILL.md:46 -- all have clear step boundaries for insertion

A-2: Evidence freshness check (clarify Step 1.5) re-reads file:line citations using content-match, similar to how explore Step 3.7 already verifies brainstorm claims against codebase evidence.
Confidence: Likely (0.70)
Evidence: skills/build-explore/SKILL.md Step 3.7 -- cross-references APPROACH claims against codebase evidence using Read/Grep. Same pattern applies to clarify re-validating explore's A-n citations

A-3: Internal consistency check (clarify Step 1.5) uses LLM runtime analysis to detect contradictions between assumptions -- not a static algorithm. The LLM reads all A-n entries and flags semantic contradictions.
Confidence: Likely (0.70)
Evidence: skills/build-explore/SKILL.md Step 3.7 -- uses LLM judgment for claim verification (not a regex/hash). Cross-referencing assumptions for contradictions requires the same kind of semantic analysis

A-4: Execute Wave Pre-check uses binary file content comparison -- any change since plan-time triggers a staleness warning (warn, not block).
Confidence: Likely (0.65)
Evidence: skills/build-execute/SKILL.md:62-68 -- Step 1 already has file-level awareness via wave graph and files_modified parsing. Git-level hash comparison (git diff --stat) is standard for change detection

A-5: Entity 075's researcher dispatch architecture is respected -- clarify re-validation uses 075's dispatch pattern (SO orchestrates, hybrid annotation) for deep evidence re-validation, not a parallel mechanism.
Confidence: Confident (0.90)
Evidence: Entity 075 context_status: ready -- decisions authoritative. O-2 selected "SO heuristic scan", O-3 selected "agent teams by default", Q-1 selected "hybrid annotation". 077's clarify gate consumes these decisions, does not re-implement

## Option Comparisons

### O-1: Goal-backward verification placement

The APPROACH placed goal-backward verification in quality (Step 1.5). But quality is explicitly "mechanical, no judgment" (build-quality/SKILL.md:10). Goal-backward requires reading Acceptance Criteria and JUDGING whether code changes satisfy them -- inherently interpretive.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Expand build-review pre-scan | Review is already "judgment-bearing" (SKILL.md:10); pre-scan reads entity context; natural fit for AC verification | Review scope is diff-based, not entity-AC-based; mixing concerns | Medium | Recommended |
| New "verify" stage after quality | Clean separation; preserves quality purity; dedicated goal-achievement check | Adds pipeline stage; profile/stage graph changes; FO routing | High | Viable |
| Quality Step 1.5 (modify quality) | Single quality gate, compact pipeline | Breaks quality's explicit mechanical-only contract; introduces judgment into judgment-free skill | Medium | Not recommended |

## Open Questions

Q-1: How should the regression gate map entities to their test files?

Domain: Organizational / Data-transforming

Why it matters: CONTRACTS.md tracks which entities modified which source files, but NOT which test files cover those source files. The regression gate needs to know "entity 052 modified daemon.ts -- what tests cover daemon.ts?" to run targeted regression tests for prior entities.

Suggested options: (a) Run full test suite (regression = any test failure after execute; simple but overbroad), (b) Use co-location convention (daemon.ts -> daemon.test.ts via glob; works for co-located tests but misses integration tests), (c) Add test file tracking to CONTRACTS.md (each entity's plan lists test files alongside source files; most precise but requires plan schema change)

## References

- GSD `verify-phase.md:7-18`: "Task completion ≠ Goal achievement" principle
- GSD `execute-phase.md:748-793`: Regression gate -- run prior phase test suites
- GSD `execute-phase.md:554-570`: Key-links verification between waves
- GSD `discuss-phase.md:492-496`: Prior decisions marked "revisit or keep?"
- GSD `plan-phase.md:33`: Prior CONTEXT.md injection for cross-phase consistency
- Entity 075 (research dispatch architecture): authoritative decisions on researcher dispatch, SO orchestration, hybrid annotation format
- Entity 076 (clarify open exploration loop): fractional step numbering precedent (A-1 confirmed)
- `skills/build-clarify/SKILL.md`: where clarify-stage re-validation (Step 1.5) would be added
- `skills/build-plan/SKILL.md`: where plan-stage re-validation (Step 0.5) would be added
- `skills/build-execute/SKILL.md`: where execute-stage assumption check (Wave Pre-check) would be added
- `skills/build-quality/SKILL.md`: where goal-backward verification (Step 1.5) and regression gate (Step 2.5) would be added
- `docs/build-pipeline/_index/CONTRACTS.md`: cross-entity file ownership for regression gate scope
- `skills/build-review/SKILL.md`: "judgment-bearing" stage -- candidate for goal-backward verification placement (O-1)

## Stage Report: explore

- [x] Files mapped: 12 across skill definitions, reference docs, index
  build-clarify/SKILL.md, build-plan/SKILL.md, build-execute/SKILL.md, build-quality/SKILL.md, build-review/SKILL.md, build-explore/SKILL.md, clarify refs (3), explore refs (2), CONTRACTS.md
- [x] Assumptions formed: 5 (Confident: 2, Likely: 3, Unclear: 0)
  A-1 A-5 Confident (fractional numbering, 075 decisions); A-2 A-3 A-4 Likely (evidence patterns, LLM analysis, hash comparison)
- [x] Options surfaced: 1
  O-1 goal-backward verification placement (review pre-scan recommended vs new stage vs quality)
- [x] Questions generated: 1
  Q-1 regression gate entity-to-test-file mapping strategy
- [x] α markers resolved: 0 / 0
  no α markers in brainstorming spec
- [x] Scale assessment: confirmed
  12 files across 5 skill definitions + refs confirms Large estimate; decomposition recommended (4 children)
