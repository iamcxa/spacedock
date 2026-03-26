---
id: 043
title: Stage completion checklist for ensign reporting
status: implementation
source: CL
started: 2026-03-26T00:00:00Z
completed:
verdict:
score: 0.80
worktree: .worktrees/ensign-stage-completion-checklist
---

Ensigns currently report completion as free-form text. This lets them rationalize skipping steps without the first officer noticing until it's too late (e.g., skipping the test harness and burying the rationale in a paragraph).

Add a structured checklist that ensigns must fill out when completing a stage. Items come from two sources:

1. **Stage-level requirements** — defined in the README stage definition (e.g., "run tests from Testing Resources section"). These apply to every entity passing through that stage.
2. **Entity-level acceptance criteria** — from the entity body. These are task-specific.

Each item gets a status: done, skipped (with rationale), or failed. The ensign reports the filled checklist to the first officer. The first officer's job is to review the checklist and push back on invalid skip rationales — separating execution from judgment.

Motivated by: a validation ensign skipping the commission test harness and self-approving the skip as reasonable.

## Problem Statement

Ensign completion messages are free-form text. This creates two failures:

1. **Ensigns can skip steps silently** — there's no structure forcing them to account for each requirement, so omissions blend into the summary prose.
2. **First officers can't efficiently review** — they must parse paragraphs to figure out what was done vs. skipped, and buried rationales are easy to miss under time pressure.

The root cause is that execution and judgment are conflated: the ensign both decides what to do and evaluates whether skipping something is acceptable. The first officer has no structured signal to review.

## Proposed Approach

### Checklist item sources

Items come from two places, assembled at dispatch time by the first officer:

