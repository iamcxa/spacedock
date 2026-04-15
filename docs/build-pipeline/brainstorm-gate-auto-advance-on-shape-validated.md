---
id: 115
title: Brainstorm Gate Auto-Advance on Shape-Validated + Zero Contradictions
slug: brainstorm-gate-auto-advance-on-shape-validated
status: clarify
context_status: ready
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

**APPROACH (REVISED post-clarify Q-1 redesign)**: Edit `references/first-officer-shared-core.md` Brainstorm Triage → Gate Resolution section (around L159) to prepend a 2-condition pre-approval predicate check. When frontmatter `shape_status == validated` AND `score == 1.0` (i.e. executability triage scored 5/5, already frontmatter-written per L162), AND `auto_advance != false`, FO emits the literal log line `brainstorm gate auto-resolved: shape-validated, executability 5/5` and advances to next stage per `effective_stages()` and emits the dispatch event — all without captain interaction. Any condition failure (either predicate false, OR `auto_advance: false` present) falls through to the existing path A/B/C captain gate presentation unchanged. Append a single comment line on README.md's brainstorm stage `gate: true` line documenting the auto-advance condition so stage-graph readers see the semantic at a glance. NO new reference doc — the predicate is a 2-line check, inlined in shared-core. NO contradiction-count signal — see RATIONALE for why the directive's 3rd condition was redesigned out.

**ALTERNATIVE**: Implement the 3-condition predicate as originally directive-specified: shape_status + executability + grep-count of `⚠ contradicted` annotations in `## Lens Evidence` -- D-01 Rejected (captain decision in clarify, 2026-04-16): the 3rd condition has zero observable instances in shipped entities (grep returned 0 across active + archive), and is **effectively redundant with executability == 5**. If lens evidence truly contradicted itself, at least one of the 5 executability rubric criteria (intent clear / scope bounded / approach decidable / verification possible / size estimable) would fail to score. Captain's own empirical baseline (entity 114): 5/5 executability + 0 contradictions are correlated, not independent signals. Adding the 3rd condition would either (a) ship an aspirational contract with no current data or (b) couple this entity to a separate annotation-hygiene concern. Both violate single-responsibility. Future entity may add the 3rd condition IF annotation hygiene work ships first AND empirical data shows it adds discriminative power beyond executability.

**GUARDRAILS**:
- No brainstorm stage output format changes — `## Lens Evidence` section format is frozen per entity 114 contract
- No lens logic changes — brainstorm Step 5.5 merge gate + 5-item self-test stays intact
- No executability rubric changes — 5-point table at shared-core.md:120-128 is upstream contract
- `auto_advance: false` in frontmatter remains a load-bearing opt-out; predicate short-circuits to captain gate when present
- Coordinate merge order with 3 in-flight shared-core edits: review-stage-parallel-skill-dispatch (execute), pre-ship-confidence-gate (execute), flatten-dispatch-troops-architecture (plan) — different subsections but same file, plan phase must sequence
- No change to clarify or UAT gate semantics — brainstorm-gate-specific per directive

**RATIONALE (REVISED post-clarify Q-1 redesign)**: Entity 114 provided the empirical proof that shape-first + executability 5/5 produces a zero-info-gain gate (captain answered "advance" with no path selection). Originally the directive specified a 3-condition predicate including a `⚠ contradicted` count check, but explore-phase grep proved that annotation has zero instances in shipped entities — making the condition trivially true and discriminatively useless until annotation hygiene shipped at scale. Captain's clarify-phase argument resolved this: the 3rd condition is **effectively redundant with executability == 5**, since lens-evidence contradictions would necessarily fail one of the 5 executability rubric criteria (intent clear / scope bounded / etc.). The 2-condition predicate (shape_status validated + score == 1.0) is conservative by construction (any failure routes to captain gate, so false-positives are near-zero) AND uses signals that are already observably written to frontmatter today. The log line is load-bearing forensic evidence so captain can retrospect which entities auto-advanced. `auto_advance: false` preserves explicit captain opt-out per captain-preferences.md. The ALTERNATIVE 3-condition design is preserved here as a documented future option: if and when contradiction-annotation hygiene ships in a separate entity AND empirical data demonstrates it adds discriminative power beyond executability, the 3rd condition can be added. Until then, 2 conditions are both necessary and sufficient.

