---
id: 066
title: Overhaul Skill Implementation -- Recipe Engine + Pressure Tests
status: shipped
context_status: ready
source: captain
created: 2026-04-12T16:00:00+08:00
started: 2026-04-12T20:30:00+08:00
completed:
verdict:
score:
worktree:
issue:
pr: "#29"
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

Implement the overhaul skill (`skills/overhaul/SKILL.md`) so it actually executes recipes — currently it is a design skeleton only (shipped Phase E Plan 3, commit `8b89554`). The skill must consume YAML recipe files per `skills/overhaul/references/recipe-format.md` and apply 4-phase transformations (Discovery → Validate → Diff Preview → Apply) to commissioned workflow READMEs.

Key deliverables:
1. Working Phases 1-4 implementation that can execute recipe primitives (frontmatter ops, body ops, cross-reference ops)
2. Pressure tests: `tests/pressure/overhaul.yaml` with 3-5 forced-choice scenarios covering engine-freeze discipline, recipe validation failure modes, cross-reference maintenance, and namespace grounding
3. Validation: replay `docs/overhaul/recipes/phase-e-plan-3-build-pipeline.yaml` against a pre-edit snapshot of `docs/build-pipeline/README.md` and diff against the actual manual edit result — byte-for-byte match confirms correctness

Constraints:
- Must preserve engine-freeze principle (overhaul always lags engine, never leads)
- Must handle the 6 `manual_edit` ops in the reference recipe — either implement the missing primitives or document which are deferred
- ~~Entity stops at clarify~~ CORRECTED: no bootstrap recursion -- build-plan can plan overhaul normally. Proceed through full FO pipeline.

## Captain Context Snapshot

- **Repo**: main @ 5ed401f (spacedock)
- **Session**: SO triage session -- captain evaluating 3 strategic initiatives (overhaul / spacebridge split / Next.js dashboard). Overhaul chosen as highest-priority due to zero blockers and enabling value for future workflow evolution.
- **Domain**: Runnable / Invokable (skill implementation), Readable / Textual (SKILL.md + recipe-format.md + reference recipe), Organizational / Data-transforming (transforms workflow README YAML + markdown)
- **Scope flag**: ⚠️ likely-decomposable
- **Related entities**:
  - 061 -- Phase E Plan 2 (stale -- work shipped outside pipeline)
  - 040 -- spacedock-plugin-architecture-v2 (draft -- relates to namespace future)
  - 065 -- Flatten Dispatch Troops Architecture (draft -- concurrent Phase F work)
- **Reference docs read**: skills/overhaul/SKILL.md (150 lines), skills/overhaul/references/recipe-format.md (251 lines), docs/overhaul/recipes/phase-e-plan-3-build-pipeline.yaml (383 lines)
- **Created**: 2026-04-12T16:00:00+08:00

## Brainstorming Spec

**APPROACH**: Implement overhaul as a procedural 4-phase skill that reads a YAML recipe file and a target workflow README, then applies transformation operations in dependency order. Phase 1 (Discovery) parses both files and presents a summary. Phase 2 (Validate) checks recipe consistency against current target state -- every `remove-stage` targets an existing stage, every `add-stage.after` references a valid anchor, no conflicting ops, every `skill:` prefix resolves against `plugin.json`. Phase 3 (Diff Preview) computes the full transformation in memory and presents a before/after diff to the captain via `AskUserQuestion` (loaded via `ToolSearch`). Phase 4 (Apply) executes ops in order (frontmatter first, body second, cross-references third), writes the README atomically via a single `Write` call, then post-validates (YAML parse, heading-stage correspondence, skill ref resolution). The implementation lives entirely within `skills/overhaul/SKILL.md` as prose-driven procedure -- the skill IS the implementation (Claude reads SKILL.md and executes the steps, same as build-plan/build-execute). For the 6 `manual_edit` ops in the reference recipe that require primitives not yet in recipe-format.md, implement the 3 highest-value missing primitives (`replace-table-block`, `update-yaml-block`, `update-section` for H2 headings) and defer `update-table-row` with explicit "DEFERRED" markers in the recipe format reference doc. (✓ confirmed by explore: 6 manual_edit ops map to 4 missing primitives -- `update-prose-block` already exists in recipe-format.md:183; `replace-table-block`, `update-yaml-block`, `update-section` are the 3 highest-value; `update-table-row` is the 4th, lower priority -- see O-1)

