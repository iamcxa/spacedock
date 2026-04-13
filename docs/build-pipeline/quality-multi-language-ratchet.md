---
id: 083
title: "Multi-language coverage ratchet -- type-check and test count never regress"
status: plan
context_status: ready
source: decomposition of entity 074 (pipeline verification quality uplift)
started: 2026-04-13T06:30:00Z
worktree: .worktrees/spacedock-ensign-quality-multi-language-ratchet
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: []
parent: 074
---

## Directive

> Quality stage is hardwired to `bun test`, `bun lint`, `bunx tsc --noEmit`, `bun build` with no runner detection or language auto-detection. Entity 052 created `spacebridge/bin/daemon.ts` outside tsconfig's `include` — the file was never type-checked and quality reported PASS. Test count can regress without detection. No Python type-checking at all.
>
> Three changes: (1) Ratchet 1 -- type coverage: auto-detect languages, zero uncovered source files per language, TS gets enhanced checks (strict mode, `as any` count, `@ts-ignore` count). (2) Ratchet 2 -- test count: runner-agnostic detection, `count(current) >= count(baseline)`. (3) Plan-checker dimension 8 -- warn when new source files lack test pairing or type-check config coverage.
>
> Captain framing: "覆蓋率是基本功，不可以比上一次少" + "ts 部分要特別增強，recce 是 ts+python 各半且開發頻率很高"

## Captain Context Snapshot

- **Repo**: main @ f748d5f
- **Session**: No recent session context (entity created via decompose(074) at 59990ee)
- **Domain**: Runnable / Invokable, Organizational / Data-transforming
- **Related entities**: 074 -- Pipeline verification quality uplift (epic), 085 -- Stage Report evidence + confidence gate (draft, depends-on: [083])
- **Created**: 2026-04-13T12:35:00Z

## Brainstorming Spec

**APPROACH**: Restructure build-quality SKILL.md to support multi-language ratchets. Step 0.5 (new) auto-detects project languages by scanning for config files (tsconfig.json → TS, pyproject.toml/setup.py → Python, go.mod → Go, Cargo.toml → Rust). Steps 1-4 become language-aware: instead of hardwired `bun test`/`bun lint`/`tsc`/`bun build`, each step runs the detected runner for each language. Step 4.5 (new) runs two ratchet checks per detected language: (a) type coverage — every source file must be covered by at least one type-check config; (b) test count — `count(current) >= count(baseline)` using main branch as baseline. TS gets three enhanced sub-ratchets: strict mode verification, `as any` cast count, `@ts-ignore` count. ops.config.json schema gains optional `ratchet_baselines` key for persisting baseline counts between runs. Separately, plan-checker-prompt.md gains dimension 8: for every task with source files in `files_modified`, check test file pairing and type-check config coverage.

**ALTERNATIVE**: Instead of restructuring build-quality Steps 1-4 inline, add a new Step 5.5 "ratchet check" that runs independently after all existing checks, leaving Steps 1-4 as-is (still hardwired to bun). -- D-01 Rejected: this leaves the hardwired bun commands intact, meaning overhaul portability is still broken for non-bun projects. The ratchet check would pass on type coverage while Steps 1-4 fail on missing `bun` binary. The restructuring must touch Steps 1-4 to make them runner-aware, not just add a new step.

**GUARDRAILS**:
- Runner detection is auto, not config-driven — detect from project files, not user settings. ops.config.json stores baselines, not runner choices
- The ratchet invariant is language-agnostic: same rule (never regress), different tools per language. If a project migrates runners, the ratchet continues working
- TS gets enhanced ratchets (as-any, ts-ignore, strict) because captain explicitly requested it for recce (TS+Python 50/50). Other languages get basic type + test count only
- Overhaul portability: quality stage must work without assuming bun. A vitest project, a jest project, and a bun project all get the same ratchet invariant
- Ratchet failures are `fail` verdicts — same routing as existing quality failures (`feedback-to: execute`)

**RATIONALE**: Inline restructuring of Steps 1-4 is correct because the root cause is hardwired commands, not missing ratchet checks. Adding a ratchet step on top of hardwired commands gives a "pass type ratchet but fail bun test" incoherence for non-bun projects. The auto-detection pattern (scan for config files → select runner → run command → extract count) is well-established in CI tools (GitHub Actions, GitLab CI) and the command table in parent 074's directive provides the exhaustive mapping. Dimension 8 in plan-checker catches missing test/type coverage at plan time, before execute creates the gap — shifting left on a mechanical invariant.

## Acceptance Criteria

- [ ] Given a project with TS + Python source files, when quality stage runs, then it auto-detects both languages and runs per-language ratchet checks (how to verify: project with TS+Python, quality runs both tsc + pyright checks)
- [ ] Given a new .ts file created outside tsconfig include path, when quality ratchet runs, then it flags the file as uncovered (how to verify: create .ts file outside tsconfig scope, run quality, observe type coverage FAIL)
- [ ] Given an `as any` cast added to a .ts file, when TS enhanced ratchet runs, then it detects the cast count increased and FAILs (how to verify: add `as any`, run quality, observe cast count regression FAIL)
- [ ] Given a test file deleted, when test count ratchet runs, then it detects count decreased and FAILs (how to verify: delete a test, run quality, observe test count regression FAIL)
- [ ] Given a plan with a new .ts source file but no paired test file, when plan-checker dimension 8 runs, then it warns about missing test pairing (how to verify: plan with .ts task and no test, run plan-checker, observe WARN)
- [ ] Given a project migrating from jest to vitest, when test count ratchet runs, then it auto-detects vitest and continues working (how to verify: switch runner config, run quality, ratchet still fires)

