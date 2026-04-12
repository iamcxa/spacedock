---
id: 075
title: "Research dispatch architecture for discuss + plan pipeline"
status: draft
context_status: pending
source: captain observation during 052 clarify session (2026-04-13)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
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

### Shared infrastructure
- Use existing `spacedock:researcher` agent (same as build-plan uses)
- Add "research evidence" annotation format to `references/output-format.md`: `(✓ research: {source} -- {finding})`
- Update `references/hybrid-classification-heuristic.md` with research-upgrade path
- Cost guard: skip research for Small entities with all-Confident assumptions and no external API claims
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

## Directive

> Add research dispatch to the pre-clarify pipeline stages (build-brainstorm and build-explore) so that external technology claims are validated before the captain sees them in clarify. Also add dedup logic to build-plan so it skips topics already researched by earlier stages. The researcher agent (`spacedock:researcher`) already exists with WebSearch/WebFetch/Context7 tools — this entity wires it into brainstorm and explore, not just plan.

## Captain Context Snapshot

- **Repo**: main @ 4453974
- **Session**: SO pipeline session. Entity 052 (daemon lifecycle) just completed clarify. This entity was born from captain feedback during 052 clarify — the captain identified that Likely/Unclear assumptions waste clarify rounds when they could be pre-validated.
- **Domain**: Readable/Textual, Runnable/Invokable, Organizational/Data-transforming
- **Related entities**: 052 -- L2 daemon lifecycle (clarify/ready, the incident that surfaced this gap), 076 -- Clarify open exploration loop (draft, related UX improvement)
- **Created**: 2026-04-13T09:00:00+08:00

## Brainstorming Spec

**APPROACH**: Add research dispatch steps to three existing skills, reusing the existing `spacedock:researcher` agent (agents/researcher.md) unchanged. **(1) build-brainstorm Step 3.5**: after APPROACH/ALTERNATIVE are drafted, scan for external technology claims (library names, API calls, platform features not validated by codebase grep hits). Dispatch up to 2 researchers in parallel. Results either confirm the claim (annotate inline) or contradict it (α-mark for explore to pick up). **(2) build-explore Step 5.5**: after hybrid classification (Step 5), scan for Likely/Unclear assumptions where the gray area involves external technology. Dispatch up to 3 researchers in parallel. Results fold into Evidence lines — confirmed findings upgrade confidence, contradictions escalate to Open Question or reclassify to Track B/C. **(3) build-plan Step 1/2 dedup**: plan reads entity body for `(✓ research: {source} -- {finding})` annotations. Topics already covered are skipped. Plan-stage research narrows to implementation-specific patterns (concrete API call shapes, integration code examples via Context7). **Dispatch mode**: in SO-direct mode, SO has Agent tool and dispatches researchers directly. In ensign mode (FO pipeline), the ensign does NOT have Agent — FO must pre-dispatch researchers before invoking the ensign, same pattern as code-explorer Mode A. The dispatch ownership split already documented in `SO-FO-DISPATCH-SPLIT.md` applies.

**ALTERNATIVE**: Keep research exclusively in build-plan (current design). Clarify absorbs the cost of under-evidenced assumptions via captain interaction. -- D-01 Rejected: entity 052 proved the cost is real — A-5 "hookable startup" assumption survived brainstorm and explore unchallenged, required 3 clarify rounds + ad-hoc researcher dispatch to resolve what a single explore-phase researcher would have caught in 60 seconds. The captain's time is the scarcest resource in the pipeline; pre-validation reduces it.

**GUARDRAILS**:
- Researcher agent (`spacedock:researcher`, agents/researcher.md) is unchanged — same skill, same tools (Read/Grep/Glob/WebSearch/WebFetch), same output format (5-domain finding)
- Dispatch mode follows existing SO-FO split: SO-direct = Agent dispatch, ensign = FO pre-dispatch
- Research caps: max 2 per brainstorm, max 3 per explore (total max 5 across discuss phase, matching plan's existing cap)
- Cost guard: skip research entirely for entities where all assumptions are Confident AND APPROACH mentions no unvalidated external technology
- Annotation format must be grep-compatible: `(✓ research: {source} -- {finding})` using double-dash, no em-dash
- build-plan's existing researcher dispatch (Step 1/2) is modified, not replaced — plan still dispatches for implementation-specific topics

**RATIONALE**: The researcher agent already exists and works well (proven by entity 050 plan stage and entity 052 ad-hoc dispatch). The only missing piece is wiring it into brainstorm and explore — two new steps in existing skills, plus a dedup check in plan. The evidence from entity 052 is concrete: A-4 went from Likely (0.75) to Confident (0.90) with 60 seconds of research; A-5 was outright contradicted, saving what would have been an incorrect plan task. The total cost of 2-5 researcher dispatches (~60-240 seconds latency, ~$0.10-0.50 in API cost) is trivially justified by even one saved clarify round (~$2-5 in captain time + API cost for the interactive loop).

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
