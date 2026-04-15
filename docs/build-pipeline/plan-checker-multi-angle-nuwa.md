---
id: 107
title: Plan-Checker Multi-Angle Nuwa-ification -- Port Monolithic Prompt to Per-Dim Haiku Dispatch
status: draft
context_status: pending
source: /build
created: 2026-04-15T00:00:00Z
started:
completed:
verdict:
score:
worktree:
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

**APPROACH**: Port the current monolithic plan-checker prompt (10 dims after entity 106) into a per-dim haiku-dispatch architecture. Create 10 thin-wrapper agents at `agents/plan-checker-dim-{id}-{slug}.md` (each ≤25 lines per MEMORY thin-wrapper-agent-pattern), each preloading a single skill `skills/plan-checker-dim-{slug}` containing the extracted per-dim prompt. Rewrite `skills/build-plan/SKILL.md` Step 6 to issue all 10 `Agent(subagent_type="spacedock:plan-checker-dim-{id}-{slug}", model="haiku", ...)` calls in a single tool-call block for true parallelism. Synthesis phase in main session concatenates per-dim `issues[]` lists, preserving contradictions (Port 10) when two dims flag the same task -- both findings survive to the consumer YAML. Dim 3 (wave-graph integrity) is the essential-tension special case (needs clarification -- deferred to explore): candidate options are (a) give Dim 3 agent the full PLAN text as wide-context, (b) move wave-graph correlation out of plan-checker entirely into a main-session synthesis pass that consumes all per-task issues. YAML output schema (`dimension/severity/description/fix_hint/task`) is frozen -- build-plan Step 6 consumer at SKILL.md:307 must work unchanged.

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

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
