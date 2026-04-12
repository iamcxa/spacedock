---
mission: PR review loop mod hook test
entity-label: task
entity-label-plural: tasks
id-style: sequential
commissioned-by: spacedock@test
stages:
  defaults:
    worktree: false
    fresh: false
    gate: false
    concurrency: 2
  states:
    - name: execute
      initial: true
    - name: shipped
      terminal: true
---

# PR Review Loop Mod Hook Test Workflow

A minimal 2-stage workflow for testing that pr-review-loop mod hooks fire correctly at merge (shipped) stage, idle, and startup.

## File Naming

Kebab-case slug: `pr-review-loop-entity.md`

## Schema

```yaml
---
id: "001"
title: Short description
status: execute
score: 0.90
source: test
started:
completed:
verdict:
worktree:
pr:
---
```

## Stages

### execute

The initial stage where the entity is actively being worked.

- **Inputs:** A task description
- **Outputs:** Work is complete, ready for PR

### shipped

Terminal stage. The task has been shipped via PR.

## Commit Discipline

Prefix commits with the stage name: `execute: did the thing`

## Task Template

```markdown
---
id: "{id}"
title: "{title}"
status: execute
score: 0.90
source: test
started:
completed:
verdict:
worktree:
pr:
---

{description}
```
