---
name: workflow-index-maintainer
description: Maintains workflow-level coherence artifacts (CONTRACTS.md, DECISIONS.md, INDEX.md) by invoking the workflow-index skill at key lifecycle points. Keeps cross-entity coherence tracking up to date without cluttering each ensign's responsibilities.
version: 0.1.0
---

# workflow-index-maintainer

This mod extends the First Officer with automatic maintenance of the `docs/build-pipeline/_index/` directory. It ensures CONTRACTS.md, DECISIONS.md, and INDEX.md stay in sync with the current workflow state without requiring each stage ensign to know about index maintenance.

## Hook: startup

On First Officer startup, verify the index artifacts are fresh and rebuild if stale.

Instructions for FO:

1. Check the modification time of `docs/build-pipeline/_index/INDEX.md`.
2. Get the most recent modification time of any entity file in `docs/build-pipeline/*.md` (exclude `_index/` and `_mods/`).
3. If any entity file is newer than INDEX.md → INDEX is stale.
4. If stale, invoke the `workflow-index` skill with:
   ```yaml
   mode: write
   operation: rebuild
   target: index
   ```
5. The skill regenerates INDEX.md from current entity frontmatter.
6. Log to captain: "Workflow index refreshed (was stale)."

If INDEX.md is up-to-date, skip the rebuild and proceed to normal FO startup flow.

## Hook: idle

When the FO is idle (no entities dispatchable), scan for stage transitions that need CONTRACTS/DECISIONS updates.

Instructions for FO:

1. List all entity files in `docs/build-pipeline/*.md`.
2. For each entity, compare its current stage (from frontmatter `status` field) against the status recorded in CONTRACTS.md for that entity.
3. If the entity has advanced (e.g., was `execute` in CONTRACTS, now `shipped` in frontmatter):
   a. Invoke `workflow-index` skill:
      ```yaml
      mode: write
      target: contracts
      operation: update-status
      entry:
        entity: {slug}
        files: {files from entity's most recent Stage Report}
        new_status: {final if shipped, in-flight otherwise}
      ```
   b. If the new stage is `shipped` and the entity has been in shipped for > 30 days, run update-status with new_status=final and age-out logic (move to Recently Retired section).

4. Scan DECISIONS.md for any decisions whose Related entities field references entities that have since shipped. If any, ensure the decision's Status reflects the latest state (no action needed unless explicit supersede was flagged).

5. Rebuild INDEX.md (always, on every idle scan — it's cheap):
   ```yaml
   mode: write
   operation: rebuild
   target: index
   ```

6. Log summary to captain: "Workflow index updated: {n} contract updates, INDEX rebuilt."

## Rules

- **Never modify entity frontmatter from this mod.** The mod only reads entity state and writes to `_index/` files.
- **Workflow-index skill is the only writer.** This mod never directly edits CONTRACTS/DECISIONS/INDEX files; it always goes through the skill to preserve format invariants.
- **Separate commits per mod operation.** Each write operation commits independently with a `chore(index):` prefix.
- **Graceful on first run.** If `_index/` directory or files don't exist yet, the skill's write mode handles creation.
