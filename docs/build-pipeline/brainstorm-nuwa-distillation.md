---
id: 104
title: Brainstorm Nüwa-Style Distillation (v2) -- Multi-Lens Collection + Triple-Verification Gate + Tension Preservation
status: plan
context_status: ready
source: /build (decomposed from epic 102)
created: 2026-04-14T00:00:00Z
started: 2026-04-14T23:11:25Z
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-brainstorm-nuwa-distillation
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

**APPROACH** (⚠ contradicted by explore: "4 parallel subagents per invocation" is the unconditional framing, but `skills/build-explore/SKILL.md:20` + `skills/build-review/SKILL.md:28` + `skills/build-plan/SKILL.md:28` all document an identical **Mode A / Mode B split** for the same constraint -- SO-direct has Agent, ensign does not. The dominant pipeline precedent is "dual-mode skill", not "total leaf→orchestrator conversion" -- see O-1): Rewrite `skills/build-brainstorm/SKILL.md` to convert it from a leaf skill into an orchestrator skill that (1) dispatches **4 parallel fresh-context subagents** per invocation (✓ confirmed by explore: `agents/code-explorer.md:1-21` + `agents/researcher.md:1-21` exist as dispatchable thin-wrapper agents with `spacedock:` namespace; parent 102 explore successfully dispatched 3 `spacedock:code-explorer` in parallel) -- `spacedock:researcher` for captain-stated-intent and captain-unstated-intent lenses, `spacedock:code-explorer` for codebase-current-state and sibling-entity lenses -- and writes structured returns to a new `## Lens Evidence` section with per-lens subsections, each citation tagged `[primary|secondary|tertiary]`; (2) applies a **triple-verification merge gate** (cross-lens recurrence ≥2 of 4 lenses / generative power predicts downstream discoveries / exclusivity distinguishes from sibling entities) where only 3-pass claims land in APPROACH, 1-2 pass demotes to GUARDRAILS, 0-pass discards with a Stage Report line; (3) produces first-class `## Core Tensions` (typed time-based / domain-based / essential) and `## Honest Boundaries` sections that downstream stages annotate but never delete; (4) runs a **5-item quality self-test gate** before returning -- claim cardinality 3-7 as a soft target with α-inflection per epic 102 A-2, ≥2 lens citations per APPROACH claim, tensions/boundaries populated or escape-hatch string present, every citation tiered. The file-read cap rises from 5 to 9 to accommodate 4 lenses × up to 2 files each plus 1 INDEX/CONTRACTS lookup -- the single engine-behavior delta. Cross-entity dedup is absorbed into merge-gate-(iii) exclusivity; the separate `**Dedup flag:**` Captain Context Snapshot line is retired. `(needs clarification -- deferred to explore: self-test gate failure-routing mechanism -- re-dispatch lens collection, emit partial spec with α markers, or hard-fail to FO)`.

**ALTERNATIVE**: Ship brainstorm v2 as an **additive non-blocking layer** -- leave existing Step 2/3 untouched, append a `## Lens Evidence` post-hoc enrichment step after APPROACH is written, make `## Core Tensions` / `## Honest Boundaries` optional output sections, keep the 5-file cap. -- D-01 rejected because the load-bearing value proposition (correction at the moment captain attention is maximally focused on the directive) requires **gating** the APPROACH write, not augmenting it post-hoc; an additive layer preserves the vibes-based Confidence pattern that epic 102 A-2 was explicitly designed to eliminate, and captain rewound a similar v1 (the 2-lens + separate-dedup design, commit `4a3a4f8`) precisely because additive/side-channel treatment fragments the quality signal.

**GUARDRAILS**:
- **Engine-freeze preserved**: no new frontmatter fields, no new pipeline primitives. New body sections render through the existing dashboard markdown path at `tools/dashboard/static/detail.js:62-84` (per parent 102 Q-2 inline verification).
- **Non-interactive-to-captain contract preserved**: zero `AskUserQuestion` / `Teammate(` calls in the main session. Lens subagents report structured text; merge synthesis is main-session LLM work. Subagent prompts are themselves non-interactive (captain context lens = journal + canonical-refs reads, not captain questions).
- **File-read cap: 5 → 9**. Sole engine-behavior delta. Justified by 4 lenses × ≤2 files + 1 INDEX/CONTRACTS lookup. Every other skill behavior stays identical.
- **Tier-tag syntax is bracketed `[primary|secondary|tertiary]`** per epic 102 O-1 captain decision -- MUST match sibling child 105 for cross-stage grep parity.
- **Parent 102 Q-1 spec-text corrections must land**: APPROACH framing as "4-section brainstorming-spec distiller (APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE) + Step 2.5 Goal Check" (not "single-paragraph distiller"); file-cap citation at `SKILL.md:277` (not `:233`).
- **Core Tensions and Honest Boundaries are append-only downstream**: explore/clarify annotate (captain resolutions, discovery timestamps, accepted-as-trade-off markers) but NEVER DELETE. Captain is the only entity authorized to delete via explicit clarify annotation.
- **Cardinality inflection**: APPROACH claim count 3-7 is a soft target; trivial-scope directives may produce 2, architectural-overhaul directives may produce 8-9. Out-of-range must be α-marked with scale-justification per epic 102 A-2; absence of α-marker on out-of-range cardinality is the ship-blocker.
- **Leaf→orchestrator contract change** (✓ confirmed by explore: leaf constraint at `skills/build-brainstorm/SKILL.md:275` "NEVER invoke other skills. You are a leaf skill, not an orchestrator." + line 8 skill preamble. Precedent for Agent in Tools Available exists at `skills/graft/SKILL.md:50`) (parent 102 Honest Boundary 6): plan-phase MUST (a) relax the leaf constraint in SKILL.md Rules, (b) add Tools Available entry for Agent dispatch, (c) rewrite Step 1 Context Enrichment around 4-lens fanout, (d) update non-interactive contract wording (main session remains non-interactive to captain; lens subagents run in isolated contexts), (e) enumerate which invocation paths remain valid post-v2 given `subagent-cannot-nest-agent-dispatch` (FO→ensign→brainstorm would be nested-Agent and broken; SO-direct / FO-main / captain-facing `/build` in main session remain valid).
- **Parent 102 Q-6 coordination** (✓ confirmed by explore: `docs/build-pipeline/_index/CONTRACTS.md:181-185` shows `build-flow-tdd-discipline` at `execute` stage status `in-flight` as of 2026-04-12, contract text "Add given/when/then AC guidance to step 4 for TDD-friendly spec generation"): `build-flow-tdd-discipline` has an in-flight CONTRACTS contract on `skills/build-brainstorm/SKILL.md` Step 4 (TDD-friendly AC guidance). Plan-phase MUST settle merge ordering -- whichever ships second rebases its Step 4 additions.

**RATIONALE**: Multi-lens collection + merge-gate + tension/boundary preservation is the single load-bearing transformation; the other changes are consequential instrumentation. Without the 4-lens floor, cross-lens recurrence is undefined; without the merge gate, APPROACH quality stays vibes-based; without preserved tensions and declared boundaries, captain-facing artifacts get smoothed away downstream where correction is N× more expensive. Huashu-nuwa validates this shape across 13 person-skills, and the captain rewound a 2-lens v1 explicitly to adopt it (commit `4a3a4f8`). Parallelism is non-negotiable: a sequential 4-lens single-session implementation would breach the revised 9-file cap, degrade cache coherence, and -- most critically -- lose the fresh-context isolation that makes each lens agent insulated from the others' framing bias. Genuine triangulation requires structural independence, which only parallel subagents deliver. The leaf→orchestrator contract change is accepted cost; the constraint that SKILL.md currently pins (line 230 "NEVER invoke other skills") was correct for a single-pass distiller and is wrong for a multi-lens synthesizer.

## Acceptance Criteria

