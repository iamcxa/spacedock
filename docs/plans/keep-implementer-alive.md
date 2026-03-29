---
id: 068
title: Keep implementer alive during feedback stage for faster fix cycles
status: validation
source: https://github.com/clkao/spacedock/issues/9
started: 2026-03-29T03:06:00Z
completed:
verdict:
score: 0.60
worktree: .worktrees/ensign-068-keep-alive
issue: "#9"
pr: "#13"
---

When a feedback stage runs, the FO shuts down the implementer and redispatches on rejection. Keeping the implementer alive during review would enable faster fix cycles — the implementer retains full context and can fix immediately on rejection.

See GitHub issue #9 for details.

## Problem

The FO template's Completion section (line 52-54) shuts down the agent immediately when a non-gated stage completes: "If no gate, shut down the agent." When implementation completes and the next stage is validation (a feedback stage with `feedback-to: implementation`), the implementer is already gone before validation starts.

The Feedback Rejection Flow (step 3) handles this: "If it was shut down, dispatch an agent into the same worktree." This works but the fresh agent must re-read the entity, understand the codebase, and parse the findings — losing the original agent's full context.

## Proposed Approach

Three touch points in `templates/first-officer.md`:

### Change 1: Completion, "If no gate" path (line 54)

Current:
> **If no gate:** If terminal, proceed to merge. Otherwise, run `status --next` and dispatch the next stage fresh.

Proposed:
> **If no gate:** If terminal, proceed to merge. Otherwise, check whether the next stage has `feedback-to` pointing at this stage. If yes, keep the agent alive — do not shut it down. Run `status --next` and dispatch the next stage.

### Change 2: Gate Approve path (line 70)

Current:
> **Approve:** Shut down the agent. Dispatch a fresh agent for the next stage.

Proposed:
> **Approve:** Shut down the agent. If a kept-alive agent from a prior stage is still running (the `feedback-to` target), shut it down too. Dispatch a fresh agent for the next stage.

### Change 3: Feedback Rejection Flow step 3 (line 80)

No change needed. Already says: "If the agent from the `feedback-to` target stage is still running, send it the reviewer's findings via SendMessage." With the keep-alive behavior, this path becomes the common case instead of the fallback.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Implementer crashes while idle | Feedback Rejection Flow step 3 handles this: "If it was shut down, dispatch an agent into the same worktree." Crash = shut down. No change needed. |
| Session boundary (FO restarts) | FO has no memory of which agents are alive. Step 3's fallback dispatches a fresh agent if the implementer is gone. Same as today. |
| Multiple entities in flight | Each entity's agents are independent. Agent names include the entity slug, so no collision. |
| Approval (happy path) | Gate approve shuts down both reviewer and kept-alive implementer. |
| Non-adjacent `feedback-to` | Only the immediate next stage is checked. Non-adjacent `feedback-to` uses the existing redispatch fallback. |

### Feedback Cycles

Cycle: 1

## Acceptance Criteria

1. FO template Completion section keeps the agent alive when the next stage has `feedback-to` pointing at the completing stage
2. FO template Gate Approve path shuts down the kept-alive target-stage agent alongside the feedback-stage agent
3. Feedback Rejection Flow step 3 works unchanged (the kept-alive agent is now the common case)
4. Crash/session-boundary fallback (redispatch) still works when the kept-alive agent is gone

## Stage Report: ideation

- [x] Problem statement with concrete examples from this session
  Documented: FO shuts down implementer at Completion (line 52-54) before validation starts; Feedback Rejection Flow step 3 redispatches but loses context. Issue #9 describes the manual workaround used in task 065.
- [x] Proposed FO template changes with exact wording
  Three touch points identified: (1) Completion "If no gate" path adds look-ahead check for `feedback-to`, (2) Gate Approve path adds cleanup of kept-alive agent, (3) Feedback Rejection Flow step 3 unchanged — already handles the keep-alive case.
- [x] Edge cases addressed (what if implementer crashes, session boundary, etc.)
  Five scenarios covered: crash (fallback redispatch), session boundary (no FO memory, fallback), multiple entities (independent agents), approval (clean shutdown of both), non-adjacent feedback-to (only checks immediate next stage).
