---
id: 078
title: "Clarify-stage explore re-validation -- evidence freshness + consistency gates"
status: plan
context_status: ready
source: decomposition of entity 077 (cross-phase skepticism)
started: 2026-04-13T13:00:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-clarify-explore-revalidation
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [075]
parent: 077
---

## Directive

> Build-clarify currently presents explore's assumptions, options, and questions to the captain without verifying that explore's evidence is still valid or internally consistent. The captain is forced to be the skeptic instead of the decision-maker.
>
> Insert a new Step 1.5 in build-clarify between Step 1 (Load Entity State) and Step 2 (Assumption Batch Confirmation) with five sub-checks: (1) evidence freshness -- re-read file:line citations, (2) internal consistency -- cross-reference assumptions for contradictions, (3) option validity -- verify options are genuinely different, (4) coverage check -- run domain templates for missed gray areas, (5) research re-validation -- verify 075 researcher findings against current codebase.
>
> Additionally, document the researcher vs code-explorer disambiguation in SO agent and reference docs.
>
> Scope: `skills/build-clarify/SKILL.md` Step 1.5 insertion + reference doc updates. Child of entity 077 (cross-phase skepticism). Complementary to entity 076 (Step 4.5 interactive exploration loop -- that is captain-driven, this is automated pre-validation).

## Captain Context Snapshot

- **Repo**: main @ 0c0671b
- **Session**: No recent session context (entity created via decompose(077) at 468882a)
- **Domain**: Runnable / Invokable, Readable / Textual
- **Related entities**: 077 -- Cross-phase skepticism validation gates (epic/awaiting-clarify), 075 -- Research dispatch architecture (plan/ready), 076 -- Clarify open exploration loop (plan/ready), 079 -- Plan-stage assumption re-validation (clarify/ready), 080 -- Execute-stage staleness detection (clarify/ready), 081 -- Goal-backward verification + regression gate (clarify/ready)
- **Created**: 2026-04-13T11:30:00Z

## Brainstorming Spec

**APPROACH**: Insert a Step 1.5 ("Explore Re-Validation") in `skills/build-clarify/SKILL.md` between Step 1 (Load Entity State, line 91) and Step 2 (Assumption Batch Confirmation, line 113) (✓ confirmed by explore: build-clarify SKILL.md:91-113 -- Step 1 ends at line 111 with `---` separator, Step 2 begins at line 113, clear insertion boundary). Step 1.5 runs five automated sub-checks before any captain interaction: (1a) **Evidence freshness** -- for each assumption's `Evidence: {file}:{line}` citation, `Read` the cited region and verify the content still supports the claim using the same LLM-judgment pattern as explore Step 3.7 (proven in entity 079). Staleness annotated inline as `(⚠ stale-evidence: {detail})`. (1b) **Internal consistency** -- LLM reads all A-n entries and flags semantic contradictions as new Q-n Open Questions, prepended to the question list for Step 4. (1c) **Option validity** -- for each `## Option Comparisons` table, verify options are genuinely different approaches (not rephrased versions). Duplicates merged with dedup note. (1d) **Coverage check** -- read `references/gray-area-templates.md` and cross-reference domain templates against the entity's `## Assumptions` + `## Open Questions`, adding missing gray areas as new A-n or Q-n entries. (1e) **Research re-validation** -- if assumptions carry `(✓ research: ...)` annotations (entity 075 format), re-read cited evidence and verify research conclusions still hold. Additionally, update SO-FO-DISPATCH-SPLIT.md, build-explore references, and science-officer agent.md with researcher vs code-explorer disambiguation rules.

**ALTERNATIVE**: Instead of an automated pre-validation step, add a "validation prompt" at the start of Step 2 that asks the captain: "Before we review assumptions, should I re-verify the evidence?" -- making re-validation captain-initiated rather than automatic. -- D-01 Rejected: this defeats the purpose of shifting the captain from "verifier" to "decision-maker". If the captain has to decide whether to verify, they're still in verifier mode. Automated pre-validation removes the burden entirely -- the captain sees pre-validated assumptions with freshness timestamps and focuses on decisions, not verification.

**GUARDRAILS**:
- Fractional step numbering (Step 1.5) -- no renumbering of existing Steps 0-6 (proven pattern from entity 076 A-1)
- Entity 075 decisions are authoritative -- research re-validation uses 075's annotation format `(✓ research: {source} -- {finding})` and dispatch architecture
- Entity 076 is complementary, not overlapping -- 076 is Step 4.5 (captain-driven interactive exploration), 078 is Step 1.5 (automated pre-validation). Do not duplicate 076's interactive loop in 078's automated check
- Evidence freshness uses the same LLM-judgment pattern proven in entity 079 (plan-stage re-validation) -- semantic comparison, not mechanical hash
- New gray areas discovered by coverage check are Track A (assumption) if codebase precedent exists, Track C (question) if genuinely open -- same hybrid classification rules as build-explore

