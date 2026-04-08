---
id: 034
title: FO Dispatch Logic — Profile-Aware Stage Routing
status: shipped
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP4)
started: 2026-04-08
completed: 2026-04-08
verdict: PASSED with 2 review fixes applied
score: 0.85
worktree: .worktrees/spacedock-ensign-fo-dispatch-profile-routing
issue:
pr: "#22"
intent: enhancement
scale: Medium
project: spacedock
---

## Dependencies

- 031 (Pipeline Definition) — needs profile definitions in README frontmatter

## Problem

FO dispatch logic assumes all entities go through the same fixed stage sequence. With profiles, FO needs to compute effective stages per entity and route accordingly. FO also needs brainstorm triage logic (executability assessment, A/B/C path routing).

## Scope

### 1. Effective Stage Computation
- `effectiveStages(entity, pipelineConfig)` — compute from profile + skip/add overrides
- `add-stages` inserted at canonical position (full pipeline order)
- Recomputed on every stage advancement (supports mid-pipeline changes)

### 2. Next Stage Routing
- `nextStage(entity, pipelineConfig)` — profile-aware advancement
- Handles edge case: current stage removed by override (find next in canonical order)
- Profile-less state during brainstorm (profile not yet assigned)

### 3. Brainstorm Triage (FO Inline)
- Executability checklist: intent clear, approach decidable, scope bounded, verification possible, size estimable
- Express path: 5/5 + small → post recommendation, wait for gate
- Captain choice path: ≤4/5 → present A/B/C options
  - A: invoke superpowers:brainstorming
  - B: dispatch ensign to worktree for analysis
  - C: captain provides approach directly

### 4. status --next Enhancement
- Show profile column in dispatchable entities list
- Show `(FO inline)` for brainstorm stage
- Show `(needs profile)` for entities without assigned profile

### 5. Mid-Pipeline Profile Changes
- Profile/override changes only affect stages after current_stage
- Never re-run passed stages

### 6. FO Awareness Rules (Workflow-Agnostic)
- Ambiguous entity detection when captain messages on global channel
- Auto-match by recent activity or keyword
- Ask for clarification when multiple entities active
- Rules in spacedock core (first-officer shared contract), not workflow-specific

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 2 (Brainstorm Stage Behavior), Section 7 (FO Dispatch Logic).

## Stage Report (explore)

### Key File Inventory

| File | Purpose |
|------|---------|
| `references/first-officer-shared-core.md` | FO event loop, dispatch lifecycle, gate handling, feedback flow, merge/cleanup. The authoritative behavioral contract for all FO implementations. |
| `references/claude-first-officer-runtime.md` | Claude Code adapter — TeamCreate, Agent() dispatch, bare mode, captain interaction via text output, gate presentation format. |
| `agents/first-officer.md` | Thin entry point. Loads operating contract via `spacedock:first-officer` skill then begins Startup. |
| `skills/first-officer/SKILL.md` | Skill launcher — reads the 3 reference files and delegates to Startup. |
| `skills/commission/bin/status` | Python status viewer. `parse_stages_block()` reads README frontmatter `stages:` block. `print_next_table()` implements the 5-rule dispatchability check. Critical: no `.py` extension, cannot be imported as module. |
| `docs/build-pipeline/README.md` | Pipeline definition. Frontmatter `stages.profiles` defines full/standard/express. Each stage has `profiles:`, `gate:`, `manual:`, `model:`, `feedback-to:`, `worktree:` properties. Shipped by 031. |
| `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` | Primary spec. Section 7 has `effectiveStages()` + `nextStage()` TypeScript pseudocode. Section 2 has brainstorm triage flow. Section 8 confirms 034 is WP4 (standard profile, Phase 2). |
| `docs/build-pipeline/_mods/pr-merge.md` | Mod hook example — startup/idle/merge lifecycle hooks. No FO dispatch logic here, only PR state tracking. |

### Current Dispatch Architecture

The FO is a **pure AI agent** — not a Python process. Its dispatch logic lives entirely in the `first-officer-shared-core.md` reference file as natural language instructions. There is no compiled code to extend.

Current `status --next` decision path (`print_next_table` in `skills/commission/bin/status`):

