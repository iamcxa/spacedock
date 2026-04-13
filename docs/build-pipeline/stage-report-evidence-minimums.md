---
id: 086
title: "Stage Report evidence minimums -- per-stage required evidence fields"
status: draft
source: decomposition of entity 085 (stage report evidence and confidence)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: []
parent: 085
context_status: pending
---

## Directive

> Stage Reports often contain checklist items marked DONE with minimal evidence ("all checks pass" without showing what was checked). Add "evidence minimum" rules to each stage skill's Rules section: Execute (per-task commit SHA, files changed count, test evidence per AC), Quality (actual command output first/last N lines, test count, fail details), Review (classified findings table with file:line citations), UAT (per-item evidence table with inline artifacts).

## Captain Context Snapshot

- **Repo**: main @ cff57a2
- **Session**: Entity 085 decomposed into 086/087/088; 086 is evidence minimums (child 1)
- **Domain**: Readable / Textual
- **Related entities**: 085 -- Stage Report evidence + confidence gate (epic, parent), 082 -- UAT evidence and recording (clarify/ready, sibling), 083 -- Multi-language ratchet (clarify/ready, sibling)
- **Created**: 2026-04-13T16:00:00+08:00

## Brainstorming Spec

**APPROACH**: Add "evidence minimum" Rules bullets to the `## Rules` section of each of the 4 stage SKILL.md files. Each stage gets a stage-specific evidence template that defines the minimum required fields in the Stage Report. Execute: per-task commit SHA, files_changed count, test evidence per AC. Quality: actual command output (first/last 40 lines per existing pattern), test count, fail details with assertion messages. Review: classified findings table with file:line citations (already partially present in the format). UAT: per-item evidence table with inline artifacts (aligns with entity 082's inline evidence format). Each rule is a "NEVER write Stage Report without..." phrasing that matches the existing Rules convention.

**ALTERNATIVE**: Instead of adding Rules bullets to each SKILL.md, create a shared `references/evidence-minimums.md` that all 4 skills reference. -- D-01 Rejected because it violates the "Rules section is self-contained" convention (each SKILL.md's Rules section is the single source of truth for that skill's constraints -- external references create indirection and are easy to miss during skill execution).

**GUARDRAILS**:
- Each stage skill already has a `## Rules` section. Additions are purely additive bullets -- do not restructure existing Rules.
- Evidence minimum rules use "NEVER ... without ..." phrasing consistent with existing Rules conventions (e.g., build-review: "NEVER skip pre-scan").
- Review stage already has partial evidence format (classified findings table in Step 6). Evidence minimum formalizes what's already expected but not enforced.
- Entity 082's inline evidence format (markdown images, transcript blocks) is the reference for UAT evidence minimums -- ensure consistency.

**RATIONALE**: Self-contained Rules bullets are correct because the Rules section is what the ensign reads during execution -- it's the enforcement point. A shared reference doc adds an indirection hop that may be skipped under context pressure (the exact failure mode this entity exists to prevent). Each stage has stage-specific evidence requirements that don't benefit from abstraction -- execute evidence (commit SHAs) is fundamentally different from review evidence (findings tables). Four separate rule sets, four separate SKILL.md files, zero shared abstraction.

## Acceptance Criteria

- [ ] Given a completed execute stage, when Stage Report is written, then it includes per-task commit SHA, files changed count, and at minimum 1 line of test evidence per AC (how to verify: read execute Stage Report, confirm evidence fields present)
- [ ] Given all 4 stage skills, when their Rules sections are read, then each has a documented "evidence minimum" requirement (how to verify: grep "evidence minimum" in execute/quality/review/uat SKILL.md Rules)
- [ ] Given a stage skill ensign writing a Stage Report, when it omits a required evidence field, then the Rules section provides a "NEVER ... without ..." rule that makes the omission a Rules violation (how to verify: read each SKILL.md Rules section, confirm evidence minimum rule exists with NEVER phrasing)

## Problem

Stage Reports often contain checklist items marked DONE with minimal evidence ("all checks pass" without showing what was checked). Entity 051 (75%) and 052 (70%) shipped with thin evidence that didn't surface the actual gaps until post-ship review.

## Scope

Add "evidence minimum" rules to each stage skill's Rules section:
- Execute: per-task commit SHA, files changed count, test evidence per AC
- Quality: actual command output (first/last N lines), test count, fail details
- Review: classified findings table with file:line citations
- UAT: per-item evidence table with inline artifacts

## Acceptance Criteria

- [ ] Given a completed execute stage, when Stage Report is written, then it includes per-task commit SHA, files changed count, and at minimum 1 line of test evidence per AC (how to verify: read execute Stage Report, confirm evidence fields present)
- [ ] Given all 4 stage skills, when their Rules sections are read, then each has a documented "evidence minimum" requirement (how to verify: grep "evidence minimum" in execute/quality/review/uat SKILL.md Rules)

## References

- Parent entity 085: stage report evidence and confidence (epic)
- `skills/build-execute/SKILL.md`: Stage Report evidence target
- `skills/build-quality/SKILL.md`: Stage Report evidence target
- `skills/build-review/SKILL.md`: Stage Report evidence target
- `skills/build-uat/SKILL.md`: Stage Report evidence target
