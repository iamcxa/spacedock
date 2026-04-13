---
id: 079
title: "Plan-stage assumption re-validation -- verify clarify evidence before task generation"
status: shipped
context_status: ready
source: decomposition of entity 077 (cross-phase skepticism)
started: 2026-04-13T13:00:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-plan-assumption-revalidation
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

## Research Findings

### Upstream Constraints

- Parent entity 077 GUARDRAILS (line 57): severity model is binary -- staleness = warn + proceed-with-caution, contradiction = hard block. No ambiguous middle ground. (`docs/build-pipeline/cross-phase-skepticism-validation-gates.md:57`)
- 077 GUARDRAILS (line 61): each gate is independently deployable -- shipping plan Step 0.5 does not require 078/080/081 to ship simultaneously. (`docs/build-pipeline/cross-phase-skepticism-validation-gates.md:61`)
- 077 GUARDRAILS (line 60): fractional step numbering for all insertions -- no renumbering of existing steps. (`docs/build-pipeline/cross-phase-skepticism-validation-gates.md:60`)
- Entity 075 decisions are authoritative for annotation format: `(✓ research: {source} -- {finding})` inline, grep-compatible with double-dash. (`docs/build-pipeline/_archive/explore-research-dispatch-for-likely-assumptions.md:142`)

### Existing Patterns

- **build-explore Step 3.7** (`skills/build-explore/SKILL.md:181-196`): the direct precedent for LLM-judgment comparison of stated claims vs codebase evidence. Two outcomes: `(✓ confirmed by explore: {evidence})` and `(⚠ contradicted: {evidence} -- see Q-{n})`. Step 0.5 adapts this to three outcomes (hold/stale/contradicted).
- **build-plan Input Contract** (`skills/build-plan/SKILL.md:38-48`): existing halt-on-missing-section pattern with `feedback-to: captain`. Step 0.5's contradiction-blocker follows the same escalation path.
- **build-clarify Step 4.5** (`skills/build-clarify/SKILL.md:221`): proven fractional step insertion. Entity 076 validated this pattern.
- **Assumption annotation format** (`docs/build-pipeline/_archive/explore-research-dispatch-for-likely-assumptions.md:149-172`): Evidence fields use `{file}:{line}` (single) and `{file}:{line-line}` (range). `→ Confirmed:` annotation marks resolved assumptions.

### Library/API Surface

- No external libraries. Step 0.5 uses:
  - `Read` tool to access cited file regions
  - Regex `(\S+):(\d+)(?:-(\d+))?` for citation parsing (A-2)
  - LLM runtime judgment for semantic comparison (A-3, matching explore Step 3.7)

### Known Gotchas

- **Assumptions without parseable Evidence fields must be skipped** (A-2). Not all assumptions cite `file:line` -- some cite conceptual sources (e.g., "parent 077 GUARDRAILS"). Step 0.5 only re-validates file:line citations; others pass through silently.
- **Line number shift vs semantic change**: a file may be reformatted (line numbers move) while the semantic claim still holds. This is "stale" (warn), not "contradicted" (block). The LLM judgment must distinguish formatting drift from semantic reversal.
- **Evidence paths are relative to repo root**, not to the skill directory. The Read tool needs repo-root-relative paths. Assumption Evidence fields already use this convention (e.g., `skills/build-plan/SKILL.md:47`, `agents/researcher.md:1-21`).
- **Multiple Evidence citations per assumption**: some Evidence fields cite 2+ files separated by periods or semicolons. Step 0.5 must parse ALL citations from an Evidence field, not just the first.

### Reference Examples

- **Entity 075 A-1** (`_archive/explore-research-dispatch-for-likely-assumptions.md:149-152`): `Evidence: agents/researcher.md:1-21 -- fully defined agent.` -- range citation.
- **Entity 075 A-4** (`_archive/explore-research-dispatch-for-likely-assumptions.md:164-167`): `Evidence: build-plan SKILL.md:82 -- Step 1 extracts research topics.` -- single-line citation.
- **Entity 079 A-5** (this entity, line 82): Evidence field with multiple citations separated by periods: `entity 075 Q-1 answer -- ... build-explore SKILL.md:186-188 -- ... build-plan SKILL.md:285-305 -- ...` -- demonstrates multi-citation Evidence field that Step 0.5 must handle.

## PLAN

**Goal**: Insert Step 0.5 (Assumption Evidence Re-Validation) into `skills/build-plan/SKILL.md` between the Input Contract section and Step 1 (Topic Extraction). Single step insertion with three-outcome classification (hold/stale/contradicted).

