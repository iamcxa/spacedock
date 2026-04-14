---
id: 095
title: "Pipeline UI review stage -- visual parity audit before ship"
status: clarify
context_status: ready
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

## Assumptions

A-1: UI Interaction Parity added as a new row in the `## 1. User-facing Visual` table of `gray-area-templates.md`. Format matches existing 5 rows: `| Gray Area | What to Assess | Example |`.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-explore/references/gray-area-templates.md:23-29` -- existing table has 5 rows with consistent 3-column format
→ Confirmed: captain, 2026-04-15 (batch)

A-2: Review pre-scan UI parity check is Step 1f, placed after existing checks 1a-1e. Each check is a markdown subsection (`### 1f -- UI Spec Parity`). The check reads `## UI Spec` from the entity body and compares against interaction patterns in the diff's frontend files.
Confidence: 🟢 Confident (0.90)
Evidence: `skills/build-review/SKILL.md:139-182` -- pre-scan has 5 checks (1a-1e), each as a `### 1{letter}` subsection; adding 1f follows established pattern
→ Confirmed: captain, 2026-04-15 (batch)

A-3: Pre-scan activation is conditional: only runs when (a) the diff touches frontend files (`*.tsx`, `*.jsx`, `*.css`, or paths containing `components/`, `app/`) AND (b) the entity body contains a `## UI Spec` section. Non-UI entities skip entirely (zero overhead).
Confidence: 🟢 Confident (0.90)
Evidence: `skills/build-review/SKILL.md:157-161` -- Step 1d (Plan Consistency) already conditionally reads `## PLAN` section; same conditional pattern applies
→ Confirmed: captain, 2026-04-15 (batch)

A-4: No changes to `docs/build-pipeline/README.md` stage definitions. This entity modifies skill reference docs only.
Confidence: 🟢 Confident (0.95)
Evidence: GUARDRAILS explicitly state "No new pipeline stages in README.md stages.states -- enhance existing explore + review stages only"
→ Confirmed: captain, 2026-04-15 (batch)

A-5: Pre-scan UI parity findings use the existing severity/classification schema: MEDIUM severity, root CODE, source `pre-scan:ui-parity`, routing `feedback-to: execute`.
Confidence: 🟢 Confident (0.85)
Evidence: `skills/build-review/SKILL.md:168-178` -- Step 1e uses severity HIGH/CRITICAL, root CODE, source `pre-scan:goal-backward`; UI parity follows same schema at MEDIUM severity (interaction gap is less severe than orphan code)
→ Confirmed: captain, 2026-04-15 (batch)

A-6: Step 1f is the correct numbering claim. CONTRACTS.md `skills/build-review/SKILL.md` section (lines 238-244) shows 3 existing entries: phase-e-plan-4 (final), review-stage-parallel-skill-dispatch (in-flight), quality-goal-backward-regression (planned, claims Step 1e). No entity claims Step 1f. Plan approval must append a new CONTRACTS.md row: `| pipeline-ui-review-stage | plan | Insert Step 1f UI Spec Parity check in pre-scan | 🔵 planned | 2026-04-15 |`.
Confidence: 🟢 Confident (0.90)
Evidence: `docs/build-pipeline/_index/CONTRACTS.md:238-244` -- 3 existing entries under build-review/SKILL.md, none claiming 1f; 1e is claimed by quality-goal-backward-regression. (Note: CONTRACTS shows 1e as 🔵 planned but build-review/SKILL.md:168 already implements 1e -- stale CONTRACTS state, hygiene issue for another entity.)
→ Confirmed: captain, 2026-04-15 (Step 4.5 exploration)

## Option Comparisons

### O-1: Explore template depth -- passive questions vs active old-UI inspection

The gray-area template row can either (a) prompt explore to ASK about interaction parity, or (b) instruct explore to actively READ old UI files for interaction patterns. The 054 gap was that explore never looked at the old UI code.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Template instructs active inspection | Addresses root cause directly; explore greps replaced files for event listeners, CSS :hover/:focus/:selection rules, keyboard handlers | Requires explore to identify which files are "old UI" (may not be obvious from entity context alone); increases explore Step 4 complexity | Medium | Recommended |
| Template prompts questions only | Minimal change; template row generates Track C questions for captain to answer about interaction patterns | Doesn't fix root cause; depends on captain knowing all old interaction patterns; 054 gap would recur if captain forgets | Low | Viable |

→ Selected: Template instructs active inspection (captain, 2026-04-15, interactive)

## Open Questions

Q-1: What specific interaction pattern categories should the gray-area template row enumerate in its "What to Assess" column?

Domain: Readable/Textual

Why it matters: The template row must be specific enough that explore produces useful gray areas (like "text-selection anchoring exists in old UI but not in UI Spec"), but general enough to catch novel patterns beyond the 054 case.

