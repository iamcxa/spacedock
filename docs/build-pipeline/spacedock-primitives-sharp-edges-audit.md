---
id: 108
title: Sharp-edges audit of spacedock primitives -- workflow-index + troop contract
status: plan
context_status: ready
source: captain directive (2026-04-15 post-103/106 ship session — session evidence of workflow-index lifecycle gap + troop trust surface)
created: 2026-04-15T13:45:00+08:00
started: 2026-04-15T13:50:00+08:00
completed:
verdict:
score: 1.0
worktree: .worktrees/spacedock-ensign-spacedock-primitives-sharp-edges-audit
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

## Brainstorming Spec Annotations

The Directive's "Known footguns" list was cross-referenced against codebase during explore Step 3.7. Annotations per claim:

**workflow-index primitive**:
- in-flight → final no transactional guarantee (✓ confirmed by explore: skills/workflow-index/SKILL.md:46 idempotent-reads only; update-status-bulk overwrites without current-value guard) [primary]
- Case B band-aid silent failure (✓ partially confirmed: mods/workflow-index-maintainer.md:83,89-98 logs warnings but no alarm channel; "silent" overstates — see A-9) [primary]
- No `final` irreversibility (✓ confirmed by explore: no text-edit guard, no status-transition check) [primary]
- Cross-worktree append races (✓ confirmed by explore: zero flock/mutex/serialize keywords in skills/workflow-index/ or mod) [primary]
- Captain P-4 supersedes not enforced at index (✓ confirmed by explore: CONTRACTS row schema at CONTRACTS.md:7 has no Supersedes column; supersede semantics exist for DECISIONS only) [primary]

**troop + task-execution primitive**:
- `blocked_reason` stringly-typed (✓ confirmed by explore: task-execution/SKILL.md:253 defines as free-text; zero enum/schema/validate hits) [primary]
- `scope_observation` injection (✓ confirmed by explore: task-execution/SKILL.md:216,248 types are free-text fields; zero sanitize/validate/protect hits) [primary]
- `changed_files` no hash verify (⚠ contradicted: build-execute/SKILL.md:437 git-diff-tree count cross-check + task-execution/SKILL.md:207 subset enforcement -- see Q-2) [primary]
- Worktree sandbox advisory (✓ confirmed by explore: prompt-string only at build-execute/SKILL.md:166; no chroot/cwd-lock enforcement in tool allowlist) [primary]
- `files_modified` plan-vs-runtime gate gap (⚠ contradicted: task-execution/SKILL.md:207 explicitly enforces subset with BLOCKED revert -- see Q-2) [primary]
- Circular-AC grep-context trust (✓ confirmed by explore: task-execution/SKILL.md:118-144 scope-narrows but does not isolate execution context; entity file with AC literal can self-satisfy) [primary]

Also surfaced during mapping (not in original Directive): **CONTRACTS.md hygiene drift** — 8+ shipped entities still carry 🟡 in-flight markers post-ship; mod's final-transition hook not firing reliably (see A-10). Directive cites `skills/build-execute/references/agent-dispatch-guide.md` as an audit target but the file does NOT exist — dispatch contract lives inline in build-execute/SKILL.md Step 4b:157-188 (see Q-3).

## Assumptions

### A-1: workflow-index has no file-locking primitive for CONTRACTS.md append
- **Confidence**: Confident (0.95)
- **Evidence**: skills/workflow-index/ references "Atomicity" only as "abort on partial failure" at skills/workflow-index/references/write-mode.md:83,159-160; zero flock/lockfile/fcntl/mutex keywords in skill tree or mods/workflow-index-maintainer.md [primary]
- **Additional evidence**: skills/build-plan/SKILL.md:419 and skills/build-execute/SKILL.md:81 issue unconditional Skill() write calls with no caller-side lock either [secondary]

### A-2: workflow-index has no in-flight → final irreversibility guard
- **Confidence**: Confident (0.95)
- **Evidence**: skills/workflow-index/SKILL.md:46 declares "idempotent reads" only; write modes silent on status transitions [primary]
- **Additional evidence**: update-status-bulk overwrites status without current-value check (skills/workflow-index/references/write-mode.md write-mode semantics); empirical drift observed at CONTRACTS.md (8+ rows stuck 🟡 in-flight post-ship per Angle iii sweep) [secondary]

### A-3: workflow-index has no cross-worktree append serialization
- **Confidence**: Confident (0.95)
- **Evidence**: zero "worktree"/"concurrent"/"race"/"mutex"/"serialize" keywords in skills/workflow-index/; check-mode.md:45 "planned-conflict" is READ-time detection, not write-time [primary]
- **Additional evidence**: CONTRACTS.md append is Edit-tool-driven from FO mod + skill callers (mods/workflow-index-maintainer.md, skills/build-plan:419, skills/build-execute:81); no OS-level lock at any layer [secondary]

### A-4: CONTRACTS row schema lacks Supersedes column (captain P-4 discipline unenforced)
- **Confidence**: Confident (0.95)
- **Evidence**: Active Contracts table header at docs/build-pipeline/_index/CONTRACTS.md:7 is `| Entity | Stage | Intent | Status | Last Updated |` — no Supersedes [primary]
- **Additional evidence**: skills/workflow-index/SKILL.md:44 mentions Supersedes field for DECISIONS only; one P-4 mention at CONTRACTS.md:336 is free-text Notes-cell, not typed [primary]

### A-5: `blocked_reason` is unconstrained free-text, consumed by downstream classifier
- **Confidence**: Confident (0.95)
- **Evidence**: skills/task-execution/SKILL.md:253 declares `blocked_reason: {one sentence, only when status == BLOCKED, else omit}` — zero enum/schema/validate hits [primary]
- **Additional evidence**: Benign-Drift Classifier at skills/build-execute/SKILL.md:216-240 substring-matches `blocked_reason` to decide auto-proceed (accepted v1 known-gap per entity 106 sharp-edges log at docs/build-pipeline/_archive/plan-defect-autopilot.md:809-854) [primary]

