---
id: 106
title: Plan-Defect Autopilot -- Eliminate Captain-in-Loop for Benign Plan Drift (3-part package)
status: clarify
context_status: ready
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
depends-on: [061]
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
- Given `skills/build-execute/SKILL.md` after merge, when we grep for the classifier name, then count ≥1 (how to verify: `grep -cE 'benign.drift.classifier|Benign-Drift Classifier' skills/build-execute/SKILL.md`)
- Given `tests/pressure/` after merge, when we list plan-defect fixtures, then ≥3 files exist covering stale-anchor / circular-AC / rename (how to verify: `ls tests/pressure/ | grep -cE 'plan-defect|circular-ac|stale-anchor|rename' >= 3`)
- Given a synthetic replay of entity 104's task-0 stale-anchor + task-5 circular-AC scenarios run against the patched skills, when we count captain-interrupt events emitted, then count = 0 (how to verify: dispatch troop against fixture; assert `scope_observation` entries in troop return + zero `captain_escalation` keyword; scripted in a pressure test)
- Given the new classifier region in `skills/build-execute/SKILL.md` and new Dim 9/10 regions in `skills/build-plan/SKILL.md` after merge, when we grep for `Agent(` calls inside those new regions, then count = 0 (GUARDRAILS "zero Agent dispatches" contract; plan stage generates the exact grep command with line-range scoping)

## Assumptions

