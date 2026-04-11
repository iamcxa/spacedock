---
created: 2026-04-11T02:44:00.000Z
title: Extend skill-creator assertion schema for forced-choice + citation pressure tests
area: testing
files:
  - tests/pressure/
  - ~/.claude/projects/-Users-kent-Project-spacedock/memory/pressure-test-preservation-todo.md
---

## Problem

Phase E Plan 1 quality 补洞 produced 17+ behavioral pressure tests that were extracted into `tests/pressure/*.json` artifacts (see sibling todo `extract-phase-e-plan-1-pressure-tests-to-tests-pressure-json`). These JSON files are human-readable data only — **there is no runner to execute them as a regression suite yet**.

The tests use a forced-choice format that skill-creator's existing assertion schema does not support directly:

- Each test gives subagent a scenario with A/B/C/D/E options
- Subagent must choose one letter AND cite specific file + section + text
- Grading needs to check: (1) correct letter chosen, (2) required citations present in response

skill-creator's existing assertion types are designed for output eval (string match, LLM grader on file content, etc.) — not for forced-choice discipline pressure tests.

## Solution

**Depends on**: `extract-phase-e-plan-1-pressure-tests-to-tests-pressure-json` todo must complete first. Without the JSON data, there's nothing to run.

**Design decisions to make in this todo**:

1. **Extend skill-creator upstream vs write spacedock-native wrapper**:
   - Option A — extend `skill-creator` itself with new assertion types. Clean but requires upstream PR and versioning coordination.
   - Option B — write a thin `tools/pressure-test-runner/` that consumes `tests/pressure/*.json`, dispatches via Claude Code Agent tool, and calls skill-creator's grading primitives where useful. Spacedock-owned, no upstream dependency.
   - Leaning toward **B** because spacedock already has strong tool/ patterns (Bun/TS for dashboard, Python for scripts) and forced-choice eval is narrow enough to not justify upstream extension.

2. **Assertion schema** (new types to add):
   - `{type: "forced_choice", expected: "C"}` — subagent response must clearly indicate the chosen option letter. Grading: regex/LLM check for "Choice: C" or "Decision: C" or "**C**" in response.
   - `{type: "required_citation", file: "check-mode.md", section: "Error Handling", contains: "plan_rationale is empty or missing"}` — subagent response must quote specific text. Grading: substring search (case-insensitive) on the response for the `contains` field.
   - Consider: `{type: "forbidden_option", value: "D"}` for negative assertions — "subagent must NOT pick D".

3. **Runner implementation**:
   - Language: Python (matches skill-creator's primitives) or TS (matches spacedock's tool/ patterns). Leaning Python for skill-creator compatibility.
   - Dispatcher: uses the same `Agent` tool pattern as skill-creator's `run_eval.py`, passing the scenario as prompt and the skill files via Read tool.
   - Output: `tests/pressure/results/YYYY-MM-DD/{skill-name}.json` with pass/fail per test case + subagent raw response for debugging.
   - Multiple runs per test: LLM non-determinism means each scenario should run 3× and report pass rate (not binary pass/fail). Match skill-creator's 3-run convention.

4. **CI integration**:
   - Nightly run? Pre-push hook? On-demand only?
   - Cost budget: 17 tests × 3 runs × ~$0.01 = ~$0.50/run. Acceptable for nightly.
   - Fail condition: pass rate < 80% on any test → CI fail + post finding to captain.

5. **Baseline establishment**:
   - Run the suite once all skills are at current state, capture pass rates per test
   - Any future change that drops pass rate below baseline is a regression
   - Store baseline in `tests/pressure/baseline.json`

**Non-goals for this todo**:
- Do NOT add new pressure tests beyond what the 4 JSON files contain. Those are the current "contract" — adding new tests is separate work.
- Do NOT extend beyond spacedock's skills/mods/references. This runner is for spacedock's own plugin content, not generic skill testing.
- Do NOT block Plan 2 progress on this todo — Plan 2 /build can proceed with the JSON data as documentation-only artifact until framework lands.

**When to pick this up**:
- Plan 2 planning session, OR
- Dedicated quality round after Plan 2 ships, OR
- Any time the pressure tests are needed to validate a refactor (e.g., Plan 3's `build-execute` skill modifies the mod — we'd want to verify the mod's pressure tests still pass)

See memory file `pressure-test-preservation-todo.md` for the Vitest-rejection rationale and the full two-step plan context.
