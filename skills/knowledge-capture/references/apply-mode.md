# knowledge-capture — apply mode

Apply mode runs inside the First Officer's `--agent` context where native AskUserQuestion works. Its job is to read pending D2 candidates from the entity body, present each to the captain one at a time, and apply approved edits to the target CLAUDE.md or review-lessons.md files.

## Caller

**Only** the First Officer should invoke this mode. The First Officer detects pending captures at step 3.6 of its "Completion and Gates" flow (see `references/first-officer-shared-core.md`) and calls knowledge-capture with `mode=apply` via the `Skill` tool.

Do NOT call apply mode from:
- Stage ensigns (they run as subagents without native AskUserQuestion)
- Mods (they are FO instructions, not execution vessels)
- Direct Agent dispatch (loses FO's captain context)

## Inputs

```yaml
mode: apply
entity_slug: {slug}
entity_path: docs/build-pipeline/{slug}.md
```

## Process

### Step 1: Read pending captures

Read the entity file. Find the `## Pending Knowledge Captures` section. If the section doesn't exist or is empty, return immediately with `{applied: 0, rejected: 0, modified: 0}`.

Parse all `<capture>` elements into a list.

### Step 2: Present each capture to captain

For each capture element, present via AskUserQuestion (one per message, never batched):

```
AskUserQuestion:
  question: "Knowledge capture candidate from entity {source_entity} ({source_stage} stage):

            FINDING: {finding text}

            PROPOSED TARGET: {target path}

            PROPOSED EDIT:
            {proposed_edit}

            How should I handle this?"
  options:
    - apply: "Apply as proposed (edit target file + commit)"
    - modify_target: "Apply but to a different target file"
    - reject: "Reject this capture (don't write anything)"
    - skip: "Skip for now, keep in pending for later review"
```

### Step 3: Handle captain response

**Case: apply**
1. Open target file with Read.
2. Compose the minimal Edit (old_string/new_string) that adds the proposed edit.
3. For CLAUDE.md targets, insert at the end of the most relevant section. Preserve all other content.
4. For review-lessons.md, append to the appropriate dated section.
5. Commit the change as its own separate commit:
   ```
   git add {target_file}
   git commit -m "docs: capture review lesson from {source_entity}"
   ```
6. Mark the `<capture>` element in the entity body as `status="applied"` (Edit the entity file to add the attribute).

**Case: modify_target**
1. Ask a secondary AskUserQuestion: "Which target? Options: project CLAUDE.md / module CLAUDE.md ({subdir}/CLAUDE.md) / review-lessons.md / user-global CLAUDE.md (rare)"
2. Use captain's choice as the new target.
3. Proceed with Edit + commit as in apply case, but using the new target.
4. For user-global target, add a secondary confirmation: "This will write to ~/.claude/CLAUDE.md affecting ALL your projects. Confirm?" Decline → fall back to project level.

**Case: reject**
1. Mark the `<capture>` element in the entity body as `status="rejected"` with captain's reason (optional follow-up question).
2. No Edit to target file; no commit.

**Case: skip**
1. Leave the `<capture>` element unchanged (still pending).
2. Continue to next capture.

### Step 4: Update entity body

After processing all captures, update the `## Pending Knowledge Captures` section:
- Keep captures marked `skipped` as the new pending list.
- Move `applied` and `rejected` captures to a `## Processed Knowledge Captures` section below for audit history.

If no captures remain (all applied/rejected), delete the Pending section entirely.

### Step 5: Final commit (entity body update)

Commit the entity body changes as a separate commit from the CLAUDE.md edits:

```
git add {entity_path}
git commit -m "chore(knowledge): process pending captures for {entity_slug}"
```

This keeps the CLAUDE.md edit commits atomic and reviewable independently.

## Return Summary

```yaml
applied: 2
rejected: 1
modified: 0
skipped: 1
commits_created: 3  # 2 CLAUDE.md edits + 1 entity body update
```

## Critical Invariants

- **Separate commits for each target file edit** — never bundle multiple CLAUDE.md edits into one commit. Each capture gets its own commit.
- **Entity body update is last** — commit CLAUDE.md edits first, then entity body. This preserves clean history if something goes wrong mid-apply.
- **Never silently apply** — every D2 write must go through AskUserQuestion. No "batch apply all" shortcut.
- **Preserve section ordering in target files** — use Edit with minimal old/new string, not Write. Unrelated sections must remain untouched.

## Error Handling

- If target file doesn't exist (e.g., no CLAUDE.md in the proposed subdirectory): present captain with options (create file / fall back to parent CLAUDE.md / skip).
- If Edit fails (old_string not found): report error to captain, mark capture as `error` status with the failure reason. Continue with next capture.
- If user cancels mid-stream (closes AskUserQuestion): preserve state (some applied, some still pending); do not rollback applied edits. Log a warning that apply was interrupted.
