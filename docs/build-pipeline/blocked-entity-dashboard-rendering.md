---
id: 116
title: Blocked-Entity Dashboard Rendering -- context_status Visibility for Escape-Hatch Branches
slug: blocked-entity-dashboard-rendering
status: clarify
context_status: blocked
supersedes: blocked-entity-spacebridge-ui-rendering
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

## Park Note (2026-04-16, clarify)

⚠️ **Entity 116 is parked with `context_status: blocked` pending a spacebridge/ui successor.**

During Step 4.5 open exploration of clarify, captain surfaced the architectural contradiction that explore missed: **this entity targets `tools/dashboard/static/*`, which entity 060 (`spacebridge-cutover-remove-static-ui`, clarify/ready) plans to delete**. Entity 060 gates on 059 shipped + 4 parity entities shipped (spacebridge-dependency-graph-view, spacebridge-workflow-visualizer, spacebridge-entity-body-editor, spacebridge-version-history). The rendering work (A-1, A-2, A-3, O-1, Q-1, Q-2) would target dead code; only the data-layer half (A-5, A-6, O-2 — frontmatter-io.ts extension) survives 060.

**Escape-hatch per entity 114's multi-branch-gate pattern**: writing `context_status: blocked` + `supersedes: blocked-entity-spacebridge-ui-rendering`. Captain must open the new entity via `/shape "blocked-entity-spacebridge-ui-rendering"` when parity work clarifies.

**What carries forward to the successor entity:**
- Goal Check, Core Tensions, Honest Boundaries — unchanged (same user pain, same semantic boundaries)
- A-4 (046 shipped contract) — unchanged
- A-5 + O-2 (supersedes parse path via frontmatter-io.ts) — **still valid**; frontmatter-io.ts survives 060 per design doc §2.4
- A-6 (AgentEventType extension pattern) — unchanged
- O-3 self-resolution (defer events emission) — unchanged
- Q-1 answer "awaiting captain action" microcopy — unchanged
- Q-2 answer `.context-blocked` class — **re-scope to Next.js/Tailwind**; class concept carries, CSS system changes
- O-1 (label placement inline next to title) — **re-scope to React component tree**; design intent carries

**What needs fresh work in the successor:**
- Target files: `spacebridge/ui/app/entity/[slug]/page.tsx` + sibling components (replace app.js/detail.js)
- CSS system: Tailwind classes instead of vanilla CSS
- Event emission path: if O-3 ever flips, integrate with Next.js SSE feed (entity 053) instead of /api/events
- Sibling coordination: entity 094 (warroom-pipeline-graph-visualization, spacebridge/ui/) is now a sibling, not a deferred concern

**Self-referential observation**: this entity is the first real `context_status: blocked` test case — it is dogfooding the exact escape-hatch pattern it was designed to visualize. When the successor ships, 116's park state should render as the first grey-out card in the dashboard (after cutover: in spacebridge/ui).

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

**APPROACH**: Extend the existing entity-card renderer in `tools/dashboard/static/app.js` (around line 224, where `csValues` and the `context_status` chip render live) and the detail-page header in `tools/dashboard/static/detail.js` (currently zero `context_status` handling) to check for `frontmatter.context_status === "blocked"`. When true, apply a grey-out CSS class to the card/header and render a small "awaiting captain action" label distinct in colour from the existing red dependency-blocked badge at `app.js:369-371`. Surface the `supersedes:` hint as an actionable text line `Open new entity: /shape "{slug}"` beneath the label. (⚠ gap surfaced by explore: `supersedes` field is NOT currently parsed by frontmatter-io.ts — blocks this claim until O-2 resolves the parse path; see A-5) Optionally extend `tools/dashboard/src/types.ts:78-82` (✓ confirmed by explore: extension pattern unchanged, actual line span is 78-82) with a `blocked` `AgentEventType` and update `/api/events` POST schema (`tools/dashboard/src/server.ts:613`) so the activity stream reflects the transition when FO writes `context_status: blocked`; core deliverable ships without this emission path (read-side only).

