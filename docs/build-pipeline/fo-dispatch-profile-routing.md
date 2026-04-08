---
id: 034
title: FO Dispatch Logic — Profile-Aware Stage Routing
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP4)
started: 2026-04-08
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-fo-dispatch-profile-routing
issue:
pr:
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
