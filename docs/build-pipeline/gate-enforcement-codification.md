---
id: 110
title: Gate Enforcement Codification -- Codify Plan 95% + Pre-Ship 90% Gates Into Skills
status: clarify
context_status: ready
source: captain directive (2026-04-15 post-107 ship review)
created: 2026-04-15T17:45:00+08:00
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
depends-on: [107]
---

## Directive

Spacedock currently has TWO confidence gates that diverge in enforcement rigor; codify both into skill-level protocol so they survive FO session turnover:

### Gap 1 — Plan-stage auto-advance (>95%) is tribal knowledge only

- Documented in `docs/build-pipeline/README.md:73-74` as comment
- Documented in MEMORY `fo-confidence-autoadvance.md`
- **NOT codified in `skills/build-plan/SKILL.md`** — no mandatory Skill() call, no 95% check step
- Current state: FO honors it when FO remembers to read the MEMORY note. Entity 107 (2026-04-15) correctly gated at 94%, but a different FO instance without MEMORY access would silently advance

### Gap 2 — Pre-ship 90% gate has spec but no enforcement lever

- Fully spec'd in `references/confidence-gate.md` (387 lines, 5-factor composite, auto-fix loop, block-on-fail)
- FO shared-core documents integration at `references/first-officer-shared-core.md:319-343`
- **NOT wrapped as a callable skill** — FO has to read 2 reference docs and implement the parsing + scoring + auto-fix dispatch inline
- Current state: FO 107 session skipped this gate entirely at ship time (0.82 UAT confidence conflated with 5-factor composite; merge proceeded without 76.25% composite computation). Retroactive `## Confidence Assessment` written to archived entity 107 after ship documents the skip.

### Proposal — one skill, two invocation points

Create `skills/confidence-gate/SKILL.md` with two modes:
- `mode: plan_gate` — input: entity path; output: YAML `{confidence: 0-100, factors: [...], verdict: auto-advance|captain-gate}`. Called by `spacedock:build-plan` Step N (new step) as mandatory unconditional call after plan-checker passes. Uses 5-factor scoring adapted for plan stage (context completeness / scope clarity / risk / precedent / AC testability — the MEMORY factors).
- `mode: pre_ship_gate` — input: entity path; output: YAML `{composite: 0-100, factors: [...], verdict: advance|auto-fix|block}`. Called by `spacedock:first-officer` shared-core UAT→shipped transition as mandatory unconditional call. Uses the current `confidence-gate.md` 5-factor spec.

Both modes must:
- Write `## Confidence Assessment` section to entity body (same schema; `Stage: plan|pre-ship` field distinguishes)
- Append to `_index/CONTRACTS.md` per workflow-index unconditional-append rule (`skills/confidence-gate/SKILL.md` row + Stage Report integration)
- Include contract test fixtures in `tests/pressure/confidence-gate-*.yaml`

### Follow-on

- Update `skills/build-plan/SKILL.md` Step 0.6 (right after plan-checker) with unconditional `Skill("spacedock:confidence-gate", "mode: plan_gate")` call
- Update `skills/first-officer/...` or `references/first-officer-shared-core.md:319` to reference the skill invocation instead of inline spec
- Retire `references/confidence-gate.md` (or collapse to skill internals) once ported
- Port MEMORY `fo-confidence-autoadvance.md` into skill front-matter

## Captain Context Snapshot

Captain raised this 2026-04-15 in the same session that shipped entity 107. Question: "Confidence Auto-Advance 的設計目前有落實到 workflow 中嗎?" Answer surfaced the two-gate divergence. Captain chose C (both retroactive 107 Confidence Assessment + seed this entity).

Ship of 107 itself validated the gap: FO session skipped pre-ship 5-factor gate entirely, captain B-path ship at UAT 0.82 (not composite) became the actual decision mechanism. Retroactive composite computed at 76.25% — below 90% threshold — documenting protocol debt honestly.

Parent context:
- `docs/build-pipeline/_archive/plan-checker-multi-angle-nuwa.md` § Confidence Assessment (retroactive section with gate-skip disclosure)
- MEMORY `fo-confidence-autoadvance.md`
- `references/confidence-gate.md` (existing 387-line spec to port)
- `references/first-officer-shared-core.md:319-343` (existing FO integration point)

