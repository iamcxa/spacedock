---
id: 112
title: Graft Backward-Compat and Localization Hardening -- Migration + Bug Sweep (101b)
status: brainstorm
context_status: pending
source: entity 101 explore+clarify decomposition (2026-04-15 O-1 option-b 2-way split + Q-3 option-1 spawn-at-handoff)
created: 2026-04-15T18:55:00+08:00
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
parent: 101
children:
depends-on: [101]
---

## Directive

Migration + bug-cleanup follow-on to 101's graft runtime overlay redesign. 101 ships the new architecture (manifest.yaml source_hash schema, `.origin/` elimination, LOCAL.yaml runtime apply); 112 ships the migration path + orthogonal bug fixes that would otherwise bloat 101 above Medium scope.

### Scope (6 deliverables per 101 Decomposition Recommendation)

1. `graft migrate` subcommand (per Directive AC L132) — converts carlove's `.origin/` format to new manifest+hash format
2. Bug #14 fix: root-script false-positive detection (skip stub scripts at root)
3. Bug #15 fix: pre-write diff/confirm before overwriting existing `.claude/skills` / `.claude/agents` files
4. Bug #16 fix: `mkdir -p .claude/skills/{name}/` at init
5. Bug #17 fix: verbatim validation glob for local plugin installs
6. Bug #19 fix: post-init smoke test (load skills, verify no import errors)

### Validation

Re-run carlove `graft migrate` + full pressure-test sweep #14-22 on real carlove graft directory (per 101 explore postmortem).

### Out of scope

- 101's architecture redesign (source_hash schema, LOCAL.yaml, hash-upgrade) — belongs to 101
- New bugs discovered during execute — either in-scope triage OR spawn follow-up (per scope discipline)

## Captain Context Snapshot

Spawned at 101 handoff per Q-3 option-1 decision. Parent 101 scope is architecture-only; 112 absorbs migration + bug cleanup to keep both entities at Medium. Depends-on 101 to inherit the new manifest+hash format before the migration subcommand can target it.

Domain: `spacedock-graft-hardening`.

Parent 101 explore+clarify output lives in `docs/build-pipeline/graft-runtime-overlay-redesign.md` § Decomposition Recommendation (Confirmed).

## Goal Check

You are asking for: ship the graft-side migration command + 6 outstanding bug fixes that 101 deferred (so 101 stayed Medium-scope) and prove the new runtime-overlay architecture by re-running carlove migration end-to-end.

