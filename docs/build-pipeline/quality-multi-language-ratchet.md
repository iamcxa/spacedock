---
id: 083
title: "Multi-language coverage ratchet -- type-check and test count never regress"
status: draft
source: decomposition of entity 074 (pipeline verification quality uplift)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: []
parent: 074
---

## Problem

Quality stage is hardwired to `bun test`, `bun lint`, `bunx tsc --noEmit`, `bun build` with no runner detection or language auto-detection. Entity 052 created `spacebridge/bin/daemon.ts` outside tsconfig's `include` — the file was never type-checked and quality reported PASS. Test count can regress without detection. No Python type-checking at all.

## Scope

### Ratchet 1: Type Coverage (zero uncovered source files)

Per-language auto-detection: TS (tsc --listFiles vs find *.ts), Python (pyright/ruff), Go (go vet), Rust (cargo check). TS gets enhanced checks: strict mode verification, `as any` count ratchet, `@ts-ignore` count ratchet.

### Ratchet 2: Test Count (never decrease, runner-agnostic)

Auto-detect test runner from project config (bun/vitest/jest/mocha/node --test for TS; pytest for Python; go test for Go; cargo test for Rust). Ratchet checks `count(current) >= count(baseline)`.

### Plan-Checker Dimension 8

For every task with source files in `files_modified`: is there a test file paired? Is the source path within a type-check config? If outside, is there a task to update config?

## Acceptance Criteria

- [ ] Given a project with TS + Python source files, when quality stage runs, then it auto-detects both languages and runs per-language ratchet checks (how to verify: project with TS+Python, quality runs both tsc + pyright checks)
- [ ] Given a new .ts file created outside tsconfig include path, when quality ratchet runs, then it flags the file as uncovered (how to verify: create .ts file outside tsconfig scope, run quality, observe type coverage FAIL)
- [ ] Given an `as any` cast added to a .ts file, when TS enhanced ratchet runs, then it detects the cast count increased and FAILs (how to verify: add `as any`, run quality, observe cast count regression FAIL)
- [ ] Given a test file deleted, when test count ratchet runs, then it detects count decreased and FAILs (how to verify: delete a test, run quality, observe test count regression FAIL)
- [ ] Given a plan with a new .ts source file but no paired test file, when plan-checker dimension 8 runs, then it warns about missing test pairing (how to verify: plan with .ts task and no test, run plan-checker, observe WARN)
- [ ] Given a project migrating from jest to vitest, when test count ratchet runs, then it auto-detects vitest and continues working (how to verify: switch runner config, run quality, ratchet still fires)

## References

- Parent entity 074: pipeline verification quality uplift
- `skills/build-quality/SKILL.md`: Steps 1-4 restructuring target
- `skills/build-plan/references/plan-checker-prompt.md`: dimension 8 addition
- Captain framing: "覆蓋率是基本功，不可以比上一次少" + "ts 部分要特別增強，recce 是 ts+python 各半且開發頻率很高"
