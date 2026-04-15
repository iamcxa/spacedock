# Nüwa Ports -- Multi-Angle Dispatch Formalization

## Overview

The Nüwa methodology ports (Ports 7-11) formalize the shift from single-pass serial execution to multi-angle parallel dispatch across the build pipeline. Rather than a single agent or lens producing a single output that downstream stages must accept or reject, the ported methodology fans out N orthogonal perspectives in parallel, synthesizes with contradiction preservation, and surfaces tensions as first-class artifacts. The result is a pipeline where epistemic quality is structurally enforced -- not dependent on any single invocation's judgment -- and where conflicting evidence cannot be silently absorbed. Ports 7-11 were each established by a specific entity and are now stable reference patterns for any future skill that handles multi-party or multi-angle evidence collection.

---

## Port 7: 4-Lens Single-Tool-Call Dispatch (build-brainstorm)

Before writing the APPROACH section, `build-brainstorm` collects 4 orthogonal lenses -- (a) Captain-stated-intent, (b) Captain-unstated-intent, (c) Codebase-current-state, and (d) Sibling-entity -- and records each as a subsection within a new `## Lens Evidence` body section. Each lens subsection requires at least one `file:line` or `entity:ID` citation, and claims may only graduate to APPROACH if they survive a triple-verification merge gate (cross-lens recurrence across ≥2 lenses, generative power, exclusivity from sibling entities). Claims that fail the gate are demoted to GUARDRAILS or discarded with a Stage Report line. This single-tool-call fanout replaces the prior single-paragraph APPROACH distiller, providing structural confidence that APPROACH content represents genuine multi-perspective convergence rather than vibes-based synthesis.

Reference implementation: `skills/build-brainstorm/SKILL.md:20`.

Established by: entity 104 (brainstorm-nuwa-distillation).

---

## Port 8: 4-Angle Parallel Codebase Fanout (build-explore Mode A)

`build-explore` Step 2 Mode A dispatches 4 parallel `spacedock:code-explorer` subagents, each locked to a fixed angle: (i) prevailing-patterns (dominant existing pattern within target scope), (ii) recent-decisions (ADRs, DECISIONS.md, and recent commit-log design rationale), (iii) sibling-entity (active-state entities overlapping the file surface via CONTRACTS.md + INDEX.md), and (iv) negative-space (seed-driven absence verification). Each subagent runs as a fresh-context leaf -- no further dispatch -- and returns structured findings. Mode B (inline fallback without Agent tool) runs angles (i)-(iii) inline and skips angle (iv), emitting a mandatory warning line. The 4-way fanout replaces the prior single code-explorer dispatch, providing per-angle isolation that prevents cross-contamination of evidence between different structural concerns.

Reference implementation: `skills/build-explore/SKILL.md:86`.

Established by: entity 105 (explore-nuwa-subagent-first).

---

## Port 9: Subagent-First for All Stages Except Clarify

Every build pipeline stage except clarify MUST dispatch subagents for its primary work, including the code-explorer stage that was previously inline-only. Clarify remains in the main session because it requires `AskUserQuestion` interaction with the captain, which subagents cannot perform. All other stages -- brainstorm, explore, plan, execute, quality, review -- use subagent dispatch as the default execution path, with inline (Mode B / ensign) as a degraded fallback that must emit an explicit warning. This directive closes the gap where earlier pipeline design had the explorer running inline as the primary path, which violated the captain's architectural directive on parallel evidence isolation. The rule applies recursively: a stage that orchestrates other stages must itself be a subagent-aware orchestrator, not a leaf that does all work inline.

Reference implementation: MEMORY.md `subagent-first-for-all-stages-except-clarify.md`.

Established by: captain directive 2026-04-14 (entity 102 clarify session).

---

## Port 10: Contradiction-Preservation Synthesis

When 2 or more parallel subagents return findings that conflict on the same artifact, task, or `file:line`, synthesis MUST preserve both findings verbatim. There is no silent deduplication, no tiebreaker by dispatch order, no majority-vote resolution, and no "silently clever" override that picks the more plausible-sounding finding. The contradiction is written as an Open Question (in plan-phase output) or a `## Core Tensions` entry (in explore-phase output), typed as either `essential` (genuine design tension requiring captain resolution) or `domain-based` (same evidence viewed through different domain lenses). Contradictions are first-class outputs -- the preservation of conflicting evidence is load-bearing for downstream clarify-stage Q&A quality, because a silently resolved contradiction prevents the captain from knowing a real ambiguity exists. The rule applies specifically when two researchers return mutually exclusive claims on the same `file:line`; it does not apply to independently scoped findings that are merely different.

Reference implementation: `skills/build-explore/SKILL.md:233`, `skills/build-plan/SKILL.md:184-190`.

Established by: entity 105 (explore-nuwa-subagent-first) and entity 104 (brainstorm-nuwa-distillation).

---

## Port 11: Per-Dim Haiku Dispatch (build-plan plan-checker)

The plan-checker stage in `build-plan` dispatches 6 parallel haiku-tier subagents, one per evaluation dimension (Dim 1 through Dim 6), plus a 1-agent synthesis layer that runs cross-dimension correlation after the 6 dimension agents return. Each dimension agent receives a focused prompt scoped to its single dimension -- structural completeness, task decomposition quality, scope discipline, context compliance, acceptance-criteria coverage, and wave/dependency ordering -- and returns a structured finding set without awareness of the other dimensions. The synthesis agent then correlates findings across all 6 dimensions, surfacing cross-dim tensions (e.g., a task that passes Dim 2 decomposition but fails Dim 5 AC coverage for the same task unit). This per-dim haiku dispatch pattern makes plan-checker quality structurally enforceable: no single agent's judgment governs all dimensions, and cross-dim correlation is an explicit synthesis step rather than a side effect of a single-agent holistic review.

Reference implementation: entity 107 (plan-checker-multi-angle-nuwa). Established 2026-04-15.
