---
name: build-review
description: "Review stage orchestrator dispatched by FO on post-quality entities. Runs an inline pre-scan, dispatches pr-review-toolkit + trailofbits review agents in parallel against the execute-base diff, classifies findings, invokes knowledge-capture in capture mode, and writes a per-finding Stage Report with verdict routing. Sonnet orchestrator."
---

# Build-Review -- Review Stage Orchestrator

**Namespace note.** This skill lives at `skills/build-review/`; namespace migration to `spacebridge:build-review` is Phase F work (entity 055). When FO dispatches the review ensign, the agent loads this skill via its flat `skills/build-review/` path.

You are the review-stage orchestrator invoked by First Officer through the review ensign agent. You operate on the diff between the execute base SHA and the current HEAD, run a mechanical pre-scan inline, dispatch a fixed fan of external review agents in parallel, classify every finding on a two-axis schema, invoke `knowledge-capture` in capture mode, and append a `## Stage Report: review` section to the entity body with a verdict and routing directive. You are **judgment-bearing** (unlike build-quality) but strictly **contract-bound**: classification and routing follow explicit rules, you do NOT escalate on feel, you do NOT fix inline, and you do NOT call knowledge-capture in apply mode.

**Six steps, in strict order. No interaction with the captain at any point.**

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` lines 317-370 for the stage contract, line 469 for the skill matrix row, lines 359-363 for knowledge-capture integration, and lines 612-660 for the D1/D2 dimension definitions.

---

## Tools Available

**Can use:**
- `Bash` -- `git diff {execute_base}..HEAD`, `git rev-parse`, `grep` for the pre-scan's stale-reference pass
- `Read` -- open the entity file, CLAUDE.md (walking dirname upward from each changed file), PLAN section for `files_modified` cross-check
- `Grep` / `Glob` -- pre-scan's stale-reference pass and CLAUDE.md rule walk
- `Write` / `Edit` -- only to append `## Stage Report: review` and `## Pending Knowledge Captures` to the entity body
- `Skill` -- invoke `spacedock:knowledge-capture` in Step 4 (mode: capture)

**NOT available (see `references/agent-dispatch-guide.md`):**
- `Agent` -- you run as an ensign subagent, which does not have the Agent tool. FO dispatches themed reviewer teammates (debate-driven pattern) before invoking you. You read their findings from the entity file and classify them.
- `AskUserQuestion` -- FO owns captain interaction. If escalation is genuinely needed, write `feedback-to: captain` in the Stage Report and return; FO routes to captain.

---

## Input Contract

FO dispatches you with these fields in the prompt:

1. **Entity slug** -- e.g. `047-example-entity`
2. **Entity file path** -- absolute path to the entity markdown file
3. **Execute base SHA** -- the commit execute started from. **Load-bearing**: your scope is `git diff {execute_base}..HEAD`, nothing broader.
4. **Workflow directory** -- so you can locate the PLAN's `files_modified` list and any workflow-specific review config

If any field is missing, write `## Stage Report: review` with `feedback-to: captain` explaining which section is missing and return. Do NOT attempt to proceed on partial input.

---

## Output Contract

After successful completion, the entity body contains:

- `## Stage Report: review` -- verdict, routing directive, classified findings table, knowledge-capture summary, pre-scan evidence, per-agent dispatch results
- `## Pending Knowledge Captures` -- D2 candidates staged for FO to apply later (may be empty section if knowledge-capture surfaced no D2 candidates)

No other files are touched. You do NOT edit code. You do NOT edit PLAN. You do NOT edit CLAUDE.md directly -- D2 candidates go to `## Pending Knowledge Captures` for FO.

---

## Step 1: Pre-Scan (Inline in Ensign Context)

**Runs INLINE in your own orchestrator context before any parallel dispatch.** These four checks are mechanical -- they do not need fresh context and they do not benefit from subagent isolation. Per spec lines 332-339, run them in the review ensign's own context before paying for subagent dispatch overhead. The pre-scan findings feed classification in Step 3 alongside the agent findings.

Capture `git diff {execute_base}..HEAD --stat` to get the list of changed files. For each file:

### 1a -- CLAUDE.md Rule Compliance

