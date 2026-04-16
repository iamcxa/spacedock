# Alpha Marker Protocol

When build-brainstorm encounters unclear or underspecified areas, it marks them with alpha markers instead of asking questions. Build-explore consumes these markers as its first action.

## Marker Format

Two canonical forms, both grep-compatible with `--` (never em dash):

**Form 1 — generic unclarity** (default):

```
(needs clarification -- deferred to explore)
```

**Form 2 — typed pressure-test / expansion doubt** (new, introduced alongside Step 3 APPROACH pressure-test discipline):

```
(α: {doubt-type} -- {specific concern}; deferred to explore/clarify)
```

Known `{doubt-type}` tokens (grep-auditable closed set):

- `minimum-change` — APPROACH introduces abstractions beyond Scope: In
- `axis-doubt` — ALTERNATIVE not axis-distinct from APPROACH
- `scope-expansion` — specific expansion item surfaced by Scope Expansion Detection
- `claim count {n} outside default 3-7` — self-test item 1 scale-justified α (pre-existing)

Place the marker inline, immediately after the unclear text. The marker is a parenthetical annotation — it does not replace the text, it annotates it.

**Examples:**

```
APPROACH: Use WebSocket bridge for cross-instance sync (needs clarification -- deferred to explore)

APPROACH: Introduce a new plugin-manifest schema field `sync_mode` (α: minimum-change -- introduces new schema field beyond Scope: In; deferred to explore/clarify)

ALTERNATIVE: Same WebSocket bridge but with a 5s heartbeat instead of 3s (α: axis-doubt -- ALTERNATIVE not axis-distinct from APPROACH; deferred to explore/clarify)
```

## When to Mark

### APPROACH unclear

The user described *what* they want but not *how*. The approach section contains a goal without an implementation direction.

> "Make the dashboard update in real-time" — no mention of polling, SSE, WebSocket, or other mechanism.

### ALTERNATIVE no fork

The brainstorming surfaced only one approach. No meaningful alternative was identified or rejected.

> ALTERNATIVE: None identified (needs clarification -- deferred to explore)

### Acceptance Criteria too vague

A criterion exists but isn't testable as written. It uses words like "works correctly," "is fast," or "handles edge cases."

> "Dashboard loads quickly" — no latency target, no measurement method.

### Intent / scale ambiguous

The feature description doesn't clearly indicate whether this is a small tweak or a structural change, or whether it's a new feature vs. a bugfix.

> "Fix the comment system" — could mean a CSS alignment fix or a full rewrite of the threading model.

### Pressure-test uncomfortable answer (Form 2)

Step 3's APPROACH pressure-test discipline surfaced an uncomfortable answer (minimum-change doubt, axis-doubt, or scope-expansion). Mark using Form 2 on the affected APPROACH / ALTERNATIVE / GUARDRAILS item. Never mark RATIONALE — rewrite it instead.

> APPROACH introduces a new agents/ file when Scope: In only mentions editing an existing skill.

### Scope Expansion Detected

Any item listed in the `### Scope Expansion Detected` subsection MUST also carry an inline `(α: scope-expansion -- ...)` marker on the APPROACH/GUARDRAILS text it came from. The subsection lists; the inline marker cross-references.

## When NOT to Mark

### Uncertain about best approach

If brainstorming identified 2+ viable approaches but the "best" one isn't obvious — **just pick one**. Record the alternatives. Build-explore can revisit if needed, but an alpha marker here adds no value. The brainstorm skill's job is to commit to an approach, not defer the choice.

### No guardrails identified

If brainstorming genuinely found no constraints or risks — **use a standard note**, not a marker:

> GUARDRAILS: Checked -- no notable constraints identified.

This is not unclear; it's a deliberate assessment. Do not mark it.

### RATIONALE section

**Never mark RATIONALE.** If the rationale for the chosen approach is weak, that's a signal to improve the approach or alternatives — not to defer. Rationale is always the brainstorm skill's responsibility.

## Downstream Consumption

Build-explore scans alpha markers as its **first action** when processing an entity. The scan:

1. Collects all `(needs clarification -- deferred to explore)` markers from the entity spec
2. Maps each marker to the domain classification of its parent directive
3. Generates targeted questions to resolve each marker
4. Questions are ordered: APPROACH markers first (they gate everything else), then Acceptance Criteria, then ALTERNATIVE, then intent/scale

Markers that build-explore resolves are removed from the spec and replaced with concrete content. Unresolved markers persist and surface in quality review as open items.
