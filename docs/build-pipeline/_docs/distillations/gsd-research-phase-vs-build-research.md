# GSD research-phase vs build-research -- Comparison Report

**Date**: 2026-04-12
**Source**: `~/.claude/skills/gsd-research-phase/SKILL.md`
**Target**: `skills/build-research/SKILL.md`
**Run by**: build-distill (entity 068, Wave 2 task-4)

---

## Cross-Comparison Gap Ranking (This Run)

| Rank | Dimension | Score | Entity Draft? |
|------|-----------|-------|---------------|
| 1 | Research Depth | 0.50 | yes -- external source diversity |
| 2 | Execution Architecture | 0.50 | yes -- checkpoint/continuation model |
| 3 | Context Strategy | 0.25 | no -- build-research receives context from build-plan |
| 4 | Audit Trail | 0.25 | no -- both produce structured research output |
| 5 | Interaction Model | 0.00 | no evidence of gap (both non-interactive) |
| 6 | Decision Locking | 0.00 | no evidence of gap (neither locks decisions) |
| 7 | Verification Rigor | 0.00 | no evidence of gap |

## All-Comparisons Aggregate (Entity 068 GSD First Pass)

| Comparison | Highest Gap Score | Top Dimension | Entity Draft? |
|------------|------------------|---------------|---------------|
| gsd-roadmap vs build-flow | 1.0 | All 5 dimensions (complete absence) | yes -- build-flow-roadmap-orchestration |
| gsd-discuss-assumptions vs build-explore | 0.75 | Context Strategy (domain-aware gray areas) | yes -- build-explore-domain-aware-gray-areas |
| gsd-discuss-phase vs build-clarify | 0.75 | Interaction Model (--auto/--power modes) | yes -- build-clarify-interaction-modes |
| **gsd-research-phase vs build-research** (this run) | **0.50** | **Research Depth + Checkpoint/Continuation** | **yes -- 2 entities** |
| gsd-plan-phase vs build-plan | 0.50 | Context Strategy (cross-entity plan context) | yes -- cross-entity context awareness |

---

## Source Summary: gsd-research-phase

- **Purpose**: Research how to implement a phase. Spawns gsd-phase-researcher subagent with fresh 200k context. Orchestrator role: parse phase, validate against roadmap, check existing research, gather context, spawn researcher.
- **Interaction Model**: Semi-interactive orchestrator -- checks if research already exists and offers choices (update/view/skip). The researcher subagent itself is non-interactive.
- **Step Count**: 6 steps (initialize, validate phase, check existing, gather context, spawn researcher, handle return)
- **Tools Used**: Read, Bash, Task (for subagent spawn)
- **Output Artifacts**: `.planning/phases/{N}-{slug}/{N}-RESEARCH.md` with 5 sections: Standard Stack, Architecture Patterns, Don't Hand-Roll, Common Pitfalls, Code Examples
- **Subagent Dispatch Pattern**: Spawns `gsd-phase-researcher` with fresh 200k context via Task tool. Researcher uses WebSearch, Context7, WebFetch. Continuation model for long research (checkpoint/resume).
- **Context Loading Strategy**: Passes REQUIREMENTS.md, CONTEXT.md, STATE.md paths to researcher subagent via `<files_to_read>` blocks. Does NOT inline file contents in orchestrator context (minimizes orchestrator pollution).

---

## Target Summary: build-research

- **Purpose**: Read-only research subroutine dispatched by build-plan for one research topic. Produces structured finding across 5 domains (Upstream Constraints, Existing Patterns, Library/API Surface, Known Gotchas, Reference Examples) with file:line citations.
- **Interaction Model**: Non-interactive. Zero AskUserQuestion calls. Runs as leaf subagent.
- **Step Count**: 6 steps (read topic + plan search, investigate, classify findings, unknown unknowns, follow-up topics, return output)
- **Tools Used**: Read, Grep, Glob, WebFetch, WebSearch, Context7
- **Output Artifacts**: Returns structured text output (5-domain finding) to build-plan. No file written directly -- build-plan synthesizes into entity body.
- **Subagent Dispatch Pattern**: Is itself a subagent. Does NOT further dispatch. Leaf skill.
- **Context Loading Strategy**: Receives topic title, description, entity context paths, and scope constraint from build-plan's dispatch prompt. Reads files within those scope anchors only.

---

## Dimensional Comparison

### Dimension 1: Interaction Model

**Source**: Semi-interactive orchestrator (checks existing research, offers choices). Researcher subagent itself is non-interactive.
(`gsd-research-phase/SKILL.md:64-70` -- "If exists: Offer: 1) Update research, 2) View existing, 3) Skip. Wait for response.")

**Target**: Fully non-interactive. Returns text to build-plan.
(`skills/build-research/SKILL.md:10-11` -- "You are read-only and non-interactive")

