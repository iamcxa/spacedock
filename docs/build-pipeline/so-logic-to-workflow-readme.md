---
id: 122
title: "Move SO Orchestration Logic to Build-Pipeline Workflow README"
status: draft
context_status: none
source: captain observation during entity 119 explore (2026-04-16)
created: 2026-04-16T21:15:00+08:00
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
parent:
children:
depends-on: []
---

## Directive

> `agents/science-officer.md` 目前累積了一批其實屬於 build-pipeline 契約的邏輯 — 狀態機路由表（status × context_status → next skill）、SO-direct mode 下的 `context_status` + `status` transition 寫入規則、post-brainstorm research dispatch cap（≤2）、no-question auto-advance 規則、三階段 skill 完成後的 Stage Report 契約。這些規則與「誰在 driver seat」無關，應移到 `docs/build-pipeline/README.md` 作為 workflow 契約單一真相源，讓 `/build`、FO dispatch ensign、SO-direct 三條路讀同一份文件。留在 SO agent 的應只有 persona-specific 的東西：Star Trek 口吻 / AskUserQuestion session-start 載入 / FO handoff session-boundary（需要新 CC instance 建 worktree）/ 不 dispatch-不執行-不寫 code 的三條 Boundary。這對應 README 目前處理 execute/quality/review/uat 的作法 — 規則在 README，stage skill reference 那份契約。

## Captain Context Snapshot

- **Repo**: main @ 9a5170b5
- **Session**: 捕捉於 entity 119 explore 過程中（2026-04-16）。剛加入 SO agent 的「no-question auto-advance」規則又一次揭露：這類規則其實是 discuss-phase workflow 契約，不屬於 SO persona。
- **Domain**: Readable/Textual（workflow 契約文件）; Organizational（跨 agent 邊界重新切分）
- **Scope flag**: ⚠️ likely-decomposable（跨 3+ agent 檔案：science-officer.md / first-officer.md / ensign.md / README.md + 3 個 stage skill 可能要更新 reference）— 留給 explore 確認
- **Related entities**: 113 `/build` gatekeeper（supersedes 103）; 114 alignment-gate first-class stage 抽取（先例：從 SO Step 3.6 抽到獨立 skill/stage）; 060 spacebridge-cutover（parent of 119 where this was surfaced）
- **Created**: 2026-04-16T21:15:00+08:00

## Goal Check

You are asking for the state-machine and stage-transition rules currently living in the Science Officer agent file to move to the build-pipeline workflow README, so all orchestrators (SO-direct, FO-dispatched ensigns, future alternatives) read one canonical contract instead of peering into a persona definition.

- **Problem being solved**: SO agent file accumulates workflow rules invisible to FO/ensign; drift risk between SO-direct behavior and FO-ensign behavior; captain must read persona file to understand pipeline state machine.
- **Expected outcome**: `docs/build-pipeline/README.md` contains the discuss-phase state machine, transition-write responsibility (by mode), research-dispatch cap, and no-question auto-advance rule. `agents/science-officer.md` reduces to persona voice + AskUserQuestion rule + FO-handoff session-boundary + Boundaries, citing README for workflow contract.
- **Explicit non-goals**: Does NOT change runtime behavior — pure documentation/contract reorganization. Does NOT merge SO/FO responsibilities. Does NOT touch stage skills (`build-brainstorm` / `build-explore` / `build-clarify`) except to update their "loaded by" reference if needed. (needs clarification -- deferred to explore: whether per-mode transition-write responsibility stays per-agent or becomes a single README matrix; whether `/build` skill should be updated in the same entity.)
