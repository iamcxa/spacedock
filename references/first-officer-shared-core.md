# First Officer Shared Core

This file captures the shared first-officer semantics. Keep it aligned with `agents/first-officer.md` and the runtime adapters.

## Startup

1. Discover the project root with `git rev-parse --show-toplevel`.
2. Discover the workflow directory. Try sources in order, use the first match:
   1. **Explicit path** — if the user provided a workflow directory, use it directly.
   2. **Project-local** — search `{project_root}/` for `README.md` files whose YAML frontmatter contains `commissioned-by: spacedock@...`. Ignore `.git`, `.worktrees`, `node_modules`, `vendor`, `dist`, `build`, and `__pycache__`.
   3. **User-scoped** — search `~/.claude/workflows/` for `README.md` files with `commissioned-by: spacedock@...`. This allows cross-project workflows (e.g., a shared build pipeline) to live in a single user-level location.
   If multiple workflows are found across sources, list them and ask the captain which one to use.
3. Read `{workflow_dir}/README.md` to extract:
   - mission
   - entity labels
   - stage ordering, defaults, and **profile definitions** from `stages.profiles` / `stages.defaults` / `stages.states`
   - stage properties such as `initial`, `terminal`, `gate`, `worktree`, `concurrency`, `feedback-to`, and `agent`
4. Discover mod hooks by scanning `{workflow_dir}/_mods/*.md` for `## Hook:` sections. Register `startup`, `idle`, and `merge` hooks in alphabetical order by mod filename.
5. Run startup hooks before normal dispatch.
6. Detect orphaned worktree entities by checking `status --where "worktree !="` and report anomalies rather than auto-redispatching.
6.5. Check dashboard — read `~/.spacedock/dashboard/$(echo -n "{project_root}" | shasum | cut -c1-8)/channel_port`. If the file exists and `curl -sf http://127.0.0.1:$PORT/api/events` succeeds, the dashboard is running. If not running, prompt captain: "Dashboard is not running. It requires an active Claude Code session with the spacedock-dashboard MCP channel. Ensure .mcp.json has the spacedock-dashboard entry and restart Claude Code. (http://localhost:8420/)" Wait for captain response. Yes — guide captain to restart CC with the channel configured. No — skip.
7. Run `status --next` to identify dispatchable entities.

## Status Viewer

The status viewer ships with the plugin at `skills/commission/bin/status`. Resolve the plugin directory from the same root used to read these reference files.

Invoke it as:
```
python3 {spacedock_plugin_dir}/skills/commission/bin/status --workflow-dir {workflow_dir} [--next|--archived|--where ...]
```

Use this for all `status` calls: `--next`, `--where "pr !="`, `--where "worktree !="`, etc.

## Event Emission

The dashboard displays a real-time activity feed. Emit structured events at lifecycle boundaries by POSTing to the dashboard server. Determine the dashboard port from the same startup check (default 8420).

Event format:
```
curl -s -X POST http://localhost:${DASHBOARD_PORT}/api/events \
  -H 'Content-Type: application/json' \
  -d '{"type":"<TYPE>","entity":"<SLUG>","stage":"<STAGE>","agent":"<WORKER_KEY>-<SLUG>-<STAGE>","timestamp":"<ISO8601>","detail":"<OPTIONAL>"}'
```

Event types and injection points:

| Type | When | Detail field |
|------|------|-------------|
| `dispatch` | After step 6 (commit state transition) | "Entering {stage}" |
| `completion` | After step 2 of Completion (stage report reviewed) | "{N} done, {N} skipped, {N} failed" |
| `gate` | When presenting gate to captain | "Awaiting captain approval" |
| `feedback` | When bouncing entity back to feedback-to stage | "Rejected: {reason summary}" |
| `merge` | After successful merge/cleanup | "Merged to main" |
| `idle` | When no entities are dispatchable and idle hooks run | "No dispatchable entities" |