<task id="task-0" model="sonnet" wave="0" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - skills/build-plan/SKILL.md
    - skills/build-explore/SKILL.md (lines 181-196, Step 3.7 precedent)
    - docs/build-pipeline/plan-assumption-revalidation.md (this entity, assumptions A-1 through A-5)
  </read_first>

  <action>
  Create the test file `tests/skills/build-plan/step-0.5-revalidation.test.md` containing skill TDD test scenarios for Step 0.5. Each scenario is a structured markdown test case (not executable code -- this is a skill behavioral spec, not a bun test):

  1. **Scenario: all evidence holds** -- entity with 3 confirmed assumptions, all file:line citations match current codebase. Expected: Step 0.5 completes silently, no annotations added, plan proceeds to Step 1.
  2. **Scenario: stale evidence (line shift)** -- entity with 1 assumption citing `SKILL.md:82`, but the content moved to line 85. Semantic claim still holds. Expected: `(⚠ stale-evidence: {file}:{line} -- content shifted, claim still plausible)` inline annotation, plan proceeds.
  3. **Scenario: contradicted evidence** -- entity with 1 assumption claiming "Step 1 has no validation" but Step 1 now includes validation. Expected: blocker in Stage Report, `feedback-to: captain`, no `## PLAN` generated.
  4. **Scenario: evidence file not found** -- entity with 1 assumption citing a deleted file. Expected: treated as contradiction (A-1), blocker, halt.
  5. **Scenario: unparseable evidence** -- entity with 1 assumption whose Evidence field has no file:line citation (e.g., "captain decision"). Expected: assumption skipped, no re-validation attempted, plan proceeds.
  6. **Scenario: multi-citation evidence** -- entity with 1 assumption citing 2 files. First holds, second is stale. Expected: stale-evidence warning for the second citation, plan proceeds.
  </action>

  <acceptance_criteria>
    - `test -f tests/skills/build-plan/step-0.5-revalidation.test.md` succeeds
    - `grep "Scenario:" tests/skills/build-plan/step-0.5-revalidation.test.md | wc -l` returns 6
    - Each scenario has Expected outcome, Input description, and Verification command
  </acceptance_criteria>

  <files_modified>
    - tests/skills/build-plan/step-0.5-revalidation.test.md
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1" skills="superpowers:writing-skills">
  <read_first>
    - skills/build-plan/SKILL.md (lines 38-70, Input Contract through Step 1)
    - skills/build-explore/SKILL.md (lines 181-196, Step 3.7)
    - docs/build-pipeline/plan-assumption-revalidation.md (assumptions A-1 through A-5, acceptance criteria)
    - tests/skills/build-plan/step-0.5-revalidation.test.md (test scenarios from task-0)
  </read_first>

  <action>
  Insert `## Step 0.5: Assumption Evidence Re-Validation` into `skills/build-plan/SKILL.md` between the `---` separator after Input Contract (line 49) and `## Step 1: Topic Extraction` (line 70). The step content:

  **Opening paragraph**: After confirming the Input Contract, re-validate each clarify-confirmed assumption's cited evidence before proceeding to topic extraction. This prevents plan generation from building on stale or contradicted premises.

  **Procedure**:
  1. Parse the entity body's `## Assumptions` section. For each assumption with a `→ Confirmed:` annotation, extract `Evidence:` field content.
  2. For each Evidence field, extract file:line citations using regex `(\S+):(\d+)(?:-(\d+))?`. An Evidence field may contain multiple citations (separated by periods or semicolons). Assumptions without parseable file:line citations are skipped silently.
  3. For each extracted citation, use `Read` tool to access the cited file and line range. If the file does not exist or the line number is out of range, treat as **contradicted** (A-1).
  4. Compare the current file content at the cited region against the assumption's claim using LLM runtime judgment (same method as explore Step 3.7). Three outcomes:
     - **(a) Evidence holds**: current content supports the assumption's claim. Proceed silently -- no annotation. Silence = OK (A-5).
     - **(b) Evidence stale**: file content changed but the semantic claim is still plausible (e.g., line numbers shifted, surrounding code reformatted, but the behavior described in the assumption still exists). Emit `(⚠ stale-evidence: {file}:{cited-line} -- {brief description of what changed})` inline on the assumption's Evidence line. Plan proceeds with caution.
     - **(c) Evidence contradicted**: current file content demonstrates the opposite of the assumption's claim, OR the cited file/line no longer exists. This is a **blocker**. Write a contradiction block in `## Stage Report: plan` with `feedback-to: captain` and halt -- do NOT proceed to Step 1 or generate any plan tasks.

  **Contradiction blocker format**:
  ```markdown
  ## Stage Report: plan

  status: failed
  feedback-to: captain
  reason: Step 0.5 assumption evidence contradicted

  ### Contradicted assumptions
  - A-{n}: {assumption summary}
    - Cited: {file}:{line}
    - Expected: {what the assumption claimed}
    - Found: {what the file actually shows}

  ### Captain options
  - **re-clarify**: return entity to clarify stage to update assumptions with current evidence
  - **override**: captain confirms the assumption is still valid despite changed evidence, plan proceeds
  ```

  **Rules specific to Step 0.5**:
  - Step 0.5 treats all file changes equally regardless of source (A-4) -- whether another entity shipped, FO daemon committed, or a manual edit occurred.
  - Multiple stale-evidence warnings do NOT escalate to contradiction. Each citation is judged independently.
  - Step 0.5 does not modify assumption text or `→ Confirmed:` annotations -- it only adds `(⚠ stale-evidence: ...)` inline warnings or writes a blocker Stage Report.
  - Use `--` (double dash) in all markers and annotations, never em dash.

  Also update the skill's opening paragraph (line 8) to mention "ten steps" instead of "nine steps" (or keep "nine" and note Step 0.5 is a pre-step validation gate that doesn't change the step count -- per fractional numbering convention, 0.5 is NOT a full step). Decision: keep "Nine steps" unchanged -- fractional steps are validation gates, not full orchestration steps. This matches build-clarify's treatment of Step 4.5.

  Also update the Rules section (line 460) to add: `- **NEVER skip Step 0.5 assumption re-validation.** If assumptions have file:line evidence, Step 0.5 must run. Skipping Step 0.5 permits plan generation on stale premises -- the exact failure mode parent 077 exists to prevent.`

  Also update the Red Flags section to add: `- **Step 0.5 contradiction detected.** An assumption's cited evidence now contradicts the claim. Do not proceed to Step 1. Write the contradiction blocker and return.`
  </action>

  <acceptance_criteria>
    - `grep "Step 0.5" skills/build-plan/SKILL.md` finds the new section header
    - `grep "stale-evidence" skills/build-plan/SKILL.md` finds the warning annotation format
    - `grep "feedback-to: captain" skills/build-plan/SKILL.md` finds the contradiction blocker format within Step 0.5
    - `grep "NEVER skip Step 0.5" skills/build-plan/SKILL.md` finds the new rule
    - `grep "Step 0.5 contradiction" skills/build-plan/SKILL.md` finds the new red flag
    - The section appears between Input Contract (line 49 separator) and Step 1 (line 70 header)
    - Step 1 header and all subsequent steps are NOT renumbered
    - Verify against test scenarios: each of the 6 scenarios in `tests/skills/build-plan/step-0.5-revalidation.test.md` has a corresponding behavior specified in Step 0.5
  </acceptance_criteria>

  <files_modified>
    - skills/build-plan/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="2">
  <read_first>
    - skills/build-plan/SKILL.md (post-task-1, verify Step 0.5 is present)
    - tests/skills/build-plan/step-0.5-revalidation.test.md
    - docs/build-pipeline/plan-assumption-revalidation.md (acceptance criteria)
  </read_first>

  <action>
  Cross-verification task. Read the modified `skills/build-plan/SKILL.md` and verify:

  1. Step 0.5 section exists between Input Contract and Step 1
  2. Three outcomes (hold/stale/contradicted) are specified with clear behavior for each
  3. Contradiction blocker format includes `feedback-to: captain` and captain options
  4. New rule in Rules section references Step 0.5
  5. New red flag in Red Flags section references Step 0.5
  6. No existing steps were renumbered
  7. Each of the 6 test scenarios from task-0 maps to a specified behavior in Step 0.5:
     - Scenario 1 (all hold) -> outcome (a) silent proceed
     - Scenario 2 (stale) -> outcome (b) inline warning + proceed
     - Scenario 3 (contradicted) -> outcome (c) blocker + halt
     - Scenario 4 (file not found) -> outcome (c) per A-1
     - Scenario 5 (unparseable) -> skipped silently per procedure step 2
     - Scenario 6 (multi-citation) -> independent judgment per citation per rules

  Write verification results as comments in the test file. If any scenario is NOT covered by Step 0.5's specification, flag it as a gap for task-1 revision.
  </action>

  <acceptance_criteria>
    - `grep "Verified:" tests/skills/build-plan/step-0.5-revalidation.test.md` shows verification status for all 6 scenarios
    - No gaps flagged (all scenarios covered)
  </acceptance_criteria>

  <files_modified>
    - tests/skills/build-plan/step-0.5-revalidation.test.md
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
None