**ALTERNATIVE**: Implement overhaul as a standalone TypeScript/Bun executable under `skills/overhaul/bin/` (similar to `skills/commission/bin/`) that programmatically parses YAML with a comment-preserving library, manipulates an AST, and writes the result. This would enable true byte-for-byte replay validation and handle edge cases (comment preservation, field ordering) that prose-driven Claude execution cannot guarantee deterministically. -- D-01 Rejected because: (a) the reference recipe's own notes (lines 241-243) acknowledge that comment-preserving YAML parsing is a Phase E+1 implementation detail, not a prerequisite; (b) a programmatic implementation adds a maintenance surface (TypeScript code, dependencies, build step) that the prose-driven approach avoids entirely; (c) the existing build-* skills prove the prose-driven pattern works at scale (build-plan is 29.5K of SKILL.md, build-execute similar); (d) deterministic byte-for-byte replay can be validated post-hoc via `git diff --no-index` even with prose-driven execution -- non-match triggers a revision loop, not a structural failure.

**GUARDRAILS**:
- **Engine-freeze principle is load-bearing**: overhaul MUST NOT introduce new frontmatter fields, stage types, gate semantics, or mod hooks. Validation: post-apply grep of target README for any field not in the engine's schema (per `docs/build-pipeline/README.md` Field Reference table). Source: SKILL.md lines 27-35.
- **`commissioned-by:` gating**: overhaul MUST refuse to operate on files lacking `commissioned-by:` frontmatter. This prevents accidental overhaul of entity files, archive files, or non-workflow docs. Source: SKILL.md line 123.
- **Phase 3 approval gate is non-skippable**: diff preview MUST be presented to captain before any writes. No auto-advance, no "looks safe" shortcut. Source: SKILL.md line 122, `plan-payloads-are-templates.md` memory (recipes go stale).
- **Single atomic Write**: Phase 4 writes the entire transformed README in one `Write` call. No partial writes, no Edit-based incremental patches that could leave the file in an inconsistent state if interrupted. Source: SKILL.md line 108.
- **~~Stop-at-clarify~~** REMOVED: originally wrote "same bootstrap pattern as entity 061" but that was incorrect pattern over-application. Entity 061 had genuine bootstrap recursion (building build-plan itself). Entity 066 builds the overhaul skill -- build-plan can plan this normally. Proceed through full FO pipeline.

**RATIONALE**: The prose-driven approach is the natural fit because overhaul is a Claude Code skill -- its "runtime" is Claude reading the SKILL.md and executing steps, same as every other build-* skill in the pipeline. The existing design skeleton already describes the 4 phases in sufficient detail for Claude to execute them; the implementation work is (a) tightening the prose to be unambiguous enough for reliable execution, (b) adding the 3 missing recipe primitives to recipe-format.md, (c) writing pressure tests that force-choice the key discipline boundaries (engine-freeze, validation-before-write, approval-gate-before-apply), and (d) validating via reference recipe replay. The TypeScript alternative would be more deterministic but introduces a maintenance and distribution surface that contradicts the "skill is just a markdown file" design philosophy proven by Phase E's 8 shipped skills.

## Acceptance Criteria

- Overhaul skill executes Phase 1-4 end-to-end when invoked on a commissioned workflow README with a valid recipe. (how to verify: invoke `Skill: "overhaul"` with `docs/build-pipeline/README.md` + a minimal 2-op test recipe, confirm Discovery summary appears, Validation passes, Diff Preview is presented, and Apply produces a correctly transformed README)
- Recipe primitives `replace-table-block`, `update-yaml-block`, and `update-section` are documented in `skills/overhaul/references/recipe-format.md` with schema examples. (how to verify: `grep -c "replace-table-block\|update-yaml-block\|update-section" skills/overhaul/references/recipe-format.md` returns >= 3)
- Phase 2 validation rejects invalid recipes with structured error messages -- at minimum: removing a non-existent stage, adding a stage after a non-existent anchor, and conflicting ops on the same stage. (how to verify: invoke overhaul with 3 deliberately broken recipes, confirm each halts at Phase 2 with a specific error message naming the invalid op)
- Pressure tests exist at `tests/pressure/overhaul.yaml` with >= 3 forced-choice scenarios. (how to verify: `python3 -c "import yaml; d=yaml.safe_load(open('tests/pressure/overhaul.yaml')); assert len(d['test_cases']) >= 3"`)
- Reference recipe replay produces a README that matches the manual Phase 3 edit. (how to verify: check out pre-edit commit, run overhaul with `phase-e-plan-3-build-pipeline.yaml`, diff against post-edit commit via `git diff --no-index`, zero diff or documented deviations for `manual_edit` ops that map to deferred primitives)

## Assumptions

A-1: Recipe-format.md is the canonical recipe schema source; SKILL.md defers to it explicitly.
Confidence: Confident
Evidence: skills/overhaul/SKILL.md:39 -- "See references/recipe-format.md for the full schema."
→ Confirmed: captain, 2026-04-12 (batch)