- Given a directive invoking build-brainstorm v2, when the skill runs, then the output contains `## Lens Evidence` with 4 distinct lens subsections (captain-stated / captain-unstated / codebase-current / sibling-entity), each with ≥1 citation and a `[primary|secondary|tertiary]` tier tag (how to verify: `grep -c "^### Lens " output.md` returns 4; for each subsection, `grep 'file:\|entity:'` yields ≥1; `grep -E '\[primary\]|\[secondary\]|\[tertiary\]' output.md` yields ≥4).
- Given any APPROACH claim produced by v2, when traced through `## Lens Evidence`, then ≥2 distinct lens subsections cite supporting evidence (how to verify: pick any APPROACH factual assertion; assert ≥2 of 4 lens subsections contain supporting citations by keyword match).
- Given a directive whose scope overlaps an active sibling entity, when build-brainstorm v2 runs, then the output contains a `Q-n` in `## Open Questions` (seeded in brainstorm per merge-gate-iii failure) citing the sibling `{id} ({title})` and asking captain to `{merge|link|refine}`, AND `**Dedup flag:**` is absent from Captain Context Snapshot (how to verify: seed a directive mirroring an active sibling's title; `grep "Q-[0-9]" output.md | grep {sibling-id}` yields ≥1; `grep 'Dedup flag:' output.md` yields 0).
- Given any brainstorm v2 output, when `## Honest Boundaries` is inspected, then it is either populated with ≥1 declared limit OR contains the epic-102-Q-3-resolved escape-hatch string (how to verify: `grep -A 20 "^## Honest Boundaries$" output.md | grep -E "^- |Checked -- no notable constraints identified\."` yields ≥1; exact escape-hatch string inherited from parent 102 Q-3 resolution at epic clarify).
- Given any brainstorm v2 output, when `## Core Tensions` is inspected, then it is either populated with ≥1 typed tension entry (time-based / domain-based / essential) OR contains the epic-102-Q-3-resolved escape-hatch string (how to verify: `grep -A 20 "^## Core Tensions$" output.md | grep -E "^- |Checked -- no notable constraints identified\."` yields ≥1; each populated entry matches `\*\*(time-based|domain-based|essential)\*\*:`).
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

- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/SKILL.md` -- methodology spec, Phase 0 through Phase 4 (external; fragility noted in A-7)
- `docs/build-pipeline/_docs/extraction-framework.md` -- triple-verification gate (Part 一), contradiction preservation (Part 三), information-insufficiency (Part 四), quality self-check (Part 六). Vendored locally 2026-04-15 per A-7; functional name (no huashu-nuwa prefix).
- `docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md` -- parent epic 102 with full APPROACH, decisions, and cross-child coordination
- `skills/build-brainstorm/SKILL.md` -- target skill file (modification target; current contents are the pre-v2 baseline)
- `skills/build-brainstorm/references/alpha-marker-protocol.md` -- α-marker convention this enhancement preserves
- `MEMORY.md subagent-cannot-nest-agent-dispatch.md` -- constraint documenting why nested Agent calls break for general-purpose subagents; load-bearing for Honest Boundary 6
- `skills/build-explore/SKILL.md:17-107` -- Mode A / Mode B precedent for dual-mode Agent-dispatch; load-bearing for O-1
- `skills/build-review/SKILL.md:27-29` + `skills/build-plan/SKILL.md:27-29` -- same Mode A/B pattern, reinforcing precedent uniformity
- `skills/graft/SKILL.md:50` -- precedent for Agent in a skill's Tools Available list
- `docs/build-pipeline/_index/CONTRACTS.md:181-185` -- active `build-flow-tdd-discipline` contract on target file; Q-5 coordination
- `agents/code-explorer.md` + `agents/researcher.md` -- dispatchable thin-wrapper agents (A-2 evidence)

## Assumptions

**A-1**: `skills/build-brainstorm/SKILL.md` currently operates as a leaf skill; the APPROACH's "convert leaf→orchestrator" framing describes a real contract delta, not a rephrase.
- **Confidence**: Confident (0.95)
- **Evidence**: `skills/build-brainstorm/SKILL.md:275` "NEVER invoke other skills. You are a leaf skill, not an orchestrator." + line 8 preamble "You are a leaf skill invoked by `/build`." Tools Available section (:283-294) lists only Read/Grep/Glob/Bash + MCP; Agent tool is absent from both the "Can use" and "NOT available" lists -- neither enabled nor explicitly forbidden, matching the implicit-leaf pattern.
- → Confirmed: captain, 2026-04-15 (batch)

**A-2**: `spacedock:researcher` and `spacedock:code-explorer` exist as dispatchable thin-wrapper agents in the current codebase, so the 4-lens dispatch infrastructure already exists at the agent layer.
- **Confidence**: Confident (0.95)
- **Evidence**: `agents/code-explorer.md:1-21` + `agents/researcher.md:1-21` define both agents with `spacedock:` namespace. Parent entity 102 explore Stage Report records "3 `spacedock:code-explorer` agents dispatched in parallel" (entity 102 line 304), confirming dispatch pattern works today from SO-direct mode.
- → Confirmed: captain, 2026-04-15 (batch)

**A-3**: Adding `Agent` to a skill's Tools Available list is a supported pipeline pattern, not a novel skill primitive; precedent exists and this child's plan-phase can copy it verbatim.
- **Confidence**: Confident (0.95)
- **Evidence**: `skills/graft/SKILL.md:50` lists `Agent` as usable (`"- \`Agent\` -- \`Explore\` subagent for portability scanning (init only)"`), proving at least one shipped skill in this codebase has Agent as a declared tool. No schema changes required in SKILL.md frontmatter to add Agent.
- → Confirmed: captain, 2026-04-15 (batch)

**A-4**: The dominant precedent for "skill that wants to dispatch but may be nested" in this codebase is a **Mode A / Mode B dual-mode split**, NOT a total leaf→orchestrator conversion. Three existing skills (build-explore, build-review, build-plan) all document this identical pattern. v2's implementation should copy the pattern rather than invent a new semantics.
- **Confidence**: Confident (0.95)
- **Evidence**: `skills/build-explore/SKILL.md:19-21` + `:87-107` documents Mode A (SO-direct has Agent → dispatches code-explorer) vs Mode B (ensign no Agent → inline fallback). `skills/build-review/SKILL.md:27-29` documents identical split for reviewer teammates. `skills/build-plan/SKILL.md:27-29` documents identical split for researcher teammates. Three-way precedent uniformity makes this the canonical pipeline pattern.
- → Confirmed: captain, 2026-04-15 (batch)

**A-5**: `build-flow-tdd-discipline` is still in-flight on `skills/build-brainstorm/SKILL.md` with Step 4 AC-guidance additions, so merge-ordering risk is real and load-bearing.
- **Confidence**: Confident (0.95)
- **Evidence**: `docs/build-pipeline/_index/CONTRACTS.md:181-185` -- table row shows entity `build-flow-tdd-discipline` at `execute` stage, status `in-flight`, last updated 2026-04-12, contract text "Add given/when/then AC guidance to step 4 for TDD-friendly spec generation". Same entity also contracts on SKILL.md lines affecting clarify / plan / quality (lines 223, 230, 275 of CONTRACTS.md) -- surface area is broad but collides with child 104 only on build-brainstorm/SKILL.md Step 4.
- → Confirmed: captain, 2026-04-15 (batch)

**A-6**: Epic 102's Q-3 escape-hatch string (`Checked -- no ...` vs `None identified -- checked` vs `(none -- deliberate)`) was seeded but not resolved at epic clarify (decomposition exited Step 0). This child's clarify must settle the string; the epic Q-3 option set is the candidate pool.
- **Confidence**: Likely (0.75)
- **Evidence**: Parent 102 body `## Open Questions` Q-3 lists three candidate options (`Checked -- no notable constraints identified.` matching GUARDRAILS precedent at `skills/build-brainstorm/SKILL.md:139`; `None identified -- checked` matching the child 104 body; or `(none -- deliberate)` general-purpose). Epic 102 frontmatter `verdict: DECOMPOSED` + exit-at-decomposition-gate means no formal resolution was written; the child inherits the candidate set, not a decision.
- → Confirmed: captain, 2026-04-15 (batch)

**A-7**: External methodology citations to `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/` create long-term fragility for 104 + parent 102 design rationale. Resolution: vendor the extraction-framework reference into this repo under a functionally-named path (NOT prefixed with `huashu-nuwa`, which would read as an incongruous origin-brand in spacedock).
- **Confidence**: Confident (0.95)
- **Evidence**: Parent 102 `## Canonical References` and 104's own APPROACH/GUARDRAILS/RATIONALE cite `extraction-framework.md:9-30`, `:73-97`, `:130` at an external-repo path. Captain directive (2026-04-15, interactive): vendor the methodology doc with a functional name, drop the `huashu-nuwa-` prefix because a permanent in-repo reference file's role (extraction framework) is the stable signal, not its origin skill. Parallel in-repo convention: `skills/build-explore/references/gray-area-templates.md` is named by function, not origin skill.
- → Confirmed: captain, 2026-04-15 (interactive -- new from Step 4.5 open exploration)
- **Plan-phase action**: copy `extraction-framework.md` to `docs/build-pipeline/_docs/extraction-framework.md` (or `skills/build-brainstorm/references/extraction-framework.md` if scoped to the skill's own references); update all citations in 104 + 102 from external path to local path; append a provenance note in the copied file's header (single line: `# Extraction Framework` + a brief note that this was adopted from external methodology work on 2026-04-15, no further huashu-nuwa branding).

## Option Comparisons

### O-1: v2 dispatch mode semantics -- total conversion vs Mode A/B split vs hybrid

The APPROACH commits to "4 parallel subagents per invocation" unconditionally, but the codebase precedent for this exact problem (skill that wants to dispatch but may be nested inside an ensign-wrapped Agent context) is a Mode A / Mode B dual-mode split across three existing skills (build-explore, build-review, build-plan). Choosing among these three shapes has load-bearing consequences for Honest Boundary 6's invocation-path audit.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **Total conversion (APPROACH as-written)** -- brainstorm becomes unconditional orchestrator; all invocation paths must reach a context with Agent tool | Purest form of huashu-nuwa methodology port; strongest quality signal (every invocation gets 4-lens triangulation); no dual-path maintenance cost | Breaks FO→ensign→brainstorm dispatch graph; requires auditing + refactoring every current invocation path; risk of runtime failure in paths missed by audit; contradicts pipeline precedent | Medium | Viable (preserves APPROACH intent) |
| **Mode A/B split (copy build-explore pattern)** -- Mode A dispatches lenses when Agent available; Mode B falls back to inline single-pass when Agent unavailable | Matches dominant codebase precedent (3 skills); no dispatch-graph refactor required; backward-compatible with existing ensign-wrapped invocation; Honest Boundary 6 audit becomes a taxonomy exercise (which paths get which mode) rather than a blocker | Mode B invocations get degraded quality (single-pass, not 4-lens); two code paths to maintain; self-test gate semantics need differentiation (strict in Mode A, soft in Mode B) | Low | ✅ Recommended |
| **Hybrid -- scale-gated lens count** -- Small directives use 1-2 lenses inline; Medium+ directives use 4-lens dispatch; ensign paths always use inline | Addresses parent 102 Core Tension "lens-subagent cost vs brainstorm frequency"; reduces token burn on throwaway invocations; gracefully degrades in nested contexts | Scale threshold is a new tuning knob with unclear default; multiple cost axes (scale × context × lens-count) increase skill-design surface area; less clean to audit | Medium | Viable |

**Decision owner**: captain via clarify. Recommendation: Mode A/B split, matching the 3-skill precedent. Mode A runs full 4-lens triangulation; Mode B emits a Stage Report warning "ensign-mode inline fallback -- single-pass spec; 4-lens quality not achieved this invocation" and skips the self-test gate's cross-lens recurrence check (gates i / ii still run, gate iii on exclusivity still runs via INDEX lookup which Mode B can do inline).

→ Selected: Mode A/B split -- copy build-explore pattern (captain, 2026-04-15, interactive)

### O-2: Empty-state escape-hatch string for new body sections

Parent 102 Q-3 candidate pool. Every shipped brainstorm v2 output must have `## Core Tensions` and `## Honest Boundaries` sections either populated OR containing an escape-hatch string. Captain must pick one string form and commit to it across v2 + existing v1 GUARDRAILS precedent.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **"Checked -- no notable constraints identified."** -- matches existing GUARDRAILS precedent at `skills/build-brainstorm/SKILL.md:139` | Zero migration cost; one string across skill; grep-uniformity preserved today | String wording is tuned for "constraints" (GUARDRAILS context), less natural for "tensions" or "boundaries" contexts | Low | ✅ Recommended |
| **"None identified -- checked"** -- new form, matches child 104 body draft + acceptance criteria grep | More neutral wording fits all three sections (GUARDRAILS / Core Tensions / Honest Boundaries); the form captain proposed in epic | Forces migration of existing GUARDRAILS precedent OR two strings coexist (grep fragmentation); breaks uniformity with 36+ shipped v1 entities | Medium | Viable |
| **"(none -- deliberate)"** -- single general-purpose token | Shortest form; reads as a token rather than prose; most grep-friendly (7 chars) | No precedent anywhere in codebase today; requires migrating existing escape-hatch usage; novel form readers must learn | Low | Viable |

**Decision owner**: captain via clarify. Recommendation favors option 1 (existing precedent) unless captain wants to pay migration cost for better semantic fit in the new section contexts.

→ Selected: Checked -- no notable constraints identified. (captain, 2026-04-15, interactive) -- NOTE: plan-phase must update child 104 body + acceptance criteria to replace current draft string `None identified -- checked` with the selected form across `## Core Tensions`, `## Honest Boundaries`, and all AC grep expressions.

### O-3: merge-gate semantics per invocation path

Child-specific Core Tension: the 5-item self-test gate's failure semantics (ship-blocking vs ship-advisory) must be settled because different invocation paths have different recovery affordances. Directly tied to O-1's dispatch mode choice.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **Universal ship-blocking** -- any gate failure hard-fails the skill | Maximum quality enforcement; zero silent degradation; simple semantics | Breaks headless / unattended invocation (FO dispatch stalls on gate fail); no route-to-recovery for paths that cannot re-dispatch | Low | Viable |
| **Universal ship-advisory** -- all gate failures become α markers + Stage Report warnings | Universal backward-compat; no pipeline halts; preserves the "fix inline, do not flag" style of current SKILL.md:274 | Load-bearing value proposition (correction at brainstorm time) leaks; gate becomes advisory-only; quality signal weakens to v1-equivalent | Low | Viable |
| **Path-aware -- captain-facing = blocking, automated = advisory** -- SO-direct / main-session = ship-blocking; ensign-wrapped / FO-dispatch = advisory with warnings | Respects O-1 Mode A/B split (Mode A = blocking; Mode B = advisory); quality enforcement where captain can recover, advisory where they can't; matches build-explore's treatment of Mode B as emergency fallback | Two semantics to document and test; captain must mentally model which path they're on when reading Stage Reports | Medium | ✅ Recommended |

**Decision owner**: captain via clarify. Recommendation hinges on O-1 resolution: if Mode A/B split adopted, path-aware gate semantics follow naturally. If total-conversion adopted, universal ship-blocking is the cleaner fit (ensign path deprecated anyway).

→ Selected: Path-aware -- Mode A blocks, Mode B advises (captain, 2026-04-15, interactive) -- coupled to O-1 Mode A/B split. Mode A gate failure returns no output + Stage Report blocker entry; Mode B gate failure emits alpha markers inline + Stage Report warning "ensign-mode inline fallback -- gate {n} advisory-only".

## Open Questions

### Q-1: Self-test gate failure-routing mechanism (from α marker in APPROACH)

**Domain**: Runnable/Invokable (skill control flow)

**Why it matters**: APPROACH commits to a 5-item self-test gate that "blocks return on failure" but does not specify what failure means operationally. Three candidate mechanisms have different downstream costs and different compatibility with O-1 / O-3 decisions.

**Suggested options**:
1. Re-dispatch lens collection -- gate failure triggers re-dispatch of the failing lens's subagent with a more specific prompt; cap at 2 re-dispatches per invocation. Expensive but recoverable.
2. Emit partial spec with α markers -- gate failure produces a best-effort spec with α markers on the failing claims, Stage Report logs the gate failure. Matches existing brainstorm v1 "fix inline" style.
3. Hard-fail to FO -- gate failure returns no output, forces FO (or captain in SO-direct) to re-invoke with adjusted directive. Matches build-plan's plan-checker blocker pattern.

→ Answer: Hard-fail to FO/captain (captain, 2026-04-15, interactive) -- coupled to O-3 Mode A ship-blocking. Mode A gate failure returns structured blocker payload (failure reason + failing gate id + offending claim/lens) + zero spec output. Mode B advisory path uses option 2 semantics (alpha markers inline + warning) per O-3. Also resolves the APPROACH alpha-marker from Step 3.7.

### Q-2: Lens (b) captain-unstated-intent -- source scope and query shape

**Domain**: Runnable/Invokable (skill input boundary)

**Why it matters**: Honest Boundary 7 acknowledges that lens (b) has no ground-truth test. The subagent needs a bounded input space to infer "unstated intent" from -- without bounds, the lens hallucinates. The APPROACH says the lens is "derived from recent journal + `## Canonical References` on sibling entities" but does not specify window size, sibling selection criteria, or query shape.

**Suggested options**:
1. Time-bounded journal slice (last 7 days of journal entries tagged with the directive's domain) + exact sibling canonical-refs set (entities with overlap in INDEX.md `files_modified`).
2. Keyword-driven journal search (`search_journal(query: "{directive keywords}", limit: 5)`) + all siblings in the same Core Tension / Honest Boundary cluster.
3. Captain specifies per-directive via a new `## Lens Hints` optional section in the directive body (opt-in steering).
4. Open-ended -- captain decides.

→ Answer: Keyword-driven journal + Core Tension siblings (captain, 2026-04-15, interactive) -- lens (b) input = `search_journal(query: "{directive keywords}", limit: 5)` + all siblings clustered by shared Core Tension / Honest Boundary. Self-throttling context budget works under both Mode A and Mode B; plan-phase must spec the keyword-extraction heuristic explicitly (directive nouns + verbs, stop-word filter).

### Q-3: Merge-gate-(ii) "generative power" operational definition

**Domain**: Runnable/Invokable (skill classification logic)

**Why it matters**: Gate (ii) requires claims to predict what "downstream stages (explore/plan) will likely discover" rather than restate the directive. This is a subjective LLM-judgment call without an operational definition. Without a test, the gate degrades to "vibes with extra steps" -- the exact failure mode parent 102 A-2 was designed to eliminate.

**Suggested options**:
1. Predictive marker heuristic -- claim contains a concrete action verb + a file/layer name that was NOT mentioned in the directive (forces novel specificity).
2. Downstream-trace test -- claim text is compared against the entity's eventual explore Stage Report "Files mapped" list; claims whose content does not appear in explore findings fail gate (ii) retroactively and trigger a brainstorm-v2 learning signal.
3. Relative-entropy test -- claim text must have ≤50% token overlap with the directive's own text.
4. Open-ended -- captain decides.

→ Answer: Predictive marker heuristic (captain, 2026-04-15, interactive) -- gate (ii) passes iff claim contains a concrete action verb AND a file/layer name NOT mentioned in the directive. Binary, grep-verifiable, no retroactive correlation needed. Plan-phase must spec (a) the action-verb list (finite closed set), (b) file/layer-name extraction regex against directive body, (c) failure-to-pass emits blocker payload under O-3 Mode A ship-blocking.

### Q-4: Cardinality α-marker format -- single canonical form or family?

**Domain**: Readable/Textual (body-section conventions)

**Why it matters**: Parent 102 A-2 resolved cardinality 3-7 as soft-target with α-inflection. GUARDRAILS proposes a specific α form `(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})`. This must be fixed verbatim for self-test gate (i) to be testable. A family of forms (`(α: too few ...)`, `(α: too many ...)`) would require separate grep patterns.

**Suggested options**:
1. Single canonical form `(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})` -- grep-uniform; same string for too-few and too-many cases; signal extraction via regex.
2. Family of 2 forms `(α: undercount ...)` and `(α: overcount ...)` -- slightly more readable; requires 2 grep patterns but distinguishes cases in Stage Report analytics.
3. Family of N forms keyed by directive scale (trivial / medium / architectural-overhaul) -- maximum readability; high grep surface area.

→ Answer: Single canonical form (captain, 2026-04-15, interactive) -- exactly `(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})`. Self-test gate item (i) greps for this literal format; `{n}` and `{directive-signal}` are regex captures. Plan-phase must enumerate the closed set of acceptable `{directive-signal}` values (e.g., `trivial-scope-rename`, `architectural-overhaul`, `single-line-config-edit`, etc.) so the signal field is testable, not freeform.

### Q-5: CONTRACTS coordination ship-order with `build-flow-tdd-discipline`

**Domain**: Organizational (cross-entity coordination)

**Why it matters**: A-5 confirms `build-flow-tdd-discipline` is still in-flight at execute stage on `skills/build-brainstorm/SKILL.md` Step 4. Both entities add content to Step 4 surface area (TDD has given/when/then AC guidance; v2 has 4-lens + merge gate + self-test). Whichever ships second rebases onto the other's changes. Captain must decide ship order now so plan-phase sequences correctly.

**Suggested options**:
1. Ship build-flow-tdd-discipline first (already in-flight; smaller contract) -- v2 rebases onto TDD-augmented Step 4. Preserves TDD work momentum.
2. Ship 104 first (parent epic 102 is frozen; v2 unblocks sibling 105) -- TDD rebases onto v2-restructured Step 4. Preserves sibling-child coordination.
3. Parallel-ship with explicit merge handoff (first-to-plan-approval wins; second takes rebase cost, captain gates at plan-phase).
4. Add `depends-on: [build-flow-tdd-discipline]` to this child's frontmatter to force FO dispatch ordering.

→ Answer: Ship 104 first (captain, 2026-04-15, interactive) -- rationale: epic 102 is frozen and sibling 105 depends on 104's tier-tag format, so 104-first unblocks cross-child coordination. `build-flow-tdd-discipline` rebases its given/when/then Step 4 additions onto v2-restructured Step 4 when it advances past its current in-flight execute stage. Plan-phase MUST (a) append a CONTRACTS entry for 104's Step 4 surface claim, (b) note the rebase handoff in 104's `## Ship Notes` (to be added at plan), (c) not add `depends-on` frontmatter (would create circular wait since TDD is already execute-stage in-flight -- depends-on goes the other direction implicitly).

## Ship Notes

### Ship-order coordination with `build-flow-tdd-discipline`

Per Q-5 captain decision 2026-04-15: entity 104 ships first. `build-flow-tdd-discipline` (in-flight at execute stage per CONTRACTS.md:183) rebases its Step 4 given/when/then AC guidance onto v2-restructured Step 4 when it next advances. Rebase instruction: TDD's Step 4 additions lift onto the new "Step 4: Brainstorming Spec" output-format block preserved from v1; the 4-lens + merge-gate + self-test additions land in Steps 1 and 5.5, leaving Step 4 semantically available for TDD augmentation.

### Tier-tag parity with sibling 105

Bracketed `[primary|secondary|tertiary]` tier-tag syntax frozen per epic 102 O-1. Sibling 105 consumes this syntax at runtime (105 Canonical Refs + AC). Ship-order independent: 104 ships with the syntax fixed; 105 inherits and emits the same form in its own lens output.

### Future-entity candidates

Out-of-scope items surfaced during plan but deferred:
- Raising the 5-file cap pipeline-wide (parent 102 Core Tension 2). Current plan raises only build-brainstorm to 9. Other skills remain at 5.
- Dashboard renderer special-casing for `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries` (per parent 102 Q-2 resolution: generic markdown H2 rendering for now).
- Backfill of v2 schema into 36+ shipped v1 entities (Honest Boundary: forward-only upgrade).
- Pipeline-wide O-2 escape-hatch string rollout beyond entity 104.

## Stage Report: explore

- [x] Files mapped: 7 across skills and docs
  skills/: 5 (build-brainstorm SKILL.md at :8/:275 leaf confirmation + graft/SKILL.md:50 Agent precedent + build-explore/SKILL.md:17-107 Mode A/B precedent + build-review/SKILL.md:27-29 same + build-plan/SKILL.md:27-29 same), agents/: 2 (code-explorer.md + researcher.md), docs/: 1 (_index/CONTRACTS.md:181-185 TDD collision)
- [x] Assumptions formed: 6 (Confident: 5, Likely: 1, Unclear: 0)
  A-1 through A-5 Confident via direct line-number evidence; A-6 Likely (escape-hatch string inherits parent 102 Q-3 candidate pool, not a resolved decision)
- [x] Options surfaced: 3
  O-1 dispatch mode semantics (total vs Mode A/B vs hybrid -- Mode A/B recommended per 3-skill precedent); O-2 empty-state escape-hatch string (precedent form recommended); O-3 merge-gate semantics per invocation path (path-aware recommended, follows O-1)
- [x] Questions generated: 5
  Q-1 self-test failure-routing (from α-1); Q-2 lens (b) source scope; Q-3 generative-power operational definition; Q-4 cardinality α-marker form; Q-5 CONTRACTS ship-order coordination with build-flow-tdd-discipline
- [x] α markers resolved: 0 / 1
  α-1 (self-test failure-routing) -- no codebase precedent for exact routing semantics; brainstorm v1 uses "fix inline" (SKILL.md:274), plan uses blocker-halt (plan-checker) -- both precedents; escalated to Q-1
- [x] Scale assessment: confirmed Medium
  frontmatter declared Medium; 7 files mapped across skills/agents/docs layers; well-matched; scope flag "likely-decomposable-already" noted -- NOT warranted to sub-decompose (child of epic already; sub-scopes sequential: merge-gate consumes lens output, tensions surface from merge failures)
- [x] Research dispatched: 0 researchers (skipped -- all claims codebase architecture, no external technology dependencies; huashu-nuwa methodology already validated inline by parent 102)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- child 104 has no `## Decomposition Recommendation` section; parent 102 was the epic that decomposed to 104+105
- [x] Re-validation: 6 assumptions checked, 0 stale (evidence collected minutes earlier in explore), 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated (none dispatched)
- [x] Assumptions confirmed: 7 / 7 (0 corrected)
  A-1..A-6 confirmed via batch; A-7 (methodology portability) added during Step 4.5 open exploration + confirmed interactively
- [x] Options selected: 3 / 3
  O-1 Mode A/B split (recommended -- copy build-explore pattern); O-2 "Checked -- no notable constraints identified." (recommended -- existing GUARDRAILS precedent); O-3 Path-aware gate semantics (recommended -- follows O-1)
- [x] Questions answered: 5 / 5 (0 deferred)
  Q-1 Hard-fail to FO/captain (from α-1); Q-2 Keyword-driven journal + Core Tension siblings; Q-3 Predictive marker heuristic; Q-4 Single canonical form; Q-5 Ship 104 first (ahead of build-flow-tdd-discipline)
- [x] Open exploration: 1 gray area surfaced (0 from templates, 0 from CONTRACTS, 1 from directive-implied -- methodology portability)
  A-7 added for huashu-nuwa external-path vendoring; captain directive to use functional naming (no `huashu-nuwa-` prefix)
- [x] Canonical refs added: 1 (updated existing entry for extraction-framework.md with vendoring plan; Plan-phase owns the actual file copy)
- [x] Context status: ready
  gate passed: all 7 assumptions confirmed, all 3 options selected, all 5 Qs answered, 9 acceptance criteria present with no α markers
- [x] Handoff mode: loose (auto_advance: blank in frontmatter)
  captain must say "execute brainstorm-nuwa-distillation" or "execute 104" to advance; First Officer owns `status: plan` transition in separate flow
- [x] Clarify duration: 7 AskUserQuestion calls (0 batch -- Step 2 used plain text + 3 options + 5 questions -- wait, 3 O + 5 Q = 8 but Q-2 used plain text after Chinese explanation, and Step 4.5 used 2 calls; actual count: 3 O calls + 4 Q calls via AskUserQuestion (Q-2 via plain-text freeform after zh explanation) + 2 Step 4.5 loop iterations = 9 AskUserQuestion calls, session complete)

## Research Findings

Inline serial research (plan-stage fallback per SKILL.md Step 2). Broad technology validation already performed by brainstorm + explore + clarify stages (see `## Assumptions` A-1..A-7 all Confirmed, `## Open Questions` Q-1..Q-5 all Answered). Plan-stage research reduced to 3 implementation-specific lookups after dedup.

### Upstream Constraints

- **Engine-freeze (project-wide, CLAUDE.md + MEMORY.md `engine-freeze-as-skill-design-invariant`)** -- no new frontmatter fields, no new pipeline primitives, no engine-feature synthesis. Port remains metaphorical (huashu-nuwa shape) not mechanical (Python `quality_check.py` explicitly out of scope, Honest Boundary 4).
- **Non-interactive skill contract (`skills/build-brainstorm/SKILL.md:274`)** -- zero `AskUserQuestion` / `Teammate(` in main session. Lens subagents MUST be non-interactive prompts too (journal + canonical-refs reads, not captain questions).
- **Subagent cannot nest Agent dispatch (MEMORY.md `subagent-cannot-nest-agent-dispatch.md`)** -- FO→ensign→brainstorm→Agent(researcher) is BROKEN for general-purpose subagents. Load-bearing for Honest Boundary 6 and O-1 Mode A/B decision.
- **File-read cap precedent: 5 files** (`skills/build-brainstorm/SKILL.md:277` "Read at most 5 files") -- raised to 9 for v2; asymmetry vs other skills documented in `## Core Tensions` (domain-based). Single engine-behavior delta justified by 4 lenses × 2 files + 1 INDEX lookup.
- **`--` (double dash) marker convention** -- all markers use `--` never `—` (em dash). Enforced across build-brainstorm, build-explore, build-research per MEMORY.md `review-driven-format-drift-detection`.

### Existing Patterns

- **Mode A/B dual-mode pattern (canonical, 3-skill precedent)** -- `skills/build-explore/SKILL.md:17-107` documents full Mode A (SO-direct has Agent → dispatches `spacedock:code-explorer` via Agent tool) + Mode B (ensign no Agent → inline Read/Grep/Glob fallback with identical output format). `skills/build-review/SKILL.md:27-29` and `skills/build-plan/SKILL.md:27-29` document the identical split for reviewer / researcher teammates. Three-way uniformity makes this THE canonical pattern for "skill that wants to dispatch but may be nested". Plan tasks copy verbatim.
- **Agent in Tools Available (single precedent)** -- `skills/graft/SKILL.md:50` `Agent -- Explore subagent for portability scanning (init only)`. Proves the token is accepted in the "Can use" block; no schema change needed in SKILL.md frontmatter to add it. Plan Task 2 imitates directly.
- **Thin-wrapper agents for parallel dispatch** -- `agents/code-explorer.md` (21 lines, wraps `spacedock:code-explorer`), `agents/researcher.md` (similar shape, wraps `spacedock:build-research`). Both are in the `spacedock:` namespace and proven dispatchable by parent entity 102 explore (3 code-explorer in parallel, see 102 Stage Report). Plan Task 3 dispatches these same two agents (2x code-explorer + 2x researcher = 4 lenses).
- **Thin-wrapper pattern documented** -- `references/claude-ensign-runtime.md:29-80` describes 15-22 line wrapper shape with `tools: Read, Grep, Glob, Skill` and `Agent` explicitly excluded. Existing wrappers already compliant; no new wrapper needed for this plan.
- **`## Core Tensions` / `## Honest Boundaries` first-class body sections** -- already present in this entity (lines 99-120) and parent 102 + sibling 105. Rendered generically by dashboard markdown path `tools/dashboard/static/detail.js:62-84` (per parent 102 Q-2 verification). No renderer change needed.

### Library/API Surface

- **Agent tool dispatch shape** -- `Agent(subagent_type="spacedock:code-explorer" | "spacedock:researcher", model="sonnet", prompt=...)`. Proven shape at `skills/build-explore/SKILL.md:117-135`. Returns structured text per agent's Step 6 output format.
- **Tier-tag bracketed syntax** -- `[primary|secondary|tertiary]` per epic 102 O-1 captain decision. Verified shared with sibling 105 at `docs/build-pipeline/explore-nuwa-subagent-first.md:48` (`O-1 tier tag syntax: bracketed [primary|secondary|tertiary] (MUST match sibling child 104)`) and AC line 102 (`grep -cE '\[primary\]|\[secondary\]|\[tertiary\]'`). Cross-stage grep parity enforced by matching literal brackets.
- **Escape-hatch string (O-2 selected)** -- exact literal `Checked -- no notable constraints identified.` Precedent at `skills/build-brainstorm/SKILL.md:139`. Child 104 body currently uses `None identified -- checked` in a few places (none yet present -- escape-hatch branch never exercised in draft text); AC line 93 greps for the form. Plan Task 6 updates AC grep expressions to match the selected form.
- **α-marker canonical form (Q-4 selected)** -- exact literal `(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})`. Plan Task 2 writes this literal into the self-test gate description plus a closed enum for `{directive-signal}` values.
- **Workflow-index skill surface** -- `Skill("spacedock:workflow-index", {mode:"write", target:"contracts", operation:"append", entry:{...}})`. Invoked unconditionally at plan-stage step 9 per `skills/build-plan/SKILL.md:9a` load-bearing rule. This plan's own append runs against `skills/build-brainstorm/SKILL.md` (all tasks touching it) plus the new vendored file.

### Known Gotchas

- **Mode B degraded-quality semantics** -- Mode B inline fallback cannot achieve true 4-lens triangulation; the self-test gate's cross-lens recurrence check (gate i) MUST be relaxed in Mode B or the gate always hard-fails. Per O-3 path-aware decision: Mode A = ship-blocking, Mode B = advisory (α markers + Stage Report warning). Gates (ii) and (iii) still run in Mode B.
- **CONTRACTS merge collision with `build-flow-tdd-discipline`** -- Q-5 settled "ship 104 first"; but `build-flow-tdd-discipline` is at execute stage in-flight per CONTRACTS.md:183. If TDD merges first, v2 rebases its Step 4 section onto TDD's given/when/then AC guidance. Plan Task 7 appends a Ship Notes sub-section capturing the rebase instruction for the other entity's FO to find via CONTRACTS grep.
- **Sibling 105 parallel-plan coupling** -- 105's plan may land before or after 104's plan. Tier-tag bracketed syntax is frozen by epic 102 O-1 as non-negotiable input (105 inherits, no re-opening). No plan-time coupling required if both sides honor the O-1 string verbatim. Plan Task 2's self-test gate item (v) asserts this exact bracketed form.
- **Extraction-framework external path fragility (A-7)** -- external reference has been vendored per captain directive 2026-04-15. Functional name (no `huashu-nuwa-` prefix), located at `docs/build-pipeline/_docs/extraction-framework.md`. Plan Task 4 handles the copy; Task 5 updates citations. Source file confirmed readable (~5KB, 2026-04-15).
- **Nested Agent dispatch silently degrades** (MEMORY.md `subagent-cannot-nest-agent-dispatch`) -- v2 MUST detect Mode B (no Agent tool in current context) and fallback, not attempt dispatch and fail. Detection heuristic: presence of `Agent` tool in the skill's runtime context. Plan Task 2 writes this detection step.
- **Lens (b) unstated-intent has no ground-truth (Honest Boundary 7)** -- self-test gate can only verify structural presence (subsection exists, ≥1 citation, tier tag), NOT semantic correctness. Plan Task 2 writes the gate as structural-only for lens (b) explicitly.

### Reference Examples

- **`skills/build-explore/SKILL.md:80-150`** -- one-shot reference for Mode A/B section structure: "Two execution modes" heading, "Mode A", "Mode B", "Mode selection heuristic", "Dispatching X (Mode A, when you have Agent tool)" subheadings. Plan Task 2 copies this exact heading skeleton into brainstorm SKILL.md Step 1 (renamed "Step 1: Lens Collection"), substituting 4-lens multi-dispatch for 1-explorer dispatch.
- **`skills/graft/SKILL.md:50`** -- one-shot reference for `Agent` entry in "Tools Available -> Can use" list. Plan Task 2 adds an analogous line to build-brainstorm SKILL.md Tools Available block: `- \`Agent\` -- dispatches 4 parallel lens subagents in Mode A only (Mode B does inline fallback)`.
- **`agents/code-explorer.md` + `agents/researcher.md`** -- one-shot reference for the wrapper shape. Plan confirms no new wrapper file needed (reuse existing).
- **`docs/build-pipeline/_index/CONTRACTS.md:179-185`** -- reference layout for the Step 4 `skills/build-brainstorm/SKILL.md` table. Plan Task 8's `workflow-index append` payload follows this shape.
- **Parent 102 `## Decomposition Recommendation`** (referenced indirectly via inheritance) -- per-child scope definitions that this plan's Task list covers for child 104 (brainstorm-only; explore changes are sibling 105's scope).
- **`docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md` (parent 102, full body)** -- `## Canonical References` section cites the external `extraction-framework.md` path that this plan's Task 5 must update post-vendoring; `## Open Questions` Q-3 holds the extraction-framework candidate pool A-6 inherits; `## Decomposition Recommendation` holds per-child scope. Read-first for Task 5 citation replacement.

### Source Weighting

- Primary: CLAUDE.md, MEMORY.md entries (`engine-freeze-as-skill-design-invariant`, `subagent-cannot-nest-agent-dispatch`, `review-driven-format-drift-detection`), captain directives (O-1/O-2/O-3, Q-1..Q-5, A-7 vendor name).
- Secondary: `skills/build-brainstorm/SKILL.md`, `skills/build-explore/SKILL.md`, `skills/build-review/SKILL.md`, `skills/build-plan/SKILL.md`, `skills/graft/SKILL.md`, `agents/code-explorer.md`, `agents/researcher.md`, `references/claude-ensign-runtime.md`, `docs/build-pipeline/_index/CONTRACTS.md`, `docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md`, `docs/build-pipeline/explore-nuwa-subagent-first.md`.
- Tertiary: none.

---

## PLAN

**Goal**: Port huashu-nuwa Phase 1-through-4 methodology into `skills/build-brainstorm/SKILL.md` via Mode A/B dual-mode orchestrator restructure, add 3 first-class body sections (`## Lens Evidence`, `## Core Tensions`, `## Honest Boundaries`), and vendor the extraction-framework reference locally. Seven code tasks + one verification Task 0, single wave except Task 0.

<task id="task-0" model="sonnet" wave="0" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/build-brainstorm/SKILL.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/build-explore/SKILL.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/graft/SKILL.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/agents/code-explorer.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/agents/researcher.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/docs/build-pipeline/_index/CONTRACTS.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/docs/build-pipeline/explore-nuwa-subagent-first.md
  </read_first>

  <action>
  Environment verification (plan-write-discipline.md Task 0 pattern). Mechanically confirm plan premises before any edits:

  1. File existence: `test -f skills/build-brainstorm/SKILL.md && test -f skills/build-explore/SKILL.md && test -f skills/graft/SKILL.md && test -f agents/code-explorer.md && test -f agents/researcher.md && test -f docs/build-pipeline/_index/CONTRACTS.md && test -f docs/build-pipeline/explore-nuwa-subagent-first.md && test -f /Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md`
  2. Leaf constraint confirmation: `grep -n 'NEVER invoke other skills' skills/build-brainstorm/SKILL.md` MUST return line 275 (text drift → STOP).
  3. File-cap constraint confirmation: `grep -nE 'Read at most 5 files' skills/build-brainstorm/SKILL.md` MUST return one line around 277.
  4. Agent tool precedent: `grep -n '^- .Agent.' skills/graft/SKILL.md` MUST return line 50 with `Agent ... Explore subagent` content.
  5. Mode A/B precedent heading: `grep -n '^### Two execution modes' skills/build-explore/SKILL.md` MUST return ≥1 line.
  6. Sibling 105 tier-tag parity: `grep -nF '[primary|secondary|tertiary]' docs/build-pipeline/explore-nuwa-subagent-first.md` MUST return ≥1 line.
  7. CONTRACTS TDD row: `grep -n 'build-flow-tdd-discipline' docs/build-pipeline/_index/CONTRACTS.md` MUST return line 183.
  8. Target docs directory exists: `test -d docs/build-pipeline/_docs/` OR plan MUST create it in Task 4.
  9. Negative check: `grep -c 'Lens Evidence\|Core Tensions' skills/build-brainstorm/SKILL.md` MUST return 0 (these sections MUST NOT exist yet -- if they do, SKILL.md was already partly edited and plan premises are stale).

  If ANY check fails, STOP: write `## Stage Report: plan` with `feedback-to: captain` and revise the plan against actual state before running Tasks 1-7.
  </action>

  <acceptance_criteria>
    - Checks 1-7 all pass; evidence captured as command-output lines in task report.
    - Check 8 either passes or plan acknowledges Task 4 will create the directory.
    - Check 9 returns 0 (no preexisting target-section text in SKILL.md).
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/build-brainstorm/SKILL.md
  </read_first>

  <action>
  Relax the leaf-skill constraint in `skills/build-brainstorm/SKILL.md` Rules block (line 275 "NEVER invoke other skills. You are a leaf skill, not an orchestrator.") and preamble (line 8 "You are a leaf skill invoked by `/build`.").

  Specifically:
  1. Replace line 275 with: `- **Mode-dependent dispatch.** Mode A (Agent tool available) dispatches 4 parallel lens subagents per Step 1. Mode B (no Agent tool) inline-falls-back to a single-pass read. Do NOT invoke non-lens skills.`
  2. Rewrite line 8 preamble sentence from `You are a leaf skill invoked by \`/build\`.` to: `You are a Mode-A/B dual-mode skill invoked by \`/build\`. In Mode A (Agent tool available) you dispatch 4 parallel lens subagents per invocation; in Mode B (ensign-wrapped, no Agent) you inline-fallback to single-pass. You are non-interactive to the captain in both modes.`
  3. Update line 274 `**Keep it lightweight.** Read at most 5 files for context enrichment.` to `**File-read cap: 9.** Raised from 5 to accommodate 4 lenses × up to 2 files each + 1 INDEX/CONTRACTS lookup per invocation. Every other read-budget assumption identical to v1.`
  4. Leave `NEVER write files.` line unchanged (entity file writes still belong to `/build` ensign or SO-direct writes per existing mode convention).
  </action>

  <acceptance_criteria>
    - `grep -c 'NEVER invoke other skills' skills/build-brainstorm/SKILL.md` returns 0 (leaf constraint gone).
    - `grep -c 'Mode-dependent dispatch\|Mode A.*lens\|Mode B.*inline' skills/build-brainstorm/SKILL.md` returns ≥3 (new Rules text present).
    - `grep -c 'File-read cap: 9' skills/build-brainstorm/SKILL.md` returns 1.
    - `grep -c 'leaf skill invoked by' skills/build-brainstorm/SKILL.md` returns 0 (preamble rewritten).
    - `grep -c 'Mode-A/B dual-mode skill invoked by' skills/build-brainstorm/SKILL.md` returns 1.
  </acceptance_criteria>

  <files_modified>
    - skills/build-brainstorm/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="opus" wave="1" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/build-brainstorm/SKILL.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/build-explore/SKILL.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/graft/SKILL.md
  </read_first>

  <action>
  Major surgery: add 4-lens orchestrator mechanics to `skills/build-brainstorm/SKILL.md`. Three coordinated edits, in this order:

  ### 2a -- Tools Available: add `Agent`

  In the `## Tools Available` block (lines 283-294), append to the `**Can use:**` list:
  ```
  - `Agent` -- dispatches 4 parallel lens subagents in Mode A only (Mode B does inline fallback; see Step 1)
  ```
  Copy shape from `skills/graft/SKILL.md:50` verbatim style.

  ### 2b -- Rewrite Step 1 as "Step 1: Lens Collection (Mode A/B)"

  Replace the current Step 1 ("Context Enrichment") body with a Mode A/B structured section copying the heading skeleton from `skills/build-explore/SKILL.md:80-150`:

  ```markdown
  ## Step 1: Lens Collection (Mode A/B)

  Collect 4 orthogonal lenses before writing APPROACH. Each lens produces a subsection in a new `## Lens Evidence` entity body section with ≥1 `file:line` or `entity:ID` citation, each citation tagged `[primary|secondary|tertiary]`.

  ### Two execution modes

  **Mode A -- full 4-lens dispatch (Agent tool available):**
  Dispatch 4 parallel subagents:
  - Lens (a) Captain-stated-intent: `Agent(subagent_type="spacedock:researcher", model="sonnet", prompt=<directive + AC + 1-paragraph task prompt for surfacing explicit captain statements from directive>)`
  - Lens (b) Captain-unstated-intent: `Agent(subagent_type="spacedock:researcher", model="sonnet", prompt=<keyword-driven journal search "search_journal(query: {directive keywords}, limit: 5)" + Core-Tension-clustered sibling entities per Q-2; structural output only -- no semantic ground-truth check>)`
  - Lens (c) Codebase-current-state: `Agent(subagent_type="spacedock:code-explorer", model="sonnet", prompt=<domain-hint + APPROACH keyword file set>)`
  - Lens (d) Sibling-entity: `Agent(subagent_type="spacedock:code-explorer", model="sonnet", prompt=<INDEX.md sibling lookup + CONTRACTS.md overlap scan>)`

  All 4 dispatches run in parallel. Each subagent returns structured text; the main session consumes and writes to `## Lens Evidence`.

  **Mode B -- inline single-pass fallback (no Agent tool):**
  Read up to 9 files inline (CLAUDE.md, entity file, INDEX.md, CONTRACTS.md, 5 APPROACH keyword files). Write a single-subsection `## Lens Evidence -> ### Inline fallback` block with citations tagged at best-effort tier. Self-test gate (i) cross-lens recurrence is SKIPPED in Mode B (α-marker instead); gates (ii) and (iii) still run.

  ### Mode selection heuristic

  - **Mode A** when Agent tool is present in the runtime `## Tools Available` check.
  - **Mode B** when Agent tool is absent (ensign-wrapped runtime). Do NOT attempt Mode A dispatch and fall back on failure -- detect up-front to avoid cost.

  Detection heuristic: inspect whether `Agent` tool is listed in the current runtime's available tools at skill boot. If uncertain, default to Mode B (fail-safe degrades gracefully).
  ```

  ### 2c -- Add "Step 5.5: Merge Gate + Self-Test Gate" before the existing Step 6

  Insert a new step BEFORE the existing final numbered step (Step 6 or whatever the current final pre-output step is):

  ```markdown
  ## Step 5.5: Triple-Verification Merge Gate + 5-Item Self-Test

  ### Merge gate (3 gates per candidate APPROACH claim)

  Every candidate APPROACH claim passes through 3 independent gates:
  - **Gate (i) cross-lens recurrence**: ≥2 of 4 lens subsections cite supporting evidence for this claim. Skipped in Mode B with α marker.
  - **Gate (ii) generative power (Q-3 predictive marker heuristic)**: claim contains a concrete action verb from the closed set {add, remove, replace, rewrite, rename, dispatch, gate, verify, annotate, vendor, relax, block, emit, append} AND a file/layer name NOT present in the directive text. Binary, grep-verifiable.
  - **Gate (iii) exclusivity**: claim distinguishes this entity from every sibling in `_index/INDEX.md` with overlapping `files_modified` per `_index/CONTRACTS.md`. Failure → seed `Q-n` in `## Open Questions` citing sibling and asking captain to `{merge|link|refine}` (AC line 91).

  Claims passing 3/3 → `## Brainstorming Spec -> APPROACH`. Claims passing 1-2/3 → demote to `GUARDRAILS`. Claims passing 0/3 → discard with Stage Report line `gate-{i|ii|iii} discard: {claim summary}`.

  ### 5-item quality self-test gate

  Run after merge gate, before return:
  1. **Claim cardinality**: APPROACH contains 3-7 factual claims (soft target). Out-of-range MUST be α-marked with literal form `(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})` where `{directive-signal}` is one of {`trivial-scope-rename`, `single-line-config-edit`, `medium-feature`, `architectural-overhaul`, `cross-layer-refactor`}.
  2. **Lens support floor**: every APPROACH claim has ≥2 lens citations. Failure: promote to 2+ lenses (re-dispatch a lens subagent) or demote to GUARDRAILS.
  3. **`## Core Tensions` populated OR escape-hatch**: section contains ≥1 typed entry matching `\*\*(time-based|domain-based|essential)\*\*:` OR literal `Checked -- no notable constraints identified.`
  4. **`## Honest Boundaries` populated OR escape-hatch**: section contains ≥1 `- ` bullet OR literal `Checked -- no notable constraints identified.`
  5. **Tier tags on every lens citation**: every `file:line` or `entity:ID` in `## Lens Evidence` carries `[primary|secondary|tertiary]`. `grep -cE '\[primary\]|\[secondary\]|\[tertiary\]'` ≥ citation count.

  ### Failure routing (Q-1 resolved: Hard-fail to FO/captain)

  - **Mode A**: any gate-(i/ii/iii) or self-test item failure returns NO spec output; emit Stage Report blocker payload `{failure_gate: "{gate-id}", failing_claim: "{verbatim claim text}", failing_lens: "{lens-id}"}`. FO/captain routes recovery.
  - **Mode B**: gate (i) failure is auto-α-marked (no ship-block). Gates (ii)/(iii) and self-test items (2)-(5) still run as advisory; failures inline α-markers + Stage Report warning `ensign-mode inline fallback -- gate {n} advisory-only`.
  ```

  ### 2d -- Rewrite output-format spec to include 3 new body sections

  Update the skill's Output Contract section (wherever it is currently) to declare three NEW entity body sections that the skill produces:
  - `## Lens Evidence` (4 subsections: `### Lens (a) captain-stated-intent`, `### Lens (b) captain-unstated-intent`, `### Lens (c) codebase-current-state`, `### Lens (d) sibling-entity`). Each subsection has ≥1 citation with `[primary|secondary|tertiary]` tag.
  - `## Core Tensions` (typed entries `**(time-based|domain-based|essential)**: {text}` OR literal escape-hatch).
  - `## Honest Boundaries` (`- ` bullets OR literal escape-hatch).

  State downstream contract explicitly: `explore/clarify annotate these sections but MUST NOT delete. Only captain (via clarify annotation) may delete.`
  </action>

  <acceptance_criteria>
    - `grep -c '^- \`Agent\`' skills/build-brainstorm/SKILL.md` returns ≥1 (task 2a).
    - `grep -c '## Step 1: Lens Collection' skills/build-brainstorm/SKILL.md` returns 1.
    - `grep -c '### Two execution modes' skills/build-brainstorm/SKILL.md` returns 1.
    - `grep -c '^Mode A -- full 4-lens dispatch\|^Mode B -- inline single-pass' skills/build-brainstorm/SKILL.md` returns 2.
    - `grep -c '## Step 5.5: Triple-Verification Merge Gate' skills/build-brainstorm/SKILL.md` returns 1.
    - `grep -c 'Gate (i) cross-lens recurrence\|Gate (ii) generative power\|Gate (iii) exclusivity' skills/build-brainstorm/SKILL.md` returns 3.
    - `grep -c '(α: claim count {n} outside default 3-7' skills/build-brainstorm/SKILL.md` returns 1 (Q-4 canonical α form present literally).
    - `grep -c 'Hard-fail to FO/captain\|Mode A.*NO spec output\|Mode B.*advisory' skills/build-brainstorm/SKILL.md` returns ≥2 (Q-1 failure routing present).
    - `grep -c '## Lens Evidence\|## Core Tensions\|## Honest Boundaries' skills/build-brainstorm/SKILL.md` returns ≥3.
    - `grep -c '\[primary|secondary|tertiary\]' skills/build-brainstorm/SKILL.md` returns ≥1 (O-1 tier-tag bracketed syntax referenced in output spec).
    - `grep -c 'Checked -- no notable constraints identified\.' skills/build-brainstorm/SKILL.md` returns ≥2 (O-2 selected escape-hatch form referenced in self-test gate items 3 and 4).
    - `grep -cE "'—'" skills/build-brainstorm/SKILL.md` returns 0 (no em-dash in edits).
  </acceptance_criteria>

  <files_modified>
    - skills/build-brainstorm/SKILL.md
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="2" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/skills/build-brainstorm/SKILL.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/docs/build-pipeline/brainstorm-nuwa-distillation.md
  </read_first>

  <action>
  Add a dedicated subsection `### Lens Subagent Prompts` to `skills/build-brainstorm/SKILL.md` Step 1 capturing the exact prompt templates for each of the 4 lens subagent dispatches. This gives Mode A a copy-paste contract and makes prompts grep-auditable for non-interactivity.

  For each lens (a)/(b)/(c)/(d), include:
  - Dispatched agent: `spacedock:researcher` or `spacedock:code-explorer`
  - Input materials: directive text, AC, CLAUDE.md ref, INDEX.md ref, etc.
  - Return format: 3-6 line structured text with per-citation tier tag
  - Non-interactivity assertion: "this prompt contains zero `AskUserQuestion` / `Teammate(` references"
  - Lens-(b)-specific note: "structural output only; semantic ground-truth not verifiable (Honest Boundary 7)"
  - Q-2 lens (b) scope: `search_journal(query: "{directive keywords}", limit: 5)` with directive-keyword extraction = directive nouns + verbs, stop-word filter; plus "all siblings clustered by shared Core Tension / Honest Boundary".

  Place this subsection immediately after the Mode A/B "Mode selection heuristic" subsection, before Step 2.
  </action>

  <acceptance_criteria>
    - `grep -c '### Lens Subagent Prompts' skills/build-brainstorm/SKILL.md` returns 1.
    - `grep -c 'spacedock:researcher\|spacedock:code-explorer' skills/build-brainstorm/SKILL.md` returns ≥4 (one per lens minimum).
    - `grep -c 'search_journal(query:' skills/build-brainstorm/SKILL.md` returns ≥1 (Q-2 lens-b scope).
    - `grep -c 'Honest Boundary 7' skills/build-brainstorm/SKILL.md` returns 1 (lens-b caveat propagated).
    - `grep -cE 'AskUserQuestion|Teammate\(' skills/build-brainstorm/SKILL.md` returns 0 (non-interactive discipline) OR all hits are contained in negation sentences like "contains zero AskUserQuestion"; verify manually if >0.
  </acceptance_criteria>

  <files_modified>
    - skills/build-brainstorm/SKILL.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="1" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md
  </read_first>

  <action>
  Vendor the extraction-framework reference per A-7 captain directive. Two sub-steps:

  1. `mkdir -p docs/build-pipeline/_docs/` if it does not already exist.
  2. Copy the external file to `docs/build-pipeline/_docs/extraction-framework.md`, PREPENDING this header block before the original content:
  ```
  # Extraction Framework

  This document was adopted from external methodology work on 2026-04-15. It defines the triple-verification gate, contradiction preservation, information-insufficiency handling, and quality self-check patterns used by `skills/build-brainstorm/SKILL.md` v2 (child entity 104). Functionally named -- no origin-skill branding by design per captain directive (A-7).

  ---

  ```

  Preserve the original content verbatim below the header (section ordering, code blocks, markers) -- this is a vendor copy, not a rewrite. Do NOT change any `—` to `--` within the original body (that's a separate stylistic port; out of scope here); only the NEW header block uses `--`.
  </action>

  <acceptance_criteria>
    - `test -f docs/build-pipeline/_docs/extraction-framework.md` succeeds.
    - `head -1 docs/build-pipeline/_docs/extraction-framework.md` returns `# Extraction Framework`.
    - `grep -c 'adopted from external methodology work on 2026-04-15' docs/build-pipeline/_docs/extraction-framework.md` returns 1.
    - `grep -c 'huashu-nuwa' docs/build-pipeline/_docs/extraction-framework.md` returns 0 (functional naming per A-7; origin branding stripped from vendored copy).
    - `wc -l docs/build-pipeline/_docs/extraction-framework.md` returns a line count ≥ 100 (sanity check: source file is ~5KB; vendored copy should retain bulk).
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/_docs/extraction-framework.md
  </files_modified>
</task>

<task id="task-5" model="haiku" wave="1" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/docs/build-pipeline/brainstorm-nuwa-distillation.md
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md
  </read_first>

  <action>
  Update citations in child 104 (this entity) and parent 102 body to re-point from the external extraction-framework path to the vendored local path.

  1. In `docs/build-pipeline/brainstorm-nuwa-distillation.md` (this entity), update `## Canonical References`:
     - Replace the line `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md -- triple-verification gate...` with `docs/build-pipeline/_docs/extraction-framework.md -- triple-verification gate (Part 一), contradiction preservation (Part 三), information-insufficiency (Part 四), quality self-check (Part 六). Vendored locally 2026-04-15 per A-7; functional name (no huashu-nuwa prefix).`
     - Leave the SKILL.md reference (`/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/SKILL.md`) as-is; A-7's captain directive scoped the vendoring to the extraction-framework reference only.

  2. In `docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md` (parent 102), update any `extraction-framework.md` citation within `## Canonical References` or other sections that currently points to the external path. Replace with `docs/build-pipeline/_docs/extraction-framework.md`. Do NOT touch parent 102 frontmatter (ensign guardrail).

  Use `grep -l 'huashu-nuwa/references/extraction-framework' docs/build-pipeline/` to find all callsites before editing. If any entity file other than 102 or 104 also cites this path, surface it in the task report but do NOT edit it (scope).
  </action>

  <acceptance_criteria>
    - `grep -c 'me-company/.agents/skills/huashu-nuwa/references/extraction-framework' docs/build-pipeline/brainstorm-nuwa-distillation.md` returns 0 (external citation replaced).
    - `grep -c 'docs/build-pipeline/_docs/extraction-framework.md' docs/build-pipeline/brainstorm-nuwa-distillation.md` returns ≥1.
    - `grep -c 'me-company/.agents/skills/huashu-nuwa/references/extraction-framework' docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md` returns 0.
    - `grep -c 'docs/build-pipeline/_docs/extraction-framework.md' docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md` returns ≥1.
    - Parent 102 frontmatter (lines 1-22 of the parent file) unchanged: `git diff docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md | head -30` shows no frontmatter deltas.
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/brainstorm-nuwa-distillation.md
    - docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md
  </files_modified>
</task>

<task id="task-6" model="haiku" wave="1" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/docs/build-pipeline/brainstorm-nuwa-distillation.md
  </read_first>

  <action>
  Apply O-2 captain decision: replace `None identified -- checked` occurrences in this entity (104) with the selected escape-hatch string `Checked -- no notable constraints identified.`

  Scope:
  1. `## Acceptance Criteria` line 92 (Honest Boundaries AC): the grep pattern currently asserts `escape-hatch-string-from-Q3`; replace that placeholder with the literal selected form. Same for AC line 93 (Core Tensions).
  2. Any other occurrences of `None identified -- checked` or `escape-hatch-string-from-Q3` in the entity body.
  3. Note: this entity's `## Core Tensions` / `## Honest Boundaries` sections are currently POPULATED (not using escape-hatch form), so no body-content edits needed -- only AC grep expression text.

  Explicitly do NOT edit parent 102 or sibling 105 for this task -- O-2 applies pipeline-wide but rollout beyond 104 is a future-entity concern per parent 102 Q-2 scoping.
  </action>

  <acceptance_criteria>
    - `grep -c 'escape-hatch-string-from-Q3' docs/build-pipeline/brainstorm-nuwa-distillation.md` returns 0.
    - `grep -c 'Checked -- no notable constraints identified\.' docs/build-pipeline/brainstorm-nuwa-distillation.md` returns ≥2 (AC items for tensions + boundaries both reference the selected form).
    - Entity frontmatter unchanged: `git diff docs/build-pipeline/brainstorm-nuwa-distillation.md | grep '^+---\|^-id:\|^-status:'` returns 0 lines.
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/brainstorm-nuwa-distillation.md
  </files_modified>
</task>

<task id="task-7" model="haiku" wave="1" skills="" test_first="false">
  <read_first>
    - /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-brainstorm-nuwa-distillation/docs/build-pipeline/brainstorm-nuwa-distillation.md
  </read_first>

  <action>
  Add a `## Ship Notes` section to this entity body (insert BEFORE the `## Stage Report: explore` section) capturing:

  1. **Ship-order coordination with `build-flow-tdd-discipline`** (Q-5 resolved: 104 ships first). Text:
     ```
     Per Q-5 captain decision 2026-04-15: entity 104 ships first. `build-flow-tdd-discipline` (in-flight at execute stage per CONTRACTS.md:183) rebases its Step 4 given/when/then AC guidance onto v2-restructured Step 4 when it next advances. Rebase instruction: TDD's Step 4 additions lift onto the new "Step 4: Brainstorming Spec" output-format block preserved from v1; the 4-lens + merge-gate + self-test additions land in Steps 1 and 5.5, leaving Step 4 semantically available for TDD augmentation.
     ```

  2. **Tier-tag parity with sibling 105** (epic 102 O-1 frozen): Text:
     ```
     Bracketed `[primary|secondary|tertiary]` tier-tag syntax frozen per epic 102 O-1. Sibling 105 consumes this syntax at runtime (105 Canonical Refs + AC). Ship-order independent: 104 ships with the syntax fixed; 105 inherits and emits the same form in its own lens output.
     ```

  3. **Future-entity candidates** (out of current scope): Text:
     ```
     Out-of-scope items surfaced during plan but deferred:
     - Raising the 5-file cap pipeline-wide (parent 102 Core Tension 2). Current plan raises only build-brainstorm to 9. Other skills remain at 5.
     - Dashboard renderer special-casing for `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries` (per parent 102 Q-2 resolution: generic markdown H2 rendering for now).
     - Backfill of v2 schema into 36+ shipped v1 entities (Honest Boundary: forward-only upgrade).
     - Pipeline-wide O-2 escape-hatch string rollout beyond entity 104.
     ```
  </action>

  <acceptance_criteria>
    - `grep -c '^## Ship Notes' docs/build-pipeline/brainstorm-nuwa-distillation.md` returns 1.
    - `grep -c 'build-flow-tdd-discipline' docs/build-pipeline/brainstorm-nuwa-distillation.md` returns ≥2 (existing refs + new Ship Notes ref).
    - `grep -c 'Bracketed .primary|secondary|tertiary. tier-tag' docs/build-pipeline/brainstorm-nuwa-distillation.md` returns ≥1.
    - Ship Notes section appears BEFORE Stage Report: explore: `awk '/^## Ship Notes/{s=NR} /^## Stage Report: explore/{e=NR} END{exit !(s<e)}' docs/build-pipeline/brainstorm-nuwa-distillation.md` exits 0.
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/brainstorm-nuwa-distillation.md
  </files_modified>
</task>

### Task dependency graph (waves)

- **Wave 0**: task-0 (environment verification; gates the rest).
- **Wave 1** (parallel-eligible where `files_modified` don't overlap):
  - Task 1, Task 2, Task 3 all touch `skills/build-brainstorm/SKILL.md` → run SERIAL (1 → 2 → 3).
  - Task 4 (new file `docs/build-pipeline/_docs/extraction-framework.md`) → parallel-eligible.
  - Task 5 (104 + 102 entity citations) → parallel-eligible (different files than the SKILL.md chain).
  - Task 6 (104 entity body AC edits) → serial after Task 5 (both touch 104 entity body).
  - Task 7 (104 entity body Ship Notes) → serial after Task 6 (same file).

  Practical execution order: **Task 0 → Task 1 → Task 2 → Task 3 → Task 4 (parallel with SKILL.md chain) → Task 5 → Task 6 → Task 7**.

---

## UAT Spec

### Browser

None -- this entity modifies skill reference text and vendored docs. No UI surface. The new body sections (`## Lens Evidence`, `## Core Tensions`, `## Honest Boundaries`) render via the existing dashboard markdown path `tools/dashboard/static/detail.js:62-84` (verified generic at parent 102 Q-2) and need no UAT browser check.

### CLI

- [ ] Run `grep -c 'NEVER invoke other skills' skills/build-brainstorm/SKILL.md` -- returns 0 (leaf constraint removed). AC tie: Task 1.
- [ ] Run `grep -c '## Step 1: Lens Collection\|## Step 5.5: Triple-Verification Merge Gate' skills/build-brainstorm/SKILL.md` -- returns 2 (orchestrator structure in place). AC tie: Task 2.
- [ ] Run `grep -c '(α: claim count {n} outside default 3-7' skills/build-brainstorm/SKILL.md` -- returns 1 (Q-4 canonical α form). AC tie: Task 2.
- [ ] Run `grep -c 'Checked -- no notable constraints identified\.' skills/build-brainstorm/SKILL.md docs/build-pipeline/brainstorm-nuwa-distillation.md` -- returns ≥4 combined (O-2 escape-hatch landed in skill output spec + entity AC). AC tie: Tasks 2, 6.
- [ ] Run `grep -c '\[primary|secondary|tertiary\]' skills/build-brainstorm/SKILL.md docs/build-pipeline/explore-nuwa-subagent-first.md` -- returns ≥2 (tier-tag parity with sibling 105). AC tie: Task 2 + epic 102 O-1 precedent.
- [ ] Run `test -f docs/build-pipeline/_docs/extraction-framework.md && grep -c 'huashu-nuwa' docs/build-pipeline/_docs/extraction-framework.md` -- second grep returns 0 (functional vendoring per A-7). AC tie: Task 4.
- [ ] Run `grep -c 'me-company/.agents/skills/huashu-nuwa/references/extraction-framework' docs/build-pipeline/*.md` -- returns 0 (citations repointed). AC tie: Task 5.

### API

None -- no HTTP or RPC surface in this entity.

### Interactive

- [ ] Captain runs `/build` with a test directive matching the self-test gate item 1 under-count case (e.g., "rename one config var"); confirms the skill either (a) emits a 2-claim APPROACH with `(α: claim count 2 outside default 3-7; scale-justified by trivial-scope-rename)` α marker OR (b) in Mode A: hard-fails with Stage Report blocker. Captain confirms the selected path matches O-3 path-aware decision.
- [ ] Captain runs `/build` with a medium-sized directive in an ensign-wrapped context (Mode B); confirms skill emits Stage Report warning `ensign-mode inline fallback -- gate 1 advisory-only` and produces spec output without hard-fail. Confirms the Mode B degradation was visible, not silent.
- [ ] Captain reviews `docs/build-pipeline/_docs/extraction-framework.md` vendored copy; confirms header block reads cleanly, origin-brand is absent, and the methodology text is intact.

---

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1 `## Lens Evidence` contains 4 distinct lens subsections with ≥1 citation and bracketed tier tag each | task-2, task-3 | `grep -cE '^### Lens ' skills/build-brainstorm/SKILL.md` returns documentation of ≥4 lens subsections in the skill's output-spec examples; downstream runtime verification happens at first v2 invocation | pending | -- |
| AC-2 Every APPROACH claim traces to ≥2 distinct lens subsections | task-2 (5.5 merge gate item i + self-test item 2) | `grep -c 'cross-lens recurrence: ≥2 of 4 lens subsections\|Lens support floor' skills/build-brainstorm/SKILL.md` ≥2 | pending | -- |
| AC-3 Scope-overlap directive seeds `Q-n` in Open Questions citing sibling; no `Dedup flag:` line | task-2 (5.5 merge gate item iii) | `grep -c 'seed Q-n.*sibling\|merge|link|refine' skills/build-brainstorm/SKILL.md` ≥1 | pending | -- |
| AC-4 `## Honest Boundaries` populated OR escape-hatch literal `Checked -- no notable constraints identified.` | task-2, task-6 | `grep -c 'Checked -- no notable constraints identified\.' skills/build-brainstorm/SKILL.md` ≥2 | pending | -- |
| AC-5 `## Core Tensions` populated with typed entries OR same escape-hatch | task-2, task-6 | `grep -cE '\*\*(time-based|domain-based|essential)\*\*:' skills/build-brainstorm/SKILL.md` ≥1 (in self-test gate item 3 example) AND `grep -c 'Checked -- no notable constraints identified\.'` ≥2 | pending | -- |
| AC-6 Non-interactive contract preserved (zero AskUserQuestion/Teammate calls in skill) | task-3 (subagent prompt discipline) | `grep -cE 'AskUserQuestion|Teammate\(' skills/build-brainstorm/SKILL.md` returns 0 (any hit MUST be in negation context -- manual audit if >0) | pending | -- |
| AC-7 Total Read count ≤ 9 per invocation across 3 fixture scales | task-1 (file-read cap text), runtime dogfood deferred to sibling or follow-up entity | `grep -c 'File-read cap: 9' skills/build-brainstorm/SKILL.md` returns 1 (documentation-level; runtime instrumentation deferred -- see Ship Notes) | pending | -- |
| AC-8 Single-lens claim triggers gate-ii block OR α marker | task-2 (5.5 merge gate item ii + self-test item 2 + Q-1 failure routing) | `grep -c 'Gate (ii) generative power' skills/build-brainstorm/SKILL.md` ≥1 AND `grep -c 'Hard-fail to FO' skills/build-brainstorm/SKILL.md` ≥1 | pending | -- |
| AC-9 Leaf→orchestrator nested-context detects nesting or emits warning | task-2 (Mode selection heuristic + Mode B fallback) | `grep -c 'Mode B.*no Agent tool\|Detection heuristic' skills/build-brainstorm/SKILL.md` ≥2 | pending | -- |


## Stage Report: plan

- [x] Load spacedock:build-plan skill
  invoked via Skill() at start of plan stage; 9-step orchestration protocol followed
- [x] Extract research topics from entity context
  brainstorm + explore + clarify already provided 7 Confirmed assumptions, 3 Selected options, 5 Answered questions; plan-stage topics reduced via research dedup (Step 1.5) to 3 implementation-specific lookups: (a) Mode A/B exact structure to copy, (b) extraction-framework source verification, (c) sibling 105 tier-tag parity check
- [ ] SKIP: Dispatch parallel research subagents for identified topics
  ensigns cannot dispatch Agent (per references/claude-ensign-runtime.md + MEMORY.md subagent-cannot-nest-agent-dispatch); 3 residual topics after dedup are narrow in-repo lookups, not broad-tech research -- performed inline per build-plan Step 2 fallback. Logged as "Dispatch Gaps" below.
- [x] Synthesize into ## Research Findings section
  5 canonical subsections (Upstream Constraints / Existing Patterns / Library-API Surface / Known Gotchas / Reference Examples); 6+ citations per subsection with file:line or entity:ID evidence
- [x] Produce ## PLAN with wave-graph task breakdown and per-task model hints
  1 Task 0 (env-verify, sonnet, wave 0) + 7 code tasks (wave 1); serial SKILL.md chain 1 to 2 to 3 (same file), parallel vendoring branch (Task 4), serial 104-body chain 5 to 6 to 7; model hints: opus (Task 2 major surgery), sonnet (Tasks 0/1/3/4/5), haiku (Tasks 6/7 mechanical)
- [x] Produce ## UAT Spec with automated + interactive items
  Browser (None -- no UI surface), CLI (7 automated greps), API (None), Interactive (3 captain sign-off items covering O-3 path-aware gate semantics and A-7 vendor review)
- [x] Produce ## Validation Map tying AC to validation artifacts
  9 rows covering AC-1..AC-9, each mapped to one or more tasks and grep/test command; note AC-7 runtime dogfood deferred (documentation-level only at plan-phase)
- [x] Run self-review iteration(s) per plan-checker dimensions
  inline self-review (Step 5) checked placeholders, tier-tag + escape-hatch consistency, wave dependencies, and AC coverage -- passed; plan-checker Agent dispatch (Step 6-7) unavailable in ensign runtime; five of the eight dimensions (1 Requirement Coverage, 2 Task Completeness, 3 Dependency Correctness, 6 Validation Sampling, 7 Cross-Entity Coherence via workflow-index append) self-verified inline; dimensions 4/5/8 not separately audited
- [x] Append CONTRACTS rows via workflow-index skill at plan approval
  4 rows added: 3 rows under `skills/build-brainstorm/SKILL.md` (Tasks 1/2/3) + 1 new section `docs/build-pipeline/_docs/extraction-framework.md` (Task 4); commit chore(index): add contracts for entity-brainstorm-nuwa-distillation entering plan (4 rows, 2 files)
- [x] Commit work on the spacedock-ensign/brainstorm-nuwa-distillation branch with meaningful messages
  two commits: plan(104) for plan body + chore(index) for CONTRACTS append; branch spacedock-ensign/brainstorm-nuwa-distillation
- [x] Write ## Stage Report: plan with all items marked DONE/SKIPPED/FAILED
  this section

### Dispatch Gaps

- **Step 2 research subagents**: skipped Agent dispatch; performed inline serial reads of 3 sources (skills/build-explore/SKILL.md Mode A/B, skills/graft/SKILL.md:50 Agent precedent, docs/build-pipeline/explore-nuwa-subagent-first.md sibling 105 tier-tag). Root cause: ensign runtime has no Agent tool. Not a plan quality gap -- topics were narrow enough for inline coverage.
- **Step 6 plan-checker dispatch**: skipped Agent(subagent_type="general-purpose", model="sonnet") dispatch. Root cause: same (no Agent tool). Mitigation: inline self-review covered placeholder scan, wave-graph sanity, tier-tag / escape-hatch consistency, and AC-to-Validation-Map completeness. Dimensions 4/5/8 (Context Compliance, Research Coverage, Type/Test Coverage) not separately audited -- Type/Test Coverage is N/A for skill-text edits (no source/test pairing); Context Compliance and Research Coverage implicitly satisfied by the inline research threading captain decisions O-1/O-2/O-3 and answers Q-1..Q-5 through task actions.

### Plan-checker final output

```yaml
# plan-checker not dispatched (ensign runtime lacks Agent); inline self-review verdict:
issues: []
inline_self_review:
  placeholder_scan: clean (TBD/"add appropriate"/"similar to Task N" not present in plan body)
  wave_dependency_sanity: clean (Task 0 wave 0; Tasks 1-7 wave 1 with documented serial chains on shared files)
  validation_map_completeness: clean (9/9 acceptance criteria covered)
  tier_tag_consistency: clean (bracketed [primary|secondary|tertiary] used consistently, matches sibling 105)
  escape_hatch_literal: clean (Checked -- no notable constraints identified. used consistently per O-2)
  a_marker_canonical_form: clean (Q-4 literal "(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})" present in Task 2)
iterations: 0 (plan-checker not dispatched)
```

### Commits

- plan(104): brainstorm-nuwa-distillation -- Research + PLAN + UAT + Validation Map
- chore(index): add contracts for entity-brainstorm-nuwa-distillation entering plan (4 rows, 2 files)

### Summary

Plan stage for entity 104 produced research-backed PLAN (1 Task 0 + 7 code tasks), UAT Spec, Validation Map covering all 9 acceptance criteria, and unconditional workflow-index append for 2 contract surfaces. Agent-dispatch steps (research subagents, plan-checker) were skipped with documented rationale -- ensign runtime lacks the Agent tool -- and mitigated by inline serial research and inline self-review. Core decisions threaded through tasks: O-1 Mode A/B split, O-2 "Checked -- no notable constraints identified." escape-hatch, O-3 path-aware gate semantics, Q-1 hard-fail to FO routing, Q-2 keyword-driven journal + Core Tension sibling clustering, Q-3 predictive marker heuristic (action verb + non-directive file/layer name), Q-4 canonical α-form, Q-5 ship 104 first ahead of build-flow-tdd-discipline rebase.

## Stage Report: execute

status: passed
base SHA: f480471
final SHA: 4125c4e
waves: 2 of 2 completed
tasks: 7 done, 1 done-with-caveat, 0 blocked-terminal
workflow-index transition: f480471 (entered before wave 1)

### Per-task summary
- task-0: DONE (sonnet) -- no commit (verification-only) -- environment verification: 8/9 checks passed; check 7 stale anchor (line 183 → 191) flagged as benign drift, captain approved proceed (option A)
- task-1: DONE (sonnet) -- commit 26a772f (batched with task-2; same file) -- relax leaf-skill constraint in build-brainstorm SKILL.md, raise file-read cap 5→9
- task-2: DONE (opus) -- commit 26a772f (batched with task-1; same file) -- major surgery: add Agent tool, rewrite Step 1 as Lens Collection (Mode A/B), insert Step 5.5 Triple-Verification Merge Gate + 5-Item Self-Test, declare 3 new entity body sections in Output Contract
- task-3: DONE (sonnet) -- commit 4125c4e (1 file) -- add `### Lens Subagent Prompts` subsection with 4 lens prompt templates (wave 2)
- task-4: DONE (sonnet) -- commit 661e30b (1 file) -- vendor extraction-framework.md to docs/build-pipeline/_docs/ with functional naming
- task-5: DONE-WITH-CAVEAT (haiku) -- commits e8e81fc + e390164 (parent 102 + entity body, batched) -- update extraction-framework citations in entity 104 + parent 102 to vendored path; troop initially over-reached and silently mutated PLAN body to satisfy circular AC, FO reverted plan-body hunks before commit
- task-6: DONE (haiku) -- commit e390164 (batched with task-5, task-7; same file) -- replace `escape-hatch-string-from-Q3` placeholder with literal selected form `Checked -- no notable constraints identified.` in `## Acceptance Criteria` section (PLAN body untouched per captain override)
- task-7: DONE (haiku) -- commit e390164 (batched with task-5, task-6; same file) -- add `## Ship Notes` section before Stage Report: explore covering ship-order coordination, tier-tag parity, future-entity candidates

### BLOCKED escalations (if any)
None.

### Stale-file warnings
None detected across either wave.

### Findings

#### Skill suggestions
None surfaced by troops.

#### Scope observations
- **Step 5.5 numbering collision** (task-2): SKILL.md now contains two `## Step 5.5` headings — pre-existing "Step 5.5: Scope Check (Decomposition Signal)" at line 235 and new "Step 5.5: Triple-Verification Merge Gate + 5-Item Self-Test" at line 251. Cosmetic; downstream parsers index by full heading text. Renumber pass (e.g., 5.6) recommended in follow-up.
- **Pre-existing em-dashes in unedited sections** (task-2): SKILL.md retains em-dashes in Goal Check (lines 105-132), Step 6 self-review (line 242), and Rules (line 374) -- pre-dating this entity's edits; AC12 verified zero em-dashes were introduced by task-2's new content. Future stylistic cleanup pass recommended.

#### Pre-existing failures
None.

#### Unresolved scope gaps
None (all wave 1 + wave 2 tasks reached terminal DONE).

#### Plan defects surfaced
- **task-0 stale line-number anchor** — check 7 expected `build-flow-tdd-discipline` at CONTRACTS.md line 183 (actual: line 191; 8-line shift from added in-flight rows). Recommend future plans use ≥1-line form (matches checks 5 + 6) instead of exact-line-number anchors that drift on file growth.
- **task-5 circular AC** — `grep -c 'me-company/.../extraction-framework' docs/build-pipeline/brainstorm-nuwa-distillation.md returns 0` is structurally impossible because the plan body itself contains the search string in `## PLAN` task definitions. Captain override applied (semantic AC satisfaction sufficient). Recommend future plans scope greps with `grep -v '^##\|^<task'` or restrict search to specific section ranges to avoid plan-body self-reference.

### Dispatch deviations
- **Per-task commit batching**: skill mandates "one commit per task, never batched" but tasks 1+2 (both modify SKILL.md) and tasks 5+6+7 (all modify entity body) forced batched commits because troops return changed_files lists without committing themselves and intermediate file states cannot be reconstructed. Mitigation for future plans: schedule co-modifying tasks across separate waves, OR plan ensign explicitly marks tasks as batchable.
- **Per-wave-1 serial dispatch**: skill allows parallel dispatch within a wave when team-mode available, but file conflicts on SKILL.md (1↔2) and entity body (5↔6↔7) forced serial dispatch. task-1 + task-4 dispatched in parallel (only safe pair). Independent task-4 ran with task-1.
- **Plan-body mutation revert**: task-5 troop edited 2 lines inside `## PLAN` (task-4 read_first + task-5 own action text) attempting to satisfy circular AC. FO reverted before commit per skill's "Wave Graph Integrity — No Silent Reorder" rule extended to plan-body integrity. Captain notified, override path B applied for downstream tasks.

knowledge capture: skipped -- all findings are entity-104-specific or plan-defect-class observations already captured in this Stage Report; no D1/D2 patterns generalize beyond this entity.

