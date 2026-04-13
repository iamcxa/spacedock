---
id: 084
title: "Review forge validation -- conditional forge audit + skill invocation testing"
status: plan
source: decomposition of entity 074 (pipeline verification quality uplift)
started: 2026-04-13T06:30:00Z
worktree: .worktrees/spacedock-ensign-review-forge-validation
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: [081]
parent: 074
context_status: ready
---

## Directive

> Skill entities ship without forge validation. Entity 068 created `skills/build-distill/SKILL.md` without forge audit, TDD, or invocation testing. The writing-skills verification was a manual afterthought. Entity 073 (review-skill-creation-discipline) describes this gap but is `status: draft` — never executed. This entity absorbs 073's scope. Two insertion points: (1) build-review pre-scan gains Step 1f — conditional forge audit when diff contains skill files. (2) build-uat gains `type: skill-invocation` item type for bare invocation testing.

## Captain Context Snapshot

- **Repo**: main @ 5615b60
- **Session**: Entity 081 (goal-backward verification) is in execute — it occupies Step 1e in build-review pre-scan; 084 uses Step 1f
- **Domain**: Runnable / Invokable, Readable / Textual
- **Related entities**: 073 -- Review Stage Skill Creation Discipline (draft/pending, absorbed by this entity), 081 -- Goal-backward verification (execute/ready, occupies Step 1e), 074 -- Pipeline Verification Quality Uplift (epic, parent)
- **Created**: 2026-04-13T14:00:00+08:00

## Brainstorming Spec

**APPROACH**: Two insertion points into existing pipeline skills. (1) Build-review pre-scan gains Step 1f: when the `execute_base..HEAD` diff contains `skills/*/SKILL.md`, run a forge-style audit (frontmatter structure, naming conventions, reference integrity) and report findings as a conditional review sub-check (✓ confirmed by explore: build-review SKILL.md:12 -- pre-scan has 5 checks (1a-1e), Step 1f is natural next slot; :141 -- pre-scan runs inline in ensign context). (⚠ contradicted: forge SKILL.md:31 -- forge validate-only dispatches `plugin-dev:plugin-validator` agent, but review ensign lacks Agent tool (build-review SKILL.md:28) -- see O-1). (2) Build-uat gains a `type: skill-invocation` item type: when an entity's diff contains a skill file, UAT dispatches a bare invocation test -- load the skill and verify it produces expected output shape (✓ confirmed by explore: build-uat SKILL.md:56 -- existing type enum: browser, cli, api, interactive; skill-invocation follows same pattern -- see O-2 for execution mechanism). Entity 073 is absorbed: its scope is a strict subset of this entity's review sub-check (✓ confirmed by explore: entity 073 at review-skill-creation-discipline.md is status: draft, context_status: pending).

**ALTERNATIVE**: Instead of using `kc-plugin-forge` for the review check, build a custom skill validation checklist directly inside build-review (frontmatter parsing, file structure checks, naming convention validation). -- D-01 Rejected because kc-plugin-forge already implements comprehensive skill auditing; duplicating its logic in build-review creates maintenance burden and divergence risk.

**GUARDRAILS**:
- Entity 081 occupies Step 1e (goal-backward verification); this entity uses Step 1f — do not alter Step 1e
- Build-review pre-scan must remain conditional — forge audit only fires when diff contains `skills/*/SKILL.md`; no overhead on non-skill entities
- Skill-invocation UAT items must gracefully degrade if the skill requires interactive input (Class 3 skills); structural validation (loads, frontmatter, references) is the baseline
- Entity 073 must be archived (`status: archived`) when this entity's work begins, to prevent scope confusion
- `kc-plugin-forge` is an external dependency — if unavailable, the review sub-check should warn, not block

**RATIONALE**: Leveraging kc-plugin-forge for the review-side check is the natural choice because it was designed exactly for skill auditing (frontmatter validation, structure checking, convention enforcement). Building a custom validator would duplicate existing capability. The two-prong strategy (review checks "was discipline followed?" while UAT checks "does the skill actually work?") creates defense in depth — review catches structural violations, UAT catches runtime failures.

## Acceptance Criteria

- [ ] Given a diff containing `skills/build-foo/SKILL.md`, when build-review pre-scan runs, then Step 1f fires a forge audit and reports findings (how to verify: create entity with SKILL.md change, observe forge audit in pre-scan output)
- [ ] Given a diff with NO skill files, when build-review pre-scan runs, then Step 1f is skipped silently (how to verify: run review on non-skill entity, confirm no forge check in output)
- [ ] Given a UAT spec with `type: skill-invocation`, when build-uat runs, then it loads the skill and verifies output shape (how to verify: create skill entity with skill-invocation UAT item, observe invocation test result)
- [ ] Given entity 073, when entity 084 execution begins, then 073 is archived with `status: archived` and a note referencing absorption by 084 (how to verify: read entity 073 frontmatter after 084 execution starts)
- [ ] Given entity 081 is shipped, when entity 084 execute starts, then build-review SKILL.md already contains Step 1e (goal-backward verification) so Step 1f can insert after it (how to verify: grep "1e" in build-review SKILL.md before 084 execute begins)
- [ ] Given a diff containing `skills/build-foo/SKILL.md` but NO corresponding test file (`skills/build-foo/tests/*` or `tests/*build-foo*`), when build-review pre-scan Step 1f runs, then it produces a HIGH/CODE finding for missing tests (how to verify: create entity with SKILL.md but no test file, observe HIGH finding in pre-scan output)

## Assumptions

