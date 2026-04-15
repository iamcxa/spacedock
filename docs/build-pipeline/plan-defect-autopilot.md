---
id: 106
title: Plan-Defect Autopilot -- Eliminate Captain-in-Loop for Benign Plan Drift (3-part package)
status: draft
context_status: pending
source: /build
created: 2026-04-15T00:00:00Z
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

> Eliminate captain escalations during execute for the plan-defect classes observed in entities 104 + 105. Three coordinated changes: (A) task-execution skill adds Circular-AC semantic-pass rule; (B) plan-checker gains stale-line-anchor + circular-AC dimensions; (C) FO runtime adapter gains benign-drift classifier before the BLOCKED model-escalation ladder. Scope boundaries: do not touch BLOCKED ladder, PR/push gate, arbitrary BLOCKED auto-accept, wave-graph integrity, or workflow-index step 2.

## Captain Context Snapshot

- **Repo**: main @ post-104/105 merge
- **Session**: Entities 104 + 105 shipped 2026-04-15; captain intervened 2× on plan-defect classes (stale line anchor on 104 task-0; circular AC + plan-body mutation on 104 task-5). Retrospective produced this directive.
- **Domain**: Organizational / Readable (skill contract edits across 3 skill files + 1 reference doc + pressure-test fixtures)
- **Related entities**: 104 brainstorm-nuwa-distillation (_archive, shipped); 105 explore-nuwa-subagent-first (_archive, shipped); 085 build-flow-tdd-discipline (test_first pattern precedent)
- **Created**: 2026-04-15T00:00:00Z

## Goal Check

You are asking for the FO/skill layer to stop waking you up for plan-defect classes we already know how to handle -- when the plan has a stale line number or a grep pattern that matches its own PLAN body, the system should self-correct instead of escalating to you.

- **Problem being solved**: captain bandwidth is burnt on mechanical plan-defect recovery (line-anchor drift, self-referential grep ACs) that the FO could classify and auto-resolve. Entities 104 + 105 each produced one captain interrupt for this class.
- **Expected outcome**: after plan approval, execute stage runs end-to-end without captain input except for (a) PR/push authorization (hard safety line), (b) genuine opus-3rd-BLOCKED terminal failure, (c) confidence gate < 90%. Plan-defect-class BLOCKs never surface.
- **Explicit non-goals**: does NOT weaken BLOCKED model-escalation ladder for genuine blockers; does NOT remove PR/push gate; does NOT auto-accept arbitrary BLOCKED reasons (strict whitelist of 3 classes); does NOT modify wave-graph integrity or workflow-index-step-2 unconditional transition.

## Brainstorming Spec

**APPROACH**: Ship a 3-part coordinated change. (A) Add a "Circular-AC rule" paragraph to `skills/task-execution/SKILL.md` that instructs the troop to classify grep-AC failures as semantic pass when the search string lives inside PLAN/UAT/task-definition blocks of the same entity file, with explicit guard list `## PLAN | ## UAT Spec | <task | <action | <acceptance_criteria | <read_first | <files_modified`. (B) Add two new dimensions to `skills/build-plan/SKILL.md` plan-checker: stale-line-anchor (dry-runs every `line N` assertion and flags drift, suggests `returns ≥1 match` rewrite) and circular-AC (dry-runs every grep-count AC both raw and PLAN-excluded, flags when counts differ). Both dims run pre-approval so plan ensign fixes at source. (C) Add a BLOCKED-triage classifier to `references/claude-first-officer-runtime.md`'s event loop: before climbing haiku→sonnet→opus, match blocker_reason against 3 benign-drift patterns (anchor drift / file renamed / semantic-grep mismatch). On match, auto-proceed and log scope_observation. Classifier is pure-inline string-matching -- zero Agent dispatches. Each part ships with ≥1 pressure-test fixture under `tests/pressure/` replaying the 104/105 scenarios.

**ALTERNATIVE**: Make plan-checker the single enforcement point (Part B only, drop A + C). Plan stage catches every circular-AC and stale anchor before execute begins. -- D-01 **rejected**: plan-checker cannot be exhaustive because renames happen between plan-approval and execute-dispatch (see 105 `agent-dispatch-guide.md` → `researcher-vs-code-explorer.md`), and grep AC drift can be introduced by concurrent entity commits on the same files. Defense in depth is load-bearing: plan-checker prevents the common case, task-execution's semantic-pass rule prevents the per-task fallback, and FO's classifier handles post-approval drift. Dropping A + C leaves a gap that reproduces the exact bug class this entity is closing.

**GUARDRAILS**:
- NEVER weaken the BLOCKED haiku→sonnet→opus escalation ladder for genuine blockers (whitelist-only classifier).
- NEVER weaken the PR/push captain gate (hard safety line per CLAUDE.md).
- NEVER auto-accept arbitrary BLOCKED -- the FO classifier is a strict whitelist of 3 exact match classes.
- NEVER modify the wave-graph integrity rule (build-execute "No Silent Reorder") or workflow-index step 2 unconditional transition.
- Classifier is inline string-matching only; zero Agent dispatches (predictable cost, no cascading failure modes).
- Every new plan-checker dim must ship with a pressure test fixture reproducing the 104/105 scenario it prevents.

**RATIONALE**: Three-layer defense because each layer catches a different failure timing: plan-checker catches drift at plan-approval (cheapest fix); task-execution's semantic-pass rule catches drift at per-task runtime (handles plan-checker misses); FO classifier catches drift at BLOCKED-triage (handles everything else). Single-layer approaches were rejected because renames and concurrent commits introduce drift after plan approval, which plan-checker cannot see. The three layers compose: plan-checker shrinks the input set to rare cases; task-execution absorbs most of those; FO classifier handles the residual. Combined with the 104/105 retrospective data (2 escalations across 18 tasks = 11% captain-interrupt rate for this class), shipping all three is the minimum to drive that rate to zero without surrendering the hard safety lines.

## Acceptance Criteria

- Given `skills/task-execution/SKILL.md` after this entity merges, when we grep for `Circular-AC rule`, then count ≥1 (how to verify: `grep -c 'Circular-AC rule' skills/task-execution/SKILL.md`)
- Given `skills/build-plan/SKILL.md` or its references after merge, when we grep for both new dimension names, then total count ≥2 (how to verify: `grep -c 'stale-line-anchor\|circular-AC' skills/build-plan/SKILL.md skills/build-plan/references/*.md`)
- Given `references/claude-first-officer-runtime.md` after merge, when we grep for the classifier name, then count ≥1 (how to verify: `grep -c 'benign.drift.classifier\|benign drift classifier' references/claude-first-officer-runtime.md`)
- Given `tests/pressure/` after merge, when we list plan-defect fixtures, then ≥3 files exist covering stale-anchor / circular-AC / rename (how to verify: `ls tests/pressure/ | grep -cE 'plan-defect|circular-ac|stale-anchor|rename' >= 3`)
- Given a synthetic replay of entity 104's task-0 stale-anchor + task-5 circular-AC scenarios run against the patched skills, when we count captain-interrupt events emitted, then count = 0 (how to verify: dispatch troop against fixture; assert `scope_observation` entries in troop return + zero `captain_escalation` keyword; scripted in a pressure test)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
