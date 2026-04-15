# Hybrid Classification Heuristic

Three-track system for classifying gray areas discovered during codebase exploration. Each gray area becomes exactly one of: Assumption (A), Option Comparison (B), or Open Question (C).

## Priority Rule

**Prefer lower tracks.** A over B, B over C. The goal is to minimize captain interaction -- assumptions are cheapest (batch confirmation), option comparisons are moderate (one-at-a-time decisions), and open questions are most expensive (freeform captain input). Only escalate to a higher track when the evidence genuinely requires it.

---

## Track A -- Assumption

**When to use:** The codebase already has precedent for this pattern. Build-explore found existing code that answers the gray area.

### Heuristic -- Triple-Gate Promotion

A candidate assumption is promoted to Track A only by passing one or more of three gates. The number of gates passed determines the confidence band. Soft "2+ consistent usages" is NOT sufficient on its own -- a claim supported by 2 files in the same layer with generic wording fails all three gates and must demote to Track C.

**Gate (i) -- cross-layer recurrence.** Evidence appears across >=2 distinct layers chosen from: domain, contract, router, view, seed, frontend, test, config. Two files inside the same layer do NOT pass this gate -- the recurrence must cross a layer boundary to demonstrate that the pattern is a codebase-wide convention rather than a local idiom.

**Gate (ii) -- predictive power.** The assumption predicts a plan/execute output rather than describing current state. Operational definition (inherited from sibling 104 Q-3): the claim contains a concrete action verb (add, extend, wire, register, serialize, migrate, etc.) AND a file-or-layer name that is NOT already mentioned in the entity's `## Directive`. A claim that only restates the directive's existing nouns has zero predictive power and fails this gate.

**Gate (iii) -- exclusivity.** The assumption is NOT a generic template match that would apply equally to an arbitrary sibling entity. Replace the subject of the claim with a sibling entity slug; if the claim remains plausibly true, it is template boilerplate and fails this gate. Exclusivity means the claim carries information specific to THIS entity's directive + codebase pairing.

### Promotion Mapping

| Gates passed | Classification | Numeric Range |
|---|---|---|
| 3-pass (i + ii + iii) | Track A -- Confident | 0.80 - 1.0 |
| 2-pass (any two of i/ii/iii) | Track A -- Likely | 0.50 - 0.79 |
| 1-pass (any one of i/ii/iii) | Track A -- Unclear | 0.20 - 0.49 |
| 0-pass (none) | demote to Track C Open Question |

The numeric score (0-1) is written alongside the label in the entity body: `Confidence: Confident (0.95)`. Explore assigns the score within the band using: recency of evidence, strength of the layer crossing in Gate (i), and specificity of the action verb in Gate (ii).

A 0-pass candidate is NOT an assumption at any confidence -- it must **demote to Track C** as an Open Question for the captain, because the codebase evidence does not distinguish this entity from any other.

### Mode B skip rule (ensign fallback)

When build-explore runs in **Mode B** (ensign fallback, no pre-dispatched code-explorer; see SKILL.md Step 2), the 4-way cross-layer evidence required by Gate (i) is not reliably available -- the inline mapping pass typically covers one or two layers at most. In **Mode B**, Gate (i) is SKIPPED; gates (ii) and (iii) still run inline against the files read. Consequently the maximum achievable in **Mode B** is 2-pass = Likely. A Mode B explore cannot produce a Confident Track A assumption -- Confident requires Mode A (code-explorer dispatched, multi-layer evidence). Record `(mode: B)` on the Confidence line when this cap applies.

### Gate operational tests -- worked examples

**Gate (i) example.** Claim: "Serialize new mutations through the existing dispatch envelope." Evidence cites `src/domain/snapshot.ts:112` AND `src/contract/channel.ts:44`. Two distinct layers (domain + contract) -- **passes Gate (i)**. Counter-example: evidence cites `src/domain/snapshot.ts:112` and `src/domain/comment.ts:30` -- both in domain layer, same-layer recurrence -- **fails Gate (i)**.

**Gate (ii) example.** Directive: "Add idle-timeout to the tunnel server." Claim: "Extend `tunnel-server.ts` handshake handler to emit an `idleDeadline` field." Action verb `extend` + file `tunnel-server.ts` NOT in directive's noun set (directive names "tunnel server" as a concept, not the specific file) + concrete new field `idleDeadline` -- **passes Gate (ii)**. Counter-example: "The tunnel server will have idle-timeout behavior." No action verb, no file name beyond the directive's nouns, describes state not output -- **fails Gate (ii)**.

