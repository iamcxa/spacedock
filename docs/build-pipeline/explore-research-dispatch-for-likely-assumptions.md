---
id: 075
title: "Research dispatch architecture for discuss + plan pipeline"
status: quality
context_status: ready
source: captain observation during 052 clarify session (2026-04-13)
started: 2026-04-13T10:05:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-explore-research-dispatch-for-likely-assumptions
issue:
pr:
intent: feature
scale: Large
project: spacedock
depends-on: []
---

## Problem

Two pre-clarify skills (build-brainstorm and build-explore) produce claims about external technology without validating them. Build-brainstorm commits to an APPROACH that may involve unverified technology choices (e.g., "use flock for locking"). Build-explore classifies assumptions as "Likely" (0.70-0.85) or "Unclear" (<0.70) based on codebase-only evidence, deferring external validation to the plan stage. The captain encounters under-evidenced claims during clarify, spending interactive rounds on questions that could have been pre-validated.

GSD's `gsd-phase-researcher` and `gsd-advisor-researcher` demonstrate the better pattern: dispatch parallel researcher subagents per topic BEFORE the interactive phase. By the time the captain reviews, external technology questions are already answered.

The gap was identified during entity 052 clarify (2026-04-13):
- **Brainstorm** committed to "flock for locking" — but Node.js has no native flock(). A researcher during brainstorm would have caught this before it reached explore.
- **Explore** classified A-4 (socket bind timing) and A-5 (daemon startup composition) as "Likely" with codebase-only evidence. Ad-hoc researcher dispatch mid-clarify found A-5 had a critical contradiction: Next.js standalone server.js is NOT importable, breaking the "hookable startup" assumption. This should have been caught during explore, not clarify.

## Scope

### Brainstorm-phase research (new Step 3.5)
- After APPROACH/ALTERNATIVE are drafted (Step 3), scan for external technology claims
- Dispatch criteria: APPROACH mentions a specific library, API, platform feature, or protocol that is NOT already validated by codebase usage
- Dispatch `spacedock:researcher` per claim (up to 2 concurrent)
- Researcher results either confirm the claim (proceed) or contradict it (α-mark for explore)
- Example: "use flock" → researcher finds Node.js has no native flock → α-mark the locking mechanism

### Explore-phase research (new Step 5.5)
- After hybrid classification (Step 5), scan for Likely/Unclear assumptions with external technology dependency
- Dispatch criteria: assumption involves library compatibility, API behavior, platform specifics — not pure codebase architecture
- Dispatch `spacedock:researcher` per qualifying assumption (up to 3 concurrent, parallel)
- Researcher results fold into assumption Evidence lines, potentially upgrading confidence or escalating to Open Question
- Options (Track B) involving library choice also qualify for research dispatch

### Plan-stage research deduplication (build-plan Step 1 update)
- Build-plan currently dispatches `spacedock:researcher` for ALL topics at Step 1
- With 075, brainstorm + explore already validated technology claims — plan should NOT re-research them
- Dedup mechanism: plan reads entity body for `(✓ research: {source})` annotations; skips topics already covered
- Plan-stage research narrows to implementation-specific queries only:
  - "Which specific Bun API call for X?" (concrete code pattern, not "does Bun support X?")
  - "How does library Y's API look for this use case?" (Context7/docs for code examples)
  - Integration patterns between confirmed technologies
- Result: plan focuses on what it does best — translating validated specs into biteable tasks against the codebase

### SO agent team for research (new scope, added during clarify)
- SO creates a persistent research team (TeamCreate) at the start of the discuss phase pipeline
- Team members: 2-3 researcher teammates, each a `spacedock:researcher` agent
- SO messages the team (SendMessage) with research topics during brainstorm and explore
- Team members accumulate context across the full discuss phase — second question can reference first answer
- Team lifecycle: created when SO starts, dissolved when SO hands off to FO (or session ends)
- Fallback: if TeamCreate fails (experimental gotchas), SO falls back to individual Agent dispatch
- Recovery: if team becomes phantom (compaction, terminal disconnect), SO detects via TeamCreate error and recreates

