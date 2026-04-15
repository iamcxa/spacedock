---
id: 107
title: Plan-Checker Multi-Angle Nuwa-ification -- Port Monolithic Prompt to Per-Dim Haiku Dispatch
status: uat
context_status: ready
source: /build
created: 2026-04-15T00:00:00Z
started: 2026-04-15T16:20:00+08:00
completed:
verdict:
score: 0.94
worktree: .worktrees/spacedock-ensign-plan-checker-multi-angle-nuwa
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
depends-on: [061, 106]
---

## Directive

> Rebuild plan-checker using the Nuwa multi-angle synthesis pattern. Current plan-checker (skills/build-plan/references/plan-checker-prompt.md) is a single opus prompt sequencing 8 dims (will be 10 after entity 106 ships Dim 9 stale-line-anchor + Dim 10 circular-AC). Target architecture: dispatch one haiku per dim in parallel (fresh context, isolated per-dim bias), synthesize in main session with Port 10 contradiction preservation (same pattern as build-explore Step 2 Mode A 4-angle fanout, entities 104/105, and MEMORY subagent-first-for-all-stages-except-clarify). Expected benefits: (1) per-dim fresh context prevents cross-dim noise pollution, (2) parallel max(t) vs sequential n*t, (3) haiku*10 cheaper than opus*1, (4) natural home for future dim additions. Constraints: must preserve plan-checker blocker/warning severity semantics, wave-graph integrity dim (Dim 3) may need special cross-dim correlation handling, output YAML schema must stay backward-compat with build-plan Step 0.5 consumer. Depends-on: 106 must ship first so Dim 9+10 land in single-prompt form before being ported. Parent context: docs/build-pipeline/plan-defect-autopilot.md Follow-up Seed section.

## Captain Context Snapshot

- **Repo**: main @ 087d380
- **Session**: Plan-checker Nuwa-ification flagged mid-clarify on entity 106 (2026-04-15); captain punted to separate entity to avoid scope creep + 061 cascade risk
- **Domain**: Organizational / Data-transforming; Runnable / Invokable
- **Related entities**: 106 plan-defect-autopilot (clarify, ready; depends-on parent -- ships Dim 9+10 first); 061 phase-e-plan-2-research-and-plan-skills (clarify; owns build-plan/SKILL.md dispatch wiring); 092 plan-file-separation-executor-context (clarify; additive output-path change); 104 brainstorm-nuwa-distillation (_archive, shipped; Nuwa pattern precedent); 105 explore-nuwa-subagent-first (_archive, shipped; subagent-first extension)
- **Created**: 2026-04-15T00:00:00Z

## Goal Check

You are asking for plan-checker to work like Nüwa -- instead of one big opus prompt doing all 10 dimensional checks, run 10 small haiku agents in parallel (one per dimension), each with its own fresh context, then stitch their findings together in the main session while keeping contradictions visible.

- **Problem being solved**: a single monolithic prompt means evidence gathered for dim 1 leaks into dim 6's reasoning; it's also slower (serial) and harder to extend (dim 11 means editing a 150-line prompt).
- **Expected outcome**: plan-checker becomes 10 parallel haiku dispatches + a thin synthesis layer; adding a new dim becomes "new 25-line agent file"; YAML output contract stays identical so build-plan Step 6 consumer is unchanged.
- **Explicit non-goals**: NOT changing blocker/warning severity semantics, NOT changing YAML schema consumed by build-plan Step 0.5, NOT re-engineering wave-graph integrity (Dim 3) logic itself -- just relocating it (needs clarification -- deferred to explore: exact Dim 3 hosting strategy).

## Lens Evidence

### Lens (a) captain-stated-intent

- Current plan-checker is a single opus prompt sequencing 8 dims (10 after 106) -- directive:verbatim [primary]
- Target: dispatch one haiku per dim in parallel, synthesize in main session with Port 10 contradiction preservation -- directive:verbatim [primary]
- Depends-on 106: Dim 9+10 land in single-prompt form before port -- directive:verbatim [primary]
- Output YAML schema must stay backward-compat with build-plan Step 0.5 consumer -- directive:verbatim [primary]
- Blocker/warning severity semantics preserved -- directive:verbatim [primary]
- Wave-graph integrity dim (Dim 3) may need special cross-dim correlation handling -- directive:verbatim [secondary]

### Lens (b) captain-unstated-intent

- Captain implicitly expects this follow-up to inherit MEMORY subagent-first-for-all-stages-except-clarify as standing rule, not re-litigate the pattern -- entity:106 Follow-up Seed [primary]
- 061 depends-on is a hard sequencing gate, not advisory -- entity:106 Q-2 precedent [primary]
- Every new dim wrapper ships with mechanical grep-based contract test (zero-Agent pattern extended) -- entity:106 Q-6 [secondary]
- Captain implicitly expects plan troop to encode behavioral rules in skill text, not only clarify annotations -- entity:106 Q-5 [secondary]

