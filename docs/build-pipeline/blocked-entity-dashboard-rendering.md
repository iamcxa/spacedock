---
id: 116
title: Blocked-Entity Dashboard Rendering -- context_status Visibility for Escape-Hatch Branches
slug: blocked-entity-dashboard-rendering
status: draft
context_status: pending
source: captain observation
created: 2026-04-16T02:30:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
profile:
auto_advance:
parent:
children:
shape_status: n/a
depends-on: [alignment-gate-promote-to-stage]
---

## Directive

> blocked-entity-dashboard-rendering -- 當 entity 的 `context_status: blocked` 時（例如 alignment-gate 的 escalate-to-shape 分支觸發後），dashboard 應該在 stage graph 和 activity stream 上以獨立視覺樣式呈現，讓 captain 能立即看到「這個 entity 在等我開新 entity」。目前 escape-hatch 分支走 skill-internal 路徑（寫 `context_status: blocked` + `supersedes:` hint），但 dashboard 沒任何視覺信號，captain 只能靠看 entity body 才知道。修改 `tools/dashboard/` 的 entity card / graph node 渲染，加 blocked 狀態的灰色 + "awaiting captain action" 標籤；可選：POST blocked 事件到 `/api/events`。不動 pipeline schema、不改 alignment-gate 邏輯、不加 FO 路由。

## Captain Context Snapshot

- **Created**: 2026-04-16T02:30:00+08:00
- **Source**: Captain observation during entity 114 schema-gap discussion. The "remaining schema gap" was correctly diagnosed as NOT a pipeline schema problem but a dashboard visibility problem. Entity 114's escalate-to-shape branch writes `context_status: blocked` + `supersedes:` hint to the entity body — which works semantically but gives zero dashboard signal. Captain framing: "真正的使用者痛點其實是 entity context_status: blocked 時 dashboard 沒有視覺信號,captain 不知道要開新 entity".
- **Related entities**: 114 alignment-gate-promote-to-stage (shipped 2026-04-16 — first multi-branch gate to use this escape-hatch pattern); 094 warroom-pipeline-graph-visualization (clarify ready — stage graph client rendering); 113 build-entry-routing-and-alignment-gate (shipped — origin of the 3-branch gate logic); MEMORY.md multi-branch-gate-pattern.md (the architectural decision that made this gap visible as a dashboard concern not a schema concern).
- **Depends-on**: 114 — because (a) 114's escalate-to-shape branch is the first and currently only producer of `context_status: blocked`, and (b) 114 contracts the `context_status: blocked` + `supersedes:` hint format that this entity will render.
- **Why not shape-first**: Problem is narrow (dashboard rendering add), scope is Small (2-3 files in tools/dashboard/), direction unambiguous. `/build` Step 0 gatekeeper should silent-pass (concrete targets: `tools/dashboard`, `context_status: blocked`, stage graph, activity stream; zero hedge words).

## Goal Check

You are asking for the dashboard to visually flag entities whose `context_status` is `blocked` so you immediately notice a parked entity is waiting for you to open a new entity.

