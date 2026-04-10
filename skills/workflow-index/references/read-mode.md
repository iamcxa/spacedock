# workflow-index — read mode

Read mode is idempotent and does not mutate state. It parses CONTRACTS.md or DECISIONS.md and returns structured results filtered by the caller's query.

## Inputs

```yaml
mode: read
target: contracts | decisions
query:
  file: {optional, relative path}
  entity: {optional, slug}
  include_superseded: {optional bool, default false}
  status_filter: {optional list, e.g. [in-flight, planned]}
```

## Query Semantics

- `file` and `entity` are optional filters and are not mutually exclusive.
- If both are provided: return entries matching **both** (intersection).
- If neither is provided: return all entries for the target.
- `status_filter` applies to CONTRACTS only: keep rows whose status is in the provided list.
- `include_superseded` applies to DECISIONS only: include superseded entries if `true`; default is `false`.

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

## Status Values by Target

Status values differ between the two targets:

| Target | Valid status values |
|--------|---------------------|
| CONTRACTS | `in-flight`, `planned`, `final`, `reverted` |
| DECISIONS | `active`, `superseded` |

Using a CONTRACTS status value (e.g. `final`) in a DECISIONS query (or vice versa) will return zero matches. Use `status_filter` only with the CONTRACTS target.

## Output Format

Return structured YAML to the caller.

CONTRACTS query result:

```yaml
matches:
  - entity: 046
    stage: shipped
    intent: Filter logic moved to client-side
    status: final
    file: tools/dashboard/static/app.js
count: 1
```

DECISIONS query result:

```yaml
# DECISIONS.md query result
matches:
  - id: D-046-1
    title: Filter UI is client-side
    source: entity 046, clarify stage, 2026-04-10
    scope: tools/dashboard/static/app.js
    rationale: Client-side filter keeps server load low
    status: active
    supersedes: none
count: 1
```

If no matches: `matches: []`, `count: 0`.

## Error Handling

- If target file doesn't exist: return `{matches: [], count: 0, error: "target file not found"}`.
- If query parameter is malformed: return `{error: "malformed query: {reason}"}`.
- Do not raise exceptions — always return a structured response.
