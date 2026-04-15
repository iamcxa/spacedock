---
name: build-shape
description: "Pre-build alignment skill. Captures product-level intent (problem framing / user stories / scope boundary) into entity body sections via captain-interactive loop + 3 subagent dispatches. Consumed by /build --from {slug}. Triggers on '/shape', 'shape a feature', 'align before build', or when captain has a Medium+ feature needing product-level alignment before technical brainstorming."
user-invocable: true
argument-hint: "[raw directive | --from {existing-slug}]"
---

# Build-Shape -- Pre-Build Product Alignment

You are running the `/shape` skill. A captain has a Medium+ feature directive and wants to confirm product-level intent (problem framing, user stories, scope boundary) BEFORE entering the technical brainstorming flow of `/build`.

This skill produces five locked body sections on a pipeline entity (`## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References`) that downstream `/build --from {slug}` consumes as Lens (a) captain-stated-intent input.

**Nine steps, in strict order. Steps 3-6 interact with the captain via AskUserQuestion; Steps 0, 1, 2, 7, 8 are internal.**

The output contract is canonical in `skills/build-shape/references/output-format.md` -- read that file before any edit to this skill.

---

## Prerequisites

This skill depends on the **kc-plugin-forge** plugin for forge fixture validation (`smoke-tests/build-shape-f*.smoke.yaml`). If forge is not installed, the design-time fixtures cannot be replayed but the runtime skill still functions normally.

To install kc-plugin-forge, follow the instructions at the plugin marketplace (out of scope for entity 103 to automate). If you are a captain invoking `/shape` and forge is missing, the skill still runs; the dependency only matters for skill-development workflows that re-validate fixtures after edits.

---

## Step 0: Parse Arguments and Gate on Immutable-Pitch

Parse `$ARGUMENTS` into one of two shapes:

1. **Raw directive**: `/shape "Add dark mode toggle to dashboard"` -- a quoted or unquoted directive with no `--from` flag.
2. **Resume-from-slug**: `/shape --from {existing-slug}` -- resumes a draft shape session on an existing entity. NO additional directive text may follow `--from {slug}` (P-4 / Q-5 enforcement: directives belong to the entity at creation time; reshaping is via `supersedes:`, not via re-invocation).

If captain passes both `--from {slug}` AND extra directive text, REFUSE with:

```
Refused: /shape --from {slug} does not accept additional directive text.
The shape is anchored to the entity at creation. To revise the directive,
open a new entity with supersedes: {slug} in frontmatter and run /shape there.
(P-4 immutable-pitch discipline; Q-5 answer.)
```

EXIT.

If the target entity (resolved from `--from {slug}` or, after Step 2, the freshly created slug) has frontmatter `shape_status: validated`, REFUSE with:

```
Immutable-pitch rule: this entity already has shape_status: validated.
To revise, open a new entity with supersedes: {slug} in frontmatter.
```

EXIT. Do NOT mutate any of the five locked body sections on a validated entity.

---

## Step 1: Assume -- Escape Hatch on Small/Bugfix Directives

Apply the heuristic from `references/output-format.md` (Escape Hatch section) to the raw directive. The heuristic fires when ALL of:

- Directive is a single sentence under ~80 characters AND
- Directive matches a small-directive pattern: `fix {noun} in {file}` / `bump {dep} to {version}` / `rename {X} to {Y}` / starts with bugfix keywords (`fix typo`, `fix bug`, `bump`, `rename`).

Captain may also pass an explicit `--force-shape` override flag to bypass the escape hatch (rare; useful for small directives that nonetheless deserve product alignment).

If the heuristic fires (and `--force-shape` is NOT set), emit verbatim:

```
shape unnecessary -- run `/build {directive}` directly
```

EXIT with exit code 0. Do NOT create an entity. Do NOT emit any body sections.

---

## Step 2: Assume -- Create Draft Entity

If Step 0 parsed `--from {slug}`, skip entity creation and load the existing draft entity. Otherwise:

1. Generate a slug from the directive (lowercase, hyphenated, ~3-6 words).
2. Create `docs/build-pipeline/{slug}.md` with frontmatter:
   ```yaml
   ---
   slug: {slug}
   shape_status: draft
   context_status: pending
   ---
   ```
3. Add a `## Captain Context Snapshot` section capturing the raw directive verbatim plus invocation timestamp.

Do NOT pre-populate any of the five locked body sections in this step.

---

## Step 3: Imagine -- Frame the Problem (framer subagent + AskUserQuestion)

Dispatch the framer wrapper subagent:

```
Agent(subagent_type="build-shape-framer", prompt="Directive: {raw directive}\n\nProduce 2-3 candidate problem statements per output-format.md section ## Problem Statement. Each candidate is a 3-6 sentence cohesive paragraph describing the gap, who experiences it, and why it matters now. Do NOT include solution language.")
```

Receive 2-3 candidates. Present to captain via AskUserQuestion:

- question: "Which problem statement frames this best?"
- options: each candidate (truncated to fit 80-char label) plus a "revise inline" option.

If captain selects "revise inline", loop with framer using captain's edit notes until captain accepts. When captain commits, write the accepted problem statement to entity body section `## Problem Statement` (immediately after `## Captain Context Snapshot`).

---

## Step 4: Imagine -- Generate User Stories (story-gen subagent + AskUserQuestion)

Dispatch the story-gen wrapper subagent:

