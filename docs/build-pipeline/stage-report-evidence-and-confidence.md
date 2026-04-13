---
id: 085
title: "Stage Report evidence minimums + pre-ship confidence gate"
status: epic
source: decomposition of entity 074 (pipeline verification quality uplift)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [082, 083]
parent: 074
children: [086, 087, 088]
context_status: explored
---

## Directive

> Stage Reports often contain checklist items marked DONE with minimal evidence ("all checks pass" without showing what was checked). No holistic confidence assessment before shipping -- entities 051 (75%) and 052 (70%) shipped with known gaps. No debate-driven skill simulation exists. Three gaps to close: (Gap 3) Add evidence minimum rules to each stage skill's Rules section. (Gap 5) Debate-driven skill simulation for skill entities -- may be deferred if design complexity warrants. (Gap 7) Pre-ship confidence gate with five weighted factors, auto-fix below 90%.

## Captain Context Snapshot

- **Repo**: main @ dca113e
- **Session**: Entity 084 (review forge validation) just completed clarify; SO pipeline continues to 085
- **Domain**: Runnable / Invokable, Readable / Textual, Behavioral / Callable, Organizational / Data-transforming
- **Scope flag**: ⚠️ likely-decomposable
- **Related entities**: 082 -- UAT evidence and recording (clarify/ready, dependency), 083 -- Multi-language coverage ratchet (clarify/ready, dependency), 084 -- Review forge validation (clarify/ready, sibling), 074 -- Pipeline Verification Quality Uplift (epic, parent)
- **Created**: 2026-04-13T15:30:00+08:00

## Brainstorming Spec

**APPROACH**: Three-layer verification uplift. (1) Evidence minimums: add "evidence minimum" rules to each stage skill's Rules section (build-execute, build-quality, build-review, build-uat SKILL.md). Each stage has a specific evidence template -- execute requires per-task commit SHA and files changed count, quality requires actual command output and test counts, review requires classified findings table, UAT requires per-item evidence table with inline artifacts. (2) Debate-driven skill simulation: for skill entities, UAT gains a sub-step that dispatches 2+ ensigns to role-play skill interactions (needs clarification -- deferred to explore). (3) Pre-ship confidence gate: insert a new check between UAT pass and shipped status. Five weighted factors (test coverage 25%, type coverage 20%, review severity 20%, AC completeness 20%, integration breadth 15%) produce a composite score. Below 90% triggers auto-fix dispatch; only >=90% advances to shipped.

**ALTERNATIVE**: Instead of a five-factor composite confidence gate, use a simpler binary quality gate: pass if and only if ALL existing stage reports have zero CRITICAL/HIGH findings AND all AC are marked complete. -- D-01 Rejected because the binary gate doesn't catch gradual quality erosion (entities 051/052 shipped at 75%/70% with no CRITICAL findings but known coverage gaps) and doesn't provide a quantitative signal for captain review.

**GUARDRAILS**:
- Evidence minimums are additive -- new Rules lines in existing SKILL.md files. Do not restructure existing Stage Report formats.
- Confidence gate depends on entity 082 (UAT evidence quality) and entity 083 (type/test coverage ratchet) -- their outputs feed the scoring factors.
- Gap 5 (debate-driven simulation) is explicitly marked "may be deferred" in the decomposition source -- design complexity assessment during explore determines inclusion.
- Pre-ship confidence gate must not create an infinite retry loop -- cap auto-fix iterations (max 3 attempts before escalating to captain).
- Each factor's weight (25/20/20/20/15) is a starting point -- captain may adjust during clarify.

**RATIONALE**: The three-layer approach addresses distinct failure modes: evidence minimums prevent thin "all pass" reports (post-hoc documentation), the confidence gate prevents shipping with known gaps (quantitative threshold), and debate-driven simulation prevents skill entities from shipping without interaction testing. The composite scoring model is better than binary pass/fail because it provides a continuous signal -- the captain can see which specific factor pulls the score down and decide whether it's acceptable risk, rather than facing an opaque fail.

## Acceptance Criteria

- [ ] Given a completed execute stage, when Stage Report is written, then it includes per-task commit SHA, files changed count, and at minimum 1 line of test evidence per AC (how to verify: read execute Stage Report, confirm evidence fields present)
- [ ] Given all 4 stage skills, when their Rules sections are read, then each has a documented "evidence minimum" requirement (how to verify: grep "evidence minimum" in execute/quality/review/uat SKILL.md Rules)
- [ ] Given a completed UAT with composite confidence < 90%, when the confidence gate fires, then it identifies which factors pull score down and dispatches targeted fix ensigns (how to verify: ship entity with low type coverage, observe auto-fix cycle before PR)
- [ ] Given the confidence gate auto-fix has iterated 3 times without reaching 90%, when the 3rd attempt completes, then the gate escalates to captain with a per-factor breakdown instead of retrying (how to verify: create scenario with persistent gap, observe escalation after 3 attempts)

