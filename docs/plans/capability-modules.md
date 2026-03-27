---
id: 064
title: Replace lieutenant agents with capability modules
status: backlog
source: CL
started:
completed:
verdict:
score: 0.90
worktree:
issue:
pr:
---

Lieutenants were designed as specialized stage agents that also provide lifecycle hooks to the first officer. In practice, the pr-lieutenant is awkward as a stage agent — PR creation is a lifecycle transition, not stage work. The hook-providing role is valuable but doesn't require an agent.

## Problem

Capabilities like PR-based merge cross-cut stages (startup: detect merged PRs, merge: check PR state). Modeling them as stage agents forces them into a single stage, which doesn't fit. The pr-lieutenant exists as an agent that's never dispatched — it's really just a config file in `.claude/agents/`.

Meanwhile, some workflows (e.g., email triage) don't need PR logic at all and use git as a local store only. The capability needs to be modular — enable/disable per workflow.

## Proposed model

Capability modules live in `{workflow_dir}/_capabilities/`. Each is a markdown file with `## Hook:` sections, same format as the current lieutenant hooks. The FO discovers them at startup by scanning the directory.

**Plugin ships canonical capability templates:**
```
capabilities/
  pr-merge.md
```

**Commission copies selected capabilities into the workflow:**
```
docs/plans/
  _capabilities/
    pr-merge.md
```

**Refit** diffs each `_capabilities/*.md` against the plugin's canonical version. Same merge strategy as agent/template files — detect upstream changes, preserve local customizations, flag conflicts.

**FO discovery** changes from "scan agent files referenced by stages" to "scan `_capabilities/*.md`". Everything else stays the same — hook format, lifecycle points (startup, merge), execution model.

## What changes

- `capabilities/pr-merge.md` — new canonical capability template (content from current `templates/pr-lieutenant.md` hooks)
- `templates/pr-lieutenant.md` — removed (replaced by capability module)
- First-officer template — hook discovery scans `_capabilities/` instead of agent files referenced by stages
- Commission skill — offers capabilities during setup, copies selected ones to `_capabilities/`
- Refit skill — manages `_capabilities/` files same as agent files (diff, merge, update)
- FO merge flow — after validation gate approval, FO pushes branch and creates PR (not a stage agent's job)

## What this subsumes

- The pr-lieutenant agent (both template and generated file)
- The `agent:` property on stages (for hook-providing agents — stage-specific worker agents like a hypothetical `data-scientist` ensign variant would still use `agent:`)
- The lieutenant hook discovery mechanism from #060 (replaced by capability discovery)

## Acceptance criteria

1. `capabilities/pr-merge.md` exists with Hook: startup and Hook: merge sections
2. `templates/pr-lieutenant.md` is removed
3. FO template discovers hooks from `_capabilities/` directory
4. Commission offers capability selection and copies to `_capabilities/`
5. Refit manages capability files with diff/merge like agent files
6. FO creates PR at merge time after validation gate approval (not a stage agent)
7. Workflows without `_capabilities/` behave identically to today (no hooks, local merge)