### Lens (c) codebase-current-state

- plan-checker dispatched via `Agent(subagent_type="general-purpose", model="sonnet", ...)` at skills/build-plan/SKILL.md:297-306; prompt rendered from plan-checker-prompt.md template with `{plan_text}` + `{entity_context}` substitution -- skills/build-plan/SKILL.md:297-306 [primary]
- 8 dims at plan-checker-prompt.md:33-158; YAML schema requires `dimension/severity(blocker|warning)/description/fix_hint`, `task` optional; clean result `issues: []` -- skills/build-plan/references/plan-checker-prompt.md:130-145 [primary]
- build-plan Step 6 parses plan-checker YAML into issues list; blockers feed revision loop at Step 7; no separate schema file -- skills/build-plan/SKILL.md:307-308 [primary]
- Dim 3 (Dependency Correctness) currently inside single dispatched subagent; checks read_first cross-wave ordering, files_modified overlap within wave, cycles; no cross-dim correlation mechanism today -- skills/build-plan/references/plan-checker-prompt.md:43-51 [primary]
- build-explore Mode A issues 4 Agent() calls in single tool-call block; structured `## Topic / ## Entity Context / ## Scope Constraint / ## Layer Hint` prompt -- skills/build-explore/SKILL.md:110-136 [primary]
- Thin-wrapper agent pattern: agents/code-explorer.md 21 lines; agents/researcher.md 20 lines; `skills: [...]` preload + 3-section body -- agents/code-explorer.md:1-21, agents/researcher.md:1-20 [secondary]
- build-execute is Dim 3 cross-correlation target: builds wave graph from `## PLAN` at Step 1, surfaces ordering violations as `dimension_3 dependency violation` findings -- skills/build-execute/SKILL.md:325,329 [secondary]

### Lens (d) sibling-entity

- entity 106 writes Dim 9+10 into plan-checker-prompt.md; must ship first -- entity:106 [primary]
- entity 061 owns skills/build-plan/SKILL.md:1-530 (dispatch wiring at :301, :315-323); direct file-surface conflict with Step 6 rewrite -- entity:061 [primary]
- entity 092 modifies SKILL.md:198 (output-target redirect); additive, ordering is 061 → (106 ∥ 092) → this -- entity:092 [secondary]
- entities 104+105 shipped established Nuwa pattern; thin-wrapper agent convention proven -- entity:104 [tertiary]
- entity 061 Stage Report: 8-dim baseline ground truth; dim-count references must cite plan-checker-prompt.md:19-145 -- entity:061 [secondary]
- CONTRACTS.md has NO row for plan-checker-prompt.md or build-plan/SKILL.md; concurrent writes unguarded -- no-contract-lock [secondary]

## Core Tensions

- **essential**: Dim 3 (wave-graph integrity) requires cross-task structural context to detect cycles/overlap, which directly contradicts the "fresh-context per-dim" rationale that motivates Nuwa-ification. Dim 3 must either receive the full PLAN (breaking per-dim isolation) or move cross-correlation into the synthesis layer (expanding synthesis from "merge results" to "do actual work").
- **time-based**: 061 + 106 both depend on skills/build-plan/SKILL.md + plan-checker-prompt.md; this entity is third in line. If 061 stalls, the whole chain stalls. Gating is rigid because the consumer contract at SKILL.md:307 is load-bearing and CONTRACTS.md offers no lock.
- **domain-based**: Cost framing (haiku×10 vs opus×1) vs quality framing (fresh-context purity) -- directive leads with cost + parallelism but the load-bearing benefit is per-dim bias isolation; clarify should confirm ranking so plan task prioritization matches.

## Honest Boundaries

- Dim 3 hosting strategy is α-marked (needs exploration). Two legitimate options (wide-context agent vs synthesis-layer correlation) have different architectural implications; neither is clearly superior from brainstorm-level evidence.
- Build-brainstorm lens (b) structural-only per skill contract: semantic ground truth for "captain implicitly expects X" not verifiable here; explore/clarify owns it.
- No pressure-test precedent for per-dim plan-checker fixtures exists; entity 106 ships first fixture (`build-plan.yaml` extension), this entity inherits or rebuilds depending on 106 scope interpretation.

## Brainstorming Spec

