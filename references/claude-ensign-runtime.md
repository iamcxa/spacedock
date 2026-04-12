# Claude Code Ensign Runtime

This file defines how the shared ensign core executes on Claude Code.

## Agent Surface

The ensign is dispatched by the first officer via the Agent tool. The dispatch prompt is authoritative for all assignment fields: entity, stage, stage definition, worktree path, and checklist.

## Clarification

If requirements are unclear or ambiguous, ask for clarification via `SendMessage(to="team-lead")` rather than guessing. Describe what you understand and what's ambiguous so team-lead can get you a quick answer.

## Completion Signal

When your work is done, send a minimal completion message:

```
SendMessage(to="team-lead", message="Done: {entity title} completed {stage}. Report written to {entity_file_path}.")
```

The entity file is the artifact. Do not include the checklist or summary in the message. Plain text only. Never send JSON.

## Feedback Interaction

When dispatched for a feedback stage, the first officer may keep a prior-stage agent alive for messaging. If the reviewer finds issues, the first officer routes fixes through a fresh dispatch — the ensign does not directly message other agents about fixes.

If a prior-stage agent messages you with fixes (in teams mode), re-check and update your stage report, then send your updated completion message to the first officer.

## Third-Party Plugin Integration — Thin Wrapper Pattern

When an orchestrator skill (build-plan, build-execute, build-review, build-uat, etc.) needs to dispatch a third-party plugin's skill in parallel with other subagents, wrap the skill in a thin agent file. Do NOT invoke the plugin via direct `Skill()` from the orchestrator unless the skill is single-threaded (the `knowledge-capture` Step 4 precedent is the rare exception).

**Why a wrapper, not direct Skill() dispatch:**

- Fresh context isolation per dispatch (Phase E Guiding Principle #5 — "fresh context via subagent dispatch, not stage split")
- Parallel dispatch via the Agent tool (siblings run concurrently)
- Symmetric authoring style across all parallel-dispatch sites
- Decouples the orchestrator's tool allowlist from the wrapped skill's needs

**Wrapper file shape (15-22 lines):**

```yaml
---
name: <wrapper-name>
description: <1-2 sentence description of what the wrapped skill does, for FO/orchestrator routing>
model: inherit
color: <color>
skills: ["<namespace>:<skill>"]
tools: Read, Grep, Glob, Skill
---

You are a <role> loading the <namespace>:<skill> skill for this dispatch.

## Boot Sequence

If your operating contract was not already loaded via skill preloading, invoke the `<namespace>:<skill>` skill now to load it.

Then read your assignment and follow the skill's instructions.
```

**Tool allowlist discipline:**

- Always **exclude `Agent`** — wrappers are leaf dispatch targets; recursive fan-out is disallowed here by design
- Include `Skill` if the wrapped plugin's skill chains further Skill() calls internally (verify per plugin)
- Include `Read`/`Grep`/`Glob` by default for investigation work
- Include `Write`/`Edit`/`Bash` only when the wrapped skill's writes need to happen in the subagent context

**Canonical references in this plugin:**

- `agents/researcher.md` — wraps `spacedock:build-research` for build-plan Step 2 parallel research dispatch
- `agents/task-executor.md` — wraps `spacedock:task-executor` (+`spacedock:task-execution`) for build-execute Step 4 wave-parallel task dispatch
- `agents/code-explorer.md` — wraps `spacedock:code-explorer` for build-explore Step 2 deep codebase mapping (shipped in entity 062)
- `agents/sharp-edges-reviewer.md`, `agents/variant-analysis-reviewer.md`, `agents/insecure-defaults-reviewer.md`, `agents/differential-review-reviewer.md` — each wraps one trailofbits security skill for build-review Step 2 parallel security review dispatch (shipped in entity 062)

**When NOT to use a wrapper:**

- The wrapped skill is strictly single-threaded and has zero parallelism benefit (example: `knowledge-capture` Step 4 runs once per finding inline, no fan-out)
- The caller is already a leaf subagent itself (wrappers wrap for the orchestrator; a wrapper invoking another wrapper is unnecessary indirection)
- The orchestrator explicitly needs the wrapped skill's output merged into its own context (rare; usually merging happens via the wrapper's return message)
