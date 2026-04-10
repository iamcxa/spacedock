# workflow-index — check mode

Check mode implements Plan-Checker Dimension 7 (Cross-Entity Coherence). Given a proposed plan's `files_modified` list, it queries CONTRACTS.md and DECISIONS.md to find other entities that also touch those files or would be affected by contradictory decisions.

## Inputs

```yaml
mode: check
entity: {slug of entity being planned}
files_modified:
  - tools/dashboard/static/app.js
  - tools/dashboard/src/ws-client.ts
recent_threshold_days: 30  # optional, default 30
```

## Process

1. For each file in `files_modified`:
   a. Invoke read mode: `{mode: read, target: contracts, query: {file: <file>}}`
   b. Filter results excluding the current entity itself.

2. Classify each match:
   - **Status 🟡 in-flight** (another entity between plan and shipped) → **blocker**
     Rationale: merge conflict risk + stepping on another entity's work.
   - **Status 🔵 planned** (another entity has a plan but hasn't started execute) → **blocker**
     Rationale: two concurrent plans on same file means one must wait.
   - **Status 🟢 final**, shipped within `recent_threshold_days` → **warning**
     Rationale: reviewer should check the recent shipped entity's Stage Report for context (approach might have changed).
   - **Status 🟢 final**, shipped before threshold → **info only** (not included in blockers or warnings)
   - **Status 🔴 reverted** → **info only** with note "previously attempted but rolled back"

3. For each file, also query DECISIONS.md:
   a. Invoke read mode: `{mode: read, target: decisions, query: {file: <file>}}`
   b. For each active decision, check if the current entity's plan rationale contradicts it.
   c. Detection heuristic: scan the plan's rationale section for phrases opposing the decision's rationale (e.g., decision says "client-side filter" but plan says "move filter to server").
   d. If contradiction detected → **blocker** with message: "Plan contradicts D-{id} — supersede or revise".

## Output Format

```yaml
issues:
  - severity: blocker
    kind: in-flight-conflict
    file: tools/dashboard/static/app.js
    other_entity: 052
    other_stage: execute
    message: "Entity 052 is currently modifying this file (in-flight). Merge conflict risk. Resolve by coordinating with 052 or serializing execution."

  - severity: warning
    kind: recent-change
    file: tools/dashboard/src/ws-client.ts
    other_entity: 041
    shipped_date: 2026-04-05
    message: "Entity 041 recently modified this file. Check its Stage Report before proceeding; the file's conventions may have changed."

  - severity: blocker
    kind: decision-contradiction
    file: tools/dashboard/static/app.js
    decision_id: D-046-1
    message: "Plan rationale 'move filter to server-side' contradicts D-046-1 ('Filter UI is client-side'). Either supersede D-046-1 with a new captain-approved decision, or revise plan."

count_blockers: 2
count_warnings: 1
```

If no issues: return `{issues: [], count_blockers: 0, count_warnings: 0}`.

## Integration with Plan-Checker

This check is Dimension 7 in the plan-checker's 7-dimension run. The plan-checker subagent:

1. Reads the plan's `files_modified` across all tasks.
2. Invokes workflow-index check mode with the aggregated list.
3. Integrates returned issues into its overall issue list alongside other dimensions.
4. Reports to build-plan orchestrator for revision loop.

## Limitations

- Contradiction detection is heuristic; false positives possible. When in doubt, mark as warning with "possible contradiction" kind.
- Recent-change window is configurable but default 30 days balances catch rate vs noise.
- This check does not validate semantic correctness of the plan itself — only cross-entity coherence.
