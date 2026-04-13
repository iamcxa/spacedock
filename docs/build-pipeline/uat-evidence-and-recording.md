---
id: 082
title: "UAT evidence and recording -- CLI e2e recording + inline evidence writing"
status: draft
context_status: pending
source: decomposition of entity 074 (pipeline verification quality uplift)
started:
completed:
verdict:
score: 0.0
worktree:
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

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 085 (Stage Report evidence + confidence gate): depends on this entity's evidence format
- `skills/build-uat/SKILL.md`: Steps 2b and 5 are the insertion targets
- `e2e-pipeline` skill: CLI flow recording capability
