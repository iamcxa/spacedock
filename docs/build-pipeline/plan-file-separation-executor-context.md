---
id: 092
title: "Plan file separation -- reduce executor context pollution"
status: clarify
context_status: ready
source: captain architectural insight (2026-04-14 SO session -- "plan 階段是否應該開另外一個文件")
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [061]
---

## Directive

> Entity files currently hold everything from Directive through Plan through Stage Reports in a single markdown file. By the time build-execute runs, entity files are 20-30K — most of that is discuss-phase context (Assumptions, Options, Q&A annotations) that executors don't need. Task-executors receive this full entity as shared context, burning tokens on irrelevant history and risking context pollution. The fix: separate the plan into its own file (`_plans/{slug}-plan.md`) so FO and executors operate on a lean "how & when" document while SO and captain keep the rich "what & why" entity. This cleanly maps to the SO/FO ownership boundary: SO owns the entity file (discuss-phase), FO owns the plan file (execute-phase).

## Captain Context Snapshot

- **Repo**: main @ 919ca14
- **Session**: SO pipeline session. Captain raised architectural question about plan-phase file separation to reduce executor context.
- **Domain**: Organizational/Data-transforming (file structure, data flow), Runnable/Invokable (skill behavior changes), Readable/Textual (spec updates across multiple skills)
- **Related entities**: 061 -- build-research + build-plan skills (pending) -- directly affected, plan output target changes. 065 -- flatten dispatch (pending) -- executor dispatch architecture affected. 074 -- pipeline verification quality uplift (ready) -- quality checks need plan file awareness.
- **Created**: 2026-04-14T01:15:00+08:00

## Brainstorming Spec

**APPROACH**: Introduce a `_plans/` subdirectory under `docs/build-pipeline/`. When `build-plan` produces its output, instead of appending `## Plan`, `## UAT Spec`, and `## Validation Map` to the entity body, it writes a new file at `docs/build-pipeline/_plans/{slug}-plan.md` with its own frontmatter (`entity_id`, `plan_version`, `created`). The entity body gets a cross-reference line: `plan: _plans/{slug}-plan.md`. Downstream consumers change their input source: `build-execute` reads the plan file (not the entity); task-executors receive plan-file shared context (not entity-file shared context); `build-quality`, `build-review`, and `build-uat` read the plan file for task verification but may cross-reference the entity for acceptance criteria. `CONTRACTS.md` adds a `plan_file` column. Dashboard `frontmatter-io.ts` gains a plan-file parser. The SO/FO ownership boundary becomes file-level: SO writes to entity file only, FO writes to plan file only. Stage Reports for plan-onward stages move to the plan file.

**ALTERNATIVE**: Keep single file but make `build-execute` extract only the `## Plan` section when dispatching task-executors (prompt-level filtering, no file separation). -- D-01 Rejected: this solves executor context pollution but not file readability, not git history noise, not the SO/FO ownership boundary clarity. It's a band-aid on the symptom (executor gets too much context) without addressing the root cause (one file serving two audiences with different needs). Also, prompt-level extraction is fragile — depends on section header names never changing.

**GUARDRAILS**:
- Entity file's `## Directive`, `## Captain Context Snapshot`, `## Brainstorming Spec`, `## Assumptions`, `## Option Comparisons`, `## Open Questions` sections are NEVER moved — they stay in the entity file (SO's territory)
- `## Acceptance Criteria` stays in the entity file — it's captain-facing, not executor-facing. Plan file cross-references it.
- Backward compatibility: existing shipped entities (in `_archive/`) are not migrated. The new format applies to entities entering plan stage after this entity ships.
- Stage Reports for discuss-phase stages (explore, clarify) stay in entity file. Stage Reports for execute-phase stages (plan, execute, quality, review, uat, shipped) move to plan file.
- The plan file is NOT a copy — it's the authoritative source for plan data. The entity file no longer contains plan sections after this change.
- Dashboard must handle both old-format (plan in entity) and new-format (plan in separate file) for entities currently in-flight

**RATIONALE**: The SO/FO boundary is the natural file boundary. SO's job is to enrich the entity with context until it's ready for planning — that context serves the captain, not the executor. FO's job is to produce a plan and drive it through execution — that plan serves the executor, not the captain who already approved it during clarify. Forcing both audiences to share one file creates the 20-30K bloat problem. Splitting at the ownership boundary gives each consumer exactly the context it needs: captain reviews the entity (with full discuss history), executor reads the plan (with task instructions only), and neither carries the other's burden.

## Acceptance Criteria

