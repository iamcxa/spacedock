---
id: 102
title: Brainstorm Dual-Lens + Cross-Entity Dedup
status: draft
context_status: pending
source: /build
created: 2026-04-14T14:09:45Z
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

> brainstorm dual-lens cross-entity dedup

## Captain Context Snapshot

- **Repo**: main @ b9c78ab
- **Session**: Phase E Plan 4 shipped (entity 062 dogfood via PR #28, archived 096 + 093); captain iterating on build-pipeline quality-uplift work.
- **Domain**: Runnable/Invokable (skill behavior), Readable/Textual (entity body sections, INDEX.md), Organizational (cross-entity similarity query)
- **Related entities**:
  - `036 — Pipeline Brainstorm + Profiles — Integration & E2E` (shipped)
  - `build-explore-domain-aware-gray-areas` (active) — source of the contradiction-annotation pattern this directive generalizes
  - `_index/INDEX.md` — existing machine-generated cross-entity index (dedup substrate)
  - `stage-report-evidence-and-confidence` (active) — sibling quality-uplift work
  - `clarify-pre-presentation-evidence-gate` (active) — sibling quality-uplift
- **Created**: 2026-04-14T14:09:45Z

## Brainstorming Spec

**APPROACH**: Enhance `skills/build-brainstorm/SKILL.md` with two orthogonal mechanisms invoked before Step 7 output: (1) **Dual-lens APPROACH distillation** — produce the APPROACH paragraph through two lenses: a *captain-intent lens* (what the directive literally asks + why) and a *codebase-reality lens* (what prevailing patterns / constraints / prior-decision evidence exist). If the two lenses diverge on a load-bearing fact, emit a seeded Open Question with the `⚠ contradicted: {evidence}` convention already in use in build-explore. Record both lens paragraphs in the output (not just the reconciled one) so build-explore/clarify can audit the reasoning. (2) **Cross-entity dedup check** — before returning output, read `_index/INDEX.md` plus active entity titles, compute lightweight similarity against the incoming directive (title tokens + first-sentence overlap + domain tag intersection), and emit a `**Dedup flag:** ⚠️ overlaps {id} ({title}) — consider {merge|link|refine}` line in Captain Context Snapshot when any active entity exceeds the similarity threshold. Both mechanisms produce text-only output into existing entity sections; neither introduces new frontmatter fields, new primitives, or AskUserQuestion calls.

**ALTERNATIVE**: Ship dedup as a separate `/build-dedup` skill (or a pre-`/build` precheck hook), and leave brainstorm single-lens with lens-divergence deferred entirely to build-explore's contradiction pass -- D-01 rejected because (a) splitting dedup into a separate command forces the captain to remember a second step precisely when attention is focused on the new directive, and (b) deferring dual-lens to explore discards the cheapest opportunity to catch intent-vs-codebase drift -- the directive is already being parsed for domain classification, so a second lens run adds marginal cost but catches errors one pipeline stage earlier.

**GUARDRAILS**:
- Engine-freeze: no new entity frontmatter fields, no new pipeline primitives -- both mechanisms emit into existing sections (`## Captain Context Snapshot`, `## Open Questions`) as markdown text.
- Preserve the non-interactive contract: `build-brainstorm` still must NOT call AskUserQuestion. Dedup + dual-lens outputs are either informational lines or α markers that downstream stages resolve.
- Respect the "read at most 5 files for context enrichment" rule already in `SKILL.md`. Dedup query uses `_index/INDEX.md` (one file) plus fallback grep; dual-lens codebase-reality pass must cite ≤4 files.
- Dedup similarity must be deterministic (pure text analysis -- no LLM-scored embedding) so repeated runs on the same directive produce the same flag set.
- `/build` flow continues to report and commit; dedup flag does NOT block entity creation -- it informs the captain at the "Next steps" report so they can supersede/link manually.

**RATIONALE**: Dual-lens and cross-entity-dedup are sibling mitigations for the same failure mode -- brainstorm silently committing to a plausible-but-wrong spec. Dual-lens catches *intra-entity* intent-vs-reality drift (the captain's words vs what the codebase actually supports); dedup catches *inter-entity* new-vs-existing corpus drift (this directive reinventing work already planned or shipped). The two checks share machinery (directive tokenization, domain tags, `_index/INDEX.md` read) and share a failure signature (silent commit), so bundling them into one brainstorm-stage enhancement lets a single plan exercise both and keeps the quality-uplift narrative coherent alongside siblings like `stage-report-evidence-and-confidence` and `clarify-pre-presentation-evidence-gate`. The alternative single-lens-plus-later-dedup path defers both checks past the moment captain attention is maximally focused on the directive, which is when correction is cheapest.

## Acceptance Criteria

- Given a directive whose stated approach contradicts a documented codebase fact (fixture: "the dashboard runs on HTTP server X" when ADR-001 says channel-only), when `build-brainstorm` runs, then the output contains both lens paragraphs AND an Open Question seed prefixed `⚠ contradicted:` with a file:line citation (how to verify: run skill against contradiction-fixture directive; `grep -c "⚠ contradicted" output.txt` ≥ 1; `grep -c "Captain-Intent Lens\|Codebase-Reality Lens" output.txt` = 2).
- Given a directive whose title/first-sentence overlaps ≥50% token similarity with an active entity's title/directive, when `build-brainstorm` runs, then `## Captain Context Snapshot` contains a `**Dedup flag:** ⚠️ overlaps {id} ({title}) -- consider {merge|link|refine}` line (how to verify: seed a directive mirroring entity `036`'s title; run skill; assert `Dedup flag:` substring present in returned text).
- Given a novel directive with no dedup matches and no lens divergence, when `build-brainstorm` runs, then no `Dedup flag:` line appears in the Captain Context Snapshot and no `⚠ contradicted` seed appears in Open Questions (how to verify: run against a genuinely novel fixture directive; `grep -c "Dedup flag:\|⚠ contradicted" output.txt` = 0).
- Given the enhancement ships, when the non-interactive contract is audited, then `build-brainstorm` issues zero `AskUserQuestion` / `Teammate` question calls (how to verify: `grep -c "AskUserQuestion\|Teammate" skills/build-brainstorm/SKILL.md` returns 0; confirm skill returns text-only output).
- Given dual-lens analysis inspects the codebase, when `build-brainstorm` runs on any fixture, then total file-read count stays ≤5 (how to verify: instrument the skill run with a Read counter; assert count ≤ 5 across three distinct fixture directives).

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
