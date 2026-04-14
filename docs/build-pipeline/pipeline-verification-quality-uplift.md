---
id: 074
title: Pipeline Verification Quality Uplift — Review + UAT Evidence & Skill Testing
status: epic
context_status: ready
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
scale: Large
project: spacedock
auto_advance:
parent:
children: [082, 083, 084, 085]
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

### Gap 6: Multi-Language Coverage Ratchet — type-check and test count never regress

**Current:** Quality stage runs `bun test` and `tsc --noEmit` mechanically but doesn't enforce coverage baselines. Entity 052 created `spacebridge/bin/daemon.ts` outside tsconfig's `include: ["src/**/*.ts"]` — the file was never type-checked and quality stage reported PASS. Test count can also regress without detection. No Python type-checking at all.

**Root cause:** Type-check and test coverage are mechanical/baseline requirements (基本功), not heuristic discoveries. They should be enforced as never-regress invariants across ALL languages in the project, not optional quality improvements.

**Design principle:** The ratchet is language-agnostic — same rule (never regress), different tools per language. Quality stage auto-detects which languages are present and runs the appropriate ratchet checks.

**Target — two ratchets per language:**

#### Ratchet 1: Type Coverage (zero uncovered source files)

| Language | Tool | Check | Enhanced behavior |
|----------|------|-------|-------------------|
| **TypeScript** (primary) | `tsc --listFiles` vs `find *.ts` | Every .ts file covered by at least one tsconfig include | **TS-enhanced:** also verify `strict: true` in all tsconfigs; flag any `// @ts-ignore` or `as any` count increases (ratchet on cast count) |
| **Python** | `pyright --outputjson` or `ruff check --select ANN` | Type error count never increases; annotation coverage never decreases | Start with `ruff check --select ANN --statistics` (zero-config); graduate to `pyright` when project has `py.typed` |
| **Go** | `go vet ./...` | Vet error count never increases | Built-in, no extra config |
| **Rust** | `cargo check` | Warning count never increases | Built-in, no extra config |

**TS enhanced ratchet (high priority for recce-like projects):**
```bash
# Standard: zero uncovered files
ALL_TS=$(find . -name '*.ts' -not -path '*/node_modules/*' -not -name '*.d.ts')
COVERED=$(tsc --listFiles -p tsconfig.json)
UNCOVERED=$(comm -23 <(sort <<< "$ALL_TS") <(sort <<< "$COVERED"))
# UNCOVERED must be 0

# Enhanced: as-any cast count ratchet
BASELINE_CASTS=$(git stash -q && grep -r "as any" --include='*.ts' -l | wc -l && git stash pop -q)
CURRENT_CASTS=$(grep -r "as any" --include='*.ts' -l | wc -l)
# CURRENT_CASTS <= BASELINE_CASTS (can reduce, can't add)

# Enhanced: ts-ignore count ratchet
BASELINE_IGNORES=$(git stash -q && grep -r "@ts-ignore\|@ts-expect-error" --include='*.ts' | wc -l && git stash pop -q)
CURRENT_IGNORES=$(grep -r "@ts-ignore\|@ts-expect-error" --include='*.ts' | wc -l)
# CURRENT_IGNORES <= BASELINE_IGNORES
```

#### Ratchet 2: Test Count (never decrease, runner-agnostic)

The ratchet must work regardless of which test runner the project uses. Quality stage auto-detects the runner from project config, not hardcoded assumptions.

**TypeScript test runner detection (priority order):**

| Signal | Runner | Count command |
|--------|--------|---------------|
| `bunfig.toml` or `bun.lock` | `bun test` | `bun test 2>&1 \| grep -o '[0-9]* pass'` |
| `vitest.config.*` or `vite.config.*` with test | `vitest` | `vitest run --reporter=json \| jq '.numPassedTests'` |
| `jest.config.*` or `package.json[jest]` | `jest` | `jest --json \| jq '.numPassedTests'` |
| `package.json scripts.test` contains `mocha` | `mocha` | `mocha --reporter json \| jq '.stats.passes'` |
| None of above | `node --test` | `node --test 2>&1 \| grep "# pass" \| awk '{print $3}'` |

**Other languages:**

| Language | Detection | Runner | Count command |
|----------|-----------|--------|---------------|
| **Python** | `pyproject.toml` / `setup.py` / `pytest.ini` | `pytest` | `pytest --co -q \| tail -1 \| awk '{print $1}'` |
| **Go** | `go.mod` | `go test` | `go test -count=1 -v ./... 2>&1 \| grep -c "=== RUN"` |
| **Rust** | `Cargo.toml` | `cargo test` | `cargo test -- --list 2>&1 \| grep -c ": test"` |

**Key principle:** The ratchet checks `count(current) >= count(baseline)` — it never references a specific test runner in the rule itself. The runner is a detection detail, not a constraint. If a project migrates from jest to vitest, the ratchet continues working.