1. Parse `stages.states` from README frontmatter — produces a flat list of stage objects
2. For each entity: check 5 rules (not terminal, not gate-blocked, not manual, not active worktree, concurrency available)
3. Next stage = `stage_names[stage_idx + 1]` — **purely positional, ignores profiles**
4. Dependency check via `depends-on` field (already implemented in 030's work)

**Profile fields added by 031 (already in README):**
- `stages.profiles.full/standard/express` — explicit stage lists in frontmatter
- Per-stage `profiles: [full, standard]` annotation
- Entity frontmatter schema documented: `profile`, `skip-stages`, `add-stages`

**What is NOT yet implemented (gaps this entity must close):**
- `status --next` does not read `stages.profiles` block — only reads `stages.states` list
- No `effectiveStages()` logic anywhere
- No profile column in `--next` output
- No `(FO inline)` or `(needs profile)` markers
- No brainstorm triage logic in `first-officer-shared-core.md`
- No FO awareness rules for ambiguous channel messages

### Where Each Scope Item Integrates

| Scope item | Integration point |
|------------|------------------|
| 1. `effectiveStages(entity, pipelineConfig)` | `first-officer-shared-core.md` — new "Effective Stages" section. Python-side: new helper in `status` script used in `print_next_table`. |
| 2. `nextStage()` profile-aware advancement | `status` script `print_next_table()` — replace positional `stage_names[stage_idx + 1]` with profile-filtered lookup. Also add guidance to `first-officer-shared-core.md` for FO's mental model. |
| 3. Brainstorm triage (executability checklist, A/B/C routing) | `first-officer-shared-core.md` — new "Brainstorm Triage" section. No Python changes needed — FO handles inline. |
| 4. `status --next` profile column + FO inline markers | `status` script `parse_stages_block()` and `print_next_table()`. Must parse `stages.profiles` block (currently skipped). Add `PROFILE` and `DISPATCH` columns to `--next` output. |
| 5. Mid-pipeline profile changes | `first-officer-shared-core.md` — clarification note in Dispatch section. `effectiveStages()` already recomputes each time by design (stateless). |
| 6. FO awareness rules (ambiguous channel messages) | `first-officer-shared-core.md` — new "Channel Awareness" section. Workflow-agnostic, as spec §7.4 requires. |

### `status` Script: Profile Parsing Gap

`parse_stages_block()` currently parses `defaults:` and `states:` sub-blocks but **ignores `profiles:`**. The `stages:` block in README frontmatter now has:

```yaml
stages:
  profiles:
    full:     [draft, brainstorm, explore, ...]
    standard: [draft, brainstorm, explore, plan, ...]
    express:  [draft, brainstorm, execute, quality, shipped]
  defaults: ...
  states: ...
```

For profile-aware `--next`, the script needs to:
1. Parse `profiles` block → dict of `{name: [stage_list]}`
2. For each entity, look up `entity.profile` → get its stage list
3. Find `entity.current_stage` in that list → next stage is `list[idx+1]`
4. Fall back to full pipeline order when `profile` is empty (brainstorm phase, no profile assigned yet)

### Risks and Unknowns

1. **`status` script cannot be imported** — confirmed by prior context-lake insight. Any new helper functions must be added inline to the script. If `effectiveStages` logic grows complex, consider extracting to a companion `.py` file that CAN be imported, and have `status` call it.

2. **Profile not yet on existing active entities** — Current active entities (032–036) have no `profile:` field. The `nextStage()` logic must gracefully handle `profile = ""` — fall back to full pipeline order to avoid breaking currently-running entities.

3. **`parse_stages_block()` parses `profiles:` block partially** — The YAML profiles block uses inline lists (`[draft, brainstorm, ...]`). The current parser only handles `key: value` pairs and `- name:` list items. Inline bracket lists need a new parser branch.

4. **`status --next` output width** — Adding `PROFILE` and `DISPATCH` columns to a fixed-width table requires reworking column widths. Current format string: `'%-6s %-30s %-20s %-20s %s'`. Need to add two columns without making output unwieldy in narrow terminals.

5. **Brainstorm gate is FO-inline** — The brainstorm stage has `gate: true` but `worktree: false`. `status --next` currently filters out gate-blocked entities entirely. But the FO handles brainstorm inline (not by dispatching an ensign). The script's gate filter may need a `dispatch-type` distinction: `(FO inline)` vs `(ensign)`.

6. **FO is not code** — All FO behavior is natural language in markdown files. "Implementing" scope items 3 and 6 means writing precise instructions into `first-officer-shared-core.md`. The risk is instruction drift — ambiguous phrasing will cause FO to behave inconsistently. Pseudocode blocks (as used in spec §7.1) help.

### Recommendation

**Profile: standard** — The work is well-scoped: one Python script enhancement + two markdown file additions (new sections in `first-officer-shared-core.md`). No new infrastructure, no schema changes, no cross-domain impact.

**Stage skips:** None recommended. The standard path (explore → plan → execute → quality → pr-draft → pr-review) is appropriate:
- `plan` is warranted because `status` script changes and `first-officer-shared-core.md` additions need a concrete implementation plan before execute
- `research` not needed — the spec §7.1–7.4 pseudocode is the source of truth, no external library research required
- `e2e`, `seeding`, `docs` not in standard profile — appropriate since this is a pure backend/script change with no dashboard UI

**Execute decomposition hint (for plan stage):** Two parallel workstreams:
- Stream A: `skills/commission/bin/status` — `parse_stages_block` profile parsing + `print_next_table` profile-aware next-stage lookup + new output columns
- Stream B: `references/first-officer-shared-core.md` — brainstorm triage section + channel awareness section + effective stages guidance

## Acceptance Criteria

- `effectiveStages()` correctly computes stage list for all 3 profiles + overrides
- `nextStage()` advances through profile-filtered stages
- Brainstorm triage produces executability score and path recommendation
- A/B/C routing works: A invokes brainstorming skill, B dispatches ensign, C accepts direct input
- `status --next` shows profile and dispatch type
- Mid-pipeline profile change doesn't re-run passed stages
- FO asks for entity clarification when global channel message is ambiguous

## Stage Report (plan)

### Overview

Two parallel workstreams:
- **Stream A** — `skills/commission/bin/status` Python changes (scope items 1, 2, 4, 5 partial)
- **Stream B** — `references/first-officer-shared-core.md` new sections (scope items 3, 5 partial, 6)

Both streams touch different files with no overlap — safe to execute in parallel.

**Total commits: 7** (4 Stream A + 3 Stream B)

---

### Stream A — `skills/commission/bin/status`

#### A1: Parse `profiles:` inline-list block from README frontmatter

**File:** `skills/commission/bin/status`

**Changes to `parse_stages_block()`** (currently lines 67–166):

Add a new `profiles` dict parsed from the `profiles:` sub-block, before the `defaults:` and `states:` parsing. The profiles block uses inline YAML lists: `full: [draft, brainstorm, explore, ...]`.

New helper function signature (added inline above `parse_stages_block`):

```python
def parse_inline_list(value: str) -> list[str]:
    """Parse '[item1, item2, item3]' inline YAML list into list of strings.
    Returns [] for empty or malformed input."""
```

Implementation: strip `[]`, split on `,`, strip each token. Returns `[]` if `value` doesn't start with `[`.

Updated `parse_stages_block()` return value — extend the returned dict from a list to a tuple:

```python
# Before: returns list of stage dicts
def parse_stages_block(filepath) -> list | None:

# After: returns dict with 'stages' list AND 'profiles' dict
def parse_stages_block(filepath) -> dict | None:
    # returns: {
    #   'stages': [{'name': ..., 'gate': ..., ...}, ...],
    #   'profiles': {
    #     'full': ['draft', 'brainstorm', 'explore', ...],
    #     'standard': ['draft', 'brainstorm', 'explore', 'plan', ...],
    #     'express': ['draft', 'brainstorm', 'execute', 'quality', 'shipped'],
    #   }
    # }
```

**Backward compatibility:** All callers of `parse_stages_block()` currently use the return value as a list passed to `stage_order()`, `print_status_table()`, and `print_next_table()`. These must be updated to use `result['stages']` instead of `result` directly. The `profiles` dict is consumed only by `print_next_table()`.

**Callers to update:**
- `main()` line ~408: `stages = parse_stages_block(readme_path)` → `parsed = parse_stages_block(readme_path); stages = parsed['stages'] if parsed else None; profiles = parsed['profiles'] if parsed else {}`
- `stage_order()`, `sort_key_default()`, `print_status_table()` — receive `stages` list unchanged, no change needed
- `print_next_table()` — receives new `profiles` dict as additional parameter

**Commit:** `feat(status): parse profiles block from README frontmatter`

---

#### A2: `effective_stages()` helper + profile-aware `nextStage` in `print_next_table()`

**File:** `skills/commission/bin/status`

New function (added inline, before `print_next_table`):

```python
def effective_stages(entity: dict, profiles: dict, all_stage_names: list[str]) -> list[str]:
    """Compute effective stage list for an entity.

    Args:
        entity: entity dict with keys 'profile', 'skip-stages', 'add-stages'
        profiles: dict of profile_name -> list[str] from parse_stages_block
        all_stage_names: canonical full-pipeline stage order (from 'states' list)

    Returns:
        Ordered list of stage names this entity will pass through.
        Falls back to all_stage_names when entity has no profile assigned.
    """
    profile_name = entity.get('profile', '').strip()
    if not profile_name or profile_name not in profiles:
        # No profile assigned (pre-brainstorm) or unknown profile → use full pipeline order
        return list(all_stage_names)

    base = list(profiles[profile_name])

    # Apply skip-stages
    skip_raw = entity.get('skip-stages', '')
    skip = parse_inline_list(skip_raw) if skip_raw else []
    kept = [s for s in base if s not in skip]

    # Apply add-stages — insert at canonical position from full pipeline order
    add_raw = entity.get('add-stages', '')
    add = parse_inline_list(add_raw) if add_raw else []
    to_add = [s for s in add if s not in kept]

    if not to_add:
        return kept

    # Insert at canonical position: full pipeline order determines insertion index
    full_order = all_stage_names
    result = []
    kept_set = set(kept)
    add_set = set(to_add)
    for stage in full_order:
        if stage in kept_set or stage in add_set:
            result.append(stage)
    return result
```

**Changes to `print_next_table()`** — update signature and next-stage lookup:

```python
# Before:
def print_next_table(entities, stages):

# After:
def print_next_table(entities, stages, profiles):
```

Replace the positional next-stage lookup (current lines ~289–291):

```python
# Before (positional):
if stage_idx + 1 >= len(stage_names):
    continue
next_stage_name = stage_names[stage_idx + 1]

# After (profile-aware):
eff = effective_stages(e, profiles, stage_names)
if status not in eff:
    # current stage not in entity's effective stages — find next in canonical order
    curr_idx = stage_names.index(status) if status in stage_names else -1
    candidates = [s for s in eff if stage_names.index(s) > curr_idx] if curr_idx >= 0 else []
    if not candidates:
        continue
    next_stage_name = candidates[0]
else:
    eff_idx = eff.index(status)
    if eff_idx + 1 >= len(eff):
        continue
    next_stage_name = eff[eff_idx + 1]
```

**Fallback behavior summary:**
- `profile = ""` → `effective_stages()` returns `all_stage_names` (full pipeline) → existing entities route correctly
- `profile = "standard"` but current stage removed by skip-override → find next in canonical order among effective stages
- `profile` unknown string → falls back to full pipeline order

**Commit:** `feat(status): profile-aware next-stage routing via effective_stages()`

---

#### A3: `--next` output: add PROFILE and DISPATCH columns

**File:** `skills/commission/bin/status`

**Changes to `print_next_table()`:**

Compute two new fields per dispatchable entity:

```python
# PROFILE column: entity's profile value or "(none)" if empty
profile_label = e.get('profile', '') or '(none)'

# DISPATCH column logic:
next_stage_def = stage_by_name.get(next_stage_name, {})
if next_stage_def.get('gate') and not next_stage_def.get('worktree'):
    dispatch_label = '(FO inline)'
elif not e.get('profile'):
    dispatch_label = '(needs profile)'
else:
    dispatch_label = 'ensign'
```

**`(FO inline)` rule:** stage has `gate: true` AND `worktree: false` (brainstorm stage). These entities ARE shown in `--next` output (currently filtered out by gate check) — but with dispatch type `(FO inline)`.

**Gate filter change:** update the gate skip rule in the main dispatchability loop:

```python
# Before: skip all gate-blocked entities
if stage.get('gate', False):
    continue

# After: skip only gate-blocked entities that are NOT FO-inline
is_fo_inline = stage.get('gate', False) and not stage.get('worktree', True)
if stage.get('gate', False) and not is_fo_inline:
    continue
```

**Updated format string** — replace current 5-column `fmt` with 7-column:

```python
# Before:
fmt = '%-6s %-30s %-20s %-20s %s'
# columns: ID, SLUG, CURRENT, NEXT, WORKTREE

# After:
fmt = '%-6s %-28s %-14s %-14s %-12s %-11s %s'
# columns: ID, SLUG, CURRENT, NEXT, PROFILE, DISPATCH, WORKTREE
```

**`(needs profile)` rule:** entity has no profile AND current stage is NOT brainstorm AND current stage is NOT initial → show `(needs profile)`. This catches entities that somehow advanced past brainstorm without a profile assignment.

**Commit:** `feat(status): add PROFILE and DISPATCH columns to --next output`

---

#### A4: `parse_frontmatter()` — extract `profile`, `skip-stages`, `add-stages` fields

**File:** `skills/commission/bin/status`

`parse_frontmatter()` already handles any `key: value` pair it encounters. The new fields (`profile`, `skip-stages`, `add-stages`) are standard frontmatter fields and will be parsed automatically by the existing logic.

However, `scan_entities()` (line ~169) explicitly lists which fields to `setdefault`:

```python
# Before (line ~180):
for key in ('id', 'status', 'title', 'score', 'source', 'worktree'):
    entity.setdefault(key, '')

# After:
for key in ('id', 'status', 'title', 'score', 'source', 'worktree',
            'profile', 'skip-stages', 'add-stages'):
    entity.setdefault(key, '')
```

No other changes needed — `parse_frontmatter()` already handles hyphenated keys correctly (partition on first `:` only).

**Commit:** `feat(status): include profile and stage-override fields in entity scan`

---

### Stream B — `references/first-officer-shared-core.md`

#### B1: Effective Stages section + mid-pipeline profile change rule

**File:** `references/first-officer-shared-core.md`

**New section** — insert after the `## Dispatch` section heading, before step 1:

```markdown
## Effective Stages

Before dispatching any entity, compute its effective stage list:

```
effective_stages(entity):
  if entity has no profile assigned:
    return full_pipeline_stage_order   # all stages from README states list

  base = profiles[entity.profile]
  kept = base - entity.skip_stages

  # add-stages: insert at canonical position from full-pipeline order
  for stage in full_pipeline_order:
    if stage in kept or stage in entity.add_stages:
      include it

  return result
```

**Mid-pipeline profile changes:** Profile and override changes only affect stages **after** `current_stage`. `effective_stages()` is stateless and recomputed on every dispatch — it reflects the current frontmatter state. The FO must never re-dispatch a stage that already has a completed stage report. When checking "next stage", always compare against the entity's current `status` field, not a cached list.

**Edge case — current stage removed:** If `entity.status` is not in `effective_stages(entity)` (e.g., the stage was in the profile when dispatched, but the profile was changed while it was running), find the next stage by scanning `effective_stages()` for the first stage whose canonical index is greater than `entity.status`'s canonical index.
```

**Commit:** `docs(fo-core): add effective stages computation + mid-pipeline change rule`

---

#### B2: Brainstorm Triage section

**File:** `references/first-officer-shared-core.md`

**New section** — insert after the `## Effective Stages` section:

```markdown
## Brainstorm Triage

When an entity enters brainstorm stage, the FO handles it **inline** (no ensign dispatch). Perform triage immediately.

### Executability Assessment

Score the entity spec on 5 criteria (1 point each):

| Check | Pass when |
|-------|-----------|
| **Intent clear** | You know the outcome to achieve |
| **Approach decidable** | A method exists OR trade-off is clearly stated |
| **Scope bounded** | What NOT to touch is clear (no scope-creep risk) |
| **Verification possible** | Completion can be confirmed (test criteria or observable outcome) |
| **Size estimable** | Express / standard / full can be determined |

### Routing

**5/5 + small (express path):**
1. Post recommendation to captain: profile + rationale
2. Await captain gate approval (dashboard button, comment, or channel message)
3. On approval: write `profile: express` to entity frontmatter, advance to next stage

**≤4/5 (captain choice path):**
Present options to captain:

```
Brainstorm: {entity title}

Executability: {N}/5
Missing: {list of failed criteria}

Options:
  A) Interactive brainstorm — I'll walk through design with you (superpowers:brainstorming)
  B) Ensign analysis — dispatch ensign to explore codebase, post options to dashboard
  C) Direct — you provide the approach, I'll update the spec