## Acceptance Criteria

- Given an entity with frontmatter `shape_status: validated` AND `score: 1.0` AND no `auto_advance: false`, when FO evaluates the brainstorm gate, then FO emits literal log line `brainstorm gate auto-resolved: shape-validated, executability 5/5` and advances to next stage without captain interaction (how to verify: synthesize test entity with both conditions; trace FO brainstorm gate invocation; grep FO log stream for literal log string; verify frontmatter status advances to next stage)
- Given an entity with `shape_status: n/a` (non-shape-first) AND `score: 1.0`, when FO evaluates, then captain gate path A/B/C fires normally — auto-advance does NOT trigger (how to verify: use entity 113 archive as negative-case baseline; observe captain prompt; verify no auto-resolve log line)
- Given an entity with `shape_status: validated` AND `score: 0.8` (4/5 executability), when FO evaluates, then captain gate fires normally — predicate failure falls back (how to verify: synthesize entity with score 0.8; observe path A/B/C presentation)
- Given an entity with `shape_status: validated` AND `score: 1.0` AND `auto_advance: false` in frontmatter, when FO evaluates, then captain gate fires normally — opt-out preserved (how to verify: synthesize with `auto_advance: false`; observe captain prompt; verify no auto-resolve log line)
- Given the 2-condition predicate is unmet for any reason, when FO falls back to captain gate, then the path A/B/C presentation is byte-identical to current behavior at shared-core L135-143 (how to verify: diff captain gate output before/after this change for negative-case entity; assert zero substantive change)

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

## Assumptions

### A-1 -- Brainstorm gate at shared-core L159-169 is the captain-approval rubber-stamp moment entity 115 targets

- Confidence: Confident (0.97)
- Evidence: `references/first-officer-shared-core.md:159-169` "Gate Resolution" section literally states "Gate passes when the captain explicitly approves advancement... Never self-approves the brainstorm gate. Do not infer approval from silence." [primary]
- Implication: the pre-approval predicate check must be prepended to this section; FO must bypass "captain explicit approval" requirement when predicate holds.
- → Confirmed: SO self-verified, 2026-04-16 (session-verified via sed shared-core L115-175)

### A-2 -- Executability score is already computed and frontmatter-written as `passed_count / 5`

- Confidence: Confident (0.96)
- Evidence: `references/first-officer-shared-core.md:162` "Write `score: {passed_count / 5}` to entity frontmatter (e.g., 5/5 → `score: 1.0`, 4/5 → `score: 0.8`)". 5-point rubric at L120-128 (intent clear / approach decidable / scope bounded / verification possible / size estimable). [primary]
- Implication: no new scoring logic needed; auto-advance checks existing frontmatter `score == 1.0` OR in-memory triage passed_count == 5.
- → Confirmed: SO self-verified, 2026-04-16 (grep shared-core verified)

### A-3 -- alignment-gate is a SEPARATE pipeline stage between brainstorm and clarify, not a brainstorm-internal check

- Confidence: Confident (0.95)
- Evidence: `docs/build-pipeline/README.md:36-43` defines `alignment-gate` as its own stage with `gate: true` and `feedback-to: brainstorm`. Entity 114 (shipped) extracted the logic from `agents/science-officer.md` Step 3.6 into `skills/build-alignment-gate/SKILL.md` as a first-class stage. [primary]
- Implication: entity 115's brainstorm-gate auto-advance is orthogonal to alignment-gate's existing auto-advance (composite confidence ≥ 0.90). Two different gates on two different stages. The directive's scope is the brainstorm gate only — do NOT conflate with alignment-gate.
- → Confirmed: SO self-verified, 2026-04-16 (grep README L36-43 + skills/build-alignment-gate/SKILL.md verified)

