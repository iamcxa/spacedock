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

### Tests (originally 49; all removed post-ship — see Deviation #7)

The Plan 1 execution originally shipped 49 tests across 3 files. **They were removed wholesale on 2026-04-11 after captain review** — see Deviation #7 for the full reasoning. In summary: all 49 tests were string-presence checks on markdown prompts, providing false confidence. None of them verified runtime behavior. They went in commit `4d7a3d4`.

Files removed:
- `tests/test_workflow_index.py` (25 tests)
- `tests/test_knowledge_capture.py` (21 tests)
- `tests/test_fo_pending_capture_step.py` (3 tests)
- `tests/fixtures/workflow-index-fixture/` (orphaned after Python mock parsers removed)

## Validation

- [ ] Runtime behavior verification — **DEFERRED** to follow-up work (see Deviation #7). Plan 1 ships without LLM-in-the-loop verification of skill/mod/FO step behavior.
- [x] FO-related regression tests pass: 8/8 green (`tests/ -k "first_officer or merge_hook"` — existing tests, not Plan 1 additions)
- [x] Phase D tests continue to pass (merge-hook, gate-guardrail, scaffolding-guardrail, spike-termination, rejection-flow, output-format, dispatch-names)
- [x] Two-stage review completed per task: spec compliance + code quality via `superpowers:code-reviewer`
- [x] Task 18 cross-file contract drift caught by reviewer and fixed (`files`/`file` plural/singular mismatch with `write-mode.md`)
- [~] Plugin-layer forge pass — **DEFERRED** (see Deviation #4 correction and the follow-up plan in § Next)

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

### 4. Task 20 — CORRECTED: forge IS applicable (the previous version of this deviation was wrong)

**⚠ Self-correction (2026-04-11)**: An earlier version of this deviation claimed "kc-plugin-forge is scoped to Claude Code plugins, not applicable — spacedock has no plugin.json". **This was wrong.** Spacedock IS a Claude Code plugin. The manifest lives at `.claude-plugin/plugin.json` (name: `spacedock`, version: `0.9.0`) — the standard CC plugin sub-directory location. A root-level `ls plugin.json` failure does NOT establish absence; only `find . -name plugin.json` does. The earlier deviation built a 3-paragraph justification on one weak negative-evidence check and documented it as institutional fact. That justification was a landmine for any future reader. This corrected version replaces it.

**What actually happened**:

1. The plan's Task 20 specified "Invoke via Skill tool: `kc-plugin-forge` with route `audit` against `skills/workflow-index/`" and "Run kc-plugin-forge verify-agents". Two problems with the plan as-written:
   - **Bad route name**: `kc-plugin-forge` has no `audit` route. Actual routes are `new <name>`, `<path>`, `validate-only`, `skill-tdd-only`, `agent-verify-only`, `self-forge`, and `dreaming`. The plan invoked a fictional route.
   - **Bad target scope**: Even if `audit` existed, the plan pointed it at a single skill subdirectory (`skills/workflow-index/`) rather than the plugin root. Forge takes plugin paths, not skill paths.

2. During execution, I diagnosed the route/scope mismatch, then incorrectly generalized to "forge doesn't apply at all because spacedock isn't a plugin". The leap from "this specific invocation is wrong" to "this entire tool doesn't apply" was where the error entered — and it was the *wrong* generalization. The correct generalization was "this specific invocation is wrong; the correct invocation is `kc-plugin-forge /Users/kent/Project/spacedock` (repo root) via the `<path>` route".

3. I performed a manual structural audit (frontmatter checks, reference file existence) as a substitute, which happened to cover Phase 1 of forge but missed all of Phase 2 (writing-skills pressure tests), Phase 2.4 (frontmatter audit), Phase 2.5 (clean profile smoke), and Phase 3 (agent verify). These are the phases where forge would have added value over hand-rolled checks.

**Correct routing for Task 20-level validation**:

- **Plugin structural validation** → `kc-plugin-forge /Users/kent/Project/spacedock` with route `validate-only`, OR invoke `plugin-dev:plugin-validator` directly
- **Skill pressure-test (discipline)** → `Skill: superpowers:writing-skills` pointed at individual SKILL.md files (`skills/workflow-index/SKILL.md`, `skills/knowledge-capture/SKILL.md`), or `kc-plugin-forge` route `skill-tdd-only`
- **Skill output-grade eval** → `Skill: skill-creator` pointed at skill directories, or `kc-plugin-forge --use-skill-creator skill-tdd-only`
- **Agent regression** → `kc-plugin-forge` route `agent-verify-only` against `agents/ensign.md`, `agents/first-officer.md`, `agents/science-officer.md`

**Scope-scoping caveat**: `kc-plugin-forge` runs on all skills in the plugin, not a subset. Spacedock has 12 skills; scoping to just Phase E Plan 1's 2 new skills (`workflow-index`, `knowledge-capture`) requires invoking `writing-skills` and `skill-creator` directly per skill rather than going through forge's plugin-level phases. Forge's full-plugin run is appropriate for periodic quality baselines, not per-plan targeted validation.

**Status as of Stage Report commit (2026-04-11)**:

- Task 20 did NOT run any of the correct validation tools — only the manual structural audit, which was later invalidated along with the 49 structural tests (see Deviation #7 below)
- Plan 1 Foundation shipped WITHOUT runtime behavior verification
- Follow-up plan (tracked for execution after this Stage Report is committed): run `superpowers:writing-skills` pressure tests on `workflow-index`, `knowledge-capture`, `workflow-index-maintainer` mod, and the FO step 3.6 reference; run `skill-creator` output-grade eval on `workflow-index` read/write/check modes

**Root cause**: See `plan-write-discipline.md` memory entry for the five-layer discipline that would have prevented both the route-name guess and the "not a plugin" misdiagnosis at plan-write time. Key missing checks: `find` not `ls` for negative existence, MEMORY.md architecture scan before architecture claims, internal consistency check between namespace decision (`spacedock:*` implies plugin) and architecture assertions.

**Lesson**: A deviation written into a durable Stage Report is 10x more dangerous than a transient mistake in conversation. Any "X doesn't apply" claim destined for a Stage Report must cite strong evidence (read the manifest, run `find`, quote the tool's routing documentation) — not weak evidence like a single `ls` failure. When in doubt, downgrade the claim from "doesn't apply" to "needs verification before applying".

### 5. Minor cruft — `skills/workflow-index/fixtures/` empty directory

An empty `fixtures/` directory exists inside `skills/workflow-index/` (created during Task 1's directory skeleton). The actual workflow-index fixtures live at `tests/fixtures/workflow-index-fixture/` per plan. Not a structural error (empty dirs are tolerated), but worth cleanup in Plan 2 or a follow-up commit.

### 6. Task 18 — workflow-index-maintainer contract drift (fixed, commit `ce5118a`)

**Issue**: Code reviewer found that the mod's idle-hook `update-status` payload used `files:` (plural) but `write-mode.md:47` specifies `file:` (singular), and that the mod's Recently Retired age-out logic was described as mod-side but `write-mode.md:55` delegates to the skill via Last Updated inspection.

**Resolution**: Fixed the mod to loop per file at the mod layer (one `update-status` call per file), delegated Recently Retired age-out to the skill, and documented the known gap (no explicit `shipped_date` input — skill must infer from Last Updated) inline in the mod as a "**Known gap (tracked for Phase E Plan 1 follow-up)**" marker.

**Lesson**: Structural tests (file existence + section header + keyword presence) cannot catch payload-schema drift between a mod and the skill it invokes. Two-stage review's cross-file coherence check was the only mechanism that caught this. The pattern generalizes: **any mod or agent that constructs a skill-invocation payload must be cross-checked against the skill's declared input schema, not just against its own structural tests.**

### 7. Post-ship — all 49 structural tests removed (commit `4d7a3d4`)

**Issue**: After the initial Stage Report was committed at `fa399c3`, captain review pushed back on the "49/49 tests passing" claim with the challenge: "說明你怎麼測試的，因為目前的實作基本上是一堆 prompt". Honest breakdown of the 49 tests revealed:

- **27 tests (55%)** — pure existence / frontmatter / YAML parse checks (`test_skill_file_exists`, `test_mod_has_frontmatter_with_name`, `test_fixtures_directory_exists`, etc.)
- **18 tests (37%)** — keyword grep in prose (`assert "append" in content.lower()`, `assert "CRITICAL" in content`, `assert "Pending Knowledge Captures" in content`)
- **4 tests (8%)** — Python re-implementations of spec semantics (`parse_contracts_by_file`, `parse_decisions_filter_active` — tests the Python mock, NOT the skill itself)

**Zero tests** invoked an LLM with the skill prompt and verified the documented behavior. The tests provided false confidence — they would ship the same "green" signal whether the prompts worked or not. Task 18's `files`/`file` payload-schema drift is the concrete proof: all 4 mod structural tests passed unchanged through that bug.

**Resolution**: Removed all 49 tests + orphaned fixture in commit `4d7a3d4`. The shipped skill/mod/reference files remain intact — only the structural test shells are gone.

**Why this is the right call**:
- Structural tests on markdown prompts test the wrong thing. They verify the prompts *exist with right keywords*, not that the prompts *work when an LLM follows them*.
- Leaving them in place normalizes "green = validated" when what was validated is "markdown files contain strings". Any future reader who sees "49 tests passing" would reasonably assume the skills are verified — they aren't.
- `plugin-dev:plugin-validator` covers structural validation properly (manifest, skill frontmatter, reference existence) without the false-confidence problem.
- Runtime behavior verification needs LLM-in-the-loop tools: `superpowers:writing-skills` pressure tests, `skill-creator` evals, `claude --bare` smoke tests against fixtures, dogfood through real entities.

**What replaces the tests**:
- **Structural**: `kc-plugin-forge /Users/kent/Project/spacedock` Phase 1 (plugin-validator) — runs against the whole plugin, not just Plan 1 additions
- **Discipline skill prompt quality**: `Skill: superpowers:writing-skills` targeting `workflow-index`, `knowledge-capture`, `workflow-index-maintainer` mod, `first-officer-shared-core.md` step 3.6 — RED/GREEN/REFACTOR pressure scenarios
- **Output-grade skill quality**: `Skill: skill-creator` targeting `workflow-index` (whose read/write/check modes produce verifiable artifacts — the `--use-skill-creator` case)
- **Runtime lifecycle**: dogfood through a real build-pipeline entity that exercises capture → stage → apply → CLAUDE.md write. Deferred because it requires Phase E Plan 2's work to be in place to trigger the lifecycle naturally.

**Status**: Structural tests removed. Runtime verification deferred. Plan 1 ships as "prompt layer built; behavior verification pending follow-up". Follow-up tracked in § Next.

**Lesson**: "Tests" on prompt-layer content must use prompt-layer tools. Writing pytest assertions against markdown files is category error — you're testing the wrong substrate. If you find yourself writing `assert "keyword" in content.lower()` as the primary verification mechanism, stop — you need writing-skills or skill-creator, not pytest.

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
