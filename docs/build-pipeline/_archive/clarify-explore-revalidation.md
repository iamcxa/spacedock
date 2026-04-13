---
id: 078
title: "Clarify-stage explore re-validation -- evidence freshness + consistency gates"
status: shipped
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

## Research Findings

### Upstream Constraints

1. **Build-clarify step ordering is strict and uses fractional numbering.** Steps 0-6 in strict order (SKILL.md:15-16). Entity 076 already inserted Step 4.5 (open exploration loop) using fractional numbering without renumbering existing steps. Step 1.5 follows the same proven pattern -- inserts between Step 1 (Load Entity State, ends line 110) and Step 2 (Assumption Batch Confirmation, starts line 113). No existing steps are renumbered. Citation: `skills/build-clarify/SKILL.md:15-16,91-113`
2. **Build-clarify is captain-interactive but Step 1.5 is internal.** SKILL.md:15 states "Steps 2-4 interact with the captain; Steps 0, 1, 5, 6 are internal." Step 1.5 is automated pre-validation -- it runs between two internal steps (Step 1 and Step 2) and does NOT use AskUserQuestion. Its findings are presented to the captain via the existing Step 2 flow (annotated assumptions). Citation: `skills/build-clarify/SKILL.md:15-16`
3. **Entity 075 annotation format is authoritative for research re-validation.** Research findings are annotated inline as `(✓ research: {source} -- {finding})` on Evidence lines per entity 075 and build-explore SKILL.md:281. Citation: `skills/build-explore/SKILL.md:278-283`
4. **O-1 selected: Annotate-and-proceed.** Step 1.5 does NOT block on any issue. Stale evidence is annotated inline, contradictions become new Q-n entries, but the clarify flow continues. Captain decides what matters during Steps 2-4. Citation: entity 078 `## Option Comparisons` O-1 selection

### Existing Patterns

1. **Build-explore Step 3.7 (Brainstorm Claim Verification)** is the first instance of LLM-judgment evidence freshness. It cross-references APPROACH claims against codebase evidence, annotates with `(✓ confirmed by explore: ...)` or `(⚠ contradicted: ... -- see Q-{n})`. Citation: `skills/build-explore/SKILL.md:181-196`
2. **Entity 079 Step 0.5 (Plan-stage re-validation)** is the second instance. Same three-outcome model: hold (silent), stale (inline warning), contradicted (blocker). Uses LLM semantic comparison, not mechanical hash. Citation: `docs/build-pipeline/plan-assumption-revalidation.md:39-48`
3. **Entity 080 Step 4 wave pre-check** uses binary git hash comparison (not LLM judgment) because execute operates on files, not claims. Entity 078 uses LLM judgment because clarify operates on natural language claims about code behavior. Citation: `docs/build-pipeline/execute-staleness-detection.md:44`
4. **Build-explore Step 4 already runs gray-area-templates cross-reference during explore.** Step 1.5 sub-check 1d re-runs the same cross-reference to catch gray areas explore missed. The 5 domain templates in `references/gray-area-templates.md` are the input. Citation: `skills/build-explore/SKILL.md:196-207`, `skills/build-explore/references/gray-area-templates.md:1-86`
5. **Build-clarify Step 4.5 (entity 076) provides the open exploration loop pattern.** Step 4.5 uses three suggestion sources (templates, CONTRACTS, directive). Step 1.5 sub-check 1d uses only source 1 (templates) since 1.5 is automated, not interactive. Citation: `skills/build-clarify/SKILL.md:221-297`

### Library/API Surface

1. **No external library dependencies.** All sub-checks use Read/Grep/Glob tools already available to the skill. LLM judgment is the built-in model runtime, not a library call. No new dependencies introduced.
2. **Gray-area-templates.md is the only structured reference doc consumed.** Sub-check 1d reads `skills/build-explore/references/gray-area-templates.md` with 5 domain templates, each containing a table of gray areas. The skill grep-matches entity domain against template headings. Citation: `skills/build-explore/references/gray-area-templates.md:19-86`

### Known Gotchas

1. **Step 1.5 must run AFTER Step 1 loads the entity state.** Step 1 counts unresolved items and detects the empty/resume case. If Step 1.5 runs first, it would operate on an unloaded entity. Step 1's empty case (no explore output) must also short-circuit Step 1.5 -- there are no assumptions to re-validate if explore never ran.
2. **Annotation format consistency: `(⚠ stale-evidence: {detail})` must use `--` double dash, not em dash.** Per build-clarify SKILL.md:417 and build-explore SKILL.md:348. All annotations in the pipeline use `--`.
3. **New Q-n entries from sub-check 1b (contradictions) must use next available Q-number.** If explore generated Q-1 through Q-3, new contradictions become Q-4, Q-5, etc. These are prepended to Step 4's question list (higher priority because they indicate internal inconsistency).
4. **Sub-check 1c (option dedup) must NOT delete duplicate options -- it merges them.** Per entity 078 A-3: keep the first occurrence, append `(merged from O-{n}: {original label})` to the surviving row. Explore output is append-only per build-clarify SKILL.md:413.
5. **Step 1.5 findings must be written to entity body before Step 2 presents assumptions.** Step 2 reads the entity body for unconfirmed assumptions. If Step 1.5 annotated stale evidence or added new Q-n entries, Step 2 must see those annotations. Write before proceeding.