- Given `build-plan` produces output for entity X, when it completes, then a file exists at `docs/build-pipeline/_plans/{slug}-plan.md` with frontmatter containing `entity_id: X` (how to verify: `ls docs/build-pipeline/_plans/{slug}-plan.md`, parse frontmatter, assert entity_id matches)
- Given a task-executor dispatched by `build-execute`, when it receives shared context, then that context comes from the plan file (not the entity file), and the total shared context is <5K tokens for a Medium entity (how to verify: log the shared context length in task-executor, compare against pre-separation baseline)
- Given an entity that was clarified before this change ships, when it enters plan stage after this change, then `build-plan` writes to the new plan file location (how to verify: run build-plan on a post-change entity, assert plan file created)
- Given an in-flight entity with old-format (plan in entity body), when the dashboard reads it, then it still renders correctly (how to verify: dashboard status script on old-format entity, assert no parse errors)
- Given the entity file after plan stage, when captain reads it, then it does NOT contain `## Plan`, `## UAT Spec`, or `## Validation Map` sections — only a cross-reference to the plan file (how to verify: `grep -c "^## Plan\|^## UAT Spec\|^## Validation Map" docs/build-pipeline/{slug}.md` returns 0)

## References

- Captain feedback: "plan 階段是否應該開另外一個文件？...對於 FO 後的執行器來說，是否不需要知道那麼多 entity 的前後文？"
- Current large entities: 058 (29.9K), 054 (20.1K), 056 (19.2K) — discuss-phase context dominates
- MEMORY.md: "Flatten Dispatch — Troops Architecture" — executor dispatch directly affected
- Skills affected: build-plan, build-execute, build-quality, build-review, build-uat, task-execution
- Infrastructure affected: CONTRACTS.md, workflow-index, dashboard frontmatter-io.ts, status script
- `skills/build-plan/SKILL.md:198` -- "Write three sections into the entity body" (output target to change)
- `skills/build-execute/SKILL.md:64` -- "Read the entity file. Parse `## PLAN`" (input source to change)
- `skills/build-execute/SKILL.md:159-170` -- Mode A/B both operate on entity-parsed task list (input source to change)
- `skills/build-uat/SKILL.md` -- reads UAT Spec from entity (input source to change)
- `skills/task-execution/SKILL.md` -- task-executors receive task blocks in Agent prompt from build-execute, NOT entity directly (already isolated — no change needed)

## Assumptions

A-1: Task-executors already DON'T read the entity file directly. They receive structured task blocks in the Agent dispatch prompt from build-execute. The "context pollution" happens at build-execute's Step 1 (reads entire entity body to parse `## PLAN`), not at the task-executor level.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-execute/SKILL.md:64` reads entity file to parse plan. `skills/build-execute/SKILL.md:159-170` Mode A/B both dispatch from parsed task data. `skills/task-execution/SKILL.md` has zero references to entity_body/entity_context — tasks receive `read_first`, `action`, `acceptance_criteria` blocks.
→ Confirmed: captain, 2026-04-14 (batch)

A-2: build-plan is the sole writer of `## Plan`, `## UAT Spec`, and `## Validation Map`. No other skill writes these sections. Changing the output target from entity body to plan file only requires modifying build-plan.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-plan/SKILL.md:198` "Write three sections into the entity body". `grep -rl "## Plan\|## UAT Spec\|## Validation Map" skills/*/SKILL.md` — only build-plan writes these (build-execute reads them).
→ Confirmed: captain, 2026-04-14 (batch)

A-3: build-execute is the sole consumer of `## PLAN` section data. It reads the entity file at Step 1, parses tasks into a wave graph, then dispatches.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-execute/SKILL.md:64` "Read the entity file. Parse `## PLAN` into an in-memory task list." No other skill (quality, review) references `## PLAN` content.
→ Confirmed: captain, 2026-04-14 (batch)

A-4: build-quality runs project-wide checks (`bun test`, `bun lint`, `tsc --noEmit`, `bun build`) and does NOT parse plan sections. It does not need plan file awareness.
Confidence: 🟢 Confident (0.90)
Evidence: `skills/build-quality/SKILL.md` grep for Plan/UAT/Validation returns 0 matches on plan-reading lines. Quality checks are mechanical project-wide passes, not plan-task-specific.
→ Confirmed: captain, 2026-04-14 (batch)

A-5: build-review reads the execute-base diff (code changes), not the plan content. It dispatches parallel review agents against the diff. Plan file awareness is not required.
Confidence: 🟢 Confident (0.85)
Evidence: `skills/build-review/SKILL.md` grep for Plan returns 0 plan-reading references. Review operates on `git diff execute_base..HEAD`, not on plan task descriptions.
→ Confirmed: captain, 2026-04-14 (batch)

A-6: CONTRACTS.md uses a per-file-path table with entity/stage/intent/status columns. The plan file is a new path that would naturally get its own CONTRACTS row — no schema change needed, just an additional row per entity.
Confidence: 🟢 Confident (0.90)
Evidence: CONTRACTS.md header: "Each section lists a file path with entities that have modified it." A plan file at `_plans/{slug}-plan.md` is just another file path. workflow-index-maintainer appends rows automatically.
→ Confirmed: captain, 2026-04-14 (batch)

