---
name: confidence-gate
description: "Two-mode confidence gate dispatched by FO. Mode plan_gate runs after plan-checker PASS and computes 5-factor plan confidence (context completeness / scope clarity / risk / precedent / AC testability, uniform 20% weights) gating at 95%. Mode pre_ship_gate runs before UAT→shipped transition and computes 5-factor composite (test_coverage 25% / type_coverage 20% / review_severity 20% / ac_completeness 20% / integration_breadth 15%) gating at 90% with 3-iteration auto-fix loop. Writes ## Confidence Assessment section with Stage: plan|pre-ship field."
user-invocable: false
---

# Confidence-Gate -- Plan and Pre-Ship Confidence Scoring

This skill is the unified confidence gate for the build pipeline. It codifies two previously-tribal enforcement points: (a) the plan-stage confidence gate, which was MEMORY-only (`fo-confidence-autoadvance.md`) and therefore silently skippable; and (b) the pre-ship confidence gate, which lived as an inline 24-line FO procedure plus a 360-line reference doc and suffered the same skippability risk. Entity 110 (2026-04-16) codifies both into this first-class skill per decisions D-110-1 through D-110-6: D-110-1 uniform schema with `Stage: plan|pre-ship` field, D-110-2 plan gate fires right after plan-checker PASS, D-110-3 skill-based enforcement replaces MEMORY-only, D-110-4 `references/confidence-gate.md` becomes a stub-redirect, D-110-5 pre-ship mode ports the 5-factor composite verbatim, D-110-6 plan-gate weights are uniform 20%.

FO dispatches this skill in one of two modes. Mode `plan_gate` runs after `build-plan`'s Step 7 (Revision Loop) converges and gates advance to Step 8. Mode `pre_ship_gate` runs before FO's UAT→shipped transition and gates advance to the terminal stage. AskUserQuestion is intentionally absent -- FO owns captain interaction and surfaces the gate verdict via its own session.

---

## Tools Available

**Can use:**
- `Read` -- entity file, Stage Reports, PLAN, Acceptance Criteria
- `Grep` -- search entity body for section markers and ratchet/verdict lines
- `Write` / `Edit` -- write `## Confidence Assessment` section to entity body only (no other files)
- `Bash` -- `git log` only, for verifying concurrent-writer state; never `git commit`

**NOT available:**
- `Agent` -- this is a leaf skill; no subagent dispatch
- `AskUserQuestion` -- FO owns captain interaction; this skill only writes the assessment
- `Skill` -- leaf skill; does not invoke other skills

---

## Input Contract

### Mode: plan_gate

**Required entity sections:**
- `## PLAN` (populated by `build-plan` Steps 1-5)
- `## Acceptance Criteria` (populated by `build-plan` UAT Spec phase)
- `## Validation Map` (populated by `build-plan` Step 4)
- `## Assumptions` (carried forward from clarify)

**Required context:**
- Plan-checker verdict = PASS (i.e., `build-plan` Step 7 Revision Loop converged)
- Entity `context_status` is post-plan-checker (plan stage, pre-advance)

**If any required section is absent:** return BLOCKED with `scope_gap` naming the missing section. Do NOT proceed with partial scoring.

### Mode: pre_ship_gate

**Required entity sections:**
- `## Stage Report: execute` (populated by `build-execute`)
- `## Stage Report: quality` (populated by `build-quality`)
- `## Stage Report: review` (populated by `build-review`, may be skipped-by-profile)
- `## Stage Report: uat` (populated by `build-uat`)
- `## PLAN` (for `<files_modified>` planned baseline)

**Required context:**
- UAT gate verdict = PASS (captain approval or single-entity auto-resolve)
- Next stage is terminal (shipped)

**If any required Stage Report is absent:** return BLOCKED. The review Stage Report may be legitimately absent when profile skips it; in that case factor 3 scores 100% (per §3 Factor 3 rule).

---

## Output Contract

