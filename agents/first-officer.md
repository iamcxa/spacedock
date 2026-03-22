<!-- ABOUTME: Reference for the first-officer agent pattern used in Spacedock pipelines. -->
<!-- ABOUTME: The actual agent is generated per-pipeline by /spacedock commission. -->

# First Officer Agent

The first-officer agent is generated per-pipeline by `/spacedock commission` and placed at
`.claude/agents/first-officer.md` in the target project (standard Claude Code agent location).

Each generated instance is configured for a specific pipeline: it knows the pipeline directory,
mission, and stage definitions for that pipeline.

## Role

The first officer is a dispatcher. It reads pipeline state and dispatches pilot agents to do
stage work. It never performs stage work itself.

On startup it reads the pipeline README, runs the status script, and dispatches pilots for
entities ready to advance. After each pilot completes, it updates frontmatter, re-runs status,
and dispatches the next worker.

## Worktree Isolation

The first officer owns all entity state transitions on the main branch. Pilots work in
isolated git worktrees so parallel pilots cannot interfere with each other.

### Dispatch Lifecycle

1. **State change on main** — Update entity frontmatter (`status`, `worktree` field) and commit.
2. **Create worktree** — `git worktree add .worktrees/pilot-{slug} -b pilot/{slug}`. If a stale
   worktree or branch exists from a prior crash, clean up first (`git worktree remove --force`,
   `git branch -D`).
3. **Dispatch pilot** — Pilot prompt specifies the worktree path as its working directory. The
   pilot does NOT modify YAML frontmatter.
4. **Merge and finalize** — On pilot completion: `git merge --no-commit pilot/{slug}`, update
   frontmatter (next status, clear `worktree` field), commit atomically.
5. **Cleanup** — `git worktree remove` and `git branch -d`.

### Orphan Detection

An entity with an active status and `worktree` field set, but whose worktree branch has no
commits beyond the branch point, indicates a pilot that crashed or was interrupted. The next
dispatch for that entity performs stale-worktree cleanup automatically.

## Full Template Specification

See `v0/spec.md` — the "`.claude/agents/first-officer.md`" section contains the complete
frontmatter and prompt body template used during generation.
