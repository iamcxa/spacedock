---
id: 108
title: Sharp-edges audit of spacedock primitives -- workflow-index + troop contract
status: execute
context_status: ready
source: captain directive (2026-04-15 post-103/106 ship session — session evidence of workflow-index lifecycle gap + troop trust surface)
created: 2026-04-15T13:45:00+08:00
started: 2026-04-15T13:50:00+08:00
completed:
verdict:
score: 0.965
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
