---
title: Score Format Standardization
status: ideation
source: commission seed
started:
completed:
verdict:
score: 19
---

## Problem

The scoring rubric (Edge/Fitness/Parsimony/Testability/Novelty, each 1-5, sum out of 25) is defined in the pipeline README but has two issues:

1. **No calibration guidance.** The dimension descriptions are one-liners ("How much competitive advantage or unique insight this provides"). Two agents scoring the same entity could produce wildly different results because there are no anchor points defining what a 1 vs a 3 vs a 5 looks like.

2. **Inconsistent format across the codebase.** The format is documented differently in different places:
   - `v0/spec.md` line 68: `# N/25 (optional, for prioritization)` — implies the "/25" suffix
   - `v0/spec.md` lines 219-221: `(score: 22/25)` — uses "/25" in examples
   - `skills/commission/SKILL.md` line 84: "priority score out of 25" — plain text reference
   - `skills/commission/SKILL.md` line 113 (design summary): `(score: {score}/25)` — formats with "/25"
   - `docs/plans/README.md` line 38: `number | Priority score out of 25 (optional)` — no suffix
   - All actual entity files: plain integer (`score: 19`, `score: 16`, etc.) — no suffix
   - Status script: parses and displays the raw value, works with plain integers

   In practice, entities already use plain integers. But the spec and commission skill presentation still reference the "/25" format, creating ambiguity for agents that read those documents.

Without calibration, scores are unreliable for prioritization — which is their entire purpose. Without format consistency, an agent might write `score: 18/25` in frontmatter, which the status script would display as `18/25` instead of sorting numerically.

## Proposed Approach

1. **Standardize on plain integer format.** `score: 18` in YAML frontmatter — no "/25" suffix. This is already how all existing entities work. The status script parses it correctly and `sort -rn` works on integers. Update the spec and commission skill to match.

2. **Add anchor descriptions to each rubric dimension.** For each of the 5 dimensions, define what a 1, 3, and 5 looks like. Anchors should be domain-agnostic enough to work across different pipeline missions but concrete enough to calibrate. Proposed anchors:

   | Dimension | 1 (Low) | 3 (Medium) | 5 (High) |
   |-----------|---------|------------|----------|
   | **Edge** | Commodity work — anyone would do this the same way | Provides some differentiation or insight | Core strategic advantage; changes how the system competes |
   | **Fitness** | Tangential to the pipeline's current mission | Useful but not blocking anything | Directly unblocks the highest-priority work |
   | **Parsimony** | Requires significant complexity, many moving parts | Moderate scope with some inherent complexity | Single focused change, minimal surface area |
   | **Testability** | Hard to verify — subjective or requires extensive setup | Can be tested but needs non-trivial scaffolding | Pass/fail is obvious and quick to check |
   | **Novelty** | Well-known solution applied in a standard way | Combines known techniques in a less common way | Genuinely original approach or framing |

3. **Add anchors to the commission skill's README template.** The Scoring Rubric section in `skills/commission/SKILL.md` currently generates a table with only "What it measures" column. Expand it to include the anchor descriptions so every commissioned pipeline gets calibration points.

4. **Update the spec to match practice.** Change `v0/spec.md` line 68 from `# N/25 (optional, for prioritization)` to `# integer (optional, for prioritization)`, and update the dogfood examples to drop the "/25" suffix.

5. **Add scoring instructions for entities.** Each entity with a Scoring Breakdown table should show per-dimension scores that sum to the total. This pattern already exists in all scored entities — just needs to be documented as expected practice in the README template.

### Files to modify

- `v0/spec.md` — fix score format in schema comment (line 68) and dogfood examples (lines 219-221)
- `skills/commission/SKILL.md` — update design summary format (line 113), expand Scoring Rubric template (lines 203-214)
- `docs/plans/README.md` — add anchor descriptions to the existing Scoring Rubric section

## Acceptance Criteria

- [ ] Each rubric dimension (Edge, Fitness, Parsimony, Testability, Novelty) has anchor descriptions for scores 1, 3, and 5
- [ ] The commission skill's README template includes the anchor descriptions when a scoring rubric is generated
- [ ] The scoring guidance is specific enough that two agents scoring the same entity would produce scores within 3 points of each other
- [ ] The format is documented as plain integer (not "N/25" or normalized) consistently across: `v0/spec.md`, `skills/commission/SKILL.md`, and `docs/plans/README.md`
- [ ] The spec's dogfood examples use plain integers (not "22/25")
- [ ] The commission skill's design summary shows `(score: {score})` not `(score: {score}/25)`
- [ ] This pipeline's own README is updated with the standardized anchors

## Scoring Breakdown

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Edge | 4 | Consistent scoring is key to meaningful prioritization |
| Fitness | 4 | Directly impacts how well the pipeline dispatches work |
| Parsimony | 4 | Simple change — add anchor text to existing rubric and fix a few format references |
| Testability | 4 | Can test by having two agents score the same entity and comparing results |
| Novelty | 3 | Rubric anchoring is a known technique, applied to agent context |

## Open Questions (Resolved)

- **Q: Should scoring be mandatory?** A: No. The schema already marks score as optional. Some pipelines won't need prioritization.
- **Q: Should we allow custom rubric dimensions?** A: Not in v0. The 5-dimension rubric is part of the commission template. Custom dimensions can be a v1 feature.
- **Q: Should anchors be pipeline-specific or generic?** A: Generic. The anchors describe the scale (what does a 1/3/5 mean for "Edge"?) not the domain. Pipeline-specific calibration would require the commission skill to generate custom anchors per mission, which is unnecessary complexity for v0.
- **Q: Should the status script validate score format?** A: No. The script already handles plain integers correctly. Adding validation would be over-engineering — if an agent writes bad frontmatter, that's a different problem.
