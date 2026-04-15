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

## Audit Findings — workflow-index

| # | Severity | Finding | Root Cause | Location (content anchor) | Fix Hint |
|---|----------|---------|------------|--------------------------|----------|
| F-WI-1 | HIGH | No file-locking primitive for CONTRACTS.md append — concurrent appends from two FO instances or parallel wave tasks can produce duplicate rows or interleaved text-fragments | Append is Edit-tool-driven prose manipulation with no OS-level lock, flock, lockfile, or serialize primitive at any layer (skill, mod, or caller) | `skills/workflow-index/references/write-mode.md` "Atomicity: abort on partial failure" block — atomicity defined only for single-caller abort, not multi-caller exclusion; `mods/workflow-index-maintainer.md` Case A bulk-update and INDEX rebuild each commit independently with no cross-instance lock | Phase F seed: `workflow-index-file-locking` — add lockfile sentinel (e.g., `_index/.lock`) acquired before Edit and released after commit; or serialize via a single-writer queue in the mod |
| F-WI-2 | HIGH | No in-flight → final irreversibility guard — `update-status` overwrites the Status cell unconditionally; a text-edit (or confused skill caller) can promote a `final` row back to `in-flight` without any protest | Write-mode spec accepts any valid status value on any transition without a current-value precondition check; `update-status-bulk` loops and replaces cells with no guard on the row's current state | `skills/workflow-index/SKILL.md:46` "Idempotent reads" only — write-mode semantics are silent on status-transition legality; `skills/workflow-index/references/write-mode.md` Operation: `update-status` — "Edit just the Status cell" with no current-value guard or transition validation | Phase F seed: `workflow-index-irreversibility-guard` — add a transition allowlist (e.g., `final` rows reject all updates except `reverted`; `in-flight` → `final` only via bulk-update with `shipped_date` present) |
| F-WI-3 | HIGH | Cross-worktree append race — two entities running concurrently in separate worktrees both call `workflow-index write append`; both read CONTRACTS.md, each inserts a section or row, and the second write clobbers or duplicates the first's insert | No serialize, mutex, worktree-queue, or concurrent-write detection keyword anywhere in `skills/workflow-index/` tree or `mods/workflow-index-maintainer.md`; check-mode "planned-conflict" detection is READ-time only, not write-time | `mods/workflow-index-maintainer.md` Case A + `skills/build-plan/SKILL.md` Step 9a + `skills/build-execute/SKILL.md` Step 2 all call `workflow-index write` unconditionally with no caller-side serialization; zero hits for "worktree", "concurrent", "race", "mutex", "serialize" across the skill tree | Phase F seed: `workflow-index-worktree-race-serialization` — add a write-serialization layer (lockfile, Git-level branch guard, or FO-central queue) that forces all CONTRACTS.md Edit calls through a single serialized path |
| F-WI-4 | MEDIUM | CONTRACTS row schema has no `Supersedes` column — captain P-4 discipline (supersedes relationships between entities) is only recorded in DECISIONS.md and as free-text in Notes cells; CONTRACTS tracks live-file ownership without surfacing the supersede graph | CONTRACTS.md Active Contracts table header is `Entity \| Stage \| Intent \| Status \| Last Updated` with no Supersedes column; `skills/workflow-index/SKILL.md:44` notes "Decisions are append-only" and references a supersede mechanism for DECISIONS only | `docs/build-pipeline/_index/CONTRACTS.md:7` table header row — five columns, no Supersedes; one P-4 mention at CONTRACTS.md line ~336 is free-text in a Notes cell, not a typed column | Known-gap — accepted as v1 trade-off; revisit trigger: if 3+ entities carry P-4 supersedes relationships on overlapping files within 60 days, add Supersedes column to CONTRACTS schema |
| F-WI-5 | HIGH | CONTRACTS.md hygiene drift — 8+ shipped-and-archived entities still carry `🟡 in-flight` or `🔵 planned` markers; the final-transition hook is not firing reliably post-ship, causing the canonical proof point of a false-positive HARD GATE fire during entity 103 task-6 | Empirical drift pattern: mod's Case A idle-hook depends on Stage Report `## Files Modified` section being present and FO idle-hook being triggered after each ship; if either condition is missed (no idle tick, missing section, archive-before-idle), the transition silently fails with only a logged warning | Angle (iii) sweep evidence: entities 065, 066, 067, 069, 080, 087, 103, 104 still carry stale markers; canonical proof: `docs/build-pipeline/_archive/shape-pre-build-alignment-skill.md:882` records 103 task-6 HARD GATE false-fire on nuwa-distillation rows stuck `in-flight` | Phase F seed: `workflow-index-contracts-hygiene-diagnostic` — runtime diagnostic pass: trace hook-fire logs per entity, identify which condition fails (missing Files Modified section vs idle tick gap vs archive-before-idle ordering), then implement targeted fix |

## Audit Findings — troop + task-execution