**Gate (iii) example.** Claim: "Wire `SnapshotVersion` through `autoResolveComments` before the WS push to avoid stub-consumer regression." Replacing the subject with a sibling entity (e.g. entity 104's "idle-timeout") produces gibberish -- the claim is load-bearing on this entity's specific autoResolveComments coupling -- **passes Gate (iii)**. Counter-example: "Keep the existing middleware chain for new endpoints." Swap to any sibling entity that adds an endpoint and the claim remains plausibly true -- **fails Gate (iii)** as generic template match.

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

### Recommendation Validation (before marking Recommended)

Before marking any option as `Recommended`, validate it against two checks:

1. **Return value trace** (Behavioral/Callable domain): if the option involves changing how a method's return value is produced (async, stub, cache, proxy), trace the return value 2 levels deep through the codebase. If any downstream consumer requires the real value (e.g., DB-assigned ID, computed hash), the option must account for that or be downgraded to `Viable` / `Not recommended`. Example: entity 051 O-1 "fire-and-forget + stub" was marked Recommended but snap.version was consumed by autoResolveComments -- the stub would have broken production behavior. A 2-level trace would have caught this during explore.

2. **Design doc invariant cross-reference**: check the recommended option against ALL stated goals in the entity's source design doc -- not just the section directly referenced, but forward-looking sections (cloud readiness, multi-machine, distribution, SaaS). If the recommendation conflicts with a stated invariant, either revise the recommendation or surface the conflict as a Track C question for the captain. Example: entity 051 "shim direct DB" was valid for localhost but violated the design doc's implicit multi-machine goal (§3.3 Postgres forward-compatibility, §6.1 tunnel sharing).

If either check reveals a problem, fix the recommendation before writing the Option Comparison to the entity body. Do NOT defer to clarify what explore can resolve with deeper analysis.

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

1. **Search the codebase** for existing patterns related to the gray area, then phrase the candidate as a declarative claim suitable for the triple-gate test.
2. **Run all 3 gates** against the candidate: (i) cross-layer recurrence, (ii) predictive power, (iii) exclusivity. In **Mode B** (ensign fallback), Gate (i) is SKIPPED per the Mode B skip rule; run only (ii) and (iii).
3. **Count passes and apply the Promotion Mapping**: 3-pass = Track A Confident (0.80-1.0); 2-pass = Track A Likely (0.50-0.79); 1-pass = Track A Unclear (0.20-0.49); 0-pass = **demote to Track C** Open Question. Mode B caps at 2-pass = Likely.
4. **Found competing patterns?** --> Track B.
5. **Found nothing, but standard domain options exist?** --> Track B.
6. **Found nothing, no standard options?** --> Track C.
7. **Alpha marker from brainstorming unresolved after search?** --> Track C.

---

## Research Upgrade Path

After Step 5 hybrid classification, Step 5.5 dispatches researchers for assumptions and Track B options with external technology dependencies. Research results can upgrade or downgrade confidence scores -- but they cannot change the Track assignment.

### When research confirms an assumption

Append `(✓ research: {source} -- {finding})` to the assumption's `Evidence:` line. Adjust the numeric confidence score upward:

| Pre-research confidence | After confirmed research |
|---|---|
| Likely (0.50-0.79) | Confident (add +0.10 to +0.15, cap at 0.95) |
| Unclear (0.20-0.49) | Likely or Confident depending on finding depth |
| Confident (0.80+) | No change -- already validated |

Example: A-4 was Likely (0.75) based on one codebase usage. Researcher confirmed the external API behavior. Result: Confident (0.90) with annotation.

### When research contradicts an assumption

The assumption's confidence drops to 0.0 and it must be reclassified or escalated:

1. Append `(⚠ research contradicted: {source} -- {finding} -- see Research Findings)` to the Evidence line.
2. Write a `## Research Findings` subsection with the 5-domain treatment for the contradiction.
3. **Escalate options:**
   - If a viable alternative exists in the codebase: reclassify to Track B (competing options now exist).
   - If no viable alternative is known: escalate to Track C (Open Question for captain).
4. Do NOT leave the assumption at its original confidence -- a contradiction invalidates codebase-only evidence.

Example: A-5 was Likely (0.75) assuming "Next.js standalone server.js is importable". Researcher found it is NOT importable. Result: Track B (alternative import approach vs process-level hook) or Track C if no alternative is known.

### What research CANNOT do

- **Research cannot change the Track assignment unilaterally.** Reclassification (A→B, A→C) happens through the standard escalation paths above, triggered by a contradiction finding. Research that only confirms does not move tracks.
- **Research cannot override the Priority Rule** (A over B over C). If research confirms a Likely assumption, it stays Track A at higher confidence -- it does not get promoted to a Track B for further discussion.
- **Research does not replace codebase evidence.** Confirmed research adds to Evidence; it does not replace the original codebase-found evidence line.

### Depth scaling (from entity scope)

Research depth is calibrated to assumption confidence and entity scale. **Proactive validation rule**: dispatch researchers for ALL assumptions at Likely (0.50+) confidence or above, not just for external tech claims. Even Confident (0.85) assumptions carry 15% uncertainty -- proactive web research catches edge cases that codebase grep alone misses.

| Condition | Research mode |
|---|---|
| ALL assumptions Confident ≥0.95 AND no external tech claims AND Small scale | SKIP all research |
| assumptions 0.80-0.94 Confident with any external library/API/pattern reference | Lightweight (1 researcher, targeted) |
| assumptions 0.80-0.94 Confident, purely internal codebase patterns | Lightweight (1 researcher) -- validate via deeper codebase trace, not just grep |
| assumptions 0.50-0.79 Likely | Standard (1-2 researchers, parallel) -- includes web research |
| assumptions <0.50 Unclear | Deep (2-3 researchers, parallel + continuation) |

The skip threshold is intentionally tight (all ≥0.95 AND Small AND no external tech) to maximize proactive validation. Confident does not mean "skip research" -- it means "research is lightweight, not deep." The goal is to catch edge cases before they reach plan/execute, where the fix cost is 10x higher.
