---
id: 074
title: Pipeline Verification Quality Uplift — Review + UAT Evidence & Skill Testing
status: draft
context_status: pending
source: captain observation during 050/068 pipeline run
created: 2026-04-12T16:30:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
auto_advance:
parent:
children:
---

## Directive

> Uplift the pipeline's review and UAT stages to produce verifiable evidence and real skill testing. Currently, stage reports are thin summaries, CLI items skip e2e recording, skill entities ship without forge validation, and there's no debate-driven skill simulation. Five specific gaps to close:

### Gap 1: CLI items should trigger e2e-flow recording

**Current:** CLI UAT items run via Bash, capture stdout/exit code as text evidence only.

**Target:** CLI items also trigger `e2e-pipeline:e2e-flow` in CLI mode to produce asciinema recordings (.cast files) or terminal screenshots. The e2e-pipeline already supports `Execute external` flows for CLI — the UAT skill just doesn't invoke it for CLI items.

**Changes:** build-uat SKILL.md Step 2b should invoke `e2e-pipeline:e2e-flow` with `type: cli` before running the command, and `e2e-pipeline:e2e-test` to capture the recording. Fallback: if e2e-pipeline is not installed, proceed with text-only evidence (current behavior).

### Gap 2: E2E evidence (screenshots, recordings, reports) written into entity

**Current:** E2E artifacts are referenced by path in UAT Results but not embedded in the entity file. Captain must manually open files to see evidence.

**Target:** UAT Results section includes:
- Inline screenshot references that render in dashboard entity detail view (markdown image syntax for browser items)
- Asciinema embed or transcript snippet for CLI recordings
- Structured report section (`## E2E Evidence`) with per-item artifact table and visual previews
- Report is self-contained — reading the entity file alone is sufficient to evaluate UAT pass/fail

**Changes:** build-uat SKILL.md Step 5 should write evidence inline (not just path refs). Dashboard entity detail renderer may need to handle image/cast embeds.

### Gap 3: Stage Reports must contain concrete evidence, not just verdicts

**Current:** Stage Reports for execute, quality, review, uat often contain checklist items marked DONE with minimal evidence. Example: "DONE — all checks pass" without showing what was checked.

**Target:** Every Stage Report must include:
- **Execute:** per-task commit SHA, files changed count, test evidence per AC
- **Quality:** actual command output (first/last N lines), test count, fail details
- **Review:** classified findings table with file:line citations (debate-driven reviewers already do this)
- **UAT:** per-item evidence table with inline artifacts

**Changes:** This is partially addressed by existing skill contracts but inconsistently enforced. Add a "Stage Report evidence minimum" section to each stage skill's Rules, and have the review stage pre-scan check prior Stage Reports for evidence completeness.

### Gap 4: Skill entities must run forge validation in review or UAT

**Current:** Entity 068 created `skills/build-distill/SKILL.md` without forge audit, TDD, or invocation testing. The writing-skills verification was a manual afterthought.

**Target:** When an entity's diff contains `skills/*/SKILL.md`:
- **Review stage** runs `kc-plugin-forge` audit (frontmatter, structure, conventions, reference integrity) as a review sub-check. This is the "forge front half."
- **UAT stage** runs forge TDD or bare invocation test as a UAT item. This is the "forge back half" — verify the skill actually loads and produces expected output.
- At minimum one of these must fire. Both firing is ideal.

**Changes:** build-review SKILL.md adds a conditional forge-audit sub-check (when diff contains skill files). build-uat SKILL.md adds a conditional skill-invocation UAT item type. Entity 073 (review-skill-creation-discipline) is a subset of this — absorb it here.

### Gap 5: Skill entities can use debate-driven simulation

**Current:** Skill verification is single-agent (one ensign loads and checks). No cross-agent simulation.

**Target:** For skill entities, UAT (or a new "simulation" sub-step) can dispatch 2+ ensigns that each load the new skill and interact with each other to simulate real usage. Example for build-distill: one ensign plays "SO invoking build-distill", another plays "captain responding to AskUserQuestion" with fixture answers. The interaction log becomes evidence.

**Changes:** This is an advanced capability. Build-uat SKILL.md could support a `type: simulation` UAT item that dispatches debate-driven agents. Alternatively, this could be a separate post-UAT stage or a forge enhancement. Design decision needed during clarify.

## Acceptance Criteria

- CLI UAT items produce e2e-flow recordings (.cast or equivalent) when e2e-pipeline is available (how to verify: run a CLI UAT item, check for .cast file in artifacts)
- Entity file contains inline evidence (screenshots rendered, recordings referenced) after UAT, not just path strings (how to verify: read entity file, see markdown image tags or transcript blocks)
- All 4 stage reports (execute, quality, review, uat) have minimum evidence requirements documented in their respective SKILL.md Rules sections (how to verify: grep "evidence minimum" or equivalent in each SKILL.md)
- When diff contains `skills/*/SKILL.md`, review stage runs forge audit AND uat stage runs skill invocation test (how to verify: create test entity with a SKILL.md change, observe forge + invocation in pipeline output)
- At least one example of debate-driven skill simulation exists as a UAT item type or forge test mode (how to verify: SKILL.md documents `type: simulation` or equivalent, with dispatch protocol)

## Notes

- Entity 073 (review-skill-creation-discipline) is a subset of Gap 4. If 074 ships first, 073 can be archived as absorbed.
- Gap 5 (debate-driven simulation) may be deferred to a separate entity if design complexity warrants it.
- Captain framing: "跑過 e2e 的要給我看證據，把 report 寫到 entity 中，包含圖片顯示與報告"
