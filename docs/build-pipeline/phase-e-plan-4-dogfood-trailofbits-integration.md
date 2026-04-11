---
id: 062
title: Phase E Plan 4 -- Dogfood Trail of Bits Integration + Case B Cleanup
status: draft
context_status: pending
source: /build
created: 2026-04-11T16:12:27Z
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

> Phase E Plan 4 dogfood: exercise the full new 10-stage pipeline end-to-end on a small, intrinsically valuable scope that binds Phase 4 prerequisites to real delivery. Three coupled deliverables: (1) correct the spec §1033 agent-vs-skill category error by updating `skills/build-review/SKILL.md` to treat trailofbits plugins as skills invoked via Skill tool (not agents dispatched via Agent); (2) declare plugin dependencies (trailofbits/skills marketplace + pr-review-toolkit + e2e-pipeline + feature-dev plugin, whose `code-explorer` agent is used by SO/build-explore for deep codebase mapping alongside the built-in `Explore` agent) in a new repo-root `.claude/settings.json` so anyone cloning spacedock gets auto-prompted to install; (3) delete Case B from `mods/workflow-index-maintainer.md` IFF this entity's own plan→execute run produces real CONTRACTS.md rows via the Plans 2/3 append hooks (live verification is the deletion gate — no hook fire, no deletion). Failure at any stage is Phase 4 data, not a bug; fix-forward commits or follow-up entities are the escape valves. Ground truth: `~/.claude/projects/-Users-kent-Project-spacedock/memory/phase-e-plan-2-6-execution-plan.md` + `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` §§960-975 Success Criteria #7-#11.

## Captain Context Snapshot

- **Repo**: phase-e/plan-1-foundation @ 8b89554 (spacedock)
- **Session**: Phase 3 shipped 2026-04-11 (`2885ab2` pipeline README restructure + `8b89554` overhaul skill skeleton + profiles eliminated). Waves 1-4 + Captain Gate + Phase 2 + Phase 3 all green. Phase 4 is the **first live dogfood** through the new 10-stage pipeline after all skill shipments. 5 new skills (build-plan / build-execute / build-quality / build-review / build-uat) + 2 new agents (researcher / task-executor) are about to be live-dispatched under real workflow conditions for the first time.
- **Domain**: Runnable / Invokable (skill SKILL.md correction), Configurable / Install-time (settings.json plugin declaration), Organizational / Data-transforming (mod cleanup conditional on live verification event)
- **Related entities**:
  - `phase-e-plan-2-research-and-plan-skills` (id 061) — Plan 2 design reference. Its 5 acceptance criteria are retroactively satisfied by Waves 1-2 output; keep as design reference, mark shipped after this entity live-validates build-plan
  - `entity-body-rendering-hotfixes` (id 047) — Phase D dogfood, untouched per spec §Current State
- **Reference docs**: `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` §§700-760 (Pending Knowledge Captures format + FO step 6.5), §§788-860 (CONTRACTS/DECISIONS/INDEX format), §§933-975 (Migration Strategy + 12 Success Criteria), §1033 (References — the line with the trailofbits agent-vs-skill category error). Memory: `phase-e-plan-2-6-execution-plan.md` (Wave 1-4 + Captain Gate + Phase 2/3 shipped sections), `workflow-index-lifecycle-gap.md` (Case B deletion preconditions), `contract-tests-cover-unconditional-calls.md` (why build-execute × workflow-index BLOCKER proves API drift risk).
- **Pre-verified at entity draft time (2026-04-11)**:
  - ✅ FO step 6.5 pending-capture detection shipped in `references/first-officer-shared-core.md:210-212` (invokes `knowledge-capture` skill with `mode: apply` on non-empty `## Pending Knowledge Captures` section)
  - ✅ Entity body conventions formalized in `docs/build-pipeline/README.md` (line 291-294 `## Research Findings` / `## PLAN` / `## UAT Spec` / `## Validation Map`; line 352 `## Pending Knowledge Captures`; line 371 `## UAT Results`)
  - ✅ 4 trailofbits plugins observably installed in current CC session as **skills**: `sharp-edges:sharp-edges`, `variant-analysis:variant-analysis` (+ `variant-analysis:variants`), `insecure-defaults:insecure-defaults`, `mutation-testing:mutation-testing`
  - ❌ `differential-review` NOT observed in current CC session skill list — may be unpublished, renamed, or in a different marketplace; Open Question for explore
  - ✅ `pr-review-toolkit` agents visible: `code-reviewer`, `silent-failure-hunter`, `code-simplifier`, `comment-analyzer`, `pr-test-analyzer`, `type-design-analyzer` (these are **real Agent dispatch targets**, unlike trailofbits which are skills)
  - ⚠️ `mods/workflow-index-maintainer.md` Case B block sits at lines 56-73 with explicit `**Do NOT delete Case B before verifying the proper append path exists in Plans 2/3.**` flag — Plans 2/3 append hooks are now shipped but have not yet fired in a live pipeline run; this entity's own plan→execute event will be that first fire