1. **Stage-level requirements** — Extracted from the README stage definition. These are the "Outputs" bullets and any special instructions (like the validation stage's Testing Resources reference). They apply to every entity passing through that stage.

2. **Entity-level acceptance criteria** — Extracted from the entity body. These are task-specific criteria written during ideation. The first officer parses them from the entity markdown at dispatch time.

The first officer assembles the combined checklist and includes it in the ensign prompt as a numbered list.

### Checklist format in the ensign prompt

The first officer includes the checklist in the ensign dispatch prompt as a section like:

```
### Completion checklist

Report the status of each item when you send your completion message.
Mark each: DONE, SKIPPED (with rationale), or FAILED (with details).

Stage requirements:
1. {requirement from README stage definition}
2. {requirement from README stage definition}

Acceptance criteria:
3. {criterion from entity body}
4. {criterion from entity body}
```

### Ensign completion report format

The ensign's completion message replaces the current free-form summary with a structured report:

```
Done: {entity title} completed {stage}.

### Checklist

1. {item text} — DONE
2. {item text} — SKIPPED: {rationale}
3. {item text} — DONE
4. {item text} — FAILED: {details}

### Summary
{brief description of what was accomplished}
```

Each item must appear in the report. The ensign cannot omit items — the numbered list from the prompt must be reflected 1:1 in the completion message.

### First officer review procedure

When the first officer receives a checklist completion:

1. **Completeness check** — Verify every item from the dispatched checklist appears in the report. If any are missing, send the ensign back to account for them.
2. **Skip review** — For each SKIPPED item, evaluate the rationale. The first officer's job is judgment: is this skip genuinely acceptable, or is the ensign rationalizing? If the rationale is weak (e.g., "seemed unnecessary", "ran out of time"), push back and ask the ensign to either do the item or provide a stronger justification.
3. **Failure triage** — For FAILED items, determine whether the failure blocks progression. In gate stages (like validation), any failure typically means REJECTED. In non-gate stages, failures may be acceptable depending on context — escalate to the captain if unclear.
4. **Gate decision** — At gate stages, the first officer reports the checklist to the captain with its own assessment of skip rationales, rather than just forwarding the ensign's self-assessment.

### Where this fits in the existing flow

The changes touch two places in the first-officer template:

1. **Dispatch (ensign prompt construction)** — The first officer already reads the README stage definition and entity body before dispatching. The addition is: extract checklist items from both sources and include the `### Completion checklist` section in the ensign prompt. This applies to both the initial dispatch Agent() call and the SendMessage() reuse path.

2. **Event loop (completion handling)** — Step 6 of the dispatch procedure gains a checklist review sub-step between receiving the ensign's message and the gate check. The first officer parses the checklist, evaluates completeness and skip rationales, and may send the ensign back before proceeding to the gate.

No changes to the README schema, entity format, or stage definitions. The checklist is an overlay on the existing dispatch/completion protocol.

## Acceptance Criteria

1. The first-officer template includes instructions for extracting checklist items from (a) the README stage definition and (b) the entity body's acceptance criteria.
2. The ensign prompt template includes a `### Completion checklist` section with numbered items and instructions to report each as DONE/SKIPPED/FAILED.
3. The ensign completion message template uses the structured checklist format instead of free-form summary.
4. The first-officer template includes a checklist review procedure: completeness check, skip rationale review, failure triage.
5. The SendMessage reuse path (step 6b) also includes the checklist in the next-stage message.
6. At gate stages, the first officer's report to the captain includes the checklist with the first officer's assessment of skip rationales.

## Open Questions (Resolved)

**Q: Should the ensign also write the checklist into the entity file body?**
A: No. The checklist is an operational artifact in the completion message. The entity body captures the substantive output (implementation summary, validation report). Mixing operational protocol into entity content would clutter the files.

**Q: Should checklist items be machine-parseable (YAML, JSON)?**
A: No. The consumers are LLM agents (first officer, captain), not scripts. Markdown with a consistent text format (item — STATUS: rationale) is readable by both agents and humans, and avoids format fragility.

**Q: What if the entity body has no explicit acceptance criteria?**
A: The stage-level requirements still apply. The entity-level section of the checklist is simply empty. The first officer should note this when reporting to the captain at gate stages — a task without acceptance criteria is harder to validate.

## Implementation Summary

All changes are in `templates/first-officer.md`. No changes to the README schema, entity format, or commission skill.

### Changes made

**Dispatching step 3 — Assemble completion checklist:** Added between step 2 (read stage definition) and the concurrency check. The first officer builds a numbered checklist from two sources: stage requirements (from README **Outputs** bullets) and entity-level acceptance criteria (from the entity body). Items are numbered sequentially across both sources.

**Ensign prompt templates (both main and worktree paths):** Added a `### Completion checklist` section with the `[CHECKLIST]` placeholder and instructions to report each item as DONE, SKIPPED (with rationale), or FAILED (with details). Updated the completion message format to use `### Checklist` and `### Summary` sections instead of free-form text.

**Step 7 — Checklist review:** Added between ensign completion and the approval gate check. Three sub-steps: (a) completeness check — verify all items present, (b) skip review — evaluate rationale quality, (c) failure triage — assess whether failures block progression.

**Step 8b — SendMessage reuse path:** Updated to assemble a new checklist for the next stage and include the `### Completion checklist` section in the reuse message.

**Step 8c — Gate reporting:** Updated to include the ensign's checklist with the first officer's assessment of skip rationales, failure impact, and overall recommendation when reporting to the captain.

**Event loop:** Added checklist review as step 2 between receiving the worker message and the gate check.

**Step renumbering:** Steps 6-8 became 7-10 to accommodate the new checklist review step.

## Validation Report

### Commission test harness

Ran `bash scripts/test-commission.sh` — 59/59 checks passed. The test harness validates that the generated first-officer template is structurally correct, has all guardrails, has no leaked template variables or absolute paths, and produces a working status script with valid entity frontmatter.

### Acceptance criteria verification

All six acceptance criteria were verified by reading the implementation diff and the final `templates/first-officer.md`:

1. **Checklist extraction instructions** — PASSED. Dispatching step 3 "Assemble completion checklist" instructs the first officer to extract items from both the README stage definition's Outputs bullets and the entity body's acceptance criteria section. Handles the no-acceptance-criteria case explicitly.

2. **Ensign prompt `### Completion checklist` section** — PASSED. Both the main dispatch prompt (line 64) and worktree dispatch prompt (line 102) include the `### Completion checklist` section with `[CHECKLIST]` placeholder, DONE/SKIPPED/FAILED instructions, and the "Every checklist item must appear" constraint.

3. **Structured completion message format** — PASSED. Both prompts specify `### Checklist` and `### Summary` sections in the ensign's SendMessage template, replacing the old free-form `"Summary: {brief description}"` format.

4. **Checklist review procedure** — PASSED. Step 7 includes three sub-steps: (a) completeness check with pushback template, (b) skip rationale review with weak-rationale examples and pushback template, (c) failure triage with gate-stage blocking logic.

5. **SendMessage reuse path includes checklist** — PASSED. Step 8b's reuse path explicitly says "assemble a new checklist for the next stage (following step 3)" and the SendMessage template includes the `### Completion checklist` section with `[CHECKLIST]` placeholder.

6. **Gate reporting includes checklist with assessment** — PASSED. Step 8c's gate reporting now includes five specific items: the ensign's full checklist, first officer's judgment on skip rationales, impact assessment for failures, explicit note if no acceptance criteria, and overall recommendation.

### Internal consistency

All cross-references between steps were verified:
- Step 7 → step 8, step 8b → step 9 (merge), step 8b reuse → step 3 and step 7, step 8c approve → step 8b/step 9, step 8c redo → step 7, step 8c discard → step 10
- Event loop steps 2-3 reference dispatching steps 7-8 correctly

### Test harness coverage gap

The current test harness (`scripts/test-commission.sh`) validates template structure but has no checks specific to the checklist feature. The following checklist-related assertions could be added to the test harness for future protection:

1. **Generated first-officer contains checklist assembly instructions** — `grep -q "Assemble completion checklist\|completion checklist" "$FO"` (verifies the checklist protocol survived commission generation)
2. **Generated first-officer contains checklist review procedure** — `grep -q "Checklist review\|checklist review" "$FO"` (verifies the review step is present)
3. **Generated first-officer ensign prompt has checklist section** — `grep -q "Completion checklist" "$FO"` (verifies ensign prompt includes the checklist section)

These are straightforward grep checks that fit the existing test pattern. They would catch a regression where the checklist feature is dropped from the template.

### Analysis: Can we test the "ensign skips checklist" failure mode?

The captain asked whether we can write a test that catches an ensign skipping checklist items or rationalizing skips. The original failure pattern was:

1. Ensign dispatched for validation
2. Ensign skips running the test harness
3. Ensign reports PASSED without the test evidence
4. First officer doesn't catch it
5. Captain catches it

**What the checklist protocol changes:** The checklist forces the ensign to explicitly account for every item (DONE/SKIPPED/FAILED). The first officer now has a structured signal to review, with instructions to push back on weak skip rationales. This converts silent omission into visible SKIPPED entries that trigger review.

**What's testable vs. not:**

- **Testable (template level):** We can verify the generated template contains the checklist protocol, review instructions, and pushback templates. The three grep checks above cover this. This is what the test harness is designed for.

- **Not testable in the current test harness (runtime behavior):** Whether an LLM ensign actually follows the checklist instructions, or whether the first officer actually pushes back on weak rationales, is a runtime behavior question. The test harness runs commission (template generation), not the first-officer workflow. Testing runtime compliance would require a different kind of test — one that runs the first-officer agent with a mock entity through dispatch/completion/review. That's a substantial new test infrastructure beyond the scope of this task.

- **Partially addressable (structural):** The checklist protocol itself is the mitigation. The key design insight is separation of concerns: the ensign must account for every item (execution), and the first officer evaluates skip rationales (judgment). Even if an ensign marks something SKIPPED with a weak rationale, the first officer's review procedure is now explicit, with examples of weak rationales to reject. The structured format makes it much harder for a skip to go unnoticed compared to free-form prose.

**Recommendation:** Add the three template-level grep checks to `test-commission.sh` to prevent regressions. Runtime compliance testing (did the ensign actually follow the protocol?) would require an integration test that runs the full agent dispatch loop, which is a different effort and should be a separate task if the captain wants it.

### Verdict

PASSED — All acceptance criteria met. Implementation is clean, internally consistent, and the commission test harness passes. The template changes are minimal and correctly scoped to `templates/first-officer.md`.
