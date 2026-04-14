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

- **Repo**: main @ 83752a6
- **Session**: FO startup, captain diagnosed 054 UX gap (Notion-like selection missing)
- **Domain**: Pipeline/Process (build-pipeline workflow definition), Tooling
- **Related entities**: 054 -- Entity detail page (shipped, PR #48 open) -- the entity whose UX gap motivated this. 093 -- Comment UX polish (draft) -- the actual UX fix for 054. GSD `/gsd-ui-review` and `/gsd-ui-phase` skills -- prior art for UI audit methodology.
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
