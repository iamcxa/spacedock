---
id: 082
title: "UAT evidence and recording -- CLI e2e recording + inline evidence writing"
status: review
context_status: ready
source: decomposition of entity 074 (pipeline verification quality uplift)
started: 2026-04-13T06:30:00Z
worktree: .worktrees/spacedock-ensign-uat-evidence-and-recording
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: []
parent: 074
---

## Directive

> Build-uat captures CLI item evidence as text-only stdout snippets. No terminal recordings (.cast files). Entity files reference evidence by path, not inline — captain must manually open files to evaluate UAT pass/fail.
>
> Two changes: (1) CLI UAT items should trigger `e2e-pipeline:e2e-flow` with `type: cli` to produce .cast recordings alongside text evidence. Fallback to text-only if e2e-pipeline unavailable. (2) UAT Results section should write evidence inline (markdown images for browser, transcript blocks for CLI) so entity file alone is sufficient to evaluate pass/fail.

## Captain Context Snapshot

- **Repo**: main @ f748d5f
- **Session**: No recent session context (entity created via decompose(074) at 59990ee)
- **Domain**: Runnable / Invokable
- **Related entities**: 074 -- Pipeline verification quality uplift (epic), 085 -- Stage Report evidence + confidence gate (draft, depends-on: [082])
- **Created**: 2026-04-13T12:30:00Z

## Brainstorming Spec

**APPROACH**: Modify build-uat SKILL.md in two places: (1) Step 2b ("Run CLI item") gains a pre-execution hook that invokes `e2e-pipeline:e2e-flow` with `type: cli` via `Skill` tool to set up recording, then runs the command, then invokes `e2e-pipeline:e2e-test` to finalize the recording. The .cast file path is captured alongside stdout/stderr/exit-code. A `ToolSearch` probe at Step 0 determines whether e2e-pipeline is available — if not, skip recording and proceed with text-only evidence (current behavior). (2) Step 5 ("Write UAT Results") changes from path-reference evidence to inline evidence: browser items get markdown image syntax (`![screenshot](path)`), CLI items get fenced transcript blocks (` ```terminal ... ``` `) with the first/last 20 lines of the recording. A new `## E2E Evidence` section is appended after `## UAT Results` with a per-item artifact table (item ID, type, artifact path, inline preview).

**ALTERNATIVE**: Instead of modifying build-uat's Step 2b and Step 5, create a post-UAT "evidence enrichment" pass that reads UAT Results, fetches artifacts, and rewrites evidence inline as a separate step. -- D-01 Rejected: a post-hoc rewrite is fragile (must parse the Stage Report's evidence format, which varies per item type) and adds an extra processing pass. Inline evidence at write-time is simpler — the evidence is available in memory when Step 5 runs, so writing it inline costs nothing extra.

**GUARDRAILS**:
- e2e-pipeline availability is a graceful fallback, not a hard dependency — UAT must work without e2e-pipeline installed (text-only evidence is the baseline)
- Inline evidence must not bloat entity files beyond readability — cap transcript blocks at 20 lines with `[truncated]` marker; screenshots as relative path references (markdown image syntax), not base64 embedded
- Do not modify UAT pass/fail logic — evidence is presentational, not decisional. A CLI item passes on exit code 0 regardless of whether recording succeeded
- Entity 085 (confidence gate) depends on this entity's evidence format — ensure the inline format is machine-parseable for confidence scoring

**RATIONALE**: Inline evidence at write-time is correct because build-uat Step 5 already has the evidence data in memory (stdout, stderr, exit code, artifact paths). Writing it inline instead of as path references is a format change, not a logic change. The e2e-pipeline integration for CLI recordings follows the exact pattern that already exists for browser items (build-uat already invokes e2e-pipeline for `type: browser` items — extending to `type: cli` is a one-line change in the dispatch logic). The graceful fallback ensures UAT works in environments without e2e-pipeline, which is important for overhaul portability (new projects may not have e2e infrastructure).

## Acceptance Criteria

