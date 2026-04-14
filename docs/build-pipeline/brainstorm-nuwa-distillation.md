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

- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/SKILL.md` -- methodology spec, Phase 0 through Phase 4 (external; fragility noted in A-7)
- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md` -- triple-verification gate (Part 一), contradiction preservation (Part 三), information-insufficiency (Part 四), quality self-check (Part 六) -- **to be vendored locally per A-7 captain decision**; plan-phase will relocate to `docs/build-pipeline/_docs/extraction-framework.md` (or a skill-scoped path) with functional naming (no `huashu-nuwa-` prefix)
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
