# Decomposition Gate -- Step 0 Flow

The Decomposition Gate runs BEFORE any assumption batch or option/question loop. It handles
the case where build-explore flagged the entity as too large for a single pipeline pass and
wrote a `## Decomposition Recommendation` section.

## Detection

Read the entity body. If a `## Decomposition Recommendation` section exists, enter the gate.
If not, skip to Step 1.

## Presentation

Extract the suggested child list from the section. Present to the captain:

    Explore found this entity's scope is large ({n} files, {n} domains).
    Recommended split:

    1. {child-slug-1} -- {scope description} ({n} files)
    2. {child-slug-2} -- {scope description} ({n} files)
    3. {child-slug-3} -- {scope description} ({n} files)

    Dependencies: {ordering description}

    Options:
    a) Accept split -- I'll create child entities, this becomes an epic
    b) Modify split -- tell me what to change
    c) Reject split -- proceed as single entity

Use AskUserQuestion with exactly these 3 options. Header: "Decompose".

## Branch (a): Accept

For each child in the recommendation:

1. Invoke `/build` via Skill tool with the child's title + scope as the directive:

       Skill("spacedock:build", args: "{child title} -- {scope description}")

   This runs a fresh build-brainstorm pass. Each child gets its own draft entity file with
   full frontmatter and brainstorming spec.

2. After all children are created, collect their slugs.

3. Update the original entity frontmatter:

   ```yaml
   status: epic
   children: [child-slug-1, child-slug-2, child-slug-3]
   ```

4. For each child entity file, add frontmatter:

   ```yaml
   parent: {original-slug}
   ```

5. Commit with message:

   ```
   decompose: {original-slug} -> [{child1}, {child2}, {child3}]
   ```

6. Report to captain:

       Epic created. {n} child entities in draft:
         - {child1} (draft+pending)
         - {child2} (draft+pending)
         - {child3} (draft+pending)

       The epic itself is frozen -- FO will skip it. Child entities flow through the
       pipeline independently. When all children reach shipped, the epic auto-completes.

7. **EXIT build-clarify.** The epic does not continue through the pipeline. Do not enter
   Step 1.

## Branch (b): Modify

Prompt the captain with plain text:

    Tell me what to change -- add, remove, rename, or reorder children. Use freeform text
    (e.g., "merge child 1 and child 2", "add a fourth for migrations", "rename child 2 to
    dashboard-filter-chip-ui").

Parse the captain's response. Adjust the internal child list. Re-present the updated split
using the same format as the initial presentation, and ask again via AskUserQuestion with
the same 3 options.

Loop until the captain selects (a) Accept or (c) Reject.

## Branch (c): Reject

Remove the `## Decomposition Recommendation` section from the entity body entirely. Do not
leave a stub. Commit the removal as part of the Step 6 commit (not a separate commit).

Proceed to Step 1 (normal clarify flow) with the single-entity assumption.

## Resume Protocol

If the gate is interrupted (context pressure, captain walks away):

- The `## Decomposition Recommendation` section is still in the entity body.
- Next `/science {slug}` or science-officer invocation re-reads the entity and re-enters
  the gate from the top.
- No checkpoint file needed -- the entity body IS the checkpoint.
