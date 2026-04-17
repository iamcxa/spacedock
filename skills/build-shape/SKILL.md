---
name: build-shape
description: "Pre-build alignment skill. Captures product-level intent (problem framing / user stories / scope boundary) into entity body sections via captain-interactive loop + 3 subagent dispatches. Consumed by /build --from {slug}. Triggers on '/shape', 'shape a feature', 'align before build', or when captain has a Medium+ feature needing product-level alignment before technical brainstorming."
user-invocable: true
argument-hint: "[raw directive | --from {existing-slug}]"
---

# Build-Shape -- Pre-Build Product Alignment

You are running the `/shape` skill. A captain has a Medium+ feature directive and wants to confirm product-level intent (problem framing, user stories, scope boundary) BEFORE entering the technical brainstorming flow of `/build`.

Captain's directive is *initial hypothesis*, not *final requirement*. SO's job throughout this skill -- and especially at the Step 5.5 gap-to-goal pressure test -- is to challenge whether what captain asked for is actually the shortest path to the goal captain stated. Do not merely elaborate the directive; pressure-test the framing. A successful shape session often ends with a different scope than captain initially proposed, and that is the point.

This skill produces five locked body sections on a pipeline entity (`## Problem Statement`, `## User Stories`, `## Scope: In`, `## Scope: Out`, `## References`) that downstream `/build --from {slug}` consumes as Lens (a) captain-stated-intent input.

**Ten steps, in strict order. Steps 3-6 (including 5.5) interact with the captain via AskUserQuestion; Steps 0, 1, 2, 7, 8 are internal.**

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

### Raw-Directive Self-Seed (Entry B)

When Step 0 parses a raw directive (no `--from` flag), the skill must create the entity file before proceeding to Step 1 (escape hatch) and Steps 3-7. This makes `/shape` a true independent entry point that does not require a pre-existing entity.

**Self-seed procedure**:

1. **Run escape hatch first**: Step 1's heuristic fires before entity creation. If the escape hatch fires, EXIT -- no entity is created.
2. **Generate entity ID**: use the same logic as /build Phase III Step 2 (skills/build/SKILL.md:150-162):
   ```bash
   (ls docs/build-pipeline/*.md docs/build-pipeline/_archive/*.md 2>/dev/null || true) \
     | xargs grep -l "^id:" 2>/dev/null \
     | xargs grep "^id:" \
     | sed 's/.*id: *//' \
     | sort -n \
     | tail -1
   ```
   Next ID = highest + 1.
3. **Generate slug**: from the directive text (lowercase, spaces to hyphens, strip non-alphanumeric except hyphens, max 50 chars).
4. **Create entity file** at `docs/build-pipeline/{slug}.md` with frontmatter:
   ```yaml
   ---
   id: {next_id}
   title: {first 80 chars of directive}
   slug: {slug}
   status: draft
   context_status: pending
   source: /shape
   created: {ISO 8601 timestamp}
   shape_status: draft
   intent:
   scale:
   project: {project from git root basename}
   ---
   ```
5. **Write Captain Context Snapshot**: add `## Captain Context Snapshot` with the raw directive verbatim plus invocation timestamp.
6. **Proceed to Step 1** (escape hatch) then Step 2 (which detects the existing entity and skips its own creation).

**Ordering clarification**: The self-seed procedure runs the escape hatch check (Step 1) BEFORE creating the entity file. The sequence is: Step 0 detects raw directive -> Step 1 escape hatch check -> if escape fires, EXIT with no entity -> if escape does not fire, run self-seed steps 2-5 above -> proceed to Step 2 (Create Draft Entity, which detects existing file and skips).

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
- Directive matches a small-directive pattern using escape-hatch keywords (whole word, case-insensitive): `fix`, `typo`, `rename`, `bump`, `patch`, `bugfix`, `hotfix`. Usage rule: directive length < 80 chars AND contains any keyword as a whole word (e.g. `fix {noun} in {file}` / `bump {dep} to {version}` / `rename {X} to {Y}` / starts with `bugfix`, `hotfix`, `patch`).

Captain may also pass an explicit `--force-shape` override flag to bypass the escape hatch (rare; useful for small directives that nonetheless deserve product alignment).

If the heuristic fires (and `--force-shape` is NOT set), emit verbatim:

```
shape unnecessary -- run `/build {directive}` directly
```

EXIT with exit code 0. Do NOT create an entity. Do NOT emit any body sections.

---

## Step 2: Assume -- Create Draft Entity