A-7: 092 depends-on 061 (build-research + build-plan skills). 061 establishes HOW build-plan works (skill design improvements); 092 then decides WHERE it writes. If 061 redesigns build-plan's output format, that design informs 092's plan file structure. Captain chose HOW-before-WHERE ordering.
Confidence: 🟢 Confident (0.95)
Evidence: Captain decision: "092 depends-on 061". 061 is currently `context_status: pending` — will enter explore soon. 092 should not enter plan until 061's design decisions are known.
→ Confirmed: captain, 2026-04-14 (interactive) -- cross-entity dependency established

## Option Comparisons

### O-1: Plan file discovery -- frontmatter cross-ref vs convention-based path

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Convention-based: `_plans/{slug}-plan.md` derived from entity slug | Zero frontmatter changes. build-execute just constructs the path from the entity slug. Predictable, grep-friendly. | Coupling to slug naming convention. If entity slug changes (rename), plan file path breaks. | Low | ✅ Recommended |
| Frontmatter cross-ref: entity adds `plan_file: _plans/{slug}-plan.md` | Explicit reference — no coupling to naming convention. Supports arbitrary plan file locations. | Requires frontmatter schema change. build-plan must write the cross-ref. build-execute must parse frontmatter before reading plan. More moving parts. | Medium | Viable |
| Both: convention as default, frontmatter override | Maximum flexibility. Convention covers 99% of cases; frontmatter for edge cases (multi-plan, custom location). | Over-engineered for v1. Two discovery paths to maintain and test. | Medium | Not recommended |

Return value trace: build-execute Step 1 currently does `Read(entity_file)` → parse `## PLAN`. With convention: `Read(_plans/{slug}-plan.md)` — one fewer indirection than frontmatter lookup. With frontmatter: `Read(entity_file)` → parse `plan_file` field → `Read(plan_file)` — still needs entity read first.

Design doc invariant check: no design doc governs plan file location. Convention is consistent with existing `_archive/`, `_index/`, `_docs/` subdirectory patterns under `docs/build-pipeline/`.

→ Selected: Convention-based `_plans/{slug}-plan.md` -- zero frontmatter changes, consistent with existing subdirectory patterns (captain, 2026-04-14, interactive)

### O-2: Stage Report placement for execute-phase stages

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Execute-phase Stage Reports in plan file | Clean ownership: FO writes all execute-phase artifacts to one file. Entity stays discuss-only. Dashboard reads one file per phase (entity for discuss, plan for execute). | Status script must check two files per entity. Dashboard frontmatter-io needs plan-file Stage Report parsing. | Medium | ✅ Recommended |
| All Stage Reports stay in entity file | Single location for all Stage Reports. Status script unchanged. Dashboard unchanged. | Entity file still grows during execute — partially defeats the purpose. Executor still writes to entity file, blurring ownership boundary. | Low | Viable |

Return value trace: `tools/dashboard/src/frontmatter-io.ts:140` parses `## Stage Report:` sections. If reports split across two files, the parser needs a `readStageReports(entityPath, planPath?)` variant. If all in entity, parser unchanged.

