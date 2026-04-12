# Agent Dispatch Guide

Reference document for spacedock skill authors and FO runtime adapters. Covers the tool surface constraints, dispatch patterns, and agent teams integration strategy. Produced from Phase E Plan 4 dogfood (entity 062) live testing on 2026-04-12.

**Cite this doc** from any skill that dispatches agents or references parallel worker patterns.

---

## Tool Surface Reality

The Agent tool -- the mechanism for spawning subagents and teammates -- is **team-lead exclusive**. No dispatched agent (subagent or teammate) can use it, regardless of configuration.

### Verification Matrix (all sonnet-verified, 2026-04-12)

| Dispatch mode | subagent_type | team_name | tools frontmatter | Agent tool available? |
|---|---|---|---|---|
| Bare subagent | spacedock:ensign | no | no | NO |
| Team teammate | spacedock:ensign | yes | no | NO |
| Team teammate | spacedock:ensign | yes | yes (includes Agent) | NO |
| Team teammate | general-purpose | yes | N/A | NO |

**Key findings:**

1. **Agent is a privileged tool** filtered at the Claude Code runtime level. The `tools:` frontmatter allowlist controls normal tools (Read, Edit, Bash, Skill, etc.) but cannot grant Agent.
2. **`team_name` does not change tool surface.** The only difference between bare subagent and teammate dispatch is the communication channel (SendMessage). Tool availability is identical.
3. **Only the main session (team lead / FO) has Agent.** This is by design per Claude Code docs: "teammates cannot spawn their own teams or teammates. Only the lead can manage the team."

### Three-Tier Tool Surface in Subagent Context

| Tier | Examples | Availability |
|---|---|---|
| Always loaded | Read, Edit, Write, Bash, Grep, Glob | Available immediately |
| Deferred but searchable | Skill, ToolSearch, MCP tools, SendMessage, TaskCreate | Available after ToolSearch fetch |
| Entirely absent | Agent | Not in loaded OR deferred tools; cannot be granted |

### Haiku Hallucination Warning

Haiku models confabulate tool lists from prompt context without checking function definitions. In entity 062 testing, haiku reported "Agent tool: LOADED" when it was not present -- a false positive that led to incorrect architectural conclusions. **Always use sonnet or higher for tool-surface probes, and verify via actual invocation, not self-reported lists.**

---

## Dispatch Patterns

### Who Can Dispatch What

| Caller | Can dispatch via Agent tool | Communication |
|---|---|---|
| **Team lead (FO / main session)** | YES -- any subagent_type, with or without team_name | Direct text output to captain |
| **Teammate** | NO -- Agent tool absent | SendMessage to other teammates + team lead |
| **Bare subagent** | NO -- Agent tool absent | Return value to caller only |

### Consequence for Orchestrator Skills

Skills like build-plan, build-execute, and build-review were originally written assuming the ensign has Agent tool for dispatching parallel workers (researchers, task-executors, review agents). **This assumption is false.** The ensign is a subagent that cannot dispatch.

**Correct architecture:** FO dispatches the parallel workers directly (Phase 1), then dispatches the ensign for synthesis (Phase 2). Workers write results to the entity file; the ensign reads the entity file. Communication happens through files, not through FO's context window.

---

## Pipeline Stage Dispatch Taxonomy

Every pipeline stage uses one of these dispatch patterns:

### Manual
Captain-owned. FO does not dispatch. Captain edits the entity body directly.
- **Stages:** draft

### FO-Inline
FO handles the logic directly in its own context without dispatching anyone. Used for lightweight decisions.
- **Stages:** brainstorm (default for Small/Medium entities)
- **Upgrade path:** brainstorm auto-upgrades to Agent Team for Large entities or executability <=3/5

### Captain-Interactive
Runs in the captain's --agent session (not FO-dispatched). Uses native AskUserQuestion UI.
- **Stages:** clarify (Science Officer)

### Simple Teammate
FO dispatches one ensign as a subagent or teammate. Ensign does all work inline (no sub-dispatch). Suitable for single-threaded stages.
- **Stages:** quality (default), uat, explore (default for Small/Medium entities)
- **Upgrade path:** quality opts into Task List for projects with slow test suites (>5 min)

### Task List-Driven (Agent Team)
FO creates a team with shared task list. Workers self-claim tasks and coordinate via SendMessage. Task dependencies enforce ordering. FO spawns workers and monitors; workers self-organize.

