---
commissioned-by: spacedock@0.9.0
entity-type: test-entity
entity-label: task
entity-label-plural: tasks
id-style: alphanumeric
stages:
  profiles:
    default: [draft, execute, shipped]
  defaults:
    worktree: false
    concurrency: 1
  states:
    - name: draft
      initial: true
      worktree: false
      manual: true
    - name: execute
    - name: shipped
      terminal: true
      worktree: false
---

# Fixture Workflow for workflow-index Tests

Minimal workflow with two entities used by `tests/test_workflow_index.py`. Not exercised by production FO.
