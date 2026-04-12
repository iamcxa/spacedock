---
id: 065
title: Flatten Dispatch -- FO Direct Troops + Ensign Role Reduction
status: draft
context_status:
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
