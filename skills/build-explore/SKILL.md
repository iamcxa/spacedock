---
name: build-explore
description: "Codebase exploration + question generation for build pipeline entities. Invoked by ensign during explore stage. Maps affected files, identifies gray areas using GSD domain templates, classifies into assumptions/options/questions via Hybrid heuristic, and writes results to entity body. Non-interactive."
---

# Build-Explore -- Codebase Analysis + Question Generation

This skill is loaded by the ensign during the `explore` stage of the build pipeline. It produces a codebase-grounded analysis that the later `clarify` stage (Science Officer) consumes for interactive Q&A. Execute the seven steps below in strict order. This skill is non-interactive -- never ask the captain questions.

---

## Tools Available

**Can use:**
- `Read` -- read entity files, reference docs, and files discovered during mapping
- `Grep` -- search the codebase for keywords, patterns, and file references
- `Glob` -- find files by pattern when grep is too broad
- `Bash` -- git commands, file counting, and shell pipelines for mapping
**NOT available (see `references/agent-dispatch-guide.md`):**
- `Agent` -- you run as an ensign subagent (or SO-direct), which may or may not have the Agent tool depending on context. SO-direct mode HAS Agent (SO is the main session); ensign mode does NOT. Step 2 handles Mode A/B for code-explorer dispatch. Step 5.5 uses the same pattern: SO-direct mode dispatches `spacedock:researcher` via Agent; ensign mode reads pre-dispatched results from the entity body.
- `AskUserQuestion` -- this skill is non-interactive. Write findings to the entity body; build-clarify handles captain interaction.

**Mode-dependent Write/Edit:**
This skill can run in two modes:

1. **Ensign-wrapper mode** (FO-dispatched): the default mode in the FO-driven pipeline. The ensign wrapper handles entity file writes; the skill returns text output for the sections it owns and the ensign applies them via its own Write/Edit calls.
2. **SO-direct mode** (Science Officer invocation, no ensign): the default mode when Science Officer runs explore as part of its `context_status` routing (see `agents/science-officer.md`). The skill writes directly to the entity file via `Write` and `Edit`. No wrapper translates between text output and file updates.

In both modes, the output format rules in `references/output-format.md` apply identically. SO-direct mode does NOT write `context_status` frontmatter transitions -- the Science Officer agent owns those per its Boot Sequence Step 2.5.

---

## Step 1: Read Entity & Identify Domain

Read the entity file from the workflow directory.

Extract the following sections verbatim:
- `## Directive` -- the captain's original request
- `## Brainstorming Spec` -- APPROACH / ALTERNATIVE / GUARDRAILS / RATIONALE
- `## Captain Context Snapshot` -- specifically the **Domain** line and **Scope flag** line (if present)
- `## Acceptance Criteria` -- the testable criteria list

Extract frontmatter fields:
- `intent` -- `feature` or `bugfix`
- `scale` -- `Small`, `Medium`, or `Large`
- `project` -- target project path

The domain(s) recorded in the Captain Context Snapshot determine which gray area templates apply in Step 4. Preserve them exactly.

### 1a -- Parent Entity Decision Consumption

Check the frontmatter `depends-on` field. For each listed parent entity:

1. Read the parent entity file.
2. Scan for `→ Answer:`, `→ Selected:`, and `→ Corrected by` annotations -- these are clarify decisions.
3. Record decisions that constrain THIS entity's design space. Examples:
   - Parent chose "spacebridge/ dir inside spacedock repo" → this entity's file paths must reflect that
   - Parent chose "thin shim, daemon owns DB" → this entity cannot assume shim has DB access
   - Parent deferred skill migration → this entity should not plan for namespace changes

Failure to consume parent decisions causes contradictions that waste clarify rounds. If a parent entity has `context_status: ready`, its decisions are authoritative. If the parent is still in `draft` or `pending`, note the dependency as tentative and flag as a Track C question if any assumption depends on the parent's unresolved state.

### 1b -- Design Doc Invariant Loading

Check the frontmatter `source` field. If it references a design doc (e.g., `source: spacebridge design doc`):