A-1: Step 1f inserts after entity 081's Step 1e in build-review pre-scan, following the same inline pattern. Findings flow into Step 3 classification using the existing two-axis severity/root schema. SKILL.md header count updates from "five checks (1a-1e)" to "six checks (1a-1f)".
Confidence: Confident (0.92)
Evidence: build-review SKILL.md:12 -- "five checks (1a-1e)"; :139-184 -- Step 1e inline pattern with findings flowing to Step 3 classification. Entity 081 A-1 confirmed this insertion pattern (captain, 2026-04-13).
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Step 1f uses an explicit condition (`diff contains skills/*/SKILL.md`) and silently skips when condition is false. This is compatible with pre-scan architecture -- existing checks implicitly skip irrelevant operations (e.g., stale refs does nothing if no symbols removed). An explicit conditional is a minor extension, not a new pattern.
Confidence: Confident (0.88)
Evidence: build-review SKILL.md:141 -- "Runs INLINE"; :149-161 -- Steps 1a-1d process per-file, implicitly skip when no relevant changes. build-quality SKILL.md Step 5 is conditional on coverage config.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Forge audit findings map to build-review's two-axis schema. Frontmatter violations → MEDIUM/CODE, structure violations → HIGH/CODE, naming convention violations → LOW/CODE. Source tag: `pre-scan:forge-audit`. The mapping is straightforward since forge's PASS/FAIL items correspond to specific file:line checks.
Confidence: Likely (0.72)
Evidence: build-review SKILL.md:218-233 -- severity axis (CRITICAL/HIGH/MEDIUM/LOW/NIT) and root axis (CODE/DOC/NEW/PLAN). Steps 1a-1e all produce findings in this format. Forge output (PASS/FAIL per check item) needs transformation but each check item has a natural severity mapping.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Entity 073 archive changes `status: draft` → `status: archived` and adds `absorbed-by: 084` note. Standard entity archival pattern.
Confidence: Confident (0.95)
Evidence: docs/build-pipeline/_archive/ -- multiple archived entities follow this pattern. Entity 073 frontmatter at review-skill-creation-discipline.md:2-21.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Entity 084's scope includes fixing build-review SKILL.md:28 stale claim about ensign lacking Agent tool. Since 084 already modifies this file (adding Step 1f, updating check count), the doc fix is a natural inclusion -- same file, same entity.
Confidence: Confident (0.95)
Evidence: build-review SKILL.md:28 -- "Agent -- you run as an ensign subagent, which does not have the Agent tool" contradicted by agent system declaration (spacedock:ensign: Tools: All tools). O-1 captain correction confirmed ensign has Agent tool.
→ Confirmed: captain, 2026-04-13 (interactive)

A-6: Entity 084 execute must start AFTER entity 081 ships. The `depends-on: [081]` frontmatter field enforces this via FO pipeline ordering. 084's Step 1f insertion assumes build-review SKILL.md already contains 081's Step 1e content.
Confidence: Confident (0.95)
Evidence: entity 084 frontmatter depends-on: [081]. Entity 081 status: execute, worktree: .worktrees/spacedock-ensign-quality-goal-backward-regression. Build-review SKILL.md will contain Step 1e after 081 merges.
→ Confirmed: captain, 2026-04-13 (interactive)

A-7: Step 1f includes a test existence sub-check: when the diff contains `skills/*/SKILL.md`, also grep the diff for corresponding test files (`skills/*/tests/*` or `tests/*/` matching the skill name). If no test file is present in the diff, produce a HIGH/CODE finding. This catches the entity-068-class gap (skill shipped without tests) independently of forge validate-only.
Confidence: Confident (0.88)
Evidence: entity 067 added `test_first: true` to task-execution, but it's opt-in at plan time. Entity 068 shipped a skill without tests and review didn't catch it. Step 1f's test existence check is the safety net for when `test_first` isn't set.
→ Confirmed: captain, 2026-04-13 (interactive)

## Option Comparisons

### O-1: Forge audit execution context in review pre-scan

The review ensign does NOT have Agent tool (build-review SKILL.md:28). Forge's `validate-only` route dispatches `plugin-dev:plugin-validator` as an agent (forge SKILL.md:31). Direct forge invocation from the ensign's Step 1f would fail at agent dispatch.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| FO-dispatched forge audit (pre-ensign) | Follows existing reviewer dispatch pattern; forge runs with full tool access; ensign reads results from entity body | Adds a conditional dispatch step to FO; forge results must be serialized to entity body format | Medium | Recommended |
| Inline structural checks in Step 1f | No external dependency; fully mechanical; matches pre-scan character; no Agent tool needed | Duplicates subset of forge logic; misses deeper forge checks (reference integrity, convention evolution); APPROACH D-01 rejected this direction | Low | Viable |
| Invoke forge via Skill tool directly | Simple invocation path; full forge coverage | Forge's validate-only dispatches agent -- fails in ensign context without Agent tool; unreliable | Low | Not recommended |

→ Selected: Other -- Invoke forge via Skill tool directly in Step 1f. Captain correction: ensign (typed subagent) has "All tools" per agent system declaration, including both Skill and Agent. build-review SKILL.md:28 claim about Agent unavailability is stale -- applies to general-purpose subagents, not typed spacedock:ensign. Forge can be invoked directly from pre-scan via Skill tool; forge's internal agent dispatches work because ensign has Agent tool. (captain, 2026-04-13, interactive)

### O-2: Skill invocation test execution mechanism in UAT

Build-uat ensign has Skill tool but no Agent tool. `type: skill-invocation` needs an execution mechanism for Step 2 automation that handles Class 3 (captain-interactive) skills gracefully.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Skill tool load + structural output check | Runtime verification; catches load failures, import errors, frontmatter validation errors; Skill tool available in UAT ensign | Class 3 skills may block on AskUserQuestion during load; need timeout/error handling for interactive skills | Medium | Recommended |
| Structural-only check (file exists, frontmatter valid, references resolve) | No runtime needed; deterministic; handles all skill classes; fully mechanical | Doesn't verify runtime behavior; misses import errors, broken references in loaded context; less than "invocation test" implies | Low | Viable |
| Bash-based CLI probe | Simple; verifies CLI loading path | Depends on CC CLI interface details; only tests loading not output shape; fragile across CC versions | Low | Not recommended |

→ Selected: Skill tool load + structural output check (captain, 2026-04-13, interactive)

