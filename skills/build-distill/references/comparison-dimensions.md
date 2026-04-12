# Comparison Dimensions -- Build-Distill Reference

These 7 fixed dimensions are used by `build-distill` for every comparison run. They are **fixed by captain decision (O-1, 2026-04-12)** -- every distillation report uses these same axes for cross-run comparability. Do not add, remove, or rename dimensions per-run.

---

## Dimension 1: Interaction Model

**Definition**: How the skill interacts with the user during execution. Captures the degree and style of human involvement -- from fully non-interactive (read-only output) to fully interactive (per-step human decisions).

**Source indicators**: AskUserQuestion calls (count and placement), mode flags (--auto, --chain, --power, --skip-research), declaration of "non-interactive" or "interactive" in the skill's opening paragraph, user-confirmation gates.

**Target indicators**: Tools Available section (AskUserQuestion present/absent), step-level interactivity declarations, gate mechanisms that require captain input before proceeding.

**Scoring guidance**:
- **Low (0.25)**: Minor UX difference -- e.g., different question phrasing, different batching of confirmation prompts. Both skills are fundamentally interactive or both are non-interactive.
- **Medium (0.5)**: One skill has an interaction mode the other lacks -- e.g., source has --auto (non-interactive batch mode) but target is always interactive; or source is semi-interactive and target is non-interactive.
- **High (0.75)**: Fundamentally different interaction paradigm -- e.g., source is fully interactive (questions per step) while target is fully non-interactive (zero AskUserQuestion calls).
- **Complete absence (1.0)**: Target is "none" (no equivalent skill exists).

---

## Dimension 2: Context Strategy

**Definition**: How the skill loads and uses prior context from earlier stages, sessions, or project state. Captures whether skills are context-aware (thread prior decisions forward) or context-blind (each invocation starts fresh).

**Source indicators**: File loading patterns at skill start (PROJECT.md, STATE.md, CONTEXT.md, REQUIREMENTS.md, ROADMAP.md), `init` commands for project-state lookup, explicit "load prior phase context" steps, continuation/checkpoint mechanisms.

**Target indicators**: Input Contract section (what the skill expects to receive), `read_first` patterns in PLAN tasks, cross-stage context threading (entity body as checkpoint), Canonical References accumulator.

**Scoring guidance**:
- **Low (0.25)**: Minor loading order difference -- both skills load prior context, but in different ways or from different file names. Net information available is similar.
- **Medium (0.5)**: One skill loads context types the other ignores -- e.g., source loads project-level STATE.md + prior CONTEXT.md files while target loads only the current entity body.
- **High (0.75)**: One skill has a systematic multi-phase context loading strategy the other entirely lacks -- e.g., source builds a CONTEXT.md chain across sessions; target has no session-bridging mechanism.
- **Complete absence (1.0)**: Target is "none".

---

## Dimension 3: Research Depth

**Definition**: How thoroughly the skill investigates before acting. Captures the breadth of sources consulted, depth of evidence gathered, and quality of synthesis before decisions are made.

**Source indicators**: Subagent dispatch for research (fresh-context isolation, parallel dispatch), WebSearch/Context7/WebFetch usage, multiple-source verification requirements, confidence level annotations, checkpoint/continuation for long research.

**Target indicators**: Researcher dispatch (Agent/Skill invocations for research), read-only investigation scope, citation requirements (file:line mandatory or optional), scope cap (15-file cap, 5-topic cap).

**Scoring guidance**:
- **Low (0.25)**: Similar research depth with different tooling -- both skills investigate with similar thoroughness, just using different tool combinations.
- **Medium (0.5)**: One skill does deeper multi-source verification -- e.g., source uses WebSearch + Context7 + external docs; target is codebase-only.
- **High (0.75)**: One skill has dedicated research infrastructure the other lacks -- e.g., source spawns a fresh-context researcher subagent with prescriptive output spec; target does inline grep.
- **Complete absence (1.0)**: Target is "none", or target does zero pre-action research.

---

## Dimension 4: Decision Locking

**Definition**: How decisions are captured and persisted for downstream consumption. Captures whether resolved decisions are explicitly distinguished from open choices, and whether they are written in a format downstream stages can reliably consume.

**Source indicators**: CONTEXT.md output with "locked" vs "Claude's discretion" classification, decision format (structured vs narrative), persistence mechanism (file vs session memory), downstream consumer clarity.

**Target indicators**: Clarify Output format (assumption annotations, option selections, question answers), `→ Confirmed` / `→ Selected` / `→ Answer` annotation conventions, Canonical References section, CONTRACTS.md append.

