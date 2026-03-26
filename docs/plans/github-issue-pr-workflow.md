---
id: 042
title: GitHub issue reference and PR workflow integration
status: ideation
source: CL
started: 2026-03-26T00:00:00Z
completed:
verdict:
score:
worktree:
---

How should Spacedock pipelines incorporate GitHub issue references and PR workflows? Tasks in a pipeline often correspond to GitHub issues, and implementation work naturally produces PRs. Currently there's no structured way to link these.

## Problem Statement

Pipeline tasks and GitHub artifacts are separate worlds with no linkage:

1. **Issue tracking duplication** — A task exists in the pipeline (`docs/plans/foo.md`) and may also exist as a GitHub issue. There's no way to cross-reference them. The `source` field sometimes says "CL" or "testflight-005" but never links to an issue number.

2. **Worktree branches have no PRs** — The first officer creates `ensign/{slug}` branches for worktree stages and merges them with `git merge --no-commit` at the terminal stage. These branches never become PRs, so there's no GitHub-native review surface, no CI checks, and no record in the repo's PR history.

3. **Validation gate vs. PR review** — The pipeline has an approval gate at validation where the captain reviews the ensign's work. GitHub has PR review. These are parallel review mechanisms that could be unified or at least connected.

## Analysis

### What's the actual pain?

Looking at the Spacedock pipeline itself (42 tasks processed), the practical gaps are:

- **No way to reference the upstream issue** that motivated a task. When CL files a task based on a GitHub issue, the connection is informal (the `source` field or a mention in the body text).
- **No PR for code review**. Worktree branches get merged directly. For Spacedock's own development this has been fine (CL reviews via the approval gate), but for team projects where PRs are the standard review surface, this is a gap.
- **No CI integration**. Worktree branches aren't pushed, so CI never runs on them. Validation relies entirely on the ensign running tests locally.

### What's NOT a pain (yet)?

- Automatic issue creation from tasks — YAGNI. Tasks are already well-structured markdown files. Creating a GitHub issue for every task would be duplication.
- Bidirectional sync between issues and tasks — way too complex for v0. Issues and tasks serve different audiences (GitHub users vs. pipeline operators).

## Proposed Approach

### Two optional frontmatter fields

Add `issue` and `pr` as optional fields to the entity schema:

```yaml
---
id: 042
title: GitHub issue reference and PR workflow integration
status: ideation
source: CL
started: 2026-03-26T00:00:00Z
completed:
verdict:
score:
worktree:
issue:
pr:
---
```

- **`issue`** — A GitHub issue reference (e.g., `#42` or `owner/repo#42`). Set manually when creating a task from an issue, or by the captain at any time. Never auto-created.
- **`pr`** — A GitHub PR reference (e.g., `#57` or `owner/repo#57`). Set when a PR is created for the task's worktree branch. Can be set by the first officer or manually.

Both fields are plain strings. No validation, no API calls to verify they exist. The value is human-readable cross-reference, not programmatic integration.

### PR creation at the merge boundary

Currently, the first officer's merge step (step 7) does:

```bash
git merge --no-commit ensign/{slug}
# update frontmatter, archive, commit
git worktree remove ...
git branch -d ...
```

The proposed change adds an optional PR path. When the pipeline's README frontmatter includes `pr-workflow: true`, the first officer's merge step changes to:

1. **Push the branch**: `git push origin ensign/{slug}`
2. **Create the PR**: `gh pr create --base main --head ensign/{slug} --title "{entity title}" --body "..."`
3. **Record the PR**: Set the `pr` field in frontmatter to the PR number.
4. **Do NOT merge locally**. The PR is the merge mechanism now. The first officer reports the PR to the captain and waits.
5. **After PR is merged** (detected by polling or on next session startup): clean up the worktree and branch, archive the entity.

This replaces the local `git merge --no-commit` path when PR workflow is enabled.

### Interaction with approval gates

The validation stage has `gate: true`, meaning the captain must approve before the entity advances to `done`. When PR workflow is enabled:

- The validation gate and the PR review can be the **same review**. The captain reviews the PR on GitHub (sees the diff, CI results, etc.) and either merges or requests changes.
- If the captain merges the PR, that signals approval. The first officer detects the merge and advances the entity to `done`.
- If the captain requests changes, the first officer can relay this to the ensign (if still alive) or re-dispatch for a redo.

This means the approval gate for the terminal transition becomes "PR merged" rather than "captain says approved in the conversation." The pipeline still tracks the transition — it just uses PR state as the signal.

### Pipeline-level opt-in

The `pr-workflow` setting goes in the README frontmatter:

```yaml
stages:
  defaults:
    worktree: false
    concurrency: 2
  pr-workflow: true
  states:
    ...
```

When `pr-workflow: false` (default), the pipeline works exactly as it does today — local merge, no PRs, no GitHub dependency.

### What changes where

| Component | Change |
|-----------|--------|
| **README schema** | Add `issue` and `pr` as optional fields in the entity template. Document them in the Field Reference. |
| **README frontmatter** | Add `pr-workflow` as an optional pipeline-level setting (default: false). |
| **First-officer template** | Add PR creation step in the merge procedure when `pr-workflow: true`. Add PR state detection on startup (check if PRs were merged while offline). |
| **Commission SKILL.md** | Add `issue` and `pr` to generated entity template. Ask or infer `pr-workflow` setting during commission (default: false unless the mission suggests team collaboration). |
| **Status script** | No change needed — `issue` and `pr` are optional display fields that can be added later if useful. |

## Scope Control

**In scope (minimal useful integration):**
- `issue` and `pr` frontmatter fields (passive references)
- `pr-workflow` pipeline-level opt-in
- First officer creates PR instead of local merge when `pr-workflow: true`
- First officer detects merged PRs on startup to advance entities

**Out of scope:**
- Automatic GitHub issue creation from tasks
- Bidirectional issue-task sync
- PR review comment parsing for automated redo dispatch
- CI status checks as validation input
- Issue/PR fields in the status script output

## Acceptance Criteria

- [ ] Entity schema includes optional `issue` and `pr` string fields
- [ ] README frontmatter supports `pr-workflow: true/false` (default false)
- [ ] First-officer template pushes branch and creates PR at merge boundary when `pr-workflow: true`
- [ ] First-officer template detects merged PRs on startup and advances entities to terminal stage
- [ ] Commission skill generates `issue` and `pr` fields in entity template
- [ ] Commission skill asks about or infers `pr-workflow` setting
- [ ] Existing pipelines with `pr-workflow: false` (or unset) continue to work unchanged
- [ ] PR body includes entity title and a link back to the entity file

## Open Questions

1. **Should `pr-workflow` be per-stage or per-pipeline?** Per-pipeline is simpler and covers the main use case (all worktree work goes through PRs, or none does). Per-stage would allow e.g. implementation goes through PRs but validation doesn't — but that seems unlikely. Leaning toward: per-pipeline.

2. **How does the first officer detect a merged PR on startup?** It can run `gh pr list --state merged --head ensign/{slug}` for each entity with a non-empty `pr` field and an active status. If the PR is merged, advance to done. This is polling, not webhook-based, which is fine for session-based operation.

3. **What about draft PRs?** The first officer could create draft PRs early (at implementation dispatch) so CI runs against in-progress work. This is a nice-to-have but adds complexity — the first officer would need to push branch updates during the ensign's work, not just at the end. Leaning toward: v0 creates non-draft PRs only at the merge boundary. Draft PRs can be a follow-up.

4. **What if `gh` CLI isn't available?** Fall back to local merge. The first officer should check for `gh` availability before attempting PR creation and warn the captain if it's missing.