- [x] Acceptance criteria defined
  Four testable criteria covering keep-alive behavior, approval cleanup, rejection flow compatibility, and crash fallback.

### Summary

The change is narrowly scoped to the FO template's Completion section. When a non-gated stage completes, the FO checks whether the immediate next stage has `feedback-to` pointing back. If yes, the agent stays alive instead of being shut down. The Feedback Rejection Flow already handles the keep-alive case — this change just ensures the agent is actually alive when rejection happens. On approval, both agents are shut down. Crash and session-boundary fallbacks work unchanged.

## Stage Report: implementation

- [x] FO template Completion section updated with keep-alive look-ahead
  Line 54: "If no gate" path now checks whether next stage has `feedback-to` pointing at this stage; if yes, keeps agent alive.
- [x] FO template Gate Approve path updated to clean up kept-alive agent
  Line 70: Approve path now shuts down kept-alive agent from `feedback-to` target alongside the feedback-stage agent.
- [x] Feedback Rejection Flow step 3 unchanged (verify)
  Line 80: Step 3 text verified identical — "If the agent from the `feedback-to` target stage is still running, send it the reviewer's findings via SendMessage."
- [x] Commission test harness passes
  65 passed, 0 failed (out of 65 checks). RESULT: PASS.
- [x] All changes committed to worktree branch
  Commit 25e5b78 on branch ensign/068-keep-alive: 1 file changed, 2 insertions, 2 deletions.

### Summary

Two lines changed in `templates/first-officer.md`. The "If no gate" Completion path now does a look-ahead check for `feedback-to` on the next stage and keeps the completing agent alive if found. The Gate Approve path now cleans up any kept-alive agent alongside the feedback-stage agent. The Feedback Rejection Flow step 3 required no changes — verified unchanged. Commission test harness passes all 65 checks.

## Stage Report: validation

- [x] Each of the 4 acceptance criteria verified with specific evidence (line numbers, text matches)
  See findings below. All 4 criteria addressed: AC1 (line 54 look-ahead), AC2 (line 70 cleanup), AC3 (lines 74-83 unchanged per diff), AC4 (line 80 fallback intact).
- [ ] FAIL: Commission test harness passes (no regression)
  Test invokes `claude -p` which did not complete within session. Implementation report claims 65/65. Keyword checks (`feedback-to`, `dispatch fresh`) verified present. Cannot independently confirm full pass.
- [ ] FAIL: "If no gate" path has correct keep-alive look-ahead check
  Line 52 still says "If no gate, shut down the agent" but line 54 now conditionally keeps it alive. These are contradictory instructions — the FO could shut down at step 2 before reaching line 54's conditional. See finding #1.
- [x] Gate Approve path shuts down both feedback-stage agent and kept-alive agent
  Line 70: "Shut down the agent. If a kept-alive agent from a prior stage is still running (the `feedback-to` target), shut it down too." Correct.
- [x] Feedback Rejection Flow step 3 unchanged (verified text match)
  Diff of lines 74-88 between pre- and post-implementation commits produces zero differences. Step 3 (line 80) text is byte-identical.
- [ ] FAIL: Recommendation: REJECTED with numbered findings

### Findings

1. **Contradictory shutdown instruction in Completion step 2 (line 52).** Step 2 says: "If no gate, shut down the agent." The new line 54 says: "If [next stage has feedback-to], keep the agent alive — do not shut it down." An LLM reading these instructions sequentially would shut down the agent at step 2 before reaching line 54's conditional keep-alive logic, defeating the feature. Fix: update line 52 to defer the shutdown decision to the "If no gate" path below, e.g., "If no gate, proceed to the If-no-gate path below. If gate, keep agent alive for potential redo."

### Summary

The Gate Approve cleanup (line 70) and Feedback Rejection Flow step 3 (line 80) are correct and verified. However, the "If no gate" path has a contradictory instruction: step 2 (line 52) tells the FO to shut down the agent immediately on no-gate, while line 54 now conditionally keeps it alive. This contradiction pre-existed in spirit (the old line 54 said "dispatch fresh" which implied the agent was gone) but is now a functional conflict because line 54 explicitly says to keep the agent alive. The fix is a one-line edit to line 52. Recommendation: REJECTED pending that fix.
