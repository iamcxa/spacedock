---
title: Structured stage definitions in README frontmatter
id: 034
status: ideation
source: email-triage feature request + CL
started: 2026-03-25T19:00:00Z
completed:
verdict:
score: 0.75
worktree:
---

Move stage properties (worktree, gate, concurrency, fresh, terminal) from prose bullet points in README stage sections into structured YAML in the README frontmatter. The first officer currently parses prose to extract boolean dispatch properties — fragile and mixes concerns.

## Design

Follows the states + transitions pattern from Symfony Workflow and pytransitions — the most battle-tested YAML state machine formats.

```yaml
stages:
  defaults:
    worktree: false
    concurrency: 2
  states:
    - name: backlog
      initial: true
    - name: ideation
    - name: implementation
      worktree: true
    - name: validation
      worktree: true
      fresh: true
    - name: done
      terminal: true
  transitions:
    # omit for linear (inferred from states order)
    # explicit only for non-linear flows:
    - from: validation
      to: implementation
      label: rejected
```

### Key decisions

- **States list + transitions list, kept separate.** States have node properties (worktree, fresh, terminal). Transitions have edge properties (gate/approval, label). Follows the pattern every practical state machine schema converges on.
- **Default transitions inferred from states order.** If `transitions` is omitted, linear chain: states[0] → states[1] → ... → states[n]. If present, it's the explicit graph. Simple pipelines stay simple.
- **`defaults` block** sets baseline properties for all states. Per-state overrides make exceptions visible.
- **`id-style`** stays in README frontmatter (already implemented in entity-organization).
- **Prose stage sections remain** for work instructions (inputs, outputs, good/bad criteria) — these are for ensigns, not the first officer.

### Impact

- **First officer startup** simplifies from "parse stage properties from prose" to "read `stages` from README frontmatter"
- **Commission skill** collects stage names and properties during interview, writes structured YAML
- **README stage sections** drop the Worktree/Gate/Fresh bullets (moved to frontmatter), keep only work instructions
- **Mermaid/Graphviz visualization** becomes trivial to generate from the structured data

### Future: DOT diagram (not in scope for this entity)

A DOT digraph can be generated from the YAML and embedded in the README body as a visual aid. When we add this:
- YAML frontmatter is the SSOT for the pipeline graph
- DOT diagram is a rendered view, not authoritative
- If the user changes the workflow, the first officer (or a refit command) must regenerate the DOT to keep it in sync
- The instruction set should explicitly document this: "edit the frontmatter stages block, then regenerate the diagram"

### Scope

- Update README frontmatter schema (commission template in SKILL.md)
- Update first-officer template to read stages from frontmatter instead of parsing prose
- Update README stage sections to drop dispatch-property bullets
- Migrate this pipeline's README as a reference implementation
- Test harness may need updates for the new README format