## Expected scope hints

- 1 new skill directory (`skills/confidence-gate/`) with SKILL.md + 2 mode references + contract tests
- 2-3 skill integration edits (build-plan SKILL.md, first-officer shared-core or skill file)
- 1 retire + redirect of `references/confidence-gate.md`
- 1 MEMORY update to mark `fo-confidence-autoadvance.md` as superseded-by-skill

Scale: Medium. Intent: feature (enforcement hardening of existing spec).

## Goal Check

You are asking for: codify the two existing-but-unenforced confidence gates (plan-stage 95% + pre-ship 90%) as a single callable skill so future FO instances enforce them automatically without depending on tribal MEMORY notes.

- **Problem being solved**: gate enforcement currently depends on FO remembering to read MEMORY/reference docs; entity 107 proved this fails in practice (pre-ship gate skipped entirely, plan gate honored only because captain happened to challenge at 94%).
- **Expected outcome**: `skills/build-plan` and `skills/first-officer` make unconditional `Skill("spacedock:confidence-gate", mode=...)` calls; both gates produce uniform `## Confidence Assessment` entity-body sections; `references/confidence-gate.md` retires; MEMORY note marked superseded.
- **Explicit non-goals**: not redesigning the 5-factor formulas themselves; not re-deriving plan-stage thresholds from data; not introducing new gate stages beyond the two existing ones (needs clarification -- deferred to explore).

## Lens Evidence

### Lens (a) captain-stated-intent

- Two confidence gates diverge in enforcement rigor; both must be codified into skill-level protocol so they survive FO session turnover -- directive:verbatim [primary]
- Gap 1: Plan-stage auto-advance (>95%) is tribal knowledge only, not codified in `skills/build-plan/SKILL.md` -- directive:verbatim [primary]
- Gap 2: Pre-ship 90% gate is fully spec'd in `references/confidence-gate.md` but not wrapped as a callable skill -- directive:verbatim [primary]
- Proposal: create `skills/confidence-gate/SKILL.md` with two modes (`plan_gate` and `pre_ship_gate`) that share `## Confidence Assessment` schema -- directive:verbatim [primary]
- Follow-on: update build-plan SKILL.md Step 0.6 with unconditional `Skill()` call; update first-officer shared-core; retire `references/confidence-gate.md`; port MEMORY `fo-confidence-autoadvance.md` into skill front-matter -- directive:verbatim [secondary]

### Lens (b) captain-unstated-intent

- Implicit goal is "kill MEMORY-as-load-bearing-spec" — directive Gap 1 explicitly frames MEMORY dependence as the failure mode (`gate-enforcement-codification.md:34`) -- entity:110 [primary]
- Captain assumes contract-tests-cover-unconditional-calls MEMORY rule applies — Proposal says "unconditional Skill() call" twice, matching pattern verbatim -- entity:110 [primary]
- Captain assumes workflow-index unconditional-append contract is honored (line 51 cites it explicitly) -- entity:110 [primary]
- Captain expects entity 114 (build-alignment-gate, shipped 2026-04-16) as direct extraction-template precedent — same "spec in references/ → first-class skill" pattern -- entity:114 [primary]
- Dogfood validation follows fixes — captain expects next-shipped entity after 110 to exercise codified gate as live proof -- entity:107 [secondary]

### Lens (c) codebase-current-state

- `references/confidence-gate.md` is 360 lines (not 387 per directive); 10 sections are well-segmented and map cleanly to SKILL.md Steps with light restructuring -- references/confidence-gate.md:1-358 [primary]
- `references/first-officer-shared-core.md:319-343` inlines a 24-line "Pre-Ship Confidence Gate" procedure (read spec, parse 4 Stage Reports, compute 5-factor score, route on >=90%) — replaceable by single `Skill()` call -- references/first-officer-shared-core.md:319-343 [primary]
- `skills/build-plan/SKILL.md` has zero existing pre-ship gate references; new Skill() call needs a fresh Step (no slot to overwrite) -- skills/build-plan/SKILL.md [primary]
- `skills/build-alignment-gate/SKILL.md` (186 lines, entity 114) is structural template: name/description/user-invocable:false frontmatter, Tools split, Input Contract enumerating required entity sections, BLOCKED return on scope_gap -- skills/build-alignment-gate/SKILL.md [primary]
- `skills/confidence-gate/` directory does NOT exist (greenfield); `tests/pressure/confidence-gate-*` fixtures do NOT exist (greenfield) -- (file not found) [primary]
- Gap 1 distinction: directive's plan-time 95% gate uses 5 MEMORY factors (context completeness / scope clarity / risk / precedent / AC testability) which are MATERIALLY DIFFERENT from `confidence-gate.md`'s pre-ship factors (test/type/review/ac/integration). Single skill must host two distinct factor-sets. -- references/confidence-gate.md:23-166 [secondary]