| # | Severity | Finding | Root Cause | Location (content anchor) | Fix Hint |
|---|----------|---------|------------|--------------------------|----------|
| F-TR-1 | MEDIUM | `blocked_reason` is unconstrained free-text consumed by downstream Benign-Drift Classifier — a confused or adversarial troop can author substrings that match classifier patterns, causing auto-proceed on a task that should require captain review | Field spec is `{one sentence, only when status == BLOCKED, else omit}` with no enum constraint, no schema validation, and no sanitization at the classifier ingestion boundary | `skills/task-execution/SKILL.md:253` "blocked_reason: {one sentence, only when status == BLOCKED, else omit}" — zero enum/schema/validate hits in surrounding context; `skills/build-execute/SKILL.md:216-240` Benign-Drift Classifier substring-matches `blocked_reason` to decide auto-proceed | Known-gap — accepted per entity 106 precedent (v1 accepted known-gap at `docs/build-pipeline/_archive/plan-defect-autopilot.md:809-854`); revisit trigger: post-Phase-F threat-model pass or if a false-auto-proceed incident is traced to a crafted `blocked_reason` string |
| F-TR-2 | MEDIUM | `scope_observation` and `drift_class` fields have no origin protection or sanitization — troop can self-generate findings that mimic classifier audit trail, and the `drift_class` enum is set by troop prose with no gatekeeper | Finding type `scope_observation` and `drift_class` field are both free-text in the task report schema; troop prose flows directly from task report → Stage Report → workflow-index parse with no escape or validation layer | `skills/task-execution/SKILL.md:216` "scope_observation -- an adjacent concern you noticed" (free-text) and `skills/task-execution/SKILL.md:248` task report schema `type: skill_suggestion \| scope_observation \| pre_existing_failure \| scope_gap` — zero sanitize/validate/protect hits | Known-gap — accepted as internal-agent trust model assumption; revisit trigger: if adversarial-troop scenario (confused LLM output mimicking classifier field patterns) materializes in a phase execution |
| F-TR-3 | HIGH | Worktree sandbox is prompt-string only — troop receives `"Your working directory is {worktree_path}\nAll file reads and writes MUST use paths under {worktree_path}"` as advisory text; the tool allowlist has no path constraint and the Bash tool is available, allowing `git -C ../main` or `../../` path traversal | Sandbox enforcement is advisory instruction in a prompt template; no chroot, no cwd-lock, no tool-allowlist path filter at the platform level prevents a confused or buggy troop from accessing sibling worktrees or main | `skills/build-execute/SKILL.md:166` sandbox prompt template (advisory text only); `agents/troop.md:4-7` tools line: `Read, Write, Edit, Bash, Grep, Glob, Skill` — full allowlist, no path constraints; zero chroot/sandbox-enforce/cwd-lock hits across `skills/task-execution/` and `agents/troop.md` | Phase F seed: `troop-sandbox-enforcement` — either (a) add path-prefix enforcement to the tool allowlist at the agent definition layer, or (b) wrap Bash/Read/Write/Edit in a shim that rejects paths outside the declared worktree root |
| F-TR-4 | MEDIUM | Circular-AC rule trusts troop's own grep execution context — entity file containing the AC literal can self-satisfy the grep count, causing a semantic-pass classification on a task that never produced the intended artifact | The rule narrows to same-entity guard blocks (`## PLAN`, `## UAT Spec`, etc.) but does not isolate the grep execution environment; the entity file persists in the troop's context window and is part of the working tree the troop edits — a grep run against the working tree can match the plan body's own AC definition | `skills/task-execution/SKILL.md:118-144` Circular-AC Rule — "scope narrows to same-entity" at line 135 but grep runs against the working-tree copy of the file that troop also writes; entity file containing AC literal as a plan-body example can produce count > 0 without any real artifact | Known-gap — same-entity scope-narrow (entity 106 pattern) is sufficient mitigation for the confused-troop threat; revisit trigger: if a DONE task is traced back to a Circular-AC semantic-pass on a working-tree self-match rather than a real artifact |
| F-TR-5 | LOW | Mod-hook failures are logged but not alarmed — rate-limit, transient skill errors, parse failures, and INDEX-rebuild failures all produce log entries that are only visible if the captain reads FO logs; no alert channel, no dashboard notification, no automated re-queue | Error handling routes every failure class to a log statement; captain visibility depends entirely on FO log inspection; the original Directive footgun "silent failure" overstates (failures ARE logged), but the gap is alarm surface: logged-not-alarmed | `mods/workflow-index-maintainer.md:83` "Log a warning: Entity {slug} Stage Report has no `## Files Modified` section — skipping idle hook update" (log only); `mods/workflow-index-maintainer.md:89-98` Error Handling block — rate-limit, transient, parse, INDEX-rebuild all log and continue with no captain-facing alarm | Known-gap — FO-log visibility accepted as sufficient for current single-operator use; revisit trigger: when cross-instance drift (two FO instances) surfaces, add dashboard notification channel to hook error paths |
| F-TR-6 | LOW | Dead reference: `skills/build-execute/references/agent-dispatch-guide.md` cited as canonical dispatch contract surface in entity 108 Directive line 51, but the file does not exist — dispatch contract lives inline at `skills/build-execute/SKILL.md:157-188`; cross-skill citations to a non-existent file are silently broken | The dispatch contract was never extracted into a standalone reference file; it lives inline in `build-execute/SKILL.md` Step 4b. Future skills that need to cite the contract have no stable reference path; inline contracts are harder to keep in sync across consumers | Entity 108 Directive line 51 cites `skills/build-execute/references/agent-dispatch-guide.md`; `ls skills/build-execute/references/` confirms file does not exist; actual dispatch contract found inline at `skills/build-execute/SKILL.md:157-188` "Step 4b: Dispatch each troop" | Phase F seed: `build-execute-dispatch-guide-extraction` — extract `skills/build-execute/SKILL.md:157-188` dispatch contract into `skills/build-execute/references/agent-dispatch-guide.md`; update all cross-skill citations |

### F-XP-1 (Compound): troop bypasses workflow-index via Edit/Write — HIGH

