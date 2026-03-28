---
id: 065
title: Clarify implementation vs validation boundaries for experimental tasks
status: ideation
source: CL
started: 2026-03-28T00:25:00Z
completed:
verdict:
score:
worktree:
---

Experimental tasks (like 058 terminology-experiment) blur the line between implementation and validation. The implementer builds infrastructure (harness, scripts, fixtures), but the experiment results are the actual deliverable. When the validator is told to "run the experiment," it ends up doing implementation work — producing the deliverable rather than verifying it.

In 058, the validator found and fixed harness bugs (token counting, team name collision, relative paths), then ran experiments and produced findings. This violated the independence principle that the validator agent type was designed to enforce (task 061).

## What needs clarifying

1. **README stage definitions** — implementation produces the deliverable (code, experiment results, analysis). Validation verifies the deliverable is sound. Current wording focuses on "write the code" which doesn't obviously cover "run the experiment and report results."

2. **FO validation dispatch** — the FO writes the validator's dispatch prompt. The dispatch should reinforce "verify the deliverable, don't produce it." The 058 dispatch explicitly said "RUN the experiment" which overrode the validator's built-in constraints.

## Scope

Changes to README stage definitions and/or FO template validation instructions. Possibly validator template if wording needs tightening. No infrastructure changes.

## Analysis

### Problem 1: README `implementation` stage definition is too narrow

Current wording (README.md lines 93-98):

> A task moves to implementation once its design is approved. The work here is to **write the code**, create the files, or make whatever changes the task describes.

The phrase "write the code, create the files" implies the deliverable is always source code or file artifacts. For experimental tasks, the deliverable includes the results of running the experiment — not just the infrastructure to run it. The implementer in 058 built the harness and templates but never ran the benchmark or produced findings. That left a gap the validator filled.

Similarly, for research tasks, the deliverable might be a document with analysis and conclusions. For test-suite tasks, the deliverable is working tests with passing results. The current wording doesn't clearly cover these cases.

### Problem 2: README `validation` stage definition doesn't draw the boundary explicitly

Current wording (README.md lines 100-111):

> The work here is to verify the implementation meets the acceptance criteria defined in ideation.

This is correct in principle but doesn't explicitly state: "The validator verifies existing deliverables; it does not produce them." The absence of this negative constraint means there's no guard against a dispatch prompt that tells the validator to produce the deliverable (which is what happened in 058).

### Problem 3: FO validation dispatch instructions conflate "run tests" with "produce results"

Current FO validation instructions (first-officer.md line 44):

> You are a validator. You read and judge — you do NOT write code or fix bugs. Determine what work was done in the previous stage. For code changes, check the README for a Testing Resources section — run applicable tests and include results (test failure means recommend REJECTED). For analysis or research, verify correctness and completeness against acceptance criteria. Adapt validation to what was actually produced. If you find issues, describe them precisely in your stage report with a REJECTED recommendation. If an implementer messages you with fixes, re-run tests and update your stage report, then send your updated completion message to the first officer.

This has two issues:
1. It says "run applicable tests" which is fine — running existing tests to verify is validation work. But it doesn't distinguish this from "run the experiment to produce results," which is implementation work.
2. The sentence "For analysis or research, verify correctness and completeness against acceptance criteria" is the right idea but it's too brief. It doesn't say "the analysis or research should already exist as a deliverable from implementation."

### Problem 4: Validator template is fine as-is

The validator template (validator.md) already says:

> You verify that implementation work meets acceptance criteria. You NEVER modify implementation code — you read, test, judge, and may write test cases.

And:

> Do NOT modify implementation code. If you find bugs, describe them precisely so an implementer can fix them.

This is sufficient. The validator template correctly frames validation as verifying existing work. The problem in 058 was not the validator template — it was the FO's dispatch prompt that explicitly told the validator to "RUN the experiment," which overrode the template's framing. The fix belongs in the FO's validation instructions (which the FO inserts into every validator dispatch prompt) and in the README stage definitions (which the FO copies verbatim into dispatch prompts).

## Proposed Changes

### Change 1: README `implementation` stage — broaden "deliverable" language

Current:
```
### `implementation`

A task moves to implementation once its design is approved. The work here is to write the code, create the files, or make whatever changes the task describes.

- **Inputs:** The fleshed-out task body from ideation with approach and acceptance criteria
- **Outputs:** Working code or artifacts committed to the repo, with a summary of what was built and where
- **Good:** Minimal changes that satisfy acceptance criteria, clean code, tests where appropriate
- **Bad:** Over-engineering, unrelated refactoring, skipping tests, ignoring edge cases identified in ideation
```