Both modes emit a `## Confidence Assessment` section to the entity body with a uniform schema per D-110-1:

```markdown
## Confidence Assessment
Stage: plan|pre-ship
Iteration: N of 3
| Factor | Weight | Score | Evidence |
|--------|--------|-------|----------|
| ... | ... | ... | ... |
Composite: NN.NN%
Verdict: auto-advance | captain-gate | advance | auto-fix | block
```

**Mode plan_gate:**
- Uniform 20% weights per D-110-6; 5 factors per MEMORY `fo-confidence-autoadvance.md`.
- Verdict ∈ {`auto-advance`, `captain-gate`}.
- Threshold: composite > 95% → `auto-advance`; composite ≤ 95% → `captain-gate`.
- Iteration is always `1 of 1` (plan gate does not auto-fix; captain owns gate review).

**Mode pre_ship_gate:**
- Weights 25/20/20/20/15 per references/confidence-gate.md §3.
- Verdict ∈ {`advance`, `auto-fix`, `block`}.
- Threshold: composite >= 90% → `advance`; composite < 90% → `auto-fix` (up to 3 iterations); 3rd failure → `block` + captain escalate.

On auto-fix re-entry, a NEW `## Confidence Assessment` section is appended (do not overwrite prior iterations -- temporal history is valuable for audit).

---

## Step 1: Mode Routing

Parse the `mode:` argument passed by the caller. Two valid values:

- `mode: "plan_gate"` → route to Step 2 (Plan Gate Scoring).
- `mode: "pre_ship_gate"` → route to Step 3 (Pre-Ship Gate Scoring).

If `mode` is absent or any other value, return BLOCKED with `scope_gap: mode argument missing or unrecognized`. Do NOT default either direction.

Read the entity file via the `entity_path` argument. Verify required sections per the Input Contract for the selected mode before proceeding.

---

## Step 2: Plan Gate Scoring

Port MEMORY `fo-confidence-autoadvance.md` 5 factors with scoring rubric. All weights uniform 20% per D-110-6.

### Factor 1: context_completeness (weight: 20%)

**Data source:** Entity sections `## Assumptions`, `## Open Questions`, `## Options`.

**Scoring:** Score = (confirmed_count + answered_count + selected_count) / total_count × 100%.
- `confirmed_count`: Assumptions marked confirmed in clarify.
- `answered_count`: Open Questions with resolution.
- `selected_count`: Options with a selection.
- `total_count`: total across all three categories.

If total is 0 (no grey areas accumulated) → 100%.

### Factor 2: scope_clarity (weight: 20%)

**Data source:** `## PLAN` frontmatter or body, `## Goal Check`.

**Scoring rules (cumulative, start at 100%):**
- Scale explicitly stated (Small/Medium/Large): no deduction. Missing → -34%.
- `files_modified` file count bounded and within scale cap (Small ≤ 5, Medium ≤ 15, Large ≤ 40): no deduction. Unbounded or exceeds cap → -33%.
- Non-goals listed in Goal Check: no deduction. Missing non-goals section → -33%.

Min floor: 0%.

### Factor 3: risk_level (weight: 20%)

**Data source:** `## PLAN` body + `<files_modified>` block.

**Scoring:** Inverse risk. Start at 100%, deduct per detected risk signal:
- Schema changes (migrations, new tables, column drops) → -40%.
- Cross-domain touch (files_modified spans ≥ 3 distinct top-level dirs like `skills/`, `tools/`, `agents/`) → -25%.
- External dependency bump (package.json, pyproject.toml, Cargo.toml modification) → -20%.
- Destructive ops (rm -rf, force-push, drop table, delete branch) in task action blocks → -35%.

Min floor: 0%.

### Factor 4: precedent_strength (weight: 20%)

**Data source:** `## Research Findings > Existing Patterns` + `## Lens Evidence`.