**Scoring guidance**:
- **Low (0.25)**: Both lock decisions with minor format differences -- e.g., both use structured annotations but with different field names or ordering.
- **Medium (0.5)**: One has explicit lock/discretion classification the other lacks -- e.g., source marks decisions as "LOCKED -- no further changes" vs "at Claude's discretion" while target uses uniform annotations with no discretion signal.
- **High (0.75)**: One has structured decision persistence mechanism the other lacks -- e.g., source writes CONTEXT.md after every phase with locked decisions; target relies on entity body with no cross-phase decision file.
- **Complete absence (1.0)**: Target is "none", or target has no decision persistence mechanism at all.

---

## Dimension 5: Verification Rigor

**Definition**: How the skill validates its own output before completing. Captures the presence and sophistication of self-review, quality gates, and iterative correction loops.

**Source indicators**: Quality gate steps with explicit pass/fail criteria, plan-checker or equivalent subagent dispatch, verification loops with iteration caps, domain-specific verification dimensions (not generic "looks good").

**Target indicators**: Self-review steps (count and specificity), plan-checker dimensions (how many, how specific), revision loop caps (max 3 iterations etc.), blocking vs non-blocking failure modes.

**Scoring guidance**:
- **Low (0.25)**: Similar verification rigor with different checklist items -- e.g., both have self-review steps but the specific criteria differ in naming.
- **Medium (0.5)**: One has iteration-based verification the other does one-shot -- e.g., source loops plan-checker up to 3 times, revises, loops again; target does one self-review pass.
- **High (0.75)**: One has a dedicated verification subagent or multi-dimensional gate the other entirely lacks -- e.g., source dispatches a plan-checker with 7 named dimensions and hard-blocks on failures; target has no verification step.
- **Complete absence (1.0)**: Target is "none", or target has zero self-verification mechanism.

---

## Dimension 6: Execution Architecture

**Definition**: How the skill structures its work execution -- serial vs parallel, subagent dispatch model, wave ordering, fresh-context vs shared-context. Captures the efficiency and scalability of the skill's internal structure.

**Source indicators**: Agent/Task dispatch calls, parallel vs serial step declarations, wave-based execution (W0/W1/W2 etc.), fresh-context subagent isolation, checkpoint/continuation for long runs.

**Target indicators**: Wave graph in PLAN tasks (wave="N" attributes), subagent dispatch model (ensign + researcher pattern), serial/parallel task execution within waves, files_modified overlap detection.

**Scoring guidance**:
- **Low (0.25)**: Similar structure with minor dispatch differences -- e.g., both are serial but one uses named tasks while the other uses inline steps.
- **Medium (0.5)**: One uses wave-parallel execution the other is purely serial -- e.g., source dispatches 3 researchers in parallel; target researches one topic at a time.
- **High (0.75)**: Fundamentally different execution topology -- e.g., source uses fresh-context subagent isolation throughout; target executes all steps in the same context.
- **Complete absence (1.0)**: Target is "none".

---

## Dimension 7: Audit Trail

**Definition**: What institutional memory the skill produces for future reference. Captures the richness and accessibility of the artifacts left behind after execution -- both for debugging and for future distillation runs.

**Source indicators**: Output files persisted after execution (CONTEXT.md, RESEARCH.md, PLAN.md, ROADMAP.md), file naming conventions that enable cross-run tracing, cross-reference patterns linking artifacts across phases.

**Target indicators**: Stage Report format (checklist metrics per stage), entity body sections retained in history (Assumptions, Canonical References, Research Findings), CONTRACTS.md/DECISIONS.md/INDEX.md writes, knowledge-capture MCP calls.

**Scoring guidance**:
- **Low (0.25)**: Both produce similar audit artifacts -- minor differences in format or verbosity.
- **Medium (0.5)**: One produces richer or more structured audit output -- e.g., source writes CONTEXT.md with locked decision index; target writes Stage Report with checklist metrics but no cross-phase decision file.
- **High (0.75)**: One produces substantially more actionable institutional memory -- e.g., source writes RESEARCH.md, PLAN.md, CONTEXT.md with cross-links; target writes only entity body stage reports.
- **Complete absence (1.0)**: Target is "none", or target produces no persistent audit artifacts.

---

## Notes

- **Dimensions are fixed**: O-1 captain decision (2026-04-12). Cross-run comparability depends on every run using these same 7 axes.
- **Scoring is qualitative**: Low/Medium/High/Complete-absence bands + 0.0 for no-evidence. Purpose is entity creation threshold (>= 0.5), not precise ranking.
- **Evidence is mandatory**: every score >= 0.25 requires file:line or session observation citation. Scores of 0.0 require the notation "no evidence of gap".
- **Captain override**: during build-distill Step 5, captain can override any score up or down via the AskUserQuestion interaction. The override is recorded in the audit report.