- **Stages:** plan, execute, explore (Large entities)
- **Task count is topic-driven, not fixed.** For plan: FO extracts N research topics from the entity body (cap 5 per build-plan SKILL.md), creates N research tasks + 1 synthesis task. For execute: tasks come from the PLAN's task list with wave dependencies. For explore: FO identifies K exploration domains from the brainstorming spec layers.
- **Teammate count <= task count.** FO spawns M teammates where M <= N (typically 3 for research, wave-size for execute). Teammates self-claim tasks -- if N=5 and M=3, each researcher claims one task, finishes, then claims the next unclaimed one.
- **Pattern:**
  1. FO extracts topics/tasks from entity body (topic-driven, not hardcoded)
  2. FO creates team + tasks with dependencies (synthesis task depends on all worker tasks)
  3. FO spawns M worker teammates (M <= task count, general-purpose with role in prompt)
  4. Workers self-claim unblocked tasks
  5. Workers write results to entity file / worktree files
  6. Dependency-gated synthesis task auto-unblocks when prerequisites done
  7. Synthesis teammate (or ensign) reads file results, produces output

### Debate-Driven (Agent Team)
FO creates a team of 3-4 reviewers with different focus areas. Reviewers work independently, then challenge each other's findings via SendMessage. The inter-teammate debate produces higher-quality findings than independent parallel review.

- **Stages:** review
- **Pattern:**
  1. FO creates team with themed reviewers (e.g., security / correctness / style)
  2. Each reviewer independently analyzes the diff
  3. Reviewers SendMessage findings to each other and debate
  4. FO reads the discussion thread + final findings, synthesizes Stage Report

### Mod-Driven
Terminal stage handled by workflow mods (merge hooks, idle hooks). FO does not dispatch ensigns.
- **Stages:** shipped

---

## Stage-by-Stage Reference

| Stage | Default Pattern | Upgrade Condition | FO Dispatches | Workers Dispatch |
|---|---|---|---|---|
| draft | Manual | -- | nothing | -- |
| brainstorm | FO-inline | Large or <=3/5 executability | agent team (3 perspectives) | nothing (teammates debate) |
| explore | Simple teammate | Large entity (>15 files) | K explorer teammates (topic-driven, K = exploration domains) + ensign synthesis | nothing (explorers self-claim) |
| clarify | Captain-interactive | -- | nothing (SO runs in captain session) | -- |
| plan | Task list-driven | always | N research tasks (topic-driven, N = topics, cap 5) claimed by M researcher teammates (M <= N, typically 3) + 1 planner synthesis task | nothing (researchers self-claim) |
| execute | Task list-driven | always | T task-executor teammates (T = wave size or fewer; tasks self-claimed per wave) | nothing (self-claim per wave) |
| quality | Simple teammate | Slow test suite (>5 min) | 4 parallel command runners | nothing |
| review | Debate-driven | always | 3 themed reviewer teammates | nothing (reviewers debate) |
| uat | Simple teammate | -- | ensign + FO AskUserQuestion | nothing |
| shipped | Mod-driven | -- | nothing (hooks handle) | -- |

---

## Agent Teams Best Practices for Spacedock

### Use Teams When Teammates Need to Talk

Agent teams' unique value is inter-teammate SendMessage. If workers just write results independently, a simpler fan-out (FO dispatches N bare subagents) is cheaper. Use teams when:
- Reviewers need to challenge each other's findings (review stage)
- Researchers discover overlapping context and need to coordinate (plan stage)
- Task-executors hit cross-file issues mid-wave (execute stage)

### Task Dependencies Enforce Wave Ordering

Instead of FO manually tracking wave completion, express wave ordering as task dependencies:
```
Wave 1 tasks: no dependencies (all unblocked)
Wave 2 tasks: depend on wave 1 tasks
Wave 3 tasks: depend on wave 2 tasks
```
Task list auto-unblocks when dependencies complete. Workers self-claim unblocked tasks.

### Keep Teams Small

3-5 teammates per stage. More teammates = more coordination overhead + token cost. Per official docs: "Three focused teammates often outperform five scattered ones."

### Workers Write to Entity File, Not to FO

Workers communicate results through the entity file or worktree files, not through SendMessage to FO. This keeps FO's context small and gives the synthesis step (ensign or planner teammate) a clean read surface.

Exception: short status updates ("Task 3 done, found a gotcha in auth.ts") via SendMessage are fine. Full findings go in the file.

### FO is Relay, Not Reader

FO dispatches workers and tracks completion via task list status. FO does NOT read full worker output. FO dispatches ensign/synthesis teammate which reads the file. This prevents FO context bloat on large entities.

---

## Skill Authoring Checklist

When writing a skill that references Agent dispatch:

- [ ] **Never assume the caller has Agent tool.** If the skill is loaded by an ensign (subagent), Agent is absent.
- [ ] **Include a runtime probe fallback.** `ToolSearch(query="select:Agent")` -- if absent, document the inline fallback path.
- [ ] **Document who dispatches.** "FO dispatches researchers before invoking this skill" vs "This skill dispatches researchers internally."
- [ ] **Reference this guide.** Cite `references/agent-dispatch-guide.md` so future readers know the constraint.
- [ ] **Use sonnet+ for tool probes.** Haiku confabulates tool lists. Never trust haiku's tool-surface self-report.
