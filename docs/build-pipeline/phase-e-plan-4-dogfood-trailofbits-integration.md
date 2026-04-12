---
id: 062
title: Phase E Plan 4 -- Dogfood Trail of Bits Integration + Case B Cleanup
status: quality
context_status: ready
source: /build
created: 2026-04-11T16:12:27Z
started: 2026-04-12T00:40:59Z
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-phase-e-plan-4-dogfood-trailofbits-integration
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

1. `.claude/settings.json` exists at repo root, is git-tracked, parses as valid JSON, and declares (a) `trailofbits` marketplace (github source `trailofbits/skills`) + `iamcxa-plugins` marketplace (github source `iamcxa/kc-claude-plugins`) in `extraKnownMarketplaces`, AND (b) enables these plugins in `enabledPlugins`: `pr-review-toolkit@claude-plugins-official`, `sharp-edges@trailofbits`, `variant-analysis@trailofbits`, `insecure-defaults@trailofbits`, `mutation-testing@trailofbits`, `differential-review@trailofbits`, `e2e-pipeline@iamcxa-plugins`. Schema verified at clarify stage against `~/.claude/settings.json:277-309` precedent. **`feature-dev` NOT declared** -- Q-5 resolution picked Path 1 (new in-plugin `spacedock:code-explorer` agent+skill), so spacedock ships its own code-explorer primitive and does not couple target projects to feature-dev. (verify: `test -f .claude/settings.json` AND `python3 -c "import json; json.load(open('.claude/settings.json'))"` exits 0 AND `grep -E "trailofbits|pr-review-toolkit|iamcxa-plugins|e2e-pipeline" .claude/settings.json` returns ≥4 matches AND `! grep -q feature-dev .claude/settings.json`)

2. `skills/build-review/SKILL.md` no longer describes trailofbits plugins as agents dispatched via Agent tool. Integration model for trailofbits inside build-review is explicit and clarify-locked. No `TBD` / `architectural-unknown` / "verify at implementation time" markers remain for trailofbits identifiers. (verify: `! grep -nE "[Tt]railofbits.*[Aa]gent\b|\bAgent.*trailofbits|TBD.*trailofbits|architectural.unknown.*trailofbits" skills/build-review/SKILL.md`)

3. This entity's `## Stage Report` for plan stage records that build-plan invoked `workflow-index append` at plan approval time, AND `docs/build-pipeline/_index/CONTRACTS.md` contains at least one row for this entity's slug with `status: planned`. (verify: after plan stage, `grep -c "phase-e-plan-4-dogfood-trailofbits-integration" docs/build-pipeline/_index/CONTRACTS.md` returns ≥1 AND at least one such row has `planned` in its status column; Stage Report contains the literal string `workflow-index append` in the plan stage section)

4. This entity's `## Stage Report` for execute stage records that build-execute invoked `workflow-index update-status-bulk` with `planned → in-flight` transition at stage entry. Post-execute, this entity's rows in CONTRACTS.md show `in-flight` (or `final` if execute completed concurrent with shipped). (verify: post-execute, `grep "phase-e-plan-4-dogfood-trailofbits-integration" docs/build-pipeline/_index/CONTRACTS.md | grep -v planned` returns ≥1 match; Stage Report contains the literal string `update-status-bulk` in the execute stage section)

5. `mods/workflow-index-maintainer.md` Case B block (lines 56-73 at HEAD `8b89554`) is removed **if and only if** both AC3 and AC4 passed. If either AC3 or AC4 failed during live execution, Case B remains at its current location and a fix-forward follow-up entity is spawned to diagnose the append/update-status gap. Deletion OR retention must be documented in this entity's `## UAT Results` with evidence (CONTRACTS.md row screenshot or grep output). (verify: `grep -c "Case B" mods/workflow-index-maintainer.md` returns 0 ONLY IF entity's UAT Results shows evidence of AC3 + AC4 pass; otherwise returns ≥1 AND UAT Results logs the retention reason)