### Researcher checkpoint/continuation (distilled from GSD gsd-phase-researcher)
- If a researcher hits context limits mid-investigation, it outputs `## CHECKPOINT REACHED` with partial findings
- SO detects the checkpoint, spawns a continuation researcher with the partial state
- Prevents truncated research on deep topics (e.g., entity 052 A-5 required tracing through Next.js docs, Bun compat, GitHub discussions)
- GSD reference: `gsd-research-phase/SKILL.md` lines 156-186

### Synthesis step after parallel research return (distilled from GSD discuss-phase advisor)
- After parallel researchers return, SO runs a synthesis step BEFORE annotating the entity body
- Synthesis validates: all expected findings present, no contradictions between parallel results, findings are relevant to the assumption being validated
- If two researchers contradict each other: write contradiction as Open Question with both cited findings (same as build-plan's existing rule)
- GSD reference: `discuss-phase.md` lines 567-579

### Cross-entity research dedup via CONTRACTS.md (distilled from GSD cross-phase awareness)
- When SO starts research for entity N, check CONTRACTS.md and prior entity bodies for already-researched topics
- If entity 051 already researched "Bun unix socket compatibility", entity 052 should not re-research it — reference 051's findings
- Mechanism: SO greps CONTRACTS.md + sibling entity `(✓ research: ...)` annotations before dispatching
- GSD does NOT have this (each phase researches independently) — this is spacedock improving on GSD's weakness

### Design principle: cross-phase skepticism (distilled from GSD, captain direction 2026-04-13)
- Every researcher dispatch should not only validate unknowns but also RE-VALIDATE prior phase conclusions
- Brainstorm researcher: validate APPROACH tech claims (NEW unknowns) + verify design doc claims still hold (PRIOR conclusions)
- Explore researcher: validate Likely assumptions (NEW) + challenge brainstorm annotations marked `(✓ confirmed by explore: ...)` — did explore's surface-level grep miss something deeper? (PRIOR conclusions)
- This is the spirit of GSD's cross-phase skepticism: "task completion ≠ goal achievement" — each phase is a skeptic of the previous phase, not a consumer
- Implementation details (regression gate, goal-backward verify) are in a separate entity (077)

### Shared infrastructure
- Use existing `spacedock:researcher` agent (same as build-plan uses)
- Add "research evidence" annotation format to `references/output-format.md`: `(✓ research: {source} -- {finding})`
- Update `references/hybrid-classification-heuristic.md` with research-upgrade path
- Research depth scaling (captain decision, 2026-04-13):
  - SKIP all research: ALL assumptions Confident ≥0.95 AND no external tech claims AND Small scale
  - Lightweight (1 researcher, targeted): assumptions 0.85-0.94 Confident
  - Standard (1-2 researchers, parallel): assumptions 0.70-0.84 Likely
  - Deep (2-3 researchers, parallel + continuation): assumptions <0.70 Unclear
  - Rationale: research includes INTERNAL deep codebase tracing (not just WebSearch) — explore's surface-level grep is not sufficient validation. Skipping research = skipping deep validation, so threshold must be high.
- Research results are persisted in entity body — downstream stages consume them, never re-dispatch

## Acceptance Criteria

- [ ] Given a brainstorm APPROACH that mentions an external API (e.g., "flock"), when brainstorm runs Step 3.5, then a researcher validates the claim and α-marks contradictions
- [ ] Given an assumption classified as Likely with external technology dependency, when explore runs Step 5.5, then a researcher agent is dispatched for that topic
- [ ] Given researcher results that confirm the assumption, when explore writes the entity body, then the assumption shows upgraded confidence with `(✓ research: ...)` annotation
- [ ] Given researcher results that contradict the assumption, when explore writes the entity body, then the assumption is reclassified or escalated to Open Question
- [ ] Given 3+ qualifying topics across brainstorm + explore, when researchers are dispatched, then they run in parallel (not sequential)
- [ ] Given a Small entity with all Confident assumptions and no external API claims, when brainstorm/explore run, then no researchers are dispatched (no unnecessary cost)
- [ ] Given an entity that completed explore with research annotations, when build-plan runs Step 1, then it skips re-researching already-validated topics
- [ ] Given a plan task that needs implementation-specific API patterns, when build-plan runs Step 1, then it dispatches a targeted researcher for that narrow topic only
- [ ] Given SO starts a multi-entity discuss pipeline, when the first entity enters brainstorm, then SO creates a research team (TeamCreate) that persists across entities
- [ ] Given a research team exists, when SO needs topic validation, then SO messages the team (SendMessage) instead of dispatching fresh Agent calls
- [ ] Given a researcher outputs `## CHECKPOINT REACHED`, when SO detects the checkpoint, then it spawns a continuation researcher with the partial findings as input
- [ ] Given parallel researchers return results, when SO runs synthesis, then it validates consistency across findings before annotating the entity body
- [ ] Given two parallel researchers return contradictory findings, when SO synthesizes, then both findings are written as an Open Question (not silently resolved)
- [ ] Given entity 051 already researched "Bun unix socket", when entity 052 enters explore with a related assumption, then SO references 051's findings instead of re-dispatching

## Directive

> Add research dispatch to the pre-clarify pipeline stages (build-brainstorm and build-explore) so that external technology claims are validated before the captain sees them in clarify. Also add dedup logic to build-plan so it skips topics already researched by earlier stages. The researcher agent (`spacedock:researcher`) already exists with WebSearch/WebFetch/Context7 tools — this entity wires it into brainstorm and explore, not just plan.

## Captain Context Snapshot

- **Repo**: main @ 4453974
- **Session**: SO pipeline session. Entity 052 (daemon lifecycle) just completed clarify. This entity was born from captain feedback during 052 clarify — the captain identified that Likely/Unclear assumptions waste clarify rounds when they could be pre-validated.
- **Domain**: Readable/Textual, Runnable/Invokable, Organizational/Data-transforming
- **Related entities**: 052 -- L2 daemon lifecycle (clarify/ready, the incident that surfaced this gap), 076 -- Clarify open exploration loop (draft, related UX improvement)
- **Created**: 2026-04-13T09:00:00+08:00

## Brainstorming Spec

**APPROACH**: Add research dispatch steps to three existing skills, reusing the existing `spacedock:researcher` agent (agents/researcher.md) unchanged (✓ confirmed by explore: agents/researcher.md fully defined, used successfully by 050 plan + 052 ad-hoc). **(1) build-brainstorm Step 3.5**: after APPROACH/ALTERNATIVE are drafted, scan for external technology claims (⚠ brainstorm is a leaf skill with NO Agent tool -- see O-1 for dispatch ownership). Dispatch up to 2 researchers in parallel. Results either confirm the claim (annotate inline) or contradict it (α-mark for explore to pick up). **(2) build-explore Step 5.5**: after hybrid classification (Step 5), scan for Likely/Unclear assumptions where the gray area involves external technology. Dispatch up to 3 researchers in parallel. Results fold into Evidence lines — confirmed findings upgrade confidence, contradictions escalate to Open Question or reclassify to Track B/C. **(3) build-plan Step 1/2 dedup**: plan reads entity body for `(✓ research: {source} -- {finding})` annotations. Topics already covered are skipped. Plan-stage research narrows to implementation-specific patterns (concrete API call shapes, integration code examples via Context7). **Dispatch mode**: in SO-direct mode, SO has Agent tool and dispatches researchers directly. In ensign mode (FO pipeline), the ensign does NOT have Agent — FO must pre-dispatch researchers before invoking the ensign, same pattern as code-explorer Mode A. The dispatch ownership split already documented in `SO-FO-DISPATCH-SPLIT.md` applies.

**ALTERNATIVE**: Keep research exclusively in build-plan (current design). Clarify absorbs the cost of under-evidenced assumptions via captain interaction. -- D-01 Rejected: entity 052 proved the cost is real — A-5 "hookable startup" assumption survived brainstorm and explore unchallenged, required 3 clarify rounds + ad-hoc researcher dispatch to resolve what a single explore-phase researcher would have caught in 60 seconds. The captain's time is the scarcest resource in the pipeline; pre-validation reduces it.

**GUARDRAILS**:
- Researcher agent (`spacedock:researcher`, agents/researcher.md) is unchanged — same skill, same tools (Read/Grep/Glob/WebSearch/WebFetch), same output format (5-domain finding)
- Dispatch mode follows existing SO-FO split: SO-direct = Agent dispatch, ensign = FO pre-dispatch
- Research caps: max 2 per brainstorm, max 3 per explore (total max 5 across discuss phase, matching plan's existing cap)
- Cost guard: skip research entirely for entities where all assumptions are Confident AND APPROACH mentions no unvalidated external technology
- Annotation format must be grep-compatible: `(✓ research: {source} -- {finding})` using double-dash, no em-dash
- build-plan's existing researcher dispatch (Step 1/2) is modified, not replaced — plan still dispatches for implementation-specific topics

**RATIONALE**: The researcher agent already exists and works well (proven by entity 050 plan stage and entity 052 ad-hoc dispatch). The only missing piece is wiring it into brainstorm and explore — two new steps in existing skills, plus a dedup check in plan. The evidence from entity 052 is concrete: A-4 went from Likely (0.75) to Confident (0.90) with 60 seconds of research; A-5 was outright contradicted, saving what would have been an incorrect plan task. The total cost of 2-5 researcher dispatches (~60-240 seconds latency, ~$0.10-0.50 in API cost) is trivially justified by even one saved clarify round (~$2-5 in captain time + API cost for the interactive loop).

## Assumptions

A-1: The `spacedock:researcher` agent is reused unchanged. Same agents/researcher.md, same tools (Read/Grep/Glob/WebSearch/WebFetch), same skill (spacedock:build-research), same 5-domain finding output format.
Confidence: Confident (0.95)
Evidence: agents/researcher.md:1-21 -- fully defined agent. Entity 052 ad-hoc dispatch and entity 050 plan dispatch both used this exact agent successfully with no modifications.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Research results are persisted in the entity body, not in external state files. Downstream stages consume results from entity file annotations. "Entity body IS the checkpoint" (build-clarify rule).
Confidence: Confident (0.90)
Evidence: build-plan SKILL.md:90-96 -- plan reads `## Research Findings` from entity body. build-clarify SKILL.md rules section -- "Entity body IS the checkpoint. Do not write external state files."
→ Confirmed: captain, 2026-04-13 (batch)

A-3: The SO-FO dispatch split applies to research dispatch: SO-direct mode uses Agent tool directly, ensign mode requires FO pre-dispatch. Same pattern as code-explorer Mode A/B.
Confidence: Confident (0.90)
Evidence: SO-FO-DISPATCH-SPLIT.md:14-16 -- brainstorm and explore are SO-owned with Agent tool. build-explore SKILL.md Step 2 already implements Mode A (Agent dispatch) vs Mode B (inline fallback).
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Build-plan's existing research dispatch (Steps 1-2) can be made dedup-aware by reading entity body for research annotations. No structural change needed -- just an "if already researched, skip" guard per topic.
Confidence: Confident (0.85)
Evidence: build-plan SKILL.md:82 -- Step 1 extracts research topics. Adding a dedup check against `(✓ research: ...)` annotations is a conditional at the start of each topic extraction.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: The annotation format `(✓ research: {source} -- {finding})` is consistent with existing annotation conventions and grep-compatible.
Confidence: Confident (0.90)
Evidence: build-explore uses `(✓ confirmed by explore: ...)` and `(⚠ contradicted: ...)`. Same parenthetical pattern, same double-dash separator. Grep: `grep '✓ research:' entity.md` works.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Where does brainstorm-phase research dispatch live?

Build-brainstorm is explicitly a "leaf skill" with NO Agent tool (SKILL.md:248-249). The APPROACH says "Step 3.5 inside brainstorm" but brainstorm cannot dispatch researchers. Build-explore already has Agent tool (Mode A). Where should brainstorm research dispatch happen?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| SO orchestrates (between skills) | Brainstorm stays leaf; follows existing SO agent orchestration pattern; SO already runs brainstorm→explore→clarify in sequence; adding "dispatch researchers on brainstorm output" is a new SO Boot Sequence step | Research dispatch is implicit (not in skill contract); SO agent.md gets more complex; new orchestration step to maintain | Low | Recommended |
| Inside brainstorm (add Agent tool) | Self-contained; skill controls when research happens; no orchestrator changes | Breaks brainstorm's "leaf skill, no Agent" contract; ensign mode still can't dispatch; inconsistent with "non-interactive" design principle | Medium | Not recommended |
| Hybrid: SO for brainstorm, inside-skill for explore | Least change to brainstorm's leaf contract; explore already handles Mode A Agent dispatch naturally; each skill keeps its existing tool contract | Two different dispatch patterns for the same concern; harder to document and maintain | Low | Viable |

→ Selected: SO orchestrates (between skills) (captain, 2026-04-13, interactive)

### O-2: What triggers research during brainstorm output review?

When SO reviews brainstorm output before running explore, how does it decide which technology claims need research?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| SO heuristic scan (grep APPROACH for library/API names, cross-reference with codebase grep) | Simple; SO already reads entity body; no new sections needed; aligns with explore's existing "scan for α markers" pattern | Heuristic may miss implicit claims; depends on SO's judgment | Low | Recommended |
| Brainstorm adds `## Research Candidates` section | Explicit signal from brainstorm; SO just reads the list; brainstorm is better positioned to identify its own uncertain claims | New section format to define; brainstorm must self-assess uncertainty (may not be reliable for a non-interactive skill) | Low | Viable |
| Always dispatch single "tech claim validator" on full APPROACH | Zero heuristic logic needed; researcher decides what to check | Wastes a dispatch on simple entities with no external claims; researcher may not know what brainstorm considers uncertain | Low | Not recommended |

→ Selected: SO heuristic scan (captain, 2026-04-13, interactive)

### O-3: Research dispatch mechanism -- individual Agent dispatch vs persistent agent team

SO currently dispatches researchers as individual Agent calls (fresh context each time). Agent teams (TeamCreate + SendMessage) would let researchers persist across the full discuss phase, accumulating context. Which mechanism should SO use?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Persistent agent team (TeamCreate at SO session start) | Context accumulates: 2nd research query references 1st findings; faster subsequent dispatches (no cold start); natural for multi-entity SO pipeline sessions | Experimental: phantom teams, compaction state loss, Warp terminal gotcha (MEMORY.md); team lifecycle must be managed; if team dies mid-session, recovery needed | Medium | |
| Individual Agent dispatch (current ad-hoc pattern) | Simple; fresh context avoids pollution; each dispatch is independent and debuggable; no team lifecycle to manage | No context accumulation; each researcher starts from zero; slightly higher latency per dispatch | Low | |
| Hybrid: team for multi-entity sessions, individual for single-entity | Best of both: team benefits for pipeline runs, simplicity for one-off clarify; SO detects session type at boot | Two code paths; SO must decide at session start which mode; more complex orchestration | Medium | Recommended |

→ Selected: Other -- Agent teams by default when TeamCreate is available; fallback to individual Agent dispatch when teams are unavailable (experimental gotchas, terminal incompatibility) or scope is trivially small/simple. Not a session-type detection — always attempt team first, graceful degradation. (captain, 2026-04-13, interactive)

## Open Questions

Q-1: Should the explore-phase research (Step 5.5) use the same `## Research Findings` section format as build-plan, or a different annotation format?

Domain: Readable/Textual

Why it matters: Build-plan currently writes a `## Research Findings` section with 5 subsections (Upstream Constraints / Existing Patterns / Library/API Surface / Known Gotchas / Reference Examples). If explore uses the same format, plan can seamlessly consume it. But explore's research is targeted (per-assumption validation, not broad topic survey) — the 5-subsection format may be overkill. A lighter inline annotation `(✓ research: {source} -- {finding})` on each assumption's Evidence line is more natural for explore's per-item approach.

Suggested options: (a) Inline annotation on Evidence lines -- `(✓ research: {source} -- {finding})` appended to the assumption. Lightweight, grep-compatible, naturally consumed by clarify. (b) Separate `## Research Findings` section same as plan format -- 5 subsections per topic. Heavy but consistent across stages. (c) Hybrid -- inline annotation for confirmed findings, `## Research Findings` section for contradictions (which need the full 5-domain treatment to explain the conflict).

→ Answer: Hybrid -- inline annotation for confirmed findings, full Research Findings section for contradictions. Confirmed assumptions get `(✓ research: {source} -- {finding})` on their Evidence line. Contradicted assumptions get a `## Research Findings` subsection with the 5-domain treatment so the conflict context is preserved for clarify. (captain, 2026-04-13, interactive)

## References

- GSD `gsd-phase-researcher` skill: dispatches parallel researchers before planning
- GSD `gsd-advisor-researcher` skill: researches gray area decisions during discuss phase
- `spacedock:researcher` agent (agents/researcher.md): existing research agent, tools: Read/Grep/Glob/WebSearch/WebFetch, skill: spacedock:build-research
- `skills/build-research/SKILL.md`: the researcher's operating contract (5-domain finding format)
- Entity 052 clarify session (2026-04-13): the incident that surfaced both brainstorm and explore gaps
- Entity 052 A-4 research: socket bind timing validated (Likely→Confident) by ad-hoc researcher
- Entity 052 A-5 research: daemon composition CONTRADICTED (Next.js standalone not importable) by ad-hoc researcher
- `skills/build-brainstorm/SKILL.md` Step 3: where brainstorm research (Step 3.5) would be inserted
- `skills/build-explore/SKILL.md` Step 5: where explore research (Step 5.5) would be inserted
- `skills/build-plan/SKILL.md` Step 1-2: current research dispatch + synthesis that becomes dedup-aware
- `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md`: dispatch ownership model (SO vs FO vs ensign)
- `skills/build-explore/references/hybrid-classification-heuristic.md`: confidence thresholds for research trigger

## Stage Report: explore

- [x] Files mapped: 7 across contract, config
  contract: 5 (build-brainstorm SKILL.md, build-explore SKILL.md, build-plan SKILL.md, SO-FO-DISPATCH-SPLIT.md, agents/researcher.md), config: 2 (build-brainstorm tools section, build-explore Mode A/B)
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 researcher reused unchanged; A-2 entity body persistence; A-3 SO-FO split applies; A-4 plan dedup feasible; A-5 annotation format consistent
- [x] Options surfaced: 2
  O-1 brainstorm research dispatch ownership (SO orchestrates vs inside-skill vs hybrid); O-2 brainstorm research trigger mechanism (SO heuristic vs Research Candidates section vs full-APPROACH validator)
- [x] Questions generated: 1
  Q-1 explore research output format (inline annotation vs Research Findings section vs hybrid)
- [x] α markers resolved: 0 / 0
  no α markers in brainstorm
- [x] Scale assessment: confirmed Medium
  touches 3 skill SKILL.md files + 2 reference docs + SO agent.md + SO-FO-DISPATCH-SPLIT.md = 7-8 files

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Medium scope, no children proposed
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 all confirmed batch; all Confident, no corrections needed
- [x] Options selected: 3 / 3
  O-1 SO orchestrates between skills (recommended); O-2 SO heuristic scan (recommended); O-3 agent teams by default, subagent fallback for unavailable/trivially small (captain custom)
- [x] Questions answered: 1 / 1 (0 deferred)
  Q-1 hybrid format -- inline annotation for confirms, Research Findings section for contradictions
- [x] Canonical refs added: 0
  no external docs cited by captain during clarify
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  captain must say "execute 075" or launch FO in separate session
- [x] Clarify duration: 5 questions asked, session complete
  1 batch assumption + 3 option AskUserQuestion (O-1, O-2, O-3) + 1 Q-1 AskUserQuestion. Captain also surfaced agent team scope expansion mid-clarify (O-3 added during session).
