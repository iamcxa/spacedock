---
title: Ensign reuse across stages
status: validation
source: email-triage testflight
started: 2026-03-25T02:20:00Z
completed:
verdict:
score: 0.65
worktree: .worktrees/ensign-commission-fixes
---

## Problem Statement

The first-officer template in SKILL.md always shuts down an ensign after each stage completion and spawns a fresh one for the next stage (Dispatching step 6b). This is wasteful when consecutive stages share the same execution context (both on main, or both in the same worktree). The ensign loses all context — parsed data, entity understanding, codebase familiarity — and the fresh ensign must re-read and re-parse everything from scratch.

The email-triage pipeline demonstrated that reusing an ensign via SendMessage works well: after an ensign completes a stage, the first-officer sends it the next stage's instructions instead of shutting it down. The ensign retains context from the prior stage (e.g., knows entity IDs from intake without re-parsing) and proceeds immediately.

Current behavior (SKILL.md lines 479-481): on stage completion without an approval gate, the first officer always sends a shutdown_request and dispatches a new ensign. The worktree infrastructure already handles persistence (the entity's worktree survives across dispatches), but the ensign itself is discarded.

## When to Reuse vs Fresh Dispatch

Reuse is appropriate when:
- Consecutive stages share the same execution context (both `Worktree: No`, or both `Worktree: Yes` on the same entity's worktree)
- Context from the prior stage is valuable for the next stage (e.g., intake → execute, ideation → implementation)

Fresh dispatch is required when:
- The execution context changes (main → worktree, or worktree → main)
- Validation independence matters — the validator should not have been the implementer, to avoid confirmation bias (implementation → validation)

The decision rule: **reuse the ensign unless the next stage has a different worktree mode OR the next stage is a validation/verification stage that benefits from independence.** The README's stage definitions already declare `Worktree: Yes/No` per stage. We need a way to mark stages that require fresh eyes.

## Proposed Approach

### Change 1: Add `Fresh: Yes` stage property

Add an optional `Fresh: Yes` property to stage definitions in the README. When present, the first officer always spawns a fresh ensign for that stage, even if the worktree context is the same as the prior stage. The commission generates `Fresh: Yes` on validation stages by default (since validation should be independent of implementation).

The README generation template (SKILL.md lines 258-268) adds a new optional bullet:
```
- **Fresh:** {ONLY include this line for stages where an independent perspective matters, e.g., validation. Set to "Yes". OMIT for stages that benefit from retained context.}
```

The first-officer startup (step 3, "Parse stage properties") already extracts `Worktree` and `Approval gate` per stage. Add `Fresh` to that list with default `No`.

### Change 2: Modify the ensign lifecycle in the first-officer template

Replace the current step 6b (no approval gate path) in the first-officer template. Currently:

```
b. If no approval gate:
   - Send shutdown to the ensign
   - If more stages remain, dispatch a new ensign for the next stage
   - If terminal stage, proceed to step 7 (merge)
```

Replace with a reuse-aware flow:

```
b. If no approval gate:
   - Determine if the ensign can be reused for the next stage:
     - Reuse if: more stages remain AND next stage has the same Worktree mode
       AND next stage does NOT have Fresh: Yes
     - Fresh dispatch otherwise
   - If reusing: update frontmatter on main (set status to next stage, commit),
     then send the next stage's work to the existing ensign via SendMessage
     with the next stage's definition and instructions
   - If fresh dispatch: send shutdown to the ensign, then dispatch a new ensign
     for the next stage (re-enter step 1)
   - If terminal stage, proceed to step 7 (merge)
```

### Change 3: Define the reuse SendMessage format

When reusing an ensign, the first officer sends:
```
SendMessage(to="ensign-{slug}", message="Next stage: {next_stage_name}\n\n### Stage definition:\n\n[STAGE_DEFINITION copied from README]\n\nContinue working on {entity title}. Do the work described in the stage definition. Update the entity file body (not frontmatter) with your findings or outputs.\nCommit your work before sending completion message.\n\nThen send a completion message:\nSendMessage(to=\"team-lead\", message=\"Done: {entity title} completed {next_stage}. Summary: {brief description}.\")\n\nPlain text only. Never send JSON.")
```

This mirrors the ensign dispatch prompt but omits the initial setup instructions (working directory, file paths) since the ensign already has that context.

### Change 4: Approval gate path already supports reuse

The current approval gate path (step 6c) already keeps the ensign alive for redo. After approval, it currently shuts down and dispatches fresh. Apply the same reuse logic: if the next stage has the same worktree mode and no `Fresh: Yes`, reuse the ensign via SendMessage instead of shutdown + fresh dispatch.

### Interaction with hardcoded sections fix

This change and the hardcoded-sections fix both modify the ensign dispatch/lifecycle section of the first-officer template. The `[STAGE_DEFINITION]` placeholder is used identically in both the initial dispatch prompt (Agent call) and the reuse SendMessage — the first officer copies the full stage definition from the README in both cases. No conflict.

## Acceptance Criteria

1. The first-officer template in SKILL.md supports ensign reuse when consecutive stages share the same worktree mode and the next stage is not marked `Fresh: Yes`.
2. The README generation template supports an optional `Fresh: Yes` property on stage definitions.
3. First-officer startup parses `Fresh` as a stage property (default `No`).
4. The reuse SendMessage format is defined in the template, using the same `[STAGE_DEFINITION]` placeholder as the dispatch prompt.
5. Validation stages are generated with `Fresh: Yes` by default (commission infers this).
6. The approval gate path uses the same reuse logic when advancing after approval.
7. Ensign shutdown still happens at: terminal stage, context change (worktree mode differs), fresh-required stages, and rejection+discard.
