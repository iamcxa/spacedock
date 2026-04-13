---
id: 078
title: "Clarify-stage explore re-validation -- evidence freshness + consistency gates"
status: draft
source: decomposition of entity 077 (cross-phase skepticism)
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
depends-on: [075]
parent: 077
---

## Problem

Build-clarify currently presents explore's assumptions, options, and questions to the captain without verifying that explore's evidence is still valid or internally consistent. The captain is forced to be the skeptic instead of the decision-maker.

## Scope

### Clarify Step 1.5: Explore Re-Validation

Insert a new Step 1.5 in build-clarify between Step 1 (Load Entity State) and Step 2 (Assumption Batch Confirmation):

- **Evidence freshness**: re-read each assumption's `file:line` citation, verify it still says what explore claimed
- **Internal consistency**: cross-reference A-1~A-N for contradictions (A-1 says X, A-3 implies not-X)
- **Option validity**: verify options in comparison tables are genuinely different approaches, not rephrased versions
- **Coverage check**: run domain templates against entity spec, identify gray areas explore missed
- **Research re-validation**: if 075 researchers annotated findings, verify research conclusions against current codebase state

Captain's role shifts from "verifier" to "decision-maker" -- clarify does the homework, captain picks directions.

### Researcher vs Code-Explorer Documentation

Add clear usage rules to SO agent and skill reference docs:
- Code-Explorer: breadth-first file mapping ("What files exist and what layer are they?"). Internal only.
- Researcher: depth-first claim validation ("Is this claim true?"). Internal + external.
- Document in: SO-FO-DISPATCH-SPLIT.md, build-explore references, science-officer agent.md

## Acceptance Criteria

- [ ] Given explore produced an assumption citing `channel.ts:399` as evidence, when clarify Step 1.5 runs, then it re-reads `channel.ts:399` and verifies the cited behavior still holds before presenting to captain (how to verify: run clarify on a test entity with file:line citation, confirm re-read happens before Step 2 batch presentation)
- [ ] Given two assumptions that contradict each other (A-1 says X, A-3 implies not-X), when clarify Step 1.5 consistency check runs, then it flags the contradiction as a new Open Question before presenting to captain (how to verify: create entity with contradicting assumptions, run clarify, verify new Q-n exists)
- [ ] Given explore surfaced 2 semantically identical options (rephrased versions), when clarify Step 1.5 option validity check runs, then it merges them and notes the dedup in the entity body (how to verify: create entity with duplicate options, run clarify, verify single option remains with dedup note)
- [ ] Given explore missed a domain-template gray area, when clarify Step 1.5 coverage check runs, then it adds the missing gray area as a new assumption or question (how to verify: compare entity explore output against domain templates, run clarify, verify new item exists for uncovered template)
- [ ] Given clarify self-verification passes with 0 issues, when captain sees the assumptions in Step 2, then they are presented as pre-validated with evidence-freshness timestamp (how to verify: read Step 2 output, confirm "pre-validated" annotation present)
- [ ] Given researcher findings annotated on an assumption, when clarify re-validates, then it verifies the research conclusion still holds against current codebase (how to verify: check re-validation log for research finding cross-reference)
- [ ] Given SO agent or build-explore reference docs, when researcher vs code-explorer disambiguation docs exist, then each tool's purpose, dispatch trigger, and overlap zone are clearly documented (how to verify: grep for "code-explorer" and "researcher" in updated docs, confirm role distinction present)

## References

- Parent entity 077: cross-phase skepticism validation gates
- Entity 075 (research dispatch): authoritative decisions on researcher dispatch
- Entity 076 (clarify open exploration loop): complementary clarify enhancement (Step 4.5 interactive, this is Step 1.5 automated)
- `skills/build-clarify/SKILL.md`: insertion point for Step 1.5
- `skills/build-explore/references/gray-area-templates.md`: domain templates for coverage check
- GSD `discuss-phase.md:492-496`: prior decisions as "revisit or keep?"
