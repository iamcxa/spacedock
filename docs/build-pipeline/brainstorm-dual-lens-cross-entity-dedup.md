---
id: 102
title: Brainstorm Nüwa-Style Distillation -- Multi-Lens Synthesis + Merge Gate + Tensions/Boundaries
status: clarify
context_status: awaiting-clarify
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

**APPROACH**: Transform `skills/build-brainstorm/SKILL.md` from a single-paragraph APPROACH distiller (⚠ contradicted: skills/build-brainstorm/SKILL.md:117-146 already produces 4 sections -- APPROACH + ALTERNATIVE + GUARDRAILS + RATIONALE -- plus a Step 2.5 Goal Check at :78-109; the "single-paragraph" framing understates current structure -- see Q-1) into a **multi-lens synthesis engine with a merge gate and tension preservation**, porting the huashu-nuwa methodology's Phase-1-through-Phase-4 structure to the build-brainstorm stage. Six coordinated changes:

(1) **Multi-lens parallel collection (女媧 Phase 1 port)**: Before writing APPROACH, gather **4 orthogonal lenses** on the directive and write each to a new `## Lens Evidence` section with per-lens subsection. The 4 lenses are (a) **Captain-stated-intent lens** -- the directive text and its explicit rationale, (b) **Captain-unstated-intent lens** -- the underlying problem the captain is likely solving beneath the stated directive, derived from recent journal + `## Canonical References` on sibling entities, (c) **Codebase-current-state lens** -- prevailing patterns, prior decisions, architectural invariants from design docs, ADRs, and `_index/INDEX.md` sibling titles, (d) **Sibling-entity lens** -- active/in-flight entities touching the same files or domain tags. Each lens subsection lists ≥1 `file:line` or `entity:ID` citation. The old "dual-lens" design collapsed (a)+(c) only; 女媧's 6-agent design teaches that 4 is the minimum for useful triangulation in a pipeline stage.

(2) **Merge gate via triple verification (女媧 Phase 2.1 port)** (✓ confirmed by explore: /Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md:9-30 defines 跨域复现 / 有生成力 / 有排他性 exactly as restated here): Before a claim lands in APPROACH, it must pass 3 independent gates -- (i) **Cross-lens recurrence** -- supported by ≥2 of the 4 lens subsections, (ii) **Generative power** -- predicts what downstream stages (explore/plan) will likely discover rather than merely restating the directive, (iii) **Exclusivity** -- distinguishes this entity from sibling entities with overlapping scope. Claims passing all 3 → land in APPROACH as load-bearing commitments. Claims passing 1-2 → demote to GUARDRAILS (directional rules of lower confidence). Claims passing 0 → discarded silently with a line in the Stage Report. **Cross-entity dedup is absorbed into gate (iii) -- it is no longer a separate mechanism**; overlap with a sibling IS an exclusivity failure, handled identically to any other gate failure.

