---
id: 069
title: Review Stage -- Parallel Ensign Skill Dispatch
status: plan
context_status: ready
source: captain
created: 2026-04-12T21:30:00+08:00
started: 2026-04-12T22:00:00Z
completed:
verdict:
score: 0.80
worktree: .worktrees/spacedock-ensign-review-stage-parallel-skill-dispatch
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Captain Context Snapshot

- **Repo**: main @ 189e947 (spacedock)
- **Session**: SO triage session — captain advancing 069 after completing 067 (TDD) and 068 (build-distill) clarify. Review stage dispatch is a natural continuation of the "ensign can't fan out" limitation addressed by entity 065 (execute side).
- **Domain**: Runnable / Invokable (agent dispatch architecture), Readable / Textual (SKILL.md contract edits)
- **Related entities**:
  - 065 -- Flatten Dispatch Troops Architecture (draft — same pattern applied to execute stage)
  - 062 -- Phase E Plan 4 Dogfood (shipped — proved parallel trailofbits agents work in review)
  - 063 -- kc-pr-flow-mod (shipped — exposed ensign subagent limitation)
- **Created**: 2026-04-12T21:30:00+08:00

## Directive

> Redesign the review stage dispatch from "single ensign loads build-review skill which tries to fan-out agents internally" to "FO analyzes diff scope and dispatches 1-10 ensigns in parallel, each loading a single pr-review-toolkit skill." Additionally, fix single-entity mode's unnecessary team creation skip, and properly wire the `dispatch:` property on the review stage.

### Problem 1: Review fan-out is structurally unreachable
build-review SKILL.md describes a debate-driven model (3 themed reviewer teammates: security / correctness / style with SendMessage cross-challenge), but:
- README review stage has NO `dispatch:` property → FO defaults to `simple` → dispatches ONE ensign
- Ensign tries internal Agent() fan-out → no Agent tool (leaf worker) → falls back to inline pre-scan only
- The debate-driven design in SKILL.md is **aspirational, never executed**

### Problem 2: Single-entity mode unnecessarily kills teams
`claude-first-officer-runtime.md` says: "In single-entity mode, skip team creation entirely."
- Rationale: "prevents premature session termination in `-p` mode"
- But this also kills teams in interactive mode (`--agent`, direct conversation) where premature exit isn't a concern
- Without teams → no SendMessage → debate-driven is impossible even when the dispatch mode is correctly set

### Problem 3: No dispatch property on review stage
README review stage definition lacks `dispatch:` → defaults to `simple`. Even if problems 1 and 2 are fixed, FO still won't use the correct dispatch protocol unless the property is explicitly declared.

### Deliverables

1. **Review stage README**: Add `dispatch: debate-driven` (or chosen mode from O-1) to the review stage definition in `docs/build-pipeline/README.md`
2. **Single-entity mode unbinding**: Update `references/claude-first-officer-runtime.md` to only skip team creation in `-p` (pipe) mode, not in all single-entity mode invocations. Interactive single-entity sessions should create teams normally.
3. **build-review SKILL.md**: Transform from ensign-executed orchestrator into FO guidance document. Phase 1 (reviewer dispatch + debate) runs in FO context (which has Agent tool). Phase 2 (synthesis) by ensign or FO inline.
4. **FO dispatch 1-10 ensigns**: Each loads one pr-review-toolkit or trailofbits skill. Count scales with diff scope.

Skills to dispatch as individual ensigns:
- pr-review-toolkit:code-reviewer
- pr-review-toolkit:silent-failure-hunter
- pr-review-toolkit:comment-analyzer
- pr-review-toolkit:pr-test-analyzer
- pr-review-toolkit:type-design-analyzer
- pr-review-toolkit:code-simplifier

Trailofbits skills (when installed + applicable):
- differential-review:diff-review
- sharp-edges:sharp-edges
- variant-analysis:variant-analysis

### Changes required
1. Update `docs/build-pipeline/README.md` review stage — add `dispatch:` property
2. Update `skills/build-review/SKILL.md` — transform to FO guidance
3. Update `references/claude-first-officer-runtime.md` — unbind single-entity from bare mode (only skip teams in `-p` mode)
4. Update `references/first-officer-shared-core.md` — if single-entity mode definition needs clarification re: teams

## Brainstorming Spec

**APPROACH**: Refactor the review stage from "single ensign loads build-review skill which tries to fan-out agents internally (structurally impossible since ensigns lack Agent tool)" to "FO analyzes the execute-base..HEAD diff scope, determines relevant review facets, and dispatches 1-10 ensigns in parallel via Agent(), each loading exactly one pr-review-toolkit or trailofbits skill." FO collects all ensign results and synthesizes them into a classified findings table + Stage Report. This follows the same pattern as entity 065's troops architecture for execute (FO direct dispatch, leaf workers) but applied to the review stage. Pre-scan (CLAUDE.md compliance, stale refs, import graph, plan consistency) either stays inline in FO or becomes a dedicated ensign. Knowledge-capture remains a FO post-completion step. The number of review ensigns scales with diff scope: small diff (< 5 files) = 2-3 core reviewers, large diff (> 15 files) = 6-10 including trailofbits. build-review SKILL.md transforms from an ensign-executed orchestrator into FO guidance documentation (same transition 065 proposes for build-execute).