### A-6: `scope_observation` / `drift_class` fields have no origin or sanitization protection
- **Confidence**: Confident (0.95)
- **Evidence**: skills/task-execution/SKILL.md:216,248 define finding TYPES (`skill_suggestion | scope_observation | pre_existing_failure | scope_gap`) as free-text fields; zero sanitize/validate/protect hits for scope_observation or drift_class [primary]
- **Additional evidence**: troop prose flows directly into Stage Report → workflow-index parse with no escape layer; adversarial or confused troop can author findings that mimic classifier audit trail [secondary]

### A-7: Worktree sandbox is prompt-string only, not tool-enforced
- **Confidence**: Confident (0.95)
- **Evidence**: skills/build-execute/SKILL.md:166 troop prompt template contains `"Your working directory is {worktree_path}\nAll file reads and writes MUST use paths under {worktree_path}"` — advisory text, not enforcement [primary]
- **Additional evidence**: agents/troop.md:4-7 tool allowlist (Read/Write/Edit/Bash/Grep/Glob/Skill) has no path constraint; zero chroot/sandbox-enforce/cwd-lock hits across skills/task-execution/ or agents/troop.md [primary]

### A-8: Circular-AC rule trusts troop's own grep execution context
- **Confidence**: Confident (0.95)
- **Evidence**: skills/task-execution/SKILL.md:118-144 Circular-AC Rule defines semantic-pass when grep-count==0 but string appears in same-entity guard blocks; scope narrows to same-entity (line 135) but does NOT isolate grep environment [primary]
- **Additional evidence**: entity file itself is read via `read_first` and persists in troop context; grep runs against working tree that troop also edits — entity file containing AC literal can self-satisfy the AC [secondary]

### A-9: Mod-hook failures are logged but not alarmed
- **Confidence**: Likely (0.75)
- **Evidence**: mods/workflow-index-maintainer.md:83 logs warning for missing Files Modified; lines 89-98 Error Handling logs rate-limit, transient, parse, INDEX-rebuild failures — but no captain-alarm/alert/notify channel [primary]
- **Additional evidence**: Captain visibility depends on reading FO logs; original Directive footgun #3 "silent failure" overstates — failures are logged; the gap is alarm surface, not silence [secondary]

### A-10: CONTRACTS.md hygiene is drifting — final-transition hook not firing reliably post-ship
- **Confidence**: Likely (0.70)
- **Evidence**: 8+ shipped-and-archived entities (065 flatten-dispatch-troops, 066 overhaul, 067 tdd, 069 review-stage-parallel, 080 staleness, 087 confidence-gate, 103 shape, 104 nuwa-distillation) still carry 🟡 in-flight / 🔵 planned markers on their CONTRACTS rows [primary]
- **Additional evidence**: Empirical pattern observed via Angle (iii) sweep of CONTRACTS.md against INDEX.md shipped-state entries; entity 103 task-6 HARD GATE false-fire at docs/build-pipeline/_archive/shape-pre-build-alignment-skill.md:882 is the canonical proof point [primary]
- **Caveat**: inferred from drift evidence, not from tracing hook-fire logs; root cause could be hook-ordering, archive-move semantics, or missing `shipped_date` input — Phase F candidate would need a diagnostic pass

## Option Comparisons

### O-1: Severity bar for audit findings (CRITICAL / HIGH / MEDIUM / LOW thresholds)

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Impact-only severity** — CRITICAL = workflow corruption, HIGH = trust violation exploitable, MEDIUM = drift-risk, LOW = cosmetic | Mirrors sharp-edges skill convention; aligned with entity 106 HIGH labeling; easy for Phase F triage | Subjective on "exploitable" threshold when no adversary model is declared for internal agents | Low | ✅ Recommended |
| **(b) Impact × likelihood matrix** — 2D grid like security review | More defensible severity assignment | Over-engineered for 11 findings; requires likelihood heuristic the audit doesn't have data for | Medium | Viable |
| **(c) Defer severity to captain** — audit emits raw findings, captain labels in clarify | Minimal author bias | Burns clarify rounds; captain lacks context audit has | Low | Not recommended |

**Recommendation validation** (return-value trace): Option (a) output feeds Phase F seed prioritization — captain picks HIGH+ for near-term; MEDIUM/LOW stays in known-gap log. Trace confirmed: 2 levels down to Phase F entity directive field. Design-doc invariants: no conflict with captain preferences (quality-first, captain-labels-decisions) — actually aligned because captain still owns Phase F decisions, audit just pre-sorts. (✅ validated)

### O-2: Phase F seed granularity (one entity per finding vs bundled per primitive)

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) One Phase F entity per HIGH finding** — e.g., "workflow-index-file-locking", "workflow-index-supersedes-column", "troop-sandbox-enforcement" | Each seed is scope-bounded + shippable independently; parallel-friendly; matches captain's track record of Medium-scale ships | Proliferates entity count; cross-primitive coherence fixes (e.g., troop-edits-CONTRACTS) may span entities | Medium | ✅ Recommended |
| **(b) One Phase F entity per primitive** — e.g., "workflow-index-hardening-v2" bundles locking + irreversibility + supersedes; "troop-trust-surface-hardening" bundles blocked_reason + scope_observation + sandbox | Fewer entities; natural cross-finding coherence within primitive | Large-scale entities; harder to park/reprioritize individual fixes; MEMORY pattern `nuwa-ification-amplifies-taxonomy` cautions against bundling | Medium | Viable |
| **(c) Mixed — HIGH gets own entity, MEDIUM/LOW bundled** | Severity-weighted; practical for current 10-finding set | Arbitrary cutoff if severities cluster around MEDIUM | Low | Viable |

**Recommendation validation**: Option (a) aligns with captain's Medium-ship cadence (Phase E Plan 2-6 execution pattern in MEMORY). Return trace: each Phase F seed becomes a /build directive + becomes an entity file + passes through full pipeline. Design-doc invariants: aligned with audit-first MEMORY rule (fix-first-before-Nuwa parallel). (✅ validated)

## Open Questions

