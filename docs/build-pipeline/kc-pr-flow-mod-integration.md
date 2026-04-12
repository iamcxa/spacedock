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

## Research Findings

### Upstream Constraints

- **Phase E spec SC#5** (line 968): "Both new mods exist and pass mod-hook fixture tests (distilled from tests/fixtures/merge-hook-pipeline)." Entity 063 must create `mods/pr-review-loop.md` and fixture tests. `mods/workflow-index-maintainer.md` already exists. (`docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md:968`)
- **Phase E spec lines 517-535**: Defines the pr-review-loop mod with three hooks (merge, idle, startup). Merge hook drafts PR summary, asks captain approval, pushes + creates PR. Idle hook polls `gh pr view --json state,reviews,mergeable`. Startup hook mirrors idle (defense in depth). (`docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md:517-535`)
- **Phase E spec line 450**: "Mod: `mods/pr-review-loop.md` (new, replaces `mods/pr-merge.md` behavior)" -- confirming the new mod is the canonical shipped-stage mod. (`docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md:450`)
- **FO shared core step 4** (line 18): Currently scans only `{workflow_dir}/_mods/*.md`. Captain decision (Q-1) requires scanning both `mods/` (library) and `{workflow_dir}/_mods/` (workflow-specific). (`references/first-officer-shared-core.md:18`)
- **FO shared core Mod Hook Convention** (line 334): "Mods live in `{workflow_dir}/_mods/` and use `## Hook: {point}` headings." -- must be updated to reflect layered architecture. (`references/first-officer-shared-core.md:334`)

### Existing Patterns

- **workflow-index-maintainer.md** (mods/): Uses YAML frontmatter (name, description, version), `## Hook: startup`, `## Hook: idle` sections with numbered instruction lists. Version 0.1.0. Error handling section with rate-limit / transient / parse error categories. Rules section with invariants. (`mods/workflow-index-maintainer.md:1-106`)
- **pr-merge.md library copy** (mods/): Version 0.9.0. Three hooks (startup, idle, merge). Merge hook has PR APPROVAL GUARDRAIL pattern -- present summary, wait for explicit approval. Startup/idle hooks scan for non-empty `pr` field and check PR state via `gh pr view`. (`mods/pr-merge.md:1-47`)
- **pr-merge.md workflow copy** (docs/build-pipeline/_mods/): Version 0.8.2. Identical structure to library copy but older version. This is the one activated for the build-pipeline workflow. Captain decision (Q-2): replace this with `_mods/pr-review-loop.md`. (`docs/build-pipeline/_mods/pr-merge.md:1-47`)
- **Merge-hook test fixture** (tests/fixtures/merge-hook-pipeline/): Minimal pipeline with README.md (3-stage: backlog/work/done), `_mods/test-hook.md` (single merge hook that appends slug to `_merge-hook-fired.txt`), entity file, and status script. This is the pattern to distill from. (`tests/fixtures/merge-hook-pipeline/`)

### Library/API Surface

- **kc-pr-create skill**: Full PR lifecycle skill at `~/.claude/plugins/local/kc-pr-flow/skills/kc-pr-create/SKILL.md`. 14-step process: Analyze, E2E suggestion, Title (conventional commit), Body (template-aware), Confirm, Create (--draft), Annotate, Confirm comments, Post comments, Linear comment, Self-review loop, Mark ready, CI+AI gate, Announce. Supports `--draft-only` and `--max-rounds N` flags. Creates draft PR by default in ship mode. (`kc-pr-create/SKILL.md:1-452`)
- **kc-pr-review-resolve skill**: PR review comment triage skill at `~/.claude/plugins/local/kc-pr-flow/skills/kc-pr-review-resolve/SKILL.md`. 9-step process: Detect PR, Fetch feedback (inline threads + PR-level reviews + reviewer metadata), Validate threads (dispatch review agents), Triage & report, Fix valid issues, Push & reply, Request re-review, AI response monitoring, Learning. Has user confirmation gate at Step 4. (`kc-pr-review-resolve/SKILL.md:1-360`)
- Both skills are invoked via `Skill("kc-pr-flow:kc-pr-create")` and `Skill("kc-pr-flow:kc-pr-review-resolve")` -- standard Skill tool invocation pattern.

