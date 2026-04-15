---
id: 115
title: Brainstorm Gate Auto-Advance on Shape-Validated + Zero Contradictions
slug: brainstorm-gate-auto-advance-on-shape-validated
status: draft
context_status: pending
source: captain observation
created: 2026-04-16T01:30:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
profile:
auto_advance:
parent:
children:
shape_status: n/a
depends-on: [alignment-gate-promote-to-stage]
---

## Directive

> brainstorm-gate-auto-advance-on-shape-validated -- 當 entity `shape_status: validated` 且 brainstorm triage executability 5/5 且 brainstorm 的 `## Lens Evidence` 沒有 contradict shape 的 claim 時，FO 自動通過 brainstorm gate 不再 block 等 captain 同意（log `brainstorm gate auto-resolved: shape-validated, executability 5/5, no lens contradictions` 訊息）。三條件任一不滿足仍走原 captain gate 流程（executability 呈現 + A/B/C 路徑選擇）。修改 `references/first-officer-shared-core.md` Brainstorm Triage Gate Resolution 章節；可能需要一個新 helper 檢查 lens evidence contradiction（或用既有 gate (i) cross-lens recurrence 的 negative signal）。不動 brainstorm stage 本身的產出、lens 邏輯、executability rubric。

## Captain Context Snapshot

- **Created**: 2026-04-16T01:30:00+08:00
- **Source**: Captain observation during entity 114 build flow — when shape_status=validated and brainstorm output shows 0 α markers + 5/5 executability + clean lens evidence, the brainstorm gate becomes a rubber-stamp moment with zero information gain. Captain's framing: "已經有 brainstorm 內容就不用再 gate 了除非是要合成其他技術決策".
- **Empirical evidence**: Entity 114 is the second shape-first entity (first was entity 113 — which was not shape-first; 114 IS). Entity 114's brainstorm gate fired after `/build --from` produced 4 lens evidence with 0 contradictions and 8 grep-verifiable AC. Captain only answered "advance" — no path selection, no revision request.
- **Related entities**: 113 build-entry-routing-and-alignment-gate (shipped — source of current brainstorm gate logic); 114 alignment-gate-promote-to-stage (in-flight — first shape-first sample point); 103 shape-pre-build-alignment-skill (shipped — origin of shape_status semantics and P-4 immutable-pitch)
- **Depends-on**: 114 — because (a) 114 is the empirical baseline for "brainstorm gate fires pre-auto-advance", providing the before-state for validation; (b) 115 modifying brainstorm gate while 114 is in-flight would change 114's own gate behavior mid-pipeline (test confound)
- **Why not shape-first**: Problem is narrow, direction is unambiguous, scope is Small (2-3 file edits in shared-core + possibly README brainstorm stage comment). The `/build` Step 0 gatekeeper should silent-pass this directive (concrete targets: references/first-officer-shared-core.md, Brainstorm Triage, lens evidence, executability; zero hedge words).

## Goal Check

You are asking for the First Officer to skip the brainstorm gate and auto-advance when a shape-validated entity already has a high-quality brainstorm (executability 5/5, no lens evidence contradictions) — eliminating rubber-stamp captain interaction with zero information gain.

- **Problem being solved**: Shape-validated entities with clean brainstorms create a rubber-stamp gate moment (captain answers "advance" without path selection or revision), burning context and attention for zero information gain. Entity 114 was the empirical baseline.
- **Expected outcome**: When all 3 conditions hold (shape_status validated + executability 5/5 + zero lens contradictions), FO emits the literal log line `brainstorm gate auto-resolved: shape-validated, executability 5/5, no lens contradictions`, writes `score: 1.0` to frontmatter, and advances without captain prompt. Any condition failure falls back to the existing captain gate (path A/B/C).
- **Explicit non-goals**: No change to brainstorm stage output, lens logic, or executability rubric. No generalization to clarify or UAT gates. `auto_advance: false` in frontmatter remains a captain opt-out.

## Lens Evidence

### Inline fallback (Mode B — Small, well-specified, target file already read this session)

