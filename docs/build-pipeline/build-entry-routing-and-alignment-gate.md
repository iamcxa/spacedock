---
slug: build-entry-routing-and-alignment-gate
shape_status: draft
context_status: pending
---

## Captain Context Snapshot

- **Invoked**: 2026-04-15 via `/spacedock:build-shape`
- **Captain directive (verbatim)**:

  > build-entry-routing-and-alignment-gate -- (1) /build 總是跑 Sonnet 守門員，hedge-word + concrete-target 兩軸判斷 directive 明確性，明顯不明確時主動提議轉 /spacedock:build-shape；(2) build-shape 可自 seed entity（入口 B）— 看到 raw directive 時呼叫 /build seed 邏輯產 entity 再做 product 對齊，看到 existing slug 只做對齊；(3) SO 管線在 N-lens brainstorm 之後、explore 之前插 alignment-gate — captain 輕量對齊方向，支援「對 → 繼續 deep research」「不對但方向可調 → 回 brainstorm 重跑」「product 層有問題 → escalate 到 build-shape」三條分支。基於 entity 104 (brainstorm-nuwa-distillation, shipped) + 105 (explore-nuwa-subagent-first, shipped) 已落地的 N-lens + subagent-first 架構之上加 stage-editing + 入口編排。

- **Pre-shape conversation context**: Captain and SO diagnosed that SO's 3-stage flow (brainstorm → explore → clarify) is over-engineered for meta / skill-tweak entities. After reviewing entity 102's decomposition children (104 shipped 1.00, 105 shipped 0.99 — N-lens + subagent-first already landed), captain proposed three additions on top: (a) Sonnet gatekeeper on `/build` to auto-suggest `/shape` when directive is unclear, (b) `/shape` as an independent entry that can self-seed entities from raw directives, (c) alignment-gate between brainstorm and explore with three branches (continue / retry brainstorm / escalate to shape). Two captain decisions locked before invoking shape: gatekeeper lives inside `/build` (not captain self-judgment), shape auto-seeds on raw directive (option β).
