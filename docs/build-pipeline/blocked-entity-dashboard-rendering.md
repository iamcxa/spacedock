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