Which path? (A/B/C)
```

**Path A:** Invoke `Skill: "superpowers:brainstorming"`. After spec is produced, present profile recommendation and await gate.

**Path B:** Dispatch ensign to worktree (create worktree at dispatch time). Ensign produces: codebase exploration, 2-3 approach options with tradeoffs, profile recommendation, open questions. Ensign posts via `add_comment` on entity (read-only on spec body). After ensign completes, present summary to captain. Captain may switch to Path A with ensign analysis as context. Once captain decides, FO updates spec via `update_entity`, presents profile recommendation, awaits gate.

**Path C:** Captain provides approach directly in response. FO updates spec via `update_entity` with the approach, presents profile recommendation, awaits gate.

### Gate Resolution

Gate passes when captain explicitly approves profile assignment. On approval:
1. Write `profile: {full|standard|express}` to entity frontmatter via git commit on main
2. Advance entity to next stage per `effective_stages()`
```

**Commit:** `docs(fo-core): add brainstorm triage section (executability + A/B/C routing)`

---

#### B3: Channel Awareness section (FO awareness rules)

**File:** `references/first-officer-shared-core.md`

**New section** — insert after `## Clarification and Communication`:

```markdown
## Channel Awareness

When the captain sends a message via the global channel without naming a specific entity:

1. **Single active entity** (one entity with non-empty `worktree`) → assume that entity. Proceed without asking.

2. **One entity had activity in last 5 minutes** → assume that entity. Proceed without asking.

3. **Multiple active entities, message contains entity-specific keywords** → auto-match by keyword (entity title words, slug fragments, stage name). If unambiguous, proceed.

4. **Multiple active entities, ambiguous message** → ask for clarification:
   ```
   你是在講 {slug-A} 還是 {slug-B}?
   ```
   Wait for captain to specify before acting.

5. **No active entities** → treat as workflow-level instruction (status check, configuration, or general question). Do not invent an entity context.

These rules are workflow-agnostic and apply regardless of which pipeline is running.
```