1. Read the design doc.
2. Extract all **stated invariants, goals, and forward-looking sections** -- not just the section directly relevant to this entity, but cross-cutting concerns:
   - Architecture invariants (e.g., "engine is headless-capable", "bridge is a consumer not a fork")
   - Forward-looking goals (e.g., Postgres migration, cloud deployment, multi-machine, SaaS)
   - Distribution constraints (e.g., "all private to bridge", plugin packaging)
3. Record these as a compact list for use in Step 5's Recommendation Validation.

Failure to load invariants causes explore to recommend options that conflict with the broader architecture -- the captain catches this in clarify, but the wasted rounds degrade trust and signal quality. Example: entity 051 explore recommended "shim direct DB" without checking the design doc's multi-machine/cloud goals (§3.3, §6.1), requiring 3 rounds of clarify correction.

---

## Step 2: Codebase Mapping

Based on APPROACH, identify the mapping topic (keywords, scope anchors, layer hints from the Domain line in Captain Context Snapshot).

See `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` for dispatch ownership and `references/researcher-vs-code-explorer.md` for tool surface constraints. Angle definitions and the §5 seed-pattern table live in `references/parallel-explorer-angles.md` -- Step 2's dispatch contract cites that file directly.

### Two execution modes

**Mode A -- SO-direct / main-session 4-angle parallel fanout (has Agent tool):**
When SO runs explore (the default owner per SO/FO split) or any main-session invocation with Agent tool available, Step 2 fans out to **4 parallel fresh-context `spacedock:code-explorer` subagents**, one per angle defined in `references/parallel-explorer-angles.md`:

- Angle (i) **prevailing-patterns** -- dominant existing pattern within target scope
- Angle (ii) **recent-decisions** -- ADRs / DECISIONS.md / recent commit-log design rationale
- Angle (iii) **sibling-entity** -- active-state entities overlapping the file surface (CONTRACTS.md + INDEX.md)
- Angle (iv) **negative-space** -- seed-driven absence verification (see §5 of the reference)

**Mode B -- Ensign-mode inline fallback (no Agent tool):**
When running as an ensign without Agent dispatch (FO simple subagent mode, nested-Agent context), run angles (i)+(ii)+(iii) inline single-pass using Grep/Glob/Read within the current session. **Skip angle (iv) entirely** -- seed-list verification requires subagent isolation to avoid freeform absence claims (Q-2 constraint). Emit the following warning line verbatim in the Stage Report (Step 7):

```
⚠ ensign-mode inline fallback -- 4-angle quality not achieved this invocation
```

No silent degradation: the warning MUST appear whenever Mode B runs. Plan-phase and execute-phase reviewers treat this as a known coverage gap.

### Mode selection heuristic

- **Ensign mode (no Agent tool)** -- always Mode B regardless of entity scale. Mode A requires Agent dispatch which is unavailable.
- **SO-direct / main-session (has Agent tool)** -- Mode A by default for Medium+ entities. For Small entities with well-known target files (or when the caller has already read >50% of the relevant files in this session), Mode B may be preferred to avoid redundant subagent dispatch.

When in doubt, prefer Mode A -- fresh-context isolation is load-bearing for the 4-angle quality signal.

### Dispatching 4 parallel code-explorers (Mode A, one per angle)

All 4 dispatches MUST be issued in a **single Agent tool-call block** so the runtime executes them concurrently. Sequential dispatch defeats the fresh-context parallelism goal and violates the Mode A contract.

**Angle (i) -- prevailing-patterns:**

```
Agent(
  subagent_type="spacedock:code-explorer",
  model="sonnet",
  prompt="""
  ## Topic
  prevailing-patterns -- dominant existing pattern for {1-line topic title from APPROACH keywords}

  ## Entity Context
  {paths the explorer should focus on, drawn from APPROACH + Domain line}

  ## Scope Constraint
  Angle (i) per references/parallel-explorer-angles.md. 20-file cap.
  Rank patterns by usage count; return primary/secondary/tertiary tier tags.

  ## Layer Hint
  {domain|contract|router|view|seed|frontend|test|config or "unknown -- sweep all"}

  Load skill: skills/code-explorer (flat path).
  Return per Angle (i) format in references/parallel-explorer-angles.md.
  """
)
```