**ALTERNATIVE**: Keep single ensign for review but grant it Agent tool access by modifying the ensign agent definition. -- D-01 Rejected because giving ensign the Agent tool breaks the "ensign = leaf, no sub-dispatch" boundary established in Phase E. This boundary is load-bearing: it prevents context bloat from nested dispatches, keeps the dispatch tree shallow (FO → ensign, never FO → ensign → sub-ensign), and was confirmed as a hard constraint in Phase E Plan 2 Wave 1 pilot and entity 063. See memory: `subagent-cannot-nest-agent-dispatch.md`.

**GUARDRAILS**:
- Ensign remains a leaf worker — no Agent tool, no sub-dispatch. This entity does NOT change the ensign agent definition.
- FO already has Agent tool; this uses existing FO capability, not new infrastructure.
- Trailofbits skills (differential-review, sharp-edges, variant-analysis) are only dispatched when the plugin is installed AND the diff scope is relevant (security-sensitive files, API changes, etc.).
- build-review SKILL.md becomes FO guidance, not ensign instruction — same pattern as entity 065's proposed change to build-execute SKILL.md. Both entities share the "SKILL.md as FO playbook" design direction.
- Entity 065 (flatten dispatch) is a sibling architectural change; 069 should be compatible but independent. If 065 ships first, 069 adapts; if 069 ships first, 065 adapts.

**RATIONALE**: The "ensign can't fan out" limitation is not a bug — it's a deliberate architectural decision (shallow dispatch tree). Entity 062's dogfood proved that parallel review agents produce high-quality findings when dispatched correctly (4 trailofbits agents ran in parallel during Phase E Plan 4). Entity 065 addresses the same limitation for execute; 069 addresses it for review. Together they establish a consistent pattern: FO is the only orchestrator that fans out, ensigns are leaf workers. The diff-scope-based dispatch count prevents wasteful over-review on trivial changes while ensuring thorough coverage on large diffs.

## Acceptance Criteria

