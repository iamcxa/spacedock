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
3. For each entity, compare its current frontmatter state against CONTRACTS.md state. Two cases require action:

   **Case A — Entity in CONTRACTS and stage advanced** (e.g., CONTRACTS shows execute, frontmatter shows shipped):

   a. Read the entity's most recent Stage Report to recover the list of files it touched (see "Stage Report File List Contract" below). Invoke `workflow-index` skill **once** with the bulk operation:
      ```yaml
      mode: write
      target: contracts
      operation: update-status-bulk
      entry:
        entity: {slug}
        files: {list of file paths from entity Stage Report}
        new_status: {final if shipped, in-flight otherwise}
      ```
      Rationale: `update-status-bulk` in `skills/workflow-index/references/write-mode.md` accepts the full file list, loops per-row internally, and produces a single atomic commit (`chore(index): advance entity-{slug} contracts to {new_status} ({N} files)`). This replaces the earlier per-file loop that produced N commits per shipping event. The bulk variant was added during Phase E Plan 1 quality补洞 after pressure testing surfaced commit-granularity ambiguity in the single-file `update-status`.
   b. Recently Retired age-out is delegated to the skill. The mod simply calls `update-status-bulk` with `new_status: final`; the skill inspects each row's Last Updated date and, if older than 30 days, moves it to the Recently Retired section. See `skills/workflow-index/references/write-mode.md` Operation: update-status-bulk. **Known gap (tracked for Phase E Plan 1 follow-up):** write-mode currently has no explicit `shipped_date` input and must infer age from each row's Last Updated column. If that heuristic proves unreliable, extend the skill's input schema rather than duplicating the computation here.

   **Retired (2026-04-12, entity 062 Phase E Plan 4)**: Case B (retroactive CONTRACTS append for entities that skipped plan-time tracking) has been removed. The proper append path now lives in `skills/build-plan/SKILL.md` Step 9a (unconditional append at plan approval) and `skills/build-execute/SKILL.md` Step 2 (unconditional update-status-bulk at execute entry). Retroactive tracking is no longer needed because every entity acquires its CONTRACTS rows at plan time. See entity 062's Stage Report for the live verification that gated this deletion.

4. Scan DECISIONS.md for any decisions whose Related entities field references entities that have since shipped. If any, ensure the decision's Status reflects the latest state (no action needed unless explicit supersede was flagged).

5. Rebuild INDEX.md (always, on every idle scan — it's cheap):
   ```yaml
   mode: write
   operation: rebuild
   target: index
   ```

6. Log summary to captain: "Workflow index updated: {n} contract updates, INDEX rebuilt."

## Stage Report File List Contract

Case A of the idle hook extracts file lists from entity Stage Reports (Case B was retired 2026-04-12 per entity 062; retroactive tracking is no longer needed). Stage Reports MUST include a section titled `## Files Modified` with a bullet list of repo-relative file paths:

```markdown
## Files Modified

- tools/dashboard/src/ws-client.ts
- tools/dashboard/static/app.js
- tests/ws-client.test.ts
```

**If a Stage Report lacks this section or has an empty list**:

1. Log a warning: "Entity {slug} Stage Report has no `## Files Modified` section — skipping idle hook update for this entity"
2. **Skip** this entity. Do NOT infer file paths from narrative prose, from git log, or from commit diffs — format-guessing produces false positives (e.g., quoted example paths, unrelated entity references, file paths mentioned in "Open Questions"). The pressure test during Phase E Plan 1 quality补洞 confirmed that narrative extraction is unreliable.
3. Follow-up: manual reconciliation, or re-write the Stage Report with the required section and wait for the next idle hook tick.

**Cross-file contract**: this format requirement applies to every stage ensign's Stage Report template. Phase E Plan 3 `build-execute` skill must enforce the `## Files Modified` section in its Stage Report output format; similar requirement for Plans 4-5's quality/review/uat skills.

## Error Handling

If any `workflow-index` skill invocation fails during a hook:

- **Rate limit (429)**: Stop the current hook execution, log to captain ("{hook} hit rate limit, skipping"), continue FO flow. Do **NOT** retry in-session — the next idle hook tick will reconcile. Per `~/.claude/CLAUDE.md` Safety Rules: "Rate limits: Stop immediately, inform user, wait for instructions. No retry/sleep-and-retry."
- **Transient skill errors** (malformed input, missing entity file, parse failures, etc.): Log the specific entity/operation + reason, skip the affected entity, continue processing remaining entities. Do not abort the whole hook.
- **Parse errors** on entity frontmatter or Stage Report: Log the entity slug, skip, continue. Never guess missing fields or synthesize values.
- **INDEX.md rebuild failure during startup hook**: Graceful degradation — log, skip the rebuild, continue FO startup with stale INDEX. The idle hook will retry rebuild on next tick (step 5 always rebuilds, so staleness is self-healing).

**The index is eventually-consistent, not strongly-consistent.** Never block FO startup or entity dispatch on index maintenance failures.

## Rules

- **Never modify entity frontmatter from this mod.** The mod only reads entity state and writes to `_index/` files.
- **Workflow-index skill is the only writer.** This mod never directly edits CONTRACTS/DECISIONS/INDEX files; it always goes through the skill to preserve format invariants.
- **Separate commits per mod operation.** Each write operation commits independently with a `chore(index):` prefix. Case A bulk update and INDEX rebuild each get their own commit.
- **Graceful on first run.** If `_index/` directory or files don't exist yet, the skill's write mode handles creation.