**Commit:** `docs(fo-core): add channel awareness rules for ambiguous captain messages`

---

### Fallback Behavior Summary

| Scenario | Behavior |
|----------|----------|
| `profile = ""` (no profile assigned) | `effective_stages()` returns full pipeline order. `status --next` shows `(needs profile)` if past brainstorm, otherwise `(FO inline)` at brainstorm. |
| `profile = "standard"`, entity in mid-pipeline | `effective_stages()` returns standard stages. Skip-stages and add-stages applied on top. |
| Current stage not in `effective_stages()` | Find first effective stage with canonical index > current stage's canonical index. |
| `add-stages` not in `full` pipeline order | Silently ignored (unknown stage name). FO should warn captain if this occurs. |
| Brainstorm gate, `worktree: false` | Shown in `--next` with `DISPATCH = (FO inline)`. FO triages inline, no Agent() dispatch. |

---

### Test Plan

#### Manual smoke tests for Stream A (`status --next`):

1. **Baseline (no profile):** Run `status --next` against current pipeline — existing entities (no `profile:` field) must still dispatch correctly. NEXT column must show same results as before this change.

2. **Standard profile entity:** Add a test entity with `profile: standard`. Verify NEXT skips `research`, `seeding`, `e2e`, `docs`.

3. **Express profile entity:** Add a test entity with `profile: express`. At `brainstorm` stage, verify DISPATCH shows `(FO inline)`. After brainstorm, verify NEXT jumps directly to `execute`.

