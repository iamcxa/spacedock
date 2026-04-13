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

## Research Findings

### Upstream Constraints

1. Entity 086 brainstorming spec mandates purely additive Rules bullets -- no restructuring of existing Rules sections or Stage Report formats. (source: entity 086 GUARDRAILS)
2. "NEVER ... without ..." phrasing consistent with existing Rules conventions -- all 4 SKILL.md files use `- **NEVER {action}.** {rationale}` as the bullet pattern inside `###` subsections under `## Rules -- No Exceptions`. (source: build-execute SKILL.md:396-398, build-quality SKILL.md:308-312, build-review SKILL.md:347-352, build-uat SKILL.md:257-261)
3. Entity 082 (UAT evidence and recording) defines inline evidence format: markdown images for browser (`![screenshot](path)`), fenced transcript blocks for CLI (``` terminal ... ```), capped at 20 lines with `[truncated]` marker. UAT evidence minimums must align. (source: entity 082 brainstorming spec, GUARDRAILS)
4. Each stage has fundamentally different evidence requirements -- execute (commit SHAs, files changed), quality (command output), review (findings tables with file:line), UAT (per-item evidence with inline artifacts). No shared abstraction benefits these. (source: entity 086 RATIONALE)
5. Entity 085 (parent) explicitly rejected a shared `references/evidence-minimums.md` approach in favor of self-contained Rules bullets per SKILL.md. (source: entity 086 brainstorming spec ALTERNATIVE D-01)

### Existing Patterns

1. `## Rules -- No Exceptions` structure is identical across all 4 skills: `##` section header at build-execute:328, build-quality:296, build-review:326, build-uat:253. Each contains `###` subsections with `**NEVER**` bullet conventions. (source: grep across 4 SKILL.md files)
2. build-execute already has 4 Rules subsections: Wave Graph Integrity, Stage Entry workflow-index Transition, BLOCKED Escalation Ladder, Task Dispatch Contract, Serial Commits After Each Wave, Scope and Interaction. New evidence minimum subsection inserts at the end of Rules. (source: build-execute SKILL.md:330-412)
3. build-quality already has "NEVER report a bare FAIL with failing-test count" (line 327) -- an implicit evidence minimum for the verdict shape. Evidence minimum formalizes per-check evidence requirements beyond the verdict. (source: build-quality SKILL.md:327)
4. build-review Step 6 already defines a findings table shape with Severity/Root/File:Line/Description/Source columns. Evidence minimum makes this table mandatory (not just recommended by the Step 6 template). (source: build-review SKILL.md:306-312)
5. build-uat Step 7 already defines `### automated evidence` and `### captain decisions` subsections in the Stage Report. Evidence minimum formalizes the per-item evidence table with inline artifacts. (source: build-uat SKILL.md:217-229)

### Library/API Surface

1. Execute Stage Report format (Step 9, SKILL.md:285-322): structured markdown with status, SHAs, wave counts, per-task summary, BLOCKED escalations, stale-file warnings, findings subsections, knowledge capture line. Per-task summary already includes commit SHA but not files_changed count or test evidence per AC. (source: build-execute SKILL.md:285-322)
2. Quality Stage Report format (Step 7, SKILL.md:228-290): per-check verdict blocks with `verdict:`, `command:`, `evidence:` fields. Evidence is last-40-lines command output. Format is well-defined but Rules section does not enforce a minimum evidence threshold. (source: build-quality SKILL.md:228-290)
3. Review Stage Report format (Step 6, SKILL.md:282-320): pre-scan counts, dispatch summary, dispatch gaps, findings table, knowledge capture line. Findings table has the right columns but the Rules section does not mandate a minimum row count or citation density. (source: build-review SKILL.md:282-320)

### Known Gotchas

