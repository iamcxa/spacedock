# Explore Invocation Path Audit

Audit of every explore invocation path in the current FO/SO dispatch graph.
Classifies Agent-tool availability per path and documents Mode A/B operation.

Generated for entity 105 (Explore Nüwa-Alignment). Code changes are OUT OF SCOPE
for entity 105 -- downstream entity candidates are noted per path where applicable.

---

## Path 1 -- `/build` → build-brainstorm → build-explore (FO ensign-dispatched)

**Invocation entry point:** FO dispatches `spacedock:ensign` agent for the `explore`
stage. Ensign loads `spacedock:build-explore` skill via its skills array.

**Agent tool available:** NO. Per `agents/ensign.md` Dispatch Boundary section:
"Ensign is a single-skill, single-stage worker. It does NOT dispatch further subagents
(no Agent tool access)."

**Operational mode:** Mode B only -- ensign-mode inline fallback (Grep/Glob/Read
within current session). Angles (i)+(ii)+(iii) run inline; Angle (iv)
(negative-space seed verification) is skipped entirely.

**Warning emission:** SKILL.md Step 2 requires the following line verbatim in Stage Report
whenever Mode B runs:
```
⚠ ensign-mode inline fallback -- 4-angle quality not achieved this invocation
```

**Port 11 Mode A blocker payload:** NOT APPLICABLE -- Mode A is not reachable from
this path, so no `feedback-to: captain` halt can be triggered via the normal blocker
mechanism. Any Port 11 condition surfaced inline in Mode B falls back to a Track C
Open Question in the entity body rather than a structured blocker payload.

**Code changes needed:** Entity 105 ships skill contract only (OUT OF SCOPE for entity
105). The subagent-first directive (captain 2026-04-14, entity 102) requires every
stage except clarify to dispatch subagents. Enabling Mode A for this path requires
changes to the FO dispatch graph so ensign is replaced with an orchestrator that HAS
Agent tool access. Candidate downstream entity: Phase F flatten-dispatch work
(see MEMORY.md -- Flatten Dispatch -- Troops Architecture).

---

## Path 2 -- `/spacedock:science-officer` context_status routing → explore (SO-direct, main session)

**Invocation entry point:** Science Officer (SO) agent running in the captain's
`--agent` session. SO reads entity `context_status` field and routes to explore
when `context_status: pending` (or equivalent early-stage value).

**Agent tool available:** YES. SO IS the main session. Per SO-FO-DISPATCH-SPLIT.md:
"SO runs in the captain's `--agent` session. This means SO IS the main session and
has: Agent tool -- SO can dispatch researchers, code-explorers, brainstorm teams
directly."

**Operational mode:** Mode A default -- 4-angle parallel fanout via
`spacedock:code-explorer` subagents (all 4 angles including Angle iv negative-space).
For Small entities with well-known target files, Mode B may be preferred per
SKILL.md Step 2 mode-selection heuristic.

**Research dispatch (Step 5.5):** SO-direct mode dispatches `spacedock:researcher`
subagents via Agent tool for Likely/Unclear Track A assumptions with external tech
dependencies.

**Port 11 Mode A blocker payload:** APPLICABLE. When SO runs explore in Mode A and
a Port 11 condition is detected (e.g., inter-explorer contradiction that requires
captain resolution before continuing), the skill can emit a structured blocker with
`feedback-to: captain` and halt advance. This is the canonical path for Port 11
handling because SO has AskUserQuestion available to resolve the blocker interactively.

**Code changes needed:** None identified for this path. SO-direct Mode A is the
current correct behavior. Entity 105 (OUT OF SCOPE) -- no changes to SO path.

---

## Path 3 -- FO large-entity pre-dispatch: FO dispatches `spacedock:code-explorer` before invoking explore ensign

**Invocation entry point:** FO (first-officer) pre-dispatch step before handing off to
the explore ensign. FO reads entity scale and, for Large entities, dispatches
`spacedock:code-explorer` subagents directly (FO has Agent tool as an orchestrator
session). Results are written to the entity body (e.g., `## Research Findings` or
pre-populated mapping section) before the ensign is spawned.

**Agent tool available:** YES (for FO pre-dispatch). FO is an orchestrator session
and has Agent tool. The subsequently spawned ensign does NOT have Agent tool.

