---
id: 085
title: "Stage Report evidence minimums + pre-ship confidence gate"
status: draft
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
context_status: pending
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