Suggested options: (a) Event-driven: event listeners (click, hover, drag, text-selection, keyboard shortcuts), CSS interaction states (:hover, :focus, :active, transitions), responsive breakpoints, (b) GSD 6-pillar: layout, hierarchy, interactions, states, responsiveness, accessibility -- map to explore-friendly checks, (c) Minimal: "Compare interaction patterns in replaced/modified files against ## UI Spec" -- let explore use judgment

→ Answer: Event-driven + ARIA grep (captain, 2026-04-15, interactive). Template enumerates: event listeners (click, hover, drag, text-selection, keyboard shortcuts) + CSS interaction states (:hover, :focus, :active, transitions) + responsive breakpoints (@media) + ARIA attribute grep (role, aria-*). Covers GSD pillars Interactions/States/Responsiveness/Accessibility (4/6). Layout + Hierarchy remain covered by existing gray-area-templates.md User-facing Visual table rows (Layout integration, Shared component impact) -- no duplication.

## Canonical References

- `skills/build-explore/references/gray-area-templates.md` -- target for new UI Interaction Parity row
- `skills/build-review/SKILL.md:139-182` -- pre-scan pattern precedent; Step 1f will follow existing `### 1{letter}` subsection format
- Entity 054 `entity-detail-management-ui` (shipped, archived) -- motivating UX gap example (Notion-like text-selection commenting missing)
- MEMORY rule `ui-spec-before-plan.md` -- `## UI Spec` producer contract (SO-owned, synthesized during clarify when UI detected)

## Honest Boundaries

- **UI Spec producer contract is MEMORY-based, not skill-enforced** (2026-04-15 captain decision via Step 4.5): The `## UI Spec` section is produced by SO based on the MEMORY rule `ui-spec-before-plan.md` -- there is no formal build-clarify/build-brainstorm skill contract enforcing its presence or format. build-review Step 1f relies on A-3's conditional activation: if `## UI Spec` is absent, Step 1f silently skips (no UI parity check fires). Risk: if SO misjudges "UI detected" for a UI entity, 054-type gaps may recur. Mitigation: Stage Report Step 1f should note "Skipped -- no ## UI Spec section" as a visible trace. Formalizing the UI Spec schema (required sub-sections, format enforcement) is explicitly out of scope for this entity -- deferred to a future build-clarify contract uplift entity.

## Stage Report: explore

- [x] Files mapped: 6 across skill-docs, reference-docs, pipeline-config
  skill-docs: 2 (build-explore/SKILL.md, build-review/SKILL.md); reference-docs: 1 (gray-area-templates.md); pipeline-config: 1 (README.md); entity-refs: 2 (054 gap analysis, 093 UX fix)
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 template row format (0.95); A-2 pre-scan Step 1f (0.90); A-3 conditional activation (0.90); A-4 no README changes (0.95); A-5 finding severity schema (0.85)
- [x] Options surfaced: 1
  O-1 explore template depth (active inspection vs passive questions)
- [x] Questions generated: 1
  Q-1 interaction pattern categories for template row
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  6 files mapped; 2 skill files + 1 reference doc to modify + tests = ~7-8 total files
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident 0.85-0.95, no external tech claims, purely internal skill doc modifications)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Medium scope, no Decomposition Recommendation section
- [x] Re-validation: 5 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
- [x] Assumptions confirmed: 6 / 6 (0 corrected)
  A-1..A-5 confirmed via batch; A-6 added during Step 4.5 (CONTRACTS Step 1f claim) and confirmed inline
- [x] Options selected: 1 / 1
  O-1 Explore template depth -- Template instructs active inspection (recommended)
- [x] Questions answered: 1 / 1 (0 deferred)
  Q-1 Event-driven + ARIA grep: event listeners + CSS interaction states + responsive breakpoints + ARIA grep. Covers GSD pillars Interactions/States/Responsiveness/Accessibility (4/6). Layout + Hierarchy covered by existing User-facing Visual template rows.
- [x] Open exploration: 2 gray areas surfaced (0 from templates, 1 from MEMORY `ui-spec-before-plan`, 1 from CONTRACTS numbering check)
  Iter 1: UI Spec producer contract → recorded as Honest Boundary. Iter 2: CONTRACTS Step 1f numbering → added as A-6. Iter 3: Complete.
- [x] Canonical refs added: 4
  gray-area-templates.md; build-review/SKILL.md:139-182; entity 054 (shipped, archived); MEMORY rule ui-spec-before-plan.md
- [x] Context status: ready
  Gate passed: all assumptions confirmed, O-1 selected, Q-1 answered, AC 4 criteria with no α markers, Canonical References + Honest Boundaries populated
- [x] Handoff mode: loose
  No auto_advance in frontmatter; captain must say "execute 095" to trigger FO plan stage in new CC instance
- [x] Clarify duration: 8 AskUserQuestion calls (1 batch + 1 option + 3 Q-1 iterations for clarify-Q + 3 Step 4.5 exploration rounds), session complete