**Scoring rules:**
- ≥ 1 primary citation (file:line) in `## Research Findings > Existing Patterns` → 100%.
- Lens (d) sibling-entity precedent cited (shipped entity in the same domain with the same pattern) → 100%.
- Only secondary citations (docs, external blog posts, inferred patterns) → 60%.
- No precedent cited → 0%.

### Factor 5: ac_testability (weight: 20%)

**Data source:** `## Acceptance Criteria` items.

**Scoring:** Score = (items_with_verify_command / total_items) × 100%.
- `verify_command`: a mechanical command (grep, test, wc, curl, bun test) in the AC body.
- Items phrased as "works", "looks good", "feels right" without a command → not counted.

If total_items = 0 → return BLOCKED (no AC == cannot gate).

### Composite and Verdict

`composite = mean(factor_1, factor_2, factor_3, factor_4, factor_5)` per D-110-6 uniform weights.

- `composite > 95%` → Verdict: `auto-advance`.
- `composite <= 95%` → Verdict: `captain-gate`.

Proceed to Step 4 (Write Assessment).

---

## Step 3: Pre-Ship Gate Scoring

Port verbatim from `references/confidence-gate.md` §§3-4 (preserved for D-110-5 faithful-port requirement).

### Factor 1: test_coverage (weight: 25%)

**Data source:** Quality Stage Report `### test` verdict + `### ratchet` `test_count` line.

**Scoring rules:**
- `test verdict=pass` AND `ratchet test_count=pass` → 100%.
- `test verdict=pass` AND `ratchet test_count=fail` → 60% (tests pass but regressed from baseline).
- `test verdict=fail` → 0% (hard failure).
- `ratchet` section absent or `test_count: skipped -- first run` → use `test verdict` alone: pass=80%, fail=0%.

### Factor 2: type_coverage (weight: 20%)

**Data source:** Quality Stage Report `### typecheck` verdict + `### ratchet` `type_coverage`, `ts_as_any`, `ts_ignore` lines.

**Scoring rules (cumulative, min 0%):**
- Start at 100%.
- `typecheck verdict=fail` → set to 0% (hard failure, exit early).
- `type_coverage=fail` → -50%.
- `ts_as_any=fail` → -25%.
- `ts_ignore=fail` → -25%.
- Any ratchet sub-item absent or `skipped -- first run` → treat as pass (no deduction).

### Factor 3: review_severity (weight: 20%)

**Data source:** Review Stage Report `### Findings` table.

**Scoring rules:**
- Count rows where `Severity = CRITICAL` → `c`.
- Count rows where `Severity = HIGH` → `h`.
- Score = max(0%, 100% - (c × 25%) - (h × 15%)).
- MEDIUM, LOW, NIT severity findings → informational only, no deduction.
- Empty findings table or missing `### Findings` section → 100%.
- `## Stage Report: review` absent (stage skipped via profile) → 0 CRITICAL, 0 HIGH → 100%.

### Factor 4: ac_completeness (weight: 20%)

**Data source:** UAT Stage Report `### summary` counts + `### captain decisions`.

**Scoring rules:**
- `skipped_with_ack` = items in `### captain decisions` with status `skipped` (per build-uat SKILL.md line 275, skipped-with-ack does NOT block advance).
- `effective_total = total_items - skipped_with_ack_count`.
- Score = (pass_count / effective_total) × 100%.
- If effective_total = 0 → 100%.
- UAT fail items remaining → verdict=fail upstream (gate does not run).

### Factor 5: integration_breadth (weight: 15%)

**Data source:** Execute Stage Report `### Per-task summary` + PLAN `<files_modified>` + wave assignments.

**Wave weights (per Q-1 resolution):**
- wave 0 → weight 2.0
- wave 1 → weight 1.5
- wave 2+ → weight 1.0

**Scoring rules:**
1. For each planned task, extract `<files_modified>` and wave.
2. `planned_weighted = Σ (file_count_per_task × wave_weight)`.
3. For each DONE task, count files from `({N} files)`.
4. `done_weighted = Σ (done_file_count × wave_weight)` for DONE tasks only.
5. Score = min(100%, done_weighted / planned_weighted × 100%).
6. BLOCKED tasks contribute 0.
7. If `planned_weighted = 0` → 100%.