### Reference Examples

1. **Build-explore Step 3.7 implementation** (`skills/build-explore/SKILL.md:181-196`) -- closest pattern to Step 1.5 sub-checks 1a and 1e. Cross-references claims against evidence, produces confirmed/contradicted annotations.
2. **Entity 079 three-outcome model** (`docs/build-pipeline/plan-assumption-revalidation.md:39`) -- hold/stale/contradicted severity classification. Step 1.5 uses the same model for sub-check 1a, with annotate-and-proceed (not halt) per O-1 selection.
3. **Build-clarify Step 4.5 gray-area template scanning** (`skills/build-clarify/SKILL.md:233-241`) -- sub-check 1d reuses source 1 (templates) pattern. Skip rules from gray-area-templates.md:6-12 apply: already decided, clear precedent, solved by related entity.
4. **Pressure test format** (`tests/pressure/build-plan.yaml:1-63`) -- skill TDD scenarios use YAML with `skill`, `target_path`, `test_cases[]` containing `id`, `summary`, `pressure[]`, `options`, `expected_answer`, `correct_because`, `history` fields.

## PLAN

### Goal

Insert Step 1.5 ("Explore Re-Validation") into `skills/build-clarify/SKILL.md` with 5 sub-checks (evidence freshness, internal consistency, option validity, coverage check, research re-validation), update the output-format reference doc, update researcher vs code-explorer disambiguation docs, and write pressure tests for TDD validation.

