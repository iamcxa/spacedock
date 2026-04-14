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
- **Scope flag**: ⚠️ likely-decomposable-already (child of epic 102; further sub-decomposition optional at explore only if 4-lens-fanout infra is cleanly separable from merge-gate implementation -- default is to keep unified)
- **Created**: 2026-04-14 (decomposition from epic 102)

## Goal Check

You are asking for a restructure of build-brainstorm so that every APPROACH claim passes through 4 orthogonal context lenses, a triple-verification merge gate, and is framed alongside preserved tensions and declared limits -- mirroring the huashu-nuwa distillation methodology.

- **Problem being solved**: Current build-brainstorm emits APPROACH claims from a single-pass read over captain intent + codebase, arriving at explore under-supported. Confidence is vibes-based, contradictions get smoothed away, cross-entity dedup is a separate side-channel with inconsistent captain UX.
- **Expected outcome**: build-brainstorm becomes a multi-lens orchestrator whose APPROACH claims are provably supported by ≥2 of 4 parallel lenses, whose contradictions are preserved in `## Core Tensions`, whose limits are declared in `## Honest Boundaries`, and whose output is gated by a 5-item quality self-test that blocks return on failure.
- **Explicit non-goals**: Does NOT touch build-explore (that is sibling 105's scope). Does NOT backfill v2 schema into v1-shipped entities (forward-only upgrade). Does NOT port huashu-nuwa's Python `quality_check.py` (engine-freeze). Does NOT add frontmatter fields or pipeline primitives.

## Brainstorming Spec

**APPROACH**: Rewrite `skills/build-brainstorm/SKILL.md` to convert it from a leaf skill into an orchestrator skill that (1) dispatches **4 parallel fresh-context subagents** per invocation -- `spacedock:researcher` for captain-stated-intent and captain-unstated-intent lenses, `spacedock:code-explorer` for codebase-current-state and sibling-entity lenses -- and writes structured returns to a new `## Lens Evidence` section with per-lens subsections, each citation tagged `[primary|secondary|tertiary]`; (2) applies a **triple-verification merge gate** (cross-lens recurrence ≥2 of 4 lenses / generative power predicts downstream discoveries / exclusivity distinguishes from sibling entities) where only 3-pass claims land in APPROACH, 1-2 pass demotes to GUARDRAILS, 0-pass discards with a Stage Report line; (3) produces first-class `## Core Tensions` (typed time-based / domain-based / essential) and `## Honest Boundaries` sections that downstream stages annotate but never delete; (4) runs a **5-item quality self-test gate** before returning -- claim cardinality 3-7 as a soft target with α-inflection per epic 102 A-2, ≥2 lens citations per APPROACH claim, tensions/boundaries populated or escape-hatch string present, every citation tiered. The file-read cap rises from 5 to 9 to accommodate 4 lenses × up to 2 files each plus 1 INDEX/CONTRACTS lookup -- the single engine-behavior delta. Cross-entity dedup is absorbed into merge-gate-(iii) exclusivity; the separate `**Dedup flag:**` Captain Context Snapshot line is retired. `(needs clarification -- deferred to explore: self-test gate failure-routing mechanism -- re-dispatch lens collection, emit partial spec with α markers, or hard-fail to FO)`.

**ALTERNATIVE**: Ship brainstorm v2 as an **additive non-blocking layer** -- leave existing Step 2/3 untouched, append a `## Lens Evidence` post-hoc enrichment step after APPROACH is written, make `## Core Tensions` / `## Honest Boundaries` optional output sections, keep the 5-file cap. -- D-01 rejected because the load-bearing value proposition (correction at the moment captain attention is maximally focused on the directive) requires **gating** the APPROACH write, not augmenting it post-hoc; an additive layer preserves the vibes-based Confidence pattern that epic 102 A-2 was explicitly designed to eliminate, and captain rewound a similar v1 (the 2-lens + separate-dedup design, commit `4a3a4f8`) precisely because additive/side-channel treatment fragments the quality signal.

**GUARDRAILS**:
- **Engine-freeze preserved**: no new frontmatter fields, no new pipeline primitives. New body sections render through the existing dashboard markdown path at `tools/dashboard/static/detail.js:62-84` (per parent 102 Q-2 inline verification).
- **Non-interactive-to-captain contract preserved**: zero `AskUserQuestion` / `Teammate(` calls in the main session. Lens subagents report structured text; merge synthesis is main-session LLM work. Subagent prompts are themselves non-interactive (captain context lens = journal + canonical-refs reads, not captain questions).
- **File-read cap: 5 → 9**. Sole engine-behavior delta. Justified by 4 lenses × ≤2 files + 1 INDEX/CONTRACTS lookup. Every other skill behavior stays identical.
- **Tier-tag syntax is bracketed `[primary|secondary|tertiary]`** per epic 102 O-1 captain decision -- MUST match sibling child 105 for cross-stage grep parity.
- **Parent 102 Q-1 spec-text corrections must land**: APPROACH framing as "4-section brainstorming-spec distiller (APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE) + Step 2.5 Goal Check" (not "single-paragraph distiller"); file-cap citation at `SKILL.md:277` (not `:233`).
- **Core Tensions and Honest Boundaries are append-only downstream**: explore/clarify annotate (captain resolutions, discovery timestamps, accepted-as-trade-off markers) but NEVER DELETE. Captain is the only entity authorized to delete via explicit clarify annotation.
- **Cardinality inflection**: APPROACH claim count 3-7 is a soft target; trivial-scope directives may produce 2, architectural-overhaul directives may produce 8-9. Out-of-range must be α-marked with scale-justification per epic 102 A-2; absence of α-marker on out-of-range cardinality is the ship-blocker.
- **Leaf→orchestrator contract change** (parent 102 Honest Boundary 6): plan-phase MUST (a) relax the leaf constraint in SKILL.md Rules, (b) add Tools Available entry for Agent dispatch, (c) rewrite Step 1 Context Enrichment around 4-lens fanout, (d) update non-interactive contract wording (main session remains non-interactive to captain; lens subagents run in isolated contexts), (e) enumerate which invocation paths remain valid post-v2 given `subagent-cannot-nest-agent-dispatch` (FO→ensign→brainstorm would be nested-Agent and broken; SO-direct / FO-main / captain-facing `/build` in main session remain valid).
- **Parent 102 Q-6 coordination**: `build-flow-tdd-discipline` has an in-flight CONTRACTS contract on `skills/build-brainstorm/SKILL.md` Step 4 (TDD-friendly AC guidance). Plan-phase MUST settle merge ordering -- whichever ships second rebases its Step 4 additions.

**RATIONALE**: Multi-lens collection + merge-gate + tension/boundary preservation is the single load-bearing transformation; the other changes are consequential instrumentation. Without the 4-lens floor, cross-lens recurrence is undefined; without the merge gate, APPROACH quality stays vibes-based; without preserved tensions and declared boundaries, captain-facing artifacts get smoothed away downstream where correction is N× more expensive. Huashu-nuwa validates this shape across 13 person-skills, and the captain rewound a 2-lens v1 explicitly to adopt it (commit `4a3a4f8`). Parallelism is non-negotiable: a sequential 4-lens single-session implementation would breach the revised 9-file cap, degrade cache coherence, and -- most critically -- lose the fresh-context isolation that makes each lens agent insulated from the others' framing bias. Genuine triangulation requires structural independence, which only parallel subagents deliver. The leaf→orchestrator contract change is accepted cost; the constraint that SKILL.md currently pins (line 230 "NEVER invoke other skills") was correct for a single-pass distiller and is wrong for a multi-lens synthesizer.

## Acceptance Criteria

- Given a directive invoking build-brainstorm v2, when the skill runs, then the output contains `## Lens Evidence` with 4 distinct lens subsections (captain-stated / captain-unstated / codebase-current / sibling-entity), each with ≥1 citation and a `[primary|secondary|tertiary]` tier tag (how to verify: `grep -c "^### Lens " output.md` returns 4; for each subsection, `grep 'file:\|entity:'` yields ≥1; `grep -E '\[primary\]|\[secondary\]|\[tertiary\]' output.md` yields ≥4).
- Given any APPROACH claim produced by v2, when traced through `## Lens Evidence`, then ≥2 distinct lens subsections cite supporting evidence (how to verify: pick any APPROACH factual assertion; assert ≥2 of 4 lens subsections contain supporting citations by keyword match).
- Given a directive whose scope overlaps an active sibling entity, when build-brainstorm v2 runs, then the output contains a `Q-n` in `## Open Questions` (seeded in brainstorm per merge-gate-iii failure) citing the sibling `{id} ({title})` and asking captain to `{merge|link|refine}`, AND `**Dedup flag:**` is absent from Captain Context Snapshot (how to verify: seed a directive mirroring an active sibling's title; `grep "Q-[0-9]" output.md | grep {sibling-id}` yields ≥1; `grep 'Dedup flag:' output.md` yields 0).
- Given any brainstorm v2 output, when `## Honest Boundaries` is inspected, then it is either populated with ≥1 declared limit OR contains the epic-102-Q-3-resolved escape-hatch string (how to verify: `grep -A 20 "^## Honest Boundaries$" output.md | grep -E "^- |escape-hatch-string-from-Q3"` yields ≥1; exact escape-hatch string inherited from parent 102 Q-3 resolution at epic clarify).
- Given any brainstorm v2 output, when `## Core Tensions` is inspected, then it is either populated with ≥1 typed tension entry (time-based / domain-based / essential) OR contains the epic-102-Q-3-resolved escape-hatch string (how to verify: same grep pattern against `## Core Tensions` header; each populated entry matches `\*\*(time-based|domain-based|essential)\*\*:`).
- Given v2 ships, when the non-interactive-to-captain contract is audited, then the skill's main-session text issues zero AskUserQuestion/Teammate calls (how to verify: `grep -cE "AskUserQuestion|Teammate\(" skills/build-brainstorm/SKILL.md` returns 0; subagent prompt templates independently confirmed non-interactive by inspection).
- Given 4-lens analysis runs on 3 distinct fixture directives, when file-read budget is audited, then total Read count ≤ 9 per invocation across all 3 fixtures (how to verify: instrument Read counter in a dogfood harness; assert count ≤ 9 for each of the 3 fixtures; fixtures chosen to cover Small/Medium/Large scales).
- Given APPROACH contains a load-bearing assertion supported by only 1 lens, when the self-test gate runs, then the skill either blocks return with Stage Report entry `gate-ii failed: claim {n} supported by only {lens}; promote to 2+ lenses or demote to GUARDRAILS` OR emits the claim α-marked with that specific failure reason (how to verify: seed a directive constructed to produce a single-lens claim; assert block-return OR α-marker with exact failure string -- silent acceptance is a failure).
- Given the leaf→orchestrator contract change, when the skill runs from a nested Agent context (ensign-wrapped invocation path), then the skill either (a) detects the nesting and routes to a non-nested fallback, OR (b) emits a Stage Report warning declaring the routing failure explicitly (how to verify: dispatch skill from inside an Agent context; assert fallback taken or warning emitted -- silent failure is a ship-blocker; α-marker permitted if routing decision deferred to plan-phase audit).

## Core Tensions

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seeds propagated from epic 102 plus child-specific additions:)

- **essential**: **deterministic merge gate vs LLM-judged lens-recurrence** (propagated from epic 102) -- merge-gate (i) "cross-lens recurrence" is LLM-judged (semantic match), while the APPROACH commits implicitly to reproducibility across invocations. True determinism would require textual exact-match support, discarding the flexibility triple-verification exploits. Captain decision needed at clarify: lean deterministic (risk under-recalling valid claims) or lean LLM-judged (risk non-reproducibility).
- **domain-based**: **file-read budget (9 files) vs "at most 5" historical cap** (propagated from epic 102) -- the 5-file cap is a pipeline-wide precedent; raising it for one skill creates asymmetry explore-skill readers will notice. Trade-off is real and unavoidable; the 9-file rise is justified by multi-lens requirement but breaks pipeline uniformity. Plan-phase may revisit and propose raising the cap pipeline-wide, but that is out of scope for this entity.
- **time-based**: **brainstorm-v1 shipping pattern (36+ shipped entities) vs brainstorm-v2 body schema** (propagated from epic 102) -- shipped entities have v1-shape bodies (no `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries`). The dashboard frontmatter-io parser must accept both schemas; upgrade is forward-only (v2 entities do not backfill into v1 storage). Captain confirmation needed during clarify that dashboard renderer tolerates both schemas in same workflow directory.
- **essential (child-specific)**: **merge-gate ship-blocking vs ship-non-blocking semantics** -- if the 5-item self-test gate hard-fails when conditions aren't met, invocations from paths that cannot recover (e.g., headless CI, unattended FO dispatch) become pipeline-halting. If it soft-fails (emits α markers + warning), quality degrades silently and the "gate" becomes advisory -- the load-bearing value proposition leaks. Captain decision at clarify: which paths get which semantics, and who owns the route-to-recovery decision (skill itself, FO, captain).
- **domain-based (child-specific)**: **lens-subagent cost vs brainstorm frequency** -- 4 parallel subagents per invocation multiplies brainstorm's cost by ~4× (tokens, wall-clock, dispatch overhead). Brainstorm currently runs on every `/build` call including captain throwaway explorations. Either brainstorm becomes a higher-intent gate (captain pays attention before invoking) OR the 4-lens fanout is gated by scale (Small scale skips some lenses). Captain decision at clarify: keep 4-lens floor for all invocations, or scale-gate the lens count (e.g., Small → 2 lenses, Medium+ → 4 lenses).

## Honest Boundaries

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seeds propagated from epic 102 plus child-specific additions:)

