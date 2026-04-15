---
id: 102
title: Brainstorm + Explore Nüwa-Alignment -- Multi-Lens Synthesis + Subagent-First + Cross-Stage Gate Unification
status: epic
context_status: ready
source: /build
created: 2026-04-14T14:09:45Z
started:
completed: 2026-04-14T00:00:00Z
verdict: DECOMPOSED
score:
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
profile:
auto_advance:
parent:
children: [brainstorm-nuwa-distillation, explore-nuwa-subagent-first]
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

(2) **Merge gate via triple verification (女媧 Phase 2.1 port)** (✓ confirmed by explore: docs/build-pipeline/_docs/extraction-framework.md:9-30 defines 跨域复现 / 有生成力 / 有排他性 exactly as restated here): Before a claim lands in APPROACH, it must pass 3 independent gates -- (i) **Cross-lens recurrence** -- supported by ≥2 of the 4 lens subsections, (ii) **Generative power** -- predicts what downstream stages (explore/plan) will likely discover rather than merely restating the directive, (iii) **Exclusivity** -- distinguishes this entity from sibling entities with overlapping scope. Claims passing all 3 → land in APPROACH as load-bearing commitments. Claims passing 1-2 → demote to GUARDRAILS (directional rules of lower confidence). Claims passing 0 → discarded silently with a line in the Stage Report. **Cross-entity dedup is absorbed into gate (iii) -- it is no longer a separate mechanism**; overlap with a sibling IS an exclusivity failure, handled identically to any other gate failure.

