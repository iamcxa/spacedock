---
id: 071
title: Build-Explore Domain-Aware Gray Area Generation
status: draft
context_status:
source: build-distill
created: 2026-04-12
intent: feature
scale: Small
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

Enhance `build-explore`'s gray area identification (Step 4) to derive entity-directive-specific gray areas from the entity's goal before applying fixed domain templates.

Currently build-explore applies the same domain templates for every entity in a given domain class -- the same "Behavioral/Callable" template fires for any callable feature regardless of what that feature specifically does. GSD's `discuss-phase` generates phase-specific gray areas by asking "what decisions for THIS phase specifically would change the outcome?" -- the output differs between "authentication API" and "notification API" even though both are Behavioral/Callable.

### What Changes

**Step 4 enhancement**: Before loading `references/gray-area-templates.md`, build-explore reads the `## Directive` and `## Brainstorming Spec` APPROACH paragraph and extracts 2-3 directive-specific gray areas:

1. Read the directive for the specific goal, named constraints, and explicit design choices
2. For each named entity, system, or behavior in the APPROACH that is not a generic pattern (e.g., "SQLite persistence" is generic; "compare against Superpowers:TDD" is specific), generate a corresponding gray area
3. Annotate these as "directive-derived" in the entity body so they are distinguishable from template-derived gray areas

**Deduplication**: Directive-derived gray areas are deduplicated against template-derived ones before Hybrid Classification. If a directive-derived area is already covered by a template, the template version is used (it has richer guidance). Directive-derived areas are additive only.

**Stage Report addition**: The Stage Report: explore records how many gray areas were directive-derived vs template-derived:
```
- [x] Directive-derived gray areas: 2 (deduped against templates: 0 new, 2 additive)
```

### Why This Matters

Gap score: 0.75 (High) from comparison `gsd-discuss-assumptions-vs-build-explore.md`. The evidence:
- `~/.claude/get-shit-done/workflows/discuss-phase.md:76-99` -- "Understand the domain" step generating phase-specific gray areas; "Don't use generic category labels. Generate specific gray areas."
- `skills/build-explore/SKILL.md:145-148` -- "Apply the domain-specific template(s) matching the entity's domain(s)" -- same templates every time

Captain pain point (entity 067 exemplar): SO initially generated generic gray areas for the TDD discipline entity. Captain corrected framing by pointing back to Superpowers TDD. A directive-derived read of "Distill superpowers:test-driven-development into build pipeline" would have generated "compare TDD cycle model against build-plan task schema" as a specific gray area rather than a generic "behavioral pattern" from the template.

### Constraints

- Directive-derived gray areas supplement templates; they do NOT replace the template step
- Cap at 3 directive-derived gray areas per entity -- prevents over-generation from verbose directives
- If the directive is generic (no specific named systems or behaviors), skip directive derivation and note in Stage Report: "Directive is generic -- no directive-specific gray areas identified"
- The enhancement is in build-explore Step 4 only; Steps 1-3 and 5-7 are unchanged

## Captain Context Snapshot

- **Comparison report**: `docs/build-pipeline/_docs/distillations/gsd-discuss-assumptions-vs-build-explore.md`
- **Source skill**: `~/.claude/get-shit-done/workflows/discuss-phase.md` (gray_area_identification section)
- **Gap dimension**: Context Strategy (0.75)
- **Gap score**: 0.75 (High) -- second-highest non-roadmap gap in GSD first pass
- **Distillation run**: Entity 068, build-distill Wave 2 task-7
- **Evidence of captain pain**: Entity 067 session -- generic gray areas generated initially; captain corrected framing to "compare against Superpowers:TDD" (a directive-specific gray area)
- **Scale note**: Small -- changes are confined to build-explore Step 4 (10-15 lines of SKILL.md + possibly gray-area-templates.md reference update)

## Acceptance Criteria

- Build-explore Stage Report: explore includes a "Directive-derived gray areas" metric line for entities with specific named systems/behaviors in their directive (how to verify: `grep "Directive-derived\|directive-derived" {entity-stage-report}` returns a match)
- For an entity whose directive names a specific external skill or system (e.g., "Distill X into Y"), at least one Assumption or Open Question in the explore output references that specific system by name (how to verify: read entity body after explore; confirm the named external system appears in A-n or Q-n)
- For an entity with a generic directive (e.g., "Add pagination to the feed"), the Stage Report notes "no directive-specific gray areas" and template-only gray areas are used (how to verify: `grep "no directive-specific\|generic" {entity-stage-report}` returns a match)
- Deduplication works: if a directive-derived gray area duplicates a template-derived one, the Stage Report notes the dedup count (how to verify: `grep "deduped" {entity-stage-report}` returns a match when a dedup occurred)
