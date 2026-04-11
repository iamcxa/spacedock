---
created: 2026-04-11T02:42:54.632Z
title: Extract Phase E Plan 1 pressure tests to tests/pressure/*.json
area: testing
files:
  - ~/.claude/projects/-Users-kent-Project-spacedock/memory/pressure-test-preservation-todo.md
  - commit:eb7181d
  - commit:0d7d2e1
---

## Problem

Phase E Plan 1 quality 补洞 (2026-04-11) ran 17+ behavioral pressure tests via one-shot `Agent` dispatches across Tasks 1-4 (writing-skills pressure testing on workflow-index, knowledge-capture, workflow-index-maintainer mod, and first-officer-shared-core step 3.6). All scenarios, expected answers, and verified citations currently exist ONLY in:

- Current session conversation history (ephemeral — gone after session ends)
- Two fix-forward commit messages: `eb7181d` (Task 1) and `0d7d2e1` (Task 3)

**No structured artifact for regression checks.** If `workflow-index` / `knowledge-capture` / mod / FO-shared-core content is modified in Plan 2+ or any later refactor, there is no way to quickly verify the original invariants still hold without re-designing all scenarios from scratch.

Captain explicitly flagged this gap 2026-04-11 during Task 5: "測試案例是否有留下？我們應該要把跑過的測試寫成 evaluator or bq test 以便往後繼續測試確保行為前後一致".

## Solution

**Two-step plan — captain-approved 2026-04-11**. This todo is Step 1 only; Step 2 (framework) is a separate concern.

**Step 1 (this todo, execute AFTER Task 5 completes, BEFORE /build Plan 2)**:

Extract the 17+ scenarios into `tests/pressure/*.json` using skill-creator's `evals.json` schema as the base format. Four files:

- `tests/pressure/workflow-index.json` — Task 1's 3 scenarios + Round 2 re-tests (B and C had fixes applied)
- `tests/pressure/knowledge-capture.json` — Task 2's 3 scenarios (all first-try green)
- `tests/pressure/workflow-index-maintainer.json` — Task 3's 3 scenarios + Round 2 re-tests (all 3 had fixes applied)
- `tests/pressure/first-officer-shared-core.json` — Task 4's 3 scenarios (all first-try green)

Each test case should include:
- `scenario` — verbatim prompt that was dispatched to subagent
- `options` — A/B/C/D/E forced choices
- `expected_answer` — correct letter
- `required_citations` — array of `{file, section, must_contain}` for evidence verification
- `status` — green-round-1 / fixed-round-2 / etc.
- `history` — date + commit SHA + subagent citation notes

**No runner in this step.** The JSON files are human-readable data-only artifacts. Future Claude sessions can `cat` them and manually dispatch via `Agent` tool for verification.

**Step 2 (separate todo — build framework)**: Extend skill-creator's assertion schema for forced-choice + citation checks. Use skill-creator's existing runner infrastructure. See second GSD todo.

**Source material**:
- Memory file: `~/.claude/projects/-Users-kent-Project-spacedock/memory/pressure-test-preservation-todo.md` — has full context, "do NOT" list, and schema expectations
- Commit `eb7181d` message — Task 1 findings + re-test results
- Commit `0d7d2e1` message — Task 3 findings + re-test results
- Current conversation history (while session still alive) — full scenario prompts for all 17+ dispatches

**Sequencing rule**: must happen BEFORE `/build Plan 2` is invoked. Task 6 in the current session's TaskCreate list. Do NOT defer across sessions — the conversation history that's easiest to extract from will be lost.

**Explicit DO NOT**:
- Do NOT revive the 49 structural tests deleted in commit `4d7a3d4` — they were grep-on-markdown, category error
- Do NOT pick Vitest/bun:test — they can't dispatch Claude subagents, would test a different surface
- Do NOT write the JSON files inside the Task 5 execution — captain's explicit sequencing: `先跑完 Task 5 → 寫 yaml → 下一輪做框架`
