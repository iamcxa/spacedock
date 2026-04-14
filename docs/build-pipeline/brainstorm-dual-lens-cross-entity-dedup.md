---
id: 102
title: Brainstorm Nüwa-Style Distillation -- Multi-Lens Synthesis + Merge Gate + Tensions/Boundaries
status: draft
context_status: pending
source: /build
created: 2026-04-14T14:09:45Z
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
parent:
children:
---

## Directive

> brainstorm dual-lens cross-entity dedup

## Captain Context Snapshot

- **Repo**: main @ b9c78ab
- **Session**: Phase E Plan 4 shipped (entity 062 dogfood via PR #28, archived 096 + 093); captain iterating on build-pipeline quality-uplift work.
- **Domain**: Runnable/Invokable (skill behavior), Readable/Textual (entity body sections, INDEX.md), Organizational (cross-entity similarity query)
- **Related entities**:
  - `036 — Pipeline Brainstorm + Profiles — Integration & E2E` (shipped)
  - `build-explore-domain-aware-gray-areas` (active) — source of the contradiction-annotation pattern this directive generalizes
  - `_index/INDEX.md` — existing machine-generated cross-entity index (dedup substrate)
  - `stage-report-evidence-and-confidence` (active) — sibling quality-uplift work
  - `clarify-pre-presentation-evidence-gate` (active) — sibling quality-uplift
- **Created**: 2026-04-14T14:09:45Z

## Brainstorming Spec

**Methodology source**: huashu-nuwa (女媧) distillation methodology -- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/` -- specifically Phase 1 (multi-angle parallel collection), Phase 2.1 (triple-verification merge gate), Phase 2.4 (contradiction preservation as Core Tensions), Phase 2.6 (Honest Boundaries), Phase 4 (quality self-test). See `## Core Tensions` and `## Honest Boundaries` below for the persona-skill-pattern specifically ported to a pipeline context.

**APPROACH**: Transform `skills/build-brainstorm/SKILL.md` from a single-paragraph APPROACH distiller into a **multi-lens synthesis engine with a merge gate and tension preservation**, porting the huashu-nuwa methodology's Phase-1-through-Phase-4 structure to the build-brainstorm stage. Six coordinated changes:

(1) **Multi-lens parallel collection (女媧 Phase 1 port)**: Before writing APPROACH, gather **4 orthogonal lenses** on the directive and write each to a new `## Lens Evidence` section with per-lens subsection. The 4 lenses are (a) **Captain-stated-intent lens** -- the directive text and its explicit rationale, (b) **Captain-unstated-intent lens** -- the underlying problem the captain is likely solving beneath the stated directive, derived from recent journal + `## Canonical References` on sibling entities, (c) **Codebase-current-state lens** -- prevailing patterns, prior decisions, architectural invariants from design docs, ADRs, and `_index/INDEX.md` sibling titles, (d) **Sibling-entity lens** -- active/in-flight entities touching the same files or domain tags. Each lens subsection lists ≥1 `file:line` or `entity:ID` citation. The old "dual-lens" design collapsed (a)+(c) only; 女媧's 6-agent design teaches that 4 is the minimum for useful triangulation in a pipeline stage.

(2) **Merge gate via triple verification (女媧 Phase 2.1 port)**: Before a claim lands in APPROACH, it must pass 3 independent gates -- (i) **Cross-lens recurrence** -- supported by ≥2 of the 4 lens subsections, (ii) **Generative power** -- predicts what downstream stages (explore/plan) will likely discover rather than merely restating the directive, (iii) **Exclusivity** -- distinguishes this entity from sibling entities with overlapping scope. Claims passing all 3 → land in APPROACH as load-bearing commitments. Claims passing 1-2 → demote to GUARDRAILS (directional rules of lower confidence). Claims passing 0 → discarded silently with a line in the Stage Report. **Cross-entity dedup is absorbed into gate (iii) -- it is no longer a separate mechanism**; overlap with a sibling IS an exclusivity failure, handled identically to any other gate failure.

(3) **Core Tensions preservation (女媧 Phase 2.4 port)**: New entity body section `## Core Tensions` captures **essential contradictions within the APPROACH** that must NOT be resolved at brainstorm time -- they surface to build-clarify/build-plan as first-class artifacts rather than being smoothed over into false reconciliation. Three tension types honored (女媧 taxonomy): **time-based** (directive wording evolved in captain's history -- older canonical reference contradicts newer), **domain-based** (codebase precedent differs across subsystems), **essential** (a value-level conflict that IS the design decision -- e.g., "deterministic dedup" vs "LLM-judged divergence"). `## Core Tensions` is never emptied by explore/clarify -- it is annotated with captain decisions or accepted-as-trade-off markers, matching the 女媧 rule "矛盾是人格的核心特徵，不是需要修復的 Bug".

(4) **Honest Boundaries section (女媧 Phase 2.6 port)**: New entity body section `## Honest Boundaries` declares what the proposed APPROACH **fundamentally cannot deliver**. This is distinct from α markers (which signal "I deferred this decision"); boundaries are hard limits the APPROACH itself imposes. Every brainstorm spec must either populate the section OR write the deliberate assessment `None identified -- checked`. Empty-and-unchecked → hard fail at self-test (gate 6 below).

(5) **Source weighting hierarchy (女媧 Phase 1 source table port)**: Every citation in `## Lens Evidence` carries a tier tag -- **primary** (captain directive verbatim + captain's prior `## Canonical References` + design docs captain has explicitly endorsed), **secondary** (codebase `file:line` with ≥2 consistent usages), **tertiary** (speculation, template-derived, "standard practice"). When two lenses contradict on a load-bearing fact, primary wins unless the captain has explicitly documented an override reason in a prior entity's clarify annotations. The blacklist from 女媧 (知乎 / 微信公眾號 / 百度系) has no direct pipeline equivalent, but the spirit transfers: un-cited claims from agent memory cannot anchor a lens finding.

(6) **Quality self-test gate (女媧 Phase 4 port)**: Before returning output, build-brainstorm runs a 5-item self-check -- (i) APPROACH contains 3-7 claims (not 1, not 20 -- 女媧's 心智模型 cardinality rule ported as APPROACH-claim cardinality), (ii) every APPROACH claim is supported by ≥2 lens citations (cross-lens recurrence verified post-hoc), (iii) `## Core Tensions` is populated OR explicitly marked `None identified -- checked`, (iv) `## Honest Boundaries` populated OR explicitly marked `None identified -- checked`, (v) every lens citation carries a `[primary|secondary|tertiary]` tag. Any failure → block return until fixed inline, OR convert to an α marker with specific reason (never a generic "needs clarification"). This is the skill's ship-gate and matches 女媧's "寧可誠實標注局限的 60 分 skill，也不要看起來完美但在編造的 90 分 skill".

**ALTERNATIVE**: Ship the original 2-lens + separate-dedup design (this entity's first brainstorm pass, now rewound) as brainstorm v1.5 incrementally, then open a second entity for 女媧-style v2. -- D-01 rejected because (a) the structural limitations the 女媧 comparison exposed (2 lenses insufficient, no merge gate, no tension/boundary preservation) are **quality-layer defects, not feature-layer gaps** -- shipping the 2-lens version creates compounding downstream cost across every future brainstorm invocation, (b) the captain mid-session redirected to 女媧 methodology after reading the 2-lens explore output, signaling that the 2-lens version would not ship even if prepared for clarify, and (c) splitting into v1.5 + v2 fragments the build-brainstorm contract across two versions, doubling reference-doc and dogfood-entity maintenance cost for negligible time-to-ship savings (rewind is cheap now; SO session is still live).

**GUARDRAILS**:
- **Engine-freeze preserved**: no new frontmatter fields, no new pipeline primitives. New sections (`## Lens Evidence`, `## Core Tensions`, `## Honest Boundaries`) are markdown text-only and render through the existing dashboard's body pipeline.
- **Non-interactive contract preserved**: build-brainstorm still NEVER calls AskUserQuestion or Teammate. Multi-lens collection, merge-gate verification, tension declaration, and boundary declaration are ALL text-only output. Gate failures become α markers or Core-Tensions entries, never questions.
- **File-read cap revised, not removed**: original cap was `5 files for context enrichment` at `skills/build-brainstorm/SKILL.md:233`. New cap: **9 files** (4 lenses × up to 2 files each, +1 for `_index/INDEX.md` sibling-entity lookup). This is the ONLY pre-existing skill primitive that changes; every other skill behavior stays identical. The cap expansion is justified by the 4-lens requirement and is the single engine-behavior delta this entity commits.
- **Dedup is subsumed, not removed**: no separate `**Dedup flag:**` line in Captain Context Snapshot. Sibling-entity overlap is caught by Lens (d) + Gate (iii) and becomes an Open Question (or, if severe, a Core Tension). Downstream action vocabulary (`merge|link|refine`) preserved in the Q-n framing.
- **Core Tensions and Honest Boundaries are append-only for downstream stages**: build-explore / build-clarify MAY annotate entries (add discovery timestamps, captain resolutions, accepted-as-trade-off markers) but NEVER DELETE entries. Captain is the only entity authorized to delete, via an explicit clarify annotation.
- **Source-weighting primary wins by default**: when lenses contradict, the primary-tier source is authoritative unless the captain's prior clarify annotations override for a specific claim. This matches 女媧's "本人著作 > 二手轉述" rule.
- **Self-test gate is ship-blocking, not advisory**: failure of any of the 5 self-test items blocks return with a specific failure reason logged to Stage Report. No skill output is returned on any gate failure -- the captain or FO must address it before re-invocation.

**RATIONALE**: The original 2-lens + separate-dedup design was a reasonable first-pass but the huashu-nuwa methodology reveals three class-level defects that would compound across every future brainstorm invocation: (1) **2 lenses cannot triangulate** -- captain-intent and codebase-reality overlap too often, missing sibling-entity drift (what neighbors are already doing) and architectural-invariant drift (what design docs commit to); 女媧's 6-angle parallel Phase 1 proves 4+ angles are the useful floor, (2) **"emit contradiction seed" is passive delegation** -- the old design offloaded the merge to downstream stages, while 女媧's Phase 2.1 triple-verification gate proves that gating at brainstorm output time is both possible and cheaper (correction at the moment captain attention is maximally focused on the directive), (3) **dedup as a separate mechanism fragments the quality signal** -- overlap with a sibling IS an exclusivity failure, which IS a merge-gate event; treating dedup as side-channel produced inconsistent captain UX (dedup flag in one section, contradiction seed in another, open question somewhere else). The 女媧-informed design unifies these into a single multi-lens → triple-verify → declare-tensions-and-boundaries pipeline, the same cognitive-operating-system extraction pattern that 女媧 has validated across 13 person-skills. Additionally, the new `## Core Tensions` + `## Honest Boundaries` sections give build-clarify and build-plan first-class artifacts for captain-facing review that the old design smoothed away -- every tension caught at brainstorm time is a question clarify doesn't have to discover, and every declared boundary is a plan deviation-risk avoided.

## Acceptance Criteria

- Given a directive invoking build-brainstorm, when the skill runs, then the output body contains `## Lens Evidence` with at minimum 4 distinct lens subsections (captain-stated, captain-unstated, codebase-current, sibling-entity), each with ≥1 citation and a `[primary|secondary|tertiary]` tier tag (how to verify: `grep -c "### Lens " output.md` ≥ 4; for each subsection, grep for `file:\|entity:` yields ≥1; grep for `[primary]\|[secondary]\|[tertiary]` yields ≥1).
- Given any APPROACH claim, when traced through `## Lens Evidence`, then ≥2 distinct lens subsections cite evidence supporting it (how to verify: pick any APPROACH sentence with a factual assertion; assert at least 2 of the 4 lens subsections contain supporting citations).
- Given a directive whose scope overlaps with an active sibling entity, when build-brainstorm runs, then the output contains a Q-n in `## Open Questions` (populated later by explore, but seeded in brainstorm output per merge-gate-iii failure) citing the sibling `{id} ({title})` and asking captain to `{merge|link|refine}` (how to verify: seed a directive mirroring entity `036`'s title; assert `Q-` entry exists referencing `036`; no `**Dedup flag:**` line in Captain Context Snapshot).
- Given any brainstorm output, when `## Honest Boundaries` is inspected, then it is either populated with ≥1 declared limit OR contains the exact escape-hatch string `None identified -- checked` (how to verify: `grep -A 20 "^## Honest Boundaries$" output.md | grep -E "^-|None identified -- checked"` yields ≥1 match).
- Given any brainstorm output, when `## Core Tensions` is inspected, then it is either populated with ≥1 tension entry labeled with type (time-based / domain-based / essential) OR contains the exact escape-hatch string `None identified -- checked` (how to verify: same grep pattern as Honest Boundaries against the `## Core Tensions` header).
- Given the enhancement ships, when the non-interactive contract is audited, then build-brainstorm issues zero AskUserQuestion / Teammate question calls (how to verify: `grep -cE "AskUserQuestion\|Teammate\(" skills/build-brainstorm/SKILL.md` returns 0).
- Given 4-lens analysis runs, when the file-read budget is audited across 3 distinct fixture directives, then total file-read count ≤ 9 per invocation (how to verify: instrument a Read counter into the skill run; assert count ≤ 9 for each of the 3 fixtures).
- Given APPROACH contains a load-bearing factual assertion that only 1 lens supports, when the self-test gate runs, then the skill blocks return with a logged Stage Report entry `gate-ii failed: claim {n} supported by only {lens}; promote to 2+ lenses or demote to GUARDRAILS` (how to verify: seed a directive constructed to produce a single-lens claim; assert the skill returns error-state or α-marks the claim with the specific failure reason).

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Open Questions

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Core Tensions

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seed from the methodology port itself:)

- **essential**: **deterministic merge gate vs LLM-judged lens-recurrence** -- Gate (i) "cross-lens recurrence" is LLM-judged (a claim is "supported by" a lens based on semantic match), while the GUARDRAILS promise "determinism" inherited from the rewound v1. These are fundamentally in tension; true determinism requires textual exact-match support, which discards the flexibility 女媧's triple-verification exploits. Captain decision needed: lean deterministic (risk under-recalling valid claims) or lean LLM-judged (risk non-reproducibility between invocations).
- **domain-based**: **file-read budget (9 files) vs "at most 5" historical cap** -- skill currently promises ≤5 reads; 4 lenses need 8-9. The cap is a precedent across the pipeline's non-interactive skills; raising it for one skill creates an asymmetry explore-skill readers will notice. Trade-off is real and unavoidable.
- **time-based**: **brainstorm-v1 shipping pattern (shipped entities 036 etc.) vs brainstorm-v2 body schema** -- 36+ shipped entities have v1-shape bodies (no `## Lens Evidence`, no `## Core Tensions`). The dashboard's frontmatter-io parser must accept both schemas; the upgrade is forward-only (v2 entities do not backfill into v1 storage). Captain confirmation needed during clarify.

## Honest Boundaries

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seed from the methodology port itself:)

- This APPROACH cannot guarantee that 4 lenses are always sufficient for directives that span >2 domains -- 女媧 uses 6 agents for human-persona distillation; a 4-lens pipeline floor is the minimum, not the universal-correct count. Large / cross-domain entities may require a 5th lens (e.g., user-facing-visual lens for UI entities) that this enhancement does not enumerate.
- This APPROACH cannot replicate 女媧's "triple verification across 2+ domains" literally -- 女媧's domains are human life-domains (finance, philosophy, product); build-brainstorm's "domains" are codebase layers (domain / contract / router / view). The port is metaphorical, not mechanical, and the cross-layer recurrence test may be noisier than 女媧's cross-life-domain test.
- This APPROACH does not port 女媧's Phase 1.5 and Phase 2.5 human-checkpoints -- build-brainstorm is non-interactive by contract. The equivalent review happens at the brainstorm→explore handoff (FO or SO inspects output) rather than mid-skill. This is a structural limitation, not an oversight.
- This APPROACH does not include 女媧's Phase 4 quality-self-check script (`quality_check.py`) -- porting a Python quality-gate script is out of scope for a SKILL.md enhancement and would violate the "engine-freeze" GUARDRAIL. The 5-item self-test is LLM-run inside the skill, not script-verified.
- The new `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries` sections will not render with any special treatment in the dashboard's entity detail view until `tools/dashboard/src/body-renderer.ts` is updated -- that update is explicitly out of scope for this entity and is logged as a future entity candidate. Sections render as generic markdown H2s in the interim.

## Canonical References

(clarify stage will populate; initial seeds for the methodology source:)

- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/SKILL.md` -- huashu-nuwa skill spec, Phase 0 through Phase 4 methodology
- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md` -- triple-verification gate methodology (Part 一), contradiction preservation (Part 三), information-insufficiency handling (Part 四), quality self-check (Part 六)
- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/skill-template.md` -- persona-skill template structure (referenced for section-ordering inspiration, not directly ported)