**Gap Direction**: source-stronger (orchestrator is interactive; researcher equivalent is non-interactive)
**Evidence**: Both research workers (gsd-phase-researcher, build-research) are non-interactive. The difference is the orchestration layer -- gsd-research-phase is user-facing; build-research is embedded in build-plan's orchestration. Not a meaningful UX gap.

Score: 0.00 -- no evidence of gap at the researcher level. The orchestration difference is architectural, not a capability gap.

---

### Dimension 2: Context Strategy

**Source**: Passes REQUIREMENTS.md + CONTEXT.md + STATE.md paths to researcher. Researcher loads all three. Orchestrator does NOT inline file contents (paths only to minimize context).
(`gsd-research-phase/SKILL.md:73-80` -- "Use paths from INIT (do not inline file contents in orchestrator context)")

**Target**: Receives topic description + entity context paths from build-plan. Reads files within scope anchors only. Strict per-topic scope -- no cross-topic or cross-entity context.
(`skills/build-research/SKILL.md:34-43` -- Input Contract: topic title, description, entity context paths, scope constraint)

**Gap Direction**: source-stronger (GSD passes multi-file project context; build-research gets narrower per-topic scope)
**Evidence**: `gsd-research-phase/SKILL.md:73-80` -- passes requirements + context + state. `skills/build-research/SKILL.md:71-72` -- "stays inside scope anchors unless anchor-file imports something external"

Score: Low (0.25) -- build-plan dispatches multiple researchers with different entity context paths, effectively covering the same breadth. The narrower per-topic scope is a feature (prevents scope drift) not a deficiency.

---

### Dimension 3: Research Depth

**Source**: gsd-phase-researcher uses WebSearch, Context7, and WebFetch explicitly. Quality gate requires: all domains investigated, negative claims verified with official docs, multiple sources for critical claims, confidence levels assigned.
(`gsd-research-phase/SKILL.md:128-136` -- quality_gate checklist: "Multiple sources for critical claims"; "Confidence levels assigned honestly")

**Target**: build-research can use WebFetch, WebSearch, Context7. BUT scope discipline is "codebase-first" -- the 5 domains include Library/API Surface and Reference Examples but the primary focus is internal codebase patterns. Citation discipline requires file:line for internal findings.
(`skills/build-research/SKILL.md:20-25` -- Tools Available: WebFetch, WebSearch, Context7 listed; `skills/build-research/SKILL.md:104-114` -- Citation Discipline requires verification in repo first)