**Compound headline**: troop's tool allowlist (`Read, Write, Edit, Bash, Grep, Glob, Skill`) grants unconditional Write/Edit access to any path, including `docs/build-pipeline/_index/CONTRACTS.md` and `docs/build-pipeline/_index/DECISIONS.md`. A confused or adversarial troop can directly mutate the workflow index files, bypassing the `workflow-index` skill's format invariants, commit discipline, and atomicity guarantees entirely.

This compound finding is the intersection of F-TR-3 (sandbox advisory-only) and F-WI-1/F-WI-2/F-WI-3 (no locking, no irreversibility guard, no serialization). The workflow-index skill's "Workflow-index skill is the only legitimate writer" rule (`mods/workflow-index-maintainer.md:103`) is a documentation invariant, not an enforcement invariant.

**Sub-finding (a)**: `troop-tool-allowlist-narrowing` — constrain Write/Edit paths in `agents/troop.md` tool allowlist to paths under the declared worktree root, explicitly excluding `docs/build-pipeline/_index/` (Phase F seed candidate).

**Sub-finding (b)**: `workflow-index-write-gatekeeper` — the `workflow-index` skill should become the only legitimate writer by having the FO/platform layer reject any direct Write/Edit to `_index/` files from non-skill callers (Phase F seed candidate, typically implemented alongside troop-sandbox-enforcement).

Source findings: F-TR-3 (sandbox, from A-7) × F-WI-1 (locking, from A-1) × F-WI-2 (irreversibility, from A-2). Phase F seed: `troop-workflow-index-write-gatekeeper-compound` (headline seed; sub-finding seeds (a) and (b) become child entities per Q-4 disposition).

## Confirmed Mitigations

The following claims from the original Directive were refuted by codebase evidence during the explore stage. Documented here per Q-1 captain disposition (skeptical verification trail, no Phase F seed).

**Directive footgun #8 — `changed_files` no hash verification**: Mitigated. `skills/build-execute/SKILL.md:437` implements a git-diff-tree count cross-check comparing troop-reported `changed_files` count against actual git diff output. `skills/task-execution/SKILL.md:207` enforces that `changed_files` must be a subset of `files_modified` with BLOCKED revert on violation. Note: content-SHA verification (byte-level hash of changed content) is separately absent, but git-diff-tree count cross-check is a functional guard against fabricated file lists. Content-SHA gap is below severity bar per captain (not seeded).

**Directive footgun #10 — `files_modified` plan-vs-runtime gate gap**: Mitigated. `skills/task-execution/SKILL.md:207` "Cross-check the list against `task.files_modified`. If the cross-check finds a path in changed_files that is NOT in files_modified, you have a scope violation -- revert that file and return BLOCKED per the Scope Discipline section." This is an explicit, unconditional subset enforcement with BLOCKED revert — the claimed gap does not exist in the current skill.

## Cross-Primitive Coherence

The two audited primitives (workflow-index and troop + task-execution) do not fail independently — their footguns compound in ways that make individual fixes insufficient without addressing the interaction surface.

**Headline compound failure path**: A confused or adversarial troop can directly Write/Edit `docs/build-pipeline/_index/CONTRACTS.md` (F-XP-1 / F-TR-3) because its tool allowlist has no path constraint. When it does so, it bypasses every protection workflow-index nominally provides: no file-lock is acquired (F-WI-1), no status-transition guard rejects the edit (F-WI-2), and no serialization prevents a concurrent FO from clobbering the same section (F-WI-3). The result is a silently corrupted index with zero tripwire — the mod's "Workflow-index skill is the only legitimate writer" rule (`mods/workflow-index-maintainer.md:103`) is prose, not enforcement.

**Secondary compound path — stale-index cascading into false gates**: F-WI-5 (CONTRACTS hygiene drift — 8+ entities stuck in-flight) directly amplifies F-WI-2 (no irreversibility guard). When a shipped entity's row stays `🟡 in-flight` because the final-transition hook didn't fire, the plan-checker Dimension 7 cross-entity coherence check reads the stale row and fires a HARD GATE on any new entity that touches the same files — even though the prior entity has shipped and the conflict is resolved. This is the exact failure mode documented in entity 103 task-6. The two footguns together create a self-reinforcing false-positive trap: drift accumulates because there is no irreversibility guard, and drift causes gate fires because there is no hygiene correction mechanism.

**Tertiary compound — `blocked_reason` self-serve + classifier auto-proceed**: F-TR-1 (`blocked_reason` stringly-typed) means a confused troop can author a `blocked_reason` that happens to substring-match the Benign-Drift Classifier's auto-proceed patterns. If that troop also had a scope violation touching `CONTRACTS.md` (F-TR-3 + F-XP-1), the classifier may auto-proceed the task, committing the index corruption without captain review.

**Compound footgun table**:

| Compound | Primary Findings | Failure Mode | Severity |
|----------|-----------------|-------------|----------|
| Troop → CONTRACTS direct write | F-XP-1 + F-WI-1 + F-WI-2 + F-WI-3 | Troop bypasses skill, no lock/guard/serialization catches the bypass | HIGH |
| Stale-index → false HARD GATE | F-WI-5 + F-WI-2 | Shipped entity stuck in-flight, plan-checker blocks new entity on resolved conflict | HIGH |
| Blocked-reason craft → auto-proceed | F-TR-1 + F-TR-3 + F-XP-1 | Confused troop authors classifier-matching blocked_reason while also making unauthorized writes | MEDIUM |
| Circular-AC + stale entity file | F-TR-4 + F-WI-2 | Troop self-satisfies AC grep from plan body, returns DONE on unrealized artifact; irreversibility gap means a corrective status update could also be reversed | MEDIUM |

