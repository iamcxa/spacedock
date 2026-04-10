# workflow-index — read mode

Read mode is idempotent and does not mutate state. It parses CONTRACTS.md, DECISIONS.md, or INDEX.md and returns structured results filtered by the caller's query.

## Inputs

```yaml
mode: read
target: contracts | decisions | index
query:
  file: {optional, relative path}
  entity: {optional, slug}
  include_superseded: {optional bool, default false}
  status_filter: {optional list, e.g. [in-flight, planned]}
```

## Process

### Query CONTRACTS.md by file

1. Read `docs/build-pipeline/_index/CONTRACTS.md`.
2. Find the `### {file}` subsection matching `query.file`.
3. Parse the table rows into `{entity, stage, intent, status}` dicts.
4. If `status_filter` provided, keep only matching entries.
5. Return results sorted by priority: in-flight > planned > final > reverted.

### Query CONTRACTS.md by entity

1. Scan all `### {file}` sections.
2. For each section, find rows where `entity` column matches `query.entity`.
3. Return a list of `{file, stage, intent, status}` entries for that entity.

### Query DECISIONS.md by file

1. Read `docs/build-pipeline/_index/DECISIONS.md`.
2. Parse each `## D-{slug}-{n}` block into a structured decision dict.
3. Keep decisions whose Scope field contains the query file path.
4. By default exclude entries with Status 🔴 superseded; include only if `include_superseded: true`.
5. Return list of matching decisions.

### Query DECISIONS.md by entity

1. Parse all decision blocks.
2. Keep decisions where Source entity equals `query.entity` OR Related entities list contains `query.entity`.
3. Apply same superseded filter as above.
4. Return list.

## Active Contracts Reference

The active contracts section in CONTRACTS.md lists all in-flight and planned file contracts. When querying by entity, scan every file section and collect all rows for that entity slug.

## Output Format

Return structured YAML to the caller:

```yaml
matches:
  - entity: 046
    stage: shipped
    intent: Filter logic moved to client-side
    status: final
    file: tools/dashboard/static/app.js
count: 1
```

If no matches: `matches: []`, `count: 0`.

## Error Handling

- If target file doesn't exist: return `{matches: [], count: 0, error: "target file not found"}`.
- If query parameter is malformed: return `{error: "malformed query: {reason}"}`.
- Do not raise exceptions — always return a structured response.
