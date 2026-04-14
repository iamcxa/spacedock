---
id: 092
title: "Plan file separation -- reduce executor context pollution"
status: draft
context_status: pending
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
depends-on: []
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
