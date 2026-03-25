---
title: Commission hardcodes pipeline-specific section names in first-officer template
status: backlog
source: email-triage testflight
started:
completed:
verdict:
score: 0.55
worktree:
---

The commission skill hardcodes pipeline-specific README section names into the generated first-officer dispatch prompt. For example, the email-triage pipeline generated references like `### Intake Read Strategy (for intake stage)` in the first-officer template, creating brittle coupling between the first-officer and the pipeline's README structure.

If the README section is renamed or restructured, the first-officer prompt breaks silently (references a section that doesn't exist).

The first-officer should generically copy full stage definitions from the README rather than referencing custom section names. Stage definitions in the README should be self-contained with their own cross-references. The template should not embed pipeline-specific section names.

Scope: audit SKILL.md's first-officer template for hardcoded section references and replace them with generic stage-definition copying.
