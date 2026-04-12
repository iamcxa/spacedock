---
id: 075
title: "Explore research dispatch for Likely/Unclear assumptions"
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

Build-explore currently has a codebase-only tool surface (Read/Grep/Glob/Bash). When it classifies assumptions as "Likely" (0.70-0.85) or "Unclear" (<0.70), it defers external validation to the plan stage (`spacedock:researcher` dispatched by `build-plan`). This means the captain encounters under-evidenced assumptions during clarify, spending interactive rounds on questions that could have been pre-validated.

GSD's `gsd-phase-researcher` demonstrates the better pattern: dispatch parallel researcher subagents per topic BEFORE the interactive phase. By the time the captain reviews assumptions, external technology questions (library compatibility, API behavior, platform specifics) are already answered.

The gap was identified during entity 052 clarify: assumptions A-4 (Bun socket bind timing) and A-5 (daemon startup composition) were both "Likely" with codebase-only evidence. The Science Officer had to dispatch ad-hoc researchers mid-clarify to strengthen them -- this should have been build-explore's job.

## Scope

- Add optional researcher dispatch to build-explore Step 5 (after hybrid classification)
- Dispatch criteria: assumption is Likely or Unclear AND the gray area involves external technology (not pure codebase architecture)
- Use `spacedock:researcher` agent (same as build-plan uses) for each qualifying topic
- Parallel dispatch (one agent per topic, up to 3 concurrent)
- Researcher results fold into assumption Evidence lines, potentially upgrading confidence
- Update `references/hybrid-classification-heuristic.md` to document the research-upgrade path
- Consider: should Options (Track B) also get research dispatch when they involve library choice?

## Acceptance Criteria

- [ ] Given an assumption classified as Likely with external technology dependency, when explore runs Step 5, then a researcher agent is dispatched for that topic
- [ ] Given researcher results that confirm the assumption, when explore writes the entity body, then the assumption shows upgraded confidence with research evidence
- [ ] Given researcher results that contradict the assumption, when explore writes the entity body, then the assumption is reclassified or escalated to Open Question
- [ ] Given 3+ Likely assumptions, when explore dispatches researchers, then they run in parallel (not sequential)
- [ ] Given a Small entity with all Confident assumptions, when explore runs, then no researchers are dispatched (no unnecessary cost)

## References

- GSD `gsd-phase-researcher` skill: dispatches parallel researchers before planning
- GSD `gsd-advisor-researcher` skill: researches gray area decisions during discuss phase
- `spacedock:researcher` agent: existing research agent used by build-plan
- Entity 052 clarify session (2026-04-13): the incident that surfaced this gap
- `skills/build-explore/SKILL.md` Step 5: hybrid classification where research dispatch would be added
- `skills/build-explore/references/hybrid-classification-heuristic.md`: confidence thresholds
