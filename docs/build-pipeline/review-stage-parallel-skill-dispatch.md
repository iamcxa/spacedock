---
id: 069
title: Review Stage -- Parallel Ensign Skill Dispatch
status: draft
context_status: awaiting-clarify
source: captain
created: 2026-04-12T21:30:00+08:00
started:
completed:
verdict:
score: 0.80
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

## Captain Context Snapshot

- **Repo**: main @ 189e947 (spacedock)
- **Session**: SO triage session — captain advancing 069 after completing 067 (TDD) and 068 (build-distill) clarify. Review stage dispatch is a natural continuation of the "ensign can't fan out" limitation addressed by entity 065 (execute side).
- **Domain**: Runnable / Invokable (agent dispatch architecture), Readable / Textual (SKILL.md contract edits)
- **Related entities**:
  - 065 -- Flatten Dispatch Troops Architecture (draft — same pattern applied to execute stage)
  - 062 -- Phase E Plan 4 Dogfood (shipped — proved parallel trailofbits agents work in review)
  - 063 -- kc-pr-flow-mod (shipped — exposed ensign subagent limitation)
- **Created**: 2026-04-12T21:30:00+08:00

## Directive

> Redesign the review stage dispatch from "single ensign loads build-review skill which tries to fan-out agents internally" to "FO analyzes diff scope and dispatches 1-10 ensigns in parallel, each loading a single pr-review-toolkit skill." Additionally, fix single-entity mode's unnecessary team creation skip, and properly wire the `dispatch:` property on the review stage.

### Problem 1: Review fan-out is structurally unreachable
build-review SKILL.md describes a debate-driven model (3 themed reviewer teammates: security / correctness / style with SendMessage cross-challenge), but:
- README review stage has NO `dispatch:` property → FO defaults to `simple` → dispatches ONE ensign
- Ensign tries internal Agent() fan-out → no Agent tool (leaf worker) → falls back to inline pre-scan only
- The debate-driven design in SKILL.md is **aspirational, never executed**

### Problem 2: Single-entity mode unnecessarily kills teams
`claude-first-officer-runtime.md` says: "In single-entity mode, skip team creation entirely."
- Rationale: "prevents premature session termination in `-p` mode"
- But this also kills teams in interactive mode (`--agent`, direct conversation) where premature exit isn't a concern
- Without teams → no SendMessage → debate-driven is impossible even when the dispatch mode is correctly set

### Problem 3: No dispatch property on review stage
README review stage definition lacks `dispatch:` → defaults to `simple`. Even if problems 1 and 2 are fixed, FO still won't use the correct dispatch protocol unless the property is explicitly declared.

### Deliverables

1. **Review stage README**: Add `dispatch: debate-driven` (or chosen mode from O-1) to the review stage definition in `docs/build-pipeline/README.md`
2. **Single-entity mode unbinding**: Update `references/claude-first-officer-runtime.md` to only skip team creation in `-p` (pipe) mode, not in all single-entity mode invocations. Interactive single-entity sessions should create teams normally.
3. **build-review SKILL.md**: Transform from ensign-executed orchestrator into FO guidance document. Phase 1 (reviewer dispatch + debate) runs in FO context (which has Agent tool). Phase 2 (synthesis) by ensign or FO inline.
4. **FO dispatch 1-10 ensigns**: Each loads one pr-review-toolkit or trailofbits skill. Count scales with diff scope.

Skills to dispatch as individual ensigns:
- pr-review-toolkit:code-reviewer
- pr-review-toolkit:silent-failure-hunter
- pr-review-toolkit:comment-analyzer
- pr-review-toolkit:pr-test-analyzer
- pr-review-toolkit:type-design-analyzer
- pr-review-toolkit:code-simplifier

Trailofbits skills (when installed + applicable):
- differential-review:diff-review
- sharp-edges:sharp-edges
- variant-analysis:variant-analysis

### Changes required
1. Update `docs/build-pipeline/README.md` review stage — add `dispatch:` property
2. Update `skills/build-review/SKILL.md` — transform to FO guidance
3. Update `references/claude-first-officer-runtime.md` — unbind single-entity from bare mode (only skip teams in `-p` mode)
4. Update `references/first-officer-shared-core.md` — if single-entity mode definition needs clarification re: teams

## Brainstorming Spec

