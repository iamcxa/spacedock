---
id: 104
title: Brainstorm Nüwa-Style Distillation (v2) -- Multi-Lens Collection + Triple-Verification Gate + Tension Preservation
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

> Transform `skills/build-brainstorm/SKILL.md` from a single-paragraph APPROACH distiller (⚠ parent 102 Q-1: actual current form is 4-section brainstorming-spec distiller -- APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE + Step 2.5 Goal Check) into a **multi-lens synthesis engine with a merge gate and tension preservation**, porting huashu-nuwa Phase 1-through-Phase 4 methodology to the build-brainstorm stage. Six coordinated changes:
>
> 1. **Multi-lens parallel collection (女媧 Phase 1 port)**: Before writing APPROACH, gather 4 orthogonal lenses -- (a) Captain-stated-intent, (b) Captain-unstated-intent, (c) Codebase-current-state, (d) Sibling-entity -- and write each to a new `## Lens Evidence` section with per-lens subsection. Each lens subsection lists ≥1 `file:line` or `entity:ID` citation.
> 2. **Merge gate via triple verification (女媧 Phase 2.1 port)**: Before a claim lands in APPROACH, it must pass 3 independent gates -- (i) Cross-lens recurrence (≥2 of 4 lenses support), (ii) Generative power (predicts what downstream stages will discover), (iii) Exclusivity (distinguishes from sibling entities). Claims passing all 3 → APPROACH; 1-2 → demote to GUARDRAILS; 0 → discarded with Stage Report line. Cross-entity dedup is absorbed into gate (iii), not a separate mechanism.
> 3. **Core Tensions preservation (女媧 Phase 2.4 port)**: New entity body section `## Core Tensions` captures essential contradictions within APPROACH that must NOT be resolved at brainstorm time. Three tension types: time-based, domain-based, essential. Never emptied by explore/clarify -- annotated with captain decisions or accepted-as-trade-off markers.
> 4. **Honest Boundaries section (女媧 Phase 2.6 port)**: New entity body section `## Honest Boundaries` declares what the proposed APPROACH fundamentally cannot deliver. Distinct from α markers. Every brainstorm spec must populate the section OR write the deliberate assessment `None identified -- checked`.
> 5. **Source weighting hierarchy (女媧 Phase 1 source-table port)**: Every citation in `## Lens Evidence` carries a tier tag -- primary / secondary / tertiary. When two lenses contradict on a load-bearing fact, primary wins unless captain explicitly documented override. Un-cited claims from agent memory cannot anchor a lens finding.
> 6. **Quality self-test gate (女媧 Phase 4 port)**: Before returning output, run a 5-item self-check -- (i) APPROACH contains 3-7 claims (soft target with α-marker inflection per epic 102 A-2), (ii) every APPROACH claim supported by ≥2 lens citations, (iii) `## Core Tensions` populated or escape-hatch string present, (iv) `## Honest Boundaries` populated or escape-hatch string present, (v) every lens citation carries tier tag. Any failure blocks return until fixed inline, OR converts to α marker with specific reason.
>
> **Contract change**: leaf skill → orchestrator skill. The 4 lens collections MUST be dispatched as 4 parallel fresh-context subagents (spacedock:researcher for lenses (a)/(b), spacedock:code-explorer for lenses (c)/(d)). See parent 102 Honest Boundary 6.

## Captain Context Snapshot

- **Repo**: main @ 7b40cc9 (parent epic decomposed)
- **Parent**: epic 102 `brainstorm-dual-lens-cross-entity-dedup` -- decomposition accepted 2026-04-14, epic frozen
- **Session**: Phase E Plan 4 shipped; captain iterating on build-pipeline quality-uplift work. Nüwa methodology port applied to brainstorm stage.
- **Domain**: Runnable/Invokable (skill behavior), Readable/Textual (new entity body sections)
- **Related entities**:
  - `036 — Pipeline Brainstorm + Profiles — Integration & E2E` (shipped, no skill surface collision)
  - `build-flow-tdd-discipline` (in-flight) -- pre-existing CONTRACTS contract on `skills/build-brainstorm/SKILL.md` Step 4 AC guidance; coordination required at plan-phase (parent 102 Q-6 CONTRACTS arm)
  - `build-explore-domain-aware-gray-areas` (active) -- source of the contradiction-annotation pattern this directive generalizes
  - `102-explore-nuwa` (sibling child) -- must share tier-tag syntax (parent 102 O-1 bracketed)
- **Parent decisions propagated** (from epic 102):
  - **O-1 tier tag syntax**: bracketed `[primary|secondary|tertiary]` (captain decision at epic clarify; see parent body)
  - **Q-1 spec-text corrections**: adopt option 1 verbatim corrections (`SKILL.md:277` not `:233`; 4-section distiller not single-paragraph)
  - **Q-2 dashboard renderer target**: applies to this child via new `## Lens Evidence` + `## Core Tensions` + `## Honest Boundaries` sections -- inherits epic decision
  - **Q-3 escape-hatch string**: applies -- inherits epic decision
  - **Q-4 primary-tier tie-break**: applies -- inherits epic decision
  - **Q-5 INDEX.md staleness**: inherits epic decision (lens (d) sibling-entity-lens directly affected)
  - **Q-6 CONTRACTS coordination**: applies (overlap with `build-flow-tdd-discipline` Step 4)
  - Core Tensions and Honest Boundaries from epic 102 `## Core Tensions` / `## Honest Boundaries` sections propagate as seed inputs
- **Created**: 2026-04-14 (decomposition from epic 102)
- **Next step**: SO session runs build-brainstorm on this entity -- `context_status: pending`