### Lens (d) sibling-entity

- Entity 087 (pre-ship-confidence-gate, in-flight) is active writer of BOTH `references/confidence-gate.md` AND `references/first-officer-shared-core.md` — 110 must sequence after 087 ships or coordinate branch merge -- entity:087 [primary]
- Entity 114 (alignment-gate-promote-to-stage) is direct precedent: 7-task template (extract verbatim → README stages.states row → archive supersession annotation → smoke-test fixture → confidence reference correction). Mirror this structure. -- entity:114 [primary]
- `skills/build-plan/SKILL.md` has 3 concurrent writers: build-flow-tdd-discipline (in-flight), flatten-dispatch-troops-architecture (planned), plan-checker-multi-angle-nuwa (final 2026-04-15) — Step 0.6 insertion needs rebase coordination -- entity:plan [primary]
- Entity 061 (phase-e-plan-2-research-and-plan-skills) is `draft`; if it advances to redesign build-plan skill before 110 ships, 110 may rewrite against stale target -- entity:061 [secondary]
- Entity 114 also corrects `alignment_confidence` sourcing reference in `references/confidence-gate.md` Task 7 — direct adjacent edit surface, low conflict but worth checking -- entity:114 [secondary]

## Core Tensions

- **time-based**: entity 087 is in-flight introducing the very file (`references/confidence-gate.md`) that 110 plans to retire. 110 cannot start before 087 ships.
- **essential**: plan-stage 95% gate uses 5 different factors than pre-ship 90% gate — "one skill, two modes, same `## Confidence Assessment` schema" is achievable only if the schema generalizes over heterogeneous factor sets (Stage field + factor list of arbitrary length). Schema design is non-trivial.
- **domain-based**: skill codification (this entity) vs reference doc maintenance (entity 087/114) — overlapping authorities on confidence-gate.md until retire-or-collapse decision is made.

## Honest Boundaries

- This skill cannot validate whether plan-stage 5-factor scoring (context/scope/risk/precedent/AC-testability) actually correlates with downstream success — those factors come from MEMORY heuristic, not measured data.
- "Retire references/confidence-gate.md" is a downstream maintenance task: deletion vs stub-redirect is captain's call at clarify, not brainstorm's.
- Lens (b) inferences about captain expecting contract-test coverage are structural-only; not a guarantee captain wants pressure-test fixtures to land in the same entity vs deferred follow-on.

## Brainstorming Spec

**APPROACH**: Mirror entity 114's 7-task extraction template. Create `skills/confidence-gate/SKILL.md` as a two-mode skill (`mode: plan_gate` | `mode: pre_ship_gate`) that owns scoring, `## Confidence Assessment` section emission, and routing decisions for both gates. The skill exposes a uniform output schema (`Stage: plan|pre-ship`, `Factor` table with arbitrary factor list, `Composite`, `Verdict`, `Iteration`). Step 1 (sequence after entity 087 ships): port `references/confidence-gate.md` content into the SKILL.md body (Steps for parse → score → write → route → auto-fix). Step 2: add a NEW plan-stage scoring section using the 5 MEMORY factors (context-completeness / scope-clarity / risk / precedent / AC-testability) with placeholder weights (needs clarification -- deferred to explore). Step 3: insert unconditional `Skill("spacedock:confidence-gate", "mode: plan_gate")` call in `skills/build-plan/SKILL.md` Step 0.6 (after plan-checker passes). Step 4: replace lines 319-343 of `references/first-officer-shared-core.md` with single `Skill()` invocation reference. Step 5: retire `references/confidence-gate.md` to a 5-line stub redirecting to `skills/confidence-gate/SKILL.md` (deletion is captain decision at clarify). Step 6: add CONTRACTS.md row + pressure-test fixture per workflow-index unconditional-append rule. Step 7: annotate MEMORY `fo-confidence-autoadvance.md` as superseded-by-skill (do not delete — historical context valuable).

