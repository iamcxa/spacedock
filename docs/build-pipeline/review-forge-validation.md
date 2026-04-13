---
id: 084
title: "Review forge validation -- conditional forge audit + skill invocation testing"
status: shipped
source: decomposition of entity 074 (pipeline verification quality uplift)
started: 2026-04-13T06:30:00Z
worktree: .worktrees/spacedock-ensign-review-forge-validation
completed:
verdict:
score: 0.0
issue:
pr: "#39"
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
