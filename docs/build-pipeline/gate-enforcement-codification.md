---
id: 110
title: Gate Enforcement Codification -- Codify Plan 95% + Pre-Ship 90% Gates Into Skills
status: draft
context_status: pending
source: captain directive (2026-04-15 post-107 ship review)
created: 2026-04-15T17:45:00+08:00
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
depends-on: [107]
---

## Directive

Spacedock currently has TWO confidence gates that diverge in enforcement rigor; codify both into skill-level protocol so they survive FO session turnover:

### Gap 1 — Plan-stage auto-advance (>95%) is tribal knowledge only

- Documented in `docs/build-pipeline/README.md:73-74` as comment
- Documented in MEMORY `fo-confidence-autoadvance.md`
- **NOT codified in `skills/build-plan/SKILL.md`** — no mandatory Skill() call, no 95% check step
- Current state: FO honors it when FO remembers to read the MEMORY note. Entity 107 (2026-04-15) correctly gated at 94%, but a different FO instance without MEMORY access would silently advance

### Gap 2 — Pre-ship 90% gate has spec but no enforcement lever

- Fully spec'd in `references/confidence-gate.md` (387 lines, 5-factor composite, auto-fix loop, block-on-fail)
- FO shared-core documents integration at `references/first-officer-shared-core.md:319-343`
- **NOT wrapped as a callable skill** — FO has to read 2 reference docs and implement the parsing + scoring + auto-fix dispatch inline
- Current state: FO 107 session skipped this gate entirely at ship time (0.82 UAT confidence conflated with 5-factor composite; merge proceeded without 76.25% composite computation). Retroactive `## Confidence Assessment` written to archived entity 107 after ship documents the skip.

### Proposal — one skill, two invocation points

Create `skills/confidence-gate/SKILL.md` with two modes:
- `mode: plan_gate` — input: entity path; output: YAML `{confidence: 0-100, factors: [...], verdict: auto-advance|captain-gate}`. Called by `spacedock:build-plan` Step N (new step) as mandatory unconditional call after plan-checker passes. Uses 5-factor scoring adapted for plan stage (context completeness / scope clarity / risk / precedent / AC testability — the MEMORY factors).
- `mode: pre_ship_gate` — input: entity path; output: YAML `{composite: 0-100, factors: [...], verdict: advance|auto-fix|block}`. Called by `spacedock:first-officer` shared-core UAT→shipped transition as mandatory unconditional call. Uses the current `confidence-gate.md` 5-factor spec.

Both modes must:
- Write `## Confidence Assessment` section to entity body (same schema; `Stage: plan|pre-ship` field distinguishes)
- Append to `_index/CONTRACTS.md` per workflow-index unconditional-append rule (`skills/confidence-gate/SKILL.md` row + Stage Report integration)
- Include contract test fixtures in `tests/pressure/confidence-gate-*.yaml`

### Follow-on

- Update `skills/build-plan/SKILL.md` Step 0.6 (right after plan-checker) with unconditional `Skill("spacedock:confidence-gate", "mode: plan_gate")` call
- Update `skills/first-officer/...` or `references/first-officer-shared-core.md:319` to reference the skill invocation instead of inline spec
- Retire `references/confidence-gate.md` (or collapse to skill internals) once ported
- Port MEMORY `fo-confidence-autoadvance.md` into skill front-matter

## Captain Context Snapshot

Captain raised this 2026-04-15 in the same session that shipped entity 107. Question: "Confidence Auto-Advance 的設計目前有落實到 workflow 中嗎?" Answer surfaced the two-gate divergence. Captain chose C (both retroactive 107 Confidence Assessment + seed this entity).

Ship of 107 itself validated the gap: FO session skipped pre-ship 5-factor gate entirely, captain B-path ship at UAT 0.82 (not composite) became the actual decision mechanism. Retroactive composite computed at 76.25% — below 90% threshold — documenting protocol debt honestly.

Parent context:
- `docs/build-pipeline/_archive/plan-checker-multi-angle-nuwa.md` § Confidence Assessment (retroactive section with gate-skip disclosure)
- MEMORY `fo-confidence-autoadvance.md`
- `references/confidence-gate.md` (existing 387-line spec to port)
- `references/first-officer-shared-core.md:319-343` (existing FO integration point)

## Expected scope hints

- 1 new skill directory (`skills/confidence-gate/`) with SKILL.md + 2 mode references + contract tests
- 2-3 skill integration edits (build-plan SKILL.md, first-officer shared-core or skill file)
- 1 retire + redirect of `references/confidence-gate.md`
- 1 MEMORY update to mark `fo-confidence-autoadvance.md` as superseded-by-skill

Scale: Medium. Intent: feature (enforcement hardening of existing spec).
