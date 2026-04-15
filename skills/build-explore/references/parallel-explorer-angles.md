# Parallel Explorer Angles

<!-- ABOUTME: Reference doc for build-explore Step 2 Mode A dispatch. Defines the 4 fixed angles dispatched as parallel subagents (Port 7 / Mode A). Mode B fallback (inline single-pass) also specified. Edit this file to tune angle definitions without touching SKILL.md Step 2's dispatch contract. -->

Defines the 4 fixed angles for build-explore Step 2 **Mode A** (SO-direct / Agent-available context) parallel dispatch. SKILL.md Step 2 cites this file when constructing the 4-subagent fan-out.

---

## Purpose

When `build-explore` runs in **Mode A** (SO-direct session where the `Agent` tool is available), Step 2 fans out to **4 parallel fresh-context subagents** -- one per angle below. Each subagent receives: (a) the entity's APPROACH keywords and scope anchors, (b) the angle definition from this file, and (c) any angle-specific seed data (see §5 for Angle iv seeds). The subagents return structured text; Step 2 merges results into the entity body before Step 3 begins.

The 4 angles are orthogonal by design. Running them in parallel preserves fresh-context isolation so that no angle's framing biases another's findings.

---

## Angle (i) -- prevailing-patterns

**Goal**: Find the dominant existing pattern for the directive topic within the target scope.

**Method**:
1. Extract APPROACH keywords from the dispatch prompt (provided by SKILL.md Step 2).
2. Run `grep`/`glob` across the target scope files for 2+ consistent usages of the same pattern.
3. Count occurrences per pattern variant; rank by frequency.

**Return format** (structured, one entry per discovered pattern):

```
pattern: {name or short description}
usages: {N}
citations: {file:line}, {file:line}, ...
tier: [primary|secondary|tertiary]
```

- `[primary]` -- 3+ consistent usages across 2+ distinct files
- `[secondary]` -- 2 usages, or 3+ in a single file
- `[tertiary]` -- 1 usage or only test/fixture files

Return ALL patterns found, ranked highest usage first. If no pattern is found, return `pattern: none -- {search terms tried}`.

---

## Angle (ii) -- recent-decisions

**Goal**: Surface recent ADRs, design docs, DECISIONS.md active entries, and commit-log evidence within the last N commits touching the target files.

**Method**:
1. Run `git log --since="30 days" -- {target_paths}` to find recent commits touching the scope.
2. Read any ADR files referenced in those commits or present in `docs/` under adr/, decisions/, or design/ subdirectories.
3. Scan `DECISIONS.md` (if present at repo root or project root) for active entries matching APPROACH keywords.
4. Scan Captain Context Snapshot `## Related entities` for sibling decisions that constrain this entity's design space.

**Return format** (structured, one entry per decision):

```
decision-id: {ADR number, DECISIONS.md key, or commit SHA short}
date: {YYYY-MM-DD}
location: {file:line or "git log"}
summary: {one sentence}
tier: [primary|secondary|tertiary]
```

- `[primary]` -- explicit ADR or DECISIONS.md active entry
- `[secondary]` -- commit message with design rationale, or parent entity clarify annotation
- `[tertiary]` -- inline comment or TODO referencing a decision

Return all decisions found. If none found, return `decision-id: none -- searched git log 30 days + ADR/DECISIONS.md`.

---

## Angle (iii) -- sibling-entity

**Goal**: Detect active-state entities (in-flight, planned, clarified, or at execute stage) that touch the same file surface, to prevent silent blast-radius overlap.

**Method**:
1. Read `docs/build-pipeline/_index/CONTRACTS.md` -- look for entries whose file paths overlap the target scope.
2. Read `docs/build-pipeline/_index/INDEX.md` -- filter to entities with `status` in `{in-flight, planned, clarified, execute, pr-draft}`.
3. Cross-reference: for each active entity found, check whether its declared file surface (from CONTRACTS or entity body `## Files Modified`) overlaps the current entity's APPROACH scope.

**Return format** (structured, one entry per relevant sibling):

```
entity: {id} ({title})
stage: {current pipeline stage}
status: {in-flight|planned|clarified|execute|pr-draft}
overlap: {one sentence describing the file or concept overlap}
tier: [primary|secondary|tertiary]
```

- `[primary]` -- CONTRACTS.md explicit entry with overlapping file path
- `[secondary]` -- INDEX.md active entry whose title/directive keywords match APPROACH
- `[tertiary]` -- entity found via commit history but no CONTRACTS entry

Return all overlapping siblings. If none found, return `entity: none -- checked CONTRACTS.md + INDEX.md active entries`.

---

## Angle (iv) -- negative-space

**Goal**: Verify documented absences from a structured seed list. Prevents freeform "X is absent" claims that are ungrounded.

**Constraint (Q-2)**: This angle NEVER makes freeform absence claims. Every absence finding MUST map to a seed from the seed-pattern table in §5. Returns are structured per-seed verdicts only.

