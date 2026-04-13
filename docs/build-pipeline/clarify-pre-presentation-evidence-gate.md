---
id: 091
title: "Clarify pre-presentation evidence gate -- SO must Read-verify before asking captain"
status: clarify
context_status: awaiting-clarify
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

## Assumptions

A-1: Step 1.5 skip condition at SKILL.md:115 only covers resume case (prior session). There is no rule preventing SO from informally skipping the Read for "same session" evidence. The gap is real — the spec mandates Read (line 119) but the skip condition allows SO to reason "same session, no drift" and skip without violating any explicit rule.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-clarify/SKILL.md:115` skip condition text: "If Step 1 detected the resume case (all counts zero), also skip Step 1.5". No mention of same-session provenance. `SKILL.md:119` says "Read the cited file region using the Read tool" but this is a sub-step of 1a which SO can skip by rationalizing temporal freshness.
→ Confirmed: captain, 2026-04-14 (batch)

A-2: SO agent Step 3 (science-officer.md:99) has no pre-presentation checkpoint for build-clarify. It says "follow the skill's 7-step flow" — full delegation with no SO-level verification gate before captain interaction begins.
Confidence: 🟢 Confident (0.95)
Evidence: `agents/science-officer.md:99` verbatim: "When running build-clarify: follow the skill's 7-step flow. Captain interacts via AskUserQuestion (loaded via ToolSearch)." No mention of Read-verification, provenance checking, or pre-Step-2 gates.
→ Confirmed: captain, 2026-04-14 (batch)

A-3: Provenance detection is implicit in session context — SO can determine whether it personally Read a file by checking whether a Read tool call for that file:line exists in the current conversation context. No metadata tagging needed. The rule becomes behavioral: "if you cannot recall a Read call for the cited file in this session, Read it now."
Confidence: 🟢 Confident (0.90)
Evidence: Claude Code's conversation context preserves all tool calls. In Mode B (inline mapping), SO's context has Read calls for every mapped file. In Mode A (code-explorer dispatch), SO's context has the Agent dispatch + summary return but NOT Read calls for individual files. The distinction is observable from within the session.
→ Confirmed: captain, 2026-04-14 (batch)

A-4: The fix is spec-text-only — 2 markdown files modified, no code changes, no scripts, no test infrastructure.
Confidence: 🟢 Confident (0.95)
Evidence: Both target files are markdown specs: `skills/build-clarify/SKILL.md` and `agents/science-officer.md`. Skill behavior is defined by spec text that the LLM follows. MEMORY.md: "Skill Contract Fixes Are Plan-Driven, Not Pipeline-Driven."
→ Confirmed: captain, 2026-04-14 (batch)

## Open Questions

Q-1: Should the provenance rule be strict (always Read every file:line before presenting, even if SO already Read it during explore in the same session) or smart (only Read files that SO did NOT personally Read)?

Domain: Runnable/Invokable

Why it matters: Strict is simpler to specify and eliminates all ambiguity — SO always Re-reads before presenting, no provenance inference needed. But it adds redundant Reads when SO already mapped inline (Mode B). Smart is more efficient but requires SO to self-assess provenance, which is the same kind of informal reasoning that caused the original bug.

Suggested options:
- (a) Smart provenance: "If you cannot recall a Read tool call for the cited file in this session, Read it now." Efficient, but requires honest self-assessment.
- (b) Strict always-Read: "Before presenting Step 2 batch, Read every file:line citation regardless of prior reads in this session." Redundant but bulletproof. ~5-10 extra Read calls per entity.
- (c) Strict for Mode A only: "If explore used code-explorer dispatch (Mode A), Step 1.5 1a is mandatory. If explore used inline mapping (Mode B), Step 1.5 1a may skip file:line citations that SO Read during explore." Targets the actual gap without penalizing Mode B.

## Stage Report: explore

- [x] Files mapped: 2 across skill-spec (1), agent-spec (1)
  skills/build-clarify/SKILL.md (Step 1.5 lines 113-141, Step 2 lines 145-170); agents/science-officer.md (Step 3 line 99)
- [x] Assumptions formed: 4 (Confident: 4, Likely: 0, Unclear: 0)
  A-1 skip condition gap (0.95, SKILL.md:115), A-2 no SO checkpoint (0.95, science-officer.md:99), A-3 provenance is implicit in session context (0.90), A-4 spec-text-only fix (0.95)
- [x] Options surfaced: 0
  No competing codebase patterns — fix approach is clear
- [x] Questions generated: 1
  Q-1 provenance rule strictness (smart vs strict vs Mode-A-only)
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Small
  2 files, 2 targeted text edits, no code changes
- [x] Research dispatched: 0 researchers (skipped -- internal skill architecture, no external tech)

## Canonical References

- `skills/build-clarify/SKILL.md:115` -- skip condition text (A-1 gap location)
- `skills/build-clarify/SKILL.md:119` -- Read mandate text (the rule that should fire but doesn't)
- `agents/science-officer.md:99` -- Step 3 build-clarify delegation text (A-2 gap location)
- `agents/science-officer.md:93-99` -- full Step 3 per-skill execution rules section (insertion point for checkpoint)
