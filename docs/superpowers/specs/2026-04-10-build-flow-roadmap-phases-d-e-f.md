---
title: Build Flow Roadmap -- Phases D, E, F
date: 2026-04-10
status: active
scope: build flow lifecycle and methodology
supersedes: none
relates_to:
  - docs/superpowers/specs/2026-04-09-build-studio-plugin-and-science-officer.md
  - docs/build-pipeline/spacedock-plugin-architecture-v2.md
tracking_until: Phase D completes; reassess at that point
---

# Build Flow Roadmap: Phases D, E, F

## Purpose

Phase C (build-clarify skill + Science Officer agent) shipped and passed smoke test on 2026-04-10. This document defines the forward trajectory as three sequenced phases, each building the foundation the next requires. It is the single tracking source for D/E/F scope until Phase D completes.

This roadmap coordinates with but does NOT subsume `docs/build-pipeline/spacedock-plugin-architecture-v2.md` (entity 040). That doc tracks the plugin split as a parallel work track. This roadmap tracks the build flow methodology evolution. They intersect in Phase D (skill namespacing + SO ownership) and run independently elsewhere.

## Guiding Principle

Each phase's goal is to be the *foundation the next phase needs*. Breaking the ordering breaks the leverage:

```
Phase C (shipped 2026-04-10)
    |
    v
Phase D -- Clean skill contracts + SO ownership expansion
    |         (fix what Phase C smoke test revealed)
    v
Phase E -- Build flow lifecycle restructure
    |         (using Phase D's cleaned skills as building blocks)
    v
Phase F -- Next.js frontend rewrite
              (using Phase E's new flow as the development methodology
               AND as a real-world stress test)
```

**Why D before E**: restructuring the flow on top of today's broken skill contracts (format drift, loose-mode ambiguity, ensign assumption violations) would inherit the mess. D fixes the bricks before E builds the wall.

**Why E before F**: Phase F is a multi-month rewrite project. Running it on the old pipeline wastes the chance to validate E's design under real load.

**Why F is dual-purpose**: any design has latent gaps that only emerge under sustained real use. Self-hosting the rewrite project through the new flow is the strongest possible validation. If E has design flaws, F will force them into the light.

---

## Phase D: Clean Skill Contracts + SO Ownership Expansion

**Goal**: Close the skill contract gaps surfaced by the Phase C smoke test. Expand Science Officer to own the full context-building phase (brainstorm → explore → clarify). Coordinate with the plugin split (entity 040).

### Scope

#### D.1 -- Skill contract fixes from Phase C smoke test

Four gaps surfaced during the 2026-04-10 smoke test on entity 046. All must close in Phase D:

1. **Format drift: skill spec vs dashboard parser**
   - `skills/build-explore/references/output-format.md` and `skills/build-clarify/references/output-format.md` show Stage Reports as flat bullets (`- Files mapped: ...`)
   - `tools/dashboard/src/frontmatter-io.ts:140` parser requires checklist format (`- [x] ...`)
   - Every entity written to skill-spec format renders with an empty Stage Report card in the UI
   - **Fix**: update both reference docs to use `- [x]` format. Production entity `dashboard-standalone-plugin.md` confirms this is the real contract.

2. **build-clarify Step 5 loose-mode commit semantics**
   - Step 5 literal reading says "Then stop" in loose mode, leaving Step 6 (write Stage Report + commit) skipped
   - This leaves the session's annotations uncommitted
   - **Fix**: clarify the skill spec that Step 6 (a) write Stage Report + commit always runs, (b) only `status: plan` frontmatter update is tight-only, (c) "stop" in Step 5 means "stop advancing pipeline", not "stop the current session".

3. **build-explore Write/Edit prohibition blocks SO-direct path**
   - Skill header says `NOT available: Write / Edit on the entity file -- the ensign wrapper applies updates`
   - SO-direct invocation has no ensign wrapper, so the prohibition forces workarounds
   - **Fix**: either (a) remove the prohibition, (b) define an SO-mode that permits Edit, or (c) build a thin ensign-substitute helper