## Open Questions

Q-1: For O-1 "FO-dispatched forge audit": should this be a new FO conditional dispatch (only for skill-entity diffs) or a permanent slot in the reviewer fan (always dispatched, no-ops on non-skill diffs)?

Domain: Runnable/Invokable

Why it matters: A conditional FO dispatch adds branching logic to FO's review phase. A permanent no-op slot is simpler (forge always dispatched, returns "no skill files in diff" instantly) but wastes a dispatch cycle on non-skill entities. The tradeoff is FO complexity vs dispatch overhead.

Suggested options: (a) Conditional FO dispatch -- FO checks diff for `skills/*/SKILL.md` before dispatching forge, (b) Permanent reviewer slot -- forge always dispatched as 4th reviewer alongside security/correctness/style, no-ops when no skill files in diff, (c) Hybrid -- forge dispatched in parallel with existing reviewers only when FO detects skill files via the same diff scan it already performs for reviewer count

→ Answer: Resolved by O-1 decision -- forge audit runs inline in ensign Step 1f via Skill tool, not as FO-dispatched reviewer. No FO dispatch logic changes needed. (captain, 2026-04-13, interactive)

Q-2: How should UAT skill-invocation handle Class 3 (captain-interactive) skills during automated Step 2?

Domain: Runnable/Invokable

Why it matters: Class 3 skills (e.g., build-clarify) use AskUserQuestion which IS available to the ensign but would break Step 2's automated nature. Need a deterministic strategy to avoid blocking.

Suggested options: (a) Pre-classify via grep -- grep SKILL.md for AskUserQuestion, skip runtime if found, (b) Attempt + timeout fallback, (c) Structural-only for all skills

→ Answer: Pre-classify via grep -- grep skill's SKILL.md for AskUserQuestion before invocation. If found, skip runtime invocation and use structural-only check (file exists, frontmatter valid, references resolve). Record as "Class 3 -- structural validation only." Deterministic, no timeout complexity. (captain, 2026-04-13, interactive)

Q-3: Which forge route should Step 1f use when invoking kc-plugin-forge?

Domain: Runnable/Invokable

Why it matters: Forge has multiple routes (validate-only, full pipeline, skill-tdd-only, etc.). The route determines scope -- validate-only is structural checks, full pipeline includes TDD and agent verification which are development activities.

Suggested options: (a) validate-only -- Phase 1 structural validation only, (b) Full pipeline with path arg -- Phase 1→2→3→4

→ Answer: validate-only -- Phase 1 structural validation only. Quick, focused, matches pre-scan's "was discipline followed?" purpose. TDD and agent verification are development-time activities, not review checks. (captain, 2026-04-13, interactive)

## Canonical References

(none cited -- captain corrections resolved via tool access verification, no external file references)

## Stage Report: explore

- [x] Files mapped: 4 across skill, entity, external-plugin layers
  build-review SKILL.md (Step 1f target), build-uat SKILL.md (skill-invocation target), entity 073 (archive target), kc-plugin-forge SKILL.md (external dependency interface)
- [x] Assumptions formed: 4 (Confident: 3, Likely: 1)
  A-1 Step 1f insertion (0.92), A-2 conditional skip pattern (0.88), A-3 severity mapping (0.72), A-4 entity 073 archive (0.95)
- [x] Options surfaced: 2
  O-1 forge audit execution context (FO-dispatched vs inline vs direct Skill); O-2 skill invocation test mechanism (Skill load vs structural vs CLI probe)
- [x] Questions generated: 1
  Q-1 FO dispatch strategy for forge audit (conditional vs permanent vs hybrid)
- [x] α markers resolved: 0 / 0
  Brainstorming spec contained no α markers
- [x] Scale assessment: confirmed Small
  4 files mapped, 2 skill SKILL.md insertions + 1 entity archive; all changes are spec-level text edits
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident/Likely on internal architecture, no external tech claims, Small scale)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Small scope, no children proposed
- [x] Re-validation: 4 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  all 4 explore assumptions hold against current codebase
- [x] Assumptions confirmed: 7 / 7 (0 corrected)
  A-1 through A-4 confirmed via batch; A-5 stale doc fix (interactive), A-6 081 coordination (interactive), A-7 test existence check (interactive)
- [x] Options selected: 2 / 2
  O-1 forge via Skill tool directly -- captain corrected: ensign has All tools; O-2 Skill tool load + structural output check (recommended)
- [x] Questions answered: 3 / 3
  Q-1 resolved by O-1 (no FO changes); Q-2 pre-classify via grep for Class 3; Q-3 validate-only route
- [x] Open exploration: 5 gray areas surfaced (1 from templates, 1 from CONTRACTS, 2 from directive, 1 via freeform)
  stale doc fix (A-5), Class 3 handling (Q-2), forge route (Q-3), 081 coordination (A-6), TDD test existence (A-7)
- [x] Canonical refs added: 0
  captain corrections resolved via tool access verification, no external file references cited
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 084" when ready
- [x] Clarify duration: 8 questions asked, session complete
  1 batch + 2 options + 1 Q (rejected+reformulated) + 4 exploration iterations

## Problem

Skill entities ship without forge validation. Entity 068 created `skills/build-distill/SKILL.md` without forge audit, TDD, or invocation testing. The writing-skills verification was a manual afterthought. Entity 073 (review-skill-creation-discipline) describes this gap but is `status: draft` — never executed. This entity absorbs 073's scope.

## Scope

### Review: Conditional forge-audit sub-check

