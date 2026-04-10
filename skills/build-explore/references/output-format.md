# Output Format

Exact formats for entity body sections that build-explore writes. These sections are appended to the entity markdown file after the brainstorming spec.

## Numbering Rules

- Assumptions: A-1, A-2, A-3... sequential within the entity.
- Open Questions: Q-1, Q-2, Q-3... sequential within the entity.
- Alpha marker questions get the **lowest Q numbers**. If brainstorming left 2 unresolved alpha markers, they become Q-1 and Q-2. New questions discovered during exploration start at Q-3.

---

## Assumptions

Track A items from the hybrid classification.

```markdown
## Assumptions

A-1: Use Bun.serve() with the existing middleware chain for the new endpoint.
Confidence: Confident
Evidence: src/server.ts:42 -- all 6 existing endpoints use this pattern

A-2: Store stage duration as computed value, not a separate column.
Confidence: Likely
Evidence: scripts/status.sh:118 -- duration computed from entered_at diffs

A-3: Apply existing Zod frontmatter validation to new entity fields.
Confidence: Unclear
Evidence: src/entity-loader.ts:27 -- validates 3 of 8 fields with Zod
```

Each assumption is a single block: declarative statement, confidence level, and evidence with file path and line number.

---

## Option Comparisons

Track B items from the hybrid classification. Each comparison gets its own `###` subsection.

```markdown
## Option Comparisons

### Real-time update mechanism

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| WebSocket via Bun.serve upgrade | Consistent with dashboard, already proven | Requires cross-instance bridge | Low | Recommended |
| Server-Sent Events | Simpler protocol, no bidirectional needed | New pattern, no existing usage | Medium | Viable |
| Short polling (2s) | Zero infrastructure change | Wastes bandwidth, 2s latency floor | Low | Not recommended |

### Entity storage format

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Single markdown file with new headers | No migration, simple tooling | File grows large for complex entities | Low | Recommended |
| Directory with split sections | Clean separation, parallel editing | Requires loader rewrite, migration | High | Not recommended |
```

Always include all 5 columns. Complexity is Low, Medium, or High. Recommendation is Recommended, Viable, or Not recommended. At least one option should be Recommended.

---

## Open Questions

Track C items from the hybrid classification.

```markdown
## Open Questions

Q-1: Should the explore stage produce a decomposition recommendation, or only flag when decomposition seems needed?
Domain: Runnable/Invokable
Why it matters: If explore recommends specific child entities, it needs to generate slugs and dependency graphs. If it only flags, that work moves to a later stage.
Suggested options: (a) Full decomposition with child slugs, (b) Flag-only with annotation, (c) Conditional based on gray area count

Q-2: What naming convention should new reference docs follow?
Domain: Readable/Textual
Why it matters: Determines discoverability and consistency with existing docs.
Suggested options: None -- captain input needed
```

Each question includes Domain (one of the 5 GSD domains), Why it matters, and Suggested options (or "None -- captain input needed" when genuinely open).

---

## Decomposition Recommendation

Written when the entity is large enough to warrant splitting into child entities. This section is advisory -- the captain decides whether to decompose during clarify.

```markdown
## Decomposition Recommendation

⚠️ This entity touches 4 domains and has 8+ gray areas. Consider splitting:

1. `explore-gray-area-templates` -- reference doc for domain templates (Readable/Textual)
2. `explore-classification-engine` -- hybrid classification logic (Behavioral/Callable)
3. `explore-output-writer` -- entity body formatter (Organizational/Data-transforming)

Dependencies:
- 2 depends on 1 (classification uses domain templates)
- 3 depends on 2 (output format determined by classification results)
```

Use the `⚠️` emoji (matches spec convention and build-brainstorm usage). List child entity slugs as numbered items with domain tags. Include a Dependencies section when children have ordering constraints.

---

## Stage Report: explore

Summary block written at the end of the explore stage output. The FO and status script parse specific fields from this section.

```markdown
## Stage Report: explore

- [x] Files mapped: 14 across domain, contract, view, frontend
- [x] Assumptions formed: 6 (Confident: 4, Likely: 1, Unclear: 1)
- [x] Options surfaced: 2
- [x] Questions generated: 3
- [x] α markers resolved: 2 / 3
- [x] Scale assessment: revised from Small to Medium
```

Six items, always in this order. Each item MUST use checklist format (`- [x]` for done, `- [ ]` for pending, `- [ ] SKIP: ...` or `- [ ] FAIL: ...` for partial stages) -- this is the parser contract defined at `tools/dashboard/src/frontmatter-io.ts:140`. Flat bullet format (`- {metric}`) is a drift bug; the dashboard will render the Stage Report card as empty. Field names must match exactly (the FO and status script parse these). Scale assessment uses one of: `confirmed` (no change from brainstorm's estimate) or `revised from X to Y` (where X and Y are `Small`, `Medium`, or `Large`).

---

## Brainstorming Spec Annotations

Build-explore annotates the original brainstorming spec inline to confirm or challenge its content. Two annotation formats:

### Confirmed

```
APPROACH: Use WebSocket bridge for cross-instance sync (confirmed by explore: src/bridge.ts:15 -- existing bridge handles 3 event types)
```

Format: `(✓ confirmed by explore: {evidence})`

Replaces any alpha marker on the same line. Used when exploration found codebase evidence supporting the brainstorming spec's claim.

### Contradicted

```
APPROACH: Use REST polling for real-time updates (contradicted: src/server.ts:42 shows WebSocket already in use -- see Q-3)
```

Format: `(contradicted: {evidence} -- see Q-{n})`

Always links to the relevant open question or option comparison. Used when exploration found evidence that challenges the brainstorming spec's claim.