**ALTERNATIVE**: Two separate skills — `skills/plan-confidence-gate/` and `skills/pre-ship-confidence-gate/`. Each has a single mode, single factor set, dedicated SKILL.md. Avoids the heterogeneous-schema tension and lets each skill evolve independently. -- D-01 rejected because captain explicitly proposed "one skill, two invocation points" (line 44) and uniform `## Confidence Assessment` schema (line 50); two-skill split would also duplicate the auto-fix loop logic (currently shared in references/confidence-gate.md §7) and complicate workflow-index CONTRACTS rows (two skill files instead of one).

**GUARDRAILS**:
- MUST sequence after entity 087 (pre-ship-confidence-gate) ships — 087 is the in-flight writer of both target reference docs (Lens (d) primary finding).
- MUST add unconditional `Skill()` call contract test per MEMORY `contract-tests-cover-unconditional-calls.md` — both `build-plan` Step 0.6 and `first-officer` shared-core call sites need fixtures.
- MUST follow workflow-index unconditional-append rule (`skills/confidence-gate/SKILL.md` row in CONTRACTS.md as part of skill creation, not deferred).
- MUST mirror entity 114's `user-invocable: false` frontmatter pattern — confidence-gate is FO-internal, captain never invokes directly.
- MUST preserve the 3-iteration auto-fix cap (existing `references/confidence-gate.md` §7e) verbatim — captain-escalation behavior is load-bearing.

**RATIONALE**: Single-skill two-mode design honors captain's explicit proposal and the entity 114 precedent (alignment-gate's multi-branch single-skill consolidation). Deferring plan-stage factor weights to explore lets the codebase grep for entity 107's retroactive 76.25% breakdown and any other empirical signal before committing numbers. The "sequence after 087" constraint is unavoidable architectural discipline, not a defect — overlapping in-flight writers on the same reference doc would force merge resolution either way.

## Acceptance Criteria

- `skills/confidence-gate/SKILL.md` exists with two `mode:` invocation paths, both producing `## Confidence Assessment` sections distinguishable by `Stage: plan|pre-ship` field (how to verify: `grep -E "^Stage: (plan|pre-ship)$" skills/confidence-gate/SKILL.md` matches both literals).
- `skills/build-plan/SKILL.md` contains an unconditional `Skill("spacedock:confidence-gate", "mode: plan_gate")` call inside a "No Exceptions" block (how to verify: `grep -A 2 "No Exceptions" skills/build-plan/SKILL.md | grep "spacedock:confidence-gate"` returns a match).
- `references/first-officer-shared-core.md:319-343` is replaced with a single `Skill()` invocation reference (how to verify: `wc -l < references/first-officer-shared-core.md` decreased by ≥20 vs current 387 lines AND `grep -c "Skill.*spacedock:confidence-gate.*pre_ship_gate" references/first-officer-shared-core.md` >= 1).
- Pressure-test fixture `tests/pressure/confidence-gate-plan-mode.yaml` and `tests/pressure/confidence-gate-pre-ship-mode.yaml` exist with valid YAML (how to verify: `bun -e "import yaml from 'yaml'; yaml.parse(Bun.file('tests/pressure/confidence-gate-plan-mode.yaml').text())"` parses without throwing).
- CONTRACTS.md `_index/CONTRACTS.md` contains a row for `skills/confidence-gate/SKILL.md` referencing entity 110 (how to verify: `grep "skills/confidence-gate/SKILL.md" docs/build-pipeline/_index/CONTRACTS.md` returns a match).
- MEMORY `fo-confidence-autoadvance.md` carries a "Superseded by" annotation pointing to `skills/confidence-gate/SKILL.md` (how to verify: `grep -i "superseded" /Users/kent/.claude/projects/-Users-kent-Project-spacedock/memory/fo-confidence-autoadvance.md` returns a match).

## Assumptions

### A-1: Entity 087 (pre-ship-confidence-gate) is SHIPPED, not in-flight