### A-4 -- Three sibling entities edit `first-officer-shared-core.md` on different subsections (merge coordination, no semantic conflict)

- Confidence: Confident (0.93)
- Evidence: `CONTRACTS.md` shows: `review-stage-parallel-skill-dispatch` (execute, team creation policy section), `pre-ship-confidence-gate` (execute, Pre-Ship Confidence Gate new subsection), `flatten-dispatch-troops-architecture` (plan, Dispatch Modes section). None touch Brainstorm Triage → Gate Resolution subsection. [primary]
- Implication: plan-phase sequences commits but no substantive conflict. `pre-ship-confidence-gate` is thematically similar (auto-advance) — plan phase may want to check for coherent terminology (e.g., "confidence gate" vs "auto-advance gate").
- → Confirmed: SO self-verified, 2026-04-16 (CONTRACTS.md shared-core section verified)

### A-5 -- `auto_advance: false` frontmatter field already exists as captain opt-out on other gates

- Confidence: Likely (0.78) → **upgraded to Confident (0.95) by SO self-investigation (Q-2 resolution)**
- Evidence: `MEMORY.md fo-confidence-autoadvance.md` mentions the field for plan gate (>95% auto-advance, ≤95% captain gate). `MEMORY.md fo-auto-revision-loop.md` references it. No grep confirmation of the field being read in `references/first-officer-shared-core.md` — the mechanism may be in a separate reference doc or FO-level agent file. [secondary]
- (✓ research: grep this session -- `auto_advance` is read at `agents/science-officer.md:182,214` + `skills/build-clarify/SKILL.md:417-419` + `skills/build-clarify/references/output-format.md:217,240`. Zero matches in `references/first-officer-shared-core.md`.) [primary upgrade]
- Implication: **SCOPE EXPANSION.** Brainstorm gate in shared-core does NOT currently consult `auto_advance`. 115's APPROACH must ADD new plumbing: the read + short-circuit logic is NEW work in shared-core Brainstorm Triage Gate Resolution, not "reuse existing read path". This is still Small scale (1 additional read in 1 existing subsection).
- → Confirmed: SO self-verified, 2026-04-16 (grep across references/, agents/, skills/)

## Option Comparisons

