---
id: 079
title: "Plan-stage assumption re-validation -- verify clarify evidence before task generation"
status: clarify
context_status: ready
source: decomposition of entity 077 (cross-phase skepticism)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: [075]
parent: 077
---

## Directive

> Build-plan currently trusts clarify-confirmed assumptions without verifying that the cited evidence still holds. Between clarify and plan, the codebase may have changed (other entities shipping, manual edits). Plan generates tasks based on potentially stale assumptions.
>
> Insert a new Step 0.5 in build-plan before Step 1 (Topic Extraction) that re-reads each clarify-confirmed assumption's `file:line` citation, verifies the evidence still matches, and either proceeds silently (evidence holds), warns (stale but plausible), or blocks (contradicted).
>
> Scope: `skills/build-plan/SKILL.md` Step 0.5 insertion only. References entity 075 (research dispatch) decisions as authoritative. Child of entity 077 (cross-phase skepticism).

## Captain Context Snapshot

- **Repo**: main @ be942e5
- **Session**: No recent session context (entity created via decompose(077) at 468882a)
- **Domain**: Runnable / Invokable, Organizational / Data-transforming
- **Related entities**: 077 -- Cross-phase skepticism validation gates (epic/awaiting-clarify), 075 -- Research dispatch architecture (plan/ready), 076 -- Clarify open exploration loop (plan/ready), 078 -- Clarify-stage explore re-validation (draft), 074 -- Pipeline verification quality uplift (draft/pending)
- **Created**: 2026-04-13T09:30:00Z

## Brainstorming Spec

**APPROACH**: Insert a Step 0.5 ("Assumption Evidence Re-Validation") in `skills/build-plan/SKILL.md` between the current preamble and Step 1 (Topic Extraction) (✓ confirmed by explore: build-plan SKILL.md:48-70 -- Input Contract ends at line 48, Step 1 Topic Extraction begins at line 70, clear insertion boundary). Step 0.5 iterates over each `→ Confirmed:` annotation in the entity body (✓ confirmed by explore: entity 075 lines 152-172 -- 5 confirmed assumptions all use `→ Confirmed: captain, {date} ({mode})` format), extracts the `file:line` citation from the original assumption's `Evidence:` field (✓ confirmed by explore: Evidence fields consistently use `{file}:{line}` or `{file}:{line-line}` format per entity 075), re-reads that file region using `Read`, and compares the current content against the assumption's claim (✓ confirmed by explore: build-explore SKILL.md:181-196 -- Step 3.7 uses identical LLM-judgment comparison pattern). Three outcomes: (a) **evidence holds** -- proceed silently, no annotation; (b) **evidence stale** -- file changed but the claim is still plausible (e.g., line numbers shifted but semantics preserved) -- emit a `⚠ stale-evidence:` warning in plan output and proceed with caution; (c) **evidence contradicted** -- file now demonstrates the opposite of the assumption's claim -- flag as blocker, halt task generation, write `feedback-to: captain` in the Stage Report with the specific contradiction. The gate uses fractional step numbering (0.5) following the pattern proven in entity 076 (Step 4.5 in build-clarify), ensuring no existing steps are renumbered.

**ALTERNATIVE**: Instead of a pre-Step-1 gate that blocks task generation, embed assumption re-validation as a check WITHIN Step 1 Topic Extraction -- as topics are extracted, each one that references a confirmed assumption gets an inline freshness check. If stale, the topic is flagged but task generation continues, producing a plan that includes remediation tasks for stale assumptions. -- D-01 Rejected: embedding in Step 1 mixes concerns (topic extraction + evidence validation) and produces plans that may be built on false premises. A contradicted assumption could generate tasks that solve the wrong problem. The pre-gate pattern is cleaner: validate inputs BEFORE processing them, consistent with how explore Step 3.7 validates brainstorm claims before generating questions.

