---
name: build-alignment-gate
description: "Opus alignment-gate orchestrator dispatched by FO after brainstorm. Evaluates problem framing against captain intent and Lens Evidence, returning one of three branch outcomes (continue / retry / escalate-to-shape) with an alignment_confidence score. First-class extraction of science-officer Step 3.6."
user-invocable: false
---

# Build-Alignment-Gate -- Alignment Gate Orchestrator

This skill is the alignment gate stage for the build pipeline. After `build-brainstorm` completes and writes `## Brainstorming Spec` to the entity body, the alignment gate evaluates whether the brainstormed framing is aligned with the captain's intent and the entity's Lens Evidence. It returns one of three branch outcomes -- `continue`, `retry`, or `escalate-to-shape` -- along with an `alignment_confidence` score. FO dispatches this skill after brainstorm and before explore. AskUserQuestion is intentionally absent: FO owns captain interaction and presents the gate via its own session.

**Namespace note.** This skill lives at `skills/build-alignment-gate/`; migration to `spacebridge:build-alignment-gate` is deferred to entity 050 (spacebridge plugin skeleton). Do not reference the spacebridge namespace until that entity ships.

**Supersedes note.** This skill supersedes the inline Step 3.6 body in `agents/science-officer.md` (shipped in entity 113; extracted as a first-class skill in entity 114). The science-officer agent Step 3.6 now delegates to this skill rather than carrying the logic inline.

---

## Tools Available

**Can use:**
- `Read` -- entity file, Lens Evidence, Captain Context Snapshot
- `Grep` -- search entity body for section markers
- `Write` / `Edit` -- write Stage Report section to entity file
- `Bash` -- git operations only (no commit -- orchestrator commits)
- `Skill` -- invoke `workflow-index` to look up entity path by slug

**NOT available:**
- `Agent` -- this is a leaf skill; no subagent dispatch
- `AskUserQuestion` -- FO owns captain interaction; this skill only writes the Stage Report

---

## Input Contract

The entity file must contain all three of:

1. `## Brainstorming Spec` -- populated by `build-brainstorm`
2. `## Lens Evidence` -- populated by `build-explore` or carried forward from earlier stages
3. `## Captain Context Snapshot` -- populated during clarify or seeded at entity creation

Entity frontmatter `context_status` must be `brainstormed` or an equivalent post-brainstorm state. If any required section is absent, return BLOCKED with a `scope_gap` finding naming the missing section.

---

## Output Contract

After the gate completes (any branch), the entity file gains a `## Stage Report: alignment-gate` section with the following fields:

```
## Stage Report: alignment-gate

branch: continue | retry | escalate-to-shape
retries: N
alignment_confidence: 0.0 -- 1.0 (or N/A if escalated)
```

The `alignment_confidence` value also surfaces on `## Stage Report: brainstorm` for backward compatibility (O-1 resolution). If `## Stage Report: brainstorm` does not yet exist, create it with the gate annotation only.

---

## Steps

**Step 1: Load entity context**

Read the entity file. Extract:
- APPROACH headline (first sentence of APPROACH paragraph in `## Brainstorming Spec`)
- ALTERNATIVE headlines (first sentence of each ALTERNATIVE paragraph, if any)
- Lens Evidence summary (key signals from `## Lens Evidence`)
- Captain directive (from `## Captain Context Snapshot` or entity frontmatter)

**Step 2: Evaluate framing vs Lens Evidence and captain directive**

Compare the APPROACH and ALTERNATIVEs against:
- Lens Evidence signals (does the approach address the problem the evidence identifies?)
- Captain directive (does the approach match the captain's stated intent and constraints?)

Determine which branch applies:

**(a) continue** -- framing is well-aligned: approach addresses the Lens Evidence signals and matches captain directive with no significant gaps.

**(b) retry** -- framing has correctable misalignment: approach partially addresses the evidence or drifts from captain directive in a way that a focused correction could fix. Retry count must be below the cap (see Step 3).

**(c) escalate-to-shape** -- framing has structural misalignment: the approach does not address the core problem the evidence identifies, or captain directive requires product-layer re-scoping that brainstorm cannot resolve. Also triggered when retry cap is reached.

**Step 3: Apply retry cap**

Max 3 retries. If the selected branch is `retry` and `retries` would reach 3, auto-escalate to branch (c) instead. Write:

```
branch: escalate-to-shape
retries: 3
alignment_confidence: 0.4
```

Retry cap = 3. Never allow a 4th retry.

**Step 4: Compute alignment_confidence**

Use the formula: `alignment_confidence = 1.0 - (retry_count * 0.2)`

Values:
- 0 retries (continue on first pass): 1.0
- 1 retry: 0.8
- 2 retries: 0.6
- 3 retries (then auto-escalate): 0.4
- escalate-to-shape (captain-requested, not retry-forced): N/A (entity superseded)

**Step 5: Write Stage Report**

Write the `## Stage Report: alignment-gate` section to the entity file. Format must match the grep-parseable layout in `## Stage Report Format` below exactly.

For branch (a) -- continue:
```
## Stage Report: alignment-gate

branch: continue
retries: 0
alignment_confidence: 1.0
```

For branch (b) -- retry (example after 1 retry):
```
## Stage Report: alignment-gate

branch: retry
retries: 1
alignment_confidence: 0.8
```

For branch (c) -- escalate-to-shape (captain-requested):
```
## Stage Report: alignment-gate

branch: escalate-to-shape
retries: N
alignment_confidence: N/A
```

Also write `context_status: blocked` to entity frontmatter when branch is `escalate-to-shape`.

Also append to `## Stage Report: brainstorm` (create if absent):
```
- Alignment gate: {branch} ({N} retries)
alignment_confidence: {value}
```

---

## Stage Report Format

The Stage Report written to the entity file must be grep-parseable. Each field appears on its own line with no leading whitespace inside the block:

```
branch: continue
retries: 0
alignment_confidence: 1.0
```

Required line patterns (one per line, exact key names):
- `branch: ` followed by one of `continue`, `retry`, `escalate-to-shape`
- `retries: ` followed by an integer 0-3
- `alignment_confidence: ` followed by a float (0.0-1.0) or `N/A`

Do NOT use em-dash (`--` is the double-dash separator convention for this codebase). Do NOT add extra fields. Do NOT omit any field.

---

## Branch Behavior Reference

| Branch | Trigger | context_status | alignment_confidence |
|--------|---------|----------------|----------------------|
| continue | Framing aligned with Lens Evidence + directive | unchanged (brainstormed) | 1.0 - (retry_count * 0.2) |
| retry | Correctable misalignment, retries < 3 | unchanged | 1.0 - (retry_count * 0.2) |
| escalate-to-shape | Structural misalignment or retry cap hit | blocked | N/A |

**escalate-to-shape message** (written to entity when branch is c):
> Entity blocked. Open a new entity via `/shape` to re-align at the product level. This entity's accumulated brainstorm work is preserved for reference.

---

## Backward Compatibility -- alignment_confidence on brainstorm Stage Report

`alignment_confidence` surfaces on `## Stage Report: brainstorm` for O-1 resolution. Consumers that parse `## Stage Report: brainstorm` expect this field to appear there. Always write both:
1. `## Stage Report: alignment-gate` (authoritative, as described above)
2. The `alignment_confidence` annotation inside `## Stage Report: brainstorm`

If `## Stage Report: brainstorm` already exists, append the alignment gate line to it. If it does not exist, create it with only the gate annotation.
