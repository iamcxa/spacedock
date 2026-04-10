# workflow-index — write mode

Write mode appends new entries to CONTRACTS.md, DECISIONS.md, or rebuilds INDEX.md. All writes preserve existing content; only the minimal region being modified is touched.

## Inputs

```yaml
mode: write
target: contracts | decisions | index
operation: append | update-status | supersede | rebuild
entry:
  # Fields vary by target, see below
```

## Operation: append to CONTRACTS.md

Used when an entity enters a new stage that touches files.

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

Process:
1. Read CONTRACTS.md.
2. For each file in entry.files:
   a. Check if `### {file}` section exists.
   b. If yes, Edit to append a new row to the table.
   c. If no, Edit to insert a new section alphabetically with a single-row table.
3. Commit: `chore(index): add contracts for entity-{slug} entering {stage}`

## Operation: update-status in CONTRACTS.md

Used when an entity advances to shipped or the contract retires.

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

- **Minimal edits** — Use Edit with unique old_string/new_string matches. Never use Write to rewrite a whole file (except INDEX.md rebuild which is generated).
- **Separate commits** — Each write operation is its own commit. Never bundle with feature code.
- **Idempotency for rebuild** — Running rebuild twice in a row should produce identical INDEX.md content.
- **Atomicity for supersede** — Both the new decision append AND the old decision status update must happen in the same commit.