1. Entity 051 (75%) and 052 (70%) shipped with thin evidence -- the exact failure mode this entity prevents. "All checks pass" without showing what was checked is the anti-pattern. (source: entity 086 Problem section)
2. build-quality's "NEVER report a bare FAIL with failing-test count" rule (line 327) was a prior evidence-minimum attempt that only covers the fail path. Evidence minimums must also cover pass verdicts -- a "pass" with zero command output is as useless as a bare fail count. (source: build-quality SKILL.md:327)
3. Archived entity 081 execute Stage Report shows the GOOD pattern -- per-task table with Task/Status/Commit SHA/Description, AC verification table with AC/Verify Command/Result columns. This is what the evidence minimum formalizes. (source: _archive/quality-goal-backward-regression.md:416-461)
4. The "NEVER ... without ..." phrasing is critical because it makes omission a Rules violation that FO can mechanically detect, rather than a soft recommendation that context pressure can override. (source: entity 086 brainstorming spec AC-3)

### Reference Examples

1. Entity 081 execute Stage Report (good): per-task summary table (Task/Status/Commit SHA/Description), AC verification table (AC/Verify Command/Result), wave graph execution, files modified list. (source: _archive/quality-goal-backward-regression.md:416-461)
2. Quality per-check verdict template (good): `### test` / `verdict: pass` / `command: bun test` / `evidence:` + code block. All 6 checks follow identical shape. (source: build-quality SKILL.md:166-176)
3. Review findings table (good): `| Severity | Root | File:Line | Description | Source |` with per-finding rows. (source: build-review SKILL.md:306-312)
4. UAT results table: `| item | type | status | evidence | notes | re-attempt |` with per-item rows. (source: build-uat SKILL.md:168-175)

## PLAN

### Plan goal

Add `### Evidence Minimum` subsection to the `## Rules -- No Exceptions` section of each of the 4 stage SKILL.md files (build-execute, build-quality, build-review, build-uat). Each subsection contains stage-specific `**NEVER**` bullets that make evidence omission a Rules violation.

### Tasks

#### task-1

- model: sonnet
- wave: 1
- skills: []
- read_first:
  - `skills/build-execute/SKILL.md` (full file -- Rules section at line 328, Stage Report format at line 285)
- action: Add a `### Evidence Minimum` subsection at the END of the `## Rules -- No Exceptions` section in `skills/build-execute/SKILL.md` (after the `### Scope and Interaction` subsection, before the `## Red Flags` section). The subsection contains these `**NEVER**` bullets enforcing minimum evidence in `## Stage Report: execute`:
  - **NEVER write `## Stage Report: execute` without a per-task summary row for every task in `## PLAN`.** Each row must include: task id, terminal status (DONE/BLOCKED), model tier used, commit SHA (for DONE tasks), and one-line action summary. A Stage Report that omits tasks or lacks commit SHAs is incomplete evidence -- downstream quality stage cannot verify what execute actually shipped.
  - **NEVER write a per-task DONE row without the files_changed count.** After the commit SHA, include `({N} files)` showing how many files the task's commit touched. This is the mechanical cross-check against the plan's `files_modified` list -- if the count diverges, the task either under-delivered or touched unplanned files. Capture via `git diff-tree --no-commit-id --name-only -r {sha} | wc -l`.
  - **NEVER write `## Stage Report: execute` without an AC verification section.** After the per-task summary, include a `### AC verification` table with columns `AC | Verify command | Result` showing one row per acceptance criterion from `## Acceptance Criteria`. Each row must contain the actual verify command run and its pass/fail result. A Stage Report without AC verification is a self-assessment without evidence.
- acceptance_criteria:
  - `grep -c 'Evidence Minimum' skills/build-execute/SKILL.md` returns >= 1
  - `grep -c 'NEVER write.*Stage Report: execute.*without' skills/build-execute/SKILL.md` returns >= 2
  - `grep 'files_changed count' skills/build-execute/SKILL.md` returns a match
  - `grep 'AC verification' skills/build-execute/SKILL.md` returns a match
- files_modified:
  - `skills/build-execute/SKILL.md`

#### task-2