- **Created**: 2026-04-11T16:12:27Z

## Brainstorming Spec

**APPROACH**: Ship three coupled deliverables as one small entity through the full 10-stage Phase E pipeline, using the entity's own live execution as the verification event that gates Case B deletion. **Deliverable 1** (`skills/build-review/SKILL.md` spec §1033 correction): remove the "dispatch trailofbits agents via Agent tool" framing and replace with the correct integration model — trailofbits plugins are Skill-tool-invokable skills, not Agent-tool-dispatchable agents. Exact integration mechanism is an Open Question for explore stage (orchestrator direct `Skill()` calls vs. invocation from inside a pr-review-toolkit review agent vs. thin agent wrappers vs. other). **Deliverable 2** (`.claude/settings.json`): create repo-root settings.json declaring trailofbits/skills marketplace + pr-review-toolkit + e2e-pipeline + feature-dev as plugin dependencies using Claude Code's canonical declarative schema (exact field structure to be verified during explore -- likely `extraKnownMarketplaces` + `enabledPlugins` but the schema has not been grounded against live CC docs). The feature-dev plugin bundles the `code-explorer` agent that SO/build-explore dispatches for deep codebase mapping in fresh-context subagent isolation; the built-in top-level `Explore` agent is always available as the lightweight alternative and needs no plugin declaration. Purpose: any new developer or AI session that clones spacedock gets prompted to install the dependencies rather than silently-failing at build-review dispatch time OR at SO/build-explore's fresh-context mapping dispatch. **Deliverable 3** (`mods/workflow-index-maintainer.md` Case B deletion): delete the retroactive entity-append block IFF this entity's own plan stage (via build-plan unconditional `workflow-index append` at approval) AND execute stage (via build-execute `update-status-bulk` at stage entry) successfully populate `docs/build-pipeline/_index/CONTRACTS.md` with rows for this entity's `files_modified`. If either hook fails to fire, Case B remains in place and the failure becomes a fix-forward follow-up entity; no silent Case B deletion.

**ALTERNATIVE**: Split into two entities — one for trailofbits spec correction + settings.json declaration, one for Case B cleanup. **D-01 Rejected** because both scopes share the same live verification event (the dogfood plan→execute run). Splitting would double the pipeline dispatch cost, reduce cross-task signal coupling, and force Case B deletion to wait for a second dogfood dispatch when the first entity could have validated it for free. The coupling IS the point — Phase 4's dogfood value comes from exercising every stage once; splitting trades that consolidation for false modularity.

**ALTERNATIVE 2**: Use a minimal dashboard tweak or docs fix as the dogfood target (spec §951 migration step 13 recommendation) instead of Phase 4 prerequisites. **D-02 Rejected** because a contrived scope (e.g., "add a missing README line") would run the pipeline without delivering real value — the pipeline would pass all stages but we'd learn nothing about Phase 4 prereqs. Binding dogfood to prereqs means every stage's work is simultaneously pipeline validation AND delivery, zero throwaway cost, and any failure directly surfaces a real Phase 4 blocker.

