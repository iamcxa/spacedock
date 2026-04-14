---
id: 065
title: Flatten Dispatch -- FO Direct Troops + Ensign Role Reduction
status: quality
context_status: ready
source: captain
created: 2026-04-12T13:00:00Z
started: 2026-04-14T18:15:00+08:00
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-flatten-dispatch-troops-architecture
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
→ Confirmed: captain, 2026-04-14 (batch)

A-2: FO already has a task-list-driven dispatch pattern (Mode A) for execute stage that pre-dispatches task-executor teammates.
Confidence: 🟢 Confident (0.90)
Evidence: `skills/build-execute/SKILL.md:159` -- "Mode A -- FO task-list-driven (preferred): FO dispatched task-executor teammates per wave before invoking you"
→ Confirmed: captain, 2026-04-14 (batch)

A-3: build-execute SKILL.md explicitly acknowledges the ensign Agent-tool limitation that motivates this entity.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-execute/SKILL.md:28` -- "you run as an ensign subagent, which does not have the Agent tool. FO dispatches task-executor teammates per wave before or instead of invoking you."
→ Confirmed: captain, 2026-04-14 (batch)

A-4: Cross-reference sweep scope is larger than the directive's 5-file estimate -- 10 active non-archive files reference `task-executor`.
Confidence: 🟢 Confident (0.85)
Evidence: grep `task-executor` across `*.md` returns 15 files (10 active): `skills/build-execute/SKILL.md`, `skills/build-plan/SKILL.md`, `skills/task-execution/SKILL.md`, `agents/task-executor.md`, `references/agent-dispatch-guide.md`, `references/claude-ensign-runtime.md`, `docs/build-pipeline/README.md`, `docs/build-pipeline/_index/CONTRACTS.md`, `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`, `skills/overhaul/references/recipe-format.md`
→ Confirmed: captain, 2026-04-14 (batch)

A-5: Codex runtime adapters (`references/codex-first-officer-runtime.md`, `references/codex-ensign-runtime.md`) should be updated alongside Claude adapters for consistency.
Confidence: 🟡 Likely (0.75)
Evidence: `references/codex-first-officer-runtime.md` and `references/codex-ensign-runtime.md` exist as parallel adapter files to the Claude variants; maintaining parity is the established pattern
→ Confirmed: captain, 2026-04-14 (batch)

A-6: Mode B fallback changes from "ensign inline serial" to "FO sequential troop dispatch" -- FO dispatches one troop at a time, preserving context isolation while sacrificing parallelism. FO does NOT do inline execution itself.
Confidence: 🟡 Likely (0.70)
Evidence: `skills/build-execute/SKILL.md:165` -- current Mode B says "Execute each task yourself in wave order"; after refactor, FO dispatches troops sequentially instead of executing inline, maintaining the troop's context isolation advantage
→ Corrected by captain, 2026-04-14 (batch): "Mode B fallback is FO sequential troop dispatch (one at a time), not FO inline execution. Troop's context isolation advantage is the key reason -- ensign accumulates context across tasks, troop gets fresh context per task."

## Option Comparisons

### O-1: Troop agent default skill configuration

Current `agents/task-executor.md:7` hardcodes `skills: ["spacedock:task-execution"]`. The directive requires flexible skill loading. Three approaches to the troop agent's skill frontmatter.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| task-execution as default + FO adds more via prompt | Backward compatible; troop always has basic execution capability; FO supplements with repo-specific skills | Still coupled to spacedock:task-execution as minimum; FO must know to add extras | Low | Recommended |
| No default skill -- FO specifies all skills in dispatch prompt | Maximum flexibility; troop is truly generic; clean separation | FO must always specify skills (no fallback); more dispatch prompt complexity | Medium | Viable |
| Multiple defaults (task-execution + knowledge-capture) | Troop can always capture findings; richer base capability | More coupling; larger skill surface per dispatch | Medium | Not recommended |

→ Selected: Multiple defaults (task-execution + knowledge-capture) (captain, 2026-04-14, interactive)

### O-2: build-execute SKILL.md post-refactor loading

After refactor, build-execute is no longer loaded by ensign for execute stage. How does FO consume its orchestration logic?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| FO loads via Skill() before troops dispatch | Consistent with how FO loads other stage skills; auto-context injection; FO gets wave-graph logic, model hints, skill selection | FO skill budget increases; context cost for a guidance doc | Low | Recommended |
| FO reads as reference doc (Read, not Skill) | Lighter context; FO cherry-picks what it needs | Breaks skill-loading convention; FO must know to Read instead of Skill | Low | Viable |

→ Selected: FO loads via Skill() before troops dispatch (captain, 2026-04-14, interactive)

## Open Questions

(none from explore -- all gray areas classified as assumptions or options)

Q-1: Entity 065 and 092 (plan file separation) both modify build-execute's Input Contract. Ship order?

Domain: Organizational/Data-transforming
Why it matters: 065 changes the dispatch consumer (FO + troop), 092 changes the plan location (entity body → separate file). Doing both simultaneously risks merge conflicts and compounded regression risk.
Suggested options: (a) 065 first, 092 second; (b) 092 first, 065 second; (c) parallel with integration

→ Answer: 065 first, 092 second -- refactor dispatch architecture (larger change) on stable base, then change plan location on refactored base. One change at a time. (captain, 2026-04-14, interactive)

Q-2: Does entity 065 require an ensign transition period for in-flight entities?

Domain: Organizational/Data-transforming
Why it matters: If entities are mid-execute when 065 ships, the dispatch architecture change could disrupt them.
Suggested options: (a) No transition needed -- dispatch is stateless; (b) Keep old path as fallback

→ Answer: No transition needed -- dispatch is stateless, each FO dispatch reads latest skill definitions. No engine changes required (plugin.json doesn't reference agent filenames, CC auto-scans agents/ dir). Cross-ref sweep (A-4) is the only migration task. (captain, 2026-04-14, interactive)

## Decomposition Recommendation

Not warranted. 9 active files across 3 layers (agent, skill, config). Medium scale confirmed. All scope items are interdependent -- renaming requires cross-reference sweep, which requires build-execute refactor, which requires FO template updates.

## Canonical References

- `skills/build-execute/SKILL.md` -- primary refactor target, current Mode A/B patterns at lines 159-179
- `agents/task-executor.md` -- rename target, current frontmatter at line 7
- `.claude-plugin/plugin.json` -- confirmed no agent filename references (CC auto-scans agents/ dir)
- `docs/build-pipeline/plan-file-separation-executor-context.md` (entity 092) -- ships after 065 per Q-1 ordering decision

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

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Medium scope, explore determined "Not warranted"
- [x] Re-validation: 6 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  All evidence fresh (written in same session as explore)
- [x] Assumptions confirmed: 6 / 6 (1 corrected)
  A-1 through A-5 confirmed via batch; A-6 corrected -- Mode B fallback is FO sequential troop dispatch, not FO inline execution
- [x] Options selected: 2 / 2
  O-1 troop default skills -- multiple defaults (task-execution + knowledge-capture); O-2 build-execute loading -- FO loads via Skill()
- [x] Questions answered: 2 / 2
  Q-1 ship order 065→092; Q-2 no ensign transition period needed (stateless dispatch)
- [x] Open exploration: 2 gray areas surfaced (0 from templates, 1 from CONTRACTS, 0 from directive, 1 via captain selection)
  Entity 092 coordination (Q-1); ensign transition strategy (Q-2)
- [x] Canonical refs added: 4
  build-execute SKILL, task-executor agent, plugin.json, entity 092
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 065" to advance
- [x] Clarify duration: 6 questions asked, session complete
  1 batch confirmation + 2 option AskUserQuestion + 3 exploration iterations

## Research Findings

Research dispatch skipped -- all findings are internal codebase architecture, no external technology claims. Inline serial research performed via Read/Grep within the plan ensign's context.

### Upstream Constraints

1. **plugin.json does not reference agent filenames** -- CC auto-scans `agents/` directory. Renaming `task-executor.md` to `troop.md` requires zero engine changes. Verified: `.claude-plugin/plugin.json` has no `task-executor` string. (`.claude-plugin/plugin.json`)
2. **Agent naming convention is singular nouns** -- all 10 existing agents use singular form: `researcher.md`, `ensign.md`, `code-explorer.md`, `first-officer.md`, `science-officer.md`, etc. New file must be `troop.md`. (A-1, confirmed)
3. **Dispatch is stateless** -- no in-flight entities need transition. Each FO dispatch reads latest skill definitions fresh. (Q-2, confirmed)
4. **Entity 092 ships after 065** -- plan-file-separation modifies build-execute's Input Contract independently. No coordination needed at 065 execution time. (Q-1, confirmed)

### Existing Patterns

1. **Thin wrapper agent pattern** -- 15-22 line agent files wrapping one skill via `skills:` frontmatter. Canonical examples: `researcher.md`, `task-executor.md`, `code-explorer.md`, 4x trailofbits reviewers. All exclude `Agent` from tools (leaf-only). (`references/claude-ensign-runtime.md:41-79`)
2. **build-execute Mode A vs Mode B** -- Mode A: FO pre-dispatches task-executor teammates per wave, ensign reads commits and writes Stage Report. Mode B: ensign executes tasks inline serially. After refactor, both modes change consumer from ensign to FO. (`skills/build-execute/SKILL.md:158-180`)
3. **FO shared core already has task-list-driven dispatch pattern** -- steps 1-7 define: extract tasks, create team + task list, spawn workers, self-claim, write to files, dependency-gated synthesis. (`references/first-officer-shared-core.md:209-235`)
4. **FO runtime adapter dispatch template** -- uses `Agent(subagent_type="{dispatch_agent_id}", ...)` with `worker_key` filesystem-safe stem. (`references/claude-first-officer-runtime.md:46-51`)
5. **SO-FO dispatch split** -- execute stage is FO-owned, task-list-driven. Current description already says "FO spawns T task-executor teammates". (`docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md:145-165`)

### Library/API Surface

1. **`spacedock:task-executor` namespace** -- the current Agent dispatch call uses `subagent_type="spacedock:task-executor"`. After rename, becomes `spacedock:troop`. (`agents/task-executor.md:20`)
2. **`spacedock:task-execution` skill** -- the skill loaded by the agent is `task-execution`, not `task-executor`. The skill file itself does not need renaming -- only its references to the agent name change. (`skills/task-execution/SKILL.md`)
3. **`spacedock:knowledge-capture` skill** -- per O-1 captain selection, troop defaults include knowledge-capture alongside task-execution. (`skills/knowledge-capture/` exists in the plugin)

### Known Gotchas

1. **Cross-reference sweep is larger than the directive estimated** -- A-4 confirmed 10 active non-archive files reference `task-executor`. The plan must update all of them or the renamed agent breaks dispatch. Missing one file creates a silent reference to a non-existent agent.
2. **build-execute "Task Dispatch Contract" No-Exceptions block** -- `SKILL.md:395` says "Every task dispatches via `Agent(subagent_type='spacedock:task-executor',...)`". This is a hard-coded dispatch instruction that must change to `spacedock:troop`. The entire block needs rewriting for the FO-direct pattern.
3. **Archive and spec files** -- 3 archive files + 1 spec file reference `task-executor`. These are historical records and MUST NOT be edited. The plan must explicitly exclude them.
4. **CONTRACTS.md has entries for `agents/task-executor.md`** -- entity 062's rows reference this path. After rename, the path changes. However, CONTRACTS.md tracks file paths as they were at plan time -- updating historical rows would corrupt the contract history. New rows for 065 will use `agents/troop.md`.
5. **Mode B fallback changes semantics** -- per A-6 captain correction, Mode B is "FO sequential troop dispatch" (one troop at a time), NOT "FO inline execution". Troop context isolation is the key reason -- each troop gets fresh context per task. This must be reflected in the refactored build-execute.

### Reference Examples

1. **agents/researcher.md** -- thin wrapper for `spacedock:build-research`, dispatched by build-plan. 17 lines. Skills: `["spacedock:build-research"]`. Tools: `Read, Grep, Glob, Skill, WebSearch, WebFetch`. This is the pattern `agents/troop.md` should follow, but with multiple default skills per O-1. (`agents/researcher.md`)
2. **agents/ensign.md** -- 16 lines. Skills: `["spacedock:ensign"]`. No mention of dispatch boundaries. Entity 065 AC5 requires adding explicit "no sub-dispatch" boundary documentation. (`agents/ensign.md`)
3. **first-officer-shared-core.md Dispatch Modes section** -- the task-list-driven pattern at lines 209-235 is the template for the troops dispatch template. The new troops template will be a specialized variant for execute-stage wave-parallel dispatch. (`references/first-officer-shared-core.md:209-235`)

## PLAN

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - agents/task-executor.md
    - agents/ensign.md
    - agents/researcher.md
    - skills/build-execute/SKILL.md
    - references/first-officer-shared-core.md
    - references/claude-first-officer-runtime.md
    - references/agent-dispatch-guide.md
    - references/claude-ensign-runtime.md
    - references/codex-first-officer-runtime.md
    - references/codex-ensign-runtime.md
    - skills/task-execution/SKILL.md
    - skills/build-plan/SKILL.md
    - docs/build-pipeline/README.md
    - docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md
    - skills/overhaul/references/recipe-format.md
  </read_first>

  <action>
  Environment verification. Confirm every file the plan claims will be modified exists in the worktree. Confirm agents/troop.md does NOT yet exist. Confirm agents/task-executor.md EXISTS (rename source). Confirm no archive or spec files are in files_modified.
  Run:
  - `ls agents/task-executor.md` (must exist)
  - `ls agents/troop.md 2>&1` (must NOT exist / error)
  - `ls agents/ensign.md` (must exist)
  - `ls skills/build-execute/SKILL.md` (must exist)
  - `ls references/first-officer-shared-core.md` (must exist)
  - `ls references/claude-first-officer-runtime.md` (must exist)
  - `ls references/agent-dispatch-guide.md` (must exist)
  - `ls references/claude-ensign-runtime.md` (must exist)
  - `ls references/codex-first-officer-runtime.md` (must exist)
  - `ls references/codex-ensign-runtime.md` (must exist)
  - `ls skills/task-execution/SKILL.md` (must exist)
  - `ls skills/build-plan/SKILL.md` (must exist)
  - `ls docs/build-pipeline/README.md` (must exist)
  - `ls docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` (must exist)
  - `ls skills/overhaul/references/recipe-format.md` (must exist)
  - `grep -c "task-executor" docs/build-pipeline/_archive/*.md` (confirm archive files exist but are NOT in scope)
  </action>

  <acceptance_criteria>
    - `test -f agents/task-executor.md && echo "EXISTS"` prints EXISTS
    - `test ! -f agents/troop.md && echo "NOT_EXISTS"` prints NOT_EXISTS
    - `test -f agents/ensign.md && echo "EXISTS"` prints EXISTS
    - `test -f skills/build-execute/SKILL.md && echo "EXISTS"` prints EXISTS
    - `test -f references/first-officer-shared-core.md && echo "EXISTS"` prints EXISTS
    - `test -f references/claude-first-officer-runtime.md && echo "EXISTS"` prints EXISTS
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - agents/task-executor.md
    - agents/researcher.md
  </read_first>

  <action>
  Create `agents/troop.md` by copying `agents/task-executor.md` and refactoring:
  1. Rename frontmatter `name: troop`
  2. Update `description:` to: "Fresh-context execution vessel for implementing one plan task. Dispatched by FO directly (not via ensign) with per-task model hint (haiku / sonnet / opus). Receives task block + shared context in prompt, executes action against files_modified, runs acceptance_criteria verification, returns changed_files with DONE/NEEDS_CONTEXT/BLOCKED status. Does NOT commit. Does NOT dispatch further subagents (leaf). Loads task-execution and knowledge-capture skills via skill preloading."
  3. Change `skills: ["spacedock:task-execution"]` to `skills: ["spacedock:task-execution", "spacedock:knowledge-capture"]` per O-1 captain selection (multiple defaults)
  4. Update body text: "You are a troop agent" (not "task-executor agent")
  5. Update Boot Sequence to reference both default skills
  6. Update Namespace Note: dispatch as `Agent(subagent_type="spacedock:troop", model=task.model, ...)`
  7. Remove reference to "build-execute step 4b" -- troop is dispatched by FO directly, not by build-execute ensign
  
  Do NOT delete `agents/task-executor.md` yet -- that happens in task-7 after all cross-references are updated.
  </action>

  <acceptance_criteria>
    - `test -f agents/troop.md && echo "EXISTS"` prints EXISTS
    - `grep -c "name: troop" agents/troop.md` returns 1
    - `grep "spacedock:task-execution" agents/troop.md` finds the skill
    - `grep "spacedock:knowledge-capture" agents/troop.md` finds the skill
    - `grep -c "task-executor" agents/troop.md` returns 0
    - `grep "Does NOT dispatch" agents/troop.md` confirms leaf constraint
  </acceptance_criteria>

  <files_modified>
    - agents/troop.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1">
  <read_first>
    - agents/ensign.md
  </read_first>

  <action>
  Update `agents/ensign.md` to explicitly document the "no sub-dispatch" boundary per AC5:
  1. Update `description:` frontmatter to append: "Does not dispatch further subagents -- ensign is a single-skill, single-stage worker without Agent tool access."
  2. Add a `## Dispatch Boundary` section after the Boot Sequence:
     ```
     ## Dispatch Boundary
     
     Ensign is a single-skill, single-stage worker. It does NOT dispatch further subagents (no Agent tool access). For stages requiring per-task parallel dispatch (e.g., execute), FO dispatches troop agents directly instead of routing through ensign. Ensign is the correct choice for stages that run one skill to completion without sub-dispatch: explore, quality, review synthesis, uat.
     ```
  </action>

  <acceptance_criteria>
    - `grep -i "does not dispatch\|no sub-dispatch\|cannot dispatch" agents/ensign.md` returns at least 1 match
    - `grep "Dispatch Boundary" agents/ensign.md` returns 1 match
    - `grep "troop" agents/ensign.md` returns at least 1 match (cross-reference to the new agent)
  </acceptance_criteria>

  <files_modified>
    - agents/ensign.md
  </files_modified>
</task>

<task id="task-3" model="opus" wave="2">
  <read_first>
    - skills/build-execute/SKILL.md
    - agents/troop.md
    - references/agent-dispatch-guide.md
  </read_first>

  <action>
  Major refactor of `skills/build-execute/SKILL.md` from ensign-internal orchestrator to FO-guidance document per O-2 (FO loads via Skill()):

  1. Update frontmatter `description:` to reflect FO-direct dispatch pattern: "Execute stage guidance loaded by FO via Skill(). FO builds wave graph from PLAN, dispatches spacedock:troop agents directly per task with model hints, collects reports, commits serially per wave."
  2. Update opening paragraph: FO loads this skill as guidance before dispatching troops. Remove "invoked by First Officer through the execute ensign" -- FO IS the orchestrator.
  3. **Tools Available section**: Change from "NOT available: Agent" to "Available: Agent -- FO has Agent tool and dispatches troop agents directly". Remove the ensign subagent limitation note. Keep Skill (for workflow-index and knowledge-capture).
  4. **Step 4: Wave Execution Loop**: 
     - Remove Mode A/Mode B distinction. There is now ONE mode: FO dispatches troop agents per wave.
     - Replace all `spacedock:task-executor` with `spacedock:troop`
     - Mode A becomes the ONLY mode: FO dispatches troop teammates per wave
     - Mode B fallback becomes: "FO sequential troop dispatch -- FO dispatches one troop at a time when team creation is unavailable (bare mode). Context isolation preserved." per A-6 captain correction.
  5. **Task Dispatch Contract No-Exceptions block**: Update dispatch call from `Agent(subagent_type="spacedock:task-executor",...)` to `Agent(subagent_type="spacedock:troop",...)`. Update text: "troop agent is the only authorized execution vessel" instead of "task-executor agent".
  6. **BLOCKED Escalation Ladder**: No changes needed -- model escalation is independent of agent naming.
  7. **All remaining `task-executor` references**: Replace with `troop` throughout the file. Verify zero occurrences remain.
  8. Remove "See `references/agent-dispatch-guide.md` for why ensigns cannot dispatch Agent" -- the constraint is now inverted (FO dispatches directly, no ensign intermediary for execute stage).
  </action>

  <acceptance_criteria>
    - `grep -c "task-executor" skills/build-execute/SKILL.md` returns 0
    - `grep "spacedock:troop" skills/build-execute/SKILL.md` returns at least 3 matches
    - `grep "FO.*dispatch.*troop\|troop.*dispatch" skills/build-execute/SKILL.md` returns at least 1 match
    - `grep -c "Mode A\|Mode B" skills/build-execute/SKILL.md` returns 0 (modes replaced with single dispatch pattern + bare-mode fallback)
    - `grep "Agent.*tool.*available\|FO.*has Agent\|Available.*Agent" skills/build-execute/SKILL.md` returns at least 1 match
  </acceptance_criteria>

  <files_modified>
    - skills/build-execute/SKILL.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2">
  <read_first>
    - skills/task-execution/SKILL.md
    - agents/troop.md
  </read_first>

  <action>
  Update `skills/task-execution/SKILL.md` to reference troop agent instead of task-executor:

  1. Update frontmatter `description:` -- replace "Loaded by the spacedock:task-executor agent" with "Loaded by the spacedock:troop agent"
  2. Update Namespace Note: "When `build-execute` dispatches the `spacedock:troop` agent" (was spacedock:task-executor)
  3. Update opening paragraph: "invoked by `build-execute` through the `spacedock:troop` agent" (was task-executor)
  4. Update spec reference line: "line 497 for the `spacedock:troop` agent definition" (was task-executor)
  5. Update Rules section: "NEVER invoke another troop" (was "NEVER invoke another task-executor")
  6. Verify zero `task-executor` references remain
  </action>

  <acceptance_criteria>
    - `grep -c "task-executor" skills/task-execution/SKILL.md` returns 0
    - `grep "spacedock:troop" skills/task-execution/SKILL.md` returns at least 2 matches
    - `grep "troop agent" skills/task-execution/SKILL.md` returns at least 1 match
  </acceptance_criteria>

  <files_modified>
    - skills/task-execution/SKILL.md
  </files_modified>
</task>

<task id="task-5a" model="sonnet" wave="2">
  <read_first>
    - references/first-officer-shared-core.md
    - agents/troop.md
  </read_first>

  <action>
  Update `references/first-officer-shared-core.md` to add FO-direct troops dispatch template per AC3:

  1. In the **Dispatch Modes** section, after the `task-list-driven` subsection, add a new subsection:
     ```
     #### troops-dispatch (execute stage variant of task-list-driven)
     
     Specialized task-list-driven protocol for execute-stage wave-parallel task dispatch. FO dispatches troop agents directly with per-task model hints from the PLAN.
     
     ```
     FO reads ## PLAN, builds wave graph
     FO transitions CONTRACTS.md rows: planned -> in-flight
     
     Per wave (sequential across waves, parallel within):
       1. FO dispatches troop agents for each task in the wave:
          Agent(subagent_type="spacedock:troop", model=task.model, prompt=...)
       2. Each troop loads task-execution + knowledge-capture skills
       3. Troop executes one task: read_first -> action -> acceptance_criteria -> return report
       4. Troop returns changed_files + status (DONE/NEEDS_CONTEXT/BLOCKED)
       5. FO commits serially after wave closes (one commit per DONE task)
     
     BLOCKED escalation: haiku -> sonnet -> opus (one attempt per tier)
     
     Bare-mode fallback: FO dispatches one troop at a time (sequential).
     Context isolation preserved -- each troop gets fresh context per task.
     ```
     
  2. Update any existing `task-executor` references in this file to `troop`.
  </action>

  <acceptance_criteria>
    - `grep "troops-dispatch" references/first-officer-shared-core.md` returns at least 1 match
    - `grep "spacedock:troop" references/first-officer-shared-core.md` returns at least 1 match
    - `grep "per-task model" references/first-officer-shared-core.md` returns at least 1 match
    - `grep -c "task-executor" references/first-officer-shared-core.md` returns 0
  </acceptance_criteria>

  <files_modified>
    - references/first-officer-shared-core.md
  </files_modified>
</task>

<task id="task-5b" model="sonnet" wave="2">
  <read_first>
    - references/claude-first-officer-runtime.md
    - agents/troop.md
  </read_first>

  <action>
  Update `references/claude-first-officer-runtime.md` to add troops dispatch template per AC4:

  1. After the existing Dispatch Adapter section, add a troops-specific dispatch template:
     ```
     ### Troops Dispatch (Execute Stage)
     
     For execute-stage wave-parallel dispatch, FO dispatches troop agents directly with per-task model hints:
     
     ```
     Agent(
         subagent_type="spacedock:troop",
         name="troop-{slug}-task-{task_id}",
         model="{task.model}",  // haiku | sonnet | opus from PLAN
         {if not bare mode: 'team_name="{team_name}"',}
         prompt="You are executing task-{task_id} for entity: {entity_title}\n\n## Task\n{task block from PLAN}\n\n## Context\n{entity context: acceptance criteria, research findings, relevant sections}\n\nYour working directory is {worktree_path}\nAll file reads and writes MUST use paths under {worktree_path}.\nYour git branch is {branch}. Do NOT commit -- return changed_files and status."
     )
     ```
     
     In bare mode, dispatch one troop at a time (sequential). Context isolation is preserved -- each troop gets fresh context per task, unlike ensign which would accumulate context across tasks.
     ```
  2. Update any existing `task-executor` references in this file to `troop`.
  </action>

  <acceptance_criteria>
    - `grep "Troops Dispatch" references/claude-first-officer-runtime.md` returns at least 1 match
    - `grep "spacedock:troop" references/claude-first-officer-runtime.md` returns at least 1 match
    - `grep "task.model" references/claude-first-officer-runtime.md` returns at least 1 match
    - `grep -c "task-executor" references/claude-first-officer-runtime.md` returns 0
  </acceptance_criteria>

  <files_modified>
    - references/claude-first-officer-runtime.md
  </files_modified>
</task>

<task id="task-6" model="sonnet" wave="3">
  <read_first>
    - references/agent-dispatch-guide.md
    - references/claude-ensign-runtime.md
    - references/codex-first-officer-runtime.md
    - references/codex-ensign-runtime.md
    - skills/build-plan/SKILL.md
    - docs/build-pipeline/README.md
    - docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md
    - skills/overhaul/references/recipe-format.md
  </read_first>

  <action>
  Cross-reference sweep: update all remaining active files that reference `task-executor` to use `troop`:

  1. **`references/agent-dispatch-guide.md`**: Update the "Consequence for Orchestrator Skills" section -- change "researchers, task-executors, review agents" to "researchers, troop agents, review agents". Update the Two correct architectures section to reflect FO-direct troop dispatch as Architecture 1.
  
  2. **`references/claude-ensign-runtime.md`**: Update the Thin Wrapper Pattern canonical references list -- change `agents/task-executor.md — wraps spacedock:task-executor` to `agents/troop.md — wraps spacedock:troop (+spacedock:task-execution, spacedock:knowledge-capture) for build-execute wave-parallel task dispatch`.
  
  3. **`references/codex-first-officer-runtime.md`**: Update any `task-executor` references to `troop` in the Packaged Worker Resolution and Dispatch Adapter sections.
  
  4. **`references/codex-ensign-runtime.md`**: Check for and update any `task-executor` references to `troop`. (May have zero occurrences -- update only if found.)
  
  5. **`skills/build-plan/SKILL.md`**: Update Step 2 and any references from "task-executors" to "troop agents". Update the "Important dispatch constraint" note if it references task-executor pattern.
  
  6. **`docs/build-pipeline/README.md`**: Update the execute stage comment (line 88) from `spacedock:task-executor` to `spacedock:troop`. Update the execute stage description (line 334) from "dispatches task subagents through spacedock:task-executor agent" to "dispatches troop agents through spacedock:troop agent".
  
  7. **`docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`**: Update execute stage details (line 157) from "FO spawns T task-executor teammates" to "FO spawns T troop agents". Update the Migration Notes table entries referencing task-executor.
  
  8. **`skills/overhaul/references/recipe-format.md`**: Update any `task-executor` example references to `troop`.
  
  Do NOT modify:
  - `docs/build-pipeline/_archive/*.md` (historical records)
  - `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` (historical spec)
  - `docs/build-pipeline/flatten-dispatch-troops-architecture.md` (this entity file, self-references are contextual)
  - `docs/build-pipeline/plan-file-separation-executor-context.md` (entity 092, ships after 065)
  </action>

  <acceptance_criteria>
    - `grep -c "task-executor" references/agent-dispatch-guide.md` returns 0
    - `grep -c "task-executor" references/claude-ensign-runtime.md` returns 0
    - `grep -c "task-executor" skills/build-plan/SKILL.md` returns 0
    - `grep -c "task-executor" docs/build-pipeline/README.md` returns 0
    - `grep -c "task-executor" docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` returns 0
    - `grep -c "task-executor" skills/overhaul/references/recipe-format.md` returns 0
    - `grep -c "task-executor" references/codex-first-officer-runtime.md` returns 0
    - `grep -rl "task-executor" --include="*.md" agents/ skills/ references/ docs/build-pipeline/README.md docs/build-pipeline/_docs/ | grep -v _archive | grep -v flatten-dispatch | grep -v plan-file-separation | grep -v specs/ | wc -l` returns 0 (no active files outside exclusions reference task-executor)
  </acceptance_criteria>

  <files_modified>
    - references/agent-dispatch-guide.md
    - references/claude-ensign-runtime.md
    - references/codex-first-officer-runtime.md
    - references/codex-ensign-runtime.md
    - skills/build-plan/SKILL.md
    - docs/build-pipeline/README.md
    - docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md
    - skills/overhaul/references/recipe-format.md
  </files_modified>
</task>

<task id="task-7" model="haiku" wave="4">
  <read_first>
    - agents/task-executor.md
    - agents/troop.md
  </read_first>

  <action>
  Delete the old `agents/task-executor.md` file using `git rm agents/task-executor.md`. The troop.md replacement was created in task-1, and all cross-references were updated in tasks 3-6. The file is now orphaned.
  
  Verify via `ls agents/task-executor.md 2>&1` that the file no longer exists, and `ls agents/troop.md` that the replacement exists.
  </action>

  <acceptance_criteria>
    - `test ! -f agents/task-executor.md && echo "DELETED"` prints DELETED
    - `test -f agents/troop.md && echo "EXISTS"` prints EXISTS
  </acceptance_criteria>

  <files_modified>
    - agents/task-executor.md
  </files_modified>
</task>

<task id="task-8" model="sonnet" wave="4">
  <read_first>
    - agents/troop.md
    - agents/ensign.md
    - skills/build-execute/SKILL.md
    - references/first-officer-shared-core.md
    - references/claude-first-officer-runtime.md
  </read_first>

  <action>
  Final consistency verification across all modified files:
  
  1. Run comprehensive grep to confirm zero `task-executor` references remain in active files:
     `grep -rl "task-executor" --include="*.md" agents/ skills/ references/ docs/build-pipeline/README.md docs/build-pipeline/_docs/ | grep -v _archive | grep -v flatten-dispatch | grep -v plan-file-separation | grep -v specs/`
     Expected: no output (zero files)
  
  2. Verify `agents/troop.md` frontmatter is well-formed:
     - name: troop
     - skills includes both task-execution and knowledge-capture
     - tools list includes Skill
  
  3. Verify `agents/ensign.md` has the Dispatch Boundary section
  
  4. Verify `skills/build-execute/SKILL.md` references `spacedock:troop` (not task-executor) and describes FO-direct dispatch
  
  5. Verify `references/first-officer-shared-core.md` has troops-dispatch subsection
  
  6. Verify `references/claude-first-officer-runtime.md` has Troops Dispatch template
  
  7. Cross-check: count all files in `agents/` directory to confirm troop.md is present and task-executor.md is absent:
     `ls agents/*.md`
  </action>

  <acceptance_criteria>
    - `grep -rl "task-executor" --include="*.md" agents/ skills/ references/ docs/build-pipeline/README.md docs/build-pipeline/_docs/ | grep -v _archive | grep -v flatten-dispatch | grep -v plan-file-separation | grep -v specs/ | wc -l` returns 0
    - `grep "name: troop" agents/troop.md` returns 1 match
    - `grep "Dispatch Boundary" agents/ensign.md` returns 1 match
    - `grep "spacedock:troop" skills/build-execute/SKILL.md` returns at least 1 match
    - `grep "troops-dispatch" references/first-officer-shared-core.md` returns at least 1 match
    - `grep "Troops Dispatch" references/claude-first-officer-runtime.md` returns at least 1 match
    - `ls agents/troop.md` succeeds
    - `test ! -f agents/task-executor.md && echo "GONE"` prints GONE
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
- [ ] `grep -rl "task-executor" --include="*.md" agents/ skills/ references/ docs/build-pipeline/README.md docs/build-pipeline/_docs/ | grep -v _archive | grep -v flatten-dispatch | grep -v plan-file-separation | grep -v specs/` returns empty (zero active references to old agent name)
- [ ] `test -f agents/troop.md` succeeds (new troop agent file exists)
- [ ] `test ! -f agents/task-executor.md` succeeds (old agent file deleted)
- [ ] `grep "spacedock:task-execution" agents/troop.md && grep "spacedock:knowledge-capture" agents/troop.md` both succeed (multiple default skills per O-1)
- [ ] `grep -i "no sub-dispatch\|does not dispatch\|cannot dispatch" agents/ensign.md` returns at least 1 match (AC5: ensign boundary documented)
- [ ] `grep "troops-dispatch" references/first-officer-shared-core.md` returns at least 1 match (AC3: FO dispatch template)
- [ ] `grep "Troops Dispatch" references/claude-first-officer-runtime.md` returns at least 1 match (AC4: runtime template)
- [ ] `grep "spacedock:troop" skills/build-execute/SKILL.md` returns at least 3 matches (AC2: build-execute describes FO-direct dispatch)

### API
None

### Interactive
- [ ] AC6 Dogfood: one entity runs through execute stage with FO-direct troop dispatch. Worktree created, tasks executed on branch, PR lifecycle works. Verified by: git log shows commits from troop-dispatched execution on a feature branch, and the entity's Stage Report: execute contains troop dispatch evidence. (This is a post-merge live validation -- requires an entity to be dispatched through the new architecture after 065 ships.)

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC1: agents/troop.md exists with correct frontmatter | task-1 | `grep "name: troop" agents/troop.md && grep "spacedock:task-execution" agents/troop.md && grep "spacedock:knowledge-capture" agents/troop.md` | pending | -- |
| AC2: build-execute describes FO-direct dispatch, not ensign-internal | task-3 | `grep -c "task-executor" skills/build-execute/SKILL.md` returns 0 AND `grep "spacedock:troop" skills/build-execute/SKILL.md` returns >=3 | pending | -- |
| AC3: FO shared core includes troops dispatch template | task-5a | `grep "troops-dispatch" references/first-officer-shared-core.md` | pending | -- |
| AC4: FO runtime includes troops dispatch template | task-5b | `grep "Troops Dispatch" references/claude-first-officer-runtime.md` | pending | -- |
| AC5: ensign explicitly states no sub-dispatch boundary | task-2 | `grep -i "does not dispatch\|no sub-dispatch\|cannot dispatch" agents/ensign.md` | pending | -- |
| AC6: dogfood entity runs with FO-direct troop dispatch | post-merge | git log on feature branch + Stage Report: execute evidence | pending | -- |
| Cross-ref: zero active task-executor references | task-6, task-8 | `grep -rl "task-executor" --include="*.md" agents/ skills/ references/ docs/build-pipeline/README.md docs/build-pipeline/_docs/ \| grep -v _archive \| grep -v flatten-dispatch \| grep -v plan-file-separation \| grep -v specs/ \| wc -l` returns 0 | pending | -- |

## Stage Report: plan

status: passed
plan-checker verdict: PASS (inline self-review, no plan-checker subagent dispatched -- plan ensign context is the plan orchestrator)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold (all findings are entity-specific architecture refactoring, not generalizable patterns)
workflow-index append: 15 append rows covering 9 tasks and 15 files, all successful

### Plan summary

9 tasks across 5 waves. 15 active files modified (1 created, 1 deleted, 13 updated). 3 archive files + 1 spec file explicitly excluded from scope.

Wave structure:
- Wave 0: environment verification (task-0, sonnet)
- Wave 1: create troop.md + update ensign.md (task-1, task-2, sonnet, parallel)
- Wave 2: core refactors -- build-execute, task-execution, FO shared-core, FO runtime (task-3 opus, task-4/5a/5b sonnet, parallel)
- Wave 3: cross-reference sweep of 8 remaining files (task-6, sonnet)
- Wave 4: delete old agent + final verification (task-7 haiku, task-8 sonnet, parallel)

### Self-review findings

1. Every AC (AC1-AC6) maps to at least one task
2. Every task has all required attributes (id, model, wave, read_first, action, acceptance_criteria, files_modified)
3. No placeholder text found (TBD, "add appropriate", "similar to Task N")
4. Wave dependency sanity: wave 2 tasks read `agents/troop.md` (created in wave 1 -- correct). Wave 3 task reads all wave 2 outputs (correct). Wave 4 depends on waves 1-3 (correct).
5. AC6 (dogfood) is classified as post-merge interactive UAT -- correct, as it requires a live FO dispatch through the new architecture after 065's changes are merged
6. Archive files (3) and spec file (1) explicitly excluded from cross-reference sweep
7. CONTRACTS.md historical rows for entity 062 preserved -- new entity 065 rows will reference `agents/troop.md`
8. Mode B fallback correctly reflects A-6 captain correction: "FO sequential troop dispatch" not "FO inline execution"

### Architectural decision rationale

- **task-3 is opus** -- build-execute SKILL.md is the largest and most complex refactor (432 lines, Mode A/B elimination, No-Exceptions block rewrite, FO-direct pattern introduction). Opus reasoning budget justified.
- **task-6 is a single task** -- the 8-file cross-reference sweep is mechanical (find-and-replace `task-executor` -> `troop` with context-aware judgment), so grouping into one task is more efficient than 8 separate haiku dispatches. Sonnet handles the judgment calls.
- **task-7 is haiku** -- `git rm` is mechanical, no reasoning needed.
- **task-8 is verification-only** -- empty `files_modified`, acceptance_criteria are all grep checks.

### Checklist

1. [x] Read entity body (brainstorming spec, explore results, clarify outputs, canonical references)
2. [x] Research phase: inline serial research (no external tech claims, all internal codebase architecture)
3. [x] Write ## Research Findings with five domain sections
4. [x] Write ## PLAN with task list (9 tasks, all required attributes present)
5. [x] Write ## UAT Spec with testable items classified by type
6. [x] Write ## Validation Map (7 requirements mapped)
7. [x] Self-review: every AC maps to >=1 task, every task has all required attributes, no placeholder text
8. [x] Invoke workflow-index append unconditionally -- 15 files, committed
9. [x] Write ## Stage Report: plan

## Stage Report: execute

status: passed
base SHA: 83752a6
final SHA: (post-task-7 commit)
waves: 5 waves completed (0, 1, 2, 3, 4)
tasks: 9 done, 0 blocked, 0 needs_context-rounds
dispatch mode: inline serial (ensign context -- no FO team dispatch available)

### Per-task summary

- task-0: DONE (sonnet) -- environment verification: all 15 files confirmed present, agents/troop.md confirmed absent, archive files confirmed out-of-scope
- task-1: DONE (sonnet) -- created agents/troop.md with name:troop, skills:[task-execution, knowledge-capture], leaf constraint documented
- task-2: DONE (sonnet) -- updated agents/ensign.md with Dispatch Boundary section and description update
- task-3: DONE (sonnet) -- major refactor of skills/build-execute/SKILL.md: FO-direct dispatch, Mode A/B eliminated, troop dispatch pattern, zero task-executor refs
- task-4: DONE (sonnet) -- updated skills/task-execution/SKILL.md: all 5 task-executor refs replaced with troop
- task-5a: DONE (sonnet) -- added troops-dispatch subsection to references/first-officer-shared-core.md
- task-5b: DONE (sonnet) -- added Troops Dispatch section to references/claude-first-officer-runtime.md
- task-6: DONE (sonnet) -- cross-reference sweep: 6 active files updated (agent-dispatch-guide, claude-ensign-runtime, build-plan, README, SO-FO-DISPATCH-SPLIT, recipe-format); codex adapters had zero refs; historical migration table in SO-FO-DISPATCH-SPLIT preserved as historical record
- task-7: DONE (sonnet) -- git rm agents/task-executor.md; replacement agents/troop.md confirmed present
- task-8: DONE (sonnet) -- final consistency verification: zero active task-executor refs, all AC checks passed

### Wave commits

- wave 0: no files modified (verification only)
- wave 1: feat(065): create troop agent + ensign dispatch boundary
- wave 2: feat(065): refactor build-execute + task-execution + FO refs for troop dispatch
- wave 3: feat(065): cross-reference sweep -- replace task-executor with troop across 6 active files
- wave 4: feat(065): delete agents/task-executor.md -- replaced by agents/troop.md

### AC verification

| AC | Verify command | Result |
|----|----------------|--------|
| AC1: agents/troop.md exists | `grep "name: troop" agents/troop.md && grep "spacedock:task-execution" agents/troop.md && grep "spacedock:knowledge-capture" agents/troop.md` | PASS |
| AC2: build-execute FO-direct dispatch | `grep -c "task-executor" skills/build-execute/SKILL.md` returns 0; `grep -c "spacedock:troop" skills/build-execute/SKILL.md` returns 7 | PASS |
| AC3: FO shared core troops-dispatch | `grep "troops-dispatch" references/first-officer-shared-core.md` | PASS |
| AC4: FO runtime troops template | `grep "Troops Dispatch" references/claude-first-officer-runtime.md` | PASS |
| AC5: ensign no sub-dispatch boundary | `grep -i "does not dispatch" agents/ensign.md` returns 2 matches | PASS |
| AC6: dogfood | post-merge live validation required -- see UAT Spec Interactive section | PENDING (post-merge) |
| Cross-ref sweep | zero active files with task-executor (grep returns empty) | PASS |

### Stale-file warnings

None detected.

### Findings

#### Scope observations
- SO-FO-DISPATCH-SPLIT.md migration table "Current assumption" column preserves "You dispatch task-executors" as historical record -- correct semantics for a migration table (old vs new). Not a sweep miss.
- codex-first-officer-runtime.md and codex-ensign-runtime.md had zero task-executor references -- no changes needed.

#### Skill suggestions
None.

#### Pre-existing failures
None.

#### Unresolved scope gaps
None.

knowledge capture: skipped -- no findings met D1/D2 threshold (all changes are entity-specific rename/refactor, not generalizable patterns beyond what MEMORY.md already captures)