- model: sonnet
- wave: 1
- skills: []
- read_first:
  - `skills/build-quality/SKILL.md` (full file -- Rules section at line 296, Stage Report format at line 228)
- action: Add a `### Evidence Minimum` subsection at the END of the `## Rules -- No Exceptions` section in `skills/build-quality/SKILL.md` (after the `### Routing and Scope` subsection). The subsection contains these `**NEVER**` bullets enforcing minimum evidence in `## Stage Report: quality`:
  - **NEVER write a per-check verdict block without the actual command output in the evidence field.** Every check (test, lint, typecheck, build, regression, coverage) must include the raw command output (last 40 lines or full output if shorter) in a fenced code block under `evidence:`. A verdict of `pass` with an empty evidence block is a fabricated pass -- it claims green without showing what ran. A verdict of `fail` with only a test count and no assertion messages is under-reporting per the existing "NEVER report a bare FAIL" rule.
  - **NEVER write a `pass` verdict without evidence proving the pass.** The evidence for a pass is the command's stdout showing zero errors/failures. An empty evidence block or a bare "all checks pass" string is not evidence -- it is a claim. The evidence field exists so that quality's downstream consumers (review, captain, audit) can verify the pass without re-running the command.
  - **NEVER omit the test count from the test check evidence.** The evidence block for `### test` must include the total test count (e.g., `342 tests passed`) extracted from `bun test` output. A pass verdict without a test count cannot be audited -- "tests passed" could mean 1 test or 342 tests. The count is the denominator that makes the verdict meaningful.
- acceptance_criteria:
  - `grep -c 'Evidence Minimum' skills/build-quality/SKILL.md` returns >= 1
  - `grep -c 'NEVER.*verdict.*without' skills/build-quality/SKILL.md` returns >= 2
  - `grep 'test count' skills/build-quality/SKILL.md` returns a match
- files_modified:
  - `skills/build-quality/SKILL.md`

#### task-3

- model: sonnet
- wave: 1
- skills: []
- read_first:
  - `skills/build-review/SKILL.md` (full file -- Rules section at line 326, Stage Report format at line 282)
- action: Add a `### Evidence Minimum` subsection at the END of the `## Rules -- No Exceptions` section in `skills/build-review/SKILL.md` (after the `### Scope, Routing, and Hygiene` subsection). The subsection contains these `**NEVER**` bullets enforcing minimum evidence in `## Stage Report: review`:
  - **NEVER write `## Stage Report: review` without a classified findings table.** The `### Findings` section must contain a markdown table with columns `Severity | Root | File:Line | Description | Source`. Every finding from pre-scan (Step 1) and agent dispatch (Step 2) must appear as a row. If the review produced zero findings, the table must still exist with a row: `| -- | -- | -- | No findings (clean diff) | pre-scan + agents |`. An empty or absent `### Findings` section is incomplete evidence -- downstream cannot distinguish "no findings" from "findings not recorded".
  - **NEVER write a findings row without a file:line citation.** Every finding row must include a specific `file:line` reference (e.g., `src/api/user.ts:42`). A finding described as "potential issue in the API layer" without a file:line citation is not actionable -- execute cannot locate what to fix, and the finding cannot be verified by re-reading the diff.
  - **NEVER write `## Stage Report: review` without pre-scan counts.** The `### Pre-scan` section must list the finding count for each of the five pre-scan checks: claude-md-compliance, stale-references, dependency-chain, plan-consistency, goal-backward. Zero counts are valid and expected for clean diffs. Omitting pre-scan counts makes it impossible to verify that all five checks actually ran.
- acceptance_criteria:
  - `grep -c 'Evidence Minimum' skills/build-review/SKILL.md` returns >= 1
  - `grep -c 'NEVER write.*Stage Report: review.*without' skills/build-review/SKILL.md` returns >= 2
  - `grep 'file:line citation' skills/build-review/SKILL.md` returns a match
  - `grep 'pre-scan counts' skills/build-review/SKILL.md` returns a match