- **Confidence**: Confident (0.95)
- **Statement**: `references/confidence-gate.md` and `references/first-officer-shared-core.md:319-343` are stable post-merge. 110 does NOT need to sequence-after 087 — it can begin immediately. This contradicts Lens (d) primary finding.
- **Evidence**: git log `6eed99e feat(pipeline): add pre-ship confidence gate with 5-factor scoring (#41)` -- repo:main [primary]; CONTRACTS.md row "087 ✅ final" implied by archive presence -- docs/build-pipeline/_index/CONTRACTS.md [secondary]
  (⚠ Lens (d) brainstorm finding contradicted: entity 087 reported as "in-flight" was stale CONTRACTS read; cross-phase skepticism per build-explore Step 5.5 corrects to shipped.)

### A-2: Entity 114 (build-alignment-gate) is the structural template

- **Confidence**: Confident (0.95)
- **Statement**: `skills/build-alignment-gate/SKILL.md` (186 lines, shipped 2026-04-16) is the canonical extraction precedent. 110's `skills/confidence-gate/SKILL.md` mirrors its frontmatter (`user-invocable: false`), Tools split (no Agent / no AskUserQuestion), Input Contract pattern, and BLOCKED return contract.
- **Evidence**: skills/build-alignment-gate/SKILL.md (existing, 186 lines) -- Lens (c) primary [primary]; git log `db7dca6 feat(execute): alignment-gate-promote-to-stage task-1 -- create skill` -- repo:main [primary]; entity 114 frontmatter `user-invocable: false` mirrors expected confidence-gate frontmatter -- skills/build-alignment-gate/SKILL.md [secondary]

### A-3: Plan-stage 5 factors are explicitly enumerated in MEMORY

- **Confidence**: Confident (0.95)
- **Statement**: The plan-gate factor set is fully specified in MEMORY `fo-confidence-autoadvance.md`: (1) context completeness, (2) scope clarity, (3) risk level, (4) precedent strength, (5) AC testability. Per-factor weights are NOT specified (MEMORY says "average ≥ 95%" implying uniform 20% weights). This resolves brainstorm α marker on factor weights.
- **Evidence**: /Users/kent/.claude/projects/-Users-kent-Project-spacedock/memory/fo-confidence-autoadvance.md:18-23 enumerates 5 factors -- MEMORY [primary]; same source line "Average ≥ 95% = auto-advance" implies uniform weights -- MEMORY [primary]
  (✓ resolved by explore: α marker "plan-stage factor weights deferred" → uniform 20% per MEMORY default; confirmable by codebase grep)

### A-4: Entity 107 retroactive Confidence Assessment is the canonical fixture data

- **Confidence**: Confident (0.95)
- **Statement**: Entity 107's `## Confidence Assessment` section (composite 76.25%, post-ship retroactive) provides ready-made test fixture data covering all 5 pre-ship factors with cited evidence. Use verbatim as `tests/pressure/confidence-gate-pre-ship-mode.yaml` seed input.
- **Evidence**: docs/build-pipeline/_archive/plan-checker-multi-angle-nuwa.md `## Confidence Assessment` retroactive section -- archive [primary]; same section §"Gate skip disclosure" enumerates all 5 factors with weights -- archive [primary]

### A-5: `## Confidence Assessment` schema generalizes via `Stage` field + variable factor list

- **Confidence**: Likely (0.75)
- **Statement**: Existing schema (factor table + Composite + Verdict + Iteration) accommodates both modes by adding a `Stage: plan|pre-ship` field. Plan mode emits 5 MEMORY factors (uniform 20%); pre-ship mode emits 5 confidence-gate.md factors (25/20/20/20/15). Schema generalization is mechanical, not architectural.
- **Evidence**: references/confidence-gate.md:290-308 §8 schema -- references/ [primary]; MEMORY fo-confidence-autoadvance.md "Log the score in the Stage Report" suggests same physical schema can host plan-mode -- MEMORY [secondary]

### A-6: Pressure-test fixtures use existing `tests/pressure/` skill-creator format