**ALTERNATIVE**: Reuse the existing dependency-blocked red badge pattern at `app.js:369-371` (driven by `ds.status === "blocked"`) by extending it to also fire on `context_status === "blocked"` -- D-01 Rejected: conflates two semantically distinct blocked states (dependency-unmet vs captain-action-required). Captain explicitly wants "grey + awaiting captain action", not "red + blocked dep". Reusing red would train captain attention in the wrong direction and defeat the diagnostic purpose stated in the directive.

**GUARDRAILS**:
- No pipeline schema changes — `context_status` field + `supersedes:` hint format are frozen by entity 114's contract (MEMORY.md multi-branch-gate-pattern)
- No alignment-gate skill edits — skill-internal blocked-write path is upstream contract boundary
- No FO routing additions — if blocked-event emission ships, it's a single call added to FO's existing blocked-write path, not new routing
- Coordinate with entity 046 at plan-phase time — both touch `app.js:223-258` render block; verify 046's shipped state and merge order (⚠ contradicted by explore: 046 is shipped/archived — downgrade to "respect shipped contract at app.js:223-258", no concurrent conflict — see A-4)
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

## Assumptions

### A-1 -- `context_status` field already read in the entity-card render scope

- Confidence: Confident (0.98)
- Evidence: `tools/dashboard/static/app.js:227` reads `e.context_status` to build csCounts; rendering a grey-out class just adds a conditional at the card-build site, same scope. [primary]
- Implication: no frontmatter-io plumbing needed for the grey-out half of APPROACH; renderer already has access.
- → Confirmed: SO self-verified, 2026-04-16 (session-verified via sed app.js:220-260)

### A-2 -- Dependency-blocked (`ds.status === "blocked"`) and context-status-blocked are visually and semantically distinct and must stay distinct

- Confidence: Confident (0.97)
- Evidence: `tools/dashboard/static/app.js:369-371` dep-badge uses red `#f85149` + `🚫 →` emoji prefix, driven by `ds.status` (dependency resolution state). `context_status` is frontmatter, driven by skill writes. Two different data paths, two different meanings. [primary]
- Implication: APPROACH must pick a colour and vocabulary clearly distinct from red + 🚫.
- → Confirmed: SO self-verified, 2026-04-16 (session-verified via sed app.js:365-375)

### A-3 -- `detail.js` has zero `context_status` handling today

- Confidence: Confident (0.95)
- Evidence: `grep -n context_status tools/dashboard/static/detail.js` returns zero matches (re-verified this session). No existing branch to extend — detail-page grey-out is greenfield. [primary]
- Implication: detail.js change is an additive feature, not a modification of an existing render branch.
- → Confirmed: SO self-verified, 2026-04-16 (grep verified zero matches this session)

### A-4 -- Entity 046 (`dashboard-context-status-filter`) is shipped and its chip-render contract at `app.js:223-258` is frozen

- Confidence: Confident (0.96)
- Evidence: `docs/build-pipeline/_archive/dashboard-context-status-filter.md` — `status: shipped, verdict: PASSED, context_status: ready`. INDEX.md shows 046 in clarify but INDEX is stale (last rebuilt 2026-04-12, misses 114/115/116). [primary]
- Implication: 046 is not a concurrent-flight conflict risk; it is a contract to respect. 116's grey-out class attaches to the card element, not to 046's chip pipeline. Downgrades the brainstorm GUARDRAIL "coordinate with in-flight 046" to "respect shipped 046 contract at app.js:223-258".
- → Confirmed: SO self-verified, 2026-04-16 (grep _archive frontmatter verified status: shipped verdict: PASSED)

### A-5 -- `supersedes` frontmatter field is NOT currently parsed or exposed by the dashboard

- Confidence: Confident (0.94)
- Evidence: `grep -c supersedes tools/dashboard/static/*.js tools/dashboard/src/*.ts` returns 0 matches across the render tree. Field exists in entity YAML (written by alignment-gate per entity 114 contract) but nothing reads it. [primary]
- Implication: Rendering the actionable `Open new entity: /shape "{new-slug}"` line requires first parsing `supersedes` — blocks APPROACH's supersedes-surfacing claim unless O-2 resolves the parse path. This was silent in brainstorm Lens (c).
- → Confirmed: SO self-verified, 2026-04-16 (grep 0 matches verified this session)

