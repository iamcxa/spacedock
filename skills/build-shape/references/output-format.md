# /shape Output Format Contract

This document is the canonical specification for the shape artifact produced by `skills/build-shape/SKILL.md`. It governs what sections appear in the entity body after a successful shape session, in what order they must appear, what each section must contain, and the lifecycle rules that protect the artifact once validated.

Consumers of this contract: `skills/build-brainstorm/SKILL.md` (Lens (a) captain-stated-intent prompt input), `skills/build-clarify/SKILL.md` (shape-present skip predicate), `skills/build-shape/SKILL.md` (writer), forge fixtures (assertion targets).

---

## Escape Hatch Output

When the skill's Step 1 heuristic detects a Small or bugfix-level directive (e.g., "fix typo in README", "bump dep version"), the skill emits the following single block and exits immediately. No entity is created. No body sections are emitted.

```
shape unnecessary -- run `/build {directive}` directly
```

The heuristic fires on: single-sentence directives with no feature nouns, directives that match the pattern "fix {noun} in {file}", "bump {dep} to {version}", "rename {X} to {Y}". If the heuristic fires, the skill exits with exit code 0 and produces no output artifact. The escape hatch is not configurable -- it is a hard gate.

---

## Frontmatter Impact

The `/shape` skill writes to and reads from a single frontmatter field: `shape_status`.

| Value | Meaning | Who writes it |
|---|---|---|
| `draft` | Shape session started, not yet validated | `/shape` at entity creation |
| `validated` | Shape session completed, align stage passed | `/shape` ship step |
| `n/a` | Entity created via `/build` directly, no shape path | `/build` at entity creation |
| _(absent)_ | Shape has never run on this entity | -- |

Lifecycle transitions:
- `/shape "directive"` is invoked → entity created with `shape_status: draft`
- Captain accepts problem statement + user stories + scope boundary → ship step writes `shape_status: validated`
- `/build "directive"` is invoked (no `--from`) → entity created with `shape_status: n/a`

`shape_status` is additive to (not replacing) `context_status`. Both fields coexist on entity frontmatter.

---

## Immutable-Pitch Rule (P-4)

Once `shape_status: validated` is committed to the entity file, the five body sections (`## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References`) MUST NOT be mutated in-place.

If captain wants to revise the shape:

1. Open a NEW entity file with `supersedes: {old-slug}` in frontmatter.
2. Run `/shape "revised directive"` against the new entity.
3. The old entity remains frozen at `shape_status: validated`.

Rationale (Basecamp Shape Up immutable-pitch discipline): a validated shape is a commitment artifact. Mutating it after downstream work (`/build --from`, brainstorm, clarify) has consumed it breaks traceability between user stories and implementation. The `supersedes:` pattern preserves history while enabling revision.

The `/shape` skill enforces this rule: if invoked on an entity that already has `shape_status: validated`, it refuses to run and emits:

```
Immutable-pitch rule: this entity already has shape_status: validated.
To revise, open a new entity with supersedes: {slug} in frontmatter.
```

---

## Decomposition Boundary

If a shape session reveals that the directive is actually N distinct features (separate problem statements, non-overlapping user populations, or scope boundaries that conflict), the skill emits a **decomposition recommended** verdict and exits without completing the shape artifact.

The verdict block:

```
decomposition recommended -- directive spans N distinct features.
Shape cannot proceed on a multi-feature directive.
Next step: open N separate entities and run /shape on each.
```

Decomposition is NOT performed inside `/shape`. The build-pipeline's existing decomposition gate (downstream, in build-clarify or build-plan) owns that responsibility. Shape's role is to detect the condition and surface it to the captain -- not to split the entity.

---

## Required Body Sections

When shape completes successfully (escape hatch did not fire, decomposition was not recommended, align stage passed), the entity body MUST contain exactly these five sections, in this captain-locked order:

1. `## Problem Statement`
2. `## User Stories`
3. `## Scope: In`
4. `## Scope: Out`
5. `## References`

No other ordering is valid. The section-order-drift grep check in forge fixtures enforces this (Q-4 answer: linear-by-author ordering, captain 2026-04-15).

These sections appear in the entity body AFTER `## Captain Context Snapshot` (if present) and BEFORE brainstorm output sections (`## Lens Evidence`, `## Goal Check`, `## Brainstorming Spec`).

---

## Section Specifications

### `## Problem Statement`

A single cohesive paragraph (3-6 sentences) describing:
- The gap or pain that exists today
- Who experiences it
- Why it matters now

The problem statement is authored by the `build-shape-framer` subagent (opus), refined through captain selection from 2-3 candidates. It is NOT a solution statement. It does NOT mention implementation approach.

Example:

> The current `/build` pipeline jumps straight to technical brainstorming without first confirming product direction. For Medium+ features, this causes late-discovered direction changes that waste clarify cycles on specs aimed at the wrong target. Solo contributors and team leads who type `/build` must backtrack after seeing a technically-correct-but-wrong-problem APPROACH block. The problem is not skill quality -- it is sequence: product alignment and technical design are collapsed into a single flow that optimizes for technical precision, not product clarity.

---

### `## User Stories`

