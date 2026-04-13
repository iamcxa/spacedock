---
id: 091
title: "Clarify pre-presentation evidence gate -- SO must Read-verify before asking captain"
status: draft
context_status: pending
source: captain feedback (2026-04-14 SO session -- captain caught unverified citations in assumption batch)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: bugfix
scale: Small
project: spacedock
depends-on: []
---

## Directive

> During clarify Step 2 (assumption batch confirmation), SO presents file:line citations to the captain as verified evidence. But when explore ran Mode A (background code-explorer) or used researcher annotations, SO never personally Read those files — it consumed a summary from a subagent. Captain caught this: "這些都是基於 codebase 驗證過的對嗎？" and SO had to backtrack to verify post-hoc. The fix: SO must Read-verify every file:line citation before presenting it to captain, regardless of where the evidence originated. Step 1.5 (Evidence Freshness) already mandates this in spec but the skip condition is too loose — "same session" is treated as a reason to skip, when the real question is "did SO personally Read this file, or did a subagent?"

## Captain Context Snapshot

- **Repo**: main @ 22d35c7
- **Session**: SO pipeline session for 060/089/061/065. Captain feedback during a parallel project's SO session exposed the gap.
- **Domain**: Runnable/Invokable (skill behavior), Readable/Textual (skill SKILL.md spec)
- **Related entities**: 074 -- Pipeline verification quality uplift (context ready) -- related quality concern
- **Created**: 2026-04-14T00:45:00+08:00

## Brainstorming Spec

**APPROACH**: Two targeted fixes to enforce pre-presentation verification:

(1) **build-clarify Step 1.5 1a tightening**: Replace the informal "same session = no drift" reasoning with an explicit provenance rule. Add to Step 1.5 1a: "Evidence provenance check: if the Evidence line contains citations produced by a different agent (code-explorer, researcher, audit agent) — identifiable by `(✓ confirmed by explore:`, `(✓ research:`, or any annotation referencing a subagent output — then Step 1.5 1a is MANDATORY for that assumption, even in same-session. The Read tool call on the cited file:line must appear in SO's own context (not relayed from a subagent summary). Only evidence that SO personally Read in the current session may skip 1a's Read verification."

(2) **science-officer agent pre-Step-2 checkpoint**: Add to the SO agent spec (agents/science-officer.md, Step 3 "Per-skill execution rules" for build-clarify): "Before presenting the Step 2 assumption batch to captain, SO must verify it holds a Read record for every `file:line` citation in the entity's `## Assumptions` section. A 'Read record' means the SO session itself called Read on that file (not a subagent). If any citation lacks a Read record, SO must Read the file region now and verify the claim holds before presenting. If the claim does not hold, reclassify the assumption per Step 1.5 1a stale/contradicted rules before presenting."

**ALTERNATIVE**: Add a mechanical validator script that checks whether all cited file:line references exist and content matches (like a pre-commit hook for entity files). -- D-01 Rejected: the problem is not whether the files exist but whether SO's presentation to captain is backed by direct observation. A script can validate file existence but cannot validate that the LLM judged the content correctly. The fix must be in the LLM's workflow (skill spec), not in a mechanical check.

**GUARDRAILS**:
- Do NOT change Step 1.5 skip condition for resume case — that skip is correct (captain already reviewed in prior session)
- Do NOT add mandatory Read for non-file citations (e.g., "captain domain knowledge", "design doc §X.Y" referenced by section not line) — only `file:line` format triggers the gate
- Do NOT add overhead to entities where SO personally ran Mode B inline mapping (SO already Read those files) — the gate only fires when provenance indicates subagent origin
- Changes are to SKILL.md spec text only — no code changes, no new scripts

**RATIONALE**: The root cause is a spec gap, not an implementation bug. Step 1.5 1a says "Read the cited file region" but the skip condition allows SO to reason away the Read when evidence feels fresh. Making the provenance check explicit closes the gap at the spec level, which is where skill behavior is defined. The SO agent checkpoint is defense-in-depth: even if Step 1.5 is somehow skipped, the SO agent itself refuses to present unverified claims to the captain.

## Acceptance Criteria

- Given an assumption with evidence citing `file:line` produced by a code-explorer subagent, when build-clarify Step 1.5 runs in same-session, then SO must Read the cited file region and verify the claim (how to verify: read the updated SKILL.md Step 1.5 1a, assert the provenance rule text is present and unambiguous)
- Given the science-officer agent spec, when SO is about to present Step 2 assumption batch, then the spec requires a Read-record check for all file:line citations (how to verify: read agents/science-officer.md, assert the pre-Step-2 checkpoint text is present)
- Given an assumption whose evidence was produced by SO's own Read in the same session (Mode B inline mapping), when Step 1.5 runs, then the provenance check does NOT trigger additional Reads (how to verify: the rule text explicitly excludes SO-personal-Read evidence from the gate)

## References

- `skills/build-clarify/SKILL.md` Step 1.5 (lines 113-141) — current Evidence Freshness spec with skip condition gap
- `agents/science-officer.md` Step 3 — Per-skill execution rules for build-clarify
- Captain feedback transcript: "這些都是基於 codebase 驗證過的對嗎？" → SO admitted citations came from parallel audit agents, not personal Reads
- MEMORY.md: "Assumption Presentation" — captain needs detail to evaluate; unverified detail is worse than no detail
