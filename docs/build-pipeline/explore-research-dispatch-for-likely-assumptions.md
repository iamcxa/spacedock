---
id: 075
title: "Research dispatch architecture for discuss + plan pipeline"
status: draft
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

## References

- GSD `gsd-phase-researcher` skill: dispatches parallel researchers before planning
- GSD `gsd-advisor-researcher` skill: researches gray area decisions during discuss phase
- `spacedock:researcher` agent: existing research agent used by build-plan
- Entity 052 clarify session (2026-04-13): the incident that surfaced both brainstorm and explore gaps
- Entity 052 A-4 research: socket bind timing validated (Likely → Confident) by ad-hoc researcher
- Entity 052 A-5 research: daemon composition CONTRADICTED (Next.js standalone not importable) by ad-hoc researcher
- `skills/build-brainstorm/SKILL.md` Step 3: where brainstorm research dispatch would be added
- `skills/build-explore/SKILL.md` Step 5: hybrid classification where explore research dispatch would be added
- `skills/build-explore/references/hybrid-classification-heuristic.md`: confidence thresholds
- `skills/build-plan/SKILL.md` Step 1: current research dispatch that becomes dedup-aware
- Entity 052 research proves the pattern: A-4 validated (Likely→Confident), A-5 contradicted (Next.js standalone not importable) — both would have saved clarify rounds if caught earlier