- **Confidence**: Likely (0.70)
- **Statement**: New `tests/pressure/confidence-gate-{plan|pre-ship}-mode.yaml` follow the established skill-creator pressure-test convention used by plan-checker dim files (Q-3 entity 107 selected dedicated per-dim files). 110 mirrors that pattern.
- **Evidence**: docs/build-pipeline/_archive/plan-checker-multi-angle-nuwa.md Q-3 → Selected: A "dedicated per-dim files (6 per-dim haiku fixtures + 1 plan-checker-dim-3-synthesis fixture)" -- archive [primary]; tests/pressure/ exists per Lens (c) (file not found for confidence-gate yet) -- Lens (c) [secondary]

## Option Comparisons

### O-1: References/confidence-gate.md retire strategy

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **Stub-redirect** (5-line file pointing to skills/confidence-gate/SKILL.md) | Preserves backlinks from CONTRACTS, archived entities, FO docs; zero broken-reference risk | Slight maintenance overhead (stub + skill); historical revisions still searchable | Low | ✅ **Recommended** -- safest, mirrors entity 114 pattern (no source-of-truth file deleted) |
| **Full delete** | Clean repo; forces all consumers to use skills/confidence-gate | Breaks entity 107 retroactive assessment backlink (`per references/confidence-gate.md + references/first-officer-shared-core.md:319-343`); breaks any external docs/PRs referencing line numbers | Medium (migration sweep needed) | Viable but riskier |
| **Collapse to skill internals appendix** | Mid-ground: keep file but truncate to "see skill" pointer + version log | Awkward dual home; captain explicitly said "retire OR collapse" suggesting either-or | Low | Viable; subset of stub-redirect |

**Validation**: stub-redirect mirrors entity 114's archived-precedent annotation pattern; no design-doc invariant violated.

→ **Selected: Stub-redirect** (captain, 2026-04-16, interactive)

### O-2: MEMORY `fo-confidence-autoadvance.md` post-codification handling

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **Annotate as superseded, keep file** | Historical context preserved; future search hits find both old + new; consistent with MEMORY conventions ("never git-track, never delete except by user") | Two sources of truth coexist briefly until search ranking stabilizes | Low | ✅ **Recommended** -- captain MEMORY rule "never delete" + safe default |
| **Delete file** | Single source of truth; smaller MEMORY surface | Loses authorship lineage; violates global MEMORY discipline | Low | Rejected -- captain MEMORY conventions forbid this |
| **Move to memory/_archive/ subfolder** | Neat separation; preserves history; signals "no longer authoritative" | MEMORY system has no archive convention today; introducing one is scope creep | Medium | Viable but premature |

**Validation**: aligns with captain global CLAUDE.md MEMORY rule "auto-memory persists; only user explicitly removes."

→ **Selected: Annotate as superseded, keep file** (captain implicit -- recommendation accepted by default per global MEMORY conventions; flag for captain pushback at plan stage if disagreed, 2026-04-16)

### O-3: Plan-gate factor weights — uniform vs differential

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **Uniform 20%** (per MEMORY default) | MEMORY-spec compliant; zero captain-decision burden; mirrors fo-confidence-autoadvance.md "average ≥ 95%" literal | All factors weighted equally; risk-level (factor 3) is arguably more critical than precedent-strength (factor 4) | Low | ✅ **Recommended** -- ship MEMORY default; defer differential weights to follow-up entity if production data shows skew |
| **Mirror pre-ship weights (25/20/20/20/15)** | Single weight scheme across both modes; simpler skill code | Pre-ship weights are tuned for ship-time signals (test/type/review); plan-time signals (context/scope/risk) have no empirical mapping | Low | Rejected -- semantic mismatch |
| **Captain-tuned at clarify** | Captain expresses domain knowledge; weights become tuned | Requires captain decision now; no empirical data to inform tuning | Low (captain effort) | Viable -- escalate to clarify Q if captain prefers active tuning |

**Validation**: MEMORY explicitly says "average ≥ 95%"; uniform weights honor stated intent. Returns 5 scores trivially summable.

→ **Selected: Uniform 20%** (captain implicit -- recommendation accepted by default per MEMORY-spec compliance; tunable via ops.config.json `confidence_weights.plan_gate` if production data informs differential, 2026-04-16)

## Open Questions

### Q-1: Should `## Confidence Assessment` schema add a `Mode` field distinct from `Stage`?

