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

### Gap 6: Coverage Ratchet — type-check and test count never regress

**Current:** Quality stage runs `bun test` and `tsc --noEmit` mechanically but doesn't enforce coverage baselines. Entity 052 created `spacebridge/bin/daemon.ts` outside tsconfig's `include: ["src/**/*.ts"]` — the file was never type-checked and quality stage reported PASS. Test count can also regress without detection.

**Root cause:** Type-check and test coverage are mechanical/baseline requirements (基本功), not heuristic discoveries. They should be enforced as never-regress invariants, not optional quality improvements.

**Target — two ratchets:**

1. **Type Coverage Ratchet**: Every `.ts` file in the project (excluding node_modules, dist, .d.ts) must be covered by at least one tsconfig's `include` glob. Quality stage computes `uncovered = all_ts_files - tsconfig_covered_files`. If uncovered > 0, FAIL with list of uncovered files.

2. **Test Count Ratchet**: Test count on feature branch must be >= test count on main branch baseline. Quality stage runs `bun test` on current branch, compares count against main. If count decreased, FAIL with `"test count regressed: {current} < {baseline}"`.

**Implementation across stages:**

| Stage | What to add |
|-------|-------------|
| **Plan** (plan-checker dimension 8) | For every task with `.ts` in `files_modified`: (a) is there a test file in `files_modified` or `acceptance_criteria`? (b) is the path within an existing tsconfig include glob? (c) if outside, is there a task to update tsconfig? |
| **Quality** (build-quality) | Two new mechanical checks: `tsconfig-coverage` (zero uncovered .ts files) + `test-ratchet` (count >= main baseline) |
| **Execute** (task-execution) | When creating .ts files outside `src/`, verify the file's parent directory is in some tsconfig include — warn in acceptance_criteria output if not |

**Quality stage implementation sketch:**
```bash
# tsconfig-coverage: find uncovered .ts files
ALL_TS=$(find . -name '*.ts' -not -path '*/node_modules/*' -not -name '*.d.ts' | sort)
COVERED=$(tsc --listFiles -p tsconfig.json 2>/dev/null | sort)
UNCOVERED=$(comm -23 <(echo "$ALL_TS") <(echo "$COVERED"))
# UNCOVERED count must be 0

# test-ratchet: compare against main baseline
BASELINE_COUNT=$(git stash -q && bun test 2>&1 | grep -o '[0-9]* pass' | awk '{print $1}' && git stash pop -q)
CURRENT_COUNT=$(bun test 2>&1 | grep -o '[0-9]* pass' | awk '{print $1}')
# CURRENT_COUNT >= BASELINE_COUNT
```

**Captain framing:** "覆蓋率是機械性操作，不是啟發式的發現，這種基本功類型的要求應該要盡可能達成。不追求高度 coverage，但不可以比上一次少。"

### Gap 7: Pre-ship Confidence Gate (< 90% auto-iterate)

**Current:** After UAT, entities advance directly to shipped with no holistic confidence assessment. Entities 051 (75%) and 052 (70%) shipped with known gaps.

**Target:** Insert a confidence check between UAT and shipped. Five factors scored 0-100%:

| Factor | Weight | What it checks |
|--------|--------|----------------|
| Test coverage | 25% | New files have tests, test count ratchet passed |
| Type coverage | 20% | All .ts covered by tsconfig, tsc clean |
| Review severity | 20% | Fix cycle count, max severity found |
| AC completeness | 20% | UAT pass/skip/fail ratio |
| Integration breadth | 15% | E2e tests present? Upstream/downstream integration tested? |

If composite < 90%, auto-iterate: identify which factors pull score down, dispatch targeted fix ensigns (add tests, fix tsconfig, run e2e), re-verify, re-score. Only advance to shipped when >= 90%.

**Changes:** This can be a sub-step of UAT (Step 6.5) or a new lightweight stage between uat and shipped. Design decision during clarify.

## Acceptance Criteria

- CLI UAT items produce e2e-flow recordings (.cast or equivalent) when e2e-pipeline is available (how to verify: run a CLI UAT item, check for .cast file in artifacts)
- Entity file contains inline evidence (screenshots rendered, recordings referenced) after UAT, not just path strings (how to verify: read entity file, see markdown image tags or transcript blocks)
- All 4 stage reports (execute, quality, review, uat) have minimum evidence requirements documented in their respective SKILL.md Rules sections (how to verify: grep "evidence minimum" or equivalent in each SKILL.md)
- When diff contains `skills/*/SKILL.md`, review stage runs forge audit AND uat stage runs skill invocation test (how to verify: create test entity with a SKILL.md change, observe forge + invocation in pipeline output)
- At least one example of debate-driven skill simulation exists as a UAT item type or forge test mode (how to verify: SKILL.md documents `type: simulation` or equivalent, with dispatch protocol)
- Quality stage includes tsconfig-coverage check: 0 uncovered .ts files outside node_modules (how to verify: create a .ts file outside tsconfig include, run quality, observe FAIL)
- Quality stage includes test-ratchet check: test count >= main baseline (how to verify: delete a test, run quality, observe FAIL)
- Plan-checker includes dimension 8 (coverage ratchet compliance): warns when new .ts files lack test pairing or tsconfig coverage (how to verify: write a plan with a .ts task and no test, run plan-checker, observe WARN)
- Pre-ship confidence gate blocks shipping below 90% and auto-dispatches fix ensigns for identified gaps (how to verify: ship an entity with low type coverage, observe auto-fix cycle before PR creation)

## Notes

- Entity 073 (review-skill-creation-discipline) is a subset of Gap 4. If 074 ships first, 073 can be archived as absorbed.
- Gap 5 (debate-driven simulation) may be deferred to a separate entity if design complexity warrants it.
- Gap 6 (coverage ratchet) is the highest-priority gap — it prevents the class of errors seen in entity 052 (daemon.ts not type-checked).
- Gap 7 (confidence gate) is the architectural container — gaps 1-6 are the specific checks; gap 7 is the aggregation + auto-iteration mechanism.
- Captain framing: "跑過 e2e 的要給我看證據" + "skill 要跑 forge 做測試" + "覆蓋率是基本功，不可以比上一次少"