- Three-condition predicate: `shape_status == validated` + executability == 5 + lens-contradictions == 0 -- directive:verbatim L29 [primary]
- Log message literal: `brainstorm gate auto-resolved: shape-validated, executability 5/5, no lens contradictions` -- directive:verbatim L29 [primary]
- Any condition failure falls back to existing captain gate flow -- directive:verbatim L29 [primary]
- Scope: `references/first-officer-shared-core.md` Brainstorm Triage Gate Resolution; optional new `references/brainstorm-gate-contradiction-check.md`; possible README comment on brainstorm stage `gate: true` line -- directive:verbatim L29 + Pre-Brainstorm Scope Sketch L43-45 [primary]
- Hard constraints: no brainstorm stage output changes, no lens logic changes, no executability rubric changes -- directive:verbatim L29 [primary]
- Empirical baseline: entity 114 brainstorm gate fired post-generation with 4 lens evidence + 0 contradictions + 8 grep-verifiable AC; captain answered "advance" with no path selection (rubber-stamp signal) -- entity:115 Captain Context Snapshot L35 [primary]
- Brainstorm Triage Gate Resolution currently never self-approves; only advances on explicit captain approval -- references/first-officer-shared-core.md:159-169 [primary]
- Path A/B/C presentation happens when score ≤4/5; score 5/5 still requires captain approval today -- references/first-officer-shared-core.md:135-143 [primary]
- alignment-gate (entity 114, shipped) established the pattern of confidence-threshold auto-advance at composite ≥ 0.90 -- MEMORY.md fo-confidence-autoadvance.md + MEMORY.md phase-e-plan-2-6-execution-plan [secondary]
- `/build` gatekeeper (entity 113, shipped) supersedes entity 103's "no automatic routing" decision — direction of travel is captain-gate reduction where evidence supports it -- references/first-officer-shared-core.md trailing decision-lineage note [primary]
- 3 in-flight shared-core edits on different subsections: review-stage-parallel-skill-dispatch (execute), pre-ship-confidence-gate (execute, thematically coherent auto-advance sibling), flatten-dispatch-troops-architecture (plan). No direct conflict with Gate Resolution subsection but merge order matters -- CONTRACTS.md references/first-officer-shared-core.md [primary]
- `auto_advance: false` frontmatter field already exists and is honored by FO on other gates — standard opt-out surface -- MEMORY.md fo-confidence-autoadvance [secondary]

## Core Tensions

- **essential**: Auto-advance eliminates captain info-loss on rubber-stamp moments, but removing the gate also removes the last chance for captain to catch misalignment before plan stage — the three-condition predicate must be conservative enough that false-positives (auto-advance when captain would have corrected) are near-zero. The three conditions together encode "shape-validated framing + technically executable + no cross-lens dissent", which are the exact conditions under which captain judgment adds nothing the gate can already infer.
- **time-based**: Lens-contradiction detection may be non-trivial if no helper exists today; Pre-Brainstorm Scope Sketch flags Medium-scale escalation risk if the helper design expands. Also coordinates with 3 in-flight shared-core edits whose merge order affects diff-surface size.

## Honest Boundaries

- Does NOT generalize to clarify or UAT gates — brainstorm-gate-specific per directive scope statement.
- Does NOT add or modify executability criteria — 5-point rubric at shared-core.md:120-128 is upstream contract.
- Does NOT override `auto_advance: false` frontmatter opt-out — captain explicit-opt-out preserved per captain-preferences.md philosophy.
- Contradiction-detection semantics may warrant a new helper doc (the "可能需要" branch in directive L29) — scope may escalate to Medium if helper design is non-trivial.
- No change to the `## Lens Evidence` body section format — entity 114's contract is frozen.

## Brainstorming Spec

**APPROACH**: Edit `references/first-officer-shared-core.md` Brainstorm Triage → Gate Resolution section (around L159) to prepend a pre-approval predicate check. When frontmatter `shape_status == validated` AND executability triage scored 5/5 AND count of `⚠ contradicted` annotations in entity body `## Lens Evidence` section == 0, FO emits the literal log line `brainstorm gate auto-resolved: shape-validated, executability 5/5, no lens contradictions`, writes `score: 1.0` to frontmatter, advances to next stage per `effective_stages()`, and emits the dispatch event — all without captain interaction. Any condition failure (any of the 3 predicates false, OR `auto_advance: false` present) falls through to the existing path A/B/C captain gate presentation unchanged. Add a new small reference doc `references/brainstorm-gate-contradiction-check.md` defining the contradiction-count predicate authoritatively (grep-count of `⚠ contradicted` markers in `## Lens Evidence`, with explicit non-triggers for other annotation types like `⚠ stale-evidence`). Append a single comment line on README.md's brainstorm stage `gate: true` line documenting the auto-advance condition so stage-graph readers see the semantic at a glance.