**GUARDRAILS**:
- Fractional step numbering (Step 0.5) -- no renumbering of existing Steps 1-9 (proven pattern from entity 076 A-1)
- Entity 075 decisions are authoritative -- if researchers annotated findings on assumptions, Step 0.5 respects 075's dispatch architecture (SO orchestrates, hybrid annotation format) and does not re-implement research dispatch
- Staleness is a WARNING (proceed-with-caution), contradiction is a BLOCKER (halt) -- no ambiguous middle ground per parent 077 GUARDRAILS
- CONTRACTS.md is not involved in this entity -- assumption re-validation uses file:line citations from explore output, not cross-entity file ownership
- The skill runs as an ensign subagent -- it does NOT have `AskUserQuestion`. Escalation to captain happens via `feedback-to: captain` in Stage Report, and FO routes to captain

**RATIONALE**: The pre-gate approach is correct because it follows the "validate inputs before processing" principle that already exists in the pipeline: explore Step 3.7 validates brainstorm claims before generating questions. Step 0.5 generalizes this to the plan stage, validating clarify-confirmed assumptions before generating tasks. The fractional numbering is proven (entity 076), the three-outcome classification (hold/stale/contradicted) maps directly to the severity levels parent 077 defined, and the `feedback-to: captain` escalation path is the established ensign-to-FO-to-captain routing pattern. Embedding in Step 1 would produce plans contaminated by stale premises -- it's better to never start than to build on sand.

## Acceptance Criteria

- [ ] Given a clarify-confirmed assumption citing `file:line` evidence (e.g., `→ Confirmed: ... Evidence: skills/build-clarify/SKILL.md:91-108`), when build-plan Step 0.5 runs, then it re-reads the cited file region and verifies the content still supports the assumption's claim (how to verify: run build-plan on entity with confirmed assumptions containing file:line citations, confirm Step 0.5 log shows re-read of each citation)
- [ ] Given a clarify-confirmed assumption whose cited file has changed to contradict the claim (e.g., assumption says "Step 1 has no validation" but Step 1 now includes validation), when build-plan Step 0.5 detects the mismatch, then it writes a blocker in `## Stage Report: plan` with `feedback-to: captain` and halts task generation (how to verify: modify the cited file between clarify and plan execution, run build-plan, verify Stage Report contains blocker with contradiction detail and no `## PLAN` section was generated)
- [ ] Given a clarify-confirmed assumption whose cited file has shifted line numbers but the semantic claim still holds, when build-plan Step 0.5 runs, then it emits a `⚠ stale-evidence:` warning in plan output and proceeds with task generation (how to verify: reformat the cited file to shift line numbers without changing semantics, run build-plan, verify warning emitted AND plan generation continues)

## Assumptions

