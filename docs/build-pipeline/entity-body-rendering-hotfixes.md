---
id: 047
title: Entity Body Rendering Hotfixes -- Stage Report Detail + Open Questions Format
status: clarify
context_status: ready
source: /build
created: 2026-04-10T14:45:00+08:00
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

> 修復 entity body 在 dashboard 的渲染問題 -- Stage Report 加 detail line, Open Questions 改用 blank line 分段，讓 UI 顯示結構化內容而不是文字牆

## Captain Context Snapshot

- **Repo**: main @ 87a998d
- **Session**: Phase C smoke test (2026-04-10) on entity 046 surfaced two distinct rendering problems: Stage Report cards look flat because skill spec never populates the detail field the parser already supports, and Open Questions sections render as text walls because markdown soft-newlines collapse Q-n fields into a single paragraph
- **Domain**: User-facing Visual, Readable / Textual
- **Related entities**:
  - 046 -- dashboard-context-status-filter (smoke test fixture, currently status: clarify / context_status: ready)
  - 008 -- dashboard-standalone-plugin (reference for current production Stage Report format `- [x] ...`)
  - 040 -- spacedock-plugin-architecture-v2 (parallel track, not blocking)
- **Roadmap anchor**: `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md` D.2 (Open Questions rendering hotfix) + D.3 (Stage Report Tier 1 detail lines)
- **Forward link**: Tier 2 + Tier 3 rendering (collapsible detail, clickable section anchors) are explicitly deferred to Phase F (Next.js frontend rewrite)
- **Created**: 2026-04-10T14:45:00+08:00

## Brainstorming Spec

**APPROACH**: Two related Tier 1 fixes, both scoped to skill reference docs (no dashboard code changes) (⚠ contradicted: skills/build-explore/SKILL.md:161 and skills/build-clarify/SKILL.md:286 still contain stale flat-format Stage Report examples that Tasks 1-5 did not update; the GUARDRAIL below requires SKILL.md propagation but execution only touched reference docs -- see Q-1). Fix 1: update `skills/build-explore/references/output-format.md` and `skills/build-clarify/references/output-format.md` to require a 2-space indented detail line under each Stage Report metric. The dashboard parser `tools/dashboard/src/frontmatter-io.ts:157-158` already reads the next indented line as `StageReportItem.detail`, so this is a free upgrade on the existing rendering path (✓ confirmed by explore: frontmatter-io.ts:157-158 extracts detail via `if (lines[j+1].startsWith("  ")) detail = lines[j+1].trim()`; detail.js:119-124 renders `item.detail` in a `.item-detail` span under each checklist item in `renderStageReports()`). Fix 2: update `skills/build-explore/references/output-format.md` Open Questions section format to require blank-line separation between Q-n subfields (Domain, Why it matters, Suggested options, and the clarify-appended Answer line) so markdown renders each as a distinct paragraph instead of collapsing them with soft newlines (✓ confirmed by explore: detail.js:62-64 `renderBody()` routes entity body through markdown BEFORE the split at `^## Stage Report:`, so Open Questions IS subject to markdown soft-newline collapsing -- blank-line separation is the correct fix).

**ALTERNATIVE**: Tier 2 (custom multi-line detail parser + collapsible accordion UI) or Tier 3 (clickable section anchors navigating into entity body). -- D-01 deferred: both require frontend component-level changes that only make sense alongside the Phase F Next.js rewrite. Doing Tier 2+3 in Phase D means rewriting vanilla JS that Phase F will throw away.

