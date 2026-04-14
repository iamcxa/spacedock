---
id: 103
title: "Shape skill -- pre-build alignment for user stories and scope validation"
status: draft
context_status: none
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