- files_modified:
  - `skills/build-review/SKILL.md`

#### task-4

- model: sonnet
- wave: 1
- skills: []
- read_first:
  - `skills/build-uat/SKILL.md` (full file -- Rules section at line 253, Stage Report format at line 197)
  - entity 082 brainstorming spec (inline evidence format reference)
- action: Add a `### Evidence Minimum` subsection at the END of the `## Rules -- No Exceptions` section in `skills/build-uat/SKILL.md` (after the `### Stage Contract and Scope` subsection). The subsection contains these `**NEVER**` bullets enforcing minimum evidence in `## Stage Report: uat`:
  - **NEVER write `## Stage Report: uat` without a per-item evidence entry in `### automated evidence`.** Every automated item (browser, cli, api) must have an entry showing its item id, type, and at least one evidence artifact. Browser items: screenshot path or markdown image reference. CLI items: stdout snippet (first/last 20 lines) or transcript block reference. API items: HTTP status code and response body snippet. An item entry that says only "pass" or "automation ran successfully" is not evidence -- it is a claim without proof.
  - **NEVER write a captain decision row without the captain's verbatim answer.** Every row in `### captain decisions` must include the captain's actual choice (pass/fail/skip) and, for skip decisions, the verbatim reason string. A decision row that says "captain approved" without specifying which option was selected erases the audit trail of what the captain actually decided.
  - **NEVER write `### automated evidence` without artifact references for browser items.** Browser item evidence must include at least one of: screenshot path (`.e2e/screenshots/{item-id}.png`), video path (`.e2e/videos/{item-id}.webm`), or trace path (`.e2e/traces/{item-id}.zip`). Inline markdown image syntax (`![{item-id}](path)`) is preferred per entity 082 alignment. A browser item marked pass with no visual artifact cannot be audited.
- acceptance_criteria:
  - `grep -c 'Evidence Minimum' skills/build-uat/SKILL.md` returns >= 1
  - `grep -c 'NEVER write.*Stage Report: uat.*without' skills/build-uat/SKILL.md` returns >= 1
  - `grep -c 'NEVER write.*without' skills/build-uat/SKILL.md` returns >= 3 (existing + new)
  - `grep 'artifact references' skills/build-uat/SKILL.md` returns a match
  - `grep '082' skills/build-uat/SKILL.md` returns a match (entity 082 alignment reference)
- files_modified:
  - `skills/build-uat/SKILL.md`

## UAT Spec

### item-1 (cli)
Verify build-execute evidence minimum rule exists: `grep '### Evidence Minimum' skills/build-execute/SKILL.md` returns exactly 1 match; `grep -c 'NEVER' skills/build-execute/SKILL.md` returns a count higher than the pre-change baseline (currently 6 occurrences).

### item-2 (cli)
Verify build-quality evidence minimum rule exists: `grep '### Evidence Minimum' skills/build-quality/SKILL.md` returns exactly 1 match; grep for `evidence minimum` (case-insensitive) returns at least 1 match.

### item-3 (cli)
Verify build-review evidence minimum rule exists: `grep '### Evidence Minimum' skills/build-review/SKILL.md` returns exactly 1 match; `grep 'file:line' skills/build-review/SKILL.md` returns at least 2 matches (existing Step 1/3 references + new evidence minimum rule).

### item-4 (cli)
Verify build-uat evidence minimum rule exists: `grep '### Evidence Minimum' skills/build-uat/SKILL.md` returns exactly 1 match; `grep '082' skills/build-uat/SKILL.md` returns at least 1 match (entity 082 alignment).

### item-5 (cli)
Cross-file consistency: all 4 SKILL.md files use identical `### Evidence Minimum` subsection header. Verify: `grep -rl '### Evidence Minimum' skills/build-execute/SKILL.md skills/build-quality/SKILL.md skills/build-review/SKILL.md skills/build-uat/SKILL.md | wc -l` returns 4.