## Assumptions

A-1: Evidence minimums are additive Rules section bullets in each of the 4 stage SKILL.md files. Each file has a `## Rules` section at the end. Adding "evidence minimum" requirements follows the exact same pattern as existing Rules bullets.
Confidence: Confident (0.92)
Evidence: build-execute SKILL.md Rules section exists. build-quality SKILL.md Rules section exists (line ~200+). build-review SKILL.md Rules section (line 326+). build-uat SKILL.md Rules section (line 253+). All use identical format.

A-2: Each stage skill's Stage Report already has a structured format that FO parses. Evidence minimums extend these formats with additional required fields per stage, not new sections.
Confidence: Confident (0.85)
Evidence: build-quality SKILL.md:159 -- "structured verdict per check category." build-execute SKILL.md:52 -- "wave-by-wave dispatch log." build-review SKILL.md:279 -- Stage Report format with pre-scan/dispatch/findings sections.

A-3: Confidence gate consumes entity 082's inline evidence format (markdown images for browser, transcript blocks for CLI) and entity 083's ratchet data (ops.config.json baselines). Both formats are machine-parseable.
Confidence: Likely (0.75)
Evidence: Entity 082 GUARDRAILS: "ensure inline format is machine-parseable for confidence scoring." Entity 083 A-4: ops.config.json stores baseline counts with per-language keying. Both entities in clarify/ready -- formats defined but not yet implemented.

A-4: FO owns the UAT→shipped transition. After UAT verdict pass, FO advances entity to shipped. The confidence gate intercepts this transition.
Confidence: Confident (0.88)
Evidence: build-uat SKILL.md:186-188 -- "All items pass -> verdict pass, no feedback-to, FO advances entity to shipped." README.md:397 -- shipped stage documentation.

## Option Comparisons

### O-1: Confidence gate placement

Where should the 5-factor confidence check run, between UAT pass and shipped advance?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| FO routing logic (post-UAT check) | No new stage; minimal blast radius; FO already owns the UAT→shipped transition; reads existing Stage Reports | Logic scattered in FO routing; harder to test independently; no dedicated Stage Report | Low | Recommended |
| New "confidence" pipeline stage | Clean separation; own ensign + Stage Report; independently testable | Adds stage to every profile; FO routing changes; stage graph modification; high blast radius | High | Not recommended |
| Pipeline mod (like pr-review-loop) | Modular; fires on transition event; does not modify existing stages or FO routing directly | Mod infrastructure complexity; untested pattern for scoring logic; mods are better suited for optional behaviors | Medium | Viable |

## Open Questions

Q-1: How should debate-driven skill simulation work? No codebase precedent exists for role-play ensign dispatch. The closest analogy is build-review's debate-driven reviewer pattern (themed reviewers dispatch + SendMessage debate), but reviewer debate verifies code, not skill interaction.

Domain: Runnable/Invokable

Why it matters: Skill entities (e.g., build-distill, build-clarify) currently ship without any interaction testing beyond structural validation. The simulation would catch skills that load correctly but fail in real interaction flows. However, the design complexity (fixture answers, role assignment, interaction log capture) may warrant deferral.

Suggested options: (a) Adapt build-review debate pattern -- dispatch 2 ensigns as teammates, one loads skill as SO, other plays captain with fixture answers from the entity's own clarify Q&A history, (b) Defer entirely to a future entity -- the design complexity is high and evidence minimums + confidence gate already close the most critical gaps, (c) Design-only in this entity -- produce a spec for skill simulation but do not implement, let a future entity execute

Q-2: How should the confidence gate's auto-fix dispatch work when composite score < 90%? The gate identifies which factors pull the score down, but what does "targeted fix" mean concretely?

Domain: Behavioral/Callable

Why it matters: Without a concrete fix mechanism, the gate is just a scoring display. The auto-fix iteration is what makes the gate active rather than informational.

Suggested options: (a) Re-dispatch to execute with factor-specific tasks (e.g., low test coverage → task "add tests for uncovered AC"), (b) Captain-assisted -- gate presents the per-factor breakdown, captain writes the fix task, gate re-scores, (c) Factor-specific playbooks -- each factor has a predefined fix action (test coverage → run missing test generator, type coverage → add tsconfig include paths)

## Decomposition Recommendation