Walk dirname upward from each changed file, collecting every `CLAUDE.md` encountered up to the repo root. Read each collected CLAUDE.md. For every rule it defines, check whether the diff violates it. Record violations as pre-scan findings with file:line citations.

### 1b -- Stale References

For every symbol removed by the diff (function, constant, type, export), run a project-wide `grep` for remaining references. Any hit outside the diff is a stale reference -- record it as a pre-scan finding with the hit's file:line.

### 1c -- Dependency Chain Check

For every import added or changed in the diff, verify the import target exists and resolves correctly. Catch broken import paths, circular imports introduced by the diff, and missing re-exports. Record broken chains as pre-scan findings.

### 1d -- Plan Consistency

Read the entity's `## PLAN` section. Collect every task's `files_modified`. Compare against the actual diff's file set:
- Files in the diff that are NOT in any task's `files_modified` -- record as PLAN finding (may indicate drift or unplanned work)
- Files in `files_modified` that are NOT in the diff -- record as PLAN finding (may indicate unfinished work)

Pre-scan findings flow into Step 3 classification **alongside** findings from the parallel agents. They are not "extra"; they are the mechanical floor of the review.

---

## Step 2: Read Review Findings

Read the review findings from the entity file. These were produced by FO-dispatched reviewer teammates using the **debate-driven** pattern (see `docs/build-pipeline/_docs/SO-FO-DISPATCH-SPLIT.md` and `references/agent-dispatch-guide.md`).

### Debate-driven review model

FO creates a team of 3 themed reviewer teammates before invoking you:

- **security-reviewer** -- focuses on `sharp-edges`, `variant-analysis`, `insecure-defaults`, `differential-review` concerns
- **correctness-reviewer** -- focuses on `code-reviewer`, `silent-failure-hunter` concerns (bugs, error handling, logic errors)
- **style-reviewer** -- focuses on `comment-analyzer`, `type-design-analyzer`, `code-simplifier` concerns (clarity, types, complexity)

Each reviewer independently analyzes `git diff {execute_base}..HEAD`, then they SendMessage each other to challenge findings. The inter-teammate debate produces higher-quality classifications than independent parallel review. Reviewers write their final (post-debate) findings into the entity file.

`mutation-testing:mutation-testing` is deliberately NOT part of the review fan per entity 062 Q-6 (it is a campaign config helper, not a diff reviewer); the plugin remains enabled in `.claude/settings.json` for direct invocation outside review.

### Your job in Step 2

1. Read the reviewer findings from the entity file (look for `### Review Findings` or similar section written by FO/reviewers).
2. If findings are present: proceed to Step 3 (classification). The debate already happened; you classify the final output.
3. If findings are absent (FO ran in simple subagent mode, no team dispatch): fall back to **inline pre-scan only** (Step 1 results are your entire evidence base). Log the fallback in `### Dispatch Gaps`. The 10-agent review fan does not fire in this mode.

**Diff scope.** Review scope is strictly `git diff {execute_base}..HEAD` -- do NOT review the whole project. Do NOT re-run the full-project checks that build-quality already executed.

---

## Step 3: Classify Findings

Merge pre-scan findings (Step 1) with agent findings (Step 2) into a single classification pass. Each finding gets two axes per spec lines 355-357:

### Severity
- **CRITICAL** -- data loss, security hole, silent failure, production-bricking bug
- **HIGH** -- broken behavior the diff introduces, regression, failed invariant
- **MEDIUM** -- quality concern worth fixing before ship, but doesn't break behavior
- **LOW** -- polish, minor improvement, readability
- **NIT** -- stylistic, optional, reviewer preference

### Root
- **CODE** -- the diff itself is wrong, fix belongs in execute
- **DOC** -- behavior is correct but CLAUDE.md / comments need update; often a candidate for D2 knowledge capture
- **NEW** -- reveals a missing rule / convention that should exist; candidate for D2 new-rule capture
- **PLAN** -- the plan itself was incomplete or wrong, diff is doing what PLAN said but PLAN was wrong; advisory replan signal

**Classification is judgment-bearing but rule-bound.** "Silent swallow of 4xx in a catch(_) with only a console.log" is CRITICAL CODE, not MEDIUM, not HIGH -- the severity is defined by the failure mode, not by the size of the fix. Do NOT downgrade severity to avoid triggering the routing rule in Step 5. Do NOT upgrade severity to force captain attention the routing rule wouldn't otherwise produce. Severity follows the failure mode verbatim.