**Self-seed guard**: If Step 0's self-seed already created `docs/build-pipeline/{slug}.md` (detectable by: file exists AND `shape_status: draft` in frontmatter AND `source: /shape`), skip entity creation in this step and proceed directly to Step 3. The entity file is already populated with frontmatter and Captain Context Snapshot.

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
Agent(subagent_type="spacedock:build-shape-framer", prompt="Directive: {raw directive}\n\nProduce 2-3 candidate problem statements per output-format.md section ## Problem Statement. Each candidate is a 3-6 sentence cohesive paragraph describing the gap, who experiences it, and why it matters now. Do NOT include solution language.")
```

Receive 2-3 candidates.

**Presentation rule**: list the full candidate text (each 3-6 sentence problem statement) in the conversation thread BEFORE the AskUserQuestion call. AskUserQuestion options should carry only short labels + 1-sentence descriptions; do NOT put multi-sentence content in preview fields (the preview panel is ~40-60 chars wide and truncates long prose).

Present to captain via AskUserQuestion:

- question: "Which problem statement frames this best?"
- options: each candidate as a short label (<=80 chars, e.g. "Candidate A: {one-line gloss}") plus a "revise inline" option. No preview field for prose; captain reads full text from the thread above.

If captain selects "revise inline", loop with framer using captain's edit notes until captain accepts. When captain commits, write the accepted problem statement to entity body section `## Problem Statement` (immediately after `## Captain Context Snapshot`).

---

## Step 4: Imagine -- Generate User Stories (story-gen subagent + AskUserQuestion)

Dispatch the story-gen wrapper subagent:

```
Agent(subagent_type="spacedock:build-shape-story-gen", prompt="Accepted problem statement:\n{accepted statement}\n\nProduce 3-5 user stories in the literal 'As a {role}, I want {action}, so that {value}' format, numbered US-1 through US-n. No paragraph rewrites. No 'The system should' format. Reference output-format.md for the contract.")
```

Receive 3-5 stories.

**Presentation rule**: list the full text of all candidate user stories in the conversation thread BEFORE any AskUserQuestion call. AskUserQuestion options should carry only short labels + 1-sentence descriptions; do NOT put multi-sentence story content in preview fields. Captain reads full story text from the thread, then answers Accept/Edit/Drop via the short-label selector.

For each story, present via AskUserQuestion:

- question: "Accept user story US-{n}?"
- options: "Accept", "Edit", "Drop".

Loop until captain has confirmed/edited/dropped each candidate. Final accepted set MUST be 3-5 stories (if captain drops below 3, prompt story-gen for replacements). Renumber accepted stories sequentially `US-1..US-n`. Write the final list to entity body section `## User Stories`.

---

## Step 5: Align -- Draft Scope Boundary (scope-drafter subagent + AskUserQuestion)

Dispatch the scope-drafter wrapper subagent with three explicit directives that bias toward minimal-viable scope:

```
Agent(subagent_type="spacedock:build-shape-scope-drafter", prompt="Accepted frame:\n{problem statement}\n\nAccepted user stories:\n{user stories}\n\nProduce two bulleted lists: ## Scope: In (concrete deliverables / behavioral guarantees, each bullet specific enough to verify) and ## Scope: Out (explicit exclusions, optional WHY in parenthetical). Reference output-format.md sections.\n\nThree mandatory directives:\n\n1. MINIMAL VIABLE SCOPE -- Produce the SMALLEST In list that plausibly satisfies the accepted problem statement + user stories. Do NOT expand toward 'new architecture / new schema / new format / new plugin type / new manifest' unless the problem statement literally demands it. Prefer reuse / hook points / discovery patterns over greenfield design.\n\n2. EXPLICIT OUT-OF-SCOPE CEILINGS -- List at least 3 items in Out of the form 'this could expand to X but we're not doing X because Y'. These serve as anti-framings against scope creep during downstream brainstorm/plan. Example: 'Composition contract / manifest schema redesign (could expand here, but deferred -- discovery + hook points close the gap without schema churn).'\n\n3. SELF-CHECK -- After drafting, answer in a trailing '## Scope: Self-Check' block: 'If I had to cut this In list in half, what would I drop first? Are those drops things that actually belong in Out?' If the answer reveals items that belong in Out, move them before returning. The Self-Check block is read-only for captain (SO strips it before writing to entity body).")
```

Receive proposed In/Out lists (plus Self-Check block, which SO consumes but does NOT write to the entity body).

