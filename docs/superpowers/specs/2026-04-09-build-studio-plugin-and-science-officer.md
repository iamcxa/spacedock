# Spacebridge Plugin & Science Officer — Design Spec

## Status: Draft

**Date**: 2026-04-09
**Author**: Kent + Claude (brainstorming session)
**Scope**: New plugin split, new role, three new skills, entity lifecycle redesign

---

## §1 — Overview & Motivation

### Pain Points

1. **Context gap after `/build`**: Current brainstorm produces a spec, but by the time FO dispatches explore + plan, critical context is missing — no structured questions surfaced, no assumptions validated, no captain intent verified against codebase reality.

2. **FO wears too many hats**: First Officer currently handles dispatch, execution, gate review, AND brainstorm triage (inline executability assessment, A/B/C path routing). Mixing planning with execution dilutes both.

3. **Engine–UI coupling**: Dashboard, build skill, pipeline runtime, and workflow definition all live in one plugin. Changing the dashboard UX requires touching the same repo that owns the state machine. This prevents independent evolution.

### Three Solutions (This Spec)

1. **Three-stage context collection** — `build-brainstorm` → `build-explore` → `build-clarify` form a progressive pipeline that takes a raw directive and produces a fully-resolved, codebase-grounded entity ready for planning.

2. **Science Officer role** — A new agent+skill that owns the "planning & clarification" concern. FO focuses purely on dispatch & execution. Captain gains a dedicated advisor.

3. **Plugin split** — Engine (spacedock) provides execution primitives. UI (spacebridge) provides capture, refinement, monitoring, and the Science Officer. Two complementary plugins, independently installable.

### Non-Goals

- Do NOT change stages after `plan` (execute, quality, pr-draft, pr-review, shipped remain as-is)
- Do NOT rewrite ensign agent runtime
- Do NOT change the workflow definition protocol (README frontmatter, `commissioned-by`, stage YAML)
- Do NOT migrate Tier 2/3 stages to skills (plan, quality, research, seeding, docs, pr-draft, shipped stay in README)
- Do NOT design the dashboard UI for `context_status` (separate spec)

---

## §2 — Plugin Architecture Split

### Boundary Definition

```
spacedock (engine plugin)              spacebridge (UI plugin)
─────────────────────────              ──────────────────────────
first-officer (agent+skill)            science-officer (agent+skill)
ensign (agent+skill)                   /build (or /launch, /fire)
commission / refit                     build-brainstorm (skill)
Pipeline runtime:                      build-explore (skill)
  - worktree management                build-clarify (skill)
  - state machine (status)             dashboard (server + UI)
  - git remote protocol                forge fixtures (per skill)
  - status scripts
  - effective_stages()
Workflow discovery protocol
Stage dispatch runtime
```

### Dependency Direction

```
spacebridge ──depends on──▶ spacedock
spacedock ──does NOT depend on──▶ spacebridge
```

Spacebridge invokes engine primitives (FO dispatch, ensign, worktree). Engine never calls spacebridge directly. Engine CAN optionally load spacebridge-provided stage skills via `skill:` field in workflow README (see §9).

### Installation Scenarios

| Setup | Experience |
|-------|-----------|
| Engine only | Captain writes entity files manually, invokes FO via CLI. Full pipeline works. No dashboard, no Science Officer, no `/build` skill. Text-based gates. |
| Engine + Spacebridge | Full experience: `/build` → Science Officer clarify → FO dispatch → dashboard monitoring. |
| Spacebridge only | Non-functional. Spacebridge requires engine's FO/ensign/workflow runtime. |

### Communication Contract

Two plugins share state through three channels only:

1. **Workflow directory** — Entity `.md` files with YAML frontmatter. Both plugins read; engine writes state transitions, spacebridge writes content sections.
2. **Git repository** — Commits are the transaction log. Both plugins commit with role-prefixed messages (`dispatch:`, `seed:`, `clarify:`, `merge:`).
3. **Events bus** (optional) — Engine emits state-change events; dashboard subscribes for real-time updates. If dashboard is absent, events are no-ops.

