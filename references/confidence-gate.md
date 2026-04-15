# Pre-Ship Confidence Gate

Reference document loaded by FO at the UAT→shipped transition. Implements a 5-factor composite quality score that must reach 90% before an entity advances to shipped.

## 1. Purpose

Intercepts FO's UAT→shipped advance to perform a holistic quality assessment. Entities 051 (75%) and 052 (70%) shipped with known gaps because FO advanced directly from UAT pass to shipped without scoring quality factors. This gate prevents that class of regression.

## 2. When It Fires

**Trigger condition:** After UAT gate passes (captain approval or single-entity auto-resolve) AND the next stage is terminal (shipped).

**Position in FO flow:** Between the UAT gate approval and the advance-to-shipped transition. See `references/first-officer-shared-core.md` "Pre-Ship Confidence Gate" subsection for the FO event loop integration point.

This gate does NOT run during non-terminal stage transitions or on entities that skip UAT.

## 3. 5-Factor Scoring Specification

Each factor is scored 0–100%. Weights are configurable in `ops.config.json` (see Section 6). Defaults shown.

---

### Factor 1: test_coverage (weight: 25%)

**Data source:** Quality Stage Report `### test` verdict + `### ratchet` `test_count` line.

**Parsing:**
```
## Stage Report: quality
...
### test
verdict: {pass|fail|skipped}
...
### ratchet
test_count: {pass|fail} (current={N} >= baseline={M})
```

**Scoring rules:**
- `test verdict=pass` AND `ratchet test_count=pass` → 100%
- `test verdict=pass` AND `ratchet test_count=fail` → 60% (tests pass but regressed from baseline)
- `test verdict=fail` → 0% (hard failure)
- `ratchet` section absent or `test_count: skipped -- first run` → use `test verdict` alone: pass=80%, fail=0%

**Parsing pattern:** `grep -A 2 "^### test" Stage_Report_quality` for verdict; `grep "test_count:" Stage_Report_quality` for ratchet line.

---

### Factor 2: type_coverage (weight: 20%)

**Data source:** Quality Stage Report `### typecheck` verdict + `### ratchet` `type_coverage`, `ts_as_any`, `ts_ignore` lines.

**Parsing:**
```
### typecheck
verdict: {pass|fail|skipped}
...
### ratchet
type_coverage: {pass|fail} (current={N}/{M} files covered)
ts_as_any: {pass|fail} (current={N} <= baseline={M})
ts_ignore: {pass|fail} (current={N} <= baseline={M})
```

**Scoring rules (applied cumulatively, min 0%):**
- Start at 100%
- `typecheck verdict=fail` → set to 0% (hard failure, exit early)
- `type_coverage=fail` → -50%
- `ts_as_any=fail` → -25%
- `ts_ignore=fail` → -25%
- Any ratchet sub-item absent or `skipped -- first run` → treat that sub-item as pass (no deduction)

**Parsing pattern:** `grep -A 2 "^### typecheck"` for verdict; `grep -E "type_coverage:|ts_as_any:|ts_ignore:"` for ratchet lines.

---

### Factor 3: review_severity (weight: 20%)

**Data source:** Review Stage Report `### Findings` table.

**Parsing:**
```
### Findings

| Severity | Root | File:Line | Description | Source |
|----------|------|-----------|-------------|--------|
| CRITICAL  | ...  | ...       | ...         | ...    |
| HIGH      | ...  | ...       | ...         | ...    |
| MEDIUM    | ...  | ...       | ...         | ...    |
```

**Scoring rules:**
- Count rows where `Severity = CRITICAL` → `c`
- Count rows where `Severity = HIGH` → `h`
- Score = max(0%, 100% - (c × 25%) - (h × 15%))
- MEDIUM, LOW, NIT severity findings → informational only, no score deduction
- Empty findings table or no `### Findings` section → 100%
- `## Stage Report: review` section entirely absent (stage skipped via profile) → treat as 0 CRITICAL, 0 HIGH → 100%

**Parsing pattern:** `grep -c "^| CRITICAL" Stage_Report_review` and `grep -c "^| HIGH" Stage_Report_review`.

---

### Factor 4: ac_completeness (weight: 20%)

**Data source:** UAT Stage Report `### summary` counts.

**Parsing:**
```
### summary
- total items: {n}
- pass: {n}
- fail: {n}
- skipped: {n}
```

**Scoring rules:**
- `skipped_with_ack` = items in `### captain decisions` with status `skipped` (per build-uat SKILL.md line 275, skipped-with-ack does NOT block advance)
- effective_total = total_items - skipped_with_ack_count
- Score = (pass_count / effective_total) × 100%
- If effective_total = 0 (all items skipped with ack) → 100%
- UAT fail items that remain after step 4 → verdict=fail (entity does not reach confidence gate; this factor only runs when verdict=pass)

**Parsing pattern:** `grep -E "^- (total items|pass|fail|skipped):" Stage_Report_uat` for counts; `grep "^- item-" Stage_Report_uat_captain_decisions` for skipped-with-ack entries.