### A-6 -- `AgentEventType` at `types.ts:78-82` is a string-union extensible by adding a literal

- Confidence: Confident (0.92)
- Evidence: Current union is `"dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle" | "channel_message" | "channel_response" | "permission_request" | "permission_response" | "comment" | "suggestion" | "gate_decision" | "share_created" | "rollback" | "pr_ready" | "pipeline_error" | "entity_shipped"` at `tools/dashboard/src/types.ts:78-82`. Standard TS discriminated-union extension pattern. [secondary]
- Implication: Optional `/api/events blocked` emission is a 1-token addition + a server-side validator update; no schema migration. Lens (c) under-counted (6 vs 18 variants) but the extension pattern is unchanged.
- → Confirmed: SO self-verified, 2026-04-16 (types.ts:78-82 18-variant union verified this session)

## Option Comparisons

### O-1 -- Where to render the "awaiting captain action" label on the entity card

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Inline badge next to the entity title in card header | Maximum visual prominence; captain sees it at same scan point as title | Competes with existing title + status pill area for horizontal space | Low | ✅ Recommended |
| (b) Separate banner row beneath card header | Higher visibility than (a), dedicated real estate | Increases card height; inconsistent with compact card design for non-blocked entities | Low | Viable |
| (c) Badge appended to the existing `context_status` chip pipeline | Reuses 046's chip rendering contract; minimal new surface | Bucket-filter chip semantics (click-to-filter) don't fit "awaiting captain action" call-to-action; mixes two UX affordances | Medium | Rejected -- UX conflict with 046 chip's filter semantics |

Recommendation (a) places the label at the highest-attention scan point (next to entity title), preserves card height compactness for the 99% non-blocked case, and keeps the two semantics (blocked chip as filter vs blocked label as call-to-action) in separate UI affordances.

→ Selected: (a) Inline badge next to entity title in card header (captain, 2026-04-16, interactive)

### O-2 -- How to source `supersedes` for rendering the actionable next-step line

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Extend `tools/dashboard/src/frontmatter-io.ts` to parse `supersedes` field; expose on Entity shape | Canonical path; all renderers get access; future-proof for other consumers | Touches shared domain module — requires TS type update + test | Medium | ✅ Recommended |
| (b) Parse `supersedes` inline in `app.js` via direct YAML scan of entity body | No shared-module change; self-contained in 116's scope | Duplicates YAML parsing; fragile if frontmatter format shifts; violates existing frontmatter-io abstraction | Low | Rejected -- violates abstraction boundary |
| (c) FO writes `supersedes` into a synthetic `/api/events blocked` event payload; renderer reads event, not frontmatter | Decouples renderer from entity YAML shape; natural fit if events path ships | Requires the optional events path to be non-optional; blocks card rendering on event arrival timing | Medium | Viable — only if O-3 selects "include events" |

Recommendation (a) keeps YAML parsing centralized in frontmatter-io.ts (A-5 confirmed nothing parses it today), aligns with how other fields are plumbed, and unblocks the supersedes-surfacing half of APPROACH without depending on the optional events path.

→ Selected: (a) Extend frontmatter-io.ts to parse supersedes field (SO self-resolved, 2026-04-16) — forced by: (1) O-3 self-resolved to (b) defer events, which eliminates option (c) [events payload]; (2) option (b) [inline YAML parse] rejected on abstraction-discipline grounds per captain-preferences.md; (a) is the only remaining viable path. Captain may override by explicit override in review.

### O-3 -- Scope boundary for `/api/events blocked` emission

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Include events emission in this entity's scope (extend `AgentEventType` + FO emit call) | Full activity-stream coverage at ship; richer blocked-state UX | Adds ~2 files (types.ts, FO caller) + test surface; may blow Small scale budget if FO emit wiring is non-trivial | Medium | Viable |
| (b) Defer events emission to a follow-up entity; ship card grey-out + label only | Keeps 116 Small and self-contained; matches captain's "optional 可選" framing | Activity feed misses the blocked transition signal until follow-up ships | Low | ✅ Recommended |

