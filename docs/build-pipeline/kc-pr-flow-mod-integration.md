---
id: 063
title: PR Review Loop Mod -- kc-pr-create Integration + Shipped Stage Closed-Loop
status: plan
context_status: ready
source: captain
created: 2026-04-12T04:30:00Z
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

Implement `mods/pr-review-loop.md` -- the shipped stage closed-loop mod required by Phase E spec (line 950, Success Criterion #5). This mod replaces the manual `gh pr create` flow in `docs/build-pipeline/_mods/pr-merge.md` with a skill-delegating design that uses `kc-pr-flow:kc-pr-create` for PR creation and adds a review closed-loop (PR state polling, review comment triage, fix-forward routing).

### Why this entity exists

1. **Spec gap**: Phase E Success Criterion #5 requires two mods -- `workflow-index-maintainer` (shipped) and `pr-review-loop` (not yet created). This is the only remaining Phase E gap.
2. **Entity 062 lesson**: FO bypassed the mod flow entirely during shipped stage, manually calling `gh pr create` instead of delegating to a mod + skill. The current `pr-merge.md` mod hardcodes PR creation logic that duplicates what `kc-pr-create` already handles.
3. **Thin wrapper principle**: Mods should be skill callers, not skill re-implementations (same design principle as the thin wrapper agent pattern from entity 062).

### Scope

1. **Create `mods/pr-review-loop.md`** with three hooks:
   - `merge` hook: delegate to `kc-pr-flow:kc-pr-create` skill for PR creation (branch push, PR format, review integration). Captain approval guardrail preserved.
   - `idle` hook: poll PR state via `gh pr view`. On `MERGED` -> advance entity to terminal stage + archive. On `changes_requested` -> route review comments back to execute via feedback-to. On `CLOSED` without merge -> report to captain.
   - `startup` hook: same PR-state checks as idle (defense in depth).

2. **Deprecate `docs/build-pipeline/_mods/pr-merge.md`**: Add a deprecation notice pointing to `mods/pr-review-loop.md`. Do not delete yet -- existing workflows may reference it. Delete in a follow-up entity after one milestone cycle.

3. **Review comment triage** (the "closed-loop" part): When idle hook detects `changes_requested`, use `kc-pr-flow:kc-pr-review-resolve` skill to triage review comments, validate fixes, and push updates. This is the feedback loop that `pr-merge.md` lacks entirely.

4. **FO shared core alignment**: Ensure `references/first-officer-shared-core.md` Merge and Cleanup section references the new mod and its skill delegation pattern.

### Acceptance Criteria

- AC1: `mods/pr-review-loop.md` exists with startup, idle, and merge hooks
- AC2: merge hook invokes `kc-pr-flow:kc-pr-create` via Skill tool (not raw `gh pr create`)
- AC3: idle hook detects `changes_requested` and routes to `kc-pr-flow:kc-pr-review-resolve`
- AC4: `docs/build-pipeline/_mods/pr-merge.md` has deprecation notice
- AC5: Phase E spec Success Criterion #5 fully satisfied (both mods exist)

### Context

- Phase E spec: `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` line 950
- Current shipped stage design: `docs/build-pipeline/README.md` lines 123-127
- Existing mod: `docs/build-pipeline/_mods/pr-merge.md` (version 0.8.2)
- Skills to integrate: `kc-pr-flow:kc-pr-create`, `kc-pr-flow:kc-pr-review-resolve`
- Entity 062 lesson: FO skipped mod flow, manually created PR #28

## Captain Context Snapshot

- **Repo**: main @ c299e5e
- **Session**: Entity 062 shipped (PR #28 merged), entities 063/064 drafted, Phase E audit 11/12 complete
- **Domain**: Runnable/Invokable, Behavioral/Callable, Readable/Textual
- **Related entities**: 062 -- Phase E Plan 4 Dogfood Trail of Bits (shipped), 064 -- Dashboard Mod Visibility (draft)
- **Created**: 2026-04-12T04:30:00Z

## Brainstorming Spec

**APPROACH**: Create `mods/pr-review-loop.md` as a skill-delegating mod with three hooks (startup, idle, merge) that replaces the hardcoded PR logic in `docs/build-pipeline/_mods/pr-merge.md` (✓ confirmed by explore: mods/workflow-index-maintainer.md uses identical 3-hook structure; README:381-392 pre-documents the shipped stage contract for this mod). The merge hook delegates PR creation entirely to `kc-pr-flow:kc-pr-create` via `Skill` tool — the mod provides the entity context (title, branch, files changed) but the skill owns branch push, PR formatting, and GitHub interaction. The idle hook polls PR state via `gh pr view --json state,reviewDecision`; on `changes_requested`, it delegates to `kc-pr-flow:kc-pr-review-resolve` for automated review comment triage and fix-forward routing back to the execute stage. On `MERGED`, it advances the entity to terminal stage and archives. The startup hook mirrors idle's PR state checks (defense in depth). The existing `pr-merge.md` gets a deprecation notice pointing to the new mod. The FO shared core's Merge and Cleanup section is updated to reference the new mod's skill delegation pattern.

**ALTERNATIVE**: Extend the existing `docs/build-pipeline/_mods/pr-merge.md` in-place by adding skill delegation calls and review loop logic to its existing hooks, keeping one mod file rather than creating a replacement. -- D-01 Rejected because: (a) pr-merge.md lives in `docs/build-pipeline/_mods/` while the canonical mod directory is `mods/` (where `workflow-index-maintainer.md` already lives), perpetuating the inconsistency (✓ confirmed by explore: mods/ has 2 mods, _mods/ has 1 -- repo-root mods/ is the canonical location); (b) the review closed-loop is genuinely new capability that would overload pr-merge's original "push and create PR" scope; (c) clean deprecation-then-replacement is safer than in-place surgery on a mod that existing documentation references.

**GUARDRAILS**:
- Captain approval guardrail MUST be preserved in the merge hook — present PR summary and wait for explicit captain approval before push/create (same pattern as current pr-merge.md)
- Thin wrapper principle — mod describes *when* to call skills and *what context to pass*, never re-implements skill logic (entity 062 lesson, MEMORY.md thin-wrapper-agent-pattern)
- Eventually-consistent error handling — mod errors must not block FO startup or entity dispatch (same pattern as workflow-index-maintainer error handling)
- Do not delete `pr-merge.md` — deprecation notice only; deletion deferred to a follow-up entity after one milestone cycle
- Mod frontmatter format must match `workflow-index-maintainer.md` (name, description, version fields)

**RATIONALE**: Creating a new mod in the canonical `mods/` directory with pure skill delegation is the cleanest path because it follows the validated thin wrapper pattern (entity 062), keeps the mod focused on orchestration rather than implementation, and treats the review closed-loop as a first-class capability rather than a bolt-on. The deprecation-then-replacement strategy avoids breaking existing documentation references while clearly signaling the migration path. The three-hook structure (startup/idle/merge) mirrors workflow-index-maintainer's proven pattern, giving FO a consistent interface for both mods.

## Acceptance Criteria

- AC1: `mods/pr-review-loop.md` exists with startup, idle, and merge hooks documented (how to verify: file exists, grep for `## Hook: startup`, `## Hook: idle`, `## Hook: merge`)
- AC2: merge hook specifies `kc-pr-flow:kc-pr-create` invocation via Skill tool, not raw `gh pr create` (how to verify: grep merge hook section for `kc-pr-flow:kc-pr-create`, confirm no `gh pr create` command)
- AC3: idle hook specifies `changes_requested` detection and routing to `kc-pr-flow:kc-pr-review-resolve` (how to verify: grep idle hook for `changes_requested` and `kc-pr-review-resolve`)
- AC4: `docs/build-pipeline/_mods/pr-merge.md` has deprecation notice with pointer to `mods/pr-review-loop.md` (how to verify: grep pr-merge.md for "deprecated" and "pr-review-loop")
- AC5: `references/first-officer-shared-core.md` Merge and Cleanup section references the new mod (how to verify: grep shared core for `pr-review-loop`)

## Assumptions

A-1: Mod file lives at `mods/pr-review-loop.md` (repo root), matching the canonical mod directory.
Confidence: Confident
Evidence: mods/workflow-index-maintainer.md:1 + mods/pr-merge.md:1 -- both existing mods at repo root; README:126 references `mods/pr-review-loop.md`
→ Confirmed: captain, 2026-04-12 (batch)

A-2: Mod format follows the YAML frontmatter (name/description/version) + `## Hook:` section pattern.
Confidence: Confident
Evidence: mods/workflow-index-maintainer.md:1-5 + mods/pr-merge.md:1-5 -- both use identical frontmatter schema and hook heading convention
→ Confirmed: captain, 2026-04-12 (batch)

A-3: Captain approval guardrail in merge hook -- present PR summary, wait for explicit approval before push/create.
Confidence: Confident
Evidence: mods/pr-merge.md:29-36 -- merge hook guardrail pattern; README:383 -- "ask captain approval"
→ Confirmed: captain, 2026-04-12 (batch)

A-4: Skill invocation described as inline instruction text with context params (not YAML block like workflow-index-maintainer).
Confidence: Likely
Evidence: mods/workflow-index-maintainer.md:43-48 -- uses inline YAML params for skill invocation (1 usage, clear fit). However, kc-pr-flow skills are external plugins invoked via `Skill("kc-pr-flow:kc-pr-create")` -- the mod describes the invocation, not the skill internals.
→ Confirmed: captain, 2026-04-12 (batch)

A-5: New mod starts at version 0.1.0.
Confidence: Likely
Evidence: mods/workflow-index-maintainer.md:4 -- `version: 0.1.0` (only new-mod precedent)
→ Confirmed: captain, 2026-04-12 (batch)

## Option Comparisons

### Review feedback routing on `changes_requested`

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Skill-first: invoke kc-pr-review-resolve to triage comments, skill decides fix-forward vs escalate | Leverages existing skill logic, mod stays thin, skill improvements auto-flow to mod | Depends on external plugin availability; skill may not be installed | Low | Recommended |
| Reset-to-execute: reset entity status to execute, clear pr field, log context | Simple, no external dependency, matches README:386 pattern | Loses PR context, no comment triage, manual-heavy | Low | Viable |
| Hybrid: invoke skill first, fall back to reset-to-execute if skill unavailable | Graceful degradation, best of both worlds | Two code paths in hook, more complex instructions | Medium | Viable |

→ Selected: Skill-first: invoke kc-pr-review-resolve (captain, 2026-04-12, interactive)

## Open Questions

Q-1: Should entity 063 update FO shared core startup step 4 to scan `mods/` (repo root) instead of `{workflow_dir}/_mods/`?

Domain: Runnable/Invokable

Why it matters: FO shared core line 18 scans `{workflow_dir}/_mods/*.md` for mod discovery, but both canonical mods live at repo-root `mods/`. Without fixing the scan path, the FO won't discover `mods/pr-review-loop.md` at startup -- the mod would exist but never execute. AC5 only mentions updating the Merge and Cleanup section, not the startup scan path.

Suggested options: (a) Update FO shared core line 18 to scan `mods/*.md` (repo root) -- aligns with actual file layout (recommended), (b) Scan both `mods/` and `{workflow_dir}/_mods/` for backward compatibility, (c) Out of scope -- create a separate entity for FO scan path migration

→ Answer: Scan both -- mods/ (shared library) + {workflow_dir}/_mods/ (workflow-specific). Layered mod architecture: mods/ holds the library, _mods/ holds per-workflow activation/overrides. (captain, 2026-04-12, interactive -- revised from initial "mods/ only")

Q-2: Should both copies of pr-merge.md get deprecation notices?

Domain: Readable/Textual

Why it matters: `docs/build-pipeline/_mods/pr-merge.md` (v0.8.2) and `mods/pr-merge.md` (v0.9.0) both exist with identical content. AC4 only mentions the `docs/build-pipeline/_mods/` copy. Leaving an undeprecated copy creates confusion about which is canonical.

Suggested options: (a) Deprecate both copies with pointer to `mods/pr-review-loop.md`, (b) Delete `_mods/` copy + deprecate `mods/` copy (clean break), (c) Deprecate `_mods/` copy per AC4 only, leave `mods/` copy for separate cleanup

→ Answer: Replace _mods/pr-merge.md with _mods/pr-review-loop.md. pr-merge.md stays in mods/ library (not deprecated). Build-pipeline activates pr-review-loop via its _mods/ directory. (captain, 2026-04-12, interactive -- reframed from deprecation to activation swap)

Q-3: Should entity 063 include writing mod-hook fixture tests to satisfy Phase E SC#5?

Domain: Runnable/Invokable

Why it matters: Phase E spec SC#5 requires "Both new mods exist and pass mod-hook fixture tests (distilled from tests/fixtures/merge-hook-pipeline)". Entity 063 directive has no test-related ACs. Without tests, SC#5 is technically incomplete.

Suggested options: (a) Include fixture tests in entity 063 scope -- expands to ~6 files, still Small, (b) Create a separate entity for mod fixture tests, (c) Defer tests to Phase E+1 and mark SC#5 as partially met

→ Answer: Include in entity 063 scope (captain, 2026-04-12, interactive)

## Canonical References

(No external files cited by captain during clarify session.)

## Stage Report: explore

- [x] Files mapped: 6 across config, doc
  mods/workflow-index-maintainer.md, mods/pr-merge.md, docs/build-pipeline/_mods/pr-merge.md, references/first-officer-shared-core.md, docs/build-pipeline/README.md, Phase E spec
- [x] Assumptions formed: 5 (Confident: 3, Likely: 2, Unclear: 0)
  A-1 through A-3 Confident via multi-file evidence; A-4 Likely (1 usage); A-5 Likely (1 new-mod precedent)
- [x] Options surfaced: 1
  O-1 review feedback routing on changes_requested (skill-first vs reset-to-execute vs hybrid)
- [x] Questions generated: 3
  Q-1 FO mod scan path update; Q-2 dual pr-merge.md deprecation; Q-3 SC#5 fixture tests
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec (directive was precise)
- [x] Scale assessment: confirmed
  6 files mapped, 3-4 files changed (mod + deprecation + FO shared core) -- Small confirmed

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Small scope, no children proposed
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 confirmed via batch -- mod location, format, guardrail, invocation style, version
- [x] Options selected: 1 / 1
  O-1 review feedback routing -- skill-first via kc-pr-review-resolve (recommended)
- [x] Questions answered: 3 / 3
  Q-1 layered mod scan (both mods/ + _mods/); Q-2 activation swap (replace _mods/pr-merge with pr-review-loop); Q-3 fixture tests in scope
- [x] Canonical refs added: 0
  no external files cited by captain during session
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 063" to advance
- [x] Clarify duration: 4 questions asked, session complete
  1 batch assumption confirmation + 1 option AskUserQuestion + 3 question AskUserQuestion (Q-2 rejected once, reframed)