**ALTERNATIVE**: Reuse brainstorm's Step 5.5 triple-verification Gate (i) cross-lens recurrence check (≥2 of 4 lenses supporting each claim) as the contradiction signal inline — if all APPROACH claims passed Gate (i), treat as "zero contradictions", no new helper doc needed -- D-01 Rejected: Gate (i) is an intra-brainstorm check that runs BEFORE `## Lens Evidence` is written to the entity body, so FO reading the shipped brainstorm output cannot re-evaluate Gate (i) without re-dispatching brainstorm. A forward-facing data source (count `⚠ contradicted` annotations added by explore/clarify review) is the correct signal for FO auto-advance logic because those annotations persist on the shipped entity body and reflect review-detected contradictions, not just brainstorm-internal cross-lens recurrence.

**GUARDRAILS**:
- No brainstorm stage output format changes — `## Lens Evidence` section format is frozen per entity 114 contract
- No lens logic changes — brainstorm Step 5.5 merge gate + 5-item self-test stays intact
- No executability rubric changes — 5-point table at shared-core.md:120-128 is upstream contract
- `auto_advance: false` in frontmatter remains a load-bearing opt-out; predicate short-circuits to captain gate when present
- Coordinate merge order with 3 in-flight shared-core edits: review-stage-parallel-skill-dispatch (execute), pre-ship-confidence-gate (execute), flatten-dispatch-troops-architecture (plan) — different subsections but same file, plan phase must sequence
- No change to clarify or UAT gate semantics — brainstorm-gate-specific per directive

**RATIONALE**: Entity 114 provided the empirical proof that shape-first + executability 5/5 + clean lens evidence produces a zero-info-gain gate (captain answered "advance" with no path selection). The three-condition predicate is conservative by construction: any condition failure routes back to the existing captain gate, so false-positives (auto-advance bypassing a genuinely needed decision) are near-zero. The three conditions together encode "shape-validated framing + technically executable + no cross-lens dissent" — the exact conditions under which captain judgment adds nothing the gate can already infer. The log line is load-bearing forensic evidence so captain can retrospect which entities auto-advanced and on what signal. The ALTERNATIVE is rejected on temporal grounds: Gate (i) runs intra-brainstorm; FO needs a signal readable from the shipped entity body, and explore/clarify `⚠ contradicted` annotations are the canonical review-detected contradiction record. `auto_advance: false` preserves explicit captain opt-out per captain-preferences.md philosophy of explicit opt-out over implicit override.

## Acceptance Criteria

- Given an entity with frontmatter `shape_status: validated` AND brainstorm triage executability score 5/5 AND zero `⚠ contradicted` annotations in `## Lens Evidence`, when FO evaluates the brainstorm gate, then FO emits literal log line `brainstorm gate auto-resolved: shape-validated, executability 5/5, no lens contradictions` and writes `score: 1.0` to frontmatter without captain interaction (how to verify: synthesize test entity with all 3 conditions; trace FO brainstorm gate invocation; grep FO log stream for literal log string; inspect frontmatter `score` field)
- Given an entity with `shape_status: validated` AND executability 5/5 AND ≥1 `⚠ contradicted` annotation in `## Lens Evidence`, when FO evaluates the gate, then captain gate path A/B/C is presented unchanged (how to verify: synthesize entity with one injected `⚠ contradicted` annotation; observe path A/B/C prompt fires; verify no auto-resolve log line emitted)
- Given an entity with `shape_status: n/a` (non-shape-first) AND executability 5/5 AND 0 contradictions, when FO evaluates, then captain gate fires normally — auto-advance does NOT trigger (how to verify: use entity 113 archive or a synthesized non-shape-first entity as negative-case baseline; observe captain prompt; verify no auto-resolve log line)
- Given an entity with `shape_status: validated` AND executability score 4/5, when FO evaluates, then captain gate fires normally — any predicate-failure falls back (how to verify: synthesize entity with score 4; observe path A/B/C presentation)
- Given an entity with `shape_status: validated` AND executability 5/5 AND 0 contradictions AND `auto_advance: false` in frontmatter, when FO evaluates, then captain gate fires normally — opt-out preserved (how to verify: synthesize with `auto_advance: false`; observe captain prompt; verify no auto-resolve log line)