### Composite Formula

```
composite = Σ (factor_score_i × factor_weight_i) / 100
```

Default weights: 25/20/20/20/15 = 100 total.

If `ops.config.json` has `confidence_weights` key with custom values, use those. If weights do not sum to 100, log warning, use defaults. Never cache across iterations. Never write weights from the gate.

### Threshold and Routing

- `composite >= 90%` → Verdict: `advance`. Proceed to Step 4 (write assessment), caller proceeds to Merge and Cleanup.
- `composite < 90%` → Verdict: `auto-fix`. Proceed to Step 4, then Step 5 (Auto-Fix Loop).

Proceed to Step 4.

---

## Step 4: Write ## Confidence Assessment Section

Use Edit (if section exists) or append via Write to add `## Confidence Assessment` to the entity body. Schema uniform across both modes per D-110-1:

```markdown
## Confidence Assessment
Stage: plan|pre-ship
Iteration: N of 3
| Factor | Weight | Score | Evidence |
|--------|--------|-------|----------|
| {factor_name} | {weight}% | {score}% | {evidence cite} |
| ... |
Composite: NN.NN%
Verdict: {auto-advance|captain-gate|advance|auto-fix|block}
```

Rules:
- `Stage:` is literally `plan` or `pre-ship` (never `plan_gate`/`pre_ship_gate` -- those are arg values).
- `Iteration: 1 of 1` for plan_gate (no auto-fix); `Iteration: N of 3` for pre_ship_gate.
- Evidence column: cite specific parsed values (counts, baselines, file names), not just "pass".
- On auto-fix re-entry (pre_ship_gate only), append a NEW `## Confidence Assessment` section; do NOT overwrite prior iterations.
- Merge hook reads the LAST occurrence of `## Confidence Assessment` for display.

Do NOT use em-dash characters. Use `--` (double dash) only.

---

## Step 5: Pre-Ship Auto-Fix Loop

(pre_ship_gate only; plan_gate skips to Step 6.)

Port verbatim from `references/confidence-gate.md` §7.

### 5a. Identify Lowest-Scoring Factor

Rank factors by `factor_score × factor_weight` (contribution). Lowest contribution is primary fix target. On tie, pick higher weight.

### 5b. Generate Fix Task

Generate a targeted fix task description:

```
Auto-fix iteration {N}: Address {factor_name} gap.

Current score: {factor_score}% (weight {weight}%) -- {gap} points below threshold.
Evidence: {parsed evidence that caused the deduction}

Fix task:
{specific fix instruction derived from the factor's deduction cause}
```

### 5c. Re-Enter Pipeline at Execute

1. Prepend fix task to a new `## Auto-Fix PLAN (iteration N)` section in the entity body.
2. Set entity `status: execute`.
3. Dispatch ensign with standard execute prompt, referencing the Auto-Fix PLAN section.
4. Entity flows execute → quality → review → UAT → confidence-gate normally.
5. On UAT re-entry: FO passes `skip_interactive_passed: true` flag. Previously-passed interactive items auto-pass; only automated items and new interactive items run fresh.

### 5d. Iteration Tracking

The `Iteration:` line in `## Confidence Assessment` tracks current attempt (1, 2, 3).

### 5e. 3-Iteration Cap

- **Iteration 1**: First auto-fix. If < 90% after → iteration 2.
- **Iteration 2**: Second auto-fix. If < 90% after → iteration 3.
- **Iteration 3**: Third auto-fix. If < 90% after → **escalate to captain. Do NOT retry.** Cap at 3 iterations.

Captain escalation message (iteration 3 failure):

