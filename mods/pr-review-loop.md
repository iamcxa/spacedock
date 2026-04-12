---
name: pr-review-loop
description: Skill-delegating PR lifecycle mod with review closed-loop. Creates PRs via kc-pr-create, triages review feedback via kc-pr-review-resolve, and polls PR state for merge/archive advancement.
version: 0.1.0
---

# pr-review-loop

This mod replaces the hardcoded PR logic in `docs/build-pipeline/_mods/pr-merge.md` with a thin-wrapper skill-delegating design following the entity 062 lesson: mods should be skill callers, not skill re-implementations. Where `pr-merge.md` embeds raw `gh pr create` commands and manual review logic, this mod delegates entirely to `kc-pr-flow:kc-pr-create` for PR creation and `kc-pr-flow:kc-pr-review-resolve` for review comment triage. The mod provides lifecycle hooks (when to act and what entity context to pass) while the skills own the implementation.

## Hook: startup

On First Officer startup, check whether any in-flight entities have an associated PR that changed state.

Instructions for FO:

1. Scan all entity files in `{workflow_dir}/` (not `_archive/`) for entities with a non-empty `pr` field and a non-terminal status.
2. For each, extract the PR number (strip any `#`, `owner/repo#` prefix) and check:
   ```
   gh pr view {number} --json state,reviewDecision --jq '.state + "|" + .reviewDecision'
   ```
3. If `MERGED` -- advance the entity to its terminal stage: set `status` to the terminal stage, `completed` to ISO 8601 now, `verdict: PASSED`, clear `worktree`, archive the file, and clean up any worktree/branch. Report each auto-advanced entity to the captain.
4. If `CLOSED` (closed without merge) -- report to the captain: "{entity title} PR #{number} was closed without merging. Options: reopen the PR, create a new PR from the same branch, or clear `pr` and fall back to local merge." Wait for the captain's direction before taking action.
5. If state is `OPEN` and `reviewDecision` is `CHANGES_REQUESTED` -- invoke `Skill("kc-pr-flow:kc-pr-review-resolve")` to triage and address review comments, passing entity slug and PR number as context. If the skill is unavailable, warn the captain: "kc-pr-flow:kc-pr-review-resolve is not available -- manual review triage required for PR #{number}."
6. If `OPEN` with no action needed (no review decision, or approved but not yet mergeable) -- no action.
7. If `gh` is not available -- warn the captain and skip all PR state checks for this startup cycle.

## Hook: idle

When the FO is idle (no entities dispatchable), re-scan PR state as a defense-in-depth check against missed state transitions from the startup hook.

Instructions for FO:

1. Scan all entity files in `{workflow_dir}/` (not `_archive/`) for entities with a non-empty `pr` field and a non-terminal status.
2. For each, extract the PR number and check:
   ```
   gh pr view {number} --json state,reviewDecision,mergeable --jq '.state + "|" + .reviewDecision + "|" + .mergeable'
   ```
3. If `MERGED` -- advance entity to terminal stage (set status, completed, verdict: PASSED, clear worktree, archive, cleanup). Report to captain.
4. If `CLOSED` (without merge) -- report to captain with options: reopen, new PR, or clear `pr` and fall back to local merge. Wait for direction.
5. If `OPEN` and `reviewDecision` is `CHANGES_REQUESTED` -- invoke `Skill("kc-pr-flow:kc-pr-review-resolve")` for automated triage. If unavailable, warn captain.
6. If `OPEN` and `reviewDecision` is `APPROVED` and `mergeable` is `MERGEABLE` -- merge the PR (`gh pr merge {number} --squash --auto`) and advance entity to terminal stage. Archive. Report to captain.
7. If `OPEN` and no action needed (awaiting review, review not yet submitted) -- no action.

## Hook: merge

When an entity's workflow stage triggers the merge gate (entity has completed all pre-ship stages), create a PR via the kc-pr-create skill.

Instructions for FO:

1. Gather entity context for PR creation:
   - Entity title, slug, and ID from frontmatter
   - Branch name (from `worktree` field or git)
   - Stage Reports (to populate PR body with context)
   - Files changed (from most recent Stage Report's `## Files Modified` section)
2. Invoke `Skill("kc-pr-flow:kc-pr-create", args="--draft-only")` with the entity context above. The skill's own Step 4 confirmation gate serves as the captain approval guardrail -- do NOT add a redundant approval prompt on top of the skill's gate.
3. If the `kc-pr-flow` plugin is not available: fall back to the `docs/build-pipeline/_mods/pr-merge.md` manual flow --
   - Present a PR summary to the captain: title, branch -> main, files changed, commit count
   - Wait for explicit captain approval ("push it", "go ahead", "yes", or equivalent). Do NOT infer approval from silence or prior gate approvals
   - On approval: `git push origin {branch}`, then `gh pr create --base main --head {branch} --title "{entity title}" --body "Workflow entity: {entity title}"`
   - On decline: ask the captain how to proceed (local merge, leave unmerged). Only act on explicit direction
   - This fallback preserves the captain approval guardrail even without the skill
4. After PR creation (skill or fallback): set the entity's `pr` field to the PR number (e.g., `#57`). Report PR URL to captain.
5. Do NOT archive yet. Entity stays at current stage with `pr` set until the PR is merged -- detected by the startup or idle hook on a future FO cycle.

## Error Handling

If any hook encounters an error:

- **Rate limit (429)**: Stop the current hook execution, log to captain ("{hook} hit rate limit, skipping PR checks"), continue FO flow. Do NOT retry in-session. The next idle hook tick will reconcile. Per `~/.claude/CLAUDE.md` Safety Rules: "Rate limits: Stop immediately, inform user, wait for instructions. No retry/sleep-and-retry."
- **Skill unavailable** (`kc-pr-flow:kc-pr-create` or `kc-pr-flow:kc-pr-review-resolve` not found): Warn captain, fall back to manual flow. Never silently skip.
- **`gh` unavailable**: Warn captain, skip all PR state checks for this hook cycle. Continue FO flow.
- **Parse errors** (malformed PR number, unexpected `gh` output format, missing entity fields): Log the entity slug and error, skip the affected entity, continue processing remaining entities. Never guess missing fields.
- **Entity frontmatter write failure** (setting `pr` field): Log, report to captain, do not retry. The captain can manually set the field or re-trigger the merge hook.

The PR lifecycle is eventually-consistent. Hook failures must never block FO startup or entity dispatch for unrelated entities.

## Rules

- **Thin wrapper principle**: This mod describes when to call skills and what context to pass. It never re-implements skill logic (no raw `gh pr create` calls except in the explicit skill-unavailable fallback path).
- **Captain approval preserved**: The merge hook relies on `kc-pr-create`'s Step 4 gate for approval. The manual fallback path has its own explicit approval prompt. Neither path pushes without captain authorization.
- **Never modify entity frontmatter** except the `pr` field at merge time (step 4 of the merge hook). All other frontmatter mutations (status, completed, verdict, worktree, archival) happen only in the MERGED advancement path.
- **Separate concerns**: PR creation (merge hook) and PR monitoring (startup + idle hooks) are independent. The merge hook does not poll; the startup/idle hooks do not create. This keeps each hook's blast radius small.
- **Supersedes `pr-merge.md`**: This mod is the canonical PR lifecycle mod. `docs/build-pipeline/_mods/pr-merge.md` is deprecated -- it is preserved for reference only until all documentation references are updated.