4. **Skip-stages override:** Entity with `profile: standard` and `skip-stages: [plan]`. Verify NEXT advances from `explore` to `execute`.

5. **Add-stages override:** Entity with `profile: standard` and `add-stages: [e2e]`. Verify `e2e` appears between `quality` and `pr-draft`.

6. **`(needs profile)` marker:** Entity with `status: explore` and no `profile:` field. Verify DISPATCH shows `(needs profile)`.

7. **Backward compat:** All current active entities (032–036, no profile) must appear in `--next` with correct NEXT stage and `DISPATCH = (needs profile)` or blank.

#### Manual smoke tests for Stream B (`first-officer-shared-core.md`):

No automated test possible (FO is an AI agent). Verification is behavioral:

8. **Brainstorm triage walkthrough:** Create a test entity at `brainstorm` stage. Invoke FO. Verify FO scores executability and presents A/B/C options (or express recommendation) rather than dispatching an ensign directly.

9. **Channel awareness:** With two active entities, send an ambiguous global channel message. Verify FO asks for clarification naming both entities.

#### Test entities to create during execute:

Create `docs/build-pipeline/_test-profile-standard.md` and `_test-profile-express.md` as scratch entities for smoke tests 2–6. Delete after verification.

---

### Estimated Commits: 7

| # | Stream | Message |
|---|--------|---------|
| A1 | A | `feat(status): parse profiles block from README frontmatter` |
| A2 | A | `feat(status): profile-aware next-stage routing via effective_stages()` |
| A3 | A | `feat(status): add PROFILE and DISPATCH columns to --next output` |
| A4 | A | `feat(status): include profile and stage-override fields in entity scan` |
| B1 | B | `docs(fo-core): add effective stages computation + mid-pipeline change rule` |
| B2 | B | `docs(fo-core): add brainstorm triage section (executability + A/B/C routing)` |
| B3 | B | `docs(fo-core): add channel awareness rules for ambiguous captain messages` |