**GUARDRAILS**:
- **CRITICAL — Case B deletion is live-verification-gated**: do NOT delete Case B from `mods/workflow-index-maintainer.md` unless both (a) plan stage Stage Report records that build-plan invoked `workflow-index append` and CONTRACTS.md contains rows for this entity's files_modified with `status: planned`, AND (b) execute stage Stage Report records that build-execute invoked `workflow-index update-status-bulk` and those same rows transitioned to `in-flight` or `final`. Partial verification (only one of the two) → Case B remains, gap logged as fix-forward follow-up entity. Source: `workflow-index-lifecycle-gap.md` memory + `tests/pressure/build-execute-workflow-index-contract.yaml` 5th contract test shipped during Captain Gate.
- **No fabricated version numbers or marketplace URLs**: `.claude/settings.json` plugin entries MUST cite verified names from live plugin discovery (Agent dispatch to `find-skills` or similar enumeration), NOT guessed. Per `~/.claude/CLAUDE.md` No-fabricated-version-numbers rule. If the exact field schema for declarative marketplace addition cannot be confirmed via live CC docs or existing settings.json precedent, settings.json creation is deferred to a follow-up entity and this entity ships only Deliverables 1 + 3.
- **spec §1033 correction is a category error fix, not a design change**: `skills/build-review/SKILL.md` must stop calling trailofbits "agents" but the exact replacement integration model (direct Skill() from orchestrator vs. nested invocation from pr-review-toolkit agents vs. thin agent wrappers) is an Open Question that explore stage must answer before plan stage commits to an approach. Do NOT guess the integration model during drafting; guard against plan-stage auto-resolution with an explicit clarify-locked decision.
- **Engine-freeze preserved**: no new engine schema fields, no new stage primitives, no new frontmatter fields. `.claude/settings.json` is a Claude Code harness file read by the CC runtime, NOT an engine file parsed by `clkao/spacedock` engine. Mod deletion is a workflow-layer change. build-review SKILL.md edits are skill-layer. All three deliverables stay strictly workflow-layer, consistent with spec §Engine Boundary (§§861-886).
- **Dogfood discipline — failure is data**: any stage failure during this entity's pipeline run is a Phase 4 finding to be logged (UAT Results / Stage Report) and either fix-forwarded OR spawned as a follow-up entity. Captain catches decision points at gates. Do NOT suppress failures, do NOT retry loop, do NOT silently bypass acceptance criteria. Source: `~/.claude/CLAUDE.md` circuit breaker + root-cause-first rules.
- **Namespace**: `skills/build-*/` and `spacedock:*` per Phase E Plan 2 namespace decision (no `spacebridge:*` until Phase F entity 055). Spec line 44's "straight into spacebridge:*" phrasing is wrong on timing and should be read as "eventually". Preserved by the Phase 2 namespace sweep (`15772ac`).
- **Plan-write discipline applies to the plan stage** (not to this draft): when build-plan runs for this entity, the resulting PLAN MUST start with Task 0 Environment Verification per `plan-write-discipline.md` memory — mechanically verify file existence claims, namespace assumptions, current pipeline state, and that Plans 2/3 workflow-index hooks are actually wired into build-plan/build-execute SKILL.md before proceeding.
- **Fresh-context dispatch for codebase mapping (architectural finding surfaced 2026-04-12)**: build-explore's current Step 2 does inline grep/Read/store in the caller's context, which conflicts with Phase E Guiding Principle #5 ("Fresh context via subagent dispatch, not stage split"). SO in SO-direct mode and ensign in FO mode both inherit the inline pattern. For this entity's explore execution, the mapping pass MUST be delegated to `feature-dev:code-explorer` (deep analysis, requires feature-dev plugin enabled in `.claude/settings.json` per Deliverable 2) with fallback to the built-in `Explore` agent (lightweight general search, always available) via Agent dispatch from the SO-direct context. This is an **experimental override** of build-explore Step 2 for this entity only, captured in Stage Report: explore as evidence. The structural question of where the routing logic (deep-vs-general selection criteria) and the refactor path (mode-aware build-explore / extract mapping to caller / new `skills/code-explorer/` subroutine skill symmetric to `skills/build-research/`) should live is a clarify-class decision -- build-explore Step 6 will surface it as a Track C Open Question, and clarify stage will lock the design via AskUserQuestion. Until then, this entity ships its own scope without pre-committing to a build-explore refactor. Follow-up entity (or entity 062 plan task) spawns from clarify's outcome.

**RATIONALE**: This entity is Phase 4 dogfood AND real delivery simultaneously — the strongest possible correlation per the captain's "強正相關" framing. Three design choices make it work: (1) **shared verification event** — Case B deletion's precondition (CONTRACTS.md has live rows) is produced by the same plan→execute run that validates Plans 2/3's append hooks; no separate verification dispatch needed. (2) **coupled failure modes expose real bugs** — if build-review tries to Agent-dispatch `trailofbits:sharp-edges` (per the buggy spec §1033 framing) and crashes, that's a production-grade reproduction of the spec category error, trivially fix-forwardable via Deliverable 1. (3) **first live exercise of 5 new skills** — build-plan opus orchestration, build-execute wave graph + task-executor dispatch, build-quality mechanical checks, build-review pre-scan + parallel agent dispatch, build-uat e2e-pipeline integration + captain AskUserQuestion. Any one of them failing under real conditions is exactly the kind of drift the 4 review layers (teammate + CQR + main-agent contract authoring + captain gate mechanical pass) could not catch — the build-execute step 2 API BLOCKER (`d10c66c`) and the Phase 2 entry namespace BLOCKER (`15772ac`) already proved this risk twice. Entity 061 as alternative dogfood target would be contrived (its deliverables are already shipped); a minimal dashboard tweak would run the pipeline without exposing real prerequisites. This entity ties Phase 4 validation directly to production delivery with zero throwaway cost. Line-of-sight mapping to spec Success Criteria: #7 (entity completes draft→shipped without workarounds), #9 (CONTRACTS.md rows from mod live), #11 (execute task subagent dispatch works), plus #2 indirectly (kc-plugin-forge validation during build-quality or review stage if time permits).