(3) **Core Tensions preservation (女媧 Phase 2.4 port)** (✓ confirmed by explore: extraction-framework.md:73-97 defines 三种矛盾类型 -- 时间性 / 领域性 / 本质性张力 -- matching the three tension types cited below verbatim): New entity body section `## Core Tensions` captures **essential contradictions within the APPROACH** that must NOT be resolved at brainstorm time -- they surface to build-clarify/build-plan as first-class artifacts rather than being smoothed over into false reconciliation. Three tension types honored (女媧 taxonomy): **time-based** (directive wording evolved in captain's history -- older canonical reference contradicts newer), **domain-based** (codebase precedent differs across subsystems), **essential** (a value-level conflict that IS the design decision -- e.g., "deterministic dedup" vs "LLM-judged divergence"). `## Core Tensions` is never emptied by explore/clarify -- it is annotated with captain decisions or accepted-as-trade-off markers, matching the 女媧 rule "矛盾是人格的核心特徵，不是需要修復的 Bug".

(4) **Honest Boundaries section (女媧 Phase 2.6 port)**: New entity body section `## Honest Boundaries` declares what the proposed APPROACH **fundamentally cannot deliver**. This is distinct from α markers (which signal "I deferred this decision"); boundaries are hard limits the APPROACH itself imposes. Every brainstorm spec must either populate the section OR write the deliberate assessment `None identified -- checked`. Empty-and-unchecked → hard fail at self-test (gate 6 below).

(5) **Source weighting hierarchy (女媧 Phase 1 source table port)**: Every citation in `## Lens Evidence` carries a tier tag -- **primary** (captain directive verbatim + captain's prior `## Canonical References` + design docs captain has explicitly endorsed), **secondary** (codebase `file:line` with ≥2 consistent usages), **tertiary** (speculation, template-derived, "standard practice"). When two lenses contradict on a load-bearing fact, primary wins unless the captain has explicitly documented an override reason in a prior entity's clarify annotations. The blacklist from 女媧 (知乎 / 微信公眾號 / 百度系) has no direct pipeline equivalent, but the spirit transfers: un-cited claims from agent memory cannot anchor a lens finding.

(6) **Quality self-test gate (女媧 Phase 4 port)**: Before returning output, build-brainstorm runs a 5-item self-check -- (i) APPROACH contains 3-7 claims (not 1, not 20 -- 女媧's 心智模型 cardinality rule ported as APPROACH-claim cardinality), (ii) every APPROACH claim is supported by ≥2 lens citations (cross-lens recurrence verified post-hoc), (iii) `## Core Tensions` is populated OR explicitly marked `None identified -- checked`, (iv) `## Honest Boundaries` populated OR explicitly marked `None identified -- checked`, (v) every lens citation carries a `[primary|secondary|tertiary]` tag. Any failure → block return until fixed inline, OR convert to an α marker with specific reason (never a generic "needs clarification"). This is the skill's ship-gate and matches 女媧's "寧可誠實標注局限的 60 分 skill，也不要看起來完美但在編造的 90 分 skill".

---

**Build-explore parallel enhancements (sections 7-11, mirror Nüwa alignment into the explore stage so brainstorm→explore handoff preserves the signal)**:

(7) **Multi-angle parallel explorer fanout (女媧 Phase 1 port into explore)**: Transform `skills/build-explore/SKILL.md` Step 2 from "dispatch 1 code-explorer (Mode A) OR inline read (Mode B)" into "dispatch N=4 parallel code-explorers, each with a fixed angle". Fixed angles: (i) **Prevailing-patterns** -- dominant usage across the codebase; (ii) **Recent-decisions** -- last N commits + ADRs + design docs; (iii) **Sibling-entity** -- `_index/CONTRACTS.md` + `_index/INDEX.md` + active-state entities; (iv) **Negative-space** -- patterns the codebase deliberately avoids (grep for absence: places without try/catch, without sync versions, without locks). Deprecate Mode B as primary path -- reserve it only for emergency fallback when Agent tool is unavailable, with a Stage Report warning. This directly satisfies the captain directive "除 clarify 外都 subagent 跑，包含 explorer".

(8) **Triple-verification as Track-A promotion gate (女媧 Phase 2.1 port into explore)**: Replace `skills/build-explore/SKILL.md` Step 5 Hybrid Classification's soft "2+ usages = Confident, 1 = Likely or Unclear" rule with a hard 3-gate: (i) **Cross-layer recurrence** -- evidence cited across ≥2 distinct layers (domain / contract / router / view / frontend / test / config), not just 2 files in the same layer; (ii) **Predictive power** -- assumption predicts what plan/execute will produce rather than merely describing current state; (iii) **Exclusivity** -- not a generic template match that applies equally to any sibling entity. Three-pass = Confident; 2-pass = Likely; 1-pass = Unclear; 0-pass = demote to Track C Open Question. This addresses the captain-noted "why is everything so low confidence" pattern from today's A-1..A-4 session -- current Confidence assignment is vibes-based; triple-gate makes it signal-based.

(9) **Source weighting tier tags (女媧 Phase 1 source table port into explore)**: Every `Evidence: {file}:{line}` line in `## Assumptions`, `## Option Comparisons`, and `## Open Questions` carries a tier tag `[primary|secondary|tertiary]`, with tier semantics mirroring section (5) for brainstorm: primary = captain directive / Canonical References / ADRs / design docs; secondary = codebase evidence with ≥2 consistent usages; tertiary = single usage / template match / "standard practice". When two Evidence lines on the same assumption conflict, primary wins unless captain clarify override. This closes the pipeline-wide source-hierarchy gap -- without it, brainstorm v2's primary/secondary/tertiary gating degrades at the explore handoff because explore produces un-tiered evidence.

(10) **`## Core Tensions` + `## Honest Boundaries` in explore output (女媧 Phase 2.4 + 2.6 port into explore)**: Explore produces both sections as first-class outputs, mirroring brainstorm v2's sections (3)+(4). Core Tensions in explore = codebase-vs-brainstorm contradictions discovered by Step 3.7 Claim Verification, typed (time-based / domain-based / essential). Honest Boundaries in explore = explicit "this dimension could not be verified" declarations (e.g., "A-5 relies on test evidence but no test file exists for target module"). These surface to clarify and plan as captain-facing artifacts rather than being flattened into Open Questions. The brainstorm→explore handoff becomes symmetrical: both stages preserve tensions, both declare boundaries.

(11) **Self-test gate in explore (女媧 Phase 4 port into explore, OPTIONAL per captain)**: Before Stage Report writes, explore runs a 5-item self-check that blocks return on failure -- (i) every Track A assumption has ≥2 evidence sources across ≥2 layers (enforces Port 8 mechanically); (ii) every Track B option has ≥2 viable alternatives + ≥1 marked `✅ Recommended`; (iii) every Track C question has `Suggested options:` with ≥2 options OR explicit `Open-ended -- captain decides`; (iv) every Evidence line carries a tier tag (enforces Port 9 mechanically); (v) if `## Core Tensions` is populated, every entry is typed. This is optional because it changes explore's ensign routing contract (today's explore is non-blocking by design -- gate failures would need new FO handling). Plan-phase decides whether to include (11) based on complexity budget.

---

**ALTERNATIVE**: Ship the original 2-lens + separate-dedup design (this entity's first brainstorm pass, now rewound) as brainstorm v1.5 incrementally, then open a second entity for 女媧-style v2. -- D-01 rejected because (a) the structural limitations the 女媧 comparison exposed (2 lenses insufficient, no merge gate, no tension/boundary preservation) are **quality-layer defects, not feature-layer gaps** -- shipping the 2-lens version creates compounding downstream cost across every future brainstorm invocation, (b) the captain mid-session redirected to 女媧 methodology after reading the 2-lens explore output, signaling that the 2-lens version would not ship even if prepared for clarify, and (c) splitting into v1.5 + v2 fragments the build-brainstorm contract across two versions, doubling reference-doc and dogfood-entity maintenance cost for negligible time-to-ship savings (rewind is cheap now; SO session is still live).

**GUARDRAILS**:
- **Engine-freeze preserved**: no new frontmatter fields, no new pipeline primitives. New sections (`## Lens Evidence`, `## Core Tensions`, `## Honest Boundaries`) are markdown text-only and render through the existing dashboard's body pipeline.
- **Non-interactive contract preserved** (✓ confirmed by explore: skills/build-brainstorm/SKILL.md:293-294 lists AskUserQuestion as "NOT available"; current contract aligns): build-brainstorm still NEVER calls AskUserQuestion or Teammate. Multi-lens collection, merge-gate verification, tension declaration, and boundary declaration are ALL text-only output. Gate failures become α markers or Core-Tensions entries, never questions.
- **File-read cap revised, not removed**: original cap was `5 files for context enrichment` at `skills/build-brainstorm/SKILL.md:233` (⚠ contradicted: actual cap location is `skills/build-brainstorm/SKILL.md:277` -- "Read at most 5 files for context enrichment"; line 233 is entity-template output text, not the cap rule -- see Q-1). New cap: **9 files** (4 lenses × up to 2 files each, +1 for `_index/INDEX.md` sibling-entity lookup). This is the ONLY pre-existing skill primitive that changes; every other skill behavior stays identical. The cap expansion is justified by the 4-lens requirement and is the single engine-behavior delta this entity commits.
- **Dedup is subsumed, not removed**: no separate `**Dedup flag:**` line in Captain Context Snapshot. Sibling-entity overlap is caught by Lens (d) + Gate (iii) and becomes an Open Question (or, if severe, a Core Tension). Downstream action vocabulary (`merge|link|refine`) preserved in the Q-n framing.
- **Core Tensions and Honest Boundaries are append-only for downstream stages**: build-explore / build-clarify MAY annotate entries (add discovery timestamps, captain resolutions, accepted-as-trade-off markers) but NEVER DELETE entries. Captain is the only entity authorized to delete, via an explicit clarify annotation.
- **Source-weighting primary wins by default**: when lenses contradict, the primary-tier source is authoritative unless the captain's prior clarify annotations override for a specific claim. This matches 女媧's "本人著作 > 二手轉述" rule.
- **Self-test gate is ship-blocking, not advisory**: failure of any of the 5 self-test items blocks return with a specific failure reason logged to Stage Report. No skill output is returned on any gate failure -- the captain or FO must address it before re-invocation.
- **APPROACH claim cardinality is a soft target with inflections**: default range 3-7 claims per A-2 resolution. Trivial-scope directives (e.g., rename-across-codebase, single-line-config-edit) MAY legitimately produce 2 claims; architectural-overhaul directives MAY legitimately produce 8-9. Claims outside 3-7 are **α-marked with scale-justification** (`(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})`), NOT auto-rejected. Self-test item (6)(i) enforces the soft range + requires α-marker presence for inflections; absence of α-marker on out-of-range cardinality is the actual ship-blocker.
- **Multi-lens collection is parallel-subagent-only (captain directive 2026-04-14)**: the 4 lens collections ((a) captain-stated, (b) captain-unstated, (c) codebase-current, (d) sibling-entity) MUST be dispatched as **4 parallel fresh-context subagents** (spacedock:researcher for lenses (a)/(b) driven by intent + journal, spacedock:code-explorer for lenses (c)/(d) driven by codebase + INDEX). Main session receives 4 structured returns and runs the triple-verification merge gate as synthesis -- main session does NOT perform inline file reads for lens collection. This restructures build-brainstorm from a leaf skill into an orchestrator skill (same pattern as build-plan and build-execute). Fresh-context isolation per lens matches huashu-nuwa Phase 1's 6-agent fanout model -- see Honest Boundary 6 for the structural implications, particularly the leaf→orchestrator contract change that plan-phase must sequence before execute-phase touches `skills/build-brainstorm/SKILL.md`.

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
- Given build-explore invokes against any entity in v2 mode, when Step 2 runs, then it dispatches ≥4 parallel code-explorer subagents with fixed angles (prevailing-patterns, recent-decisions, sibling-entity, negative-space) and Mode B inline reading is NOT used as primary path (how to verify: `grep -cE "Mode A|4 parallel|prevailing.patterns|recent.decisions|negative.space" skills/build-explore/SKILL.md` returns positive matches; `grep "Mode B" skills/build-explore/SKILL.md` context shows deprecated-fallback framing only).
- Given any Track A assumption in `## Assumptions`, when explore v2 Stage 5 classification runs, then its Confidence is assigned by the triple-gate rule (cross-layer recurrence + predictive power + exclusivity) -- Confident requires all 3 pass; Likely = 2 pass; Unclear = 1 pass; 0 pass demotes to Track C (how to verify: read the Step 5 spec text; grep for "cross-layer recurrence\|predictive power\|exclusivity" yields ≥3 matches; fixture directive with known-1-layer evidence reliably classified Unclear not Confident).
- Given any Evidence line in explore v2 output, when the line is inspected, then it carries a `[primary|secondary|tertiary]` tier tag (how to verify: `grep -cE '\[primary\]|\[secondary\]|\[tertiary\]' {entity-body-after-explore}` ≥ count of Evidence lines; no un-tiered Evidence line remains).
- Given any entity's explore output, when `## Core Tensions` and `## Honest Boundaries` sections are inspected, then both exist either populated or with escape-hatch `None identified -- checked` (how to verify: same grep pattern as sections (3)/(4) acceptance criteria, applied to entity body after explore not after brainstorm).
- Given the decomposition creates children 102-brainstorm + 102-explore, when both children ship, then `skills/build-brainstorm/SKILL.md` contains sections (1)-(6) and `skills/build-explore/SKILL.md` contains sections (7)-(10) [with (11) optional] (how to verify: post-ship grep both SKILL.md files for the feature names; entity 102 epic's shipped verdict requires both children verdicts PASSED).

## Assumptions

**A-1**: The 4-lens floor (captain-stated / captain-unstated / codebase-current / sibling-entity) is sufficient triangulation for Medium-scale entities; Large or cross-domain entities may need a 5th lens but that is explicitly deferred to Honest Boundary 1.
- **Confidence**: Likely (0.70)
- **Evidence**: APPROACH (1) commits to 4 lenses as "the minimum for useful triangulation in a pipeline stage"; Honest Boundary 1 acknowledges "Large / cross-domain entities may require a 5th lens". Entity 102 itself touched 7 files across 2 layers during its own explore -- well within a 4-lens budget.

**A-2**: 女媧's 「心智模型 3-7个」 cardinality rule ports to build-brainstorm as "APPROACH contains 3-7 claims **default, with documented inflections for edge scales**" (soft target, not hard gate). Trivial-scope directives may legitimately produce 2 claims; architectural-overhaul directives may legitimately produce 8-9. The ship-gate item (6)(i) enforces the soft range and α-marks claims outside it for captain review, not auto-rejection.
- **Confidence**: Confident (0.95)
- **Evidence**: extraction-framework.md:130 verbatim: "模型数量在3-7个之间？（太少=太浅，太多=没提炼）" confirms the baseline. Caveat (originally A-2's Likely 0.75 reason): 女媧's 心智模型 is a worldview lens (high semantic density), build-brainstorm's APPROACH claim is a structural commitment -- not a 1:1 mapping, so the range needs inflection. Resolution: GUARDRAILS updated to make cardinality a soft target with α-marker escape hatch, matching existing build-brainstorm style-rules at SKILL.md:211-222 (Step 6 Self-Review: "fix inline, do not flag to user"). (✓ captain-resolved: see clarify annotation; option 3 selected 2026-04-14.) → Confirmed: captain, 2026-04-14 (option 3 -- upgrade to Confident + add soft-target inflection rule to GUARDRAILS)

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

⚠️ **Warranted** (upgraded from "Not warranted" after scope expansion 2026-04-14 to cover build-explore alongside build-brainstorm per captain directive).

Scope now spans 2 skill files (`skills/build-brainstorm/SKILL.md` + `skills/build-explore/SKILL.md`) + reference docs + likely touches to `skills/build-brainstorm/references/` and `skills/build-explore/references/gray-area-templates.md` + potentially dashboard detail.js (deferred per Honest Boundary 5). Estimated file count ≥15 across ≥3 layers (config + frontend-optional + reference). Scale upgraded frontmatter from Medium to Large. The APPROACH now has 11 numbered changes spanning two stages with distinct skill contracts, distinct invocation paths, and distinct ship windows (brainstorm's leaf→orchestrator contract change is independent of explore's Mode B deprecation).

### Proposed children

Epic `102` decomposes into two children that can plan + execute + ship independently, with child 2 consuming child 1's outputs at runtime (via the brainstorm→explore handoff) but NOT blocking at plan-time:

**Child 1: `102-brainstorm-nuwa` — Brainstorm Nüwa-Style Distillation (v2)**
- **Scope**: APPROACH sections (1)-(6) — multi-lens parallel collection, triple-verification merge gate, Core Tensions, Honest Boundaries, source weighting, quality self-test gate.
- **Files**: `skills/build-brainstorm/SKILL.md` (structural rewrite) + new reference docs under `skills/build-brainstorm/references/` (e.g., `lens-collection-protocol.md`, `merge-gate.md`).
- **Domain**: Runnable/Invokable, Readable/Textual.
- **Contract change**: leaf skill → orchestrator skill (see Honest Boundary 6).
- **Depends-on**: none at plan time. Can ship first.

**Child 2: `102-explore-nuwa` — Explore Nüwa-Alignment + Subagent-First Enforcement**
- **Scope**: APPROACH sections (7)-(10) mandatory + (11) optional — multi-angle parallel explorer fanout, triple-verification Track-A promotion gate, source weighting tier tags, `## Core Tensions` + `## Honest Boundaries` in explore output, optional self-test gate.
- **Files**: `skills/build-explore/SKILL.md` (Step 2 restructure + Step 5 gate + Step 6 output expansion) + `skills/build-explore/references/gray-area-templates.md` (tier-tag updates) + new reference docs (e.g., `parallel-explorer-angles.md`, `triple-verification-gate.md`).
- **Domain**: Runnable/Invokable, Readable/Textual, Organizational.
- **Contract change**: Mode B inline reading deprecated as primary; Mode A parallel-fanout becomes default.
- **Depends-on**: consumes child 1's brainstorm output format at runtime (tier tags, lens citations flow from brainstorm to explore), but plan/execute of child 2 can proceed in parallel with child 1. Plan-time cross-entity coordination: ensure both children agree on tier-tag syntax (settles O-1 for both).

### Shared captain decisions (settle at epic clarify, propagate to both children)

These Q-n items in the epic body apply to BOTH children and should be resolved once at epic clarify, then inherited:
- **Q-1 spec-text corrections**: applies to brainstorm only
- **Q-2 dashboard renderer target**: applies to both (both introduce new `##` sections)
- **Q-3 escape-hatch string consistency**: applies to both (both introduce `## Core Tensions` + `## Honest Boundaries`)
- **Q-4 primary-tier tie-break**: applies to both (merge-gate / promotion-gate both use tier logic)
- **Q-5 INDEX.md staleness mitigation**: applies to explore's sibling-entity lens (child 2) but brainstorm's sibling-entity lens (child 1) inherits same decision
- **Q-6 CONTRACTS coordination**: applies to brainstorm only (`build-flow-tdd-discipline` Step 4 overlap)
- **O-1 tier tag syntax (bracketed recommended)**: applies to both (must share syntax)
- **Core Tensions (3 seeds)**: essential tension applies to both; budget tension applies to brainstorm (captain decides via child 1 plan); v1/v2 schema tension applies to both

### Shared artifacts at epic level

- Decomposed canonical references propagate to both children
- Both children's acceptance criteria reference back to epic's AC line 88-89 (file-count audit: child 1 ≤9 files per brainstorm invocation; child 2 ≥4 parallel explorers per explore invocation)

## Core Tensions

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seed from the methodology port itself:)

- **essential**: **deterministic merge gate vs LLM-judged lens-recurrence** -- Gate (i) "cross-lens recurrence" is LLM-judged (a claim is "supported by" a lens based on semantic match), while the GUARDRAILS promise "determinism" inherited from the rewound v1. These are fundamentally in tension; true determinism requires textual exact-match support, which discards the flexibility 女媧's triple-verification exploits. Captain decision needed: lean deterministic (risk under-recalling valid claims) or lean LLM-judged (risk non-reproducibility between invocations).
- **domain-based**: **file-read budget (9 files) vs "at most 5" historical cap** -- skill currently promises ≤5 reads; 4 lenses need 8-9. The cap is a precedent across the pipeline's non-interactive skills; raising it for one skill creates an asymmetry explore-skill readers will notice. Trade-off is real and unavoidable.
- **time-based**: **brainstorm-v1 shipping pattern (shipped entities 036 etc.) vs brainstorm-v2 body schema** -- 36+ shipped entities have v1-shape bodies (no `## Lens Evidence`, no `## Core Tensions`). The dashboard's frontmatter-io parser must accept both schemas; the upgrade is forward-only (v2 entities do not backfill into v1 storage). Captain confirmation needed during clarify.
- **essential (explore-scope, 2026-04-14 expansion)**: **Track-A Confidence signal strength vs clarify throughput** -- Port 8 (triple-gate promotion) makes Track A assignment harder, producing more Track C Open Questions on average. This is epistemically correct (Confidence becomes meaningful) but raises clarify's captain-interaction cost per entity. Trade-off is load-bearing: do we want N entities/session at sharp Confidence, or 2N entities/session at fuzzy Confidence? Captain decision required at epic clarify, propagates to both children.
- **domain-based (explore-scope)**: **Mode A enforcement vs FO dispatch graph reality** -- Port 7 mandates parallel-explorer subagents, but some existing explore invocation paths (ensign-wrapped) cannot dispatch Agent tool per `subagent-cannot-nest-agent-dispatch.md`. Either we elevate explore out of those paths (breaking FO dispatch graph in N places) OR keep Mode B as emergency fallback with warning markers (partial directive compliance). Both paths are real -- neither is wrong. Captain decision at epic clarify: strict enforcement (break dispatch graph, audit + fix) or pragmatic fallback (Mode B remains but deprecated-labeled).
- **time-based (cross-child)**: **Child 1 (brainstorm v2) ship-window vs child 2 (explore v2) ship-window** -- if child 1 ships first without child 2, brainstorm emits tier-tagged lens citations that explore v1 doesn't consume (tier tags ignored, contradictions silently flattened into Open Questions). If child 2 ships first without child 1, explore emits tier-tagged evidence that brainstorm v1 can't produce inputs for (explore's Source-Weighting Port 9 partially degrades). Neither ordering is catastrophic -- pipeline still works at reduced quality during the gap. But cross-child coordination at plan-phase must settle the order explicitly, and interim-period quality degradation is an acceptable trade-off only if the gap is short. Captain decision at epic clarify: prefer ordering (brainstorm-first vs explore-first) or accept parallel-ship with both-half-degraded period.

## Honest Boundaries

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seed from the methodology port itself:)

- This APPROACH cannot guarantee that 4 lenses are always sufficient for directives that span >2 domains -- 女媧 uses 6 agents for human-persona distillation; a 4-lens pipeline floor is the minimum, not the universal-correct count. Large / cross-domain entities may require a 5th lens (e.g., user-facing-visual lens for UI entities) that this enhancement does not enumerate.
- This APPROACH cannot replicate 女媧's "triple verification across 2+ domains" literally -- 女媧's domains are human life-domains (finance, philosophy, product); build-brainstorm's "domains" are codebase layers (domain / contract / router / view). The port is metaphorical, not mechanical, and the cross-layer recurrence test may be noisier than 女媧's cross-life-domain test.
- This APPROACH does not port 女媧's Phase 1.5 and Phase 2.5 human-checkpoints -- build-brainstorm is non-interactive by contract. The equivalent review happens at the brainstorm→explore handoff (FO or SO inspects output) rather than mid-skill. This is a structural limitation, not an oversight.
- This APPROACH does not include 女媧's Phase 4 quality-self-check script (`quality_check.py`) -- porting a Python quality-gate script is out of scope for a SKILL.md enhancement and would violate the "engine-freeze" GUARDRAIL. The 5-item self-test is LLM-run inside the skill, not script-verified.
- The new `## Lens Evidence` / `## Core Tensions` / `## Honest Boundaries` sections will not render with any special treatment in the dashboard's entity detail view until `tools/dashboard/src/body-renderer.ts` is updated (⚠ contradicted: no such file exists -- dashboard body rendering happens client-side in `tools/dashboard/static/detail.js` which only special-cases `## Stage Report:` splits at :64; every other H2 already renders as generic markdown. The future-entity update target is `static/detail.js` (or a new server-side renderer, TBD) -- see Q-2) -- that update is explicitly out of scope for this entity and is logged as a future entity candidate. Sections render as generic markdown H2s in the interim.
- **Boundary 6 (2026-04-14 captain directive addition)**: The parallel-subagent dispatch requirement (see GUARDRAILS) converts build-brainstorm from a **leaf skill** (current SKILL.md:230 "NEVER invoke other skills") into an **orchestrator skill** (dispatches 4 subagents per run). This is a load-bearing contract change that this entity's plan-phase MUST sequence: (a) relax the leaf constraint in SKILL.md Rules, (b) add a Tools Available entry for Agent dispatch, (c) rewrite Step 1 (Context Enrichment) around the 4-lens fanout, (d) update the non-interactive contract wording (the main session remains non-interactive to captain, but lens subagents run in their own contexts). Dogfood risk: the current `/build` invocation path spawns build-brainstorm from inside an Agent dispatch already (FO → ensign → build-brainstorm), meaning v2's subagent dispatches become nested Agent calls, which MEMORY.md `subagent-cannot-nest-agent-dispatch.md` documents as BROKEN for general-purpose subagents. v2's brainstorm invocation therefore MUST originate from either (i) SO-direct mode (main session has Agent), (ii) FO main session (not ensign-wrapped), or (iii) a captain-facing `/build` that runs in main session. The plan-phase must enumerate which invocation paths remain valid post-v2 and which are deprecated.
- **Boundary 7 (explore scope expansion 2026-04-14)**: Build-explore's v2 enhancement sections (7)-(10) port 女媧 elements but cannot replicate 女媧 Phase 1.5 / 2.5 mid-flow human checkpoints -- build-explore is non-interactive by contract, same structural limitation as Boundary 3. Captain interaction happens at clarify stage (next skill), not inside explore. This means the explore self-test gate (Port 11) can block Stage Report emission but cannot surface captain-facing decisions mid-flow; it only produces stable pre-clarify artifacts.
- **Boundary 8 (Track-A promotion gate trade-off)**: The triple-gate for Track A (Port 8, cross-layer + predictive + exclusivity) will demote some assumptions that today classify as "Likely" or "Confident" to "Unclear" or Track C. This is intentional -- current Confidence is vibes-based -- but the transition period generates a wave of "previously Likely, now Unclear" entities arriving at clarify with more Open Questions. Clarify throughput may drop 20-40% for the first N entities post-ship. This is a ship-cost, not a forever-cost -- brainstorm v2's tighter APPROACH reduces Open Question seeds upstream, offsetting explore's tightened Track A gate downstream.
- **Boundary 9 (Mode B deprecation risk)**: Deprecating Mode B as primary path (Port 7) means explore invocations where Agent tool is unavailable (ensign subagent contexts with the `subagent-cannot-nest-agent-dispatch` limitation) can no longer run properly. Plan-phase must audit every explore invocation path in the existing FO dispatch graph and confirm each has Agent access. If any path cannot, either (a) elevate that path to main session / SO-direct mode, OR (b) keep Mode B as fallback with a Stage Report warning marker. This is NOT a blocker but is a non-trivial audit scope the plan-phase must budget.
- **Boundary 10 (parallel explorer divergence)**: Dispatching 4 parallel code-explorers (Port 7) with different angles will occasionally produce contradictory findings for the same `file:line` citation (e.g., "prevailing-patterns" explorer says this is the canonical pattern; "recent-decisions" explorer finds an ADR deprecating it). Explore v2 handles this by emitting Core Tensions entries for inter-explorer contradictions (Port 10 output path), but the merge logic between explorer returns is LLM-judged synthesis, not deterministic merge. Same tension as brainstorm's "deterministic merge gate vs LLM-judged lens-recurrence" (Core Tension #1) but at a second nesting level. Captain may encounter occasional "explorer A says X, explorer B says Y" Core Tension entries that require clarify resolution.

## Canonical References

(clarify stage will populate; initial seeds for the methodology source:)

- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/SKILL.md` -- huashu-nuwa skill spec, Phase 0 through Phase 4 methodology
- `docs/build-pipeline/_docs/extraction-framework.md` -- triple-verification gate methodology (Part 一), contradiction preservation (Part 三), information-insufficiency handling (Part 四), quality self-check (Part 六)
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
