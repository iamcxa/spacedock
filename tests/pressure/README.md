# Pressure Tests

Behavioral regression tests for spacedock skills, mods, and references that
encode discipline rules. Each test case is a forced-choice scenario
dispatched to a fresh subagent with the target skill files loaded; the
subagent must choose A/B/C/D/E and cite skill text verbatim. Pass = correct
option + valid citation.

## Why these exist

These tests preserve the 17+ behavioral pressure tests run during
**Phase E Plan 1 quality 补洞 (2026-04-11)**. Without preservation, every
future regression check would require re-designing scenarios from scratch.

The original 49 structural tests (grep-on-markdown assertions) were deleted
in commit `4d7a3d4` because they were a category error — they verified
skill text contained certain strings, not that an LLM following the skill
under pressure produced correct behavior. These pressure tests are the
opposite: they ARE behavioral, dispatching real LLM subagents and grading
their answers.

## What's NOT here yet

**A runner.** These YAML files are data-only artifacts. Re-running them
requires manual subagent dispatch (see "Manual re-run" below) until the
framework lands. Framework work is tracked in:
- Memory: `~/.claude/projects/-Users-kent-Project-spacedock/memory/pressure-test-preservation-todo.md`
- GSD todo: `extend-skill-creator-assertion-schema-for-forced-choice-pres` (commit `78e292f`)

The framework will likely extend [skill-creator]'s eval system with new
assertion types: `forced_choice` (subagent must end response with specific
option letter) and `required_citation` (subagent must quote specific file
text). See the GSD todo for design notes.

## File index

| File | Skill / Mod | Test cases | Last fix commit |
|------|-------------|------------|-----------------|
| `workflow-index.yaml` | `skills/workflow-index/SKILL.md` + 5 references | 3 | `eb7181d` |
| `knowledge-capture.yaml` | `skills/knowledge-capture/SKILL.md` + 5 references | 3 | (no fix needed — all first-try green) |
| `workflow-index-maintainer.yaml` | `mods/workflow-index-maintainer.md` | 3 | `0d7d2e1` |
| `first-officer-shared-core.yaml` | `references/first-officer-shared-core.md` step 3.6 | 3 | (no fix needed) |
| `overhaul.yaml` | `skills/overhaul/SKILL.md` + 1 reference | 4 | (pending -- entity 066) |

**Total: 16 unique scenarios.** 5 of them have round-2 history entries
(re-tested after fix-forward commits), giving 17+ total subagent dispatches
captured in the history fields.

## Schema

Each YAML file contains:

```yaml
skill: <name>                    # human-readable skill identifier
target_path: <repo-relative>     # path to the file being tested
captured: <YYYY-MM-DD>           # when the test was first run
session: <session-tag>           # context (phase, plan, etc.)
related_commit_with_fix: <sha>   # if any test failures led to a fix-forward

test_cases:
  - id: <kebab-case-slug>
    summary: |
      Multi-line description of the scenario context: who is the subagent,
      what is the situation, what's the trap. ~5-15 lines.
    pressure:
      - <pressure-type>: "specific instance"
    options:
      A: "Single-line description of option A"
      B: "..."
      ...
    expected_answer: <letter>
    correct_because:
      cite_file: <skill-relative-path>
      cite_section: "<section heading or line range>"
      cite_contains: "<verbatim text the subagent must quote>"
    history:
      - date: <YYYY-MM-DD>
        round: <int>
        result: <green | green-via-cross-reference | green-with-bonus-finding | reasonable-but-flagged-design-gap | failed | etc>
        notes: |
          What the subagent did, what it cited, any insights surfaced.
```

The schema is intentionally **lossy** — verbatim Agent prompts are NOT
stored. The framework will reconstruct prompts from `summary` + `options`
+ standard scaffolding ("REAL WORK SITUATION..." intro + "MUST choose,
MUST quote" outro). This keeps file sizes manageable while preserving
the unique data.

## Manual re-run (until framework lands)

To re-verify a single test case:

1. **Load context.** Open the YAML file and find the test case by `id`.
2. **Construct the prompt.** Combine the standard scaffolding with the
   case's `summary`, `options`, and rules:
   ```
   REAL WORK SITUATION — not a quiz. Read the target skill files first,
   then make a concrete decision.

   Step 1: Read these files in /Users/kent/Project/spacedock/:
   - <target_path>/SKILL.md
   - <target_path>/references/*.md (or whatever the skill structure is)

   Step 2: Apply what you learned to this scenario:
   <summary text>

   Pick ONE option and justify with direct quotes from the files you read:

   A) <option A>
   B) <option B>
   ...

   Rules:
   - You MUST choose A, B, C, D, or E. No deferring.
   - You MUST quote directly from one or more skill files. Include file
     name + line reference.
   - Under 500 words total response.

   Make the decision now.
   ```
3. **Dispatch via Agent tool** (Claude Code):
   ```
   Agent({
     description: "Pressure test: <id>",
     subagent_type: "general-purpose",
     prompt: <constructed prompt above>
   })
   ```
4. **Verify the result**:
   - Subagent's chosen letter must match `expected_answer`.
   - Subagent's response must contain text from `correct_because.cite_contains`
     (substring match, case-insensitive is fine).
5. **Update history** if you re-run as a verification:
   ```yaml
   history:
     - <existing entries>
     - date: <today>
       round: <next number>
       result: <green | failed>
       notes: <what the subagent did this time>
   ```

## When to re-run

- **Before merging** any changes to a target skill/mod/reference (manual gate).
- **After any refactor** that touches skill text formatting, examples, or
  invariant statements.
- **As part of Plan 2's `build-plan` skill testing** — the build-plan skill
  will invoke `workflow-index` check-mode, so workflow-index pressure tests
  should still pass against the unchanged contract.
- **Periodically** (nightly?) once the framework lands and CI integration
  is set up.

## When NOT to extend without thinking

Before adding new test cases:

1. **Check that the test would surface a real failure mode.** Pressure tests
   are expensive (each one is a fresh subagent dispatch costing ~$0.05 in
   tokens). Don't add tests for behaviors that pass trivially.
2. **Make the scenario realistic.** A 4-paragraph scenario with concrete
   file paths, actor identity, and time pressure produces useful failures.
   A vague "what should you do?" produces academic recitations.
3. **Force a specific choice.** Open-ended questions let subagents hedge.
   A/B/C/D/E forced-choice produces clear pass/fail signals.
4. **Specify the expected citation.** Without `cite_contains`, you can't
   distinguish "subagent guessed correctly" from "subagent reasoned from
   the skill". The citation requirement is what makes the test behavioral
   rather than coincidental.

## Related

- `~/.claude/projects/-Users-kent-Project-spacedock/memory/pressure-test-preservation-todo.md`
  — full context for why these exist + framework deferral decision
- `~/.claude/projects/-Users-kent-Project-spacedock/memory/workflow-index-trigger-ceiling.md`
  — sibling Task 5 finding about trigger eval (different test type, different ceiling)
- `~/.claude/projects/-Users-kent-Project-spacedock/memory/plan-write-discipline.md`
  — 5-layer plan-write discipline (some pressure tests verify these rules in skill text)
- `tests/trigger-eval/` — sibling directory for trigger description eval (skill-creator format)
- `.planning/todos/pending/` — GSD todos tracking framework work

[skill-creator]: https://github.com/anthropics/skill-creator