**Presentation rule**: list the full In/Out bullet text in the conversation thread BEFORE the AskUserQuestion call. Scope bullets can exceed ~150 chars when they carry specificity; do NOT stuff them into preview fields. AskUserQuestion options carry only short labels ("Accept all", "Edit", "Prune") with 1-sentence descriptions; captain reads full bullets from the thread.

Present each list via AskUserQuestion:

- question: "Confirm Scope: In bullets? (Accept all / Edit / Prune)"
- question: "Confirm Scope: Out bullets? (Accept all / Edit / Prune)"

Loop until captain commits. Write accepted lists to entity body sections `## Scope: In` and `## Scope: Out` respectively. Accumulate any reference URLs / file paths / entity slugs cited during the align dialog into a running references list (used in Step 7).

---

## Step 5.5: Challenge -- Gap-to-Goal Pressure Test

After Scope In/Out is accepted, SO MUST pressure-test the scope against the captain's actual goal before finalizing. Captain's directive is *initial hypothesis*, not final requirement -- SO's job is to challenge whether the accepted scope is the shortest path to the goal stated in the problem statement.

Ask the captain via AskUserQuestion (three questions, sequential):

1. **Goal restatement**: "Based on the accepted problem statement + user stories, state in one sentence what goal you're trying to reach. Is that goal still what you want?"
2. **Current gap**: "Given the current codebase state, what is the *specific* gap between now and that goal?"
3. **Fastest path?**: "Does the current Scope: In list close that gap the fastest way, or is there a simpler path we haven't considered? Examples of simpler paths to check: (a) reuse an existing primitive instead of building new, (b) push work upstream instead of fork-local, (c) defer scope to a later entity, (d) pick a subset of scope that unblocks 80% of the goal."

If captain identifies a simpler path, loop back to Step 5 with reframed constraints and re-draft scope. If captain confirms current scope is minimal viable for the goal, proceed to **Step 5.5b (Musk reverse-thinking)** before Step 6.

### Step 5.5b: Musk Reverse-Thinking on Scope: In

After captain confirms the goal and gap are correct, SO MUST apply Musk-style reverse-thinking to each Scope: In bullet before finalizing. This is a mechanical audit, not a philosophical discussion.

**Invoke `musk-perspective` skill** (light mode) with prompt:

> "Review each Scope: In bullet for entity {slug}. For each bullet, answer: (1) Is this bullet delivering a real outcome, or shipping an empty framework for something not yet understood? (2) Does this bullet require evidence that doesn't exist yet (dogfood results, user feedback, real usage data)? If yes, it's premature — recommend DEFER to Phase 2. (3) If I delete this bullet, does the 80% path still work? Rate each bullet: KEEP / DEFER / DELETE with one-line rationale."

Present the Musk audit results to captain in the conversation thread (full text, not compressed into AskUserQuestion labels). Then ask via AskUserQuestion:

- question: "Accept Musk reverse-thinking recommendations, or keep original scope?"
- options: "Accept recommendations" / "Keep original {N} bullets" / "Partial — specify"

If captain accepts any DEFER/DELETE recommendations, update Scope: In accordingly. DEFER items move to a `## Scope: Phase 2` section with the deferral rationale. DELETE items are discarded (not moved to Out — they were never load-bearing).

**Rationale**: Entity 126's shape session proved this step's value — Musk reverse-thinking pruned 7 bullets to 5, catching two premature-optimization bullets (per-project config with no dogfood evidence, test harness with no contract surface). Without this step, those bullets would have entered the plan and consumed implementation cycles on imagination-driven work. The cost of this step is ~5 minutes; the cost of implementing a premature bullet is ~days.

**Skip when**: Scope: In has ≤ 3 bullets (already minimal — reverse-thinking adds no signal).

This step is MANDATORY for Medium+ scope. Small directives that passed the Step 1 escape hatch have already skipped to `/build`; this step does not apply to them.

**No-exceptions**: This step exists because "elaborate what captain asked for" is not SO's job -- "pressure-test whether what captain asked for is actually the fastest path" is SO's job. Skipping this step re-introduces the pattern that produced entity 123's v1 over-scoped scope-drafter output.

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

5. **NEVER skip the Step 5.5 gap-to-goal pressure test on Medium+ scope.** Captain's directive is initial hypothesis, not final requirement. Elaborating the directive without challenging whether it is the shortest path to the stated goal re-introduces the entity-123-v1 over-scope failure mode. The pressure test is the single mechanical gate that prevents "correct-but-oversized" shape output.

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
