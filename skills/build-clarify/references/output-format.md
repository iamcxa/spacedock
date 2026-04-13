# Build-Clarify Output Format

build-clarify annotates the entity body in place. It does NOT replace sections written by
build-explore -- it appends annotations that build-clarify owns. This reference defines the
exact format for every annotation so downstream consumers (plan, FO, status script) can
parse them reliably.

## Annotation: Assumption Confirmed

After Step 2 (Assumption Batch Confirmation), each assumption gets a single-line annotation
appended directly under its existing Evidence line(s):

```markdown
A-1: Dashboard filter chips use server-side query parameters
Confidence: Confident
Evidence: tools/dashboard/src/server.ts:142 -- existing stage filter uses ?status= param
→ Confirmed: captain, 2026-04-10 (batch)
```

## Annotation: Assumption Corrected

If the captain corrects an assumption in the batch, append a SINGLE correction line below
the Evidence line(s). The format combines metadata and the captain's correction verbatim:

```markdown
A-3: Cross-instance sync uses HTTP POST bridge
Confidence: Unclear
Evidence: src/server.ts:88 -- forwardToCtlServer exists but untested for highlight payloads
→ Corrected by captain, 2026-04-10 (batch): "use WebSocket broadcast via existing channel, not HTTP"
```

Rules:
- Use `→ Confirmed:` or `→ Corrected by` (single-arrow prefix) consistently.
- One line per assumption annotation -- never two.
- Confirmed format: `→ Confirmed: captain, {ISO-date} ({mode})`
- Corrected format: `→ Corrected by captain, {ISO-date} ({mode}): "{verbatim correction}"`
- `({mode})` is `(batch)` for Step 2 responses, `(interactive)` for Step 3/4 annotations.
- Include ISO date (YYYY-MM-DD).
- Never delete the original Confidence or Evidence lines -- append only.

## Annotation: Option Selected

After Step 3 (Option Selection), append a selection line below the option table:

```markdown
### Filter chip rendering

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| Reuse existing stage chip CSS | Consistent, zero new CSS | Limited to pill shape | Low | ✅ Recommended |
| New dropdown component | More compact for many values | New JS, new CSS | Medium | |
| Toggle buttons | Familiar UI | Takes more horizontal space | Low | |

→ Selected: Reuse existing stage chip CSS (captain, 2026-04-10, interactive)
```

Rules:
- Append after the table, one blank line separator.
- Quote the selected option's Option column verbatim.
- Include captain identifier, ISO date, and `(interactive)` suffix.
- If captain chose "Other" and gave freeform, record: `→ Selected: Other -- {verbatim captain text}`.

## Annotation: Open Question Answered

After Step 4 (Open Question Resolution), append an answer line below the Suggested options:

```markdown
Q-2: Should highlights persist across sessions or be ephemeral?

Domain: User-facing Visual -- State handling

Why it matters: Affects API response shape and UI complexity

Suggested options: (a) Persistent (SQLite) (b) Ephemeral (memory)

→ Answer: Persistent via SQLite (captain, 2026-04-10, interactive)
```

Rules:
- Append after Suggested options with exactly one blank line separating them (markdown paragraph break). Earlier versions used "no blank line" which collapsed the Answer into the Suggested options paragraph in the dashboard UI -- fixed in Phase D (D.2).
- If captain picked an AskUserQuestion option, quote the label verbatim.
- If captain typed freeform, record the full response verbatim.
- Include captain identifier, ISO date, `(interactive)` suffix.

## Annotation: Open Exploration Item

Step 4.5 creates items in the SAME A-n/Q-n format as explore (per Q-1 answer), appended to
the existing `## Assumptions` or `## Open Questions` sections with numbering continuing from
explore's last entry.

The annotation is written inline (assumption confirmed or question answered in the same
iteration), so the annotation line (`→ Confirmed:` or `→ Answer:`) always appears
immediately with mode `(interactive)`.

Example showing A-6 created by Step 4.5 when explore produced A-1 through A-5:

