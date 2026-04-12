---
id: 071
title: Build-Clarify Interaction Modes (--auto, --power)
status: draft
context_status:
source: build-distill
created: 2026-04-12
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

Add `--auto` and `--power` interaction modes to `build-clarify`, matching the equivalent modes in GSD's `discuss-phase`.

Currently `build-clarify` is always fully interactive -- the captain must answer every question in real time, one at a time. For entities where the captain trusts the explore-stage recommendations ("just proceed with all Confident assumptions"), this is unnecessary overhead. For situations where the captain is unavailable in real time, there is no async path.

### Modes to Implement

**`--auto` mode**: Non-interactive clarify. For each gray area:
- Assumptions: auto-confirm all Confident (>= 0.80) assumptions; escalate Likely/Unclear to captain
- Option Comparisons: auto-select the "Recommended" option from the table
- Open Questions: use `Suggested options[0]` (first suggested option) if present; if none, escalate to captain

The auto-mode summary is presented to the captain as a plain-text block after completion (not via AskUserQuestion). Captain can override any auto-decision by editing the entity body annotations before saying "execute {slug}".

**`--power` mode**: Async clarify via file-based UI. All unresolved gray areas are written to `docs/build-pipeline/{slug}-clarify-questions.md` in a structured format the captain can edit at their own pace:
- Each gray area has its options listed
- Captain edits the file to mark their choice (or write freeform)
- Captain re-runs `build-clarify --power {slug} --apply` to apply the answers from the file

### Why This Matters

Gap score: 0.75 (High) from comparison `gsd-discuss-phase-vs-build-clarify.md`. The evidence:
- `gsd-discuss-phase/SKILL.md:3` -- `--auto` and `--power` flags exist and are used
- `skills/build-clarify/SKILL.md:327-344` -- Rules section has no equivalent flags; single interactive mode only

Captain pain point: entities with many Confident assumptions (e.g., 8 out of 10 are Confident) still require the captain to sit through batch confirmation before FO can proceed. --auto would skip this when confidence is high enough.

Also covers the "Context Strategy" gap (score 0.50) from the same comparison: --auto mode with cross-entity context loading could auto-confirm gray areas that match prior locked decisions, preventing re-asking questions decided in earlier entities.

### Constraints

- `--auto` must NOT silently skip Unclear assumptions or open questions without a suggested option -- these always escalate to captain even in auto mode
- `--power` questions file must be human-readable and self-contained (all context needed to answer inline)
- Both modes must still run the Step 5 sufficiency gate before committing -- no gaps allowed even in auto mode
- Mode flags are passed at invocation (`/build-clarify --auto {slug}`); not stored in frontmatter

## Captain Context Snapshot

- **Comparison report**: `docs/build-pipeline/_docs/distillations/gsd-discuss-phase-vs-build-clarify.md`
- **Source skill**: `~/.claude/skills/gsd-discuss-phase/SKILL.md` (--auto, --chain, --power flags)
- **Gap dimensions**: Interaction Model (0.75) + Context Strategy (0.50)
- **Gap scores**: 0.75 + 0.50 -- both qualifying
- **Distillation run**: Entity 068, build-distill Wave 2 task-3
- **Also covers**: The "user-selects-which" gap from gsd-discuss-assumptions-vs-build-explore.md (score 0.50 on Interaction Model) -- --auto mode implicitly skips low-value gray areas by auto-confirming high-confidence items

## Acceptance Criteria

- `build-clarify --auto {slug}` completes without AskUserQuestion for an entity where all assumptions are Confident and all options have a Recommended choice (how to verify: run with a fully-Confident entity; count AskUserQuestion calls = 0)
- `build-clarify --power {slug}` writes `docs/build-pipeline/{slug}-clarify-questions.md` containing all unresolved gray areas in structured format (how to verify: `test -f docs/build-pipeline/{slug}-clarify-questions.md && grep -c "Question\|Option\|Assumption" {file}` returns >= count of unresolved items)
- `build-clarify --auto {slug}` escalates to captain (AskUserQuestion) for any Unclear assumption or Open Question with no Suggested options (how to verify: create test entity with one Unclear assumption; run --auto; verify AskUserQuestion fires exactly once)
- Stage Report: clarify records the mode used (`--auto` or `--power`) in the Clarify duration line (how to verify: `grep "auto\|power" {entity-stage-report}` returns a match)
