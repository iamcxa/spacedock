---
name: uat-resume
description: "Use when captain runs /spacebridge:uat-resume {slug} to re-run pending UAT items on an already-shipped entity. Thin wrapper that dispatches build-uat in skip-only mode after validating preconditions and detecting spec drift -- not a separate execution path."
model: sonnet
---

# UAT-Resume -- Thin Wrapper Over Build-UAT

**Namespace note.** This skill lives at `skills/uat-resume/`; namespace migration to `spacebridge:uat-resume` is Phase F work (entity 055). When the captain invokes `/spacebridge:uat-resume`, the slash command loads this skill via its flat `skills/uat-resume/` path.

You are a user-invoked wrapper skill. The captain runs `/spacebridge:uat-resume {slug}` against an entity that previously shipped with one or more UAT items in `status: skipped`. Your job is to dispatch `build-uat` in skip-only mode so it re-runs those items. You are **NOT** a UAT runner. You own input validation and dispatch; build-uat owns scope selection, captain interaction, result writing, and `uat_pending_count` mutation.

**Four steps, in strict order. Steps execute: locate entity, run Precondition Check, run Spec Drift Guard, then dispatch build-uat under the Delegation Contract.**

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` line 490 for the wrapper contract, lines 436-440 for the skip / resume mechanism, and `skills/build-uat/SKILL.md` Step 1 (skip-only mode branch) and Rules (Skip-Only Mode) for the downstream contract you delegate into.

---

## Tools Available

**Can use:**
- `Read` -- open the target entity file to validate preconditions and read `## UAT Spec` + `## UAT Results` for drift detection
- `Grep` / `Glob` -- locate the entity file if only the slug is given
- `Bash` -- ISO timestamp capture for the dispatch record; `git rev-parse --short HEAD` for the resume dispatch record
- `Skill` -- dispatch `spacebridge:build-uat` (or `skills/build-uat/` via flat path, depending on how the captain's slash command is wired at invocation time)
- `AskUserQuestion` -- ONLY for the spec-drift escalation path. Load via `ToolSearch(query: "select:AskUserQuestion", max_results: 1)` before the first call, matching the `skills/build-clarify/SKILL.md` line 28-30 precedent.

**NOT available (by policy):**
- `Write` / `Edit` against the entity body -- you do NOT write UAT results, you do NOT mutate `uat_pending_count`, you do NOT append `## Stage Report: uat`. All entity body writes are build-uat's job. Writing from the wrapper creates a second source of truth and violates the thin-wrapper contract.
- Dispatching any skill other than `build-uat`. You are a leaf over a single downstream skill.
- Filtering, re-mapping, or re-indexing the `## UAT Spec` before dispatch. Scope selection lives in build-uat.

---

## Inputs From the Captain

The slash command dispatches you with:

1. **Entity slug** -- e.g. `047-example-entity`
2. **Workflow directory** -- so you can locate the entity file

If the workflow directory is absent, Grep the repo for the slug under standard workflow paths (`workflows/*/entities/`). If the entity file cannot be located, return `NEEDS_CONTEXT` with a plain message naming the slug you searched for. Do NOT guess a path.

---

## Step 1: Locate Entity and Validate Existence

Read the entity file. Confirm it has frontmatter. Confirm the frontmatter has a `status` field and an `uat_pending_count` field. If the entity file is missing, return `NEEDS_CONTEXT` with the slug and the paths searched. If the frontmatter is malformed or missing `uat_pending_count`, return `NEEDS_CONTEXT` naming the missing field -- do NOT synthesize a default value.

This is the only filesystem existence check in the wrapper. Every subsequent step assumes the file is readable and the frontmatter parsed.

---

## Precondition Check

Read `uat_pending_count` from frontmatter.

- If `uat_pending_count == 0`: return `DONE` immediately with the message `"no pending UAT items, nothing to resume"`. Do NOT dispatch build-uat. Do NOT touch the entity file. Do NOT ask the captain anything. The entity is already fully acknowledged; there is nothing to resume.
- If `uat_pending_count > 0`: proceed to the Spec Drift Guard.
- If `uat_pending_count` is negative, missing, or non-numeric: return `NEEDS_CONTEXT` naming the malformation. Do NOT normalize it to zero.

**The core invariant of this stage: no-op when uat_pending_count is zero.** The wrapper short-circuits before any dispatch. A dispatched build-uat for a known-empty case produces spurious pipeline artifacts (fresh stage reports, new workflow-index rows, empty commits) that then have to be cleaned up, and it burns an ensign cycle on work nobody asked for.

### No Exceptions

- **NEVER dispatch build-uat "just in case" when `uat_pending_count == 0`.** "Delegating the empty-set check to build-uat keeps uat-resume maximally thin" is a false economy. The spec says uat-resume is "not a separate execution path" (line 490), which forbids re-implementing build-uat's execution logic. It does NOT forbid input validation. An empty-set short-circuit is a gatekeeper, not execution. Dispatching anyway wastes an ensign cycle, writes spurious artifacts, and blurs what the command actually did.
- **NEVER re-run the full UAT suite "as a paranoid sanity check"** against a zero-pending entity. "Entities shipped last week may have bit-rotted against a moved main branch, a paranoid re-verification catches regressions the captain didn't know to ask about" is scope creep. Re-verification is a different command's job (future `/spacebridge:uat-audit --re-verify`, which spec line 440 reserves as a separate entry point). Silent scope creep inside uat-resume destroys the captain's ability to reason about what the command did: they asked to resume skips, not to re-verify passes. Overwriting prior-pass rows also invalidates captain's earlier sign-offs.
- **NEVER return `BLOCKED`** citing "the entity is already shipped, resume on a shipped entity is a state violation". Per spec lines 430-431 and `skills/build-uat/SKILL.md` Step 6, shipped entities with pending skips are the supported shape -- that is the whole reason uat-resume exists. Blocking here misreads the state machine.
- **NEVER prompt `AskUserQuestion` to ask "did you mean a different slug, or do you want a full re-run"**. The zero-pending case is unambiguous: there is nothing to resume. A clarifying prompt is a false-choice interface that invents ambiguity. "Single clarifying question costs one round trip and prevents both a silent no-op and an unwanted full re-run" is wrong on the first clause (the no-op is visible in the return message, not silent) and wrong on the second clause (a full re-run is not a uat-resume outcome in the first place).

---

## Spec Drift Guard

Read the entity's current `## UAT Spec` section and its existing `## UAT Results` section. For every prior row with `status: skipped`, extract the item's recorded text (the captain-facing description, not just the index). Compare each recorded skipped item's text against the current `## UAT Spec`:

- **Clean mapping**: the recorded text appears as an item in the current spec, in a position consistent with the recorded id (exact text match, or trivial whitespace-only diff). Mark the item as `resumable`.
- **Drift**: the recorded text does NOT appear in the current spec, OR it appears at a different id than recorded, OR it appears with non-trivial wording changes (new acceptance clauses, changed command, changed URL, changed type). Mark the item as `drifted`.

If EVERY recorded skipped item is `resumable`, proceed directly to the Delegation Contract dispatch. If ANY recorded skipped item is `drifted`, you MUST detect UAT spec drift and escalate before dispatching.

### Escalation Shape

Load `AskUserQuestion` via `ToolSearch(query: "select:AskUserQuestion", max_results: 1)`, then return `NEEDS_CONTEXT` with a per-item drift report naming each drifted item, its recorded text, and the closest candidate (if any) in the current spec. Do NOT call `AskUserQuestion` to repair the drift inline unless the captain's dispatch prompt explicitly asked for interactive repair -- the default path is return `NEEDS_CONTEXT` with the drift report so the captain can edit the entity and re-invoke.

The drift report is plain text in the return message. Shape:

```
spec drift detected on {slug}:
  item-5 (recorded: "Run device cert flow")
    not found in current ## UAT Spec
    closest candidate: item-4 "Run pairing cert handshake" (low confidence)
  item-7 (recorded: "Verify pairing handshake")
    found at item-6 in current spec with text "Verify pairing handshake v2" (non-trivial diff)
captain: please re-map or edit the entity, then re-invoke /spacebridge:uat-resume
```

### No Exceptions

- **NEVER dispatch build-uat trusting the recorded indices blindly** when drift is present. "The recorded indices are the captain's prior decision, honoring them literally is the most faithful execution of the original skip intent" sounds faithful but is backwards: the captain's prior decision was about item TEXT (the thing they described in plain English and acknowledged), not about item INDEX (a position in a mutable section). Literal index honoring silently redefines what "item 5" means without captain consent. When item 5 was deleted and items 6-9 renumbered down, dispatching skip-only with id `item-5` now runs a completely different test than the one the captain skipped.
- **NEVER fall back to "full re-run in normal mode"** as a safety net. "Drift detected anywhere means the verification baseline changed, the only safe answer is a full re-run" destroys the resume semantics entirely -- it is not resume, it is redo. It also invalidates the prior-pass rows in `## UAT Results` that the captain already signed off on, because a normal-mode build-uat run will append a second generation of rows that contradict the first generation. The thin-wrapper contract is skip-only, not "skip-only unless drift, then full".
- **NEVER silently re-map via text similarity search** and dispatch with best-match indices. "Text similarity is how humans would re-locate the items anyway, surfacing a drift dialog for every minor edit creates friction" optimizes for the wrong thing. The friction is the feature: the drift dialog forces the captain to confirm the re-mapping, which is the only way to preserve the audit trail (captain reviewed X, captain re-mapped to Y, captain acknowledged the re-map). Silent similarity matching makes hidden guesses the captain cannot audit, and if the wrapper guesses wrong, the entity body ends up with a "skipped then pass" pair that refers to two different items under the same id.
- **NEVER skip drift detection** citing "thin wrapper means thin wrapper, drift is build-uat's problem, not the wrapper's". Drift detection is **input validation**, not execution. The wrapper is the ONLY place in the pipeline that has both (a) the recorded skipped-item identities from the prior `## UAT Results` AND (b) the current `## UAT Spec`. Build-uat in skip-only mode reads the current spec only -- it has no memory of what "item 5" meant 2 weeks ago. Refusing to detect drift makes the wrapper a mute witness to silent identity corruption. "Locked spec constraint" is about not re-implementing execution, not about refusing to look at the entity file.

---

## Delegation Contract

The wrapper **delegates scope selection to build-uat**. The wrapper does NOT pass an explicit items list. The wrapper does NOT build a filtered copy of the entity. The wrapper does NOT annotate the entity with a "skip-only" marker. The wrapper dispatches build-uat against the original, unmodified entity file with `mode: skip-only`, and build-uat's own skip-only handler reads `## UAT Results`, filters to skipped rows, and re-runs exactly those items.

The single source of truth for which items need re-running is the entity's `## UAT Results` section -- the rows with `status: skipped`. That section is already an audit trail with captain reasons and timestamps. Introducing a wrapper-owned scope list creates a SECOND source of truth that must stay in sync with `## UAT Results` or silently corrupts resume semantics on any divergence.

### Dispatch Shape

Invoke the `build-uat` skill via the `Skill` tool. Pass the dispatch inputs in the prompt per `skills/build-uat/SKILL.md` Inputs From Orchestrator (lines 37-47):

1. **Entity slug** -- the slug the captain passed on the command line
2. **Entity file path** -- the absolute path you resolved in Step 1
3. **Workflow directory** -- the workflow directory you used for lookup
4. **Mode** -- `skip-only` (this is the wire format the wrapper signals through; build-uat Step 1 branches on this field)
5. **Execute base SHA** -- `git rev-parse --short HEAD` captured at dispatch time (informational for build-uat, matches the normal-mode field)

That is the entire dispatch contract. Build-uat's own Step 1 skip-only branch reads the entity file, parses `## UAT Spec` and `## UAT Results`, selects items whose prior row had `status: skipped`, re-runs them, appends new rows to `## UAT Results`, recomputes `uat_pending_count`, writes `## Stage Report: uat`, and commits. Per `skills/build-uat/SKILL.md` Rules (Skip-Only Mode), prior rows are preserved untouched.

Return whatever status build-uat returned: `DONE` if it succeeded, `NEEDS_CONTEXT` if build-uat escalated, `BLOCKED` if build-uat reported a blocking condition. The wrapper does not reinterpret build-uat's verdict.

### No Exceptions

- **NEVER read `## UAT Results` in the wrapper to pick which items to re-run and pass them as an explicit items override**. "Explicit is better than implicit, passing the item list makes the dispatch auditable, testable in isolation, and the wrapper can validate the list before burning an ensign dispatch" sounds disciplined but violates the thin-wrapper contract. The entity file is already the audit trail (UAT Results rows have captain reasons + timestamps from the first-pass run). Wrapper-owned scope creates a second source of truth that must stay in sync with `## UAT Results`. On any divergence -- a hand-edit, a concurrent build-uat run, a partial rewrite -- the two sources silently drift and the wrapper dispatches stale scope. Skip-resume semantics (which items count as skipped, how they are re-run, how `uat_pending_count` is recomputed) live in build-uat because that is where `uat_pending_count` mutation and UAT Results row appending live; moving them to the wrapper distributes state writes across two skills and breaks idempotency.
- **NEVER build a filtered copy of the entity frontmatter** containing only the skipped items and pass that filtered copy in. "Build-uat stays completely unaware of skip-resume semantics, giving perfect isolation and making skip-resume a pure preprocessing step" is wrong because build-uat IS aware of skip-resume semantics -- Step 1 has an explicit `skip-only mode branch` (line 62) and the Rules section has a `Skip-Only Mode` block (lines 257-261). The wrapper is thin because the downstream skill handles the mode, not because the wrapper hides the mode behind a file-shaped fiction. A filtered copy also breaks the `re-attempt` column logic in `## UAT Results` (line 171-178 of build-uat), which counts retries across the same row identity.
- **NEVER call `AskUserQuestion` in the dispatch step to confirm with the captain "which skips are actually ready to re-run now"** before dispatching. "Captain knows best which skips are actually ready to re-run now (staging db may be up but credentials missing), explicit confirmation prevents wasted ensign cycles" confuses two different failure modes. A skip that is still not ready (staging db credentials missing) is fail-infra inside build-uat's own run -- build-uat Step 3 classifies it as `fail-infra`, routes feedback to execute, and the item stays skipped until the infra is fixed. Asking the captain up front to filter these out is asking the captain to do build-uat's classification work, which (a) violates the captain's time (they invoked uat-resume precisely to avoid hand-picking items) and (b) puts classification in two places, which will drift.
- **NEVER dispatch build-uat in normal mode plus an annotation comment** saying "only skipped items expected". Delegating implicitly via convention breaks the wire contract: build-uat's skip-only branch (SKILL.md line 62) is triggered by the `mode` field, not by a comment. An annotation would be ignored and build-uat would run the full suite. "Helpful filtering" that the downstream skill cannot parse is not filtering; it is noise.

---

## Return Shape

Every return path produces one of:

- `DONE` -- with a human-readable message. Used for the zero-pending no-op in the Precondition Check and for successful build-uat dispatch completion under the Delegation Contract.
- `NEEDS_CONTEXT` -- with the specific gap: missing entity file, malformed frontmatter, or spec drift report. Used when the wrapper cannot safely dispatch.
- `BLOCKED` -- only if build-uat itself returned `BLOCKED`. The wrapper never originates a blocked verdict.

The wrapper does NOT write a stage report. The wrapper does NOT commit. The wrapper does NOT touch the entity file. All entity-facing side effects flow through build-uat.

**Use `--` (double dash)** everywhere. Never the em dash. Matches the rest of the build skill family.