**Operational mode:** Hybrid -- FO runs Mode A code-explorer dispatch pre-flight;
ensign then reads pre-dispatched results and operates in a partial Mode A path (SKILL.md
Step 5.5 Mode B note: "Read results from entity body `## Research Findings` section
or from pre-populated research annotations"). This path approximates Mode A output
quality without ensign needing Agent access.

**Port 11 Mode A blocker payload:** PARTIAL. The pre-dispatched code-explorer results
are written to the entity body before ensign starts. If a contradiction is discovered
during the ensign's classification phase (Steps 3.7-5), the ensign can only surface it
as a Track C Open Question -- it cannot emit a `feedback-to: captain` structured
blocker directly because it lacks Agent tool. The FO is the correct handler for
Port 11 blockers in this path, but the current skill contract does not define a
structured mechanism for ensign-to-FO escalation short of failing the stage.

**Code changes needed:** OUT OF SCOPE for entity 105. Gap: no defined escalation path
from ensign to FO for Port 11 conditions surfaced during classification. Downstream
candidate: a future entity defining an ensign→FO feedback protocol for structural
blockers (related to Phase F flatten-dispatch work).

---

## Path 4 -- `/spacedock:uat-resume` + downstream explore re-entry paths

**Invocation entry point:** `spacedock:uat-resume` skill. UAT is a late-stage review
(post-execute) that may surface regressions requiring re-exploration.

**Agent tool available:** Context-dependent. Per SO-FO-DISPATCH-SPLIT.md ownership
table, UAT is FO-owned ("FO simple subagent + AskUserQuestion"). If the UAT ensign
identifies a regression requiring re-explore, it would need to signal FO, which can
then re-dispatch. FO has Agent tool; the UAT ensign does not.

**Operational mode:** If re-explore is triggered from UAT, the path would route back
through Path 1 (FO ensign-dispatched, Mode B) or Path 3 (FO pre-dispatch + ensign).
No Mode A path exists from a UAT ensign directly.

**Port 11 Mode A blocker payload:** NOT APPLICABLE in the UAT ensign context. FO is
the correct escalation owner for any `feedback-to: captain` need arising from
UAT-triggered re-explore.

**Code changes needed:** OUT OF SCOPE for entity 105. No evidence of a defined
uat-resume → re-explore protocol in the current skill surface. This path is
speculative/future-state.

---

## Path 5 -- Overhaul stage explore invocation

**Invocation entry point:** `spacedock:overhaul` skill, which handles version sync
and contract repair for existing entities. Overhaul may trigger a re-explore when
an entity's Brainstorming Spec drifts from the codebase after significant engine
changes.

**Agent tool available:** Overhaul is invoked by the captain or FO. If invoked in
an FO orchestrator context, Agent tool is available. If invoked inline by the captain's
session via `/spacedock:overhaul`, Agent tool is available (main session).

**Operational mode:** Depends on invocation context. Overhaul running in a main
session (SO or captain) would default to Mode A for Medium+ entities. Overhaul
running as an FO-dispatched ensign (single-skill subagent) would be Mode B.

**Port 11 Mode A blocker payload:** APPLICABLE when overhaul runs in a main session
with Agent tool. The `feedback-to: captain` halt mechanism is available. When overhaul
runs as an ensign subagent, the same Mode B limitations as Path 1 apply -- no structured
blocker, Track C Open Question fallback only.

**Code changes needed:** OUT OF SCOPE for entity 105. Overhaul's re-explore invocation
path is not explicitly documented in skill references. A future entity should define
whether overhaul's explore phase follows Path 1 or Path 2 semantics and whether
overhaul qualifies for the subagent-first directive.

---

## Summary Table

| Path | Entry Point | Agent Tool | Mode | Port 11 `feedback-to: captain` |
|------|-------------|------------|------|----------------------------------|
| 1 | FO → ensign → build-explore | NO | Mode B only | Not applicable -- Track C fallback only |
| 2 | SO-direct (main session) | YES | Mode A default | YES -- full blocker mechanism available |
| 3 | FO pre-dispatch + ensign | FO: YES / ensign: NO | Hybrid (partial Mode A) | Partial -- FO can handle; ensign cannot escalate directly |
| 4 | uat-resume re-entry | NO (UAT ensign) | Mode B (if triggered) | Not applicable -- FO escalation owner |
| 5 | Overhaul re-explore | Context-dependent | Mode A (main) or Mode B (ensign) | Context-dependent |

---

## Downstream Entity Candidates

The following gaps are documented here for plan ensign visibility. Code changes are
OUT OF SCOPE for entity 105.

1. **Path 1 / subagent-first directive compliance**: FO dispatch of explore ensign does
   not satisfy the 2026-04-14 subagent-first directive (captain, entity 102). An
   orchestrator-mode explore dispatch (giving the caller Agent tool) is needed for Path 1
   to reach Mode A. Candidate: Phase F flatten-dispatch refactor.

2. **Path 3 / ensign→FO Port 11 escalation protocol**: No defined mechanism for ensign
   to signal a structured `feedback-to: captain` blocker back to FO when Port 11
   conditions surface during ensign classification. Candidate: new entity defining
   ensign-to-FO structured feedback for explore-stage blockers.

3. **Path 4 / uat-resume re-explore definition**: No explicit protocol exists for
   UAT-triggered re-explore. Candidate: uat-resume skill extension or new entity.

4. **Path 5 / overhaul re-explore semantics**: Overhaul's explore phase lacks an
   explicit Mode A/B classification. Candidate: overhaul skill contract update.
