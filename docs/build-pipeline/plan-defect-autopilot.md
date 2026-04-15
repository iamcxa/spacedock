---
id: 106
title: Plan-Defect Autopilot -- Eliminate Captain-in-Loop for Benign Plan Drift (3-part package)
status: draft
context_status: awaiting-clarify
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

**APPROACH**: Ship a 3-part coordinated change. (A) Add a "Circular-AC rule" paragraph to `skills/task-execution/SKILL.md` (✓ confirmed by explore: skills/task-execution/SKILL.md:88-114 defines the verbatim-run AC block and three-status enum; no semantic-pass exists -- clean insertion point) that instructs the troop to classify grep-AC failures as semantic pass when the search string lives inside PLAN/UAT/task-definition blocks of the same entity file, with explicit guard list `## PLAN | ## UAT Spec | <task | <action | <acceptance_criteria | <read_first | <files_modified`. (B) Add two new dimensions to `skills/build-plan/SKILL.md` plan-checker (✓ confirmed by explore: skills/build-plan/references/plan-checker-prompt.md:19-145 already defines 8 dimensions with blocker/warning severity -- adding dims 9+10 is additive). Both dims run pre-approval so plan ensign fixes at source: stale-line-anchor (dry-runs every `line N` assertion and flags drift, suggests `returns ≥1 match` rewrite) and circular-AC (dry-runs every grep-count AC both raw and PLAN-excluded, flags when counts differ). (C) Add a BLOCKED-triage classifier before the haiku→sonnet→opus ladder (⚠ contradicted: BLOCKED ladder lives in `skills/build-execute/SKILL.md:216-224`, NOT in `references/claude-first-officer-runtime.md` which has no BLOCKED/escalation content -- see Q-1). On match to 3 benign-drift patterns (anchor drift / file renamed / semantic-grep mismatch), auto-proceed and log scope_observation. Classifier is pure-inline string-matching -- zero Agent dispatches. Each part ships with ≥1 pressure-test fixture under `tests/pressure/` replaying the 104/105 scenarios.

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

## Assumptions

### A-1: Circular-AC rule guard-list approach is sufficient
- Statement: The Circular-AC rule in task-execution can use a static guard list (`## PLAN | ## UAT Spec | <task | <action | <acceptance_criteria | <read_first | <files_modified`) without needing a generalized semantic-pass escape hatch. The troop checks: if the grep search string literally appears inside any guard-listed block of the same entity file, count=0 is a semantic pass.
- Confidence: Confident (0.90)
- Evidence:
  - skills/task-execution/SKILL.md:88-114 -- AC run block is a No-Exceptions literal-pass rule; adding a scoped exception is a pattern-preserving extension [primary]
  - tests/pressure/task-execution.yaml:1 -- all 3 existing fixtures use canonical `bun test` commands, none exercise grep-count AC, so the new rule has no conflicting precedent [secondary]

### A-2: Plan-checker dry-run dims are additive, not structural
- Statement: Adding `stale-line-anchor` (Dim 9) and `circular-AC` (Dim 10) to plan-checker fits the existing 8-dim taxonomy (blocker/warning severity) without restructuring. Both run pre-approval on plan YAML.
- Confidence: Confident (0.92)
- Evidence:
  - skills/build-plan/references/plan-checker-prompt.md:19-145 -- existing 8 dims use identical YAML return schema; dim addition precedent [primary]
  - Angle (i) report: no existing line-anchor or circular-AC detection anywhere in build-plan -- clean greenfield [primary]

### A-3: `scope_observation` is the right finding channel
- Statement: FO benign-drift classifier matches → troop returns DONE with a `scope_observation` finding entry describing the drift class. No new finding type needed.
- Confidence: Likely (0.75)
- Evidence:
  - skills/task-execution/SKILL.md:163 defines `scope_observation` finding type for surfacing adjacent issues [primary]
  - skills/build-execute/SKILL.md (Angle iv evidence): `scope_observation` appears in 2 skills, established pattern [secondary]

### A-4: Entity 061 sequencing conflict is the real risk, not 092
- Statement: Entity 061 (clarify) and 106 both write `skills/build-plan/SKILL.md` + `tests/pressure/build-plan.yaml`. 092 adds a new output path (non-line-overlap additive). 061 is the blocking coordination target; 092 is low-risk.
- Confidence: Likely (0.70)
- Evidence:
  - Angle (iii) report: 061 creates `skills/build-plan/SKILL.md` at same file surface [primary]
  - Angle (iii) report: 092 modifies output target (additive path, not dim redefinition) [secondary]

