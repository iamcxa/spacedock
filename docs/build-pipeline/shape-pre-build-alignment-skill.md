---
id: 103
title: "Shape skill -- pre-build alignment for user stories and scope validation"
status: plan
context_status: ready
source: captain architectural discussion (2026-04-14 SO session — split product alignment from technical execution via /shape skill + build integration)
created: 2026-04-14T21:30:00+08:00
started: 2026-04-15T11:30:00+08:00
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-shape-pre-build-alignment-skill
issue:
pr:
intent: feature
scale: Medium
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
depends-on: []
---

## Directive

Build a `/shape` skill that runs BEFORE `/build` for Medium+ entities, producing a validated "shape artifact" (user stories + scope boundary) that `/build --from {shape-slug}` consumes as enrichment. Keep the existing build pipeline (brainstorm → explore → clarify → plan → execute → ...) intact — `/shape` is a **pre-processor skill**, not a new pipeline, not a replacement for SO.

The core design problem: current `/build` jumps straight to technical brainstorming (APPROACH / ALTERNATIVE) without first confirming "what are we building". For Medium+ features, this wastes clarify cycles on late-discovered direction changes. For Small tasks, shape is overkill. Solution: pull front-end alignment out as an **optional, captain-invoked skill** — `/shape` answers "what", `/build` answers "how", and they're complementary (not interchangeable).

### Scope — three concrete changes

1. **New skill `skills/build-shape/SKILL.md`** (user-invocable, registered as `/shape`)
   - Interactive captain-in-the-loop flow producing a shape artifact written into entity body sections: `## Problem Statement`, `## User Stories` (in literal "As a {role}, I want {action}, so that {value}" format), `## Scope: In`, `## Scope: Out`, `## References`.
   - Stage names (conceptual, internal to skill): `assume → imagine → align → ship`. Distilled from **Basecamp Shape Up** (pitch structure: problem / appetite / solution / rabbit-holes / no-gos) and **GSD `/gsd-discuss-phase`** (adaptive questioning). Provenance claim of "superpowers brainstorming" dropped — stage names are aesthetic, the real distillation sources are Shape Up + GSD.
   - Dispatches **3 context-isolated subagents** as thin wrappers (see `MEMORY.md :: Thin Wrapper Agent Pattern`):
     - `build-shape-framer` (opus — hard synthesis): proposes 2-3 problem-statement candidates.
     - `build-shape-story-gen` (sonnet — templated output): proposes 3-5 user stories per accepted frame.
     - `build-shape-scope-drafter` (sonnet — constrained output): proposes in/out scope boundary.
   - Skill body (not subagents) owns all captain interaction via `AskUserQuestion`. Subagents do generative heavy lifting; skill synthesizes + asks.
   - **Escape hatch (Step 1)**: heuristic detects Small/bugfix-level directives and exits with "shape unnecessary — run `/build` directly" recommendation. Do not force shape on tasks that don't benefit.
   - **Immutable-pitch discipline** (Shape Up): once an entity's shape is validated (`shape_status: validated`), captain who wants to revise opens a NEW entity with `supersedes: {old-slug}` — do not mutate in-place. Reshape-mid-build is explicitly out of scope for v1.
   - **Decomposition boundary**: if shape session reveals the directive is actually N features, emit a "decomposition recommended" verdict and exit — do not decompose inside shape. Build-pipeline's existing decomposition gate (downstream) owns that responsibility.

2. **Micro-tweak `skills/build-brainstorm/SKILL.md` Step 2 — Goal Check emission**
   - Before emitting `APPROACH`, emit a short `## Goal Check` block: one-sentence restatement of what captain asked for + 3 bullets (problem being solved / expected outcome / explicit non-goals).
   - Rationale: surfaces product-level misalignment in the first 150 words of brainstorm output, so captain can course-correct (or escape to `/shape`) before wasting clarify cycles on a technical spec aimed at the wrong target.
   - Scope: ~50 line edit to SKILL.md, no new references needed.
   - Applies to both `/build` (no shape) and `/build --from` (shape already done) paths — Goal Check with shape present becomes a 2-line sanity cross-check.

3. **`/build --from {shape-slug}` integration**
   - `skills/build/SKILL.md` Phase II accepts `--from {slug}` flag. When present, reads the entity's shape sections (`## Problem Statement`, `## User Stories`, `## Scope: *`) and passes them to build-brainstorm as enriched context.
   - `skills/build-brainstorm/SKILL.md` Step 1 gains a new sub-step **1f (shape artifact consumption)**: parallel to 1a-1e (issue / entities / session / git / timestamp). When shape present, brainstorm's APPROACH must reference specific user stories by number (traceability).
   - `skills/build-clarify/SKILL.md` gains a branch: when shape section present in entity, skip product-level assumption category during clarify (user stories already settled in align stage). Only technical-layer assumptions get clarified.

### Entry pattern (captain-driven, not auto-routed)

- Captain types `/shape "raw directive"` → skill creates entity with `shape_status: draft`, runs interactive loop, commits entity with `shape_status: validated` on success.
- Captain types `/build --from {slug}` (or triggers FO dispatch) → build pipeline proceeds with shape artifact in hand.
- Captain types `/build "raw directive"` → classic path, unchanged behavior (no shape, no regression).
- No automatic "build detects shape needed" logic in v1 — captain's judgment, 3-second decision. Add auto-routing later only if the manual path shows friction.

### Entity creation responsibility

Both `/shape` and `/build` can create the `docs/build-pipeline/{slug}.md` entity. They differ only in whether body sections `## Problem Statement` / `## User Stories` / `## Scope: *` exist at creation time. Treat as two entry points to the same state machine.

### Frontmatter addition: `shape_status`

New field `shape_status: draft | validated | n/a` mirrors `context_status` state-machine pattern. Transitions:
- `/shape` creates entity → `shape_status: draft`
- `/shape` align stage passes → `shape_status: validated`
- `/build` creates entity directly (no shape path) → `shape_status: n/a`
- Update `docs/build-pipeline/README.md` schema section + dashboard/status-script parsing as needed.