A-2: Cross-reference updates (Model Dispatch table, Schema enum, Prerequisites) fire automatically as side-effects of frontmatter ops (remove-stage, add-stage, rename-stage), not as explicit recipe ops.
Confidence: Confident
Evidence: skills/overhaul/SKILL.md:56-59 -- side-effect rules defined inline; recipe-format.md:56-78 -- each frontmatter op documents its cross-ref side-effects
→ Confirmed: captain, 2026-04-12 (batch)

A-3: `kc-plugin-forge` delegation in Phase 4 step 4 is optional, not required for initial implementation.
Confidence: Confident
Evidence: skills/overhaul/SKILL.md:113 -- "Optionally invoke kc-plugin-forge"
→ Confirmed: captain, 2026-04-12 (batch)

A-4: Markdown subsection boundaries use heading-level detection (from `###` to next `###` at same level), not regex on heading text alone.
Confidence: Confident
Evidence: skills/overhaul/references/recipe-format.md:242 -- explicit implementation guidance: "subsection boundaries are from this ### h to the next ### h at the same level"
→ Confirmed: captain, 2026-04-12 (batch)

A-5: Overhaul operates as prose-driven skill (Claude reads SKILL.md, executes steps), consistent with all build-* skills in the pipeline.
Confidence: Confident
Evidence: skills/build-plan/SKILL.md (29.5K), skills/build-execute/SKILL.md -- both are prose-driven, no bin/ executables; D-01 rejected the bin/ alternative
→ Confirmed: captain, 2026-04-12 (batch)

A-6: `update-prose-block` primitive already exists in recipe-format.md -- reference recipe manual_edit #1 (intro paragraph update) maps to this existing primitive, not a missing one.
Confidence: Confident
Evidence: skills/overhaul/references/recipe-format.md:183-195 -- `update-prose-block` with `anchor` field and paragraph boundary semantics fully defined
→ Confirmed: captain, 2026-04-12 (batch)

A-7: Pre-edit snapshot SHA for replay validation is `9d4e535`; post-edit SHA is `2885ab2`.
Confidence: Confident
Evidence: git log -- docs/build-pipeline/README.md shows `2885ab2 feat(phase-e-plan-3): overhaul build-pipeline README to Phase E 10-stage shape` with parent `9d4e535`
→ Confirmed: captain, 2026-04-12 (batch)

A-8: `plugin.json` name field (`spacedock`) is the sole prefix for Phase 2 `skill:` field validation. `spacebridge:` prefix is Phase F (entity 055), not in scope.
Confidence: Confident
Evidence: .claude-plugin/plugin.json:1 -- name: spacedock; all skill: fields in docs/build-pipeline/README.md use `spacedock:` prefix; SKILL.md:82 says validate against plugin.json name
→ Confirmed: captain, 2026-04-12 (batch)

## Option Comparisons

### O-1: Which missing recipe primitives to implement vs defer

The reference recipe's 6 `manual_edit` ops map to 4 missing primitives. `update-prose-block` already exists. The APPROACH commits to implementing 3 and deferring 1, but which 3?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Implement replace-table-block + update-section + update-yaml-block, defer update-table-row | Covers 5 of 6 manual_edit ops (table swap, section swap, yaml-in-code-fence); update-table-row is only needed for Field Reference single-row edits which are rare | Replay validation will have 1 documented deviation (Field Reference row edit) | Medium | Recommended |
| Implement all 4 primitives | Full replay coverage, zero documented deviations | update-table-row is complex (find table by header, match row by first column, update specific cells) for low reuse value | High | Viable |
| Implement replace-table-block + update-yaml-block only, defer update-section + update-table-row | Simpler scope, fewer primitives to design | Prerequisites section replacement (H2-level) would remain manual; 2 documented deviations in replay | Low | Not recommended |

→ Selected: Implement replace-table-block + update-section + update-yaml-block, defer update-table-row (captain, 2026-04-12, interactive)

### O-2: YAML frontmatter manipulation strategy

Overhaul must parse, modify, and rewrite YAML frontmatter in workflow READMEs. The target README has load-bearing comments (Namespace notes per recipe-format.md:241).

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Line-oriented parsing (split on `---` delimiters, field-level string ops) | Zero dependencies, proven pattern in commission/bin/status; preserves comments and field ordering by default | Complex for nested structures like `states[]` with multi-field stage entries; error-prone for indent-sensitive YAML | Medium | Recommended |
| Prose-driven in-memory (Claude reads the frontmatter, understands structure, writes the full block) | Claude's YAML comprehension handles nested structures naturally; no parsing code needed | Non-deterministic -- different runs may produce different whitespace/ordering; comments may be lost or repositioned | Low | Viable |
| Full YAML AST (ruamel.yaml or equivalent via Bash) | Deterministic round-trip, comment-preserving by design | Adds Python dependency, requires Bash integration, commission/refit don't use this pattern | High | Not recommended |