Recommendation (b) matches captain's explicit "可選" framing and the empirical baseline: no blocked entity exists yet, so activity-stream miss is zero-impact at ship time. Defer to a Phase E+1 candidate (already noted in MEMORY.md phase-e-plus-1-candidates.md).

→ Selected: (b) Defer events emission to a follow-up entity (SO self-resolved, 2026-04-16) — directive verbatim "可選：POST blocked 事件到 /api/events" is [primary]-tier captain statement pinning the default to "optional → defer"; code-evidence self-filter confirmed primary evidence auto-resolution per build-clarify Step 2 GUARDRAIL. Captain may override by explicit override in review.

## Open Questions

### Q-1 -- Label microcopy: "awaiting captain action" vs alternatives

- Domain: User-facing Visual
- Why it matters: The label is a call-to-action. "Awaiting captain action" is directive verbatim but may read stiff; shorter alternatives may communicate faster. This is cosmetic but load-bearing for diagnostic speed.
- Suggested options:
  - (a) "awaiting captain action" (directive verbatim) -- preserves captain's own phrasing
  - (b) "needs new entity" -- shorter, more action-focused
  - (c) "blocked — open new entity" -- explicit verb
- [secondary]
- → Answer: (a) "awaiting captain action" -- directive verbatim (captain, 2026-04-16, interactive)

### Q-2 -- CSS token for grey-out: reuse existing muted/disabled tokens or introduce a new `.blocked` class?

- Domain: User-facing Visual
- Why it matters: Existing muted/disabled tokens may conflict semantically (disabled = system unavailable; blocked = captain-action-required). A dedicated class keeps semantics clean but adds CSS surface.
- Suggested options:
  - (a) Reuse existing `.muted` / `.disabled` token if one exists -- minimum CSS surface -- ⚠ eliminated by self-filter: no `.muted` or `.blocked` class exists today (only `:disabled` on buttons at detail.css:788)
  - (b) Introduce `.context-blocked` class with custom grey + label styling -- clean semantics, small new surface
  - (c) Defer to whichever pattern 094's spacebridge/ui graph ends up using -- forward-compat with future stage-graph work
- [secondary]
- → Answer: (b) Introduce `.context-blocked` class with custom grey + label styling (captain, 2026-04-16, interactive)

## Core Tensions

- **domain-based**: Dashboard rendering in `tools/dashboard/static/` (legacy Bun + vanilla JS) vs pipeline graph rendering in `spacebridge/ui/` (Next.js + React). Directive names both but they live in separate codebases — this entity must scope to the Bun dashboard.
- **essential**: Two orthogonal "blocked" semantics must coexist visually without confusing captain — dependency-blocked (`ds.status === "blocked"`, red 🚫 badge at `app.js:369-371`) vs captain-action-blocked (`context_status === "blocked"`, new grey-out). Colour and vocabulary differentiation is load-bearing for the diagnostic purpose.

## Honest Boundaries

- Stage-graph node rendering excluded — lives in spacebridge/ui codebase with its own entity (094).
- Retroactive rendering of already-shipped blocked entities excluded — forward-looking only.
- `/api/events` `blocked` emission deferred (O-3 recommendation (b)) — follow-up Phase E+1 candidate.
- Test harness is synthetic because no real blocked entity exists yet — escape-hatch has never fired in practice.
- Recommendation validation for O-1/O-2/O-3 was performed inline against Honest Boundary of "respect shipped 046 contract" (no return-value trace applicable — this is pure view layer).

## Stage Report: explore

- [x] Mode: B (inline single-pass fallback -- Small entity, target files pre-mapped by brainstorm Lens (c))
- [x] Files mapped: 5 across frontend, contract
  frontend: 2 (app.js, detail.js), contract: 1 (types.ts), config: 1 (server.ts), domain-like: 1 (frontmatter-io.ts). Scale confirmed Small (≤5 files).
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 through A-6 all Confident (0.92-0.98) via direct file:line evidence.
- [x] Options surfaced: 3
  O-1 label placement; O-2 supersedes parse path; O-3 events emission scope boundary.
- [x] Questions generated: 2
  Q-1 label microcopy; Q-2 grey-out CSS token.