**GUARDRAILS**:
- Must not break rendering of existing entities (no parser changes, no frontend changes -- only skill spec doc updates)
- Must not regress Stage Report parsing for production entities that already use `- [x]` format without detail lines (parser's existing "detail is optional, blank string if missing" behavior must still work)
- Must stay forward-compatible with Phase F Tier 2/3 (do not lock the detail format in a way that blocks multi-line detail later)
- Both fixes must be reflected in any corresponding SKILL.md steps that reference the output format
- No dashboard code changes (tools/dashboard/** stays untouched)
- No new runtime dependencies

**RATIONALE**: Phase C smoke test on entity 046 revealed that the skill spec output format silently diverges from what the dashboard can render. Captain saw a flat Stage Report card with no context about which decisions were made, and an Open Questions section that looked like a wall of text. The root cause in both cases is identical: skill spec writes markdown that loses structure when rendered. The fixes are cheap (doc edits only) and unlock immediate UI improvement. The Tier 2+3 richer rendering (collapsible detail, clickable anchors) is strictly more valuable but requires the Phase F component architecture to land first.

## Acceptance Criteria

- build-explore (and build-clarify) emit Stage Report sections where each `- [x] {metric}` item has an optional 2-space indented line below it containing concrete detail (how to verify: inspect entity body after running build-explore on a fixture entity, grep for `^  [A-Z]` pattern under Stage Report section)
- Dashboard Stage Report card visually shows the detail text below each checklist item (how to verify: load entity 046 or 047 itself in the dashboard UI after the fix, confirm detail strings render under each metric)
- Running build-explore on any entity produces an Open Questions section where each Q-n's Domain / Why it matters / Suggested options / Answer lines render as distinct markdown paragraphs (how to verify: fetch the rendered entity body page, confirm each Q-n field appears on its own line with visible spacing, not concatenated)
- No existing active entity's rendering regresses (how to verify: spot-check 3 active entities in the dashboard UI, confirm Stage Report and other sections still render correctly)

## Open Questions

Q-1: Should the SKILL.md Stage Report format drift be fixed as part of entity 047's scope, or does it require a new Phase D task (e.g., D.1.5) as loopback from Task 6 dogfood?

Domain: Runnable / Invokable

Why it matters: Entity 047's APPROACH explicitly says "both scoped to skill reference docs", but the GUARDRAILS contradict this by requiring SKILL.md propagation. Tasks 1-5 followed the APPROACH wording and left the drift -- skills/build-explore/SKILL.md:161 and skills/build-clarify/SKILL.md:286 still show the OLD flat format. Including the fix in 047's scope expands it beyond the original Tier 1 framing but honors the GUARDRAIL. Creating a new D.1.5 task preserves scope boundaries and records the loopback explicitly. Deferring to Phase E risks the drift persisting through more dogfood cycles and violates the MEMORY.md "Dogfood Validation Must Follow Fixes" principle (the dogfood revealed a gap; the gap should be fixed before continuing).

Suggested options: (a) Expand entity 047 scope -- fix SKILL.md drift inside this entity (aligns with GUARDRAIL, stretches APPROACH), (b) Create D.1.5 loopback task -- new Phase D task, leave 047 scoped to reference docs only (preserves 047 boundary, records loopback explicitly), (c) Defer to Phase E review -- capture as Phase E finding, no Phase D action (slowest, risks drift persisting)

→ Answer: (a) Expand entity 047 scope -- fix SKILL.md drift inside this entity (captain, 2026-04-10, interactive). Implication: entity 047's implementation work now includes editing skills/build-explore/SKILL.md:161 and skills/build-clarify/SKILL.md:286 to match the checklist + detail format; plan stage must update the APPROACH to add "Fix 3: update both SKILL.md Stage Report examples" and expand the "target files" list from 2 to 4.

Q-2: Should the detail line content style be prescribed per metric in references/output-format.md, or left freeform to author judgment?

Domain: Readable / Textual

Why it matters: Current references/output-format.md shows concrete detail examples (build-explore:122-132, build-clarify:118-130) but does not mandate a style. Different authors may produce inconsistent detail lines -- one entity lists file counts, another lists A-n IDs, another lists commit hashes. Inconsistent detail reduces the "at-a-glance decision audit trail" value Task 3 was designed to unlock. Over-prescribing risks limiting the author's judgment about what evidence matters most for each metric. This question does NOT block 047 merging but affects how Phase D+ entities use the feature consistently.

Suggested options: (a) Freeform -- author's judgment, no style rule (max flexibility, consistency risk), (b) Prescribed per metric -- reference doc specifies a style per metric like "Files mapped: list layer breakdown with counts; Assumptions formed: A-n IDs with confidence reasoning" (max consistency, reduces author flexibility), (c) Exemplar-based -- reference doc tags specific entity examples as "canonical pattern" and instructs authors to match the style of those examples (balances consistency and flexibility, but requires picking canonical exemplars)

→ Answer: (c) Exemplar-based -- reference doc tags specific entity examples as canonical pattern and instructs authors to match that style (captain, 2026-04-10, interactive). Implication: references/output-format.md should add a brief "Canonical detail line exemplars" subsection naming specific entities (e.g., entity 008 dashboard-standalone-plugin or entity 047 itself once clarify lands) as the style references. This is a scope extension that MAY be rolled into 047's plan or deferred to a follow-up entity -- plan stage should decide based on scope budget; does NOT block 047 merging.

## Assumptions

A-1: Dashboard parser extracts 2-space-indent detail lines from Stage Report items as `StageReportItem.detail`
Confidence: Confident
Evidence: tools/dashboard/src/frontmatter-io.ts:157-158 -- `if (j + 1 < lines.length && lines[j + 1].startsWith("  ")) { detail = lines[j + 1].trim() }` runs inside the checklist parser loop (line 140 regex `^- \[(x| )\] ((?:SKIP: |FAIL: )?)(.+)$`); tested in production by entity 008 which already uses the format
→ Confirmed: captain, 2026-04-10 (batch)

A-2: Dashboard frontend renders `StageReportItem.detail` under each checklist item in a `.item-detail` span
Confidence: Confident
Evidence: tools/dashboard/static/detail.js:119-124 -- `if (item.detail) { var detail = document.createElement('span'); detail.className = 'item-detail'; detail.textContent = item.detail; li.appendChild(detail); }` inside `renderStageReports()` at line 86
→ Confirmed: captain, 2026-04-10 (batch)

A-3: Tasks 1, 2, 3 successfully landed the checklist format + detail line spec + Open Questions blank-line rule in both `references/output-format.md` files
Confidence: Confident
Evidence: skills/build-explore/references/output-format.md:118-139 (checklist example + detail line paragraph), line 88 (Open Questions blank-line rule); skills/build-clarify/references/output-format.md:107-139 (clarify Stage Report checklist + detail line paragraph), line 80 (Answer blank-line rule from Task 2 D.2 hotfix)
→ Confirmed: captain, 2026-04-10 (batch)

A-4: Entity 008 (dashboard-standalone-plugin) already uses the checklist + detail format in production, predating Phase D Task 3
Confidence: Confident
Evidence: docs/build-pipeline/dashboard-standalone-plugin.md:253-268 -- Stage Report: explore with 6 `- [x]` checklist items each followed by a 2-space-indent detail line; served as the format exemplar Task 3 retrofitted into the reference doc spec
→ Confirmed: captain, 2026-04-10 (batch)

A-5: Stage Report rendering bypasses markdown soft-newline collapsing entirely because `renderBody()` splits the entity body at `## Stage Report:` before markdown renders the body section
Confidence: Confident
Evidence: tools/dashboard/static/detail.js:62-64 -- `var parts = bodyMarkdown.split(/^## Stage Report: /m); var bodyContent = parts[0].trim()` isolates Stage Report content for custom card rendering via `renderStageReports()`; detail text lives in a `.item-detail` span, never touched by markdown
→ Confirmed: captain, 2026-04-10 (batch)

## Option Comparisons

### SKILL.md Stage Report format drift resolution

The `skills/build-explore/SKILL.md` Step 7 (line 161) and `skills/build-clarify/SKILL.md` Step 6 (line 286) contain Stage Report format examples that still use the OLD flat bullet format (`- Files mapped: ...`). Tasks 1-5 updated the `references/output-format.md` files to the new checklist format with detail lines but did NOT propagate the change to the SKILL.md duplicate examples, creating format drift. How should this be resolved?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| (a) Inline update -- rewrite SKILL.md Step 7 / Step 6 examples to match the full checklist + detail format | Preserves SKILL.md self-contained readability; aligns with existing duplicate pattern; matches MEMORY.md "Review-Driven Format Drift Detection" guidance which explicitly calls for mechanical grep enforcement of duplicate format defs | Drift can recur on future format changes without a verification-step grep comparison to catch it | Low | Recommended |
| (b) Pointer replacement -- remove the inline example entirely, add "see `references/output-format.md` for exact format" | Eliminates drift mechanism at the source (single source of truth) | Executor must context-switch to a second file to see the format; SKILL.md loses self-contained step explanation | Low | Viable |
| (c) Hybrid -- keep an abbreviated structural example in SKILL.md (showing checklist markers only, no detail line) plus an explicit pointer to references for the full spec | Captures intent at both levels while minimizing duplication | Still has a drift surface (abbreviated != full spec); may confuse readers about which is canonical | Medium | Not recommended |

→ Selected: (a) Inline update -- rewrite SKILL.md Step 7 / Step 6 examples to match the full checklist + detail format (captain, 2026-04-10, interactive)

## Canonical References

(clarify stage will populate)

## Stage Report: explore

- [x] Files mapped: 8 across skill-spec, dashboard-frontend, reference-entities
  skill-spec: 4 files (build-explore/SKILL.md + references/output-format.md, build-clarify/SKILL.md + references/output-format.md); dashboard-frontend: 2 files (frontmatter-io.ts parser, detail.js renderer); reference-entities: 2 files (008 production pattern, 046 Phase-C smoke-test fixture)
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 parser extracts detail, A-2 frontend renders .item-detail span, A-3 Tasks 1-3 landed in reference docs, A-4 entity 008 predates the pattern manually, A-5 Stage Report bypasses markdown via renderBody split -- all cited with exact file:line evidence
- [x] Options surfaced: 1
  O-1 SKILL.md Stage Report format drift resolution (inline update vs pointer replacement vs hybrid)
- [x] Questions generated: 2
  Q-1 drift fix scope (expand 047 vs new D.1.5 task vs Phase E defer), Q-2 detail line content style prescription level (freeform vs prescribed vs exemplar-based)
- [x] α markers resolved: 0 / 0
  Brainstorming Spec and Acceptance Criteria contain no `(needs clarification -- deferred to explore)` markers; /build produced a fully specified spec
- [x] Scale assessment: confirmed
  Brainstorming Spec estimated Small; target files are 4 (2 reference docs already landed + 2 SKILL.md drift fixes if Q-1 resolves to option a); the 4 additional evidence files read (parser, frontend, 2 reference entities) are non-modifying verification reads; stays under the <5-file Small threshold

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Entity 047 is Small scope with no Decomposition Recommendation section; build-explore correctly skipped Step 3 decomposition analysis
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 all Confident-level with file:line evidence; captain confirmed entire batch "all correct" via single AskUserQuestion (recommended option)
- [x] Options selected: 1 / 1
  O-1 SKILL.md Stage Report format drift resolution -> (a) Inline update (recommended), rewrite SKILL.md Step 7 / Step 6 examples to match the full checklist + detail format
- [x] Questions answered: 2 / 2 (0 deferred)
  Q-1 drift fix scope -> (a) Expand 047 scope (fix SKILL.md inline in this entity); Q-2 detail line content style -> (c) Exemplar-based (reference doc tags canonical exemplars)
- [x] Canonical refs added: 0
  Captain's answers did not cite any new file paths, ADRs, or specs beyond what was already surfaced by build-explore; Canonical References section remains empty placeholder for this entity
- [x] Context status: ready
  Gate passed: all 5 assumptions confirmed, 1 option selected, 2 questions answered, Acceptance Criteria has 4 items (>=2) with no α markers remaining, Canonical References section exists
- [x] Handoff mode: loose
  `auto_advance:` field is empty in frontmatter; captain must explicitly say "execute 047" for First Officer to transition status: clarify -> plan
- [x] Clarify duration: 4 captain interactions, session complete
  1 plain-text assumption batch (rendered as 1 AskUserQuestion per captain's "use Claude UI" directive) + 1 option (O-1) + 2 questions (Q-1, Q-2); all via AskUserQuestion in Chinese; subagent AskUserQuestion bubbling WORKED on all 4 calls (Task 4 SO routing smoke test passed)
