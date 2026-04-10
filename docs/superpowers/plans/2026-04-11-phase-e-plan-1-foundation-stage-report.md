# Phase E Plan 1 — Foundation Stage Report

**Date**: 2026-04-11
**Plan**: [docs/superpowers/plans/2026-04-11-phase-e-plan-1-foundation.md](2026-04-11-phase-e-plan-1-foundation.md)
**Spec**: [docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md](../specs/2026-04-11-phase-e-build-flow-restructure.md)
**Branch**: `phase-e/plan-1-foundation`
**Commit range**: `d48b936`..`99bce02` (23 commits)
**Execution pattern**: subagent-driven-development — implementer subagent (sonnet/haiku) + two-stage review (spec + superpowers:code-reviewer haiku) per task

## Tasks Completed

- [x] 1. Create `_index/` directory with empty CONTRACTS/DECISIONS/INDEX shells
- [x] 2. workflow-index skill frontmatter and entry point (`skills/workflow-index/SKILL.md`)
- [x] 3. workflow-index contracts-format reference
- [x] 4. workflow-index decisions-format reference (supersede semantics)
- [x] 5. workflow-index read-mode reference
- [x] 6. workflow-index write-mode reference
- [x] 7. workflow-index check-mode reference (plan-checker Dim 7)
- [x] 8. workflow-index test fixture (seed CONTRACTS/DECISIONS/INDEX + 2 entities)
- [x] 9. workflow-index read-mode behavior test via fixture parser
- [x] 10. workflow-index decisions supersede filter behavior test
- [x] 11. knowledge-capture skill frontmatter and two-mode entry point
- [x] 12. knowledge-capture classifier reference (severity + root-cause)
- [x] 13. knowledge-capture gates reference (severity + three-question test)
- [x] 14. knowledge-capture targets reference (multi-level CLAUDE.md routing)
- [x] 15. knowledge-capture capture-mode reference (ensign-side, no captain)
- [x] 16. knowledge-capture apply-mode reference (FO-side, captain-facing)
- [x] 17. knowledge-capture fixtures (findings, captain responses, pending entity)
- [x] 18. workflow-index-maintainer mod (startup + idle hooks)
- [x] 19. FO shared-core step 3.6 (pending knowledge capture detection) in `references/first-officer-shared-core.md`
- [x] 20. Full test suite + structural audit + Stage Report

## Deliverables

### New skills

**`skills/workflow-index/`** — Cross-entity coherence artifacts read/write/check
- `SKILL.md` (frontmatter: `workflow-index`, allowed-tools: Read/Write/Edit/Grep/Glob)
- `references/contracts-format.md` — 5-column CONTRACTS schema with Last Updated
- `references/decisions-format.md` — DECISIONS schema with supersede chain semantics
- `references/read-mode.md` — Query by file or entity with dual-schema fallback (5-col + 4-col legacy)
- `references/write-mode.md` — Append / update-status / supersede / rebuild operations
- `references/check-mode.md` — Plan-checker Dimension 7 contradiction detection (requires `plan_rationale` input)

**`skills/knowledge-capture/`** — D1/D2 finding capture and application
- `SKILL.md` (frontmatter: `knowledge-capture`, allowed-tools include AskUserQuestion for apply mode)
- `references/classifier.md` — RawFinding schema and D1/D2 classification
- `references/gates.md` — Severity × three-question test gating
- `references/targets.md` — Multi-level CLAUDE.md routing (root / docs / skills)
- `references/capture-mode.md` — Ensign-side: writes `## Pending Knowledge Captures` with `<capture>` elements
- `references/apply-mode.md` — FO-side: reads pending, presents via AskUserQuestion in `--agent` context
- `fixtures/sample-finding.yaml` — Canonical RawFinding example
- `fixtures/captain-responses.yaml` — Pre-recorded captain answers for forge fixtures
- `fixtures/entity-with-pending.md` — Entity body with a ready-to-apply pending section

### New mod

**`mods/workflow-index-maintainer.md`** — FO lifecycle hooks
- Startup hook: INDEX.md staleness check via mtime comparison → rebuild via workflow-index write mode
- Idle hook: scan entities for stage transitions → loop update-status calls (one per file) → always rebuild INDEX.md
- Rules: never modifies entity frontmatter; skill is the only writer; separate commits per operation
- Recently Retired age-out delegated to write-mode; known gap documented inline (no explicit `shipped_date` input)

### Updated reference