- **Problem being solved**: 101 architecture is in main but no real graft directory has executed against it; carlove still has the old `.origin/` format and 5 latent localization bugs (#14-19) plus the missing `migrate` subcommand block any production use.
- **Expected outcome**: `graft migrate` subcommand exists and converts `.origin/` graft dirs to manifest+hash format; bugs #14, #15, #16, #17, #19 fixed in `skills/graft/SKILL.md`; carlove pressure-test sweep #14-22 passes against real graft binary.
- **Explicit non-goals**: NOT touching 101's architecture artifacts (manifest schema, LOCAL.yaml runtime apply, hash upgrade); NOT scope-expanding to bugs discovered during execute (those spawn follow-ups per captain's scope discipline); NOT redesigning the LOCAL.yaml op vocabulary (needs clarification -- deferred to explore: bug #15 pre-write diff might require new op type).

## Lens Evidence

### Lens (a) captain-stated-intent

- 6 deliverables explicitly enumerated: graft migrate subcommand + bugs #14/#15/#16/#17/#19 fixes -- directive:verbatim [primary]
- Validation method: re-run carlove `graft migrate` + full pressure-test sweep #14-22 on real carlove graft directory -- directive:verbatim [primary]
- Scope discipline: new bugs discovered during execute either get in-scope triage OR spawn follow-up; explicit out-of-scope statement -- directive:verbatim [primary]
- 101's architecture (source_hash schema, LOCAL.yaml, hash-upgrade) belongs to 101, NOT 112 -- directive:verbatim [primary]
- 112 must inherit 101's new manifest+hash format before migrate subcommand can target it (depends-on 101) -- directive:verbatim [primary]

### Lens (b) captain-unstated-intent

- Captain expects 112 to be the live proof entity that 101's architecture works end-to-end — parent 101 ship_note explicitly says "runtime validation deferred to 112" -- entity:101 [primary]
- Captain assumes graft skill can absorb new sub-command without restructuring SKILL.md sub-commands list (currently `init, localize, upgrade, status, diff` per skill prose) -- entity:graft [secondary]
- Captain expects pressure-test sweep results to land as live test outcomes (history field updates from "actual=A unfixed" → "actual=A fixed") not just code changes -- entity:101 [primary]
- Captain implicit goal: bug #18 (shipped stage unconfigured) is OUT OF 112 scope — already absorbed by entity 090 Part 1 + 101's LOCAL.yaml shipped_config block -- entity:090 [secondary]

### Lens (c) codebase-current-state

- `skills/graft/SKILL.md` has `init, localize, upgrade, status, diff` sub-commands documented (line 54 region); zero `migrate` keyword matches in graft/ today — `graft migrate` is greenfield -- skills/graft/SKILL.md [primary]
- Pressure tests #14-22 already exist in `tests/pressure/graft.yaml` with `history:` blocks marked "2026-04-14 actual=A unfixed" — fix path is to update those history rows after fix-and-verify -- tests/pressure/graft.yaml [primary]
- Parent 101 archived at `_archive/graft-runtime-overlay-redesign.md`; A-1 through A-11 enumerate exact line-number evidence for each bug's root cause (bug #14 → A-9; #15 → A-8; #16 → Phase 4 Step 9 mkdir gap; #17 → verbatim path mismatch; #19 → A-9 post-init smoke test gap) -- _archive/graft-runtime-overlay-redesign.md [primary]
- LOCAL.yaml `readme_operations` op vocab is `set-stage-field` + `anchor/replace` (parent 101 A-6); no body-section insertion op exists today -- skills/graft/SKILL.md:185-235 [secondary]

### Lens (d) sibling-entity

- Parent 101 (graft-runtime-overlay-redesign) shipped 2026-04-15 — depends-on satisfied; manifest+hash format ready for migrate target -- entity:101 [primary]
- Entity 090 (shipped-stage-mod-and-graft-migration) Part 2 was absorbed into 101 per 101's Q-2 option 1; NOT a 112 conflict surface -- entity:090 [secondary]
- skills/graft/SKILL.md has 1 active writer (101 final) + recent commits show stable state — 112's `graft migrate` insertion + bug fixes have low merge-conflict risk -- entity:101 [primary]
- tests/pressure/graft.yaml pressure tests #14-22 already document expected end-state (history rows ready to be flipped from unfixed → fixed) — 112 is the natural updater -- tests/pressure/graft.yaml [primary]

## Core Tensions

- **time-based**: real carlove graft directory still has `.origin/` format on disk — `graft migrate` must be developed and tested against either (a) live carlove repo (requires captain access), or (b) a synthetic fixture that mirrors the .origin/ layout. Pick at clarify.
- **essential**: bug #15 (pre-write diff/confirm before overwriting `.claude/skills`/`.claude/agents`) might need a new LOCAL.yaml op type or it might be a graft-init in-line check — choice affects whether scope creeps into 101's op vocabulary territory.
- **domain-based**: bug-fix scope (#14-#19) vs new-feature scope (`graft migrate`) coexist in same entity; risk of execute waves bleeding into each other if not sequenced.

## Honest Boundaries

- Cannot validate `graft migrate` correctness without live carlove run; synthetic fixture is a proxy not a guarantee.
- Pressure-test history field updates require captain confirmation that fix is real on the carlove side, not just unit-test green in spacedock.
- Bug #18 (shipped stage) is intentionally excluded; if execute discovers it's not actually fixed by 090+101, 112 spawns a follow-up rather than absorbing.

## Brainstorming Spec

**APPROACH**: Implement 6 deliverables in a single PR scoped to `skills/graft/SKILL.md` + `tests/pressure/graft.yaml` + new fixture under `tests/fixtures/graft-legacy-origin/` (synthetic .origin/ layout for migrate testing). Wave 0: bug fixes #14, #16, #17 (independent localized changes — root-script stub heuristic, mkdir at init, verbatim validation glob). Wave 1: bug #15 (pre-write diff/confirm — design as graft-init inline check, NOT new op type, to avoid scope creep into 101 territory). Wave 2: `graft migrate` subcommand — read existing `.origin/` layout, compute source_hash from current plugin SKILL.md content, write new manifest.yaml schema, delete `.origin/`. Wave 3: bug #19 post-init smoke test — invoke localized skills with `--dry-run` flag (or equivalent existence check), verify no FileNotFoundError. Wave 4: pressure-test sweep — run #14-22 against either carlove (if captain provides access) or synthetic fixture, update `history:` rows to "2026-04-16 actual=A fixed".

**ALTERNATIVE**: Split into TWO entities — 112a (5 bug fixes, no new sub-command) + 112b (graft migrate subcommand only). Each ships independently. -- D-01 rejected because parent 101's Decomposition Recommendation explicitly bundled migration + bug cleanup into a single Medium child to keep both 101 and 112 at Medium; further split fragments the validation story (carlove pressure-sweep depends on BOTH bug fixes AND migrate to land together) and produces two PRs touching the same SKILL.md.

**GUARDRAILS**:
- MUST NOT modify manifest.yaml schema, LOCAL.yaml runtime apply contract, or hash-upgrade flow — these are 101 territory (per directive Out of scope L44).
- MUST update `tests/pressure/graft.yaml` `history:` rows for tests #14-#22 with the live verification outcome (per Lens (b) captain expectation).
- MUST sequence migrate wave AFTER bug fix waves — migrate consumes the fixed init+localize paths.
- MUST NOT scope-creep on bugs discovered during execute — captain's directive Out of scope L45 mandates either in-scope triage OR follow-up spawn (decision belongs to captain at execute, not brainstorm).
- MUST add `graft migrate` to skills/graft/SKILL.md sub-commands list (line 54 region) + add CONTRACTS.md row per workflow-index unconditional-append rule.

**RATIONALE**: Single-entity bundle preserves carlove validation as one observable cycle (all 9 bugs + migrate succeed together = win; partial fix leaves carlove in mixed state). Wave ordering (bug fixes → migrate → smoke test → sweep) ensures each wave's deliverable is testable on its own without depending on later waves. Excluding new op types from bug #15 keeps the LOCAL.yaml vocabulary stable (parent 101's territory).

## Acceptance Criteria

- `skills/graft/SKILL.md` documents `migrate` as the 6th sub-command (how to verify: `grep -E "^### Step.*migrate|graft migrate" skills/graft/SKILL.md` returns matches).
- `tests/pressure/graft.yaml` pressure tests #14, #15, #16, #17, #19 all have `history:` rows ending in "2026-04-16 actual=A fixed" or equivalent (how to verify: `grep -A 1 "id: root-script-false-positive\|id: agent-file-overwrite\|id: localize-skill-dir-missing\|id: verbatim-validation-path\|id: post-init-smoke-test-gap" tests/pressure/graft.yaml | grep "fixed"` returns 5 matches).
- `graft migrate` converts a `.origin/`-format directory to manifest+hash format without data loss (how to verify: run on synthetic fixture under `tests/fixtures/graft-legacy-origin/`, assert post-state has manifest.yaml with `source_hash` field AND no `.origin/` dir AND localized skills preserve content).
- Bug #14: `graft init` does NOT auto-detect a stub `pnpm test` script as real (how to verify: bun test fixture with stub script, assert auto-detect returns "no test config" not "pnpm test").
- Bug #15: `graft init` warns or asks confirmation before overwriting an existing `.claude/skills/{name}/` or `.claude/agents/{name}.md` file (how to verify: pre-populate target with mock file, run init, assert prompt or warning emitted before overwrite).
- Bug #16: `graft init` creates `.claude/skills/{name}/` parent dirs before writing files (how to verify: bun test from clean target dir, assert no FileNotFoundError on first localized skill write).
- Bug #17: validation glob matches local plugin install paths (not only `~/.claude/plugins/`) (how to verify: bun test from local-install fixture, assert validation passes).
- Bug #19: post-init smoke test verifies localized skills load without import errors (how to verify: bun test asserts smoke step exists in init flow, smoke step exits non-zero on any skill load error).
- CONTRACTS.md `_index/CONTRACTS.md` contains a row for `skills/graft/SKILL.md` referencing entity 112 + a row for `tests/pressure/graft.yaml` (how to verify: `grep "graft-backward-compat" docs/build-pipeline/_index/CONTRACTS.md` returns ≥2 matches).

## Stage Report: brainstorm

- [x] Mode: B (inline single-pass; parent 101 archive provides equivalent of Lens (c)+(d) coverage)
- [x] Lenses dispatched: 0 (parent 101 archive read inline + 1 graft skill survey)
- [x] Lens citations: 13 across 4 inline subsections (all tier-tagged)
- [x] Goal Check: emitted (3 bullets, 1 α marker on non-goals)
- [x] APPROACH claims: 5 wave-structured (within 3-7 cardinality)
- [x] α markers: 1 (LOCAL.yaml op vocabulary scope for bug #15)
- [x] Core Tensions: 3 typed entries (time-based, essential, domain-based)
- [x] Honest Boundaries: 3 entries
- [x] Self-test gates: gate (i) cross-lens recurrence N/A in Mode B; gates (ii)-(v) pass
- ⚠ Mode B inline fallback used -- justified by parent 101 already shipped with rich Assumptions (A-1 through A-11) covering full file surface; 4-lens dispatch would be redundant per "50%+ files already-read" heuristic.
- Alignment gate: not run (deferred to FO post-handoff)
alignment_confidence: N/A