⚠️ This entity spans 3 sub-scopes with different complexity, different dependency chains, and different deferral risk. The current `depends-on: [082, 083]` only applies to Gap 7 (confidence gate), not Gap 3 (evidence minimums). Consider splitting:

1. `stage-report-evidence-minimums` -- Add evidence minimum Rules to 4 stage SKILL.md files (Readable/Textual, Small, depends-on: none)
2. `pre-ship-confidence-gate` -- 5-factor scoring between UAT and shipped with auto-fix loop (Behavioral/Callable + Runnable/Invokable, Medium, depends-on: [082, 083])
3. `debate-driven-skill-simulation` -- Design + implement role-play ensign dispatch for skill entities (Runnable/Invokable, Medium, depends-on: none, may defer)

Dependencies:
- Child 1 can ship independently (no upstream dependency)
- Child 2 depends on 082 (evidence format) and 083 (ratchet data)
- Child 3 is independent but may be deferred entirely per Gap 5 directive

## Stage Report: explore

- [x] Files mapped: 6 across skill, config, entity layers
  build-execute SKILL.md, build-quality SKILL.md, build-review SKILL.md, build-uat SKILL.md (evidence minimum targets), README.md (shipped stage), entity 082 + 083 (dependency decisions)
- [x] Assumptions formed: 4 (Confident: 3, Likely: 1)
  A-1 evidence minimum Rules pattern (0.92), A-2 Stage Report structure (0.85), A-3 082/083 format consumption (0.75), A-4 FO UAT→shipped transition (0.88)
- [x] Options surfaced: 1
  O-1 confidence gate placement (FO routing vs new stage vs mod)
- [x] Questions generated: 2
  Q-1 debate-driven simulation design (from α marker); Q-2 auto-fix dispatch mechanism
- [x] α markers resolved: 0 / 1
  α-1 (debate simulation) escalated to Q-1 -- no codebase precedent for role-play ensign dispatch
- [x] Scale assessment: confirmed Medium
  6 files mapped across 3 sub-scopes; decomposition recommended to split into Small + Medium + Medium
- [x] Research dispatched: 0 researchers (skipped -- all assumptions on internal architecture, no external tech claims)

## Problem

Stage Reports often contain checklist items marked DONE with minimal evidence ("all checks pass" without showing what was checked). No holistic confidence assessment before shipping — entities 051 (75%) and 052 (70%) shipped with known gaps. No debate-driven skill simulation exists.

## Scope

### Gap 3: Stage Report evidence minimums

Add "evidence minimum" rules to each stage skill's Rules section:
- Execute: per-task commit SHA, files changed count, test evidence per AC
- Quality: actual command output (first/last N lines), test count, fail details
- Review: classified findings table with file:line citations
- UAT: per-item evidence table with inline artifacts

### Gap 5: Debate-driven skill simulation (design decision)

For skill entities, UAT (or a new sub-step) dispatches 2+ ensigns that each load the new skill and interact. Example: one ensign plays "SO invoking build-distill", another plays "captain responding" with fixture answers. Interaction log becomes evidence. May be deferred if design complexity warrants.

### Gap 7: Pre-ship confidence gate

Insert confidence check between UAT and shipped. Five factors scored 0-100% (test coverage 25%, type coverage 20%, review severity 20%, AC completeness 20%, integration breadth 15%). If composite < 90%, auto-iterate: dispatch targeted fix ensigns, re-verify, re-score. Only advance to shipped when >= 90%.

## Acceptance Criteria

- [ ] Given a completed execute stage, when Stage Report is written, then it includes per-task commit SHA, files changed count, and at minimum 1 line of test evidence per AC (how to verify: read execute Stage Report, confirm evidence fields present)
- [ ] Given all 4 stage skills, when their Rules sections are read, then each has a documented "evidence minimum" requirement (how to verify: grep "evidence minimum" in execute/quality/review/uat SKILL.md Rules)
- [ ] Given a completed UAT with composite confidence < 90%, when the confidence gate fires, then it identifies which factors pull score down and dispatches targeted fix ensigns (how to verify: ship entity with low type coverage, observe auto-fix cycle before PR)

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 082 (UAT evidence): confidence gate scores UAT evidence quality — depends-on
- Entity 083 (multi-language ratchet): confidence gate scores type/test coverage — depends-on
- `skills/build-execute/SKILL.md`: Stage Report evidence target
- `skills/build-quality/SKILL.md`: Stage Report evidence target
- `skills/build-review/SKILL.md`: Stage Report evidence target
- `skills/build-uat/SKILL.md`: Stage Report evidence + confidence gate target