**`references/first-officer-shared-core.md`** — Additive step 3.6 in Completion and Gates
- Inserted between step 3.5 (completion event emission) and step 4 (gate check)
- Scans entity for `## Pending Knowledge Captures` section
- Invokes `knowledge-capture` skill with `mode: apply`, `entity_slug`, `entity_path`
- Preserves "captain-facing flows only happen in `--agent` context" invariant — ensigns stage, FO applies

### Initial production artifacts

- `docs/build-pipeline/_index/CONTRACTS.md` (empty shell with heading + column schema)
- `docs/build-pipeline/_index/DECISIONS.md` (empty shell with heading + supersede template)
- `docs/build-pipeline/_index/INDEX.md` (empty shell — rebuilt on first idle scan)

### Tests (49 passing)

| File | Test count | Coverage |
|------|-----------|----------|
| `tests/test_workflow_index.py` | 25 | Frontmatter, reference existence, read/write/check mode content markers, dual-schema parser behavior, decisions supersede filter, mod file structure + hooks + skill reference |
| `tests/test_knowledge_capture.py` | 21 | Frontmatter, 5 reference files, two-mode entry point, classifier schema, gates/targets/capture/apply content markers, fixture parse + pending section detection |
| `tests/test_fo_pending_capture_step.py` | 3 | FO shared-core file exists, has Pending Knowledge Captures + knowledge-capture + apply markers, preserves 6 existing section headers |
| **Total** | **49** | |

- `tests/fixtures/workflow-index-fixture/` — seed CONTRACTS.md + DECISIONS.md + INDEX.md + 2 entity files (entity-a.md, entity-b.md) used by behavior tests in Task 9/10

## Validation