**Angle (ii) -- recent-decisions:**

```
Agent(
  subagent_type="spacedock:code-explorer",
  model="sonnet",
  prompt="""
  ## Topic
  recent-decisions -- ADRs / DECISIONS.md / commit rationale for {topic}

  ## Entity Context
  {target paths}; also scan docs/adr, docs/decisions, DECISIONS.md at repo + project root.

  ## Scope Constraint
  Angle (ii) per references/parallel-explorer-angles.md. git log --since="30 days" window.
  Include parent entity clarify annotations when Captain Context Snapshot names Related entities.

  ## Layer Hint
  decisions -- scan docs/ and git log, not source tree.

  Load skill: skills/code-explorer (flat path).
  Return per Angle (ii) format in references/parallel-explorer-angles.md.
  """
)
```

**Angle (iii) -- sibling-entity:**

```
Agent(
  subagent_type="spacedock:code-explorer",
  model="sonnet",
  prompt="""
  ## Topic
  sibling-entity -- active entities overlapping {topic} file surface

  ## Entity Context
  docs/build-pipeline/_index/CONTRACTS.md, docs/build-pipeline/_index/INDEX.md,
  plus the target scope file paths for overlap detection.

  ## Scope Constraint
  Angle (iii) per references/parallel-explorer-angles.md.
  Filter INDEX.md to status in {in-flight, planned, clarified, execute, pr-draft}.
  Cross-reference file surface against current entity's APPROACH scope.

  ## Layer Hint
  workflow-index -- index docs, not source tree.

  Load skill: skills/code-explorer (flat path).
  Return per Angle (iii) format in references/parallel-explorer-angles.md.
  """
)
```

**Angle (iv) -- negative-space (seed-driven):**

Before dispatch, apply the **seed-injection rule**: extract APPROACH keywords from the entity's Brainstorming Spec, then scan the `references/parallel-explorer-angles.md` §5 seed-pattern table for case-insensitive substring matches. For each matched row, include its (Keyword / Absence Pattern / Search Method) tuple in the `## Scope Constraint` block of the Angle (iv) dispatch prompt below. If zero keywords match, still dispatch Angle (iv) with an explicit `no seeds matched -- return seed: none-dispatched` instruction (documented return-path in §5).

```
Agent(
  subagent_type="spacedock:code-explorer",
  model="sonnet",
  prompt="""
  ## Topic
  negative-space -- seed-driven absence verification for {topic}

  ## Entity Context
  {target scope paths from APPROACH + Domain line}

  ## Scope Constraint
  Angle (iv) per references/parallel-explorer-angles.md §5.
  Seeds to verify (extracted from APPROACH keywords via seed-pattern table):
  {injected seed rows: keyword / absence pattern / search method}

  Return one structured verdict per seed: {seed, verdict, evidence_or_reason, tier}
  verdict enum: confirmed | refuted | not-applicable.
  Do NOT add seeds beyond those listed above; do NOT make freeform absence claims.

  ## Layer Hint
  {same as Angle (i) layer hint}

  Load skill: skills/code-explorer (flat path).
  Return per Angle (iv) format in references/parallel-explorer-angles.md.
  """
)
```

