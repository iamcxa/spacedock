---
id: 069
title: Review Stage -- Parallel Ensign Skill Dispatch
status: draft
context_status: pending
source: captain
created: 2026-04-12T21:30:00+08:00
started:
completed:
verdict:
score: 0.80
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Captain Context Snapshot

- **Repo**: main @ 189e947 (spacedock)
- **Session**: SO triage session — captain advancing 069 after completing 067 (TDD) and 068 (build-distill) clarify. Review stage dispatch is a natural continuation of the "ensign can't fan out" limitation addressed by entity 065 (execute side).
- **Domain**: Runnable / Invokable (agent dispatch architecture), Readable / Textual (SKILL.md contract edits)
- **Related entities**:
  - 065 -- Flatten Dispatch Troops Architecture (draft — same pattern applied to execute stage)
  - 062 -- Phase E Plan 4 Dogfood (shipped — proved parallel trailofbits agents work in review)
  - 063 -- kc-pr-flow-mod (shipped — exposed ensign subagent limitation)
- **Created**: 2026-04-12T21:30:00+08:00

## Directive

> Redesign the review stage dispatch from "single ensign loads build-review skill which tries to fan-out agents internally" to "FO analyzes diff scope and dispatches 1-10 ensigns in parallel, each loading a single pr-review-toolkit skill."

Current problem: build-review skill wants to dispatch parallel review agents (code-reviewer, silent-failure-hunter, comment-analyzer, etc.) but ensigns are subagents without the Agent tool. The fan-out is structurally unreachable.

New design:
- FO (which HAS Agent tool) analyzes the diff to determine relevant review facets
- FO dispatches 1-10 ensigns in parallel via Agent(), each loading one pr-review-toolkit skill
- Number of ensigns scales with diff scope (small diff = 2-3, large diff = 6-10)
- FO collects all ensign results and synthesizes into classified findings table + Stage Report
- Pre-scan (CLAUDE.md compliance, stale refs, plan consistency) stays inline in FO or as a dedicated ensign
- knowledge-capture stays as FO post-completion step

Skills to dispatch as individual ensigns:
- pr-review-toolkit:code-reviewer
- pr-review-toolkit:silent-failure-hunter
- pr-review-toolkit:comment-analyzer
- pr-review-toolkit:pr-test-analyzer
- pr-review-toolkit:type-design-analyzer
- pr-review-toolkit:code-simplifier

Trailofbits skills (when installed + applicable):
- differential-review:diff-review
- sharp-edges:sharp-edges
- variant-analysis:variant-analysis

Changes required:
1. Update `skills/build-review/SKILL.md` to document the new dispatch pattern
2. Update `docs/build-pipeline/README.md` review stage comments if needed
3. Update `references/first-officer-shared-core.md` or `references/claude-first-officer-runtime.md` if the FO dispatch adapter needs changes for multi-ensign parallel dispatch at review time

## Brainstorming Spec

**APPROACH**: Refactor the review stage from "single ensign loads build-review skill which tries to fan-out agents internally (structurally impossible since ensigns lack Agent tool)" to "FO analyzes the execute-base..HEAD diff scope, determines relevant review facets, and dispatches 1-10 ensigns in parallel via Agent(), each loading exactly one pr-review-toolkit or trailofbits skill." FO collects all ensign results and synthesizes them into a classified findings table + Stage Report. This follows the same pattern as entity 065's troops architecture for execute (FO direct dispatch, leaf workers) but applied to the review stage. Pre-scan (CLAUDE.md compliance, stale refs, import graph, plan consistency) either stays inline in FO or becomes a dedicated ensign. Knowledge-capture remains a FO post-completion step. The number of review ensigns scales with diff scope: small diff (< 5 files) = 2-3 core reviewers, large diff (> 15 files) = 6-10 including trailofbits. build-review SKILL.md transforms from an ensign-executed orchestrator into FO guidance documentation (same transition 065 proposes for build-execute).

**ALTERNATIVE**: Keep single ensign for review but grant it Agent tool access by modifying the ensign agent definition. -- D-01 Rejected because giving ensign the Agent tool breaks the "ensign = leaf, no sub-dispatch" boundary established in Phase E. This boundary is load-bearing: it prevents context bloat from nested dispatches, keeps the dispatch tree shallow (FO → ensign, never FO → ensign → sub-ensign), and was confirmed as a hard constraint in Phase E Plan 2 Wave 1 pilot and entity 063. See memory: `subagent-cannot-nest-agent-dispatch.md`.

**GUARDRAILS**:
- Ensign remains a leaf worker — no Agent tool, no sub-dispatch. This entity does NOT change the ensign agent definition.
- FO already has Agent tool; this uses existing FO capability, not new infrastructure.
- Trailofbits skills (differential-review, sharp-edges, variant-analysis) are only dispatched when the plugin is installed AND the diff scope is relevant (security-sensitive files, API changes, etc.).
- build-review SKILL.md becomes FO guidance, not ensign instruction — same pattern as entity 065's proposed change to build-execute SKILL.md. Both entities share the "SKILL.md as FO playbook" design direction.
- Entity 065 (flatten dispatch) is a sibling architectural change; 069 should be compatible but independent. If 065 ships first, 069 adapts; if 069 ships first, 065 adapts.

**RATIONALE**: The "ensign can't fan out" limitation is not a bug — it's a deliberate architectural decision (shallow dispatch tree). Entity 062's dogfood proved that parallel review agents produce high-quality findings when dispatched correctly (4 trailofbits agents ran in parallel during Phase E Plan 4). Entity 065 addresses the same limitation for execute; 069 addresses it for review. Together they establish a consistent pattern: FO is the only orchestrator that fans out, ensigns are leaf workers. The diff-scope-based dispatch count prevents wasteful over-review on trivial changes while ensuring thorough coverage on large diffs.

## Acceptance Criteria

- FO dispatches N ensigns in parallel for review (N based on diff analysis). (how to verify: `grep -n "Agent(" skills/build-review/SKILL.md` or FO shared core shows parallel dispatch pattern for review stage)
- Each ensign loads exactly one pr-review-toolkit skill via Skill tool. (how to verify: each dispatched ensign's prompt contains exactly one `skill:` reference, not a list)
- FO synthesizes all ensign findings into a single classified Stage Report with severity levels (CRITICAL/HIGH/MEDIUM/LOW). (how to verify: `grep "Stage Report: review" {entity}` shows classified findings table)
- Works in both bare mode (sequential fallback when teams unavailable) and teams mode (parallel). (how to verify: build-review SKILL.md documents both code paths)
