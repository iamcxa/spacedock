# Context Lake Protocol

> How the build pipeline uses the context lake MCP tools for cross-stage knowledge transfer.

## Principles

| # | Principle | Rationale |
|---|-----------|-----------|
| 1 | **Lake = file-level knowledge cache** | Stage metadata belongs in the entity file. Lake stores file-level insights only. |
| 2 | **Search before work** | Every ensign searches relevant file paths before starting stage work. |
| 3 | **Store after learning** | Every ensign stores insights for files it deeply understood. |
| 4 | **Exact path first, FTS fallback** | `file_path` exact lookup has near-100% hit rate when insight exists. FTS for discovery only. |

## Key Format

**Actual repo-relative file paths only. No synthetic keys.**

```
domains/tenant/src/domain/decider.ts
apps/deno-api/src/routers/tenant-router.ts
packages/fmodel-support/src/fmodel-middleware.ts
```

Why no synthetic keys (e.g., `__pipeline__/{slug}/explore`):
- Entity file already carries stage reports — duplicating to lake adds no value
- Synthetic keys have zero cross-feature utility and get cold-evicted
- Project-wide patterns belong in MEMORY.md (permanent), not lake (ephemeral)

## Source Type Mapping

Uses the existing 4 source types. No MCP server changes needed.

| Pipeline Stage | Source Type | Priority | Behavior |
|---------------|------------|----------|----------|
| **explore** | `read` | 0 | Initial file scan. Overwritten by later stages. |
| **research** | `manual` | 3 | Verified facts override explore summaries. |
| **execute** | `manual` | 3 | Implementation decisions. Last-write-wins vs research. |
| **session handoff** | `handoff` | 2 | Human-initiated session transfer. |

Priority hierarchy: `manual(3) > handoff(2) > journal(1) > read(0)`. Higher priority sources are never overwritten by lower priority ones.

## Content Format

Lightweight `[tag]` convention. Content is read by LLMs, not parsed by code.

### Tag Vocabulary (5 tags)

| Tag | Meaning | Primary producer |
|-----|---------|-----------------|
| `[purpose]` | What this file does (one sentence) | explore |
| `[pattern]` | Key patterns and abstractions used | explore, research |
| `[gotcha]` | Non-obvious traps, known bugs, silent failures | explore, research |
| `[correction]` | Research-verified fix: assumed A, actually B | research |
| `[decision]` | Implementation choice and why | execute |

### Example Content

```
[purpose] Work-order saga — pure function mapping WorkOrderEvents to cross-domain commands.
[pattern] ReceptionCompleted dispatches CreateWorkOrderTask per pipeline workspace entry.
[gotcha] Template IDs from pipeline_snapshot are frozen at WO creation. Empty IDs trigger workspace-scoped fallback returning ALL templates.
[correction] Research: saga must return Command[] (pure), not Promise. Move async to ActionPublisher.
```

### FTS Query Examples

| Goal | Query |
|------|-------|
| Find all known gotchas | `"gotcha"` |
| Drizzle-related patterns | `"pattern" AND "drizzle"` |
| Research corrections | `"correction"` |
| Specific domain knowledge | `"work-order" AND "saga"` |

## When to Store

| Stage | What to Store | Source | Trigger |
|-------|-------------|--------|---------|
| **explore** | `[purpose]` + `[pattern]` + `[gotcha]` for each key file discovered | `read` | After reading and understanding each file |
| **research** | `[correction]` for corrected claims, `[pattern]` for verified patterns | `manual` | Per HIGH-confidence finding (overwrites explore's `read`) |
| **execute** | `[decision]` for non-obvious implementation choices | `manual` | After making a significant design/implementation choice |

### Explore Store Protocol

For each file in the explore results (typically 10-20 files per feature):

```
search_insights(file_path: "domains/tenant/src/domain/decider.ts", freshness_days: 30)
```

- **Hit (fresh, not stale)**: Read existing insight. Skip store unless new information found.
- **Hit (stale)**: Re-read file. Store updated insight.
- **Miss**: Read file. Store new insight.

### Research Store Protocol

For each HIGH-confidence finding:

```
store_insight(
  file_path: "domains/work-order/src/domain/work-order/work-order.saga.ts",
  content: "[correction] Saga must return Command[] synchronously. ...",
  source: "manual"
)
```

This overwrites the explore-stage `read` insight for the same file (priority 3 > 0).

### Execute Store Protocol

Only for files where a non-obvious choice was made:

```
store_insight(
  file_path: "apps/deno-api/src/routers/billing-router.ts",
  content: "[decision] Used empty-array check (events.length === 0) instead of event-kind check ...",
  source: "manual"
)
```

## When to Search

| Stage | Strategy | freshness_days |
|-------|---------|----------------|
| **explore** | `file_path` exact match per discovered file | 30 |
| **research** | `file_path` for claim-related files, `query` for pattern keywords | 30 |
| **plan** | `query` for "correction" + domain keywords | 30 |
| **execute** | `file_path` exact match per file before modifying | 30 |
| **quality** | No search — runs CLI commands | — |
| **seeding** | No search — follows seed conventions | — |
| **e2e** | No search — runs skills | — |
| **docs** | No search — reads implementation directly | — |
| **pr-draft** | No search — generates PR content | — |
| **pr-review** | No search — runs review agents | — |

**Default freshness: 30 days** (not the MCP default of 7). Pipeline insights have cross-feature value within the same development cycle.

### Search-Before-Work Pattern

Every ensign that uses the lake should start with:

```
# For known file paths (explore, execute):
for each file in assignment_file_list:
  search_insights(file_path: "{file}", freshness_days: 30)
  # If hit: incorporate into working knowledge
  # If miss: will store after reading

# For keyword discovery (plan):
search_insights(query: "correction", freshness_days: 30)
search_insights(query: "{domain_keywords}", freshness_days: 30)
```

## Invalidation

| Trigger | Action |
|---------|--------|
| Execute commits changes | `invalidate_stale(changed_files: [list of modified files])` |
| Feature merged to main | Cold eviction handles cleanup (30-day max age + 7-day idle) |
| Manual maintenance | `lake_status` triggers cold eviction on each call |

### Post-Execute Invalidation

After the execute stage commits, the ensign runs:

```bash
git diff --name-only HEAD~{N}..HEAD
```

Then:

```
invalidate_stale(changed_files: ["file1.ts", "file2.ts", ...])
```

This forces subsequent features to re-explore those files rather than relying on now-outdated insights.

## Metrics and Debugging

Check lake health:

```
lake_status()        # Total insights, stale count, cold eviction
get_metrics()        # Hit rate, store count, event breakdown
```

**Target hit rate: 40%+** (up from current 8%). Achieved by:
- Explore storing 10-20 insights per feature (volume)
- Using `file_path` exact match instead of FTS (precision)
- 30-day freshness window (retention)

If hit rate drops below 20%, investigate:
1. Are ensigns searching with exact paths? (Check for FTS-only queries)
2. Are explore ensigns storing? (Check store count vs feature count)
3. Are insights being cold-evicted too early? (Check eviction stats)
