---
id: 012
title: Dashboard Workflow Visualizer — Stage Pipeline Graph with Visual Editing
status: e2e
source: channel conversation
started: 2026-04-05T19:00:00+08:00
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-workflow-visualizer
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 001 completed (dashboard foundation, workflow discovery)
- Feature 002 completed (entity detail view)

## Brainstorming Spec — Two Goals

### Goal A: Stage Pipeline Visualization (read-only)

APPROACH:     Render each workflow's stage pipeline as an interactive directed graph. Stages as nodes, transitions as edges. Gates shown as diamond nodes, feedback-to as backward edges. Entity dots on each stage node showing how many entities are at that stage. Click a stage node to filter the entity table below.
ALTERNATIVE:  Keep the current flat chip bar (rejected: doesn't show flow direction, gates, feedback loops, or conditional stages — loses the pipeline's topology)
GUARDRAILS:   Must render correctly for any workflow shape (linear, branching, feedback loops). Must handle 3-stage simple workflows and 12-stage complex pipelines. No external graph library dependency if possible (SVG/Canvas).
RATIONALE:    Stage chips show counts but hide the workflow's structure. A pipeline graph shows the flow direction, where gates block, where feedback loops return, and which stages are conditional. Captain can see at a glance "007 is at plan, which gates before execute, which feeds back to execute from quality."

### Goal B: Visual Workflow Editor (read-write)

APPROACH:     Drag-and-drop workflow editor — captain can add/remove/reorder stages, set gate/feedback-to/conditional properties, and edit stage metadata visually. Changes write back to the workflow README frontmatter. This is a workflow design tool, not just a viewer.
ALTERNATIVE:  Edit README YAML directly (current approach — works but error-prone, no visual feedback on topology changes)
GUARDRAILS:   Must validate stage graph integrity (no orphan stages, terminal stage exists, feedback-to targets valid stage). Must preserve non-stage README content (description, schema, stage details in markdown body). Write-back must produce valid YAML frontmatter matching the existing parser format.
RATIONALE:    Designing workflows by editing YAML is workable but the topology is implicit. Visual editing lets the captain see the pipeline shape while building it — add a gate, see where the feedback arrow goes, drag a stage to reorder. This closes the loop: commission creates a workflow, the visualizer lets the captain refine it.

## Acceptance Criteria

### Goal A — Visualization
- Each workflow renders as a directed graph (nodes = stages, edges = transitions)
- Gate stages shown with distinct visual (diamond shape or border)
- Feedback-to edges shown as backward arrows with label
- Conditional stages shown with dashed border or icon
- Entity count dots on each stage node (matching chip counts)
- Click stage node to filter entity table (same behavior as chip click)
- Responsive — works in the 320px sidebar and in full-width detail view

### Goal B — Visual Editor
- Drag to reorder stages in the pipeline
- Add new stage (click + button, set name/properties)
- Remove stage (with validation — warn if entities are at that stage)
- Toggle gate/feedback-to/conditional properties per stage
- Set feedback-to target via drag (draw arrow from stage to target)
- Changes write back to workflow README frontmatter
- Validate graph integrity before saving (no orphans, valid feedback-to)
- Undo/redo for edit operations