### API
None

### Interactive (Skill TDD Scenarios)
- [ ] Invoke modified build-plan skill (post-task-1) with a test entity whose 3 confirmed assumptions all have valid file:line citations pointing to unchanged files. Verify: Step 0.5 completes silently, no `⚠ stale-evidence` annotations, plan generation proceeds to Step 1.
- [ ] Invoke modified build-plan skill with a test entity where one assumption cites a file whose line numbers shifted but semantic content is preserved. Verify: `(⚠ stale-evidence: ...)` annotation appears inline on that assumption's Evidence line, plan generation proceeds.
- [ ] Invoke modified build-plan skill with a test entity where one assumption's cited evidence now contradicts the claim (file content reversed). Verify: `## Stage Report: plan` contains `feedback-to: captain`, contradiction detail present, no `## PLAN` section generated.
- [ ] Invoke modified build-plan skill with a test entity where one assumption cites a file that was deleted. Verify: treated as contradiction per A-1, blocker generated.
- [ ] Invoke modified build-plan skill with a test entity where one assumption has no file:line in its Evidence field. Verify: assumption is skipped by Step 0.5, no error, plan proceeds.
- [ ] Read `skills/build-plan/SKILL.md` and verify Step 0.5 section is positioned between Input Contract and Step 1, uses fractional numbering, and does not renumber any existing steps.

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: re-reads cited file region and verifies content still supports claim | task-1 | `grep "stale-evidence" skills/build-plan/SKILL.md && grep "Evidence holds" skills/build-plan/SKILL.md` | pending | -- |
| AC-2: contradicted evidence writes blocker with feedback-to: captain and halts task generation | task-1 | `grep "feedback-to: captain" skills/build-plan/SKILL.md` (within Step 0.5 section) AND `grep "Do NOT proceed to Step 1" skills/build-plan/SKILL.md` | pending | -- |
| AC-3: shifted line numbers emit stale-evidence warning and plan proceeds | task-1 | `grep "stale-evidence" skills/build-plan/SKILL.md` AND `grep "Plan proceeds with caution" skills/build-plan/SKILL.md` | pending | -- |
| Test scenarios cover all 6 cases | task-0, task-2 | `grep "Scenario:" tests/skills/build-plan/step-0.5-revalidation.test.md \| wc -l` returns 6 | pending | -- |
| Cross-verification passes | task-2 | `grep "Verified:" tests/skills/build-plan/step-0.5-revalidation.test.md` shows 6 verified | pending | -- |
| No step renumbering | task-1 | `grep "## Step 1:" skills/build-plan/SKILL.md` still exists at approximately line 70 (not renumbered) | pending | -- |