**Gap Direction**: source-stronger (GSD's prescriptive output spec forces external source diversity; build-research allows but doesn't require it)
**Evidence**: `gsd-research-phase/SKILL.md:96-127` -- downstream_consumer spec names 5 specific output sections (Standard Stack, Architecture Patterns, Don't Hand-Roll, Common Pitfalls, Code Examples) that force external ecosystem research. `skills/build-research/SKILL.md:119-127` -- 5 domains include external (Library/API Surface) but are not prescriptively external-first.

Score: Medium (0.50) -- meaningful gap. Build-research is primarily codebase-investigative; GSD is primarily ecosystem-investigative. For tasks with external dependencies (new libraries, ecosystem choices), build-research may under-investigate.

---

### Dimension 4: Decision Locking

**Source**: Not a decision-locking skill -- produces research findings, not decisions. Decisions are made in plan-phase.

**Target**: Not a decision-locking skill -- produces research findings, not decisions. Decisions are made in build-plan.

**Gap Direction**: equivalent
**Evidence**: Both are research skills that feed planning. Neither locks decisions.

Score: 0.00 -- no evidence of gap.

---

### Dimension 5: Verification Rigor

**Source**: Quality gate in researcher subagent: all domains investigated, negative claims verified, multiple sources, confidence levels, section names match what plan-phase expects.
(`gsd-research-phase/SKILL.md:128-136` -- explicit quality_gate checklist)

**Target**: No explicit self-verification step in build-research. Citation discipline (grep before citing) is the only quality gate. Build-plan's Step 2 verifies completeness of research findings.
(`skills/build-research/SKILL.md:104-114` -- Citation Discipline as quality mechanism; no self-review step)

**Gap Direction**: source-stronger (GSD has explicit quality gate; build-research relies on citation discipline)
**Evidence**: `gsd-research-phase/SKILL.md:128-136` -- 5-point quality gate checklist. `skills/build-research/SKILL.md` -- no equivalent checklist.

Score: 0.00 -- while GSD has a more formal quality gate, build-research's citation discipline (every finding cited, grep-before-cite, "no evidence = omit") achieves equivalent quality for codebase-focused research. The gap exists structurally but evidence of captain pain is absent.

---

### Dimension 6: Execution Architecture

**Source**: Spawns fresh-context gsd-phase-researcher via Task tool. Continuation model: if research is long, researcher writes `## CHECKPOINT REACHED`, orchestrator spawns continuation agent with prior state.
(`gsd-research-phase/SKILL.md:140-186` -- checkpoint handling and continuation spawn)

**Target**: Runs as leaf subagent dispatched by build-plan. No checkpoint/continuation model. 15-file cap per topic -- if more files needed, truncates and logs under Unknown Unknowns.
(`skills/build-research/SKILL.md:67-72` -- "Cap file reads at 15 for a single topic. If topic needs more, truncate and log")

**Gap Direction**: source-stronger (GSD has checkpoint/continuation for long research; build-research hard-truncates)
**Evidence**: `gsd-research-phase/SKILL.md:152-163` -- checkpoint handling: "spawn continuation agent with prior state". `skills/build-research/SKILL.md:67-72` -- truncation is mandatory with no continuation path.

Score: Medium (0.50) -- meaningful gap for large research topics. Build-research's hard-truncation means complex topics (e.g., "investigate entire auth subsystem") lose findings. GSD's continuation model handles this. Captain pain: not directly observed, but the 15-file cap is known to cause truncation in Phase D/E research tasks.

---

### Dimension 7: Audit Trail

**Source**: Writes `{N}-RESEARCH.md` to phase directory. Persistent file with named sections consumed by downstream gsd-planner.
(`gsd-research-phase/SKILL.md:139` -- "Write to: .planning/phases/${PHASE}-{slug}/${PHASE}-RESEARCH.md")

**Target**: Returns text output to build-plan. No file written directly. build-plan synthesizes into entity body `## Research Findings` section. Persistent in entity file, not standalone.
(`skills/build-research/SKILL.md:183` -- "Return structured sections as plain text. build-plan synthesizes them into entity body")

**Gap Direction**: divergent
**Evidence**: Both persist research findings. GSD writes standalone RESEARCH.md (re-readable by any agent). Build-research embeds in entity body (entity-centric, not standalone). Architecturally appropriate for each system.

Score: Low (0.25) -- divergent but not a capability gap. Entity body is build pipeline's native audit artifact.

---

## Gap Score Summary

| Dimension | Band | Score | Evidence |
|-----------|------|-------|----------|
| Research Depth | Medium | 0.50 | GSD forces external ecosystem research; build-research is codebase-first |
| Execution Architecture | Medium | 0.50 | GSD has checkpoint/continuation for long research; build-research hard-truncates at 15 files |
| Context Strategy | Low | 0.25 | GSD passes multi-file project context; build-research uses narrower per-topic scope (by design) |
| Audit Trail | Low | 0.25 | Divergent formats -- both persist findings appropriately for their architecture |
| Interaction Model | 0.0 | 0.00 | No evidence of gap at researcher level |
| Decision Locking | 0.0 | 0.00 | Neither skill locks decisions -- both feed planning |
| Verification Rigor | 0.0 | 0.00 | No captain pain observed despite structural difference |

---

## Proposed Entity Drafts

### Gap 1: Research Depth (Score: 0.50) -- QUALIFIES

**Proposed entity title**: Build-Research External Ecosystem Mode
**Directive summary**: Add an `--ecosystem` mode to build-research (or build-plan's topic dispatch) that forces external-first investigation: Standard Stack, Architecture Patterns, Don't Hand-Roll, Common Pitfalls, Code Examples -- the same prescriptive output spec GSD's researcher uses. Currently build-research always investigates the codebase first; for entities involving new external dependencies, this misses ecosystem knowledge.
**Draft acceptance criteria**:
- When build-plan dispatches a researcher with domain `Library/API Surface` or topic containing "new library", researcher produces sections matching GSD's 5 prescribed output sections
- `grep "Standard Stack\|Don't Hand-Roll\|Common Pitfalls" {research-findings}` matches for ecosystem-mode dispatches
**Gap score**: 0.50 (Medium)
**Source comparison**: `gsd-research-phase/SKILL.md:96-127` -- prescriptive downstream_consumer output spec

### Gap 2: Execution Architecture -- Checkpoint/Continuation (Score: 0.50) -- QUALIFIES

**Proposed entity title**: Build-Research Checkpoint/Continuation for Deep Topics
**Directive summary**: Add a checkpoint/continuation mechanism to build-research for topics that exceed the 15-file cap. Currently research hard-truncates with an Unknown Unknowns note -- the findings are incomplete and build-plan cannot request a continuation. GSD's orchestrator spawns a continuation agent with prior state.
**Draft acceptance criteria**:
- When build-research reaches the 15-file cap mid-investigation, it writes `## CHECKPOINT: topic-continuation-needed` in its output
- Build-plan, on receiving a CHECKPOINT signal, dispatches a follow-on researcher with `prior_state: {truncated-findings}` in the prompt
**Gap score**: 0.50 (Medium)
**Source comparison**: `gsd-research-phase/SKILL.md:152-186` -- checkpoint handling and continuation spawn
