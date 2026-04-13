---
id: 087
title: "Pre-ship confidence gate -- 5-factor scoring with auto-fix loop"
status: clarify
source: decomposition of entity 085 (stage report evidence and confidence)
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
parent: 085
context_status: ready
---

## Directive

> No holistic confidence assessment before shipping -- entities 051 (75%) and 052 (70%) shipped with known gaps. FO advances directly from UAT pass to shipped without scoring quality factors. Insert confidence check between UAT pass and shipped advance. Five factors scored 0-100% (test coverage 25%, type coverage 20%, review severity 20%, AC completeness 20%, integration breadth 15%). Composite < 90% triggers auto-fix dispatch. Cap at 3 iterations, then escalate to captain.

## Captain Context Snapshot

- **Repo**: main @ 7e1e213
- **Session**: Entity 086 (evidence minimums) just completed clarify; continuing SO pipeline to 087
- **Domain**: Behavioral / Callable, Runnable / Invokable
- **Related entities**: 085 -- Stage Report evidence + confidence gate (epic, parent), 082 -- UAT evidence (clarify/ready, dependency), 083 -- Multi-language ratchet (clarify/ready, dependency), 086 -- Evidence minimums (clarify/ready, sibling)
- **Created**: 2026-04-13T16:15:00+08:00

## Brainstorming Spec

**APPROACH**: Implement the confidence gate as FO routing logic in the UAT→shipped transition (per parent 085 explore O-1 recommendation). After UAT verdict = pass, FO reads Stage Reports from all prior stages (execute, quality, review, UAT) and computes a composite confidence score from 5 weighted factors: (1) test coverage 25% -- from quality Stage Report test count and entity 083's ratchet baselines, (2) type coverage 20% -- from quality Stage Report type-check results and 083's ratchet, (3) review severity 20% -- from review Stage Report classified findings (0 CRITICAL/HIGH = 100%, scale down by count), (4) AC completeness 20% -- from UAT Stage Report item pass rates and goal-backward findings, (5) integration breadth 15% -- from execute Stage Report files_modified coverage vs PLAN files_modified. If composite >= 90%, advance to shipped. If < 90%, identify the lowest-scoring factor, dispatch a targeted fix (re-enter execute with a generated fix task), then re-run quality→review→UAT→confidence for the fix. Cap at 3 iterations before escalating to captain with per-factor breakdown.

**ALTERNATIVE**: Instead of FO routing logic, create a dedicated "confidence" pipeline stage with its own skill and ensign, inserted between UAT and shipped in the profile definition. -- D-01 Rejected because adding a pipeline stage changes the stage graph, profile definitions, FO routing, and status script -- high blast radius for what is essentially a scoring computation that reads existing Stage Reports. FO routing keeps the check invisible to the stage graph while still being load-bearing.

**GUARDRAILS**:
- Confidence gate reads existing Stage Reports -- it does NOT re-run any checks. All data comes from prior stage outputs.
- Auto-fix dispatch re-enters the pipeline at execute with a generated task. It does NOT skip stages -- the fix flows through execute→quality→review→UAT→confidence normally.
- 3-iteration cap is hard -- no "just one more try" rationalization. Captain escalation on 3rd attempt is mandatory.
- Factor weights (25/20/20/20/15) are configurable in ops.config.json, not hardcoded in FO routing logic.
- Depends on entity 082 (UAT evidence format) and entity 083 (ratchet baselines) -- confidence gate cannot ship before these dependencies land.

**RATIONALE**: FO routing is correct because the confidence gate is a transition guard, not a pipeline stage. It reads already-produced Stage Report data and computes a score -- it does not execute commands, dispatch agents, or produce its own Stage Report. A pipeline stage would add cold-start context cost, stage graph complexity, and profile changes for a computation that is naturally a pre-transition check. The UAT→shipped transition is FO-owned (build-uat SKILL.md:186), making FO routing the architecturally natural insertion point.

## Acceptance Criteria