When the `execute_base..HEAD` diff contains `skills/*/SKILL.md`, build-review pre-scan adds a conditional check that runs `kc-plugin-forge` audit (frontmatter, structure, conventions, reference integrity). This is Step 1f in the pre-scan (after entity 081's Step 1e goal-backward verification).

### UAT: Skill invocation test item type

Build-uat gains a `type: skill-invocation` item type. When an entity's diff contains a skill file, UAT dispatches a bare invocation test — load the skill, verify it produces expected output shape. The "forge back half."

### Entity 073 absorption

Entity 073 (review-skill-creation-discipline, `status: draft`, `context_status: pending`) is a strict subset. Archive 073 when this entity is created.

## Acceptance Criteria

- [ ] Given a diff containing `skills/build-foo/SKILL.md`, when build-review pre-scan runs, then Step 1f fires a forge audit and reports findings (how to verify: create entity with SKILL.md change, observe forge audit in pre-scan output)
- [ ] Given a diff with NO skill files, when build-review pre-scan runs, then Step 1f is skipped silently (how to verify: run review on non-skill entity, confirm no forge check in output)
- [ ] Given a UAT spec with `type: skill-invocation`, when build-uat runs, then it loads the skill and verifies output shape (how to verify: create skill entity with skill-invocation UAT item, observe invocation test result)

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 073 (review-skill-creation-discipline): absorbed — archive on creation
- Entity 081 (goal-backward verification): Step 1e occupies the first conditional pre-scan slot; this entity uses Step 1f
- `skills/build-review/SKILL.md`: pre-scan Step 1 insertion target
- `skills/build-uat/SKILL.md`: new item type target
- `kc-plugin-forge` skill: forge audit capability

## Research Findings

### Upstream Constraints

- **build-review pre-scan architecture.** Pre-scan runs inline in the review ensign's context (build-review SKILL.md:139-184). Currently five checks (1a-1e). Step 1f is the natural next slot. Findings flow into Step 3 classification using the existing two-axis severity/root schema. The header at line 12 must update from "five checks (1a-1e)" to "six checks (1a-1f)", and the prose at line 141 from "five checks" to "six checks".
- **build-review SKILL.md:28 stale claim.** Line 28 claims "Agent -- you run as an ensign subagent, which does not have the Agent tool." Per agent-dispatch-guide.md verification matrix (lines 17-19), this claim is technically correct -- Agent IS absent from subagent contexts. However, the captain's A-5 correction (interactive, 2026-04-13) explicitly directed that this line be updated to remove the stale framing. The line currently implies ensign lacks Skill tool as well, which is incorrect (Skill is deferred-but-searchable per agent-dispatch-guide.md line 30). The fix aligns the doc with the three-tier reality: Agent absent, Skill available via ToolSearch.
- **build-uat type enum.** build-uat SKILL.md:56-58 defines four types: `browser`, `cli`, `api`, `interactive`. Adding `skill-invocation` follows the same pattern. Step 1 parse and Step 2 execution both switch on type -- both need the new branch.
- **Entity 073 archive pattern.** Archived entities in `docs/build-pipeline/_archive/` follow the pattern: `status: archived` in frontmatter. Entity 073 currently at `status: draft`, `context_status: pending`.
- **Entity 081 shipped.** `depends-on: [081]` is satisfied -- entity 081 is `status: shipped` in `_archive/quality-goal-backward-regression.md`. Step 1e content is already present in build-review SKILL.md (lines 163-184).

### Existing Patterns

- **Conditional pre-scan checks.** Steps 1a-1d are implicitly conditional (they process per-file and skip irrelevant operations). Step 1e (goal-backward) always runs. Step 1f introduces an *explicitly* conditional check -- only fires when diff contains `skills/*/SKILL.md`. This is a minor extension of the existing pattern, not a new pattern. Closest precedent: build-quality SKILL.md Step 5 conditional on coverage config.
- **Severity mapping for skill violations.** Existing pre-scan findings use source tags like `pre-scan:claude-md`, `pre-scan:stale-ref`, `pre-scan:goal-backward`. Step 1f uses `pre-scan:forge-audit` and `pre-scan:test-existence`. Severity mapping per A-3: frontmatter violations -> MEDIUM/CODE, structure violations -> HIGH/CODE, naming convention violations -> LOW/CODE, missing tests -> HIGH/CODE.
- **UAT type dispatch.** build-uat Step 2 dispatches automation per type (2a browser, 2b CLI, 2c API). Adding `2d -- Skill Invocation Items` follows the same dispatch pattern. Each sub-step handles one type independently.

### Library/API Surface

- **kc-plugin-forge routes.** Confirmed routes: `new <name>`, `<path>`, `validate-only`, `skill-tdd-only`, `agent-verify-only`, `self-forge`, `dreaming` (Phase E Plan 1 doc, lines 137-147). Step 1f uses `validate-only` route per Q-3 captain decision. Invoked via `Skill("kc-plugin-forge:kc-plugin-forge")` with route arg.
- **Forge validate-only scope.** validate-only runs Phase 1 structural validation: frontmatter structure, naming conventions, reference integrity. It takes a plugin path (repo root for spacedock: `/Users/kent/Project/spacedock`), not a skill subdirectory. Scoping to just the skills in the diff requires either (a) running forge on the full plugin then filtering results, or (b) invoking `plugin-dev:plugin-validator` directly per skill. Option (a) is simpler for Step 1f since forge is invoked once and results are filtered to diff-relevant skills.
- **Forge internal agent dispatch risk.** validate-only may internally dispatch `plugin-dev:plugin-validator` as an agent (forge SKILL.md:31 per entity brainstorm). If this agent dispatch fails because the ensign context lacks Agent tool, the fallback is inline structural checks (frontmatter parsing, file structure, naming conventions). This is a known risk per the captain's O-1 decision -- the selected approach is "try Skill tool invocation, fall back to inline checks on failure."

### Known Gotchas

- **Forge runs on all skills in the plugin.** Spacedock has 12+ skills. Running forge validate-only in Step 1f audits the entire plugin, not just the skills in the diff. The plan must filter forge output to only the skill paths present in the diff, or the pre-scan will report findings for skills untouched by the current entity.
- **Class 3 skill detection for UAT.** Per Q-2 captain decision, UAT skill-invocation items must pre-classify skills via grep for `AskUserQuestion` in SKILL.md. If found, skip runtime invocation and use structural-only check. This prevents Step 2 automation from blocking on interactive prompts.
- **Entity 073 frontmatter has no `absorbed-by` field.** The standard archive pattern uses `status: archived`. The A-4 assumption says "adds `absorbed-by: 084` note" -- this should go in the entity body (a note line), not as a new frontmatter field, to avoid schema drift.

### Reference Examples

- **Step 1e as insertion pattern reference.** build-review SKILL.md:163-184 shows the exact format for a pre-scan sub-check: markdown header (`### 1e -- Goal-Backward Verification`), prose description, numbered sub-steps, bash examples, finding severity/root/source annotations. Step 1f follows this format exactly.
- **build-uat Step 2a-2c as type dispatch reference.** build-uat SKILL.md:70-94 shows the pattern: per-type header, numbered sub-steps (invoke tool, capture evidence, record result), and per-item scratch format. Step 2d follows this format.

## PLAN

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - skills/build-review/SKILL.md
    - skills/build-uat/SKILL.md
    - docs/build-pipeline/review-skill-creation-discipline.md
  </read_first>

  <action>
  Environment verification. Confirm:
  1. `skills/build-review/SKILL.md` exists and contains "five checks (1a-1e)" at line 12 and Step 1e content at lines 163-184
  2. `skills/build-uat/SKILL.md` exists and contains the four type enum: `browser`, `cli`, `api`, `interactive`
  3. `docs/build-pipeline/review-skill-creation-discipline.md` exists with `status: draft` frontmatter
  4. Entity 081 is shipped (check `docs/build-pipeline/_archive/quality-goal-backward-regression.md` frontmatter for `status: shipped`)
  5. `docs/build-pipeline/_archive/` directory exists for entity 073 destination

  Commands:
  - `grep "five checks (1a-1e)" skills/build-review/SKILL.md`
  - `grep "browser.*cli.*api.*interactive\|type.*browser\|browser, cli, api, interactive" skills/build-uat/SKILL.md`
  - `grep "^status: draft" docs/build-pipeline/review-skill-creation-discipline.md`
  - `grep "^status: shipped" docs/build-pipeline/_archive/quality-goal-backward-regression.md`
  - `ls docs/build-pipeline/_archive/`
  </action>

  <acceptance_criteria>
    - All 5 grep/ls commands return expected output (non-empty, matching patterns)
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - skills/build-review/SKILL.md
  </read_first>

  <action>
  Add Step 1f -- Conditional Forge Audit to build-review SKILL.md. Three changes in this file:

  **(1) Update headers and prose for check count.** Line 12: change "five checks (1a-1e)" to "six checks (1a-1f)". Line 141: change "These five checks" to "These six checks". Line 338: change "four pre-scan checks" to "five pre-scan checks" (or update to reference the actual count if different).

  **(2) Fix stale Agent tool claim at line 28.** Replace the current line:
  ```
  - `Agent` -- you run as an ensign subagent, which does not have the Agent tool. FO dispatches themed reviewer teammates (debate-driven pattern) before invoking you. You read their findings from the entity file and classify them.
  ```
  With:
  ```
  - `Agent` -- absent from ensign subagent context (per references/agent-dispatch-guide.md verification matrix). FO dispatches themed reviewer teammates (debate-driven pattern) before invoking you. You read their findings from the entity file and classify them.
  ```

  **(3) Insert Step 1f section after Step 1e (after line 184).** Add:

  ```markdown
  ### 1f -- Conditional Forge Audit (Skill Entities Only)

  **Condition**: Check whether `git diff {execute_base}..HEAD --name-only` contains any path matching `skills/*/SKILL.md`. If NO skill files are in the diff, skip Step 1f entirely -- no output, no finding, no log line. This check is explicitly conditional, unlike Steps 1a-1e which run on every entity.

  When the condition is met, run two sub-checks:

  **(1) Forge validate-only audit.** Invoke `kc-plugin-forge` via the Skill tool with route `validate-only` and the repo root path. Filter the output to only findings that reference skill paths present in the diff. Map each finding to the pre-scan severity schema:
  - Frontmatter violations (missing/malformed name, description) -> MEDIUM/CODE, source `pre-scan:forge-audit`
  - Structure violations (missing SKILL.md, wrong directory layout) -> HIGH/CODE, source `pre-scan:forge-audit`
  - Naming convention violations (skill name vs directory name mismatch) -> LOW/CODE, source `pre-scan:forge-audit`
  - Reference integrity failures (broken file references in SKILL.md) -> HIGH/CODE, source `pre-scan:forge-audit`

  **Fallback**: If the Skill tool invocation of `kc-plugin-forge` fails (tool unavailable, agent dispatch error, timeout), fall back to inline structural checks:
  - Read each diff-touched `skills/*/SKILL.md` and verify: frontmatter has `name` and `description` fields, skill directory contains SKILL.md, any `references/` paths cited in SKILL.md exist on disk.
  - Record findings with the same severity mapping. Log "forge-audit: inline fallback (Skill invocation failed: {error})" in the pre-scan summary.

  **(2) Test existence sub-check.** For each skill path `skills/{name}/SKILL.md` in the diff, grep the diff for corresponding test files matching `skills/{name}/tests/*` or `tests/*{name}*`. If NO test file is present in the diff for a skill that has a new or modified SKILL.md, produce a finding: severity HIGH, root CODE, source `pre-scan:test-existence`, description "Skill {name} SKILL.md modified but no test file in diff -- skill may ship without tests (entity-068-class gap)".
  ```

  **(4) Add Rules section entry.** After the existing "Pre-Scan Runs Inline Before Parallel Dispatch" rules block, add a new rules block:

  ```markdown
  ### Forge Audit Is Conditional and Filtered

  - **ALWAYS check the diff for `skills/*/SKILL.md` before running forge audit.** Step 1f is explicitly conditional -- it only fires when the diff contains skill files. Running forge on every entity wastes cycles and produces irrelevant findings.
  - **ALWAYS filter forge output to diff-relevant skills.** Forge validate-only runs on the entire plugin. Unfiltered output includes findings for all 12+ skills, most of which are not touched by the current entity. Only findings referencing skill paths in the diff are pre-scan findings; others are discarded.
  - **NEVER skip the test existence sub-check because forge already ran.** Forge validate-only checks structural discipline (frontmatter, naming, references). It does NOT check whether test files exist for the skill. The test existence sub-check is independent of forge and runs regardless of forge success or failure.
  - **NEVER block review on forge failure.** Forge is an external dependency. If the Skill invocation fails, fall back to inline structural checks. The fallback covers frontmatter and reference integrity -- the highest-value forge checks. Log the fallback but do not escalate.
  ```
  </action>

  <acceptance_criteria>
    - `grep "six checks (1a-1f)" skills/build-review/SKILL.md` finds the updated header
    - `grep "1f -- Conditional Forge Audit" skills/build-review/SKILL.md` finds the new section
    - `grep "pre-scan:forge-audit" skills/build-review/SKILL.md` finds severity mapping
    - `grep "pre-scan:test-existence" skills/build-review/SKILL.md` finds test sub-check
    - `grep "absent from ensign subagent context" skills/build-review/SKILL.md` finds the fixed Agent tool claim
    - `grep "Forge Audit Is Conditional and Filtered" skills/build-review/SKILL.md` finds the rules block
  </acceptance_criteria>

  <files_modified>
    - skills/build-review/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1">
  <read_first>
    - skills/build-uat/SKILL.md
  </read_first>

  <action>
  Add `type: skill-invocation` to build-uat SKILL.md. Four changes:

  **(1) Update Step 1 type enum.** In the Step 1 parse description (around line 57), add `skill-invocation` to the type list: "one of `browser`, `cli`, `api`, `interactive`, `skill-invocation`".

  **(2) Add Step 2d -- Skill Invocation Items.** After Step 2c (API Items, around line 86), insert:

  ```markdown
  ### 2d -- Skill Invocation Items

  For each `type: skill-invocation` item:

  1. **Pre-classify for interactivity.** Read the target skill's SKILL.md and grep for `AskUserQuestion`. If found, the skill is Class 3 (captain-interactive) -- skip runtime invocation and use structural-only validation (sub-step 3 below). Record as `pass` with notes "Class 3 -- structural validation only".

  2. **Runtime invocation test (non-Class-3 only).** Invoke the skill via the Skill tool with a minimal probe prompt (e.g., "List your capabilities" or the item's declared command). Capture the output shape: did the skill load? Did it produce structured output? Did it error? Record exit status and first 40 lines of output as evidence.

  3. **Structural validation (always runs).** Regardless of runtime test result:
     - Verify SKILL.md exists at the declared path
     - Verify frontmatter has `name` and `description` fields
     - Verify any `references/` paths cited in SKILL.md resolve to existing files
     - Record each check as pass/fail with file:line evidence

  Record a provisional result row: `{item_id} | skill-invocation | {pass|fail-infra|fail-assertion} | {evidence} | {notes}`.

  **Infra-level fail conditions for skill-invocation**: Skill tool unavailable, SKILL.md file not found, frontmatter parse error. These route to execute per Step 3 classification.

  **Assertion fail conditions**: Runtime invocation produced output but shape doesn't match expected (per item description), or structural validation found broken references. These route to captain review per Step 3 classification.
  ```

  **(3) Update Step 3 classification.** Add a note that `skill-invocation` items follow the same infra-vs-assertion classification as other types. No new classification logic needed -- the existing fail-infra and fail-assertion definitions cover skill-invocation cases.

  **(4) Add Rules section entry.** After the existing "Stage Contract and Scope" rules block, add:

  ```markdown
  ### Skill Invocation -- Pre-Classify Before Runtime

  - **ALWAYS grep for AskUserQuestion in the target SKILL.md before runtime invocation.** Class 3 skills will block automation on interactive prompts. Pre-classification is deterministic and prevents hangs.
  - **NEVER skip structural validation because runtime invocation passed.** Runtime success does not guarantee frontmatter correctness or reference integrity. Structural validation is the baseline; runtime is additive.
  - **NEVER runtime-invoke a skill without the pre-classification step.** Even if the item description says "non-interactive", grep the SKILL.md -- the description may be wrong or stale.
  ```
  </action>

  <acceptance_criteria>
    - `grep "skill-invocation" skills/build-uat/SKILL.md` finds the new type in enum and Step 2d
    - `grep "2d -- Skill Invocation" skills/build-uat/SKILL.md` finds the new section
    - `grep "AskUserQuestion" skills/build-uat/SKILL.md` finds the pre-classification step
    - `grep "Pre-Classify Before Runtime" skills/build-uat/SKILL.md` finds the rules block
  </acceptance_criteria>

  <files_modified>
    - skills/build-uat/SKILL.md
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="2">
  <read_first>
    - docs/build-pipeline/review-skill-creation-discipline.md
  </read_first>

  <action>
  Archive entity 073. Move `docs/build-pipeline/review-skill-creation-discipline.md` to `docs/build-pipeline/_archive/review-skill-creation-discipline.md`.

  Update the moved file's frontmatter:
  - Change `status: draft` to `status: archived`
  - Keep all other frontmatter fields unchanged (do NOT add new fields to avoid schema drift)

  Add a body note after the frontmatter:

  ```markdown
  > **Archived 2026-04-13**: Scope absorbed by entity 084 (review-forge-validation). Entity 084's Step 1f (conditional forge audit) and test existence sub-check subsume 073's skill creation discipline checks.
  ```

  Commands:
  - `mv docs/build-pipeline/review-skill-creation-discipline.md docs/build-pipeline/_archive/review-skill-creation-discipline.md`
  - Edit frontmatter status field
  - Add absorption note
  </action>

  <acceptance_criteria>
    - `test -f docs/build-pipeline/_archive/review-skill-creation-discipline.md && echo exists` returns "exists"
    - `test ! -f docs/build-pipeline/review-skill-creation-discipline.md && echo moved` returns "moved"
    - `grep "status: archived" docs/build-pipeline/_archive/review-skill-creation-discipline.md` finds the updated status
    - `grep "absorbed by entity 084" docs/build-pipeline/_archive/review-skill-creation-discipline.md` finds the note
  </acceptance_criteria>

  <files_modified>
    - docs/build-pipeline/_archive/review-skill-creation-discipline.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2">
  <read_first>
    - skills/build-review/SKILL.md
    - skills/build-uat/SKILL.md
  </read_first>

  <action>
  Cross-consistency verification. After tasks 1-3, verify the full set of changes is internally consistent:

  1. **Count alignment.** Confirm build-review SKILL.md says "six checks (1a-1f)" in all locations where the count appears (header, Step 1 intro prose, Rules "Pre-Scan Runs Inline" block).
  2. **Step ordering.** Confirm Step 1f appears after Step 1e and before Step 2 in the document structure.
  3. **Type enum alignment.** Confirm build-uat Step 1 type list includes `skill-invocation` and Step 2 has a matching `2d` sub-step.
  4. **Source tag uniqueness.** Confirm `pre-scan:forge-audit` and `pre-scan:test-existence` do not collide with existing source tags (`pre-scan:claude-md`, `pre-scan:stale-ref`, `pre-scan:dep-chain`, `pre-scan:plan-consistency`, `pre-scan:goal-backward`).
  5. **Entity 073 archived.** Confirm the file is in `_archive/` with `status: archived`.
  6. **No em dashes.** Grep both modified files for `—` (em dash) -- none should be present.

  Commands:
  - `grep -c "six checks" skills/build-review/SKILL.md` (should be >= 2)
  - `grep -n "### 1[ef]" skills/build-review/SKILL.md` (1e before 1f in line numbers)
  - `grep "skill-invocation" skills/build-uat/SKILL.md | wc -l` (should be >= 3)
  - `grep "pre-scan:forge-audit\|pre-scan:test-existence" skills/build-review/SKILL.md`
  - `grep "status: archived" docs/build-pipeline/_archive/review-skill-creation-discipline.md`
  - `grep -P "\x{2014}" skills/build-review/SKILL.md skills/build-uat/SKILL.md` (should be empty)
  </action>

  <acceptance_criteria>
    - All 6 verification commands produce expected results
    - No em dashes found in modified files
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
- [ ] `grep "1f -- Conditional Forge Audit" skills/build-review/SKILL.md` confirms Step 1f section exists with forge audit and test existence sub-checks
- [ ] `grep "skill-invocation" skills/build-uat/SKILL.md | wc -l` returns >= 3 (type enum + Step 2d + rules)
- [ ] `grep "status: archived" docs/build-pipeline/_archive/review-skill-creation-discipline.md` confirms entity 073 archived
- [ ] `grep "absent from ensign subagent context" skills/build-review/SKILL.md` confirms stale Agent tool claim fixed
- [ ] `grep -c "six checks" skills/build-review/SKILL.md` returns >= 2 (header + Step 1 intro)

### API
None

### Interactive
- [ ] Captain reads Step 1f in build-review SKILL.md and confirms: (a) condition is explicit and clear, (b) forge invocation with validate-only route is correctly specified, (c) fallback on forge failure is documented, (d) test existence sub-check is independent of forge, (e) severity mapping matches A-3
- [ ] Captain reads Step 2d in build-uat SKILL.md and confirms: (a) Class 3 pre-classification via AskUserQuestion grep is specified, (b) structural validation runs regardless of runtime result, (c) infra vs assertion fail classification is clear

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: Step 1f fires forge audit on skill diff | task-1 | `grep "1f -- Conditional Forge Audit" skills/build-review/SKILL.md` | pending | -- |
| AC-2: Step 1f skipped on non-skill diff | task-1 | `grep "skip Step 1f entirely" skills/build-review/SKILL.md` | pending | -- |
| AC-3: skill-invocation UAT type loads and verifies | task-2 | `grep "2d -- Skill Invocation" skills/build-uat/SKILL.md` | pending | -- |
| AC-4: Entity 073 archived with absorption note | task-3 | `grep "absorbed by entity 084" docs/build-pipeline/_archive/review-skill-creation-discipline.md` | pending | -- |
| AC-5: Entity 081 shipped before 084 execute | task-0 | `grep "status: shipped" docs/build-pipeline/_archive/quality-goal-backward-regression.md` | pending | -- |
| AC-6: Missing tests produce HIGH finding | task-1 | `grep "pre-scan:test-existence" skills/build-review/SKILL.md` | pending | -- |

## Stage Report: plan

status: passed
plan-checker verdict: PASS (after 1 revision iteration -- inline self-review, no blockers surfaced)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold (all research was entity-specific architecture, no generalizable patterns)
workflow-index append: 3 append calls covering 3 tasks and 3 files, all successful

### Plan confidence assessment

| Factor | Score | Notes |
|--------|-------|-------|
| Context completeness | 98% | All 7 assumptions confirmed, all options selected, all Qs answered, entity 081 shipped |
| Scope clarity | 95% | Two clear insertion points (Step 1f, Step 2d) + one archive operation |
| Risk level | 92% | Forge Skill invocation may fail in ensign context (fallback documented), no code changes only spec edits |
| Precedent strength | 95% | Step 1e and Step 2a-2c are exact structural precedents |
| AC testability | 96% | All ACs have grep-verifiable commands |

**Composite confidence: 95.2%** (weighted: context 25% + scope 20% + risk 20% + precedent 20% + testability 15%)

-> Auto-advance eligible (>95%). Plan proceeds to execute without captain gate.

### Plan-checker self-review findings

- Zero placeholders: PASS (no TBD, "add appropriate", or "similar to" in plan text)
- Type/signature consistency: PASS (no cross-task function signatures)
- Wave dependency sanity: PASS (wave 1 tasks are independent, wave 2 tasks depend on wave 1 outputs)
- Validation Map completeness: PASS (all 6 ACs mapped)

### Commits
- chore(plan): review-forge-validation -- conditional forge audit Step 1f + skill-invocation UAT type
- chore(index): add contracts for entity review-forge-validation entering plan (3 files)

### Checklist

- [x] Research Findings -- 5 domain sections with citations
  Upstream Constraints (5 items), Existing Patterns (3 items), Library/API Surface (3 items), Known Gotchas (3 items), Reference Examples (2 items)
- [x] PLAN -- task list with per-task attributes
  5 tasks (task-0 env verify, task-1 build-review Step 1f, task-2 build-uat Step 2d, task-3 entity 073 archive, task-4 cross-consistency verify), wave 0/1/2, model sonnet
- [x] UAT Spec -- testable items classified by type
  5 CLI items + 2 interactive items across 4 type headers (Browser: None, CLI: 5, API: None, Interactive: 2)
- [x] Validation Map -- requirement -> task -> command -> status table
  6 rows covering all 6 acceptance criteria
- [x] Stage Report: plan -- plan-checker verdict attached
  Self-review PASS, confidence 95.2%, auto-advance eligible
- [x] workflow-index append called unconditionally at plan approval
  3 append calls: task-1 (skills/build-review/SKILL.md), task-2 (skills/build-uat/SKILL.md), task-3 (docs/build-pipeline/_archive/review-skill-creation-discipline.md) -- committed as chore(index)

## Stage Report: execute

**Ran at**: 2026-04-13T07:10:00Z
**HEAD**: b0b4766
**Executor**: sonnet (wave orchestrator)

### Per-task summary

| Task | Wave | Status | Summary |
|------|------|--------|---------|
| task-0 | 0 | DONE | Environment verification -- all 5 grep/ls checks passed: "five checks (1a-1e)" present, type enum confirmed, entity 073 status:draft confirmed, entity 081 status:shipped confirmed, _archive/ directory exists |
| task-1 | 1 | DONE | Added Step 1f conditional forge audit to build-review SKILL.md -- updated check count (five->six) in 2 prose locations, fixed stale Agent tool claim at line 28, inserted Step 1f section (forge validate-only + test existence sub-check + fallback), added "Forge Audit Is Conditional and Filtered" rules block, updated "Scope/Routing/Hygiene" rule to note kc-plugin-forge exception. All 6 ACs verified via grep. |
| task-2 | 1 | DONE | Added type: skill-invocation to build-uat SKILL.md -- updated Step 1 type enum, updated Step 2 intro, inserted Step 2d (pre-classify + runtime invocation + structural validation), added "Skill Invocation -- Pre-Classify Before Runtime" rules block. All 4 ACs verified via grep (skill-invocation count: 9). |
| task-3 | 2 | DONE | Archived entity 073 -- moved review-skill-creation-discipline.md to _archive/, changed status: draft -> status: archived, added absorption note referencing entity 084. All 4 ACs verified. |
| task-4 | 2 | DONE | Cross-consistency verification -- all 6 checks passed: "six checks" count=2, Step 1e (line 163) before Step 1f (line 186), skill-invocation count=9 (>=3), pre-scan:forge-audit and pre-scan:test-existence present and non-colliding, entity 073 archived, no new em dashes introduced by Tasks 1-3 (2 pre-existing em dashes in rules examples confirmed pre-existing via git history). |

### Acceptance criteria verification

| AC | Status | Evidence |
|----|--------|----------|
| Step 1f fires forge audit on skill diff | DONE | `grep "1f -- Conditional Forge Audit" skills/build-review/SKILL.md` -- line 186 |
| Step 1f skipped on non-skill diff | DONE | `grep "skip Step 1f entirely" skills/build-review/SKILL.md` -- explicit condition in section |
| skill-invocation UAT type loads and verifies | DONE | `grep "2d -- Skill Invocation" skills/build-uat/SKILL.md` -- Step 2d present |
| Entity 073 archived with absorption note | DONE | `grep "absorbed by entity 084" docs/build-pipeline/_archive/review-skill-creation-discipline.md` -- line 23 |
| Entity 081 shipped before 084 execute | DONE | `grep "status: shipped" docs/build-pipeline/_archive/quality-goal-backward-regression.md` -- confirmed task-0 |
| Missing tests produce HIGH finding | DONE | `grep "pre-scan:test-existence" skills/build-review/SKILL.md` -- present in Step 1f with HIGH/CODE severity |

### Files Modified

- `skills/build-review/SKILL.md` -- Step 1f added, check count updated (five->six), Agent tool claim fixed, rules block added
- `skills/build-uat/SKILL.md` -- skill-invocation type added to enum, Step 2d inserted, rules block added
- `docs/build-pipeline/_archive/review-skill-creation-discipline.md` -- moved from active, status: archived, absorption note added

### Commits

- `6d9b534` feat(084): add Step 1f conditional forge audit to build-review pre-scan
- `1be03ac` feat(084): add type: skill-invocation to build-uat UAT item types
- `b0b4766` archive(073): absorb review-skill-creation-discipline into entity 084

### Checklist

- [x] All PLAN tasks executed per wave ordering
  Wave 0: task-0. Wave 1: task-1 + task-2 (sequential, independent). Wave 2: task-3 + task-4 (sequential).
- [x] Per-task commits on feature branch with conventional message format
  3 commits on spacedock-ensign/review-forge-validation branch.
- [x] Acceptance criteria verified per task
  All 6 ACs confirmed via grep commands documented above.
- [x] Files Modified section present
  3 files listed above.
- [x] Stage Report: execute written with per-task summary rows
  This section.
- [x] workflow-index update-status: not applicable at execute stage (status was set in-flight at plan approval; execute stage does not call update-status per skill contract)