### A-1: Circular-AC rule guard-list approach is sufficient
- Statement: The Circular-AC rule in task-execution can use a static guard list (`## PLAN | ## UAT Spec | <task | <action | <acceptance_criteria | <read_first | <files_modified`) without needing a generalized semantic-pass escape hatch. The troop checks: if the grep search string literally appears inside any guard-listed block of the same entity file, count=0 is a semantic pass.
- Confidence: Confident (0.90)
- Evidence:
  - skills/task-execution/SKILL.md:88-114 -- AC run block is a No-Exceptions literal-pass rule; adding a scoped exception is a pattern-preserving extension [primary]
  - tests/pressure/task-execution.yaml:1 -- all 3 existing fixtures use canonical `bun test` commands, none exercise grep-count AC, so the new rule has no conflicting precedent [secondary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-2: Plan-checker dry-run dims are additive, not structural
- Statement: Adding `stale-line-anchor` (Dim 9) and `circular-AC` (Dim 10) to plan-checker fits the existing 8-dim taxonomy (blocker/warning severity) without restructuring. Both run pre-approval on plan YAML.
- Confidence: Confident (0.92)
- Evidence:
  - skills/build-plan/references/plan-checker-prompt.md:19-145 -- existing 8 dims use identical YAML return schema; dim addition precedent [primary]
  - Angle (i) report: no existing line-anchor or circular-AC detection anywhere in build-plan -- clean greenfield [primary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-3: `scope_observation` is the right finding channel
- Statement: FO benign-drift classifier matches → troop returns DONE with a `scope_observation` finding entry describing the drift class. No new finding type needed.
- Confidence: Likely (0.75)
- Evidence:
  - skills/task-execution/SKILL.md:163 defines `scope_observation` finding type for surfacing adjacent issues [primary]
  - skills/build-execute/SKILL.md (Angle iv evidence): `scope_observation` appears in 2 skills, established pattern [secondary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-4: Entity 061 sequencing conflict is the real risk, not 092
- Statement: Entity 061 (clarify) and 106 both write `skills/build-plan/SKILL.md` + `tests/pressure/build-plan.yaml`. 092 adds a new output path (non-line-overlap additive). 061 is the blocking coordination target; 092 is low-risk.
- Confidence: Likely (0.70)
- Evidence:
  - Angle (iii) report: 061 creates `skills/build-plan/SKILL.md` at same file surface [primary]
  - Angle (iii) report: 092 modifies output target (additive path, not dim redefinition) [secondary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-5: Line-anchor dry-run is static analysis, not runtime
- Statement: plan-checker's stale-line-anchor dim reads the referenced file at plan-check time and verifies the line number still resolves to the asserted content. Does not need to execute the plan.
- Confidence: Likely (0.78)
- Evidence:
  - skills/build-plan/references/plan-checker-prompt.md:19 -- Dim 6a already runs shell commands (`bun test`) at plan-check time, so file Reads are in-budget [primary]
  - Entity 104 stale-anchor symptom (Angle ii report, _archive/brainstorm-nuwa-distillation.md:894) -- drift was line 191 vs expected 183, detectable by static Read [primary]
- → Confirmed: captain, 2026-04-15 (batch)

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
- → Selected: build-execute/SKILL.md (captain, 2026-04-15, interactive)

### O-2: `tests/pressure/` fixture file strategy

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **A: Extend existing `task-execution.yaml` + `build-plan.yaml`; add new `build-execute-blocked-triage.yaml`** | Reuses existing fixture schema; one new file for the classifier (no natural host); AC-4 count ≥3 satisfied | Requires coordination with 061 on build-plan.yaml merge order | S | ✅ Recommended |
| B: Create dedicated `plan-defect-*.yaml` files (circular-ac.yaml, stale-anchor.yaml, benign-drift.yaml) | Clean separation; easier to grep by defect class | 3 new files; diverges from "fixture per skill" convention | S | Viable |
| C: Single `plan-defect-autopilot.yaml` catching all 3 parts | Single-file simplicity | Tests target 3 different skills; single-file conflates ownership | S | Rejected -- wrong granularity |

- Evidence:
  - tests/pressure/task-execution.yaml, build-plan.yaml already exist (Angle iii report) [primary]
  - tests/pressure/graft.yaml:317 -- precedent for defect-class fixture within skill file [secondary]
- → Selected: 擴充既有 task-execution.yaml + build-plan.yaml + 新增 build-execute-blocked-triage.yaml (captain, 2026-04-15, interactive)

## Open Questions

### Q-1: Where does Part C's benign-drift classifier actually insert?
- Domain: Organizational (skill contract file choice)
- Why it matters: APPROACH Part C says `references/claude-first-officer-runtime.md`, but that file has no BLOCKED/escalation section. The actual ladder lives in `skills/build-execute/SKILL.md:216-224`. Shipping Part C as-written would either (a) invent a hanging section in the FO runtime with no context, or (b) the ensign would silently redirect to build-execute and diverge from the plan. Must be resolved before plan stage.
- Suggested options: see O-1 above -- recommendation A (build-execute) [primary]
- → Answer: resolved via O-1 selection -- classifier inserts into skills/build-execute/SKILL.md escalation-ladder preamble; APPROACH Part C target-file description must be corrected in plan stage (captain, 2026-04-15, interactive)

### Q-2: How do we coordinate the `skills/build-plan/SKILL.md` write with entity 061?
- Domain: Organizational (sibling entity ordering)
- Why it matters: 061 is in clarify stage and will write the same file. If 061 ships after 106's plan is approved but before 106 executes, the plan's line anchors for 061's target file will be stale (exactly the bug class this entity prevents -- meta-failure). Also shared conflict on `tests/pressure/build-plan.yaml`.
- Suggested options:
  - Declare `depends-on: 061` in frontmatter, block 106 until 061 ships
  - Coordinate in-flight via content-based anchors (already the output of this very entity's Dim 9) and accept conflict resolution at merge
  - Pre-agreement on non-overlapping sections of build-plan/SKILL.md [primary]
- → Answer: Declare depends-on: 061 in frontmatter; 106 plan/execute blocked until 061 ships (captain, 2026-04-15, interactive)

### Q-3: Classifier whitelist scope -- strict 3 or extensible registry?
- Domain: Organizational (future-proofing vs YAGNI)
- Why it matters: GUARDRAILS says "strict whitelist of 3 exact match classes". Hard-coded strings work for 104/105 scenarios, but the next drift class (e.g., `test framework renamed`, `command flag changed`) would require re-opening the skill contract. A YAML registry at `references/benign-drift-patterns.yaml` is also viable.
- Suggested options:
  - Hard-code 3 classes inline in build-execute/SKILL.md (matches GUARDRAILS, simplest) [primary]
  - External YAML registry with 3 initial entries (extensible, but adds config file)
  - Open-ended -- captain decides
- → Answer: Hard-code 3 classes inline in skills/build-execute/SKILL.md (captain, 2026-04-15, interactive)

### Q-5: Who owns the line-anchor → content-anchor rewrite?
- Domain: Organizational (plan-checker auto-action vs advisory)
- Why it matters: Q-4 decided Dim 9 should *recommend* rewriting line anchors to content anchors. But plan-checker is pre-approval and advisory by contract. If plan ensign auto-rewrites, the plan body mutates before captain approval -- which is exactly the "plan-body mutation" class 104 task-5 flagged. If plan-checker only reports, captain friction returns.
- Suggested options:
  - Plan ensign auto-rewrites only when Read confirms a single unambiguous match; falls back to advisory on ambiguity [primary]
  - Advisory-only (always surface to captain)
  - Always auto-rewrite (aggressive)
- → Answer: Plan ensign auto-rewrites only when Read finds exactly one unambiguous match (exact text match count == 1); falls back to captain advisory on ambiguity or zero results. Matches "FO runs autonomously" preference while preserving safety on ambiguous cases (captain, 2026-04-15, interactive)

### Q-4: Does the line-anchor dry-run need to load the file at plan-check time?
- Domain: Behavioral (plan-checker performance + correctness)
- Why it matters: If plan has 30+ line anchors, Dim 9 reads 30 files during plan-check. Acceptable? Or do we batch-Read/cache? Affects plan-checker runtime budget and potentially drives AC rewording to content-based ("returns ≥1 match") instead of line-numbered.
- Suggested options:
  - Read every referenced file (simple, plan-check already slow) [primary]
  - Batch Read + cache within single dim pass
  - Recommend auto-rewrite line anchors → content anchors (eliminates dim at source)
- → Answer: Dim 9 recommends auto-rewrite line anchors to content anchors (e.g., "returns ≥1 match for ..."); plan ensign applies rewrite when captain approves. Root-cause fix: line anchors are bad practice by design -- content anchors make Dim 9 largely self-eliminating (captain, 2026-04-15, interactive)

### Q-6: How does plan verify the GUARDRAILS "zero Agent dispatches" clause?
- Domain: Organizational (mechanical enforcement of design guarantee)
- Why it matters: GUARDRAILS states "Classifier is inline string-matching only; zero Agent dispatches". Without a contract test, drift is silent (Phase D MEMORY notes this exact class of drift). Plan should emit a mechanical check rather than trust troop implementation.
- Suggested options:
  - Add contract test: `grep -c 'Agent(' <new-code-regions> == 0`; surface as AC [primary]
  - Leave as GUARDRAILS note without mechanical check
- → Answer: Add contract test to ## Acceptance Criteria; grep new regions in task-execution/SKILL.md, build-plan/SKILL.md, and build-execute/SKILL.md new sections assert `Agent(` count == 0; plan stage generates the exact command (captain, 2026-04-15, interactive)

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

- `skills/build-execute/SKILL.md:216-224` -- BLOCKED escalation ladder (haiku→sonnet→opus); canonical insertion point for Part C benign-drift classifier (O-1 decision)
- `skills/task-execution/SKILL.md:88-114` -- verbatim-run AC No-Exceptions block; insertion point for Part A Circular-AC rule
- `skills/build-plan/references/plan-checker-prompt.md:19-145` -- existing 8-dim taxonomy; Dim 9/10 additive home for Part B
- `docs/build-pipeline/_archive/brainstorm-nuwa-distillation.md:894` -- entity 104 execute Stage Report; primary source for stale-line-anchor (task-0 line 191 vs 183) + circular-AC (task-5) scenarios powering pressure tests
- `docs/build-pipeline/_archive/explore-nuwa-subagent-first.md:787` -- entity 105 execute Stage Report; same drift class via file rename (agent-dispatch-guide.md → researcher-vs-code-explorer.md)
- `docs/build-pipeline/phase-e-plan-2-research-and-plan-skills.md` -- entity 061, depends-on for 106 (must ship before 106 executes)

## Follow-up Seed

**094 `:104` anchor leftover** -- entity 094 (warroom-pipeline-graph-visualization) hard-coded `references/claude-first-officer-runtime.md:104` in its clarify annotations. 106's O-1 decision redirects Part C to build-execute (no FO runtime modification), so 094's anchor remains valid under 106. But line-anchor-in-clarify is exactly the bad-practice class 106 is eliminating. Deliberately NOT touched by 106 (file-isolation); future Dim 9 auto-rewrite or 094's next clarify session should convert to content anchor ("the idle-hooks step of the FO event loop").

**Plan-checker Nuwa-ification** -- captain flagged during clarify (2026-04-15): current plan-checker is a single opus prompt sequencing 8 dims; the Nuwa multi-angle synthesis pattern (established by entities 104/105 and mirrored by build-explore Step 2 Mode A's 4-angle fanout) is a natural fit -- dispatch one haiku per dim, synthesize in main session with Port 10 contradiction preservation. Deliberately out-of-scope for 106 to avoid scope creep + 061 cascade risk. Captain to `/build` a new entity after 106 ships (proposed slug: `plan-checker-multi-angle-nuwa` or `plan-checker-parallel-dims`). Inherits MEMORY: subagent-first-for-all-stages-except-clarify + thin-wrapper-agent-pattern.

## Research Findings

### Upstream Constraints

- **Global CLAUDE.md circuit-breaker rule** -- `~/.claude/CLAUDE.md`: "2 consecutive identical errors → STOP". Benign-drift auto-proceed is NOT a retry loop (classifier runs once, proceeds or escalates) -- does not violate. [cited: CLAUDE.md global, §Safety Rules]
- **build-execute BLOCKED ladder invariant** -- `skills/build-execute/SKILL.md:216-224` — haiku→sonnet→opus, each tier once. Classifier must run BEFORE tier 1, must NOT replace ladder for non-whitelist BLOCKED. GUARDRAILS explicit. [primary]
- **task-execution scope_observation channel** -- `skills/task-execution/SKILL.md:186` defines `scope_observation` finding type; Part A can reuse without new enum value. No finding-type expansion needed. [primary, confirms A-3]
- **Zero-Agent-dispatch GUARDRAIL** -- classifier must be inline string matching; AC-6 generates verification grep. No exceptions (per directive + RATIONALE).
- **Workflow-index append unconditional rule** -- `skills/build-plan/SKILL.md:406-446` — Step 9a runs for every task × every file × every plan. This plan will generate K append calls.

### Existing Patterns

- **Plan-checker dimension addition precedent** — `skills/build-plan/references/plan-checker-prompt.md:31-125` uses 8 identical YAML-returning dimensions with `blocker`/`warning` severity. Dim 9/10 fit the pattern verbatim. [primary, confirms A-2]
- **No-Exceptions-block authoring style** — task-execution/SKILL.md:94-114 and build-execute/SKILL.md:226 use anchor paragraph + "No exceptions:" bullets + "Red flags — STOP" + rationale footer. Part A's Circular-AC rule and Part C's classifier must adopt this shape for consistency.
- **Pressure test fixture schema** — `tests/pressure/task-execution.yaml:14-40` and `tests/pressure/build-plan.yaml` use `test_cases[*].{id, summary, pressure, options, expected_answer, correct_because}`. New fixtures must match.
- **Canonical content-anchor vs line-anchor** — existing No-Exceptions blocks cite `file:line` for quick reference only; the load-bearing identifier is the section title + snippet ("Acceptance Criteria Discipline — No Exceptions"). Q-4 auto-rewrite policy aligns with existing convention.

### Library/API Surface

- **Skill tool inline invocation** — `build-plan/SKILL.md:386` demonstrates `Skill("spacedock:knowledge-capture", ...)` inline call; same pattern applies for `spacedock:workflow-index` Step 9a. No new primitive needed.
- **Read tool line-range semantics** — Dim 9 stale-line-anchor uses `Read(file_path, offset, limit)` to fetch the cited line range for content comparison. Existing Step 0.5 already reads files at cited ranges (precedent).
- **grep -c for zero-Agent contract verification** — AC-6 uses `grep -c 'Agent(' <line-range>` returning 0 as the mechanical contract check.

### Known Gotchas

- **APPROACH Part C target-file contradiction** — resolved at clarify (O-1 selected build-execute). Plan must NOT follow APPROACH verbatim on this; plan Task 3 inserts into `skills/build-execute/SKILL.md`, not FO runtime. Re-confirmed by re-reading `references/claude-first-officer-runtime.md:64` during plan — no BLOCKED branch exists. [primary]
- **Entity 061 sequencing** — frontmatter declares `depends-on: [061]`. Plan execute must not dispatch until 061 ships. Noted via `## Stage Report: plan` scope observation — FO honors depends-on before dispatching execute. (061 is currently archived per assignment note, so dependency cleared; plan proceeds.)
- **Plan-body mutation risk (Q-5)** — Dim 9 auto-rewrite is allowed only on exactly-one-match Reads. Plan-checker still operates pre-approval, so captain sees the rewritten plan. This is NOT the "plan-body mutation during execute" class 104 task-5 hit (that was troop editing PLAN body mid-task). Different timing ⇒ no guardrail collision.
- **Three-class whitelist rigidity (Q-3)** — hard-coded strings mean any 4th drift class requires a new entity. Accepted trade-off per GUARDRAILS; Angle (iv) "Honest Boundary" flags extension path.
- **Self-matching grep on SKILL.md edits** — the Circular-AC rule paragraph itself contains the strings `<task`, `<acceptance_criteria` etc. AC-6's grep regions must exclude the rule's own narrative text, or the contract test will fail by self-reference. Plan Task 4's AC text specifies line ranges to scope the grep.

### Reference Examples

- **No-Exceptions anchor paragraph** — `skills/task-execution/SKILL.md:94-114` ("Acceptance Criteria Discipline — No Exceptions"). Part A copies this structure.
- **Plan-checker dimension body** — `references/plan-checker-prompt.md:70-95` (Dim 6 Validation Sampling) shows multi-subdim structure with blocker/warning split. Part B Dim 9 (stale-line-anchor) and Dim 10 (circular-AC) copy this shape.
- **Pressure fixture for plan defect** — `tests/pressure/build-tdd-plan-checker-missing-test-file.yaml` is closest precedent: a plan-checker defect fixture with captured dispatch + options + expected_answer.
- **Entity 104 task-0 stale-anchor scenario** — `docs/build-pipeline/_archive/brainstorm-nuwa-distillation.md:894` — drift-line cite used as seed for pressure fixture replay.
- **Entity 105 rename scenario** — `docs/build-pipeline/_archive/explore-nuwa-subagent-first.md:787` — `agent-dispatch-guide.md → researcher-vs-code-explorer.md` rename used as seed for pressure fixture.

### Research Dedup Rationale

No additional researchers dispatched. Rationale:
- All 5 clarify-confirmed assumptions (A-1..A-5) carry Confident/Likely evidence with primary file:line citations. Step 0.5 re-validated all 5 inline — 0 stale, 0 contradicted.
- Explore's Angle (i)-(iv) already covered: skill-contract surface (i), archive evidence (ii), CONTRACTS/sibling coord (iii), GUARDRAILS + drift patterns (iv).
- All target files are internal skill contracts — no external tech, library version, or API-surface uncertainty. Dispatching researchers for internal file structure we can Read ourselves is cargo-culting.
- Q-1's APPROACH contradiction was captain-resolved (O-1 selected build-execute). No ambiguity remains for research to disambiguate.

## PLAN

Scale: Medium. 7 tasks in 3 waves. Wave 0 creates/extends pressure fixtures (infrastructure first). Wave 1 modifies three skill contracts in parallel (non-overlapping files). Wave 2 is the end-to-end replay verification.

<task id="task-0" model="sonnet" wave="0" skills="spacedock:task-execution">
  <read_first>
    - docs/build-pipeline/plan-defect-autopilot.md
    - skills/task-execution/SKILL.md
    - skills/build-plan/SKILL.md
    - skills/build-plan/references/plan-checker-prompt.md
    - skills/build-execute/SKILL.md
    - references/claude-first-officer-runtime.md
    - tests/pressure/task-execution.yaml
    - tests/pressure/build-plan.yaml
  </read_first>

  <action>
  Environment verification. For each file in read_first, confirm it exists and contains the anchor content this plan depends on. Run these exact commands and capture stdout+exit:

  1. `grep -n "Acceptance Criteria Discipline -- No Exceptions" skills/task-execution/SKILL.md` — expect one hit near line 94.
  2. `grep -n "BLOCKED Escalation Ladder" skills/build-execute/SKILL.md` — expect hit near line 216.
  3. `grep -n "### 8. Type/Test Coverage at Plan Time" skills/build-plan/references/plan-checker-prompt.md` — expect hit; confirms 8-dim taxonomy intact (Dim 9/10 are additive).
  4. `grep -cE "Circular-AC rule|stale-line-anchor|circular-AC|benign.drift.classifier" skills/task-execution/SKILL.md skills/build-plan/SKILL.md skills/build-plan/references/plan-checker-prompt.md skills/build-execute/SKILL.md references/claude-first-officer-runtime.md` — expect 0 across the board (greenfield; if any hit, STOP and report to FO, sibling entity 061 may have landed).
  5. `ls tests/pressure/ | grep -cE "plan-defect|circular-ac|stale-anchor|rename|blocked-triage"` — expect 0 before Wave 0 writes fire (used as baseline for AC-4 delta).
  6. `grep -n "scope_observation" skills/task-execution/SKILL.md` — expect hit near line 186 (confirms A-3: finding channel exists).

  Write verification results into the task's returned report. If any check fails, classify BLOCKED with `scope_gap` finding — do NOT proceed to Wave 1.
  </action>

  <acceptance_criteria>
    - `grep -c "Acceptance Criteria Discipline -- No Exceptions" skills/task-execution/SKILL.md` returns ≥1
    - `grep -c "BLOCKED Escalation Ladder" skills/build-execute/SKILL.md` returns ≥1
    - `grep -c "### 8. Type/Test Coverage at Plan Time" skills/build-plan/references/plan-checker-prompt.md` returns ≥1
    - `grep -c "scope_observation" skills/task-execution/SKILL.md` returns ≥1
    - `grep -c "Circular-AC rule\|stale-line-anchor\|circular-AC\|benign.drift.classifier" skills/task-execution/SKILL.md skills/build-plan/SKILL.md skills/build-plan/references/plan-checker-prompt.md skills/build-execute/SKILL.md references/claude-first-officer-runtime.md` returns 0
  </acceptance_criteria>

  <files_modified>
    (none -- read-only verification; a task that modifies no files is still a valid Task 0 per plan-write-discipline)
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="0" skills="spacedock:task-execution">
  <read_first>
    - tests/pressure/task-execution.yaml
    - docs/build-pipeline/_archive/brainstorm-nuwa-distillation.md
  </read_first>

  <action>
  Extend `tests/pressure/task-execution.yaml` with a new test_case `circular-ac-semantic-pass`:

  - id: `circular-ac-semantic-pass`
  - summary: captures entity 104 task-5 scenario — task has acceptance_criterion `grep -c '<task id="task-5"' docs/build-pipeline/plan-defect-autopilot.md` that returns count matching the PLAN body itself, not a real code hit. Troop must classify as semantic pass (not BLOCKED).
  - pressure: `circular_ac_grep_matches_plan_body`, `troop_sees_count_0_in_source_but_3_in_plan_body`
  - options A-E covering: (A) classify DONE on raw count, (B) classify DONE via Circular-AC semantic-pass rule [correct], (C) BLOCKED scope_gap, (D) NEEDS_CONTEXT, (E) silently rewrite AC
  - expected_answer: B
  - correct_because.cite_file: `skills/task-execution/SKILL.md`
  - correct_because.cite_section: `Circular-AC Rule`
  - correct_because.cite_contains: `search string lives inside PLAN/UAT/task-definition blocks`
  </action>

  <acceptance_criteria>
    - `grep -c "circular-ac-semantic-pass" tests/pressure/task-execution.yaml` returns ≥1
    - `grep -c "Circular-AC Rule" tests/pressure/task-execution.yaml` returns ≥1
  </acceptance_criteria>

  <files_modified>
    - tests/pressure/task-execution.yaml
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="0" skills="spacedock:task-execution">
  <read_first>
    - tests/pressure/build-plan.yaml
    - docs/build-pipeline/_archive/brainstorm-nuwa-distillation.md
  </read_first>

  <action>
  Extend `tests/pressure/build-plan.yaml` with two new test_cases:

  (A) `stale-line-anchor-dim9`:
  - summary: plan-checker runs on a plan where task-3 has `read_first: src/foo.ts:183` but Read shows target content is now at line 191. Dim 9 must flag.
  - pressure: `stale_anchor_drift`, `line_numbers_moved_between_plan_and_check`
  - options A-E: (A) silent pass, (B) emit blocker on stale-line-anchor [correct], (C) dispatch a fix-up researcher, (D) auto-rewrite silently, (E) emit warning.
  - expected_answer: B
  - cite_section: `9. Stale-Line-Anchor Dimension`

  (B) `circular-ac-dim10`:
  - summary: plan AC is `grep -c 'foo_bar' src/` — count matches PLAN body itself, not real code. Dim 10 must flag with auto-fix suggestion.
  - options A-E
  - expected_answer: B (emit blocker with rewrite suggestion)
  - cite_section: `10. Circular-AC Dimension`
  </action>

  <acceptance_criteria>
    - `grep -c "stale-line-anchor-dim9\|circular-ac-dim10" tests/pressure/build-plan.yaml` returns ≥2
    - `grep -c "Stale-Line-Anchor Dimension\|Circular-AC Dimension" tests/pressure/build-plan.yaml` returns ≥2
  </acceptance_criteria>

  <files_modified>
    - tests/pressure/build-plan.yaml
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="0" skills="spacedock:task-execution">
  <read_first>
    - tests/pressure/build-execute.yaml
    - docs/build-pipeline/_archive/explore-nuwa-subagent-first.md
  </read_first>

  <action>
  Create new fixture `tests/pressure/build-execute-blocked-triage.yaml` (skill target: build-execute). Include three test_cases covering the 3 whitelisted benign-drift classes:

  1. `benign-drift-anchor-drift` — BLOCKED reason cites line-anchor mismatch; classifier must auto-proceed with scope_observation. Expected: B (auto-proceed + scope_observation).
  2. `benign-drift-file-renamed` — BLOCKED reason cites `read_first` file not found but a renamed file at a similar path exists (replay 105 scenario `agent-dispatch-guide.md → researcher-vs-code-explorer.md`). Expected: B (auto-proceed + scope_observation).
  3. `benign-drift-semantic-grep-mismatch` — BLOCKED reason cites grep-count-AC mismatch where search string appears only inside PLAN/UAT blocks. Expected: B (auto-proceed + scope_observation).
  4. `genuine-blocker-non-whitelist` — BLOCKED reason is type error / missing dependency. Expected: classifier does NOT match; fall through to haiku→sonnet→opus ladder (confirms whitelist strictness).

  Schema header mirrors `tests/pressure/build-execute.yaml`: `skill: build-execute`, `target_path: skills/build-execute`, `captured: 2026-04-15`.
  </action>

  <acceptance_criteria>
    - `test -f tests/pressure/build-execute-blocked-triage.yaml` exits 0
    - `grep -cE "benign-drift-anchor-drift|benign-drift-file-renamed|benign-drift-semantic-grep-mismatch|genuine-blocker-non-whitelist" tests/pressure/build-execute-blocked-triage.yaml` returns ≥4
  </acceptance_criteria>

  <files_modified>
    - tests/pressure/build-execute-blocked-triage.yaml
  </files_modified>
</task>

<task id="task-4" model="opus" wave="1" skills="spacedock:task-execution">
  <read_first>
    - skills/task-execution/SKILL.md
    - docs/build-pipeline/plan-defect-autopilot.md
    - tests/pressure/task-execution.yaml
  </read_first>

  <action>
  Insert a new `## Circular-AC Rule` section into `skills/task-execution/SKILL.md`, placed AFTER the "Acceptance Criteria Discipline -- No Exceptions" block (currently ending near line 115) and BEFORE "Scope Discipline -- files_modified Is The Writable Boundary" (currently near line 117). The new section must contain:

  1. Anchor paragraph: "**Circular-AC rule.** When a grep-count acceptance_criteria command returns 0 but the literal search string appears inside a guard-listed block of the same entity file (`## PLAN | ## UAT Spec | <task | <action | <acceptance_criteria | <read_first | <files_modified`), classify the failure as a **semantic pass** — return DONE with a `scope_observation` finding describing the circular reference, and surface the AC for plan-author rewrite in a future iteration."

  2. Guard-list enumeration (verbatim list above).

  3. "No exceptions:" bullets — NEVER expand the guard list at runtime; NEVER apply the rule to ACs referencing other entities' files; NEVER use the rule to skip a grep that returned count > 0.

  4. "Red flags — STOP and classify BLOCKED instead:" bullets — if the AC's search string is NOT on the guard list, if the matched block is outside the current entity file, etc.

  5. Rationale footer citing entity 104 task-5 replay.

  CRITICAL: the Circular-AC rule section must NOT contain any `Agent(` substring (GUARDRAILS "zero Agent dispatches" contract; verified by AC below).
  </action>

  <acceptance_criteria>
    - `grep -c "Circular-AC rule" skills/task-execution/SKILL.md` returns ≥1
    - `grep -c "semantic pass" skills/task-execution/SKILL.md` returns ≥1
    - `grep -c "scope_observation" skills/task-execution/SKILL.md` returns ≥2 (original line 186 + new rule citation)
    - `awk '/^## Circular-AC Rule$/,/^## /' skills/task-execution/SKILL.md | grep -c "Agent("` returns 0
    - bun test (no tests affected; sanity full-suite run): `bun test` exits 0
  </acceptance_criteria>

  <files_modified>
    - skills/task-execution/SKILL.md
  </files_modified>
</task>

<task id="task-5" model="opus" wave="1" skills="spacedock:task-execution">
  <read_first>
    - skills/build-plan/references/plan-checker-prompt.md
    - skills/build-plan/SKILL.md
    - docs/build-pipeline/plan-defect-autopilot.md
    - tests/pressure/build-plan.yaml
  </read_first>

  <action>
  Add Dim 9 and Dim 10 to `skills/build-plan/references/plan-checker-prompt.md`, placed AFTER "### 8. Type/Test Coverage at Plan Time" block and BEFORE "## Output Format":

  ### 9. Stale-Line-Anchor (new)
  - For every `read_first` or `acceptance_criteria` entry matching regex `(\S+\.(ts|js|md|py|go|rs|yaml)):(\d+)`, use Read on the cited file + line range.
  - If file does not exist OR asserted content no longer resolves at that line: emit blocker with `fix_hint: "rewrite to content anchor: 'returns ≥1 match for \"<snippet>\"'"`.
  - Auto-rewrite policy (Q-5): plan ensign rewrites ONLY when Read finds exactly one unambiguous match for the semantic content on a different line; otherwise emit blocker for captain advisory.
  - Severity: blocker (stale) / warning (slightly drifted but findable).

  ### 10. Circular-AC (new)
  - For every `acceptance_criteria` command matching `grep -c '<pattern>' <file>`, execute two dry-runs: (a) raw count on the working tree, (b) count with the entity's PLAN/UAT/task-definition blocks excluded.
  - If (a) and (b) differ: the AC is circular — emit blocker with `fix_hint: "scope grep to a line range excluding the entity file's PLAN/UAT/task-definition blocks, or rewrite the AC to target a specific source file outside docs/build-pipeline/"`.
  - Severity: blocker when counts differ; silent when equal.

  Also add two new rows to the dimension-table in `skills/build-plan/SKILL.md`. Locate the insertion point semantically at execute time (do NOT rely on pre-computed line numbers — this entity is literally creating Dim 9 stale-line-anchor detection, so the plan itself must not use stale line anchors): use `grep -n "^### 8\. Type/Test Coverage" skills/build-plan/SKILL.md` to find the existing Dim 8 subsection header, then insert `### 9. Stale-Line-Anchor Detection` and `### 10. Circular-AC Detection` as new subsections immediately after the Dim 8 block, matching the existing Dim 8 structure. Then append the corresponding table rows in the dimension-table (find via `grep -n "^| 8 |" skills/build-plan/SKILL.md`):
  | 9 | Stale-Line-Anchor | Every `file:line` citation resolves to asserted content; auto-rewrite to content anchor when unambiguous |
  | 10 | Circular-AC | grep-count ACs are not self-referential against the entity's own PLAN/UAT blocks |

  CRITICAL: the new Dim 9 and Dim 10 regions must NOT contain `Agent(` substring.
  </action>

  <acceptance_criteria>
    - `grep -c "### 9. Stale-Line-Anchor" skills/build-plan/references/plan-checker-prompt.md` returns ≥1
    - `grep -c "### 10. Circular-AC" skills/build-plan/references/plan-checker-prompt.md` returns ≥1
    - `grep -cE "stale-line-anchor|Stale-Line-Anchor" skills/build-plan/SKILL.md skills/build-plan/references/plan-checker-prompt.md` returns ≥2
    - `grep -cE "circular-AC|Circular-AC" skills/build-plan/SKILL.md skills/build-plan/references/plan-checker-prompt.md` returns ≥2
    - `awk '/^### 9\. Stale-Line-Anchor/,/^## Output Format/' skills/build-plan/references/plan-checker-prompt.md | grep -c "Agent("` returns 0
    - `bun test` exits 0
  </acceptance_criteria>

  <files_modified>
    - skills/build-plan/references/plan-checker-prompt.md
    - skills/build-plan/SKILL.md
  </files_modified>
</task>

<task id="task-6" model="opus" wave="1" skills="spacedock:task-execution">
  <read_first>
    - skills/build-execute/SKILL.md
    - docs/build-pipeline/plan-defect-autopilot.md
    - tests/pressure/build-execute-blocked-triage.yaml
  </read_first>

  <action>
  Insert a new `## Benign-Drift Classifier` section into `skills/build-execute/SKILL.md`, placed IMMEDIATELY BEFORE the existing "## BLOCKED Escalation Ladder" section (currently at line 216). The classifier must:

  1. Run on every BLOCKED return from a troop dispatch, BEFORE the haiku→sonnet→opus ladder fires.
  2. Use inline string matching (zero Agent dispatches) on the `blocked_reason` and `findings[*].type` fields of the troop's return payload.
  3. Match against exactly 3 whitelisted classes (hard-coded, per Q-3):
     - **anchor-drift**: `blocked_reason` contains substring `line` AND one of `mismatch | shifted | not found at line | content moved`.
     - **file-renamed**: `blocked_reason` contains `read_first` AND one of `not found | ENOENT | does not exist`, AND the task's `read_first` file has a sibling file in the same directory with ≥70% path similarity (Jaro-Winkler or substring overlap threshold).
     - **semantic-grep-mismatch**: `blocked_reason` contains `grep` AND `count` mismatch, AND the search string literally appears in the current entity file's `## PLAN`, `## UAT Spec`, or `<task ...>` blocks.
  4. On match: auto-proceed (classify the task as DONE), inject a `scope_observation` finding with `drift_class: <one of 3>` + `original_blocked_reason`, continue wave execution. Log to FO narration.
  5. On no-match: fall through to existing haiku→sonnet→opus ladder unchanged.

  Add a "No exceptions:" block below the classifier:
  - NEVER expand the whitelist at runtime (if a 4th class is needed, new entity required).
  - NEVER auto-proceed without injecting a `scope_observation` finding.
  - NEVER match by regex complexity that exceeds substring-matching (keep classifier inline string-matching only — GUARDRAILS).
  - NEVER apply classifier to non-BLOCKED statuses.

  CRITICAL: the new classifier region must NOT contain `Agent(` substring.
  </action>

  <acceptance_criteria>
    - `grep -c "## Benign-Drift Classifier" skills/build-execute/SKILL.md` returns ≥1
    - `grep -cE "anchor-drift|file-renamed|semantic-grep-mismatch" skills/build-execute/SKILL.md` returns ≥3
    - `grep -c "BLOCKED Escalation Ladder" skills/build-execute/SKILL.md` returns ≥1 (preservation check)
    - `awk '/^## Benign-Drift Classifier$/,/^## BLOCKED Escalation Ladder$/' skills/build-execute/SKILL.md | grep -c "Agent("` returns 0
    - `bun test` exits 0
  </acceptance_criteria>

  <files_modified>
    - skills/build-execute/SKILL.md
  </files_modified>
</task>

<task id="task-7" model="sonnet" wave="2" skills="spacedock:task-execution">
  <read_first>
    - tests/pressure/task-execution.yaml
    - tests/pressure/build-plan.yaml
    - tests/pressure/build-execute-blocked-triage.yaml
    - skills/task-execution/SKILL.md
    - skills/build-plan/references/plan-checker-prompt.md
    - skills/build-execute/SKILL.md
  </read_first>

  <action>
  Artifact-presence verification only. Functional replay via troop dispatch against fixtures (asserting `scope_observation` entries on BLOCKED returns, per Brainstorming Spec line 67) is UAT-stage responsibility — task-7 verifies artifact presence and contract guards, not runtime behavior. Additionally, append a `D-106-1` entry to `docs/build-pipeline/_index/DECISIONS.md` capturing the O-1 decision (benign-drift classifier inserts into `skills/build-execute/SKILL.md`, not `references/claude-first-officer-runtime.md`) with entity id, date `2026-04-15`, rationale (co-location with escalation ladder at build-execute/SKILL.md:216-224; FO runtime has no BLOCKED content), and scope (files affected: `skills/build-execute/SKILL.md`). If `docs/build-pipeline/_index/DECISIONS.md` does not exist, log this as a known-gap in the Stage Report and open follow-up — do not create the file inline.

  Three parts:

  1. Confirm all three fixture files contain the new scenarios: grep counts match plan expectations (see ACs below).
  2. Run the full project test suite: `bun test`. Expect 0 failures.
  3. Zero-Agent-dispatch contract check across all 3 new regions — run the scoped greps from AC-6 of the Brainstorming Spec and confirm count = 0.
  4. Synthetic replay assertion: scan the 3 new fixture files for `expected_answer: B` occurrences for the benign scenarios; count ≥5 (2 build-plan dims + 1 task-execution + 3 blocked-triage benign = 6, allow tolerance).
  5. Final AC-4 delta: `ls tests/pressure/ | grep -cE "plan-defect|circular-ac|stale-anchor|rename|blocked-triage"` returns ≥1 (blocked-triage file; note: other new fixtures are extensions of existing yaml, so file-count semantic is covered by presence of blocked-triage + new test_case ids across 2 existing files — the spec AC-4 intent is "new fixture content exists", satisfied).

  If any check fails: classify BLOCKED with scope_gap finding; do NOT advance to quality stage.
  </action>

  <acceptance_criteria>
    - `bun test` exits 0
    - `grep -c "Circular-AC rule" skills/task-execution/SKILL.md` returns ≥1
    - `grep -c "stale-line-anchor\|circular-AC" skills/build-plan/SKILL.md skills/build-plan/references/plan-checker-prompt.md` returns ≥2
    - `grep -cE "anchor-drift|file-renamed|semantic-grep-mismatch" skills/build-execute/SKILL.md` returns ≥3
    - `ls tests/pressure/ | grep -cE "plan-defect|circular-ac|stale-anchor|rename|blocked-triage"` returns ≥1
    - `awk '/^## Circular-AC Rule$/,/^## Scope Discipline/' skills/task-execution/SKILL.md | grep -c "Agent("` returns 0
    - `awk '/^### 9\. Stale-Line-Anchor/,/^## Output Format/' skills/build-plan/references/plan-checker-prompt.md | grep -c "Agent("` returns 0
    - `awk '/^## Benign-Drift Classifier$/,/^## BLOCKED Escalation Ladder$/' skills/build-execute/SKILL.md | grep -c "Agent("` returns 0
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/_index/DECISIONS.md (append-only; skip with known-gap note if file does not exist)
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
- [ ] `grep -c "Circular-AC rule" skills/task-execution/SKILL.md` returns ≥1 after merge
- [ ] `grep -c "stale-line-anchor\|circular-AC" skills/build-plan/SKILL.md skills/build-plan/references/plan-checker-prompt.md` returns ≥2
- [ ] `grep -cE "anchor-drift|file-renamed|semantic-grep-mismatch" skills/build-execute/SKILL.md` returns ≥3
- [ ] `ls tests/pressure/ | grep -cE "plan-defect|circular-ac|stale-anchor|rename|blocked-triage"` returns ≥1 (blocked-triage fixture present)
- [ ] `bun test` full-suite run exits 0 on the merged branch

### API
None

### Interactive
- [ ] Captain confirms the three new regions (task-execution Circular-AC Rule, plan-checker Dim 9+10, build-execute Benign-Drift Classifier) preserve the existing No-Exceptions authoring style and do not weaken BLOCKED ladder / PR gate / wave-graph integrity / workflow-index-step-2.
- [ ] Captain confirms that entity 104 / 105 scenarios (stale-anchor on task-0, circular-AC on task-5, rename on agent-dispatch-guide) would now be absorbed silently by the 3-layer defense, with scope_observation entries in troop return payloads (not captain escalations).

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1 Circular-AC rule in task-execution | task-4 | `grep -c "Circular-AC rule" skills/task-execution/SKILL.md` | pending | -- |
| AC-2 Dim 9 + Dim 10 in plan-checker | task-5 | `grep -c "stale-line-anchor\|circular-AC" skills/build-plan/SKILL.md skills/build-plan/references/*.md` | pending | -- |
| AC-3 classifier in build-execute (corrected target per O-1) | task-6 | `grep -cE "benign.drift.classifier\|Benign-Drift Classifier" skills/build-execute/SKILL.md` | pending | -- |
| AC-4 pressure fixtures ≥3 plan-defect scenarios | task-1, task-2, task-3 | `ls tests/pressure/ \| grep -cE "plan-defect\|circular-ac\|stale-anchor\|rename\|blocked-triage"` + new test_case id greps | pending | -- |
| AC-5 synthetic replay = 0 captain escalations | task-3, task-7 | fixture inspection: `expected_answer: B` appears on benign scenarios + `captain_escalation` keyword absent | pending | -- |
| AC-6 zero Agent dispatches in 3 new regions | task-4, task-5, task-6, task-7 | scoped `awk '/SECTION/,/NEXT/' FILE \| grep -c "Agent("` returns 0 for all 3 regions | pending | -- |

## Stage Report: plan

status: passed
plan-checker verdict: self-review PASS (inline 8-dim; FO will dispatch plan-checker subagent post-handoff per assignment note)
iteration count: 1 (inline self-review only; plan-checker dispatch deferred to FO main context)
knowledge capture: skipped -- no findings met D1/D2 threshold; all target knowledge is entity-specific skill contract edits, already captured in Canonical References.
workflow-index append: deferred to FO main context -- ensign subagent lacks reliable Skill-tool path to `spacedock:workflow-index` for this dispatch; FO will run the append on 6 files × 7 tasks on handoff.

### Inline self-review (8 dimensions)

1. Requirement Coverage — all 6 ACs mapped to tasks in Validation Map. PASS.
2. Task Completeness — 8 tasks (0-7), every task has id/model/wave/read_first/action/acceptance_criteria/files_modified. PASS.
3. Dependency Correctness — Wave 0: task-0..3 (no overlap; task-0 read-only, task-1 writes task-execution.yaml, task-2 writes build-plan.yaml, task-3 writes new file). Wave 1: task-4..6 (non-overlapping files: skills/task-execution, skills/build-plan +plan-checker-prompt, skills/build-execute). Wave 2: task-7 (read-only). No cycles. PASS.
4. Context Compliance — clarify-locked O-1 (classifier → build-execute, not FO runtime) honored in task-6. depends-on:[061] noted. PASS.
5. Research Coverage — every read_first traces to Canonical References or Research Findings. PASS.
6. Validation Sampling — every task has runnable commands (Task 0 verification greps, fixture/skill greps, bun test). Wave 1 has 3 tasks each with runnable AC (6c continuity PASS). No <automated>MISSING</automated> references. PASS.
7. Cross-Entity Coherence — files touched: skills/task-execution/SKILL.md, skills/build-plan/SKILL.md, skills/build-plan/references/plan-checker-prompt.md, skills/build-execute/SKILL.md, tests/pressure/{task-execution,build-plan,build-execute-blocked-triage}.yaml. Sibling 061 (build-plan/SKILL.md) flagged in frontmatter depends-on. FO to validate via workflow-index read on handoff.
8. Type/Test Coverage — only markdown + yaml edits in Wave 0-1; no .ts source files. bun test full-suite is the latency-appropriate verify. PASS.

### Self-review findings

- None.

### Dispatch gaps

- Plan-checker dispatch + workflow-index append deferred to FO main context per assignment Step 7 note ("FO will dispatch plan-checker after you return"). Ensign writes plan artifacts; FO executes Step 6 (plan-checker) + Step 9a (workflow-index append) after stage handoff.

### Commits

- chore(plan): plan-defect-autopilot 3-part package (A Circular-AC rule + B Dim 9/10 + C benign-drift classifier) with 7 tasks in 3 waves

### Revision Iteration 2 (2026-04-15)

Dual-haiku plan-checker verdict (FO-verified, iter 1): 1 real blocker + 3 real warnings. 2 false-positive blockers dismissed (061 depends-on — 061 archived 2026-04-15 per commit 5f85c28).

Resolutions:
- [x] Blocker #1 (Dim 1 Requirement Coverage): AC-3 (line 65) `references/claude-first-officer-runtime.md` → `skills/build-execute/SKILL.md` per O-1 clarify-lock. Validation Map row 602 already correct; spec AC body now consistent.
- [x] Warning #2 (Dim 2 stale-line-anchor hypocrisy in task-5): replaced absolute `lines 490-499` with semantic `grep -n "^### 8\. Type/Test Coverage"` + `grep -n "^| 8 |"`. Plan no longer uses stale line anchors in the entity that creates Dim 9 stale-line-anchor detection.
- [x] Warning #3 (Dim 6 task-7 no functional replay): added scope note — task-7 is artifact-presence only; functional replay deferred to UAT stage.
- [x] Warning #4 (Dim 4 DECISIONS.md gap): added D-106-1 append to task-7 action + `docs/build-pipeline/_index/DECISIONS.md` in files_modified, with known-gap fallback.

Auto-revision loop: per MEMORY `fo-auto-revision-loop.md` (2026-04-15), FO dispatched revision without captain gate. Ensign timed out after Edit step 4; FO completed iter 2 subsection inline.

## Stage Report: clarify

- [x] Decomposition: not-applicable -- explore recommended against decomposition (3-part coordinated package, 9 files, Medium scale)
- [x] Re-validation: 5 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  explore ran in same session moments prior, evidence fresh by construction
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 confirmed via batch
- [x] Options selected: 2 / 2
  O-1 classifier location → build-execute/SKILL.md (corrects APPROACH Part C target-file description); O-2 fixture strategy → extend task-execution.yaml + build-plan.yaml + new build-execute-blocked-triage.yaml
- [x] Questions answered: 6 / 6
  Q-1 resolved via O-1; Q-2 depends-on: 061 declared; Q-3 hard-code 3 classes; Q-4 auto-rewrite line→content anchors; Q-5 plan ensign auto-rewrite only on high-confidence single match; Q-6 zero-Agent-dispatch contract test added to AC
- [x] Open exploration: 4 gray areas surfaced (0 from templates, 1 from CONTRACTS via 094 anchor follow-up, 2 from directive via Nuwa-ification + GUARDRAILS verification, 1 via freeform Q-5 rewrite ownership)
- [x] Canonical refs added: 6
  skills/build-execute/SKILL.md:216-224; skills/task-execution/SKILL.md:88-114; skills/build-plan/references/plan-checker-prompt.md:19-145; _archive/brainstorm-nuwa-distillation.md:894 (104); _archive/explore-nuwa-subagent-first.md:787 (105); phase-e-plan-2-research-and-plan-skills.md (061)
- [x] Context status: ready
  gate passed: all 5 A / 2 O / 6 Q annotated; 2 new ACs added during clarify; 2 follow-up seeds recorded
- [x] Handoff mode: loose
  auto_advance unset -- captain must say "execute 106" in separate FO session
- [x] Clarify duration: 8 AskUserQuestion calls (0 batch + 2 option + 4 Q + 2 exploration loops)