Rules:
- Emit events only when the dashboard is running (startup check passed or was explicitly started).
- If the `curl` POST fails (server unreachable), log a warning but do not block the workflow. Events are best-effort.
- Use `$(date -u +%Y-%m-%dT%H:%M:%SZ)` for the timestamp.
- The `agent` field uses the `worker_key-slug-stage` convention (e.g., `ensign-feat-a-execute`).

## Single-Entity Mode

When the user names a specific entity and asks to process it through the workflow, switch into single-entity mode.

Single-entity mode changes the normal event loop in these ways:
- scope dispatch to the named entity only
- resolve the entity reference against slugs, titles, and IDs and stop on ambiguity instead of guessing
- auto-resolve gates from the report verdict when no interactive operator is present
- skip operator prompting for orphan worktrees and choose the deterministic recovery path instead
- stop once the target entity reaches a terminal state or an irrecoverable blocked state
- if the workflow README defines a `## Output Format` section, use it for the final output; otherwise fall back to reporting status, verdict, and entity ID

## Working Directory

Your working directory stays at the project root. Do not `cd` into worktrees. Use:
- absolute paths
- `git -C {path}` for git operations outside the root
- worktree-local file paths only when operating inside that worktree

## Effective Stages

Before dispatching any entity, compute its effective stage list. This determines which stages the entity will pass through and what its next stage is.

```
effective_stages(entity):
  if entity has no profile assigned (profile field is empty):
    return full_pipeline_stage_order   # all stages from README states list

  if entity.profile not in known profiles:
    return full_pipeline_stage_order   # unknown profile — safe fallback

  base = profiles[entity.profile]      # e.g. ['brainstorm', 'explore', 'plan', 'execute', ...]
  kept = base - entity.skip_stages     # remove any skip-stages overrides

  # add-stages: insert at canonical position from full-pipeline order
  for stage in full_pipeline_order:
    if stage in kept OR stage in entity.add_stages:
      include it in result

  return result
```

**Recompute on every dispatch** — `effective_stages()` is stateless. Call it fresh at each advancement. This means profile or override changes take effect at the next transition without any special handling.

**Mid-pipeline profile changes:** Profile and override changes only affect stages **after** `current_stage`. Never re-dispatch a stage that already has a completed stage report. When determining the next stage, compare `entity.status` against the freshly-computed `effective_stages()` result — if `entity.status` is in the list, the next stage is the following entry. If `entity.status` is not in the list (stage was removed by an override applied after dispatch), find the first effective stage whose canonical index is greater than `entity.status`'s canonical index.

**Startup note:** Read `stages.profiles` from the README frontmatter alongside `stages.states`. The `status --next` output now includes PROFILE and DISPATCH columns — use these when deciding whether to dispatch an ensign or handle inline.

## Brainstorm Triage

When `status --next` shows an entity with `DISPATCH = (FO inline)`, handle it inline without dispatching an ensign. Perform triage immediately.

### Executability Assessment

Score the entity spec on 5 criteria (1 point each):

| Check | Pass when |
|-------|-----------|
| **Intent clear** | You know the outcome to achieve |
| **Approach decidable** | A method exists, OR the trade-off is clearly stated for captain to decide |
| **Scope bounded** | What NOT to touch is explicit — no scope-creep risk |
| **Verification possible** | Completion can be confirmed (test criteria or observable outcome) |
| **Size estimable** | Express / standard / full can be determined from the spec |

### Routing

**5/5 + small (express path):**
Post a profile recommendation to the captain and await gate approval:
```
Brainstorm: {entity title}

Executability: 5/5 ✅
Recommendation: express — {rationale (1-2 sentences)}

Approve to assign profile: express and advance to execute.
```
On captain approval: write `profile: express` to entity frontmatter (git commit on main), advance to next effective stage.

**≤4/5 (captain choice path):**
Present the gap and three options:
```
Brainstorm: {entity title}

Executability: {N}/5
Gap: {which criteria failed and why}

Options:
  A) Interactive brainstorm — walk through design together (superpowers:brainstorming)
  B) Ensign analysis — dispatch ensign to explore codebase, post approach options to dashboard
  C) Direct — you provide the approach, I'll update the spec

Which path? (A/B/C)
```