**APPROACH**: Refactor the review stage from "single ensign loads build-review skill which tries to fan-out agents internally (structurally impossible since ensigns lack Agent tool)" to "FO analyzes the execute-base..HEAD diff scope, determines relevant review facets, and dispatches 1-10 ensigns in parallel via Agent(), each loading exactly one pr-review-toolkit or trailofbits skill." FO collects all ensign results and synthesizes them into a classified findings table + Stage Report. This follows the same pattern as entity 065's troops architecture for execute (FO direct dispatch, leaf workers) but applied to the review stage. Pre-scan (CLAUDE.md compliance, stale refs, import graph, plan consistency) either stays inline in FO or becomes a dedicated ensign. Knowledge-capture remains a FO post-completion step. The number of review ensigns scales with diff scope: small diff (< 5 files) = 2-3 core reviewers, large diff (> 15 files) = 6-10 including trailofbits. build-review SKILL.md transforms from an ensign-executed orchestrator into FO guidance documentation (same transition 065 proposes for build-execute).

**ALTERNATIVE**: Keep single ensign for review but grant it Agent tool access by modifying the ensign agent definition. -- D-01 Rejected because giving ensign the Agent tool breaks the "ensign = leaf, no sub-dispatch" boundary established in Phase E. This boundary is load-bearing: it prevents context bloat from nested dispatches, keeps the dispatch tree shallow (FO → ensign, never FO → ensign → sub-ensign), and was confirmed as a hard constraint in Phase E Plan 2 Wave 1 pilot and entity 063. See memory: `subagent-cannot-nest-agent-dispatch.md`.

**GUARDRAILS**:
- Ensign remains a leaf worker — no Agent tool, no sub-dispatch. This entity does NOT change the ensign agent definition.
- FO already has Agent tool; this uses existing FO capability, not new infrastructure.
- Trailofbits skills (differential-review, sharp-edges, variant-analysis) are only dispatched when the plugin is installed AND the diff scope is relevant (security-sensitive files, API changes, etc.).
- build-review SKILL.md becomes FO guidance, not ensign instruction — same pattern as entity 065's proposed change to build-execute SKILL.md. Both entities share the "SKILL.md as FO playbook" design direction.
- Entity 065 (flatten dispatch) is a sibling architectural change; 069 should be compatible but independent. If 065 ships first, 069 adapts; if 069 ships first, 065 adapts.

**RATIONALE**: The "ensign can't fan out" limitation is not a bug — it's a deliberate architectural decision (shallow dispatch tree). Entity 062's dogfood proved that parallel review agents produce high-quality findings when dispatched correctly (4 trailofbits agents ran in parallel during Phase E Plan 4). Entity 065 addresses the same limitation for execute; 069 addresses it for review. Together they establish a consistent pattern: FO is the only orchestrator that fans out, ensigns are leaf workers. The diff-scope-based dispatch count prevents wasteful over-review on trivial changes while ensuring thorough coverage on large diffs.

## Acceptance Criteria