### SO position — unchanged

Science Officer persona does NOT disappear. SO still owns brainstorm → explore → clarify for all entities. Medium+ entities with a prior shape artifact simply experience a shorter clarify stage (product-level category skipped). Small entities continue through SO exactly as today.

### Forge discipline (captain directive 2026-04-14)

Skill development MUST use **kc-plugin-forge** TDD workflow: write acceptance criteria (golden inputs → expected artifact structure) first, capture real directives as fixtures, iterate skill body against fixtures until green. **Do not write SKILL.md free-hand.**

Initial 4 forge fixtures covering scale × type diversity:
- **F-1 Large UI**: entity 100 `spacebridge-cloud-collaborative-warroom` (existing Large, UI-heavy, cross-domain)
- **F-2 Large runtime**: entity 101 `graft-runtime-overlay` (Large, runtime architecture)
- **F-3 Medium feature**: TBD — pick one from recent shipped/active Medium entities (explore stage identifies a representative sample)
- **F-4 Small/bugfix directive**: synthetic minimal directive to verify escape-hatch exit ("fix typo in README", "bump dep version")

### Out of scope (explicitly rejected during design discussion)

- `/commission` -based spacedock workflow for shape (rejected — dual-pipeline sync, captain-interactive ≠ pipeline stage)
- Plan artifact extraction to separate file (rejected — cosmetic benefit only; entity body is single source of truth)
- `/build` auto-detecting shape need (rejected v1 — captain's judgment drives routing; revisit later if manual path shows friction)
- SO removal (rejected — captain retreated, build flow stays intact)
- Decomposition awareness inside `/shape` (rejected — build-pipeline decomposition gate owns it)
- Reshape-mid-build (rejected v1 — Shape Up immutable-pitch discipline; open new entity with `supersedes`)
- Entity 102 brainstorm-dual-lens archival (deferred — keep, re-evaluate after shape v1 has been used)

### Deferred to v2

- Shape artifact staleness detection (shape written weeks ago → warn before build)
- Shape sections surfaced in PR descriptions (traceability to user stories in merged code)
- Dashboard treatment of `shape_status` (status pill on entity detail page)
- Cross-entity shape conflict detection (shape A and shape B overlap scope)

## Captain Context Snapshot

- **Repo**: main @ b9c78ab
- **Session**: SO pipeline session (2026-04-14). After resuming from phantom handoff `2026-04-14/21-12-52-184154` (described decomposition work that was never committed — commits `decompose(103)` and `brainstorm(104-108)` do not exist anywhere in git), captain redirected twice: (1) from `/commission` -as-workflow back to skill-based design, (2) scoped down to the three concrete changes above. Immediately prior 103 entity (`build-shape-pre-build-shaping-flow.md`) exists only on `backup/brainstorm-dual-lens-pre-rebase` branch — treat as reference context, not active work.
- **Domain classification**:
  - **Runnable / Invokable** — new `/shape` slash command + 3 subagents.
  - **Readable / Textual** — shape artifact sections embedded in entity body.
  - **Skill-surface** — edits to 3 existing skills (build, build-brainstorm, build-clarify).
- **Scope flag**: ⚠️ likely-decomposable — triggered by directive length (>3 sentences) + multi-domain classification (Runnable + Readable + Skill-surface). Captain has indicated monolithic intent during design discussion (rejected `/commission` workflow split; scoped to three concrete changes); explore/clarify to confirm or reconsider whether to split into (a) `/shape` skill + subagents, (b) build/brainstorm/clarify integration edits, (c) forge fixture + test infrastructure.
- **Related entities**:
  - Entity 102 `brainstorm-dual-lens-cross-entity-dedup` — shape may reduce its scope (product-level dedup is now shape's job); deferred archival decision.
  - Entity 100 `spacebridge-cloud-collaborative-warroom` — planned first forge fixture (Large/UI).
  - Entity 101 `graft-runtime-overlay` — planned second forge fixture (Large/runtime); currently `context_status: awaiting-clarify`.
  - Entity 095 (shipped) `pipeline-ui-review-stage` — surfaced the underlying gap (product-level spec missing in current pipeline).
  - Prior 103 on backup branch — pre-pivot reference for brainstorming spec + 6 assumptions + 2 options + 2 open questions.
- **Captain preferences applied** (from MEMORY.md):
  - `Thin Wrapper Agent Pattern` — 3 subagents as minimal wrappers (~15-22 lines each), not full orchestrators.
  - `Brainstorm Model Policy` — framer opus, story-gen sonnet, scope sonnet.
  - `SO→FO Session Boundary` — `/shape` is captain-driven in one session; FO execution in another session.
  - `Assumption Presentation` — explore stage must present assumptions as full-text blocks with evidence, not compressed.
  - `Research Threshold` — dispatch researchers for Likely+ (0.50+) assumptions.
  - Forge usage mandatory for skill work (2026-04-14 directive).
- **Created**: 2026-04-14T21:30:00+08:00

## Goal Check

You are asking for an optional pre-build `/shape` skill that captures product-level intent (problem framing, user stories, scope boundary) into entity body sections, consumed by `/build --from {slug}` as enrichment, without disrupting the existing build pipeline.

- **Problem being solved**: `/build` jumps straight to technical brainstorming without first confirming product direction; Medium+ entities waste clarify cycles on late-discovered direction changes, while Small tasks that don't need shape should retain the current fast path.
- **Expected outcome**: captain types `/shape "{directive}"` when a Medium+ feature needs alignment → validated sections appear in entity body → `/build --from {slug}` enriches brainstorm with specific user stories → fewer product-level clarify rounds. Small tasks bypass shape entirely via the escape-hatch.
- **Explicit non-goals**: does NOT replace SO pipeline stages; does NOT auto-route from `/build` (captain drives routing); does NOT decompose multi-entity directives (delegate to build-pipeline decomposition gate); does NOT allow reshape-mid-build (immutable-pitch discipline — open new entity with `supersedes`); does NOT touch plan artifact storage or code-execution stages.

## Brainstorming Spec

**APPROACH**: Add a new leaf skill `skills/build-shape/SKILL.md` registered as `/shape` via `user-invocable: true` frontmatter (pattern used by 11 existing slash-command skills) (✓ confirmed by explore: 11 skills match — build, build-clarify, build-distill, commission, dashboard, first-officer, graft, overhaul, refit, science-officer, uat-resume). The skill runs a 4-step internal flow (`assume → imagine → align → ship` as internal steps, NOT pipeline stages — provenance: Basecamp Shape Up pitch structure + GSD `/gsd-discuss-phase` adaptive questioning) with three context-isolated subagent wrappers dispatched via the Agent tool: `build-shape-framer` (opus — hard synthesis, proposes 2-3 problem statements), `build-shape-story-gen` (sonnet — templated output, generates 3-5 user stories per accepted frame), `build-shape-scope-drafter` (sonnet — constrained output, drafts in/out scope). Skill body owns all captain `AskUserQuestion` interaction; subagents do generative heavy lifting. Output written as entity body sections (`## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References`) plus a frontmatter transition `shape_status: draft → validated`. Step 1 heuristic escape-hatch: Small/bugfix-level directives trigger early exit with "shape unnecessary — run `/build` directly" recommendation. Companion micro-edits to `skills/build/SKILL.md` (accept `--from {slug}` flag, load shape sections), `skills/build-brainstorm/SKILL.md` (add Step 1f shape consumption; activate the Step 2.5 Goal Check shape-present cross-check branch — stub already shipped in commit `06d2329`) (✓ confirmed by explore: skills/build-brainstorm/SKILL.md:103-109 contains the Shape-present cross-check mode stub) (⚠ rebased 2026-04-15 -- entities 104/105 shipped while 103 was in clarify; build-brainstorm's Step 1 is now "Lens Collection (Mode A/B)" with 1a-1e sub-steps removed in favor of 4 parallel lens subagent dispatches. The "add Step 1f" phrasing is obsolete: shape sections instead feed into Lens (a) captain-stated-intent as [primary] tier citations when `--from` is passed. See A-7. Step 2.5 Goal Check stub remains at SKILL.md:203 and the shape-present cross-check branch activation is unaffected by this restructure.), and `skills/build-clarify/SKILL.md` (skip product-level assumption category when shape section present in entity) (⚠ contradicted: no such named "product-level assumption category" exists in build-clarify today; this is a net-new conditional branch whose predicate needs definition -- see Q-2). Schema update to `docs/build-pipeline/README.md` adds `shape_status: draft|validated|n/a` field. Forge discipline: skill developed via `kc-plugin-forge` TDD (✓ confirmed by explore: kc-plugin-forge installed at `/Users/kent/.claude/plugins/local/kc-plugin-forge/` with skills/ + smoke-tests/ + reference/ subdirectories) — 4 golden fixtures covering scale × type diversity (F-1 entity 100 Large/UI, F-2 entity 101 Large/runtime, F-3 Medium feature TBD from explore, F-4 synthetic Small bugfix for escape-hatch regression) (⚠ contradicted: forge convention is `smoke-tests/{skill}.smoke.yaml` at plugin root with `skill/trigger/timeout/assertions` schema, NOT `tests/forge/build-shape/*.yaml` -- fixture location + format need resolution, see O-1).

**ALTERNATIVE**: Ship `/shape` as a full spacedock workflow via `/commission`, producing a peer `docs/shape-pipeline/` with its own README, `assume/imagine/align/ship` as real pipeline stages (not internal steps), FO dispatch, and mod system. -- D-01 Rejected during design discussion (2026-04-14): (a) dual-pipeline sync problem — shape pipeline ↔ build pipeline state coordination, entity-ID namespace collision, cross-pipeline status awareness; (b) `align` stage is fundamentally captain-in-the-loop conversation — forcing it into FO-dispatch semantics creates impedance mismatch (FO stops and waits on `AskUserQuestion` calls, which is not a natural FO/ensign primitive); (c) workflow machinery overhead (separate README, status script, first-officer agent, mod hooks) pays no dividend when a shape "workflow run" has exactly one entity per run with no parallel stage execution. Skill + subagents carries the same interaction shape with ~10% of the scaffolding cost.

**GUARDRAILS**:
- New skill MUST follow forge TDD workflow (`kc-plugin-forge`) — write golden fixtures FIRST, iterate SKILL.md against fixtures until green (captain directive 2026-04-14).
- Subagents MUST be thin wrappers per `MEMORY.md :: Thin Wrapper Agent Pattern` (~15-22 lines per agent MD file, loading `kc-plugin-forge` or other skill plugins for actual logic).
- Shape artifact storage is entity body sections — do NOT create `docs/_shapes/` subdirectory or separate artifact files (rejected in design; single-source-of-truth entity body).
- `/shape` and `/build` share the same entity state machine; `shape_status` transitions are additive to `context_status`, not a replacement — both fields coexist.
- NEVER modify existing SO pipeline stages beyond the three documented micro-edits (build, build-brainstorm, build-clarify); no cascading skill-contract changes.
- Immutable-pitch discipline enforced at skill level: once `shape_status: validated` is committed, `/shape` refuses to rerun on the same entity — returns "use `supersedes: {old-slug}` on a new entity" recommendation.
- Forge fixtures MUST include at least one Small/bugfix directive to verify escape-hatch works (regression safety — shape must not force itself on tasks it's not designed for).
- **Build-light / shape-deep division-of-labor** (captain 2026-04-15): `/build` is the light, automation-friendly thinking flow — captain or FO can trigger it; minimal captain interaction; fast path. `/shape` is deep, captain-interactive focus on product-level thinking. The two flows serve different cognitive modes and MUST NOT converge: do not add captain-interactive steps into `/build`, do not add auto-dispatchable steps into `/shape`. This invariant makes the concurrent-invocation race (Q-1) impractical — normal usage is sequential (`/shape` captains a session to validation; `/build --from` is the lighter follow-up), never simultaneous.

**RATIONALE**: The skill+subagents approach isolates captain-interactive work from agent-dispatch work at the right architectural layer. Build-pipeline's value is agent-dispatched execution (execute/quality/review/uat/ship are naturally stage-shaped); shape's value is captain-in-the-loop alignment (inherently conversation-shaped). Making shape a pipeline would force it to pretend to be stage-shaped; keeping it as a skill preserves the existing build pipeline's agent-dispatch optimization. The three micro-edits are the minimum necessary integration surface — adding shape adds exactly those three integration points, no cascading changes. The already-shipped Goal Check commit (`06d2329`) is the prototype for this surgical-edit discipline. Forge TDD on the new skill (not on existing ones) keeps test discipline local to net-new behavior, matching the captain's 2026-04-14 directive that skill work MUST use forge.

## Acceptance Criteria

- Given a raw Medium+ directive, when captain invokes `/shape "{directive}"`, then the skill creates a new entity at `docs/build-pipeline/{slug}.md` with `shape_status: draft` and an interactive loop begins (how to verify: grep entity file for `shape_status:` frontmatter and `## Problem Statement` section after invocation)
- Given a shape session completes successfully, when the internal ship step finalizes, then the entity frontmatter transitions `shape_status: draft → validated` and body contains all 5 required sections in order: `## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References` (how to verify: parse frontmatter + `grep -n '^## '` to confirm section order)
- Given a Small/bugfix-level directive (e.g., "fix typo in README", "bump dep version X to Y"), when `/shape "{directive}"` is invoked, then the skill emits an escape-hatch message recommending `/build` directly and exits without creating an entity (how to verify: invoke with small directive fixture, assert no entity file created, assert recommendation message in stdout)
- Given an entity with `shape_status: validated`, when `/build --from {slug}` is invoked, then build-brainstorm's Step 1f reads the entity's shape sections and the resulting APPROACH paragraph references at least one user story by number (how to verify: diff brainstorm output with vs without `--from`; with `--from`, APPROACH contains at least one `US-{n}` or `user story {n}` citation)
- Given an entity with `shape_status: validated`, when `/shape "{same directive}" {slug}` is re-invoked on the same entity, then `/shape` refuses to rerun and emits the immutable-pitch recommendation with the `supersedes:` pattern (how to verify: second invocation — assert refusal message, assert entity body unchanged via `git diff HEAD` returns empty)
- Given `kc-plugin-forge` TDD fixtures F-1 through F-4 (100, 101, one Medium TBD, one Small escape-hatch synthetic), when `skills/build-shape/SKILL.md` is developed, then all 4 fixtures pass forge acceptance checks before the skill is considered ship-ready (how to verify: `kc-plugin-forge validate skills/build-shape` with all 4 fixtures, assert exit code 0)

## Assumptions

A-1: Three subagent wrappers (`build-shape-framer`, `build-shape-story-gen`, `build-shape-scope-drafter`) will follow the canonical 15-22 line thin-wrapper agent pattern — minimal frontmatter (`name`, `description`, `tools`, `model`, `color`, `skills`), 1-line role statement, Boot Sequence, Namespace Note — preloading `spacedock:build-shape` as their skill.
Confidence: 🟢 Confident (0.95)
Evidence: agents/code-explorer.md:1-21 (21 lines, 1 skill preload, `tools: Read, Grep, Glob, Bash`); agents/researcher.md:1-17 (17 lines, adds `WebFetch, WebSearch`); agents/differential-review-reviewer.md:1-21; agents/sharp-edges-reviewer.md:1-21; agents/troop.md:1-21 (2 skill preloads). Template consistent across 5+ examples — pattern is canonical.
→ Confirmed: captain, 2026-04-15 (batch)

A-2: `/shape` registers as a slash command via `user-invocable: true` frontmatter on `skills/build-shape/SKILL.md`. No edits required to `.claude-plugin/plugin.json` — the plugin manifest has no `skills` array and skills are auto-discovered.
Confidence: 🟢 Confident (0.98)
Evidence: 11 existing user-invocable skills all register via frontmatter (build, build-clarify, build-distill, commission, dashboard, first-officer, graft, overhaul, refit, science-officer, uat-resume); `.claude-plugin/plugin.json:1-17` contains only `name`, `version`, `description`, `author`, `repository`, `license`, `keywords` — zero skill references.
→ Confirmed: captain, 2026-04-15 (batch)

A-3: New skill owns a `skills/build-shape/references/` subdirectory holding format specs (`output-format.md`, `fixture-format.md`, `dispatch-guide.md` etc.), consumed by the skill's steps via `Read`. Matches canonical reference-doc layout across spacedock skills.
Confidence: 🟢 Confident (0.90)
Evidence: skills/build-clarify/references/output-format.md, skills/build-explore/references/gray-area-templates.md, skills/build-explore/references/hybrid-classification-heuristic.md, skills/build/references/, skills/commission/bin/status — 5+ spacedock skills use the `references/` sibling-to-SKILL.md pattern.
→ Confirmed: captain, 2026-04-15 (batch)

A-4: New frontmatter field `shape_status: draft|validated|n/a` mirrors the existing `context_status` state-machine pattern at `docs/build-pipeline/README.md:272`. Additive to (not replacing) `context_status` — both fields coexist on entity frontmatter.
Confidence: 🟢 Confident (0.90)
Evidence: docs/build-pipeline/README.md:272 — `context_status` is an enum field with orthogonal-to-status semantics ("Tracks context maturity during draft/explore/clarify phases"); shape_status follows the same axis for a different lifecycle aspect (product-alignment maturity).
→ Confirmed: captain, 2026-04-15 (batch)

A-5: Entity body section format (`## Problem Statement` / `## User Stories` / `## Scope: In` / `## Scope: Out` / `## References`) is specified in a dedicated reference doc (proposed: `skills/build-shape/references/output-format.md`), making the format a contract that build-brainstorm's Step 1f (consumer) can parse against and that build-clarify's shape-present skip branch can detect against.
Confidence: 🟢 Confident (0.85)
Evidence: skills/build-clarify/references/output-format.md is the canonical single-source-of-truth for its section formats; build-explore does the same via its references directory. New skill should mirror.
→ Confirmed: captain, 2026-04-15 (batch)

A-6: `kc-plugin-forge` is installed locally and invocable — captain's 2026-04-14 directive ("skill work MUST use forge") is viable from current tooling inventory.
Confidence: 🟢 Confident (0.95)
Evidence: `/Users/kent/.claude/plugins/local/kc-plugin-forge/skills/kc-plugin-forge/SKILL.md` exists; plugin root has `skills/`, `smoke-tests/`, `reference/` subdirectories; `smoke-tests/kc-plugin-forge.smoke.yaml` demonstrates the `skill/trigger/timeout/assertions` fixture schema.
→ Confirmed: captain, 2026-04-15 (batch)

A-7 (added 2026-04-15 post-rebase on shipped 104/105): Shape sections (`## Problem Statement` / `## User Stories` / `## Scope: In` / `## Scope: Out` / `## References`), when present in an entity body via prior `/shape` invocation, feed into build-brainstorm's **Lens (a) captain-stated-intent** prompt template as [primary] tier citations. This supersedes the original "add Step 1f" design — 104's Lens Collection restructure made 1a-1e sub-steps obsolete, but Lens (a)'s purpose ("surface all explicit statements, constraints, and goals the captain stated in the directive") is a perfect fit for shape content, which is literally the captain's explicit intent in structured form. Integration point is a **single prompt-template extension**: when `/build --from {slug}` is invoked, the Lens (a) subagent prompt receives both the directive text AND the shape sections as input, tagged [primary] per the tier-weighting rule (shape sections ARE captain-authored artifacts, same tier as verbatim directive). No new Step, no restructure — just prompt-template extension.
Confidence: 🟢 Confident (0.92)
Evidence: `skills/build-brainstorm/SKILL.md:43-62` defines Lens (a) prompt template with "directive text (verbatim), acceptance criteria from entity file" as input materials and [primary] tier tag; extending this input to include shape sections when present is a one-line template edit. The tier weighting rule at `skills/build-brainstorm/SKILL.md:55` explicitly privileges captain-authored sources as primary. Shape is captain-authored. Natural fit.
→ Confirmed: captain, 2026-04-15 (batch)

## Option Comparisons

### O-1: Fixture convention for build-shape TDD

Given kc-plugin-forge uses `smoke-tests/{skill}.smoke.yaml` (schema: `skill/trigger/timeout/assertions`) while spacedock has `tests/pressure/{skill}.yaml` (schema: `test_cases` with `pressure` scenarios + `expected_answer`), which convention applies to build-shape?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Use kc-plugin-forge `smoke-tests/*.smoke.yaml` in the spacedock plugin root (+ reference-doc explaining the assertions strategy) | Matches captain's explicit 2026-04-14 directive ("use forge"); leverages forge's existing red/green pipeline (quality-pipeline.md, parallel-forge.md); directly aligned | smoke-tests schema is lightweight (assertions-only) and may not capture interactive-flow pressure nuance that shape's captain-loop requires | Medium | ✅ Recommended |
| Use spacedock native `tests/pressure/build-shape.yaml` convention | Leverages existing repo convention; captured-session format already documents captain interactions richly (pressure labels, correct_because citations) | Diverges from captain's explicit forge directive; no visible test runner in spacedock (tests/pressure/*.yaml have no CI hookup); would require building runner infra | Medium | Viable, rejected due to directive |
| Hybrid — forge smoke-tests for coarse assertions + pressure YAML for scenario richness | Covers both surfaces | Two fixture formats to maintain; unclear authority; defeats single-source-of-truth goal | High | Not recommended |

Recommendation rationale: captain's 2026-04-14 directive is explicit and forge is installed. smoke-tests schema is sufficient because build-shape's acceptance criteria ARE assertion-shaped (entity file exists / sections present / frontmatter transitions / escape-hatch text appears). Red-scenario richness, where needed, can be expressed via forge's red/green iteration (`not_contains` assertions for "should not fire on Small directives"). Design doc invariant cross-reference: entity 103 GUARDRAILS explicitly cite kc-plugin-forge — no deviation justified.

→ Selected: Forge smoke-tests (captain, 2026-04-15, interactive)

### O-2: Shape-skip branch location + predicate in build-clarify

Given build-clarify has no existing "product-level assumption category" (⚠ contradiction from Step 3.7), where should the shape-present conditional branch insert, and what specifically does it skip?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Step 2 filter (lines 145-177): when `shape_status: validated`, filter out any A-n assumption whose Evidence line cites an entity body section under `## Problem Statement` / `## User Stories` / `## Scope: *` | Minimal code change; preserves Step 1.5 Coverage Check logic; uses existing assumption data + a 1-line predicate | Requires explore to tag which assumptions are "product-level-derived" (new responsibility for explore — minor) | Medium | ✅ Recommended |
| Step 1.5 sub-check 1d template-skip (lines 130-141): when `shape_status: validated`, skip specific gray-area templates (problem-statement, user-story, scope-boundary) from application | Prevents assumption generation in the first place (vs filtering after) | Requires tagging product-level templates in `gray-area-templates.md` — cascading doc edits; template is the wrong granularity (a single template may have both product- and technical-level entries) | Medium-High | Viable |
| Step 3+ auto-answer: run full clarify, but auto-answer product-level questions with "validated by shape ({slug})" | Simplest code path | Wastes captain time watching auto-answers; doesn't actually shorten clarify | Low | Not recommended |

Recommendation rationale: Option 1 matches entity 103 Goal Check's expected outcome literally ("fewer product-level clarify rounds"). The predicate (Evidence cites `## Problem Statement` / `## User Stories` / `## Scope: *`) is mechanical and grep-able. Return-value trace: shape entity with `shape_status: validated` → Step 2 reads frontmatter → filters assumption list → captain sees only technical-layer assumptions. Design doc invariant cross-reference: captain's "build flow 保持現在流程" directive means Step 2 structure stays; Option 1 is a surgical filter, not a restructure.

→ Selected: Step 2 Evidence-filter (captain, 2026-04-15, interactive)

### O-3: build-distill skill relationship to build-shape

Should `build-shape` invoke the existing `spacedock:build-distill` skill for its framer/story-gen steps, or run inline via subagent dispatch?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Invoke `spacedock:build-distill` for problem-framing + user-story generation | Reuses existing distillation code; smaller net-new surface | build-distill's domain per its description is "compare an external skill system against a build-* skill to identify capability gaps" — completely different purpose; coupling would force build-distill to grow a 2nd purpose (bad) or produce misaligned output (worse); lifecycle mismatch (build-distill is meta-analysis, shape is authoring) | High | Not recommended |
| Dispatch 3 context-isolated subagent wrappers (framer opus / story-gen sonnet / scope sonnet) per entity 103 APPROACH | Fresh-context isolation; each wrapper's acceptance criterion is scoped + testable via forge; matches thin-wrapper pattern; captain-approved design | Net-new code surface (3 wrappers × 17-21 lines each = ~60 lines total) | Medium | ✅ Recommended |
| Run all synthesis inline in build-shape main skill body (no subagents) | Simplest code path | Pollutes build-shape's context with generation debris; subagent-level acceptance criteria become untestable; violates captain's explicit subagent-dispatch decision | Low | Not recommended |

Recommendation rationale: build-distill's purpose is meta-analysis (skill-system comparison) — using it for authoring would corrupt both skills. Captain's 2026-04-14 directive locked "3 subagent wrappers as thin wrappers per MEMORY.md pattern" — Option 2 is the only faithful execution. Return-value trace: `/shape {directive}` → skill Step 2 `Agent(spacedock:build-shape-framer)` → returns 2-3 problem candidates → skill AskUserQuestion → captain picks → skill Step 3 `Agent(spacedock:build-shape-story-gen)` with accepted frame → returns 3-5 stories → ... Shape stages produce clean handoffs between skill body and wrappers.

→ Selected: Inline 3 subagent wrappers (captain, 2026-04-15, interactive)

## Open Questions

Q-1: How are concurrent `/shape` and `/build` invocations on the same directive disambiguated?

(⚠ downgraded 2026-04-15: not a v1 blocker. Race condition exists but requires two simultaneous captain sessions — low real-world likelihood. Suggested options still apply; revisit if v1 shipping reveals actual collisions.)

Domain: Runnable / Invokable

Why it matters: Both commands create `docs/build-pipeline/{slug}.md` entities. If captain opens Session A with `/shape "feature X"` and Session B with `/build "feature X"` simultaneously (or within a few seconds), either (a) both sessions compute the same slug and one overwrites the other at commit time (git conflict), or (b) different slug normalizations produce two entities for the same logical feature. Captain explicitly raised parallel-session workflows in the earlier design discussion — this question decides whether v1 accepts the race or adds mitigation.

Suggested options: (a) **Accept race for v1** — document "do not run `/shape` and `/build` concurrently on the same feature" in both skills' headers; collision surfaces as a normal git merge conflict; (b) **Deterministic slug + write-lock** — slug is a hash of normalized directive text; second writer detects `{slug}.md` exists and fails with "already in progress"; (c) **Shape-owns-claim protocol** — `/shape` writes a `.claude-plugin/locks/{slug}.lock` marker; `/build` detects lock and waits or displays "shape session in progress for this directive — run `/build --from {slug}` after shape ships".

→ Answer: DEFERRED by captain, 2026-04-15 — race is impractical under the build-light / shape-deep division-of-labor invariant (see GUARDRAILS). Normal flow is sequential (`/shape` → `/build --from`), not concurrent. Re-open if a real collision surfaces post-v1. (captain, 2026-04-15, interactive)

Q-2: What is the precise predicate for "shape-present → skip product-level assumptions" in build-clarify?

Domain: Skill-surface

Why it matters: APPROACH treats "product-level assumption category" as if it's an existing named thing, but build-clarify has no such category (⚠ contradicted by Step 3.7 — see explore annotation on APPROACH). O-2 recommended Option 1 (Evidence-line-based filter), but the recommendation's viability depends on whether assumptions consistently cite entity body section headers in their Evidence lines. If not, the filter misses product-level items.

Suggested options: (a) **Evidence-line section-reference predicate** — filter any A-n whose Evidence cites `## Problem Statement` / `## User Stories` / `## Scope: *` (requires explore to tag evidence consistently); (b) **Explicit explore annotation** — build-explore marks product-level-derived assumptions with `[shape-covered]` tag; clarify filters on tag (explicit contract, explicit code); (c) **Keyword heuristic** — filter assumptions whose statement contains product-level keywords (user, role, scope, problem) — cheap but fuzzy, risks false positives on technical assumptions that happen to mention "user".

→ Answer: Section-cite predicate (captain, 2026-04-15, interactive). Consistent with O-2 selection. If build-explore's Evidence-line section-citation consistency proves unreliable in practice, plan stage is free to fall back to Q-2(b) [shape-covered] tag.

Q-3: Which shipped or active Medium-scale entity becomes the F-3 forge fixture (diverse-type third seed)?

Domain: Readable / Textual (test fixture identity)

Why it matters: Forge TDD requires scale × type diversity: F-1 Large UI (entity 100), F-2 Large runtime (entity 101), F-4 Small synthetic escape-hatch. F-3 must be Medium scale AND a type that doesn't overlap F-1 or F-2. Choosing poorly (e.g., another UI-heavy entity) creates a fixture coverage gap. Captain input most useful since captain has historical view of which shipped entities best represent the Medium tier.

Suggested options: captain input needed. Recent candidates from the build-pipeline: (a) **095 `pipeline-ui-review-stage`** (shipped, Medium, workflow-process type) — narrative continuity bonus: this is the entity that surfaced the shape gap; using it as F-3 closes a meaningful loop; (b) **083 `confidence-gate`** (shipped, Medium, automation type); (c) **093 `dashboard-feed-persistence`** (shipped, Medium, backend type); (d) **Captain picks** something off the active/archive roster with better first-hand knowledge.

→ Answer: 095 pipeline-ui-review-stage (captain, 2026-04-15, interactive). Narrative-continuity choice: 095 is the entity that surfaced the shape gap; using it as F-3 closes the loop.

Q-6 (added 2026-04-15 during Step 4.5 exploration): How should entity 103 handle the kc-plugin-forge external-plugin dependency?

Domain: Runnable / Invokable (operational dependency)

Why it matters: kc-plugin-forge is installed locally in Claude Code (`~/.claude/plugins/local/kc-plugin-forge/`), not vendored in spacedock repo. Contributors without it cannot run build-shape smoke-tests. Scope decision needed: does 103 solve install automation, just document the dep, or defer entirely?

Suggested options: (a) Document as prereq in SKILL.md header, install automation out of scope; (b) Bootstrap script inside 103 plan; (c) Vendor forge (rejected on plugin-ecosystem principle); (d) Defer to sibling entity.

→ Answer: (a) Document as prereq, out of 103 scope (captain, 2026-04-15, interactive). Plan stage must add a "Prerequisites" note to `skills/build-shape/SKILL.md` header stating the dep on kc-plugin-forge. Install automation (README setup instructions, bootstrap scripts, CI hookup) is a separate operational concern tracked as a future sibling entity — 103 stays focused on the skill + 3 wrappers + 3 integration edits + forge fixtures themselves.

Q-5 (added 2026-04-15 during Step 4.5 exploration): How should shape-vs-directive drift be handled when `/build --from {slug}` runs?

Domain: Runnable / Invokable (CLI contract + Lens (a) prompt input)

Why it matters: When a validated shape exists and captain later invokes `/build --from {slug}` — possibly with an additional directive that has drifted from shape's Problem Statement — Lens (a) could receive conflicting [primary] citations. Immutable-pitch discipline (Shape Up) says the shape IS the directive; any drift means captain is actually authoring a new pitch. The CLI contract decides whether drift is impossible-by-design, flagged, or accepted.

Suggested options: (a) **P-4 Immutable-pitch enforced**: `/build --from {slug}` accepts ONLY the slug, no extra directive text — cleanest; (b) **P-1 Shape wins**: extra directive text accepted but Lens (a) ignores it, warns in Stage Report; (c) **P-3 Both as [primary] + Core Tensions**: Lens (a) reads both, merge-gate (iii) flags drift as Core Tension; (d) **Defer to plan stage**.

→ Answer: P-4 Immutable-pitch enforced (captain, 2026-04-15, interactive). `/build --from {slug}` accepts ONLY the slug argument — no extra directive text permitted. Three canonical CLI paths: (1) `/build "raw directive"` → classic path, /build self-contained thinking, no shape; (2) `/shape "raw directive"` → captain-interactive deep flow, produces validated shape entity; (3) `/build --from {slug}` → reads validated shape, feeds Lens (a) as [primary], no additional directive allowed. Captain with new thinking post-validation must `/shape` again (new entity with `supersedes: {old-slug}`). Reinforces build-light / shape-deep division-of-labor GUARDRAIL.

Q-4 (added 2026-04-15 post-rebase on shipped 104/105): What is the canonical section ordering for an entity body that carries both shape sections AND the new Lens/Tensions/Boundaries sections introduced by shipped entities 104/105?

Domain: Readable / Textual (entity body section order contract)

Why it matters: After 104 (brainstorm-nuwa-distillation) and 105 (explore-nuwa-subagent-first) shipped, build-brainstorm now emits `## Lens Evidence`, `## Core Tensions`, `## Honest Boundaries` on top of the existing `## Goal Check`, `## Brainstorming Spec`, `## Acceptance Criteria`. When `/build --from {slug}` consumes a shape entity, the body will also carry `## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References`. Without a canonical order, build-brainstorm, build-explore, and build-clarify's section-lookup grep calls will drift, and human readers will see a chaotic entity body. Needs definition BEFORE plan stage so the integration can land cleanly.

Suggested options: (a) **Captain authoring → brainstorm output → explore output → clarify output, linearly**: `## Directive` → `## Captain Context Snapshot` → (shape sections: `## Problem Statement` → `## User Stories` → `## Scope: In` → `## Scope: Out` → `## References`) → (brainstorm: `## Lens Evidence` → `## Goal Check` → `## Brainstorming Spec` → `## Acceptance Criteria`) → (tensions/boundaries surface mid-late: `## Core Tensions` → `## Honest Boundaries`) → (explore: `## Assumptions` → `## Option Comparisons` → `## Open Questions` → `## Decomposition Recommendation`) → (clarify: `## Canonical References`) → `## Stage Report: *` (chronological). Matches current convention mostly. (b) **Goal Check promoted to top**: `## Goal Check` moves between `## Captain Context Snapshot` and shape sections — surfaces product-level alignment first. Justified because Goal Check IS a product-level artifact. (c) **Captain picks a custom order** — override either option with explicit spec.

→ Answer: Linear by author (captain, 2026-04-15, interactive). Plan stage must write this ordering into `skills/build-shape/references/output-format.md` (per A-5) and add a section-order-drift grep check to build-shape's forge fixtures.

## Stage Report: explore

- [x] Files mapped: 16 across domain, contract, config, test
  domain: 5 files (build + build-brainstorm + build-clarify skills + gray-area-templates + decomposition-gate reference); contract: 4 files (README schema + clarify output-format + ask-user-question-rules + decomposition-gate); config: 6 files (5 thin-wrapper agents + science-officer agent + plugin.json); test: 1 file (pressure YAML fixture)
- [x] Assumptions formed: 7 (Confident: 7, Likely: 0, Unclear: 0)
  A-1 thin-wrapper pattern (5+ examples); A-2 user-invocable frontmatter (11 examples); A-3 references/ subdirectory (5+ examples); A-4 shape_status mirrors context_status (README.md:272); A-5 output-format spec file (canonical across build-clarify + build-explore); A-6 kc-plugin-forge installed (plugin present at ~/.claude/plugins/local/kc-plugin-forge/). A-7 (2026-04-15 post-rebase) shape sections feed Lens (a) captain-stated-intent as [primary] citations — supersedes "add Step 1f" framing. All Confident via 2+ codebase usages — zero Likely, zero Unclear.
- [x] Options surfaced: 3
  O-1 fixture convention (forge smoke-tests vs pressure YAML vs hybrid -- Recommended: forge smoke-tests); O-2 clarify shape-skip branch location (Step 2 Evidence-filter vs Step 1.5 template-skip vs Step 3 auto-answer -- Recommended: Step 2 filter); O-3 build-distill relationship (invoke vs inline subagents vs no subagents -- Recommended: inline 3 thin-wrapper subagents).
- [x] Questions generated: 4
  Q-1 concurrent /shape + /build entity-creation race (downgraded 2026-04-15, not v1 blocker); Q-2 precise predicate for product-level assumption skip (APPROACH contradiction); Q-3 F-3 forge fixture Medium entity identity (captain picks); Q-4 (2026-04-15 post-rebase) canonical section ordering with shape + Lens/Tensions/Boundaries.
- [x] α markers resolved: 0 / 0
  Brainstorming Spec had zero α markers — directive was fully specified.
- [x] Scale assessment: confirmed Medium
  16 files mapped across 4 layers — at the high end of Medium (5-15) due to reference-doc depth, but core skill-surface scope (new skill + 3 wrappers + 3 integration edits + 1 schema edit) remains Medium. No revision.
- [x] Research dispatched: 0 researchers (resolved inline via filesystem check — kc-plugin-forge presence verified at /Users/kent/.claude/plugins/local/kc-plugin-forge/; all other Track A/B items are internal spacedock codebase patterns with 2+ existing usages, no external library/API/protocol claims warranting depth-first research)

Scope flag resolution: ⚠️ likely-decomposable triggered in brainstorm Step 5.5 (directive >3 sentences + multi-domain classification). Explore **NOT recommending decomposition**. Reason: the three logical sub-scopes — (A) skill + 3 subagent wrappers, (B) build-pipeline integration edits (build + build-brainstorm + build-clarify + README schema), (C) forge fixtures + test infrastructure — are tightly coupled. Shipping any subset independently produces no user value: skill (A) produces an artifact that nothing reads without integration (B); integration (B) has nothing to test without skill (A); fixtures (C) require skill + integration to exist before they become meaningful. Captain's monolithic intent during design discussion (explicit rejection of `/commission` workflow split) is validated by this dependency analysis. Decomposition gate bypass approved.

## Stage Report: clarify

- [x] Assumptions confirmed: 7 / 7 (batch; 2026-04-15)
  All Confident (0.85-0.98); A-1 thin-wrapper pattern, A-2 user-invocable frontmatter, A-3 references/ subdir, A-4 shape_status mirrors context_status, A-5 output-format spec file, A-6 kc-plugin-forge installed, A-7 shape sections feed Lens (a) [primary].
- [x] Options selected: 3 / 3
  O-1 Forge smoke-tests (over pressure YAML / hybrid); O-2 Step 2 Evidence-filter (over Step 1.5 template-skip / Step 3 auto-answer); O-3 Inline 3 subagent wrappers (over build-distill invoke / no subagents). All recommended options chosen.
- [x] Questions resolved: 6 / 6
  Q-1 DEFERRED (concurrent race impractical under build-light/shape-deep invariant); Q-2 Section-cite predicate (consistent with O-2); Q-3 entity 095 as F-3 (narrative continuity); Q-4 Linear-by-author section order; Q-5 (new) P-4 Immutable-pitch enforced (`/build --from {slug}` accepts ONLY slug, no extra directive); Q-6 (new) document forge dep as prereq, install automation out of 103 scope.
- [x] New items via Step 4.5 exploration: 2 Qs
  Q-5 shape-vs-directive drift policy (→ P-4); Q-6 kc-plugin-forge dependency handling (→ document as prereq).
- [x] New GUARDRAIL added: build-light / shape-deep division-of-labor
  Appended to Brainstorming Spec GUARDRAILS: /build is light/auto thinking; /shape is deep/interactive thinking. MUST NOT converge. Reinforced by P-4 CLI contract (Q-5).
- [x] Decomposition: NOT applicable (resolved in explore stage — tightly coupled sub-scopes; captain monolithic intent confirmed).
- [x] Step 1.5 re-validation: lite (0 stale / 0 contradicted / 0 coverage gaps)
  Evidence freshness trivially valid — all 6 A citations gathered via code-explorer Mode A dispatch earlier in same SO session; internal consistency OK across A-1 through A-7; option dedup OK across O-1/O-2/O-3; zero `(✓ research: ...)` annotations to re-validate.
- [x] Post-rebase annotations: 1 inline APPROACH rebase note
  Entities 104/105 shipped mid-clarify; APPROACH's "add Step 1f" claim annotated as obsolete; replaced functionally by A-7 (shape sections → Lens (a) [primary] citations). Goal Check stub (06d2329) unaffected.
- [x] Sufficiency gate: PASSED
  All A/O/Q resolved; GUARDRAILS additions internalized; CLI contract defined (3 paths, P-4 enforcement); forge fixture plan concrete (F-1 entity 100, F-2 entity 101, F-3 entity 095, F-4 synthetic Small). context_status: ready.