**Method**:
1. Receive the seed table subset from the dispatch prompt (SKILL.md Step 2 extracts APPROACH keywords, looks them up in §5, passes only matching seeds).
2. For each received seed: search the target scope for the presence or absence pattern defined in the seed table.
3. Return one structured verdict per seed.

**Return format** (one entry per seed received):

```
seed: {seed keyword from §5}
verdict: confirmed | refuted | not-applicable
evidence_or_reason: {file:line if confirmed or refuted; one-sentence reason if not-applicable}
tier: [primary|secondary|tertiary]
```

- `confirmed` -- the absence pattern holds (the thing is absent as expected)
- `refuted` -- the thing IS present (absence is not a gap)
- `not-applicable` -- seed keyword matched APPROACH but scope does not contain the relevant construct

Do NOT add seeds beyond those received from the dispatch prompt. If the dispatch prompt sends zero seeds, return `seed: none-dispatched -- no APPROACH keywords matched §5 table`.

---

## §5 -- Seed-pattern table for Angle (iv)

SKILL.md Step 2 uses this table to translate APPROACH keywords into concrete absence patterns before dispatching Angle (iv). Only seeds whose keyword matches an APPROACH keyword are dispatched.

**Keyword → absence pattern mapping**:

| Keyword | Absence Pattern to Verify | Search Method |
|---|---|---|
| `async` | `await` absent in `async`-declared functions | Grep `async function\|async (` in scope; for each match, check whether the function body contains `await`; flag functions with no `await` |
| `error-handling` | `try/catch` absent in I/O paths | Grep `fetch(\|readFile\|writeFile\|query(\|execute(` in scope; for each match, check 10-line context for `try` or `.catch(`; flag unguarded I/O calls |
| `lock/mutex` | `lock\|Mutex\|synchronized` absent in shared-state writes | Grep `global\.\|module\.\|sharedState\|globalThis\.` writes in scope; for each match, check 5-line context for `lock\|Mutex\|synchronized\|semaphore`; flag unguarded shared-state mutations |
| `test coverage` | Empty or stub test file | Glob `*.test.ts\|*.spec.ts` in scope; for each file, check for `describe.skip` or 0 `it(` / `test(` calls; flag files with no active test cases |
| `type annotation` | Missing return-type annotations on exported functions | Grep `^export (function\|const\|async function)` in scope; for each match, check whether `:` return-type annotation follows the parameter list; flag unannotated exported functions |

**Keyword → seed mapping rule**: SKILL.md Step 2 scans the entity's APPROACH text for exact keyword matches (case-insensitive substring). For each matched keyword, the corresponding row from this table is included in the Angle (iv) dispatch prompt. If multiple keywords match, all matching rows are included. Keywords not present in this table are silently skipped -- do NOT invent ad-hoc seeds at dispatch time.

To extend the seed vocabulary, add rows to this table following the same 3-column format; edit this file only (edit contract -- see §7).

---

## §6 -- Mode B Fallback

When the `Agent` tool is **not available** (ensign-wrapper mode, nested-Agent context, or any dispatch path where `subagent-cannot-nest-agent-dispatch` applies), SKILL.md Step 2 runs **Mode B** instead:

- Run angles (i), (ii), and (iii) as a single inline sequential pass using `Grep`, `Glob`, `Bash`, and `Read` within the current session.
- **Skip angle (iv)** entirely. Angle (iv)'s seed-list verification requires a subagent to isolate search state per seed; without that isolation, freeform absence claims would violate the Q-2 constraint.
- Emit the following warning line in the Stage Report:

  ```
  ⚠ Mode B fallback: angle (iv) negative-space skipped -- Agent tool unavailable. Absence gaps not verified this pass.
  ```

Mode B produces a structurally valid explore output. The missing angle (iv) is a known coverage gap, not a blocking failure. Plan-phase and execute-phase reviewers should note that negative-space was not verified when the Stage Report carries this warning.

---

## §7 -- Edit Contract

This file may be edited independently of `skills/build-explore/SKILL.md` to tune angle definitions, adjust tier-tag criteria, or extend the §5 seed-pattern table. Every edit MUST remain compatible with the following invariants from SKILL.md Step 2's 4-angle dispatch contract:

1. Exactly 4 angles named `prevailing-patterns`, `recent-decisions`, `sibling-entity`, `negative-space` (angle names are matched by string in the dispatch prompt template).
2. Return format for each angle includes a `tier:` field using `[primary|secondary|tertiary]` syntax -- matches sibling entity 105 tier-tag syntax per epic 102 O-1 captain decision.
3. Angle (iv) verdict enum is exactly `confirmed | refuted | not-applicable` -- changing these values breaks SKILL.md Step 2's merge logic.
4. Mode B skip of angle (iv) remains unconditional -- do NOT add a Mode B partial angle (iv) path without updating SKILL.md Step 2's merge handling.
5. §5 keyword column values are matched case-insensitively by SKILL.md Step 2 -- do NOT use regex syntax in keyword cells; use plain lowercase strings.