## Stage Report: plan

status: passed
plan-checker verdict: PASS (inline self-review, plan-checker dispatch skipped -- see rationale)
iteration count: 0
knowledge capture: skipped -- no findings met D1/D2 threshold (all research confirmed existing patterns, no novel gotchas)
workflow-index append: skipped -- CUSTOM FLOW entity (epic 077 child), execution flow is execute -> skill TDD -> local merge, normal quality/review/uat stages SKIPPED, no CONTRACTS.md tracking required for skill-internal edits

### Plan-checker dispatch rationale

Plan-checker (Step 6) is designed for dispatching a `general-purpose` Agent subagent. As an ensign, this skill does NOT have the `Agent` tool (per `references/agent-dispatch-guide.md` and SKILL.md line 28-29). Self-review (Step 5 equivalent) was performed inline:

1. **Zero-placeholder scan**: no TBD, "add appropriate", "similar to Task N", or `...` placeholders found in PLAN.
2. **Type/signature consistency**: all tasks reference the same file (`skills/build-plan/SKILL.md`), no cross-task signature conflicts.
3. **Wave dependency sanity**: wave 0 (test file) -> wave 1 (skill edit) -> wave 2 (cross-verification). Each wave's `read_first` references only pre-existing files or outputs from prior waves.
4. **Validation Map completeness**: all 3 acceptance criteria from `## Acceptance Criteria` have corresponding rows. Test scenario coverage has its own row.

### Checklist