**APPROACH** (amended 2026-04-15 post-109 audit + Q-2/Q-5 resolution): Port the current monolithic plan-checker prompt (10 dims after entity 106) into a **7-unit per-dim haiku-dispatch architecture**: 6 per-dim haiku agents (Dim 1, 2, 6, 7, 9, + merged Dim 4+5 "Context & Research Traceability") + 1 synthesis-layer Dim 3 wave-graph correlation check in main session. Dim 8 deferred (re-audit at N=10 entities); Dim 10 retired (task-execution Circular-AC Rule is authoritative catch per entity 106 Part A). Create 6 thin-wrapper agents at `agents/plan-checker-dim-{id}-{slug}.md` (each ≤22 lines matching existing wrapper convention per Q-2 resolution), each preloading a single skill `skills/plan-checker-dim-{slug}` containing the extracted per-dim prompt. Rewrite `skills/build-plan/SKILL.md` Step 6 to issue all 10 `Agent(subagent_type="spacedock:plan-checker-dim-{id}-{slug}", model="haiku", ...)` calls in a single tool-call block for true parallelism. Synthesis phase in main session concatenates per-dim `issues[]` lists, preserving contradictions (Port 10) when two dims flag the same task -- both findings survive to the consumer YAML. Dim 3 (wave-graph integrity) is the essential-tension special case (needs clarification -- deferred to explore): candidate options are (a) give Dim 3 agent the full PLAN text as wide-context, (b) move wave-graph correlation out of plan-checker entirely into a main-session synthesis pass that consumes all per-task issues. YAML output schema (`dimension/severity/description/fix_hint/task`) is frozen -- build-plan Step 6 consumer at SKILL.md:307 must work unchanged.

**ALTERNATIVE**: Keep the monolithic single-prompt architecture; downgrade dispatch model from opus to sonnet purely for cost. -- D-01 **rejected**: cross-dim bias pollution (the load-bearing problem) persists because evidence Dim 1 reads leaks into Dim 6's reasoning within the same context window; no parallelism gain; adding Dim 11 in the future still means editing a 150-line prompt, whereas Nuwa-ification gives new dims a clean 25-line file with no risk of touching Dims 1-10. Cost is the weakest argument for Nuwa anyway -- the real win is fresh-context isolation.

**GUARDRAILS**:
- NEVER change plan-checker output YAML schema (`dimension/severity/description/fix_hint/task`); consumer at skills/build-plan/SKILL.md:307 is load-bearing.
- NEVER ship before entities 106 AND 061 (depends-on chain); Dim 9+10 must land in monolithic form first so this entity ports all 10 in one pass.
- Every per-dim wrapper agent ≤25 lines (MEMORY thin-wrapper-agent-pattern cap).
- Zero nested `Agent()` / `SendMessage()` dispatches inside per-dim prompts -- each haiku is a leaf, same rule as entity 106 Q-6 GUARDRAILS "zero Agent dispatches".
- Preserve blocker/warning severity semantics verbatim.
- Dim 3 cross-correlation strategy must be explicit (wide-context agent OR main-session synthesis step) -- no implicit "it'll work out" path.

**RATIONALE**: Fresh-context per-dim isolation is the load-bearing benefit, not cost. Monolithic prompts suffer cognitive crowding -- evidence gathered for one dim biases interpretation of the next within the same context window. MEMORY's `subagent-first-for-all-stages-except-clarify` already recognized this for build-brainstorm and build-explore; plan-checker is the remaining stage running monolithic. The ALTERNATIVE (sonnet-downgrade) addresses cost but not bias; it also does not unlock the extensibility win -- entity 106 adding Dim 9+10 required editing a 150-line prompt, and each future dim compounds that edit risk. After Nuwa-ification, Dim 11 is a new 25-line agent file; Dims 1-10 cannot regress because their prompts are frozen in separate files. Port 10 contradiction preservation (entity 104 precedent) also matters for plan-checker specifically: two dims flagging the same task from different angles is signal, not redundancy, and a monolithic prompt tends to synthesize-away such parallel findings. The Dim 3 tension is real but bounded -- two concrete options exist, both architecturally defensible, and explore can resolve without re-litigating the Nuwa-ification premise.

## Acceptance Criteria