```bash
# Runner-agnostic test ratchet
detect_test_runner()  # returns: {command, count_extractor}
BASELINE = run_on_main(runner.command, runner.count_extractor)
CURRENT = run_on_head(runner.command, runner.count_extractor)
if CURRENT < BASELINE:
  FAIL "test count regressed: $CURRENT < $BASELINE (runner: $runner.name)"
```

**Overhaul portability:** When `/spacedock:overhaul` installs the build flow into a new project, the quality stage must work without assuming bun. The ratchet auto-detects from the project's actual toolchain. A Next.js project using vitest, a Bun project using bun test, and a legacy project using jest all get the same ratchet invariant — just with different detection paths.

#### Implementation across stages

| Stage | What to add |
|-------|-------------|
| **Plan** (plan-checker dimension 8) | For every task with source files in `files_modified`: (a) is there a test file paired? (b) is the source path within a type-check config (tsconfig/pyproject/go.mod)? (c) if outside, is there a task to update config? Language-agnostic check. |
| **Quality** (build-quality) | Auto-detect languages → run per-language ratchets. TS gets enhanced checks (as-any count, ts-ignore count, strict mode). FAIL on any regression. |
| **Execute** (task-execution) | When creating source files outside existing type-check scope, warn in acceptance_criteria output. |

#### Cross-project applicability

This pipeline serves multiple projects with different language mixes:

| Project | Languages | Ratchet priority |
|---------|-----------|-----------------|
| **Spacedock** | TypeScript (primary) + Python (scripts) | TS full + Python basic |
| **Recce** | TypeScript + Python (50/50, high frequency) | **TS full + Python full** — both need pyright + pytest ratchet |
| **Carlove** | TypeScript (Expo) | TS full |

For Recce specifically: since it's TS+Python at equal weight with high dev frequency, the Python ratchet should be at the same maturity as TS from day 1 — not "start with ruff, graduate later." Pyright + pytest --cov from the start.

**Captain framing:** "覆蓋率是機械性操作，不是啟發式的發現，這種基本功類型的要求應該要盡可能達成。不追求高度 coverage，但不可以比上一次少。" + "ts 部分要特別增強，因為 recce 是 ts+python 各半且開發頻率很高"

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
- Quality stage auto-detects project languages and runs per-language ratchets (how to verify: project with TS+Python, quality runs both tsc + pyright checks)
- TS ratchet: 0 uncovered .ts files + `as any` count never increases + `@ts-ignore` count never increases (how to verify: add `as any` cast, run quality, observe FAIL)
- Python ratchet: pyright error count never increases + pytest count never decreases (how to verify: add untyped function in .py file, run quality, observe regression warning)
- Test count ratchet: per-language test count >= main baseline (how to verify: delete a test, run quality, observe FAIL)
- Plan-checker dimension 8: warns when new source files (any language) lack test pairing or type-check config coverage (how to verify: plan with .ts task and no test, run plan-checker, observe WARN)
- Pre-ship confidence gate blocks shipping below 90% and auto-dispatches fix ensigns for identified gaps (how to verify: ship an entity with low type coverage, observe auto-fix cycle before PR creation)
- Recce project gets TS full + Python full ratchets from day 1 (pyright + pytest --cov, not ruff-only) (how to verify: run pipeline on recce, both ratchets fire)

## Assumptions

A-1: All 7 gaps are confirmed absent from the codebase -- no partial implementations exist. Each gap is a greenfield insertion into an existing skill, not a modification of existing logic.
Confidence: Confident (0.95)
Evidence: code-explorer mapped 6 files across 5 target skills; all gap-to-file cross-references confirmed "absent". No grep matches for forge/ratchet/confidence-gate/e2e-recording in any target SKILL.md.

A-2: Entity 073 (review-skill-creation-discipline) is a strict subset of Gap 4 (forge validation in review). 073's directive describes exactly the conditional forge-audit check that Gap 4 specifies. 073 is `status: draft` with no parent/children links — it should be absorbed into the Gap 4 child entity.
Confidence: Confident (0.90)
Evidence: docs/build-pipeline/review-skill-creation-discipline.md:34 -- directive matches Gap 4. Status: draft, context_status: pending, no parent field.

A-3: build-quality SKILL.md is hardwired to `bun test`, `bun lint`, `bunx tsc --noEmit`, `bun build` with no runner detection or language auto-detection. Gap 6 (multi-language ratchet) requires fundamental restructuring of Steps 1-4, not just a new Step 4.5. ops.config.json has no schema doc and only one known key (`coverage_threshold`).
Confidence: Confident (0.90)
Evidence: build-quality SKILL.md:46-109 -- four hardwired commands. ops.config.json referenced at line 114 for coverage_threshold only.

