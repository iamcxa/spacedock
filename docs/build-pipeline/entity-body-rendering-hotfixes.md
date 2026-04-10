---
id: 047
title: Entity Body Rendering Hotfixes -- Stage Report Detail + Open Questions Format
status: draft
context_status: pending
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

**APPROACH**: Two related Tier 1 fixes, both scoped to skill reference docs (no dashboard code changes). Fix 1: update `skills/build-explore/references/output-format.md` and `skills/build-clarify/references/output-format.md` to require a 2-space indented detail line under each Stage Report metric. The dashboard parser `tools/dashboard/src/frontmatter-io.ts:157-158` already reads the next indented line as `StageReportItem.detail`, so this is a free upgrade on the existing rendering path. Fix 2: update `skills/build-explore/references/output-format.md` Open Questions section format to require blank-line separation between Q-n subfields (Domain, Why it matters, Suggested options, and the clarify-appended Answer line) so markdown renders each as a distinct paragraph instead of collapsing them with soft newlines.

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

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