- Given a plan with 10 dims worth of issues across 5 tasks, when post-port plan-checker runs, then it emits the same YAML schema fields (`dimension/severity/description/fix_hint/task`) as the pre-port version (how to verify: schema-diff against captured pre-port output fixture; `diff <(yq e '.issues[0] | keys' pre.yaml) <(yq e '.issues[0] | keys' post.yaml)`)
- Given a plan triggering a Dim 3 wave-graph violation, when post-port plan-checker runs, then the Dim 3 issue is emitted with identical `description/severity/fix_hint` shape as pre-port (how to verify: pressure-test fixture replay with wave-graph violation seed; compare issue records field-by-field)
- Given 10 dim wrapper agents at `agents/plan-checker-dim-*.md`, when we count lines per file, then each ≤25 lines (how to verify: `wc -l agents/plan-checker-dim-*.md | awk '$1 > 25 {print; exit 1}'` returns empty and exits 0)
- Given post-port plan-checker invocation in `skills/build-plan/SKILL.md` Step 6, when we grep the dispatch site for `Agent(` calls, then count == 10 (how to verify: `awk '/^## Step 6/,/^## Step 7/' skills/build-plan/SKILL.md | grep -c 'Agent('`)
- Given the per-dim agents and their preloaded skills, when we grep for nested `Agent(` or `SendMessage(` dispatches, then count == 0 in all 10 (GUARDRAILS zero-nested-dispatch) (how to verify: `grep -lE 'Agent\(|SendMessage\(' agents/plan-checker-dim-*.md skills/plan-checker-dim-*/SKILL.md | head -1` returns empty)
- Given a synthetic plan with two dims flagging the same task, when post-port synthesis runs, then both findings appear in output preserving Port 10 contradiction (how to verify: pressure-test fixture `tests/pressure/plan-checker-nuwa-dual-dim.yaml` with dual-dim violation seed; assert `yq '.issues | length' post.yaml >= 2`)
- Given the depends-on chain (061 → 106 → this), when this entity begins execute, then both 061 and 106 are in status `shipped` (how to verify: `grep 'status:' docs/build-pipeline/{phase-e-plan-2-research-and-plan-skills,plan-defect-autopilot}.md` both show shipped OR paths moved to `_archive/`)

## Clarify Resumed (2026-04-15, post-109)

**Audit delivered**: `docs/build-pipeline/_docs/plan-checker-dim-audit.md` (entity 109, shipped via direct-sweep retro-ship 2026-04-15). Resolves original 10-dim assumption with 7-unit recommendation.

**Updated scope**:
- 6 per-dim haiku agents: Dim 1 (Requirement Coverage), Dim 2 (Task Completeness), Dim 6 (Validation Sampling), Dim 7 (Cross-Entity Coherence), Dim 9 (Stale-Line-Anchor, provisional), and MERGED Dim 4+5 as "Context & Research Traceability"
- 1 synthesis-layer check: Dim 3 (wave-graph integrity) per O-1 below
- Deferred: Dim 8 (warning-only; re-audit at N=10 more entities)
- Retired: Dim 10 (task-execution Circular-AC Rule is authoritative catch per entity 106 Part A)
- **Total: 7 runtime units** (vs originally-planned 10)

**APPROACH amended**: the original 10-dim port now becomes a 7-unit port. All other APPROACH terms unchanged (per-dim haiku dispatch, thin-wrapper agents, single-tool-call block, main-session synthesis with Port 10 contradiction preservation, YAML schema frozen).

**Q-3 resolved by audit**: Dim 4 Context Compliance merges with Dim 5 Research Coverage into one "Context & Research Traceability" agent. No captain input needed -- audit citation sufficient.

**New Canonical References**:
- `docs/build-pipeline/_docs/plan-checker-dim-audit.md` -- 7-unit recommendation source
- `docs/build-pipeline/_archive/plan-checker-dim-utility-audit.md` -- entity 109 record

**Status preserved from park**: A-1 through A-6 confirmed (batch, captain 2026-04-15). O-1 through O-3 + Q-1, Q-2, Q-4, Q-5 still pending interactive resolution; Q-3 auto-resolved via audit (above).

## Assumptions