No shared in-memory state. No RPC. No shared SQLite (dashboard's SQLite is spacebridge-internal).

---

## §3 — Role Taxonomy & Control Flow

### Bridge Hierarchy

```
Captain (human)
  │
  ├── Science Officer (spacebridge) — advises, clarifies, plans
  │     "Captain, sensors indicate 3 unresolved gray areas."
  │
  ├── First Officer (spacedock engine) — dispatches, executes, merges
  │     "All hands, commence stage execute on entity 046."
  │
  └── Ensign (spacedock engine) — does stage work
        "Stage report filed, sir."
```

### Responsibility Matrix

| Action | Captain | Science Officer | First Officer | Ensign |
|--------|---------|----------------|---------------|--------|
| Capture directive | ✅ writes | — | — | — |
| Brainstorm spec | — | — (`/build` runs build-brainstorm) | — | — |
| Explore codebase | — | — | dispatches | ✅ runs build-explore |
| Surface questions | — | — | — | ✅ writes to entity |
| Clarify with captain | answers | ✅ runs build-clarify | — | — |
| Decide "execute" | ✅ approves | presents recommendation | — | — |
| Dispatch stages | — | — | ✅ owns | — |
| Do stage work | — | — | — | ✅ owns |
| Approve gates | ✅ approves | — | presents | — |
| Merge to main | — | — | ✅ owns | — |

### Science Officer Invocation (Three Modes)

1. **Direct command**: Captain types `/science 046` or `/analyze 046` → loads `build-clarify` for that entity.
2. **Auto-invoke**: Claude detects entity in `awaiting-clarify` state during conversation → suggests invoking Science Officer.
3. **Agent profile**: Captain loads Science Officer as persistent persona (`spacedock:science-officer` agent). Claude adopts the Science Officer's personality and proactively manages clarification workflow.

### Handoff: Science Officer → First Officer (Hybrid Mode)

**Default (loose coupling)**:
```
Science Officer completes clarify
  → writes clarify results to entity body
  → updates context_status: ready
  → presents summary to captain:
      "Entity 046 context is complete. 4 decisions locked, 2 options selected,
       3 questions resolved. Ready to hand off to First Officer.
       Say 'execute 046' to proceed."
  → WAITS for captain's explicit command
Captain says "execute 046"
  → Science Officer updates status: clarify → plan (git commit: clarify: 046 — context ready)
  → FO picks up on next tick
```

**Flag override (tight coupling)**:
```
Captain says "auto-execute after clarify" (during clarify session)
  → Science Officer records flag in entity frontmatter: auto_advance: true
  → On clarify completion, skips wait, directly updates status: clarify → plan
  → FO picks up automatically
```

Captain can set this flag per-entity or globally via spacebridge config.

---

## §4 — Entity Lifecycle

### State Machine

Two orthogonal dimensions:

- `status` — pipeline stage position (owned by engine's FO at dispatch/merge boundaries)
- `context_status` — context maturity (written by build-explore ensign + Science Officer; committed by FO at dispatch boundaries or Science Officer at clarify boundaries)

```
status flow:
  draft → explore → clarify → plan → execute → quality → ... → shipped

context_status flow (within draft/explore/clarify):
  pending → exploring → awaiting-clarify → ready
```

After `context_status: ready`, the field becomes inert — downstream stages don't check it.

### Transition Table

| From | To | Trigger | Who | Commit message |
|------|----|---------|-----|----------------|
| (none) | `draft` + `pending` | `/build "directive"` | spacebridge `/build` skill | `seed: {slug} — {title}` |
| `draft`+`pending` | `explore`+`exploring` | Captain: "FO explore 046" | FO dispatch | `dispatch: {slug} entering explore` |
| `explore`+`exploring` | `explore`+`awaiting-clarify` | Ensign completes explore | FO reads report, updates | `explore: {slug} — questions surfaced` |
| `explore`+`awaiting-clarify` | `clarify`+`awaiting-clarify` | Captain: "/science 046" | Science Officer | `clarify: {slug} — session started` |
| `clarify`+`awaiting-clarify` | `clarify`+`ready` | All questions resolved | Science Officer gate | (no separate commit — included in next) |
| `clarify`+`ready` | `plan` | Captain: "execute 046" OR auto_advance flag | Science Officer writes status | `clarify: {slug} — context ready` |
| `plan` → ... → `shipped` | (existing pipeline) | FO dispatch as today | FO | (existing commit format) |
| `clarify`+`awaiting-clarify` | `epic` | Captain approves decomposition | Science Officer | `decompose: {slug} → [{child1}, {child2}, ...]` |
| `epic` (all children shipped) | `shipped` | FO detects all children shipped | FO | `merge: {slug} — epic complete` |

### Epic / Decomposition Lifecycle

When `build-clarify` detects a `## Decomposition Recommendation` section (written by explore):

1. **Science Officer presents decomposition FIRST** (before assumption batch):
   - Shows suggested child entities with titles, scope, and dependencies
   - Captain approves, modifies, or rejects the split

2. **If approved**, Science Officer:
   - Creates child entity files via `/build` (each gets its own `build-brainstorm` pass)
   - Sets `parent: {original-slug}` in each child's frontmatter
   - Updates original entity: `status: epic`, `children: [child1, child2, ...]`
   - Commit: `decompose: {slug} → [child1, child2, ...]`
   - Each child enters `draft`+`pending` independently

3. **If rejected**, Science Officer:
   - Removes `## Decomposition Recommendation` section
   - Proceeds with normal clarify flow (single large entity)

4. **Epic entity behavior**:
   - `status: epic` — FO skips it (same as `manual: true`)
   - Does NOT flow through pipeline stages
   - Body preserves original Directive, Brainstorming Spec, and explore report as context
   - FO periodically checks: when all children reach `shipped` → epic auto-completes

### Park & Resume

- **Draft park**: Entity sits in `draft`+`pending` indefinitely. No timeout. No cleanup.
- **Explore park**: Entity sits in `explore`+`awaiting-clarify` after ensign finishes. Captain hasn't started clarify. Can sit indefinitely.
- **Clarify park**: Mid-clarify session interrupted (context pressure, captain walks away). Entity body already contains partial answers from AskUserQuestion. Next `/science 046` resumes from where answers exist — no checkpoint file needed, entity body IS the checkpoint.
- **Resume protocol**: Science Officer reads entity body, counts which Open Questions have `→ Answer:` annotations vs which are still blank, resumes from first unanswered.

### Batch Operations

Captain can `/build A`, `/build B`, `/build C` in rapid succession. All three park in `draft`+`pending`. Later:
- "FO explore all pending drafts" → FO dispatches explore ensigns in parallel (one per entity)
- After all complete, captain sees 3 entities in `awaiting-clarify`
- `/science 046` → clarify one at a time, or `/science --batch` → sequential clarify of all awaiting entities

---

## §5 — Draft Entity Shape

### Frontmatter Schema

```yaml
---
id: {int}                    # sequential, scanned from existing + _archive/
title: {string}              # human-readable, from directive
status: draft                # pipeline stage (engine-owned after dispatch)
context_status: pending      # pending | exploring | awaiting-clarify | ready
source: /build               # entry point that created this entity
created: {ISO 8601}          # entity creation timestamp
started:                     # first move beyond draft (FO writes)
completed:                   # terminal stage reached (FO writes)
verdict:                     # PASSED | REJECTED | ... (FO writes)
score:                       # numeric quality score (FO writes)
worktree:                    # path to worktree (FO writes, worktree stages only)
issue:                       # Linear/GitHub issue reference (optional)
pr:                          # PR reference (FO writes)
intent: {feature|bugfix}     # assessed by build-brainstorm
scale: {Small|Medium|Large}  # assessed by build-brainstorm
project: {string}            # detected from workflow dir
profile:                     # full|standard|express (assigned post-clarify)
auto_advance:                # true if captain set "auto-execute after clarify"
parent:                      # slug of parent epic (if this entity was decomposed from a larger one)
children:                    # [slug1, slug2, ...] (if this entity is an epic/tracker)
---
```

### Body Sections

| Section | Written by | Mutable by | Purpose |
|---------|-----------|------------|---------|
| `## Directive` | `/build` | **immutable** | Captain's verbatim words — the source of truth for intent |
| `## Captain Context Snapshot` | `/build` (build-brainstorm) | **immutable** | Repo state, session context, related entities at creation time |
| `## Brainstorming Spec` | build-brainstorm | build-explore may annotate | APPROACH / ALTERNATIVE / GUARDRAILS / RATIONALE |
| `## Acceptance Criteria` | build-brainstorm | build-clarify may refine | ≥2 testable criteria with `(how to verify)` notes |
| `## Open Questions` | build-explore | build-clarify adds answers | Questions generated from codebase analysis |
| `## Assumptions` | build-explore | build-clarify confirms/corrects | Evidence-backed hypotheses with confidence levels |
| `## Option Comparisons` | build-explore | build-clarify records selection | 2-3 option tables for gray areas without code precedent |
| `## Canonical References` | build-clarify (grows during Q&A) | append-only | Paths to specs/ADRs/docs that captain references during clarify |
| `## Decomposition Recommendation` | build-explore (if scope too large) | build-clarify resolves | Suggested child entity split with dependency order |
| `## Stage Report: {name}` | ensign (per stage) | **append-only** | Audit trail — one per completed stage |

### Canonical Example (Entity 046)

```markdown
---
id: 046
title: Dashboard 詳情頁即時標註高亮
status: draft
context_status: pending
source: /build
created: 2026-04-09T14:32:18+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
---

## Directive

> dashboard 詳情頁要支援即時標註高亮，多人同步

## Captain Context Snapshot

- **Repo**: main @ 1c4e750
- **Session**: Captain 前段對話在討論 activity feed 與 comment 高亮
- **Related entities**: 038 (inline comment highlights, shipped), 042 (activity feed, shipped)
- **Created**: 2026-04-09 14:32 (GMT+8)

## Brainstorming Spec

**APPROACH**: WebSocket broadcast + optimistic UI. Highlight event 透過 dashboard
channel pub/sub 廣播。儲存在 SQLite comment 同層。

**ALTERNATIVE**: CRDT-based (Yjs/Automerge) — D-01 已排除：對「標註」這種
non-overlapping 操作殺雞用牛刀。

**GUARDRAILS**:
- 不引入新 runtime 依賴
- highlight 結構必須 round-trip SQLite
- 不破壞 038 的 highlight CSS (detail.css:485)

**RATIONALE**: 038 已證明 CustomEvent 架構可行；extend 到 realtime 只需加 WS
broadcast 層。

## Acceptance Criteria

- User A 標註文字 → User B 3 秒內看到高亮 (how to verify: E2E two-browser test)
- User A 移除標註 → User B 3 秒內同步移除 (how to verify: same E2E)
- 跨 instance 同步 (channel 8420 + ctl.sh 8421) (how to verify: two-server E2E)
- Refresh 後 highlight 保留 (how to verify: reload assertion)

## Open Questions

(explore 階段填入)

## Assumptions

(explore 階段填入)

## Option Comparisons

(explore 階段填入)

## Canonical References

(clarify 階段填入)
```

---

## §6 — Skill: `build-brainstorm`

### Contract

| Field | Value |
|-------|-------|
| **Plugin** | spacebridge |
| **Called by** | `/build` entry skill |
| **Input** | Captain directive (string) + project context (workflow dir, git state, optional issue ref) |
| **Output** | Populated entity body sections: Directive, Captain Context Snapshot, Brainstorming Spec, Acceptance Criteria |
| **Interaction** | **Zero questions** — α marker mode. Never invokes AskUserQuestion. |
| **Tools** | Read, Grep, Glob, Write, Bash(git), context-lake MCP (search_journal, search_insights), Linear MCP (if issue ref) |

### Core Flow

```
Step 1: Context Enrichment (no questions, no interaction)
  - If issue reference → fetch via Linear/GitHub MCP, extract title + description + labels
  - Grep workflow dir for related entities (title keyword match)
  - Search context lake: recent 3 journal entries matching directive keywords
  - Capture git state (branch, sha, recent 3 commits)
  - Capture session timestamp

Step 2: Domain Classification
  Apply GSD 5-domain heuristic to directive:
    - User-facing Visual
    - Behavioral / Callable
    - Runnable / Invokable
    - Readable / Textual
    - Organizational / Data-transforming
  Record domain in Captain Context Snapshot (informs build-explore's gray area template).

Step 3: Spec Distillation
  Produce:
    APPROACH   — 1 paragraph, the most likely interpretation of directive
    ALTERNATIVE — 1 paragraph, the obvious fork + why rejected (Decision ID: D-01)
    GUARDRAILS — 3-5 bullets; if genuinely none → "Checked — no notable constraints"
    RATIONALE  — 1 paragraph, why APPROACH over ALTERNATIVE

  If any section cannot be filled from directive alone:
    Mark: (needs clarification — deferred to explore)
    DO NOT ask captain. DO NOT guess.

Step 4: Acceptance Criteria Extraction
  Produce ≥2 testable criteria, each with (how to verify) annotation.
  If directive is too vague for criteria:
    Mark: (needs clarification — explore will derive from codebase analysis)

Step 5: Intent & Scale Assessment
  - intent: feature | bugfix (from directive keywords + issue labels if available)
  - scale: Small (<5 files) | Medium (5-15 files) | Large (>15 files)
  If ambiguous → mark (needs clarification — deferred to explore)

Step 5.5: Scope Check (Decomposition Signal)
  Scan directive for large-scope signals:
    - Signal words: "整個", "全部", "遷移", "migrate", "rewrite", "overhaul", "全面"
    - Multiple distinct verbs targeting different subsystems
    - Directive exceeds 3 sentences describing different areas
    - Domain classification returned 3+ domains

  If ≥2 signals detected:
    Add to Captain Context Snapshot: `**Scope flag:** ⚠️ likely-decomposable`
    This flag tells build-explore to prioritize decomposition analysis.

  If <2 signals: no flag. Proceed normally.

  This check is O(1) — pure text analysis, no codebase reads.

Step 6: Entity Assembly & Commit
  Write entity file at {workflow_dir}/{slug}.md
  git add {slug}.md && git commit -m "seed: {slug} — {title}"
```

### Distillation Source Map

What was kept, dropped, or modified from `superpowers:brainstorming` and `gsd-discuss-phase`:

| Source | Element | Disposition | Reason |
|--------|---------|-------------|--------|
| superpowers | Explore project context | ✅ Keep | Brainstorm quality depends on awareness |
| superpowers | Propose approaches | ✅ Keep (light) | APPROACH + ALTERNATIVE, no deep comparison |
| superpowers | YAGNI ruthlessly | ✅ Keep | Reject speculative features in spec |
| superpowers | Self-review (placeholder scan) | ✅ Keep | Internal quality — mark unknowns with α |
| superpowers | Visual companion | ❌ Drop | /build is a capture moment, not a design session |
| superpowers | Ask questions one at a time | ❌ Drop | Deferred to build-clarify |
| superpowers | Present design per section | ❌ Drop | No interaction |
| superpowers | Write to docs/superpowers/specs/ | ❌ Drop | Entity body IS the spec |
| superpowers | User review gate | ❌ Drop | Deferred to clarify stage |
| superpowers | Transition to writing-plans | ❌ Drop | Pipeline handles transitions |
| GSD | Decision ID format (D-01, D-02) | ✅ Adopt | Enables downstream reference by ID |
| GSD | Domain classification heuristic | ✅ Adopt | Guides build-explore's gray area selection |
| GSD | Canonical refs capture | 🔄 Modify | Seed initial entries if directive mentions specs; full accumulation in build-clarify |
| GSD | Success criteria with verification method | ✅ Adopt | `(how to verify)` annotation on each criterion |
| GSD | Gray area identification | ❌ Defer | Build-explore's job, not brainstorm's |
| GSD | AskUserQuestion serial loop | ❌ Defer | Build-clarify's job |
| GSD | CONTEXT.md structure | ❌ Drop | Entity body sections replace this |
| GSD | Checkpoint files | ❌ Drop | Entity body IS the checkpoint |

### Forge Integration

Fixtures directory: `spacebridge/skills/build-brainstorm/forge/fixtures/`

| Fixture | Directive richness | Expected behavior |
|---------|-------------------|-------------------|
| `rich-directive.yaml` | Multi-paragraph, mentions files, clear scope | 0 α markers, full spec, Small/feature |
| `bug-with-linear-issue.yaml` | Short + Linear issue ref | Fetch issue, derive spec from issue body, bugfix |
| `vague-one-liner.yaml` | "fix the dashboard" | Multiple α markers, scale=(needs clarification) |
| `too-vague.yaml` | "make it better" | Most sections marked α, intent=(needs clarification) |
| `multi-paragraph-with-refs.yaml` | Rich + references ADR | Canonical Refs seeded, 0 α markers |

Each fixture defines: `input` (directive + context), `expected_sections` (which sections should be populated vs α-marked), `expected_frontmatter` (intent, scale values).

---

## §7 — Skill: `build-explore`

### Contract

| Field | Value |
|-------|-------|
| **Plugin** | spacebridge |
| **Executed by** | Engine's ensign (via cross-plugin `skill:` field) |
| **Input** | Entity body (Directive + Brainstorming Spec + Acceptance Criteria) |
| **Output** | Populated: Open Questions, Assumptions, Option Comparisons sections |
| **Interaction** | **Zero** — ensign never interacts with captain |
| **Tools** | Read, Grep, Glob, Bash, context-lake MCP (search_insights, store_insight) |

### Core Flow

```
Step 1: Read Entity & Identify Domain
  Read entity file → extract Directive, Brainstorming Spec, domain classification
  from Captain Context Snapshot.

Step 2: Codebase Mapping
  Based on APPROACH:
  - Grep for relevant files, group by layer (domain/contract/router/view/seed/frontend)
  - For each file: read, form 1-line purpose note, store_insight to context lake
  - Count files → validate/revise scale assessment
  - Record findings under ## Stage Report: explore

Step 3: Decomposition Analysis
  Check Captain Context Snapshot for `⚠️ likely-decomposable` flag.
  Also independently assess: did codebase mapping (Step 2) find >20 files
  across 3+ layers?

  If either condition is true:
    Analyze whether the entity should be split. Consider:
    - Are there natural boundaries (e.g., data layer vs UI vs sync)?
    - Can sub-scopes be built and shipped independently?
    - Are there clear dependency ordering between sub-scopes?

    If decomposition is warranted, write ## Decomposition Recommendation:

      ## Decomposition Recommendation

      ⚠️ Scale exceeds recommended single-entity scope ({n} files, {n} domains).

      Suggested split:
      1. **{child-slug-1}** — {scope description} ({n} files)
      2. **{child-slug-2}** — {scope description} ({n} files)
      3. **{child-slug-3}** — {scope description} ({n} files)

      Dependencies: {1 → 2 → 3 | all independent | ...}

    If NOT warranted despite flag: note in Stage Report:
      "Scope flag present but decomposition not recommended: {reason}"

  If no flag AND <20 files: skip this step entirely.

Step 3.5: Consume α Markers
  Scan Brainstorming Spec + Acceptance Criteria for (needs clarification — deferred
  to explore) markers. Each marker becomes a HIGH PRIORITY item for Step 4-6.
  These are the first things build-explore must attempt to resolve or convert
  into explicit Open Questions.

Step 4: Gray Area Identification (GSD Domain Templates)
  Apply domain-specific gray area template:

  User-facing Visual:
    - Layout style (cards/list/grid/timeline)
    - Loading behavior (skeleton/spinner/progressive/infinite)
    - State handling (empty/error/loading/partial)
    - Responsive breakpoints (mobile-first/desktop-first/both)
    - Animation/transitions (subtle/none/rich)

  Behavioral / Callable:
    - Input validation strategy (client/server/both)
    - Error response format (structured/message/code)
    - Idempotency requirements
    - Rate limiting / throttling
    - Versioning strategy

  Runnable / Invokable:
    - Invocation modes (CLI flags/config/interactive)
    - Output format (JSON/text/table/streaming)
    - Exit codes / error signaling
    - Concurrency model (parallel/sequential/configurable)

  Readable / Textual:
    - Structure / information hierarchy
    - Tone and audience level
    - Depth vs breadth tradeoff
    - Cross-referencing strategy

  Organizational / Data-transforming:
    - Classification criteria
    - Exception / edge case handling
    - Grouping strategy
    - Schema evolution / migration

  Skip gray areas already resolved by:
    - Brainstorming Spec (D-01 etc. already decided)
    - Codebase precedent (existing pattern clearly applies)
    - Related entities (038, 042 etc. already solved this)

Step 5: Hybrid Classification
  For each remaining gray area, classify into one of three tracks:

  Track A — Assumption (codebase has clear precedent):
    Format:
      A-{n}: {statement}
      Confidence: Confident | Likely | Unclear
      Evidence: {file_path}:{line} — {what it shows}

  Track B — Option Comparison (no precedent, multiple viable paths):
    Format:
      | Option | Pros | Cons | Complexity | Recommendation |
      |--------|------|------|------------|----------------|
      | ...    | ...  | ...  | ...        | ...            |

  Track C — Open Question (genuinely open, needs captain input):
    Format:
      Q-{n}: {specific question}
      Domain: {which gray area this belongs to}
      Why it matters: {impact on downstream decisions}
      Suggested options: {2-4 concrete choices, if possible}

  Classification heuristic:
    - Found ≥2 existing usages of same pattern → Track A (Confident)
    - Found 1 usage or similar-but-different pattern → Track A (Likely)
    - Found competing patterns in codebase → Track B
    - No codebase signal at all → Track C
    - α marker from brainstorm with no codebase resolution → Track C

Step 6: Write to Entity Body
  Populate:
    ## Assumptions — all Track A items
    ## Option Comparisons — all Track B items
    ## Open Questions — all Track C items

  Annotate Brainstorming Spec:
    - Confirmed sections: add (✓ confirmed by explore: {evidence})
    - Contradicted sections: add (⚠ contradicted: {evidence} — see Q-{n})

Step 7: Stage Report
  Write ## Stage Report: explore with:
    - Files mapped: {count} across {layers}
    - Assumptions formed: {count} (Confident: {n}, Likely: {n}, Unclear: {n})
    - Options surfaced: {count}
    - Questions generated: {count}
    - α markers resolved: {count} / {total}
    - Scale assessment: {confirmed | revised from X to Y}
```

### Forge Integration

Fixtures directory: `spacebridge/skills/build-explore/forge/fixtures/`

| Fixture | Scenario | Expected |
|---------|----------|----------|
| `well-specified-entity.yaml` | Rich spec, codebase has patterns | Mostly assumptions, few questions |
| `vague-entity-with-alpha.yaml` | Multiple α markers | α markers → questions or assumptions |
| `novel-feature.yaml` | No codebase precedent | Mostly options + questions |
| `bugfix-entity.yaml` | Bugfix intent | Root cause diagnosis, fewer gray areas |
| `cross-domain-entity.yaml` | Spans visual + behavioral | Both domain templates applied |

---

## §8 — Skill: `build-clarify`

### Contract

| Field | Value |
|-------|-------|
| **Plugin** | spacebridge |
| **Called by** | Science Officer (agent or skill) |
| **Input** | Entity body with populated Open Questions, Assumptions, Option Comparisons |
| **Output** | All questions resolved, assumptions confirmed, options selected, canonical refs populated, `context_status: ready` |
| **Interaction** | **Heavy** — AskUserQuestion serial loop with captain |
| **Tools** | AskUserQuestion, Read, Grep, Write, Bash(git), context-lake MCP |

### Core Flow

```
Step 0: Decomposition Gate
  Check entity body for ## Decomposition Recommendation section.

  If present:
    Present decomposition to captain BEFORE any other clarification:

      "Explore found this entity's scope is large ({n} files, {n} domains).
       Recommended split:

       1. {child-slug-1} — {scope} ({n} files)
       2. {child-slug-2} — {scope} ({n} files)
       3. {child-slug-3} — {scope} ({n} files)

       Dependencies: {ordering}

       Options:
       a) Accept split — I'll create child entities, this becomes an epic
       b) Modify split — tell me what to change
       c) Reject split — proceed as single entity"

    Use AskUserQuestion with these 3 options.

    If (a) Accept:
      - For each child: invoke /build with child's title + scope as directive
        (each gets its own build-brainstorm pass → draft entity)
      - Update original entity frontmatter:
          status: epic
          children: [child-slug-1, child-slug-2, ...]
      - Update each child's frontmatter: parent: {original-slug}
      - Commit: decompose: {slug} → [child1, child2, ...]
      - Report to captain: "Epic created. {n} child entities in draft."
      - EXIT clarify — epic doesn't continue through pipeline.

    If (b) Modify:
      - Capture captain's modifications (freeform text)
      - Adjust child list, re-present, loop until accepted or rejected

    If (c) Reject:
      - Remove ## Decomposition Recommendation section from entity body
      - Proceed to Step 1 (normal clarify flow)

  If not present: proceed to Step 1.

Step 1: Load Entity State
  Read entity body. Count:
    - Unanswered Open Questions (no → Answer: annotation)
    - Unconfirmed Assumptions (no ✓/✗ annotation)
    - Unselected Option Comparisons (no → Selected: annotation)
  If all resolved → skip to Step 5 (already complete, resume case).

Step 2: Assumption Batch Confirmation
  Present ALL assumptions to captain in a single formatted block:

    "Based on codebase analysis, here are my assumptions:

     ✅ A-1: [Confident] Reuse existing DashboardChannel for broadcast
        Evidence: src/channel.ts:42 — pub/sub already supports topic routing

     ✅ A-2: [Likely] SQLite table structure mirrors comment schema
        Evidence: src/db.ts:15 — comments table has similar column pattern

     ⚠️ A-3: [Unclear] Cross-instance sync uses HTTP POST bridge
        Evidence: src/server.ts:88 — forwardToCtlServer exists but untested
        for highlight payloads

     Are these correct? (Type corrections for any that are wrong,
     or 'all correct' to confirm)"

  This is plain text, NOT AskUserQuestion — allows freeform corrections.
  Parse response: mark each assumption ✓ confirmed or ✗ corrected.
  Write corrections back to entity body.

Step 3: Option Selection (one at a time)
  For EACH option comparison, use AskUserQuestion:

    AskUserQuestion({
      header: "Layout",                              // ≤12 chars
      question: "Highlight rendering approach?",
      options: [
        { label: "Inline overlay",
          description: "CSS overlay on text range. Simple, matches 038 pattern." },
        { label: "Margin annotation",
          description: "Side gutter markers. More visible, needs new CSS." },
        { label: "Background tint",
          description: "Full-line background. Least intrusive, lowest contrast." }
      ]
    })

  Record selection: → Selected: {option} (captain chose, {date})
  If captain selects "Other" → switch to freeform follow-up text, record verbatim.

Step 4: Open Question Resolution (one at a time)
  For EACH open question, use AskUserQuestion if suitable options exist:

    AskUserQuestion({
      header: "Sync",
      question: "Q-2: Should highlights persist across sessions or be ephemeral?",
      options: [
        { label: "Persistent (SQLite)",
          description: "Survive refresh. Need migration + cleanup policy." },
        { label: "Ephemeral (memory)",
          description: "Lost on refresh. Simpler, no schema change." }
      ]
    })

  If question is too open-ended for options → plain text prompt.
  Record: → Answer: {response} (captain, {date})

  Canonical refs accumulator: if captain's answer mentions a file, spec, or ADR
  (e.g., "check adr-001", "see detail.css"), immediately:
    1. Read the referenced file
    2. Add to ## Canonical References with full relative path
    3. Use learned context to inform subsequent questions

Step 5: Context Sufficiency Gate
  Verify:
    □ All Open Questions have → Answer: annotations
    □ All Assumptions have ✓ or ✗ annotations
    □ All Option Comparisons have → Selected: annotations
    □ Acceptance Criteria: ≥2 criteria exist, none marked α
    □ Canonical References: section exists (may be empty if captain
      referenced no external docs — that's OK)

  If any check fails → loop back to relevant step.

  If all pass:
    Update frontmatter: context_status: ready
    Present summary to captain:
      "Context complete for {entity title}.
       {n} decisions locked, {n} assumptions confirmed, {n} questions resolved.
       {list canonical refs if any}
       Ready to hand off to First Officer."

    Hybrid handoff:
      If auto_advance: true → update status: clarify → plan, commit
      Else → wait for captain's explicit "execute {slug}"

Step 6: Commit
  git commit with message: clarify: {slug} — context ready
  Include all entity body changes in single commit.
```

### AskUserQuestion Rules (Distilled from GSD)

1. **2-4 options** per question. System auto-adds "Other" for freeform.
2. **Concrete options only** — never generic categories ("Technical", "Business").
3. **Include recommendation** — mark one option as `(recommended)` when ensign's explore data supports it.
4. **One question per message** — never batch AskUserQuestion calls.
5. **Freeform rule** — when captain selects "Other", switch to plain text for follow-up. Do NOT present another AskUserQuestion for the same topic.
6. **Empty response handling** — retry once with same parameters. If still empty, fall back to plain text numbered list.
7. **Header ≤12 chars** — short label for the question category.

### Resume Protocol

If clarify session is interrupted (context pressure, captain leaves):
- Entity body already contains partial annotations (some → Answer:, some blank)
- Next `/science {slug}` invocation → Step 1 counts remaining items → resumes from first unanswered
- No checkpoint file — entity body IS the checkpoint

### Forge Integration

Fixtures directory: `spacebridge/skills/build-clarify/forge/fixtures/`

| Fixture | Scenario | Expected |
|---------|----------|----------|
| `full-explore-output.yaml` | 5 assumptions, 2 options, 3 questions | Batch confirm → 2 AskUserQuestion → 3 AskUserQuestion → gate pass |
| `all-confident.yaml` | 5 assumptions all Confident, 0 options, 0 questions | Batch confirm only → gate pass (fast path) |
| `resume-mid-session.yaml` | 2/5 questions already answered | Skip answered, resume from Q-3 |
| `captain-corrects-assumption.yaml` | Captain corrects A-2 | Correction recorded, may generate follow-up question |
| `canonical-ref-accumulation.yaml` | Captain mentions "check adr-001" in answer | ADR read, path added to Canonical References |

---

## §9 — Engine ↔ Spacebridge Contract

### Cross-Plugin Skill Loading

Workflow README stage definitions gain an optional `skill:` field:

```yaml
- name: explore
  model: sonnet
  worktree: true
  skill: spacebridge:build-explore    # cross-plugin reference
```

**Resolution**: Engine's FO reads `skill:` field at dispatch time. If present:
1. Parse `{plugin}:{skill}` format
2. Ensign's dispatch prompt includes `Skill: "{plugin}:{skill}"` as first instruction
3. Ensign loads the skill, which takes over stage execution
4. If skill not found (spacebridge not installed) → fall back to README inline definition

**Fallback**: Every stage with `skill:` MUST still have an inline definition in README as fallback. The inline definition is the "engine-only" experience — functional but less sophisticated. If both the cross-plugin skill AND the inline definition are missing, FO reports an error and blocks the entity at that stage.

### Events Bus

Engine emits events at state transitions. Spacebridge's dashboard subscribes.

| Event | Payload | Emitted by |
|-------|---------|-----------|
| `entity.created` | slug, title, status | `/build` (spacebridge) |
| `entity.dispatched` | slug, stage, worktree | FO (engine) |
| `entity.stage_complete` | slug, stage, verdict | FO (engine) |
| `entity.clarify_started` | slug | Science Officer (spacebridge) |
| `entity.context_ready` | slug, decisions_count | Science Officer (spacebridge) |
| `entity.merged` | slug, verdict, score | FO (engine) |

Transport: same mechanism as existing dashboard events (HTTP POST to dashboard server if running, no-op otherwise).

### Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Spacebridge not installed | Engine works fully. No `/build`, no Science Officer, no dashboard. Captain creates entities manually, FO dispatches using README inline definitions. |
| Engine not installed | Spacebridge cannot function. `/build` fails with "spacedock engine plugin required". |
| Dashboard not running | Science Officer works (uses CLI AskUserQuestion). Events are no-ops. |

---

## §10 — Migration & Rollout

### Direction

Migrate from current single-plugin architecture to engine+spacebridge split. This is a structural refactor — no behavioral changes to stages after `plan`.

### Rollout Order

1. **Phase A**: Create `build-brainstorm` skill within current spacedock plugin. Replace `Skill: "superpowers:brainstorming"` invocation in `/build`. Validate with forge fixtures. No plugin split yet.

2. **Phase B**: Create `build-explore` skill. Add `skill:` field to explore stage in README. Validate ensign correctly loads skill. Fallback to inline definition works.

3. **Phase C**: Create `build-clarify` skill + Science Officer agent. Add `clarify` stage to README between explore and plan. Validate AskUserQuestion loop, context sufficiency gate, hybrid handoff.

4. **Phase D**: Plugin split. Move spacebridge-destined files to new plugin repo. Update cross-plugin references. Validate engine-only and engine+spacebridge scenarios.

### Backward Compatibility

- Existing entities (pre-split) lack `context_status` field → treated as `ready` (skip clarify)
- Existing entities lack `## Open Questions` section → Science Officer skips clarify, proceeds directly
- `/build` created entities with `status: explore` → continue to work with FO dispatch as today until Phase C completes

---

## §11 — Forge Integration

### Directory Structure (Per Skill)

```
spacebridge/skills/build-{name}/
  SKILL.md                    # skill definition
  references/                 # reference docs for skill context
  forge/
    fixtures/                 # input/expected pairs
      {scenario}.yaml
    golden/                   # baseline outputs from known-good runs
    history/                  # iteration log
```

### Fixture Format

```yaml
name: rich-directive
description: Multi-paragraph directive with clear scope
input:
  directive: |
    Dashboard 詳情頁要支援即時標註高亮，多人同步。
    使用 WebSocket broadcast，highlight 儲存在 SQLite。
    不要引入新 runtime 依賴。
  issue_ref: null
  git_sha: "abc1234"
  related_entities: ["038-inline-comment-highlights"]
expected:
  alpha_markers: 0
  sections_populated: [Directive, Captain Context Snapshot, Brainstorming Spec, Acceptance Criteria]
  frontmatter:
    intent: feature
    scale: Medium
```

### Nightwatch Signal Harvesting

Nightwatch can monitor per-skill quality by scanning:
- Clarify gate rejection rate (clarify completes but plan stage rejects → clarify missed something)
- α marker survival rate (α markers that persist through explore → explore skill needs improvement)
- Captain correction rate in assumptions (high correction → explore's confidence calibration is off)

---

## §12 — Open Questions & Deferred

### Open (To Be Decided During Implementation)

1. **Spacebridge plugin repo structure** — monorepo with spacedock or separate repo? Affects cross-plugin skill loading path resolution.
2. **Science Officer command name** — `/science`, `/scan`, `/analyze`, or follow spacebridge naming (`/bridge analyze`)? Depends on final plugin branding.
3. **`auto_advance` scope** — per-entity only, or global spacebridge config? Global default + per-entity override is likely.
4. **Batch clarify UX** — `/science --batch` sequential clarify of all awaiting entities: what's the inter-entity transition UX?
5. **Cross-plugin skill loading feasibility** — Claude Code's `Skill:` tool resolves skills within the active plugin set. Need to verify `{plugin}:{skill}` reference works across independently installed plugins.

### Deferred (Out of Scope)

1. **Tier 2 skill migration** (plan, quality, research) — separate spec after Tier 1 validates the skill-per-stage pattern.
2. **Dashboard UI for `context_status`** — progress bar, status badges, clarify session view. Separate design spec.
3. **Dashboard-integrated clarify** — Science Officer currently uses CLI AskUserQuestion. Future: dashboard provides richer Q&A UI with option cards, assumption toggles, reference viewer. Separate spec.
4. **Spacebridge `/launch` or `/fire` command naming** — deferred until plugin branding is finalized.
5. **Multi-captain support** — Science Officer assumes single captain. Multi-reviewer clarify (multiple people answer different questions) is a future enhancement.

---

_End of spec._
