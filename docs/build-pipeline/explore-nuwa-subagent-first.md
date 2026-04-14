---
id: 105
title: Explore Nüwa-Alignment + Subagent-First Enforcement (v2) -- Multi-Angle Parallel Explorer + Track-A Triple-Gate + Tension Output
status: draft
context_status: pending
source: /build (decomposed from epic 102)
created: 2026-04-14T00:00:00Z
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
parent: brainstorm-dual-lens-cross-entity-dedup
children:
---

## Directive

> Port huashu-nuwa methodology elements into `skills/build-explore/SKILL.md` so the brainstorm→explore handoff preserves the Nüwa signal introduced in sibling child `104-brainstorm-nuwa-distillation`. Four mandatory changes + one optional:
>
> 7. **Multi-angle parallel explorer fanout (女媧 Phase 1 port into explore)**: Transform `skills/build-explore/SKILL.md` Step 2 from "dispatch 1 code-explorer (Mode A) OR inline read (Mode B)" into "dispatch N=4 parallel code-explorers, each with a fixed angle". Fixed angles: (i) Prevailing-patterns, (ii) Recent-decisions (commits + ADRs + design docs), (iii) Sibling-entity (CONTRACTS + INDEX + active-state entities), (iv) Negative-space (patterns the codebase deliberately avoids). Deprecate Mode B as primary path -- emergency fallback only, with Stage Report warning. Satisfies captain directive "除 clarify 外都 subagent 跑，包含 explorer".
> 8. **Triple-verification as Track-A promotion gate (女媧 Phase 2.1 port into explore)**: Replace Step 5 Hybrid Classification's soft "2+ usages = Confident, 1 = Likely or Unclear" rule with a hard 3-gate -- (i) Cross-layer recurrence (evidence across ≥2 distinct layers, not just 2 files in the same layer), (ii) Predictive power (assumption predicts plan/execute outputs rather than describing current state), (iii) Exclusivity (not a generic template match). Three-pass = Confident; 2-pass = Likely; 1-pass = Unclear; 0-pass = demote to Track C. Addresses captain-noted "why is everything so low confidence" pattern -- current Confidence is vibes-based; triple-gate makes it signal-based.
> 9. **Source weighting tier tags (女媧 Phase 1 source-table port into explore)**: Every `Evidence: {file}:{line}` line in `## Assumptions`, `## Option Comparisons`, `## Open Questions` carries `[primary|secondary|tertiary]` tier tag. Primary = captain directive / Canonical References / ADRs / design docs; secondary = codebase evidence with ≥2 consistent usages; tertiary = single usage / template match / "standard practice". Primary wins on conflict unless captain clarify override. Closes pipeline-wide source-hierarchy gap -- brainstorm v2's primary/secondary/tertiary gating would degrade at the explore handoff without this.
> 10. **`## Core Tensions` + `## Honest Boundaries` in explore output (女媧 Phase 2.4 + 2.6 port into explore)**: Explore produces both sections as first-class outputs. Core Tensions in explore = codebase-vs-brainstorm contradictions from Step 3.7 Claim Verification, typed (time-based / domain-based / essential). Honest Boundaries = explicit "this dimension could not be verified" declarations. Surfaces to clarify and plan as captain-facing artifacts rather than being flattened into Open Questions. Brainstorm→explore handoff becomes symmetrical.
> 11. **OPTIONAL -- Self-test gate in explore (女媧 Phase 4 port into explore)**: Before Stage Report writes, explore runs a 5-item self-check that blocks return on failure -- (i) every Track A has ≥2 evidence sources across ≥2 layers (enforces Port 8 mechanically), (ii) every Track B has ≥2 viable alternatives + ≥1 marked `✅ Recommended`, (iii) every Track C has `Suggested options:` with ≥2 options OR explicit `Open-ended -- captain decides`, (iv) every Evidence line carries tier tag (enforces Port 9 mechanically), (v) if `## Core Tensions` populated, every entry typed. Optional because it changes explore's ensign routing contract (today's explore is non-blocking; gate failures would need new FO handling). Plan-phase decides inclusion based on complexity budget.
>
> **Contract change**: Mode B inline reading deprecated as primary path; Mode A parallel-fanout becomes default. Plan-phase MUST audit every explore invocation path in the existing FO dispatch graph and confirm Agent-tool access (parent 102 Honest Boundary 9). See MEMORY.md `subagent-cannot-nest-agent-dispatch.md` for constraints.

## Captain Context Snapshot

- **Repo**: main @ 7b40cc9 (parent epic decomposed)
- **Parent**: epic 102 `brainstorm-dual-lens-cross-entity-dedup` -- decomposition accepted 2026-04-14, epic frozen
- **Session**: Phase E Plan 4 shipped; captain iterating on build-pipeline quality-uplift work. Nüwa methodology port applied to explore stage (symmetric with sibling child `104-brainstorm-nuwa-distillation`).
- **Domain**: Runnable/Invokable (skill behavior), Readable/Textual (new entity body sections), Organizational (cross-entity lens + INDEX/CONTRACTS dependencies)
- **Related entities**:
  - `104-brainstorm-nuwa-distillation` (sibling child) -- consumes this explore's tier-tag format; must share tier-tag syntax (parent 102 O-1 bracketed)
  - `build-explore-domain-aware-gray-areas` (active) -- Track-B/Track-C skill surface collision candidate; plan-phase must coordinate
  - `stage-report-evidence-and-confidence` (active) -- sibling quality-uplift; evidence-tier tagging surface overlap
  - `clarify-pre-presentation-evidence-gate` (active) -- downstream consumer of tier-tagged evidence
- **Parent decisions propagated** (from epic 102):
  - **O-1 tier tag syntax**: bracketed `[primary|secondary|tertiary]` (MUST match sibling child 104)
  - **Q-2 dashboard renderer target**: applies via new `## Core Tensions` + `## Honest Boundaries` sections in explore output -- inherits epic decision
  - **Q-3 escape-hatch string**: applies -- inherits epic decision
  - **Q-4 primary-tier tie-break**: applies (Track-A promotion gate uses tier logic)
  - **Q-5 INDEX.md staleness**: applies (sibling-entity explorer angle (iii) directly affected by INDEX freshness)
  - Core Tensions and Honest Boundaries from epic 102 propagate as seed inputs, especially:
    - essential (explore-scope): Track-A signal strength vs clarify throughput
    - domain-based (explore-scope): Mode A enforcement vs FO dispatch graph reality
    - time-based (cross-child): child 1 vs child 2 ship-window ordering
  - **Honest Boundaries 7-10 from epic 102**: propagate verbatim as seed inputs for explore v2 brainstorm
- **Plan-phase audit scope** (from parent Honest Boundary 9): enumerate every explore invocation path in FO dispatch graph; confirm Agent-tool access per path; mark paths lacking Agent access as "elevate to main session / SO-direct mode" OR "keep Mode B as fallback with Stage Report warning". This is a non-trivial audit the plan-phase must budget.
- **Cross-child coordination**: tier-tag syntax (O-1 bracketed) MUST be identical across 104 and 105. Ship-ordering decision (brainstorm-first vs explore-first vs parallel-ship with interim-degraded period) is a captain call at plan-phase entry for the second-to-ship child.
- **Created**: 2026-04-14 (decomposition from epic 102)
- **Next step**: SO session runs build-brainstorm on this entity -- `context_status: pending`