→ Selected: All Stage Reports stay in entity file -- dashboard/status-script unchanged, Stage Reports are small metadata (not implementation context), core win (executor doesn't read discuss context) is preserved without full ownership split (captain, 2026-04-14, interactive)

## Open Questions

Q-1: Should the transition be "hard cut" (all new entities use plan file, old entities stay as-is) or "soft migration" (a migration script moves existing in-flight entities' plan sections to plan files)?

Domain: Organizational/Data-transforming

Why it matters: Currently entities 053 (quality), 056 (review), 054 (plan) are in-flight with plan content in entity body. If the transition is hard-cut, these entities complete with old format while new entities use new format. The dashboard/status-script must handle both formats permanently (or until all old entities ship). If soft migration, existing plan content moves to plan files, but mid-stage entities could break if the move isn't atomic.

Suggested options:
- (a) Hard cut with dual-format support: new entities post-092 use plan file. Existing in-flight entities keep old format. Dashboard handles both. Dual-format code is removed after all old entities ship to archive.
- (b) Soft migration at ship time: when an old-format entity ships, its plan sections are retroactively extracted to a plan file during archive. Gradual convergence, no mid-stage disruption.
- (c) Flag-based: add `plan_format: v2` to entity frontmatter. build-plan checks the flag and writes to the appropriate location. Explicit per-entity opt-in.

→ Answer: (a) Hard cut + dual-format -- new entities post-092 use plan file. In-flight entities keep old format. build-execute checks: plan file exists → read it; doesn't exist → fallback to entity body `## PLAN`. Dual-format removed after all old entities ship to archive. (captain, 2026-04-14, interactive)

Q-2: Does build-uat need to read the plan file for UAT Spec, or does it only need the entity's `## Acceptance Criteria`?

Domain: Runnable/Invokable

Why it matters: If build-uat reads UAT Spec from the plan file, it's another consumer of the new file. If it only needs Acceptance Criteria (which stays in entity), the affected surface is smaller.

Suggested options:
- (a) build-uat reads UAT Spec from plan file — it needs the full test item list with categories (browser/cli/api) and automation flags.
- (b) build-uat only needs Acceptance Criteria from entity — UAT Spec is consumed by build-plan for generating the spec, and build-uat re-derives test items from Acceptance Criteria at runtime.

→ Answer: (a) build-uat reads UAT Spec from plan file -- it needs the full test item list with categories and automation flags that build-plan produced. build-uat is the third consumer of the plan file (alongside build-execute and task-executors). (captain, 2026-04-14, interactive)

## Stage Report: explore

- [x] Files mapped: 8 across skills (5 SKILL.md files), infra (2), entity-dir (1 new)
  skills: build-plan/SKILL.md (modify output), build-execute/SKILL.md (modify input), build-uat/SKILL.md (modify input?), build-quality/SKILL.md (no change needed), build-review/SKILL.md (no change needed); infra: CONTRACTS.md (natural extension), frontmatter-io.ts (plan-file parser if Stage Reports split); new: docs/build-pipeline/_plans/ directory
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 task-executors already isolated (0.95), A-2 build-plan sole writer (0.95), A-3 build-execute sole reader (0.95), A-4 quality no plan refs (0.90), A-5 review no plan refs (0.85), A-6 CONTRACTS natural extension (0.90)
- [x] Options surfaced: 2
  O-1 plan file discovery (convention ✅ vs frontmatter cross-ref); O-2 Stage Report placement (plan file ✅ vs entity file)
- [x] Questions generated: 2
  Q-1 transition strategy (hard cut vs soft migration vs flag-based); Q-2 build-uat UAT Spec source
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Medium
  8 files across 3 layers (skills, infra, entity-dir); core changes to 3 skills (build-plan, build-execute, build-uat)
- [x] Research dispatched: 0 researchers (skipped -- all internal architecture, no external tech)

## Canonical References

- `skills/build-plan/SKILL.md:198` -- current plan output target ("Write three sections into the entity body")
- `skills/build-execute/SKILL.md:64` -- current plan input source ("Read the entity file. Parse `## PLAN`")
- `skills/build-execute/SKILL.md:159-170` -- Mode A/B execution from parsed entity (dispatch isolation point)
- `skills/task-execution/SKILL.md` -- task-executor receives task blocks, NOT entity body (A-1 evidence)
- `docs/build-pipeline/_index/CONTRACTS.md:1-15` -- per-file-path table format (A-6 natural extension)
- `tools/dashboard/src/frontmatter-io.ts:140` -- Stage Report parser (O-2 impact if reports split)
- Existing subdirectory precedents: `_archive/`, `_index/`, `_docs/` under `docs/build-pipeline/`

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Medium entity, cohesive "separate plan file" operation
- [x] Re-validation: 6 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  All evidence verified via personal Read/grep in this session
- [x] Assumptions confirmed: 7 / 7 (0 corrected)
  A-1..A-6 batch-confirmed; A-7 (061 dependency) surfaced in exploration loop
- [x] Options selected: 2 / 2
  O-1: convention-based `_plans/{slug}-plan.md`; O-2: all Stage Reports stay in entity file (dashboard remains single-entry-point)
- [x] Questions answered: 2 / 2 (0 deferred)
  Q-1: hard cut + dual-format (build-execute fallback to entity body for old-format); Q-2: build-uat reads UAT Spec from plan file
- [x] Open exploration: 1 gray area surfaced (0 from templates, 1 from cross-entity analysis, 0 from directive, 0 via freeform)
  061 dependency: captain chose 092 depends-on 061 (HOW before WHERE ordering). Also discussed O-2 architecture depth (dashboard as single-entry-point, future artifacts extensibility, build pipeline gaps)
- [x] Canonical refs added: 0
  No new refs during clarify (7 from explore)
- [x] Context status: ready
  Gate passed: 7 assumptions confirmed, 2 options selected, 2 questions answered, 5 acceptance criteria α-clean
- [x] Handoff mode: loose
  No auto_advance; captain must say "execute 092" to FO
- [x] Clarify duration: 7 AskUserQuestion calls + 1 assumption batch + 1 extended architecture discussion
  Batch(1) + O-1(1) + O-2(1) + Q-1(2, captain explored O-2 reconsideration + pipeline gaps before answering) + Q-2(1) + exploration(2 iterations: 061 dependency + Complete)
