---
id: 103
title: "Shape skill -- pre-build alignment for user stories and scope validation"
status: draft
context_status: pending
source: captain architectural discussion (2026-04-14 SO session — split product alignment from technical execution via /shape skill + build integration)
created: 2026-04-14T21:30:00+08:00
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

**APPROACH**: Add a new leaf skill `skills/build-shape/SKILL.md` registered as `/shape` via `user-invocable: true` frontmatter (pattern used by 11 existing slash-command skills). The skill runs a 4-step internal flow (`assume → imagine → align → ship` as internal steps, NOT pipeline stages — provenance: Basecamp Shape Up pitch structure + GSD `/gsd-discuss-phase` adaptive questioning) with three context-isolated subagent wrappers dispatched via the Agent tool: `build-shape-framer` (opus — hard synthesis, proposes 2-3 problem statements), `build-shape-story-gen` (sonnet — templated output, generates 3-5 user stories per accepted frame), `build-shape-scope-drafter` (sonnet — constrained output, drafts in/out scope). Skill body owns all captain `AskUserQuestion` interaction; subagents do generative heavy lifting. Output written as entity body sections (`## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References`) plus a frontmatter transition `shape_status: draft → validated`. Step 1 heuristic escape-hatch: Small/bugfix-level directives trigger early exit with "shape unnecessary — run `/build` directly" recommendation. Companion micro-edits to `skills/build/SKILL.md` (accept `--from {slug}` flag, load shape sections), `skills/build-brainstorm/SKILL.md` (add Step 1f shape consumption; activate the Step 2.5 Goal Check shape-present cross-check branch — stub already shipped in commit `06d2329`), and `skills/build-clarify/SKILL.md` (skip product-level assumption category when shape section present in entity). Schema update to `docs/build-pipeline/README.md` adds `shape_status: draft|validated|n/a` field. Forge discipline: skill developed via `kc-plugin-forge` TDD — 4 golden fixtures covering scale × type diversity (F-1 entity 100 Large/UI, F-2 entity 101 Large/runtime, F-3 Medium feature TBD from explore, F-4 synthetic Small bugfix for escape-hatch regression).

**ALTERNATIVE**: Ship `/shape` as a full spacedock workflow via `/commission`, producing a peer `docs/shape-pipeline/` with its own README, `assume/imagine/align/ship` as real pipeline stages (not internal steps), FO dispatch, and mod system. -- D-01 Rejected during design discussion (2026-04-14): (a) dual-pipeline sync problem — shape pipeline ↔ build pipeline state coordination, entity-ID namespace collision, cross-pipeline status awareness; (b) `align` stage is fundamentally captain-in-the-loop conversation — forcing it into FO-dispatch semantics creates impedance mismatch (FO stops and waits on `AskUserQuestion` calls, which is not a natural FO/ensign primitive); (c) workflow machinery overhead (separate README, status script, first-officer agent, mod hooks) pays no dividend when a shape "workflow run" has exactly one entity per run with no parallel stage execution. Skill + subagents carries the same interaction shape with ~10% of the scaffolding cost.

**GUARDRAILS**:
- New skill MUST follow forge TDD workflow (`kc-plugin-forge`) — write golden fixtures FIRST, iterate SKILL.md against fixtures until green (captain directive 2026-04-14).
- Subagents MUST be thin wrappers per `MEMORY.md :: Thin Wrapper Agent Pattern` (~15-22 lines per agent MD file, loading `kc-plugin-forge` or other skill plugins for actual logic).
- Shape artifact storage is entity body sections — do NOT create `docs/_shapes/` subdirectory or separate artifact files (rejected in design; single-source-of-truth entity body).
- `/shape` and `/build` share the same entity state machine; `shape_status` transitions are additive to `context_status`, not a replacement — both fields coexist.
- NEVER modify existing SO pipeline stages beyond the three documented micro-edits (build, build-brainstorm, build-clarify); no cascading skill-contract changes.
- Immutable-pitch discipline enforced at skill level: once `shape_status: validated` is committed, `/shape` refuses to rerun on the same entity — returns "use `supersedes: {old-slug}` on a new entity" recommendation.
- Forge fixtures MUST include at least one Small/bugfix directive to verify escape-hatch works (regression safety — shape must not force itself on tasks it's not designed for).

**RATIONALE**: The skill+subagents approach isolates captain-interactive work from agent-dispatch work at the right architectural layer. Build-pipeline's value is agent-dispatched execution (execute/quality/review/uat/ship are naturally stage-shaped); shape's value is captain-in-the-loop alignment (inherently conversation-shaped). Making shape a pipeline would force it to pretend to be stage-shaped; keeping it as a skill preserves the existing build pipeline's agent-dispatch optimization. The three micro-edits are the minimum necessary integration surface — adding shape adds exactly those three integration points, no cascading changes. The already-shipped Goal Check commit (`06d2329`) is the prototype for this surgical-edit discipline. Forge TDD on the new skill (not on existing ones) keeps test discipline local to net-new behavior, matching the captain's 2026-04-14 directive that skill work MUST use forge.

## Acceptance Criteria

- Given a raw Medium+ directive, when captain invokes `/shape "{directive}"`, then the skill creates a new entity at `docs/build-pipeline/{slug}.md` with `shape_status: draft` and an interactive loop begins (how to verify: grep entity file for `shape_status:` frontmatter and `## Problem Statement` section after invocation)
- Given a shape session completes successfully, when the internal ship step finalizes, then the entity frontmatter transitions `shape_status: draft → validated` and body contains all 5 required sections in order: `## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References` (how to verify: parse frontmatter + `grep -n '^## '` to confirm section order)
- Given a Small/bugfix-level directive (e.g., "fix typo in README", "bump dep version X to Y"), when `/shape "{directive}"` is invoked, then the skill emits an escape-hatch message recommending `/build` directly and exits without creating an entity (how to verify: invoke with small directive fixture, assert no entity file created, assert recommendation message in stdout)
- Given an entity with `shape_status: validated`, when `/build --from {slug}` is invoked, then build-brainstorm's Step 1f reads the entity's shape sections and the resulting APPROACH paragraph references at least one user story by number (how to verify: diff brainstorm output with vs without `--from`; with `--from`, APPROACH contains at least one `US-{n}` or `user story {n}` citation)
- Given an entity with `shape_status: validated`, when `/shape "{same directive}" {slug}` is re-invoked on the same entity, then `/shape` refuses to rerun and emits the immutable-pitch recommendation with the `supersedes:` pattern (how to verify: second invocation — assert refusal message, assert entity body unchanged via `git diff HEAD` returns empty)
- Given `kc-plugin-forge` TDD fixtures F-1 through F-4 (100, 101, one Medium TBD, one Small escape-hatch synthetic), when `skills/build-shape/SKILL.md` is developed, then all 4 fixtures pass forge acceptance checks before the skill is considered ship-ready (how to verify: `kc-plugin-forge validate skills/build-shape` with all 4 fixtures, assert exit code 0)