### A-1: Thin-wrapper agent format convention is rigid
- Statement: Per-dim agents follow the exact frontmatter-body shape proven across 4 existing wrappers (code-explorer, researcher, troop, ensign): frontmatter fields `name / description / tools / model: inherit / color / skills: [...]`, body = `## Boot Sequence` + `## Namespace Note` (+ optional Dispatch Boundary).
- Confidence: Confident (0.95)
- Evidence:
  - agents/code-explorer.md:1-21 (21 lines, skills preload, Boot Sequence, Namespace Note) [primary]
  - agents/researcher.md:1-21 (21 lines, same shape) [primary]
  - agents/troop.md:1-21 (21 lines, same shape) [primary]
  - agents/ensign.md:1-19 (19 lines, same shape) [primary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-2: Per-dim skill preload is the extraction unit
- Statement: Each dim's prompt lives in a standalone skill `skills/plan-checker-dim-{slug}/SKILL.md`, preloaded by the thin-wrapper agent via `skills: ["spacedock:plan-checker-dim-{slug}"]` frontmatter. Matches code-explorer/researcher pattern exactly.
- Confidence: Confident (0.90)
- Evidence:
  - 4 existing wrappers each preload a single skill via frontmatter array [primary]
  - skills/code-explorer/SKILL.md precedent: wrapper frontmatter + leaf skill pair [primary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-3: Synthesis preserves all per-dim findings (Port 10 literal)
- Statement: Main-session synthesis concatenates issues[] lists and keeps both findings when two dims flag the same task. No dedupe, no reconciliation -- duplicates are signal, per Port 10 semantics established in build-explore.
- Confidence: Confident (0.92)
- Evidence:
  - skills/build-explore/SKILL.md:233 ("contradictions are first-class outputs, never silently reconciled") [primary]
  - skills/build-explore/SKILL.md:400 (Step 6 routes inter-explorer conflicts to Core Tensions, typed) [primary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-4: Leaf dispatch rule applies to each dim agent
- Statement: Per-dim haiku subagents MUST NOT recursively dispatch (no nested Agent() or SendMessage). Each is a leaf, identical to code-explorer and plan-checker's current singleton contract.
- Confidence: Confident (0.98)
- Evidence:
  - skills/build-explore/SKILL.md:229 ("Leaf dispatch rule. spacedock:code-explorer runs as a leaf subagent") [primary]
  - skills/build-plan/SKILL.md:33 ("researchers and plan-checker you dispatch ... cannot themselves dispatch further Agent calls") [primary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-5: Single-tool-call parallel dispatch block
- Statement: All 10 per-dim Agent() calls MUST be issued in a single tool-call block for true runtime concurrency. Sequential dispatch defeats the fresh-context parallelism benefit.
- Confidence: Confident (0.94)
- Evidence:
  - skills/build-brainstorm/SKILL.md:20 (4 lens subagents in single block) [primary]
  - skills/build-explore/SKILL.md:86 (4 code-explorer angles in single block) [primary]
- → Confirmed: captain, 2026-04-15 (batch)

### A-6: YAML output schema is frozen at current field set
- Statement: Post-port plan-checker emits the same `issues[]` schema with fields `dimension / severity / description / fix_hint / task(optional)`. Build-plan Step 7 revision-loop consumer parses exact field names; any rename breaks downstream silently.
- Confidence: Confident (0.96)
- Evidence:
  - skills/build-plan/SKILL.md:307-308 ("Each issue has dimension, task, severity, description, fix_hint") [primary]
  - skills/build-plan/references/plan-checker-prompt.md:130-145 (`issues:` output template) [primary]
- → Confirmed: captain, 2026-04-15 (batch)

## Option Comparisons

### O-1: Dim 3 (wave-graph integrity) hosting strategy -- resolves Core Tension α marker

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **A: Wide-context Dim 3 agent receives full PLAN text** | Preserves "10 dims = 10 agents" symmetry; dim 3 haiku prompt owns the cross-task correlation logic in one place; synthesis stays thin | Violates fresh-context-per-dim principle for this one dim; haiku context budget may strain on large PLANs; single agent with 2x context cost vs others | M | Viable |
| **B: Move Dim 3 out of per-dim dispatch; cross-correlation runs in main-session synthesis** | Per-dim agents stay symmetric (all narrow-context); main session already has the full PLAN in context (it dispatched the others); cheapest | Synthesis layer expands from "merge results" to "also do wave-graph correlation" -- load grows; breaks the "10 agents" mental model (only 9 haikus + 1 inline step) | S | ✅ Recommended |
| C: Hybrid -- Dim 3 agent receives task-list summary only, not full PLAN | Middle ground on context budget | All downsides of (A) diluted; still violates isolation; synthesis still needs glue | M | Rejected -- worst of both |

- Evidence:
  - Angle (iv) seed 3 confirmed absent: no wide-context mode exists [primary]
  - Angle (i) unknown unknown: Dim 4 Context Compliance also reads CLAUDE.md + DECISIONS.md -- has analogous wide-context need -- see Q-3 [primary]
  - Core Tension "essential" in this entity body [primary]
- → Selected: B -- synthesis-layer correlation (captain, 2026-04-15, interactive)

### O-2: Rollout strategy -- monolithic coexistence during migration

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| A: Hard cutover (delete plan-checker-prompt.md monolithic, replace Step 6 dispatch in one commit) | Single mental model post-ship; no drift | Rollback hard; breaks if even one dim port has a bug | M | Viable |
| **B: Parallel run -- both dispatches live behind a feature flag; compare outputs for N plans before cutover** | Safe migration; pressure-test each dim vs monolithic; automatic diff catches schema drift | Temporary 2x compute cost; feature-flag machinery adds files | M | ✅ Recommended |
| C: Incremental per-dim port (Dim 1 first, Dim 2 next...) | Small PRs, easy review | Every intermediate state has "half ported" synthesis logic; mixing monolithic + per-dim output schema is awkward | L | Rejected -- intermediate states worse than either endpoint |

- Evidence:
  - tests/pressure/build-plan.yaml precedent: 106 Dim 9+10 pressure-tested before merge [secondary]
  - Angle (iv) seed 4 confirmed absent: no per-dim fixtures exist -- parallel run provides baseline for generating them [primary]
- → Selected: B -- parallel run behind feature flag; diff output N plans before cutover (captain, 2026-04-15, interactive)

### O-3: Per-dim pressure fixture file structure

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **A: Dedicated per-dim files `tests/pressure/plan-checker-dim-{slug}.yaml` (10 files)** | Each dim fixture evolves independently; grep-friendly; matches skill isolation | 10 new files; overhead in registry | S | ✅ Recommended |
| B: Single `tests/pressure/plan-checker-nuwa.yaml` with `dimension:` field tagging | One file; easy to scan all fixtures together | Large file; hard to evolve one dim's fixtures without touching others | S | Viable |
| C: Extend existing `build-plan.yaml` with new dim sections | Zero new files | Conflates plan-checker architecture tests with build-plan orchestration tests; 106 already extended this file | S | Rejected -- wrong scope |

- Evidence:
  - Angle (iv) seed 4 confirmed absent: no per-dim fixtures exist (clean greenfield) [primary]
  - MEMORY thin-wrapper-agent-pattern: per-skill artifacts live under per-skill paths (skill:agent:fixture alignment) [secondary]
- → Selected: A -- dedicated per-dim files (6 per-dim haiku fixtures + 1 plan-checker-dim-3-synthesis fixture = 7 total, matching audit 7-unit architecture) (captain, 2026-04-15, interactive)

## Open Questions

### Q-1: Dim 3 hosting -- confirm O-1 recommendation?
- Domain: Runnable (architecture of dispatch unit)
- Why it matters: The α-marker from brainstorm. O-1 proposes moving Dim 3 to synthesis layer, not porting as a per-dim haiku. This is an asymmetry in the "10 dims = 10 agents" narrative. If captain prefers the symmetric story, pick O-1-A despite context-budget risk.
- Suggested options: see O-1 above -- recommendation B (synthesis-layer correlation) [primary]
- → Answer: resolved via O-1 selection (captain, 2026-04-15, interactive)

### Q-2: Thin-wrapper line cap -- 22 or 25?
- Domain: Organizational (convention consistency)
- Why it matters: 107 APPROACH claims ≤25 lines; existing 4 wrappers are 19-21 lines; references/claude-ensign-runtime.md states "15-22 lines" cap. 107 is upward drift. Either (a) enforce 22 and accept tighter per-dim prompt (dim prompt lives in preloaded skill anyway, wrapper is still just `skills: [...]` + Boot Sequence), or (b) formally relax cap to 25 and update the reference doc.
- Suggested options:
  - Enforce 22-line cap (prompt body lives in skill, not wrapper) [primary]
  - Relax to 25 lines + update references/claude-ensign-runtime.md in same commit [secondary]
  - Open-ended -- captain decides
- → Answer: enforce 22-line cap; per-dim prompt body lives in preloaded skill (skills/plan-checker-dim-{slug}/SKILL.md), NOT inlined in wrapper. Wrapper stays minimal `skills:[...]` + Boot Sequence. APPROACH "≤25 lines" claim corrected (captain, 2026-04-15, interactive) Dim 4 (Context Compliance) has parallel wide-context need -- included in scope?
- Domain: Runnable (scope boundary)
- Why it matters: Angle (i) unknown unknown surfaced that Dim 4 reads CLAUDE.md + DECISIONS.md -- cross-entity wide context, structurally identical to Dim 3's issue. Either (a) expand O-1's solution to cover Dim 4 as well (both run in synthesis layer), (b) only special-case Dim 3 and let Dim 4 stay as a normal haiku dim accepting the context cost, (c) defer Dim 4 to a follow-up entity.
- Suggested options:
  - Expand O-1-B to cover both Dim 3 and Dim 4 in synthesis (symmetrical treatment) [primary]
  - Only Dim 3 special-cased; Dim 4 accepts wide-context haiku dispatch
  - Defer Dim 4 -- new entity post-ship
- → Answer: Dim 4 + Dim 5 merge into one "Context & Research Traceability" per-dim agent (entity 109 audit finding; audit cites 2+ shared data sources `## Clarify Output` + entity-body-context-read). Dim 8 also resolved by audit: defer. Dim 10 retired: task-execution Circular-AC Rule is authoritative catch per entity 106 Part A. (auto-resolved by audit, 2026-04-15)

### Q-4: CONTRACTS.md currently has NO row for skills/build-plan/ or plan-checker-prompt.md -- does 107 add the row?
- Domain: Organizational (workflow-index hygiene)
- Why it matters: Angle (iii) + Lens (d) both note concurrent writes to these files are unguarded by CONTRACTS. 106 just shipped without adding a row. 107 rewrites Step 6 dispatch logic -- adding a contract row now formalizes future coordination or keeps the omission consistent.
- Suggested options:
  - Add row(s) during plan stage (touches workflow-index-maintainer mod) [primary]
  - Leave CONTRACTS unchanged; rely on depends-on frontmatter alone (061 precedent) [secondary]
- → Answer: plan ensign adds CONTRACTS.md row(s) for skills/build-plan/SKILL.md + plan-checker-prompt.md + new agents/plan-checker-dim-*.md + new skills/plan-checker-dim-*/ files during plan stage; status lifecycle in-flight → final tracked via workflow-index-maintainer mod (captain, 2026-04-15, interactive)

### Q-5: Port 10 label -- ratify or rename?
- Domain: Readable (naming consistency)
- Why it matters: Angle (ii) traced "Port 10" — it appears first in entity 107 body; entities 104/105 described the contradiction-preservation behavior but never used this label. Either formalize "Port 10" (add to references/huashu-nuwa docs) or rename to the phrase 104/105 already use ("contradictions first-class outputs, never silently reconciled").
- Suggested options:
  - Formalize "Port 10" in docs/build-pipeline/_docs/ [primary]
  - Rename to "contradiction-preservation synthesis" (match 104/105 phrasing)
  - Defer naming -- leave inline per-entity descriptions
- → Answer: formalize in new `docs/build-pipeline/_docs/nuwa-ports.md` defining Port 7-11; 107 plan stage includes a task to author this doc. Future Nuwa-ify entities cite by Port number (captain, 2026-04-15, interactive)

## Core Tensions

- **essential**: Fresh-context-per-dim (load-bearing rationale for Nuwa) vs Dim 3 wave-graph integrity (needs cross-task context to detect cycles/overlap). Same tension named in brainstorm body; O-1 presents resolution options but the tension itself is irreducible -- picking any option surfaces its cost. Dim 4 duplicates the structural issue (Q-3).
- **time-based**: depends-on chain 061 ✅ shipped (retro-ship 2026-04-15) + 106 ⏳ execute-in-progress. 106 quality/review/ship likely within hours; 107 explore complete now, clarify can proceed in parallel. Plan/execute for 107 gated on 106 `shipped`.
- **domain-based**: 107 APPROACH leads with cost + parallelism (haiku×10 < opus×1), but Angle (ii) decisions + Lens (c) codebase evidence show the load-bearing benefit is fresh-context isolation (MEMORY subagent-first-for-all-stages-except-clarify). Clarify should confirm ranking so plan task prioritization matches real value.

## Honest Boundaries

- Angle (iii) sibling-entity subagent returned only a stub ("Good -- Dim 9 and 10 are already in plan-checker-prompt.md..."); sibling analysis was completed using brainstorm Lens (d) data instead. CONTRACTS.md + INDEX.md full scan for this file surface was covered in Lens (d), so no coverage gap, but Angle (iii) itself did not produce a structured return.
- Port 10 origin was traced only through git log + archive bodies, not through formal docs/ references. If "Port 10" has been formally ratified somewhere this sweep missed, Q-5 is moot.
- Thin-wrapper size-cap drift (22 → 25) was detected by code comparison, not by reading references/claude-ensign-runtime.md directly during this explore. Verify reference doc before plan commits to 22 or 25.
- Angle (i) unknown unknown about Dim 4 wide-context need is based on one observation; full Dim 4 prompt body was not read. Scope expansion in Q-3 is speculative until confirmed.
- CONTRACTS.md size (16K+) was too large for Angle (i) full read; plan-stage MUST scan it fully if Q-4 selects "add row".

## Decomposition Recommendation

Not warranted. Scale confirmed Medium (12 files: 10 new per-dim wrappers + 10 new per-dim skills + 1 build-plan/SKILL.md Step 6 rewrite + 1 plan-checker-prompt.md deprecation = ~22 files; pressure fixtures add more but per-entity count still Medium band). The three-part structure (agents + skills + synthesis rewrite) is tightly coupled -- splitting would require intermediate "half-ported" states which O-2 Option C rejected.

## Canonical References

- `skills/build-explore/SKILL.md:86-136, 229, 233, 400` -- Mode A 4-angle fanout structural template + Port 10 contradiction preservation reference implementation
- `skills/build-brainstorm/SKILL.md:20` -- 4-lens single-tool-call dispatch pattern
- `skills/build-plan/SKILL.md:295-325` -- current plan-checker dispatch site (Step 6); YAML consumer at Step 7; depends-on chain target
- `skills/build-plan/references/plan-checker-prompt.md:130-145` -- YAML output contract (frozen); dim definitions source (10 dims after 106 ships)
- `agents/code-explorer.md, agents/researcher.md, agents/troop.md, agents/ensign.md` -- thin-wrapper format template (4 consistent usages)
- `docs/build-pipeline/_archive/brainstorm-nuwa-distillation.md` (entity 104) -- Nuwa pattern adoption rationale, Mode A/B split decision (O-1)
- `docs/build-pipeline/_archive/explore-nuwa-subagent-first.md` (entity 105) -- subagent-first extension, Port 7-11 framework
- `docs/build-pipeline/_archive/flatten-dispatch-troops-architecture.md` (entity 065) -- thin-wrapper agent precedent, ensign-boundary decision
- `docs/build-pipeline/_archive/phase-e-plan-2-research-and-plan-skills.md` (entity 061) -- build-plan/SKILL.md authoring; retro-shipped 2026-04-15
- `docs/build-pipeline/plan-defect-autopilot.md` (entity 106) -- depends-on parent; Dim 9+10 source; D-plan-defect-autopilot-1 first DECISIONS.md entry
- `docs/build-pipeline/_docs/plan-checker-dim-audit.md` (entity 109 deliverable) -- 7-unit recommendation source; Dim 4+5 merge rationale; Dim 10 retire rationale
- `docs/build-pipeline/_archive/plan-checker-dim-utility-audit.md` (entity 109) -- retro-shipped audit entity record

## Stage Report: explore

- [x] Files mapped: 9 across domain, contract, config
  domain: 4 (build-brainstorm, build-explore, build-plan, build-execute skills); contract: 2 (plan-checker-prompt, parallel-explorer-angles); config: 4 (code-explorer, researcher, troop, ensign agent wrappers; DECISIONS.md)
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 through A-6 all Confident -- clean codebase precedent across 4 wrappers + 3 Nuwa-skill dispatch sites; strong pattern-consistency signal
- [x] Options surfaced: 3
  O-1 Dim 3 hosting (recommend B: synthesis-layer correlation); O-2 rollout strategy (recommend B: parallel run behind flag); O-3 fixture file structure (recommend A: per-dim files)
- [x] Questions generated: 5
  Q-1 Dim 3 hosting confirm; Q-2 thin-wrapper line cap (22 vs 25); Q-3 Dim 4 wide-context scope; Q-4 CONTRACTS.md row; Q-5 Port 10 label ratify/rename
- [x] α markers resolved: 1 / 1
  α (Dim 3 hosting strategy) from brainstorm converted to Q-1 + O-1 (2 concrete options + recommendation)
- [x] Scale assessment: Medium confirmed
  ~22 files (10 agents + 10 skills + build-plan Step 6 rewrite + plan-checker-prompt.md deprecation + pressure fixtures); fits Medium band; decomposition rejected (tightly coupled three-part structure)
- [x] Research dispatched: 0 researchers (skipped -- all assumptions internal codebase patterns, no external tech claims)
- [x] Brainstorm contradictions: 1
  APPROACH "≤25 lines per MEMORY" contradicted by observed 15-22 line pattern in 4 existing wrappers -- annotated inline; raised as Q-2
- [x] Inter-explorer contradictions: 0
  3 of 4 angles returned structured data; Angle (iii) stub-returned and was covered by brainstorm Lens (d); no findings conflict
- [x] Angle (iii) coverage gap: flagged in Honest Boundaries -- stub return replaced with brainstorm Lens (d) sibling analysis

## Stage Report: clarify

- [x] Decomposition: not-applicable -- Medium scale, tightly coupled 3-part structure
- [x] Re-validation: 6 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  explore ran earlier same session; entity 109 audit delivered fresh context via direct-sweep
- [x] Assumptions confirmed: 6 / 6 (0 corrected)
  A-1 through A-6 confirmed via batch 2026-04-15 pre-park; preserved post-resume
- [x] Options selected: 3 / 3
  O-1 Dim 3 hosting → B synthesis-layer correlation; O-2 rollout → B parallel run behind flag; O-3 fixtures → A dedicated per-dim files (7 total matching audit)
- [x] Questions answered: 5 / 5
  Q-1 via O-1; Q-2 22-line cap (prompt in skill); Q-3 auto-resolved via 109 audit (Dim 4+5 merge); Q-4 CONTRACTS row added in plan; Q-5 formalize in new docs/build-pipeline/_docs/nuwa-ports.md
- [x] Open exploration: 0 gray areas surfaced (captain selected Complete immediately)
- [x] Canonical refs added: 2
  docs/build-pipeline/_docs/plan-checker-dim-audit.md (entity 109); docs/build-pipeline/_archive/plan-checker-dim-utility-audit.md
- [x] Context status: ready
  gate passed: 6 A / 3 O / 5 Q all annotated; 7-unit architecture locked; APPROACH amended
- [x] Handoff mode: loose
  auto_advance unset -- captain must say "execute 107" in separate FO session
- [x] Clarify duration: 6 AskUserQuestion calls + 1 scope redirect (mid-session park + resume post-109)
  Session arc: pre-park batch A + 1 attempted O-1 (interrupted) → park → seed 109 → direct-sweep audit → retro-ship 109 → resume with amended APPROACH → clean O-1/O-2/O-3/Q-2/Q-4/Q-5 → Complete
- [x] Scope change during session: 10-unit → 7-unit architecture (109 audit finding)
  Dim 10 retired, Dim 8 deferred, Dim 4+5 merged; APPROACH amended; 3 Canonical Refs added
