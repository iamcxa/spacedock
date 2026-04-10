# knowledge-capture — capture mode

Capture mode runs inside a stage ensign's subagent context. Its job is to process findings, auto-append D1 patterns, and stage D2 candidates for later review. **It never interacts with the captain** — ensigns do not have access to native AskUserQuestion.

## Inputs

The caller (stage ensign) passes:

```yaml
mode: capture
findings: List[RawFinding]
source_stage: research | plan | execute | quality | review | uat
caller_context:
  entity_slug: {slug}
  entity_path: docs/build-pipeline/{slug}.md
  repo_path: /Users/kent/Project/spacedock
```

Each `RawFinding` is an unclassified observation from the caller ensign:

```yaml
- id: f-001
  summary: "Direct state mutation in React component"
  source_file: tools/dashboard/static/app.js
  source_line: 244
  detected_by: pr-review-toolkit:code-reviewer
  evidence: |
    // line 244-246: direct mutation
    state.filterActive = newValue;
    renderFilter();
```

## Process

### Step 1: Classify

For each finding, run `references/classifier.md` classification:
- Assign severity (CRITICAL..NIT)
- Assign root (CODE/DOC/NEW/PLAN)

### Step 2: D1 auto-append (all findings regardless of severity)

D1 targets skill-level reusable patterns. Even LOW severity findings can teach the plugin something.

For each classified finding:
1. Determine if it matches a D1 insight category (see classifier.md):
   - General review pattern discovered
   - New false-positive to ignore next time
   - New triage heuristic
   - Agent prompt improvement suggestion
2. If yes, format as a D1 entry and append to `{plugin}/reference/learned-patterns.md`:

```markdown
### [2026-04-11] spacedock — Direct mutation detection pattern

**Pattern**: React state mutation without setState wrapper detected via code-reviewer
**Applies to**: Any React-based dashboard project
**Action**: Add to pre-scan checks; walk changed files for state direct-write patterns
```

3. Briefly log to ensign output: "Appended pattern to learned-patterns.md: Direct mutation detection pattern"

**D1 writes are auto-append, no gate, no confirmation.** The plugin learning is low-risk and self-contained.

### Step 3: D2 gate evaluation

For each finding, run the severity gate (from `references/gates.md`):
- If fails severity gate → skip D2 for this finding
- If passes, run the three-question test
- If any of Q1/Q2/Q3 is NO → skip D2 for this finding

### Step 4: D2 candidate target selection

For each finding that passed both gates, run target selection (from `references/targets.md`):
- Determine level (plugin/user-global/project/module/lessons/decisions)
- Compute full target file path
- Compose proposed_edit text

### Step 5: Stage to entity body

Append or create `## Pending Knowledge Captures` section in the entity file. Each D2 candidate is a `<capture>` element:

```markdown
## Pending Knowledge Captures

<capture id="kc-1" severity="HIGH" root="NEW" target="/Users/kent/Project/spacedock/tools/dashboard/CLAUDE.md">
  <finding>
  Direct React state mutation detected at tools/dashboard/static/app.js:244.
  This violates React's concurrent update semantics and causes re-render drops.
  </finding>
  <proposed_edit>
  Append to tools/dashboard/CLAUDE.md § Frontend Patterns:

  "Never mutate React state directly in components. Use the functional
   setState pattern (setX(prev => ...)) or immutable helpers. Rationale:
   concurrent updates can drop direct mutations, causing flaky re-renders."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>046</source_entity>
  <source_file>tools/dashboard/static/app.js</source_file>
  <source_line>244</source_line>
  <detected_by>pr-review-toolkit:code-reviewer</detected_by>
</capture>
```

Use `Edit` tool to insert the section if it doesn't exist, or append new `<capture>` elements if the section already has entries. Never overwrite existing entries.

### Step 6: Return summary

Return to caller ensign:

```yaml
d1_written: 2
d2_pending: 1
skipped: 3
skipped_reasons:
  - "f-002: NIT severity"
  - "f-003: Q3 fail (vague rule)"
  - "f-004: duplicate of existing D1 pattern"
```

Caller records this in its Stage Report.

## Critical Invariants

- **NO AskUserQuestion calls in capture mode.** Capture runs in ensign subagent context. If capture-mode somehow calls AskUserQuestion, it will either fail or fall through to the Teammate tool — both indicate a design violation. FO handles captain interaction in apply mode, not capture mode.
- **D1 writes are the plugin's own reference files.** Never write D1 entries to the reviewed project's files. That would confuse the plugin-vs-project boundary.
- **D2 candidates are staged, never applied.** Capture mode must NOT write to CLAUDE.md or review-lessons.md directly. Those writes happen in apply mode, after captain approval.
- **Idempotency** — calling capture with the same findings twice should produce the same pending entries. Use finding IDs to detect duplicates and skip.

## Error Handling

- If entity file doesn't exist at `caller_context.entity_path`: return `{error: "entity not found"}` without writing anything.
- If classification fails for a finding: log the reason, skip that finding, continue with others.
- If D1 target file (`learned-patterns.md`) doesn't exist: create it with a header before appending.
