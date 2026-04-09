# Hybrid Classification Heuristic

Three-track system for classifying gray areas discovered during codebase exploration. Each gray area becomes exactly one of: Assumption (A), Option Comparison (B), or Open Question (C).

## Priority Rule

**Prefer lower tracks.** A over B, B over C. The goal is to minimize captain interaction -- assumptions are cheapest (batch confirmation), option comparisons are moderate (one-at-a-time decisions), and open questions are most expensive (freeform captain input). Only escalate to a higher track when the evidence genuinely requires it.

---

## Track A -- Assumption

**When to use:** The codebase already has precedent for this pattern. Build-explore found existing code that answers the gray area.

### Heuristic

| Signal | Confidence Level |
|---|---|
| 2+ consistent usages of the same pattern | Confident |
| 1 usage, clear fit for the current context | Likely |
| 1 usage, unclear whether it applies here | Unclear |

If confidence is "Unclear," consider whether this is actually a Track B (competing patterns) or Track C (needs captain judgment).

### Format

```
A-{n}: {declarative statement of what will be done}
Confidence: {Confident | Likely | Unclear}
Evidence: {file}:{line} -- {one-line description of the precedent}
```

### Example

```
A-1: Use Bun.serve() with the existing middleware chain for the new endpoint.
Confidence: Confident
Evidence: src/server.ts:42 -- all 6 existing endpoints use this pattern

A-2: Store stage duration as computed value from timestamps, not a separate column.
Confidence: Likely
Evidence: scripts/status.sh:118 -- duration already computed from entered_at diffs

A-3: Apply the same entity frontmatter schema validation used elsewhere.
Confidence: Unclear
Evidence: src/entity-loader.ts:27 -- validates with Zod, but only for 3 of 8 fields
```

### How build-clarify handles Track A

Batch confirmation. All assumptions are presented together. The captain can confirm all, reject specific ones (which get reclassified to Track B or C), or confirm with modifications.

---

## Track B -- Option Comparison

**When to use:** No single codebase precedent exists. Multiple viable approaches are available -- either competing patterns in the codebase, or standard domain options where the codebase has no opinion.

### Heuristic

| Signal | Classification |
|---|---|
| Codebase uses pattern X in one place and pattern Y in another | Competing precedent -- Track B |
| Codebase has no precedent, but the domain has 2+ standard approaches | Standard options -- Track B |
| Only one viable approach exists but it's unproven in this codebase | Track A (Unlikely confidence), not Track B |

### Format

Markdown table with 5 columns:

```markdown
### {Gray area title}

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| {Option A} | {benefits} | {drawbacks} | {Low/Medium/High} | {Recommended / Viable / Not recommended} |
| {Option B} | {benefits} | {drawbacks} | {Low/Medium/High} | {Recommended / Viable / Not recommended} |
```

### Example

```markdown
### Real-time update mechanism

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| WebSocket via existing Bun.serve upgrade | Consistent with dashboard architecture, already proven | Requires cross-instance bridge for two-server setup | Low | Recommended |
| Server-Sent Events (SSE) | Simpler protocol, no bidirectional needed | No existing SSE usage in codebase, would introduce new pattern | Medium | Viable |
| Short polling (2s interval) | Zero infrastructure change | Wastes bandwidth, 2s latency floor, scales poorly | Low | Not recommended |
```

### How build-clarify handles Track B

One-at-a-time AskUserQuestion. Each option comparison is presented individually with the recommendation highlighted. The captain picks one option or requests a hybrid.

---

## Track C -- Open Question

**When to use:** Genuinely open -- no codebase signal, no standard domain answer, requires business judgment or captain preference. Also used for unresolved alpha markers from brainstorming that exploration could not resolve.

### Heuristic

| Signal | Classification |
|---|---|
| No codebase precedent AND no standard domain options | Track C |
| Business/product judgment required (naming, scope, priority) | Track C |
| Unresolved alpha marker that exploration did not resolve | Track C (lowest Q numbers) |
| Technical question with a "right answer" findable in code | NOT Track C -- reclassify to A or B |

### Format

```
Q-{n}: {question in natural language}
Domain: {which of the 5 domains this touches}
Why it matters: {1-2 sentences on what depends on the answer}
Suggested options: {2-3 options if any exist, or "None -- captain input needed"}
```

### Example

```
Q-1: Should the explore stage produce a decomposition recommendation, or only flag when decomposition seems needed?
Domain: Runnable/Invokable
Why it matters: If explore recommends specific child entities, it needs to generate slugs and dependency graphs. If it only flags, that work moves to a later stage.
Suggested options: (a) Full decomposition with child slugs, (b) Flag-only with "likely needs split" annotation, (c) Conditional -- decompose if >3 gray areas touch different domains

Q-2: What naming convention should new reference docs follow?
Domain: Readable/Textual
Why it matters: Determines discoverability for future skill authors and consistency with existing docs.
Suggested options: None -- captain input needed
```

### How build-clarify handles Track C

One-at-a-time AskUserQuestion or freeform input. Each open question is presented individually. The captain can answer directly, defer to a later stage, or ask build-explore to research further.

---

## Classification Walkthrough

When assessing a gray area:

1. **Search the codebase** for existing patterns related to the gray area.
2. **Found 2+ consistent usages?** --> Track A (Confident).
3. **Found 1 usage?** --> Track A (Likely or Unclear depending on fit).
4. **Found competing patterns?** --> Track B.
5. **Found nothing, but standard domain options exist?** --> Track B.
6. **Found nothing, no standard options?** --> Track C.
7. **Alpha marker from brainstorming unresolved after search?** --> Track C.