- [ ] Given a completed UAT with composite confidence < 90%, when the confidence gate fires, then it identifies which factors pull score down and dispatches targeted fix ensigns (how to verify: ship entity with low type coverage, observe auto-fix cycle before PR)
- [ ] Given the confidence gate auto-fix has iterated 3 times without reaching 90%, when the 3rd attempt completes, then the gate escalates to captain with a per-factor breakdown instead of retrying (how to verify: create scenario with persistent gap, observe escalation after 3 attempts)
- [ ] Given a completed UAT with composite confidence >= 90%, when the confidence gate fires, then it advances to shipped without blocking (how to verify: ship entity with full test + type coverage, observe direct advance)
- [ ] Given confidence gate factor weights in ops.config.json, when the weights are modified, then the gate uses the updated weights on the next run (how to verify: change weights in ops.config.json, re-run confidence gate, observe different composite score)
- [ ] Given FO runs the merge hook (PR creation), when confidence has been computed, then FO displays the per-factor breakdown and composite score to the captain BEFORE creating the PR (how to verify: observe FO output during merge hook shows confidence table with 5 factors, weights, scores, and composite)
- [ ] Given confidence < 90% at merge hook time, when FO displays the breakdown, then FO blocks PR creation and routes to auto-fix loop instead of creating PR (how to verify: entity with low score does not get PR created until confidence passes)

## Assumptions

A-1: The confidence gate inserts into FO's UAT→shipped routing logic. After FO reads UAT verdict = pass, it runs confidence scoring before advancing to shipped. No new pipeline stage needed.
Confidence: Confident (0.90)
Evidence: build-uat SKILL.md:186 -- "All items pass → verdict pass, no feedback-to, FO advances entity to shipped." README.md:397 -- "shipped" is terminal stage, mod-driven. Gate intercepts the FO transition, not the stage graph.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: All 5 factor data sources already exist in Stage Reports produced by prior stages. No new data collection needed -- the gate is a pure reader/scorer.
Confidence: Confident (0.85)
Evidence: quality Stage Report has test/type/lint/build verdicts per check (SKILL.md:159). Review Stage Report has classified findings table (SKILL.md:279). Execute Stage Report has per-task status + commit SHAs (SKILL.md:52). UAT Stage Report has per-item pass/fail/skipped (SKILL.md:197).
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Factor weights stored in ops.config.json `confidence_weights` key. ops.config.json does NOT exist yet -- entity 083 (ratchet) will create it and write `ratchet_baselines` on first quality pass. build-quality SKILL.md:144 already has the read-path logic (graceful skip when absent). 087 adds a second consumer key to a file 083 creates.
Confidence: Likely (0.75)
Evidence: build-quality SKILL.md:144 -- ops.config.json read logic exists but file is absent (Glob confirmed). Entity 083 A-2/A-4 -- ops.config.json creation + ratchet_baselines write confirmed by captain. 087 follows same pattern: add key, read on gate entry.
→ Corrected by captain, 2026-04-13 (batch): "ops.config.json 尚未存在，083 會建立它。087 只是多加一個 key，不是寫入已存在的檔案"

A-4: Auto-fix loop is a full pipeline re-entry: execute→quality→review→UAT→confidence. Each iteration dispatches 4 stages. With 3-iteration cap, max 12 stage dispatches for a stubborn gap.
Confidence: Confident (0.85)
Evidence: Pipeline README stage ordering is linear. There is no shortcut path that skips stages. FO dispatches stages in order per profile.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Auto-fix dispatch mechanism

When confidence < 90%, how does the gate dispatch the fix?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Full pipeline re-entry | All stages re-run; quality gate catches regressions; consistent with existing fix flow | 4-stage overhead per iteration; max 12 dispatches for 3 attempts; heavy | High | Recommended |
| Captain-assisted fix | Gate presents breakdown, captain writes fix task, controls iteration | Breaks automation; captain must be present; defeats "auto" in auto-fix | Low | Viable |
| Targeted stage re-entry | Only re-run the stage that produced low score | Skips intermediate stages; fix might introduce review issues that get missed; violates stage ordering contract | Medium | Not recommended |

→ Selected: Full pipeline re-entry (captain, 2026-04-13, interactive)

## Open Questions

Q-1: How is "integration breadth" (15% factor) computed? The APPROACH says "execute Stage Report files_modified coverage vs PLAN files_modified" -- does this mean (files actually modified / files planned to modify)?

Domain: Behavioral/Callable

Why it matters: This factor's definition determines whether it catches partially-completed entities (e.g., entity that planned 10 file changes but only modified 7). A clear formula is needed for the scoring implementation.

Suggested options: (a) Ratio: count(files_modified in execute Stage Report) / count(files_modified in PLAN) -- simple percentage, (b) Binary: all planned files modified = 100%, any missing = 0% -- harsh but simple, (c) Weighted by task importance: critical-path tasks' files weighted higher than polish tasks

→ Answer: Weighted by task criticality -- critical-path task files weighted higher than polish tasks. The PLAN's task schema already distinguishes wave ordering (wave 0 = foundation, higher waves = incremental). Use wave position as a proxy for criticality: wave 0 files contribute more to the integration breadth score than later-wave files. (captain, 2026-04-13, interactive)