- **Domain**: Organizational (schema design)
- **Why it matters**: A-5 assumes `Stage: plan|pre-ship` field is sufficient. But future expansion (e.g., "alignment_confidence" surfacing per entity 114, or a hypothetical mid-execute gate) might want `Mode: gate|advisory|retroactive`. Adding both fields now is cheap; adding later is migration cost.
- **Suggested options**:
  - Single `Stage` field (current A-5 assumption, YAGNI)
  - Both `Stage` and `Mode` fields (forward-compat)
  - Open-ended -- captain decides

→ **Answer: Single `Stage` field (YAGNI)** -- A-5 assumption confirmed authoritative; defer Mode field until concrete consumer surfaces (captain, 2026-04-16, interactive)

### Q-2: Plan-gate placement in build-plan SKILL.md — Step 0.6 vs new terminal Step

- **Domain**: Runnable (skill protocol ordering)
- **Why it matters**: Directive says "Step 0.6 (right after plan-checker)". Plan-checker currently lives at SKILL.md Step 6 (per recent commits). "Step 0.6" suggests early-phase but plan-checker is post-plan-write. Captain wording may have meant "right after plan-checker passes" semantically. Need exact insertion point.
- **Suggested options**:
  - Insert as new Step 7 (right after plan-checker Step 6, before Stage Report Step)
  - Insert as new Step 0.6 (literal directive text — but conflicts with current Step ordering)
  - Open-ended -- captain decides

→ **Answer: New Step 7 (after plan-checker Step 6, before Stage Report)** -- "Step 0.6" in directive interpreted as "right after plan-checker passes" semantically; Step 7 honors current SKILL.md ordering (captain, 2026-04-16, interactive)

### Q-3: Contract test scope — fixture YAML only, or live skill invocation test?

- **Domain**: Runnable (test discipline)
- **Why it matters**: GUARDRAILS says "MUST add unconditional Skill() call contract test". Contract tests in spacedock currently take two forms: (a) static YAML fixtures asserting expected schema (e.g., plan-checker dim fixtures), or (b) live `bun test` invoking the skill end-to-end. Both are "contract tests" in MEMORY parlance. Captain preference matters for scope sizing.
- **Suggested options**:
  - Static YAML only (lighter, matches plan-checker dim pattern)
  - Static YAML + 1 live invocation smoke test (heavier, deeper coverage)
  - Open-ended -- captain decides

→ **Answer: Static YAML fixtures only** -- mirrors plan-checker per-dim fixture precedent (entity 107 Q-3); two fixtures: `tests/pressure/confidence-gate-plan-mode.yaml` + `tests/pressure/confidence-gate-pre-ship-mode.yaml` (captain, 2026-04-16, interactive)

## Core Tensions

- **time-based**: ~~entity 087 in-flight~~ → corrected: A-1 confirms 087 shipped, no scheduling tension. Brainstorm Core Tension #1 obsoleted by explore evidence.
- **essential**: schema-generalization tension preserved -- plan-mode and pre-ship-mode share `## Confidence Assessment` physical layout but factor sets are semantically distinct. A-5 assumes the `Stage` field carries the distinction; Q-1 surfaces whether a separate `Mode` field is also warranted.
- **domain-based**: skill-codification authority (110) vs reference-doc maintenance (110 retires the doc itself) -- both happen in same entity, no cross-entity conflict, but O-1 must lock retire strategy before plan stage.

## Honest Boundaries

- This explore step did NOT verify that `skills/build-plan/SKILL.md` Step 0.6 placement (Q-2) is structurally feasible -- only that the directive text said "Step 0.6". Plan-stage task-1 must read current SKILL.md ordering and propose insertion point.
- Cross-phase skepticism applied to Lens (d) and surfaced one stale finding (087 in-flight → shipped). Other Lens findings re-verified inline; no further corrections needed.
- Plan-stage 5 MEMORY factors (A-3) lack empirical weight data — ship uniform per MEMORY default (O-3 recommended) but actual production data may inform tuning later. This is an acknowledged limitation, not a blocker.

## Stage Report: brainstorm