```
Agent(subagent_type="build-shape-story-gen", prompt="Accepted problem statement:\n{accepted statement}\n\nProduce 3-5 user stories in the literal 'As a {role}, I want {action}, so that {value}' format, numbered US-1 through US-n. No paragraph rewrites. No 'The system should' format. Reference output-format.md for the contract.")
```

Receive 3-5 stories. For each story, present via AskUserQuestion:

- question: "Accept user story US-{n}?"
- options: "Accept", "Edit", "Drop".

Loop until captain has confirmed/edited/dropped each candidate. Final accepted set MUST be 3-5 stories (if captain drops below 3, prompt story-gen for replacements). Renumber accepted stories sequentially `US-1..US-n`. Write the final list to entity body section `## User Stories`.

---

## Step 5: Align -- Draft Scope Boundary (scope-drafter subagent + AskUserQuestion)

Dispatch the scope-drafter wrapper subagent:

```
Agent(subagent_type="build-shape-scope-drafter", prompt="Accepted frame:\n{problem statement}\n\nAccepted user stories:\n{user stories}\n\nProduce two bulleted lists: ## Scope: In (concrete deliverables / behavioral guarantees, each bullet specific enough to verify) and ## Scope: Out (explicit exclusions, optional WHY in parenthetical). Reference output-format.md sections.")
```

Receive proposed In/Out lists. Present each list via AskUserQuestion:

- question: "Confirm Scope: In bullets? (Accept all / Edit / Prune)"
- question: "Confirm Scope: Out bullets? (Accept all / Edit / Prune)"

Loop until captain commits. Write accepted lists to entity body sections `## Scope: In` and `## Scope: Out` respectively. Accumulate any reference URLs / file paths / entity slugs cited during the align dialog into a running references list (used in Step 7).

---

## Step 6: Align -- Decomposition Gate

If during Step 3, 4, or 5 the dialog reveals that the directive is actually N distinct features (separate problem statements, non-overlapping user populations, or scope boundaries that conflict), STOP and emit verbatim:

```
decomposition recommended -- directive spans N distinct features.
Shape cannot proceed on a multi-feature directive.
Next step: open N separate entities and run /shape on each.
```

EXIT. Leave the entity at `shape_status: draft`. Do NOT advance to Step 7. Decomposition is delegated to the build-pipeline's downstream decomposition gate (build-clarify or build-plan); shape only detects and surfaces the condition. The captain or first officer will open N child entities and re-invoke `/shape` per child.

---

## Step 7: Ship -- Validate and Persist

When Steps 3-5 all complete without decomposition trigger:

1. Append a `## References` section populated from the accumulated references list (Step 5). Format: bulleted citations per `references/output-format.md` (file paths with line numbers, entity slugs, external URLs, design doc sections).
2. Verify section order matches the captain-locked order from `output-format.md`:
   1. `## Problem Statement`
   2. `## User Stories`
   3. `## Scope: In`
   4. `## Scope: Out`
   5. `## References`
3. Write a `## Stage Report: shape` section summarizing: directive, subagent dispatches (framer / story-gen / scope-drafter), captain accept counts, final story count.
4. Transition frontmatter `shape_status: draft → validated`.
5. Commit the entity file.

---

## Step 8: Emit Next-Step Hint

Print verbatim:

```
shape complete -- shape_status: validated on docs/build-pipeline/{slug}.md
Run `/build --from {slug}` when ready to enter the build pipeline.
```

EXIT.

---

## No-Exceptions

These four rules are non-negotiable. Each maps to a P-* discipline or Q-* answer in `docs/build-pipeline/shape-pre-build-alignment-skill.md`.

1. **NEVER rerun on a validated entity.** If `shape_status: validated`, refuse per Step 0 and direct captain to the `supersedes:` pattern. Mutating a validated shape breaks downstream traceability between user stories and implementation. (P-4 immutable-pitch discipline.)

2. **NEVER decompose inside shape.** If a multi-feature condition is detected (Step 6), emit the decomposition-recommended verdict and EXIT. Decomposition belongs to the build-pipeline decomposition gate (build-clarify or build-plan), NOT to shape. Splitting an entity inside shape would silently fork the captain's intent.

3. **NEVER skip the escape-hatch on small directives.** If the heuristic in Step 1 fires AND `--force-shape` is not set, exit with the `shape unnecessary` block. Routing small/bugfix directives through the full 9-step shape flow wastes captain time and pollutes the entity backlog with thin shape artifacts.

4. **NEVER accept extra directive text alongside `--from {slug}`.** Refuse per Step 0. The shape is anchored to the entity at creation time; reshaping is via `supersedes:`, not via re-invocation. (P-4 / Q-5 enforcement.)

---

## TDD Validation (skill-development only)

This skill ships with four forge fixtures under `smoke-tests/`:

- `build-shape-f1-large-ui.smoke.yaml` -- Large UI directive, expects all 5 sections + "As a"/"so that"
- `build-shape-f2-large-runtime.smoke.yaml` -- Large runtime directive, same assertions
- `build-shape-f3-medium-workflow.smoke.yaml` -- Medium workflow directive, same assertions
- `build-shape-f4-small-escape-hatch.smoke.yaml` -- Small directive, expects `shape unnecessary` + `/build`, NOT the section headers

When kc-plugin-forge is installed, run:

```
forge validate skills/build-shape
```

All 4 fixtures must pass. Assertion tuning during the GREEN cycle is acceptable; schema changes (adding/removing/renaming the 5 locked sections) require a coordinated edit to `references/output-format.md` first.