### Q-1: How should the audit treat the 2 REFUTED footgun claims (original Directive #8 and #10)?
- **Domain**: audit methodology / contract clarification
- **Why it matters**: Directive listed `changed_files` no-hash-verify and `files_modified`-vs-`changed_files` gate-gap as footguns, but codebase evidence (build-execute:437 + task-execution:207) shows BOTH are explicitly guarded. The audit output must distinguish "concerning claim that turned out to be mitigated" from "genuine footgun". Silently dropping loses the audit trail; writing them up without caveat confuses Phase F seeding.
- **Suggested options**:
  1. Document as **known-good patterns** — add a "Confirmed mitigations" subsection citing file:line, useful reference for future audits
  2. Silently drop from findings, note in Stage Report only
  3. Treat as **content-hash gap** — rephrase #8 as "git-truth cross-check exists but no content-SHA verification", keeping as MEDIUM finding (explorer Angle (iv) suggested this reframe)
- **Evidence for options**: [primary]

### Q-2: Should the audit scope include the CONTRACTS.md hygiene meta-finding (A-10), or is that a separate entity?
- **Domain**: audit scope / primitive boundary
- **Why it matters**: A-10 is an empirical observation (8+ shipped entities still in-flight) discovered during Angle (iii) sweep — it wasn't in the original Directive's known-footguns list. It IS a workflow-index footgun (hook-reliability or missing `shipped_date` input), but diagnosing root cause requires runtime log analysis that's deeper than a sharp-edges design audit.
- **Suggested options**:
  1. **Include as finding** with HIGH severity — audit output flags it, Phase F entity investigates root cause
  2. **Spawn as separate Phase F seed** immediately — too runtime-heavy for sharp-edges audit to diagnose; audit produces pointer + leaves diagnosis for dedicated entity
  3. **Exclude** — out of sharp-edges scope (behavioral observation, not design footgun)
- **Evidence for options**: [primary]

### Q-3: What to do about the dead reference `skills/build-execute/references/agent-dispatch-guide.md` in the Directive?
- **Domain**: audit surface hygiene
- **Why it matters**: Directive line 51 cites the file as canonical contract surface but it does NOT exist — dispatch contract actually lives inline at skills/build-execute/SKILL.md:157-188. Either the audit should fix the Directive OR surface as a separate finding ("dispatch contract has no extracted reference doc, making cross-skill citation brittle").
- **Suggested options**:
  1. **Patch Directive + note** — correct the file path citation inline, add a one-line Stage Report note; no finding generated
  2. **Generate finding** — documentation debt as LOW-severity footgun; Phase F seed "extract dispatch contract from build-execute SKILL.md into references/"
  3. **Ignore** — cosmetic; below severity bar
- **Evidence for options**: [primary]

### Q-4: Cross-primitive compounding — how deep should the audit trace troop ↔ workflow-index interaction footguns?
- **Domain**: audit scope / cross-primitive coherence
- **Why it matters**: Directive deliverable #3 calls for "cross-primitive coherence note" (e.g., troop can edit CONTRACTS.md via Write/Edit tools, bypassing workflow-index skill). The audit could surface this as a single compound HIGH finding, or decompose into per-primitive findings (troop-tool-allowlist-too-permissive × workflow-index-no-gatekeeper). Decomposition granularity affects Phase F seed count.
- **Suggested options**:
  1. **Single compound finding** — one HIGH "troop bypasses workflow-index via Edit/Write" with fix hint spanning both primitives
  2. **Per-primitive decomposition** — one per side (troop-allowlist narrowing + workflow-index-write-gatekeeper)
  3. **Both** — compound finding as headline + two primitive-scoped sub-findings for Phase F seeding
- **Evidence for options**: [primary]

## Core Tensions

- **essential**: **Trust surface vs agent autonomy** — hardening `blocked_reason` / `scope_observation` into enum + schema reduces adversarial-troop risk but also constrains legitimate troop expressiveness (troops author nuanced failure reasons). Captain must decide where on the autonomy/safety curve this audit's Phase F seeds should land.
- **domain-based**: **Audit-artifact-only intent vs HIGH-severity findings demanding fix** — entity 108 scope explicitly forbids direct code fix, but some findings (e.g., A-3 cross-worktree race, A-7 sandbox-advisory) may be severe enough that captain redirects to immediate fix entity. Downstream stages must honor audit-only intent unless captain overrides.
- **time-based**: **Sibling entity 107 parked pending 109, unparking sequence undefined wrt 108** — 107 depends on 109 audit (Nuwa taxonomy); 108 is a parallel audit touching overlapping primitive (task-execution/troop). If 107 unparks before 108 ships, 107's plan to use `agents/troop.md` as thin-wrapper template becomes stale when 108 recommends troop contract changes. Coordination unclear.

## Honest Boundaries

- **Audit coverage limited to 2 primitives**; build-brainstorm/clarify/plan/review + knowledge-capture + AskUserQuestion bypass paths are deferred to future audit entities (per Directive Out of Scope).
- **Sharp-edges methodology covers footgun/design-safety, NOT threat modeling**; e.g., "troop is compromised by an attacker" is not in scope — "troop is confused or buggy" is.
- **Angle (iv) seed verification is absence-oriented**; when a mitigation exists in a different file than the seed's grep target (as happened for footguns #8, #10), careful cross-referencing catches it, but the audit is not guaranteed to catch every mitigation hidden in an unexpected location.
- **No pressure-test coverage** was found for any of the 10 confirmed footguns — audit output does NOT claim fixes are testable until pressure-test fixtures exist (MEMORY pressure-test-preservation-todo is on the critical path for Phase F validation).
- **A-10 (CONTRACTS hygiene drift) inferred from drift pattern**, not from hook-fire log analysis — root cause confirmation requires runtime instrumentation out of sharp-edges scope.

## Stage Report: explore

- [x] Files mapped: 18 across contract, router, config, test layers (domain/view/seed/frontend empty by design for primitive audit)
  contract: 6 files (SKILL.md + references), router: 3 files (FO shared core + runtime refs), config: 5 files (agents/troop.md, mods, CONTRACTS/DECISIONS/INDEX), test: 7 pressure-test fixtures + trigger-eval
