---
id: 123
title: "Spacedock core reshape — FO/ensign architecture, upstream alignment, workflow-as-plugin framework"
slug: spacedock-core-reshape-workflow-as-plugin
status: draft
context_status: pending
source: /shape (post-PR #55 strategic pivot, 2026-04-16)
created: 2026-04-16T00:00:00+08:00
shape_status: draft
intent:
scale:
project: spacedock
---

## Captain Context Snapshot

**Raw directive** (2026-04-16): spacedock 的 FO/ensign/workflow 架構重塑，結合 upstream (clkao) 演進 + fork (iamcxa) 特色 + workflow-as-plugin 目標

**Session context**:
- PR #54 opened as upstream clkao review artifact (368 non-UI files drifted)
- PR #55 opened as focused FO shared-core merge using new A-B-C-D-E protocol (57/57 invariants pass)
- Captain proposed workflow-as-plugin framework earlier this session, parked pending upgrade
- Captain pivoted to redesign approach — merge protocol won't scale to 6 more drifted files and doesn't serve workflow-as-plugin goal
- Entity 040 (plugin-architecture-v2) + entity 060 (engine/bridge cutover) are the architectural endpoints this reshape serves

**Three concerns to be unified in shape**:
1. Absorb upstream (clkao) semantic evolution (#58 runtime adapter, #97 FO Write Scope, #157 model routing, #159 grep discipline, #148 pytest migration, debrief skill)
2. Preserve fork (iamcxa) feature surface (Event Emission, Effective Stages, Brainstorm Triage, Channel Awareness, Confidence Gate, Dashboard wiring, Layered mods)
3. Enable workflow-as-plugin framework shape where workflow = skills + workflow-meta + officers packaged as composable plugin unit

## Problem Statement

Spacedock 今天是以單一 monolithic CC plugin 出貨 — skills / workflow pipeline / agents 全部 entangled 在一個 `.claude-plugin/plugin.json` 底下，即使 captain 長期以來的工作模型一直把 workflow 當成 `{skills/, workflow/, agents/}` 這樣一個可組合的單元，第三方應該能 author 並 plug 進一個共享的 engine。想在 upstream 上疊 dashboard、channel、或自訂 gate 行為的 fork 貢獻者無法表達這個意圖 — 除了 fork 整個 repo 之外 — 而這恰好就是目前 drift 累積的方式。Captain 要做其他 workflow（overhaul、spacebridge、未來 domain-specific pipelines）也沒有能 target 的 contract，除非把整個 engine vendor 進來。這現在重要是因為每一場架構對話 — engine/bridge split、FO redesign、workflow-as-plugin — 都預設了一個還沒存在於 codebase 裡的組合邊界，而繼續圍繞這個隱性邊界做設計會產出 skills 的依賴只能靠讀每個檔案才能理解。

## User Stories

- **US-1**: As a fork maintainer, I want to drive multiple workflow plugins with the same FO engine, so that I can upgrade upstream spacedock core without re-merging my domain-specific pipeline logic each time.
- **US-2**: As an upstream contributor, I want a stable engine contract to contribute against, so that my changes to core primitives don't silently break fork maintainers' workflows.
- **US-3**: As a downstream plugin author, I want to express a domain-specific workflow as a plugin that registers against a shared engine, so that I can ship and maintain it independently without forking the entire spacedock repo.
- **US-4**: As an end-user captain, I want FO behavior to remain consistent regardless of which workflow plugin is active, so that I can run entities without needing to understand the underlying plugin composition.
- **US-5**: As a fork maintainer, I want composition boundaries between engine, workflow, and skills to be explicit and machine-readable, so that dependency relationships don't require reading every file to understand.

## Scope: In

1. **FO fork-additions 盤點** — 完整列出 fork 在 FO shared-core / SKILL 加的所有東西，對應到「需要什麼 hook point 才能從 upstream 註冊進來」：
   - Event Emission → `lifecycle-event` hook (dispatch/completion/gate/feedback/merge/idle)
   - Brainstorm Triage → `pre-dispatch-inline` hook
   - Channel Awareness → `channel-message-resolution` hook
   - Dashboard check → `startup-check` hook
   - Pre-Ship Confidence Gate → `pre-terminal-gate` hook
   - Pending Knowledge Captures → `post-completion` hook
   - Effective Stages → 可能是 workflow-internal 不需 hook（看 upstream 既有 profile 機制夠不夠）
   - Layered mods → `mod-discovery-extension` hook（已承諾推 upstream PR）

2. **Upstream hook point PR 提案** — 每個 hook point 向 clkao 提 PR，順序由小到大：先 Layered mods（最小 scope，第一筆試水溫），後 Lifecycle events、Channel resolution、Pre-terminal gate 等。每個 PR 獨立，clkao 可各自 accept/reject。

3. **Discovery 機制確認** — 確認 upstream `status --discover` 是否已能掃外部 CC plugin 的 `commissioned-by:` README，不足則補 PR。已知 upstream 的 Plugin-manifest fallback (`.spacedock/workflows/*/manifest.yaml`) 有 partial 支援，需驗證對獨立 CC plugin 可用。

4. **Fork 特色抽成獨立 CC plugin** — 把 fork 的 build-pipeline / spacebridge 分別包成獨立 `.claude-plugin/plugin.json` plugin：
   - `spacedock-build-pipeline` (workflow plugin — entities + README + workflow mods)
   - `spacebridge` (UI/dashboard/channel — hooks lifecycle events + channel resolution)

5. **插拔式註冊實作** — 每個 hook point 在 fork plugin 裡以 hook registration 檔實作，upstream spacedock 驅動時自動載入。

6. **Interim shim 層** — 在 upstream 還沒 accept PR 的期間，fork plugins 可以附帶 minimal shim 補回缺失 hook。每個 shim 明確標記「待 upstream PR #XXX 合併後移除」。

7. **End-to-end 驗收** — 最終可以在乾淨 upstream spacedock（非 fork）上 install `spacedock-build-pipeline` + `spacebridge` CC plugins，跑一個 entity 過完整 pipeline，dashboard 正常、channel 正常、confidence gate 正常。

8. **Fork repo 轉型** — iamcxa/spacedock 從「fork of clkao/spacedock」轉成「marketplace 提供 spacedock-build-pipeline + spacebridge 兩個 CC plugins」的 repo。原本的 upstream 差異 (PR #54) 關閉；shared-core merge (PR #55) 關閉。

## Scope: Out

1. **Big composition contract / manifest schema 設計**（本次不做 — CC 既有 plugin discovery 機制夠用，不發明新格式）
2. **Plugin marketplace / registry**（本次不做 — Phase F+ 的事）
3. **API break**（永不做 — hook points 設計必須 backward compatible）
4. **Fork 裡其他雜項升級**（本次不做 — pytest migration、codex runtime、path reorg 這些是 upstream 內部 refactor，fork transitioning 後直接用 upstream 的版本）
5. **Upstream debrief skill absorb**（本次不做 — upstream 留著 upstream 用，不 absorb 進 fork）
6. **新 domain-specific workflow plugin 實作**（本次不做 — overhaul plugin、其他 workflow 未來各自 entity）
7. **Hook point PR 被 clkao 拒絕的備案架構**（本次不做 — 先試試 upstream 接受度，全拒再回頭設計 fallback）

## References

- **Session PRs**:
  - PR #54 https://github.com/iamcxa/spacedock/pull/54 (upstream sync review artifact)
  - PR #55 https://github.com/iamcxa/spacedock/pull/55 (focused FO shared-core merge; to be closed post-reshape)
- **Related entities**:
  - Entity 040 `docs/build-pipeline/spacedock-plugin-architecture-v2.md` (plugin-architecture-v2 vision, historical reference)
  - Entity 060 `docs/build-pipeline/spacebridge-cutover-remove-static-ui.md` (engine/bridge cutover, context_status: ready; this reshape supersedes via workflow-as-plugin framing)
- **Upstream evolution referenced**:
  - clkao PR #58 (runtime-aware entrypoints), #97 (FO Write Scope), #148 (pytest migration), #157 (model routing), #159 (grep discipline)
  - upstream debrief skill (new, not absorbed)
- **Upgrade protocol artifacts** (`spacebridge/upgrades/2026-04-16-clkao-sync/`):
  - `POC-REPORT.md`, `STEP-3-DECISION.md`, `MIGRATION-PLAN-shared-core.md`
  - `goldens/first-officer/scenario-01-startup.{upstream,fork,merged}.output.md`
  - `goldens/first-officer/scenario-02-dispatch.merged.output.md`
  - `goldens/first-officer/scenario-03-completion-gate.merged.output.md`
  - `goldens/first-officer/UNION-INVARIANTS.md`
  - `lib/build-reference-graph.sh`
  - `triage.yaml`
- **Fork shared-core consumer mapping**:
  - `skills/first-officer/SKILL.md` (loads shared-core)
  - `skills/ensign/SKILL.md` (loads ensign-shared-core; potential transitive dependency)
- **MEMORY references**:
  - `~/.claude/projects/-Users-kent-Project-spacedock/memory/spacedock-is-cc-plugin.md`
  - `~/.claude/projects/-Users-kent-Project-spacedock/memory/workflow-evolution-gap.md`
  - `~/.claude/projects/-Users-kent-Project-spacedock/memory/so-fo-session-boundary.md`

## Stage Report: shape

**Directive**: spacedock 的 FO/ensign/workflow 架構重塑，結合 upstream (clkao) 演進 + fork (iamcxa) 特色 + workflow-as-plugin 目標

**Subagent dispatches**:
- `spacedock:build-shape-framer` — produced 3 candidates (A drift/merge cost, B composability gap, C FO contract incoherence); captain selected **B**
- `spacedock:build-shape-story-gen` — produced 5 stories (US-1 through US-5); captain accepted **all 5** (kept English)
- `spacedock:build-shape-scope-drafter` — produced v1 with 10 In / 9 Out; captain rejected as over-scoped (misread composition contract as new schema rather than discovery + hooks); SO reframed inline to v2 with 8 In / 7 Out aligned to Candidate 2 (discovery + upstream hook points); captain accepted v2 **全收**

**Captain accept counts**:
- Problem statements: 1 accepted (B)
- User stories: 5 accepted
- Scope In: 8 accepted
- Scope Out: 7 accepted

**Decomposition gate**: Not triggered. All scope items share the same problem statement (composition boundary missing) and user population (fork maintainer / upstream contributor / downstream plugin author / end-user captain).

**Key captain clarification mid-shape**:
Original scope-drafter v1 framed "composition contract" as a new manifest schema. Captain corrected the framing: workflow already = a CC plugin conceptually; what's missing is upstream's ability to discover + drive fork's build-pipeline as a separate plugin. SO presented 3 candidates for "middle missing piece"; captain chose Candidate 2 (discovery + upstream hook points + upstream PR push path).

**Status transition**: shape_status: draft → validated

## Pending Knowledge Captures

<capture>
**Type**: skill UX improvement (build-shape)
**Observation**: AskUserQuestion 的 preview 欄位對長段落（3-6 sentence problem statements / scope items / user stories）太窄，captain 看不到全文。
**Pattern that works**: 先在對話主線列出完整候選內容，AskUserQuestion 只用短 label + description 當選擇器。preview 適合 ASCII mockup / code snippet 這類固定寬度藝術品，不適合中長段落文字。
**Scope**: 影響 build-shape Steps 3/4/5 的所有 AskUserQuestion 呼叫。build-clarify 類似場景也可能適用。
**Recommended edit target**: `skills/build-shape/SKILL.md` Step 3/4/5 的 AskUserQuestion 示例要加 note：「long-form content 不要放 preview，改放對話主線」。
</capture>

<capture>
**Type**: skill process improvement (build-shape scope-drafter)
**Observation**: scope-drafter 首次產出時容易 over-scope — 把「解決問題」擴張為「設計新架構 / 新 schema / 新格式」。Captain 需要明確的 reframe 才能把 scope 壓回務實範圍。
**Pattern that works**: scope-drafter 的 prompt 裡應該明確要求「optimize for minimal viable change」，並提供「這次 NOT doing」的 ceiling 提示。單純「產出 in/out list」缺少尺規。
**Scope**: 影響所有 build-shape 的 Medium+ scope 階段；Small scope 可能不需要。
**Recommended edit target**: `skills/build-shape/SKILL.md` Step 5 scope-drafter dispatch prompt 加入 "bias toward minimal viable scope" 和 "list explicit out-of-scope ceilings" instructions。
</capture>

<capture>
**Type**: skill philosophy improvement (build-shape — captain-directive-as-hypothesis)
**Observation**: Captain's directive is often *initial hypothesis*, not *final requirement*. This shape session demonstrated the pattern: captain directive said "reshape + upstream + fork + workflow-as-plugin" (combined). Scope-drafter v1 took the directive literally and produced an over-scoped "design new composition contract" plan. Captain then corrected with a **different framing**: "workflow 就是一個 CC plugin, 缺的只是 discovery + hook points." That reframe cut scope ~60%. The SO agent only surfaced this by asking "是不是用 build-shape 參考現有的兩邊架構，直接重做一次會更快？" — an explicit gap-to-goal question.
**Pattern that works**: build-shape should have an explicit **gap-to-goal pressure test** step (new Step 5.5 or baked into Step 5) where SO challenges: (a) what is the actual goal the captain wants to reach? (b) what is the current gap? (c) does the proposed scope actually close that gap the fastest way? If the answer is "the scope is doing more than needed" or "there's a simpler path", SO must present the alternative to captain before finalizing scope.
**Scope**: All build-shape sessions (Medium+). This is not scope-drafter's job alone — it's SO's job to pressure-test captain's own framing. Skill should make this explicit rather than rely on captain accidentally asking the right question.
**Recommended edit target**: `skills/build-shape/SKILL.md` between Steps 5 and 6, add a new Step 5.5 "Gap-to-goal pressure test" with explicit AskUserQuestion prompting captain: "這個 scope 真的是達成你目標的最短路徑嗎？有沒有更簡單的做法我們漏看了？" before committing scope. Also update the shape skill's SKILL.md philosophy intro to state: "Captain's directive is initial hypothesis. SO's job is to pressure-test that hypothesis before committing to scope."
**Meta-observation**: This capture itself is evidence — captain had to tell SO "build-shape 也要吸收這個經驗" after observing the session. Without this explicit instruction, the pattern would stay a one-off improvisation rather than skill-level discipline.
</capture>