Q-2: Does the auto-fix loop reset the UAT stage? If UAT already passed with captain sign-off, does the fix iteration require captain to re-approve all UAT items?

Domain: Runnable/Invokable

Why it matters: If UAT re-runs after a fix, captain must re-approve interactive items -- expensive and potentially annoying. If UAT is skipped or only re-runs automated items, interactive verification may be stale.

Suggested options: (a) Full UAT re-run including interactive items -- captain re-approves everything, (b) Automated-only re-run -- skip interactive items that already passed, captain only reviews new/changed items, (c) UAT skip -- trust prior UAT pass, only re-run quality and review for the fix diff

→ Answer: Automated-only re-run -- skip interactive items that already passed with captain sign-off. Captain only reviews new/changed items from the fix. Prior-pass interactive items remain valid. Least disruptive while still verifying the fix didn't break automated checks. (captain, 2026-04-13, interactive)

## Canonical References

(none cited)

## Stage Report: explore

- [x] Files mapped: 5 across skill, config, entity layers
  build-uat SKILL.md:186 (UAT→shipped transition), build-quality SKILL.md:144 (ops.config), README.md:397 (shipped stage), entity 082 (evidence format), entity 083 (ratchet baselines)
- [x] Assumptions formed: 4 (Confident: 3, Likely: 1)
  A-1 FO routing insertion (0.90), A-2 Stage Report data sources (0.85), A-3 ops.config weights (0.75), A-4 full pipeline re-entry (0.85)
- [x] Options surfaced: 1
  O-1 auto-fix dispatch mechanism (full re-entry vs captain-assisted vs targeted)
- [x] Questions generated: 2
  Q-1 integration breadth formula; Q-2 UAT reset on auto-fix iteration
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  5 files mapped; FO routing modification + ops.config schema + scoring logic
- [x] Research dispatched: 0 researchers (skipped -- all assumptions on internal architecture, no external tech claims)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Medium scope, no children proposed
- [x] Re-validation: 4 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  all evidence holds; A-3 wording corrected (ops.config.json not yet created)
- [x] Assumptions confirmed: 4 / 4 (1 corrected)
  A-1 FO routing, A-2 data sources, A-4 full re-entry confirmed batch; A-3 corrected -- ops.config.json doesn't exist yet, 083 creates it
- [x] Options selected: 1 / 1
  O-1 full pipeline re-entry for auto-fix dispatch (recommended)
- [x] Questions answered: 2 / 2
  Q-1 integration breadth weighted by task criticality (wave position proxy); Q-2 automated-only UAT re-run on fix iteration
- [x] Open exploration: 0 gray areas surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 0 via freeform)
  FO routing, scoring factors, and auto-fix mechanism all resolved
- [x] Canonical refs added: 0
  no external file references cited
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 087" when ready
- [x] Clarify duration: 4 questions asked, session complete
  1 batch + 1 option + 2 Qs

## Problem

No holistic confidence assessment before shipping -- entities 051 (75%) and 052 (70%) shipped with known gaps. FO advances directly from UAT pass to shipped without scoring quality factors.

## Scope

Insert confidence check between UAT pass and shipped advance. Five factors scored 0-100% (test coverage 25%, type coverage 20%, review severity 20%, AC completeness 20%, integration breadth 15%). If composite < 90%, auto-iterate: dispatch targeted fix ensigns, re-verify, re-score. Only advance to shipped when >= 90%. Cap auto-fix at 3 iterations before escalating to captain.

## Acceptance Criteria

- [ ] Given a completed UAT with composite confidence < 90%, when the confidence gate fires, then it identifies which factors pull score down and dispatches targeted fix ensigns (how to verify: ship entity with low type coverage, observe auto-fix cycle before PR)
- [ ] Given the confidence gate auto-fix has iterated 3 times without reaching 90%, when the 3rd attempt completes, then the gate escalates to captain with a per-factor breakdown instead of retrying (how to verify: create scenario with persistent gap, observe escalation after 3 attempts)
- [ ] Given a completed UAT with composite confidence >= 90%, when the confidence gate fires, then it advances to shipped without blocking (how to verify: ship entity with full test + type coverage, observe direct advance)

## References

- Parent entity 085: stage report evidence and confidence (epic)
- Entity 082 (UAT evidence): confidence gate scores UAT evidence quality -- depends-on
- Entity 083 (multi-language ratchet): confidence gate scores type/test coverage -- depends-on
- `skills/build-uat/SKILL.md`: UAT verdict consumed by confidence gate
- `docs/build-pipeline/README.md`: shipped stage transition documentation
