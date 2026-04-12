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
- `Agent` -- you run as an ensign subagent (or SO-direct), which may or may not have the Agent tool depending on context. SO-direct mode HAS Agent (SO is the main session); ensign mode does NOT. Step 2 handles both cases.
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

---

## Step 2: Codebase Mapping

Based on APPROACH, identify the mapping topic (keywords, scope anchors, layer hints from the Domain line in Captain Context Snapshot).

See `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` for dispatch ownership and `references/agent-dispatch-guide.md` for tool surface constraints.

### Two execution modes

**Mode A -- SO-direct or FO-pre-dispatched (has code-explorer results):**
When SO runs explore (the default owner per SO/FO split), SO has Agent tool and dispatches `spacedock:code-explorer` directly. When FO runs explore for Large entities, FO dispatches code-explorer before invoking the ensign. In both cases, the code-explorer results are either:
- Already in your context (SO-direct mode: you dispatched and received the return), or
- Written to the entity file by FO-dispatched explorer teammates

Read the code-explorer output and consume it in Step 3 onward.

**Mode B -- Inline fallback (no code-explorer dispatch):**
When running as an ensign without pre-dispatched results (FO simple subagent mode for Small/Medium entities), do inline codebase mapping:
- Use Read/Grep/Glob on the entity context paths
- Write findings directly into the mapping output format (same structure as code-explorer step 6)
- This is the original pre-entity-062 behavior and remains the default for Small/Medium entities

### Dispatching code-explorer (Mode A, when you have Agent tool)

If running in SO-direct mode (you ARE the main session and have Agent tool), dispatch:

```
Agent(
  subagent_type="spacedock:code-explorer",
  model="sonnet",
  prompt="""
  ## Topic
  {1-line topic title from APPROACH keywords}

  ## Entity Context
  {paths the explorer should focus on, drawn from APPROACH + Domain line}

  ## Scope Constraint
  {20-file cap; what NOT to touch; layers out of scope for this entity}

  ## Layer Hint
  {domain|contract|router|view|seed|frontend|test|config or "unknown -- sweep all"}

  Load skill: skills/code-explorer (flat path).
  Return structured output per code-explorer step 6 format.
  """
)
```

**Fresh-context dispatch rationale (Phase E Guiding Principle #5).** Inline grep/Read/store pollutes the caller's context with raw file content. Delegating to `spacedock:code-explorer` isolates the mapping pass in a fresh context; the caller only consumes the structured summary. See `agents/code-explorer.md` for the thin-wrapper agent definition.

**Leaf dispatch rule.** `spacedock:code-explorer` runs as a leaf subagent. It does NOT further dispatch other agents. For multiple mapping passes, dispatch multiple `spacedock:code-explorer` calls in parallel from this step.

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

## Step 4: Gray Area Identification

Read `references/gray-area-templates.md`.

Apply the domain-specific template(s) matching the entity's domain(s) from Step 1. For multi-domain entities, apply ALL matching templates and deduplicate overlapping gray areas -- if two templates surface the same gray area, keep one instance and note both domains.

Skip a gray area when:
- It is already decided in the Brainstorming Spec (carries a D-01 or similar decision marker).
- The codebase has clear precedent with 2 or more consistent usages.
- Another entity in the same workflow already addresses it.

The output of this step is a deduplicated list of open gray areas, each ready for classification in Step 5.

---

## Step 5: Hybrid Classification

Read `references/hybrid-classification-heuristic.md`.

For each remaining gray area from Step 4, assign exactly one track:
- **Track A -- Assumption**: codebase has precedent. 2+ usages gives Confident; 1 usage gives Likely or Unclear depending on fit.
- **Track B -- Option Comparison**: no single precedent, but 2+ viable approaches exist (competing codebase patterns or standard domain options).
- **Track C -- Open Question**: genuinely open, no codebase signal, no standard domain answer. Also used for unresolved α markers from Step 3.5.

**Priority rule**: prefer A over B over C. The goal is to minimize captain interaction -- only escalate when the evidence genuinely requires it. When Track A is "Unclear" confidence, reconsider whether it should actually be Track B (competing patterns) or Track C (needs captain judgment).

---

## Step 6: Write to Entity Body

Read `references/output-format.md` for the exact section formats.

Emit the following sections (order matters for downstream parsing):

1. `## Assumptions` -- every Track A item, numbered A-1, A-2, A-3... Include statement, Confidence, and Evidence (`file:line -- description`).
2. `## Option Comparisons` -- every Track B item as a `###` subsection with the 5-column table (Option / Pros / Cons / Complexity / Recommendation). At least one option per comparison must be marked Recommended.
3. `## Open Questions` -- every Track C item, numbered Q-1, Q-2, Q-3... α-marker questions take the lowest numbers. Include Domain, Why it matters, and Suggested options (or `None -- captain input needed`).
4. `## Decomposition Recommendation` -- only if Step 3 determined it was warranted. Use the `⚠️` emoji prefix and list child entity slugs with domain tags.

Annotate the `## Brainstorming Spec` inline:
- **Confirmed**: append `(✓ confirmed by explore: {evidence})` to claims the codebase supports.
- **Contradicted**: append `(⚠ contradicted: {evidence} -- see Q-{n})` to claims the codebase refutes, and ensure the linked Q exists in the Open Questions section.

Preserve all existing content. Only modify sections this skill owns. Never modify the `## Directive` or `## Captain Context Snapshot` sections.

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
```

Six items, always in this order. Each item MUST use checklist format (`- [x]` for done, `- [ ]` for pending, `- [ ] SKIP: ...` or `- [ ] FAIL: ...` for partial stages) -- this is the parser contract defined at `tools/dashboard/src/frontmatter-io.ts:140`. Flat bullet format (`- {metric}`) is a drift bug; the dashboard will render the Stage Report card as empty. The FO and status script parse these fields. Keep field names exact. Detail lines (2-space indent, one line per metric) are optional but recommended -- see `references/output-format.md` for full field rules.

---

## Rules

- **NEVER ask the captain questions.** Write findings to the entity body for build-clarify to consume. This skill is non-interactive by design.
- **NEVER skip codebase analysis.** Read actual files -- do not infer purpose from file names alone.
- **Prefer Track A over Track B over Track C.** Minimize what the captain needs to decide.
- **Use `--` (double dash) consistently**, never `—` (em dash). This matches the build-brainstorm convention and keeps α markers grep-compatible.
- **Store insights to context lake for every file read in depth.** Use tags `[purpose]`, `[pattern]`, `[gotcha]`, `[correction]`.
- **Respect the 20-file limit in Step 2.** If more than 20 files match, prioritize by relevance to APPROACH and note the truncation in the Stage Report.
- **Preserve existing entity body content.** Only modify sections this skill owns: Assumptions, Option Comparisons, Open Questions, Decomposition Recommendation, Stage Report. Never modify Directive or Captain Context Snapshot.