```
Pre-ship confidence gate has failed 3 iterations without reaching 90%.

Per-factor breakdown:
  test_coverage:       {score}% (weight 25%) -- {evidence}
  type_coverage:       {score}% (weight 20%) -- {evidence}
  review_severity:     {score}% (weight 20%) -- {evidence}
  ac_completeness:     {score}% (weight 20%) -- {evidence}
  integration_breadth: {score}% (weight 15%) -- {evidence}

Composite: {score}% (threshold: 90%)

Options:
  1. Captain provides targeted fix instruction → additional iteration (overrides cap)
  2. Captain accepts entity at current score → advance to shipped with verdict: PARTIAL
  3. Captain rejects → archive with verdict: FAIL
```

The 3-iteration cap is hard. Escalate on 3rd failure without rationalization. Additional iterations only proceed on explicit captain override (option 1).

---

## Step 6: Return Verdict

Return to caller (build-plan for plan_gate, first-officer for pre_ship_gate):

```
{
  "composite": NN.NN,
  "verdict": "auto-advance|captain-gate|advance|auto-fix|block",
  "iteration": N,
  "stage": "plan|pre-ship"
}
```

Caller acts on verdict:

**plan_gate:**
- `auto-advance`: build-plan proceeds to Step 8 (knowledge capture) and Step 9 (commit + advance).
- `captain-gate`: build-plan writes `feedback-to: captain` in Stage Report, returns; FO routes captain interaction.

**pre_ship_gate:**
- `advance`: FO proceeds to Merge and Cleanup.
- `auto-fix`: FO invokes Step 5 auto-fix loop.
- `block` (iteration 3 failure): FO emits captain escalation message per §5e; awaits captain override.

---

## Rules

**No Exceptions. 3-Iteration Cap (pre_ship_gate):**
- Iteration 3 failure MUST escalate to captain. Never on any of these rationales:
  - "One more retry would probably fix it" -- no, the cap exists precisely to prevent indefinite drift.
  - "The score is 89.8%, effectively passing" -- no, 90% is the threshold; < 90% is auto-fix or block.
  - "Captain is busy, auto-override to PARTIAL" -- no, PARTIAL requires explicit captain acceptance per §5e option 2.

**No Exceptions. No Silent Force-Pass at plan_gate:**
- Every plan invocation MUST run the gate and write `## Confidence Assessment`. Never on any of these rationales:
  - "Plan looks trivially high-confidence, skip the gate" -- unconditional means unconditional; skipping re-creates the tribal-MEMORY failure mode entity 110 codifies away.
  - "Compute score inline without writing the assessment section" -- defeats the codification; audit trail requires the written section.
  - "Force verdict to auto-advance at 94% because the plan feels correct" -- captain-gate exists for precisely this judgment; do not pre-empt it.

**Weight Integrity:**
- plan_gate weights are uniform 20% × 5 per D-110-6. Never re-weight inline.
- pre_ship_gate weights default 25/20/20/20/15; may be overridden by `ops.config.json > confidence_weights`. Weights that do not sum to 100 → log warning, use defaults.

**Schema Integrity:**
- `## Confidence Assessment` MUST include `Stage: plan|pre-ship` literal (D-110-1). Never omit.
- Append new sections on auto-fix re-entry; never overwrite prior iterations.

---

## Red Flags -- STOP and escalate

- **Missing input sections**: Any required section from Input Contract absent → return BLOCKED with `scope_gap: {section}`. Do NOT partial-score.
- **Malformed Stage Reports**: Quality Stage Report missing `### test` or `### ratchet` subsections, or UAT Stage Report missing `### summary` counts → return BLOCKED with `parse_failure: {report}`. Do NOT guess values.
- **Skill() invocation contract mismatch**: `mode` argument absent or unrecognized → return BLOCKED with `scope_gap: mode`. Do NOT default either direction.
- **total_items = 0 in Factor 5 (plan_gate ac_testability)**: No AC items → BLOCKED. Cannot gate a plan with no verifiable criteria.
- **`ops.config.json` corrupt or unreadable in pre_ship_gate**: Log warning, fall back to default weights 25/20/20/20/15. Do NOT block.
