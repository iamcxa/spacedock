---
id: 086
title: "Stage Report evidence minimums -- per-stage required evidence fields"
status: plan
source: decomposition of entity 085 (stage report evidence and confidence)
started: 2026-04-13T06:30:00Z
worktree: .worktrees/spacedock-ensign-stage-report-evidence-minimums
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: []
parent: 085
context_status: ready
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
- [ ] Given a stage skill ensign writing a Stage Report, when it omits a required evidence field, then the Rules section provides a "NEVER ... without ..." rule that makes the omission a Rules violation (how to verify: read each SKILL.md Rules section, confirm evidence minimum rule exists with NEVER phrasing)

## Assumptions

A-1: All 4 stage SKILL.md files have `## Rules -- No Exceptions` sections with consistent formatting. Evidence minimum rules insert as new `### Evidence Minimum` subsections within each Rules section.
Confidence: Confident (0.95)
Evidence: build-execute SKILL.md:328, build-quality SKILL.md:296, build-review SKILL.md:326, build-uat SKILL.md:253 -- all have `## Rules -- No Exceptions` with `###` subsections and `**NEVER ...**` bullet conventions.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Existing Stage Report formats already include partial evidence fields (quality has per-check evidence snippets, execute has per-task results). Evidence minimums formalize these as mandatory requirements, not new formats.
Confidence: Confident (0.90)
Evidence: build-quality SKILL.md:159 -- "structured verdict per check category" with evidence snippet shape. build-execute SKILL.md:52 -- "wave-by-wave dispatch log, per-task status, commit SHAs." Evidence exists but is not enforced by Rules.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Entity 082's inline evidence format (markdown images, transcript blocks) is the reference for UAT evidence minimums. UAT evidence minimum rules should align with 082's format to ensure consistency.
Confidence: Likely (0.75)
Evidence: Entity 082 GUARDRAILS: "ensure inline format is machine-parseable for confidence scoring." Entity 082 A-3: "Step 5 evidence writing changes output format to markdown image syntax (browser) and fenced transcript blocks (CLI)."
→ Confirmed: captain, 2026-04-13 (batch)

## Canonical References

(none cited)

## Stage Report: explore

- [x] Files mapped: 4 across skill layer
  build-execute SKILL.md:328 (Rules), build-quality SKILL.md:296 (Rules), build-review SKILL.md:326 (Rules), build-uat SKILL.md:253 (Rules)
- [x] Assumptions formed: 3 (Confident: 2, Likely: 1)
  A-1 Rules section pattern (0.95), A-2 partial evidence already exists (0.90), A-3 082 alignment (0.75)
- [x] Options surfaced: 0
  All gray areas resolved to Track A -- clear Rules section insertion pattern with 4 consistent precedents
- [x] Questions generated: 0
  No open questions -- scope is well-defined additive text to existing Rules sections
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Small
  4 files, single insertion point per file (Rules section), purely additive text
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident on internal codebase structure)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Small scope, no children proposed
- [x] Re-validation: 3 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  all evidence holds against current codebase
- [x] Assumptions confirmed: 3 / 3 (0 corrected)
  A-1 Rules section pattern, A-2 partial evidence exists, A-3 082 alignment -- all confirmed via batch
- [x] Options selected: 0 / 0
  no options in this entity
- [x] Questions answered: 0 / 0
  no questions in this entity
- [x] Open exploration: 0 gray areas surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 0 via freeform)
  Readable/Textual templates fully covered by assumptions
- [x] Canonical refs added: 0
  no external file references cited
- [x] Context status: ready
  gate passed: all assumptions confirmed, no options or questions
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 086" when ready
- [x] Clarify duration: 1 question asked, session complete
  1 batch assumption presentation (plain text)

## References

- Parent entity 085: stage report evidence and confidence (epic)
- `skills/build-execute/SKILL.md`: Stage Report evidence target
- `skills/build-quality/SKILL.md`: Stage Report evidence target
- `skills/build-review/SKILL.md`: Stage Report evidence target
- `skills/build-uat/SKILL.md`: Stage Report evidence target