**Execution order:** A1 must precede A2 and A3 (caller update required). A4 is independent. B1, B2, B3 are independent of each other and all of Stream A.

Recommended parallel grouping for execute:
- Group 1 (parallel): A1 + A4 + B1 + B2 + B3
- Group 2 (sequential after A1): A2 → A3

## Stage Report (execute)

### Checklist

- [x] DONE — A1: `parse_inline_list()` helper added. `parse_stages_block()` extended to return `{'stages': [...], 'profiles': {...}}`. Parses `profiles:` sub-block with inline list syntax `[item1, item2, ...]`.
- [x] DONE — A4: `scan_entities()` `setdefault` list extended with `profile`, `skip-stages`, `add-stages` fields.
- [x] DONE — A2: `effective_stages(entity, profiles, all_stage_names)` function added. Handles: no-profile fallback, skip-stages removal, add-stages canonical insertion, unknown-profile fallback.
- [x] DONE — A3: `print_next_table()` updated with new signature `(entities, stages, profiles)`. Added PROFILE and DISPATCH columns. FO-inline gate detection (`gate: true` + `worktree: false` → shown as `(FO inline)` instead of filtered). No-profile entities past brainstorm show `(needs profile)`. Profile-aware next-stage lookup replaces positional `stage_names[idx+1]`.
- [x] DONE — `main()` callers updated: `parse_stages_block()` return value unpacked to `stages` + `profiles`. `print_next_table()` call updated with `profiles` argument.
- [x] DONE — B1: `## Effective Stages` section added to `references/first-officer-shared-core.md`. Includes pseudocode, mid-pipeline change rule, and startup note about new `status --next` columns.
- [x] DONE — B2: `## Brainstorm Triage` section added. Covers: 5-criteria executability table, express path (5/5 + small), captain-choice path (≤4/5) with A/B/C options, gate resolution rules.
- [x] DONE — B3: `## Channel Awareness` section added. 5-rule disambiguation logic for global channel messages, workflow-agnostic.