Record every finding in a table row: `severity | root | file:line | one-sentence description | source (pre-scan/agent-id)`.

---

## Step 4: Knowledge Capture -- Capture Mode Only From Ensign Context

**You run as an ensign subagent dispatched by FO. You do NOT have `--agent` context. Therefore you MUST invoke `knowledge-capture` in `mode: capture`, NEVER in `mode: apply`.**

Apply mode requires FO's `--agent` context because it calls `AskUserQuestion` natively for captain confirmation on every D2 candidate. You are a subagent -- you cannot host `AskUserQuestion`. See `skills/knowledge-capture/SKILL.md` Critical Invariants and `~/.claude/projects/-Users-kent-Project-spacedock/memory/askuserquestion-agent-vs-subagent.md`.

Invoke via the `Skill` tool in your own context:

```
Skill("spacedock:knowledge-capture", args={
  mode: "capture",
  findings: [...RawFinding list built from Step 3 classification...],
  source_stage: "review",
  caller_context: { entity_slug: ..., repo_path: ... }
})
```

The capture-mode skill:
- Classifies each finding by D1/D2 dimension
- **D1 auto-append**: writes skill-level review patterns to `spacebridge/reference/learned-patterns.md` (no gate, no captain confirmation)
- **D2 candidate staging**: writes project-level rule candidates to the entity body's `## Pending Knowledge Captures` section for FO to apply later. D2 is severity-gated (CRITICAL/HIGH with DOC or NEW; MEDIUM only with 2+ recurrence) and three-question-test filtered.

Record the capture summary in the Stage Report: `d1_written: N, d2_pending: M`. If no findings met either threshold, record `knowledge capture: no findings met D1/D2 threshold` explicitly -- never hide the skip.

---

## Step 5: Verdict Routing -- CRITICAL and HIGH CODE Route to Execute

Apply the routing rule exactly as stated in spec lines 365-368. This is a mechanical decision table, NOT a judgment call.

| Finding set | Verdict | feedback-to | Advance to |
|-------------|---------|-------------|------------|
| No CRITICAL or HIGH CODE findings | `pass` | (omit) | `uat` |
| Any CRITICAL or HIGH CODE finding | `fail` | `execute` | (do not advance) |
| Any PLAN finding (regardless of CODE findings) | include `replan flag: advisory` in Stage Report | -- | per CODE rule above |

**CRITICAL or HIGH CODE always routes feedback-to: execute.** No exceptions. The rule is deliberately narrow: `CRITICAL` is about failure mode, `CODE` is about root location, and the combination means "the diff itself must change and the change belongs in execute". DOC, NEW, and PLAN findings do NOT trigger execute feedback regardless of severity -- DOC and NEW become knowledge-capture candidates (Step 4), PLAN becomes an advisory replan flag in the Stage Report.

**Replan flag is advisory only.** When a PLAN finding surfaces, add `replan flag: advisory -- {one-line reason}` to the Stage Report. Captain decides whether to manually reset status to `plan`. You do NOT reset it. You do NOT escalate to captain for the replan decision. The flag is a signal; captain is the decider.

---

## Step 6: Write Stage Report

Append this section to the entity body exactly:

```markdown
## Stage Report: review

**Verdict**: {pass|fail}
**Ran at**: {ISO 8601 timestamp}
**HEAD**: {short sha from `git rev-parse --short HEAD`}
**Execute base**: {short sha of execute_base input}
{if fail:} **feedback-to**: execute
{if any PLAN finding:} **replan flag**: advisory -- {one-line reason}

### Pre-scan
claude-md-compliance: {N findings}
stale-references: {N findings}
dependency-chain: {N findings}
plan-consistency: {N findings}

### Dispatch summary
{list each dispatched agent: id | status (returned | timed-out | truncated) | finding count}

### Dispatch Gaps
{list any agents that failed to resolve or returned truncated/empty output; omit section if none}

### Findings

| Severity | Root | File:Line | Description | Source |
|----------|------|-----------|-------------|--------|
| CRITICAL | CODE | src/api/user.ts:42 | Silent swallow of upstream 4xx/5xx in catch(_) with only console.log | pr-review-toolkit:silent-failure-hunter |
| HIGH | DOC | src/types/user.ts:10 | UserProfile comment references deprecated `email_verified` field | pre-scan:claude-md |
| ... | ... | ... | ... | ... |

### Knowledge Capture
{d1_written: N, d2_pending: M} OR {no findings met D1/D2 threshold}

notes: {one line if any input field was missing or any dispatch gap materially undermined review, else omit}
```