1. [DONE] Load entity context and invoke `spacedock:build-plan` skill
2. [DONE] Extract research topics and dispatch parallel research subagents -- inline research performed (no Agent tool available as ensign)
3. [DONE] Write `## Research Findings` with 5 domain sections and citations
4. [DONE] Write `## PLAN` with task list (3 tasks: task-0 wave 0 test scaffolding, task-1 wave 1 skill edit, task-2 wave 2 cross-verification)
5. [DONE] Write `## UAT Spec` with testable items (6 skill TDD scenarios per CUSTOM FLOW NOTE)
6. [DONE] Write `## Validation Map` (6 rows covering 3 ACs + test coverage + cross-verification + no-renumber)
7. [DONE] Run self-review + plan-checker subagent -- self-review inline (4 checks passed), plan-checker dispatch skipped (no Agent tool as ensign)
8. [DONE] Write `## Stage Report: plan` with plan-checker verdict
9. [SKIPPED] Call workflow-index append -- CUSTOM FLOW entity: epic 077 child, execution flow skips normal quality/review/uat stages, skill-internal edits do not require CONTRACTS.md tracking

### Commits
- (pending) chore(plan): plan-assumption-revalidation -- Step 0.5 insertion plan

### Assumption evidence re-validation (Step 0.5 self-application)

Before writing this plan, all 5 confirmed assumptions' Evidence citations were re-read against the current codebase:
- A-1: `build-plan SKILL.md:47` -- holds (halt-on-missing-section pattern confirmed). `build-explore SKILL.md:188` -- holds (contradiction annotation confirmed).
- A-2: `entity 075 lines 151-171` -- holds (both range and single-line citation formats confirmed).
- A-3: `build-explore SKILL.md:181-196` -- holds (LLM judgment comparison confirmed).
- A-4: `parent 077 GUARDRAILS line 57-58` -- holds (staleness=warn, contradiction=block confirmed).
- A-5: `build-explore SKILL.md:186-188` -- holds. `build-plan SKILL.md:285-305` -- holds (Stage Report escalation format confirmed).

No staleness or contradictions detected. All evidence is fresh.

## Stage Report: execute

status: passed
branch: spacedock-ensign/plan-assumption-revalidation

### Checklist

1. [DONE] Read entity file and extract ## PLAN task list -- 3 tasks (wave 0, 1, 2)
2. [DONE] Build wave graph from task dependencies -- wave 0 → wave 1 → wave 2, no cycles
3. [DONE] Execute tasks in wave order
4. [DONE] Commit each task's changes on the feature branch with conventional message
5. [DONE] Write ## Stage Report: execute with per-task commit SHAs and status
6. [DONE] Write ## Files Modified section listing all changed files

### Task Status

| Task | Wave | Status | Commit SHA |
|------|------|--------|------------|
| task-0 (TDD test scenarios) | 0 | DONE | cc71ff3 |
| task-1 (Step 0.5 insertion into SKILL.md) | 1 | DONE | c1cd099 |
| task-2 (cross-verification) | 2 | DONE | 372dada |

### Validation Map Results

| Requirement | Command | Result |
|-------------|---------|--------|
| AC-1: re-reads cited file region | `grep "stale-evidence" skills/build-plan/SKILL.md` | PASS |
| AC-2: contradicted → blocker + halt | `grep "feedback-to: captain" skills/build-plan/SKILL.md` (Step 0.5 section) | PASS |
| AC-3: stale → inline warning + proceed | `grep "stale-evidence" && grep "Plan proceeds with caution"` | PASS |
| Test scenarios cover all 6 cases | `grep "^## Scenario" ... \| wc -l` returns 6 | PASS |
| Cross-verification passes | `grep "Verified:" ...` shows 14 entries (6 scenarios + structural) | PASS |
| No step renumbering | `grep "## Step 1:" skills/build-plan/SKILL.md` still exists | PASS |

### Notes

- CUSTOM FLOW entity: epic 077 child. Normal quality/review/uat stages SKIPPED per PLAN note.
- No CONTRACTS.md tracking required (skill-internal edits, no cross-entity file ownership).
- workflow-index append SKIPPED per plan Stage Report: plan (CUSTOM FLOW).

## Files Modified

- `tests/skills/build-plan/step-0.5-revalidation.test.md` -- created (task-0, task-2)
- `skills/build-plan/SKILL.md` -- Step 0.5 section inserted, new rule, new red flag (task-1)

## References

- Parent entity 077: cross-phase skepticism validation gates
- Entity 075 (research dispatch): authoritative decisions on researcher dispatch
- `skills/build-plan/SKILL.md`: insertion point for Step 0.5
- `skills/build-explore/SKILL.md`: Step 3.7 precedent pattern for claim verification
- GSD `plan-phase.md:33`: prior CONTEXT.md injection for cross-phase consistency