- [x] Assumptions formed: 10 (Confident: 8, Likely: 2, Unclear: 0)
  A-1 through A-8 Confident via direct file:line evidence from Angle (iv); A-9 Likely (downgraded from claim per partial-refute); A-10 Likely (empirical drift inference)
- [x] Options surfaced: 2
  O-1 severity bar convention; O-2 Phase F seed granularity
- [x] Questions generated: 4
  Q-1 treatment of 2 refuted footgun claims; Q-2 CONTRACTS hygiene meta-finding scope; Q-3 dead-reference disposition; Q-4 cross-primitive compounding decomposition depth
- [x] α markers resolved: 0 / 0 (no brainstorm spec block; audit-intent entities carry Directive + Scope instead)
- [x] Scale assessment: Medium confirmed (18 files across 4 layers — matches frontmatter)
- [x] Research dispatched: 0 researchers (skipped — audit is internal-primitive scope, no external tech claims; all evidence grounded in codebase grep)

## Clarify Annotations

**Open Questions — resolved by captain 2026-04-15:**

- Q-1 → **Answer**: Document 2 refuted claims (#8 changed_files, #10 files_modified gate) as **Confirmed Mitigations** subsection in audit output; cite file:line; no Phase F seed. Future audits benefit from the skeptical verification trail.
- Q-2 → **Answer**: Include A-10 (CONTRACTS.md hygiene drift) as **HIGH** finding + spawn dedicated Phase F diagnostic entity. Audit produces pointer; diagnostic entity does runtime log analysis.
- Q-3 → **Answer**: Generate **LOW** finding for dead reference `skills/build-execute/references/agent-dispatch-guide.md` + Phase F seed to extract dispatch contract from `build-execute/SKILL.md:157-188` into references/ file.
- Q-4 → **Answer**: Structure cross-primitive compound as **compound headline + per-primitive sub-findings**. One HIGH compound narrative ("troop bypasses workflow-index via Edit/Write") + 2 sub-findings for Phase F seeding: (a) troop-tool-allowlist narrowing, (b) workflow-index write-gatekeeper.

**Option Comparisons — selected by captain 2026-04-15:**

- O-1 → **Selected**: **Impact-only CRITICAL/HIGH/MEDIUM/LOW severity bar**. Aligned with entity 106 HIGH labeling convention.
- O-2 → **Selected**: **One Phase F entity per HIGH finding**. Medium-ship cadence; matches MEMORY `nuwa-ification-amplifies-taxonomy` audit-first discipline.

**Assumption Severity Assignments — approved by captain 2026-04-15 (all 12 accepted as proposed):**

| # | Finding | Severity | Phase F Seed |
|---|---------|----------|--------------|
| A-1 | workflow-index no file-locking primitive | **HIGH** | ✓ `workflow-index-file-locking` |
| A-2 | no in-flight→final irreversibility guard | **HIGH** | ✓ `workflow-index-irreversibility-guard` |
| A-3 | cross-worktree append race | **HIGH** | ✓ `workflow-index-worktree-race-serialization` |
| A-4 | CONTRACTS row schema no Supersedes column | **MEDIUM** | known-gap log |
| A-5 | `blocked_reason` stringly-typed | **MEDIUM** | known-gap log (per 106 v1 accepted) |
| A-6 | `scope_observation` injection unprotected | **MEDIUM** | known-gap log |
| A-7 | worktree sandbox advisory-only | **HIGH** | ✓ `troop-sandbox-enforcement` |
| A-8 | Circular-AC grep-context trust | **MEDIUM** | known-gap log |
| A-9 | mod-hook logged-not-alarmed | **LOW** | known-gap log |
| A-10 | CONTRACTS.md hygiene drift | **HIGH** | ✓ `workflow-index-contracts-hygiene-diagnostic` |
| Compound | troop bypasses workflow-index via Edit/Write | **HIGH** | ✓ `troop-workflow-index-write-gatekeeper-compound` (+ sub-finding seeds per Q-4) |
| Dead ref | `agent-dispatch-guide.md` missing | **LOW** | ✓ `build-execute-dispatch-guide-extraction` |

**Phase F seed slate (6 HIGH + 1 LOW = 7 total Phase F seeds)**:
1. workflow-index-file-locking (HIGH)
2. workflow-index-irreversibility-guard (HIGH)
3. workflow-index-worktree-race-serialization (HIGH)
4. troop-sandbox-enforcement (HIGH)
5. workflow-index-contracts-hygiene-diagnostic (HIGH — runtime log analysis)
6. troop-workflow-index-write-gatekeeper-compound (HIGH — cross-primitive headline + 2 sub-findings per Q-4)
7. build-execute-dispatch-guide-extraction (LOW — doc debt)

**Known-gap log (stays documented, not seeded)**: A-4 (Supersedes column), A-5 (blocked_reason enum), A-6 (scope_observation sanitization), A-8 (Circular-AC context isolation), A-9 (mod-hook alarm channel).

**Confirmed Mitigations (from Q-1)**:
- Directive footgun #8 `changed_files` hash verify → mitigated by git-diff-tree count cross-check at `skills/build-execute/SKILL.md:437` + subset enforcement at `skills/task-execution/SKILL.md:207`. Content-SHA verification is separately absent (not seeded — below severity bar per captain).
- Directive footgun #10 `files_modified` plan-vs-runtime gate → mitigated by `skills/task-execution/SKILL.md:207` explicit subset enforcement with BLOCKED revert.

## Stage Report: clarify

- [x] Open Questions resolved: 4 / 4
  Q-1 Confirmed Mitigations subsection; Q-2 A-10 HIGH + Phase F diagnostic; Q-3 LOW finding + extraction seed; Q-4 compound headline + per-primitive sub-findings
- [x] Options selected: 2 / 2
  O-1 impact-only severity bar; O-2 one Phase F entity per HIGH
- [x] Assumptions confirmed: 10 / 10
  All 10 assumptions accepted as written; severity assignments approved (proposed mapping accepted unchanged)
- [x] Phase F seed slate: 7 entities (6 HIGH + 1 LOW)
  Ready for downstream /build dispatch after 108 ships its audit artifact
- [x] Decomposition: not-warranted
  Audit entity scope remains monolithic; Phase F decomposition happens post-ship via seed dispatch, not within 108
- [x] Sufficiency gate: PASS
  Entity context complete. Plan stage can proceed directly to authoring the audit artifact (findings table + known-gap log + Confirmed Mitigations + Phase F seed descriptions).

## Research Findings

Read-only research inputs consulted for plan authoring. Audit-intent entity — research scope is meta (methodology + taxonomy), not external-tech claim validation. All 10 assumptions + 4 Q/A pairs were grounded during explore+clarify via direct file reads; no external-tech assumptions remained Likely+ requiring fresh-context research dispatch.

### RF-1: `sharp-edges` skill convention
- Source: `sharp-edges:sharp-edges` skill (trailofbits family).
- Finding table shape (per sharp-edges): `Severity | Root Cause | Location (file:line with content anchor) | Fix Hint`. Severity ladder: CRITICAL (workflow corruption) / HIGH (trust violation exploitable) / MEDIUM (drift risk) / LOW (cosmetic/doc debt). Location anchors prefer content quote over bare line numbers (Dim 9 discipline — line numbers drift; quoted string anchors survive refactor).
- Consumed by plan: Tasks 1+2 adopt this exact column shape. [primary]

### RF-2: Entity 106 sharp-edges review precedent
- Source: `docs/build-pipeline/_archive/plan-defect-autopilot.md:809-854` (entity 106 review stage).
- 106 established the pattern of emitting a per-finding severity table with explicit "v1 accepted known-gap" disposition for findings not seeded. Captain approved the `blocked_reason stringly-typed` HIGH→known-gap downgrade on 106; 108 inherits that downgrade (A-5 → MEDIUM known-gap per clarify Severity Assignment table).
- Consumed by plan: Task 4 known-gap log section writes per-finding dispositional narrative mirroring 106 format. [primary]

### RF-3: MEMORY `nuwa-ification-amplifies-taxonomy` (audit-first discipline)
- Source: MEMORY.md `Nuwa-ification Amplifies Taxonomy — Audit First`.
- Principle: before Nuwa-ifying N elements into N parallel subagents, run read-only audit of fire counts + merge/retire candidates. 108 IS that audit for workflow-index + troop primitives (pre-hardening, not pre-Nuwa — but same principle: audit first, fix later).
- Consumed by plan: Task 3 Phase F seed list honors "one entity per HIGH finding" cadence (clarify O-2 selection) — deliberately avoids bundling that would amplify taxonomy lock-in. [primary]

### RF-4: Session proof points (pre-108 evidence)
- Source: this session's directive + `docs/build-pipeline/_archive/shape-pre-build-alignment-skill.md:882` (103 task-6 HARD GATE false-fire on stale in-flight row).
- Concrete drift: nuwa-distillation CONTRACTS rows stuck in-flight post-archive; 8+ shipped entities still carry 🟡 in-flight (A-10). These are citable ground-truth anchors for the A-10 Phase F diagnostic seed.
- Consumed by plan: Task 1 workflow-index findings table uses these file paths as content-anchored evidence. [primary]

### RF-5: Phase F candidate entity-seeding format
- Source: `skills/build-shape/SKILL.md` + existing seed commits (e.g., `5747ab1 park(107) + seed(109)`).
- Seed format: directive paragraph + scope bullets + proof points + model/profile/intent hints; one seed per future entity; no scaffolding beyond directive.
- Consumed by plan: Task 3 drafts 7 Phase F seed blocks in-body under `## Phase F Seed Slate` section — NOT new entity files (captain spawns those post-108-ship via /build --from). [primary]

## PLAN

Tasks author sections directly into this entity's body (`docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md`). The audit artifact IS the deliverable — no code-tree edits in scope per Directive.

### Task 1: workflow-index findings table

**files_modified**: `docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md`

**read_first**:
- `docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md` (this entity — Assumptions A-1..A-4 + A-10 + clarify Severity Assignments table)
- `skills/workflow-index/SKILL.md`
- `skills/workflow-index/references/write-mode.md`
- `mods/workflow-index-maintainer.md`
- `docs/build-pipeline/_index/CONTRACTS.md` (row schema line 7; drift evidence)

**skills**: none (audit is prose authoring; no skill invocation)

**action**:
1. Append `## Audit Findings — workflow-index` section to entity body (after `## Stage Report: clarify`).
2. Emit 5 finding rows, one per confirmed workflow-index footgun, in a markdown table: `| # | Severity | Finding | Root Cause | Location (content anchor) | Fix Hint |`.
3. Findings to emit (pre-locked by clarify severity table):
   - **F-WI-1** HIGH `workflow-index-file-locking` — no lockfile/flock primitive for CONTRACTS.md append → concurrent appends can produce duplicate rows. Anchor: `skills/workflow-index/references/write-mode.md` "Atomicity" block + zero-match grep for flock/lockfile keywords.
   - **F-WI-2** HIGH `workflow-index-irreversibility-guard` — update-status overwrites without current-value guard → text-edit can resurrect final→in-flight. Anchor: `skills/workflow-index/SKILL.md:46` "idempotent reads" only; write-mode silent on transitions.
   - **F-WI-3** HIGH `workflow-index-worktree-race-serialization` — cross-worktree append race; zero serialize keywords. Anchor: mod + skill grep zero-match for "worktree"/"concurrent"/"race"/"mutex".
   - **F-WI-4** MEDIUM `workflow-index-supersedes-column` — CONTRACTS row schema has no Supersedes column; P-4 discipline unenforced at index. Anchor: `docs/build-pipeline/_index/CONTRACTS.md:7` header row missing column.
   - **F-WI-5** HIGH `workflow-index-contracts-hygiene-diagnostic` — 8+ shipped entities still carry 🟡 in-flight markers. Anchor: Angle (iii) sweep evidence + 103 task-6 HARD GATE false-fire at `docs/build-pipeline/_archive/shape-pre-build-alignment-skill.md:882`.
4. Each row's Fix Hint field cites the corresponding Phase F seed slug from clarify.

**acceptance_criteria**:
- Section `## Audit Findings — workflow-index` present with 5 rows.
- Every Severity field matches clarify Severity Assignments table (A-1 HIGH, A-2 HIGH, A-3 HIGH, A-4 MEDIUM, A-10 HIGH).
- Every Location field uses content anchor (quoted substring OR file:line+quote), never bare line number.
- `grep -c "^| F-WI-" docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md` returns 5.
- Every Fix Hint field references a Phase F seed slug from the clarify slate OR the string "known-gap".

### Task 2: troop + task-execution findings table

**files_modified**: `docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md`

**read_first**:
- `docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md` (Assumptions A-5..A-8 + clarify Severity Assignments table + compound-finding Q-4 disposition)
- `agents/troop.md`
- `skills/task-execution/SKILL.md` (especially lines 118-144 Circular-AC, 207 subset enforcement, 216/248 finding-type fields, 253 blocked_reason)
- `skills/build-execute/SKILL.md` (lines 157-188 dispatch contract inline, 166 sandbox prompt, 216-240 Benign-Drift Classifier, 437 git-diff-tree check)

**skills**: none

**action**:
1. Append `## Audit Findings — troop + task-execution` section to entity body (after Task 1's workflow-index section).
2. Emit 6 finding rows + 1 compound-finding headline + 2 sub-findings (per clarify Q-4 disposition):
   - **F-TR-1** MEDIUM `blocked_reason` stringly-typed — known-gap per 106 precedent. Anchor: `skills/task-execution/SKILL.md:253`.
   - **F-TR-2** MEDIUM `scope_observation` / `drift_class` unsanitized — known-gap. Anchor: `skills/task-execution/SKILL.md:216,248`.
   - **F-TR-3** HIGH `troop-sandbox-enforcement` — worktree sandbox prompt-string only; tool allowlist has no path constraint. Anchor: `skills/build-execute/SKILL.md:166` prompt + `agents/troop.md:4-7` allowlist.
   - **F-TR-4** MEDIUM Circular-AC grep-context trust — known-gap. Anchor: `skills/task-execution/SKILL.md:118-144`.
   - **F-TR-5** LOW mod-hook logged-not-alarmed — known-gap. Anchor: `mods/workflow-index-maintainer.md:83,89-98`.
   - **F-TR-6** LOW dead reference `skills/build-execute/references/agent-dispatch-guide.md` → extraction seed `build-execute-dispatch-guide-extraction`. Anchor: Directive line 51 cites file; file does not exist; dispatch contract inline at `skills/build-execute/SKILL.md:157-188`.
   - **F-XP-1 (compound)** HIGH `troop-workflow-index-write-gatekeeper-compound` — troop's Write/Edit allowlist lets it bypass workflow-index skill and text-edit CONTRACTS.md directly. Two sub-findings per Q-4: (a) `troop-tool-allowlist-narrowing` — constrain Write/Edit paths in agent frontmatter; (b) `workflow-index-write-gatekeeper` — skill becomes only legitimate writer.
3. Emit `## Confirmed Mitigations` subsection per Q-1 disposition citing the 2 refuted-claim mitigations (footgun #8 at `skills/build-execute/SKILL.md:437` + `skills/task-execution/SKILL.md:207`; footgun #10 at `skills/task-execution/SKILL.md:207`).

**acceptance_criteria**:
- Section `## Audit Findings — troop + task-execution` present with 6 `F-TR-*` rows + 1 `F-XP-1` compound headline.
- `## Confirmed Mitigations` subsection cites both refuted-claim mitigations with file:line content anchors.
- Every Severity field matches clarify Severity Assignments table.
- `grep -c "^| F-TR-" docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md` returns 6.
- Compound F-XP-1 row explicitly lists both sub-findings (a) and (b).

### Task 3: Cross-primitive coherence note + Phase F seed slate

**files_modified**: `docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md`

**read_first**:
- Tasks 1+2 output (this entity's two findings tables just authored)
- `## Clarify Annotations` Phase F seed slate (pre-locked 7 entries)

**skills**: none

**action**:
1. Append `## Cross-Primitive Coherence` section narrating where workflow-index + troop footguns compound. Headline insight: troop's Write/Edit on CONTRACTS.md bypasses workflow-index, AND workflow-index has no file-lock or status-transition guard — so a confused troop can silently corrupt the index with zero tripwire. Cite F-WI-1 + F-WI-2 + F-XP-1 as the compound surface.
2. Append `## Phase F Seed Slate` section with 7 seed blocks (6 HIGH + 1 LOW per clarify). Each seed block has:
   - `### Seed N: {slug}` heading
   - 1-2 sentence directive
   - Severity + source-finding back-reference (e.g., "from F-WI-1")
   - Scope boundary (what IS / IS NOT in seed's scope)
   - Model/profile hint (audit recommends Medium scale, default profile)
3. Seeds to emit (from clarify):
   - Seed 1: `workflow-index-file-locking` (HIGH, from F-WI-1)
   - Seed 2: `workflow-index-irreversibility-guard` (HIGH, from F-WI-2)
   - Seed 3: `workflow-index-worktree-race-serialization` (HIGH, from F-WI-3)
   - Seed 4: `troop-sandbox-enforcement` (HIGH, from F-TR-3)
   - Seed 5: `workflow-index-contracts-hygiene-diagnostic` (HIGH, from F-WI-5)
   - Seed 6: `troop-workflow-index-write-gatekeeper-compound` (HIGH, from F-XP-1; two sub-entities (a) troop-tool-allowlist-narrowing + (b) workflow-index-write-gatekeeper noted as child-candidates)
   - Seed 7: `build-execute-dispatch-guide-extraction` (LOW, from F-TR-6)

**acceptance_criteria**:
- Section `## Cross-Primitive Coherence` cites minimum 3 finding IDs (F-WI-*, F-TR-*, or F-XP-*).
- Section `## Phase F Seed Slate` contains 7 `### Seed N:` blocks numbered 1..7.
- `grep -c "^### Seed " docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md` returns 7.
- Each Seed block includes all 4 required sub-fields (directive / severity-backref / scope / model-hint).

### Task 4: Known-gap log + Stage Report: plan

**files_modified**: `docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md`

**read_first**:
- Tasks 1+2+3 output
- Clarify Known-Gap Log list (A-4, A-5, A-6, A-8, A-9)

**skills**: `spacedock:workflow-index` (append contract row for this entity entering plan stage, per build-plan Step 9a unconditional append).

**action**:
1. Append `## Known-Gap Log` section with per-finding accepted-as-v1-tradeoff narrative for MEDIUM/LOW findings NOT seeded:
   - F-WI-4 (MEDIUM, Supersedes column) — accepted: P-4 supersedes stays Notes-cell free-text; revisit if multi-supersede pattern emerges in 3+ entities.
   - F-TR-1 (MEDIUM, blocked_reason stringly-typed) — accepted: per 106 precedent; enum schema deferred to post-Phase-F threat-model pass.
   - F-TR-2 (MEDIUM, scope_observation sanitization) — accepted: internal-agent trust model; revisit if adversarial-troop scenario materializes.
   - F-TR-4 (MEDIUM, Circular-AC grep-context trust) — accepted: same-entity scope-narrow (106) is sufficient mitigation for confused-troop threat.
   - F-TR-5 (LOW, mod-hook logged-not-alarmed) — accepted: FO-log visibility sufficient; alarm channel deferred until cross-instance drift surfaces.
2. Invoke `spacedock:workflow-index` append-mode for this entity × `docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md` entering plan stage (status: in-flight, intent: audit).
3. Write `## Stage Report: plan` at end of entity body following Stage Report Protocol (Tasks 1-4 as checklist items with evidence, plus Confidence Assessment block).

**acceptance_criteria**:
- Section `## Known-Gap Log` contains 5 narrative entries (F-WI-4, F-TR-1, F-TR-2, F-TR-4, F-TR-5).
- `grep -c "^### Seed\|^| F-" docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md` returns finite positive count (sanity).
- CONTRACTS.md contains a row for this entity × this file × plan stage × audit intent × in-flight status.
- `## Stage Report: plan` present with 4 `[x]` task-complete items + `### Confidence Assessment` subsection.

## UAT Spec

**Captain UAT interaction (post-ship, async)**:

1. **Q-UAT-1 (findings-severity review)**: Open entity body. Read both findings tables. Confirm severity assignments match captain intent; reject with redirection if any finding feels mis-leveled. (Expected: all 11 findings land as clarify locked — 6 HIGH + 4 MEDIUM + 2 LOW.)
2. **Q-UAT-2 (Phase F seed scope)**: Read `## Phase F Seed Slate`. Confirm each of the 7 seeds has scope narrow enough for one Medium-scale entity. Reject seeds that bundle too much (e.g., if `workflow-index-file-locking` scope bleeds into `-irreversibility-guard`, demand split).
3. **Q-UAT-3 (compound-finding decomposition)**: Read F-XP-1 compound headline + sub-finding (a)+(b). Confirm sub-finding decomposition maps cleanly to 2 downstream entity candidates, not a single bundled entity.
4. **Q-UAT-4 (known-gap discipline)**: Read `## Known-Gap Log`. Confirm each accepted-as-v1 entry has explicit "revisit trigger" (threshold, pattern, or scenario) for future audit cycles. Reject if any gap is open-ended "accept forever".

**Pass criteria**: All 4 UAT items return captain approval. Any redirection feeds a review-stage re-plan, not a new entity.

**No automated UAT** — audit artifact is prose; mechanical checks covered by quality stage (structural grep counts in acceptance_criteria).

## Validation Map

| Target File | Audit Surface | Finding | Source Footgun | Clarify Anchor |
|-------------|--------------|---------|----------------|----------------|
| `skills/workflow-index/references/write-mode.md` | Atomicity block | F-WI-1 (file-locking) | Directive #4 cross-worktree races | A-1 |
| `skills/workflow-index/SKILL.md:46` | idempotent reads claim | F-WI-2 (irreversibility guard) | Directive #3 no final irreversibility | A-2 |
| `mods/workflow-index-maintainer.md` + skill tree | zero serialize keywords | F-WI-3 (worktree race serialization) | Directive #4 cross-worktree races | A-3 |
| `docs/build-pipeline/_index/CONTRACTS.md:7` | row schema header | F-WI-4 (supersedes column) | Directive #5 captain P-4 unenforced | A-4 |
| Angle (iii) sweep + `_archive/shape-pre-build-alignment-skill.md:882` | 8+ stale in-flight rows | F-WI-5 (CONTRACTS hygiene diagnostic) | Explore-surfaced (not in Directive) | A-10 |
| `skills/task-execution/SKILL.md:253` | blocked_reason free-text | F-TR-1 (blocked_reason stringly-typed) | Directive #6 + 106 HIGH finding | A-5 |
| `skills/task-execution/SKILL.md:216,248` | scope_observation/drift_class free-text | F-TR-2 (injection unprotected) | Directive #7 scope_observation | A-6 |
| `skills/build-execute/SKILL.md:166` + `agents/troop.md:4-7` | sandbox prompt + allowlist | F-TR-3 (sandbox enforcement) | Directive #9 worktree sandbox | A-7 |
| `skills/task-execution/SKILL.md:118-144` | Circular-AC Rule | F-TR-4 (Circular-AC grep-context) | Directive #11 Circular-AC trust | A-8 |
| `mods/workflow-index-maintainer.md:83,89-98` | error-handling block | F-TR-5 (logged-not-alarmed) | Directive #2 silent failure | A-9 |
| `skills/build-execute/SKILL.md` (missing file ref) | dead reference citation | F-TR-6 (dispatch-guide missing) | Explore-surfaced (Q-3) | Q-3 disposition |
| cross: `agents/troop.md` allowlist + `docs/build-pipeline/_index/CONTRACTS.md` | write bypass path | F-XP-1 compound (write-gatekeeper) | Explore-surfaced (Q-4) | Q-4 disposition |

## Plan-Checker Self-Review

**Dim 1 (scope fidelity)**: PASS — every deliverable in Directive lines 69-75 covered (findings table per primitive × Phase F candidate list × cross-primitive coherence × known-gap log). No scope creep into code-edit territory (Directive explicitly forbids).

**Dim 2 (acceptance_criteria completeness)**: PASS — each task has 3-4 mechanical ACs (grep counts + section-presence + field-presence). Circular-AC concern MEDIUM: Task 4's `grep -c "^### Seed\|^| F-"` covers Tasks 1-3 output indirectly; if a prior task slipped, Task 4's AC catches it.

**Dim 3 (file discipline)**: PASS — `files_modified` is entity body only (audit-intent entity pattern). No code-tree edits. Task 4 also touches CONTRACTS.md via skill invocation (unconditional per build-plan Step 9a) — declared in action step, not in files_modified (skill owns the file; caller doesn't).

**Dim 4 (dependency order)**: PASS — Task 1 → Task 2 (independent findings tables, but Task 2 references Task 1 severity format for consistency) → Task 3 (depends on both findings tables) → Task 4 (depends on 1-3 for Known-Gap cross-reference). Linear chain; no parallelism needed (audit prose is sequential author-intensive).

**Dim 5 (research backing)**: PASS — 5 Research Findings cited; audit-intent entity doesn't require external-tech validation; all assumptions grounded in explore Angle (iv) evidence.

**Dim 6 (UAT feasibility)**: PASS — 4 captain-interactive UAT items; no automated UAT required (prose artifact). Quality stage covers mechanical checks via acceptance_criteria grep counts.

**Dim 7 (workflow-index coherence)**: PASS — CONTRACTS.md append for this entity entering plan declared in Task 4 action step. No conflict with in-flight entities on overlapping file paths (entity body is scope-unique to 108). 107 is parked; 107's overlap on task-execution/SKILL.md is READ-only for 108 (audit, not edit) — no write conflict.

**Dim 8 (captain preferences)**: PASS — captain-first severity decisions already made in clarify; plan just authors the locked output. One-entity-per-HIGH cadence matches Medium-ship preference (MEMORY captain-preferences).

**Dim 9 (content anchors vs line numbers)**: PASS — every Location field spec requires content anchor (quoted substring OR file:line+quote). Line-number-only anchors explicitly flagged as AC violation.

**Dim 10 (known-gap discipline)**: PASS — Task 4 AC requires every gap entry to have explicit "revisit trigger" (mirrors UAT-4). No open-ended "accept forever" gaps allowed.

**Iteration count**: 1 (no blockers surfaced; all clarify-locked decisions flow through without revision).

### Confidence Assessment

**Composite: 96.5%** — Auto-advance eligible (>95% threshold per MEMORY fo-confidence-autoadvance).

5-factor breakdown:
- **Clarity of requirements (25% weight)**: 99% — clarify delivered locked severity table, Phase F seed slate, Q/A dispositions, known-gap list. No residual ambiguity.
- **Dependency risk (15% weight)**: 98% — no external code-edit dependencies; entity body is sole write target; CONTRACTS append is skill-mediated (routine).
- **Technical complexity (20% weight)**: 95% — audit-prose is low-complexity; risk is completeness (missing a finding citation) not correctness.
- **Testing/verification coverage (20% weight)**: 92% — mechanical acceptance criteria (grep counts) catch structural gaps; captain UAT covers semantic severity review. No automated prose-quality check.
- **Stakes/reversibility (20% weight)**: 99% — output is markdown prose; trivially reversible; findings become seed directives (captain has veto).

Weighted: 0.25·99 + 0.15·98 + 0.20·95 + 0.20·92 + 0.20·99 = 24.75 + 14.70 + 19.00 + 18.40 + 19.80 = **96.65%** → round to **96.5%**.

Verdict: **auto-advance eligible** (>95%). FO may dispatch execute stage without captain gate.

## Stage Report: plan

- [x] Research Findings authored (5 entries)
  RF-1 sharp-edges skill convention; RF-2 entity 106 precedent; RF-3 MEMORY audit-first; RF-4 session proof points; RF-5 Phase F seed format
- [x] PLAN authored (4 tasks)
  Task 1 workflow-index findings (5 rows); Task 2 troop+task-execution findings (6 rows + 1 compound); Task 3 coherence + 7 Phase F seeds; Task 4 known-gap log + Stage Report + CONTRACTS append
- [x] UAT Spec authored (4 captain items)
  Q-UAT-1 severity review; Q-UAT-2 seed scope; Q-UAT-3 compound decomposition; Q-UAT-4 known-gap revisit triggers
- [x] Validation Map authored (12 rows)
  Each target file ↔ audit surface ↔ finding ID ↔ source footgun ↔ clarify anchor
- [x] Plan-Checker self-review complete (10 dimensions PASS, iteration count 1)
  No blockers surfaced; clarify pre-locked decisions flow through without revision
- [x] Confidence Assessment computed (96.5% auto-advance eligible)
  5-factor weighted: 99 clarity / 98 dep-risk / 95 complexity / 92 testing / 99 stakes
- [x] CONTRACTS.md row appended for entity 108 × entity body × plan stage
  unconditional per build-plan Step 9a; row entered with status in-flight, intent audit

### Summary

Plan stage authored research-backed 4-task plan for audit-intent entity 108. Clarify had pre-locked all severity assignments, Phase F seed slate (7 total: 6 HIGH + 1 LOW), Q/A dispositions, and known-gap list — plan stage's job reduced to authoring the audit artifact template + mechanical acceptance criteria. Composite confidence 96.5% (auto-advance eligible). Files_modified is this entity body only — audit produces prose findings, not code edits (per Directive "Review-only"). Key design decision: Task 4 packs both the Known-Gap Log AND the workflow-index CONTRACTS append + Stage Report — keeps the build-plan Step 9a unconditional-append co-located with the final structural checkpoint so a mid-task abort cannot leave CONTRACTS un-appended while body appears complete.