- [x] All Plan 1 Python tests pass: 49/49 green (`tests/test_workflow_index.py` + `tests/test_knowledge_capture.py` + `tests/test_fo_pending_capture_step.py`)
- [x] FO-related regression tests pass: 8/8 green (`tests/ -k "first_officer or merge_hook"`)
- [x] Phase D tests continue to pass (merge-hook, gate-guardrail, scaffolding-guardrail, spike-termination, rejection-flow, output-format, dispatch-names)
- [x] Two-stage review completed per task: spec compliance + code quality via `superpowers:code-reviewer`
- [~] Manual structural audit equivalent to forge Phase 1 (see Deviation #4)
- [~] Agent regression check via test suite (see Deviation #4)

### Pre-existing failures (not caused by Plan 1)

- `tests/test_status_script.py::TestNextOption::test_concurrency_parked_not_counted`
- `tests/test_status_script.py::TestNextOption::test_gate_blocked_excluded`

Reproduced on `e69645b` (HEAD before Task 18). These are pre-existing failures in the status-script `--next` concurrency logic, unrelated to workflow-index, knowledge-capture, or FO shared-core changes. Deferred to a separate bug-fix task.

## Deviations

### 1. Task 5 — `active` keyword drift (fixed mid-flow, commit `fd35d25`)

**Issue**: Implementer added `assert "active" in content.lower()` to the read-mode behavior test but the planned content didn't include the word "active" — the test failed immediately.

**Resolution**: Removed the assertion (matched the actual planned content) and removed the unused workaround section. Self-review caught this before merge.

**Lesson**: Test assertions must be derivable from the planned content. Reviewer now checks test code against the content skeleton for orphan assertions.

### 2. Task 7 — Architectural gap in check-mode contract (fixed, commit `7f95672`)

**Issue**: check-mode.md's contradiction detection logic needed `plan_rationale` as an input (no such field was in the planned `Inputs` block) AND needed date-of-contract awareness to distinguish "recent authoritative" from "stale legacy" contradictions. The CONTRACTS schema was 4 columns (file / entity / status / intent) with no date column.

**Resolution**: Added `Last Updated` column to CONTRACTS schema (requires touching `contracts-format.md`, `read-mode.md`, and `check-mode.md` together); added `plan_rationale` to check-mode's Inputs; added a kind mapping table and contradiction heuristic. Updated Task 8 fixture content to 5-column CONTRACTS and Task 9 parser to handle 5-cell + 4-cell fallback.

**Lesson**: When a skill's reference file specifies behavior that depends on fields not in its input schema, the schema is a latent bug. Reviewer now cross-checks behavior descriptions against declared inputs.

### 3. Task 19 — Wrong target file (fixed in plan, commit `daf0ff2`)

**Issue**: The original plan targeted `skills/first-officer/SKILL.md` with a "step 6.5" insertion. But that file is a 13-line thin launcher that reads three reference files — the actual dispatch lifecycle lives in `references/first-officer-shared-core.md`, which has numbered steps (1, 2, 3, 3.5, 4) in the "Completion and Gates" section.

**Resolution**: Patched the plan mid-execution (commit `daf0ff2`) to target `references/first-officer-shared-core.md` with step 3.6 inserted between step 3.5 and step 4. Test file renamed constant from `FO_SKILL` to `FO_SHARED_CORE`.

**Lesson**: Always read the actual target file before writing plan content that edits it. A plan that specifies "insert after step N" without verifying step N exists in the target is guessing.

### 4. Task 20 — kc-plugin-forge is scoped to Claude Code plugins, not applicable

**Issue**: The plan specified "Invoke via Skill tool: `kc-plugin-forge` with route `audit` against `skills/workflow-index/`" and "Run kc-plugin-forge verify-agents". However:

1. `kc-plugin-forge` expects a **Claude Code plugin directory** with `plugin.json` at the root and `skills/` / `agents/` / `commands/` / `hooks/` as standard subdirectories. Spacedock has no `plugin.json` — it is a build-pipeline tool where `skills/` and `agents/` are internal workflow components, not plugin-dev components.
2. `kc-plugin-forge` has no `audit` route. Its routes are `new <name>`, `<path>`, `validate-only`, `skill-tdd-only`, `agent-verify-only`, `self-forge`, and `dreaming`. The plan invoked a route that doesn't exist.
3. The `agent-verify-only` route runs `plugin-dev:agent-development` validation, which checks Claude Code agent structure (frontmatter with `description`, `model`, `tools`, `color`, `<example>` blocks, etc.). Spacedock's `agents/first-officer.md` and `agents/ensign.md` are **spacedock build-pipeline agents**, not plugin-dev agents — they do not follow the plugin-dev schema.

**Resolution**: Performed manual structural audit equivalent to forge Phase 1 Claude Code plugin validation:

| Check | workflow-index | knowledge-capture |
|-------|----------------|-------------------|
| `SKILL.md` exists | ✓ | ✓ |
| Frontmatter parses (YAML) | ✓ | ✓ |
| `name` field | `workflow-index` | `knowledge-capture` |
| `description` field (non-empty) | ✓ detailed | ✓ detailed |
| `allowed-tools` declared | Read, Write, Edit, Grep, Glob | Read, Write, Edit, Grep, Glob, AskUserQuestion |
| All references referenced in SKILL.md exist on disk | 5/5 | 5/5 |
| Fixtures referenced in SKILL.md / tests exist | (fixtures at `tests/fixtures/`) | 3/3 in-skill + referenced |
| Tests enforce structure + content markers | 25 tests | 21 tests |

The 49 Plan 1 tests mechanically enforce every structural invariant forge Phase 1 would check (file existence, frontmatter parse, reference presence, content markers), so the audit's safety net is already in place. For agent regression, the pre-existing test suite (`test_dispatch_names.py`, `test_merge_hook_guardrail.py`, `test_rejection_flow.py`, `test_scaffolding_guardrail.py`, etc.) passed — no regressions in spacedock's own agent contract.

**Lesson for future plans**: When a plan specifies an external skill invocation (forge, doc-sync, e2e-walkthrough, etc.), verify the skill's routing and scope matches the target. "Invoke X against Y" is underspecified if X's routes don't include the form the plan uses or X's scope doesn't include Y.

### 5. Minor cruft — `skills/workflow-index/fixtures/` empty directory

An empty `fixtures/` directory exists inside `skills/workflow-index/` (created during Task 1's directory skeleton). The actual workflow-index fixtures live at `tests/fixtures/workflow-index-fixture/` per plan. Not a structural error (empty dirs are tolerated), but worth cleanup in Plan 2 or a follow-up commit.

### 6. Task 18 — workflow-index-maintainer contract drift (fixed, commit `ce5118a`)

**Issue**: Code reviewer found that the mod's idle-hook `update-status` payload used `files:` (plural) but `write-mode.md:47` specifies `file:` (singular), and that the mod's Recently Retired age-out logic was described as mod-side but `write-mode.md:55` delegates to the skill via Last Updated inspection.

**Resolution**: Fixed the mod to loop per file at the mod layer (one `update-status` call per file), delegated Recently Retired age-out to the skill, and documented the known gap (no explicit `shipped_date` input — skill must infer from Last Updated) inline in the mod as a "**Known gap (tracked for Phase E Plan 1 follow-up)**" marker.

**Lesson**: Structural tests (file existence + section header + keyword presence) cannot catch payload-schema drift between a mod and the skill it invokes. Two-stage review's cross-file coherence check was the only mechanism that caught this. The pattern generalizes: **any mod or agent that constructs a skill-invocation payload must be cross-checked against the skill's declared input schema, not just against its own structural tests.**

## Architectural insights

### Why Phase E Plan 1 uses `spacedock:*` namespace (not `spacebridge:*`)

The original Phase E spec described these skills as `spacebridge:workflow-index` and `spacebridge:knowledge-capture`. However, the `spacebridge` plugin does not exist yet — Phase F handles the plugin split. Plan 1 registered the skills in the existing `spacedock` repo's `skills/` directory and documented the namespace decision in the plan header.

When Phase F splits spacedock into spacedock-core and spacebridge, these skills will move to the spacebridge plugin and their invocation paths will change. The move is a pure file-system operation — no code changes needed, since skill content is self-contained and tests use `REPO_ROOT / "skills" / "<name>"` relative paths that will follow the files.

### Why apply-mode runs in FO's `--agent` context, not ensign context

Stage ensigns cannot use `AskUserQuestion` — per MEMORY.md's `askuserquestion-agent-vs-subagent.md`, only `--agent` context exposes the native AskUserQuestion UI. Subagents (including ensigns) must use the Teammate tool, which is a different flow.

This is why knowledge-capture is a **two-mode** skill:
- **Capture mode** runs inside the ensign's subagent context with **no captain interaction** — classifies findings, auto-appends D1 patterns to skill-level CLAUDE.md (no approval needed because D1 is additive-only), and stages D2 candidates in the entity body as `<capture>` elements inside a `## Pending Knowledge Captures` section.
- **Apply mode** runs inside FO's `--agent` context, which IS captain-interactive. FO reads the pending section, presents each candidate via AskUserQuestion, and writes approved ones to the target CLAUDE.md.

Step 3.6 in FO shared-core is the **glue** that makes this work — without it, D2 candidates would accumulate in entity bodies forever with no application trigger.

### Why the mod loops per file instead of passing a file list

`write-mode.md`'s `update-status` operation locates rows in CONTRACTS.md by `(entity, file)` key — one row per (entity × file) pair. An entity advancing to "shipped" may have contributed multiple file entries to CONTRACTS. The mod layer must loop over the files from the Stage Report and invoke `update-status` once per file, because the skill operation is scoped to a single row.

This asymmetry (append uses `files:` plural, update-status uses `file:` singular) is intentional in the skill: append is a bulk insert, update-status is a surgical edit. The mod must respect the skill's scoping rules even when it feels like it should be a single bulk call.

### Why the plan had three drift bugs across Tasks 5, 7, 19

Retrospective: the plan was written in a single session without reading every target file the plan claimed to edit. Task 5's assertion drift happened because the test was written before the content. Task 7's missing fields happened because the behavior was described before the input schema was finalized. Task 19's wrong target happened because the plan assumed `skills/first-officer/SKILL.md` contained the dispatch lifecycle without verifying. All three bugs were caught by two-stage review during execution — Task 5 by the implementer's own test run, Tasks 7 and 19 by the code reviewer's cross-file checks.

**Takeaway**: Plans that edit many files need a "plan verification" pass — read every target file the plan claims to edit and verify the plan's assumptions about its structure. This is Dim 7 territory (cross-entity coherence) for plans themselves. The workflow-index skill's check-mode exists precisely to provide mechanical support for this kind of verification in Phase E Plan 2.

## Next

**Phase E Plan 2** (Plan Stage: researcher agent + build-research + build-plan) is unblocked. Plan 2 can now depend on:

- `workflow-index` skill for plan-checker Dimension 7 (Cross-Entity Coherence) — plans read contracts/decisions, verify `plan_rationale` against existing context, detect contradictions
- `knowledge-capture` skill for D2 findings staging from build-research and build-plan stages — researcher/planner ensigns capture but don't apply
- FO shared-core step 3.6 for processing any D2 captures after each stage completes — the lifecycle is now complete

**Plan 2 should consider**:
- Closing the Recently Retired age-out gap by adding `shipped_date` to write-mode's `update-status` input schema (or switching to git-log lookup with a clear rationale)
- Cleaning up `skills/workflow-index/fixtures/` empty directory
- Fixing the pre-existing `test_status_script.py` `--next` concurrency failures (unrelated to Phase E, but should be tracked)
- Whether to adopt `uv run pytest tests/ --ignore=tests/fixtures` as the canonical test invocation to avoid the fixture-directory collection error, or fix the fixture directory to exclude `test_*.py` files inside

**Phase E Plan 1 Foundation — COMPLETE.**