A bulleted list of 3-5 user stories in the literal "As a {role}, I want {action}, so that {value}" format. Nothing else counts as a user story in this contract. No paragraph rewrites. No "The system should" format. No passive voice.

Stories are authored by the `build-shape-story-gen` subagent (sonnet), generated from the accepted problem frame. Each story is numbered `US-1` through `US-n` for downstream citation traceability (build-brainstorm's Lens (a) references stories by number).

Format:

```
- US-1: As a {role}, I want {action}, so that {value}.
- US-2: As a {role}, I want {action}, so that {value}.
- US-3: As a {role}, I want {action}, so that {value}.
```

Examples:

```
- US-1: As a captain, I want to run /shape before /build on Medium+ features, so that I confirm product direction before committing to a technical spec.
- US-2: As a captain, I want Small/bugfix directives to bypass shape automatically, so that I don't slow down routine maintenance tasks.
- US-3: As a first officer, I want to read validated user stories in the entity body, so that brainstorm output references specific accepted intent rather than re-deriving it.
```

---

### `## Scope: In`

A bulleted list of what is explicitly included in this feature. Each bullet is a concrete deliverable or behavioral guarantee. Vague scoping (e.g., "good performance") is not acceptable -- bullets must be specific enough to be verifiable.

Authored by the `build-shape-scope-drafter` subagent (sonnet). Captain may accept or prune the proposed list during the align stage.

Example:

```
## Scope: In

- New `skills/build-shape/SKILL.md` registered as `/shape` via `user-invocable: true` frontmatter
- Escape hatch: Small/bugfix directives exit without creating an entity
- Three context-isolated subagent wrappers: framer (opus), story-gen (sonnet), scope-drafter (sonnet)
- `shape_status: draft|validated|n/a` frontmatter field added to entity schema
- `/build --from {slug}` flag on `skills/build/SKILL.md` to load shape sections into Lens (a)
```

---

### `## Scope: Out`

A bulleted list of explicit exclusions -- things NOT being built in this feature, included to prevent scope creep and to document considered-but-rejected additions. Each bullet names what is excluded and (optionally) WHY in a parenthetical.

Example:

```
## Scope: Out

- `/commission`-based shape pipeline (rejected -- dual-pipeline sync, captain-interactive impedance mismatch)
- Automatic shape detection in `/build` (rejected v1 -- captain drives routing; add later if friction observed)
- Reshape-mid-build on existing validated entities (rejected -- immutable-pitch discipline; use `supersedes:` pattern)
- Dashboard `shape_status` pill on entity detail page (deferred to v2)
- Cross-entity shape conflict detection (deferred to v2)
```

---

### `## References`

A bulleted list of citations supporting the shape artifact. References may be:
- File paths with line numbers: `skills/build-shape/SKILL.md:42`
- Entity slugs: `entity 095 pipeline-ui-review-stage`
- External links: `https://basecamp.com/shapeup`
- Design doc sections: `docs/build-pipeline/shape-pre-build-alignment-skill.md -- P-4 immutable-pitch rule`

The references section is populated by the skill's ship step from sources cited during the align stage. Downstream consumers (build-brainstorm's Lens (a), build-clarify's shape-skip predicate) use this section to trace shape artifact provenance.

Example:

```
## References

- docs/build-pipeline/shape-pre-build-alignment-skill.md -- Directive, Acceptance Criteria, P-4
- skills/build-clarify/references/output-format.md -- canonical reference-doc structure
- https://basecamp.com/shapeup -- Basecamp Shape Up: problem/appetite/solution/rabbit-holes/no-gos
- entity 095 pipeline-ui-review-stage -- surfaced the product-alignment gap that motivates /shape
```

---

## Full Example Entity Body (after successful shape)

Below is a minimal but valid shape artifact showing all five sections in captain-locked order:

```markdown
## Problem Statement

The current /build pipeline jumps to technical brainstorming without confirming product direction. For Medium+ features, this causes late-discovered direction changes that waste clarify cycles. Solo contributors must backtrack after seeing a correct-but-wrong-problem APPROACH block. Product alignment and technical design should be separate, complementary flows.

## User Stories

- US-1: As a captain, I want to run /shape before /build on Medium+ features, so that I confirm product direction before committing to a technical spec.
- US-2: As a captain, I want Small/bugfix directives to bypass shape automatically, so that routine maintenance is not slowed down.
- US-3: As a first officer, I want to read validated user stories in the entity body, so that brainstorm output references specific accepted intent.

## Scope: In

- New skills/build-shape/SKILL.md registered as /shape via user-invocable: true frontmatter
- Escape hatch for Small/bugfix directives (exits without creating entity)
- Three context-isolated subagent wrappers (framer, story-gen, scope-drafter)
- shape_status: draft|validated|n/a frontmatter field on entity schema
- /build --from {slug} flag loading shape sections into Lens (a)

## Scope: Out

- /commission-based shape pipeline (rejected -- dual-pipeline sync problem)
- Automatic shape detection in /build (rejected v1 -- captain drives routing)
- Reshape-mid-build on validated entities (rejected -- immutable-pitch discipline)

## References

- docs/build-pipeline/shape-pre-build-alignment-skill.md -- full design document
- https://basecamp.com/shapeup -- immutable-pitch discipline source
```
