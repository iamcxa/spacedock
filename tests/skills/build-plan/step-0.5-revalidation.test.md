# Skill TDD: build-plan Step 0.5 -- Assumption Evidence Re-Validation

Behavioral test scenarios for the Step 0.5 insertion in `skills/build-plan/SKILL.md`.
These are skill behavioral specs -- not executable code. Each scenario defines input
state, expected behavior, and a verification command to confirm the behavior was produced.

---

## Scenario: 1 -- all evidence holds

**Input**: Entity body contains 3 confirmed assumptions. Each assumption's `Evidence:` field
cites a valid `file:line` reference (e.g., `skills/build-plan/SKILL.md:47`, `skills/build-explore/SKILL.md:181`, `agents/researcher.md:1`). All cited file regions currently exist and the content still supports the assumption claim.

**Expected**:
- Step 0.5 completes silently
- No `(⚠ stale-evidence: ...)` annotations are added to any assumption's Evidence line
- No `## Stage Report: plan` with `status: failed` is produced
- Plan proceeds to Step 1 (Topic Extraction)

**Verification**:
```
grep "stale-evidence" {entity_file}  # must return 0 matches
grep "Step 0.5" {entity_file}        # absence of blocker output
# plan proceeds: grep "## PLAN" {entity_file} | wc -l returns >= 1
```

---

## Scenario: 2 -- stale evidence (line shift)

**Input**: Entity body contains 1 confirmed assumption citing `skills/build-plan/SKILL.md:82`.
The file has been reformatted -- the content that was on line 82 has moved to line 85 due to
upstream changes. The semantic claim in the assumption (e.g., "Step 1 extracts research topics")
still holds -- only the line number has shifted.

**Expected**:
- Step 0.5 emits a `(⚠ stale-evidence: skills/build-plan/SKILL.md:82 -- content shifted, claim still plausible)` inline annotation appended to the assumption's Evidence line
- No blocker Stage Report is produced
- Plan proceeds to Step 1 with caution flag visible

**Verification**:
```
grep "stale-evidence" {entity_file}  # must match 1 line containing the file:line ref
grep "## PLAN" {entity_file}         # plan was generated despite stale warning
grep "status: failed" {entity_file}  # must return 0 matches
```

---

## Scenario: 3 -- contradicted evidence

**Input**: Entity body contains 1 confirmed assumption claiming "Step 1 has no validation --
topic extraction is pure parsing". The cited `Evidence:` file (`skills/build-plan/SKILL.md:70`)
now shows Step 1 includes an explicit validation block that rejects malformed topic lists.
The current file content directly refutes the assumption's claim.

**Expected**:
- Step 0.5 writes a blocker block in `## Stage Report: plan` with:
  - `status: failed`
  - `feedback-to: captain`
  - `reason: Step 0.5 assumption evidence contradicted`
  - The contradicted assumption listed with Cited / Expected / Found fields
  - Captain options: re-clarify or override
- No `## PLAN` section is generated
- Task generation halts at Step 0.5

**Verification**:
```
grep "feedback-to: captain" {skill_output}         # blocker present
grep "Contradicted assumptions" {skill_output}      # contradiction detail section present
grep "## PLAN" {skill_output}                       # must return 0 matches (no plan generated)
grep "Do NOT proceed to Step 1" {skill_output}      # halt instruction present
```

---

## Scenario: 4 -- evidence file not found

**Input**: Entity body contains 1 confirmed assumption with `Evidence: skills/deleted-file.md:42`.
The file `skills/deleted-file.md` does not exist in the repo (deleted or renamed by another
entity that shipped since clarify).

**Expected** (per A-1):
- File not found is treated as a contradiction -- same severity as Scenario 3
- Step 0.5 writes a blocker in `## Stage Report: plan` with `feedback-to: captain`
- The contradiction block notes "cited file does not exist"
- No `## PLAN` section is generated

**Verification**:
```
grep "feedback-to: captain" {skill_output}    # blocker present
grep "does not exist" {skill_output}          # file-not-found detail in blocker
grep "## PLAN" {skill_output}                 # must return 0 matches
```

---

## Scenario: 5 -- unparseable evidence (no file:line citation)

**Input**: Entity body contains 1 confirmed assumption whose `Evidence:` field contains no
parseable `file:line` pattern. Example: `Evidence: captain decision in 2026-04-13 session --
no file reference`. The regex `(\S+):(\d+)(?:-(\d+))?` finds no match.

**Expected** (per A-2):
- Step 0.5 skips this assumption silently -- no re-validation attempted
- No annotation added (no stale-evidence, no confirmation)
- No error or blocker produced
- Plan proceeds normally

**Verification**:
```
grep "stale-evidence" {entity_file}    # must return 0 matches
grep "status: failed" {entity_file}    # must return 0 matches
grep "## PLAN" {skill_output}          # plan was generated
# No special annotation on the assumption's Evidence line
```

---

## Scenario: 6 -- multi-citation evidence (mixed hold + stale)

**Input**: Entity body contains 1 confirmed assumption with an Evidence field citing 2 files:
`Evidence: skills/build-explore/SKILL.md:186-188 -- inline contradiction annotation precedent.
skills/build-plan/SKILL.md:285-305 -- Stage Report feedback-to: captain escalation format.`
The first citation (`build-explore/SKILL.md:186-188`) holds -- content unchanged.
The second citation (`build-plan/SKILL.md:285-305`) is stale -- the line range shifted to
290-310 but the semantic claim (Stage Report escalation format) still holds.

**Expected** (per A-2 multi-citation + A-5 stale pattern):
- Step 0.5 evaluates each citation independently
- First citation: silent (holds, no annotation)
- Second citation: `(⚠ stale-evidence: skills/build-plan/SKILL.md:285-305 -- content shifted, claim still plausible)` inline annotation
- No blocker (stale alone does NOT escalate to contradiction)
- Plan proceeds with the stale warning visible

**Verification**:
```
grep "stale-evidence" {entity_file}             # exactly 1 match for the second citation
grep "build-explore/SKILL.md" {stale_output}    # must NOT appear (first citation held silently)
grep "build-plan/SKILL.md:285" {stale_output}   # stale annotation references second citation
grep "## PLAN" {skill_output}                   # plan was generated (stale = proceed)
grep "status: failed" {entity_file}             # must return 0 matches
```

---

## Coverage Map

| Scenario | AC / Rule Covered | Step 0.5 Behavior |
|----------|-------------------|-------------------|
| 1 (all hold) | AC-1 (re-read + verify holds), A-5 (silence = OK) | Outcome (a): silent proceed |
| 2 (stale) | AC-3 (shifted line numbers → warning + proceed), A-5 (inline stale annotation) | Outcome (b): warn + proceed |
| 3 (contradicted) | AC-2 (contradicted → blocker + halt), A-5 (Stage Report blocker) | Outcome (c): blocker + halt |
| 4 (file not found) | A-1 (missing evidence = contradiction), AC-2 | Outcome (c) per A-1 |
| 5 (unparseable) | A-2 (no file:line → skip silently) | Skipped silently |
| 6 (multi-citation) | A-2 (multiple citations), A-5 (independent per-citation judgment) | Per-citation independent |