---

### Factor 5: integration_breadth (weight: 15%)

**Data source:** Execute Stage Report `### Per-task summary` for DONE tasks' file counts + `## PLAN` `<files_modified>` lists with wave assignments.

**Parsing:**
```
### Per-task summary
- task-1: DONE (sonnet) -- commit {sha} ({N} files) -- {description}
- task-2: DONE (haiku) -- commit {sha} ({M} files) -- {description}
- task-3: BLOCKED -- {reason}
```

```xml
<task id="task-1" wave="0">
  <files_modified>
    - path/to/file-a.md
    - path/to/file-b.md
  </files_modified>
</task>
<task id="task-2" wave="1">
  <files_modified>
    - path/to/file-c.md
  </files_modified>
</task>
```

**Wave weights (per Q-1 resolution):**
- wave 0 → weight 2.0
- wave 1 → weight 1.5
- wave 2+ → weight 1.0

**Scoring rules:**
1. For each planned task, extract `<files_modified>` file list and wave assignment.
2. Compute planned_weighted = Σ (file_count_per_task × wave_weight_per_task)
3. For each DONE task in the execute Stage Report, count files from `({N} files)`.
4. Compute done_weighted = Σ (done_file_count_per_task × wave_weight_per_task) for DONE tasks only.
5. Score = min(100%, done_weighted / planned_weighted × 100%)
6. BLOCKED tasks contribute 0 to done_weighted.
7. If planned_weighted = 0 → 100% (no planned file changes; nothing to miss).

**Parsing pattern:** `grep "^- task-[0-9]:" Stage_Report_execute` for per-task DONE/BLOCKED and file counts; parse `<files_modified>` blocks from `## PLAN` section.

---

## 4. Composite Score Formula

```
composite = Σ (factor_score_i × factor_weight_i) / 100
```

Where `factor_weight_i` are the percentage weights (default: 25, 20, 20, 20, 15 = 100 total).

If `ops.config.json` has `confidence_weights` key with custom values, use those. The weights must sum to 100; if they do not, FO logs a warning and falls back to defaults.

**Example:**
```
test_coverage:      100% × 25% = 25.00
type_coverage:       95% × 20% = 19.00
review_severity:    100% × 20% = 20.00
ac_completeness:    100% × 20% = 20.00
integration_breadth: 90% × 15% = 13.50
                              ──────────
Composite:                     97.50%
```

## 5. Threshold and Routing

| Composite score | Action |
|-----------------|--------|
| >= 90%          | Advance to shipped (terminal). Proceed to Merge and Cleanup. |
| < 90%           | Enter auto-fix loop (see Section 7). |

The gate ALWAYS runs, even on the first pass. There is no bypass.

## 6. ops.config.json Weights

The gate reads `confidence_weights` from `ops.config.json` at the repo root. If the file or key is absent, defaults apply.

**Schema extension** (entity 087 adds this sibling key alongside `ratchet_baselines` from entity 083):

```json
{
  "ratchet_baselines": { "...": "..." },
  "confidence_weights": {
    "test_coverage": 25,
    "type_coverage": 20,
    "review_severity": 20,
    "ac_completeness": 20,
    "integration_breadth": 15
  }
}
```

**Rules:**
- Read on every gate invocation. Never cache across gate iterations.
- If `confidence_weights` absent → use defaults (25/20/20/20/15).
- If weights present but do not sum to 100 → log warning, use defaults.
- Never write weights from the gate. Weights are captain-configured only.

## 7. Auto-Fix Loop Specification

When composite < 90%, FO enters the auto-fix loop:

### 7a. Identify Lowest-Scoring Factor

Rank factors by `factor_score × factor_weight` (contribution). The factor with the lowest contribution is the primary fix target. If two factors tie, pick the one with higher weight.

### 7b. Generate Fix Task

FO generates a targeted fix task description:

```
Auto-fix iteration {N}: Address {factor_name} gap.

Current score: {factor_score}% (weight {weight}%) -- {gap} points below threshold.
Evidence: {parsed evidence that caused the deduction}

Fix task:
{specific fix instruction derived from the factor's deduction cause}

Example for type_coverage:
  "Resolve ts_as_any ratchet failure: current=7, baseline=5.
   Remove or type-annotate 2 `as any` casts in the files modified by this entity."
```

### 7c. Re-Enter Pipeline at Execute

1. Prepend the fix task to a new `## Auto-Fix PLAN (iteration N)` section in the entity body.
2. Set entity `status: execute`.
3. Dispatch ensign with the standard execute prompt, referencing the Auto-Fix PLAN section.
4. Entity flows through execute → quality → review → UAT → confidence normally.
5. On UAT re-entry: FO passes `skip_interactive_passed: true` flag (see `skills/build-uat/SKILL.md` Inputs From Orchestrator). Previously-passed interactive items are auto-passed; only automated items and new interactive items from the fix task run fresh.