- [x] Mode: A (4-lens parallel dispatch)
- [x] Lenses dispatched: 4 (a/b/c/d)
- [x] Lens citations: 23 across 4 subsections (all tier-tagged)
- [x] Goal Check: emitted (3 bullets, 1 α marker on non-goals)
- [x] APPROACH claims: 7 (within 3-7 cardinality)
- [x] α markers: 2 (non-goals deferred + plan-stage factor weights deferred)
- [x] Core Tensions: 3 typed entries (time-based, essential, domain-based)
- [x] Honest Boundaries: 3 entries
- [x] Self-test gates: all pass (cross-lens recurrence ≥2 for 7/7 APPROACH claims; tier tags on all citations)
- Alignment gate: not run (deferred to FO post-handoff per entity 114)
alignment_confidence: N/A

## Stage Report: explore

- [x] Files mapped: 7 across contract + config layers
  contract: 2 (references/confidence-gate.md, references/first-officer-shared-core.md), config: 5 (skills/build-plan/SKILL.md, skills/build-alignment-gate/SKILL.md, MEMORY fo-confidence-autoadvance.md, archived entity 107, README.md)
- [x] Assumptions formed: 6 (Confident: 4, Likely: 2, Unclear: 0)
  A-1 to A-4 Confident via primary evidence; A-5 Likely (schema generalization untested in code); A-6 Likely (fixture format precedent applies)
- [x] Options surfaced: 3
  O-1 retire strategy (stub-redirect recommended); O-2 MEMORY annotation (annotate-keep recommended); O-3 plan-gate weights (uniform 20% recommended)
- [x] Questions generated: 3
  Q-1 schema Mode field; Q-2 Step 0.6 placement; Q-3 contract test scope
- [x] α markers resolved: 2 / 2
  α-1 (non-goals) → captain decides at clarify (kept as Q-implicit); α-2 (factor weights) → resolved via A-3 + O-3 uniform default per MEMORY
- [x] Scale assessment: confirmed Medium
  7 files mapped; 6 A + 3 O + 3 Q within Medium envelope; no decomposition signal
- [x] Research dispatched: 0 researchers (skipped -- pure codebase refactor, no external tech claims; A-3 factor weights resolved via MEMORY grep)

⚠ Mode B inline fallback used -- justified by 50%+ files already-read in brainstorm Lens (c/d) + 1 inline Bash batch covering recent decisions (Angle ii) and entity 107 retro data. Negative-space (Angle iv) skipped per Mode B contract. Plan-phase reviewers note this coverage gap.

Cross-phase correction: Lens (d) brainstorm finding "entity 087 in-flight" contradicted by git log evidence (commit 6eed99e shipped). A-1 documents the correction.

Self-test gate (Port 11): all 5 checks pass under Mode B modifier. Gate (i) cross-layer recurrence N/A in Mode B; gates (ii-v) verified.

## Stage Report: clarify

- [x] Open Questions resolved: 3 / 3 (Q-1 single Stage; Q-2 new Step 7; Q-3 static YAML only)
- [x] Options selected: 3 / 3 (O-1 stub-redirect captain-explicit; O-2 + O-3 captain-implicit per recommendation defaults)
- [x] Assumptions confirmed: 6 / 6 (A-1 to A-6, no captain pushback)
- [x] α markers final: 0 / 2 unresolved (both resolved during explore)
- [x] Sufficiency gate: PASS — all decisions captured with → Answer/→ Selected annotations; no new gray areas surfaced
- [x] Captain interaction: 1 AskUserQuestion batch (4 questions) — efficient cohort given pre-recommended evidence
- [x] Captain decisions tier: Q-1/Q-2/Q-3/O-1 explicit; O-2/O-3 implicit-by-default with audit annotations

Decision lineage:
- D-110-1: Single `Stage` field schema (no Mode); Q-1 captain explicit
- D-110-2: New Step 7 placement in build-plan SKILL.md (not literal "0.6"); Q-2 captain explicit
- D-110-3: Static YAML fixtures only (no live test); Q-3 captain explicit
- D-110-4: Stub-redirect for references/confidence-gate.md; O-1 captain explicit
- D-110-5: Annotate MEMORY fo-confidence-autoadvance.md as superseded (no delete); O-2 implicit recommendation accept
- D-110-6: Uniform 20% plan-gate weights (per MEMORY); O-3 implicit recommendation accept

Ready for FO handoff: confidence-gate skill scope frozen; 7-task plan template available from entity 114 precedent; entity 087 already shipped removes scheduling constraint; pressure-test fixture data available from entity 107 retroactive Confidence Assessment.