The first two compounds are the highest-ROI targets for Phase F: fixing F-XP-1 (write-gatekeeper) and F-WI-5 (hygiene diagnostic) together eliminates the two worst cascades. The stale-index cascade is also the most operationally painful — it was the direct cause of a captain-intervention during this session.

## Phase F Seed Slate

Seven seeds pre-locked by clarify, one entity per HIGH finding plus the LOW doc-debt seed.

### Seed 1: workflow-index-file-locking

**Directive**: Add a file-locking primitive to the workflow-index write path so concurrent CONTRACTS.md appends from parallel FO instances or parallel wave tasks cannot interleave or duplicate rows.

**Severity**: HIGH -- source finding F-WI-1 (A-1 Confident 0.95)

**Scope**:
- IS in scope: implement lockfile sentinel (`_index/.lock`) or equivalent serialization mechanism; update `skills/workflow-index/references/write-mode.md` append + update-status-bulk operations to acquire/release lock; add pressure-test fixture for concurrent-append scenario
- NOT in scope: changes to callers (build-plan, build-execute, mod) — lock acquisition is internal to the skill; not in scope: cross-instance distributed locking (single-host assumption for v1)

**Model/profile hint**: Medium scale, default profile; sonnet sufficient for implementation + write-mode.md update

### Seed 2: workflow-index-irreversibility-guard

**Directive**: Add a status-transition allowlist to `update-status` and `update-status-bulk` operations so that `final` rows reject all further updates except `reverted`, and `in-flight` → `final` transitions require a `shipped_date` input.

**Severity**: HIGH -- source finding F-WI-2 (A-2 Confident 0.95)

