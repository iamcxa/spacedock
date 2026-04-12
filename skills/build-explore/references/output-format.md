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
Confidence: Confident (0.95)
Evidence: src/server.ts:42 -- all 6 existing endpoints use this pattern

A-2: Store stage duration as computed value, not a separate column.
Confidence: Likely (0.70)
Evidence: scripts/status.sh:118 -- duration computed from entered_at diffs

A-3: Apply existing Zod frontmatter validation to new entity fields.
Confidence: Unclear (0.40)
Evidence: src/entity-loader.ts:27 -- validates 3 of 8 fields with Zod
```

Each assumption is a single block: declarative statement, confidence level with numeric score (0-1), and evidence with file path and line number. The numeric score makes confidence actionable -- the captain can see at a glance which assumptions carry risk. Ranges: Confident 0.80-1.0, Likely 0.50-0.79, Unclear 0.20-0.49.

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

Each question includes Domain (one of the 5 GSD domains), Why it matters, and Suggested options (or "None -- captain input needed" when genuinely open). Each field -- the `Q-n:` header, `Domain:`, `Why it matters:`, `Suggested options:`, and any `→ Answer:` annotation appended later by build-clarify -- MUST be separated from the next by exactly one blank line so markdown renders them as distinct paragraphs. Single-newline separation collapses into a wall of text when rendered in the dashboard UI.

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
  domain: 3 files (aggregate + command handler), contract: 2, view: 6, frontend: 3
- [x] Assumptions formed: 6 (Confident: 4, Likely: 1, Unclear: 1)
  A-1 through A-4 Confident via line-number evidence; A-5 Likely; A-6 Unclear (see Q-3)
- [x] Options surfaced: 2
  O-1 real-time update mechanism; O-2 entity storage format
- [x] Questions generated: 3
  Q-1 decomposition output shape; Q-2 naming convention; Q-3 frontend state strategy
- [x] α markers resolved: 2 / 3
  α-1 (protocol), α-2 (storage) resolved via codebase; α-3 (state) escalated to Q-3
- [x] Scale assessment: revised from Small to Medium
  initial Small was Brainstorming Spec estimate; 14-file breadth + 3 open questions push to Medium
```

**Detail lines (optional, Tier 1 rendering):** Each checklist item MAY have a single detail line directly below it, indented with 2 spaces (do not use tabs or deeper indentation). The dashboard parser reads this as the `detail` field of the Stage Report item and renders it under the metric in the UI card. Tier 1 detail is a single line -- multi-line detail is Tier 2 work deferred to Phase F. Keep detail concise: the "what" of each metric (file names, entity IDs, counts) so a reviewer understands the metric without opening the entity body.

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