4. **build-clarify assumes `status: clarify` on entry**
   - In normal flow, ensign sets `status: clarify` before invoking the skill
   - SO-direct path bypasses ensign; the skill gets an entity with `status: draft` and has no path to advance it
   - **Fix**: either the skill owns the transition or SO provides a state-prep helper

#### D.2 -- Open Questions rendering hotfix

Current build-explore output uses soft newlines between Q fields (Domain, Why it matters, Suggested options). Markdown collapses these into a single paragraph, rendering Open Questions as a wall of text in the dashboard UI.

**Fix**: update `skills/build-explore/references/output-format.md` to require blank lines between each Q-n field so markdown renders them as distinct paragraphs. Affects rendering of Q-n blocks only; does not change parser behavior.

#### D.3 -- Stage Report Tier 1: detail lines

The dashboard parser already supports a one-line `detail` field per Stage Report item (`frontmatter-io.ts:157-158` reads the next indented line as detail). The skill specs never populate it, so the UI never shows it.

**Fix**: update both `output-format.md` files (build-explore and build-clarify) to include 2-space-indent detail lines under each metric. Example:

```markdown
- [x] Options selected: 1 / 1
  O-1: Filter UI placement -> Second chip row (recommended)
```

Tier 2 (multi-line detail + collapsible) and Tier 3 (clickable anchor to entity body section) are Phase F work -- they require frontend component-level changes that align with the Next.js rewrite scope.

#### D.4 -- Science Officer agent expansion

Currently `agents/science-officer.md` loads only `spacedock:build-clarify`. Expand to own the full context-building phase:

- Load `spacedock:build-brainstorm` + `spacedock:build-explore` + `spacedock:build-clarify`
- Boot Sequence logic: given an entity, detect its `context_status` (none / pending / awaiting-clarify / ready) and run the appropriate skill sequence to bring it to `ready`
- Persona handles transitions: `pending -> exploring` (runs build-explore) `-> awaiting-clarify` (runs build-clarify) `-> ready`
- Hybrid handoff remains loose default; tight via `auto_advance: true`
- Captain still drives the interactive parts via AskUserQuestion

This establishes the foundation for Phase E's "SO owns the Discuss phase" topology.

#### D.5 -- Plugin split coordination with entity 040

Phase D does NOT re-scope the plugin split work -- entity 040 (spacedock-plugin-architecture-v2) already tracks that. Phase D's contribution:

- Ensure the new plugin boundary correctly exposes the APIs SO needs (entity body read/write, activity feed, comments)
- Resolve the naming question: Phase C's handoff noted a migration target `spacedock:build-clarify -> spacebridge:build-clarify`. **Resolved 2026-04-10 (see below).**

##### D.5 Resolution (2026-04-10): 2-plugin split

The plugin split is **two plugins, not three**:

1. **`clkao/spacedock`** (engine, upstream) — entities, workflows, stages, pipeline primitives, First Officer agent, execute/plan/seeding skills. Exposes two public interfaces (`ChannelProvider` + `CoordinationClient`) with default in-process implementations so headless/no-bridge installs continue working with zero behavior change.