A-4: build-uat SKILL.md has no e2e-pipeline integration for CLI items (Gap 1), no inline evidence writing (Gap 2), and no confidence gate (Gap 7). Step 2b captures stdout/exit code as text only. Step 5 writes path refs, not inline artifacts.
Confidence: Confident (0.90)
Evidence: build-uat SKILL.md:80 -- Step 2b "Capture stdout, stderr, exit code." Line 166 -- Step 5 appends table with evidence column as "stdout snippet."

A-5: build-review pre-scan has exactly 4 sub-checks (1a-1d). Gap 4 (forge audit) would be Step 1e — same pattern as entity 081's goal-backward Step 1e. However, 081's Step 1e and 074-Gap-4's Step 1e are different checks and need distinct step numbers (1e vs 1f, or ordered by ship date).
Confidence: Likely (0.75)
Evidence: build-review SKILL.md:139-163 -- 4 pre-scan checks. Entity 081 already claims Step 1e for goal-backward verification. If both ship, numbering conflict must be resolved.

## Decomposition Recommendation

⚠️ This entity spans 7 gaps across 5 pipeline skills with 12 acceptance criteria and 3+ domains. Each gap is independently deployable. Recommended split into 4 child entities, grouping by target skill and coupling:

1. `uat-evidence-and-recording` -- Gaps 1 + 2: CLI e2e recording + inline evidence writing in build-uat. Both modify build-uat SKILL.md Steps 2b and 5. Tightly coupled — evidence format affects recording output. ACs 1-2. (Runnable/Invokable, Medium)

2. `quality-multi-language-ratchet` -- Gap 6: Multi-language type coverage + test count ratchets in build-quality. Restructures Steps 1-4 for runner detection, adds per-language ratchet checks, extends ops.config.json schema. Adds plan-checker dimension 8 for type/test coverage at plan time. ACs 6-10, 12. (Runnable/Invokable + Organizational/Data-transforming, Medium-Large)

3. `review-forge-validation` -- Gap 4: Conditional forge audit + skill invocation testing. Review Step 1e/1f (conditional on `skills/*/SKILL.md` in diff). UAT skill invocation item type. Absorbs entity 073. ACs 4-5. (Runnable/Invokable, Small-Medium)

4. `stage-report-evidence-and-confidence` -- Gaps 3 + 5 + 7: Stage Report evidence minimums across execute/quality/review/uat (Gap 3), debate-driven skill simulation (Gap 5), pre-ship confidence gate (Gap 7). Gap 3 is cross-cutting (touches 4 skills). Gap 7 is the aggregation container. Gap 5 may be further deferred. ACs 3, 5, 11. (Runnable/Invokable + Readable/Textual, Medium)

Dependencies:
- 1 and 2 are fully independent — can ship in any order
- 3 depends on entity 081 shipping first (both add pre-scan sub-checks to build-review — numbering must be coordinated)
- 4 depends on 1 (confidence gate scores UAT evidence quality) and 2 (scores type/test coverage)
- Entity 073 is absorbed into child 3 — archive 073 when 3 is created

## Stage Report: explore

- [x] Files mapped: 6 across config layer
  build-uat SKILL.md, build-quality SKILL.md, build-review SKILL.md, build-execute SKILL.md, plan-checker-prompt.md, entity 073
- [x] Assumptions formed: 5 (Confident: 4, Likely: 1)
  A-1 all gaps absent (0.95), A-2 entity 073 absorption (0.90), A-3 quality hardwired (0.90), A-4 uat no e2e (0.90), A-5 review pre-scan numbering (0.75)
- [x] Options surfaced: 0
  Decomposition recommendation takes priority; per-gap options deferred to child entities
- [x] Questions generated: 0
  Cross-cutting questions deferred to child entities where they become local decisions
- [x] α markers resolved: 0 / 0
  Brainstorming spec contained no α markers
- [x] Scale assessment: revised from Medium to Large
  7 gaps × 5 target skills × 12 ACs = Large; decomposition recommended into 4 children

## Notes

- Entity 073 (review-skill-creation-discipline) is a subset of Gap 4. If 074 ships first, 073 can be archived as absorbed.
- Gap 5 (debate-driven simulation) may be deferred to a separate entity if design complexity warrants it.
- Gap 6 (coverage ratchet) is the highest-priority gap — it prevents the class of errors seen in entity 052 (daemon.ts not type-checked). Multi-language design ensures the pipeline works for recce (TS+Python 50/50) and future Go/Rust projects.
- Gap 7 (confidence gate) is the architectural container — gaps 1-6 are the specific checks; gap 7 is the aggregation + auto-iteration mechanism.
- Captain framing: "跑過 e2e 的要給我看證據" + "skill 要跑 forge 做測試" + "覆蓋率是基本功，不可以比上一次少" + "ts 部分要特別增強，recce 是 ts+python 各半且開發頻率很高"