**RATIONALE**: Automated pre-validation is correct because the captain's time is the scarcest resource in the clarify loop. Every assumption the captain manually re-verifies ("wait, is this file:line citation still accurate?") is time NOT spent making decisions. Entity 079 proved that LLM-judgment evidence freshness checks work for the plan stage; 078 generalizes the same pattern to the clarify stage, one phase earlier. The five sub-checks (freshness, consistency, validity, coverage, research) map directly to the five ways explore output can be wrong: stale evidence, internal contradictions, duplicate options, missed gray areas, and outdated research. Each sub-check is independently valuable -- if any one catches a problem, it saves a full clarify round-trip.

## Acceptance Criteria

- [ ] Given explore produced an assumption citing `channel.ts:399` as evidence, when clarify Step 1.5 runs, then it re-reads `channel.ts:399` and verifies the cited behavior still holds before presenting to captain (how to verify: run clarify on a test entity with file:line citation, confirm re-read happens before Step 2 batch presentation)
- [ ] Given two assumptions that contradict each other (A-1 says X, A-3 implies not-X), when clarify Step 1.5 consistency check runs, then it flags the contradiction as a new Open Question before presenting to captain (how to verify: create entity with contradicting assumptions, run clarify, verify new Q-n exists)
- [ ] Given explore surfaced 2 semantically identical options (rephrased versions), when clarify Step 1.5 option validity check runs, then it merges them and notes the dedup in the entity body (how to verify: create entity with duplicate options, run clarify, verify single option remains with dedup note)
- [ ] Given explore missed a domain-template gray area, when clarify Step 1.5 coverage check runs, then it adds the missing gray area as a new assumption or question (how to verify: compare entity explore output against domain templates, run clarify, verify new item exists for uncovered template)
- [ ] Given clarify self-verification passes with 0 issues, when captain sees the assumptions in Step 2, then they are presented as pre-validated with evidence-freshness timestamp (how to verify: read Step 2 output, confirm "pre-validated" annotation present)
- [ ] Given researcher findings annotated on an assumption, when clarify re-validates, then it verifies the research conclusion still holds against current codebase (how to verify: check re-validation log for research finding cross-reference)
- [ ] Given SO agent or build-explore reference docs, when researcher vs code-explorer disambiguation docs exist, then each tool's purpose, dispatch trigger, and overlap zone are clearly documented (how to verify: grep for "code-explorer" and "researcher" in updated docs, confirm role distinction present)

## Assumptions

A-1: Evidence freshness check (sub-check 1a) uses the same LLM-judgment pattern as entity 079's build-plan Step 0.5 and explore Step 3.7 -- Read the cited file region, evaluate whether content still supports the claim. Three outcomes: hold (silent), stale (inline `(⚠ stale-evidence: {detail})`), contradicted (new Q-n). This is the third instance of this pattern in the pipeline (explore 3.7, plan 0.5, clarify 1.5).
Confidence: Confident (0.90)
Evidence: entity 079 clarify/ready -- A-3 confirmed LLM-judgment semantic comparison. build-explore SKILL.md:181-196 -- Step 3.7 is the original implementation. Three independent instances of the same pattern = Confident.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Internal consistency check (sub-check 1b) uses LLM runtime analysis to detect contradictions between assumptions, not a static algorithm. The LLM reads all A-n entries and flags semantic contradictions. Contradictions become new Q-n Open Questions prepended to the Step 4 list.
Confidence: Likely (0.75)
Evidence: parent 077 A-3 at Likely (0.70). No existing codebase implementation of cross-assumption consistency checking. The closest pattern is explore Step 3.7 which cross-references APPROACH claims against codebase, not A-n entries against each other. Novel check, LLM-judgment feasible but unproven at this specific task.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Option validity check (sub-check 1c) uses LLM comparison of option rows to detect semantic duplicates. Duplicates are merged (keeping the first occurrence) with a `(merged from O-{n}: {original label})` dedup note appended to the surviving option's row.
Confidence: Likely (0.70)
Evidence: No existing codebase implementation of option dedup. Build-brainstorm Step 6 self-review (check 2) does verify "APPROACH vs ALTERNATIVE are genuinely different" but that's at brainstorm time, not clarify time, and checks 2 sections not N options. Novel check.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Coverage check (sub-check 1d) reads `references/gray-area-templates.md` (5 domain templates) and cross-references against existing entity body sections. Missing gray areas are classified as Track A (assumption) if codebase precedent exists per hybrid classification, Track C (question) otherwise.
Confidence: Confident (0.85)
Evidence: skills/build-explore/references/gray-area-templates.md -- 5 domain templates with structured gray area tables. build-explore SKILL.md Step 4 already does this exact cross-reference during explore; Step 1.5 re-runs it to catch gray areas explore missed. Reuse of existing reference doc = high confidence.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Researcher vs code-explorer disambiguation documentation goes in three files: (1) SO-FO-DISPATCH-SPLIT.md (new subsection), (2) build-explore references (new file or append to existing), (3) agents/science-officer.md (inline update). The content distinguishes breadth-first file mapping (code-explorer) from depth-first claim validation (researcher).
Confidence: Confident (0.85)
Evidence: docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md -- already mentions both roles (lines 36, 84-86, 93-94) but lacks formal disambiguation section. agents/science-officer.md lines 44-46, 117-123 -- already references researchers and code-explorers but without explicit role distinction rules.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: How should Step 1.5 handle found issues?

