---
id: 108
title: Sharp-edges audit of spacedock primitives -- workflow-index + troop contract
status: draft
context_status: pending
source: captain directive (2026-04-15 post-103/106 ship session — session evidence of workflow-index lifecycle gap + troop trust surface)
created: 2026-04-15T13:45:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: audit
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
depends-on: []
---

## Directive

Run `sharp-edges` skill review over 2 spacedock primitives that carry load-bearing trust surfaces + implicit state + captain-facing API, producing a known-gaps list + Phase F candidate proposals. **Review-only audit entity** — no direct code fix in this entity's scope; findings become seed directives for downstream entities.

### Scope — 2 primitives

**1. `spacedock:workflow-index` (skill) + `workflow-index-maintainer` (mod library)**

Audit target files:
- `skills/workflow-index/SKILL.md` (append / read / update-status modes)
- `mods/workflow-index-maintainer.md` (Case B band-aid)
- `docs/build-pipeline/_index/CONTRACTS.md` (live state)
- `docs/build-pipeline/_index/DECISIONS.md` (live state)

**Known footguns to confirm + extend**:
- `in-flight` → `final` lifecycle has no transactional guarantee; manual text-edit can falsify status (this session: nuwa-distillation rows stale in-flight despite entity archived)
- Case B band-aid relies on mod-hook ordering; if hook fails silently, CONTRACTS diverges from truth without alarm
- No `final` irreversibility — text-edit can resurrect a shipped entity's row to in-flight
- Cross-worktree append races (two entities running concurrently both append)
- Captain P-4 discipline not enforced at index level (supersedes relationships)

**2. `spacedock:troop` agent + `task-execution` skill contract**

Audit target files:
- `agents/troop.md` (current name; may be task-executor depending on registered agent)
- `skills/task-execution/SKILL.md` (No-Exceptions blocks, Circular-AC rule just added)
- `references/agent-dispatch-guide.md` (contract surface)

**Known footguns to confirm + extend**:
- `blocked_reason` is stringly-typed and troop-authored — Benign-Drift Classifier (106) trusts troop prose to decide auto-proceed; adversarial / confused troops can craft matching substrings (106 review HIGH finding)
- `scope_observation` injection — troops can self-generate findings that mimic classifier audit trail; `drift_class` field not protected
- `changed_files` list has no hash verification against actual git diff
- Worktree sandbox: troop can `git -C` to main or `../` to sibling worktree (sandbox is advisory, not enforced)
- `files_modified` plan-time declaration vs `changed_files` runtime return — no gate catches expansion
- Circular-AC rule (just shipped 106) trusts the troop's own grep execution context

### Out of scope

- Fixes for any finding — this entity produces an audit artifact. Findings become seed directives.
- `spacedock:build-shape` (103 already had sharp-edges review)
- `spacedock:build-execute` Benign-Drift Classifier itself (106 already had sharp-edges review)
- UI entities (015 / 028) — different risk profile, use UI-focused review
- Non-primitive skills (build-brainstorm / build-clarify / build-plan / build-review) — deferred to future audit entities

### Deliverables

1. **Findings table** per primitive: CRITICAL / HIGH / MEDIUM / LOW severity × root cause × location (file:line with content anchors, NOT stale line numbers per Dim 9 discipline) × fix hint
2. **Phase F candidate list**: 3-5 follow-up entities seeded with scope-bounded directives (e.g., "workflow-index: add transactional append with SHA verification", "troop: hash `changed_files` against `git diff` return")
3. **Cross-primitive coherence note**: where workflow-index + troop footguns compound (e.g., troop can edit CONTRACTS.md directly via text-edit, bypassing workflow-index skill)
4. **Known-gap log**: items explicitly accepted as v1 trade-offs (document, do not fix)

### Non-goals

- **Not** a full audit of every spacedock primitive — intentionally scoped to 2 highest-ROI targets per session evidence
- **Not** a security audit (sharp-edges is footgun + design safety, not threat modeling)
- **Not** a fix task — findings stay in this entity's body until captain converts to downstream entities

### Captain Context Snapshot

- **Session**: directly after 103 + 106 shipped; session evidence cites specific pain points
- **Proof points from this session**:
  - workflow-index: nuwa CONTRACTS rows stuck `in-flight` after entity archived → 103 task-6 HARD GATE false-triggered (FO sync'd rows manually, workaround committed)
  - troop trust: 106 sharp-edges review flagged `blocked_reason` stringly-typed trust as HIGH; accepted as v1 known-gap — this audit should concretize hardening options
- **Related entities (shipped)**: 103 (shape), 106 (plan-defect-autopilot)
- **Related entities (active)**: 107 plan-checker-multi-angle-nuwa (seed)
- **Model policy**: audit entity — sonnet for brainstorm (Medium scale), opus for clarify if captain engages gray-area deep-dive

## Notes

Audit entity design pattern: `intent: audit`, no code fix, deliverable is findings doc. This might be the first of its kind — future similar audits (build-brainstorm Lens system, knowledge-capture D1/D2 trust, AskUserQuestion bypass paths) can copy this template.