## Stage Report: brainstorm

- Mode: B (inline fallback — Small entity, well-specified directive, target file `references/first-officer-shared-core.md:115-172` already read this session)
- α marker count: 0
- Mode B gate (i) cross-lens recurrence: SKIPPED per Mode B contract (α-marker not emitted because Small + well-specified + single-source lens fallback covers the same semantic)
- Lens support: inline fallback with 11 citations across directive, shared-core, MEMORY, CONTRACTS, entity-114-context; 8 [primary], 3 [secondary]
- Claim cardinality: APPROACH contains 5 factual claims (within 3-7 target)
- Core Tensions populated: 2 typed entries (essential + time-based)
- Honest Boundaries populated: 5 bullets
- Tier tags: every citation tagged primary or secondary
- Triple-verification: gates (ii)+(iii) pass inline for all 5 APPROACH claims; gate (i) skipped per Mode B
- Alignment gate: deferred (shape_status: n/a for THIS entity — entity 115 is not itself shape-first, though it implements auto-advance for shape-first entities; recursive irony noted but not blocking)
- alignment_confidence: N/A
- Intent: feature
- Scale: Small (2-3 files: shared-core edit + optional new contradiction-check.md + optional README comment; worst case 3)
- Scope flag: none (0 decomposition signals; no migrate/rewrite/overhaul words, single subsystem target)
- Sibling coordination: 3 in-flight shared-core edits flagged in GUARDRAILS for plan-phase merge ordering

## Pre-Brainstorm Scope Sketch (informal)

**Expected modifications:**
- `references/first-officer-shared-core.md` — `Brainstorm Triage` section, `Gate Resolution` subsection. Add auto-advance rule with three-condition predicate.
- `docs/build-pipeline/README.md` — comment on brainstorm stage `gate: true` line noting the auto-advance condition (preserves README as source of truth).
- Possibly `references/brainstorm-gate-contradiction-check.md` — new tiny reference doc defining what counts as a "lens evidence contradiction with shape" (candidate predicates: Lens (a) claim absent from shape; Lens (b/c/d) claim directly contradicts shape Scope: In/Out; Brainstorming Spec α-marker count > 0).

**Three-condition predicate:**
1. `shape_status == validated` (from entity frontmatter)
2. brainstorm triage executability score == 5 (from FO's existing 5-point rubric)
3. lens evidence contradictions == 0 (new check; falsifiable via grep or structural inspection)

**Out of scope:**
- Generalizing to clarify gate or UAT gate (this is brainstorm-gate-specific)
- Adding new executability criteria (keep the 5-point rubric as-is)
- Shape-validated entities that want to OVERRIDE auto-advance (if captain always wants the gate, provide opt-out via `auto_advance: false` in frontmatter — already exists as a field)
- Mid-flight behavioral change for entity 114 (depends-on: 114 ensures 115 ships after 114)

**Empirical baseline to cite in AC:**
- Entity 114 Stage Report: clarify confirms brainstorm gate fired and captain answered "advance" with no path selection (rubber-stamp signal).
- Entity 113 (not shape-first) Stage Report would NOT trigger auto-advance (shape_status absent) — should continue to gate normally; this is the negative test case.

## Notes

- This is a _parked draft_ awaiting entity 114's ship. Do NOT run `/build` or advance past `status: draft` until 114 is `verdict: PASSED` and archived.
- If 114 reveals implementation constraints that change the predicate (e.g., lens evidence contradiction detection turns out non-trivial), this directive's `### Pre-Brainstorm Scope Sketch` above should be revised BEFORE /build is invoked — the informal sketch is captain-edit-friendly, the brainstorm sections below it will be populated by `/build`.
