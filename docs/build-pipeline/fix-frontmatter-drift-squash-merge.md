---
id: 098
title: "Fix frontmatter drift on squash merge — reconcile from main before PR"
status: clarify
context_status: ready
source: /build
created: 2026-04-14T12:30:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: bugfix
scale: Small
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
---

## Directive

> Fix frontmatter drift on squash merge -- PR branch entity files carry stale frontmatter (status stuck at plan) because FO updates frontmatter on main while workers write body on branch. Squash merge overwrites main's shipped/completed/verdict/pr fields with branch's stale values. Root cause: entity file serves dual role (state machine in frontmatter + work record in body) but squash merge treats the whole file as one unit. Fix: in pr-review-loop mod's merge hook, before PR creation, reconcile entity frontmatter by taking main's frontmatter + branch's body. This ensures the squash merge carries the correct shipped state. Scale: Small (mod hook logic only, no schema changes).

## Captain Context Snapshot

- **Repo**: main @ df6ad97
- **Session**: Entities 054/057/059 all hit this bug — after squash merge, frontmatter reverted to `status: plan` despite FO having advanced them to shipped on main.
- **Domain**: Behavioral/Callable, Readable/Textual, Organizational/Data-transforming
- **Related entities**: 054/057/059 (all archived — hit frontmatter drift bug), 062 (dogfood — confirmed FO-managed frontmatter lifecycle)
- **Created**: 2026-04-14T12:30:00+08:00

## Brainstorming Spec

**APPROACH**: Before the merge hook invokes `kc-pr-create` (or the manual fallback), add a pre-PR reconciliation step to the pr-review-loop mod's `## Hook: merge` section. The step reads the entity file's frontmatter from `main` branch (via `git show main:{entity_file_path}` and extracting the YAML block), then reads the body (markdown below the closing `---`) from the current feature branch. It writes a reconciled entity file — main's frontmatter joined to branch's body — back to the feature branch, commits that reconciliation commit, and only then proceeds to PR creation. This means the squash merge absorbs a branch file that already carries main's authoritative frontmatter, eliminating the drift. The reconciliation commit message should be `chore(entity): reconcile frontmatter from main before PR` so it is identifiable in history.

**ALTERNATIVE**: Split the entity file into two files — a `{slug}.yaml` for FO-managed frontmatter state and a `{slug}.md` for worker-managed body content — so squash merge can never conflate the two. -- D-01: Schema split is a breaking change to every entity consumer (dashboard reads, grep patterns, FO file-path assumptions, workflow-index); the captain's directive explicitly scoped this as "mod hook logic only, no schema changes." The hook-level reconciliation fix achieves the same isolation without touching the schema.

**GUARDRAILS**:
- No schema changes: the fix must operate within the existing single-file entity format (YAML frontmatter + markdown body).
- Captain approval is preserved: the reconciliation step runs before `kc-pr-create`'s Step 4 gate; it must not short-circuit or duplicate that gate.
- The reconciliation commit must be a clean git commit on the feature branch — not an amend (main branch may have moved; fix-forward rule from MEMORY applies).
- If `git show main:{entity_file_path}` fails (entity is new, no counterpart on main), skip reconciliation and proceed — this is a greenfield entity, not a drift candidate.
- Both library mod (`mods/pr-review-loop.md`) and workflow activation (`docs/build-pipeline/_mods/pr-review-loop.md`) must be updated in sync; the workflow file has a keep-in-sync note.
- The "Never modify entity frontmatter except the `pr` field at merge time" rule in `## Rules` must be updated to reflect the new reconciliation exception.

**RATIONALE**: The hook-level reconciliation approach is the minimal viable fix: it corrects the root cause (stale branch frontmatter entering the squash merge) at the last possible moment before the merge is created, without changing the entity file schema, the dashboard, or any other consumer. The reconciliation commit is self-documenting in git history and idempotent — running it twice produces the same file since it always reads from current main.

## Acceptance Criteria

