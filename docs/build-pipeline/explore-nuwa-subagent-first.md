---
id: 105
title: Explore Nüwa-Alignment + Subagent-First Enforcement (v2) -- Multi-Angle Parallel Explorer + Track-A Triple-Gate + Tension Output
status: execute
context_status: ready
source: /build (decomposed from epic 102)
created: 2026-04-14T00:00:00Z
started: 2026-04-14T23:11:25Z
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-explore-nuwa-subagent-first
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
- **Scope flag**: ⚠️ likely-decomposable-already (child of epic 102; further sub-decomposition optional at explore only if 4-angle-fanout is cleanly separable from triple-gate classification -- default is to keep unified)
- **Created**: 2026-04-14 (decomposition from epic 102)
- **Sibling 104 clarify decisions inherited** (2026-04-15, from `clarify(104)` session at commit 8ee0337):
  - O-1 Mode A/B split adopted as canonical pipeline shape (3-skill precedent) -- 105 MUST use same dual-mode pattern, NOT total conversion
  - O-2 escape-hatch string = `Checked -- no notable constraints identified.` (matches GUARDRAILS precedent at skills/build-brainstorm/SKILL.md:139)
  - O-3 path-aware gate semantics (Mode A blocks, Mode B advises) -- applies to OPTIONAL Port 11 if included
  - Q-5 ship-order: 104 ships first, 105 consumes 104's tier-tag format at runtime but plan-time is parallel-viable
  - A-7 methodology vendoring: `extraction-framework.md` will be vendored to `docs/build-pipeline/_docs/` (or skill-scoped path) with functional naming -- 105's Canonical References must be updated post-plan to the local path

## Goal Check

You are asking for a restructure of build-explore so every mapping pass dispatches 4 parallel explorers with fixed angles, Track-A Confidence is assigned by a 3-pass verification gate, every evidence citation carries a source-weight tier tag, and Core Tensions + Honest Boundaries are emitted as first-class output -- mirroring the huashu-nuwa methodology port sibling 104 applies to brainstorm.

