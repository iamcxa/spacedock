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
- Append after Suggested options, no blank line.
- If captain picked an AskUserQuestion option, quote the label verbatim.
- If captain typed freeform, record the full response verbatim.
- Include captain identifier, ISO date, `(interactive)` suffix.

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
- [x] Assumptions confirmed: {n} / {total} ({n corrected})
- [x] Options selected: {n} / {total}
- [x] Questions answered: {n} / {total}
- [x] Canonical refs added: {n}
- [x] Context status: ready
- [x] Handoff mode: {loose|tight}
- [x] Clarify duration: {n} questions asked, session complete
```

Rules:
- All eight metric lines are mandatory -- use `0` or `not-applicable` rather than omitting.
- Each line MUST use checklist format (`- [x]` for done, `- [ ]` for pending, `- [ ] SKIP: ...` or `- [ ] FAIL: ...` for partial stages) per parser contract (`tools/dashboard/src/frontmatter-io.ts:140`). Flat bullets (`- {metric}`) are a drift bug; the dashboard will render the Stage Report card as empty.
- Must be the LAST `## Stage Report: {name}` section in the entity body.
- Parsed by FO and status script -- keep field names exact.

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