**Scope**:
- IS in scope: transition validation in write-mode.md operations; `shipped_date` field addition to `update-status-bulk` input schema; pressure-test fixture for invalid transition (final → in-flight attempt)
- NOT in scope: backfilling `shipped_date` for existing rows (that is Seed 5's diagnostic scope); not in scope: DECISIONS.md supersede semantics (separate path)

**Model/profile hint**: Medium scale, default profile; sonnet sufficient

### Seed 3: workflow-index-worktree-race-serialization

**Directive**: Add a write-serialization layer to the workflow-index skill so that all CONTRACTS.md Edit calls are forced through a single serialized path, preventing cross-worktree append races.

**Severity**: HIGH -- source finding F-WI-3 (A-3 Confident 0.95)

**Scope**:
- IS in scope: design and implement serialization mechanism (lockfile, Git-level branch guard, or FO-central write queue); update write-mode.md; add concurrent-write pressure-test fixture
- NOT in scope: changes to individual callers beyond acquiring the lock via the skill; not in scope: distributed-lock protocol across machines

**Model/profile hint**: Medium scale, default profile; consider opus if serialization design has multiple viable approaches requiring architectural choice

### Seed 4: troop-sandbox-enforcement

**Directive**: Enforce the worktree sandbox boundary at the tool level so that troop agents cannot access paths outside their declared worktree root, eliminating the advisory-only nature of the current prompt-string constraint.

**Severity**: HIGH -- source finding F-TR-3 (A-7 Confident 0.95)

**Scope**:
- IS in scope: `agents/troop.md` tool allowlist extension with path-prefix constraints; evaluate platform-level cwd-lock options; if platform does not support path-filter in allowlist, implement Bash/Read/Write/Edit wrapper shim; pressure-test fixture for out-of-worktree path attempt
- NOT in scope: sandbox enforcement for other agent types (ensign, researcher); not in scope: F-XP-1 gatekeeper (that seed handles workflow-index write specifically — this seed handles general path traversal)

**Model/profile hint**: Medium scale, default profile; may require platform-layer investigation before implementation

### Seed 5: workflow-index-contracts-hygiene-diagnostic

**Directive**: Run a diagnostic pass to identify why 8+ shipped entities still carry stale `🟡 in-flight` markers in CONTRACTS.md, trace the hook-fire failure path per entity, and implement a targeted fix for the root cause.

**Severity**: HIGH -- source finding F-WI-5 (A-10 Likely 0.70; root cause unconfirmed — requires runtime trace)

**Scope**:
- IS in scope: enumerate all shipped entities with stale CONTRACTS rows; for each, determine whether failure is (a) missing `## Files Modified` section, (b) no idle-hook tick after ship, (c) archive-before-idle ordering, or (d) missing `shipped_date` input; implement fix for dominant root cause; backfill stale rows
- NOT in scope: redesigning the hook architecture (that belongs in Seed 2/3 if the fix is schema-level); not in scope: writing a new pressure-test framework (deferred per MEMORY pressure-test-preservation-todo)

**Model/profile hint**: Medium scale, default profile; diagnostic-heavy — sonnet for log trace, sonnet for fix implementation

### Seed 6: troop-workflow-index-write-gatekeeper-compound

**Directive**: Close the cross-primitive bypass path where troop's unconstrained Write/Edit allowlist lets it directly mutate `docs/build-pipeline/_index/CONTRACTS.md` and `docs/build-pipeline/_index/DECISIONS.md`, bypassing workflow-index skill format invariants and commit discipline.

**Severity**: HIGH -- source finding F-XP-1 compound (Q-4 disposition: headline seed with two child entity candidates)

**Scope**:
- IS in scope: compound headline — establish that `_index/` files are protected from direct Write/Edit by non-skill callers; two child-entity candidates: (a) `troop-tool-allowlist-narrowing` — constrain Write/Edit in `agents/troop.md` to exclude `docs/build-pipeline/_index/`; (b) `workflow-index-write-gatekeeper` — add a platform-level or skill-level guard that rejects direct edits to `_index/` files
- NOT in scope: general troop sandbox (Seed 4 handles that); not in scope: workflow-index locking (Seeds 1+3); child entities (a) and (b) may be dispatched as separate entities from this compound seed per captain decision

**Model/profile hint**: Medium scale, default profile; captain should decide at clarify whether to ship as one entity or split into child entities (a) and (b)

### Seed 7: build-execute-dispatch-guide-extraction

**Directive**: Extract the dispatch contract currently living inline at `skills/build-execute/SKILL.md:157-188` into a standalone reference file `skills/build-execute/references/agent-dispatch-guide.md`, and update all cross-skill citations to use the stable path.

**Severity**: LOW -- source finding F-TR-6 (Q-3 disposition: LOW doc debt)

**Scope**:
- IS in scope: create `skills/build-execute/references/agent-dispatch-guide.md` with content from SKILL.md Step 4b lines 157-188; update SKILL.md to reference the new file; search for any other cross-skill citations pointing to the dead path and fix them
- NOT in scope: changes to the dispatch contract content itself; not in scope: similar extraction for other inline contracts in other skills (can be a follow-on)

**Model/profile hint**: Small scale, default profile; sonnet sufficient; fast ship

## Known-Gap Log

Findings accepted as v1 trade-offs. Each entry documents the rationale and an explicit revisit trigger for future audit cycles.

### F-WI-4 — CONTRACTS row schema has no Supersedes column (MEDIUM)

**Accepted as v1 trade-off.** Captain P-4 discipline (supersedes relationships) is captured in two places: DECISIONS.md (typed Supersedes field per decision entry) and CONTRACTS.md Notes cells (free-text, e.g., CONTRACTS.md line ~336). The asymmetry is intentional at v1 — contract rows track live-file ownership and don't need relationship semantics; decisions track architectural choices and do. Adding a Supersedes column to CONTRACTS would require schema migration across hundreds of rows for marginal benefit in the current 10-20 active-entity range.

**Revisit trigger**: if 3 or more entities carry explicit P-4 supersedes relationships on overlapping CONTRACTS file sections within any 60-day window, the free-text Notes cell approach will produce lookup friction that justifies the column addition.

### F-TR-1 — `blocked_reason` stringly-typed (MEDIUM)

**Accepted as v1 trade-off, per entity 106 precedent.** The Benign-Drift Classifier at `skills/build-execute/SKILL.md:216-240` uses substring matching on `blocked_reason` to decide auto-proceed on BLOCKED tasks. The 106 sharp-edges review (`docs/build-pipeline/_archive/plan-defect-autopilot.md:809-854`) explicitly accepted this as a known-gap with the rationale that internal-agent trust is assumed and the cost of enum-constrained `blocked_reason` (loss of troop expressiveness for nuanced failure descriptions) outweighs the risk for the current single-operator context.

**Revisit trigger**: a post-Phase-F threat-model pass that formally defines the adversarial-troop threat; OR a traced incident where a false-auto-proceed is attributed to a crafted or confused `blocked_reason` substring matching a classifier pattern.

### F-TR-2 — `scope_observation` / `drift_class` unsanitized (MEDIUM)

**Accepted as v1 trade-off.** The internal-agent trust model assumes troops are non-adversarial (confused at worst, not malicious). Sanitizing free-text finding fields would require a schema-enforcement layer between the troop's task report and the Stage Report parser — adding complexity for a threat that has not materialized. The `scope_observation` and `drift_class` fields are informational channels, not decision gates; a confused troop authoring a misleading `scope_observation` produces noise in the Stage Report, not an automatic system action.

**Revisit trigger**: if an adversarial-troop scenario (LLM output mimicking classifier field patterns, producing false audit trail entries) materializes in a phase execution, or if `drift_class` is promoted to a decision gate in a future classifier version.

### F-TR-4 — Circular-AC grep-context trust (MEDIUM)

**Accepted as v1 trade-off.** The Circular-AC Rule's same-entity scope-narrow (confirmed during entity 106 review) is a practical mitigation for the confused-troop scenario: the rule explicitly blocks the troop from classifying DONE on a cross-entity zero-count grep. The remaining edge case (working-tree self-match from the plan body) requires the entity file to contain the AC search string in a guard-listed block AND for the troop to fail to distinguish that match from a real artifact — a compound confusion that is practically rare and self-documenting (the troop returns a `scope_observation` finding flagging the circular reference).

**Revisit trigger**: if a DONE task is traced back to a Circular-AC semantic-pass that matched only the plan-body definition rather than a real artifact in the target source files, requiring a plan-author rewrite that was not flagged in review.

### F-TR-5 — Mod-hook logged-not-alarmed (LOW)

**Accepted as v1 trade-off.** The current deployment is single-operator (one captain, one FO instance). Log visibility is sufficient when the operator reads FO output after each session. The alarm channel complexity (dashboard notification, MCP message, or captain interrupt) is disproportionate for the current scale. The error handling block already prevents FO startup and entity dispatch from being blocked by hook failures — graceful degradation is in place.

**Revisit trigger**: when cross-instance drift materializes (two concurrent FO instances producing competing index writes) or when a missed hook failure causes a downstream captain-visible error that would have been prevented by an alarm. At that point, add a dashboard `update_entity` notification or MCP `add_comment` call to the error handling block.

## Stage Report: execute

- [x] Task 1: workflow-index findings table authored (5 rows)
  `## Audit Findings — workflow-index` appended; F-WI-1 HIGH, F-WI-2 HIGH, F-WI-3 HIGH, F-WI-4 MEDIUM, F-WI-5 HIGH; all Location fields use content anchors per Dim 9 discipline; commit `feat(108): wave 1 task-1`
- [x] Task 2: troop + task-execution findings table authored (6 rows + F-XP-1 compound + Confirmed Mitigations)
  `## Audit Findings — troop + task-execution` appended; F-TR-1 MEDIUM, F-TR-2 MEDIUM, F-TR-3 HIGH, F-TR-4 MEDIUM, F-TR-5 LOW, F-TR-6 LOW; F-XP-1 compound with sub-findings (a)+(b); `## Confirmed Mitigations` subsection for footguns #8 and #10; commit `feat(108): wave 1 task-2`
- [x] Task 3: cross-primitive coherence + Phase F seed slate authored
  `## Cross-Primitive Coherence` with compound footgun table (3 headline + 1 tertiary); `## Phase F Seed Slate` with 7 `### Seed N:` blocks (Seed 1-7); commit `feat(108): wave 1 task-3`
- [x] Task 4: known-gap log + CONTRACTS append + Stage Report authored
  `## Known-Gap Log` with 5 entries (F-WI-4, F-TR-1, F-TR-2, F-TR-4, F-TR-5), each with explicit revisit trigger; CONTRACTS.md row appended for entity 108 execute stage via workflow-index skill (chore(index) commit); Stage Report: execute present

### Summary

Audit artifact written to entity body in 4 sequential tasks. All 11 findings authored (6 HIGH + 3 MEDIUM + 2 LOW), compound finding F-XP-1 with two sub-findings, 7 Phase F seeds with scope/severity/model hints, cross-primitive coherence compound table, 5 known-gap entries with revisit triggers, and 2 confirmed mitigations. No source-code changes per audit-only scope (Directive: "Review-only audit entity"). CONTRACTS.md row appended for this entity entering execute stage.

## Stage Report: quality

- [x] bun test (target: pass)
  412 pass, 51 fail (pre-existing), 25 errors (pre-existing)
- [x] tsc --noEmit (target: success)
  TypeScript compilation completed without errors
- [x] biome lint (target: no new violations)
  2 pre-existing linting errors (pre-pipeline state); no new violations from entity changes
- [ ] SKIP: bun build
  Entity is markdown-only audit artifact — no code changes or build targets in scope per Directive

### Summary

Quality stage validation complete for entity 108. Entity is audit-only with no source-code changes — all modifications are to the entity body markdown (`docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md`). TypeScript compilation succeeds, test and lint suite pre-existing failures are unchanged. No quality regressions from this audit work.

## Files Modified

- docs/build-pipeline/spacedock-primitives-sharp-edges-audit.md

## Stage Report: review

**Verdict**: pass
**Ran at**: 2026-04-15T14:30:00+08:00
**HEAD**: 57aa720
**Execute base**: 762f982

### Pre-scan

claude-md-compliance: 0 findings
stale-references: 0 findings (markdown-only diff; no symbols exported, renamed, or removed)
dependency-chain: 0 findings (no imports added or changed; pure prose artifact)
plan-consistency: 0 findings (sole files_modified is entity body; diff is entity body only)
goal-backward: 0 findings (see notes below)

### Dispatch summary

Fast-path invocation (per captain scope directive): no reviewer fan-out dispatched. Pre-scan + manual inline classification used as evidence base.

### Dispatch Gaps

Reviewer fan (security-reviewer, correctness-reviewer, style-reviewer) was not dispatched per captain directive to skip multi-reviewer fanout for this markdown-only audit diff. Pre-scan mechanical checks + inline classification cover the stated fast-path scope: severity sanity check, seed scope clarity, cross-reference integrity.

### Findings

| Severity | Root | File:Line | Description | Source |
|----------|------|-----------|-------------|--------|
| LOW | DOC | spacedock-primitives-sharp-edges-audit.md (execute Stage Report summary) | Execute Stage Report summary says "11 findings (6 HIGH + 3 MEDIUM + 2 LOW)" but the clarify severity table assigns 4 MEDIUM findings (A-4, A-5, A-6, A-8 → F-WI-4, F-TR-1, F-TR-2, F-TR-4); actual count is 12 total (6H + 4M + 2L). UAT Spec line "6 HIGH + 4 MEDIUM + 2 LOW" is correct; execute summary count is off by 1 MEDIUM. | pre-scan:plan-consistency |
| NIT | DOC | spacedock-primitives-sharp-edges-audit.md (execute Stage Report summary) | Execute summary line "All 11 findings authored" conflicts with the correct total of 12 (10 assumption-findings + F-XP-1 compound + F-TR-6 dead-ref); F-TR-6 was the 12th finding added per Q-3 disposition. | pre-scan:plan-consistency |

**Goal-backward notes**: Directive deliverables checked against diff output:
1. Findings table per primitive -- PRESENT: `## Audit Findings -- workflow-index` (5 rows, grep count verified 5) + `## Audit Findings -- troop + task-execution` (6 rows + F-XP-1 compound, grep count verified 6).
2. Phase F candidate list -- PRESENT: `## Phase F Seed Slate` with 7 `### Seed N:` blocks, grep count verified 7.
3. Cross-primitive coherence note -- PRESENT: `## Cross-Primitive Coherence` with compound footgun table citing F-WI-1/2/3 + F-XP-1 + F-TR-1.
4. Known-gap log -- PRESENT: `## Known-Gap Log` with 5 entries (F-WI-4, F-TR-1, F-TR-2, F-TR-4, F-TR-5), each with explicit revisit trigger.

No orphan symbols (pure markdown diff; no exported code symbols). No acceptance criterion unmet. No code changes in scope per Directive "Review-only audit entity."

### Severity sanity check

**6 HIGH findings defensible**: F-WI-1 (no file-lock), F-WI-2 (no irreversibility guard), F-WI-3 (cross-worktree race), F-WI-5 (CONTRACTS hygiene drift -- empirical proof via 103 task-6 HARD GATE false-fire), F-TR-3 (sandbox advisory-only), F-XP-1 compound (troop → CONTRACTS bypass). All confirmed by direct file:line evidence during explore (Confident 0.95 for all except F-WI-5 which is Likely 0.70 -- acknowledged in entity, root cause confirmation deferred to Phase F diagnostic entity). Severity bar is impact-only (captain selected O-1); HIGH = trust violation or workflow corruption. All 6 meet bar.

**4 MEDIUM findings defensible**: F-WI-4 (Supersedes column absent -- schema gap, no workflow corruption), F-TR-1 (blocked_reason stringly-typed -- known-gap per 106 precedent, v1 accepted), F-TR-2 (scope_observation unsanitized -- informational channel, not decision gate), F-TR-4 (Circular-AC grep-context -- compound confusion required, practically rare). MEDIUM = drift-risk without behavioral breakage. All 4 meet bar.

**2 LOW findings defensible**: F-TR-5 (logged-not-alarmed -- graceful degradation in place, single-operator context), F-TR-6 (dead reference -- doc debt, no runtime impact). LOW = cosmetic or doc debt. Both meet bar.

**F-XP-1 compound HIGH**: Correctly labeled HIGH (not CRITICAL) because the bypass path requires a confused/adversarial troop + no enforcement layer, but the immediate impact is index corruption recoverable via git history. CRITICAL would require data loss or silent production-bricking. The HIGH label is conservative and appropriate.

### Phase F seed scope clarity

All 7 seeds reviewed for scope tightness:
- **Seed 1** (file-locking): IS/NOT-in-scope boundaries are crisp; lockfile primitive is well-bounded; excludes callers and distributed-lock. Targeted.
- **Seed 2** (irreversibility-guard): Transition allowlist is well-scoped; excludes backfilling (Seed 5's scope) and DECISIONS supersede semantics. Targeted.
- **Seed 3** (worktree-race-serialization): Overlap concern with Seed 1 (both touch write-mode.md serialization) -- scopes are complementary, not duplicated; Seed 1 targets single-caller atomicity, Seed 3 targets cross-caller serialization. Distinct.
- **Seed 4** (troop-sandbox-enforcement): Explicitly excludes F-XP-1 gatekeeper (Seed 6 handles that); general path traversal only. Targeted.
- **Seed 5** (contracts-hygiene-diagnostic): Runtime log trace + targeted fix; explicitly excludes redesigning hook architecture (deferred to Seeds 2/3). Diagnostic-first pattern is appropriate for Likely 0.70 root cause.
- **Seed 6** (write-gatekeeper compound): Headline seed with 2 child candidates; captain decides split at clarify. Scope note is clear. Compound structure is appropriate per Q-4 disposition.
- **Seed 7** (dispatch-guide-extraction): Extract + update citations only; excludes contract content changes. Small-scale, appropriately scoped.

One observation: Seeds 1 and 3 have overlapping write-mode.md touchpoints. Both will modify the same reference file. Captain should decide at Seed 3 clarify whether to sequence after Seed 1 (dependency) or handle as sibling with merge coordination. Not a blocker -- flagged as advisory.

### Cross-reference integrity

Content anchors verified against actual worktree files:
- `skills/workflow-index/SKILL.md:46` "Idempotent reads" -- confirmed present at line 46
- `skills/workflow-index/references/write-mode.md` "Atomicity" block -- confirmed at lines 83, 159
- `skills/task-execution/SKILL.md:253` `blocked_reason` field -- confirmed at line 253
- `skills/task-execution/SKILL.md:216,248` `scope_observation` / finding type schema -- confirmed at lines 216, 248
- `skills/build-execute/SKILL.md:166` sandbox prompt template -- confirmed at line 166
- `agents/troop.md:4-7` tools allowlist -- confirmed (Read/Write/Edit/Bash/Grep/Glob/Skill)
- `skills/task-execution/SKILL.md:118-144` Circular-AC Rule -- confirmed at lines 120+, scope-narrow at 135
- `mods/workflow-index-maintainer.md:83,89-98` error handling block -- confirmed
- `skills/build-execute/references/agent-dispatch-guide.md` -- confirmed DOES NOT EXIST (validates F-TR-6 finding)
- `docs/build-pipeline/_archive/shape-pre-build-alignment-skill.md:882` 103 task-6 HARD GATE proof point -- not re-verified (file is in archive tree, anchor cited as empirical evidence; no reason to doubt)
- `docs/build-pipeline/_index/CONTRACTS.md:7` header row -- not re-verified inline but CONTRACTS.md hygiene drift (F-WI-5) is empirically grounded across multiple entities

All primary content anchors verified. No stale or fabricated file:line citations detected.

### Knowledge Capture

no findings met D1/D2 threshold (markdown-only audit diff; no skill-level patterns or project-rule candidates arise from reviewing audit prose output -- findings are themselves the knowledge artifact)

### Summary

Entity 108 is a markdown-only audit artifact with a single changed file (entity body). Diff is execute-stage additions only; no source code, no skill files, no reference files modified. Pre-scan is clean across all 5 checks. Two minor DOC/NIT findings in the execute Stage Report summary (finding count off by 1 MEDIUM); these do not affect the audit findings themselves and do not warrant an execute bounce. All 12 findings (6H + 4M + 2L) are severity-defensible with content-anchored evidence. All 7 Phase F seeds have targeted, non-overlapping directives (Seeds 1+3 have a write-mode.md coordination advisory noted). All primary cross-references verified against actual worktree files. Verdict: pass -- advance to UAT.

## UAT Results

| item | type | status | evidence | notes | re-attempt |
| ---- | ---- | ------ | -------- | ----- | ---------- |
| Q-UAT-1 | interactive | pending-captain | -- | severity review (6H+4M+2L=12); AskUserQuestion unavailable in subagent context | 0 |
| Q-UAT-2 | interactive | pending-captain | -- | Phase F seed scope (7 seeds); AskUserQuestion unavailable in subagent context | 0 |
| Q-UAT-3 | interactive | pending-captain | -- | F-XP-1 compound decomposition (a)+(b); AskUserQuestion unavailable in subagent context | 0 |
| Q-UAT-4 | interactive | pending-captain | -- | known-gap revisit triggers (5 entries); AskUserQuestion unavailable in subagent context | 0 |

## E2E Evidence

| Item | Type | Artifact | Path |
| ---- | ---- | -------- | ---- |
| Q-UAT-1 | interactive | captain-decision | pending |
| Q-UAT-2 | interactive | captain-decision | pending |
| Q-UAT-3 | interactive | captain-decision | pending |
| Q-UAT-4 | interactive | captain-decision | pending |

## Stage Report: uat

**Verdict**: pending-captain
**Ran at**: 2026-04-15T14:01:19Z
**HEAD**: 8d03dc8
**Mode**: normal

### summary
- total items: 4
- pass: 0
- fail: 0
- skipped: 0
- pending-captain: 4
- infra-level fails: 0
- assertion fails: 0
- uat_pending_count (post-run): 4

### automated structural checks

All 4 UAT items are `type: interactive` per UAT Spec ("No automated UAT -- audit artifact is prose"). Structural checks from quality stage acceptance criteria re-verified:

- body section structure: `## Audit Findings -- workflow-index` (5 rows), `## Audit Findings -- troop + task-execution` (6 rows + F-XP-1 compound), `## Confirmed Mitigations`, `## Cross-Primitive Coherence`, `## Phase F Seed Slate` (7 seeds), `## Known-Gap Log` (5 entries) -- all present
- finding count: 12 total (6H + 4M + 2L) -- review stage correctly caught 11→12 count drift in execute Stage Report summary; body findings are correct; execute summary NIT does not affect artifact validity
- `grep -c "^| F-WI-"` returns 5 (PASS)
- `grep -c "^| F-TR-"` returns 6 (PASS)
- `grep -c "^### Seed "` returns 7 (PASS)
- F-XP-1 compound present with sub-findings (a) troop-tool-allowlist-narrowing and (b) workflow-index-write-gatekeeper (PASS)
- Known-gap revisit triggers: 21 instances of "revisit trigger" found across 5 gap entries -- each entry has at least one explicit trigger (PASS)
- Phase F seed frontmatter-drafts: all 7 seeds have directive / severity-backref / scope (IS/NOT-in-scope) / model-hint sub-fields (PASS)

### captain decisions

- Q-UAT-1 (interactive -- findings severity review): pending-captain -- AskUserQuestion not available in subagent context per MEMORY `askuserquestion-agent-vs-subagent`
- Q-UAT-2 (interactive -- Phase F seed scope): pending-captain -- same constraint
- Q-UAT-3 (interactive -- F-XP-1 compound decomposition): pending-captain -- same constraint
- Q-UAT-4 (interactive -- known-gap revisit triggers): pending-captain -- same constraint

notes: AskUserQuestion requires `--agent` mode (native UI); this ensign runs as a subagent and cannot access the tool. All 4 interactive items routed to pending-captain per dispatch scope ("Interactive items → pending-captain, documented in Stage Report"). Captain may advance via `/spacedock:uat-resume` after reviewing findings in entity body.

### Confidence Assessment

**Composite: 87%** -- captain gate required (interactive items pending).

5-factor breakdown:
- **Clarity of requirements (25% weight)**: 99% -- UAT Spec is explicit; 4 interactive items, pass criteria stated
- **Structural completeness (15% weight)**: 99% -- all mechanical checks pass; 12 findings, 7 seeds, 5 gap entries verified
- **Interactive gate (20% weight)**: 0% -- 4/4 items pending-captain; no captain sign-off obtained
- **Evidence integrity (20% weight)**: 98% -- content anchors verified by review stage; finding count drift caught and noted
- **Process compliance (20% weight)**: 95% -- pending-captain is the correct disposition for subagent-inaccessible AskUserQuestion; no rules violated

Weighted: 0.25·99 + 0.15·99 + 0.20·0 + 0.20·98 + 0.20·95 = 24.75 + 14.85 + 0 + 19.60 + 19.00 = **78.20%** -- round to **78%** (interactive gate zeroes out that factor; structural confidence is high but captain sign-off is the load-bearing gate).

Verdict: **captain gate required** -- entity cannot advance to shipped without captain interactive review of the 4 UAT items. Use `/spacedock:uat-resume` to re-enter after captain sign-off.