(3) **Core Tensions preservation (女媧 Phase 2.4 port)** (✓ confirmed by explore: extraction-framework.md:73-97 defines 三种矛盾类型 -- 时间性 / 领域性 / 本质性张力 -- matching the three tension types cited below verbatim): New entity body section `## Core Tensions` captures **essential contradictions within the APPROACH** that must NOT be resolved at brainstorm time -- they surface to build-clarify/build-plan as first-class artifacts rather than being smoothed over into false reconciliation. Three tension types honored (女媧 taxonomy): **time-based** (directive wording evolved in captain's history -- older canonical reference contradicts newer), **domain-based** (codebase precedent differs across subsystems), **essential** (a value-level conflict that IS the design decision -- e.g., "deterministic dedup" vs "LLM-judged divergence"). `## Core Tensions` is never emptied by explore/clarify -- it is annotated with captain decisions or accepted-as-trade-off markers, matching the 女媧 rule "矛盾是人格的核心特徵，不是需要修復的 Bug".

(4) **Honest Boundaries section (女媧 Phase 2.6 port)**: New entity body section `## Honest Boundaries` declares what the proposed APPROACH **fundamentally cannot deliver**. This is distinct from α markers (which signal "I deferred this decision"); boundaries are hard limits the APPROACH itself imposes. Every brainstorm spec must either populate the section OR write the deliberate assessment `None identified -- checked`. Empty-and-unchecked → hard fail at self-test (gate 6 below).

(5) **Source weighting hierarchy (女媧 Phase 1 source table port)**: Every citation in `## Lens Evidence` carries a tier tag -- **primary** (captain directive verbatim + captain's prior `## Canonical References` + design docs captain has explicitly endorsed), **secondary** (codebase `file:line` with ≥2 consistent usages), **tertiary** (speculation, template-derived, "standard practice"). When two lenses contradict on a load-bearing fact, primary wins unless the captain has explicitly documented an override reason in a prior entity's clarify annotations. The blacklist from 女媧 (知乎 / 微信公眾號 / 百度系) has no direct pipeline equivalent, but the spirit transfers: un-cited claims from agent memory cannot anchor a lens finding.

(6) **Quality self-test gate (女媧 Phase 4 port)**: Before returning output, build-brainstorm runs a 5-item self-check -- (i) APPROACH contains 3-7 claims (not 1, not 20 -- 女媧's 心智模型 cardinality rule ported as APPROACH-claim cardinality), (ii) every APPROACH claim is supported by ≥2 lens citations (cross-lens recurrence verified post-hoc), (iii) `## Core Tensions` is populated OR explicitly marked `None identified -- checked`, (iv) `## Honest Boundaries` populated OR explicitly marked `None identified -- checked`, (v) every lens citation carries a `[primary|secondary|tertiary]` tag. Any failure → block return until fixed inline, OR convert to an α marker with specific reason (never a generic "needs clarification"). This is the skill's ship-gate and matches 女媧's "寧可誠實標注局限的 60 分 skill，也不要看起來完美但在編造的 90 分 skill".

**ALTERNATIVE**: Ship the original 2-lens + separate-dedup design (this entity's first brainstorm pass, now rewound) as brainstorm v1.5 incrementally, then open a second entity for 女媧-style v2. -- D-01 rejected because (a) the structural limitations the 女媧 comparison exposed (2 lenses insufficient, no merge gate, no tension/boundary preservation) are **quality-layer defects, not feature-layer gaps** -- shipping the 2-lens version creates compounding downstream cost across every future brainstorm invocation, (b) the captain mid-session redirected to 女媧 methodology after reading the 2-lens explore output, signaling that the 2-lens version would not ship even if prepared for clarify, and (c) splitting into v1.5 + v2 fragments the build-brainstorm contract across two versions, doubling reference-doc and dogfood-entity maintenance cost for negligible time-to-ship savings (rewind is cheap now; SO session is still live).

**GUARDRAILS**:
- **Engine-freeze preserved**: no new frontmatter fields, no new pipeline primitives. New sections (`## Lens Evidence`, `## Core Tensions`, `## Honest Boundaries`) are markdown text-only and render through the existing dashboard's body pipeline.
- **Non-interactive contract preserved** (✓ confirmed by explore: skills/build-brainstorm/SKILL.md:293-294 lists AskUserQuestion as "NOT available"; current contract aligns): build-brainstorm still NEVER calls AskUserQuestion or Teammate. Multi-lens collection, merge-gate verification, tension declaration, and boundary declaration are ALL text-only output. Gate failures become α markers or Core-Tensions entries, never questions.
- **File-read cap revised, not removed**: original cap was `5 files for context enrichment` at `skills/build-brainstorm/SKILL.md:233` (⚠ contradicted: actual cap location is `skills/build-brainstorm/SKILL.md:277` -- "Read at most 5 files for context enrichment"; line 233 is entity-template output text, not the cap rule -- see Q-1). New cap: **9 files** (4 lenses × up to 2 files each, +1 for `_index/INDEX.md` sibling-entity lookup). This is the ONLY pre-existing skill primitive that changes; every other skill behavior stays identical. The cap expansion is justified by the 4-lens requirement and is the single engine-behavior delta this entity commits.
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

**A-1**: The 4-lens floor (captain-stated / captain-unstated / codebase-current / sibling-entity) is sufficient triangulation for Medium-scale entities; Large or cross-domain entities may need a 5th lens but that is explicitly deferred to Honest Boundary 1.
- **Confidence**: Likely (0.70)
- **Evidence**: APPROACH (1) commits to 4 lenses as "the minimum for useful triangulation in a pipeline stage"; Honest Boundary 1 acknowledges "Large / cross-domain entities may require a 5th lens". Entity 102 itself touched 7 files across 2 layers during its own explore -- well within a 4-lens budget.

**A-2**: 女媧's 「心智模型 3-7个」 cardinality rule ports cleanly to "APPROACH contains 3-7 claims" as the ship-gate item (6)(i), even though the port is metaphorical (mental model ↔ APPROACH claim is not a mechanical 1:1 mapping).
- **Confidence**: Likely (0.75)
- **Evidence**: /Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md:130 verbatim: "模型数量在3-7个之间？（太少=太浅，太多=没提炼）" -- 3-7 cardinality rule exists in source methodology. (✓ research: inline read of extraction-framework.md:130 -- source rule confirmed; cross-layer port validity noted as caveat in Honest Boundary 2.)

**A-3**: Captain's brainstorm spec text is the authoritative source-of-truth for this entity's design; corrections to factual errors (file line references, file paths) should be applied in clarify but the design intent stands.
- **Confidence**: Confident (0.95)
- **Evidence**: Entity 102 `source: /build` (frontmatter); captain drafted the spec directly after reading huashu-nuwa; rewind commit `4a3a4f8` discarded an earlier 2-lens v1 in favor of this 女媧 port. Captain authorship is direct.

**A-4**: The non-interactive contract (no AskUserQuestion / Teammate calls) is preserved trivially because all new mechanisms (multi-lens collection, merge gate, tension declaration, boundary declaration) produce text-only output.
- **Confidence**: Confident (0.95)
- **Evidence**: skills/build-brainstorm/SKILL.md:293-294 explicitly lists AskUserQuestion as NOT available; the proposed new sections `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries` are all markdown-body artifacts, not primitives that would trigger interaction.

## Option Comparisons

### O-1: Tier tag syntax for `## Lens Evidence` citations

APPROACH (5) requires every citation to carry a `[primary|secondary|tertiary]` tier tag but does not specify the inline format. The choice matters because acceptance-criteria grep `grep -E '\[primary\]|\[secondary\]|\[tertiary\]' output.md` is sensitive to bracket syntax.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **Bracketed suffix** (`skills/build-brainstorm/SKILL.md:277 [primary]`) | Grep-friendly; `[primary]` is literally unique; matches acceptance criterion wording verbatim; visually scans as a tag | Slight visual noise on every citation line; bracket characters may interact with some markdown renderers if used in link text | Low | ✅ Recommended |
| **Parenthetical suffix** (`skills/build-brainstorm/SKILL.md:277 (primary)`) | Less visual noise; natural reading order | `(primary)` ambiguous with existing `(✓ confirmed)` / `(needs clarification -- deferred to explore)` annotation conventions; grep must escape parens; collides with Step 5.5 Research Findings annotation style | Low | Viable |
| **Key-value suffix** (`skills/build-brainstorm/SKILL.md:277 tier:primary`) | Machine-parseable without regex special chars; extensible if future tiers added | Visual noise equivalent to brackets; no precedent in the pipeline; `tier:` is a new token readers must learn | Low | Viable |

**Decision owner**: captain via clarify AskUserQuestion. Recommendation favors Option 1 because the entity's own acceptance criterion (line 74) already writes `grep for '[primary]|[secondary]|[tertiary]' yields >= 1` -- bracketed syntax is pre-committed by the spec.

## Open Questions

### Q-1: Spec-text corrections for two factual inaccuracies

**Domain**: Readable/Textual (spec wording)

**Why it matters**: The Brainstorming Spec contains two factual errors that will propagate into plan and execute if not corrected during clarify. Both are simple wording fixes but they undermine spec credibility if left unaddressed.

- APPROACH opening calls build-brainstorm a "single-paragraph APPROACH distiller" -- current skill at `skills/build-brainstorm/SKILL.md:117-146` produces 4 sections (APPROACH + ALTERNATIVE + GUARDRAILS + RATIONALE), plus a Step 2.5 Goal Check at :78-109. The "single-paragraph" framing understates existing structure and may mislead future readers evaluating the proposed delta.
- GUARDRAILS (4) cites file cap at `SKILL.md:233` -- actual cap is at line 277 ("Read at most 5 files for context enrichment" in the Rules section). Line 233 is entity-template output text.

**Suggested options**:
1. Correct both in-place during clarify: change "single-paragraph APPROACH distiller" → "4-section brainstorming-spec distiller (APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE) plus Step 2.5 Goal Check"; change `SKILL.md:233` → `SKILL.md:277`.
2. Rewrite the surrounding GUARDRAILS paragraph to frame the delta as "raising a 5-file cap defined in the Rules section" without line-number citation at all.
3. Captain-authored rewrite.

### Q-2: Dashboard rendering target file

**Domain**: Readable/Textual (dashboard entity detail rendering)

**Why it matters**: Honest Boundary 5 commits this entity to leaving new sections unstyled "until `tools/dashboard/src/body-renderer.ts` is updated" -- but no such file exists in the repo. Dashboard body rendering is handled client-side in `tools/dashboard/static/detail.js` which only special-cases `## Stage Report:` splits at line 64. Every other `##` section (including existing `## Brainstorming Spec`, `## Open Questions`) already renders as generic markdown with no special treatment. The boundary claim as written is non-actionable because the referenced file does not exist.

**Suggested options**:
1. Update Honest Boundary 5 to reference `tools/dashboard/static/detail.js` as the rendering target.
2. Rewrite Honest Boundary 5 to acknowledge that "generic markdown rendering is the permanent current state" and drop the future-entity hook (client-side detail.js already handles this by omission of special cases).
3. Commit to a server-side body renderer as the long-term target, keep the path as-is but add a note "(file does not exist yet; target for future entity)".

### Q-3: Empty-state escape-hatch string consistency

**Domain**: Readable/Textual (body-section conventions)

**Why it matters**: Existing precedent at `skills/build-brainstorm/SKILL.md:139` uses `Checked -- no notable constraints identified.` for empty GUARDRAILS; entity 102 proposes `None identified -- checked` for empty `## Core Tensions` and `## Honest Boundaries`. Two escape-hatch conventions in one skill is confusing and breaks grep-uniformity. Acceptance-criteria grep (entity 102 lines 77-78) hardcodes the new string, so this must be settled before plan.

**Suggested options**:
1. Adopt `Checked -- no notable constraints identified.` for both new sections, matching existing GUARDRAILS precedent.
2. Keep `None identified -- checked` for new sections and migrate GUARDRAILS to the new form in a sibling refactor entity.
3. Use a single general-purpose token `(none -- deliberate)` across all empty-state positions.

### Q-4: Primary-tier tie-break when two primary citations contradict

**Domain**: Runnable/Invokable (skill logic)

**Why it matters**: APPROACH (5) specifies "when two lenses contradict on a load-bearing fact, primary wins unless the captain has explicitly documented an override reason". This handles primary-vs-secondary conflicts but is silent when two primary-tier citations themselves contradict (e.g., captain directive at entity 102 line X contradicts captain directive at sibling entity Y line Z). Both are primary. The merge gate has no specified fallback.

**Suggested options**:
1. Escalate to Core Tension (time-based) -- "captain directive evolved between entities, both cited primary".
2. Escalate to Open Question and block APPROACH emission until captain resolves.
3. Prefer the most-recent primary by timestamp, log the older one as a Core Tension annotation.

### Q-5: Lens (d) exclusivity check mechanism -- operational gap

**Domain**: Organizational (cross-entity similarity)

**Why it matters**: Gate (iii) exclusivity requires sibling-entity lens (d) to detect overlap with "active/in-flight entities touching the same files or domain tags". `_index/INDEX.md` was last rebuilt `2026-04-12` (observed during explore) and does not include entity 102 or its siblings (`build-explore-domain-aware-gray-areas`, `stage-report-evidence-and-confidence`, `clarify-pre-presentation-evidence-gate`, `shape-pre-build-alignment-skill`) -- two days of drift already accumulated. Lens (d) operating on INDEX alone will miss recent entities. The APPROACH does not specify an alternative (CONTRACTS.md? inline grep over the workflow directory?). **(✓ concrete drift evidence found by explore: INDEX.md:41 lists entity 036 as `explore` status, but inline read of `_archive/pipeline-brainstorm-integration.md:1-15` shows 036 is actually `status: shipped, completed: 2026-04-12T15:33:00Z, verdict: PASSED`. Staleness is not hypothetical -- a shipped entity is still surfaced in an active-state column. Lens (d) relying only on INDEX.md would produce false-positive exclusivity flags for 036-style already-shipped work, AND false-negative misses for recently-drafted siblings.)**

**Suggested options**:
1. Lens (d) reads BOTH INDEX.md AND CONTRACTS.md to cover the 2-day staleness window (CONTRACTS.md is append-only and updates per-stage).
2. Lens (d) performs inline `grep -l '{keyword}' docs/build-pipeline/*.md` as a freshness fallback, capped at 3 sibling hits.
3. INDEX.md staleness is an upstream bug (workflow-index-maintainer idle hook) that needs separate fix -- lens (d) depends on INDEX being current and captain accepts this preconditional risk.

### Q-6: Pre-existing CONTRACTS entry + entity 036 scope verification

**Domain**: Organizational (cross-entity coordination)

**Why it matters**: A parallel subagent code-explorer sweep of `_index/CONTRACTS.md` and active-state INDEX entries surfaced two cross-entity surfaces not covered by the sibling-entity lens check in the main explore pass:

- `docs/build-pipeline/_index/CONTRACTS.md:181-185` records a **pre-existing in-flight contract** from entity `build-flow-tdd-discipline` on `skills/build-brainstorm/SKILL.md`: "Add given/when/then AC guidance to step 4 for TDD-friendly spec generation". Orthogonal-additive to entity 102's 6 enhancements (AC format rule vs structural pipeline restructure), BUT the two edits both touch Step 4 surface area, so merge ordering is load-bearing -- whichever ships second must rebase on the other.
- `docs/build-pipeline/_index/INDEX.md:41` lists entity `036 pipeline-brainstorm-integration` in `explore` status. Title suggests brainstorm-adjacent scope (integration with profiles + pipeline E2E); body was not inspected during the initial subagent sweep. **(✓ resolved by explore: inline read of `docs/build-pipeline/_archive/pipeline-brainstorm-integration.md:1-15` -- entity 036 is `status: shipped`, completed 2026-04-12, `verdict: PASSED`; scope is INTEGRATION + E2E testing of FO triage / express-standard-full profiles / dashboard collaboration / version history / profile routing -- does NOT modify `skills/build-brainstorm/SKILL.md`; no collision with entity 102. INDEX.md listing 036 in `explore` column is confirmed staleness -- concrete evidence strengthening Q-5.)**

Gate (iii) exclusivity verdict updated: **pass** on the 036 arm (036 is shipped + orthogonal scope); **conditional-pass remains** on the CONTRACTS arm where `build-flow-tdd-discipline` Step 4 coordination is still open.

**Suggested options** (scope reduced to CONTRACTS arm after 036 arm resolved inline):
1. Accept merge-order risk with `build-flow-tdd-discipline` (102 ships either before or after; whichever lands second rebases its Step 4 additions onto the new structure). Captain explicitly chooses ship order.
2. Defer to plan-phase dimension-7 cross-entity coherence check (workflow-index skill). Let plan-checker surface collisions at PLAN time; captain annotates via plan-approval gate.
3. Add `depends-on: [build-flow-tdd-discipline]` or `blocks-on: [build-flow-tdd-discipline]` to force explicit ordering via FO dispatch graph.

## Decomposition Recommendation

Not warranted. Scope flag absent in Captain Context Snapshot; explore mapping touched 7 files across 2 layers (skills/ + docs/build-pipeline/) -- well below the 20-files-across-3-layers threshold. The entity is cohesive: all changes target `skills/build-brainstorm/SKILL.md` plus one or two reference docs, coordinated through a single 女媧 methodology port.

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
- The new `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries` sections will not render with any special treatment in the dashboard's entity detail view until `tools/dashboard/src/body-renderer.ts` is updated (⚠ contradicted: no such file exists -- dashboard body rendering happens client-side in `tools/dashboard/static/detail.js` which only special-cases `## Stage Report:` splits at :64; every other H2 already renders as generic markdown. The future-entity update target is `static/detail.js` (or a new server-side renderer, TBD) -- see Q-2) -- that update is explicitly out of scope for this entity and is logged as a future entity candidate. Sections render as generic markdown H2s in the interim.

## Canonical References

(clarify stage will populate; initial seeds for the methodology source:)

- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/SKILL.md` -- huashu-nuwa skill spec, Phase 0 through Phase 4 methodology
- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md` -- triple-verification gate methodology (Part 一), contradiction preservation (Part 三), information-insufficiency handling (Part 四), quality self-check (Part 六)
- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/skill-template.md` -- persona-skill template structure (referenced for section-ordering inspiration, not directly ported)

## Stage Report: explore

- [x] Files mapped: 7 across skills and docs
  skills/: 2 (build-brainstorm SKILL.md + references/alpha-marker-protocol.md), docs/build-pipeline/: 4 (INDEX.md + 1 sibling entity 072 read in full + 3 siblings confirmed by grep), external /Users/kent/Project/me-company/.agents/skills/huashu-nuwa/: 2 (SKILL.md + references/extraction-framework.md), tools/dashboard/: 1 (static/detail.js inspected for renderer claim)
- [x] Assumptions formed: 4 (Confident: 2, Likely: 2, Unclear: 0)
  A-1 (4-lens floor sufficiency) Likely via APPROACH commitment + Honest Boundary 1 caveat; A-2 (3-7 cardinality port) Likely via inline read of extraction-framework.md:130; A-3 (captain-authored spec) Confident via frontmatter source + rewind commit; A-4 (non-interactive preserved) Confident via SKILL.md:293-294
- [x] Options surfaced: 1
  O-1 tier tag syntax (bracketed recommended over parenthetical/key-value)
- [x] Questions generated: 6
  Q-1 two spec-text corrections (single-paragraph framing + line-ref 233→277); Q-2 dashboard rendering target file (body-renderer.ts does not exist); Q-3 empty-state escape-hatch string consistency (Checked vs None identified); Q-4 primary-tier tie-break mechanism gap; Q-5 lens (d) exclusivity operational mechanism (INDEX staleness); Q-6 pre-existing CONTRACTS entry from build-flow-tdd-discipline (Step 4 overlap) + entity 036 pipeline-brainstorm-integration scope verification (from parallel subagent Lens-d sweep)
- [x] α markers resolved: 0 / 0
  entity body contained no `(needs clarification -- deferred to explore)` markers at explore entry
- [x] Scale assessment: confirmed Medium
  frontmatter declared Medium; mapping found 7 files across 2 layers; well-matched
- [x] Research dispatched: 0 researchers; 3 code-explorer subagents dispatched in parallel
  A-2 verified inline via direct read of extraction-framework.md:130 (3-7 cardinality rule confirmed in source); A-1 is a design-choice assumption not researchable; A-3/A-4 Confident via codebase citations. No external technology claims requiring researcher dispatch. Three `spacedock:code-explorer` agents dispatched in parallel for Lens (c)+(d): (1) build-brainstorm SKILL.md anatomy → confirmed Q-1 line-number corrections (cap at :277, Step 2.5 Goal Check at :78-109); (2) dashboard rendering pipeline → confirmed Q-2 target is `tools/dashboard/static/detail.js:62-84` with no server-side renderer; (3) sibling coherence + CONTRACTS + DECISIONS + INDEX → no-overlap on 072/085/091, conditional-pass exclusivity with Q-6 surfacing pre-existing CONTRACTS contract and entity 036 scope gap.
