# Agent Dispatch Guide

Reference document for spacedock skill authors and runtime adapters. Covers the tool surface constraints, dispatch patterns, and agent teams best practices. Produced from Phase E Plan 4 dogfood (entity 062) live testing on 2026-04-12.

**Cite this doc** from any skill that dispatches agents or references parallel worker patterns. For workflow-specific stage dispatch mapping, see the workflow's own documentation (e.g., `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`).

---

## Tool Surface Reality

The Agent tool -- the mechanism for spawning subagents and teammates -- is **main-session exclusive**. No dispatched agent (subagent or teammate) can use it, regardless of configuration.

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
3. **Only the main session has Agent.** This is by design per Claude Code docs: "teammates cannot spawn their own teams or teammates. Only the lead can manage the team."

### Three-Tier Tool Surface in Subagent Context

| Tier | Examples | Availability |
|---|---|---|
| Always loaded | Read, Edit, Write, Bash, Grep, Glob | Available immediately |
| Deferred but searchable | Skill, ToolSearch, MCP tools, SendMessage, TaskCreate | Available after ToolSearch fetch |
| Entirely absent | Agent | Not in loaded OR deferred tools; cannot be granted |

### Haiku Hallucination Warning

Haiku models confabulate tool lists from prompt context without checking function definitions. In entity 062 testing, haiku reported "Agent tool: LOADED" when it was not present -- a false positive that led to incorrect architectural conclusions. **Always use sonnet or higher for tool-surface probes, and verify via actual invocation, not self-reported lists.**

---

## Who Can Dispatch What

| Caller | Can dispatch via Agent tool | Communication |
|---|---|---|
| **Main session** (team lead, FO, SO, captain) | YES -- any subagent_type, with or without team_name | Direct text output + full tool surface |
| **Teammate** (dispatched with team_name) | NO -- Agent tool absent | SendMessage to other teammates + team lead |
| **Bare subagent** (dispatched without team_name) | NO -- Agent tool absent | Return value to caller only |

### Consequence for Orchestrator Skills

Skills that assume their caller has Agent tool for dispatching parallel workers (researchers, task-executors, review agents) will fail silently when loaded by an ensign or other subagent. **The ensign is a subagent that cannot dispatch.**

Two correct architectures:

1. **Two-phase dispatch:** The main session dispatches workers directly (Phase 1), then dispatches the ensign for synthesis (Phase 2). Workers write results to files; the ensign reads files. Communication happens through files, not through the main session's context window.

2. **Main-session-as-orchestrator:** The main session loads the skill directly and follows its dispatch instructions. No ensign involved. This is simpler but loads more into the main session's context.

---

## Dispatch Pattern Definitions

Abstract patterns reusable across any workflow. Workflow-specific stage mapping belongs in the workflow's own docs.

### Manual
Captain-owned. No agent dispatches anything. Captain edits directly.

### Inline
The main session (FO, SO, or captain) handles the logic in its own context without dispatching anyone. Used for lightweight decisions.

### Captain-Interactive
Runs in the captain's --agent session. Uses native AskUserQuestion UI for dialogue.

### Simple Subagent
Main session dispatches one ensign/worker as a subagent or teammate. Worker does all work inline (no sub-dispatch). Suitable for single-threaded stages.

### Task List-Driven (Agent Team)
Main session creates a team with shared task list. Workers self-claim tasks and coordinate via SendMessage. Task dependencies enforce ordering.

- **Task count is topic-driven, not fixed.** Derived from entity context (research topics, plan tasks, exploration domains). Not hardcoded at design time.
- **Teammate count <= task count.** Main session spawns M teammates where M <= N. Teammates self-claim tasks -- if N=5 and M=3, each worker claims one, finishes, then claims the next.
- **Pattern:**
  1. Main session extracts topics/tasks from context (topic-driven)
  2. Creates team + tasks with dependencies (synthesis task depends on all worker tasks)
  3. Spawns M worker teammates (general-purpose with role in prompt)
  4. Workers self-claim unblocked tasks
  5. Workers write results to shared files
  6. Dependency-gated synthesis task auto-unblocks when prerequisites done
  7. Synthesis worker reads file results, produces output

### Debate-Driven (Agent Team)
Main session creates a team of 3-4 workers with different focus areas. Workers analyze independently, then challenge each other's findings via SendMessage. Inter-worker debate produces higher-quality findings than independent parallel work.

- **Pattern:**
  1. Main session creates team with themed workers
  2. Each worker independently analyzes the target
  3. Workers SendMessage findings to each other and debate
  4. Main session reads the discussion + final findings, synthesizes output

---

## Agent Teams Best Practices

### Use Teams When Workers Need to Talk

Agent teams' unique value is inter-teammate SendMessage. If workers just write results independently, a simpler fan-out (main session dispatches N bare subagents) is cheaper. Use teams when workers need to challenge each other, coordinate on overlapping context, or flag cross-cutting issues.

### Task Dependencies Enforce Ordering

Instead of manually tracking completion, express ordering as task dependencies:
```
Group 1 tasks: no dependencies (all unblocked)
Group 2 tasks: depend on group 1 tasks
Group 3 tasks: depend on group 2 tasks
```
Task list auto-unblocks when dependencies complete. Workers self-claim unblocked tasks.

### Keep Teams Small

3-5 teammates per dispatch. More teammates = more coordination overhead + token cost. Per official docs: "Three focused teammates often outperform five scattered ones."

### Workers Write to Files, Not to Main Session

Workers communicate results through shared files (entity body, worktree files), not through SendMessage to the main session. This keeps the main session's context small and gives the synthesis step a clean read surface.

Exception: short status updates via SendMessage are fine. Full findings go in files.

### Main Session is Relay, Not Reader

The main session dispatches workers and tracks completion via task list status. It does NOT read full worker output. It dispatches a synthesis worker which reads the files. This prevents context bloat.

---

## Skill Authoring Checklist

When writing a skill that references Agent dispatch:

- [ ] **Never assume the caller has Agent tool.** If the skill is loaded by an ensign (subagent), Agent is absent.
- [ ] **Include a runtime probe fallback.** `ToolSearch(query="select:Agent")` -- if absent, document the inline fallback path.
- [ ] **Document who dispatches.** "Main session dispatches researchers before invoking this skill" vs "This skill dispatches researchers internally."
- [ ] **Reference this guide.** Cite `references/agent-dispatch-guide.md` so future readers know the constraint.
- [ ] **Use sonnet+ for tool probes.** Haiku confabulates tool lists. Never trust haiku's tool-surface self-report.