- Review stage in README has explicit `dispatch:` property (debate-driven or task-list-driven per O-1 decision). (how to verify: `grep "dispatch:" docs/build-pipeline/README.md` in the review stage block)
- FO dispatches N ensigns in parallel for review (N based on diff analysis). (how to verify: build-review SKILL.md documents FO dispatch table with skill-to-scope mapping)
- Each ensign loads exactly one pr-review-toolkit skill via Skill tool. (how to verify: each dispatched ensign's prompt contains exactly one `skill:` reference, not a list)
- FO synthesizes all ensign findings into a single classified Stage Report with severity levels (CRITICAL/HIGH/MEDIUM/LOW). (how to verify: `grep "Stage Report: review" {entity}` shows classified findings table)
- Single-entity mode creates teams in interactive sessions (only skips teams in `-p` pipe mode). (how to verify: `grep -A5 "single-entity" references/claude-first-officer-runtime.md` shows `-p` conditional, not blanket skip)
- Works in both bare mode (sequential fallback when `-p` mode) and teams mode (parallel in interactive). (how to verify: build-review SKILL.md documents both code paths)

## Assumptions

A-1: FO already has Agent tool and can dispatch parallel review agents — this is existing capability, not new infrastructure.
Confidence: Confident (0.95)
Evidence: skills/build-review/SKILL.md:91-97 -- FO already dispatches 3 themed reviewer teammates (security-reviewer, correctness-reviewer, style-reviewer) in the debate-driven model. The dispatch mechanism exists.

A-2: Pre-scan (CLAUDE.md compliance, stale refs, dependency chain, plan consistency) should stay inline in the review orchestrator, not be dispatched as a separate ensign.
Confidence: Confident (0.90)
Evidence: skills/build-review/SKILL.md:59 -- "Runs INLINE in your own orchestrator context before any parallel dispatch. These four checks are mechanical -- they do not need fresh context." Line 226 repeats as No-Exceptions rule.

A-3: The ensign = leaf / no sub-dispatch boundary is non-negotiable. Entity 069 must work within this constraint, not circumvent it.
Confidence: Confident (0.95)
Evidence: skills/build-review/SKILL.md:28 -- "Agent -- you run as an ensign subagent, which does not have the Agent tool"; memory: subagent-cannot-nest-agent-dispatch.md confirmed in Phase E Plan 2 + entity 063.

A-4: Knowledge-capture in capture mode (D1 auto-append + D2 staging) remains a post-classification step, invoked by the review orchestrator, not by individual reviewers.
Confidence: Confident (0.90)
Evidence: skills/build-review/SKILL.md:134-157 -- Step 4 invokes knowledge-capture from ensign context in mode:capture. Individual reviewers don't touch knowledge-capture.

## Option Comparisons

### Review dispatch architecture

The current build-review SKILL.md already describes a debate-driven model with 3 themed reviewer teammates. Entity 069's Directive proposes 1-10 single-skill reviewers. These are different architectures with different trade-offs.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Keep debate-driven (3 themed groups: security / correctness / style, debate via SendMessage) | Higher finding quality -- inter-reviewer debate catches false positives; fewer dispatches (3 not 10); each reviewer has broader context per theme | Requires teams/SendMessage (not available in all modes); debate adds latency; grouping decisions are hardcoded | Medium | Recommended |
| Switch to 1-per-skill (N single-skill ensigns, no debate) | Simpler dispatch; each ensign is pure leaf; scales linearly; no SendMessage dependency | No inter-reviewer debate -- findings may be redundant or contradictory; more dispatches; FO synthesis is harder with 10 independent reports | Medium | Viable |
| Hybrid -- themed groups for core, 1-per-skill for trailofbits | Core review uses debate (security/correctness/style groups); trailofbits skills dispatch as independent single-skill ensigns because they're add-on and don't need to debate core reviewers | Best of both; debate for depth, independence for add-ons | Medium | Viable |

## Open Questions

Q-1: Is the current debate-driven model actually implemented and working, or is it aspirational design?

Domain: Runnable / Invokable

Why it matters: build-review SKILL.md line 105 has a fallback: "If findings are absent (FO ran in simple subagent mode, no team dispatch): fall back to inline pre-scan only." This suggests the debate model might not be working in all contexts. If it IS working, 069's scope changes from "redesign" to "strengthen existing." If it ISN'T working, 069 needs to fix the implementation, not just change the architecture.

Suggested options: (a) It's working -- entity 062 used parallel reviewers successfully, (b) It's partially working -- some dispatches happen but debate via SendMessage doesn't, (c) It's aspirational -- the skill describes it but FO doesn't actually dispatch themed teams

Q-2: Should entity 069 preserve the debate pattern (SendMessage between reviewers) or simplify to independent parallel dispatch?

Domain: Runnable / Invokable

Why it matters: The debate pattern produces higher-quality findings (reviewers challenge each other's false positives) but requires teams/SendMessage infrastructure. If the captain values finding quality over simplicity, debate should be preserved. If the captain values reliability and broader compatibility (bare mode), independent parallel is safer.

Suggested options: (a) Preserve debate -- it's the design's competitive advantage over simple parallel, (b) Drop debate -- simplify to independent parallel for reliability, (c) Make debate optional -- works without it (independent), better with it (debate)

## Decomposition Recommendation

Not applicable -- 3 files to modify (build-review SKILL.md, FO shared core, FO runtime adapter), clearly Medium scope.

## Canonical References

(clarify stage will populate)

## Stage Report: explore

- [x] Files mapped: 6 across contract, config
  build-review SKILL.md (269 lines), first-officer-shared-core.md, claude-first-officer-runtime.md, agent-dispatch-guide.md, claude-ensign-runtime.md, codex-first-officer-runtime.md
- [x] Assumptions formed: 4 (Confident: 4, Likely: 0, Unclear: 0)
  A-1 FO dispatch exists (0.95); A-2 pre-scan inline (0.90); A-3 ensign=leaf (0.95); A-4 knowledge-capture post-classification (0.90)
- [x] Options surfaced: 1
  O-1 review dispatch architecture (debate-driven / 1-per-skill / hybrid)
- [x] Questions generated: 2
  Q-1 is debate model actually implemented?; Q-2 preserve debate or simplify?
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  3 files to modify, 6 files mapped total