2. **`spacebridge`** (user's plugin) — coordination plane + UI + build studio in one plugin. Includes: Science Officer agent, Quality Officer (mod-based v1, possible agent later), the full build-* skill suite (brainstorm / explore / clarify / quality / pr-review / ship) migrated from `spacedock:*` to `spacebridge:*` namespace, Next.js daemon (HTTP + SSE + UI), Drizzle ORM, L2 auto-fork daemon lifecycle, unix socket IPC with the engine's shim, tunnel-based multi-human collaboration for the pre-SaaS window.

The third option that was considered and rejected — splitting UI out as a separate `spacedock-dashboard` plugin — was eliminated because the UI, coordination, and build studio all share the same "human interaction surface" identity. Splitting them adds coordination cost without clear benefit, and violates the role-interaction-density argument that places SO (which drives all three) in a single home.

**Rationale**: see `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md` sections 1.4, 2.1, and 9 (Decision D3) for the full argument. That design doc is the authoritative source for the engine/bridge architecture; this roadmap references it but does not duplicate its contents.

**Immediate implications for Phase D**:
- Skill namespace migration (`spacedock:build-* → spacebridge:build-*`) is confirmed as a Phase F work item, not Phase D. Phase D keeps the current namespace.
- The upstream PR for `ChannelProvider` interface extraction (PR1 in the spacebridge design) can run **in parallel with Phase D.1-D.4/D.6/D.7** because it is behavior-neutral and does not touch skill contracts or SO agent definitions.
- `CoordinationClient` interface extraction (PR2) waits until Phase E completes its role boundary formalization — the role type is PR2's critical dependency.
- Open Question 1 at the end of this document (plugin naming: 2 or 3 plugins) is now resolved and should be read as closed.

#### D.6 -- `/science` thin wrapper + batch mode

From Phase C handoff deferred list:
- `/science {slug}` as a lightweight slash command that dispatches to science-officer agent
- `/science --batch` to iterate through all entities in `awaiting-clarify` state

#### D.7 -- Forge fixtures for build-clarify

Phase C shipped without solo smoke-test capability for build-clarify (it is Captain-interactive, Class 3 per MEMORY.md). Phase D adds pre-recorded captain responses as forge fixtures so regression testing works without a live captain.

### Explicitly Deferred from Phase D

- **Tier 2/3 Stage Report rendering** -- Phase F (needs Next.js component architecture)
- **Structured rendering of Assumptions / Options / Questions sections** -- Phase F
- **AC defect semantic check** (detecting contradictions between Q answers and AC claims) -- Phase E
- **File watcher / WebSocket push on direct edits** -- Phase F (the Next.js rewrite will redesign the realtime layer)
- **Build flow lifecycle restructure** (Discuss/Execute/Verify role split) -- Phase E (that's the whole point of E)

### Success Criteria

- All 4 Phase C smoke test contract gaps closed
- Dashboard renders Stage Report cards correctly (non-empty, with detail lines if present)
- Dashboard renders Open Questions as properly formatted sections (no wall of text)
- Science Officer successfully runs a full entity through pending -> ready without any workarounds or ensign wrapper
- At least one new entity goes through SO-direct path end-to-end
- Plugin split (entity 040 WP1) ships with clean engine/UI boundary
- `/science` slash command works
- Forge fixtures enable solo regression test of build-clarify

---

## Phase E: Build Flow Lifecycle Restructure

**Goal**: Redesign the build pipeline around three explicit phases with clear role ownership and CC session topology. Use Phase D's cleaned skills as building blocks.

### Vision

| Phase | Role | CC Session | Stages |
|---|---|---|---|
| 討論 (Discuss) | Science Officer | Interactive, Captain-driven | brainstorm, explore, clarify |
| 執行 (Execute) | First Officer | Daemon, autonomous | plan, execute, seeding |
| 檢查 (Verify) | Quality Officer (new?) | Background or daemon | quality, pr-review, ship |

### Preliminary Scope (to refine after Phase D learnings)

1. **Role boundary formalization**: three distinct personas with non-overlapping stage ownership. Each role has its own agent definition and skill loadouts.
2. **CC session topology**: SO + FO (+ optional QO) running in parallel. Requires the race-avoidance mechanisms sketched during Phase C smoke test (status-based guard, SO no-pull during active clarify, FO re-check before dispatch).
3. **Stage Report detail expansion (beyond Tier 1)**: each metric links to its decision rationale in the entity body. Foundation for Phase F's rich rendering.
4. **AC defect semantic check**: extend Step 5 gate to compare Q answers against AC claims. Catch AC/resolution contradictions before plan starts.
5. **Context lake integration across phases**: each phase persists findings so the next phase starts with prior context loaded.
6. **Decision audit trail**: Stage Report detail lines become the primary decision record -- "what, why, impact" -- sufficient for post-hoc review without needing git log dives.

### Success Criteria (placeholder)

- Three-phase flow produces cleaner entity bodies than the current pipeline
- Role boundaries are mechanically enforced (not vibes-based)
- Multiple CC sessions run in parallel on the same workflow without race or step-on
- Decision audit trail is sufficient for a reviewer to understand *why* without reading the whole flow

### Why E cannot start before D

Phase E restructures how skills are orchestrated. It needs skills whose contracts are clean and predictable. Today's skills have 4 known contract gaps (see D.1). Building orchestration on top of broken contracts wastes Phase E's leverage.

---

## Phase F: Next.js Frontend Rewrite Using the New Build Flow

**Goal**: Rebuild the dashboard with Next.js on Bun. Use Phase E's restructured build flow as the development methodology, making Phase F simultaneously a product delivery AND a real-world validation of E.

### Dual Purpose

1. **Product**: modern Next.js dashboard, component-based architecture, structured rendering of every entity body section, better UX
2. **Validation**: a multi-month rewrite project is the strongest stress test of Phase E's flow. Any design gap in E will surface here. Self-hosting proves the flow works for its own evolution.

### Preliminary Scope

1. **Stack**: Bun as runtime (no change), Next.js as full-stack framework (new), React (new for dashboard; current is vanilla JS IIFE)
2. **Entity body structured rendering (Tier 2+3)**:
   - Custom React components per section type: `<AssumptionsList>`, `<OptionComparisonTable>`, `<OpenQuestionsCard>`, `<StageReportAccordion>`
   - Collapsible detail per Stage Report metric (`<details><summary>`)
   - Clickable anchors: clicking "Options selected: 1/1" navigates to `## Option Comparisons` in the entity body
3. **Realtime layer rebuild**: replace current WebSocket + polling hybrid with a Next.js-compatible mechanism (WebSocket via Next.js route handler, SSE, or similar). Include file watcher so direct edits propagate.
4. **API boundary cleanup**: expose structured endpoints that match Phase D's clean engine boundary. Frontend consumes engine via API, not direct file reads.
5. **Migration strategy**: run old and new dashboards in parallel during transition. Old is source of truth until new reaches parity.

### Non-Scope

- Visual redesign (keep current dark theme styling until port is functional)
- Mobile support (defer until desktop port is stable)
- Additional features beyond parity (deliver later, after rewrite lands)

### Success Criteria (placeholder)

- New Next.js dashboard reaches feature parity with current vanilla JS dashboard
- All entity body sections render via React components, not raw markdown
- Stage Report cards have collapsible detail + clickable navigation
- Phase E's flow successfully manages the entire Phase F rewrite from discuss to ship
- No critical flow gaps discovered that require an emergency Phase E revision

---

## Ordering Dependencies (summary)

```
Phase C (shipped)
    |
    v
+-------------------+
| Phase D           |  <-- fix skill contracts, expand SO
| Plugin split (040)|  <-- parallel track, not blocked by flow work
+-------------------+
    |
    v
+-------------------+
| Phase E           |  <-- restructure flow using D's clean skills
+-------------------+
    |
    v
+-------------------+
| Phase F           |  <-- rewrite frontend using E's new flow
+-------------------+
```

**Parallel tracks within Phase D**: skill contract fixes (D.1-D.4, D.6, D.7) can run in parallel with entity 040's plugin split. Coordination point is D.5 (naming / boundary) and D.4 (SO agent loadout).

## Long-term Vision: Build Flow as Distributable Workflow

The build flow (this roadmap's subject) is currently bundled into spacedock as an experimental, dogfood-driven methodology. The long-term trajectory extends beyond Phase F:

1. **Phase D/E/F are self-validation**: the flow validates on itself. Phase D fixes the skill contracts; Phase E restructures the lifecycle; Phase F applies the restructured flow to a large real project (Next.js frontend rewrite). Each phase is both a product delivery and a stress test of the flow.

2. **Phase F also packages the flow for distribution**: once the build flow proves itself across the spacebridge/spacedock plugin split work (entity 040) and survives the Next.js rewrite, it graduates from "experimental spacedock feature" to "built-in workflow shipped with spacebridge". The build flow becomes a product, not just an internal tool.

3. **Phase G (placeholder -- deploy beyond spacedock)**: distribute the flow to other projects -- initially `recce` and `carlvoe`. At that point the flow is no longer spacedock-specific; it is a general-purpose discuss/execute/verify methodology usable by any workflow-equipped project.

**Design implication for Phase D and E**: every skill contract, role boundary, and session topology decision must be evaluated against *two* use cases simultaneously -- (a) the build flow's own development (dogfood), and (b) its eventual deployment on projects with different domains. Avoid baking spacedock-specific assumptions that would break the distribution story. Example: skills should not hardcode `docs/build-pipeline/` as the entity directory; that path is a spacedock convention, not a build flow contract.

**What this changes in practice**:
- Phase D plugin split coordination (D.5) should keep build flow skills distributable (probably belongs in a standalone `spacebridge` plugin, not the `spacedock` engine core)
- Phase E role definitions should be project-agnostic personas, not "spacedock First Officer"
- Phase F's API boundary work (between Next.js frontend and engine) defines the contract that Phase G's external projects will consume

## Reassessment Trigger

This document is the tracking source **until Phase D completes**. At that point:
- Re-evaluate Phase E scope against Phase D learnings (expect changes)
- Decide whether E and F need their own detailed specs or can continue sharing this roadmap
- Revisit Phase F scope if Next.js ecosystem / Bun integration story changes
- Adjust priorities based on new discoveries or shifted goals

## References

- Phase A/B/C spec: `docs/superpowers/specs/2026-04-09-build-studio-plugin-and-science-officer.md`
- Phase C plan: `docs/superpowers/plans/2026-04-09-build-clarify-skill-and-science-officer.md`
- Phase C smoke test entity: `docs/build-pipeline/dashboard-context-status-filter.md` (046)
- Phase C smoke test commits: `bf0812f` (explore) + `87a998d` (clarify)
- Plugin split parallel track: `docs/build-pipeline/spacedock-plugin-architecture-v2.md` (entity 040)
- Dashboard single-server ADR: MEMORY.md "Dashboard Single-Server Architecture (ADR-001, 2026-04-09)"
- Skill interaction classes for smoke testing: MEMORY.md "Skill Interaction Classes for Smoke Testing (2026-04-10)"

## Open Questions

1. ~~**Plugin naming**: confirm or revise `spacedock:build-* -> spacebridge:build-*` migration noted in Phase C handoff. Does the split produce 2 plugins (engine + UI) or 3 (engine + UI + build studio)?~~ **Resolved 2026-04-10 via Phase D Task 9 (D.5)**: 2-plugin split -- `clkao/spacedock` engine upstream + `spacebridge` (coordination plane + UI + build studio in a single plugin). Build-* skills and Science Officer agent live in spacebridge. Namespace migration `spacedock:build-* -> spacebridge:build-*` is deferred to Phase F (spacebridge entity 055 bootstrap). Captain ratified via AskUserQuestion during Science Officer live Task 9 execution (alongside Task 6 dogfood validation). See `docs/build-pipeline/spacedock-plugin-architecture-v2.md §Phase D Decision Anchor` and the authoritative design doc `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md` §1.4 line 51.
2. **Quality Officer role (Phase E)**: does 檢查 warrant a new persona, or is it a sub-mode of First Officer? **Interim position (2026-04-10)**: QO starts as a bridge mod hook (not an agent file) that can invoke subagents like `pr-review-toolkit`, `trailofbits`, and `e2e-flow`. Promotion to a persona is deferred to observed workload after Phase F ships. See spacebridge design doc §5.4 and OQ-4.
3. **Plugin rename timing**: if plugin naming lands in Phase D (D.5), does that trigger entity-level renames or stay scoped to the new plugin? **Resolved 2026-04-10**: the skill namespace migration (`spacedock:build-* → spacebridge:build-*`) is a Phase F work item (spacebridge entity 055), not Phase D. Phase D keeps the current namespace to avoid churn.
4. **Phase F start signal**: what marks Phase E as "done enough" to begin F? Propose: a single non-trivial entity (Small-to-Medium scale) ships via the full 討論→執行→檢查 flow without Captain intervention beyond the interactive Discuss phase.
