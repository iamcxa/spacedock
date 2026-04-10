---
id: 046
title: Dashboard Entity List Context Status Filter
status: clarify
context_status: ready
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

**APPROACH**: Extend the dashboard entity list's existing filter bar (established by entity 009's stage chip filters) to support `context_status` filtering. Backend: add `context_status` query parameter to the entity list API endpoint, filter parsed frontmatter before returning results (⚠ contradicted: the dashboard view fetches `/api/workflows` not `/api/entities`; entity 009's filter is purely client-side on sessionStorage -- tools/dashboard/static/app.js:28-47,244-246 -- see Q-1). Frontend: add a filter chip group or dropdown for `context_status` values (`pending`, `exploring`, `awaiting-clarify`, `ready`) alongside the existing stage filters. Entities without `context_status` in frontmatter (pre-Phase-A legacy) treated as unfiltered / shown in all views (⚠ contradicted: AC item 2 says "hidden when any specific `context_status` filter is selected" -- see Q-2).

**ALTERNATIVE**: Client-side-only filtering -- fetch all entities, filter in JavaScript without API changes. -- D-01 rejected: inconsistent with the existing server-side filter pattern from entity 009, and won't scale as entity count grows. Also misses the opportunity to reduce payload size for large workflows. (⚠ contradicted: client-side filtering IS the existing pattern -- app.js:244-246 filters `wf.entities` in memory on a pre-fetched `/api/workflows` response; server-side filtering would be the novel approach -- see Q-1)

**GUARDRAILS**:
- Must not break existing entity list view or stage-based filters
- Must handle entities without `context_status` field (backward compatibility with pre-Phase-A entities)
- Follow existing dashboard filter bar CSS/JS patterns (detail.js IIFE pattern, CustomEvent bridge)
- No new runtime dependencies

**RATIONALE**: Entity 009 already proved the filter chip pattern works for stage filtering. Extending it to `context_status` follows the same UI pattern and API convention, keeping the dashboard internally consistent. Server-side filtering is the established approach and avoids client-side divergence. (⚠ contradicted: the "API convention" and "server-side is the established approach" claims are refuted by app.js:244-246 evidence -- 009 is client-side -- see Q-1)

## Acceptance Criteria

- Selecting `context_status: pending` in the filter bar shows only entities with `context_status: pending` in frontmatter (how to verify: E2E browser test -- click filter chip, assert visible entity count matches `grep -c 'context_status: pending'`)
- Entities without `context_status` field appear when no `context_status` filter is active, and are hidden when any specific `context_status` filter is selected (how to verify: create a legacy entity without the field, verify visibility toggles with filter)
- Multiple filters can be combined: stage filter + context_status filter (how to verify: select both stage=explore and context_status=exploring, verify intersection is correct)

## Assumptions

A-1: `context_status` is already accessible on the frontend entity object -- no backend plumbing required to expose the field.
Confidence: Confident
Evidence: tools/dashboard/src/parsing.ts:152-163 -- `scanEntities()` builds each Entity via `{...fields, slug, path, id, status, title, score, source, worktree}`; the `...fields` spread passes through every frontmatter key, including `context_status`.
→ Confirmed: captain, 2026-04-10 (batch)

A-2: Filter state will persist via sessionStorage using the existing `filterState` pattern, keyed per-workflow.
Confidence: Likely
Evidence: tools/dashboard/static/app.js:28-47 -- `filterState` loaded/saved as `sessionStorage.getItem("dashboardFilterState")`, with Set-to-Array serialization. Guardrail "no new runtime dependencies" + "follow existing dashboard filter bar patterns" further supports reuse.
→ Confirmed: captain, 2026-04-10 (batch)

A-3: Zero-filter default continues to hide archived and shipped entities; adding a `context_status` filter does not change this baseline.
Confidence: Likely
Evidence: tools/dashboard/static/app.js:244-246 -- when `filters.size === 0`, the entity table filters on `e.archived !== "true" && e.status !== "shipped"`. The `context_status` filter layers on top without altering the zero-filter default.
→ Confirmed: captain, 2026-04-10 (batch)

A-4: Combinational logic: within-dimension uses OR (any selected chip matches), across-dimension uses AND (stage × context_status intersection).
Confidence: Confident
Evidence: Acceptance Criteria item 3 explicitly requires "intersection" for cross-dimension combination. Within-dimension OR is the established stage chip pattern at app.js:245 (`filters.has(e.status)`).
→ Confirmed: captain, 2026-04-10 (batch)

## Option Comparisons

### Filter UI placement

The Brainstorming Spec says "filter chip group or dropdown alongside the existing stage filters", but the existing stage filter chips live **inside** each workflow card's pipeline graph / chip row (app.js:180-200) -- there is no global filter bar. "Alongside" admits multiple interpretations.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Second chip row per workflow card, directly below the existing stage chip row | Visual consistency with stage chips; per-workflow scoping matches current architecture; minimal DOM disruption | Doubles the chip row height per card; stage and context_status chips look visually identical, risk of user confusion | Low | Recommended |
| Dropdown (select element) next to the workflow card header | Space-efficient; clearly distinguishes dimension from stage chips; familiar UI pattern | Loses multi-select ergonomics (native select requires multi key-modifier); breaks from the chip-based filter style | Low | Viable |
| Global filter bar above all workflow cards | Filter applies across all workflows simultaneously; cleaner for multi-workflow views | Breaks per-workflow state model; requires reworking `filterState` keying; larger diff surface | Medium | Not recommended |
| Segmented control inside the pipeline graph SVG | Tightest visual integration with existing stage chips | Extends visualizer.js complexity; SVG layout math required; low flexibility for future filter dimensions | Medium | Not recommended |

→ Selected: Second chip row per workflow card, directly below the existing stage chip row (captain, 2026-04-10, interactive)

## Open Questions

Q-1: Should the `context_status` filter be implemented server-side (adding a query parameter to `/api/entities`) as the Brainstorming Spec proposes, or client-side (extending the existing `filterState` mechanism on the pre-fetched `/api/workflows` response) as entity 009's actual precedent dictates?
Domain: Behavioral / Callable
Why it matters: The spec's stated reason for rejecting client-side ("inconsistent with the existing server-side filter pattern from entity 009") is factually contradicted by the codebase -- entity 009's stage chip filter is purely client-side (app.js:244-246). Client-side is the existing pattern. Picking server-side now would introduce a second, inconsistent filter mechanism; picking client-side aligns with precedent and respects the "no new runtime dependencies" guardrail, but means the `/api/entities` endpoint's existing `FilterOptions` stays unchanged.
Suggested options: (a) Client-side, extending `filterState` and `wf.entities.filter()` in app.js -- matches existing 009 precedent, zero backend changes, (b) Server-side, adding `context_status` to `FilterOptions` + `/api/entities` -- matches spec's stated intent but introduces a new pattern and requires rewiring the frontend to call `/api/entities` instead of reading from `/api/workflows`, (c) Hybrid -- server-side support added to `/api/entities` for future tooling, but the dashboard view continues using client-side filtering for consistency with 009
→ Answer: Client-side filterState (captain, 2026-04-10, interactive)

Q-2: For entities without the `context_status` field (pre-Phase-A legacy), should they remain visible when any specific `context_status` filter is active, or be hidden?
Domain: User-facing Visual
Why it matters: The Brainstorming Spec and Acceptance Criteria directly contradict each other. Spec says "treated as unfiltered / shown in all views" (always visible, wildcard-match semantics). AC item 2 says "hidden when any specific `context_status` filter is selected" (missing field does not match any specific value). These are mutually exclusive. The resolution affects legacy entity discoverability and the semantic meaning of a "missing" context_status.
Suggested options: (a) Always visible (spec interpretation) -- legacy entities behave as wildcards, present in every filtered view regardless of selection, (b) Hidden when specific filter active (AC interpretation) -- missing field treated as "no value", invisible under any specific value filter, visible only in the unfiltered default view, (c) Dedicated "legacy / no context_status" chip -- legacy entities get their own explicit bucket so the Captain can opt in or out without special-casing the wildcard semantics
→ Answer: Always visible (spec interpretation) (captain, 2026-04-10, interactive). Note: AC item 2 currently says "hidden when any specific context_status filter is selected" which directly contradicts this answer -- plan/execute should treat this Q-2 resolution as authoritative and update AC item 2 before writing the E2E flow.

## Canonical References

(clarify stage will populate)

## Stage Report: explore

- [x] Files mapped: 7 across contract, backend, frontend
- [x] Assumptions formed: 4 (Confident: 2, Likely: 2, Unclear: 0)
- [x] Options surfaced: 1
- [x] Questions generated: 2
- [x] α markers resolved: 0 / 0
- [x] Scale assessment: confirmed

## Stage Report: clarify

- [x] Decomposition: not-applicable
- [x] Assumptions confirmed: 4 / 4 (0 corrected)
- [x] Options selected: 1 / 1
- [x] Questions answered: 2 / 2 (0 deferred)
- [x] Canonical refs added: 0
- [x] Context status: ready
- [x] Handoff mode: loose
- [x] Clarify duration: 4 captain interactions (1 batch + 1 option + 2 Qs), session complete
