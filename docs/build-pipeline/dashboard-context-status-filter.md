---
id: 046
title: Dashboard Entity List Context Status Filter
status: draft
context_status: pending
source: /build
created: 2026-04-09T22:15:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

> dashboard entity list 要支援按 context_status 篩選

## Captain Context Snapshot

- **Repo**: main @ 38fdc69
- **Session**: Previous session built Phase A of Spacebridge spec -- introduced `context_status` frontmatter field to entity schema
- **Domain**: User-facing Visual, Behavioral / Callable
- **Related entities**: 009 -- dashboard-entity-visibility (shipped, archived) -- added stage chips as clickable filters
- **Created**: 2026-04-09T22:15:00+08:00

## Brainstorming Spec

**APPROACH**: Extend the dashboard entity list's existing filter bar (established by entity 009's stage chip filters) to support `context_status` filtering. Backend: add `context_status` query parameter to the entity list API endpoint, filter parsed frontmatter before returning results. Frontend: add a filter chip group or dropdown for `context_status` values (`pending`, `exploring`, `awaiting-clarify`, `ready`) alongside the existing stage filters. Entities without `context_status` in frontmatter (pre-Phase-A legacy) treated as unfiltered / shown in all views.

**ALTERNATIVE**: Client-side-only filtering -- fetch all entities, filter in JavaScript without API changes. -- D-01 rejected: inconsistent with the existing server-side filter pattern from entity 009, and won't scale as entity count grows. Also misses the opportunity to reduce payload size for large workflows.

**GUARDRAILS**:
- Must not break existing entity list view or stage-based filters
- Must handle entities without `context_status` field (backward compatibility with pre-Phase-A entities)
- Follow existing dashboard filter bar CSS/JS patterns (detail.js IIFE pattern, CustomEvent bridge)
- No new runtime dependencies

**RATIONALE**: Entity 009 already proved the filter chip pattern works for stage filtering. Extending it to `context_status` follows the same UI pattern and API convention, keeping the dashboard internally consistent. Server-side filtering is the established approach and avoids client-side divergence.

## Acceptance Criteria

- Selecting `context_status: pending` in the filter bar shows only entities with `context_status: pending` in frontmatter (how to verify: E2E browser test -- click filter chip, assert visible entity count matches `grep -c 'context_status: pending'`)
- Entities without `context_status` field appear when no `context_status` filter is active, and are hidden when any specific `context_status` filter is selected (how to verify: create a legacy entity without the field, verify visibility toggles with filter)
- Multiple filters can be combined: stage filter + context_status filter (how to verify: select both stage=explore and context_status=exploring, verify intersection is correct)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
