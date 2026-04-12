---
name: pr-review-loop
description: Test-instrumented version of pr-review-loop mod for fixture hook verification
---

# pr-review-loop (Test Fixture)

A test-instrumented version of the pr-review-loop mod. Instead of delegating to real skills (kc-pr-create, kc-pr-review-resolve), this fixture version records hook invocations to `{workflow_dir}/_hook-log.txt` so tests can verify the correct hooks fire at the correct lifecycle events.

## Hook: startup

When this hook fires on FO startup, append a record to `{workflow_dir}/_hook-log.txt`:

```bash
echo "startup:{slug}" >> {workflow_dir}/_hook-log.txt
```

Replace `{slug}` with the actual entity slug. Replace `{workflow_dir}` with the actual workflow directory path.

If the entity has a non-empty `pr` field equal to `#test-123`, also append:

```bash
echo "startup:pr-check:{slug}" >> {workflow_dir}/_hook-log.txt
```

This simulates the PR state-check that the real mod performs on startup for in-flight entities with an associated PR.

## Hook: idle

When this hook fires on FO idle (no entities dispatchable), append a record to `{workflow_dir}/_hook-log.txt`:

```bash
echo "idle:{slug}" >> {workflow_dir}/_hook-log.txt
```

Replace `{slug}` with the actual entity slug. Replace `{workflow_dir}` with the actual workflow directory path.

If the entity has a non-empty `pr` field equal to `#test-123`, also append:

```bash
echo "idle:pr-check:{slug}" >> {workflow_dir}/_hook-log.txt
```

This simulates the defense-in-depth PR re-scan that the real mod performs on idle.

## Hook: merge

When this hook fires (entity has completed all pre-ship stages and the merge gate triggers), append records to `{workflow_dir}/_hook-log.txt`:

```bash
echo "merge:{slug}" >> {workflow_dir}/_hook-log.txt
echo "merge:skill-delegate:{slug}" >> {workflow_dir}/_hook-log.txt
```

Replace `{slug}` with the actual entity slug. Replace `{workflow_dir}` with the actual workflow directory path.

The `merge:skill-delegate:{slug}` line simulates the real mod's delegation to `Skill("kc-pr-flow:kc-pr-create")`.

After appending the log entries, set the entity's `pr` field to `#test-456` to simulate a PR having been created by the skill delegation. This mirrors the real mod's step 4: set `pr` field after PR creation.

Do NOT perform the actual merge. This hook only records invocation and updates the `pr` field.
