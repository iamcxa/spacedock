# workflow-index — write mode

Write mode appends new entries to CONTRACTS.md, DECISIONS.md, or rebuilds INDEX.md. All writes preserve existing content; only the minimal region being modified is touched.

## Inputs

```yaml
mode: write
target: contracts | decisions | index
operation: append | update-status | update-status-bulk | supersede | rebuild
entry:
  # Fields vary by target, see below
```

## Operation: append to CONTRACTS.md

Used when an entity enters a new stage that touches files. Also used retroactively by the `workflow-index-maintainer` mod's idle hook Case B when an entity reaches an active/shipped stage without prior CONTRACTS tracking.

Input:
```yaml
entry:
  entity: 052
  stage: execute
  files:
    - tools/dashboard/static/ws-client.js
    - tools/dashboard/src/channel-provider.ts
  intent: WebSocket reconnection with exponential backoff
  status: in-flight
```

**`status` field**: accepts any valid CONTRACTS status (`in-flight`, `planned`, `final`, `reverted`). `in-flight` is the common case for execute-entry. `planned` is used when `build-plan` stage approves a plan but execute hasn't started. `final` is used for retroactive tracking of entities that have already shipped — see `mods/workflow-index-maintainer.md` Case B. Initial-state choice is the caller's responsibility; the skill does not reject any valid status value on append.

Process:
1. Read CONTRACTS.md.
2. For each file in entry.files:
   a. Check if `### {file}` section exists.
   b. If yes, Edit to append a new row to the table.
   c. If no, Edit to insert a new section alphabetically with a single-row table.
3. Commit: `chore(index): add contracts for entity-{slug} entering {stage}` (or `chore(index): retroactive contracts for entity-{slug} ({stage}, {N} files)` when called from Case B).

## Operation: update-status in CONTRACTS.md

Used when a **single-file** contract advances or retires. For multi-file shipping transitions that affect several contract rows for the same entity, use `update-status-bulk` instead — it produces one atomic commit per entity transition instead of N commits per file.

Input:
```yaml
entry:
  entity: 046
  file: tools/dashboard/static/app.js
  new_status: final  # or reverted
```

Process:
1. Read CONTRACTS.md.
2. Locate the row matching entity + file.
3. Edit just the Status cell with minimal old_string/new_string replacement.
4. If new_status is `final` and entity has been shipped > 30 days, move row to Recently Retired section.
5. Commit: `chore(index): mark contract for {entity}+{file} as {new_status}`

## Operation: update-status-bulk in CONTRACTS.md

Used when a single entity transition affects multiple contract rows at once — the typical case for an entity shipping or being reverted after touching several files during execute.

Input:
```yaml
entry:
  entity: 049
  files:
    - tools/dashboard/static/app.js
    - tools/dashboard/static/ws-client.js
    - tools/dashboard/src/ws-client.ts
    - tools/dashboard/src/channel-provider.ts
    - tools/dashboard/static/activity-feed.js
  new_status: final  # or reverted
```

Process:
1. Read CONTRACTS.md once.
2. For each file in `entry.files`:
   a. Locate the row matching `entity + file`.
   b. Edit just the Status cell with minimal old_string/new_string replacement (per-file Edit calls — multiple Edits within a single bulk operation is expected and correct; each still satisfies the minimal-edits rule).
   c. If `new_status` is `final` and the entity has been shipped > 30 days, move that row to the Recently Retired section (same age-out logic as single `update-status`).
3. **Atomicity**: if any Edit fails mid-loop, abort the whole operation and leave CONTRACTS.md as-is. Do NOT commit partial edits. The caller should retry after resolving the failure.
4. Commit ONCE at the end: `chore(index): advance entity-{slug} contracts to {new_status} ({N} files)`, where `{N}` is the count of files processed.

**When to use**:
- Entity shipping events that flip multiple contract rows from `in-flight` → `final`.
- Entity abandonment that flips multiple rows to `reverted`.
- Any multi-file stage transition driven by a single event (e.g., `workflow-index-maintainer` idle-hook sweep).

**When NOT to use**:
- Single-file updates — use the regular `update-status` operation.
- Cross-entity batch updates — each entity must be its own bulk call (commit scope is per-entity-transition, never mixed).
- Mixed `new_status` across files — all files in one call must transition to the same status.

## Operation: append to DECISIONS.md

Used when clarify stage captures a captain decision.

Input:
```yaml
entry:
  id: D-046-1
  title: Filter UI is client-side
  source_entity: 046
  source_stage: clarify
  source_date: 2026-04-10
  scope: [tools/dashboard/static/app.js]
  rationale: Client-side filter keeps server load low; user count too small
  related_entities: [046, 052, 059]
```

Process:
1. Read DECISIONS.md.
2. Find insertion point: end of file, before any trailing `---` separator.
3. Write the new decision block per `decisions-format.md` template.
4. Commit: `docs(decisions): capture D-{id} from {entity} {stage}`

## Operation: supersede in DECISIONS.md

Used when a new decision replaces an older one.

Input:
```yaml
entry:
  new_decision:
    # Full decision entry as above
    supersedes: D-046-1
```

Process:
1. Append the new decision (using append operation above).
2. Edit the old decision's Status field: `Status: 🟢 active` → `Status: 🔴 superseded by D-{new-id}`
3. Commit both changes together: `docs(decisions): supersede D-046-1 with D-{new-id}`

## Operation: rebuild INDEX.md

Used by workflow-index-maintainer mod on idle hook.

Input:
```yaml
operation: rebuild
target: index
```

Process:
1. Scan all `docs/build-pipeline/*.md` entity files.
2. Parse each entity's frontmatter for `id`, `title`, `status`.
3. Group by status.
4. Write `docs/build-pipeline/_index/INDEX.md` with structured tables.
5. Commit: `chore(index): rebuild INDEX.md`

## Rules

- **Minimal edits** — Use Edit with unique old_string/new_string matches. Never use Write to rewrite a whole file (except INDEX.md rebuild which is generated). "Minimal edits" applies per row, not per operation — `update-status-bulk` doing N per-row Edits within one operation is compliant.
- **Separate commits, never bundled with code** — Workflow-index writes always live in their own commit with a `chore(index):` or `docs(decisions):` prefix. Never bundle with feature code.
- **Commit granularity is per operation, not per file** — One invocation of a write operation produces exactly one commit. `update-status` (single-file) → one commit per file. `update-status-bulk` → one commit per entity transition covering all its files. `append` to CONTRACTS → one commit per entity stage entry covering all files in that stage. Pick the operation whose granularity matches the real-world event.
- **Idempotency for rebuild** — Running rebuild twice in a row should produce identical INDEX.md content.
- **Atomicity for supersede** — Both the new decision append AND the old decision status update must happen in the same commit.
- **Atomicity for bulk** — `update-status-bulk` is all-or-nothing. Partial edits must not be committed.
