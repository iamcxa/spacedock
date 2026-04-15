# build-shape -- Wrapper Dispatch Guide

## Overview

`skills/build-shape/SKILL.md` dispatches 3 thin-wrapper agents in sequence
during the imagine and align phases. Each wrapper runs with a fresh context
(per the Thin Wrapper Agent Pattern -- see MEMORY.md) to avoid cross-step
contamination and to maximize parallelism where wave ordering permits.

Wrapper agents live under `agents/` and follow the 15-22 line thin-wrapper
convention validated by the 4-trailofbits + researcher + task-executor pattern.

---

## v1 Simplification Note

In v1 all 3 wrappers preload the single `spacedock:build-shape` skill
(namespace reservation). Separate sub-skills (framer / story-gen / scope-drafter
as independent plugin entries) are Phase E+1 work. The `mode` argument
(`framer`, `story-gen`, or `scope-drafter`) is passed at dispatch time so the
single skill can branch internally.

---

## Wrapper Roster

### 1. build-shape-framer (opus, purple) -- Step 3: Imagine

**Role**: Produces candidate problem statements from the raw captain directive,
applying Shape Up pitch discipline. Forces the problem to be framed before any
solution thinking begins.

**Input**: Captain directive (verbatim text from trigger).

**Output**: 2-3 candidate problem statements. Each statement names the user
affected, the friction they experience, and why it matters -- no solution
language.

**Model tier**: opus (framing quality is load-bearing; Sonnet gaps marked with
alpha markers in brainstorm-model-policy).

**Color tag**: purple (first-imagine phase).

---

### 2. build-shape-story-gen (sonnet, blue) -- Step 4: Imagine (cont.)

**Role**: Expands the accepted problem frame into concrete user stories.

**Input**: The single problem statement the captain accepted from the framer
output (passed as context in the dispatch prompt).

**Output**: 3-5 stories in strict format:

```
As a {role}, I want {action}, so that {value}.
```

No prose preamble. No additional commentary. Caller (SKILL.md) synthesizes
stories via AskUserQuestion before advancing to scope-drafter.

**Model tier**: sonnet (story generation is structured, not creative).

**Color tag**: blue (continuation of imagine phase).

---

### 3. build-shape-scope-drafter (sonnet, green) -- Step 5: Align

**Role**: Converts the frame + accepted stories into a captain-reviewable
In/Out scope list.

**Input**: Accepted frame + accepted stories (both passed as context).

**Output**: Two bulleted lists with captain-reviewable granularity:

```
In scope:
- {item}
- {item}

Out of scope:
- {item}
- {item}
```

No prose preamble. No rationale sentences inside the lists. Caller synthesizes
via AskUserQuestion for captain review before the align gate closes.

**Model tier**: sonnet (list generation is deterministic given the inputs).

**Color tag**: green (align phase).

---

## Expected Return Format (All Wrappers)

- Structured markdown block, no prose preamble.
- No meta-commentary ("Here is the output:", "I have generated...").
- Caller (SKILL.md) treats the entire response as the structured artifact.
- AskUserQuestion is issued by the main SKILL session, not by the wrapper.

---

## Error Handling

If a wrapper returns unparseable output (missing required sections, truncated
response, JSON parse failure):

1. Main SKILL retries the wrapper once with a clarified prompt that restates
   the exact output format required.
2. On second failure -- ESCALATE to captain via AskUserQuestion, surfacing the
   raw wrapper output and requesting manual extraction.

The retry uses the same model tier and mode argument. No model downgrade on
first retry.

---

## Dispatch Shape (per wrapper)

```
Agent(
  subagent_type = "spacedock:build-shape",
  model         = "{tier}",          # opus | sonnet per wrapper above
  prompt        = "{mode-specific dispatch prompt}",
  # mode argument distinguishes framer / story-gen / scope-drafter
)
```

Fresh context per dispatch -- no shared state between wrappers. The calling
SKILL.md session holds accumulated context and passes only the minimal required
inputs to each wrapper prompt.