**Path A:** Invoke `Skill: "superpowers:brainstorming"`. After spec is produced, present profile recommendation and await gate.

**Path B:** Create a worktree for the entity (standard worktree creation flow). Dispatch an ensign with instructions to produce: codebase exploration, 2–3 approach options with tradeoffs, profile recommendation, and open questions. The ensign posts its analysis as a comment on the entity (read-only on spec body — no `update_entity` calls). After ensign completes, summarize the analysis to the captain. Captain may switch to Path A with ensign's analysis as context. Once captain decides on approach, FO updates spec via `update_entity`, presents profile recommendation, awaits gate.

**Path C:** Captain provides the approach directly in their response. FO updates the spec with the approach, presents profile recommendation, awaits gate.

Paths can sequence: B → captain reviews → switches to A. FO recommends a path based on executability score but captain always decides.

### Gate Resolution

Gate passes when the captain explicitly approves the profile assignment (dashboard button, comment, or channel message). On approval:
1. Write `profile: {full|standard|express}` to entity frontmatter via git commit on main
2. Advance entity to next stage per `effective_stages()`
3. Emit dispatch event for the new stage

Never self-approve the brainstorm gate. Do not infer approval from silence.

## Dispatch

For each entity reported by `status --next`:

1. Read the entity file and the target stage definition.
2. Build a numbered checklist from stage outputs and entity acceptance criteria.
3. Check for obvious conflicts if multiple worktree stages would touch overlapping files.
4. Determine `dispatch_agent_id` from the stage `agent:` property. Default to `ensign` when absent.
5. Update main-branch frontmatter for dispatch:
   - set `status: {next_stage}`
   - set `worktree: .worktrees/{worker_key}-{slug}` for worktree stages
   - set `started:` when the entity first moves beyond the initial stage
6. Commit the state transition on main with `dispatch: {slug} entering {next_stage}`.
6.5. Emit dispatch event: `curl -s -X POST http://localhost:${DASHBOARD_PORT}/api/events -H 'Content-Type: application/json' -d "{\"type\":\"dispatch\",\"entity\":\"${SLUG}\",\"stage\":\"${NEXT_STAGE}\",\"agent\":\"${WORKER_KEY}-${SLUG}-${NEXT_STAGE}\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"detail\":\"Entering ${NEXT_STAGE}\"}"` (skip if dashboard not running).
7. Create the worktree on first dispatch to a worktree stage.
8. Dispatch a fresh worker using the runtime-specific mechanism. The worker assignment must include:
   - entity identity and title
   - target stage name
   - the full stage definition
   - the entity path
   - the worktree path and branch when applicable
   - the checklist
   - feedback instructions when the stage has `feedback-to`
9. Wait for the worker result before advancing frontmatter or dispatching the next stage for that entity.

Feedback-stage worker instructions must preserve this rule: a review stage checks and reports on what was produced; it does not silently take over the prior stage's work.

## Completion and Gates

When a worker completes:

1. Read the entity file.
2. Review the `## Stage Report` section against the checklist. Every dispatched checklist item must be represented as DONE, SKIPPED, or FAILED.
3. If checklist items are missing, send the worker back once to repair the report.
3.5. Emit completion event with the checklist count summary as detail (skip if dashboard not running).
3.6. Process pending knowledge captures (Phase E addition):
   - Scan the entity file for a `## Pending Knowledge Captures` section containing `<capture>` elements.
   - If the section exists and is non-empty, invoke the `knowledge-capture` skill via the Skill tool with `mode: apply`, `entity_slug: {current slug}`, `entity_path: {entity file path}`.
   - Follow the skill's apply-mode instructions (see `skills/knowledge-capture/references/apply-mode.md`). AskUserQuestion calls inside the skill run in FO's `--agent` context where native UI works.
   - If the section is absent or empty, proceed immediately to step 4.
   - Rationale: stage ensigns cannot use AskUserQuestion themselves (they run as subagents). By staging D2 candidates in the entity body and having FO process them at completion time, we preserve the "captain-facing flows only happen in --agent context" invariant without adding a separate captain-gated stage.
4. Check whether the completed stage is gated.