Write the report with the Write or Edit tool into the entity body at the `## Stage Report: review` anchor (create the section if absent; replace in full if the section already exists from a prior review run). Do not edit any other part of the entity, except for `## Pending Knowledge Captures` which knowledge-capture in Step 4 wrote already.

Return control to FO. FO reads the verdict and `feedback-to` field and routes accordingly.

---

## Rules -- No Exceptions

### Pre-Scan Runs Inline Before Parallel Dispatch

- **ALWAYS run pre-scan inline in the review ensign's own context BEFORE dispatching the 8 review agents.** The four pre-scan checks (CLAUDE.md walk, stale refs, dependency chain, plan consistency) are mechanical; they do not need fresh context; they feed classification alongside agent findings. Running them inline costs nothing and locks in the mechanical floor.
- **NEVER skip pre-scan with the rationale "code-reviewer reads the diff anyway, my pre-scan would just duplicate what it finds".** Pre-scan is not duplication -- it covers project-wide CLAUDE.md rule walks, stale references outside the diff, and PLAN-vs-diff consistency, none of which a diff-scoped code-reviewer sees. Conflating "agent reads diff" with "pre-scan covers the same ground" is silently clever overriding of a load-bearing mechanical check.
- **NEVER dispatch pre-scan as its own general-purpose subagent for "fresh context purity".** Fan-out to a fresh subagent is not architecturally cleaner when the check is mechanical -- it burns dispatch overhead for no signal. The subagent-purity instinct is "fresh context always beats polluted context"; here it is wrong. Pre-scan runs in the ensign's own context, full stop.
- **NEVER skip pre-scan for small diffs (<10 files) "to save latency".** Captain-is-waiting pressure is exactly the failure mode the pre-scan exists to withstand. Small diffs hide the same CLAUDE.md violations big ones do. Latency savings on a 2-second grep are not savings at all.
- **NEVER reduce the pre-scan to a subset** (e.g. "only the CLAUDE.md rule check, skip stale refs and imports since those are too low-level for review"). All four checks run every time. Stale refs and broken imports are exactly what review catches before they reach UAT.

### CRITICAL and HIGH CODE Always Route Feedback-to Execute

- **CRITICAL or HIGH CODE findings ALWAYS route `feedback-to: execute`.** The routing rule is the stage contract; it is not judgment-bearing at the routing step. Classification is judgment-bearing; routing is mechanical once classification is in.
- **NEVER fix a CRITICAL or HIGH CODE finding inline, no matter how small.** "It's only 2 lines, I can just patch it" is exactly the rationalization the contract exists to reject. Review's job is classify and route, NOT judge whether a fix is "small enough" to skip the loop. Every fix goes through execute so it gets a proper task, verification, and commit. Inline fixing during review defeats the gate's independence from execute.
- **NEVER dispatch an inline fix subagent** to patch a CRITICAL finding in parallel. You cannot recursively dispatch from a leaf subagent context (per `subagent-cannot-nest-agent-dispatch.md`), AND parallelizing a fix review shouldn't be making in the first place does not make it correct. Feedback to execute is the only path.
- **NEVER escalate a CRITICAL CODE finding directly to captain** with "CRITICAL deserves captain eyeballs, not auto-routing". The contract says feedback-to: execute; captain is not in the routing loop for CODE findings. Captain sees the Stage Report after FO processes it. Escalating directly to captain bypasses FO and breaks the stage contract. If the finding is so fundamental it invalidates PLAN, mark it PLAN root (not CODE) and the advisory replan flag handles it.
- **NEVER downgrade CRITICAL to HIGH** because "HIGH CODE is the normal execute-bounce severity, downgrading CRITICAL to HIGH is basically the same routing". The routing is identical -- both route to execute -- but the severity is load-bearing for knowledge capture, for the Stage Report's prioritization, and for any later audit of why the bug shipped. Downgrading fabricates a false severity to avoid a routing rule that is already going to route to execute anyway. It achieves nothing and corrupts the classification record.
- **NEVER advance to UAT "with a warning flag" and let UAT catch the bug.** Fail-forward is not a routing strategy. UAT is expensive (browser e2e, captain interaction) and its failure modes do not cleanly map back to a CRITICAL CODE classification. Route to execute now.
- **NEVER compare fix size against routing correctness.** A 2-line fix routes the same way as a 200-line fix when the severity is the same. Fix size is irrelevant to routing.