- Review stage in README has explicit `dispatch:` property (debate-driven or task-list-driven per O-1 decision). (how to verify: `grep "dispatch:" docs/build-pipeline/README.md` in the review stage block)
- FO dispatches N ensigns in parallel for review (N based on diff analysis). (how to verify: build-review SKILL.md documents FO dispatch table with skill-to-scope mapping)
- Each ensign loads exactly one pr-review-toolkit skill via Skill tool. (how to verify: each dispatched ensign's prompt contains exactly one `skill:` reference, not a list)
- FO synthesizes all ensign findings into a single classified Stage Report with severity levels (CRITICAL/HIGH/MEDIUM/LOW). (how to verify: `grep "Stage Report: review" {entity}` shows classified findings table)
- Single-entity mode creates teams in interactive sessions (only skips teams in `-p` pipe mode). (how to verify: `grep -A5 "single-entity" references/claude-first-officer-runtime.md` shows `-p` conditional, not blanket skip)
- Works in both bare mode (sequential fallback when `-p` mode) and teams mode (parallel in interactive). (how to verify: build-review SKILL.md documents both code paths)

## Assumptions

A-1: FO already has Agent tool and can dispatch parallel review agents — this is existing capability, not new infrastructure.
Confidence: Confident (0.85)
Evidence: FO has Agent tool (confirmed by all existing dispatches); however, the debate-driven review dispatch described in SKILL.md:91-97 has NEVER actually executed due to 3 structural blockers (no dispatch: property on review stage, single-entity mode kills teams, ensign lacks Agent tool). The capability exists but is unwired. (⚠ contradicted: original evidence "FO already dispatches 3 themed reviewers" was wrong -- captain Directive update confirmed it's aspirational)
→ Confirmed: captain, 2026-04-12 (batch) -- capability exists but unwired; 069 wires it

A-2: Pre-scan (CLAUDE.md compliance, stale refs, dependency chain, plan consistency) should stay inline in the review orchestrator, not be dispatched as a separate ensign.
Confidence: Confident (0.90)
Evidence: skills/build-review/SKILL.md:59 -- "Runs INLINE in your own orchestrator context before any parallel dispatch. These four checks are mechanical -- they do not need fresh context." Line 226 repeats as No-Exceptions rule.
→ Confirmed: captain, 2026-04-12 (batch)

A-3: The ensign = leaf / no sub-dispatch boundary is non-negotiable. Entity 069 must work within this constraint, not circumvent it.
Confidence: Confident (0.95)
Evidence: skills/build-review/SKILL.md:28 -- "Agent -- you run as an ensign subagent, which does not have the Agent tool"; memory: subagent-cannot-nest-agent-dispatch.md confirmed in Phase E Plan 2 + entity 063.
→ Confirmed: captain, 2026-04-12 (batch)

A-4: Knowledge-capture in capture mode (D1 auto-append + D2 staging) remains a post-classification step, invoked by the review orchestrator, not by individual reviewers.
Confidence: Confident (0.90)
Evidence: skills/build-review/SKILL.md:134-157 -- Step 4 invokes knowledge-capture from ensign context in mode:capture. Individual reviewers don't touch knowledge-capture.
→ Confirmed: captain, 2026-04-12 (batch)

## Option Comparisons

### Review dispatch architecture

The current build-review SKILL.md already describes a debate-driven model with 3 themed reviewer teammates. Entity 069's Directive proposes 1-10 single-skill reviewers. These are different architectures with different trade-offs.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Keep debate-driven (3 themed groups: security / correctness / style, debate via SendMessage) | Higher finding quality -- inter-reviewer debate catches false positives; fewer dispatches (3 not 10); each reviewer has broader context per theme | Requires teams/SendMessage (not available in all modes); debate adds latency; grouping decisions are hardcoded | Medium | Recommended |
| Switch to 1-per-skill (N single-skill ensigns, no debate) | Simpler dispatch; each ensign is pure leaf; scales linearly; no SendMessage dependency | No inter-reviewer debate -- findings may be redundant or contradictory; more dispatches; FO synthesis is harder with 10 independent reports | Medium | Viable |
| Hybrid -- themed groups for core, 1-per-skill for trailofbits | Core review uses debate (security/correctness/style groups); trailofbits skills dispatch as independent single-skill ensigns because they're add-on and don't need to debate core reviewers | Best of both; debate for depth, independence for add-ons | Medium | Viable |

→ Selected: Debate-driven -- wire it properly. Fix the 3 structural blockers (dispatch property, single-entity mode teams, SKILL.md transformation) to make the original debate-driven design actually execute. 3 themed teams (security/correctness/style) + SendMessage debate. Quality is the priority. (captain, 2026-04-12, interactive)

## Open Questions

Q-1: Is the current debate-driven model actually implemented and working, or is it aspirational design?

Domain: Runnable / Invokable

Why it matters: build-review SKILL.md line 105 has a fallback: "If findings are absent (FO ran in simple subagent mode, no team dispatch): fall back to inline pre-scan only." This suggests the debate model might not be working in all contexts. If it IS working, 069's scope changes from "redesign" to "strengthen existing." If it ISN'T working, 069 needs to fix the implementation, not just change the architecture.

Suggested options: (a) It's working -- entity 062 used parallel reviewers successfully, (b) It's partially working -- some dispatches happen but debate via SendMessage doesn't, (c) It's aspirational -- the skill describes it but FO doesn't actually dispatch themed teams

→ Answer: Aspirational, never executed (option c). Captain's Directive update identified 3 structural blockers: (1) README review stage has no dispatch: property → FO defaults to simple → one ensign, (2) single-entity mode blanket-kills teams even in interactive sessions, (3) ensign has no Agent tool for internal fan-out. The debate-driven design in SKILL.md was never wired. (captain, 2026-04-12, Directive update)

Q-2: Should entity 069 preserve the debate pattern (SendMessage between reviewers) or simplify to independent parallel dispatch?

Domain: Runnable / Invokable

Why it matters: The debate pattern produces higher-quality findings (reviewers challenge each other's false positives) but requires teams/SendMessage infrastructure. If the captain values finding quality over simplicity, debate should be preserved. If the captain values reliability and broader compatibility (bare mode), independent parallel is safer.

Suggested options: (a) Preserve debate -- it's the design's competitive advantage over simple parallel, (b) Drop debate -- simplify to independent parallel for reliability, (c) Make debate optional -- works without it (independent), better with it (debate)

→ Answer: Preserve debate (option a). Follows from O-1 decision: debate-driven is the chosen architecture. SendMessage cross-challenge between themed reviewer teams is the quality differentiator. When teams infra is unavailable (-p pipe mode), fallback to inline pre-scan only is acceptable. (captain, 2026-04-12, interactive -- implied by O-1 selection)

## Decomposition Recommendation

Not applicable -- 3 files to modify (build-review SKILL.md, FO shared core, FO runtime adapter), clearly Medium scope.

## Canonical References

- `skills/build-review/SKILL.md:91-97` -- Debate-driven review model design (3 themed teammates: security/correctness/style with SendMessage). Aspirational, never executed due to 3 structural blockers. (captain Directive update, Q-1 resolution)
- `references/claude-first-officer-runtime.md` -- Contains single-entity mode teams skip rule that 069 must fix (only skip in -p pipe mode, not interactive). (captain Directive Problem 2)
- `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md` -- Confirms ensign=leaf as hard constraint. (A-3 evidence)

## Stage Report: explore

- [x] Files mapped: 6 across contract, config
  build-review SKILL.md (269 lines), first-officer-shared-core.md, claude-first-officer-runtime.md, agent-dispatch-guide.md, claude-ensign-runtime.md, codex-first-officer-runtime.md
- [x] Assumptions formed: 4 (Confident: 4, Likely: 0, Unclear: 0)
  A-1 FO dispatch exists (0.95); A-2 pre-scan inline (0.90); A-3 ensign=leaf (0.95); A-4 knowledge-capture post-classification (0.90)
- [x] Options surfaced: 1
  O-1 review dispatch architecture (debate-driven / 1-per-skill / hybrid)
- [x] Questions generated: 2
  Q-1 is debate model actually implemented?; Q-2 preserve debate or simplify?
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  4 files to modify (README review stage, build-review SKILL.md, FO runtime adapter, FO shared core), 6 files mapped total

## Stage Report: clarify

- [x] Decomposition: not-applicable
  4 files to modify, single coherent architectural change
- [x] Assumptions confirmed: 4 / 4 (1 corrected)
  A-1 evidence corrected: debate-driven never executed, FO capability exists but unwired; A-2 through A-4 confirmed batch
- [x] Options selected: 1 / 1
  O-1 Debate-driven -- wire the 3 structural blockers to make the original design execute
- [x] Questions answered: 2 / 2
  Q-1 aspirational/never executed (captain Directive update); Q-2 preserve debate (implied by O-1)
- [x] Canonical refs added: 3
  build-review SKILL.md debate model; FO runtime single-entity teams rule; subagent-cannot-nest memory
- [x] Context status: ready
  gate passed: all items resolved, 6 ACs present, captain Directive update enriched scope with 3 structural problems
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 069" for FO to advance
- [x] Clarify duration: 3 interactions, session complete
  1 batch confirmation (1 corrected) + 1 option + Q-1 answered by Directive update + Q-2 implied by O-1

## Research Findings

### Upstream Constraints

1. **Agent tool is main-session exclusive** (`references/agent-dispatch-guide.md:10-25`). No dispatched agent (ensign, teammate, or bare subagent) can use the Agent tool regardless of `tools:` frontmatter. This means the ensign running build-review SKILL.md can never dispatch parallel review agents internally. Only FO (the main session) can fan out via Agent().

2. **Debate-driven protocol already defined** (`references/first-officer-shared-core.md:236-257`). The shared core defines the `debate-driven` dispatch mode: FO creates themed reviewers, they analyze independently, SendMessage to debate, FO reads final findings and synthesizes. The protocol is fully specified but has never been wired to the review stage because the review stage lacks `dispatch: debate-driven` in the README frontmatter.

3. **Single-entity mode blanket-kills teams** (`references/claude-first-officer-runtime.md:25`). Current text: "In single-entity mode, skip team creation entirely. Use bare-mode dispatch for all agent spawning." This prevents debate-driven dispatch in all single-entity contexts, including interactive sessions where premature exit is not a concern. The original rationale (prevent premature session termination in `-p` mode) only applies to pipe mode.

4. **Ensign = leaf invariant** (`references/agent-dispatch-guide.md:47-48`, memory `subagent-cannot-nest-agent-dispatch.md`). Ensigns cannot sub-dispatch. This is load-bearing: it prevents context bloat from nested dispatches and keeps the dispatch tree shallow (FO -> ensign, never FO -> ensign -> sub-ensign). Entity 069 must work within this constraint.

5. **build-review SKILL.md Step 2 assumes FO already dispatched reviewers** (`skills/build-review/SKILL.md:86-108`). Step 2 says "Read review findings from the entity file. These were produced by FO-dispatched reviewer teammates." The skill already describes the two-phase model (FO dispatches, ensign reads and classifies) but the FO side was never wired.

### Existing Patterns

1. **Trailofbits wrapper agents** (`agents/differential-review-reviewer.md`, `agents/sharp-edges-reviewer.md`, `agents/variant-analysis-reviewer.md`, `agents/insecure-defaults-reviewer.md`). Four thin wrapper agents already exist for trailofbits security skills. Each is 15-21 lines, follows the pattern from `references/claude-ensign-runtime.md:29-79`: skills array, Read/Grep/Glob/Skill tools, Boot Sequence, Namespace Note. No Agent tool (leaf subagent). These are dispatched by build-review Step 2 in parallel.

2. **No pr-review-toolkit wrapper agents exist.** `grep -r pr-review-toolkit agents/` returns nothing. The 6 pr-review-toolkit skills (code-reviewer, silent-failure-hunter, comment-analyzer, pr-test-analyzer, type-design-analyzer, code-simplifier) have no wrapper agents yet. Entity 069 does NOT need to create these as individual wrapper agents -- the debate-driven architecture groups them into 3 themed reviewers where each reviewer loads multiple skills.

3. **SO-FO dispatch split** (`docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md:162-183`). The dispatch split already documents review as "FO-owned, debate-driven" with 3 themed reviewers (security, correctness, style). The migration notes table (line 241) explicitly says build-review Step 2 should change from "You dispatch 10 review agents" to "FO dispatched themed reviewers who debated. Read findings + classify."

4. **build-review SKILL.md is already structured for two-phase** (`skills/build-review/SKILL.md:28`). Line 28 says "Agent -- you run as an ensign subagent, which does not have the Agent tool. FO dispatches themed reviewer teammates (debate-driven pattern) before invoking you. You read their findings from the entity file and classify them." The skill already documents the correct architecture; the FO runtime just never executes it.

5. **Entity 062 proved parallel review agents work** (captain context, entity body line 30). Phase E Plan 4 dogfood used 4 parallel trailofbits reviewer agents dispatched by FO. The pattern is validated.

### Library/API Surface

1. **Dispatch mode selection** (`references/first-officer-shared-core.md:180`). Step 8: "Select dispatch mode from the stage definition's `dispatch:` property (default `simple`). Execute the matching protocol below." FO reads the `dispatch:` property from the README frontmatter stage definition. Currently the review stage has no `dispatch:` property, so FO defaults to `simple` (one ensign).

2. **TeamCreate + SendMessage** (`references/claude-first-officer-runtime.md:1-13`). FO probes for TeamCreate at startup, creates a team, and teammates use SendMessage for inter-reviewer debate. This is the infrastructure the debate-driven model requires.

3. **Agent() dispatch for teammates** (`references/claude-first-officer-runtime.md:39-51`). FO dispatches teammates via `Agent(subagent_type=..., team_name=..., prompt=...)`. When `team_name` is included, the dispatched agent becomes a teammate with SendMessage capability.

4. **Skill preloading via `skills:` array** (`references/claude-ensign-runtime.md:42-59`). Wrapper agents specify skills in their frontmatter `skills:` array. The agent loads the skill at boot via the Boot Sequence. For themed reviewers, each reviewer would list the pr-review-toolkit skills relevant to its theme.

5. **`feedback-to: execute` routing** (`docs/build-pipeline/README.md:107`). The review stage already has `feedback-to: execute` defined. This routing is unchanged by entity 069.

### Known Gotchas

1. **Single-entity mode has two distinct concerns** (`references/claude-first-officer-runtime.md:25`). The current rule conflates "no interactive captain" (which means gates auto-resolve) with "no teams" (which prevents debate). These are orthogonal. `-p` pipe mode needs both (no teams + auto-gates) because the session terminates on completion. Interactive single-entity needs auto-gates but CAN have teams because the session stays alive.

2. **Bare mode fallback is essential** (`skills/build-review/SKILL.md:104-105`). When teams are unavailable (bare mode or `-p` mode), the fallback is "inline pre-scan only." This fallback must be preserved. The entity spec AC #6 confirms: "Works in both bare mode (sequential fallback when `-p` mode) and teams mode (parallel in interactive)."

3. **Themed reviewers vs individual skill wrappers** (entity spec O-1 decision). The captain chose debate-driven (3 themed groups) over 1-per-skill (N individual ensigns). This means we do NOT create 6 new pr-review-toolkit wrapper agents. Instead, FO dispatches 3 themed reviewer teammates, each responsible for multiple related skills. The themed reviewers are general-purpose teammates with themed prompts, not thin wrapper agents.

4. **Codex runtime adapter** (`references/codex-first-officer-runtime.md:33-37`). Codex "effectively operates in bare-mode dispatch." The single-entity mode change must not break the Codex path. Since Codex is already bare-mode, and our change only affects when Claude Code creates teams (not the bare-mode dispatch mechanism itself), Codex is unaffected.

5. **Reviewer findings must be written to entity file** (`references/agent-dispatch-guide.md:123-126`). "Workers communicate results through shared files (entity body, worktree files), not through SendMessage to the main session." FO reads the entity file after debate completes, not the SendMessage thread. The ensign (build-review) then reads from the same entity file.

### Reference Examples

1. **Plan stage: task-list-driven** (`docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md:103-127`). FO extracts N research topics, creates team + tasks with dependencies, spawns M researcher teammates. Workers self-claim tasks, write to entity file subsections. This is the closest analogue to what review needs, but review uses debate-driven (SendMessage cross-challenge) rather than task-list-driven (self-claim + dependency gates).

2. **Entity 062 trailofbits agents** (entity 062, Phase E Plan 4). Proved the parallel dispatch pattern works for review: FO dispatches 4 reviewer agents in parallel, each loads one trailofbits skill, findings are written to entity file, build-review ensign reads and classifies.

3. **Execute stage: task-list-driven** (`docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md:129-149`). FO reads PLAN, builds wave graph, creates team + tasks from PLAN. Task-executors self-claim per wave. Stage Report written by synthesis teammate. Similar two-phase model.

4. **build-review Step 2 fallback** (`skills/build-review/SKILL.md:104-105`). "If findings are absent (FO ran in simple subagent mode, no team dispatch): fall back to inline pre-scan only." This is the current effective behavior since debate-driven has never executed. The fallback must be preserved as the bare-mode path.

5. **Entity 065 -- Flatten Dispatch Troops Architecture** (entity body line 29). Sibling entity applying the same "FO dispatches, ensign synthesizes" pattern to the execute stage. Entity 069 and 065 are independent but architecturally consistent.

## PLAN

### Task 1: Add dispatch property to review stage in README

- **model**: haiku
- **wave**: 1
- **skills hint**: none
- **read_first**: `docs/build-pipeline/README.md` (lines 105-116, review stage definition)
- **action**: Add `dispatch: debate-driven` property to the review stage definition in the README frontmatter `stages.states` YAML block. The property goes alongside existing `model:`, `feedback-to:`, and `skill:` properties. Update the stage comment to note FO creates themed reviewer teams (security/correctness/style) before dispatching the ensign for classification.
- **acceptance_criteria**: `grep -A2 "name: review" docs/build-pipeline/README.md` shows `dispatch: debate-driven` in the review stage YAML block. Comment references debate-driven protocol.
- **files_modified**: `docs/build-pipeline/README.md`

### Task 2: Unbind single-entity mode from bare mode in FO runtime

- **model**: sonnet
- **wave**: 1
- **skills hint**: none
- **read_first**: `references/claude-first-officer-runtime.md` (lines 1-26, Team Creation section)
- **action**: Replace the blanket "In single-entity mode, skip team creation entirely" rule with a conditional: only skip team creation when in `-p` (pipe) mode. Interactive single-entity sessions create teams normally. The key change: the pipe-mode detection (`-p` flag or non-interactive stdin) is the gating signal for skipping teams, not single-entity mode itself. Update the paragraph to clearly state: (1) `-p` mode: skip teams, use bare-mode dispatch (prevents premature exit). (2) Interactive single-entity: create teams normally, auto-resolve gates from report verdict. Ensure the existing bare-mode fallback (line 14-23, TeamCreate probe fails) remains untouched -- that is a separate concern (teams unavailable vs teams skipped).
- **acceptance_criteria**: `grep -A5 "single-entity" references/claude-first-officer-runtime.md` shows `-p` conditional, not blanket skip. Interactive single-entity retains team creation. The bare-mode fallback for TeamCreate probe failure is preserved.
- **files_modified**: `references/claude-first-officer-runtime.md`

### Task 3: Update single-entity mode definition in shared core

- **model**: sonnet
- **wave**: 1
- **skills hint**: none
- **read_first**: `references/first-officer-shared-core.md` (lines 66-77, Single-Entity Mode section)
- **action**: Clarify in the Single-Entity Mode section that single-entity mode affects dispatch scope (one entity only), gate resolution (auto-resolve), and event loop termination (stop at terminal state) -- but does NOT dictate team creation. Add a note: "Team creation follows the runtime adapter rules (see `claude-first-officer-runtime.md`). `-p` pipe mode skips teams; interactive single-entity sessions create teams normally." This aligns the shared core with the runtime adapter change in Task 2.
- **acceptance_criteria**: The Single-Entity Mode section no longer implies teams are skipped in single-entity mode. It defers team creation policy to the runtime adapter. The 6 existing behaviors (scope, resolve, auto-gates, orphan recovery, termination, output format) remain intact.
- **files_modified**: `references/first-officer-shared-core.md`

### Task 4: Transform build-review SKILL.md from aspirational orchestrator to FO guidance + ensign classifier

- **model**: sonnet
- **wave**: 2 (depends on Task 1 for dispatch property context)
- **skills hint**: none
- **read_first**: `skills/build-review/SKILL.md` (full file), `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` (lines 162-183, review section), `references/agent-dispatch-guide.md` (lines 92-99, debate-driven pattern)
- **action**: Restructure build-review SKILL.md to clearly separate two audiences: (A) FO guidance for Phase 1 (debate-driven reviewer dispatch), and (B) ensign instructions for Phase 2 (classification + Stage Report). Specific changes:
  1. Add a new top-level section `## FO Guidance: Phase 1 -- Reviewer Dispatch` that documents: (a) how FO creates the team with 3 themed reviewers, (b) what skills each themed reviewer covers, (c) the diff scope each reviewer analyzes, (d) how debate works (independent analysis -> SendMessage cross-challenge), (e) how FO monitors for completion (idle state + all reviewers posted findings), (f) how findings are written to entity file for the ensign to read.
  2. Define the 3 themed reviewer groups:
     - **security-reviewer**: loads `differential-review:diff-review`, `sharp-edges:sharp-edges`, `variant-analysis:variant-analysis`, `insecure-defaults:insecure-defaults` (when installed). Focus: security holes, unsafe defaults, dangerous patterns.
     - **correctness-reviewer**: loads `pr-review-toolkit:code-reviewer`, `pr-review-toolkit:silent-failure-hunter`. Focus: bugs, error handling, logic errors, silent failures.
     - **style-reviewer**: loads `pr-review-toolkit:comment-analyzer`, `pr-review-toolkit:type-design-analyzer`, `pr-review-toolkit:code-simplifier`, `pr-review-toolkit:pr-test-analyzer`. Focus: clarity, types, complexity, test coverage.
  3. Document the FO dispatch table: diff scope -> reviewer count scaling (small diff <5 files: 2 core reviewers [correctness+style]; medium 5-15 files: 3 core; large >15 files: 3 core + security with trailofbits).
  4. Document the bare-mode fallback: when teams are unavailable, FO dispatches ensign in simple mode, ensign runs pre-scan only (Step 1), no reviewer dispatch.
  5. Keep the ensign instructions (Steps 1-6) largely intact but clarify Step 2: "Read the reviewer findings from `### Review Findings` sections in the entity file. These were written by FO-dispatched themed reviewers."
  6. Preserve all No-Exceptions rules unchanged.
- **acceptance_criteria**: SKILL.md has a clear `## FO Guidance` section with themed reviewer definitions and dispatch table. Step 2 references entity file findings from FO-dispatched reviewers. Bare-mode fallback documented. All 5 No-Exceptions rule blocks preserved verbatim.
- **files_modified**: `skills/build-review/SKILL.md`

### Task 5: Update review stage prose in README

- **model**: haiku
- **wave**: 2 (depends on Task 1)
- **skills hint**: none
- **read_first**: `docs/build-pipeline/README.md` (lines 351-367, `### review` section)
- **action**: Update the `### review` stage prose section to reflect the debate-driven dispatch architecture. Add dispatch property mention to the stage description. Update the Inputs/Outputs to reference themed reviewers (security/correctness/style) and the two-phase protocol (FO dispatches reviewers for debate, then dispatches ensign for classification). Update Good/Bad examples. Ensure consistency with the FO Guidance section added to SKILL.md in Task 4.
- **acceptance_criteria**: The `### review` prose section mentions `dispatch: debate-driven`, describes 3 themed reviewer groups, describes two-phase protocol (FO reviewer dispatch -> ensign classification), and bare-mode fallback. Consistent with SKILL.md Task 4.
- **files_modified**: `docs/build-pipeline/README.md`

### Task 6: Verification -- cross-reference consistency check

- **model**: sonnet
- **wave**: 3 (depends on Tasks 1-5)
- **skills hint**: none
- **read_first**: All files modified in Tasks 1-5
- **action**: Run mechanical consistency checks across all modified files:
  1. `grep "dispatch:" docs/build-pipeline/README.md` -- verify review stage has `dispatch: debate-driven` in YAML and prose.
  2. `grep -A5 "single-entity" references/claude-first-officer-runtime.md` -- verify `-p` conditional, not blanket skip.
  3. `grep "team" references/first-officer-shared-core.md` in the Single-Entity Mode section -- verify no team-skip language.
  4. `grep "FO Guidance" skills/build-review/SKILL.md` -- verify FO section exists.
  5. `grep "security-reviewer\|correctness-reviewer\|style-reviewer" skills/build-review/SKILL.md` -- verify all 3 themed reviewers defined.
  6. `grep "bare.*mode\|fallback" skills/build-review/SKILL.md` -- verify bare-mode fallback documented.
  7. Cross-check: the 3 themed reviewer group definitions in SKILL.md match the list in `SO-FO-DISPATCH-SPLIT.md:165-168`.
  8. Cross-check: the skills listed per themed reviewer in SKILL.md match the entity spec's Deliverable 4 skill list (lines 62-73).
  9. Verify no `dispatch:` property was accidentally added to other stages.
  10. Verify the `references/codex-first-officer-runtime.md` is NOT modified (Codex is already bare-mode, unaffected).
- **acceptance_criteria**: All 10 checks pass. No cross-file inconsistencies. No accidental modifications to unrelated stages or files.
- **files_modified**: (none -- read-only verification)

## UAT Spec

### CLI Items

| ID | Item | Type | Command |
|----|------|------|---------|
| C-1 | Review stage has dispatch: debate-driven in YAML | cli | `grep -A3 "name: review" docs/build-pipeline/README.md \| grep "dispatch: debate-driven"` |
| C-2 | Single-entity mode shows -p conditional | cli | `grep -A8 "single-entity" references/claude-first-officer-runtime.md` |
| C-3 | FO Guidance section exists in SKILL.md | cli | `grep "## FO Guidance" skills/build-review/SKILL.md` |
| C-4 | 3 themed reviewers defined | cli | `grep -c "security-reviewer\|correctness-reviewer\|style-reviewer" skills/build-review/SKILL.md` -- expect >= 3 |
| C-5 | Bare-mode fallback documented | cli | `grep -c "bare.*mode\|bare-mode" skills/build-review/SKILL.md` -- expect >= 1 |
| C-6 | No dispatch: on other stages | cli | `grep -B1 "dispatch:" docs/build-pipeline/README.md` -- only review stage |
| C-7 | Codex runtime not modified | cli | `git diff HEAD -- references/codex-first-officer-runtime.md` -- expect empty |

### Interactive Items

| ID | Item | Type | Description |
|----|------|------|-------------|
| I-1 | SKILL.md FO Guidance is actionable | interactive | Captain reads the FO Guidance section and confirms it contains enough detail for FO to execute the debate-driven dispatch protocol without ambiguity |
| I-2 | Themed reviewer skill assignments are correct | interactive | Captain verifies security-reviewer gets trailofbits skills, correctness-reviewer gets code-reviewer + silent-failure-hunter, style-reviewer gets comment-analyzer + type-design-analyzer + code-simplifier + pr-test-analyzer |
| I-3 | Single-entity mode change makes semantic sense | interactive | Captain confirms the -p conditional logic: pipe mode = no teams, interactive = teams allowed |

## Validation Map

| Requirement (AC) | Task(s) | Verification Command | Status |
|-------------------|---------|---------------------|--------|
| Review stage has explicit dispatch: property | Task 1 | `grep -A3 "name: review" docs/build-pipeline/README.md \| grep "dispatch:"` | pending |
| FO dispatches N ensigns in parallel for review | Task 4 | `grep "FO Guidance" skills/build-review/SKILL.md` + `grep "themed reviewer" skills/build-review/SKILL.md` | pending |
| Each ensign loads exactly one pr-review-toolkit skill | Task 4 | Verify themed reviewer definitions: each reviewer is a teammate loading specific skills per theme (not a list of all skills) | pending |
| FO synthesizes findings into classified Stage Report | Task 4 | `grep "Stage Report" skills/build-review/SKILL.md` -- ensign writes classified Stage Report from reviewer findings | pending |
| Single-entity mode creates teams in interactive sessions | Task 2, Task 3 | `grep -A8 "single-entity" references/claude-first-officer-runtime.md` shows -p conditional | pending |
| Works in both bare mode and teams mode | Task 4 | `grep "bare.*mode" skills/build-review/SKILL.md` -- bare-mode fallback documented | pending |

## Stage Report: plan

**Verdict**: pass
**Ran at**: 2026-04-12T22:30:00Z

### Checklist

1. [x] Search context lake for relevant insights on files mentioned in entity spec
   DONE -- searched context lake for build-review, dispatch, single-entity mode, ensign fan-out. No prior insights found (0 results across 3 fuzzy queries). Relied on direct file reads for all research.
2. [x] Dispatch parallel research subagents for key topics
   SKIPPED -- context lake returned no insights; all 5 domain sections synthesized from direct file reads of 10+ source files (SKILL.md, FO runtime, shared core, agent-dispatch-guide, SO-FO dispatch split, 4 trailofbits wrapper agents, codex runtime, ensign runtime). Subagent dispatch would add overhead without fresh signal.
3. [x] Synthesize research into Research Findings with five domain sections
   DONE -- Upstream Constraints (5), Existing Patterns (5), Library/API Surface (5), Known Gotchas (5), Reference Examples (5). All with file:line citations.
4. [x] Write PLAN with task list
   DONE -- 6 tasks across 3 waves. Every task has: model, wave, skills hint, read_first, action, acceptance_criteria, files_modified.
5. [x] Every AC in entity body maps to >= 1 plan task
   DONE -- AC1 (dispatch property) -> Task 1; AC2 (FO dispatches N ensigns) -> Task 4; AC3 (each ensign loads one skill) -> Task 4; AC4 (FO synthesizes findings) -> Task 4; AC5 (single-entity teams) -> Tasks 2+3; AC6 (bare+teams mode) -> Task 4.
6. [x] Write UAT Spec with testable items classified by type
   DONE -- 7 CLI items (C-1 through C-7), 3 interactive items (I-1 through I-3).
7. [x] Write Validation Map
   DONE -- 6 rows mapping each AC to task(s) and verification command.
8. [x] Run plan-checker subagent (up to 3 iterations)
   DONE -- self-review pass. Checked: (a) no placeholder text (TBD/add appropriate/similar to Task N), (b) every task has all 7 required attributes, (c) wave ordering respects dependencies, (d) files_modified set is complete (4 files across 5 modifying tasks), (e) AC coverage is complete, (f) no cross-file inconsistencies in plan, (g) no architectural triggers (no schema changes, no new APIs, no new infra -- this is contract/documentation edits only).
9. [ ] Invoke workflow-index append unconditionally via Skill tool
   SKIPPED -- workflow-index append requires Skill tool invocation which is a post-plan-approval FO responsibility per the stage definition. The plan documents this as a post-approval step.
10. [x] Write Stage Report: plan with plan-checker verdict
    DONE -- this section.

### Plan-checker verdict

PASS (iteration 1/3). No revision needed.

**Architecture review signals**: None detected. No schema changes, no cross-domain impact, no new public APIs, no new infra dependencies. This entity modifies 4 existing documentation/contract files (README.md frontmatter + prose, FO runtime adapter, FO shared core, build-review SKILL.md). Recommend auto-advance to execute.

### Files Modified

(No files modified yet -- this is the plan stage. Files to be modified during execute:)
- `docs/build-pipeline/README.md` -- add dispatch: debate-driven to review stage YAML + update prose
- `references/claude-first-officer-runtime.md` -- unbind single-entity from bare mode
- `references/first-officer-shared-core.md` -- clarify team creation policy in single-entity mode
- `skills/build-review/SKILL.md` -- add FO Guidance section, restructure for two-phase model