### item-6 (cli)
Convention compliance: all new rules use `**NEVER**` bold phrasing. Verify: for each of the 4 files, `grep -c '^\- \*\*NEVER' skills/build-{stage}/SKILL.md` returns a count >= pre-change baseline + 2.

### item-7 (interactive)
Captain reads each new `### Evidence Minimum` subsection and confirms: (a) rules are stage-appropriate (execute evidence is not copy-pasted to quality), (b) rules are enforceable (each "NEVER...without" has a concrete evidence artifact named), (c) rules do not conflict with existing Rules subsections.

## Validation Map

| AC | Task | Verify command | Status | Last run |
|----|------|---------------|--------|----------|
| AC-1: execute Stage Report includes per-task commit SHA, files changed count, test evidence per AC | task-1 | `grep 'files_changed count' skills/build-execute/SKILL.md && grep 'AC verification' skills/build-execute/SKILL.md` | pending | -- |
| AC-2: all 4 stage skills have documented evidence minimum requirement | task-1, task-2, task-3, task-4 | `grep -rl '### Evidence Minimum' skills/build-execute/SKILL.md skills/build-quality/SKILL.md skills/build-review/SKILL.md skills/build-uat/SKILL.md \| wc -l` returns 4 | pending | -- |
| AC-3: each SKILL.md Rules section has NEVER phrasing making omission a Rules violation | task-1, task-2, task-3, task-4 | `grep -c 'NEVER write.*without' skills/build-execute/SKILL.md skills/build-quality/SKILL.md skills/build-review/SKILL.md skills/build-uat/SKILL.md` each returns >= 2 | pending | -- |

## Stage Report: plan

- [x] Research Findings -- 5 domain sections with citations
  Upstream Constraints (5 items), Existing Patterns (5 items), Library/API Surface (3 items), Known Gotchas (4 items), Reference Examples (4 items)
- [x] PLAN -- 4 tasks across 1 wave
  Wave 1: task-1 (build-execute) + task-2 (build-quality) + task-3 (build-review) + task-4 (build-uat) -- all parallel, zero file overlap
- [x] UAT Spec -- 7 testable items (6 cli, 1 interactive)
  CLI items verify grep-based evidence of inserted Rules subsections; interactive item is captain review of stage-appropriateness
- [x] Validation Map -- 3 AC rows mapped to tasks and verify commands
  AC-1 -> task-1, AC-2 -> task-1+2+3+4, AC-3 -> task-1+2+3+4
- [x] Self-review: PASS (0 blockers, 2 warnings)
  Dim 1 Requirement Coverage: all 3 ACs covered by tasks
  Dim 2 Task Completeness: all 4 tasks have complete schema fields
  Dim 3 Dependency Correctness: all wave 1, zero file overlap, no cross-wave deps
  Dim 4 Context Compliance: purely additive Rules bullets, no restructuring, no shared reference doc
  Dim 5 Research Coverage: all read_first entries traced to Research Findings citations
  Dim 6 Validation Sampling: all 4 tasks have runnable grep acceptance_criteria commands
  Dim 7 Cross-Entity Coherence: WARNING -- skills/build-review/SKILL.md has in-flight entry (review-stage-parallel-skill-dispatch, targets FO Guidance section not Rules); skills/build-execute/SKILL.md and skills/build-quality/SKILL.md have planned entries (target Step content not Rules). No blockers.
- [x] Plan-checker verdict: PASS (0 blockers, 2 warnings -- both Dim 7 cross-entity coherence, both non-overlapping sections)
- [x] workflow-index append: 4 append calls covering 4 tasks and 4 files, all successful

## References

- Parent entity 085: stage report evidence and confidence (epic)
- `skills/build-execute/SKILL.md`: Stage Report evidence target
- `skills/build-quality/SKILL.md`: Stage Report evidence target
- `skills/build-review/SKILL.md`: Stage Report evidence target
- `skills/build-uat/SKILL.md`: Stage Report evidence target