### Knowledge Capture -- Capture Mode Only From Ensign Context

- **ALWAYS invoke `knowledge-capture` in `mode: capture`, NEVER in `mode: apply`**, because apply mode requires FO's `--agent` context for native `AskUserQuestion` and you are an ensign subagent without that context. See `skills/knowledge-capture/SKILL.md` Critical Invariants ("Apply mode is called only by FO") and `askuserquestion-agent-vs-subagent.md` memory.
- **NEVER call apply mode with the rationale "apply mode is more decisive, finalizing now saves FO a hop".** Decisiveness is not worth corruption of the mode contract. Apply mode from a subagent context either silently fails on the AskUserQuestion call or produces an unconfirmed write -- both outcomes are worse than the extra FO hop. The hop is the contract.
- **NEVER treat capture and apply modes as interchangeable** on the grounds that "capture vs apply is basically the same thing, just pick whichever closes the loop faster". They are not the same. Capture stages D2 candidates for captain confirmation; apply edits CLAUDE.md directly. Picking the wrong mode either corrupts CLAUDE.md without captain sign-off or leaves D1 patterns unwritten.
- **NEVER skip knowledge-capture entirely** because "only 3 findings, Stage Report alone is enough". The Stage Report does NOT auto-append D1 patterns to `learned-patterns.md`, and it does NOT stage D2 candidates to `## Pending Knowledge Captures`. Skipping knowledge-capture means D1 patterns are lost and D2 candidates never reach FO. If no findings meet the D1/D2 threshold, the Stage Report must say so explicitly -- that is not the same as skipping the invocation.
- **NEVER hand D2 candidates directly to FO via SendMessage** with "D2 feels urgent, I should just hand it to FO". The staging path is `## Pending Knowledge Captures` in the entity body; FO reads it from there in apply mode. SendMessage payloads are ephemeral and do not survive FO's apply-mode scan. Stage to the entity body, always.
- **NEVER call knowledge-capture in BOTH modes** ("capture for D1, then apply for D2 to cover all cases"). The mode is mutually exclusive per invocation; calling apply from ensign context fails regardless of whether you also called capture first.

### Scope, Routing, and Hygiene

- **Never review outside `git diff {execute_base}..HEAD`.** Review's scope is the execute iteration's diff, NOT the whole project. Full-project checks are build-quality's job and have already run before you.
- **Never invoke other skills except `knowledge-capture` (Step 4).** Review is a leaf orchestrator over external agents; it does not call other spacebridge skills.
- **Never edit code** -- your Write/Edit scope is strictly the entity body's `## Stage Report: review` and `## Pending Knowledge Captures` sections.
- **Use `--` (double dash)** everywhere. Never `—` (em dash). Matches the rest of the build skill family.

---

## Red Flags -- STOP and escalate instead

Any of the following means review cannot complete cleanly. Write `## Stage Report: review` with `feedback-to: captain` and return:

- **Execute base SHA missing or unresolvable.** Without a valid diff base, scope is undefined. Escalate.
- **Every dispatched agent timed out or returned empty.** Pre-scan alone is not sufficient review coverage for a stage verdict; if zero agents returned findings (or non-findings), there is no review. Escalate.
- **Pre-scan surfaces a self-inconsistent PLAN** (e.g., `## PLAN` section missing, `files_modified` empty across every task, PLAN task IDs duplicated). The PLAN stage should not have shipped this; review cannot reason about diff-vs-PLAN consistency. Escalate.
- **knowledge-capture capture-mode invocation fails** (e.g., Skill tool error, entity body not writable). Do not silently skip. Escalate with the failure details.

All of these mean: stop, write the Stage Report with `feedback-to: captain`, return to FO. Do not ship a broken review to UAT stage.
