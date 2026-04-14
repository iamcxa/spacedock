---
id: 065
title: Flatten Dispatch -- FO Direct Troops + Ensign Role Reduction
status: draft
context_status: awaiting-clarify
source: captain
created: 2026-04-12T13:00:00Z
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
---

## Directive

Restructure the agent dispatch hierarchy from FO→ensign→task-executor (broken: ensign can't sub-dispatch) to FO-direct troops dispatch. This is an architectural change that affects how the execute stage and potentially other multi-task stages operate.

### Why this entity exists

1. **Subagent Agent-tool limitation**: Ensign runs as a subagent and cannot use the Agent tool to dispatch task-executor. Discovered in Phase E Plan 2 Wave 1 pilot, confirmed again in entity 063 execution. The current build-execute skill instructs ensign to dispatch task-executors, but ensign physically can't.
2. **Troops flexibility**: Per-task workers ("troops") should be able to load any installed plugin skill based on repo context, not just spacedock skills. The current task-executor is tightly coupled to spacedock:task-execution skill.
3. **Entity 063 lesson**: SO-direct + inline FO skipped worktree entirely because the FO→ensign dispatch path (which creates worktrees) was bypassed. Proper FO dispatch with troops would have created the worktree correctly.

### Scope

1. **Rename `agents/task-executor.md` → `agents/troops.md`** (or `agents/troop.md` singular). Update frontmatter name, description, skill loadout. Troops are leaf agents — they execute one task and return.

2. **Refactor `skills/build-execute/SKILL.md`**: Change from "ensign loads this skill and dispatches task-executors" to "FO loads this skill as guidance and dispatches troops directly." The skill becomes a planning/guidance document for FO, not an ensign-executed orchestrator.

3. **Update `references/first-officer-shared-core.md` Dispatch section**: Add FO-direct troops dispatch pattern for execute stage. FO reads the PLAN, builds wave graph, dispatches troops per task with model hints.

4. **Update `references/claude-first-officer-runtime.md`**: Add troops dispatch template alongside the existing ensign dispatch template.

5. **Ensign role reduction**: Ensign remains for single-skill stages that don't need sub-dispatch (explore, quality, review, uat). Document the boundary: ensign = one skill, one stage, no sub-dispatch. Troops = one task, leaf execution, flexible skill loading.

6. **Troops skill flexibility**: Troops should be able to `Skill()` any installed plugin skill, not just spacedock:task-execution. The FO's dispatch prompt tells the troop which skills to load based on the task's domain and the repo's installed plugins.

### Acceptance Criteria

- AC1: `agents/troops.md` exists with correct frontmatter (name, description, color, skills)
- AC2: `skills/build-execute/SKILL.md` describes FO-direct dispatch pattern, not ensign-internal dispatch
- AC3: FO shared core Dispatch section includes troops dispatch template
- AC4: FO runtime adapter includes troops dispatch template
- AC5: Ensign agent description explicitly states "no sub-dispatch" boundary
- AC6: Dogfood: one entity runs through execute stage with FO→troops dispatch (worktree created, tasks executed on branch, PR lifecycle works)

### Context

- Subagent limitation: `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md`
- Entity 063 worktree skip lesson: `~/.claude/projects/-Users-kent-Project-spacedock/memory/so-fo-session-boundary.md`
- Current task-executor agent: `agents/task-executor.md`
- Current build-execute skill: `skills/build-execute/SKILL.md`
- Thin wrapper agent pattern: `~/.claude/projects/-Users-kent-Project-spacedock/memory/thin-wrapper-agent-pattern.md`

## Captain Context Snapshot

- **Repo**: main @ 527dc6e
- **Session**: SO pipeline session. Entity 061 (build-research + build-plan) just fast-tracked to ready. Captain advancing entity 065 next.
- **Domain**: Runnable/Invokable (agents, skills, pipeline dispatch), Readable/Textual (SKILL.md updates, agent definitions, reference docs), Organizational/Data-transforming (dispatch architecture restructuring)
- **Related entities**: 061 -- Phase E Plan 2 build-research + build-plan Skills (clarify, ready); 092 -- plan file separation (clarify, ready); 063 -- worktree skip lesson (shipped)
- **Created**: 2026-04-12T13:00:00Z

## Brainstorming Spec

**APPROACH**: Eliminate the FO→ensign→task-executor dispatch chain for multi-task stages by having FO dispatch "troops" directly -- one troop agent per plan task, with per-task model hints and flexible skill loading. Rename `agents/task-executor.md` to `agents/troop.md` (✓ resolved by explore: all 10 existing agent files use singular noun form -- researcher.md, ensign.md, code-explorer.md, etc.) following the thin-wrapper agent pattern. Refactor `skills/build-execute/SKILL.md` from an ensign-internal orchestrator to an FO-guidance document: FO reads the PLAN, builds the wave graph, and dispatches troops per task with the correct model hint (haiku/sonnet/opus) and skill loadout determined by repo context. Add FO-direct troops dispatch templates to `references/first-officer-shared-core.md` (Dispatch section) and `references/claude-first-officer-runtime.md` alongside existing ensign templates. Ensign retains its role for single-skill stages (explore, quality, review, uat) where no sub-dispatch is needed. Update `agents/ensign.md` to explicitly document the "no sub-dispatch" boundary. This directly fixes the proven subagent Agent-tool limitation (MEMORY.md: `subagent-cannot-nest-agent-dispatch.md`) and prevents the entity 063 worktree-skip class of bug by keeping dispatch in FO's hands.

**ALTERNATIVE**: Keep ensign as the execute-stage orchestrator but work around the subagent Agent-tool limitation by having FO pre-create a team of task-executors via `TeamCreate` before invoking the ensign, so ensign uses `SendMessage` to route tasks to pre-existing teammates instead of dispatching via Agent. -- D-01 Rejected because: (a) TeamCreate has experimental gotchas in Warp terminal (MEMORY.md: `agent-teams-experimental-gotchas.md`) making it unreliable, (b) ensign still cannot control per-task model hints via SendMessage (model is set at team creation, not per-message), (c) does not address the troops flexibility requirement -- teammates would still be task-executor agents locked to `spacedock:task-execution` skill, and (d) adds TeamCreate/TeamDelete lifecycle management complexity without removing the root cause (ensign-as-intermediary).

**GUARDRAILS**:
- **Ensign must NOT gain Agent tool access** -- the boundary exists for context isolation. If ensign could dispatch, it would become a recursive orchestrator and context windows would explode. The fix is moving dispatch UP to FO, not granting dispatch DOWN to ensign.
- **Troops are leaf agents** -- they execute one task and return. They cannot dispatch further subagents (same constraint as current task-executor, per `subagent-cannot-nest-agent-dispatch.md`).
- **Cross-reference sweep required** -- renaming task-executor to troops requires updating all references across existing skills: `build-plan/SKILL.md` (researcher dispatch mentions task-executor pattern), `build-execute/SKILL.md` (primary consumer), any agent dispatch templates in FO references.
- **Dogfood AC6 is mandatory** -- file-only changes are insufficient; a full pipeline run through execute stage with FO→troops dispatch must prove worktree creation, task execution on branch, and PR lifecycle work end-to-end.
- **FO dispatch templates must support per-task model hints** (haiku/sonnet/opus) from the PLAN task schema's `model` attribute, not a single model for all troops.

**RATIONALE**: FO-direct troops dispatch is the minimum-change fix for a proven, twice-confirmed limitation. It removes one layer of indirection (ensign no longer mediates execute-stage task dispatch), preserves ensign's value for single-skill stages, aligns with the thin-wrapper agent pattern already validated by 4 trailofbits reviewer agents and the researcher agent, and enables troops to load arbitrary plugin skills per repo context -- a prerequisite for cross-project distribution (Phase F). The TeamCreate workaround (ALTERNATIVE) would paper over the limitation while adding its own fragility (Warp incompatibility, phantom team recovery) and would not achieve the flexibility goal.

## Acceptance Criteria

- `agents/troops.md` (or `agents/troop.md`) exists with correct frontmatter (name, description, color, skills field supporting flexible skill loading). (how to verify: `Read agents/troops.md` and check frontmatter fields name, description, color, skills are present; skills field is not hardcoded to a single skill)
- `skills/build-execute/SKILL.md` describes FO-direct dispatch pattern, not ensign-internal task-executor dispatch. (how to verify: `grep -c "task-executor" skills/build-execute/SKILL.md` returns 0 or only in historical/migration notes; `grep "troops\|troop" skills/build-execute/SKILL.md` returns ≥1 match)
- FO shared core Dispatch section includes troops dispatch template with per-task model hint support. (how to verify: `grep -A 5 "troops" references/first-officer-shared-core.md` returns a dispatch template with `model` parameter)
- FO runtime adapter includes troops dispatch template alongside ensign template. (how to verify: `grep "troops\|troop" references/claude-first-officer-runtime.md` returns ≥1 match)
- Ensign agent description explicitly states "no sub-dispatch" boundary. (how to verify: `grep -i "no sub-dispatch\|cannot dispatch\|does not dispatch" agents/ensign.md` returns ≥1 match)
- Dogfood: one entity runs through execute stage with FO→troops dispatch (worktree created, tasks executed on branch, PR lifecycle works). (how to verify: git log shows commits from troop-dispatched execution on a feature branch, and the entity's Stage Report: execute contains troop dispatch evidence)

## Assumptions

A-1: Agent naming convention uses singular nouns -- use `troop.md` not `troops.md`.
Confidence: 🟢 Confident (0.95)
Evidence: `agents/` directory -- all 10 existing agent files use singular noun form: researcher.md, ensign.md, code-explorer.md, task-executor.md, science-officer.md, first-officer.md, etc.

A-2: FO already has a task-list-driven dispatch pattern (Mode A) for execute stage that pre-dispatches task-executor teammates.
Confidence: 🟢 Confident (0.90)
Evidence: `skills/build-execute/SKILL.md:159` -- "Mode A -- FO task-list-driven (preferred): FO dispatched task-executor teammates per wave before invoking you"

A-3: build-execute SKILL.md explicitly acknowledges the ensign Agent-tool limitation that motivates this entity.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-execute/SKILL.md:28` -- "you run as an ensign subagent, which does not have the Agent tool. FO dispatches task-executor teammates per wave before or instead of invoking you."

A-4: Cross-reference sweep scope is larger than the directive's 5-file estimate -- 10 active non-archive files reference `task-executor`.
Confidence: 🟢 Confident (0.85)
Evidence: grep `task-executor` across `*.md` returns 15 files (10 active): `skills/build-execute/SKILL.md`, `skills/build-plan/SKILL.md`, `skills/task-execution/SKILL.md`, `agents/task-executor.md`, `references/agent-dispatch-guide.md`, `references/claude-ensign-runtime.md`, `docs/build-pipeline/README.md`, `docs/build-pipeline/_index/CONTRACTS.md`, `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`, `skills/overhaul/references/recipe-format.md`

A-5: Codex runtime adapters (`references/codex-first-officer-runtime.md`, `references/codex-ensign-runtime.md`) should be updated alongside Claude adapters for consistency.
Confidence: 🟡 Likely (0.75)
Evidence: `references/codex-first-officer-runtime.md` and `references/codex-ensign-runtime.md` exist as parallel adapter files to the Claude variants; maintaining parity is the established pattern

A-6: Inline serial fallback (current Mode B in build-execute) moves from ensign to FO when troops dispatch is unavailable.
Confidence: 🟡 Likely (0.70)
Evidence: `skills/build-execute/SKILL.md:165` -- current Mode B says "Execute each task yourself in wave order"; after refactor, "yourself" becomes FO instead of ensign since ensign no longer loads this skill for execute

## Option Comparisons

### O-1: Troop agent default skill configuration

Current `agents/task-executor.md:7` hardcodes `skills: ["spacedock:task-execution"]`. The directive requires flexible skill loading. Three approaches to the troop agent's skill frontmatter.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| task-execution as default + FO adds more via prompt | Backward compatible; troop always has basic execution capability; FO supplements with repo-specific skills | Still coupled to spacedock:task-execution as minimum; FO must know to add extras | Low | Recommended |
| No default skill -- FO specifies all skills in dispatch prompt | Maximum flexibility; troop is truly generic; clean separation | FO must always specify skills (no fallback); more dispatch prompt complexity | Medium | Viable |
| Multiple defaults (task-execution + knowledge-capture) | Troop can always capture findings; richer base capability | More coupling; larger skill surface per dispatch | Medium | Not recommended |

### O-2: build-execute SKILL.md post-refactor loading

After refactor, build-execute is no longer loaded by ensign for execute stage. How does FO consume its orchestration logic?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| FO loads via Skill() before troops dispatch | Consistent with how FO loads other stage skills; auto-context injection; FO gets wave-graph logic, model hints, skill selection | FO skill budget increases; context cost for a guidance doc | Low | Recommended |
| FO reads as reference doc (Read, not Skill) | Lighter context; FO cherry-picks what it needs | Breaks skill-loading convention; FO must know to Read instead of Skill | Low | Viable |

## Open Questions

(none -- all gray areas classified as assumptions or options)

## Decomposition Recommendation

Not warranted. 9 active files across 3 layers (agent, skill, config). Medium scale confirmed. All scope items are interdependent -- renaming requires cross-reference sweep, which requires build-execute refactor, which requires FO template updates.

## Canonical References

(clarify stage will populate)

## Stage Report: explore

- [x] Files mapped: 9 active across agent, skill, config (+ 5 archived)
  agent: 2 (task-executor.md rename target, ensign.md boundary update), skill: 3 (build-execute, task-execution, build-plan ref updates), config: 4 (first-officer-shared-core, claude-first-officer-runtime, agent-dispatch-guide, claude-ensign-runtime)
- [x] Assumptions formed: 6 (Confident: 4, Likely: 2, Unclear: 0)
  A-1 through A-4 Confident (0.85-0.95); A-5 Codex adapters Likely (0.75); A-6 Mode B fallback Likely (0.70)
- [x] Options surfaced: 2
  O-1 troop agent default skill configuration; O-2 build-execute post-refactor loading
- [x] Questions generated: 0
  All gray areas classifiable as assumptions or options
- [x] α markers resolved: 1 / 1
  α-1 (naming: troops vs troop) resolved: singular `troop.md` per agent naming convention
- [x] Scale assessment: Medium confirmed, revised scope
  9 active files (vs directive's 5-6 estimate) due to cross-reference sweep; still within Medium range (5-15)
- [x] Research dispatched: 0 researchers (skipped -- all assumptions internal codebase architecture, no external tech claims)