- Given an entity on a feature branch where `main`'s entity file has `status: shipped, verdict: PASSED, pr: "#48"` and the branch's entity file has `status: plan` in frontmatter, when the pr-review-loop merge hook runs the reconciliation step, then the resulting committed file on the branch has main's frontmatter + branch's body (how to verify: `git show HEAD:{entity_file}` on branch after reconciliation, parse YAML, assert status matches main's value)
- Given an entity file that exists only on the feature branch (no counterpart on main), when the reconciliation step runs, then it skips reconciliation without error and proceeds to PR creation (how to verify: confirm `git show main:{path}` returns non-zero exit, merge hook log shows skip message)
- Given both mod files are modified, when the `## Hook: merge` sections are compared, then the reconciliation step text is identical in both (how to verify: diff the sections, assert no output)
- Given the `## Rules` section, when read after the fix, then it contains an explicit reconciliation exception clause (how to verify: grep "reconcili" in mod file returns match in Rules section)

## Assumptions

A-1: Merge hook exists at correct insertion point (`mods/pr-review-loop.md` lines 47-69) with no reconciliation step present. The fix inserts before existing step 2 (kc-pr-create invocation).
Confidence: 🟢 Confident (0.95)
Evidence: `mods/pr-review-loop.md:47-69` -- Hook: merge section; step 1 gathers context, step 1.5 confidence check, step 2 invokes kc-pr-create. Reconciliation inserts between 1.5 and 2.
→ Confirmed: captain, 2026-04-14 (batch)

A-2: Workflow activation copy exists at `docs/build-pipeline/_mods/pr-review-loop.md` with explicit "Keep in sync with the library version" note.
Confidence: 🟢 Confident (0.95)
Evidence: `docs/build-pipeline/_mods/pr-review-loop.md:7` -- "This is the build-pipeline activation of mods/pr-review-loop.md. Keep in sync with the library version."
→ Confirmed: captain, 2026-04-14 (batch)

A-3: `git show main:{path}` reliably reads the latest main HEAD's entity file for frontmatter extraction.
Confidence: 🟢 Confident (0.90)
Evidence: standard git behavior; used extensively in FO worktree patterns for branch comparison. MEMORY.md "Worktree Drift at Merge" documents `git checkout --theirs` as a related pattern.
→ Confirmed: captain, 2026-04-14 (batch)

A-4: One entity per worktree branch — reconciliation handles one entity file per merge hook invocation.
Confidence: 🟡 Likely (0.75)
Evidence: FO dispatch creates one worktree per entity (README.md schema: `worktree` field is singular). Edge case: manual multi-entity branches are possible but not FO-managed.
→ Confirmed: captain, 2026-04-14 (batch)

## Option Comparisons

(none -- approach is unambiguous, single viable implementation path)

## Open Questions

(none from explore)

Q-1: Is the race condition between reconciliation and squash merge a concern?

Domain: Behavioral/Callable
Why it matters: If main moves between `git show main:{entity}` and the eventual squash merge, the reconciled frontmatter could be stale.
Suggested options: (a) Benign -- frontmatter is stable after shipped; (b) Add pre-merge re-check

→ Answer: Benign -- entity frontmatter reaches shipped before merge hook fires, FO does not modify after shipped. Other entities pushing to main don't affect THIS entity's frontmatter. Only risk is manual edits during PR review, which is a general PR workflow concern, not reconciliation-specific. (captain, 2026-04-14, interactive)

## Decomposition Recommendation

Not warranted. 2 files, both the same mod at library and workflow level. Indivisible.

## Canonical References

- `mods/pr-review-loop.md:47-69` -- merge hook section (insertion point)
- `docs/build-pipeline/_mods/pr-review-loop.md:7` -- sync note

## Stage Report: explore

- [x] Files mapped: 2 across mod (library + workflow activation)
  mods/pr-review-loop.md (library, insertion point lines 47-69); docs/build-pipeline/_mods/pr-review-loop.md (workflow copy, keep-in-sync)
- [x] Assumptions formed: 4 (Confident: 3, Likely: 1, Unclear: 0)
  A-1 insertion point (0.95), A-2 sync copy (0.95), A-3 git show (0.90), A-4 one entity per branch (0.75)
- [x] Options surfaced: 0
  Single viable implementation path
- [x] Questions generated: 0
  Directive is specific, all gray areas resolved as assumptions
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: Small confirmed
  2 files, both same mod at library/workflow level
- [x] Research dispatched: 0 researchers (skipped -- all assumptions internal git/codebase patterns)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- Small bugfix, 2 files
- [x] Re-validation: 4 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  Evidence verified same session
- [x] Assumptions confirmed: 4 / 4 (0 corrected)
  A-1 through A-4 confirmed via batch
- [x] Options selected: 0 / 0
  No option comparisons in entity
- [x] Questions answered: 1 / 1
  Q-1 race condition benign -- frontmatter stable after shipped
- [x] Open exploration: 1 gray area surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 1 via captain selection)
  Race condition between reconciliation and squash merge (Q-1) -- confirmed benign
- [x] Canonical refs added: 0
  2 refs already populated from explore
- [x] Context status: ready
  gate passed: all assumptions confirmed, all Qs answered. Ready for FO execution.
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 098" to advance
- [x] Clarify duration: 3 questions asked, session complete
  1 batch confirmation + 2 exploration iterations
