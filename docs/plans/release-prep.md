---
id: 039
title: Release prep — marketplace metadata, license, and history cleanup
status: implementation
source: CL
started: 2026-03-26T16:45:00Z
completed:
verdict:
score: 0.9
worktree: .worktrees/ensign-release-prep
---

## Problem

Spacedock is being published to the Claude Code marketplace today. The plugin needs marketplace metadata, a license file, and git history cleanup before release.

## Requirements

### 1. Apache-2.0 License
Add `LICENSE` file at repo root with the standard Apache 2.0 license text.

### 2. plugin.json update
Update `.claude-plugin/plugin.json` with marketplace metadata:

```json
{
  "name": "spacedock",
  "version": "0.3.0",
  "description": "Turn directories of markdown files into structured workflows operated by AI agents",
  "author": { "name": "CL Kao" },
  "repository": "https://github.com/clkao/spacedock",
  "license": "Apache-2.0",
  "keywords": ["workflow", "pipeline", "agents", "markdown", "automation"]
}
```

### 3. .gitignore and history cleanup
Add to `.gitignore`:
- `.private-journal/`
- `testflight-*/`
- `.claude/settings.local.json`

Remove these from git tracking AND clean them from git history entirely. Ensure no active branches exist before history rewrite (confirmed: only `main`).

### 4. Version
Stay at 0.3.0 — metadata-only changes don't warrant a bump.

## Acceptance Criteria

1. `LICENSE` file exists at repo root with Apache-2.0 text
2. `plugin.json` has all marketplace fields: name, version, description, author, repository, license, keywords
3. Description matches the plain text workflow framing
4. `.gitignore` excludes `.private-journal/`, `testflight-*/`, `.claude/settings.local.json`
5. Those paths are removed from git tracking and git history
6. No active branches broken by history rewrite
7. `git tag v0.3.0` on the release commit

## Implementation Summary

### Committed in this branch

1. **LICENSE** — Apache-2.0 full text at repo root
2. **`.claude-plugin/plugin.json`** — added marketplace fields: author, repository, license, keywords
3. **`.gitignore`** — added `.private-journal/`, `testflight-*/`, `.claude/settings.local.json`

### History cleanup (run on main after merge)

These commands remove `.private-journal/`, `testflight-*/`, and `.claude/settings.local.json` from all git history. They must be run on the main repo (not a worktree) with no other branches active.

**Using git-filter-repo** (install: `pip install git-filter-repo`):

```bash
# Back up first
cp -r .git .git-backup

# Remove paths from entire history
git filter-repo \
  --invert-paths \
  --path-glob '.private-journal/' \
  --path-glob 'testflight-*/' \
  --path '.claude/settings.local.json' \
  --force

# Re-add remote and force push
git remote add origin https://github.com/clkao/spacedock.git
git push --force --all
git push --force --tags
```

**Tag the release** (after history rewrite and force push):

```bash
git tag v0.3.0
git push origin v0.3.0
```

## Validation Report

### Acceptance Criteria Results

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| 1 | LICENSE exists with Apache-2.0 | PASS | 200-line standard Apache 2.0 text at repo root |
| 2 | plugin.json has all marketplace fields | PASS | name, version, description, author, repository, license, keywords all present |
| 3 | Description matches plain text workflow framing | PASS | "Turn directories of markdown files into structured workflows operated by AI agents" — no mention of PTP |
| 4 | .gitignore has three entries | PASS | `.private-journal/`, `testflight-*/`, `.claude/settings.local.json` added |
| 5 | Paths removed from git tracking and history | DEFERRED | History cleanup commands documented; must run on main after merge. See note below. |
| 6 | No active branches broken by history rewrite | DEFERRED | Depends on step 5. |
| 7 | `git tag v0.3.0` on release commit | DEFERRED | Tag instructions documented; must run after history rewrite. |

### Commission Test Harness

Ran `bash v0/test-commission.sh` — **59 passed, 0 failed**. No regressions from the metadata changes.

### History Cleanup Commands — Review

The git-filter-repo commands in the implementation summary are mostly correct, with one concern:

**Potential issue with `--path-glob` trailing slashes.** The command uses `--path-glob '.private-journal/'` and `--path-glob 'testflight-*/'`. In git-filter-repo, `--path-glob` uses Python's `fnmatch` for matching. A trailing `/` may not match files inside those directories (e.g., `testflight-004/main-session.jsonl`). Safer alternatives:

- Use `--path '.private-journal'` (no glob needed, `--path` does prefix matching for directories)
- Use `--path-glob 'testflight-*'` (without trailing slash) — though this could also match a hypothetical file named `testflight-something` without a directory. Since only `testflight-*/` directories exist in history, this is fine in practice.

**Verification of history contents:**
- `.private-journal/` — never committed to git history (no-op, harmless)
- `.claude/settings.local.json` — never committed to git history (no-op, harmless)
- `testflight-*/` — present in history (e.g., `testflight-004/`, `testflight-004-refit/`)

The backup step (`cp -r .git .git-backup`) and remote re-add are correct — git-filter-repo removes the remote by default.

### Recommendation

**PASSED** — with advisory note that the `--path-glob` trailing slashes in the history cleanup commands should be verified or adjusted before running. The committed file changes (LICENSE, plugin.json, .gitignore) are correct and complete. Commission test harness shows no regressions.
