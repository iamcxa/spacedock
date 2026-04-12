# SO/FO Dispatch Split

Workflow-specific dispatch ownership for the build pipeline. Defines which stages the Science Officer (SO) owns vs the First Officer (FO), and how they coordinate.

For universal tool surface constraints and dispatch pattern definitions, see `references/agent-dispatch-guide.md`.

---

## Ownership Boundary

```
                    +-- draft ---------- Manual (captain)
                    |
 SO-owned ----------+-- brainstorm ----- SO-direct (has Agent tool)
 (captain --agent   +-- explore -------- SO-direct (has Agent tool)
  session)          +-- clarify -------- SO captain-interactive (AskUserQuestion)
                    |
                    |  === handoff: context_status: ready ===
                    |
 FO-owned ----------+-- plan ----------- FO task-list-driven
 (orchestrator      +-- execute -------- FO task-list-driven
  session)          +-- quality -------- FO simple subagent
                    +-- review --------- FO debate-driven
                    +-- uat ------------ FO simple subagent + AskUserQuestion
                    +-- shipped -------- Mod-driven
```

**Handoff point:** When SO completes clarify and sets `context_status: ready`, FO takes over starting from plan. The entity's `status` field is the coordination signal -- SO advances through brainstorm/explore/clarify, FO advances from plan onward.

---

## Why SO Owns Early Stages

SO runs in the captain's `--agent` session. This means SO IS the main session and has:

- **Agent tool** -- SO can dispatch researchers, code-explorers, brainstorm teams directly. No two-phase pattern needed.
- **AskUserQuestion** -- SO can dialogue with captain natively. Essential for clarify, useful for brainstorm.
- **Full tool surface** -- everything the main session has.

FO also runs as a main session, but FO's strength is structured orchestration (state management, team creation, task list tracking, stage transitions). SO's strength is interactive research and captain dialogue.

**Division of labor:** SO helps captain think + gathers context. FO helps captain execute + tracks progress.

---

## SO Stage Details

### brainstorm (SO-owned)

```
SO reads entity spec
  -> executability assessment (5 criteria)

5/5 + Small:
  SO recommends express, asks captain to confirm
  
<=4/5 or Large:
  SO dispatches brainstorm team (SO has Agent tool):
    Agent("general-purpose", prompt="UX perspective on {spec}...")
    Agent("general-purpose", prompt="Architecture perspective on {spec}...")
    Agent("general-purpose", prompt="Devil's advocate on {spec}...")
  -> SO synthesizes findings, discusses with captain
  -> SO writes Brainstorming Spec to entity body
```

**Small/Medium entities:** SO can skip the brainstorm team and do inline assessment. The team dispatch is an upgrade path for complex specs.

### explore (SO-owned)

```
SO reads entity body (has Brainstorming Spec)

Small/Medium:
  SO inline grep/Read/store (current default behavior)
  
Large (>15 files):
  SO dispatches code-explorers (SO has Agent tool):
    Agent("spacedock:code-explorer", prompt="Map domain layer for {spec}...")
    Agent("spacedock:code-explorer", prompt="Map frontend layer for {spec}...")
  -> SO reads explorer results
  -> SO does Steps 3-7: classification, question generation
  -> SO writes Assumptions / Option Comparisons / Open Questions to entity body
  -> context_status: pending -> awaiting-clarify
```

### clarify (SO-owned, unchanged from current design)

```
SO runs AskUserQuestion loop with captain
  -> resolve Open Questions
  -> confirm Assumptions  
  -> select Options
  -> populate Canonical References
  -> context_status: awaiting-clarify -> ready
  -> SO hands off to FO
```

---

## FO Stage Details

### plan (FO-owned, task-list-driven)

```
FO reads entity body (context_status: ready, full clarify output)
FO extracts N research topics from entity body (cap 5)

FO creates team + tasks:
  Task 1..N: research topics (unblocked, self-claimable)
  Task N+1:  "Synthesize PLAN" (depends on 1..N)
  Task N+2:  "Run plan-checker" (depends on N+1)

FO spawns M researcher teammates (M <= N, typically 3)
  + 1 planner teammate (claims synthesis task when unblocked)

Researchers self-claim research tasks
  -> each writes findings to entity file subsections
  -> can SendMessage each other if they find overlapping context

Synthesis task auto-unblocks
  -> planner reads entity file, writes ## PLAN / ## UAT Spec / ## Validation Map

Plan-checker task auto-unblocks
  -> planner or FO runs plan-checker inline

FO calls workflow-index append at plan approval
```

### execute (FO-owned, task-list-driven)