6. Entity reaches `status: shipped` via the 10-stage Phase E pipeline (draft → brainstorm → explore → clarify → plan → execute → quality → review → uat → shipped) without captain state fixes beyond expected gates (clarify captain AskUserQuestion answers, UAT captain interactive sign-off, knowledge-capture apply prompts from FO step 6.5). (verify: entity frontmatter shows `status: shipped` AND Stage Reports exist for brainstorm / explore / clarify / plan / execute / quality / review / uat stages AND entity's branch history contains no `git commit --amend` commits beyond pre-commit hook failure recoveries)

7. At least one `## Pending Knowledge Captures` entry is written by at least one stage ensign during this entity's run (proves the D2 capture machinery fires end-to-end); FO step 6.5 detects it at the next dispatch event; captain sees the apply-mode AskUserQuestion prompt. Applied or rejected — either outcome satisfies this criterion as long as the full loop fired at least once. (verify: entity body contains `## Pending Knowledge Captures` section with ≥1 `<capture>` element OR FO Stage Report notes detection + apply invocation for this entity)

## Assumptions

A-1: `mods/workflow-index-maintainer.md` Case B deletion has no cross-entity impact -- all `docs/build-pipeline/_index/*.md` files are empty stubs at HEAD `a1829c1`, so no other entity relies on retroactive Case B tracking.
Confidence: Confident
Evidence: `docs/build-pipeline/_index/CONTRACTS.md:1-14` (14-line stub with `<!-- No active contracts yet -->`), `DECISIONS.md:1-9` (9-line stub), `INDEX.md:1-8` (8-line stub) -- none contain active rows
→ Confirmed: captain, 2026-04-12 (batch)

A-2: build-review already has established Skill() tool precedent for in-orchestrator nested skill invocation at Step 4 (`spacedock:knowledge-capture`), supporting Option A for the trailofbits integration model.
Confidence: Confident
Evidence: `skills/build-review/SKILL.md:26` (Tools Available: `Skill -- invoke spacedock:knowledge-capture in Step 4`), `skills/build-review/SKILL.md:139-147` (Step 4 invocation site)
→ Confirmed: captain, 2026-04-12 (batch)

A-3: Entity ID `062` poses no YAML octal parse risk -- spacedock tooling uses a hand-rolled frontmatter parser, not `yaml.safe_load`.
Confidence: Confident
Evidence: `scripts/codex_prepare_dispatch.py` (`parse_frontmatter_map` function), `scripts/codex_finalize_terminal_entity.py` -- neither imports `yaml`; entity ID stored as raw string via `line.partition(":")`. Parser authorship: clkao commit `a2d70b9c` (2026-04-01), not a spacedock-user addition -- spacedock engine is stdlib-only by original design choice, so PyYAML's octal interpretation was never in the runtime path.
→ Confirmed: captain, 2026-04-12 (batch)

A-4: Namespace `spacedock:*` is consistently used across all Phase E `skills/build-*` files after the Phase 2 sweep commit `15772ac`; no residual `spacebridge:*` dispatch references exist.
Confidence: Confident
Evidence: commit `15772ac` (49 refs updated); grep across `skills/build-*/SKILL.md` returns zero dispatch-call matches for `spacebridge:`; one forward reference to `/spacebridge:uat-audit` in `build-uat/SKILL.md:188` is a future slash command, not a dispatch target
→ Confirmed: captain, 2026-04-12 (batch)

A-5: The 6 `pr-review-toolkit:*` agents (code-reviewer, silent-failure-hunter, comment-analyzer, pr-test-analyzer, type-design-analyzer, code-simplifier) are real Agent-tool dispatch targets, distinct from trailofbits skills.
Confidence: Confident
Evidence: current CC session tool list exposes all 6 under `pr-review-toolkit:*` namespace as Agent `subagent_type` values; `docs/build-pipeline/README.md:183` lists them under "Required for full pipeline -- review and UAT stages"
→ Confirmed: captain, 2026-04-12 (batch)

A-6: The 4 observably-installed trailofbits plugins (`sharp-edges`, `variant-analysis`, `insecure-defaults`, `mutation-testing`) are Skill-tool-invocable skills, NOT Agent-tool-dispatchable agents -- confirming the spec §1033 category error.
Confidence: Confident
Evidence: current CC session skill list shows `sharp-edges:sharp-edges`, `variant-analysis:variant-analysis` (+`variants`), `insecure-defaults:insecure-defaults`, `mutation-testing:mutation-testing` as Skill-tool skills; no `trailofbits:*` or equivalent entries in the Agent `subagent_type` namespace
→ Confirmed: captain, 2026-04-12 (batch)

## Option Comparisons

### Integration model for trailofbits inside build-review

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| A. Orchestrator direct `Skill()` calls from build-review ensign context | Matches existing Step 4 precedent (knowledge-capture Skill() call); zero new agent files; trailofbits skills execute inline in orchestrator context | Sequential execution of trailofbits skills (no parallelism within that subset; pr-review-toolkit agents still dispatched in parallel); orchestrator context accumulates trailofbits output; violates Phase E GP#5 for review work (bookkeeping exception applies to knowledge-capture only) | Low | Viable |
| B. Nested `Skill()` invocation from inside a dispatched pr-review-toolkit agent | Keeps all review work in parallel subagent contexts | Requires modifying external pr-review-toolkit agent definitions (out of scope); pr-review-toolkit agents do not load trailofbits skills via frontmatter; indirect invocation path | High | Not recommended |
| C. Create thin Agent-tool wrapper agents around each trailofbits skill | Enables parallel Agent dispatch of trailofbits findings alongside pr-review-toolkit agents; fresh context isolation per trailofbits skill; matches Phase E GP#5 (fresh context via subagent dispatch) for review work; symmetric to `agents/researcher.md` pattern (thin agent preloads skill via frontmatter) | Creates 3 new `agents/*.md` thin wrapper files (~15 lines each); expands scope beyond the "category error fix" framing but justified by architectural consistency | Medium | ✅ Recommended |

→ Selected: C. Create thin Agent-tool wrapper agents around each trailofbits skill (captain, 2026-04-12, interactive)

### `update-status-bulk` return schema gap in `skills/workflow-index/references/write-mode.md`

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| A. Add formal return schema definition as a plan task within entity 062 | Closes a latent API drift point in one entity; contract test scenario 3 (row-count-mismatch) gets its missing reference | Expands scope beyond the 3 stated Deliverables; touches a Plan 1 skill not covered by the spec §1033 correction framing | Low | Viable |
| B. Spawn a follow-up entity specifically for workflow-index return schema formalization | Preserves entity 062 scope; gives the fix its own clarify/plan cycle | Delays closure; risks forgetting until it bites | Low | Recommended |
| C. Ignore until it bites | Zero immediate cost | Repeats the build-execute step 2 BLOCKER class of failure that shipped `d10c66c` during Captain Gate | Low | Not recommended |

→ Selected: B. Spawn a follow-up entity specifically for workflow-index return schema formalization (captain, 2026-04-12, interactive)

### build-review failure mode when a trailofbits `Skill()` invocation fails

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| A. Abort review with `feedback-to: captain` | Fail-loud surface; captain decides retry | Every trailofbits failure stops review even for transient issues | Low | Not recommended |
| B. Record failure in `### Dispatch Gaps` subsection and proceed with remaining review output | Matches existing Step 2 dispatch-gap handling at `skills/build-review/SKILL.md:105`; graceful degradation | Risks shipping review without security-specific findings; captain may miss Dispatch Gap entry | Low | Recommended |
| C. Classify the failure itself as a CRITICAL CODE finding with `feedback-to: execute` | Surfaces failure in routing path | Incorrectly blames execute for a skill-invocation issue; breaks routing contract | Low | Not recommended |

→ Selected: B. Record failure in `### Dispatch Gaps` subsection and proceed with remaining review output (captain, 2026-04-12, interactive). Framing shift post-B-1: now applies to trailofbits wrapper agent dispatch failures (Option C wrappers), not raw Skill() invocation failures. Handling pattern unchanged -- same as existing pr-review-toolkit agent failure path at `skills/build-review/SKILL.md:105`.

## Open Questions

Q-1: Does `trailofbits:differential-review` exist as an installed plugin, skill, or agent anywhere discoverable from the current Claude Code session?

Domain: Runnable/Invokable

Why it matters: Deliverable 1 corrects build-review to stop treating trailofbits as Agent-dispatched. If `differential-review` is not installed or not published, the corrected integration model needs either a graceful-skip pattern OR the dispatch list drops it entirely. Live verification is the only resolution path.

Suggested options: (a) Live plugin enumeration from current CC session; (b) Fetch `trailofbits/skills` GitHub marketplace manifest; (c) Accept that `differential-review` does not exist and drop it from the dispatch list

→ Answer: Fetch trailofbits/skills marketplace manifest (captain, 2026-04-12, interactive). Verification: differential-review IS published per WebFetch on `https://github.com/trailofbits/skills` earlier this session -- the 5 key security plugins listed include differential-review alongside sharp-edges / variant-analysis / insecure-defaults / mutation-testing. Absence from current CC session skill list means "not enabled in this clone", not "unpublished". **Resolution**: include `differential-review-reviewer` as the 4th wrapper agent in Deliverable 1; ensure Deliverable 2's `.claude/settings.json` enables the plugin so future clones prompt install.

Q-2: What is Claude Code's canonical `.claude/settings.json` schema for declaring plugin marketplace dependencies so a fresh spacedock clone auto-prompts install?

Domain: Readable/Textual

Why it matters: Deliverable 2 requires creating `.claude/settings.json` with a declarative plugin dependency structure. Zero codebase precedent exists for `extraKnownMarketplaces` or `enabledPlugins` field names. The entity Guardrail explicitly says: if schema cannot be verified, Deliverable 2 is deferred to a follow-up entity and this entity ships only Deliverables 1 and 3.

Suggested options: (a) Fetch live Claude Code plugin documentation; (b) Inspect user-global `~/.claude/settings.json` for existing marketplace declarations as precedent; (c) Defer Deliverable 2 to follow-up entity per Guardrail, ship D1+D3 only

→ Answer: Inspect `~/.claude/settings.json` for precedent (captain, 2026-04-12, interactive). **Schema verified** against live user-global settings at `~/.claude/settings.json:277-309`:
- `enabledPlugins`: `{"plugin-name@marketplace-name": true}` (line 277-287 in user-global; 9 plugins currently enabled there)
- `extraKnownMarketplaces`: `{"marketplace-name": {"source": {"source": "github", "repo": "owner/repo"}, "autoUpdate": true}}` (line 288-309)
- Built-in marketplaces (`claude-plugins-official`, `superpowers-marketplace`) need NO declaration in `extraKnownMarketplaces`; custom github sources DO need it.
- User-global settings already declares `"trailofbits"` marketplace pointing to `trailofbits/skills` github repo at lines 302-308 -- this is the authoritative naming convention spacedock's repo-level settings.json should mirror.

**Resolution**: Deliverable 2 can now be drafted with **zero fabrication**. Plan stage uses these exact field names. Guardrail ("defer if schema unverifiable") no longer applies -- schema is verified and concrete.

Q-3: Is `pr-review-toolkit` actually bundled with the `superpowers` plugin, or does it require a separate `claude plugin marketplace add pr-review-toolkit`?

Domain: Readable/Textual

Why it matters: `docs/build-pipeline/README.md:183` claims pr-review-toolkit is "Bundled with superpowers." If accurate, Deliverable 2's settings.json does NOT need to list pr-review-toolkit separately. If inaccurate (aspirational README claim), Acceptance Criteria 1 must list it explicitly.

Suggested options: (a) Inspect the superpowers plugin manifest to confirm bundling; (b) Ask captain directly; (c) Declare pr-review-toolkit in settings.json regardless (harmless if already bundled)

→ Answer: Declare pr-review-toolkit explicitly in Deliverable 2 + fix README:183 claim as small plan task within entity 062 (captain, 2026-04-12, interactive). **Pre-verified**: `~/.claude/settings.json:286` shows `"pr-review-toolkit@claude-plugins-official": true` -- pr-review-toolkit is a SEPARATE plugin from `claude-plugins-official` marketplace, NOT bundled with superpowers. `docs/build-pipeline/README.md:183` "Bundled with superpowers" claim is **incorrect** and must be corrected as a plan task within this entity.

Q-4: Is `feature-dev` the correct Claude Code plugin name for the plugin containing the `code-explorer` agent?

Domain: Readable/Textual

Why it matters: The entity body names `feature-dev` as the plugin to declare. `feature-dev` does not appear anywhere else in the spacedock codebase as an installed plugin reference (only in `docs/comparison.md:50` as unrelated competing-tool text). Live verification is required to avoid Guardrail violation ("No fabricated version numbers").

Suggested options: (a) Enumerate current CC session agent list to confirm `feature-dev:code-explorer` namespace; (b) Check user-global plugins manifest for the canonical plugin name; (c) Accept that the plugin is already installed in current session and declare it directly

→ Answer: `feature-dev@claude-plugins-official` confirmed (captain, 2026-04-12, interactive). Pre-verified via `~/.claude/plugins/cache/claude-plugins-official/feature-dev/7ed523140f50/.claude-plugin/plugin.json` -- plugin is named `feature-dev`, marketplace is the built-in `claude-plugins-official`, bundles `code-explorer` / `code-reviewer` / `code-architect` agents. No `extraKnownMarketplaces` declaration needed (built-in marketplace).

**Sub-finding + revision for e2e-pipeline**: original clarify answer was "defer to follow-up entity" based on incorrect assumption that upstream was `iamcxa/claude-e2e-pipeline` (single-plugin repo). Captain correction: the real upstream is `https://github.com/iamcxa/kc-claude-plugins`, a multi-plugin marketplace repo structurally identical to `trailofbits/skills`. Kent's local dev loads via `plugin-dir` directory source, but spacedock's repo-level settings.json can declare it as a github marketplace using the exact same `extraKnownMarketplaces` pattern. **Revised resolution**: include e2e-pipeline in Deliverable 2 via `iamcxa-plugins` marketplace (github source `iamcxa/kc-claude-plugins`), enable as `e2e-pipeline@iamcxa-plugins`. No follow-up entity needed.

Q-5: Where should the SO/build-explore dispatch-routing logic live, and what is the refactor path for build-explore to adopt fresh-context dispatch?

Domain: Runnable/Invokable

Why it matters: The Fresh-context dispatch GUARDRAIL (entity body line 62) explicitly defers this architectural decision to clarify. Three paths are viable: (A) mode-aware build-explore with an `if SO-direct, dispatch code-explorer; else inline` branch; (B) extract Step 2 mapping out of build-explore, letting caller (SO or ensign) own dispatch vs inline; (C) create `skills/code-explorer/` as a new subroutine skill symmetric to `skills/build-research/`. Each path has downstream implications for FO ensign-mode (nested Agent dispatch constraint) vs SO-direct mode.

Suggested options: (a) Path A -- mode-aware build-explore; (b) Path B -- extract mapping to caller; (c) Path C -- new code-explorer subroutine skill; (d) Defer as follow-up entity rather than expanding entity 062's plan

→ Answer: Path C -- new `spacedock:code-explorer` agent + skill (captain, 2026-04-12, interactive). **Revised framing**: the `subagent-cannot-nest-agent-dispatch` memory only constrains general-purpose teammates, NOT custom-named agents like ensign (verified via `agents/ensign.md` which has no `tools` restriction + `skills/build-execute/SKILL.md` already dispatches `task-executor` from ensign context). So build-explore CAN dispatch code-explorer in all canonical invocation paths (team mode + bare mode + SO-direct) -- no mode fallback needed. **Decision rationale**: spacedock is a CC plugin that installs build flow into target projects (carlove, etc.) via a future install-skill; shipping an in-plugin `spacedock:code-explorer` means target projects need zero additional plugin dependency for codebase mapping. Path 2 (reuse `feature-dev:code-explorer`) was rejected because it would force every target project to install `feature-dev` as a transitive dependency purely for one bundled agent -- extra moving parts with no user-facing benefit. **Implementation sketch**: `skills/code-explorer/SKILL.md` (~200 lines, Phase-E-specialized structured prompt distilled from this entity's experimental override dispatch prompt) + `agents/code-explorer.md` (~15 lines, thin wrapper with `skills: ["spacedock:code-explorer"]` frontmatter). Symmetric to existing `skills/build-research/` + `agents/researcher.md` pattern. Tool allowlist: Read, Grep, Glob, Bash -- plain four-piece, no exotic capability. **Future `feature-dev` dep removal**: Deliverable 2 AC1 updated to drop feature-dev from enabledPlugins list.

Q-6: Should `skills/build-review/SKILL.md` dispatch the full set of observably-installed trailofbits skills or only the 2 named in spec §348-349 (`differential-review` + `sharp-edges`)?

Domain: Runnable/Invokable

Why it matters: The spec names only 2 trailofbits plugins for build-review. The observed installed set in the current CC session is 4 plugins (with `differential-review` absent = 3 effective). Including all expands review coverage but drifts from spec scope; sticking to 2 leaves installed skills unused at review time.

Suggested options: (a) Stick to spec §348-349 (drop `differential-review` if absent); (b) Expand to all observably-installed trailofbits skills with Stage Report note explaining the scope expansion; (c) Make the selection configurable at Deliverable 1 via a skill frontmatter field; (d) Captain scope decision at clarify

→ Answer: 4 review-appropriate trailofbits skills dispatched by build-review (captain, 2026-04-12, interactive). Wrapper agents for `differential-review` + `sharp-edges` + `variant-analysis` + `insecure-defaults`. **Drop `mutation-testing` from build-review dispatch** because it is a test campaign CONFIG helper (per its own skill description: "Configures mewt or muton mutation testing campaigns -- scopes targets, tunes timeouts"), NOT a reviewer that produces findings about a diff. Including it would spam build-review's Stage Report Findings table with irrelevant config suggestions.

**Scope split clarification (Deliverable 2 vs Deliverable 1)**: `mutation-testing` REMAINS in Deliverable 2's `enabledPlugins` list because (a) it comes bundled with the trailofbits marketplace we're already declaring, (b) users may want to invoke it directly (e.g., `Skill("mutation-testing:mutation-testing", ...)`) outside the build-review pipeline, (c) dropping it from enabledPlugins provides no cleanliness benefit while adding friction for non-review use cases. Deliverable 2 = "plugins made available", Deliverable 1 = "plugins that build-review auto-dispatches" -- the two scopes don't have to match.

## Decomposition Recommendation

(skipped: no `⚠️ likely-decomposable` scope flag in Captain Context Snapshot, and Step 2 mapped 18 files which is below the 20-file decomposition trigger -- `references/gray-area-templates.md` rule: "more than 20 files across 3+ layers" not met)

## Canonical References

- `https://github.com/trailofbits/skills` -- Trail of Bits Claude Code plugin marketplace, referenced during Q-1 resolution. WebFetch verified 5 key security plugins published including `differential-review` (Q-1)
- `~/.claude/settings.json:277-309` -- user-global `enabledPlugins` + `extraKnownMarketplaces` schema precedent, cited during Q-2 resolution. Declares `trailofbits` marketplace (github source `trailofbits/skills`, lines 302-308) and 9 enabled plugins including `pr-review-toolkit@claude-plugins-official` (line 286) (Q-2, Q-3)
- `~/.claude/plugins/cache/claude-plugins-official/feature-dev/7ed523140f50/.claude-plugin/plugin.json` -- feature-dev plugin manifest, cited during Q-4 resolution. Confirms plugin name `feature-dev` in `claude-plugins-official` marketplace, bundles code-explorer/code-reviewer/code-architect agents (Q-4)
- `https://github.com/iamcxa/kc-claude-plugins` -- Kent Chen's multi-plugin marketplace repo (structurally identical to trailofbits/skills), cited during Q-4 e2e-pipeline sub-finding. Contains e2e-pipeline and other `kc-*` plugins. Spacedock's Deliverable 2 declares this as `iamcxa-plugins` marketplace via extraKnownMarketplaces github source (Q-4)
- `agents/ensign.md` (spacedock repo) -- Ensign agent definition, cited during Q-5 revised framing. No `tools` allowlist restriction; inherits full tool set including Agent. Proves that ensign (custom-named agent) is NOT subject to the `subagent-cannot-nest-agent-dispatch` constraint, unlike general-purpose teammates. Together with `skills/build-execute/SKILL.md`'s existing dispatch of task-executor from ensign context, confirms nested dispatch is legal in ensign mode (Q-5)

---

## Follow-up Entity Candidates (surfaced during clarify, not in entity 062's scope)

- **`spacedock:install-build-flow` skill** (new): install/scaffold skill that injects Phase E build pipeline into a target repo (e.g., carlove). Creates `docs/build-pipeline/README.md` with stage definitions, initializes `.claude/settings.json` with required plugin dependencies (trailofbits + pr-review-toolkit + e2e-pipeline + iamcxa-plugins marketplaces), copies `mods/workflow-index-maintainer.md`, provides example entity template. This skill is how users turn any git repo into a spacedock-orchestrated project after installing the spacedock plugin. Surfaced during Q-5 discussion (captain reframed distribution model). Defer to Phase E+1.
- **`spacedock:code-explorer` skill + agent** (new, Q-5 answer): subroutine skill + thin agent symmetric to `build-research` + `researcher`. Dispatched by `build-explore` Step 2 for fresh-context codebase mapping. Removes `feature-dev` plugin dependency. ~215 lines total. Part of Deliverable 1's scope expansion during plan stage (not a separate follow-up -- plan task within entity 062).
- **`mods/workflow-index-maintainer.md` return schema formalization** (Q-O-2 resolution): `update-status-bulk` return payload undefined in `skills/workflow-index/references/write-mode.md`; build-execute Step 2 relies on unspecified row count. Spawn as follow-up entity after entity 062 ships.
- **`docs/build-pipeline/README.md:183` pr-review-toolkit bundling claim correction** (Q-3 resolution): small plan task within entity 062, not a separate entity.

## Stage Report: explore

- [x] Files mapped: 18 across Runnable/Invokable (5), Readable/Textual (4), Organizational/Data-transforming (7), Reference (2)
  R/I: `skills/build-review/SKILL.md`, `skills/build-plan/SKILL.md`, `skills/build-execute/SKILL.md`, `agents/researcher.md`, `agents/task-executor.md`; R/T: `.claude/settings.local.json`, `.claude-plugin/plugin.json`, `docs/build-pipeline/README.md`, root `README.md`; Org/DT: `mods/workflow-index-maintainer.md`, `skills/workflow-index/references/write-mode.md`, `docs/build-pipeline/_index/{CONTRACTS,DECISIONS,INDEX}.md`, `tests/pressure/build-execute-workflow-index-contract.yaml`, `tests/pressure/build-plan-workflow-index-append.yaml`; Ref: spec `2026-04-11-phase-e-build-flow-restructure.md`, `scripts/codex_prepare_dispatch.py`
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 Case B cross-entity impact (no active CONTRACTS rows); A-2 Skill() precedent at Step 4 (knowledge-capture); A-3 no YAML octal risk (hand-rolled parser); A-4 namespace clean (Phase 2 sweep `15772ac`); A-5 pr-review-toolkit real agents; A-6 trailofbits installed as skills (confirming spec §1033 category error)
- [x] Options surfaced: 3
  B-1 trailofbits integration model (A/B/C, Option A recommended -- matches existing Step 4 Skill() precedent); B-2 `update-status-bulk` return schema gap (A/B/C, Option B recommended -- spawn follow-up entity); B-3 build-review failure mode on Skill() invocation failure (A/B/C, Option B recommended -- Dispatch Gaps subsection + graceful degradation)
- [x] Questions generated: 6
  Q-1 `differential-review` existence (live verification); Q-2 `.claude/settings.json` canonical schema (zero codebase precedent; Guardrail may defer D2); Q-3 pr-review-toolkit bundling claim (README line 183 unverified); Q-4 `feature-dev` plugin name verification; Q-5 SO/build-explore dispatch-routing refactor path (architectural decision, 3 paths + defer option); Q-6 trailofbits dispatch scope in build-review (2 vs observably-installed set)
- [x] α markers resolved: 0 / 0
  entity body contains no `(needs clarification -- deferred to explore)` markers; Brainstorming Spec was pre-filled manually by captain session, not via build-brainstorm ensign dispatch
- [x] Scale assessment: revised from Small to Medium
  18 files mapped; write surface is 3-4 files (`skills/build-review/SKILL.md` + new `.claude/settings.json` + `mods/workflow-index-maintainer.md` + possibly `_index/CONTRACTS.md` populated by mod), read surface is 14 files for context grounding. Write-scope view supports Small; impact-surface view supports Medium. Medium is the conservative middle ground; clarify may re-classify.

**Notes**: Build-explore Step 2 executed via **experimental override** per entity GUARDRAIL (line 62) -- `feature-dev:code-explorer` agent dispatched from SO-direct context instead of inline grep/Read/store. Override captured Q-5 as the follow-up architectural decision. Dispatch produced structured 18-file report in one Agent call with `file:line` evidence for each Deliverable; SO main context consumed the report and wrote these sections without context pollution. Matches Phase E Guiding Principle #5 ("Fresh context via subagent dispatch, not stage split"). First live validation of the SO + code-explorer dispatch pattern -- the structural question of where this routing lives permanently is Q-5 for clarify. Additional gotcha surfaced: entity body contains ~19 em-dashes (`—`) in prose, violating build skill family convention (`--` double dash); minor drift, noted for follow-up sweep if clarify decides to enforce.

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity 062 is Small scope; no decomposition recommendation surfaced during explore (18 files < 20-file trigger, no `⚠️ likely-decomposable` scope flag)
- [x] Assumptions confirmed: 6 / 6 (0 corrected)
  A-1 through A-6 all confirmed via batch 2026-04-12; A-3 enriched with clkao authorship finding (parser is original `a2d70b9c` 2026-04-01 commit, not user-added, consistent with stdlib-only engine design)
- [x] Options selected: 3 / 3
  O-1 Path C thin agent wrappers (trailofbits integration); O-2 Path B spawn follow-up entity (workflow-index return schema gap); O-3 Path B Dispatch Gaps graceful degradation (build-review wrapper dispatch failure)
- [x] Questions answered: 6 / 6 (0 deferred)
  Q-1 differential-review IS published in trailofbits/skills marketplace (WebFetch-verified, absent from current session = not-enabled not unpublished); Q-2 settings.json schema verified at `~/.claude/settings.json:277-309` (enabledPlugins + extraKnownMarketplaces with github source type); Q-3 pr-review-toolkit NOT bundled with superpowers -- it's `@claude-plugins-official` (line 286), README:183 claim incorrect, fix as plan task; Q-4 feature-dev confirmed as `feature-dev@claude-plugins-official` + e2e-pipeline resolved via `iamcxa/kc-claude-plugins` marketplace (Kent's multi-plugin repo, structurally identical to trailofbits/skills); Q-5 revised framing (subagent-cannot-nest only constrains general-purpose teammates not custom ensign agents) → Path C new in-plugin `spacedock:code-explorer` agent+skill (user-facing rationale: spacedock ships its own code-explorer primitive so target projects need zero extra plugin dep); Q-6 4 review-appropriate trailofbits (differential-review + sharp-edges + variant-analysis + insecure-defaults, drop mutation-testing from dispatch because it's a test campaign config helper not a reviewer)
- [x] Canonical refs added: 4
  `https://github.com/trailofbits/skills` (Q-1 marketplace source); `~/.claude/settings.json:277-309` (Q-2/Q-3 schema + pr-review-toolkit bundling precedent); `~/.claude/plugins/cache/claude-plugins-official/feature-dev/7ed523140f50/.claude-plugin/plugin.json` (Q-4 feature-dev manifest); `https://github.com/iamcxa/kc-claude-plugins` (Q-4 e2e-pipeline upstream marketplace); `agents/ensign.md` (Q-5 custom agent tool inheritance precedent)
- [x] Context status: ready
  gate passed: all 6 assumptions confirmed + all 3 options selected + all 6 questions answered + 7 ACs present with no α markers + Canonical References populated with 4 (+1 = 5 counting Follow-up candidates block)
- [x] Handoff mode: loose
  `auto_advance` frontmatter field empty → captain must explicitly say "execute 062" to advance status to plan; FO handles that transition separately
- [x] Clarify duration: 10 AskUserQuestion calls total
  Step 3: 3 calls (B-1 integration model, B-2 return schema gap, B-3 failure mode); Step 4: 7 calls (Q-1 differential-review, Q-2 settings.json schema, Q-3 pr-review-toolkit bundling, Q-4 feature-dev + e2e-pipeline, Q-4 revise for kc-claude-plugins correction, Q-5 revised after subagent-nest clarification, Q-6 trailofbits dispatch scope); 1 initial Q-5 rejected by captain for clarification, then re-presented

**Notes**: Captain added live scope corrections during clarify that reframed the distribution model (spacedock is a CC plugin installed globally, targets are external projects like carlove -- NOT "someone clones spacedock to hack on spacedock"). This reframing strengthened Path 1 for Q-5 with a user-facing rationale (in-plugin self-containment means target projects need zero extra plugin dep for code-explorer). Also surfaced `spacedock:install-build-flow` as a new follow-up entity candidate (captured in the ## Follow-up Entity Candidates block below Canonical References). Four downstream plan-task expansions recorded: (1) spacedock:code-explorer skill+agent creation, (2) Deliverable 2 drops feature-dev, (3) `docs/build-pipeline/README.md:183` pr-review-toolkit bundling claim correction, (4) 4 trailofbits wrapper agents in Deliverable 1. All clarify decisions are captured in annotations in the respective sections above -- plan stage reads annotations, not Directive, for scope grounding.