```markdown
A-6: WebSocket reconnection uses exponential backoff
Confidence: Confident (0.90)
Evidence: captain domain knowledge -- standard practice for production WS clients
→ Confirmed: captain, 2026-04-13 (interactive)
```

Note: items created by Step 4.5 are indistinguishable from explore-created items by format.
This is intentional (per Q-1 answer) -- downstream parsers (build-plan, FO, status script)
process them identically.

**Arrow style rule:** All annotation arrows use → (U+2192 unicode), never -> (ASCII). This
matches all other annotation sections throughout build-clarify and build-explore outputs.

## Annotation: Step 1.5 Re-Validation

Step 1.5 produces five annotation types that may appear on assumption Evidence lines or below option tables. All use double dash (`--`), never em dash.

### 1a -- Evidence Freshness annotations

Appended inline after the `Evidence:` line of an assumption. One line, no blank line separator.

```markdown
Evidence: tools/dashboard/src/server.ts:142 -- existing stage filter uses ?status= param
(⚠ stale-evidence: line 142 now shows body-param filtering; claim still plausible, semantics preserved)
```

```markdown
Evidence: skills/build-clarify/SKILL.md:91 -- Step 1 has no validation logic
(⚠ contradicted: SKILL.md:91-108 now includes validation logic added by entity 076 -- see Q-4)
```

### 1c -- Option Validity annotation

Appended below an option table (one blank line separator) when sub-check 1c merges duplicate options.

```markdown
(⚠ dedup: merged "Real-time push using SSE endpoint" and "Server-Sent Events via Bun.serve" -- see dedup note)
```

### 1e -- Research Re-Validation annotations

Appended inline after a `(✓ research: ...)` annotation on an assumption's Evidence line.

```markdown
(✓ research: bun.sh/docs/api/websockets -- WebSocket upgrade confirmed in Bun 1.0+)
(⚠ stale-research: bun.sh/docs/api/websockets now documents breaking API change in 1.1 -- verify upgrade path)
```

```markdown
(✓ research: RFC 7230 -- HTTP/1.1 chunked transfer encoding supports streaming)
(⚠ research-contradicted: cited RFC section now shows limitation for target use case -- see Q-5)
```

### New A-n / Q-n entries from sub-checks 1b and 1d

Items created by sub-checks 1b (contradiction-detected questions) and 1d (coverage gaps) use the SAME format as explore-created items. Downstream parsers (build-plan, FO, status script) process them identically.

### Stage Report metric for Step 1.5

The `## Stage Report: clarify` section includes a `Re-validation` metric line between `Decomposition` and `Assumptions confirmed`:

```markdown
- [x] Re-validation: {n} assumptions checked, {n} stale, {n} contradicted, {n} options deduped, {n} coverage gaps, {n} research re-validated
  e.g., "5 assumptions checked, 1 stale (A-2 line shifted), 0 contradicted, 0 deduped, 1 coverage gap (A-6 added), 0 research re-validated"
```

Rules:
- Use `- [x]` checklist format per parser contract.
- All six counts are mandatory -- use `0` rather than omitting.
- Appears AFTER `Decomposition` and BEFORE `Assumptions confirmed`.
- If Step 1.5 was skipped (empty case or resume case), write: `- [x] Re-validation: skipped (empty case)` or `- [x] Re-validation: skipped (resume case)`.

## Section: Canonical References

Build-clarify CREATES this section (if not already present) during Step 4. It is append-only
throughout the session -- every file path the captain references during Q&A gets appended.

```markdown
## Canonical References

- `docs/superpowers/specs/2026-04-09-adr-001-single-server-8420-design.md` -- ADR for
  single-server architecture (captain cited during Q-2 answer)
- `tools/dashboard/src/detail.css` -- highlight CSS precedent (captain cited during O-1
  selection)
```

Rules:
- Bullet list, one entry per reference.
- Format: `` `{relative-path}` -- {why captain cited it} ({which Q/O number}) ``
- Append-only. Never reorder, never delete.
- If the section does not exist, create it AFTER `## Open Questions` and BEFORE `## Stage
  Report: explore`.
