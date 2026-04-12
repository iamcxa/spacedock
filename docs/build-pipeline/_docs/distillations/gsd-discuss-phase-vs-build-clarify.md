# GSD discuss-phase vs build-clarify -- Comparison Report

**Date**: 2026-04-12
**Source**: `~/.claude/skills/gsd-discuss-phase/SKILL.md` + `~/.claude/get-shit-done/workflows/discuss-phase.md`
**Target**: `skills/build-clarify/SKILL.md` + `skills/build-clarify/references/`
**Run by**: build-distill (entity 068, Wave 2 task-3)

---

## Cross-Comparison Gap Ranking (This Run)

| Rank | Dimension | Score | Entity Draft? |
|------|-----------|-------|---------------|
| 1 | Interaction Model | 0.75 | yes -- build-clarify-interaction-modes |
| 2 | Context Strategy | 0.50 | yes -- covered by interaction modes entity |
| 3 | Audit Trail | 0.25 | no -- build-plan's CONTRACTS.md partially covers |
| 4 | Decision Locking | 0.25 | no -- annotation system is equivalent |
| 5 | Verification Rigor | 0.00 | no evidence of gap |
| 6 | Research Depth | 0.00 | no evidence of gap (both are non-research skills) |
| 7 | Execution Architecture | 0.00 | no evidence of gap (both single-context serial) |

---

## Source Summary: gsd-discuss-phase

- **Purpose**: Extract implementation decisions downstream agents need -- researcher and planner will use CONTEXT.md to know what to investigate and what choices are locked.
- **Interaction Model**: Fully interactive with three optional modes -- `--auto` (Claude picks recommended defaults, skips captain), `--chain` (discuss then auto-plan+execute), `--power` (bulk question generation into file-based UI for async answering). Default mode: fully interactive via AskUserQuestion.
- **Step Count**: 6 steps in objective + full workflow in `discuss-phase.md` (≈ 200 lines of logic)
- **Tools Used**: Read, Write, Bash, Glob, Grep, AskUserQuestion, Task, Context7
- **Output Artifacts**: `{N}-CONTEXT.md` with locked decisions and deferred ideas; `{N}-CONTEXT.md` marks items as "LOCKED" vs "Claude's Discretion"
- **Subagent Dispatch Pattern**: None in discuss-phase itself; downstream agents (researcher, planner) consume CONTEXT.md. Power mode writes questions to file for async answering.
- **Context Loading Strategy**: Loads PROJECT.md, REQUIREMENTS.md, STATE.md, prior CONTEXT.md files at start. Skips gray areas already decided in prior phases (cross-phase awareness).

---

## Target Summary: build-clarify

- **Purpose**: Walk captain through resolving explore-stage gray areas (assumptions/options/questions) until entity context is complete and ready for planning.
- **Interaction Model**: Fully interactive via AskUserQuestion. No mode flags -- always interactive. Single mode only.
- **Step Count**: 7 steps (Step 0 decomposition gate + Steps 1-6)
- **Tools Used**: Read, Grep, Write/Edit, Bash, AskUserQuestion
- **Output Artifacts**: Annotations appended to entity body (`→ Confirmed`, `→ Selected`, `→ Answer`); Stage Report: clarify; `context_status: ready` frontmatter update
- **Subagent Dispatch Pattern**: None -- pure sequential single-context execution
- **Context Loading Strategy**: Reads entity body only (Assumptions, Option Comparisons, Open Questions from explore stage). No cross-session file loading, no prior CONTEXT.md chain.

---

## Dimensional Comparison

### Dimension 1: Interaction Model

**Source**: gsd-discuss-phase supports 4 interaction modes: default (interactive AskUserQuestion), `--auto` (non-interactive, Claude picks defaults), `--chain` (discuss then auto-plan), `--power` (bulk async question file). The mode is runtime-selectable per invocation.
(`gsd-discuss-phase/SKILL.md:3-4` -- argument-hint shows `[--auto] [--chain] [--batch] [--analyze] [--text] [--power]`)

**Target**: build-clarify has one mode only -- always interactive. No `--auto`, no batch mode, no async path. Interactive by design per its role as the clarify stage.
(`skills/build-clarify/SKILL.md:13-16` -- "Seven steps, in strict order. Steps 2-4 interact with the captain; Steps 0, 1, 5, 6 are internal.")

**Gap Direction**: source-stronger
**Evidence**: `~/.claude/skills/gsd-discuss-phase/SKILL.md:3` -- `--auto` and `--power` modes; `skills/build-clarify/SKILL.md:327-344` -- Rules section has no mode flags, no skip-interaction path
Score: High (0.75) -- build-clarify has zero non-interactive or async modes; fundamentally single-mode

