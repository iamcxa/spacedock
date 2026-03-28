---
id: 067
title: Investigate and work around Skill tool unavailability for team-spawned agents
status: backlog
source: session debugging 2026-03-28
started:
completed:
verdict:
score: 0.80
worktree:
issue:
pr:
---

Team-spawned subagents (dispatched with `team_name` or auto-joined via `name` parameter from a team lead) do not receive the Skill tool. This prevents ensigns from invoking superpowers skills (TDD, brainstorming, etc.) during workflow execution.

## Findings

Documented in `docs/research-skill-tool-team-restriction.md`. Key evidence:

| Spawn config | Has Skill? |
|---|---|
| `ensign` + `team_name` | No |
| `ensign` — no `name`, no `team_name` | **Yes** |
| `general-purpose` + `team_name` | No |

Cross-confirmed in the `conn` project where ensigns dispatched without `team_name` successfully invoked `Skill("superpowers:test-driven-development")`.

## Hypothesis: team lead tool inheritance

The first-officer agent does NOT have the Skill tool in its own tool set (it has: Agent, TeamCreate, SendMessage, Read, Write, Edit, Bash, Glob, Grep). Team members may inherit their available tools from the team lead's set, which would explain why they don't get Skill — the lead doesn't have it either.

If true, the fix might be: ensure the first-officer agent definition includes `Skill` in its tools list. But this depends on whether the `tools:` frontmatter is actually enforced for the top-level agent (evidence from other issues suggests it's advisory).

This needs testing: does adding `Skill` to the first-officer's `tools:` frontmatter give it the Skill tool? And if so, do team-spawned agents then inherit it?

## Related GitHub issues

- [#29441](https://github.com/anthropics/claude-code/issues/29441) — Agent `skills:` frontmatter not preloaded for team-spawned teammates
- [#25834](https://github.com/anthropics/claude-code/issues/25834) — Plugin agent `skills:` frontmatter silently fails
- [#19077](https://github.com/anthropics/claude-code/issues/19077) — Sub-agents can't create sub-sub-agents (`tools:` not enforced)

## Scope

1. Test the team lead inheritance hypothesis
2. Determine a reliable workaround for spacedock workflows
3. If workaround involves template changes, update the commission/refit skills

## Workaround options (from research doc)

1. Dispatch without team membership (lose SendMessage, gain Skill)
2. Inline skill content in dispatch prompts
3. Reference skills in README stage definitions (the conn pattern)
4. `skills:` frontmatter preloading (buggy per #25834, #29441)
