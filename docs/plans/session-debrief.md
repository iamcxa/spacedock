---
id: 054
title: Session debrief command
status: ideation
source: CL
started: 2026-03-27T07:25:00Z
completed:
verdict:
score:
worktree:
---

A command or skill that captures what happened during a session — tasks processed, decisions made, lessons learned — and produces a structured record that feeds forward into the next session.

Should answer: what did we ship, what did we learn, what's next?

## Problem Statement

Context is lost between sessions. When CL starts a new session with the first officer, it has no memory of what happened last time — what was shipped, what decisions were made, what got deferred. The `status --next` view shows what's dispatchable but not *why* things are in the state they're in. The git log has the raw commits but not the reasoning behind them. Archived task files have stage reports, but no one reads 15 archived files to get session context.

Without a debrief record:
- The first officer dispatches work without knowing what was tried before or what decisions shaped the current state.
- CL has to re-explain context that was already established in the prior session.
- Lessons learned (process issues, bugs found, scope changes) evaporate.
- There's no handoff artifact — each session starts cold.

## Proposed Approach

### Skill, not agent capability

This should be a skill (`/spacedock:debrief`), not built into the first officer. Rationale:

1. **Separation of concerns.** The first officer orchestrates dispatch; debrief is a distinct operation that happens at session boundaries. Embedding it in the first officer would bloat an already long agent prompt.
2. **Captain-initiated.** The captain decides when to debrief — it's not something that should auto-trigger. A skill gives the captain explicit control via `/spacedock:debrief`.
3. **Consistency.** Commission and refit are skills. Debrief follows the same pattern.
4. **Flexibility.** A skill can be invoked outside the first-officer context too (e.g., CL runs it standalone to review what happened).

### Hybrid: automated extraction + optional captain commentary

The debrief should do the heavy lifting automatically (parse git log + task state), then pause for the captain to add commentary. Structure:

1. **Auto-extract** from git and task files (fast, no LLM analysis needed for extraction)
2. **Present the draft** to the captain for review
3. **Captain adds/edits** commentary, decisions, lessons — or confirms as-is
4. **Write the debrief file**

### Output format: markdown file in `_debriefs/` directory

Each debrief is a markdown file at `{dir}/_debriefs/{date}-{sequence}.md` (e.g., `_debriefs/2026-03-27-01.md`). YAML frontmatter with session metadata, then structured sections.

Why `_debriefs/` (underscore-prefixed, like `_archive/`):
- Convention: underscore prefix = system directory, not an entity
- Lives inside the workflow directory, co-located with the entities it describes
- The status script already skips underscore directories

### How the next session consumes it

The first officer's startup sequence gains one step: after running `status --next`, check for the most recent debrief file in `_debriefs/` and read it. This is a small addition to the startup — read one file for context on what happened last.

The debrief file is designed to be self-contained: reading just the latest one gives enough context for the next session. Older debriefs accumulate as a session history log but don't need to be read every time.

## Data Sources and Extraction

### 1. Session boundary detection

Determine the git commit range for "this session." Two approaches, in order of preference:

- **Explicit anchor:** If a previous debrief exists in `_debriefs/`, read its `last-commit` frontmatter field. The current session starts from the next commit after that.
- **Fallback:** If no prior debrief exists, use a reasonable default — last 24 hours, or all commits since the last `done:` commit (indicating a completed entity).

The skill prompts the captain to confirm or adjust the session boundary.

### 2. Commits made (git log)

```bash
git log {from}..HEAD --oneline -- {dir}
```

Scoped to the workflow directory. Shows actual work product. Group by entity slug (parse commit messages for entity names).

### 3. Task state changes (frontmatter diff)

For each entity that changed status during the session:
- What stage transitions happened (parsed from commit messages: `dispatch:`, `done:`)
- Current state of each entity

### 4. Gate decisions

Scan commit messages and task files for gate-related activity:
- Approved gates (entity advanced past a gated stage)
- Rejected gates (entity sent back for redo or discarded)
- Extract the reasoning if available from stage reports

### 5. Bugs and fixes

Commits with `fix:` prefix in the workflow directory. Also scan for any entity whose stage report mentions FAIL items.

### 6. What's next

Run `status --next` to show dispatchable entities. Also flag entities that are gate-blocked (waiting for captain).

## Debrief File Format

```yaml
---
session-date: 2026-03-27
sequence: 1
first-commit: abc1234
last-commit: def5678
duration: 2h30m  # approximate, from commit timestamps
---
```

```markdown
# Session Debrief — 2026-03-27 #1

## Work Completed
- [entity slug] — completed {stage}: {one-line summary}
- [entity slug] — completed {stage}: {one-line summary}

## Commits
{grouped by entity, formatted list}

## Decisions
{captain-contributed: why gates were approved/rejected, scope changes, course corrections}

## Issues Found
{bugs discovered, process problems, anything that went wrong}

## Observations
{captain-contributed: design insights, process improvements, things to remember}

## What's Next
- {entity slug} — ready for {next stage}
- {entity slug} — blocked at gate, needs review
- {entity slug} — deferred: {reason}
```

## Open Questions (Resolved)

**Q: Should `_debriefs/` be in `.gitignore`?**
A: No. Debriefs are part of the project record and should be committed. They're lightweight text files.

**Q: Should the first officer auto-trigger debrief at shutdown?**
A: No. The captain explicitly invokes it. The first officer can *remind* the captain ("Consider running `/spacedock:debrief` before ending the session") but should not auto-generate one.

## Acceptance Criteria

1. A `/spacedock:debrief` skill exists at `skills/debrief/SKILL.md` following the same SKILL.md format as commission and refit.
2. The skill identifies the workflow directory (same pattern as refit: ask if not provided).
3. The skill determines session boundaries from the most recent debrief's `last-commit` field, or falls back to a reasonable heuristic, and confirms with the captain.
4. The skill auto-extracts: commits (scoped to workflow dir), task state changes, gate decisions, and dispatchable entities.
5. The skill presents the draft debrief to the captain and pauses for commentary (decisions, observations, issues).
6. The skill writes the debrief to `{dir}/_debriefs/{date}-{sequence}.md` with YAML frontmatter and structured sections.
7. The skill commits the debrief file.
8. The first-officer template gains a startup step: read the latest debrief from `_debriefs/` for session context (after status, before dispatch). This is a template change in `templates/first-officer.md`, not a change to any commissioned first-officer instance.
9. The debrief file uses only data available from git and local files — no external services.

## Stage Report: ideation

- [x] Problem statement: why sessions need a debrief (context loss between sessions, no record of decisions)
  See "Problem Statement" section — context loss, cold starts, evaporating lessons
- [x] Proposed approach: skill vs agent capability, automated vs interactive, output format
  Skill at `/spacedock:debrief`, hybrid auto-extract + captain commentary, markdown in `_debriefs/`
- [x] Data sources identified and extraction method for each
  Six sources: session boundary (prior debrief anchor), git log, frontmatter diffs, gate decisions, fix commits, status --next
- [x] How the next session consumes the debrief
  First officer reads latest file from `_debriefs/` during startup, after status check
- [x] Acceptance criteria written
  Nine acceptance criteria covering skill creation, extraction, captain interaction, output, and first-officer integration