- **Problem being solved**: Escape-hatch entities (e.g. alignment-gate's `escalate-to-shape` branch) write `context_status: blocked` + a `supersedes:` hint into the entity body, but the dashboard shows no visual signal — you only notice by reading the entity body directly.
- **Expected outcome**: Blocked entities render with a distinct visual style (greyed-out card + "awaiting captain action" label) on the dashboard entity list and detail page; the `supersedes:` hint surfaces as an actionable next-step line.
- **Explicit non-goals**: No pipeline schema changes, no alignment-gate behavior changes, no FO routing changes, no automated supersession, no retroactive migration of already-shipped entities, no spacebridge/ui stage-graph node work (deferred to entity 094).

## Lens Evidence

### Lens (a) captain-stated-intent

- Blocked entities should render with distinct visual style on stage graph + activity stream so captain sees "waiting for me to open a new entity" -- directive:verbatim [primary]
- Current escape-hatch path writes `context_status: blocked` + `supersedes:` hint but dashboard has zero visual signal; captain only discovers via entity body read -- directive:verbatim [primary]
- Scope: `tools/dashboard/` entity card / graph node rendering; grey-out + "awaiting captain action" label -- directive:verbatim [primary]
- POST blocked event to `/api/events` is optional ("可選") -- directive:verbatim [secondary]
- Hard constraints: no pipeline schema, no alignment-gate edits, no FO routing -- directive:verbatim [primary]
- Captain framing in snapshot: "真正的使用者痛點其實是 entity context_status: blocked 時 dashboard 沒有視覺信號" -- entity:116 Captain Context Snapshot [secondary]

### Lens (b) captain-unstated-intent

- Primary pain is action-gap visibility, not aesthetic polish — label "awaiting captain action" encodes "you are the bottleneck" semantics -- entity:116 directive L29 + L34 [primary]
- Test harness (synthetic `context_status: blocked` entity) is first-class deliverable because no real blocked entity exists yet (escape-hatch has never fired) -- entity:116 empirical-baseline L58 [primary]
- Entity 094 coordination treated as scheduling decision for plan phase, not deferred stretch — three options a/b/c in Notes are explicit delegation -- entity:116 Notes L64 [primary]
- "Not automated supersession" constraint encodes preserving P-4 immutable-pitch human gate — UI must prompt, never auto-create -- entity:116 Scope L49 + L53 [primary]
- Captain assumes `context_status: blocked` already written to YAML at render time — this entity is pure read-side concern -- multi-branch-gate-pattern.md L25-28 [secondary]
- Card-rendering is the acceptance floor; `/api/events` emission is likely stretch because captain named it "optional" -- entity:116 Scope L47-48 (inferred) [secondary]

### Lens (c) codebase-current-state

- `context_status` rendered as clickable filter chips with hardcoded values `["pending","explored","awaiting-clarify","ready"]`; `blocked` falls through via dynamic push -- tools/dashboard/static/app.js:224 [primary]
- Dependency-blocked red badge (`#f85149`) already exists for `ds.status === "blocked"` (dependency semantics, NOT context_status) -- tools/dashboard/static/app.js:369-371 [primary]
- `detail.js` has ZERO `context_status` handling — no grey-out, no status badge, no read of the field -- tools/dashboard/static/detail.js (zero matches) [primary]
- Detail page has `renderPhaseNav` (linear phase nav), not a stage graph — stage-graph node work would be new surface area -- tools/dashboard/static/detail.js:1540 [secondary]
- `AgentEventType` union has no `blocked` — current set is dispatch/completion/gate/feedback/merge/idle/channel/permission/comment/pr_ready/pipeline_error/entity_shipped -- tools/dashboard/src/types.ts:78-81 [secondary]
- `/api/events` POST schema requires type/entity/stage/agent/timestamp; no context_status-change field exists -- tools/dashboard/src/server.ts:613 [tertiary]

### Lens (d) sibling-entity

- Entity 046 (dashboard-context-status-filter, clarify) already renders `context_status` chips at `app.js:223-258` — 116's grey-out touches the same render branch, shared-code conflict at execute time -- entity:046 [primary]
- Entity 094 (warroom-pipeline-graph-visualization) targets `spacebridge/ui/` (Next.js/React/SVG), NOT `tools/dashboard/static/detail.js` — stage-graph rendering lives in different codebase; no direct clash -- entity:094 [secondary]
- Entity 064 (dashboard-mod-visibility, draft) also targets `tools/dashboard/static/` card rendering — if 064 in-flight at 116 execute time, both modify `app.js` same window -- entity:064 [primary]
- `csValues` hardcoded list at `app.js:224` omits `blocked`; 116 must add visual differentiation WITHIN existing render path, not alongside -- entity:046 [primary]
- 094's `feedback-to` dashed-edge gate rendering and 116's blocked gate-node are both gate-node concerns but in separate codebases; no shared CSS/JS -- entity:094 [tertiary]

## Core Tensions

- **domain-based**: Dashboard rendering in `tools/dashboard/static/` (legacy Bun + vanilla JS) vs pipeline graph rendering in `spacebridge/ui/` (Next.js + React). Directive names both but they live in separate codebases — this entity must scope to the Bun dashboard.
- **essential**: Two orthogonal "blocked" semantics must coexist visually without confusing captain — dependency-blocked (`ds.status === "blocked"`, red badge `app.js:369-371`) vs captain-action-blocked (`context_status === "blocked"`, new grey-out). Colour/label differentiation is load-bearing for the diagnostic purpose.

## Honest Boundaries

- Stage-graph node rendering excluded — lives in spacebridge/ui codebase with its own entity (094).
- Retroactive rendering of already-shipped blocked entities excluded — forward-looking only.
- `/api/events` `blocked` emission is optional stretch — card/detail grey-out + label is the acceptance floor.
- Test harness is synthetic because no real blocked entity exists yet (escape-hatch has never fired in practice).

## Brainstorming Spec

**APPROACH**: Extend the existing entity-card renderer in `tools/dashboard/static/app.js` (around line 224, where `csValues` and the `context_status` chip render live) and the detail-page header in `tools/dashboard/static/detail.js` (currently zero `context_status` handling) to check for `frontmatter.context_status === "blocked"`. When true, apply a grey-out CSS class to the card/header and render a small "awaiting captain action" label distinct in colour from the existing red dependency-blocked badge at `app.js:369-371`. Surface the `supersedes:` hint as an actionable text line `Open new entity: /shape "{slug}"` beneath the label. Optionally extend `tools/dashboard/src/types.ts:78-81` with a `blocked` `AgentEventType` and update `/api/events` POST schema (`tools/dashboard/src/server.ts:613`) so the activity stream reflects the transition when FO writes `context_status: blocked`; core deliverable ships without this emission path (read-side only).

**ALTERNATIVE**: Reuse the existing dependency-blocked red badge pattern at `app.js:369-371` (driven by `ds.status === "blocked"`) by extending it to also fire on `context_status === "blocked"` -- D-01 Rejected: conflates two semantically distinct blocked states (dependency-unmet vs captain-action-required). Captain explicitly wants "grey + awaiting captain action", not "red + blocked dep". Reusing red would train captain attention in the wrong direction and defeat the diagnostic purpose stated in the directive.

**GUARDRAILS**:
- No pipeline schema changes — `context_status` field + `supersedes:` hint format are frozen by entity 114's contract (MEMORY.md multi-branch-gate-pattern)
- No alignment-gate skill edits — skill-internal blocked-write path is upstream contract boundary
- No FO routing additions — if blocked-event emission ships, it's a single call added to FO's existing blocked-write path, not new routing
- Coordinate with entity 046 at plan-phase time — both touch `app.js:223-258` render block; verify 046's shipped state and merge order
- Coordinate with entity 064 (draft) — also touches `app.js` card rendering; plan phase must confirm 064 is not concurrently in-flight
- `blocked` grey-out must be visually distinct from dependency-blocked red badge (colour + label both) to preserve the two-semantics separation

**RATIONALE**: Captain's pain is diagnostic — "captain 只能靠看 entity body 才知道" — the blocked signal exists in data but has no perceptual channel. Fixing the perceptual channel in the read-side renderers (app.js card + detail.js header) is the minimum-scope intervention that restores the signal path. Reusing the existing `context_status` render branch at `app.js:224` aligns with entity 046's contract and avoids duplicate status-rendering machinery. The ALTERNATIVE (red dep-badge reuse) would ship faster but confuse two semantically distinct blocked states, defeating the diagnostic purpose. Stage-graph node work is deferred to entity 094 by codebase boundary (spacebridge/ui vs tools/dashboard/static), not by feature aspiration — this entity ships self-contained rendering for the Bun dashboard.

## Acceptance Criteria

- Given an entity with `context_status: blocked` in its YAML frontmatter, when the dashboard renders the entity card in `app.js`, then the card has a greyed-out class and an "awaiting captain action" label visible in the DOM (how to verify: synthesize a test entity with `context_status: blocked`, reload dashboard, inspect card DOM for grey class + label text)
- Given an entity with `context_status: blocked` AND `supersedes: {new-slug}` in frontmatter, when the card renders, then an actionable `Open new entity: /shape "{new-slug}"` line appears beneath the label (how to verify: synthesize test entity with both fields, reload, inspect DOM text + verify slug interpolation)
- Given navigation to an entity detail page where `context_status === "blocked"`, when `detail.js` renders the header, then the page shows the same grey-out + label (how to verify: visit `/entity/{slug}`, inspect detail header DOM)
- Given an entity with `ds.status === "blocked"` (dependency-blocked) but `context_status !== "blocked"`, when the card renders, then the red dep badge still fires independently and NO grey-out class is applied (how to verify: synthesize test entity with only dependency blocked, inspect DOM — red badge present, grey class absent)
- (Optional / stretch) Given FO writes `context_status: blocked` to an entity, when the transition occurs, then a `blocked` event appears in the `/api/events` SSE stream and the activity feed (how to verify: extend `AgentEventType`, hook FO emission, write test entity via FO path, observe SSE + feed)

## Stage Report: brainstorm

- Mode: A (4-lens parallel dispatch via Agent tool)
- α marker count: 0
- Lens support: all 5 APPROACH claims have ≥2 lens citations
- Claim cardinality: APPROACH contains 5 factual claims (within 3-7 target)
- Core Tensions populated: 2 typed entries (domain-based + essential)
- Honest Boundaries populated: 4 bullets
- Tier tags: every citation tagged primary/secondary/tertiary
- Triple-verification gates: all APPROACH claims pass 3/3 (cross-lens recurrence, generative power, sibling exclusivity)
- Alignment gate: deferred (shape_status: n/a, alignment-gate not applicable to non-shape-first entities per entity 114)
- alignment_confidence: N/A
- Intent: feature
- Scale: Small (3 core files: app.js, detail.js, CSS; +2 optional: types.ts, server.ts — worst case 5)
- Scope flag: none (0 decomposition signals)

## Pre-Brainstorm Scope Sketch (informal)

**Expected modifications:**
- `tools/dashboard/static/detail.js` OR `tools/dashboard/static/app.js` — entity card rendering: add grey-out + "awaiting captain action" label when `context_status: blocked`
- `tools/dashboard/src/channel.ts` OR similar — optional: POST a `blocked` event type to `/api/events` when FO detects transition to blocked
- `tools/dashboard/static/detail.js` pipeline graph — optional: stage node visual state when entity is blocked at a gate

**Key behaviors:**
- Entity card grey-out + label — simple CSS/text change on entity render
- `/api/events` new event type `blocked` — FO emits when writing `context_status: blocked`; client reads and shows in activity stream
- supersedes: hint surfacing — show `Open new entity: /shape "{slug}"` as actionable next-step on blocked entity card (stretch)

**Out of scope:**
- Pipeline schema changes (already decided against in MEMORY.md multi-branch-gate-pattern)
- Automated supersession (captain must manually open the new entity — that's the whole point of P-4 immutable-pitch)
- Retroactive rendering of already-blocked entities (forward-looking only; no migration)
- Changes to alignment-gate skill behavior (entity 114 contract, frozen)

**Empirical baseline:**
- No entity currently has `context_status: blocked` at time of this directive — escape-hatch has not fired in practice. This entity lands the infrastructure BEFORE the first real blocked entity appears.
- Dashboard test case can be synthesized: manually set a test entity's `context_status: blocked` + `supersedes:` and verify rendering.

## Notes

- This is a _parked draft_. Run `/build --from blocked-entity-dashboard-rendering` when ready.
- Entity 094 (warroom-pipeline-graph-visualization) may overlap at the stage-graph rendering layer — plan phase should read 094's current state to avoid duplicate work. Options: (a) 116 ships self-contained rendering; (b) 116 defers stage-graph integration to 094; (c) coordinate merge-order with 094.
- This is the second follow-up from entity 114's session — first is entity 115 (`brainstorm-gate-auto-advance-on-shape-validated`, also parked, also depends-on: 114). Both unblock after 114 ships, which is already done. Both can /build now if captain prioritizes.