## Assumptions

A-1: build-quality Steps 1-4 are hardwired to bun commands (SKILL.md:46-109). Restructuring to runner-agnostic requires: (a) Step 0.5 language detection from config files, (b) Steps 1-4 parameterized by detected runner, (c) Step 4.5 ratchet checks using detected runner's count commands. This is a significant restructuring, not a simple insertion.
Confidence: Confident (0.90)
Evidence: build-quality SKILL.md:46 (`bun test`), 64 (`bun lint`), 80 (`bunx tsc --noEmit`), 96 (`bun build`) -- all hardwired. No abstraction layer exists.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: ops.config.json currently has only one key (`coverage_threshold`, SKILL.md:114). Ratchet baselines need persistent storage between runs. ops.config.json is the natural location — add `ratchet_baselines: { type_coverage: {}, test_count: {} }` keyed by language.
Confidence: Likely (0.75)
Evidence: build-quality SKILL.md:114 -- ops.config.json read for coverage_threshold. No schema doc exists. Adding keys is low-risk but schema ownership is unclear.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: plan-checker-prompt.md has 7 dimensions (ending at dimension 7, line ~147). Dimension 8 (type/test coverage) follows the same format — a heading, description, check instructions, and output format block.
Confidence: Confident (0.85)
Evidence: parent 074 code-explorer finding -- plan-checker-prompt.md:19 defines 7 dimensions. Dimension 8 is absent. Same insertion pattern as dimensions 1-7.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: The ratchet uses persisted baselines in ops.config.json. Quality pass writes current counts to `ratchet_baselines` key. Next run reads and compares `count(current) >= count(baseline)`. First run with no baseline = skip ratchet with warning (bootstrap automatically on first pass).
Confidence: Confident (0.85)
Evidence: O-1 selected "Persisted baselines in ops.config.json" (captain, 2026-04-13). build-quality SKILL.md:114 -- ops.config.json already read at runtime. Atomic update on quality pass eliminates git stash fragility.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Ratchet baseline source

How does the ratchet know what "last time" was?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Git stash + run on main | No persistent state needed; always compares against latest main | Fragile (stash conflicts, dirty worktree, slow for large test suites); runs test suite twice | Medium | Not recommended |
| Persisted baselines in ops.config.json | Fast (no re-run); reliable; updates atomically on quality pass | Needs "baseline update" step on quality pass; first run needs bootstrap | Low | ✅ Recommended |
| Git notes on main HEAD | No extra files; standard git mechanism | Obscure; easy to lose on force-push; not widely understood | Medium | Not recommended |

→ Selected: Persisted baselines in ops.config.json (captain, 2026-04-13, interactive)

## Canonical References

(none cited)

## Stage Report: explore

- [x] Files mapped: 2 across config layer
  build-quality SKILL.md (Steps 1-4 restructuring target), plan-checker-prompt.md (dimension 8 addition)
- [x] Assumptions formed: 4 (Confident: 2, Likely: 2)
  A-1 hardwired commands (0.90), A-2 ops.config baseline storage (0.75), A-3 plan-checker dim 8 (0.85), A-4 baseline source (0.70)
- [x] Options surfaced: 1
  O-1 ratchet baseline source (git stash vs persisted vs git notes)
- [x] Questions generated: 0
  No genuinely open questions -- captain framing in parent 074 already resolved language prioritization
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  2 files mapped, significant restructuring of Steps 1-4 + new Step 0.5 + Step 4.5 + plan-checker dimension 8

## Stage Report: clarify

- [x] Decomposition: not-applicable
- [x] Assumptions confirmed: 4 / 4 (0 corrected)
  A-1 through A-4 confirmed via batch; A-4 updated to reflect O-1 selection (persisted baselines)
- [x] Options selected: 1 / 1
  O-1 Ratchet baseline source -- Persisted baselines in ops.config.json (recommended)
- [x] Questions answered: 0 / 0
- [x] Canonical refs added: 0
- [x] Context status: ready
  gate passed: all 4 assumptions confirmed, 1 option selected, ACs valid (6 criteria, no α markers)
- [x] Handoff mode: loose
- [x] Clarify duration: 2 questions asked, session complete
  1 batch assumption presentation (plain text) + 1 AskUserQuestion (O-1 baseline source)

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 085 (Stage Report evidence + confidence gate): depends on this entity's ratchet results for scoring
- `skills/build-quality/SKILL.md`: Steps 1-4 restructuring + Step 4.5 ratchet insertion
- `skills/build-plan/references/plan-checker-prompt.md`: dimension 8 addition
- Captain framing: "覆蓋率是基本功，不可以比上一次少" + "ts 部分要特別增強，recce 是 ts+python 各半且開發頻率很高"
