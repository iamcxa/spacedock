---
id: 031
title: Pipeline export and release builder
status: backlog
source: CL
started:
completed:
verdict:
score:
worktree:
---

Build a mechanism to export/compile a working pipeline into a standalone, distributable folder. Not a catalog/marketplace — focus on the build step.

### Practical examples

**1. Email-triage pipeline** — a commissioned pipeline with custom stages (intake → review → execute), gws-cli integration, multi-account support. Can we build a standalone folder from it that someone else drops into their project?

**2. Superpowers skills as pipeline agents** — superpowers has skills (brainstorming, TDD, debugging, etc.) with graphviz workflows and detailed instructions. Can we package ("compile") them into a self-contained `docs/plans/superpowers/` directory where those skills become agent teammate instructions within a pipeline?

### What "export" means

Strip a working pipeline down to its reusable parts:
- README (schema + stages) — the pipeline definition
- Status script — the view
- First-officer template — the orchestrator
- Stage-specific agent instructions (compiled from skills or custom prompts)
- Manifest with metadata (name, description, required tools/integrations)
- NOT the entity instances (the actual work items) — those are project-specific

The output is a folder that can be dropped into a new project, commissioned from, or shared.