```
FO reads ## PLAN, builds wave graph

FO transitions CONTRACTS.md rows: planned -> in-flight

FO creates team + tasks from PLAN:
  Wave 1 tasks: no dependencies
  Wave 2 tasks: depend on wave 1
  Wave 3 tasks: depend on wave 2
  Final task:   "Write Stage Report" (depends on all waves)

FO spawns T task-executor teammates (T = wave size or fewer)
Task-executors self-claim per wave
  -> each writes files + commits on worktree branch
  -> SendMessage if cross-file issues discovered

Stage Report task auto-unblocks
  -> synthesis teammate reads commits, writes ## Stage Report: execute
```

### quality (FO-owned, simple subagent)

```
FO dispatches ensign (simple subagent, no team needed)
  -> ensign runs bun test / bun lint / tsc --noEmit / bun build
  -> Step 6.5 diff-scope classification for pre-existing vs entity-scope failures
  -> writes ## Stage Report: quality
  -> PASS -> FO advances to review
  -> entity-scope FAIL -> feedback-to: execute (max 3 rounds)
```

### review (FO-owned, debate-driven)

```
FO creates team with themed reviewers:
  "security-reviewer":    sharp-edges + variant-analysis focus
  "correctness-reviewer": code-reviewer + silent-failure-hunter focus
  "style-reviewer":       comment-analyzer + type-design-analyzer focus

Each reviewer independently reads git diff {execute_base}..HEAD
  -> writes findings to entity file

Reviewers SendMessage to debate:
  security:    "line 42 bypasses Write hook via python3 -- security concern?"
  correctness: "Write hook is environment-specific, not a code bug"
  security:    "fair, downgrading to MEDIUM"

FO reads debate + findings
  -> classifies: severity (CRITICAL/HIGH/MEDIUM/LOW/NIT) x root (CODE/DOC/NEW/PLAN)
  -> writes ## Stage Report: review
  -> no CRITICAL/HIGH CODE -> advance to uat
  -> CRITICAL/HIGH CODE -> feedback-to: execute
```

### uat (FO-owned, simple subagent + captain interaction)

```
FO dispatches ensign (simple subagent)
  -> ensign runs automated e2e tests (browser/cli/api items)
  -> ensign flags interactive items for FO

FO runs AskUserQuestion for each interactive item (one at a time)
  -> captain signs off or requests changes

  -> all pass -> advance to shipped
  -> infra fail -> feedback-to: execute
  -> assertion fail -> captain review
```

### shipped (mod-driven, terminal)

```
Merge hook: draft PR summary, captain approval, git push, gh pr create
Idle hook:  poll PR state (merged -> archive, changes_requested -> reset)
Startup hook: same PR-state checks (defense in depth)
Fallback: captain manually creates PR
```

---

## Concurrent Operation

Captain can run SO and FO simultaneously:

```
Terminal 1 (SO): working on entity 063 brainstorm/explore/clarify
Terminal 2 (FO): working on entity 062 plan/execute/quality/review/uat

SO completes 063 clarify -> context_status: ready
FO picks up 063 for plan stage (next idle cycle)
```

**Coordination signal:** entity `status` field on main branch. SO advances through early stages, FO advances through later stages. No overlap on the same entity because the handoff is sequential (clarify must complete before plan starts).

**FO as advisor during SO stages:** FO monitors entity state and can suggest (via dashboard comments or captain relay):
- "Entity 063 scale looks Large based on explore file count -- recommend SO use code-explorer dispatch"
- "Entity 064 has cross-domain scope -- flag for architecture review at plan gate"

FO does NOT advance entity state during SO-owned stages. Suggestions only.

---

## Migration Notes

### Skills that need updating for this split

| Skill | Current assumption | Correct behavior |
|---|---|---|
| `build-plan` Step 2 | "You dispatch researchers" | "FO dispatched researchers before you. Read ## Research Findings from entity file." |
| `build-execute` Step 4 | "You dispatch task-executors" | "FO dispatched task-executors per wave. Read commits + write Stage Report." |
| `build-review` Step 2 | "You dispatch 10 review agents" | "FO dispatched themed reviewers who debated. Read findings + classify." |
| `build-explore` Step 2 | "You dispatch code-explorer" | When SO-owned: "SO dispatches code-explorer, you read results." When FO-owned (fallback): "FO dispatches, you read results." |

### What stays the same

- build-quality: ensign inline, no dispatch needed (unchanged)
- build-uat: ensign automated + FO AskUserQuestion relay (unchanged)
- build-clarify: SO captain-interactive (unchanged)
- build-brainstorm: SO inline or SO-dispatched team (already SO-owned)
- knowledge-capture: invoked via Skill tool by FO at completion (unchanged)
- workflow-index: invoked via Skill tool by FO/ensign at stage boundaries (unchanged)