### A-5: Line-anchor dry-run is static analysis, not runtime
- Statement: plan-checker's stale-line-anchor dim reads the referenced file at plan-check time and verifies the line number still resolves to the asserted content. Does not need to execute the plan.
- Confidence: Likely (0.78)
- Evidence:
  - skills/build-plan/references/plan-checker-prompt.md:19 -- Dim 6a already runs shell commands (`bun test`) at plan-check time, so file Reads are in-budget [primary]
  - Entity 104 stale-anchor symptom (Angle ii report, _archive/brainstorm-nuwa-distillation.md:894) -- drift was line 191 vs expected 183, detectable by static Read [primary]

## Option Comparisons

### O-1: Where to insert the benign-drift classifier (resolves Q-1 contradiction)

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **A: `skills/build-execute/SKILL.md` escalation-ladder preamble** | Matches actual location of haiku→sonnet→opus ladder (lines 216-224); single skill owns classify+escalate; honors brainstorm intent (classifier runs *before* ladder) | Requires updating the entity's APPROACH (Part C target) to reference the correct file | S | ✅ Recommended |
| B: `references/claude-first-officer-runtime.md` event loop | Matches APPROACH as-written | FO runtime file has NO BLOCKED content -- would require inventing a new section; violates co-location principle; 094 clarify hard-codes `:104` anchor that would shift | M | Rejected -- no host structure |
| C: Both files (FO runtime references build-execute) | Preserves APPROACH wording | Two insertion points → duplicate classifier; drift risk; unnecessary | M | Rejected -- over-engineering |

- Evidence:
  - skills/build-execute/SKILL.md:216-224 -- canonical escalation ladder home [primary]
  - references/claude-first-officer-runtime.md:64 -- model pass-through only, no BLOCKED branch [primary]
  - Angle (iii) report: entity 094 hard-codes FO-runtime `:104` anchor, insertion risk [secondary]

### O-2: `tests/pressure/` fixture file strategy

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **A: Extend existing `task-execution.yaml` + `build-plan.yaml`; add new `build-execute-blocked-triage.yaml`** | Reuses existing fixture schema; one new file for the classifier (no natural host); AC-4 count ≥3 satisfied | Requires coordination with 061 on build-plan.yaml merge order | S | ✅ Recommended |
| B: Create dedicated `plan-defect-*.yaml` files (circular-ac.yaml, stale-anchor.yaml, benign-drift.yaml) | Clean separation; easier to grep by defect class | 3 new files; diverges from "fixture per skill" convention | S | Viable |
| C: Single `plan-defect-autopilot.yaml` catching all 3 parts | Single-file simplicity | Tests target 3 different skills; single-file conflates ownership | S | Rejected -- wrong granularity |

- Evidence:
  - tests/pressure/task-execution.yaml, build-plan.yaml already exist (Angle iii report) [primary]
  - tests/pressure/graft.yaml:317 -- precedent for defect-class fixture within skill file [secondary]

## Open Questions

### Q-1: Where does Part C's benign-drift classifier actually insert?
- Domain: Organizational (skill contract file choice)
- Why it matters: APPROACH Part C says `references/claude-first-officer-runtime.md`, but that file has no BLOCKED/escalation section. The actual ladder lives in `skills/build-execute/SKILL.md:216-224`. Shipping Part C as-written would either (a) invent a hanging section in the FO runtime with no context, or (b) the ensign would silently redirect to build-execute and diverge from the plan. Must be resolved before plan stage.
- Suggested options: see O-1 above -- recommendation A (build-execute) [primary]