### Known Gotchas

- **Dual mod scan paths**: FO shared core currently hardcodes `{workflow_dir}/_mods/*.md` only. Adding `mods/` scan requires careful ordering -- library mods run first (alphabetical within `mods/`), then workflow-specific mods (alphabetical within `_mods/`). If both directories have a mod with the same `name:` frontmatter field, the workflow-specific version overrides.
- **Captain approval guardrail timing**: The mod's merge hook must preserve the captain approval gate from pr-merge.md. The kc-pr-create skill has its own Step 4 "Confirm" gate. The mod should delegate approval to the skill rather than implementing its own pre-skill gate, avoiding double-confirmation. However, the FO merge hook contract (FO shared core lines 317-319) expects the mod to handle merge, so the mod must at minimum present context to the skill.
- **Entity `pr` field lifecycle**: When merge hook sets `pr: #N`, FO shared core step 318-319 says "If a merge hook created or set a `pr` field, report the PR-pending state and do not local-merge." Idle/startup hooks must check this field to detect PR state changes. Field must be cleared on MERGED (along with archival) or on CLOSED (with captain direction).
- **Skill availability**: kc-pr-flow is an external plugin. Mod must handle the case where the skill is not available (plugin not installed). Graceful fallback: warn captain and suggest manual PR creation or installing the plugin.

### Reference Examples

- **workflow-index-maintainer.md**: Primary structural reference for mod format, hook organization, error handling, and rules sections. (`mods/workflow-index-maintainer.md:1-106`)
- **pr-merge.md**: Primary behavioral reference for PR lifecycle hooks -- startup/idle scanning, merge guardrail, entity `pr` field management. New mod inherits this behavior and extends it with skill delegation and review closed-loop. (`mods/pr-merge.md:1-47`)
- **test fixture pattern**: `tests/fixtures/merge-hook-pipeline/` -- README.md with `commissioned-by: spacedock@test`, `_mods/` directory, entity file, status script. (`tests/fixtures/merge-hook-pipeline/`)

## PLAN

### Goal