---

### Dimension 2: Context Strategy

**Source**: Loads PROJECT.md, REQUIREMENTS.md, STATE.md, and ALL prior CONTEXT.md files at initialization (`discuss-phase.md` objective step 1: "Load prior context"). Skips gray areas already decided in prior phases (cross-phase awareness). Multi-session context chain.
(`~/.claude/get-shit-done/workflows/discuss-phase.md:22-28` -- downstream_awareness; objective step 1)

**Target**: Loads entity body only. No PROJECT.md, no STATE.md, no prior CONTEXT.md chain. Context is scoped to the single entity being clarified. Cross-entity context only comes from captain citing references during Q&A (Canonical References accumulator).
(`skills/build-clarify/SKILL.md:91-98` -- Step 1 reads entity body; no mention of external project state files)

**Gap Direction**: source-stronger
**Evidence**: `~/.claude/get-shit-done/workflows/discuss-phase.md:4-18` -- "Load prior context" including STATE.md and prior CONTEXT.md files; `skills/build-clarify/SKILL.md:91` -- entity body only
Score: Medium (0.50) -- GSD loads cross-session project context chain; build-clarify is entity-body-only

---

### Dimension 3: Research Depth

**Source**: Not a research skill -- discuss-phase explicitly does NOT research. Its job is to capture decisions that the downstream researcher then investigates. Zero WebSearch/Context7 calls.
(`~/.claude/get-shit-done/workflows/discuss-phase.md:37-39` -- "Not your job: Figure out HOW to implement. That's what research and planning do")

**Target**: Not a research skill -- build-clarify explicitly does NOT research. Its job is to resolve explore-stage gray areas via captain interaction.
(`skills/build-clarify/SKILL.md:328-344` -- Rules: no research mentions; skill reads existing explore output)

**Gap Direction**: equivalent
**Evidence**: Both skills explicitly disclaim research as out of scope. No research gap exists.
Score: 0.00 -- no evidence of gap; both are non-research skills by design

---

### Dimension 4: Decision Locking

**Source**: Explicit "LOCKED" vs "Claude's Discretion" classification in CONTEXT.md output. Downstream agents (researcher, planner) can distinguish forced decisions from flexible ones.
(`~/.claude/get-shit-done/workflows/discuss-phase.md:10-18` -- "gsd-planner reads CONTEXT.md to know what decisions are LOCKED"; "Claude's Discretion: loading skeleton → planner can decide approach")

**Target**: All resolved items use uniform annotation format (`→ Confirmed`, `→ Selected`, `→ Answer`). No explicit LOCKED vs discretion classification -- every resolved item is treated equally by build-plan. The CONTRACTS.md append (written by build-plan, not build-clarify) creates a separate cross-entity record.
(`skills/build-clarify/SKILL.md:119-143` -- uniform annotation format with no lock/discretion distinction)

**Gap Direction**: source-stronger
**Evidence**: `~/.claude/get-shit-done/workflows/discuss-phase.md:12-16` -- explicit LOCKED vs "Claude's Discretion" labels in CONTEXT.md. `skills/build-clarify/SKILL.md:119-143` -- uniform `→ Confirmed` format with no such distinction.

Score: Low (0.25) -- the distinction exists in GSD but build-clarify's uniform annotations work in practice because build-plan treats all confirmed items as authoritative. Gap is real but hasn't caused captain pain.

---

### Dimension 5: Verification Rigor

**Source**: No self-verification step -- discuss-phase writes CONTEXT.md and reports to user. No plan-checker equivalent.

**Target**: Step 5 (Context Sufficiency Gate) verifies all questions answered, all assumptions annotated, all options selected before advancing. Explicit checklist with hard-block on gaps.
(`skills/build-clarify/SKILL.md:220-238` -- Step 5 sufficiency gate with 5 explicit checks)

**Gap Direction**: target-stronger
**Evidence**: `skills/build-clarify/SKILL.md:220-238` -- 5-check sufficiency gate blocks advance if any item unanswered. GSD discuss-phase has no equivalent gate.
Score: 0.00 -- build-clarify is stronger here; not an actionable gap

---

### Dimension 6: Execution Architecture

**Source**: Single-context serial execution. The power mode writes questions to a file but the orchestration itself is still sequential.

**Target**: Single-context serial execution. Steps 0-6 sequential with no parallelism.