**Fresh-context dispatch rationale (Phase E Guiding Principle #5).** Inline grep/Read pollutes the caller's context with raw file content. Delegating to 4 parallel `spacedock:code-explorer` subagents isolates each angle's mapping pass in a fresh context, preventing framing bias across angles; the caller only consumes the 4 structured summaries. See `agents/code-explorer.md` for the thin-wrapper agent definition.

**Leaf dispatch rule.** `spacedock:code-explorer` runs as a leaf subagent. It does NOT further dispatch other agents. The 4-way fanout here is the maximum parallelism for Step 2; do not nest.

### Inter-explorer contradiction handling

When 2+ of the 4 explorers return findings that conflict on the same `file:line` (e.g., Angle (i) reports pattern X is primary at src/foo.ts:42 while Angle (iii) reports sibling entity claims the same line implements pattern Y), do NOT flatten by synthesis. Write the inter-explorer contradiction into Step 6's `## Core Tensions` section, typed as either `essential` (the contradiction reflects a genuine design tension the captain must resolve) or `domain-based` (the two explorers viewed the same evidence through different domain lenses).

Follow Port 10 semantics: contradictions are first-class outputs, never silently reconciled. The preservation of conflicting evidence is load-bearing for clarify-stage Q&A quality.

### Scale assessment (both modes)

After mapping completes (code-explorer return or inline), count total files and compare against frontmatter `scale`:
- Small: <5 files
- Medium: 5-15 files
- Large: >15 files

Note the result in the Stage Report (Step 7). If the actual count disagrees with the frontmatter scale, record `revised from X to Y`.

**Bugfix intent.** For `intent: bugfix` entities, include "trace from symptom to root cause; do not stop at first symptom match" in the mapping scope. Code-explorer returns a trace-ordered file list instead of a breadth-first layer sweep.

---

## Step 3: Decomposition Analysis

Check the Captain Context Snapshot for `⚠️ likely-decomposable` on the **Scope flag** line.

Also independently assess whether Step 2's mapping discovered more than 20 files across 3 or more layers.

If either signal is true:
1. Analyze the work for natural boundaries. Are there independent sub-scopes? Is there a sensible dependency ordering between them?
2. If decomposition is warranted, write a `## Decomposition Recommendation` section following the format in `references/output-format.md`.
3. If decomposition is NOT warranted despite the Scope flag being present, note this in the Stage Report: `Scope flag present but decomposition not recommended: {reason}`.

If neither signal is true (no flag AND fewer than 20 files across fewer than 3 layers), skip this step entirely.

---

## Step 3.5: Consume α Markers

Scan the `## Brainstorming Spec` and `## Acceptance Criteria` sections for any `(needs clarification -- deferred to explore)` markers left by build-brainstorm.

For each marker, attempt codebase resolution:
- **Resolved**: replace the α marker with concrete content plus `(✓ resolved by explore: {evidence})`.
- **Unresolved**: convert the question into a Track C Open Question with the highest-priority Q number. α-marker questions always take the lowest Q numbers -- Q-1, Q-2, and so on -- followed by new questions discovered during exploration.

Count resolved vs. unresolved α markers. Both counts feed Step 7's Stage Report.

---

## Step 3.7: Brainstorm Claim Verification

Before identifying gray areas, cross-reference the Brainstorming Spec's APPROACH claims against codebase evidence found during mapping (Step 2) and parent entity decisions (Step 1a).

For each concrete claim in APPROACH:
1. **Confirmed**: codebase or parent decision supports it. Prepare `(✓ confirmed by explore: {evidence})` annotation for Step 6.
2. **Contradicted**: codebase evidence refutes it. Prepare `(⚠ contradicted: {evidence} -- see Q-{n})` annotation AND immediately add the contradiction to the gray area list for Step 4 classification. Do NOT wait until Step 6 to discover contradictions -- they must feed into Step 4's gray area identification so the resulting Options/Questions reflect the conflict.

Example: entity 051 APPROACH claimed "serialize each method call as JSON-RPC". Step 2 found channel.ts:399 calls createSnapshot synchronously and uses snap.version (autoincrement) immediately. Contradiction detected → feeds into Step 4 → becomes O-1 (sync-to-async bridge strategy) with the stub option pre-eliminated because the 2-level trace shows snap.version is consumed by autoResolveComments.

Record confirmed/contradicted annotations for later application in Step 6. The annotations are written in Step 6; the contradictions feed into Step 4 NOW.

---

## Step 4: Gray Area Identification

Read `references/gray-area-templates.md`.

Apply the domain-specific template(s) matching the entity's domain(s) from Step 1. For multi-domain entities, apply ALL matching templates and deduplicate overlapping gray areas -- if two templates surface the same gray area, keep one instance and note both domains. **Also include any contradictions discovered in Step 3.7** -- these are pre-identified gray areas that bypass the template matching.

Skip a gray area when:
- It is already decided in the Brainstorming Spec (carries a D-01 or similar decision marker).
- The codebase has clear precedent with 2 or more consistent usages.
- Another entity in the same workflow already addresses it.

The output of this step is a deduplicated list of open gray areas, each ready for classification in Step 5.

---

## Step 5: Hybrid Classification

Read `references/hybrid-classification-heuristic.md`.

For each remaining gray area from Step 4 (including contradictions from Step 3.7), assign exactly one track:
- **Track A -- Assumption**: codebase has precedent. 2+ usages gives Confident; 1 usage gives Likely or Unclear depending on fit.
- **Track B -- Option Comparison**: no single precedent, but 2+ viable approaches exist (competing codebase patterns or standard domain options).
- **Track C -- Open Question**: genuinely open, no codebase signal, no standard domain answer. Also used for unresolved α markers from Step 3.5.

**Priority rule**: prefer A over B over C. The goal is to minimize captain interaction -- only escalate when the evidence genuinely requires it. When Track A is "Unclear" confidence, reconsider whether it should actually be Track B (competing patterns) or Track C (needs captain judgment).

**Recommendation Validation (Track B only)**: before marking any option as `Recommended`, run the two validation checks defined in `references/hybrid-classification-heuristic.md` § "Recommendation Validation": (1) return value trace for Behavioral/Callable domain -- trace return values 2 levels deep, and (2) design doc invariant cross-reference -- check against ALL stated goals from Step 1b. If either check fails, fix the recommendation or downgrade to `Viable` before writing to the entity body. Do NOT defer validation to clarify.

---

## Step 5.5: Research Dispatch for External Technology Assumptions

After hybrid classification (Step 5), scan Track A assumptions (Likely and Unclear confidence) and Track B options for external technology dependencies that require validation beyond codebase grep.

**Dispatch criteria:** An assumption or option qualifies for research when:
- It involves library compatibility, API behavior, platform specifics, or protocol details
- It is NOT purely codebase architecture (internal module interactions, code structure)
- Confidence is Likely (0.50-0.79) or Unclear (0.20-0.49) for Track A; any confidence for Track B options involving library choice

**Research depth scaling (proactive validation -- dispatch for Likely+ confidence):**
- SKIP all research: ALL assumptions Confident >=0.95 AND no external tech claims AND Small scale
- Lightweight (1 researcher, targeted): assumptions 0.80-0.94 Confident (any external lib/API reference OR purely internal patterns needing deeper trace)
- Standard (1-2 researchers, parallel): assumptions 0.50-0.79 Likely (includes web research)
- Deep (2-3 researchers, parallel + continuation): assumptions <0.50 Unclear

**Cap: max 3 researchers per explore step** (entity scope total across brainstorm + explore max 5).

### Mode A -- SO-direct (has Agent tool)

Dispatch `spacedock:researcher` per qualifying topic:

```
Agent(
  subagent_type="spacedock:researcher",
  model="sonnet",
  prompt="""
  ## Topic
  {assumption statement}

  ## Description
  Validate whether {technology claim}. Current confidence: {score}. Evidence so far: {existing evidence line}.

  ## Entity Context
  {paths from Step 2 mapping relevant to this assumption}

  ## Scope Constraint
  Focus on: {specific library/API/platform behavior}. Do NOT investigate codebase architecture.
  """
)
```

If a research team was created at session start (SO Step 1.5), use `SendMessage` to route topics to existing team members instead of individual Agent dispatch.

### Mode B -- Ensign (no Agent tool)

Research results were pre-dispatched by FO before invoking the ensign. Read results from entity body `## Research Findings` section or from pre-populated research annotations on assumption Evidence lines. If no pre-dispatched results are available, skip Step 5.5 and log in Stage Report: "Step 5.5 skipped -- no pre-dispatched research available in ensign mode."

### Checkpoint/Continuation

If a researcher outputs `## CHECKPOINT REACHED` with partial findings (hit context limits mid-investigation), spawn a continuation researcher with the partial findings as input context. The continuation researcher picks up where the first left off. Only applicable in Mode A (SO-direct) where Agent tool is available.

### Synthesis and Annotation

After researchers return:
1. Validate all expected findings are present (one per dispatched topic)
2. Check for contradictions between parallel results
3. **Confirmed findings:** upgrade assumption confidence per `references/hybrid-classification-heuristic.md` § "Research Upgrade Path" and append `(✓ research: {source} -- {finding})` to the Evidence line
4. **Contradicted findings:** write `## Research Findings` subsection with full 5-domain treatment; reclassify assumption to Track B or escalate to Open Question. Append `(⚠ research contradicted: {source} -- {finding} -- see Research Findings)` to the Evidence line
5. **Two researchers contradict each other:** write both as an Open Question with cited findings verbatim -- same rule as build-plan's contradiction handling. Do NOT silently resolve.

### Cross-Phase Skepticism

Explore-phase researchers also re-validate brainstorm annotations marked `(✓ confirmed by explore: ...)`. If a researcher's deeper investigation contradicts an earlier explore confirmation, escalate to Open Question. Each phase is a skeptic of the previous phase, not a consumer -- do not assume prior annotations are infallible.

### Cross-Entity Research Dedup

Before dispatching researchers, SO greps sibling entity bodies for `(✓ research: ...)` annotations matching the current topic. If a prior entity already researched the same technology question, reference the prior finding instead of re-dispatching: write `(✓ research: entity-{id} -- {prior finding})` citing the cross-entity source.

---

## Step 6: Write to Entity Body

Read `references/output-format.md` for the exact section formats.

Emit the following sections (order matters for downstream parsing):

1. `## Assumptions` -- every Track A item, numbered A-1, A-2, A-3... Include statement, Confidence, and Evidence (`file:line -- description`).
2. `## Option Comparisons` -- every Track B item as a `###` subsection with the 5-column table (Option / Pros / Cons / Complexity / Recommendation). At least one option per comparison must be marked Recommended.
3. `## Open Questions` -- every Track C item, numbered Q-1, Q-2, Q-3... α-marker questions take the lowest numbers. Include Domain, Why it matters, and Suggested options (or `None -- captain input needed`).
4. `## Core Tensions` -- 1-5 typed entries (`time-based` / `domain-based` / `essential`) emitted AFTER `## Open Questions`. Route inter-explorer contradictions here per Step 2. When empty, emit EXACTLY: `Checked -- no notable constraints identified.` See `references/output-format.md` § "Core Tensions + Honest Boundaries (Port 10)" for format details.
5. `## Honest Boundaries` -- 1-5 declared limits emitted AFTER `## Core Tensions`. Same cardinality discipline and escape-hatch literal: `Checked -- no notable constraints identified.` Downstream stages annotate but never delete entries in either section.
6. `## Decomposition Recommendation` -- only if Step 3 determined it was warranted. Use the `⚠️` emoji prefix and list child entity slugs with domain tags.

**Tier tag rule (Port 9):** every `Evidence:` line in `## Assumptions`, `## Option Comparisons`, and `## Open Questions` MUST end with a bracketed tier tag -- `[primary]`, `[secondary]`, or `[tertiary]`. Primary = captain directive / Canonical References / ADRs / design-doc invariants; secondary = codebase pattern with >=2 consistent usages; tertiary = single usage, template match, or "standard practice" claim. On conflict, primary wins over secondary wins over tertiary unless captain clarify override. Tier tags already set by brainstorm flow through unchanged (no re-tagging, no syntax conversion). See `references/output-format.md` § "Tier Tag (Port 9)" for full semantics.

Annotate the `## Brainstorming Spec` inline:
- **Confirmed**: append `(✓ confirmed by explore: {evidence})` to claims the codebase supports.
- **Contradicted**: append `(⚠ contradicted: {evidence} -- see Q-{n})` to claims the codebase refutes, and ensure the linked Q exists in the Open Questions section.

Preserve all existing content. Only modify sections this skill owns. Never modify the `## Directive` or `## Captain Context Snapshot` sections.

---

## Step 6.5: Self-Test Gate (Port 11)

Before emitting the Stage Report, run a mandatory path-aware self-test gate against the sections written in Step 6. The gate has 5 checks:

1. **Track A evidence depth** -- every Track A assumption has `>=2` evidence sources across `>=2` layers (domain/contract/router/view/seed/frontend/test/config).
2. **Track B alternative completeness** -- every Track B option comparison has `>=2` viable alternatives AND `>=1` marked `✅ Recommended`.
3. **Track C option surfacing** -- every Track C open question has `Suggested options:` with `>=2` options OR an explicit `Open-ended -- captain decides` literal.
4. **Evidence tier tagging** -- every `Evidence:` line carries a bracketed `[primary|secondary|tertiary]` tier tag (Port 9 compliance check).
5. **Core Tensions typing** -- if `## Core Tensions` is populated (not the `Checked -- no notable constraints identified.` literal), every entry is typed (`time-based` / `domain-based` / `essential`).

### Path-aware semantics (sibling entity 104 O-3 propagated)

The gate's failure response depends on Step 2's execution mode:

**Mode A (SO-direct / 4-angle parallel fanout) -- gate failure BLOCKS Stage Report emission.** Do NOT write the Stage Report. Instead, return the structured blocker payload below. The FO ensign routing hook reads `feedback-to: captain` and halts the explore-to-clarify advance until the gate passes:

```yaml
status: blocked
feedback-to: captain
gate_failure:
  gate_id: {"i"|"ii"|"iii"|"iv"|"v"}
  failure_reason: {human-readable}
  offending_items:
    - {entity-body line reference}
```

**Mode B (ensign-mode inline fallback) -- gate failure is ADVISORY.** Emit alpha markers `(α: gate-{n} advisory-only in Mode B -- {reason})` inline on each offending item AND include a Stage Report warning `gate-{n} advisory-only in Mode B`. Stage Report still emits; explore-to-clarify advance proceeds. Plan-phase reviewers treat advisory alphas as known coverage gaps.

### Mode B modifier for triple-gate

In Mode B, gate (i) cross-layer recurrence is structurally unavailable because angle (iv) negative-space verification was skipped (see Step 2 Mode B contract). Gate (i) counts as **not applicable** in Mode B, not "failed" -- do NOT emit an advisory alpha for gate (i) in Mode B. Gates (ii)-(v) apply normally.

### FO dispatch-hook audit note

The downstream plan MUST cite the audit scope from parent entity 102 Honest Boundary 9 when declaring FO dispatch-hook coverage for the Mode A blocker payload. Plan ensign: do not assert hook implementation without this citation.

---

## Step 7: Stage Report

File counts and layer breakdowns come from the Step 2 code-explorer dispatch return; the caller does NOT independently re-grep.

Write `## Stage Report: explore` as the LAST section of the entity body with exactly six metrics, in this order:

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
- [x] Research dispatched: 2 researchers for 2 topics
  A-4 (socket bind timing): confirmed, Likely->Confident (0.90); A-5 (daemon composition): contradicted, escalated to Q-3
```

Seven items, always in this order. The seventh item (`Research dispatched`) is new as of entity 075. Use `- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident, no external tech claims)` when Step 5.5 is skipped. Each item MUST use checklist format (`- [x]` for done, `- [ ]` for pending, `- [ ] SKIP: ...` or `- [ ] FAIL: ...` for partial stages) -- this is the parser contract defined at `tools/dashboard/src/frontmatter-io.ts:140`. Flat bullet format (`- {metric}`) is a drift bug; the dashboard will render the Stage Report card as empty. The FO and status script parse these fields. Keep field names exact. Detail lines (2-space indent, one line per metric) are optional but recommended -- see `references/output-format.md` for full field rules.

---

## Rules

- **NEVER ask the captain questions.** Write findings to the entity body for build-clarify to consume. This skill is non-interactive by design.
- **NEVER skip codebase analysis.** Read actual files -- do not infer purpose from file names alone.
- **Prefer Track A over Track B over Track C.** Minimize what the captain needs to decide.
- **Use `--` (double dash) consistently**, never `—` (em dash). This matches the build-brainstorm convention and keeps α markers grep-compatible.
- **Store insights to context lake for every file read in depth.** Use tags `[purpose]`, `[pattern]`, `[gotcha]`, `[correction]`.
- **Respect the 20-file limit in Step 2.** If more than 20 files match, prioritize by relevance to APPROACH and note the truncation in the Stage Report.
- **Preserve existing entity body content.** Only modify sections this skill owns: Assumptions, Option Comparisons, Open Questions, Decomposition Recommendation, Stage Report. Never modify Directive or Captain Context Snapshot.
