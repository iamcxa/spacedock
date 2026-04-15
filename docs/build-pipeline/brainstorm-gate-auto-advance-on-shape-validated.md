---
id: 115
title: Brainstorm Gate Auto-Advance on Shape-Validated + Zero Contradictions
slug: brainstorm-gate-auto-advance-on-shape-validated
status: draft
context_status: pending
source: captain observation
created: 2026-04-16T01:30:00+08:00
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
shape_status: n/a
depends-on: [alignment-gate-promote-to-stage]
---

## Directive

> brainstorm-gate-auto-advance-on-shape-validated -- 當 entity `shape_status: validated` 且 brainstorm triage executability 5/5 且 brainstorm 的 `## Lens Evidence` 沒有 contradict shape 的 claim 時，FO 自動通過 brainstorm gate 不再 block 等 captain 同意（log `brainstorm gate auto-resolved: shape-validated, executability 5/5, no lens contradictions` 訊息）。三條件任一不滿足仍走原 captain gate 流程（executability 呈現 + A/B/C 路徑選擇）。修改 `references/first-officer-shared-core.md` Brainstorm Triage Gate Resolution 章節；可能需要一個新 helper 檢查 lens evidence contradiction（或用既有 gate (i) cross-lens recurrence 的 negative signal）。不動 brainstorm stage 本身的產出、lens 邏輯、executability rubric。

## Captain Context Snapshot

- **Created**: 2026-04-16T01:30:00+08:00
- **Source**: Captain observation during entity 114 build flow — when shape_status=validated and brainstorm output shows 0 α markers + 5/5 executability + clean lens evidence, the brainstorm gate becomes a rubber-stamp moment with zero information gain. Captain's framing: "已經有 brainstorm 內容就不用再 gate 了除非是要合成其他技術決策".
- **Empirical evidence**: Entity 114 is the second shape-first entity (first was entity 113 — which was not shape-first; 114 IS). Entity 114's brainstorm gate fired after `/build --from` produced 4 lens evidence with 0 contradictions and 8 grep-verifiable AC. Captain only answered "advance" — no path selection, no revision request.
- **Related entities**: 113 build-entry-routing-and-alignment-gate (shipped — source of current brainstorm gate logic); 114 alignment-gate-promote-to-stage (in-flight — first shape-first sample point); 103 shape-pre-build-alignment-skill (shipped — origin of shape_status semantics and P-4 immutable-pitch)
- **Depends-on**: 114 — because (a) 114 is the empirical baseline for "brainstorm gate fires pre-auto-advance", providing the before-state for validation; (b) 115 modifying brainstorm gate while 114 is in-flight would change 114's own gate behavior mid-pipeline (test confound)
- **Why not shape-first**: Problem is narrow, direction is unambiguous, scope is Small (2-3 file edits in shared-core + possibly README brainstorm stage comment). The `/build` Step 0 gatekeeper should silent-pass this directive (concrete targets: references/first-officer-shared-core.md, Brainstorm Triage, lens evidence, executability; zero hedge words).

## Pre-Brainstorm Scope Sketch (informal)

**Expected modifications:**
- `references/first-officer-shared-core.md` — `Brainstorm Triage` section, `Gate Resolution` subsection. Add auto-advance rule with three-condition predicate.
- `docs/build-pipeline/README.md` — comment on brainstorm stage `gate: true` line noting the auto-advance condition (preserves README as source of truth).
- Possibly `references/brainstorm-gate-contradiction-check.md` — new tiny reference doc defining what counts as a "lens evidence contradiction with shape" (candidate predicates: Lens (a) claim absent from shape; Lens (b/c/d) claim directly contradicts shape Scope: In/Out; Brainstorming Spec α-marker count > 0).

**Three-condition predicate:**
1. `shape_status == validated` (from entity frontmatter)
2. brainstorm triage executability score == 5 (from FO's existing 5-point rubric)
3. lens evidence contradictions == 0 (new check; falsifiable via grep or structural inspection)

**Out of scope:**
- Generalizing to clarify gate or UAT gate (this is brainstorm-gate-specific)
- Adding new executability criteria (keep the 5-point rubric as-is)
- Shape-validated entities that want to OVERRIDE auto-advance (if captain always wants the gate, provide opt-out via `auto_advance: false` in frontmatter — already exists as a field)
- Mid-flight behavioral change for entity 114 (depends-on: 114 ensures 115 ships after 114)

**Empirical baseline to cite in AC:**
- Entity 114 Stage Report: clarify confirms brainstorm gate fired and captain answered "advance" with no path selection (rubber-stamp signal).
- Entity 113 (not shape-first) Stage Report would NOT trigger auto-advance (shape_status absent) — should continue to gate normally; this is the negative test case.

## Notes

- This is a _parked draft_ awaiting entity 114's ship. Do NOT run `/build` or advance past `status: draft` until 114 is `verdict: PASSED` and archived.
- If 114 reveals implementation constraints that change the predicate (e.g., lens evidence contradiction detection turns out non-trivial), this directive's `### Pre-Brainstorm Scope Sketch` above should be revised BEFORE /build is invoked — the informal sketch is captain-edit-friendly, the brainstorm sections below it will be populated by `/build`.