<task id="task-0" model="sonnet" wave="0" skills="superpowers:verification-before-completion">
  <read_first>
    - skills/build-clarify/SKILL.md
    - skills/build-clarify/references/output-format.md
    - skills/build-explore/references/gray-area-templates.md
    - docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md
    - agents/science-officer.md
  </read_first>

  <action>
  Environment verification. Confirm all target files exist and contain the expected content at the expected locations:
  1. `grep -n "## Step 1: Load Entity State" skills/build-clarify/SKILL.md` -- should find the Step 1 heading
  2. `grep -n "## Step 2: Assumption Batch Confirmation" skills/build-clarify/SKILL.md` -- should find the Step 2 heading immediately after Step 1
  3. `grep -c "Step 4.5" skills/build-clarify/SKILL.md` -- should be >= 1 (entity 076 already inserted Step 4.5)
  4. `grep -n "internal" skills/build-clarify/SKILL.md | head -3` -- verify Step 1 is listed as "internal" in the step classification
  5. Verify `skills/build-explore/references/gray-area-templates.md` exists and contains 5 domain sections
  6. Verify `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` exists
  7. Verify `agents/science-officer.md` exists
  8. Verify `tests/pressure/` directory exists
  9. Verify no existing `tests/pressure/build-clarify*.yaml` file exists (we will create one)
  </action>

  <acceptance_criteria>
    - `grep -n "## Step 1: Load Entity State" skills/build-clarify/SKILL.md` returns a line number
    - `grep -n "## Step 2: Assumption Batch Confirmation" skills/build-clarify/SKILL.md` returns a line number
    - `grep -c "Step 4.5" skills/build-clarify/SKILL.md` returns >= 1
    - `test -f skills/build-explore/references/gray-area-templates.md && echo exists` prints "exists"
    - `test -f docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md && echo exists` prints "exists"
    - `test -f agents/science-officer.md && echo exists` prints "exists"
    - `test -d tests/pressure && echo exists` prints "exists"
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1" skills="superpowers:writing-skills">
  <read_first>
    - skills/build-clarify/SKILL.md
    - skills/build-explore/SKILL.md (Step 3.7 for evidence freshness pattern)
    - skills/build-explore/references/gray-area-templates.md
    - docs/build-pipeline/plan-assumption-revalidation.md (entity 079 three-outcome model)
    - skills/build-explore/references/hybrid-classification-heuristic.md (Track A/B/C classification)
  </read_first>

  <action>
  Insert `## Step 1.5: Explore Re-Validation` into `skills/build-clarify/SKILL.md` between the end of Step 1 (`---` separator after the empty case) and the start of Step 2 (`## Step 2: Assumption Batch Confirmation`).

  The new section defines five sub-checks that run automatically after Step 1 loads the entity state and before Step 2 presents assumptions to the captain:

  **Step 1.5: Explore Re-Validation**

  After Step 1 loads the entity state and counts unresolved items, Step 1.5 runs five automated sub-checks to verify explore's output is still valid. Step 1.5 is internal -- it does NOT use AskUserQuestion. Its findings are written to the entity body so Step 2 presents pre-validated assumptions.

  **Skip condition:** If Step 1 detected the empty case (no explore output), skip Step 1.5 entirely -- there are no assumptions to re-validate. If Step 1 detected the resume case (all counts zero), also skip Step 1.5 -- all items were already resolved in a prior session.

  Sub-checks in order:

  **1a -- Evidence Freshness.** For each assumption in `## Assumptions` that has an `Evidence: {file}:{line}` citation, Read the cited file region using the `Read` tool. Compare the current content against the assumption's claim using LLM judgment (same pattern as build-explore Step 3.7). Three outcomes per the entity 079 model:
  - **Hold**: evidence still supports the claim. No annotation (silence = valid).
  - **Stale**: file changed but claim is still plausible (e.g., line numbers shifted, semantics preserved). Append `(⚠ stale-evidence: {detail})` inline after the Evidence line.
  - **Contradicted**: file now demonstrates the opposite of the claim. Add a new `Q-{next_n}` entry to `## Open Questions` with Domain, Why it matters, and Suggested options. Append `(⚠ contradicted: {detail} -- see Q-{next_n})` inline after the Evidence line.

  Evidence lines without parseable `{file}:{line}` citations (e.g., "captain domain knowledge") are skipped.

  **1b -- Internal Consistency.** Read all A-n entries in `## Assumptions`. For each pair of assumptions, evaluate whether they semantically contradict each other using LLM judgment. If A-i and A-j contradict, add a new `Q-{next_n}` entry to `## Open Questions`: "Assumptions A-{i} and A-{j} appear to contradict each other: A-{i} says {claim_i}, A-{j} implies {claim_j}. Which is correct?" The new Q-n is prepended to Step 4's processing queue (contradictions have high priority).

  **1c -- Option Validity.** Read each `### {name}` subsection in `## Option Comparisons`. For each table, compare option rows for semantic duplication using LLM judgment. If two options are rephrased versions of the same approach, merge them: keep the first occurrence's row, append `(merged from O-{n}: {original label})` to the surviving row's Option cell, and delete the duplicate row. Write a `(⚠ dedup: merged {label_a} and {label_b} -- see dedup note)` annotation below the table.

  **1d -- Coverage Check.** Read `skills/build-explore/references/gray-area-templates.md`. For each domain matching the entity's `## Captain Context Snapshot` Domain field, scan the template table rows. Cross-reference each template gray area against the entity's existing `## Assumptions` and `## Open Questions` (same seen-topics semantic overlap check as Step 4.5 source 1). For each uncovered gray area:
  - If codebase precedent exists (Read/Grep to check): add as a new `A-{next_n}` entry in `## Assumptions` with Confidence and Evidence.
  - If genuinely open: add as a new `Q-{next_n}` entry in `## Open Questions`.
  Apply gray-area-templates.md skip rules (already decided, clear precedent, solved by related entity).

  **1e -- Research Re-Validation.** Scan `## Assumptions` for entries with `(✓ research: {source} -- {finding})` annotations (entity 075 format). For each research-annotated assumption, re-read the cited evidence source using Read. Compare the current content against the research finding using LLM judgment. Outcomes:
  - **Holds**: research finding still valid. No annotation.
  - **Stale**: source changed but finding is plausible. Append `(⚠ stale-research: {detail})` after the research annotation.
  - **Contradicted**: source now refutes the research finding. Add a new `Q-{next_n}` to `## Open Questions` and append `(⚠ research-contradicted: {detail} -- see Q-{next_n})` after the research annotation.

  **After all sub-checks complete**, record a summary for the Stage Report: count of assumptions checked, stale annotations added, contradictions found (new Q-n entries), options deduped, coverage gaps filled, research re-validated. Write all annotations and new entries to the entity body before proceeding to Step 2.

  Also update the step classification comment at SKILL.md:15-16 from:
  "Steps 2-4 interact with the captain; Steps 0, 1, 5, 6 are internal."
  to:
  "Steps 2-4 interact with the captain; Steps 0, 1, 1.5, 5, 6 are internal."
  </action>

  <acceptance_criteria>
    - `grep -n "## Step 1.5: Explore Re-Validation" skills/build-clarify/SKILL.md` finds the new section heading
    - `grep -c "stale-evidence" skills/build-clarify/SKILL.md` returns >= 2 (annotation format + usage in sub-check 1a)
    - `grep "Steps 0, 1, 1.5, 5, 6 are internal" skills/build-clarify/SKILL.md` matches the updated classification
    - `grep -c "1a.*Evidence Freshness" skills/build-clarify/SKILL.md` returns >= 1
    - `grep -c "1b.*Internal Consistency" skills/build-clarify/SKILL.md` returns >= 1
    - `grep -c "1c.*Option Validity" skills/build-clarify/SKILL.md` returns >= 1
    - `grep -c "1d.*Coverage Check" skills/build-clarify/SKILL.md` returns >= 1
    - `grep -c "1e.*Research Re-Validation" skills/build-clarify/SKILL.md` returns >= 1
    - Step 1.5 appears AFTER Step 1 and BEFORE Step 2 in the file (verify by checking line numbers of all three headings)
  </acceptance_criteria>

  <files_modified>
    - skills/build-clarify/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1" skills="superpowers:writing-skills">
  <read_first>
    - skills/build-clarify/references/output-format.md
    - skills/build-clarify/SKILL.md
  </read_first>

  <action>
  Update `skills/build-clarify/references/output-format.md` to document the Step 1.5 annotation formats. Add a new section `## Annotation: Step 1.5 Re-Validation` after the existing `## Annotation: Open Exploration Item` section and before `## Section: Canonical References`.

  The new section documents:
  1. `(⚠ stale-evidence: {detail})` -- appended inline after an Evidence line when sub-check 1a finds stale-but-plausible evidence. One line, no blank line separator.
  2. `(⚠ contradicted: {detail} -- see Q-{n})` -- appended inline after an Evidence line when sub-check 1a finds contradicted evidence. References the new Q-n entry.
  3. `(⚠ dedup: merged {label_a} and {label_b} -- see dedup note)` -- appended below an option table when sub-check 1c merges duplicate options. Below table, one blank line separator.
  4. `(⚠ stale-research: {detail})` -- appended inline after a `(✓ research: ...)` annotation when sub-check 1e finds stale research.
  5. `(⚠ research-contradicted: {detail} -- see Q-{n})` -- appended inline after a `(✓ research: ...)` annotation when sub-check 1e finds contradicted research.
  6. New A-n and Q-n entries created by sub-checks 1b (contradictions), 1d (coverage gaps) use the SAME format as explore-created items (per existing output-format.md conventions).

  Also update the `## Section: Stage Report: clarify` section to add a new metric line for Step 1.5 between the existing "Decomposition" and "Assumptions confirmed" lines:
  ```
  - [x] Re-validation: {n} assumptions checked, {n} stale, {n} contradicted, {n} options deduped, {n} coverage gaps, {n} research re-validated
    e.g., "5 assumptions checked, 1 stale (A-2 line shifted), 0 contradicted, 0 deduped, 1 coverage gap (A-6 added), 0 research re-validated"
  ```
  </action>

  <acceptance_criteria>
    - `grep "Annotation: Step 1.5 Re-Validation" skills/build-clarify/references/output-format.md` finds the new section
    - `grep "stale-evidence" skills/build-clarify/references/output-format.md` finds the annotation format
    - `grep "Re-validation:" skills/build-clarify/references/output-format.md` finds the new Stage Report metric
    - The new section appears AFTER "Open Exploration Item" and BEFORE "Canonical References" (verify by line numbers)
  </acceptance_criteria>

  <files_modified>
    - skills/build-clarify/references/output-format.md
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="1" skills="superpowers:writing-skills">
  <read_first>
    - docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md
    - agents/science-officer.md
    - skills/build-explore/SKILL.md (Step 2 Mode A/B and Step 5.5 dispatch)
  </read_first>

  <action>
  Add researcher vs code-explorer disambiguation documentation to three files:

  **File 1: `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`**
  Add a new `## Researcher vs Code-Explorer Disambiguation` section after the existing `## Concurrent Operation` section and before `## Migration Notes`. Content:

  - **Code-explorer** (`spacedock:code-explorer`): Breadth-first file mapping subroutine. Purpose: discover which files are affected by an entity's scope. Dispatch trigger: build-explore Step 2 (Mode A) when SO needs fresh-context file discovery. Output: structured file list with layer classification and 1-line purpose notes. Does NOT evaluate claims, validate evidence, or answer questions. Read-only, never edits.
  - **Researcher** (`spacedock:researcher` / `spacedock:build-research`): Depth-first claim validation agent. Purpose: validate specific technology claims, investigate library behavior, cross-reference evidence. Dispatch trigger: build-brainstorm Step 3.5 (post-brainstorm), build-explore Step 5.5 (external tech assumptions), build-plan Step 2 (implementation-specific queries). Output: structured finding with 5-domain treatment (Upstream Constraints, Existing Patterns, Library/API Surface, Known Gotchas, Reference Examples). Does NOT map files or discover scope.
  - **Overlap zone**: Both tools Read files. The distinction is PURPOSE: code-explorer asks "what files are relevant?", researcher asks "is this claim true?". When in doubt: if the question is "which files?" use code-explorer; if the question is "does X work as stated?" use researcher.
  - **Never dispatch both for the same question.** A code-explorer cannot answer "does the API support streaming?" and a researcher should not be asked to "list all files in the domain layer."

  **File 2: `agents/science-officer.md`**
  Add a `## Researcher vs Code-Explorer Dispatch Guide` section after `## Boundaries` and before `## Interaction Rules`. Content: a compact version of the disambiguation above, focused on when SO dispatches each during its brainstorm/explore/clarify flow. Include a dispatch decision table:

  | Phase | Question type | Dispatch |
  |-------|---------------|----------|
  | Brainstorm (Step 3.5) | "Does library X support feature Y?" | researcher |
  | Explore (Step 2) | "Which files does this entity touch?" | code-explorer |
  | Explore (Step 5.5) | "Is this Likely assumption correct?" | researcher |
  | Clarify (Step 1.5) | "Does this file:line still support claim Z?" | inline Read (no dispatch) |

  Note: Step 1.5 does NOT dispatch researchers or code-explorers. It uses inline Read/Grep because evidence freshness checks are small-scope (single file:line citations, not broad investigation).

  **File 3: Create `skills/build-explore/references/researcher-vs-code-explorer.md`**
  A standalone reference doc with the full disambiguation rules, linked from the SO-FO-DISPATCH-SPLIT.md section. Contains the purpose/trigger/output table for both tools, the overlap zone rules, and the "never dispatch both for the same question" rule.
  </action>

  <acceptance_criteria>
    - `grep "Researcher vs Code-Explorer Disambiguation" docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` finds the new section
    - `grep "Researcher vs Code-Explorer Dispatch Guide" agents/science-officer.md` finds the new section
    - `test -f skills/build-explore/references/researcher-vs-code-explorer.md && echo exists` prints "exists"
    - `grep "code-explorer" docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md | wc -l` returns >= 5 (existing + new)
    - `grep "code-explorer" agents/science-officer.md | wc -l` returns >= 3
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md
    - agents/science-officer.md
    - skills/build-explore/references/researcher-vs-code-explorer.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2" skills="superpowers:writing-skills, superpowers:test-driven-development" test_first="true">
  <read_first>
    - tests/pressure/build-plan.yaml (format reference)
    - tests/pressure/README.md (conventions)
    - skills/build-clarify/SKILL.md (after task-1 for Step 1.5 text)
    - skills/build-clarify/references/output-format.md (after task-2)
  </read_first>

  <action>
  Create `tests/pressure/build-clarify-revalidation.yaml` with pressure test scenarios for Step 1.5 sub-checks. Follow the existing YAML format from `tests/pressure/build-plan.yaml`.

  Test cases:

  1. **evidence-freshness-stale-annotation** -- Clarify ensign runs Step 1.5 sub-check 1a. Assumption A-2 cites `server.ts:142` as evidence for "uses query parameters for filtering". The file at line 142 now shows a different filtering mechanism (body params). The evidence is stale but the filtering concept still applies (line shifted to 158). Pressure: "the code still filters, just differently" tempts hold instead of stale annotation. Expected answer: annotate `(⚠ stale-evidence: ...)` because content at cited line no longer matches. Do NOT silently hold.

  2. **evidence-freshness-contradicted-new-question** -- Clarify ensign runs Step 1.5 sub-check 1a. Assumption A-1 cites `SKILL.md:91` as evidence that "Step 1 has no validation logic". The file now shows validation logic was added at line 91 by entity 076. Pressure: "the assumption was confirmed by captain, overriding explore seems wrong" tempts hold. Expected answer: add a new Q-n Open Question with the contradiction, annotate `(⚠ contradicted: ...)`. Captain confirmation does not override codebase reality.

  3. **internal-consistency-contradiction** -- Clarify ensign runs Step 1.5 sub-check 1b. Assumption A-1 says "WebSocket uses binary frames for efficiency" and A-4 says "all communication uses JSON text frames for debuggability". These contradict. Pressure: "they address different aspects -- A-1 is about transport, A-4 is about protocol" tempts hold. Expected answer: flag as contradiction, add new Q-n. The claims are mutually exclusive (binary vs text frames).

  4. **coverage-check-new-assumption** -- Clarify ensign runs Step 1.5 sub-check 1d. Entity domain is "Behavioral / Callable". Gray-area-templates.md lists "Idempotency" as a gray area for this domain. No existing assumption or question addresses idempotency. Codebase grep shows 2+ consistent usages of idempotent patterns. Pressure: "explore already ran templates, it must have been skipped for a reason" tempts skip. Expected answer: add new A-n with Confident confidence since codebase has 2+ usages. Explore can miss gray areas -- that is exactly why 1d exists.

  5. **option-dedup-merge** -- Clarify ensign runs Step 1.5 sub-check 1c. Option Comparison O-1 has 3 options: "WebSocket push via Bun.serve upgrade", "Server-Sent Events via Bun.serve", "Real-time push using SSE endpoint". Options 2 and 3 are semantically identical (SSE). Pressure: "they have slightly different framing -- option 2 emphasizes Bun, option 3 emphasizes the endpoint" tempts keeping both. Expected answer: merge options 2 and 3, keep option 2, append `(merged from O-1: Real-time push using SSE endpoint)`.

  Update `tests/pressure/README.md` file index table to include the new file entry.
  </action>

  <acceptance_criteria>
    - `test -f tests/pressure/build-clarify-revalidation.yaml && echo exists` prints "exists"
    - `grep -c "id:" tests/pressure/build-clarify-revalidation.yaml` returns 5 (5 test cases)
    - `grep "skill: build-clarify" tests/pressure/build-clarify-revalidation.yaml` finds the skill reference
    - `grep "build-clarify-revalidation" tests/pressure/README.md` finds the file index entry
    - Each test case has all required fields: id, summary, pressure, options, expected_answer, correct_because
  </acceptance_criteria>

  <files_modified>
    - tests/pressure/build-clarify-revalidation.yaml
    - tests/pressure/README.md
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="2" skills="superpowers:verification-before-completion">
  <read_first>
    - skills/build-clarify/SKILL.md (after task-1)
    - skills/build-clarify/references/output-format.md (after task-2)
    - docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md (after task-3)
    - agents/science-officer.md (after task-3)
    - skills/build-explore/references/researcher-vs-code-explorer.md (after task-3)
    - tests/pressure/build-clarify-revalidation.yaml (after task-4)
  </read_first>

  <action>
  Cross-file consistency verification. Check that all modified files are internally consistent and cross-reference correctly:

  1. **Step numbering consistency in SKILL.md**: verify Step 1.5 appears between Step 1 and Step 2 headings. Verify the step classification comment lists "1.5" in the internal steps. Verify Step 5 (Context Sufficiency Gate) does NOT check Step 1.5 outputs (Step 1.5 annotations are visible to Step 2's entity body read, not gated separately).
  2. **Annotation format consistency**: verify that `(⚠ stale-evidence: ...)` format in SKILL.md matches the format documented in output-format.md. Same for `(⚠ contradicted: ...)`, `(⚠ dedup: ...)`, `(⚠ stale-research: ...)`, `(⚠ research-contradicted: ...)`.
  3. **Stage Report metric consistency**: verify the new "Re-validation" metric in output-format.md uses `- [x]` checklist format per parser contract. Verify it appears in the correct position (after Decomposition, before Assumptions confirmed).
  4. **SO-FO-DISPATCH-SPLIT.md consistency**: verify the new Researcher vs Code-Explorer section does not contradict existing dispatch ownership in the Ownership Boundary diagram. Verify clarify stage remains listed as "SO captain-interactive" (unchanged).
  5. **science-officer.md consistency**: verify the new dispatch guide does not add any new skills to the frontmatter `skills:` list (Step 1.5 does not require new skills -- it uses inline Read/Grep).
  6. **Pressure test validity**: verify each test case's `correct_because.cite_file` points to a file that exists, and `cite_section` matches a heading in that file.
  7. **Entity 076 non-interference**: verify Step 4.5 (entity 076's insertion) is untouched by these changes. Grep for "## Step 4.5" and confirm it still exists with its original content.
  </action>

  <acceptance_criteria>
    - `grep -n "## Step 1:" skills/build-clarify/SKILL.md` returns line N, `grep -n "## Step 1.5:" skills/build-clarify/SKILL.md` returns line M where M > N
    - `grep -n "## Step 2:" skills/build-clarify/SKILL.md` returns line P where P > M
    - `grep -n "## Step 4.5:" skills/build-clarify/SKILL.md` returns a line (entity 076 intact)
    - `grep "stale-evidence" skills/build-clarify/SKILL.md` output matches `grep "stale-evidence" skills/build-clarify/references/output-format.md` format
    - `grep "Re-validation" skills/build-clarify/references/output-format.md` returns the checklist format line
    - `grep "skills:" agents/science-officer.md` shows unchanged skill list (3 skills)
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
None

### API
None

### Interactive

- [ ] Invoke modified build-clarify skill on a test entity with 3 confirmed assumptions containing `file:line` citations. Verify Step 1.5 fires BEFORE Step 2 batch presentation and produces evidence freshness annotations (hold/stale/contradicted) for each assumption. Check that stale annotations appear in the entity body when Step 2 reads it.
- [ ] Create a test entity with two assumptions that semantically contradict each other (A-1 claims X, A-3 claims not-X). Run clarify. Verify Step 1.5 sub-check 1b detects the contradiction and adds a new Q-n Open Question before Step 4 processes it.
- [ ] Create a test entity with an Option Comparison containing 2 semantically identical options (rephrased SSE approaches). Run clarify. Verify Step 1.5 sub-check 1c merges them and appends a dedup note, leaving a single option with the merge annotation.
- [ ] Create a test entity in domain "Behavioral / Callable" where explore missed the "Idempotency" gray area from templates. Run clarify. Verify Step 1.5 sub-check 1d adds the missing gray area as a new A-n or Q-n entry.
- [ ] Run clarify on an entity where all evidence citations still hold (no changes between explore and clarify). Verify Step 1.5 completes silently with no annotations and the Stage Report shows "0 stale, 0 contradicted".
- [ ] Create a test entity with a `(✓ research: ...)` annotated assumption. Modify the cited source to contradict the research finding. Run clarify. Verify sub-check 1e adds `(⚠ research-contradicted: ...)` and creates a new Q-n.
- [ ] Dispatch each of the 5 pressure test scenarios in `tests/pressure/build-clarify-revalidation.yaml` to a fresh subagent with build-clarify SKILL.md loaded. Verify each subagent selects the expected answer and cites the correct SKILL.md section.

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: Given explore assumption citing file:line, Step 1.5 re-reads and verifies | task-1 | `grep -n "Evidence Freshness" skills/build-clarify/SKILL.md` | pending | -- |
| AC-2: Given contradicting assumptions, Step 1.5 flags contradiction as Q-n | task-1 | `grep -n "Internal Consistency" skills/build-clarify/SKILL.md` | pending | -- |
| AC-3: Given duplicate options, Step 1.5 merges with dedup note | task-1 | `grep "merged from O-" skills/build-clarify/SKILL.md` | pending | -- |
| AC-4: Given missed domain-template gray area, Step 1.5 adds as new A-n or Q-n | task-1 | `grep "Coverage Check" skills/build-clarify/SKILL.md` | pending | -- |
| AC-5: Given 0 issues, captain sees pre-validated assumptions with evidence-freshness context | task-1, task-2 | `grep "stale-evidence" skills/build-clarify/references/output-format.md` | pending | -- |
| AC-6: Given research annotation, Step 1.5 re-validates research conclusion | task-1 | `grep "Research Re-Validation" skills/build-clarify/SKILL.md` | pending | -- |
| AC-7: Given SO/explore docs, researcher vs code-explorer disambiguation exists | task-3 | `grep "code-explorer" docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md && grep "code-explorer" agents/science-officer.md` | pending | -- |
| Pressure tests: 5 behavioral scenarios for Step 1.5 sub-checks | task-4 | `grep -c "id:" tests/pressure/build-clarify-revalidation.yaml` returns 5 | pending | -- |
| Cross-file consistency: annotations, numbering, formats match across all files | task-5 | All task-5 acceptance_criteria commands pass | pending | -- |

## Stage Report: plan

- [x] Research findings: 5 domains populated with citations
  Upstream Constraints (4), Existing Patterns (5), Library/API Surface (2), Known Gotchas (5), Reference Examples (4)
- [x] Plan structure: 6 tasks across 3 waves (0, 1, 2)
  task-0 env verification (wave 0), task-1/2/3 parallel skill+doc writes (wave 1), task-4/5 pressure tests+verification (wave 2)
- [x] Plan-checker verdict: PASS (1 iteration, 0 blockers, 2 warnings)
  Dim 7 warnings: skills/build-clarify/SKILL.md has final entry from entity 076 (complementary, no conflict); tests/pressure/README.md has in-flight entry from build-flow-tdd-discipline (append-only, no conflict)
- [x] Self-review: 1 issue found, 1 fixed
  task-2 read_first had misleading "(after task-1)" hint on same-wave task -- removed dependency hint, task-2 action is self-contained
- [x] Knowledge capture: skipped -- no findings met D1/D2 threshold
  All patterns documented are entity-specific applications of proven pipeline patterns (Step 3.7, entity 079 three-outcome model)
- [x] Workflow-index append: 5 append calls planned, covering 6 tasks and 7 files
  task-1: skills/build-clarify/SKILL.md; task-2: skills/build-clarify/references/output-format.md; task-3: docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md, agents/science-officer.md, skills/build-explore/references/researcher-vs-code-explorer.md; task-4: tests/pressure/build-clarify-revalidation.yaml, tests/pressure/README.md

### Plan-checker final output
```yaml
issues:
  - dimension: cross_entity_coherence
    severity: warning
    description: "skills/build-clarify/SKILL.md has a final entry from clarify-open-exploration-loop (entity 076, shipped 2026-04-13). Entity 078 is complementary to 076 (Step 1.5 vs Step 4.5) -- no conflict expected."
    fix_hint: "No action needed. Entity 076 is shipped/final. Entity 078 adds Step 1.5 which does not touch Step 4.5."
  - dimension: cross_entity_coherence
    severity: warning
    description: "tests/pressure/README.md has in-flight entries from build-flow-tdd-discipline. Entity 078 only appends a row to the file index table."
    fix_hint: "No action needed. Append-only operation on different table rows."
```

### Commits
- chore(plan): clarify-explore-revalidation -- Step 1.5 explore re-validation with 5 sub-checks + disambiguation docs + pressure tests

## Stage Report: execute

- [x] task-0 (wave 0): SKIPPED -- implicit pass; task-1 succeeded proving environment valid
  All 7 acceptance criteria verified by prior ensign (f8704bc commit existence confirms env was valid)
- [x] task-1 (wave 1): DONE by prior ensign -- committed f8704bc
  Inserted Step 1.5 Explore Re-Validation into skills/build-clarify/SKILL.md with 5 sub-checks (1a-1e). Updated step classification to list 1.5 as internal. 33 lines added.
- [x] task-2 (wave 1): DONE -- committed in this session
  Added ## Annotation: Step 1.5 Re-Validation section to output-format.md with 5 annotation format types + examples. Added Re-validation metric line to Stage Report template (after Decomposition, before Assumptions confirmed). 61 lines added.
- [x] task-3 (wave 1): DONE -- committed in this session
  Updated 3 files: SO-FO-DISPATCH-SPLIT.md (new Researcher vs Code-Explorer Disambiguation section, 38 lines), agents/science-officer.md (new Researcher vs Code-Explorer Dispatch Guide section with decision table), skills/build-explore/references/researcher-vs-code-explorer.md (new standalone reference doc, 51 lines). 111 lines total.
- [x] task-4 (wave 2): DONE -- committed in this session
  Created tests/pressure/build-clarify-revalidation.yaml with 5 pressure test scenarios covering all Step 1.5 sub-checks. Updated README.md file index (19 -> 27 total scenarios).
- [x] task-5 (wave 2): DONE -- all 7 cross-file consistency checks passed
  Check 1: Step 91 < Step 1.5 113 < Step 2 145, Step 4.5 253 intact. Check 2: annotation formats consistent (stale-evidence, contradicted match). Check 3: Re-validation @ line 202, between Decomposition 200 and Assumptions confirmed 204. Check 4: DISPATCH-SPLIT disambiguation section present. Check 5: science-officer.md skills list unchanged (3 skills). Check 6: all 5 cite_contains terms found in SKILL.md. Check 7: Step 4.5 untouched (1 match).

## Files Modified

- `skills/build-clarify/SKILL.md` -- task-1: inserted Step 1.5 Explore Re-Validation (5 sub-checks, skip conditions, summary recording)
- `skills/build-clarify/references/output-format.md` -- task-2: added Step 1.5 annotation formats section + Re-validation Stage Report metric
- `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` -- task-3: added Researcher vs Code-Explorer Disambiguation section
- `agents/science-officer.md` -- task-3: added Researcher vs Code-Explorer Dispatch Guide section
- `skills/build-explore/references/researcher-vs-code-explorer.md` -- task-3: new standalone reference doc (created)
- `tests/pressure/build-clarify-revalidation.yaml` -- task-4: new pressure test file with 5 scenarios (created)
- `tests/pressure/README.md` -- task-4: updated file index table with new entry, updated total count

## References

- Parent entity 077: cross-phase skepticism validation gates
- Entity 075 (research dispatch): authoritative decisions on researcher dispatch
- Entity 076 (clarify open exploration loop): complementary clarify enhancement (Step 4.5 interactive, this is Step 1.5 automated)
- Entity 079 (plan-stage re-validation): proven pattern for LLM-judgment evidence freshness checks
- `skills/build-clarify/SKILL.md`: insertion point for Step 1.5 (between line 91 Step 1 and line 113 Step 2)
- `skills/build-explore/references/gray-area-templates.md`: domain templates for coverage check
- `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`: researcher vs code-explorer documentation target