- [x] α markers resolved: 0 / 0
  Brainstorm emitted 0 α markers; none to consume.
- [x] Brainstorm claim verification: 4 confirmed, 1 contradicted, 1 clarified
  ✓ app.js:224 csValues; ✓ app.js:369-371 dep badge; ✓ detail.js zero handling; ✓ types.ts AgentEventType (actual line range 78-82, superset of Lens (c) claim but same pattern); ⚠ GUARDRAIL "coordinate with in-flight 046" contradicted — 046 is shipped/archived, downgraded to "respect shipped contract"; clarification: `supersedes` field not currently parsed (new A-5 + O-2 surface).
- [x] Scale assessment: confirmed Small (≤5 files; 3 core + 2 optional)
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident ≥0.92, no external tech claims; pure codebase view-layer)
- [x] Mode A 4-angle fallback note: inline Mode B chosen per heuristic "Small entity with well-known target files pre-mapped in brainstorm Lens (c)". Stage Report transparency warning:
  ⚠ Mode B fallback -- 4-angle quality not achieved this invocation (acceptable for this Small/pre-mapped case; plan-phase may treat as known coverage gap)
- [x] Self-test gate (Port 11): all gates pass
  Gate (i) cross-layer recurrence: N/A in Mode B per Port 11 Mode B modifier
  Gate (ii) Track A evidence depth: PASS (all 6 assumptions ≥2 evidence via file:line + cross-module grep)
  Gate (iii) Track B alternative completeness: PASS (O-1/O-2/O-3 each have 2-3 options + 1 Recommended)
  Gate (iv) Track C option surfacing: PASS (Q-1/Q-2 each have 3 suggested options)
  Gate (v) Evidence tier tagging: PASS (all Evidence lines end [primary] or [secondary])
  Gate (vi) Core Tensions typing: PASS (2 entries, both typed domain-based + essential)
- [x] Follow-up: INDEX.md is stale (last rebuilt 2026-04-12 per file footer; missing entities 114/115/116). Workflow-index rebuild hook appears not fired. Not blocking 116 but noting for a separate maintenance pass.

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Small scope, no children proposed
- [x] Re-validation: 6 assumptions checked, 0 stale, 0 contradicted, 0 deduped, 1 coverage gap (Q-2 narrowed via self-filter — `.muted`/`.blocked` class absent), 0 research re-validated
- [x] Assumptions confirmed: 6 / 6 (0 corrected) -- all SO self-verified via session-collected evidence per SO-self-investigation-first discipline
- [x] Options selected: 3 / 3 -- O-1 (captain: inline next to title); O-2 (SO self-resolved: frontmatter-io.ts extension); O-3 (SO self-resolved: defer events per directive "可選")
- [x] Questions answered: 2 / 2 -- Q-1 "awaiting captain action" (directive verbatim); Q-2 .context-blocked class (after (a) eliminated by self-filter)
- [x] Self-filter: 1 self-resolved (Q-2 option (a) narrowed), 2 captain-escalated (O-1, Q-1); O-2/O-3 SO-self-resolved under [primary]-tier evidence
  clarify_self_filter_ratio: 0.50 (5 SO-resolved / 10 total: 6 A batch + O-2 + O-3 + Q-2 option narrow vs O-1 + Q-1 + Q-2 final escalated to captain)
- [x] Open exploration: 1 gray area surfaced via captain freeform (0 from templates, 0 from CONTRACTS, 0 from directive, 1 via captain) -- **material architectural contradiction: tools/dashboard/static cutover (entity 060) invalidates rendering target**
- [x] Canonical refs added: 0 (entity 060 referenced inline in Park Note; already discoverable via docs/build-pipeline tree)
- [x] Context status: **blocked** (escape-hatch per entity 114 multi-branch-gate pattern)
- [x] Handoff mode: n/a -- entity parked, no FO handoff. Captain must open `blocked-entity-spacebridge-ui-rendering` via /shape when parity work clarifies.
- [x] Clarify duration: 4 AskUserQuestion calls (1 sequencing + 3 captain decisions in clarify) + 1 captain observation that inverted the outcome

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