Proposed:
```
### `implementation`

A task moves to implementation once its design is approved. The work here is to produce the deliverable: write code, run experiments, generate analysis, or make whatever changes the task describes. Implementation is complete when the deliverable exists and is ready for independent verification.

- **Inputs:** The fleshed-out task body from ideation with approach and acceptance criteria
- **Outputs:** The deliverable committed to the repo (code, experiment results, analysis, test suites — whatever the task specifies), with a summary of what was produced and where
- **Good:** Minimal changes that satisfy acceptance criteria, clean code, tests where appropriate, deliverable is self-contained and verifiable
- **Bad:** Over-engineering, unrelated refactoring, skipping tests, ignoring edge cases identified in ideation, leaving the deliverable incomplete for validation to finish
```

Key changes:
- "write the code" becomes "produce the deliverable" with examples that include experiments and analysis
- Outputs broadened from "working code or artifacts" to explicitly include experiment results, analysis, test suites
- Added "deliverable is self-contained and verifiable" to Good criteria
- Added "leaving the deliverable incomplete for validation to finish" to Bad criteria
- Added closing sentence: implementation is complete when the deliverable exists and is ready for independent verification

### Change 2: README `validation` stage — add explicit boundary statement

Current:
```
### `validation`

A task moves to validation after implementation is complete. The work here is to verify the implementation meets the acceptance criteria defined in ideation.
```

Proposed:
```
### `validation`

A task moves to validation after implementation is complete. The work here is to verify the deliverable meets the acceptance criteria defined in ideation. The validator checks what was produced — it does not produce the deliverable itself.
```

Key change: One sentence added to draw the boundary explicitly. This sentence will appear in every validator's dispatch prompt (since the FO copies the stage definition verbatim).

### Change 3: FO validation instructions — reinforce boundary, distinguish "run tests" from "produce results"

Current (first-officer.md line 44):
```
**Validation instructions** (insert when dispatching a validation stage): You are a validator. You read and judge — you do NOT write code or fix bugs. Determine what work was done in the previous stage. For code changes, check the README for a Testing Resources section — run applicable tests and include results (test failure means recommend REJECTED). For analysis or research, verify correctness and completeness against acceptance criteria. Adapt validation to what was actually produced. If you find issues, describe them precisely in your stage report with a REJECTED recommendation. If an implementer messages you with fixes, re-run tests and update your stage report, then send your updated completion message to the first officer.
```

Proposed:
```
**Validation instructions** (insert when dispatching a validation stage): You are a validator. You read and judge — you do NOT produce the deliverable, write code, or fix bugs. The deliverable should already exist from the implementation stage. Determine what was produced in the previous stage. For code changes, check the README for a Testing Resources section — run applicable tests and include results (test failure means recommend REJECTED). For experiment results or analysis, verify that the results exist, the methodology was followed, and the conclusions are supported by the data — do not re-run experiments to produce new results. Adapt validation to what was actually produced. If the deliverable is missing or incomplete, that is itself a REJECTED finding. If you find issues, describe them precisely in your stage report with a REJECTED recommendation. If an implementer messages you with fixes, re-run tests and update your stage report, then send your updated completion message to the first officer.
```

Key changes:
- "you do NOT write code or fix bugs" becomes "you do NOT produce the deliverable, write code, or fix bugs"
- Added: "The deliverable should already exist from the implementation stage."
- "Determine what work was done" becomes "Determine what was produced"
- Added specific guidance for experiments/analysis: "verify that the results exist, the methodology was followed, and the conclusions are supported by the data — do not re-run experiments to produce new results"
- Added: "If the deliverable is missing or incomplete, that is itself a REJECTED finding."

### Change 4: Validator template — no changes needed

The validator template already correctly frames validation as verifying existing work. The problem was in the dispatch prompt (controlled by the FO template), not the agent template. Adding redundant boundary language to the validator template would be belt-and-suspenders with diminishing returns — the FO's validation instructions are the effective control point because they're inserted into every dispatch prompt.

## Edge Cases