- **Problem being solved**: Current build-explore Step 2 is single-explorer or inline; Step 5 classification is vibes-based ("2+ usages = Confident" heuristic); no cross-stage tier-tag signal; tensions/boundaries get flattened into Open Questions. Sibling 104 emits tier-tagged lens citations that explore v1 would silently drop.
- **Expected outcome**: build-explore becomes a multi-angle orchestrator (prevailing-patterns / recent-decisions / sibling-entity / negative-space), Track-A promotion requires cross-layer recurrence + predictive power + exclusivity, every Evidence line tiered with bracketed `[primary|secondary|tertiary]` tags, Core Tensions + Honest Boundaries first-class sections with escape-hatch precedent.
- **Explicit non-goals**: Does NOT touch build-brainstorm (sibling 104's scope). Does NOT modify build-clarify's interactive contract. Does NOT port huashu-nuwa's Python `quality_check.py` (engine-freeze). Does NOT change FO dispatch graph -- Mode B fallback preserves existing ensign-wrapped invocation paths.

## Brainstorming Spec

**APPROACH**: Rewrite `skills/build-explore/SKILL.md` across five coordinated ports from sibling child 104's huashu-nuwa methodology (all five have matching AC verification in this entity): (7) convert Step 2 from "1 code-explorer Mode A OR inline Mode B" into "4 parallel `spacedock:code-explorer` agents with fixed angles" -- (i) prevailing-patterns, (ii) recent-decisions (commits + ADRs + design docs), (iii) sibling-entity (CONTRACTS + INDEX + active-state entities), (iv) negative-space (patterns the codebase deliberately avoids). Mode B remains as explicit emergency fallback under sibling 104 O-1 precedent -- NOT deprecated. (8) replace Step 5 Hybrid Classification's soft "2+ usages = Confident" rule with a hard 3-gate: (i) cross-layer recurrence (evidence across ≥2 distinct layers, not 2 files in same layer), (ii) predictive power (assumption predicts plan/execute outputs rather than describing current state -- operational definition borrowed from sibling 104 Q-3: claim contains concrete action verb + file/layer name NOT mentioned in directive), (iii) exclusivity (not a generic template match applying equally to any sibling). 3-pass = Confident; 2-pass = Likely; 1-pass = Unclear; 0-pass = demote to Track C Open Question. (9) tag every `Evidence:` line in Assumptions / Option Comparisons / Open Questions with bracketed `[primary|secondary|tertiary]` per epic 102 O-1 and sibling 104 Q-4 -- primary = captain directive / Canonical References / ADRs / design docs; secondary = codebase evidence with ≥2 consistent usages; tertiary = single usage / template match / "standard practice". Primary wins on conflict unless captain clarify override. (10) emit `## Core Tensions` (typed: time-based / domain-based / essential) + `## Honest Boundaries` as first-class explore output sections using the escape-hatch string `Checked -- no notable constraints identified.` per sibling 104 O-2. Downstream stages annotate but never delete. (11) OPTIONAL: add 5-item self-test gate pre-Stage-Report that blocks return on failure under path-aware semantics per sibling 104 O-3 (Mode A blocks with structured blocker payload matching sibling 104 Q-1 hard-fail pattern; Mode B emits alpha markers inline + Stage Report warning). `(needs clarification -- deferred to explore: Port 11 ship-blocking precedence when explore's current FO ensign routing contract assumes explore always returns output; path-aware semantics partially resolves this but plan-phase must audit whether Mode B's warning-path is sufficient OR whether Port 11 is deferred entirely to a Phase-E+1 iteration.)`

**ALTERNATIVE**: Deprecate Mode B as primary path entirely (parent 102's original section 7 framing) -- make Mode A the only valid path, audit every FO invocation path and elevate any ensign-wrapped explore to SO-direct or main session. -- D-01 rejected because sibling 104 O-1 already settled the canonical pipeline shape as Mode A/B dual-mode (three-way precedent: build-explore:20 + build-review:28 + build-plan:28). Making explore a total-conversion orchestrator diverges from sibling 104's semantics on an identical structural problem, creating cross-child asymmetry on a single epic (102). Also breaks the FO dispatch graph at multiple audit points Honest Boundary 9 already flags as non-trivial -- cost exceeds benefit when Mode B already carries explicit warning signaling that solves the quality-degradation concern.

**GUARDRAILS**:
- **Tier-tag syntax MUST match sibling 104** (epic 102 O-1 + sibling 104 Q-4 propagated): bracketed `[primary|secondary|tertiary]`. Cross-stage grep parity broken without this.
- **Mode A/B dual-mode mandatory** (sibling 104 O-1 propagated): Mode A dispatches 4 parallel explorers when Agent available (SO-direct, main session); Mode B single-pass inline fallback when nested in ensign. Mode B emits Stage Report warning `ensign-mode inline fallback -- 4-angle quality not achieved this invocation` and skips cross-layer recurrence check in Track-A promotion gate (other two gates -- predictive power + exclusivity -- still run inline since they do not require 4-way evidence).
- **Path-aware self-test semantics** (sibling 104 O-3 propagated, applies to OPTIONAL Port 11): Mode A blocks on gate failure with structured blocker payload matching sibling 104 Q-1; Mode B advisory with alpha markers + warning. If Port 11 is excluded for complexity budget, both modes emit no gate (current Stage Report behavior preserved).
- **Escape-hatch string** (sibling 104 O-2 propagated): exactly `Checked -- no notable constraints identified.` for empty `## Core Tensions` and `## Honest Boundaries`. Acceptance criteria grep tests this literal string -- no other form permitted.
- **Cardinality discipline on Core Tensions / Honest Boundaries output** (sibling 104 Q-4 format propagated to explore surface where cardinality applies): populated sections need 1-5 typed entries; over-abundance triggers alpha marker `(α: tension/boundary count {n} outside default 1-5; scale-justified by {directive-signal})` matching sibling 104 canonical form.
- **Engine-freeze preserved**: no new frontmatter fields. New body sections render through existing dashboard markdown path at `tools/dashboard/static/detail.js:62-84`. Evidence tagging is text-only on existing Evidence line convention.
- **Leaf→orchestrator contract change NOT needed** (differs from sibling 104): `skills/build-explore/SKILL.md:20` already permits Agent in SO-direct mode + documents Mode A/B dispatch infrastructure. Port 7 formalizes 4-parallel-angles as default within the existing contract; this is an elaboration of an existing capability, NOT a new primitive.
- **Depends-on sibling 104 at runtime, not at plan-time** (sibling 104 Q-5 propagated): 105 consumes 104's bracketed tier-tag format but does not block on 104's plan or execute. Parallel plan viable; ship-order is 104-first for cross-child format guarantee.
- **CONTRACTS append mandatory at plan approval**: 105 must append entries to `docs/build-pipeline/_index/CONTRACTS.md` declaring Step 2 + Step 5 + Step 6 surface claims on `skills/build-explore/SKILL.md` + references/gray-area-templates.md + references/hybrid-classification-heuristic.md. Prevents drift-at-merge with any future in-flight entity on the same surface.
- **Canonical References vendoring** (sibling 104 A-7 propagated): once plan-phase vendors `extraction-framework.md` to `docs/build-pipeline/_docs/` (or skill-scoped path) with functional naming, 105's Canonical References section updates to the local path. Cross-entity coordination with sibling 104's plan-phase.

**RATIONALE**: 4-angle parallel fanout + Track-A triple-gate + bracketed tier tags form a coherent trio -- angle diversity gives cross-layer recurrence real teeth (Step 2 feeds Step 5 with genuinely orthogonal evidence rather than same-layer repetition), tier tags let the promotion gate reason about source weight at classification time, and Core Tensions + Honest Boundaries preserve the signal captain would otherwise have to re-derive at clarify. Sibling 104 rides the same reasoning on the brainstorm stage; the explicit goal is brainstorm→explore handoff symmetry so tier tags and tensions flow unchanged between stages. The decisive evidence against ALTERNATIVE is the Mode A/B three-skill precedent -- build-explore (line 20), build-review (line 28), build-plan (line 28) all document the identical dual-mode pattern for the identical constraint (skill wants to dispatch but may be nested). Diverging from this settled pattern for 105 alone, while sibling 104 adopts it, would create an inconsistency that is hard to justify when the costs (FO dispatch graph refactor, invocation-path audit scope) exceed the benefits (marginally purer methodology port). Port 11 is kept OPTIONAL because it is orthogonal to the core value proposition: Ports 7-10 deliver the load-bearing signal, Port 11 is belt-and-suspenders for Mode A paths where captain can recover from gate failures.

## Acceptance Criteria

- Given a directive invoking build-explore v2 in Mode A, when Step 2 runs, then 4 parallel `spacedock:code-explorer` agents are dispatched with fixed angles (prevailing-patterns, recent-decisions, sibling-entity, negative-space) (how to verify: `grep -cE "prevailing.patterns|recent.decisions|sibling.entity|negative.space" skills/build-explore/SKILL.md` returns ≥4 matches; Stage Report field "Angles dispatched" = 4 per Mode A invocation).
- Given Mode B fallback is triggered (ensign context, no Agent), when build-explore v2 runs, then the Stage Report contains the literal warning string `ensign-mode inline fallback -- 4-angle quality not achieved this invocation` (how to verify: `grep "ensign-mode inline fallback" {entity-body}` yields match; no silent degradation permitted).
- Given any Track A assumption in v2 output, when Step 5 classification runs, then Confidence is assigned by the 3-gate rule -- 3-pass = Confident, 2-pass = Likely, 1-pass = Unclear, 0-pass = demote to Track C Open Question (how to verify: `grep -cE "cross-layer recurrence|predictive power|exclusivity" skills/build-explore/SKILL.md` ≥3; fixture directive with known-single-layer evidence reliably classified Unclear not Confident).
- Given any Evidence line in v2 explore output, when inspected, then it carries a bracketed `[primary|secondary|tertiary]` tier tag matching sibling 104's syntax (how to verify: `grep -cE '\[primary\]|\[secondary\]|\[tertiary\]' {entity-body-after-explore}` ≥ count of `Evidence:` lines; 0 un-tiered Evidence lines permitted).
- Given any explore v2 output, when `## Core Tensions` is inspected, then it is either populated with ≥1 typed tension entry (time-based / domain-based / essential) OR contains the exact escape-hatch string `Checked -- no notable constraints identified.` (how to verify: `grep -A 20 "^## Core Tensions$" {entity-body}` matches populated-with-type regex `\*\*(time-based|domain-based|essential)\*\*:` OR exact escape-hatch string; no other form).
- Given any explore v2 output, when `## Honest Boundaries` is inspected, then it is either populated with ≥1 declared limit OR contains the exact escape-hatch string `Checked -- no notable constraints identified.` (how to verify: same grep pattern against `## Honest Boundaries` header).
- Given Port 11 self-test gate is included in v2, when a gate check fails in Mode A, then the skill blocks Stage Report emission and returns a structured blocker payload including failure reason + gate id + offending Evidence line (how to verify: fixture directive constructed to fail gate (ii) predictive-power -- claim is pure directive-restatement; assert Mode A returns blocker with fields {failure_reason, gate_id: "ii", offending_claim}; Mode B returns spec with inline alpha markers + Stage Report warning `gate-ii advisory-only in Mode B`).
- Given 4 parallel explorers may produce contradictory findings for the same `file:line` citation, when explore v2 synthesizes returns, then inter-explorer contradictions land in `## Core Tensions` typed as `essential` or `domain-based` rather than being flattened into a single chosen finding (how to verify: fixture directive targeting a file with known competing patterns from different layers; assert ≥1 `## Core Tensions` entry of type `essential` or `domain-based` citing explorer-A vs explorer-B).
- Given sibling entity 104 has shipped with bracketed tier tags in brainstorm output, when explore v2 reads a post-104 brainstorm spec, then tier tags flow through unchanged into explore's Evidence lines (no re-tagging, no syntax conversion) (how to verify: fixture entity with brainstorm output containing bracketed tags; run explore v2; assert tags on Evidence lines traceable to brainstorm lens citations match the originating tier).

## Core Tensions

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seeds propagated from epic 102 + sibling 104 learnings:)

- **essential (propagated from epic 102)**: **Track-A Confidence signal strength vs clarify throughput** -- Port 8 (triple-gate promotion) makes Track A assignment harder, producing more Track C Open Questions on average. Epistemically correct (Confidence becomes meaningful) but raises clarify's captain-interaction cost per entity. Trade-off is load-bearing: N entities/session at sharp Confidence, or 2N entities/session at fuzzy Confidence?
- **domain-based (propagated from epic 102)**: **Mode A enforcement vs FO dispatch graph reality** -- Port 7 prescribes parallel-explorer subagents as default, but sibling 104 O-1 captain decision settled Mode A/B split rather than Mode A enforcement. Tension largely resolved by adopting dual-mode pattern, but residual cost remains: Mode B invocations get degraded quality signal that is captain-observable only via Stage Report warning strings (not runtime failure).
- **time-based (cross-child, propagated from epic 102)**: **104 ship-window vs 105 ship-window** -- sibling 104 Q-5 captain decision was "ship 104 first", which means 105 consumes 104's tier-tag format at runtime. If 105 plans/ships before 104 reaches shipped, 105's Evidence-tagging is tagged text that no upstream brainstorm produces. Plan-phase must either accept interim period where 105 ships to dogfood without upstream-tagged brainstorm evidence OR delay 105 execute until 104 reaches pr-draft.
- **essential (child-specific)**: **Port 11 self-test ship-blocking vs explore's historically non-blocking contract** -- current explore skill always returns output (build-explore/SKILL.md:232 "Seven metrics, always in this order" presumes Stage Report always emits). Port 11 under Mode A semantics blocks emission on gate failure, which breaks downstream FO logic that awaits explore output. Captain decision: (a) make Port 11 optional per explore invocation, skippable at plan-phase budget discretion, (b) mandate Port 11 under Mode A only with path-aware failure routing, or (c) defer Port 11 entirely to a Phase-E+1 iteration.
- **domain-based (child-specific)**: **4-angle parallel cost vs explore frequency** -- explore runs on every `/build` non-trivial entity; 4 parallel `spacedock:code-explorer` dispatches multiplies explore cost by ~4× (tokens, wall-clock, dispatch overhead). Sibling 104 has the same tension at brainstorm level, but explore is invoked more often than brainstorm (resume cases, re-explore after captain rewind). Either explore becomes a higher-intent gate (captain pays attention before invoking) OR Mode B becomes the default for Small-scale entities with Mode A reserved for Medium+.
- **essential (child-specific)**: **Angle-diversity correctness vs angle-definition staleness** -- the 4 fixed angles (prevailing-patterns, recent-decisions, sibling-entity, negative-space) are captured as of 2026-04-15; as the codebase evolves, angle definitions may drift (e.g., "negative-space" presumes a mature codebase with visible absences; greenfield projects have no meaningful negative-space). The angles are hardcoded in SKILL.md text -- no versioning mechanism. Plan-phase must decide: static angle list, angle-list-as-reference-doc (editable without SKILL.md rewrite), or angle-discovery-per-invocation (meta-step before dispatch).

## Honest Boundaries

(brainstorm seeds these; explore/clarify annotate but do not delete. Initial seeds propagated from epic 102 + sibling 104 learnings:)

- This APPROACH does not replicate huashu-nuwa's Phase 1.5 / 2.5 human checkpoints (propagated from epic 102) -- build-explore is non-interactive by contract, same structural limitation as sibling 104 Honest Boundary 3. Captain interaction happens at clarify stage (next skill), not inside explore.
- Port 11 self-test gate (propagated from epic 102) cannot surface captain-facing decisions mid-flow; it only produces stable pre-clarify artifacts or (in Mode A) blocks emission. Captain sees the result only after explore returns.
- Port 8 (Track-A triple-gate, propagated from epic 102) will demote some assumptions that today classify as "Likely" or "Confident" to "Unclear" or Track C. Transition period generates a wave of "previously Likely, now Unclear" entities arriving at clarify with more Open Questions. Clarify throughput may drop 20-40% for first N entities post-ship; ship-cost, not forever-cost.
- Port 7 (Mode B deprecation risk, mitigated by sibling 104 O-1) -- Mode B is preserved as fallback per captain decision; this Honest Boundary is mitigated but not eliminated. Mode B invocations still produce single-pass output with explicit warning; quality-sensitive work must occur in Mode A contexts.
- Dispatching 4 parallel explorers (Port 7, propagated from epic 102 Honest Boundary 10) will occasionally produce contradictory findings for the same `file:line` citation. Explore v2 handles this via Core Tensions typing (Port 10), but inter-explorer merge is LLM-judged synthesis, not deterministic. Captain may encounter occasional "explorer A says X, explorer B says Y" Core Tension entries that require clarify resolution.
- **Boundary 6 (child-specific)**: The self-test gate (Port 11) cannot verify "predictive power" (gate ii) against ground truth -- Port ii's operational definition (claim contains action verb + novel file/layer name) is a structural proxy, not a semantic check. A claim can satisfy the structural test while still being vacuous; the gate catches only the most obvious vibes-based failures.
- **Boundary 7 (child-specific)**: The 4 fixed angles are pragmatic defaults, not proven-optimal choices -- greenfield projects may have no meaningful "negative-space" (angle iv); heavily-historical projects may have "recent-decisions" (angle ii) that are themselves contradictory across a migration window. Angle definitions assume a mature mid-life codebase; edge cases produce degraded coverage.
- **Boundary 8 (child-specific)**: Cross-child tier-tag coordination with sibling 104 creates a plan-time sequencing requirement. If 105 plan lands before 104 plan, either (a) 105 plan commits to a tier-tag format 104 has not yet approved, or (b) 105 plan defers tier-tag commitment until 104 plan lands (creating plan-time coupling that Q-5 captain decision tried to avoid). Resolution: inherit 104 clarify decision O-1 bracketed syntax as non-negotiable input; no re-opening at 105 plan.

## Canonical References

(parent 102 + sibling 104 seeds propagated; 105 clarify stage will populate further:)

- `docs/build-pipeline/brainstorm-dual-lens-cross-entity-dedup.md` -- parent epic 102 with full APPROACH sections (7)-(11), decisions, and cross-child coordination
- `docs/build-pipeline/brainstorm-nuwa-distillation.md` -- sibling child 104 with clarify decisions propagated into 105's GUARDRAILS (O-1, O-2, O-3, Q-5, A-7)
- `skills/build-explore/SKILL.md` -- target skill file (modification target; current contents at commit 8ee0337 are the pre-v2 baseline)
- `skills/build-explore/references/gray-area-templates.md` -- domain template surface for Port 9 tier-tagging
- `skills/build-explore/references/hybrid-classification-heuristic.md` -- Step 5 classification target for Port 8 triple-gate replacement
- `skills/build-brainstorm/SKILL.md:275` -- sibling 104's leaf-constraint point of comparison (build-explore is NOT a leaf today; line 20 documents Mode A/B infrastructure)
- `skills/build-review/SKILL.md:27-29` + `skills/build-plan/SKILL.md:27-29` -- three-way precedent uniformity for Mode A/B pattern (sibling 104 A-4 evidence)
- `/Users/kent/Project/me-company/.agents/skills/huashu-nuwa/references/extraction-framework.md` -- **to be vendored locally per sibling 104 A-7 captain decision**; plan-phase will update this citation to local path after 104 execute lands

## Stage Report: brainstorm

- [x] Goal Check: emitted (<=150 words, plain-language restatement, 3 bullets)
- [x] Sections emitted: APPROACH + ALTERNATIVE + GUARDRAILS + RATIONALE + Acceptance Criteria (9) + Core Tensions (6 seeds) + Honest Boundaries (8 seeds) + Canonical References (8 seeds)
- [x] α markers: 1 (APPROACH Port 11 ship-blocking vs non-blocking routing) -- expected resolution at clarify
- [x] Sibling 104 decisions inherited: O-1, O-2, O-3, Q-4 (format), Q-5, A-7 -- 6 inherited decisions reduce clarify question surface
- [x] Scope flag: likely-decomposable-already -- NOT acted on (sub-scopes sequential; ports 7/8/9/10 share tier-tag + Mode A/B infrastructure)
- [x] Self-review: APPROACH vs ALTERNATIVE genuinely different (dual-mode vs total-conversion); AC testable; GUARDRAILS consistent with APPROACH; Goal Check serves APPROACH expected outcome

## Assumptions

**A-1**: The current Step 5 Hybrid Classification soft rule ("2+ consistent usages = Confident; 1 usage clear-fit = Likely; 1 usage unclear = Unclear") is exactly the heuristic Port 8 replaces with the triple-gate. No hidden precedent exists that Port 8 would conflict with.
- **Confidence**: Confident (0.95) `[primary]`
- **Evidence**: `skills/build-explore/references/hybrid-classification-heuristic.md:19-21` verbatim matches the quoted soft rule; `:157-158` restates it operationally ("Found 2+ consistent usages? --> Track A (Confident); Found 1 usage? --> Track A (Likely or Unclear depending on fit)"). Port 8's triple-gate replaces these lines directly.
- → Confirmed: captain, 2026-04-15 (batch -- auto-advance, confidence 95%)

**A-2**: No in-flight CONTRACTS collision exists on `skills/build-explore/SKILL.md`. 105 has no ship-order coordination cost (contrast with sibling 104 which has `build-flow-tdd-discipline` in-flight collision).
- **Confidence**: Confident (0.95) `[primary]`
- **Evidence**: `docs/build-pipeline/_index/CONTRACTS.md:207-211` lists only one entity on build-explore/SKILL.md -- `phase-e-plan-4-dogfood-trailofbits-integration` with status `✅ final` (already shipped 2026-04-12). No `in-flight` or `planned` entries on Step 2 / Step 5 / Step 6 surface. 105 can plan + execute + ship without rebase concerns on this file.
- → Confirmed: captain, 2026-04-15 (batch -- auto-advance, confidence 95%)

**A-3**: The 4-parallel `spacedock:code-explorer` dispatch pattern is already proven in production -- parent epic 102 successfully used this exact pattern (3 concurrent explorers) during its explore stage. Port 7's 4-angle fanout is an elaboration of validated infrastructure, not novel.
- **Confidence**: Confident (0.95) `[primary]`
- **Evidence**: Parent entity 102 `## Stage Report: explore` line 304 records "Three `spacedock:code-explorer` agents dispatched in parallel for Lens (c)+(d)". Dispatch mechanism (`Agent(subagent_type="spacedock:code-explorer", ...)`) + parallel-return synthesis already works in SO-direct mode. Port 7 adds angle specialization to the prompt, not a new dispatch primitive.
- → Confirmed: captain, 2026-04-15 (batch -- auto-advance, confidence 95%)

**A-4**: The Track-B "Recommendation Validation" logic in `hybrid-classification-heuristic.md` (return-value-trace + design-doc-invariant cross-reference) is orthogonal to Port 8's Track-A triple-gate and is preserved unchanged by Port 8. Port 8 changes only Track A classification, not Track B validation.
- **Confidence**: Confident (0.95) `[primary]`
- **Evidence**: `skills/build-explore/SKILL.md:166-168` ("Recommendation Validation (Track B only): before marking any option as `Recommended`, run the two validation checks..."); `references/hybrid-classification-heuristic.md` structure separates Track A gating (lines 19-21, 157-158) from Track B recommendation validation (separate section). Port 8's triple-gate target is lines 19-21 + 157-158 only.
- → Confirmed: captain, 2026-04-15 (batch -- auto-advance, confidence 95%)

## Option Comparisons

### O-1: Vendored `extraction-framework.md` target path (inherited from sibling 104 A-7)

Sibling 104 A-7 committed the captain to vendoring `extraction-framework.md` locally with functional naming, but the specific target path within the repo was left for plan-phase. 105 must commit alongside 104 because both entities cite the same file; diverging paths would fragment the citation anchor.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **`docs/build-pipeline/_docs/extraction-framework.md`** `[secondary]` | Matches existing `_docs/` convention (SO-FO-DISPATCH-SPLIT.md already lives here); discoverable alongside other pipeline design docs; zero new directory creation | Slightly leaks build-pipeline scope -- the framework is methodology for build-brainstorm + build-explore specifically, not pipeline-wide | Low | ✅ Recommended |
| **`skills/build-brainstorm/references/extraction-framework.md`** `[secondary]` | Scopes the reference to the skill that first needs it (104 primary consumer); matches pattern of skill-scoped reference docs | 105 and 104 both cite the file; placing under brainstorm implies secondary status for explore -- asymmetry | Low | Viable |
| **`skills/_shared/extraction-framework.md`** (new directory) `[tertiary]` | Makes the cross-skill nature explicit via directory placement | Creates a new top-level convention (no `skills/_shared/` exists today); requires convention-documentation overhead | Medium | Viable |

**Decision owner**: captain via clarify. Recommendation favors `docs/build-pipeline/_docs/` (option 1) matching existing pipeline-doc convention. Plan-phase for 104 + 105 must agree on identical path.

→ Selected: `docs/build-pipeline/_docs/extraction-framework.md` (captain, 2026-04-15, auto-advance confidence 92%) -- matches existing `_docs/` convention (SO-FO-DISPATCH-SPLIT.md already lives there); 104 + 105 plan-phase MUST commit to this identical path. Sibling 104 A-7 plan-phase action updates accordingly.

## Open Questions

### Q-1: Port 11 ship-blocking precedence vs explore's historically non-blocking contract (from α-1 in APPROACH)

**Domain**: Runnable/Invokable (skill control flow)

**Why it matters**: Current explore skill's FO ensign routing contract presumes explore always emits a Stage Report (build-explore/SKILL.md:232 "Seven metrics, always in this order"). Port 11 under Mode A semantics (sibling 104 O-3 propagated) blocks Stage Report emission on gate failure. This breaks downstream FO logic waiting for explore output. Captain must decide scope commitment for Port 11.

**Suggested options**:
1. **Include Port 11 as MANDATORY** under path-aware semantics (Mode A blocks, Mode B advises) -- accept that FO dispatch graph audit is needed to confirm downstream paths handle blocker payloads. Matches sibling 104 Q-1 hard-fail pattern fully.
2. **Include Port 11 as OPTIONAL** at invocation time -- skip flag in the dispatch prompt allows callers to opt-out when caller cannot handle blocker. Preserves backward-compat.
3. **Defer Port 11 entirely to Phase-E+1** -- ship Ports 7-10 in this entity; open a sibling entity for self-test gate later when FO dispatch graph has Agent-tool audit already complete.

→ Answer: Include Port 11 as MANDATORY under path-aware semantics (captain, 2026-04-15, auto-advance confidence 95%) -- inherits sibling 104 Q-1 hard-fail-to-FO pattern propagated via O-3 path-aware gate semantics. Mode A gate failure returns structured blocker payload (failure reason + gate id + offending Evidence line); Mode B emits alpha markers inline + Stage Report warning `gate-{n} advisory-only in Mode B`. Plan-phase MUST audit FO ensign paths that currently assume explore always returns Stage Report -- update those routing hooks to handle Mode A blocker payload before 105 execute lands.

### Q-2: Negative-space angle (iv) operational definition

**Domain**: Runnable/Invokable (skill subagent prompt contract)

**Why it matters**: APPROACH Port 7 angle (iv) is "negative-space -- patterns the codebase deliberately avoids (grep for absence: places without try/catch, without sync versions, without locks)". Detecting absence is structurally harder than detecting presence -- an explorer cannot prove a pattern is absent-by-intent vs absent-by-accident. Without a tighter operational definition, the negative-space explorer returns noise or false signals.

**Suggested options**:
1. **Explorer is given a seed list of "expected absences"** in the dispatch prompt -- e.g., "check for try/catch absence in files matching {glob}". Captain or parent stage provides seed; explorer confirms or refutes.
2. **Explorer searches for deprecation markers** (comments, docs, ADRs) that explicitly flag "we avoid X" patterns -- restricts to documented absences, rejects inferred-absences.
3. **Drop angle (iv) entirely** -- use only 3 angles (prevailing / recent / sibling). Accept reduced coverage; negative-space is too fragile to operationalize reliably.
4. **Open-ended -- captain decides at clarify**.

→ Answer: Seed list in dispatch prompt (option 1) (captain, 2026-04-15, interactive) -- negative-space angle explorer receives an explicit seed list of "expected absences" in its dispatch prompt, generated by SKILL.md from APPROACH keywords against a seed pattern table. Plan-phase MUST (a) write the seed pattern table into `references/parallel-explorer-angles.md` (per Q-3 reference doc decision), covering at minimum: async context → `await` absence; error-handling → `try/catch` absence; lock/mutex → `lock|Mutex` absence; test coverage → empty test files; type annotation → missing annotations; (b) spec the keyword→seed mapping rule in the same doc; (c) explorer returns structured "confirmed / refuted / not-applicable" per seed, never freeform absence claims.

### Q-3: 4-angle list as static SKILL.md text vs editable reference doc (inherited from Core Tension essential child-specific)

**Domain**: Readable/Textual (skill definition location)

**Why it matters**: The 4 angles (prevailing-patterns, recent-decisions, sibling-entity, negative-space) are captured as of 2026-04-15 and hardcoded in SKILL.md text. As codebase evolves, angle definitions may drift (Honest Boundary 7). If angles are static SKILL.md text, every angle-definition edit is a SKILL.md commit; if moved to a reference doc, edits are lighter but an additional file must be maintained.

**Suggested options**:
1. **Static SKILL.md text** -- 4 angles fixed in SKILL.md body; angle-definition changes require full skill-rewrite entity. Simplest but highest churn cost.
2. **`references/parallel-explorer-angles.md` reference doc** -- angle definitions in a dedicated ref doc (as parent 102 section 7 suggested); SKILL.md cites the ref doc. Lighter iteration cost.
3. **Angle-discovery-per-invocation meta-step** -- before dispatching explorers, a meta-step determines which angles apply to this directive (e.g., greenfield projects skip "negative-space"). Most flexible, highest complexity.

→ Answer: `references/parallel-explorer-angles.md` reference doc (option 2) (captain, 2026-04-15, auto-advance confidence 92%) -- matches build-explore's existing reference-doc precedent (`references/gray-area-templates.md`, `references/hybrid-classification-heuristic.md`, `references/output-format.md`, `references/agent-dispatch-guide.md`). SKILL.md cites the doc via `references/parallel-explorer-angles.md`; angle-definition edits become independent commits without full SKILL.md rewrite. Plan-phase creates the ref doc as part of Port 7 implementation.

## Stage Report: explore

- [x] Files mapped: 4 across skills and docs
  skills/: 2 (build-explore/SKILL.md :20/:166-168/:232 + references/hybrid-classification-heuristic.md :19-21/:157-158 for Port 8 target), docs/: 1 (_index/CONTRACTS.md :207-211 CONTRACTS collision check), entity: 1 (parent 102 line 304 dispatch-pattern precedent)
- [x] Assumptions formed: 4 (Confident: 4, Likely: 0, Unclear: 0)
  A-1 current soft-rule target identified; A-2 no CONTRACTS collision; A-3 4-parallel dispatch pattern proven; A-4 Track-B Recommendation Validation preserved by Port 8
- [x] Options surfaced: 1
  O-1 extraction-framework.md vendoring target path (docs/build-pipeline/_docs/ recommended; aligns with sibling 104 A-7 plan-phase coordination)
- [x] Questions generated: 3
  Q-1 Port 11 ship-blocking precedence (from α-1); Q-2 negative-space angle operational definition; Q-3 4-angle list static-vs-reference-doc
- [x] α markers resolved: 0 / 1
  α-1 (Port 11 routing) -- no codebase precedent resolves the blocking-vs-non-blocking contract conflict; escalated to Q-1
- [x] Scale assessment: confirmed Medium
  frontmatter declared Medium; 4 files mapped (lower than brainstorm 7 files estimate -- heavy inheritance from sibling 104 explore reduced re-mapping cost); scope flag "likely-decomposable-already" noted -- NOT warranted to sub-decompose (ports share tier-tag + Mode A/B infrastructure)
- [x] Research dispatched: 0 researchers (skipped -- all 4 assumptions Confident ≥0.95 AND no external technology claims; all claims are codebase-architecture citations)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- child 105 has no `## Decomposition Recommendation` section; parent 102 was the epic that decomposed to 104+105
- [x] Re-validation: 4 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
- [x] Assumptions confirmed: 4 / 4 (0 corrected)
  A-1 through A-4 confirmed via auto-advance batch (captain directive: confidence >=90% auto-advance; all at 95%)
- [x] Options selected: 1 / 1
  O-1 `docs/build-pipeline/_docs/extraction-framework.md` (auto-advance, 92%) -- matches _docs/ precedent; coordinates with sibling 104 A-7 plan-phase
- [x] Questions answered: 3 / 3 (0 deferred)
  Q-1 Port 11 MANDATORY + path-aware (auto, 95% -- inherits sibling 104 Q-1 hard-fail pattern); Q-2 seed list in dispatch prompt (interactive, captain confirmed); Q-3 references/parallel-explorer-angles.md (auto, 92% -- matches build-explore references/ precedent)
- [x] Open exploration: 0 gray areas surfaced (auto-advance 92% -- templates/CONTRACTS/directive-implied all covered by pre-identified items; no new gaps detected)
- [x] Canonical refs added: 0 (inherited from brainstorm seed set; O-1 resolves vendoring target path but sibling 104 plan-phase owns the file copy)
- [x] Context status: ready
  gate passed: 4 assumptions confirmed, 1 option selected, 3 questions answered, 9 acceptance criteria present with no α markers, Canonical References seeded
- [x] Handoff mode: loose (auto_advance: blank in frontmatter)
  captain must say "execute explore-nuwa-subagent-first" or "execute 105" to advance; First Officer owns status: plan transition in separate flow
- [x] Clarify duration: 1 AskUserQuestion call (Q-2 only -- 7 of 8 items auto-advanced per captain directive confidence >=90%; session complete)