Create `mods/pr-review-loop.md` with skill-delegating design, update FO shared core for layered mod scanning, swap `docs/build-pipeline/_mods/pr-merge.md` for `_mods/pr-review-loop.md`, and write mod-hook fixture tests satisfying Phase E SC#5.

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - mods/pr-merge.md
    - mods/workflow-index-maintainer.md
    - docs/build-pipeline/_mods/pr-merge.md
    - references/first-officer-shared-core.md
    - tests/fixtures/merge-hook-pipeline/README.md
    - tests/fixtures/merge-hook-pipeline/_mods/test-hook.md
  </read_first>

  <action>
  Environment verification. Confirm all preconditions hold:
  1. `mods/pr-merge.md` exists (library mod, v0.9.0) -- will NOT be deprecated per Q-2
  2. `mods/workflow-index-maintainer.md` exists (v0.1.0) -- peer mod for structural reference
  3. `docs/build-pipeline/_mods/pr-merge.md` exists (v0.8.2) -- will be replaced by pr-review-loop.md
  4. `references/first-officer-shared-core.md` line 18 scans only `{workflow_dir}/_mods/*.md`
  5. `references/first-officer-shared-core.md` line 334 says "Mods live in `{workflow_dir}/_mods/`"
  6. `tests/fixtures/merge-hook-pipeline/` exists with README.md, _mods/test-hook.md, entity, status
  7. No file named `mods/pr-review-loop.md` exists yet
  8. No file named `docs/build-pipeline/_mods/pr-review-loop.md` exists yet

  Run:
  ```bash
  test -f mods/pr-merge.md && echo "OK: mods/pr-merge.md" || echo "FAIL: mods/pr-merge.md missing"
  test -f mods/workflow-index-maintainer.md && echo "OK: mods/workflow-index-maintainer.md" || echo "FAIL"
  test -f docs/build-pipeline/_mods/pr-merge.md && echo "OK: _mods/pr-merge.md" || echo "FAIL"
  test -f references/first-officer-shared-core.md && echo "OK: FO shared core" || echo "FAIL"
  grep -n '_mods/\*\.md' references/first-officer-shared-core.md
  test -d tests/fixtures/merge-hook-pipeline && echo "OK: fixture dir" || echo "FAIL"
  test ! -f mods/pr-review-loop.md && echo "OK: pr-review-loop.md does not exist yet" || echo "FAIL: already exists"
  test ! -f docs/build-pipeline/_mods/pr-review-loop.md && echo "OK: _mods/pr-review-loop.md does not exist yet" || echo "FAIL: already exists"
  ```

  If any check fails, STOP and report before proceeding.
  </action>

  <acceptance_criteria>
    - All 8 checks print "OK"
    - `grep` output shows line 18 with `{workflow_dir}/_mods/*.md`
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - mods/pr-merge.md
    - mods/workflow-index-maintainer.md
    - docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md (lines 517-535)
  </read_first>

  <action>
  Create `mods/pr-review-loop.md` -- the library mod with three hooks (startup, idle, merge) that delegates PR creation to `kc-pr-flow:kc-pr-create` and review triage to `kc-pr-flow:kc-pr-review-resolve`.

  **Frontmatter** (matching workflow-index-maintainer.md pattern):
  ```yaml
  ---
  name: pr-review-loop
  description: Skill-delegating PR lifecycle mod with review closed-loop. Creates PRs via kc-pr-create, triages review feedback via kc-pr-review-resolve, and polls PR state for merge/archive advancement.
  version: 0.1.0
  ---
  ```

  **Intro paragraph**: Explain the mod replaces the hardcoded PR logic in pr-merge.md with a thin-wrapper skill-delegating design following the entity 062 lesson (mods should be skill callers, not skill re-implementations).

  **## Hook: startup**
  Instructions for FO:
  1. Scan entity files in `{workflow_dir}/` (not `_archive/`) for entities with non-empty `pr` field and non-terminal status.
  2. For each, extract PR number and check: `gh pr view {number} --json state,reviewDecision --jq '.state + "|" + .reviewDecision'`
  3. If `MERGED` -- advance entity to terminal stage (set status, completed, verdict: PASSED, clear worktree, archive, cleanup). Report to captain.
  4. If `CLOSED` (without merge) -- report to captain with options: reopen, new PR, or clear `pr` and fall back to local merge. Wait for direction.
  5. If state is `OPEN` and `reviewDecision` is `CHANGES_REQUESTED` -- invoke `Skill("kc-pr-flow:kc-pr-review-resolve")` to triage and address review comments. If skill unavailable, warn captain: "kc-pr-flow plugin not installed. Review comments need manual triage."
  6. If `OPEN` with no action needed -- no action.
  7. If `gh` is not available -- warn captain, skip PR checks.

  **## Hook: idle**
  Instructions for FO:
  Same PR-state scanning logic as startup hook (defense in depth). Additionally:
  1. Scan entities with non-empty `pr` and non-terminal status.
  2. Run `gh pr view {number} --json state,reviewDecision,mergeable`
  3. MERGED -- advance and archive (same as startup).
  4. CLOSED -- report to captain (same as startup).
  5. `CHANGES_REQUESTED` -- invoke `Skill("kc-pr-flow:kc-pr-review-resolve")` for automated triage. The skill handles: fetch unresolved threads, validate each thread, classify, present triage report, fix valid issues, push, reply to threads, request re-review.
  6. APPROVED + mergeable -- merge and archive.
  7. OPEN + pending -- no action.

  **## Hook: merge**
  Instructions for FO:
  1. Gather entity context for PR creation:
     - Entity title, slug, ID
     - Branch name from worktree
     - Stage Reports summary (key outcomes from each completed stage)
     - Files changed (from most recent `## Files Modified` section)
  2. Invoke `Skill("kc-pr-flow:kc-pr-create", args="--draft-only")` to create the PR. The skill handles: branch push, conventional commit title, PR body generation, captain confirmation gate (Step 4 of the skill), draft PR creation, self-review annotations, and Linear comment.
     - Pass entity context to the skill invocation so it can build an informed PR body.
     - The skill's own Step 4 confirmation gate serves as the captain approval guardrail -- the mod does NOT add a separate pre-skill approval gate (avoids double-confirmation).
  3. If kc-pr-flow plugin is not available: fall back to the pr-merge.md manual flow -- present PR summary to captain, wait for explicit approval, `git push origin {branch}`, `gh pr create --base main --head {branch}`. This preserves the captain approval guardrail even without the skill.
  4. After PR creation (by skill or fallback): set entity `pr` field to the PR number (e.g., `#57`). Report to captain.
  5. Do NOT archive yet. Entity stays at current stage with `pr` set until PR is merged (detected by startup or idle hook).

  **## Error Handling** (matching workflow-index-maintainer.md pattern):
  - Rate limit (429): stop hook execution, log to captain, continue FO flow. Next idle tick retries.
  - Skill unavailable: warn captain, fall back to manual flow (merge hook) or skip (startup/idle hooks).
  - `gh` CLI unavailable: warn captain, skip PR operations.
  - Parse errors on entity frontmatter: log entity slug, skip, continue.
  - Eventually-consistent -- mod errors must not block FO startup or entity dispatch.

  **## Rules**:
  - Thin wrapper principle: mod describes when to call skills and what context to pass. Never re-implements skill logic.
  - Captain approval preserved: either via kc-pr-create's built-in Step 4 gate, or via manual fallback's explicit approval prompt.
  - Never modify entity frontmatter except `pr` field at merge time. All other frontmatter changes are FO's responsibility.
  - Separate concerns: PR creation (merge hook) and PR monitoring (startup + idle hooks) are independent. A startup hook failure does not affect merge hook operation.
  </action>

  <acceptance_criteria>
    - `test -f mods/pr-review-loop.md` succeeds
    - `grep -c '## Hook:' mods/pr-review-loop.md` returns 3 (startup, idle, merge)
    - `grep 'kc-pr-flow:kc-pr-create' mods/pr-review-loop.md` finds the skill invocation in merge hook
    - `grep 'kc-pr-flow:kc-pr-review-resolve' mods/pr-review-loop.md` finds the skill invocation in idle hook
    - `grep 'kc-pr-flow:kc-pr-review-resolve' mods/pr-review-loop.md` finds the skill invocation in startup hook
    - `grep -c 'gh pr create' mods/pr-review-loop.md` returns at most 1 (only in fallback section, never as primary flow)
    - `grep 'version: 0.1.0' mods/pr-review-loop.md` matches frontmatter
  </acceptance_criteria>

  <files_modified>
    - mods/pr-review-loop.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1">
  <read_first>
    - references/first-officer-shared-core.md
    - mods/workflow-index-maintainer.md
  </read_first>

  <action>
  Update `references/first-officer-shared-core.md` for layered mod architecture (Q-1 answer + AC5).

  **Change 1 -- Startup step 4** (line 18):
  Replace:
  ```
  4. Discover mod hooks by scanning `{workflow_dir}/_mods/*.md` for `## Hook:` sections. Register `startup`, `idle`, and `merge` hooks in alphabetical order by mod filename.
  ```
  With:
  ```
  4. Discover mod hooks by scanning two directories for `## Hook:` sections:
     a. **Library mods**: `mods/*.md` (repo root) -- shared across all workflows in this project.
     b. **Workflow mods**: `{workflow_dir}/_mods/*.md` -- workflow-specific activation and overrides.
     Register `startup`, `idle`, and `merge` hooks. Within each directory, process files in alphabetical order. Library mods run before workflow mods. If a library mod and a workflow mod share the same `name:` frontmatter field, the workflow mod overrides (the library mod is skipped for that name).
  ```

  **Change 2 -- Mod Hook Convention section** (line 334):
  Replace:
  ```
  ## Mod Hook Convention

  Mods live in `{workflow_dir}/_mods/` and use `## Hook: {point}` headings.
  ```
  With:
  ```
  ## Mod Hook Convention

  Mods use a layered architecture with two directories:

  - **Library** (`mods/` at repo root): Shared mod definitions available to all workflows. Contains canonical implementations (e.g., `pr-review-loop.md`, `workflow-index-maintainer.md`, `pr-merge.md`).
  - **Workflow-specific** (`{workflow_dir}/_mods/`): Per-workflow mod activation. A workflow activates a library mod by placing a copy or override in `_mods/`. Workflow mods with the same `name:` frontmatter as a library mod override the library version.

  Both directories use `## Hook: {point}` headings.
  ```

  **Change 3 -- Merge and Cleanup section** (around line 317):
  After the line "1. Run registered merge hooks before any local merge, archival, or status advancement." add a note:
  ```
  The `pr-review-loop` mod (library: `mods/pr-review-loop.md`) is the canonical merge hook for PR-based workflows. It delegates PR creation to `kc-pr-flow:kc-pr-create` and review triage to `kc-pr-flow:kc-pr-review-resolve`. When this mod is active, its merge hook handles branch push and PR creation -- FO skips the default local merge per step 2.
  ```

  **Change 4 -- Brainstorm Triage section** (around lines 111-172):
  The Brainstorm Triage section references express/standard/full profiles that no longer exist in the README. The pipeline now uses a single flat stage list with no profile branching. Replace the profile-dependent routing logic:
  - Remove the "5/5 + small (express path)" subsection that recommends assigning `profile: express`
  - Remove the "≤4/5 (captain choice path)" three-option routing (A/B/C paths)
  - Replace with a simplified flow: FO presents executability score to captain, then advances to next stage. No profile assignment gate since all entities traverse the full pipeline.
  - Keep the 5-criteria executability assessment table (Intent clear, Approach decidable, Scope bounded, Verification possible, Size estimable) -- it's still useful as a pre-dispatch health check even without profile routing.
  - Update the "Gate Resolution" subsection to remove profile assignment (`profile: {full|standard|express}`) -- gate simply approves advancement to next stage.
  </action>

  <acceptance_criteria>
    - `grep 'mods/\*\.md' references/first-officer-shared-core.md` finds the library scan path
    - `grep '_mods/\*\.md' references/first-officer-shared-core.md` finds the workflow scan path
    - `grep 'pr-review-loop' references/first-officer-shared-core.md` finds the Merge and Cleanup reference
    - `grep 'layered' references/first-officer-shared-core.md` finds the layered architecture description
    - `grep 'Library mods' references/first-officer-shared-core.md` finds the library-before-workflow ordering
    - `grep -c 'express' references/first-officer-shared-core.md` returns 0 (profile references removed)
    - `grep 'Executability' references/first-officer-shared-core.md` still finds the assessment table
  </acceptance_criteria>

  <files_modified>
    - references/first-officer-shared-core.md
  </files_modified>
</task>

<task id="task-3" model="haiku" wave="2">
  <read_first>
    - docs/build-pipeline/_mods/pr-merge.md
    - mods/pr-review-loop.md
  </read_first>

  <action>
  Replace `docs/build-pipeline/_mods/pr-merge.md` with `docs/build-pipeline/_mods/pr-review-loop.md` (Q-2 answer: activation swap, not deprecation).

  1. Delete `docs/build-pipeline/_mods/pr-merge.md`.
  2. Create `docs/build-pipeline/_mods/pr-review-loop.md` as a full copy of the library mod `mods/pr-review-loop.md` (created by task-1). Add a note at the top of the body text: "This is the build-pipeline activation of `mods/pr-review-loop.md`. Keep in sync with the library version."

  Rationale for full copy: The FO layered scan (task-2) specifies that when a library mod and workflow mod share the same `name:` frontmatter, the workflow mod overrides the library mod entirely. A workflow mod with no `## Hook:` sections would override the library mod and result in no hooks executing. Therefore, the workflow `_mods/` file must include all three hook definitions. This mirrors the existing pattern where `_mods/pr-merge.md` (v0.8.2) was a copy of `mods/pr-merge.md` (v0.9.0).
  </action>

  <acceptance_criteria>
    - `test ! -f docs/build-pipeline/_mods/pr-merge.md` succeeds (old file deleted)
    - `test -f docs/build-pipeline/_mods/pr-review-loop.md` succeeds (new file created)
    - `grep -c '## Hook:' docs/build-pipeline/_mods/pr-review-loop.md` returns 3
    - `grep 'name: pr-review-loop' docs/build-pipeline/_mods/pr-review-loop.md` matches
    - `grep 'kc-pr-flow:kc-pr-create' docs/build-pipeline/_mods/pr-review-loop.md` finds skill invocation
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/_mods/pr-merge.md
    - docs/build-pipeline/_mods/pr-review-loop.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2">
  <read_first>
    - tests/fixtures/merge-hook-pipeline/README.md
    - tests/fixtures/merge-hook-pipeline/_mods/test-hook.md
    - tests/fixtures/merge-hook-pipeline/merge-hook-entity.md
    - tests/fixtures/merge-hook-pipeline/status
    - mods/pr-review-loop.md
  </read_first>

  <action>
  Create mod-hook fixture tests for pr-review-loop, distilled from `tests/fixtures/merge-hook-pipeline/`. This satisfies Phase E SC#5's "pass mod-hook fixture tests" requirement.

  Create directory `tests/fixtures/pr-review-loop-pipeline/` with these files:

  **1. `tests/fixtures/pr-review-loop-pipeline/README.md`**
  Minimal workflow definition for testing pr-review-loop hooks:
  ```yaml
  ---
  mission: PR review loop mod hook test
  entity-label: task
  entity-label-plural: tasks
  id-style: sequential
  commissioned-by: spacedock@test
  stages:
    defaults:
      worktree: false
      fresh: false
      gate: false
      concurrency: 2
    states:
      - name: execute
        initial: true
      - name: shipped
        terminal: true
  ---
  ```
  Body: brief description of the fixture -- "A minimal 2-stage workflow for testing that pr-review-loop mod hooks fire correctly at merge (shipped) stage, idle, and startup."

  Stages section documenting execute and shipped stages. Commit discipline section.

  **2. `tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md`**
  A test-instrumented version of the mod. Same `name: pr-review-loop` frontmatter. Three hooks:

  - `## Hook: startup`: Write `startup:{slug}` to `{workflow_dir}/_hook-log.txt`. Then check if entity has `pr: #test-123` -- if so, write `startup:pr-check:{slug}` to the log.
  - `## Hook: idle`: Write `idle:{slug}` to `{workflow_dir}/_hook-log.txt`. Then check if entity has `pr: #test-123` -- if so, write `idle:pr-check:{slug}` to the log.
  - `## Hook: merge`: Write `merge:{slug}` to `{workflow_dir}/_hook-log.txt`. Then write `merge:skill-delegate:{slug}` to the log (simulating skill delegation -- actual kc-pr-flow is not available in test context). Set entity `pr: #test-456`.

  This test mod verifies:
  - All 3 hooks fire at the correct lifecycle points
  - Startup and idle hooks detect entities with `pr` field
  - Merge hook sets the `pr` field (simulating kc-pr-create output)

  **3. `tests/fixtures/pr-review-loop-pipeline/pr-review-loop-entity.md`**
  Test entity:
  ```yaml
  ---
  id: "001"
  title: PR review loop test entity
  status: execute
  score: 0.90
  source: test
  started:
  completed:
  verdict:
  worktree:
  pr:
  ---
  ```
  Body: "Test entity for pr-review-loop mod hook verification."

  **4. `tests/fixtures/pr-review-loop-pipeline/pr-review-loop-entity-with-pr.md`**
  Test entity with existing PR (for startup/idle hook testing):
  ```yaml
  ---
  id: "002"
  title: PR review loop entity with existing PR
  status: shipped
  score: 0.90
  source: test
  started: 2026-04-12T00:00:00Z
  completed:
  verdict:
  worktree:
  pr: "#test-123"
  ---
  ```
  Body: "Test entity with pre-existing PR for startup/idle hook detection testing."

  **5. `tests/fixtures/pr-review-loop-pipeline/status`**
  Bash status script following the merge-hook-pipeline pattern. 2-stage pipeline (execute, shipped). Supports `--next` for dispatch detection. Same structure as `tests/fixtures/merge-hook-pipeline/status` but with the 2-stage array.
  Make executable: `chmod +x tests/fixtures/pr-review-loop-pipeline/status`
  </action>

  <acceptance_criteria>
    - `test -d tests/fixtures/pr-review-loop-pipeline` succeeds
    - `test -f tests/fixtures/pr-review-loop-pipeline/README.md` succeeds
    - `grep 'commissioned-by: spacedock@test' tests/fixtures/pr-review-loop-pipeline/README.md` matches
    - `test -f tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md` succeeds
    - `grep -c '## Hook:' tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md` returns 3
    - `test -f tests/fixtures/pr-review-loop-pipeline/pr-review-loop-entity.md` succeeds
    - `test -f tests/fixtures/pr-review-loop-pipeline/pr-review-loop-entity-with-pr.md` succeeds
    - `grep 'pr: "#test-123"' tests/fixtures/pr-review-loop-pipeline/pr-review-loop-entity-with-pr.md` matches
    - `test -x tests/fixtures/pr-review-loop-pipeline/status` succeeds (executable)
    - `bash tests/fixtures/pr-review-loop-pipeline/status` runs without error
    - `bash tests/fixtures/pr-review-loop-pipeline/status --next` outputs the execute-stage entity as dispatchable
  </acceptance_criteria>

  <files_modified>
    - tests/fixtures/pr-review-loop-pipeline/README.md
    - tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md
    - tests/fixtures/pr-review-loop-pipeline/pr-review-loop-entity.md
    - tests/fixtures/pr-review-loop-pipeline/pr-review-loop-entity-with-pr.md
    - tests/fixtures/pr-review-loop-pipeline/status
  </files_modified>
</task>

<task id="task-5" model="haiku" wave="3">
  <read_first>
    - mods/pr-review-loop.md
    - docs/build-pipeline/_mods/pr-review-loop.md
    - references/first-officer-shared-core.md
    - tests/fixtures/pr-review-loop-pipeline/README.md
    - tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md
  </read_first>

  <action>
  Final cross-file consistency verification. Check that all artifacts are consistent:

  1. Verify mod name consistency:
     ```bash
     grep 'name: pr-review-loop' mods/pr-review-loop.md
     grep 'name: pr-review-loop' docs/build-pipeline/_mods/pr-review-loop.md
     grep 'name: pr-review-loop' tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md
     ```
     All three must return exactly `name: pr-review-loop`.

  2. Verify hook count consistency:
     ```bash
     grep -c '## Hook:' mods/pr-review-loop.md
     grep -c '## Hook:' docs/build-pipeline/_mods/pr-review-loop.md
     grep -c '## Hook:' tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md
     ```
     Library and workflow mods must return 3. Test mod must return 3.

  3. Verify FO shared core references both scan paths:
     ```bash
     grep 'mods/\*\.md' references/first-officer-shared-core.md
     grep '_mods/\*\.md' references/first-officer-shared-core.md
     ```

  4. Verify FO shared core references pr-review-loop in Merge and Cleanup:
     ```bash
     grep 'pr-review-loop' references/first-officer-shared-core.md
     ```

  5. Verify old _mods/pr-merge.md is deleted:
     ```bash
     test ! -f docs/build-pipeline/_mods/pr-merge.md && echo "OK: pr-merge.md deleted" || echo "FAIL"
     ```

  6. Verify library pr-merge.md is untouched (not deprecated per Q-2):
     ```bash
     grep 'version: 0.9.0' mods/pr-merge.md && echo "OK: library pr-merge.md unchanged"
     ```

  7. Verify fixture test infrastructure:
     ```bash
     bash tests/fixtures/pr-review-loop-pipeline/status --next
     ```

  If any check fails, report the specific failure for correction.
  </action>

  <acceptance_criteria>
    - All 7 verification groups pass
    - `grep` commands return expected matches
    - `test` commands return expected results
    - Status script runs and shows dispatchable entity
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

## UAT Spec

### Browser

None

### CLI

- [ ] `test -f mods/pr-review-loop.md` -- library mod exists
- [ ] `grep -c '## Hook:' mods/pr-review-loop.md` returns 3 -- all three hooks present
- [ ] `grep 'kc-pr-flow:kc-pr-create' mods/pr-review-loop.md` -- merge hook delegates to skill
- [ ] `grep 'kc-pr-flow:kc-pr-review-resolve' mods/pr-review-loop.md` -- idle/startup hooks delegate to skill
- [ ] `grep -c 'gh pr create' mods/pr-review-loop.md` returns at most 1 -- only in fallback path
- [ ] `test -f docs/build-pipeline/_mods/pr-review-loop.md` -- workflow activation exists
- [ ] `test ! -f docs/build-pipeline/_mods/pr-merge.md` -- old activation removed
- [ ] `grep 'pr-review-loop' references/first-officer-shared-core.md` -- FO shared core updated
- [ ] `grep 'mods/\*\.md' references/first-officer-shared-core.md` -- library scan path in FO
- [ ] `bash tests/fixtures/pr-review-loop-pipeline/status` -- fixture status script runs
- [ ] `bash tests/fixtures/pr-review-loop-pipeline/status --next` -- shows dispatchable entity
- [ ] `grep -c '## Hook:' tests/fixtures/pr-review-loop-pipeline/_mods/pr-review-loop.md` returns 3

### API

None

### Interactive

- [ ] Captain verifies pr-review-loop.md merge hook describes the captain approval guardrail (either via kc-pr-create Step 4 or via manual fallback prompt)
- [ ] Captain verifies FO shared core layered mod scan semantics are correct (library before workflow, name-based override)

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC1: mods/pr-review-loop.md exists with startup, idle, merge hooks | task-1 | `test -f mods/pr-review-loop.md && grep -c '## Hook:' mods/pr-review-loop.md` | pending | -- |
| AC2: merge hook invokes kc-pr-create via Skill tool | task-1 | `grep 'kc-pr-flow:kc-pr-create' mods/pr-review-loop.md` | pending | -- |
| AC3: idle hook detects changes_requested and routes to kc-pr-review-resolve | task-1 | `grep 'changes_requested' mods/pr-review-loop.md && grep 'kc-pr-flow:kc-pr-review-resolve' mods/pr-review-loop.md` | pending | -- |
| AC4: _mods/pr-merge.md replaced with _mods/pr-review-loop.md | task-3 | `test ! -f docs/build-pipeline/_mods/pr-merge.md && test -f docs/build-pipeline/_mods/pr-review-loop.md` | pending | -- |
| AC5: FO shared core references pr-review-loop + layered mod scan | task-2 | `grep 'pr-review-loop' references/first-officer-shared-core.md && grep 'mods/\*\.md' references/first-officer-shared-core.md` | pending | -- |
| SC#5: fixture tests exist (distilled from merge-hook-pipeline) | task-4 | `test -d tests/fixtures/pr-review-loop-pipeline && bash tests/fixtures/pr-review-loop-pipeline/status --next` | pending | -- |
| Cross-file consistency | task-5 | All 7 verification groups pass | pending | -- |

## Stage Report: plan

- [x] Research: identify and investigate topics needing research before planning
  5 research domains covered inline (Upstream Constraints, Existing Patterns, Library/API Surface, Known Gotchas, Reference Examples) with file:line citations
- [x] Write PLAN with task breakdown (wave-parallel where possible)
  6 tasks across 4 waves: wave 0 (env verification), wave 1 (mod creation + FO update in parallel), wave 2 (activation swap + fixture tests in parallel), wave 3 (cross-file consistency)
- [x] Write UAT Spec with test items covering all 5 ACs + fixture tests
  12 CLI items, 2 interactive items, covering AC1-AC5 + SC#5
- [x] Write Validation Map linking plan tasks to ACs
  7 rows mapping all ACs + SC#5 + cross-file consistency to tasks and commands
- [x] Self-review the plan for completeness
  Inline 7-dimension plan-checker pass: 0 blockers, 0 warnings. Task-3 action cleaned up (removed deliberation text). All ACs covered, wave dependencies correct, no placeholders.
- [x] Call workflow-index append for CONTRACTS.md tracking
  9 append entries covering all files_modified across 4 tasks (task-1: 1 file, task-2: 1 file, task-3: 2 files, task-4: 5 files). Commit: 5fa33bd

### Summary

Plan produces 6 tasks in 4 waves for implementing the pr-review-loop mod with layered mod architecture. Wave 1 creates the library mod and updates FO shared core in parallel. Wave 2 swaps the workflow activation and creates fixture tests in parallel. Wave 3 runs cross-file consistency verification. Knowledge capture skipped -- no findings met D1/D2 threshold (layered mod architecture is new, needs execution validation before capture). Plan-checker verdict: PASS after 1 iteration (inline evaluation, no blockers).