### Experimental tasks (e.g., 058 terminology-experiment)
- **Implementation** builds the harness AND runs the experiment, producing results.
- **Validation** checks: did the experiment follow the methodology? Are the results plausible? Do the statistical tests match the design? Are there obvious errors in the data?
- The proposed wording handles this: "run experiments" is in the implementation outputs, and "verify that the results exist, the methodology was followed, and the conclusions are supported by the data" is in the validation instructions.

### Research tasks (deliverable is a document)
- **Implementation** produces the research document with analysis and conclusions.
- **Validation** checks: does the document address the problem statement? Are claims supported by evidence? Is the analysis complete per the acceptance criteria?
- The proposed wording handles this: "generate analysis" is in the implementation examples, and the validation stage says "checks what was produced — it does not produce the deliverable itself."

### Test-suite tasks (deliverable IS a test suite)
- **Implementation** writes the test suite and runs it, producing pass/fail results.
- **Validation** checks: do the tests cover the acceptance criteria? Are they testing real behavior (not mocked behavior)? Do they pass when run independently?
- This is the trickiest edge case. The validator running existing tests is clearly validation work. The validator writing NEW tests could be either — the validator template already permits creating test files ("You MAY create or modify test files to verify acceptance criteria"). The boundary: the validator can write supplementary tests to verify claims, but it doesn't write the test suite that IS the deliverable. The proposed wording handles this because the test suite is the deliverable, and "does not produce the deliverable itself" applies.

### Tasks where the implementer's infrastructure is broken
- In 058, the validator found and fixed harness bugs before running the experiment. Under the proposed wording, the validator would instead report "harness is broken, cannot verify results, REJECTED" and the implementer would fix the harness.
- This is the correct behavior — it maintains the independence principle. The validator shouldn't be fixing infrastructure it's supposed to be testing.

## Acceptance Criteria

1. README `implementation` stage definition uses "produce the deliverable" language that covers code, experiments, analysis, and test suites — not just "write the code"
2. README `validation` stage definition explicitly states the validator checks what was produced and does not produce the deliverable itself
3. FO validation instructions distinguish "run existing tests to verify" from "run experiments to produce results"
4. FO validation instructions state that a missing or incomplete deliverable is itself a REJECTED finding
5. Validator template requires no changes (or changes are justified against the current wording)
6. Edge cases (experimental, research, test-suite tasks) are covered by the proposed wording without special-case rules

## Stage Report: ideation

- [x] Current stage definitions analyzed — what's ambiguous about the implementation/validation boundary
  README implementation says "write the code" which doesn't cover experiments/analysis; validation lacks an explicit "don't produce the deliverable" boundary statement
- [x] FO validation dispatch instructions analyzed — where the boundary gets violated
  FO inserts validation instructions into every dispatch prompt; current wording doesn't distinguish "run tests to verify" from "run experiments to produce results," and lacks guidance for missing deliverables
- [x] Proposed wording changes for README stage definitions
  Implementation: "produce the deliverable" with examples (code, experiments, analysis, test suites). Validation: added "checks what was produced — does not produce the deliverable itself"
- [x] Proposed wording changes for FO template validation instructions
  Added "do NOT produce the deliverable," experiment-specific guidance ("verify results exist, methodology followed, conclusions supported — do not re-run"), and "missing deliverable = REJECTED"
- [x] Validator template assessed — changes needed or not, with rationale
  No changes needed. Validator template already correctly frames role as verifying existing work. The problem was the FO dispatch prompt overriding the template, not the template itself.
- [x] Edge cases considered — experimental tasks, research tasks, test-suite tasks
  Four edge cases analyzed: experiments (run = implementation, verify results = validation), research docs (produce = implementation, check claims = validation), test suites (write the suite = implementation, run supplementary checks = validation), broken infrastructure (report REJECTED, don't fix)
- [x] Acceptance criteria written — testable conditions for "done"
  Six criteria covering README changes, FO instruction changes, validator template assessment, and edge case coverage

### Summary

Analyzed the implementation/validation boundary problem through the lens of task 058 (where the validator produced experiment results instead of verifying them) and task 061 (which established the independence principle). The root cause is twofold: README stage definitions use code-centric language ("write the code") that doesn't cover non-code deliverables, and the FO validation instructions don't explicitly distinguish running tests to verify from running experiments to produce results. Proposed specific wording changes to the README implementation stage (broaden to "produce the deliverable"), the README validation stage (add boundary statement), and the FO validation instructions (experiment-specific guidance, missing-deliverable handling). The validator template needs no changes — the fix belongs in the stage definitions and FO instructions that flow into dispatch prompts.