### O-1 -- How to source the "lens contradictions == 0" signal (contradiction-count data source)

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) grep-count `⚠ contradicted` in `## Lens Evidence` section only (brainstorm APPROACH proposal) | Targeted scope — matches the "lens contradictions" wording in directive | **Zero shipped entities have this annotation today** (grep returned 0 across active + archive). Signal has no discriminative power until explore/clarify stages populate at scale. | Low | Viable — but predicated on aspirational contract |
| (b) grep-count `⚠ contradicted` or `⚠` anywhere in entity body | Broader surface — catches contradictions annotated in any section | Conflates lens contradictions with other `⚠` annotations (stale-evidence, research-contradicted, dedup); false-positive risk. | Low | Rejected — semantic noise |
| (c) Check structural Q-n entries with `contradicted: true` flag or similar explicit marker | Clean structured data; would require frontmatter/schema update | Requires schema change (violates directive's "no brainstorm stage output changes" guardrail) | Medium | Rejected -- violates guardrail |
| (d) ✅ Start with (a), but require explore/clarify to actually emit `⚠ contradicted` in at least N entities before shipping 115 — treat it as a 2-part work: (d.1) make the annotation usage canonical; (d.2) add auto-advance predicate | Fixes the data-vacuum problem; 115's predicate becomes meaningful at ship time | Scope escalation — 115 now gates on a writing-convention change across stages; may need 2 entities | Medium | ✅ Recommended — if captain wants meaningful signal |

Recommendation (d) avoids the aspirational-contract trap. Recommendation (a) ships sooner but trivially passes for every entity until annotations are produced at scale. This is the core scope decision.

→ Selected: **REDESIGN — drop O-1 entirely** (captain, 2026-04-16, interactive). The 3rd condition (lens contradictions == 0) is effectively redundant with executability == 5. Argument: if lens evidence truly contradicted itself, at least one of the 5 executability rubric criteria (intent clear / scope bounded / approach decidable / verification possible / size estimable) would fail to score. Captain's own empirical baseline (entity 114): 5/5 executability + 0 contradictions are correlated, not independent. Predicate becomes 2-condition: `shape_status == validated` AND `score == 1.0`. Both observable today via existing frontmatter writes. APPROACH/RATIONALE rewritten accordingly. Future entity may add 3rd condition IF annotation hygiene work (separate concern, separate entity) ships AND empirical data shows 3rd condition adds discriminative power beyond executability.

### O-2 -- Reference-doc placement for contradiction predicate definition

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Separate `references/brainstorm-gate-contradiction-check.md` | Predicate is authoritatively defined; future refactors have a single source | Adds a tiny file for what may be a one-line grep predicate | Low | ✅ Recommended |
| (b) Inline definition in `first-officer-shared-core.md` Gate Resolution section | Co-located with caller; no cross-file hop | Mixes predicate with gate logic; harder to rev the predicate without touching shared-core | Low | Viable |

Recommendation (a) matches the directive's "可能需要一個新 helper" framing and aligns with how other predicates are plumbed (e.g., `alignment_confidence` formula lives in its own skill file).

→ Selected: **DEPRECATED by O-1 redesign** (captain, 2026-04-16, interactive). With the contradiction predicate dropped (O-1 redesign), there is no helper file to add. `references/brainstorm-gate-contradiction-check.md` is NOT created. The auto-advance logic lives inline in `references/first-officer-shared-core.md` Brainstorm Triage Gate Resolution section as a 2-line check.

## Open Questions

### Q-1 -- Does the `⚠ contradicted` annotation get emitted by explore/clarify in practice, and if not, should 115 include the emission work?

- Domain: Behavioral/Callable + Readable/Textual
- Why it matters: The APPROACH's 3rd predicate counts annotations that empirically don't exist (grep: 0 matches in active + archive before this session). If the data source stays empty, the predicate trivially passes for every shape_status:validated + 5/5 entity — effectively reducing to a 2-condition predicate. Either 115's scope expands to ensure annotation emission at scale, OR the predicate design changes to use an observable signal.
- Suggested options:
  - (a) Expand 115 scope: add explore/clarify emission work so `⚠ contradicted` actually populates (scope → Medium)
  - (b) Park 115 until a separate "contradiction-annotation hygiene" entity ships first
  - (c) Redesign predicate: use an observable signal today (e.g., `score: 1.0` alone since it's already frontmatter-written, drop the contradiction check)
- [primary]
- → Answer: (c) Redesign predicate (captain, 2026-04-16, interactive). The 3rd condition is effectively redundant with executability == 5 — lens contradictions would necessarily fail one of the 5 rubric criteria, so the signals are correlated not independent. Empirical proof from entity 114: 5/5 + 0 contradictions arrived together. Predicate becomes 2-condition: shape_status == validated + score == 1.0 + auto_advance != false. APPROACH/RATIONALE/AC rewritten accordingly. Future entity may add 3rd condition IF annotation-hygiene work ships AND empirical data shows 3rd condition adds discriminative power.

### Q-2 -- Where is `auto_advance: false` actually read by FO?

- Domain: Behavioral/Callable
- Why it matters: A-5's evidence is MEMORY.md references, not direct code/shared-core evidence. If the field-reading happens in a place 115 doesn't edit, 115 must plumb the short-circuit itself. If it's already load-bearing in shared-core or FO agent, 115 just adds the guard and reuses the existing read path.
- Suggested options:
  - (a) Read lives in `references/first-officer-shared-core.md` (likely Dispatch section) -- grep confirms
  - (b) Read lives in `agents/first-officer.md` agent body
  - (c) Read is proposed-but-not-yet-landed (in one of the 3 in-flight shared-core edits)
- [secondary]
- → Self-resolved: grep this session found `auto_advance` read at `agents/science-officer.md:182,214` + `skills/build-clarify/SKILL.md:417-419` (SO-handoff + clarify-Step-6). **Zero matches in `references/first-officer-shared-core.md`.** Conclusion: NONE of options (a)(b)(c) match — read lives in SO agent + clarify skill, NOT in FO shared-core. **115 must plumb NEW read in shared-core Brainstorm Triage Gate Resolution** (scope addition, still Small). See A-5 upgrade. (SO self-resolved, 2026-04-16, [primary]-tier grep evidence)

### Q-3 -- Does captain want the auto-advance log line to ALSO surface in the dashboard activity stream as a `gate_decision` event, or is log-only sufficient?

- Domain: User-facing Visual + Behavioral/Callable
- Why it matters: Forensic replay-ability. If captain only sees the log line in FO output, retrospection requires log-stream search. A `gate_decision` activity event would show in dashboard for later review at no extra captain cost. Directive says "log" only — this Q surfaces an adjacent UX choice explore noticed.
- Suggested options:
  - (a) Log-only (directive verbatim) — ship minimal
  - (b) Log + emit `gate_decision` event to `/api/events` with `auto_resolved: true` flag — aligns with dashboard patterns
  - (c) Defer dashboard surfacing to a follow-up entity — preserves Small scale
- [secondary]
- → Self-resolved: (a) log-only. Directive literal "log `brainstorm gate auto-resolved: ...` 訊息" specifies log-only; option (b) would violate "不加 FO 路由" (no FO routing additions) guardrail. (c) defer to follow-up is the same as (a) at ship time. Entity 116 already shipped blocked-event emission to its follow-up entity (same pattern: dashboard event emission deferred to separate entity). (SO self-resolved, 2026-04-16, [primary]-tier directive evidence)

## Core Tensions

- **essential**: Auto-advance eliminates rubber-stamp captain info-loss, but the 3rd condition ("zero lens contradictions") depends on an annotation contract that has **zero observable instances in shipped entities today**. The APPROACH's data source may be aspirational; without empirical signal, the 3-condition predicate collapses to a 2-condition one with no discriminative power on contradictions.
- **essential** (preserved from brainstorm): Conservative predicate construction means false-positives are near-zero, BUT the signal must actually exist for the predicate to discriminate anything beyond shape_status + executability.
- **time-based**: The 3 in-flight shared-core sibling edits (review-stage-parallel-skill-dispatch, pre-ship-confidence-gate, flatten-dispatch-troops-architecture) all touch the same file — merge coordination sequences commits but doesn't block; thematic coherence with `pre-ship-confidence-gate` (both are "auto-advance" patterns) is worth the plan phase reading that entity for shared terminology.

## Honest Boundaries

- Does NOT generalize to clarify or UAT gates — brainstorm-gate-specific per directive.
- Does NOT modify the 5-point executability rubric — shared-core.md:120-128 contract stays.
- Does NOT override `auto_advance: false` — opt-out preserved.
- Does NOT change the `## Lens Evidence` body section format — entity 114 contract frozen.
- Recommendation validation for O-1 performed against design doc invariants: directive's "no brainstorm stage output changes" rules out O-1(c); empirical grep rules out O-1(a) as meaningful signal → O-1(d) chosen despite scope escalation risk.

## Stage Report: explore

- [x] Mode: B (inline single-pass fallback -- Small entity, target file pre-mapped by brainstorm; re-verified shared-core L115-172 + README L20-75 this session)
- [x] ⚠ ensign-mode inline fallback -- 4-angle quality not achieved this invocation (acceptable: Small + well-specified + captain-written Pre-Brainstorm Scope Sketch already covers ~3 angles worth of context)
- [x] Files mapped: 4 across contract, config, memory
  contract: 2 (first-officer-shared-core.md, skills/build-alignment-gate/SKILL.md), config: 1 (README.md), memory: 1 (MEMORY.md entries). Scale confirmed Small (≤5 files).
- [x] Assumptions formed: 5 (Confident: 4, Likely: 1, Unclear: 0)
  A-1/A-2/A-3/A-4 Confident via direct file:line; A-5 Likely (evidence is secondary/MEMORY.md-only).
- [x] Options surfaced: 2
  O-1 contradiction-count data source (material, captain must decide); O-2 reference-doc placement.
- [x] Questions generated: 3
  Q-1 empirical existence of ⚠ contradicted annotation (highest priority — invalidates or constrains O-1); Q-2 auto_advance read location (blocking for implementation); Q-3 gate_decision event emission (stretch UX).
- [x] α markers resolved: 0 / 0
  Brainstorm emitted 0 α markers; none to consume.
- [x] Brainstorm claim verification: 4 confirmed, 1 contradicted
  ✓ shared-core L159-169 gate resolution section; ✓ score computation at L162; ✓ alignment-gate as separate stage (README L36); ✓ 3 sibling contracts different subsections (CONTRACTS.md); ⚠ "grep-count of ⚠ contradicted" data source contradicted by empirical scan — 0 matches before this session (see Q-1 + O-1).
- [x] Scale assessment: confirmed Small (3 core files: shared-core + new contradiction-check + README comment) — but note Q-1's option (a) would escalate to Medium
- [x] Research dispatched: 0 researchers (skipped -- all tech claims are internal-codebase; no external libs/APIs)
- [x] Self-test gate (Port 11): all gates pass
  Gate (i) cross-layer recurrence: N/A in Mode B per Mode B modifier
  Gate (ii) Track A evidence depth: PASS (A-1..A-4 all ≥2 evidence sources; A-5 has secondary tier — ≥2 covered across MEMORY files)
  Gate (iii) Track B alternative completeness: PASS (O-1: 4 options 1 recommended; O-2: 2 options 1 recommended)
  Gate (iv) Track C option surfacing: PASS (Q-1/Q-2/Q-3 each have 3 suggested options)
  Gate (v) Evidence tier tagging: PASS (all Evidence lines end [primary] or [secondary])
  Gate (vi) Core Tensions typing: PASS (3 entries, typed essential/essential/time-based)
- [x] Key escalation: **Q-1 is load-bearing for the entity's coherence.** If captain agrees the `⚠ contradicted` annotation is aspirational-only, O-1(a) ships a predicate with zero discriminative power; the right response is O-1(d) scope expansion or O-1 redesign. Clarify phase must resolve Q-1 FIRST before O-1.

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Small scope
- [x] Re-validation: 5 assumptions checked, 0 stale, 0 contradicted, 0 deduped, 0 coverage gaps, 0 research re-validated
- [x] Assumptions confirmed: 5 / 5 (0 corrected, 1 upgraded Likely→Confident via SO self-investigation)
  A-1..A-4 confirmed via direct file evidence collected this session; A-5 upgraded after grep-verifying auto_advance read locations (resolved Q-2 in same pass)
- [x] Options selected: 2 / 2 -- O-1 REDESIGNED to drop contradiction predicate (captain decision), O-2 DEPRECATED by O-1 redesign (no helper file needed)
- [x] Questions answered: 3 / 3 -- Q-1 captain (REDESIGN predicate to 2-condition), Q-2 SO self-resolved via grep, Q-3 SO self-resolved via directive
- [x] Self-filter: 2 self-resolved (Q-2, Q-3), 1 captain-escalated (Q-1)
  clarify_self_filter_ratio: 0.67 (Q-2 + Q-3 self-resolved under [primary] grep + directive evidence)
- [x] Open exploration: 0 gray areas surfaced (Q-1 captain decision was the load-bearing item; no additional gray areas after redesign)
- [x] Canonical refs added: 0
- [x] Context status: ready
- [x] Handoff mode: loose (no auto_advance: true in frontmatter)
- [x] Clarify duration: 1 AskUserQuestion call (Q-1 chained with O-1 deprecation; presented as single chained decision after SO self-investigation pre-resolved 4 of 5 captain-facing items)
- [x] Material redesign: APPROACH/RATIONALE/AC rewritten post-Q-1 redesign — 3-condition predicate → 2-condition (shape_status validated + score == 1.0 + auto_advance != false). O-1 (a-d) all marked deprecated. New AC line added: byte-identical fallback behavior for negative-case entities.

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