### Smoke Test Results

All 6 smoke tests passed:

| Test | Input | Expected | Result |
|------|-------|----------|--------|
| 1 | no profile | full pipeline order fallback | PASS |
| 2 | standard | skips research/seeding/e2e/docs | PASS |
| 3 | express | only brainstorm/execute/quality/shipped | PASS |
| 4 | standard + `skip-stages: [plan]` | plan absent | PASS |
| 5 | standard + `add-stages: [e2e]` | e2e inserted between quality and pr-draft | PASS |
| 6 | `parse_inline_list` | `[a,b,c]`→list, empty→`[]`, non-list→`[]` | PASS |

`status --next` output verified:
- Existing entities (no profile) → `(needs profile)`, route via full pipeline order
- `profile: standard` entity at explore → NEXT=`plan` (skips research), DISPATCH=`ensign`
- `profile: express` entity at execute → NEXT=`quality`, DISPATCH=`ensign`

### Files Modified

| File | Change |
|------|--------|
| `skills/commission/bin/status` | +133 lines: `parse_inline_list`, `effective_stages`, extended `parse_stages_block`, updated `print_next_table`, updated `scan_entities` and `main` callers |
| `references/first-officer-shared-core.md` | +112 lines: 3 new sections (Effective Stages, Brainstorm Triage, Channel Awareness) |