## Acceptance Criteria

1. `.claude/settings.json` exists at repo root, is git-tracked, parses as valid JSON, and declares trailofbits/skills marketplace + pr-review-toolkit + e2e-pipeline + feature-dev as plugin dependencies using Claude Code's canonical declarative schema. Exact field names verified against live CC docs or existing settings.json precedent at explore stage. (verify: `test -f .claude/settings.json` AND `python3 -c "import json; json.load(open('.claude/settings.json'))"` exits 0 AND `grep -E "trailofbits|pr-review-toolkit|e2e-pipeline|feature-dev" .claude/settings.json` returns ≥4 matches)

2. `skills/build-review/SKILL.md` no longer describes trailofbits plugins as agents dispatched via Agent tool. Integration model for trailofbits inside build-review is explicit and clarify-locked. No `TBD` / `architectural-unknown` / "verify at implementation time" markers remain for trailofbits identifiers. (verify: `! grep -nE "[Tt]railofbits.*[Aa]gent\b|\bAgent.*trailofbits|TBD.*trailofbits|architectural.unknown.*trailofbits" skills/build-review/SKILL.md`)

3. This entity's `## Stage Report` for plan stage records that build-plan invoked `workflow-index append` at plan approval time, AND `docs/build-pipeline/_index/CONTRACTS.md` contains at least one row for this entity's slug with `status: planned`. (verify: after plan stage, `grep -c "phase-e-plan-4-dogfood-trailofbits-integration" docs/build-pipeline/_index/CONTRACTS.md` returns ≥1 AND at least one such row has `planned` in its status column; Stage Report contains the literal string `workflow-index append` in the plan stage section)

4. This entity's `## Stage Report` for execute stage records that build-execute invoked `workflow-index update-status-bulk` with `planned → in-flight` transition at stage entry. Post-execute, this entity's rows in CONTRACTS.md show `in-flight` (or `final` if execute completed concurrent with shipped). (verify: post-execute, `grep "phase-e-plan-4-dogfood-trailofbits-integration" docs/build-pipeline/_index/CONTRACTS.md | grep -v planned` returns ≥1 match; Stage Report contains the literal string `update-status-bulk` in the execute stage section)

5. `mods/workflow-index-maintainer.md` Case B block (lines 56-73 at HEAD `8b89554`) is removed **if and only if** both AC3 and AC4 passed. If either AC3 or AC4 failed during live execution, Case B remains at its current location and a fix-forward follow-up entity is spawned to diagnose the append/update-status gap. Deletion OR retention must be documented in this entity's `## UAT Results` with evidence (CONTRACTS.md row screenshot or grep output). (verify: `grep -c "Case B" mods/workflow-index-maintainer.md` returns 0 ONLY IF entity's UAT Results shows evidence of AC3 + AC4 pass; otherwise returns ≥1 AND UAT Results logs the retention reason)

6. Entity reaches `status: shipped` via the 10-stage Phase E pipeline (draft → brainstorm → explore → clarify → plan → execute → quality → review → uat → shipped) without captain state fixes beyond expected gates (clarify captain AskUserQuestion answers, UAT captain interactive sign-off, knowledge-capture apply prompts from FO step 6.5). (verify: entity frontmatter shows `status: shipped` AND Stage Reports exist for brainstorm / explore / clarify / plan / execute / quality / review / uat stages AND entity's branch history contains no `git commit --amend` commits beyond pre-commit hook failure recoveries)

7. At least one `## Pending Knowledge Captures` entry is written by at least one stage ensign during this entity's run (proves the D2 capture machinery fires end-to-end); FO step 6.5 detects it at the next dispatch event; captain sees the apply-mode AskUserQuestion prompt. Applied or rejected — either outcome satisfies this criterion as long as the full loop fired at least once. (verify: entity body contains `## Pending Knowledge Captures` section with ≥1 `<capture>` element OR FO Stage Report notes detection + apply invocation for this entity)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scale warrants it)

## Canonical References

(clarify stage will populate)
