# workflow-index — check mode

Check mode implements Plan-Checker Dimension 7 (Cross-Entity Coherence). Given a proposed plan's `files_modified` list and a plan rationale, it queries CONTRACTS.md and DECISIONS.md to find other entities that also touch those files or would be affected by contradictory decisions.

## Inputs

```yaml
mode: check
entity: {slug of entity being planned}
files_modified:
  - tools/dashboard/static/app.js
  - tools/dashboard/src/ws-client.ts
plan_rationale: |
  Brief free-text summary of what the plan intends to change and why. Used for
  contradiction detection against active DECISIONS.md entries. Plan-checker
  passes the plan's top-level rationale section or a condensed summary.
recent_threshold_days: 30  # optional, default 30
```

## Process

### Step 1 — Query CONTRACTS.md per file

For each file in `files_modified`:

1. Invoke read mode: `{mode: read, target: contracts, query: {file: <file>}}`
2. **Exclude the current entity**: drop any row whose `entity` field equals the `input.entity` slug (we never conflict with ourselves).

### Step 2 — Classify CONTRACTS matches

Each remaining match has a status from the CONTRACTS schema. Map to output severity and kind:

| Match status | Age check | Severity | Output kind | Included in issues? |
|--------------|-----------|----------|-------------|---------------------|
| 🟡 in-flight | — | blocker | `in-flight-conflict` | Yes |
| 🔵 planned | — | blocker | `planned-conflict` | Yes |
| 🟢 final | `last_updated` within `recent_threshold_days` of today | warning | `recent-change` | Yes |
| 🟢 final | `last_updated` older than `recent_threshold_days` | — | — | No (silently skipped) |
| 🔴 reverted | — | — | — | No (silently skipped) |

Age check uses the `last_updated` field returned by read-mode (see `read-mode.md` and `contracts-format.md`). Parse as `YYYY-MM-DD`, compare to today's date, measure days elapsed.

Classification rationale:
- **in-flight-conflict**: another entity is actively modifying this file between plan and shipped. Merge conflict risk + stepping on work.
- **planned-conflict**: another entity has a plan for this file but execute hasn't started. Two concurrent plans means one must wait.
- **recent-change**: a recent shipped entity modified this file. The file's conventions or structure may have changed; reviewer should check the Stage Report before proceeding.

### Step 3 — Query DECISIONS.md per file

For each file in `files_modified`:

1. Invoke read mode: `{mode: read, target: decisions, query: {file: <file>}}`
2. For each returned active decision (status `active`):
   a. Compare `plan_rationale` against the decision's `rationale` field.
   b. Run the contradiction detection heuristic (see below).
   c. If contradiction detected → emit blocker with `kind: decision-contradiction`, include the decision id and both rationales in the message.

### Contradiction Detection Heuristic

Implementation guidance for `plan_rationale` vs decision `rationale`:

- Use case-insensitive substring matching between the two rationales.
- Look for explicit opposing keyword pairs: `server`/`client`, `enable`/`disable`, `add`/`remove`, `synchronous`/`asynchronous`, `centralized`/`distributed`, etc. If the plan mentions one side and the decision mentions the opposite, flag it.
- Look for "move X to Y" patterns where Y contradicts the decision's stated location or approach.
- If uncertain (partial match, ambiguous wording), classify as `kind: possible-contradiction` with severity `warning` instead of `blocker`.
- When in doubt, warn rather than block — captain can override.

This heuristic will produce false positives. The Limitations section below describes how the plan-checker should handle noise.

## Output Format

```yaml
issues:
  - severity: blocker
    kind: in-flight-conflict
    file: tools/dashboard/static/app.js
    other_entity: 052
    other_stage: execute
    message: "Entity 052 is currently modifying this file (in-flight). Merge conflict risk. Resolve by coordinating with 052 or serializing execution."

  - severity: blocker
    kind: planned-conflict
    file: tools/dashboard/static/app.js
    other_entity: 059
    other_stage: plan
    message: "Entity 059 has a plan that will touch this file but execute hasn't started. One plan must wait."

  - severity: warning
    kind: recent-change
    file: tools/dashboard/src/ws-client.ts
    other_entity: 041
    last_updated: 2026-04-05
    message: "Entity 041 recently modified this file (5 days ago). Check its Stage Report before proceeding; the file's conventions may have changed."

  - severity: blocker
    kind: decision-contradiction
    file: tools/dashboard/static/app.js
    decision_id: D-046-1
    plan_excerpt: "move filter to server-side"
    decision_excerpt: "Client-side filter keeps server load low"
    message: "Plan rationale contradicts D-046-1. Either supersede D-046-1 with a new captain-approved decision, or revise plan."

  - severity: warning
    kind: possible-contradiction
    file: tools/dashboard/src/ws-client.ts
    decision_id: D-041-2
    plan_excerpt: "simplify reconnect flow"
    decision_excerpt: "Use exponential backoff on reconnect"
    message: "Plan rationale may contradict D-041-2 (ambiguous match). Captain should review."

count_blockers: 3
count_warnings: 2
```

If no issues: return `{issues: [], count_blockers: 0, count_warnings: 0}`.

### Kind Reference

All output kinds and their meaning:

| kind | Severity | Triggered by |
|------|----------|--------------|
| `in-flight-conflict` | blocker | CONTRACTS row with status 🟡 in-flight |
| `planned-conflict` | blocker | CONTRACTS row with status 🔵 planned |
| `recent-change` | warning | CONTRACTS row with status 🟢 final, within threshold |
| `decision-contradiction` | blocker | DECISIONS active decision whose rationale clearly opposes plan_rationale |
| `possible-contradiction` | warning | DECISIONS active decision with ambiguous contradiction (low-confidence match) |

No kind is emitted for 🟢 final (old) or 🔴 reverted CONTRACTS rows. Those are silently excluded from the issues list.

## Integration with Plan-Checker

This check is Dimension 7 in the plan-checker's 7-dimension run. The plan-checker subagent:

1. Reads the plan's `files_modified` across all tasks (aggregate, deduplicate).
2. Extracts `plan_rationale` from the plan document (typically the top-level "Goal" or "Rationale" section).
3. Invokes workflow-index check mode with the aggregated list and rationale.
4. Integrates returned issues into its overall issue list alongside other dimensions.
5. Reports to build-plan orchestrator for revision loop.

## Limitations

- **Contradiction detection is heuristic.** False positives are expected. Plan-checker should present `possible-contradiction` warnings as advisory — captain decides whether the match is real.
- **Recent-change window is configurable** but default 30 days balances catch rate vs noise. Longer windows catch more context drift but produce more warnings on long-lived files.
- **This check does not validate semantic correctness of the plan itself** — only cross-entity coherence. Plan-checker dimensions 1-6 handle plan-internal correctness.
- **Age calculation uses file mtime of the check-mode invocation.** If CONTRACTS.md's `last_updated` was not refreshed on entity advance (write-mode bug), recent-change classification will be incorrect. Rely on write-mode's discipline.

## Error Handling

- If read-mode returns error (CONTRACTS.md or DECISIONS.md missing): treat as empty result set for that query; continue processing other files. Log warning to caller but do not fail the whole check.
- If `plan_rationale` is empty or missing: skip DECISIONS contradiction detection (no rationale to compare against). Still run CONTRACTS checks.
- If `last_updated` field is missing from a CONTRACTS row (legacy data): treat the row as "old final" (exclude from recent-change classification). Do not fail.
