---
title: First Officer Dispatch Bug
status: ideation
source: testflight-001
started: 2026-03-22T21:47:00Z
worktree:
completed:
verdict:
score:
---

## Problem

During testflight-001, the first officer spawned 3 agents all typed as `first-officer` instead of dispatching pilots as `subagent_type="general-purpose"`. The Claude Code UI showed:

```
@first-officer: 0 tool uses · 44.8k tokens    (coordinator — did nothing)
@first-officer: 38 tool uses · 53.3k tokens   (did ideation work)
@first-officer: 39 tool uses · 55.6k tokens   (did ideation work)
```

The first officer is supposed to be a DISPATCHER that never does stage work itself. Instead it cloned itself, wasting tokens on duplicate agent prompts and confusing the team UI.

Additionally, the first officer sent 3 redundant status reports while waiting at the approval gate instead of reporting once and staying idle.

## Evidence

Session logs in `testflight-001/` — main session + 4 subagent JSONL files.

## Analysis

### Current state of template and generated agent

The dispatch code block in both the SKILL.md template (section 2d, line ~406) and the generated `.claude/agents/first-officer.md` (line 50) already specify `subagent_type="general-purpose"`. The template was correct before testflight-001. The first-officer agent ignored its own template and used `subagent_type="first-officer"` instead.

Root cause: the template provides the correct example but lacks explicit negative guardrails. The agent sees itself as a "first-officer" and the dispatch code block contains unfilled `{variables}`, so it may interpret the block as a loose pattern rather than a strict contract. Without an explicit prohibition, the agent defaults to spawning copies of itself.

### What needs to change

Two files need changes: the SKILL.md template (so future commissions generate correct agents) and agents/first-officer.md (the reference doc).

**Fix 1 — Explicit negative guardrail in the dispatch section.** Add to both the SKILL.md template (section 2d) and agents/first-officer.md: "You MUST use `subagent_type='general-purpose'` when dispatching pilots. NEVER use `subagent_type='first-officer'` — that would clone yourself instead of dispatching a worker."

Where: In the SKILL.md template, add this as a bold warning immediately before the `Agent()` code block in the Dispatching section. In agents/first-officer.md, add it in the "Dispatch Lifecycle" step 3.

**Fix 2 — Report-once instruction for approval gates.** The current "idle" instruction (line 84 of generated agent, and the corresponding SKILL.md template line) says "report the current state to CL and wait for instructions" but doesn't prevent re-reporting. Add: "Report pipeline state ONCE when you reach an approval gate or idle state. Do NOT send additional status messages while waiting — CL will respond when ready."

Where: In the SKILL.md template, add this in the Event Loop section after the "pipeline is idle" sentence. In agents/first-officer.md, add a note under the Dispatch Lifecycle.

**Fix 3 — Template is already a code block (resolved).** The dispatch example is already a fenced code block, not pseudocode. The issue was not formatting but lack of negative guardrails (addressed by Fix 1). No additional changes needed for this item.

## Proposed Fix

1. Add explicit negative guardrail: "You MUST use `subagent_type='general-purpose'` when dispatching pilots. NEVER use `subagent_type='first-officer'`." — in the SKILL.md template (section 2d, Dispatching step 6) and agents/first-officer.md (Dispatch Lifecycle step 3).
2. Add report-once instruction: "Report pipeline state ONCE at an approval gate or idle state. Do NOT re-report while waiting." — in the SKILL.md template (Event Loop section) and agents/first-officer.md.
3. No change needed for code block formatting (already correct).

### Files to change

| File | Section | Change |
|------|---------|--------|
| `skills/commission/SKILL.md` | Section 2d, Dispatching step 6 (before `Agent()` block) | Add negative guardrail warning |
| `skills/commission/SKILL.md` | Section 2d, Event Loop "idle" paragraph | Add report-once instruction |
| `agents/first-officer.md` | Dispatch Lifecycle step 3 | Add negative guardrail note |
| `agents/first-officer.md` | Role section or after Dispatch Lifecycle | Add report-once note |

## Acceptance Criteria

- [ ] SKILL.md template includes explicit `NEVER use subagent_type='first-officer'` in the dispatch section
- [ ] SKILL.md template includes report-once instruction in the event loop section
- [ ] agents/first-officer.md includes negative guardrail and report-once notes
- [ ] First officer dispatches pilots as `subagent_type="general-purpose"` with distinct names like `pilot-{slug}`
- [ ] Only one first-officer agent appears in the team UI
- [ ] First officer reports pipeline state once at an approval gate, then waits without re-reporting
- [ ] Validated in a future testflight