- This APPROACH cannot guarantee 4 lenses are always sufficient for directives spanning >2 domains (propagated from epic 102) -- huashu-nuwa uses 6 agents for human-persona distillation; a 4-lens pipeline floor is the minimum, not universal-correct. Large / cross-domain entities may require a 5th lens (e.g., user-facing-visual lens for UI entities); this enhancement does not enumerate it.
- This APPROACH cannot replicate huashu-nuwa's "triple verification across 2+ domains" literally (propagated from epic 102) -- huashu-nuwa's domains are human life-domains (finance, philosophy, product); build-brainstorm's "domains" are codebase layers (domain / contract / router / view). The port is metaphorical, not mechanical; cross-layer recurrence may be noisier than cross-life-domain recurrence.
- This APPROACH does not port huashu-nuwa's Phase 1.5 and Phase 2.5 human-checkpoints (propagated from epic 102) -- build-brainstorm is non-interactive by contract. The equivalent review happens at the brainstorm→explore handoff (FO or SO inspects output), not mid-skill. This is a structural limitation, not an oversight.
- This APPROACH does not port huashu-nuwa's Phase 4 `quality_check.py` script (propagated from epic 102) -- the engine-freeze GUARDRAIL forbids adding Python runtime dependencies. The 5-item self-test is LLM-run inside the skill, not script-verified; reproducibility relies on prompt discipline, not code.
- The new `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries` sections render as generic markdown H2s in the dashboard (propagated from epic 102 with Q-2 correction applied) -- no special treatment until `tools/dashboard/static/detail.js` is updated, which is a future-entity candidate explicitly out of scope here.
- **Boundary 6 (leaf→orchestrator contract change, propagated from epic 102)**: v2's subagent dispatches become nested Agent calls when brainstorm is invoked from inside an Agent context (FO→ensign→brainstorm), which `subagent-cannot-nest-agent-dispatch.md` documents as BROKEN for general-purpose subagents. v2 MUST originate from SO-direct / FO-main / captain-facing `/build` in main session. Plan-phase MUST enumerate valid invocation paths; paths not in the valid set become deprecated or require elevation.
- **Boundary 7 (child-specific) -- self-test gate cannot verify captain-unstated-intent lens**: lens (b) depends on LLM inference from journal + canonical-refs; there is no ground-truth test for whether the inferred unstated intent matches the captain's actual unstated intent. Self-test can verify structural presence (subsection exists, ≥1 citation, tier tag) but not semantic correctness. Clarify remains the only place captain can correct lens (b) drift.
- **Boundary 8 (child-specific) -- merge-gate exclusivity check has staleness dependency**: gate (iii) relies on `_index/INDEX.md` + `_index/CONTRACTS.md` freshness for sibling-entity detection. Parent 102 Q-5 documents INDEX staleness of ≥2 days. Exclusivity verdict is only as reliable as the index; stale index produces false-positive exclusivity flags (shipped entities flagged as in-flight) and false-negative misses (recent drafts not yet indexed). This is an upstream dependency this entity cannot unilaterally fix.

## Canonical References

(parent 102 seeds propagated; child clarify stage will populate further:)

- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/SKILL.md` -- methodology spec, Phase 0 through Phase 4
- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md` -- triple-verification gate (Part 一), contradiction preservation (Part 三), information-insufficiency (Part 四), quality self-check (Part 六)
- `docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md` -- parent epic 102 with full APPROACH, decisions, and cross-child coordination
- `skills/build-brainstorm/SKILL.md` -- target skill file (modification target; current contents are the pre-v2 baseline)
- `skills/build-brainstorm/references/alpha-marker-protocol.md` -- α-marker convention this enhancement preserves
- `MEMORY.md subagent-cannot-nest-agent-dispatch.md` -- constraint documenting why nested Agent calls break for general-purpose subagents; load-bearing for Honest Boundary 6
