---
id: 095
title: "Pipeline UI review stage -- visual parity audit before ship"
status: draft
context_status: pending
source: captain (2026-04-14 -- entity 054 UX gap diagnosis)
created: 2026-04-14T18:00:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
---

## Directive

> Add a UI review/audit stage to the build pipeline that catches visual and interaction parity gaps before shipping. Entity 054 shipped with a UX gap: the old dashboard had Notion-like text-selection commenting (highlight text -> comment popover -> anchored thread), but 054's SO pipeline (explore/clarify) only captured the data model and API patterns, missing the interaction pattern entirely. The explore stage is biased toward code structure (data model, API, domain layers) and doesn't systematically check existing UI interaction patterns for parity.
>
> This entity adds a `ui-review` stage (or integrates UI audit into an existing stage) that verifies: (1) visual parity with existing UI when doing replacement work, (2) UI spec compliance (component hierarchy, layout, interactions match the ## UI Spec produced in clarify), (3) interaction pattern coverage (hover, selection, keyboard, responsive). Inspired by GSD's `/gsd-ui-review` 6-pillar audit approach.
>
> Root cause from 054: pipeline explore focused on schema/API/domain layers. The `## UI Spec` in clarify captured component hierarchy but not interaction parity with the old dashboard. No stage verified "does the shipped UI actually match the spec and the old UI's behavior?" before reaching UAT.

## Captain Context Snapshot

- **Repo**: main @ 5b5884c
- **Session**: SO pipeline batch session, 094 just completed clarify. Captain diagnosed 054 UX gap (Notion-like selection missing).
- **Domain**: Runnable/Invokable (pipeline stages, skill dispatch), Readable/Textual (reference docs, gray-area templates, skill specs)
- **Related entities**: 054 -- Entity detail page (shipped, PR #48) -- the entity whose UX gap motivated this; 093 -- Comment UX polish (clarify, ready) -- the actual UX fix for 054; 074 -- Pipeline verification quality uplift (draft) -- related pipeline improvement; GSD `gsd-ui-auditor` agent -- prior art for 6-pillar UI audit methodology
- **Created**: 2026-04-14T18:00:00+08:00

## Notes

### Process Gap Analysis (054)

054's SO pipeline produced a `## UI Spec` section during clarify with:
- Component hierarchy (correct)
- Layout pattern (correct)
- Key interactions (listed click/reply/resolve -- but missed text-selection anchoring from old dashboard)
- Empty/loading/error states (correct)

The gap: explore checked `schema.ts` columns (`selected_text`, `section_heading`) and discussed anchoring strategy (O-3), but never asked "what does the current UI interaction look like for this feature?" Explore is code-biased -- it greps files, reads schemas, maps layers. It doesn't open the old UI and compare interaction patterns.

### Possible Stage Positions

1. **After execute, before quality** -- `ui-review` as a new stage with `feedback-to: execute`
2. **Integrated into UAT** -- add a "UI spec compliance" check to the UAT spec template
3. **Integrated into review** -- add a "UI parity" reviewer theme alongside security/correctness/style
4. **During explore** -- add "interaction parity checklist" to explore skill's gray area generation

Captain to decide positioning during brainstorm/clarify.

## Brainstorming Spec

**APPROACH**: Enhance the existing build pipeline with two complementary UI audit touchpoints -- no new pipeline stage needed. (1) **Explore enhancement**: Add a "UI Interaction Parity" section to `skills/build-explore/references/gray-area-templates.md` under the "User-facing Visual" domain. When an entity replaces or modifies an existing UI feature, explore should check: (a) current interaction patterns in the old UI via codebase inspection (event listeners, CSS hover/selection rules, keyboard handlers), (b) whether the `## UI Spec` section captures all discovered interaction patterns, (c) responsive behavior parity. This addresses the root cause -- explore's code bias toward data model/API layers. (2) **Review stage enhancement**: Add a "UI parity" check to `skills/build-review/SKILL.md`'s pre-scan phase. When the entity has `intent: feature` and touches frontend files (`components/`, `app/`), the pre-scan includes: compare the execute diff against the `## UI Spec` and flag interaction patterns present in modified/replaced files but absent from the new implementation. This is a backstop -- if explore missed something, review catches it before UAT. The existing review stage's themed reviewer mechanism (security/correctness/style) already supports conditional activation.

**ALTERNATIVE**: Add `ui-review` as a new standalone pipeline stage between execute and quality with `feedback-to: execute`, using GSD's `gsd-ui-auditor` 6-pillar methodology (layout, hierarchy, interactions, states, responsiveness, accessibility) as the stage skill. -- D-01 Rejected: most entities have no UI. A new stage adds dispatch overhead for every entity even when not applicable. The review stage already has a themed reviewer mechanism that can conditionally activate for UI entities. A standalone stage is warranted only if UI review requires browser automation or screenshot comparison, which this entity does not propose. The GSD 6-pillar approach is better adapted as a reference checklist within existing stages than as a separate stage.

**GUARDRAILS**:
- No new pipeline stages in README.md `stages.states` -- enhance existing explore + review stages only
- UI parity checks only activate for entities with `User-facing Visual` domain AND touching frontend files -- conditional, not universal
- Must work within review stage's existing debate-driven dispatch pattern (pre-scan phase, not a new reviewer team)
- GSD's 6-pillar methodology (layout, hierarchy, interactions, states, responsiveness, accessibility) as reference checklist, adapted to spacedock's Stage Report format
- Preserve explore's non-interactive constraint -- UI interaction discovery happens via codebase reads (event listeners, CSS rules), not by opening a browser

**RATIONALE**: The 054 gap was an explore-level blind spot: code-focused exploration missed UI interaction patterns that existed in the old dashboard. A new pipeline stage would be the wrong abstraction -- the issue isn't "no verification exists" but "existing verification doesn't cover UI patterns." Enhancing explore's gray-area templates catches the gap proactively (before plan), while adding a review pre-scan check provides a retroactive safety net (after execute). This dual-layer approach is consistent with the pipeline's existing design: explore generates questions, review verifies implementation. The review integration uses the pre-scan phase (not a full themed reviewer) to keep overhead minimal for UI-touching entities and zero for non-UI entities.

## Acceptance Criteria

- Given an entity with `User-facing Visual` domain that replaces or modifies an existing UI feature, when build-explore runs, then the gray-area-templates produce at least one UI interaction parity gray area checking old vs new interaction patterns (how to verify: grep gray-area-templates.md for "interaction parity" section; run explore on a test entity replacing a UI component, assert A-n or Q-n with interaction parity topic exists)
- Given an entity touching `components/` or `app/` files and having a `## UI Spec` section, when build-review pre-scan runs, then the scan includes a UI parity check comparing the diff against the spec (how to verify: run review on a test entity with UI spec, assert "UI parity" check line in Stage Report pre-scan section)
- Given an entity with no frontend files (pure backend/pipeline/skill), when build-explore and build-review run, then no UI parity checks are triggered (how to verify: run explore+review on a non-UI entity, assert no UI parity questions or findings)
- Given the UI parity check in review finds a missing interaction pattern (e.g., hover state in old UI absent from new), when the finding is classified, then it is rated as at minimum a MEDIUM finding with `feedback-to: execute` routing (how to verify: review Stage Report shows finding with MEDIUM+ severity and feedback routing)

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