### 7d. Iteration Tracking

FO maintains `## Confidence Assessment` in the entity body. The `Iteration:` line tracks the current attempt.

### 7e. 3-Iteration Cap

- **Iteration 1**: First auto-fix attempt. If < 90% after, proceed to iteration 2.
- **Iteration 2**: Second auto-fix attempt. If < 90% after, proceed to iteration 3.
- **Iteration 3**: Third auto-fix attempt. If < 90% after: **escalate to captain. Do NOT retry.**

**Captain escalation message (iteration 3 failure):**
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
  1. Captain provides a targeted fix instruction → FO dispatches additional iteration (overrides cap)
  2. Captain accepts the entity at current score → FO advances to shipped with `verdict: PARTIAL`
  3. Captain rejects → entity archived with `verdict: FAIL`
```

The 3-iteration cap is hard. FO must escalate on the 3rd failure without rationalization. Additional iterations only proceed on explicit captain override (option 1 above).

## 8. Confidence Assessment Entity Body Section

Written by FO after scoring, before advancing to shipped or entering auto-fix loop. Format:

```markdown
## Confidence Assessment

| Factor | Weight | Score | Evidence |
|--------|--------|-------|----------|
| test_coverage | 25% | 100% | quality ### test pass, 342 tests, ratchet pass (342 >= 340) |
| type_coverage | 20% | 95% | typecheck pass, ts_as_any pass (5 <= 5), type_coverage pass (47/47) |
| review_severity | 20% | 100% | 0 CRITICAL, 0 HIGH findings |
| ac_completeness | 20% | 100% | 6/6 UAT items pass (0 skipped-with-ack) |
| integration_breadth | 15% | 90% | 9/10 planned files modified (wave-weighted: 13.5/15.0) |

**Composite**: 97.5% (threshold: 90%)
**Verdict**: PASS -- advancing to shipped
**Iteration**: 1 of 3
```

**Rules:**
- Write this section immediately after computing the score, before any routing decision.
- On auto-fix re-entry, a new `## Confidence Assessment` section is appended (do NOT overwrite prior one -- temporal history is valuable).
- The merge hook reads the LAST occurrence of `## Confidence Assessment` for display.
- Evidence column: cite the specific parsed values that produced the score (not just "pass" -- include counts, baselines, file names where available).

## 9. UAT Re-Run on Auto-Fix Iteration

Per Q-2 resolution: **automated-only re-run** on fix iteration.

- **Auto-passed**: Interactive items whose prior `## UAT Results` row had `status: pass` with captain sign-off. These do NOT require captain re-interaction.
- **Fresh run**: All automated items (browser, CLI, API) re-run to verify the fix did not introduce regressions.
- **Fresh interaction**: Any NEW interactive items introduced by the fix task, and any previously-failed interactive items.
- **FO flag**: `skip_interactive_passed: true` passed in the dispatch prompt on re-entry.
- **Result format**: New rows appended to `## UAT Results` below prior rows (per build-uat SKILL.md skip-only mode preservation rule).

This is the least disruptive re-run strategy: automated verification is always fresh, captain only reviews genuinely new or changed items.

## 10. Merge Hook Confidence Display (AC-5, AC-6)

At merge hook time (entity reaching terminal stage), FO reads `## Confidence Assessment` from the entity body and displays it to the captain BEFORE invoking `kc-pr-create`.

**Display format:**
```
Pre-ship confidence summary for {entity title}:

| Factor | Weight | Score | Evidence |
|--------|--------|-------|----------|
| ... (table rows from ## Confidence Assessment) |

Composite: {score}% ({PASS|FAIL} at 90% threshold)
```

**Routing:**
- Composite >= 90%: Display summary, proceed to step 2 (PR creation via `kc-pr-create`).
- Composite < 90%: **BLOCK PR creation.** Report to captain:
  ```
  Confidence {score}% is below 90% threshold. This entity did not pass the pre-ship
  confidence gate and should not have reached the merge hook. Lowest-scoring factors:
  {list factors below weighted contribution average}.
  Route to auto-fix loop? (yes/no)
  ```
  Do NOT invoke `kc-pr-create` until composite >= 90% or captain explicitly overrides.

**Legacy entities** (pre-087, no `## Confidence Assessment` section): Display warning "No confidence assessment found -- pre-087 entity, skipping confidence display." Proceed to PR creation without blocking.

**Persistence:** The confidence assessment persists in the entity body from gate time to merge hook time. FO does not re-compute the score at merge time -- it reads the stored result. This handles the timing gap between gate (before shipped advance) and merge hook (after terminal stage reached).

## See Also

**Note on `alignment_confidence`**: This field is computed by `skills/build-alignment-gate/SKILL.md` (first-class pipeline stage as of entity 114) and surfaced on `## Stage Report: brainstorm` for backward-compatibility. It is NOT currently a confidence-gate factor in the 5-factor composite. Future factor expansion can source it from the alignment-gate Stage Report.