→ Selected: Line-oriented parsing (split on --- delimiters, field-level string ops) (captain, 2026-04-12, interactive)

## Open Questions

Q-1: What is the rollback strategy when Phase 4 post-validation fails after the atomic Write has already landed?

Domain: Runnable/Invokable

Why it matters: SKILL.md line 114 says "report failure with rollback instructions" but does not define what those instructions are. Since overhaul operates on git-tracked files, the simplest rollback is `git checkout -- {file}`, but the skill should document this explicitly. If the captain has uncommitted changes in the same file, rollback could destroy those changes.

Suggested options: (a) `git checkout -- {file}` with a warning about uncommitted changes, (b) Write a `.bak` copy before Phase 4 apply and restore on failure, (c) No automatic rollback -- present the validation errors and let the captain decide

→ Answer: No automatic rollback -- present validation errors and let captain decide (captain, 2026-04-12, interactive)

Q-2: Should the SKILL.md prose be tightened to procedural pseudo-code (numbered sub-steps with exact tool calls), or kept as natural-language paragraphs that Claude interprets?

Domain: Readable/Textual

Why it matters: The current SKILL.md is written as design specification prose ("Overhaul runs four phases..."). For reliable execution, each phase needs unambiguous steps like build-plan's "Step 1: Read entity file via Read tool. Step 2: Extract ## PLAN section..." The gap between "design skeleton" and "executable procedure" is the core implementation work -- the question is how prescriptive vs. flexible the prose should be.

Suggested options: (a) Full pseudo-code style matching build-plan/build-execute (numbered steps, explicit tool calls, exact section headers), (b) Hybrid -- Phase 2 validation as pseudo-code (most mechanical), Phases 1/3/4 as guided prose (more judgment needed), (c) Keep natural-language style and rely on examples in recipe-format.md to ground behavior

→ Answer: Full pseudo-code style matching build-plan/build-execute (captain, 2026-04-12, interactive)

## Decomposition Recommendation

Scope flag present but decomposition not recommended: 11 files across 4 layers (under 20-file threshold), and the 3 deliverables (SKILL.md implementation, recipe-format.md new primitives, pressure tests) are tightly coupled -- pressure tests validate the implementation, and the implementation depends on the primitive definitions. Splitting would create circular dependencies between child entities. The replay validation is an acceptance test, not a separate deliverable.

## Canonical References

(No external file paths cited by captain during clarify session -- all decisions grounded in existing entity body evidence from explore.)

## Stage Report: explore

- [x] Files mapped: 11 across skill, contract, test, config
  skill: 3 (overhaul SKILL.md, commission SKILL.md, refit SKILL.md), contract: 3 (recipe-format.md, reference recipe, plugin.json), test: 2 (build-plan.yaml schema ref, pressure README), config: 1 (build-pipeline README target), other: 2 (commission bin/status, README.md target body)
- [x] Assumptions formed: 8 (Confident: 8, Likely: 0, Unclear: 0)
  A-1 canonical schema, A-2 auto cross-refs, A-3 forge optional, A-4 heading boundaries, A-5 prose-driven pattern, A-6 update-prose-block exists, A-7 pre-edit SHA 9d4e535, A-8 spacedock prefix only
- [x] Options surfaced: 2
  O-1 which missing primitives to implement vs defer; O-2 YAML frontmatter manipulation strategy
- [x] Questions generated: 2
  Q-1 rollback strategy on post-validation failure; Q-2 SKILL.md prose style (pseudo-code vs natural language)
- [x] α markers resolved: 0 / 0
  no α markers present in brainstorming spec
- [x] Scale assessment: confirmed Medium
  11 files mapped, 2 option comparisons, 2 open questions -- consistent with Medium scale estimate

## Stage Report: clarify

- [x] Decomposition: not-applicable
  scope flag present but explore rejected split -- 11 files, tightly coupled deliverables
- [x] Assumptions confirmed: 8 / 8 (0 corrected)
  A-1 through A-8 all Confident, confirmed via batch
- [x] Options selected: 2 / 2
  O-1 primitives -- 3 of 4 (replace-table-block + update-section + update-yaml-block); O-2 YAML parsing -- line-oriented string ops
- [x] Questions answered: 2 / 2
  Q-1 rollback -- no auto-rollback, captain decides; Q-2 prose style -- full pseudo-code like build-plan
- [x] Canonical refs added: 0
  no external paths cited during clarify -- all decisions grounded in explore evidence
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  auto_advance not set -- captain must say "execute 066" or bridge to writing-plans
- [x] Clarify duration: 5 questions asked, session complete
  1 batch assumption confirmation + 2 AskUserQuestion option selections + 2 AskUserQuestion open questions