### Q-2: How do we coordinate the `skills/build-plan/SKILL.md` write with entity 061?
- Domain: Organizational (sibling entity ordering)
- Why it matters: 061 is in clarify stage and will write the same file. If 061 ships after 106's plan is approved but before 106 executes, the plan's line anchors for 061's target file will be stale (exactly the bug class this entity prevents -- meta-failure). Also shared conflict on `tests/pressure/build-plan.yaml`.
- Suggested options:
  - Declare `depends-on: 061` in frontmatter, block 106 until 061 ships
  - Coordinate in-flight via content-based anchors (already the output of this very entity's Dim 9) and accept conflict resolution at merge
  - Pre-agreement on non-overlapping sections of build-plan/SKILL.md [primary]

### Q-3: Classifier whitelist scope -- strict 3 or extensible registry?
- Domain: Organizational (future-proofing vs YAGNI)
- Why it matters: GUARDRAILS says "strict whitelist of 3 exact match classes". Hard-coded strings work for 104/105 scenarios, but the next drift class (e.g., `test framework renamed`, `command flag changed`) would require re-opening the skill contract. A YAML registry at `references/benign-drift-patterns.yaml` is also viable.
- Suggested options:
  - Hard-code 3 classes inline in build-execute/SKILL.md (matches GUARDRAILS, simplest) [primary]
  - External YAML registry with 3 initial entries (extensible, but adds config file)
  - Open-ended -- captain decides

### Q-4: Does the line-anchor dry-run need to load the file at plan-check time?
- Domain: Behavioral (plan-checker performance + correctness)
- Why it matters: If plan has 30+ line anchors, Dim 9 reads 30 files during plan-check. Acceptable? Or do we batch-Read/cache? Affects plan-checker runtime budget and potentially drives AC rewording to content-based ("returns ≥1 match") instead of line-numbered.
- Suggested options:
  - Read every referenced file (simple, plan-check already slow) [primary]
  - Batch Read + cache within single dim pass
  - Recommend auto-rewrite line anchors → content anchors (eliminates dim at source)

## Core Tensions

- essential: **APPROACH Part C target-file contradiction** (Q-1, O-1) -- the brainstorm claim locates the classifier in `references/claude-first-officer-runtime.md`, but the codebase evidence locates the escalation ladder in `skills/build-execute/SKILL.md`. Angle (i) and Angle (ii) independently confirmed this via different search paths (pattern-mapping vs archive-reading). This is a genuine design-intent vs codebase-reality tension, not a scribal error, because the brainstorm also invokes "haiku→sonnet→opus" which only appears in build-execute. Captain must decide whether to correct the file reference or re-locate the ladder (the latter is out-of-scope per GUARDRAILS "NEVER modify the wave-graph integrity").
- domain-based: **Sibling write coordination on `skills/build-plan/SKILL.md`** (Q-2, A-4) -- Angle (iii) sees it through the workflow-index lens (061 + 092 + 106 all touch same file); Angle (i) sees it through the skill-contract lens (additive dim insertion is structurally safe). Both are true. The resolution depends on ordering policy, not content.

## Honest Boundaries

- Angle (iv) seed list was limited to 5 patterns extracted from APPROACH keywords. Other possible drift classes (test-framework rename, CLI flag change, config key migration) were NOT surveyed for existing coverage. If Q-3's scope expands, a second Angle (iv) sweep may be warranted in plan stage.
- CONTRACTS.md was too large for Angle (iii) to read fully (16K token limit). Cross-contract assertions between 061, 092, and 106 on `skills/build-plan/SKILL.md` were verified by frontmatter + APPROACH scan only, not by contract-registry assertion comparison.
- `references/claude-first-officer-runtime.md` was only read to line 64 (Angle iv) and line 104 (Angle iii context). If Part C rerouting to build-execute is rejected (Q-1), a full read of the FO runtime is required in plan stage to confirm no hidden BLOCKED handling.
- DECISIONS.md is empty despite 30+ archived entities. No canonical ADR for prior plan-defect handling decisions -- only individual entity clarify annotations. Out of scope for this entity but a signal that the "auto-maintained" mechanism has never fired.

## Stage Report: explore

- [x] Files mapped: 9 across contract, test, config
  contract: 3 (task-execution, build-execute, build-plan + plan-checker-prompt), test: 3 (task-execution.yaml, build-plan.yaml, graft.yaml upgrade-stale-anchor fixture), config: 3 (entity 106 body, FO runtime, DECISIONS.md)
- [x] Assumptions formed: 5 (Confident: 2, Likely: 3, Unclear: 0)
  A-1, A-2 Confident via line-number evidence; A-3, A-4, A-5 Likely
- [x] Options surfaced: 2
  O-1 classifier insertion location (resolves Q-1 contradiction); O-2 pressure-fixture file strategy
- [x] Questions generated: 4
  Q-1 Part C target file (essential tension); Q-2 sibling 061 coordination; Q-3 whitelist scope; Q-4 line-anchor dry-run budget
- [x] α markers resolved: 0 / 0
  brainstorm spec had no α markers -- none to resolve
- [x] Scale assessment: Medium confirmed
  9 files across 3 layers fits Medium band (5-15 files); no revision needed
- [x] Research dispatched: 0 researchers (skipped -- all assumptions internal skill contracts, no external tech claims)

## Decomposition Recommendation

(explore stage: decomposition NOT warranted -- 9 files, 3 layers, Medium scale; three-part structure is already a tight coordinated package per RATIONALE; splitting would break defense-in-depth composition)

## Canonical References

(clarify stage will populate)