**Gap Direction**: equivalent
**Evidence**: Both skills are sequential single-context. No wave-parallel architecture in either.
Score: 0.00 -- no evidence of gap; both single-context serial

---

### Dimension 7: Audit Trail

**Source**: Produces `{N}-CONTEXT.md` -- a structured file persisted across sessions. Downstream agents read CONTEXT.md directly. Cross-session audit trail for decisions.
(`~/.claude/get-shit-done/workflows/discuss-phase.md:27-29` -- "Output: {phase_num}-CONTEXT.md -- decisions clear enough that downstream agents can act without asking the user again")

**Target**: Annotations are written inline to entity body (persistent in git). Stage Report: clarify is written to entity body. No separate CONTEXT.md analog -- decisions live inside the entity file.
(`skills/build-clarify/SKILL.md:278-313` -- Stage Report: clarify in entity body)

**Gap Direction**: divergent
**Evidence**: Both produce persistent audit artifacts; formats differ. GSD produces a separate named file (CONTEXT.md) readable by any downstream agent. Build-clarify embeds everything in the entity body which is the pipeline's own native artifact. Neither is strictly better -- they serve different architectures.

Score: Low (0.25) -- divergent but not a gap. Entity body as audit trail is appropriate for build pipeline's entity-centric design.

---

## Gap Score Summary

| Dimension | Band | Score | Evidence |
|-----------|------|-------|----------|
| Interaction Model | High | 0.75 | `--auto`/`--power` modes absent in build-clarify; only one interaction mode |
| Context Strategy | Medium | 0.50 | GSD loads PROJECT.md + prior CONTEXT.md chain; build-clarify loads entity body only |
| Audit Trail | Low | 0.25 | Divergent formats, not a true gap -- entity body is the appropriate artifact |
| Decision Locking | Low | 0.25 | LOCKED vs Discretion classification in GSD; uniform annotations in build-clarify |
| Verification Rigor | 0.0 | 0.00 | Build-clarify's sufficiency gate is stronger than GSD's (target-stronger, not a gap) |
| Research Depth | 0.0 | 0.00 | No evidence of gap -- neither skill does research |
| Execution Architecture | 0.0 | 0.00 | No evidence of gap -- both single-context serial |

---

## Proposed Entity Drafts

### Gap 1: Interaction Model (Score: 0.75) -- QUALIFIES

**Proposed entity title**: Build-Clarify Interaction Modes (--auto, --power)
**Directive summary**: Add `--auto` mode (Claude picks recommended defaults, skips AskUserQuestion) and `--power` mode (bulk question file for async answering) to build-clarify. Currently build-clarify is always interactive -- the captain must answer each question in real time. GSD's --auto and --power modes solve the "I trust the recommendations, just proceed" and "I'm not at my desk right now" use cases.
**Draft acceptance criteria**:
- `build-clarify --auto {slug}` confirms all Confident assumptions, selects all Recommended options, and uses Suggested options[0] for each Open Question without AskUserQuestion calls
- `build-clarify --power {slug}` writes all unresolved items to `docs/build-pipeline/{slug}-clarify-questions.md` for async review; captain can edit the file and re-run to apply answers
**Gap score**: 0.75 (High)
**Source comparison**: `gsd-discuss-phase/SKILL.md:3-4` -- `--auto`/`--chain`/`--power` flags

### Gap 2: Context Strategy (Score: 0.50) -- QUALIFIES

**Proposed entity title**: Cross-Entity Context Loading in Build-Clarify
**Directive summary**: When build-clarify runs, load STATE.md and any prior entity CONTEXT files to prevent re-asking questions already decided in earlier entities. Currently build-clarify reads only the current entity body -- it has no awareness of decisions from related entities (e.g., "we always use SQLite for persistence" decided in entity 045 is not visible when clarifying entity 068).
**Draft acceptance criteria**:
- Build-clarify Step 1 reads `docs/build-pipeline/_index/CONTRACTS.md` and the 3 most recent shipped entities to extract recurring locked decisions
- When a gray area matches a prior locked decision, auto-confirm with evidence citation to the prior entity rather than asking captain again
**Gap score**: 0.50 (Medium)
**Source comparison**: `discuss-phase.md` objective step 1 -- "Load prior context (PROJECT.md, REQUIREMENTS.md, STATE.md, prior CONTEXT.md files)"

Note: This gap is addressed indirectly by the Interaction Model entity (--auto mode would auto-confirm well-known decisions). The captain may prefer to bundle these into one entity or keep them separate. Step 5 AskUserQuestion determines disposition.