The checklist review should produce an explicit count summary in the form:
- `{N} done, {N} skipped, {N} failed`

If the stage is not gated:
- advance normally
- if the next stage is terminal, continue into merge handling
- if the next stage has `feedback-to` pointing at the current stage, keep the current worker available for potential follow-up

If the stage is gated:
- emit gate event with detail "Awaiting captain approval" (skip if dashboard not running)
- never self-approve
- present the stage report to the human operator
- keep the worker alive while waiting at the gate
- if the stage is a feedback gate that recommends `REJECTED`, auto-bounce directly into the feedback rejection flow instead of waiting on manual review

## Feedback Rejection Flow

When a feedback stage recommends REJECTED:

1. Read the rejected stage's `feedback-to` target. That target names the stage that must receive the fix request, not the reviewer stage itself.
2. Track feedback cycles in a `### Feedback Cycles` section in the entity body.
3. If cycles reach 3, escalate to the human instead of dispatching another round.
4. Route the findings back to the target stage in the same worktree.
4.5. Emit feedback event with detail summarizing the rejection reason (skip if dashboard not running).
5. Re-run the reviewer after fixes.
6. Re-enter the normal gate flow with the updated result.

The first officer owns the `### Feedback Cycles` section and keeps it on the main branch.

## Merge and Cleanup

When an entity reaches its terminal stage:

1. Run registered merge hooks before any local merge, archival, or status advancement.
2. If a merge hook created or set a `pr` field, report the PR-pending state and do not local-merge.
3. If no merge hook handled the merge, perform the default local merge from the stage worktree branch.
3.5. After successful merge, emit merge event with detail "Merged to main" (skip if dashboard not running).
4. Set `completed:` and `verdict:` in frontmatter and clear `worktree:`.
5. Archive the entity into `{workflow_dir}/_archive/`.
6. Remove the worktree and delete the temporary branch after successful merge or deliberate discard.

## State Management

- The first officer owns YAML frontmatter on the main branch.
- Workers do not edit frontmatter.
- Assign sequential IDs by scanning both the active workflow directory and `_archive/`.
- Commit state changes at dispatch and merge boundaries.

## Mod Hook Convention

Mods live in `{workflow_dir}/_mods/` and use `## Hook: {point}` headings.

Supported lifecycle points:
- `startup`
- `idle`
- `merge`

Hooks are additive and run in alphabetical order by mod filename.

## Clarification and Communication

Ask the human before dispatch when:
- requirements are materially ambiguous
- a design choice would change output meaningfully
- scope is too unclear to turn into concrete criteria

If one entity is blocked on clarification, continue dispatching other ready entities.

Report workflow state once when you reach idle or a gate. Do not spam status updates while waiting.

## Channel Awareness

When the captain sends a message via the global channel without naming a specific entity, resolve the entity context using these rules in order:

1. **Single active entity** — only one entity has a non-empty `worktree` field → assume that entity. Proceed without asking.

2. **Recent activity** — exactly one entity had a stage transition or gate event in the last 5 minutes → assume that entity. Proceed without asking.

3. **Keyword match** — multiple entities are active, but the message contains words from one entity's title, slug, or current stage name → auto-match that entity. If the match is unambiguous, proceed without asking.

4. **Ambiguous** — multiple active entities and no clear keyword match → ask for clarification before acting:
   ```
   你是在講 {slug-A} 還是 {slug-B}?
   ```
   Wait for the captain to specify before acting.

5. **No active entities** — no entity has a non-empty `worktree` → treat the message as a workflow-level instruction (status check, configuration, general question). Do not invent an entity context.

These rules are workflow-agnostic. They apply regardless of which pipeline is running. Do not embed workflow-specific keywords or slug patterns in this logic — rely on the entity state at runtime.

## Scaffolding and Issue Filing

Treat these as scaffolding files:
- `skills/`
- `agents/`
- `references/`
- `plugin.json`
- workflow `README.md` files with `commissioned-by` frontmatter

Do not directly commit scaffolding changes without a tracking artifact such as a workflow task or approved issue. Do not file GitHub issues without explicit human approval.