- [ ] Given a CLI UAT item, when build-uat Step 2b runs with e2e-pipeline available, then it produces a .cast recording file AND text evidence (how to verify: run a CLI UAT item, check for .cast file in artifacts alongside stdout capture)
- [ ] Given a completed UAT stage, when the entity file is read, then evidence is inline (markdown images for browser items, transcript blocks for CLI items) not just path references (how to verify: read entity file after UAT, see rendered evidence without opening external files)
- [ ] Given e2e-pipeline is not installed, when a CLI UAT item runs, then it falls back to text-only evidence with no error (how to verify: run UAT without e2e-pipeline, confirm graceful fallback)

## Assumptions

A-1: Step 2b (lines 80-82) is the CLI item execution block — currently 3 lines ("Run command, capture stdout/stderr/exit code, record evidence"). The e2e-pipeline recording hook inserts before the Bash command, and artifact collection inserts after. Step 2a (browser items, lines 66-78) already uses `Skill` tool with e2e-pipeline — the CLI extension follows the same dispatch pattern.
Confidence: Confident (0.90)
Evidence: build-uat SKILL.md:80-82 -- Step 2b. Lines 66-78 -- Step 2a browser items already invoke e2e-pipeline:e2e-flow and e2e-pipeline:e2e-test via Skill tool.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: e2e-pipeline availability detection uses `ToolSearch` probe at Step 0 (or Step 2 entry) — same pattern build-uat already uses for AskUserQuestion (line 21-23). If ToolSearch returns empty for e2e-pipeline skills, set a flag and skip recording throughout the session.
Confidence: Confident (0.85)
Evidence: build-uat SKILL.md:21-23 -- ToolSearch pattern for AskUserQuestion. Same probe pattern works for e2e-pipeline skill detection.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Step 5 evidence writing (line 94) currently writes provisional result rows. Inline evidence changes the output format from path references to markdown image syntax (browser) and fenced transcript blocks (CLI). The `## UAT Results` table shape at line 136 shows the current format — the evidence column needs to expand from one-line snippets to multi-line inline content.
Confidence: Likely (0.75)
Evidence: build-uat SKILL.md:94 -- "Do NOT append to ## UAT Results yet -- Step 5 does the canonical write." Line 136 -- `item-3 (cli) pass -- stdout matched "Created X"`. Line 220 -- Stage Report evidence shape: `item-2 (cli): stdout snippet`.
→ Confirmed: captain, 2026-04-13 (batch)

## Canonical References

(none cited)

## Stage Report: explore

- [x] Files mapped: 1 across config layer
  build-uat SKILL.md (sole insertion target -- Steps 2b and 5)
- [x] Assumptions formed: 3 (Confident: 2, Likely: 1)
  A-1 Step 2b insertion (0.90), A-2 e2e-pipeline detection (0.85), A-3 Step 5 inline format (0.75)
- [x] Options surfaced: 0
  All gray areas resolved to Track A with codebase precedent from Step 2a browser items
- [x] Questions generated: 0
  No open questions -- CLI recording follows established browser item pattern
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  1 primary file but changes span Steps 0, 2b, 5, and Stage Report format — multiple insertion points within one file

## Stage Report: clarify

- [x] Decomposition: not-applicable
- [x] Assumptions confirmed: 3 / 3 (0 corrected)
  A-1, A-2, A-3 all confirmed via batch
- [x] Options selected: 0 / 0
- [x] Questions answered: 0 / 0
- [x] Canonical refs added: 0
- [x] Context status: ready
  gate passed: all assumptions confirmed, ACs valid (3 criteria, no α markers)
- [x] Handoff mode: loose
- [x] Clarify duration: 1 question asked, session complete
  1 batch assumption presentation (plain text)

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 085 (Stage Report evidence + confidence gate): depends on this entity's evidence format
- `skills/build-uat/SKILL.md`: Steps 2b and 5 are the insertion targets
- `e2e-pipeline` skill: CLI flow recording capability