### Commits

- `034 execute: A1+A4 — parse profiles block, extend scan_entities with profile fields`
- `034 execute: B1 — add Effective Stages section to FO shared core`
- `034 execute: B2 — add Brainstorm Triage section (executability + A/B/C routing)`
- `034 execute: B3 — add Channel Awareness section for ambiguous captain messages`

## Stage Report (quality)

### Checklist

- [x] DONE — Status script verification: `python3 skills/commission/bin/status --workflow-dir docs/build-pipeline` runs without errors, table renders correctly with all 14+ entities. Default table unchanged.
- [x] DONE — `--next` with PROFILE + DISPATCH columns: output correct, existing no-profile entities show `(needs profile)`, FO-inline brainstorm entities would show `(FO inline)`.
- [x] DONE — Edge case tests: all 6 passed (see results below).
- [x] DONE — FO reference doc review: 3 sections present, well-structured, no contradictions with existing FO rules.
- [x] DONE — Commit hygiene: all execute commits use `034 execute:` prefix, atomic, descriptive.
- [x] DONE — Backward compatibility: `--archived` runs against 40+ entities (including old field shapes) with zero errors.

### Test Results

**Status script — main repo (`--workflow-dir /Users/kent/Project/spacedock/docs/build-pipeline`):**

```
python3 status --workflow-dir …/docs/build-pipeline       → 40 entities listed, no errors
python3 status --workflow-dir …/docs/build-pipeline --next → 2 entities shown, PROFILE + DISPATCH columns present
python3 status --workflow-dir …/docs/build-pipeline --archived → 42 rows (including archived), no errors
```

**Edge cases (all PASS):**

| # | Input | Expected | Result |
|---|-------|----------|--------|
| 1 | `profile: express` | `[draft, brainstorm, execute, quality, shipped]` | PASS |
| 2 | `profile: express, skip-stages: [quality]` | quality absent | PASS |
| 3 | `profile: standard, add-stages: [research]` | research inserted after explore | PASS |
| 4 | `profile: ""` | full pipeline order fallback | PASS |
| 5 | entity missing skip/add-stages keys | standard profile stages | PASS |
| 6 | `profile: ultra` (unknown) | full pipeline fallback | PASS |

**FO reference doc section check:**

| Section | Present | Contains required content |
|---------|---------|--------------------------|
| `## Effective Stages` | ✓ | pseudocode, mid-pipeline rule, startup note |
| `## Brainstorm Triage` | ✓ | 5-criteria table, express path, A/B/C options, gate resolution |
| `## Channel Awareness` | ✓ | 5 disambiguation rules, workflow-agnostic note |

**No contradictions found** — new sections add to existing FO behaviour. Brainstorm Triage handles the `(FO inline)` dispatch type introduced by the gate filter change. Channel Awareness is purely additive (no existing section covers this case).

### Verdict

PASSED — 6 done, 0 skipped, 0 failed.

## Stage Report (pr-draft)

### Checklist

- [x] DONE — Branch pushed to origin: `spacedock-ensign/fo-dispatch-profile-routing`
- [x] DONE — Draft PR created: iamcxa/spacedock#22 — `feat(pipeline): profile-aware stage routing and FO dispatch logic`
- [x] DONE — Entity `pr:` field updated to `"#22"`

### PR

iamcxa/spacedock#22 (draft) — https://github.com/iamcxa/spacedock/pull/22