A-1: Evidence file/line not found (file deleted, renamed, or line number out of range) is treated as a contradiction -- blocker severity, halt task generation, write `feedback-to: captain` in Stage Report.
Confidence: Likely (0.75)
Evidence: build-plan SKILL.md:47 -- Input Contract already halts on missing sections with `feedback-to: captain`; same severity model for missing evidence files. build-explore SKILL.md:188 -- Step 3.7 flags contradictions when claims cannot be verified.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Evidence citation format parsing handles both single-line (`file:42`) and range (`file:42-50`) references. Regex pattern `(\S+):(\d+)(?:-(\d+))?` extracts path and line(s). Assumptions without parseable `Evidence:` fields are skipped (no file reference to re-validate).
Confidence: Confident (0.85)
Evidence: entity 075 lines 151-171 -- Evidence fields use both `agents/researcher.md:1-21` (range) and `build-plan SKILL.md:82` (single line) across 5 confirmed assumptions
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Semantic comparison between assumption claim and current file content uses LLM runtime judgment (Read the cited region, evaluate whether it still supports the claim), not mechanical hash comparison. This is the same method explore Step 3.7 uses for brainstorm claim verification.
Confidence: Likely (0.70)
Evidence: build-explore SKILL.md:181-196 -- Step 3.7 cross-references APPROACH claims against codebase evidence using LLM judgment. Parent 077 A-4 specifies "binary file content comparison" for execute-stage (entity 080), but plan-stage requires semantic comparison because assumptions are natural language claims about code behavior, not file identity checks.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Step 0.5 treats all file changes equally regardless of source -- whether another entity shipped changes, FO daemon committed, or a manual edit occurred. The three-outcome model (hold/stale/contradicted) does not distinguish change source; the captain decides via `feedback-to: captain` whether to proceed or re-clarify.
Confidence: Confident (0.80)
Evidence: parent 077 GUARDRAILS line 57-58 -- "Staleness = warn + proceed-with-caution option. Contradiction = hard block." No source-discrimination requirement. Pipeline entities are independently deployable per 077 GUARDRAILS line 61.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Step 0.5 output follows "silent hold, inline stale, Stage Report contradicted" pattern -- Hold (evidence valid): no annotation, silence = OK, plan proceeds. Stale (file changed, claim plausible): `(⚠ stale-evidence: {detail})` inline on the Evidence line, visible to downstream plan Steps 1-8. Contradicted (file refutes claim): detailed contradiction block in `## Stage Report: plan` with `feedback-to: captain`, halts task generation. No `(✓ evidence-fresh)` annotation for hold -- absence of warning IS confirmation.
Confidence: Confident (0.85)
Evidence: entity 075 Q-1 answer -- hybrid annotation pattern (inline for confirmed, section for contradictions). build-explore SKILL.md:186-188 -- `(⚠ contradicted: ...)` inline annotation precedent. build-plan SKILL.md:285-305 -- Stage Report `feedback-to: captain` escalation format. Re-exploration confirmed: `(✓ evidence-fresh)` adds noise with no information value; silence-as-OK is the pipeline convention (absence of `→ Confirmed:` means "not yet confirmed", not "failed").
→ Confirmed: captain, 2026-04-13 (interactive -- re-explored, captain selected recommended option)

## Canonical References

(none cited -- captain confirmed assumptions without external file references)

## Stage Report: explore

- [x] Files mapped: 3 across skill/config layer
  build-plan SKILL.md (insertion target), build-explore SKILL.md (precedent pattern), entity 075 (annotation format reference)
- [x] Assumptions formed: 5 (Confident: 2, Likely: 3)
  A-1 missing evidence handling (Likely 0.75), A-2 citation format parsing (Confident 0.85), A-3 semantic comparison method (Likely 0.70), A-4 source-agnostic change detection (Confident 0.80), A-5 hybrid output pattern (Likely 0.75)
- [x] Options surfaced: 0
  All gray areas resolved to Track A assumptions with codebase precedent; no competing approaches requiring captain decision
- [x] Questions generated: 0
  No genuinely open questions -- entity scope is narrow (single step insertion) with clear precedent patterns from explore Step 3.7 and entity 075
- [x] α markers resolved: 0 / 0
  Brainstorming spec contained no α markers (decomposition-born entity with well-defined scope from parent 077)
- [x] Scale assessment: confirmed Small
  3 files mapped, single skill insertion point, no cross-layer concerns

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Small scope, no children proposed
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-4 confirmed via batch; A-5 re-explored (output format), captain selected recommended option (silent hold, inline stale, Stage Report contradicted)
- [x] Options selected: 0 / 0
  no option comparisons surfaced by explore
- [x] Questions answered: 0 / 0
  no open questions surfaced by explore
- [x] Canonical refs added: 0
  captain confirmed assumptions without citing external file references
- [x] Context status: ready
  gate passed: all 5 assumptions confirmed, 0 options, 0 questions, ACs valid (3 criteria, no α markers)
- [x] Handoff mode: loose
  captain must say "execute 079" or hand off to First Officer; auto_advance not set
- [x] Clarify duration: 2 questions asked, session complete
  1 batch assumption presentation (plain text) + 1 AskUserQuestion (A-5 output format re-exploration)

## References

- Parent entity 077: cross-phase skepticism validation gates
- Entity 075 (research dispatch): authoritative decisions on researcher dispatch
- `skills/build-plan/SKILL.md`: insertion point for Step 0.5
- `skills/build-explore/SKILL.md`: Step 3.7 precedent pattern for claim verification
- GSD `plan-phase.md:33`: prior CONTEXT.md injection for cross-phase consistency