- File paths must be relative to the repo root (not absolute).

## Section: Stage Report: clarify

Written as the LAST new section at the end of Step 6 (Commit). Appended AFTER existing
`## Stage Report: explore` but BEFORE the frontmatter update.

```markdown
## Stage Report: clarify

- [x] Decomposition: {accepted|modified|rejected|not-applicable}
  e.g., "not-applicable -- entity is Small scope, no children proposed"
- [x] Re-validation: {n} assumptions checked, {n} stale, {n} contradicted, {n} options deduped, {n} coverage gaps, {n} research re-validated
  e.g., "5 assumptions checked, 1 stale (A-2 line shifted), 0 contradicted, 0 deduped, 1 coverage gap (A-6 added), 0 research re-validated"
- [x] Assumptions confirmed: {n} / {total} ({n corrected})
  e.g., "A-1, A-2, A-4 confirmed via batch; A-3 corrected captain cited src/foo.ts"
- [x] Options selected: {n} / {total}
  e.g., "O-1 Filter UI placement -- Second chip row per workflow card (recommended)"
- [x] Questions answered: {n} / {total}
  e.g., "Q-1 persisted via client-side filterState; Q-2 always-visible spec interpretation"
- [x] Open exploration: {n} gray areas surfaced ({n} from templates, {n} from CONTRACTS, {n} from directive, {n} via freeform)
  e.g., "3 gray areas surfaced (1 from templates, 1 from CONTRACTS, 0 from directive, 1 via freeform)"
- [x] Canonical refs added: {n}
  e.g., "entity 009 app.js:244-246; ADR-001 single-server architecture"
- [x] Context status: ready
  e.g., "gate passed: all assumptions confirmed, all options selected, all Qs answered"
- [x] Handoff mode: {loose|tight}
  e.g., "loose means captain must say 'execute {slug}'; tight means auto_advance: true in frontmatter"
- [x] Clarify duration: {n} questions asked, session complete
  e.g., "7 AskUserQuestion calls (1 batch + 1 option + 2 Qs + 3 exploration iterations)"
```

Rules:
- All eight metric lines are mandatory -- use `0` or `not-applicable` rather than omitting.
- Each line MUST use checklist format (`- [x]` for done, `- [ ]` for pending, `- [ ] SKIP: ...` or `- [ ] FAIL: ...` for partial stages) per parser contract (`tools/dashboard/src/frontmatter-io.ts:140`). Flat bullets (`- {metric}`) are a drift bug; the dashboard will render the Stage Report card as empty.
- Must be the LAST `## Stage Report: {name}` section in the entity body.
- Parsed by FO and status script -- keep field names exact.

**Detail lines (optional, Tier 1 rendering):** Each checklist item MAY have a single detail line directly below it, indented with 2 spaces (do not use tabs or deeper indentation). The dashboard parser reads this as the `detail` field of the Stage Report item and renders it under the metric in the UI card. Tier 1 detail is a single line -- multi-line detail is Tier 2 work deferred to Phase F. For clarify, detail should capture the decision: which option was selected, which assumptions were corrected, which refs were cited. This turns the Stage Report into a one-glance decision audit trail.

**Canonical detail line exemplars:** When writing detail lines, match the style demonstrated by entity 047 (entity-body-rendering-hotfixes). Entity 047's Stage Report: clarify shows decision-audit detail (e.g., "A-1 through A-5 all Confident-level with file:line evidence; captain confirmed entire batch"). For clarify, detail should capture the decision: which option was selected, which assumptions were corrected, which refs were cited. Authors should match this decision-audit style for clarify detail lines.

## Frontmatter Updates

At the end of Step 5 (Context Sufficiency Gate passes), update frontmatter:

```yaml
context_status: ready
```

At the end of Step 6 (hybrid handoff), if and only if `auto_advance: true`:

```yaml
status: plan   # was: clarify
```

Otherwise status stays at `clarify` until captain says "execute {slug}" (FO handles that
transition separately).