Step 1.5 may find stale evidence, contradictions, duplicate options, or coverage gaps. What happens when it does?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Annotate-and-proceed | Captain sees pre-validated assumptions with inline annotations; no blocking; clarify flow continues; captain decides what matters | Stale evidence could lead to wasted clarify time on an invalid assumption | Low | ✅ Recommended |
| Block on any issue | Forces resolution before captain interaction; cleanest input for Step 2 | Over-blocking: a stale line number that doesn't change the claim would block the entire session; captain can't override | Medium | Not recommended |
| Annotate, block only on contradictions | Contradictions are hard blockers (new Q-n), staleness is annotated warning; balanced approach | Adds conditional logic to Step 1.5 (two code paths); complexity for marginal benefit over annotate-and-proceed | Medium | Viable |

→ Selected: Annotate-and-proceed (captain, 2026-04-13, interactive)

## Canonical References

(none cited -- captain confirmed assumptions and selected recommended option without external file references)

## Stage Report: explore

- [x] Files mapped: 5 across skill/config/docs layers
  build-clarify SKILL.md (insertion target), build-explore references/gray-area-templates.md (coverage check source), SO-FO-DISPATCH-SPLIT.md (doc target), agents/science-officer.md (doc target), entity 079 (precedent pattern)
- [x] Assumptions formed: 5 (Confident: 3, Likely: 2)
  A-1 evidence freshness pattern (0.90), A-2 consistency check (0.75), A-3 option validity (0.70), A-4 coverage check (0.85), A-5 doc disambiguation (0.85)
- [x] Options surfaced: 1
  O-1 Step 1.5 issue handling strategy (annotate-and-proceed vs block vs hybrid)
- [x] Questions generated: 0
  No genuinely open questions -- entity scope is well-defined from parent 077 decomposition with clear precedent patterns
- [x] α markers resolved: 0 / 0
  Brainstorming spec contained no α markers
- [x] Scale assessment: confirmed Medium
  5 files mapped across 3 layers (skill, docs, agent), 5 sub-checks in Step 1.5 + documentation updates

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Medium scope, 5 sub-checks are cohesive (all in Step 1.5), no split needed
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 all confirmed via batch; A-2, A-3 assessed as "novel but low-risk" (LLM-judgment with captain fallback)
- [x] Options selected: 1 / 1
  O-1 Step 1.5 issue handling -- Annotate-and-proceed (recommended)
- [x] Questions answered: 0 / 0
  no open questions surfaced by explore
- [x] Canonical refs added: 0
  captain confirmed and selected without citing external references
- [x] Context status: ready
  gate passed: all 5 assumptions confirmed, 1 option selected, 0 questions, ACs valid (7 criteria, no α markers)
- [x] Handoff mode: loose
  captain must say "execute 078" or hand off to First Officer; auto_advance not set
- [x] Clarify duration: 2 questions asked, session complete
  1 batch assumption presentation (plain text) + 1 AskUserQuestion (O-1 issue handling)

## References

- Parent entity 077: cross-phase skepticism validation gates
- Entity 075 (research dispatch): authoritative decisions on researcher dispatch
- Entity 076 (clarify open exploration loop): complementary clarify enhancement (Step 4.5 interactive, this is Step 1.5 automated)
- Entity 079 (plan-stage re-validation): proven pattern for LLM-judgment evidence freshness checks
- `skills/build-clarify/SKILL.md`: insertion point for Step 1.5 (between line 91 Step 1 and line 113 Step 2)
- `skills/build-explore/references/gray-area-templates.md`: domain templates for coverage check
- `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`: researcher vs code-explorer documentation target
